-- ==============================================================================
-- MEDPLENI B2B — 004_banco.sql
-- Banco de Questões Institucional: Visibilidade, Revisão em 1 Etapa,
-- Ficha Técnica, Histórico de Versões e RLS Rigorosa
-- 100% ADITIVO E IDEMPOTENTE
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. COLUNAS ADITIVAS NA TABELA QUESTIONS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- Instituição dona (NULL se pertencer ao acervo geral MedPleni)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'institution_id'
  ) THEN
    ALTER TABLE public.questions
      ADD COLUMN institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL;
  END IF;

  -- Visibilidade: acervo geral MedPleni ou privada da instituição
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'b2b_visibility'
  ) THEN
    ALTER TABLE public.questions
      ADD COLUMN b2b_visibility TEXT NOT NULL DEFAULT 'medpleni_public'
      CHECK (b2b_visibility IN ('medpleni_public', 'institution_private'));
  END IF;

  -- Status no fluxo editorial: rascunho, em revisão, aprovada, publicada, arquivada
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'b2b_status'
  ) THEN
    ALTER TABLE public.questions
      ADD COLUMN b2b_status TEXT NOT NULL DEFAULT 'published'
      CHECK (b2b_status IN ('draft', 'in_review', 'approved', 'published', 'archived'));
  END IF;

  -- Origem detalhada (Instituição e Ano)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'origin_institution_name'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN origin_institution_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'origin_year'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN origin_year INTEGER;
  END IF;

  -- Proveniência e tipo de licença (reescrita, própria, domínio público)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'provenance_source'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN provenance_source TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'license_type'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN license_type TEXT DEFAULT 'reescrita_original';
  END IF;

  -- Item original de terceiro (guardado para proveniência, protegido de visualização institucional)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'original_third_party_text'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN original_third_party_text TEXT;
  END IF;

  -- Flag se possui imagem associada
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'has_image'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN has_image BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  -- Contador de uso em provas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'times_used_in_exams'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN times_used_in_exams INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Métricas psicométricas históricas (Índice de facilidade p e ponto-bisserial r)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'historical_facility_p'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN historical_facility_p NUMERIC(4, 3);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'historical_point_biserial_r'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN historical_point_biserial_r NUMERIC(4, 3);
  END IF;

  -- Autor da questão (docente ou editor)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Versão da questão
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'version'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. TABELA DE REVISÕES EM UMA ETAPA (QUESTION_REVIEWS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.question_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_role TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'returned_with_comments', 'rejected')),
  comments TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_reviews_qid ON public.question_reviews(question_id);
CREATE INDEX IF NOT EXISTS idx_question_reviews_reviewer ON public.question_reviews(reviewer_id);

-- ------------------------------------------------------------------------------
-- 3. TABELA DE HISTÓRICO DE VERSÕES DA QUESTÃO (QUESTION_VERSIONS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.question_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  statement TEXT NOT NULL,
  explanation TEXT,
  options_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  classification_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_versions_qid ON public.question_versions(question_id, version);

-- ------------------------------------------------------------------------------
-- 4. TABELA DE CONTESTAÇÕES DE QUESTÕES (QUESTION_DISPUTES - QB-15)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.question_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'accepted', 'dismissed')),
  resolution_comment TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_disputes_qid ON public.question_disputes(question_id);
CREATE INDEX IF NOT EXISTS idx_question_disputes_inst ON public.question_disputes(institution_id);
CREATE INDEX IF NOT EXISTS idx_question_disputes_status ON public.question_disputes(status);

-- ------------------------------------------------------------------------------
-- 5. ÍNDICES DE ALTA PERFORMANCE (ESCALABILIDADE PARA 30.000+ QUESTÕES)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_questions_b2b_access ON public.questions(b2b_visibility, b2b_status, institution_id);
CREATE INDEX IF NOT EXISTS idx_questions_institution ON public.questions(institution_id);
CREATE INDEX IF NOT EXISTS idx_questions_b2b_status ON public.questions(b2b_status);
CREATE INDEX IF NOT EXISTS idx_questions_has_image ON public.questions(has_image);
CREATE INDEX IF NOT EXISTS idx_questions_used_exams ON public.questions(times_used_in_exams);
CREATE INDEX IF NOT EXISTS idx_questions_origin ON public.questions(origin_year, origin_institution_name);
CREATE INDEX IF NOT EXISTS idx_questions_statement_trgm ON public.questions USING gin (statement gin_trgm_ops);

