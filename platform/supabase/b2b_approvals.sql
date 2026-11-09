-- Tabela para persistência centralizada das aprovações do módulo B2B
-- Permite que Dr. Bruno, Dr. Filipe, Mario e Renato compartilhem votos e comentários em tempo real

CREATE TABLE IF NOT EXISTS public.b2b_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL DEFAULT 'main',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.b2b_approvals ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso: público/anon para a central de aprovações
CREATE POLICY "Leitura pública de aprovações B2B"
  ON public.b2b_approvals
  FOR SELECT
  USING (true);

CREATE POLICY "Gravação pública de aprovações B2B"
  ON public.b2b_approvals
  FOR ALL
  USING (true)
  WITH CHECK (true);

