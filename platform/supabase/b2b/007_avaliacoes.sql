-- ==============================================================================
-- MEDPLENI B2B — 007_avaliacoes.sql
-- Modelo de Dados de Avaliações Institucionais, Versões Congeladas,
-- Formas Embaralhadas, Tentativas, Registro de Respostas e Auditoria de Sessão
-- Conforme docs/b2b/ESPEC-B2B.md (seções 0 e 4.1) e docs/b2b/RECONHECIMENTO.md
-- 100% ADITIVO E IDEMPOTENTE
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. AVALIAÇÕES (ASSESSMENTS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (
    type IN (
      'prova_regular',
      'simulado_enamed_4',
      'simulado_enamed_8',
      'simulado_enamed_12',
      'pre_aula',
      'pos_aula'
    )
  ),
  modality TEXT NOT NULL DEFAULT 'online' CHECK (
    modality IN ('papel', 'hibrida', 'online')
  ),
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (
    status IN ('rascunho', 'em_revisao', 'aprovada', 'publicada', 'aplicada', 'corrigida')
  ),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  coauthors JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de UUIDs para edição compartilhada
  planned_matrix JSONB NOT NULL DEFAULT '{}'::jsonb, -- Matriz planejada (áreas, temas, dificuldades)
  paired_assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL, -- Par pré/pós quando houver
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. CADERNO FIXO E VERSIONADO (ASSESSMENT_VERSIONS)
-- Depois de publicado, o caderno não muda; correção gera nova versão ou anulação.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assessment_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1 CHECK (version_number > 0),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  changelog TEXT,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, version_number)
);

-- ------------------------------------------------------------------------------
-- 3. ITENS CONGELADOS DA AVALIAÇÃO (ASSESSMENT_ITEMS)
-- Cópia congelada do enunciado, alternativas e gabarito no momento da publicação.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assessment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.assessment_versions(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL CHECK (order_index > 0),
  question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
  frozen_statement TEXT NOT NULL,
  frozen_clinical_context TEXT,
  frozen_options JSONB NOT NULL, -- Array de { letter: "A".."E", text: string, is_correct: boolean }
  frozen_correct_letter TEXT NOT NULL CHECK (frozen_correct_letter IN ('A', 'B', 'C', 'D', 'E')),
  frozen_explanation TEXT,
  status TEXT NOT NULL DEFAULT 'valido' CHECK (status IN ('valido', 'anulado')),
  weight NUMERIC(5, 2) NOT NULL DEFAULT 1.00 CHECK (weight > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (version_id, order_index)
);

-- ------------------------------------------------------------------------------
-- 4. FORMAS EMBARALHADAS (ASSESSMENT_FORMS)
-- Formas A, B, C, D... com mapas biunívocos de embaralhamento de questões e alternativas.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assessment_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.assessment_versions(id) ON DELETE CASCADE,
  form_code TEXT NOT NULL, -- Ex: 'A', 'B', 'C', 'D'
  items_shuffle_map JSONB NOT NULL,
  -- Estrutura de cada item em items_shuffle_map:
  -- [
  --   {
  --     "form_order": 1,
  --     "assessment_item_id": "uuid",
  --     "base_order": 5,
  --     "options_map": { "A": "C", "B": "A", "C": "D", "D": "B", "E": "E" },
  --     "reverse_options_map": { "C": "A", "A": "B", "D": "C", "B": "D", "E": "E" }
  --   }
  -- ]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (version_id, form_code)
);

-- ------------------------------------------------------------------------------
-- 5. PÚBLICO-ALVO CONVOCADO (ASSESSMENT_TARGETS)
-- Turmas e/ou alunos individuais convocados para a realização da prova.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assessment_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('class_group', 'student')),
  class_group_id UUID REFERENCES public.class_groups(id) ON DELETE CASCADE,
  student_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_assessment_target_exclusive CHECK (
    (target_type = 'class_group' AND class_group_id IS NOT NULL AND student_user_id IS NULL) OR
    (target_type = 'student' AND student_user_id IS NOT NULL AND class_group_id IS NULL)
  )
);

