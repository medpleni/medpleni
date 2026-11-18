-- ==============================================================================
-- MEDPLENI B2B — 002_areas_seed.sql
-- Tabela de Áreas Oficiais INEP e Seed Canônico
-- 100% IDEMPOTENTE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.b2b_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  color_hex TEXT,
  order_index INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilita RLS
ALTER TABLE public.b2b_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura pública de áreas para autenticados" ON public.b2b_areas;
CREATE POLICY "Leitura pública de áreas para autenticados"
  ON public.b2b_areas FOR SELECT
  TO authenticated, anon
  USING (true);

-- Inserção das 7 grandes áreas canônicas (com "Cirurgia Geral" conforme decisão H-04)
INSERT INTO public.b2b_areas (name, code, color_hex, order_index) VALUES
  ('Clínica Médica', 'CM', '#00C2A8', 1),
  ('Cirurgia Geral', 'CG', '#0077B6', 2),
  ('Ginecologia e Obstetrícia', 'GO', '#FF6B6B', 3),
  ('Pediatria', 'Ped', '#F5A623', 4),
  ('Medicina de Família e Comunidade', 'MFC', '#00B4D8', 5),
  ('Saúde Coletiva', 'SC', '#6B5CE7', 6),
  ('Saúde Mental', 'SM', '#A99EF5', 7)
ON CONFLICT (name) DO UPDATE SET
  code = EXCLUDED.code,
  color_hex = EXCLUDED.color_hex,
  order_index = EXCLUDED.order_index;
