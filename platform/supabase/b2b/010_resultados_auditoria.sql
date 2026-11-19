-- ==============================================================================
-- MEDPLENI B2B — 010_resultados_auditoria.sql
-- Auditoria de Fechamento de Correção, Ajustes de Gabarito/Anulação e
-- Congelamento Taxonômico dos Itens para Resultados por Eixo (PR-08, PR-10)
-- 100% ADITIVO E IDEMPOTENTE
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. COLUNAS TAXONÔMICAS CONGELADAS EM ASSESSMENT_ITEMS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessment_items' AND column_name = 'frozen_area'
  ) THEN
    ALTER TABLE public.assessment_items ADD COLUMN frozen_area TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessment_items' AND column_name = 'frozen_cenario'
  ) THEN
    ALTER TABLE public.assessment_items ADD COLUMN frozen_cenario TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessment_items' AND column_name = 'frozen_tema'
  ) THEN
    ALTER TABLE public.assessment_items ADD COLUMN frozen_tema TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessment_items' AND column_name = 'frozen_competencia'
  ) THEN
    ALTER TABLE public.assessment_items ADD COLUMN frozen_competencia TEXT;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. TABELA DE AUDITORIA DE AJUSTES E FECHAMENTO DE CORREÇÃO
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assessment_item_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  assessment_item_id UUID NOT NULL REFERENCES public.assessment_items(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('anular', 'trocar_gabarito')),
  previous_letter TEXT,
  new_letter TEXT,
  reason TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de auditoria e performance
CREATE INDEX IF NOT EXISTS idx_assessment_item_adjustments_asm 
  ON public.assessment_item_adjustments(assessment_id);

CREATE INDEX IF NOT EXISTS idx_assessment_item_adjustments_item 
  ON public.assessment_item_adjustments(assessment_item_id);

CREATE INDEX IF NOT EXISTS idx_attempts_assessment_status
  ON public.attempts(assessment_id, status);

CREATE INDEX IF NOT EXISTS idx_attempts_class_group
  ON public.attempts(class_group_id);

-- ------------------------------------------------------------------------------
-- 3. RLS PARA AUDITORIA DE AJUSTES
-- ------------------------------------------------------------------------------
ALTER TABLE public.assessment_item_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "policy_item_adjustments_select" ON public.assessment_item_adjustments;
CREATE POLICY "policy_item_adjustments_select" ON public.assessment_item_adjustments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      JOIN public.institution_members im ON im.institution_id = a.institution_id
      WHERE a.id = assessment_item_adjustments.assessment_id
        AND im.user_id = auth.uid()
        AND im.is_active = true
        AND im.role IN ('dirigente', 'coordenador', 'docente')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "policy_item_adjustments_insert" ON public.assessment_item_adjustments;
CREATE POLICY "policy_item_adjustments_insert" ON public.assessment_item_adjustments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessments a
      JOIN public.institution_members im ON im.institution_id = a.institution_id
      WHERE a.id = assessment_item_adjustments.assessment_id
        AND im.user_id = auth.uid()
        AND im.is_active = true
        AND im.role IN ('dirigente', 'coordenador', 'docente')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin')
    )
  );
