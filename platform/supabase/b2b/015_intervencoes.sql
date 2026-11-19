-- ==============================================================================
-- MEDPLENI B2B — 015_intervencoes.sql
-- Intervenções Pedagógicas Enxutas (IN-01 a IN-06 / Voto SPR nº 10)
-- 2 tipos exclusivos: Lista de exercícios (principal) e Pré e pós-aula
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lista_exercicios', 'pre_pos_aula')),
  target_type TEXT NOT NULL DEFAULT 'class_group' CHECK (target_type IN ('class_group', 'subgroup', 'student')),
  class_group_id UUID REFERENCES public.class_groups(id) ON DELETE CASCADE,
  parallel_class_group_id UUID REFERENCES public.class_groups(id) ON DELETE SET NULL,
  student_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  axis_type TEXT NOT NULL CHECK (axis_type IN ('area', 'cenario', 'tema', 'competencia')),
  axis_value TEXT NOT NULL,
  origin_assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  before_score NUMERIC(5,2) NOT NULL,
  parallel_before_score NUMERIC(5,2),
  parallel_after_score NUMERIC(5,2),
  after_score NUMERIC(5,2),
  retest_assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  retest_questions_count INT NOT NULL DEFAULT 5,
  practice_list_questions_count INT NOT NULL DEFAULT 20,
  pre_exam_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  post_exam_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('planejada', 'em_andamento', 'concluida', 'cancelada')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.intervention_adherences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_progresso', 'concluida')),
  questions_completed INT NOT NULL DEFAULT 0,
  questions_target INT NOT NULL DEFAULT 20,
  score_percentage NUMERIC(5,2),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (intervention_id, student_user_id)
);

CREATE INDEX IF NOT EXISTS idx_interventions_inst ON public.interventions(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_interventions_class ON public.interventions(class_group_id);
CREATE INDEX IF NOT EXISTS idx_intervention_adherences_interv ON public.intervention_adherences(intervention_id);
CREATE INDEX IF NOT EXISTS idx_intervention_adherences_student ON public.intervention_adherences(student_user_id);

-- RLS
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_adherences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dirigente e Coordenador gerenciam intervencoes" ON public.interventions;
CREATE POLICY "Dirigente e Coordenador gerenciam intervencoes"
ON public.interventions
FOR ALL
TO authenticated
USING (
  public.is_medpleni_admin() OR
  public.has_role(institution_id, ARRAY['dirigente', 'coordenador'])
)
WITH CHECK (
  public.is_medpleni_admin() OR
  public.has_role(institution_id, ARRAY['dirigente', 'coordenador'])
);

DROP POLICY IF EXISTS "Docente gerencia intervencoes das suas turmas" ON public.interventions;
CREATE POLICY "Docente gerencia intervencoes das suas turmas"
ON public.interventions
FOR ALL
TO authenticated
USING (
  public.is_medpleni_admin() OR
  public.has_role(institution_id, ARRAY['dirigente', 'coordenador']) OR
  (
    public.has_role(institution_id, ARRAY['docente']) AND
    class_group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.institution_members im
      JOIN public.member_scopes ms ON ms.member_id = im.id
      WHERE im.user_id = auth.uid()
        AND im.institution_id = interventions.institution_id
        AND ms.class_group_id = interventions.class_group_id
    )
  )
)
WITH CHECK (
  public.is_medpleni_admin() OR
  public.has_role(institution_id, ARRAY['dirigente', 'coordenador']) OR
  (
    public.has_role(institution_id, ARRAY['docente']) AND
    class_group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.institution_members im
      JOIN public.member_scopes ms ON ms.member_id = im.id
      WHERE im.user_id = auth.uid()
        AND im.institution_id = interventions.institution_id
        AND ms.class_group_id = interventions.class_group_id
    )
  )
);

DROP POLICY IF EXISTS "Aluno visualiza intervencoes atribuidas a sua turma" ON public.interventions;
CREATE POLICY "Aluno visualiza intervencoes atribuidas a sua turma"
ON public.interventions
FOR SELECT
TO authenticated
USING (
  public.is_medpleni_admin() OR
  public.has_role(institution_id, ARRAY['dirigente', 'coordenador', 'docente']) OR
  (student_user_id = auth.uid()) OR
  (class_group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.institution_members im ON im.id = e.member_id
    WHERE im.user_id = auth.uid()
      AND im.institution_id = interventions.institution_id
      AND e.class_group_id = interventions.class_group_id
  ))
);

-- RLS Adherences
DROP POLICY IF EXISTS "Gestores e docentes gerenciam adesao" ON public.intervention_adherences;
CREATE POLICY "Gestores e docentes gerenciam adesao"
ON public.intervention_adherences
FOR ALL
TO authenticated
USING (
  public.is_medpleni_admin() OR
  EXISTS (
    SELECT 1 FROM public.interventions i
    WHERE i.id = intervention_adherences.intervention_id
      AND (
        public.has_role(i.institution_id, ARRAY['dirigente', 'coordenador']) OR
        (
          public.has_role(i.institution_id, ARRAY['docente']) AND
          EXISTS (
            SELECT 1 FROM public.institution_members im
            JOIN public.member_scopes ms ON ms.member_id = im.id
            WHERE im.user_id = auth.uid()
              AND im.institution_id = i.institution_id
              AND ms.class_group_id = i.class_group_id
          )
        )
      )
  )
);

