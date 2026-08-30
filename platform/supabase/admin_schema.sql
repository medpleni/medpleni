-- ══════════════════════════════════════════════════════════════
-- MEDPLENI — SCHEMA ADMINISTRATIVO & RBAC (Multi-Role Backoffice)
-- ══════════════════════════════════════════════════════════════

-- 1. Garante a coluna role na tabela profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role VARCHAR(30) DEFAULT 'student';
  END IF;
END $$;

-- 2. Define o usuário administrador inicial
UPDATE public.profiles 
SET role = 'superadmin'
WHERE email = 'mario.nascimentolopes@gmail.com';

-- 3. Tabela de Logs de Auditoria Administrativa
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_email VARCHAR(255),
  action VARCHAR(100) NOT NULL, -- 'create_question', 'update_student_plan', 'refund_issued', 'edit_simulation'
  target_entity VARCHAR(50) NOT NULL, -- 'question', 'profile', 'subscription', 'simulation'
  target_id VARCHAR(255),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Logs de Webhooks da Iugu
CREATE TABLE IF NOT EXISTS public.iugu_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event VARCHAR(100) NOT NULL, -- 'invoice.status_changed', 'invoice.created', 'subscription.renewed'
  invoice_id VARCHAR(100),
  customer_email VARCHAR(255),
  status VARCHAR(50),
  payload JSONB NOT NULL,
  processed_successfully BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_iugu_logs_event ON public.iugu_webhook_logs(event);
CREATE INDEX IF NOT EXISTS idx_iugu_logs_created ON public.iugu_webhook_logs(created_at DESC);

-- 6. Habilita RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iugu_webhook_logs ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de Segurança (Somente equipe administrativa autorizada)
DROP POLICY IF EXISTS "Acesso restrito a administradores para audit logs" ON public.admin_audit_logs;
CREATE POLICY "Acesso restrito a administradores para audit logs"
  ON public.admin_audit_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('superadmin', 'docente', 'financeiro', 'suporte', 'desenvolvedor')
    )
  );

DROP POLICY IF EXISTS "Acesso restrito a administradores para webhook logs" ON public.iugu_webhook_logs;
CREATE POLICY "Acesso restrito a administradores para webhook logs"
  ON public.iugu_webhook_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('superadmin', 'financeiro', 'desenvolvedor')
    )
  );
