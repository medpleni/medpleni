-- ══════════════════════════════════════════════════════════════
-- MEDPLENI — TABELA DE CONVITES & CONTROLE DE ACESSO (INVITATIONS)
-- ══════════════════════════════════════════════════════════════

-- 1. Garante colunas de expiração e papel na tabela profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'access_expires_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN access_expires_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role VARCHAR(30) DEFAULT 'student';
  END IF;
END $$;

-- 2. Tabela de Convites Administrativos
CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'student', -- 'student', 'docente', 'financeiro', 'suporte', 'desenvolvedor', 'superadmin'
  plan VARCHAR(50) NOT NULL DEFAULT 'pleno_anual', -- 'diagnostico', 'pleno_mensal', 'pleno_anual', 'cortesia_vip', 'vitalicio'
  sub_brand VARCHAR(50) DEFAULT 'RESID', -- 'RESID', 'ENAMED', 'REVALIDA', 'ESPECIALISTA'
  access_duration VARCHAR(50) DEFAULT '1_ano', -- '30_dias', '90_dias', '6_meses', '1_ano', '2_anos', 'vitalicio', 'custom'
  access_expires_at TIMESTAMPTZ,
  token VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'revoked', 'expired'
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  accepted_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 3. Índices de performance
CREATE INDEX IF NOT EXISTS idx_admin_invitations_token ON public.admin_invitations(token);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON public.admin_invitations(email);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_status ON public.admin_invitations(status);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_created ON public.admin_invitations(created_at DESC);

-- 4. Habilita RLS
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS
DROP POLICY IF EXISTS "Administradores gerenciam convites" ON public.admin_invitations;
CREATE POLICY "Administradores gerenciam convites"
  ON public.admin_invitations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND (profiles.role IN ('superadmin', 'docente', 'financeiro', 'suporte', 'desenvolvedor') OR profiles.email = 'mario.nascimentolopes@gmail.com')
    )
  );

-- Leitura de convite por token público para validação no cadastro
DROP POLICY IF EXISTS "Leitura pública de convite por token" ON public.admin_invitations;
CREATE POLICY "Leitura pública de convite por token"
  ON public.admin_invitations FOR SELECT
  TO anon, authenticated
  USING (status = 'pending');