DROP POLICY IF EXISTS "Aluno gerencia sua propria adesao" ON public.intervention_adherences;
CREATE POLICY "Aluno gerencia sua propria adesao"
ON public.intervention_adherences
FOR ALL
TO authenticated
USING (student_user_id = auth.uid())
WITH CHECK (student_user_id = auth.uid());

-- Seed de Demonstração para a FADEP
DO $$
DECLARE
  v_inst_id UUID := 'bbbb1111-1111-1111-1111-111111111111';
  v_cg3_id UUID := '77777777-7777-7777-7777-000000000003';
  v_cg4_id UUID := '77777777-7777-7777-7777-000000000004';
  v_exam1_id UUID := 'aaaa1111-1111-1111-1111-111111111111';
  v_exam2_id UUID := 'aaaa2222-2222-2222-2222-222222222222';
  v_exam3_id UUID := 'aaaa3333-3333-3333-3333-333333333333';
  v_int1_id UUID := 'ffff1111-1111-1111-1111-000000000001';
  v_int2_id UUID := 'ffff2222-2222-2222-2222-000000000002';
  v_s_idx INT;
  v_stud_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM public.institutions WHERE id = v_inst_id) THEN
    -- Intervenção 1: Lista de Exercícios (Concluída com Reteste no Simulado Geral)
    INSERT INTO public.interventions (
      id, institution_id, title, type, target_type, class_group_id, parallel_class_group_id,
      axis_type, axis_value, origin_assessment_id, before_score, parallel_before_score,
      parallel_after_score, after_score, retest_assessment_id, retest_questions_count,
      practice_list_questions_count, start_date, due_date, status
    ) VALUES (
      v_int1_id, v_inst_id, 'Lista Dirigida: Cirurgia do Trauma e Abdome Agudo',
      'lista_exercicios', 'class_group', v_cg3_id, v_cg4_id,
      'area', 'Cirurgia Geral', v_exam1_id, 46.5, 52.0,
      54.0, 68.2, v_exam2_id, 5, 25,
      '2026-03-22', '2026-05-15', 'concluida'
    ) ON CONFLICT (id) DO NOTHING;

    -- Cria adesão dos 20 alunos da turma 3
    FOR v_s_idx IN 1..20 LOOP
      v_stud_id := ('88888888-8888-8888-0003-' || LPAD(v_s_idx::TEXT, 12, '0'))::UUID;
      INSERT INTO public.intervention_adherences (
        intervention_id, student_user_id, status, questions_completed,
        questions_target, score_percentage, completed_at
      ) VALUES (
        v_int1_id, v_stud_id,
        CASE WHEN v_s_idx <= 17 THEN 'concluida' WHEN v_s_idx <= 19 THEN 'em_progresso' ELSE 'pendente' END,
        CASE WHEN v_s_idx <= 17 THEN 25 WHEN v_s_idx <= 19 THEN 14 ELSE 0 END,
        25,
        CASE WHEN v_s_idx <= 17 THEN 72.0 + (v_s_idx * 1.0) WHEN v_s_idx <= 19 THEN 58.0 ELSE NULL END,
        CASE WHEN v_s_idx <= 17 THEN now() - interval '10 days' ELSE NULL END
      ) ON CONFLICT (intervention_id, student_user_id) DO NOTHING;
    END LOOP;

    -- Intervenção 2: Pré e Pós-Aula (Em andamento)
    INSERT INTO public.interventions (
      id, institution_id, title, type, target_type, class_group_id, parallel_class_group_id,
      axis_type, axis_value, origin_assessment_id, before_score, parallel_before_score,
      parallel_after_score, after_score, retest_assessment_id, retest_questions_count,
      practice_list_questions_count, start_date, due_date, status
    ) VALUES (
      v_int2_id, v_inst_id, 'Pré e Pós-Aula: Rastreamento em Atenção Primária e Saúde da Família',
      'pre_pos_aula', 'class_group', v_cg4_id, NULL,
      'area', 'Medicina de Família e Comunidade', v_exam2_id, 49.0, NULL,
      NULL, 64.0, v_exam3_id, 6, 20,
      '2026-08-10', '2026-11-25', 'em_andamento'
    ) ON CONFLICT (id) DO NOTHING;

    -- Cria adesão dos alunos da turma 4
    FOR v_s_idx IN 1..20 LOOP
      v_stud_id := ('88888888-8888-8888-0004-' || LPAD(v_s_idx::TEXT, 12, '0'))::UUID;
      INSERT INTO public.intervention_adherences (
        intervention_id, student_user_id, status, questions_completed,
        questions_target, score_percentage, completed_at
      ) VALUES (
        v_int2_id, v_stud_id,
        CASE WHEN v_s_idx <= 15 THEN 'concluida' WHEN v_s_idx <= 18 THEN 'em_progresso' ELSE 'pendente' END,
        CASE WHEN v_s_idx <= 15 THEN 20 WHEN v_s_idx <= 18 THEN 10 ELSE 0 END,
        20,
        CASE WHEN v_s_idx <= 15 THEN 65.0 + (v_s_idx * 1.2) WHEN v_s_idx <= 18 THEN 50.0 ELSE NULL END,
        CASE WHEN v_s_idx <= 15 THEN now() - interval '3 days' ELSE NULL END
      ) ON CONFLICT (intervention_id, student_user_id) DO NOTHING;
    END LOOP;
  END IF;
END $$;
