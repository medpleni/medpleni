-- ══════════════════════════════════════════════════════════════
-- MEDPLENI — SCHEMA DO HUB DE SIMULADOS MÉDICOS (PROVAS REAIS & PREDIÇÃO)
-- ══════════════════════════════════════════════════════════════

-- 1. Garante colunas de categorização na tabela simulations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'simulations' AND column_name = 'sim_type'
  ) THEN
    ALTER TABLE public.simulations ADD COLUMN sim_type VARCHAR(50) DEFAULT 'prova_real';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'simulations' AND column_name = 'year'
  ) THEN
    ALTER TABLE public.simulations ADD COLUMN year INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'simulations' AND column_name = 'is_official'
  ) THEN
    ALTER TABLE public.simulations ADD COLUMN is_official BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'simulations' AND column_name = 'exam_edition'
  ) THEN
    ALTER TABLE public.simulations ADD COLUMN exam_edition VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'simulations' AND column_name = 'matrix_distribution'
  ) THEN
    ALTER TABLE public.simulations ADD COLUMN matrix_distribution JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 2. Atualiza RLS para criação de simulados personalizados por alunos
DROP POLICY IF EXISTS "Usuários autenticados criam simulados personalizados" ON public.simulations;
CREATE POLICY "Usuários autenticados criam simulados personalizados"
  ON public.simulations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_simulations_type ON public.simulations(sim_type);
CREATE INDEX IF NOT EXISTS idx_simulations_inst ON public.simulations(institution);
CREATE INDEX IF NOT EXISTS idx_simulations_year ON public.simulations(year);
