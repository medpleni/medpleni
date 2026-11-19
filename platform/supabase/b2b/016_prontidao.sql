-- ==============================================================================
-- MEDPLENI B2B — 016_prontidao.sql
-- Indicador de Prontidão Acadêmica por Regras Explícitas (ESPEC-B2B 4.9 / P22)
-- Armazena o histórico do indicador para calibração com o resultado real do ENAMED
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.readiness_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_group_id UUID REFERENCES public.class_groups(id) ON DELETE SET NULL,
  academic_year INT NOT NULL DEFAULT 2026,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  volume_count INT NOT NULL DEFAULT 0,
  volume_target INT,
  volume_fulfilled BOOLEAN NOT NULL DEFAULT false,
  qualifying_exams_count INT NOT NULL DEFAULT 0,
  consistency_target_score NUMERIC(5,2),
  consistency_target_exams INT,
  consistency_fulfilled BOOLEAN NOT NULL DEFAULT false,
  level TEXT NOT NULL CHECK (level IN ('alto', 'medio', 'baixo')),
  level_label TEXT NOT NULL,
  actual_enamed_score NUMERIC(5,2), -- Preenchido no futuro para calibração estatística
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_readiness_snapshots_inst_student 
ON public.readiness_snapshots(institution_id, student_user_id, academic_year);

CREATE INDEX IF NOT EXISTS idx_readiness_snapshots_class 
ON public.readiness_snapshots(class_group_id);

-- RLS
ALTER TABLE public.readiness_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dirigente e Coordenador gerenciam snapshots de prontidao" ON public.readiness_snapshots;
CREATE POLICY "Dirigente e Coordenador gerenciam snapshots de prontidao"
ON public.readiness_snapshots
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

DROP POLICY IF EXISTS "Docente visualiza snapshots de alunos do seu escopo" ON public.readiness_snapshots;
CREATE POLICY "Docente visualiza snapshots de alunos do seu escopo"
ON public.readiness_snapshots
FOR SELECT
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
        AND im.institution_id = readiness_snapshots.institution_id
        AND ms.class_group_id = readiness_snapshots.class_group_id
    )
  )
);

DROP POLICY IF EXISTS "Aluno visualiza seus proprios snapshots se liberado" ON public.readiness_snapshots;
CREATE POLICY "Aluno visualiza seus proprios snapshots se liberado"
ON public.readiness_snapshots
FOR SELECT
TO authenticated
USING (student_user_id = auth.uid());