-- Atualiza rótulo de origem para questões legadas onde ainda estiver vazio
UPDATE public.questions
SET b2b_origin_label = CASE
  WHEN institution IS NOT NULL AND year IS NOT NULL THEN institution || '-' || year::TEXT
  WHEN year IS NOT NULL THEN year::TEXT
  ELSE 'MedPleni'
END
WHERE b2b_origin_label IS NULL;

-- ------------------------------------------------------------------------------
-- 6. HABILITAÇÃO DE ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.question_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_disputes ENABLE ROW LEVEL SECURITY;

-- 6.1 Função SECURITY DEFINER: Verifica se o usuário tem permissão para ler uma questão específica
CREATE OR REPLACE FUNCTION public.can_access_question_b2b(
  q_visibility TEXT,
  q_status TEXT,
  q_institution_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_user_inst_id UUID;
  v_inst_plan TEXT;
  v_user_role TEXT;
BEGIN
  -- 1. Superadmin / Admin MedPleni tem acesso irrestrito
  IF public.is_medpleni_admin() THEN
    RETURN TRUE;
  END IF;

  -- 2. Questão privada da instituição:
  IF q_visibility = 'institution_private' THEN
    IF q_institution_id IS NULL THEN
      RETURN FALSE;
    END IF;
    -- Deve ser membro ativo da mesma instituição
    RETURN EXISTS (
      SELECT 1 FROM public.institution_members
      WHERE user_id = v_uid
        AND institution_id = q_institution_id
        AND is_active = TRUE
    );
  END IF;

  -- 3. Questão do Acervo Geral MedPleni (medpleni_public):
  -- Só visível se publicada
  IF q_status != 'published' THEN
    RETURN FALSE;
  END IF;

  -- Se for aluno/médico B2C (sem vínculo institucional ativo), mantém compatibilidade do app B2C
  IF NOT EXISTS (SELECT 1 FROM public.institution_members WHERE user_id = v_uid AND is_active = TRUE) THEN
    RETURN TRUE;
  END IF;

  -- Se for membro institucional, a instituição precisa ter plano 'acervo' ou 'plus'
  -- Plano 'vazia' enxerga apenas o seu banco privado!
  RETURN EXISTS (
    SELECT 1 FROM public.institution_members im
    JOIN public.institutions i ON i.id = im.institution_id
    WHERE im.user_id = v_uid
      AND im.is_active = TRUE
      AND i.is_active = TRUE
      AND i.plan IN ('acervo', 'plus')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6.2 Atualiza políticas RLS de questions
DROP POLICY IF EXISTS "Leitura de questions com isolamento por plano e instituicao" ON public.questions;
CREATE POLICY "Leitura de questions com isolamento por plano e instituicao"
  ON public.questions FOR SELECT
  TO authenticated, anon
  USING (
    public.can_access_question_b2b(b2b_visibility, b2b_status, institution_id)
  );

DROP POLICY IF EXISTS "Gestores e docentes gerenciam questoes da instituicao" ON public.questions;
CREATE POLICY "Gestores e docentes gerenciam questoes da instituicao"
  ON public.questions FOR ALL
  TO authenticated
  USING (
    public.is_medpleni_admin()
    OR (
      institution_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.institution_members im
        WHERE im.user_id = auth.uid()
          AND im.institution_id = questions.institution_id
          AND im.role IN ('dirigente', 'coordenador', 'docente')
          AND im.is_active = TRUE
      )
    )
  )
  WITH CHECK (
    public.is_medpleni_admin()
    OR (
      institution_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.institution_members im
        WHERE im.user_id = auth.uid()
          AND im.institution_id = questions.institution_id
          AND im.role IN ('dirigente', 'coordenador', 'docente')
          AND im.is_active = TRUE
      )
    )
  );

-- 6.3 Políticas para question_reviews
DROP POLICY IF EXISTS "Gestores e revisores acessam question_reviews" ON public.question_reviews;
CREATE POLICY "Gestores e revisores acessam question_reviews"
  ON public.question_reviews FOR ALL
  TO authenticated
  USING (
    public.is_medpleni_admin()
    OR EXISTS (
      SELECT 1 FROM public.questions q
      JOIN public.institution_members im ON im.institution_id = q.institution_id
      WHERE q.id = question_reviews.question_id
        AND im.user_id = auth.uid()
        AND im.role IN ('dirigente', 'coordenador', 'docente')
        AND im.is_active = TRUE
    )
  );

