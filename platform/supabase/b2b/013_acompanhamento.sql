-- ==============================================================================
-- MEDPLENI B2B — 013_acompanhamento.sql
-- Anotações de Acompanhamento e Tratamento de Alertas por Aluno (Voto SPR nº 2)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.student_alert_treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_key TEXT NOT NULL, -- 'nota_abaixo_60', 'zona_decisao', 'sem_acesso', 'queda_ritmo', 'simulado_pendente'
  is_treated BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  treated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  treated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (institution_id, student_user_id, alert_key)
);

CREATE INDEX IF NOT EXISTS idx_student_alert_treatments_inst 
ON public.student_alert_treatments(institution_id, student_user_id);

-- RLS
ALTER TABLE public.student_alert_treatments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dirigente e Coordenador gerenciam tratamentos de alertas"
ON public.student_alert_treatments
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

CREATE POLICY "Docente visualiza tratamentos de alunos sob seu escopo"
ON public.student_alert_treatments
FOR SELECT
TO authenticated
USING (
  public.can_see_student(student_user_id)
);
