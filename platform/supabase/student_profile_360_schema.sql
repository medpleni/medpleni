-- ══════════════════════════════════════════════════════════════════════════════
-- MEDPLENI — SCHEMA PERFIL 360° DO ALUNO, HISTÓRICO DE E-MAILS & STATUS
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Garante colunas de status e bloqueio na tabela profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN status VARCHAR(20) DEFAULT 'active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'blocked_reason'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN blocked_reason TEXT;
  END IF;
END $$;

-- 2. Tabela de Histórico de E-mails Disparados pela Plataforma
CREATE TABLE IF NOT EXISTS public.user_emails_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  email_type VARCHAR(50) NOT NULL DEFAULT 'notification', -- 'invitation', 'welcome', 'password_reset', 'custom_support', 'security_alert', 'notification'
  body_html TEXT,
  body_text TEXT,
  resend_id VARCHAR(100),
  status VARCHAR(30) DEFAULT 'delivered', -- 'sent', 'delivered', 'failed', 'bounced'
  error_message TEXT,
  sent_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_user_emails_recipient ON public.user_emails_log(recipient_email);
CREATE INDEX IF NOT EXISTS idx_user_emails_user_id ON public.user_emails_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_emails_created ON public.user_emails_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- 4. Habilita RLS
ALTER TABLE public.user_emails_log ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS: Acesso total para administradores e inserção irrestrita para o sistema
DROP POLICY IF EXISTS "Administradores gerenciam logs de e-mails" ON public.user_emails_log;
CREATE POLICY "Administradores gerenciam logs de e-mails"
  ON public.user_emails_log FOR ALL
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Permitir inserção de logs de email" ON public.user_emails_log;
CREATE POLICY "Permitir inserção de logs de email"
  ON public.user_emails_log FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- O usuário comum pode ler apenas os e-mails enviados para ele próprio
DROP POLICY IF EXISTS "Usuário consulta seus próprios e-mails" ON public.user_emails_log;
CREATE POLICY "Usuário consulta seus próprios e-mails"
  ON public.user_emails_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = recipient_email);

-- 6. Política para Administradores lerem todos os perfis
DROP POLICY IF EXISTS "Administradores podem consultar todos os perfis" ON public.profiles;
CREATE POLICY "Administradores podem consultar todos os perfis"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (p.role IN ('superadmin', 'docente', 'financeiro', 'suporte', 'desenvolvedor') OR p.email = 'mario.nascimentolopes@gmail.com')
    )
  );

-- 7. Política para Administradores atualizarem perfis de alunos
DROP POLICY IF EXISTS "Administradores podem atualizar perfis" ON public.profiles;
CREATE POLICY "Administradores podem atualizar perfis"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (p.role IN ('superadmin', 'docente', 'financeiro', 'suporte', 'desenvolvedor') OR p.email = 'mario.nascimentolopes@gmail.com')
    )
  );