-- 6.4 Políticas para question_disputes
DROP POLICY IF EXISTS "Membros gerenciam suas contestacoes" ON public.question_disputes;
CREATE POLICY "Membros gerenciam suas contestacoes"
  ON public.question_disputes FOR ALL
  TO authenticated
  USING (
    public.is_medpleni_admin()
    OR author_id = auth.uid()
    OR public.has_role(institution_id, ARRAY['dirigente', 'coordenador'])
  );

-- ------------------------------------------------------------------------------
-- 7. FUNÇÃO RPC: VISÃO GERAL DO BANCO (MAPA ÁREA × CENÁRIO E STATUS)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_bank_overview_stats(
  p_institution_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_is_admin BOOLEAN := public.is_medpleni_admin();
  v_inst_plan TEXT := 'plus';
  v_total_published INT := 0;
  v_total_in_review INT := 0;
  v_total_draft INT := 0;
  v_total_private INT := 0;
  v_area_stats JSONB;
  v_grid_stats JSONB;
BEGIN
  -- Determina plano da instituição
  IF p_institution_id IS NOT NULL THEN
    SELECT plan INTO v_inst_plan FROM public.institutions WHERE id = p_institution_id;
  END IF;

  -- 1. Contagens gerais por status acessíveis
  SELECT
    COUNT(*) FILTER (WHERE q.b2b_status = 'published'),
    COUNT(*) FILTER (WHERE q.b2b_status = 'in_review'),
    COUNT(*) FILTER (WHERE q.b2b_status = 'draft'),
    COUNT(*) FILTER (WHERE q.b2b_visibility = 'institution_private')
  INTO v_total_published, v_total_in_review, v_total_draft, v_total_private
  FROM public.questions q
  WHERE (
    v_is_admin
    OR (
      -- Se tiver plano com acervo, conta acervo público + privada da instituição
      v_inst_plan IN ('acervo', 'plus') AND (q.b2b_visibility = 'medpleni_public' AND q.b2b_status = 'published')
    )
    OR (
      -- Questões privadas da instituição do usuário
      p_institution_id IS NOT NULL AND q.institution_id = p_institution_id
    )
  );

  -- 2. Estatísticas por Área (Nome, Código, Cor, Total Publicadas, Em Revisão)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'area_id', a.id,
        'code', a.code,
        'name', a.name,
        'color_hex', a.color_hex,
        'published_count', COALESCE(sub.pub_cnt, 0),
        'in_review_count', COALESCE(sub.rev_cnt, 0)
      ) ORDER BY a.order_index
    ),
    '[]'::jsonb
  )
  INTO v_area_stats
  FROM public.tax_areas a
  LEFT JOIN (
    SELECT
      qc.area_id,
      COUNT(*) FILTER (WHERE q.b2b_status = 'published') as pub_cnt,
      COUNT(*) FILTER (WHERE q.b2b_status = 'in_review') as rev_cnt
    FROM public.questions q
    JOIN public.question_classification qc ON qc.question_id = q.id
    WHERE (
      v_is_admin
      OR (v_inst_plan IN ('acervo', 'plus') AND q.b2b_visibility = 'medpleni_public' AND q.b2b_status = 'published')
      OR (p_institution_id IS NOT NULL AND q.institution_id = p_institution_id)
    )
    GROUP BY qc.area_id
  ) sub ON sub.area_id = a.id
  WHERE a.is_active = TRUE AND a.enamed_stage = 'etapa_2_3';

  -- 3. Mapa Área × Cenário (Matriz de contagem simples, sem meta por célula - QB-03)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'area_id', qc.area_id,
        'cenario_id', qc.cenario_id,
        'count', COUNT(*)
      )
    ),
    '[]'::jsonb
  )
  INTO v_grid_stats
  FROM public.questions q
  JOIN public.question_classification qc ON qc.question_id = q.id
  WHERE qc.cenario_id IS NOT NULL
    AND q.b2b_status = 'published'
    AND (
      v_is_admin
      OR (v_inst_plan IN ('acervo', 'plus') AND q.b2b_visibility = 'medpleni_public')
      OR (p_institution_id IS NOT NULL AND q.institution_id = p_institution_id)
    )
  GROUP BY qc.area_id, qc.cenario_id;

  RETURN jsonb_build_object(
    'total_published', v_total_published,
    'total_in_review', v_total_in_review,
    'total_draft', v_total_draft,
    'total_private', v_total_private,
    'plan', v_inst_plan,
    'area_stats', v_area_stats,
    'grid_stats', v_grid_stats
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