-- ------------------------------------------------------------------------------
-- 6. TENTATIVAS DE ALUNOS (ATTEMPTS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES public.assessment_versions(id) ON DELETE RESTRICT,
  form_id UUID REFERENCES public.assessment_forms(id) ON DELETE SET NULL,
  student_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_group_id UUID REFERENCES public.class_groups(id) ON DELETE SET NULL,
  modality TEXT NOT NULL DEFAULT 'online' CHECK (modality IN ('papel', 'hibrida', 'online')),
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'nao_iniciou' CHECK (
    status IN ('nao_iniciou', 'em_andamento', 'finalizada', 'ausente')
  ),
  score_raw NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  score_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, student_user_id)
);

-- ------------------------------------------------------------------------------
-- 7. RESPOSTAS DA TENTATIVA (ATTEMPT_ANSWERS)
-- Sempre associadas ao assessment_item_id e com a letra já convertida para o caderno-base.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attempt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  assessment_item_id UUID NOT NULL REFERENCES public.assessment_items(id) ON DELETE CASCADE,
  marked_form_letter TEXT CHECK (marked_form_letter IN ('A', 'B', 'C', 'D', 'E')), -- Letra assinalada na forma do aluno (ou NULL em branco)
  marked_base_letter TEXT CHECK (marked_base_letter IN ('A', 'B', 'C', 'D', 'E')), -- Letra real no caderno-base (ou NULL em branco)
  is_correct BOOLEAN NOT NULL DEFAULT false, -- Calculado conforme gabarito congelado do item (se anulado ou em branco = false)
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  origin TEXT NOT NULL DEFAULT 'online' CHECK (origin IN ('online', 'folha_lida', 'digitacao')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, assessment_item_id)
);

