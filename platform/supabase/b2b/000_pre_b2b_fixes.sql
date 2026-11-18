-- ==============================================================================
-- MEDPLENI B2B — 000_pre_b2b_fixes.sql
-- Correções preventivas, integridade referencial e colunas aditivas pré-B2B
-- 100% IDEMPOTENTE E ADITIVO — NÃO APAGA DADOS EXISTENTES
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. LIMPEZA PREVENTIVA DE ÓRFÃOS E FK EM user_answers.simulation_id
-- ------------------------------------------------------------------------------
-- Se existirem registros em user_answers apontando para simulation_id inexistente,
-- seta para NULL antes de aplicar a constraint, garantindo integridade sem erro.
UPDATE public.user_answers
SET simulation_id = NULL
WHERE simulation_id IS NOT NULL
  AND simulation_id NOT IN (SELECT id FROM public.simulations);

-- Cria a chave estrangeira condicionalmente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_answers'
      AND constraint_name = 'user_answers_simulation_id_fkey'
  ) THEN
    ALTER TABLE public.user_answers
      ADD CONSTRAINT user_answers_simulation_id_fkey
      FOREIGN KEY (simulation_id)
      REFERENCES public.simulations(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. AMPLIAR context_type EM user_answers PARA SUPORTAR 'exam'
-- ------------------------------------------------------------------------------
ALTER TABLE public.user_answers
  DROP CONSTRAINT IF EXISTS user_answers_context_type_check;

ALTER TABLE public.user_answers
  ADD CONSTRAINT user_answers_context_type_check
  CHECK (context_type IN ('standalone', 'simulation', 'diagnostic', 'exam'));

-- ------------------------------------------------------------------------------
-- 3. COLUNAS ADITIVAS EM questions (METADADOS B2B E ACERVO)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- Rótulo de origem (ex: 'USP-2025' ou '2025')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'b2b_origin_label'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN b2b_origin_label TEXT;
  END IF;

  -- Flag indicando se pertence ao acervo geral MedPleni (true) ou se é exclusiva institucional
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'b2b_is_public'
  ) THEN
    ALTER TABLE public.questions ADD COLUMN b2b_is_public BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Índices auxiliares de performance
CREATE INDEX IF NOT EXISTS idx_user_answers_context_type ON public.user_answers(context_type);
CREATE INDEX IF NOT EXISTS idx_user_answers_simulation_id ON public.user_answers(simulation_id);
CREATE INDEX IF NOT EXISTS idx_questions_b2b_is_public ON public.questions(b2b_is_public);
