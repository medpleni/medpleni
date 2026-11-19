-- ==============================================================================
-- MEDPLENI B2B — 014_longitudinal.sql
-- Planos de Acompanhamento Longitudinal (AP-04 / DCN art. 36-37 / Régua 60)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.longitudinal_action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('class_group', 'student')),
  class_group_id UUID REFERENCES public.class_groups(id) ON DELETE CASCADE,
  student_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  axis_type TEXT NOT NULL CHECK (axis_type IN ('area', 'cenario', 'tema', 'competencia')),
  axis_value TEXT NOT NULL,
  action_description TEXT NOT NULL,
  responsible_name TEXT NOT NULL,
  responsible_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agreed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  deadline_date DATE,
  verification_assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  initial_score NUMERIC(5,2),
  verified_score NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('planejada', 'em_andamento', 'concluida', 'cancelada')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_longitudinal_action_plans_inst 
ON public.longitudinal_action_plans(institution_id, target_type);

CREATE INDEX IF NOT EXISTS idx_longitudinal_action_plans_axis 
ON public.longitudinal_action_plans(axis_type, axis_value);

-- RLS
ALTER TABLE public.longitudinal_action_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dirigente e Coordenador gerenciam planos longitudinais" ON public.longitudinal_action_plans;
CREATE POLICY "Dirigente e Coordenador gerenciam planos longitudinais"
ON public.longitudinal_action_plans
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

DROP POLICY IF EXISTS "Docente visualiza planos do seu escopo" ON public.longitudinal_action_plans;
CREATE POLICY "Docente visualiza planos do seu escopo"
ON public.longitudinal_action_plans
FOR SELECT
TO authenticated
USING (
  public.is_medpleni_admin() OR
  public.has_role(institution_id, ARRAY['dirigente', 'coordenador']) OR
  (student_user_id IS NOT NULL AND public.can_see_student(student_user_id)) OR
  (class_group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.institution_members im
    JOIN public.member_scopes ms ON ms.member_id = im.id
    WHERE im.user_id = auth.uid()
      AND im.institution_id = longitudinal_action_plans.institution_id
      AND ms.class_group_id = longitudinal_action_plans.class_group_id
  ))
);

-- Seed de demonstração para a FADEP caso exista
DO $$
DECLARE
  v_inst_id UUID := 'bbbb1111-1111-1111-1111-111111111111';
  v_cg3_id UUID := '77777777-7777-7777-7777-000000000003';
  v_cg4_id UUID := '77777777-7777-7777-7777-000000000004';
  v_exam2_id UUID := 'aaaa2222-2222-2222-2222-222222222222';
  v_exam3_id UUID := 'aaaa3333-3333-3333-3333-333333333333';
BEGIN
  IF EXISTS (SELECT 1 FROM public.institutions WHERE id = v_inst_id) THEN
    -- Plano 1: Turma P3 em Saúde Coletiva (Concluído com melhora)
    INSERT INTO public.longitudinal_action_plans (
      id, institution_id, target_type, class_group_id, axis_type, axis_value,
      action_description, responsible_name, agreed_date, deadline_date,
      verification_assessment_id, initial_score, verified_score, status, notes
    ) VALUES (
      'eeee1111-1111-1111-1111-000000000001', v_inst_id, 'class_group', v_cg3_id, 'area', 'Saúde Coletiva',
      'Módulo de reforço em Epidemiologia e Indicadores de Saúde da Família com lista dirigida no Praticar',
      'Prof. Dr. Roberto Guimarães', '2026-03-20', '2026-06-10',
      v_exam2_id, 47.5, 68.0, 'concluida', 'Adesão de 92% dos alunos na lista dirigida; recuperação consistente verificada no Simulado 2026.1.'
    ) ON CONFLICT (id) DO NOTHING;

    -- Plano 2: Turma P4 em Cirurgia Geral (Em andamento)
    INSERT INTO public.longitudinal_action_plans (
      id, institution_id, target_type, class_group_id, axis_type, axis_value,
      action_description, responsible_name, agreed_date, deadline_date,
      verification_assessment_id, initial_score, verified_score, status, notes
    ) VALUES (
      'eeee2222-2222-2222-2222-000000000002', v_inst_id, 'class_group', v_cg4_id, 'area', 'Cirurgia Geral',
      'Revisão pré-Enamed de Abdome Agudo e Trauma com simulação de casos clínicos comentados',
      'Coordenação de Medicina', '2026-07-05', '2026-10-15',
      v_exam3_id, 52.0, 63.5, 'concluida', 'Reteste no Simulado Geral 2026.2 demonstrou transição positiva para cima da régua 60.'
    ) ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