-- ------------------------------------------------------------------------------
-- 8. EVENTOS DE SESSÃO ONLINE (ATTEMPT_EVENTS)
-- Auditoria de integridade para exames online (troca de aba, perda de foco, retorno a questão).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attempt_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'session_start',
      'session_blur',
      'session_focus',
      'tab_switch',
      'question_view',
      'question_answer',
      'session_submit'
    )
  ),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 9. ÍNDICES DE ALTA PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_assessments_inst ON public.assessments(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_assessments_author ON public.assessments(author_id);
CREATE INDEX IF NOT EXISTS idx_assessment_versions_assessment ON public.assessment_versions(assessment_id, is_current);
CREATE INDEX IF NOT EXISTS idx_assessment_items_version ON public.assessment_items(version_id, order_index);
CREATE INDEX IF NOT EXISTS idx_assessment_forms_version ON public.assessment_forms(version_id);
CREATE INDEX IF NOT EXISTS idx_assessment_targets_assessment ON public.assessment_targets(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_targets_class ON public.assessment_targets(class_group_id);
CREATE INDEX IF NOT EXISTS idx_assessment_targets_student ON public.assessment_targets(student_user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_assessment ON public.attempts(assessment_id, status);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON public.attempts(student_user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_class ON public.attempts(class_group_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON public.attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_item ON public.attempt_answers(assessment_item_id);
CREATE INDEX IF NOT EXISTS idx_attempt_events_attempt ON public.attempt_events(attempt_id, created_at);

-- ------------------------------------------------------------------------------
-- 10. FUNÇÕES SECURITY DEFINER PARA RECALCULAR NOTAS COM PRECISÃO
-- Regras inegociáveis:
--  - Itens com status = 'anulado' são EXCLUÍDOS do numerador e denominador
--  - Questões em branco (marked_base_letter IS NULL) contam como erro (0 pontos)
--  - Se todos os itens válidos somarem 0 em peso, nota = 0
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_attempt_score(p_attempt_id UUID)
RETURNS TABLE (
  attempt_id UUID,
  new_score_raw NUMERIC,
  new_score_percentage NUMERIC,
  total_valid_items INTEGER,
  correct_valid_items INTEGER,
  annulled_items INTEGER
) AS $$
DECLARE
  v_version_id UUID;
  v_total_valid_weight NUMERIC := 0;
  v_score_raw NUMERIC := 0;
  v_score_pct NUMERIC := 0;
  v_total_valid INT := 0;
  v_correct_valid INT := 0;
  v_annulled INT := 0;
BEGIN
  -- 1. Obtém versão da avaliação ligada à tentativa
  SELECT att.version_id INTO v_version_id
  FROM public.attempts att
  WHERE att.id = p_attempt_id;

  IF v_version_id IS NULL THEN
    RETURN;
  END IF;

  -- 2. Atualiza o status is_correct de todas as respostas da tentativa
  UPDATE public.attempt_answers aa
  SET is_correct = (
    ai.status = 'valido'
    AND aa.marked_base_letter IS NOT NULL
    AND aa.marked_base_letter = ai.frozen_correct_letter
  ),
  updated_at = now()
  FROM public.assessment_items ai
  WHERE aa.attempt_id = p_attempt_id
    AND aa.assessment_item_id = ai.id;

  -- 3. Agrega pesos e totais
  SELECT
    COALESCE(SUM(CASE WHEN ai.status = 'valido' THEN ai.weight ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ai.status = 'valido' AND aa.is_correct THEN ai.weight ELSE 0 END), 0),
    COALESCE(COUNT(CASE WHEN ai.status = 'valido' THEN 1 END), 0),
    COALESCE(COUNT(CASE WHEN ai.status = 'valido' AND aa.is_correct THEN 1 END), 0),
    COALESCE(COUNT(CASE WHEN ai.status = 'anulado' THEN 1 END), 0)
  INTO
    v_total_valid_weight,
    v_score_raw,
    v_total_valid,
    v_correct_valid,
    v_annulled
  FROM public.assessment_items ai
  LEFT JOIN public.attempt_answers aa
    ON aa.assessment_item_id = ai.id
    AND aa.attempt_id = p_attempt_id
  WHERE ai.version_id = v_version_id;

  -- 4. Calcula porcentagem com proteção contra divisão por zero
  IF v_total_valid_weight > 0 THEN
    v_score_pct := ROUND((v_score_raw / v_total_valid_weight) * 100.0, 2);
  ELSE
    v_score_pct := 0.00;
  END IF;

  -- 5. Atualiza a tentativa
  UPDATE public.attempts
  SET
    score_raw = v_score_raw,
    score_percentage = v_score_pct,
    updated_at = now()
  WHERE id = p_attempt_id;

  RETURN QUERY SELECT
    p_attempt_id,
    v_score_raw,
    v_score_pct,
    v_total_valid,
    v_correct_valid,
    v_annulled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para recalcular em lote todas as tentativas de uma versão da avaliação
-- Chamada imediatamente quando um item é anulado ou corrigido
CREATE OR REPLACE FUNCTION public.recalculate_version_attempts(p_version_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_rec RECORD;
  v_count INT := 0;
BEGIN
  FOR v_rec IN (
    SELECT id FROM public.attempts WHERE version_id = p_version_id
  ) LOOP
    PERFORM public.recalculate_attempt_score(v_rec.id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 11. VIEWS DE NOTA POR ALUNO E POR TURMA
-- ------------------------------------------------------------------------------

-- 11.1 Visão detalhada de notas por aluno em cada avaliação
CREATE OR REPLACE VIEW public.vw_assessment_student_scores AS
SELECT
  att.id AS attempt_id,
  att.assessment_id,
  a.institution_id,
  a.title AS assessment_title,
  a.type AS assessment_type,
  a.status AS assessment_status,
  att.student_user_id,
  p.full_name AS student_name,
  p.email AS student_email,
  att.class_group_id,
  cg.label AS class_group_label,
  cg.period AS class_group_period,
  att.modality,
  att.status AS attempt_status,
  att.started_at,
  att.submitted_at,
  att.score_raw,
  att.score_percentage,
  inst.cut_score AS institution_cut_score,
  (att.score_percentage >= inst.cut_score) AS is_above_cut_score,
  (
    SELECT COUNT(*)
    FROM public.assessment_items ai
    WHERE ai.version_id = att.version_id AND ai.status = 'valido'
  ) AS total_valid_items,
  (
    SELECT COUNT(*)
    FROM public.attempt_answers aa
    JOIN public.assessment_items ai ON ai.id = aa.assessment_item_id
    WHERE aa.attempt_id = att.id AND ai.status = 'valido' AND aa.is_correct = true
  ) AS correct_items_count,
  (
    SELECT COUNT(*)
    FROM public.assessment_items ai
    WHERE ai.version_id = att.version_id AND ai.status = 'anulado'
  ) AS annulled_items_count
FROM public.attempts att
JOIN public.assessments a ON a.id = att.assessment_id
JOIN public.institutions inst ON inst.id = a.institution_id
JOIN public.profiles p ON p.id = att.student_user_id
LEFT JOIN public.class_groups cg ON cg.id = att.class_group_id;

-- 11.2 Visão estatística de notas por turma em cada avaliação
CREATE OR REPLACE VIEW public.vw_assessment_class_scores AS
SELECT
  a.id AS assessment_id,
  a.institution_id,
  a.title AS assessment_title,
  a.type AS assessment_type,
  a.status AS assessment_status,
  att.class_group_id,
  cg.label AS class_group_label,
  cg.period AS class_group_period,
  inst.cut_score AS institution_cut_score,
  COUNT(att.id) AS total_candidates,
  COUNT(CASE WHEN att.status = 'finalizada' THEN 1 END) AS total_submitted,
  COUNT(CASE WHEN att.status = 'ausente' THEN 1 END) AS total_absent,
  ROUND(AVG(CASE WHEN att.status = 'finalizada' THEN att.score_percentage END), 2) AS average_score_percentage,
  ROUND(
    COALESCE(
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY CASE WHEN att.status = 'finalizada' THEN att.score_percentage END
      ),
      0
    )::numeric,
    2
  ) AS median_score_percentage,
  COUNT(
    CASE WHEN att.status = 'finalizada' AND att.score_percentage >= inst.cut_score THEN 1 END
  ) AS total_above_cut,
  ROUND(
    (
      COUNT(CASE WHEN att.status = 'finalizada' AND att.score_percentage >= inst.cut_score THEN 1 END)::numeric /
      NULLIF(COUNT(CASE WHEN att.status = 'finalizada' THEN 1 END), 0)
    ) * 100.0,
    2
  ) AS percentage_above_cut
FROM public.assessments a
JOIN public.institutions inst ON inst.id = a.institution_id
JOIN public.attempts att ON att.assessment_id = a.id
LEFT JOIN public.class_groups cg ON cg.id = att.class_group_id
GROUP BY
  a.id,
  a.institution_id,
  a.title,
  a.type,
  a.status,
  att.class_group_id,
  cg.label,
  cg.period,
  inst.cut_score;

-- ------------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY (RLS) RIGOROSA
-- ------------------------------------------------------------------------------
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_events ENABLE ROW LEVEL SECURITY;

-- 12.1 ASSESSMENTS
DROP POLICY IF EXISTS "policy_assessments_select" ON public.assessments;
CREATE POLICY "policy_assessments_select" ON public.assessments
  FOR SELECT
  USING (
    public.is_medpleni_admin() OR
    public.has_role(institution_id, ARRAY['dirigente', 'coordenador']) OR
    (
      public.has_role(institution_id, ARRAY['docente']) AND (
        author_id = auth.uid() OR
        coauthors @> to_jsonb(auth.uid()::text) OR
        EXISTS (
          SELECT 1 FROM public.assessment_targets at
          JOIN public.member_scopes ms ON ms.class_group_id = at.class_group_id
          JOIN public.institution_members im ON im.id = ms.member_id
          WHERE at.assessment_id = assessments.id
            AND im.user_id = auth.uid()
            AND im.is_active = true
        )
      )
    ) OR
    (
      -- Aluno só vê avaliações ativas publicadas/aplicadas/corrigidas onde ele ou sua turma foram convocados
      status IN ('publicada', 'aplicada', 'corrigida') AND
      EXISTS (
        SELECT 1 FROM public.assessment_targets at
        LEFT JOIN public.enrollments e ON e.class_group_id = at.class_group_id
        LEFT JOIN public.institution_members im ON im.id = e.member_id
        WHERE at.assessment_id = assessments.id
          AND (
            (at.target_type = 'student' AND at.student_user_id = auth.uid()) OR
            (at.target_type = 'class_group' AND im.user_id = auth.uid() AND e.status = 'active')
          )
      )
    )
  );

DROP POLICY IF EXISTS "policy_assessments_insert_update" ON public.assessments;
CREATE POLICY "policy_assessments_insert_update" ON public.assessments
  FOR ALL
  USING (
    public.is_medpleni_admin() OR
    public.has_role(institution_id, ARRAY['dirigente', 'coordenador']) OR
    (
      public.has_role(institution_id, ARRAY['docente']) AND (
        author_id = auth.uid() OR
        coauthors @> to_jsonb(auth.uid()::text)
      )
    )
  );

-- 12.2 ASSESSMENT_VERSIONS
DROP POLICY IF EXISTS "policy_assessment_versions_select" ON public.assessment_versions;
CREATE POLICY "policy_assessment_versions_select" ON public.assessment_versions
  FOR SELECT
  USING (
    public.is_medpleni_admin() OR
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_versions.assessment_id
        AND public.is_member(a.institution_id)
    )
  );

DROP POLICY IF EXISTS "policy_assessment_versions_manage" ON public.assessment_versions;
CREATE POLICY "policy_assessment_versions_manage" ON public.assessment_versions
  FOR ALL
  USING (
    public.is_medpleni_admin() OR
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_versions.assessment_id
        AND (
          public.has_role(a.institution_id, ARRAY['dirigente', 'coordenador']) OR
          (public.has_role(a.institution_id, ARRAY['docente']) AND (
            a.author_id = auth.uid() OR a.coauthors @> to_jsonb(auth.uid()::text)
          ))
        )
    )
  );

-- 12.3 ASSESSMENT_ITEMS
-- Regra inegociável: Aluno NUNCA lê gabarito antes da liberação formal da avaliação!
DROP POLICY IF EXISTS "policy_assessment_items_select" ON public.assessment_items;
CREATE POLICY "policy_assessment_items_select" ON public.assessment_items
  FOR SELECT
  USING (
    public.is_medpleni_admin() OR
    EXISTS (
      SELECT 1 FROM public.assessment_versions av
      JOIN public.assessments a ON a.id = av.assessment_id
      WHERE av.id = assessment_items.version_id
        AND (
          public.has_role(a.institution_id, ARRAY['dirigente', 'coordenador', 'docente']) OR
          (
            -- Aluno só lê itens se a prova estiver em status 'corrigida' ou se ele tiver tentativa em andamento/finalizada
            a.status IN ('publicada', 'aplicada', 'corrigida') AND
            EXISTS (
              SELECT 1 FROM public.attempts att
              WHERE att.assessment_id = a.id AND att.student_user_id = auth.uid()
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "policy_assessment_items_manage" ON public.assessment_items;
CREATE POLICY "policy_assessment_items_manage" ON public.assessment_items
  FOR ALL
  USING (
    public.is_medpleni_admin() OR
    EXISTS (
      SELECT 1 FROM public.assessment_versions av
      JOIN public.assessments a ON a.id = av.assessment_id
      WHERE av.id = assessment_items.version_id
        AND (
          public.has_role(a.institution_id, ARRAY['dirigente', 'coordenador']) OR
          (public.has_role(a.institution_id, ARRAY['docente']) AND (
            a.author_id = auth.uid() OR a.coauthors @> to_jsonb(auth.uid()::text)
          ))
        )
    )
  );

-- 12.4 ASSESSMENT_FORMS
DROP POLICY IF EXISTS "policy_assessment_forms_all" ON public.assessment_forms;
CREATE POLICY "policy_assessment_forms_all" ON public.assessment_forms
  FOR ALL
  USING (
    public.is_medpleni_admin() OR
    EXISTS (
      SELECT 1 FROM public.assessment_versions av
      JOIN public.assessments a ON a.id = av.assessment_id
      WHERE av.id = assessment_forms.version_id
        AND public.is_member(a.institution_id)
    )
  );

-- 12.5 ASSESSMENT_TARGETS
DROP POLICY IF EXISTS "policy_assessment_targets_all" ON public.assessment_targets;
CREATE POLICY "policy_assessment_targets_all" ON public.assessment_targets
  FOR ALL
  USING (
    public.is_medpleni_admin() OR
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_targets.assessment_id
        AND public.is_member(a.institution_id)
    )
  );

-- 12.6 ATTEMPTS
DROP POLICY IF EXISTS "policy_attempts_select" ON public.attempts;
CREATE POLICY "policy_attempts_select" ON public.attempts
  FOR SELECT
  USING (
    public.is_medpleni_admin() OR
    student_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = attempts.assessment_id
        AND (
          public.has_role(a.institution_id, ARRAY['dirigente', 'coordenador']) OR
          (
            public.has_role(a.institution_id, ARRAY['docente']) AND (
              a.author_id = auth.uid() OR
              a.coauthors @> to_jsonb(auth.uid()::text) OR
              public.can_see_student(attempts.student_user_id)
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "policy_attempts_insert_update" ON public.attempts;
CREATE POLICY "policy_attempts_insert_update" ON public.attempts
  FOR ALL
  USING (
    public.is_medpleni_admin() OR
    student_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = attempts.assessment_id
        AND public.has_role(a.institution_id, ARRAY['dirigente', 'coordenador', 'docente'])
    )
  );

-- 12.7 ATTEMPT_ANSWERS
DROP POLICY IF EXISTS "policy_attempt_answers_all" ON public.attempt_answers;
CREATE POLICY "policy_attempt_answers_all" ON public.attempt_answers
  FOR ALL
  USING (
    public.is_medpleni_admin() OR
    EXISTS (
      SELECT 1 FROM public.attempts att
      WHERE att.id = attempt_answers.attempt_id
        AND (
          att.student_user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.assessments a
            WHERE a.id = att.assessment_id
              AND (
                public.has_role(a.institution_id, ARRAY['dirigente', 'coordenador']) OR
                (public.has_role(a.institution_id, ARRAY['docente']) AND public.can_see_student(att.student_user_id))
              )
          )
        )
    )
  );

-- 12.8 ATTEMPT_EVENTS
DROP POLICY IF EXISTS "policy_attempt_events_all" ON public.attempt_events;
CREATE POLICY "policy_attempt_events_all" ON public.attempt_events
  FOR ALL
  USING (
    public.is_medpleni_admin() OR
    EXISTS (
      SELECT 1 FROM public.attempts att
      WHERE att.id = attempt_events.attempt_id
        AND (
          att.student_user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.assessments a
            WHERE a.id = att.assessment_id
              AND public.has_role(a.institution_id, ARRAY['dirigente', 'coordenador'])
          )
        )
    )
  );
