-- ==============================================================================
-- MEDPLENI B2B — 001_core_tables.sql
-- Tabelas Core Multi-Tenant B2B e RLS
-- 100% IDEMPOTENTE E ADITIVO
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. INSTITUIÇÕES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.b2b_institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  cnpj TEXT,
  is_demo BOOLEAN DEFAULT FALSE,
  cut_score NUMERIC(5, 2) DEFAULT 60.00, -- Régua 60 (Regra 7 da ESPEC)
  plan_type TEXT DEFAULT 'plus' CHECK (plan_type IN ('vazia', 'acervo', 'plus')),
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configurações e preferências por instituição
CREATE TABLE IF NOT EXISTS public.b2b_institution_config (
  institution_id UUID PRIMARY KEY REFERENCES public.b2b_institutions(id) ON DELETE CASCADE,
  cut_score NUMERIC(5, 2) DEFAULT 60.00,
  alerts_enabled JSONB DEFAULT '{"below_cut": true, "no_login": false, "no_questions": false, "pace_drop": false}'::jsonb,
  readiness_rules JSONB DEFAULT '{"min_questions_year": 10000, "min_score_percent": 60}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vínculo de questão com instituição proprietária (para autorais)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'b2b_institution_id'
  ) THEN
    ALTER TABLE public.questions
      ADD COLUMN b2b_institution_id UUID REFERENCES public.b2b_institutions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. MEMBROS DA INSTITUIÇÃO (Papéis e Acessos B2B)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.b2b_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.b2b_institutions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('dirigente', 'coordenador', 'docente', 'aluno')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(institution_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 3. TURMAS E ALUNOS POR TURMA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.b2b_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.b2b_institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  course TEXT NOT NULL DEFAULT 'Medicina',
  period INTEGER NOT NULL CHECK (period BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.b2b_class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.b2b_classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 4. LOG DE AUDITORIA LGPD (Acesso a dados individuais de estudantes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.b2b_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.b2b_institutions(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT,
  target_student_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'view_individual_profile', 'export_grades', etc.
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. ÍNDICES DE ALTA PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_b2b_members_user ON public.b2b_members(user_id);
CREATE INDEX IF NOT EXISTS idx_b2b_members_inst ON public.b2b_members(institution_id);
CREATE INDEX IF NOT EXISTS idx_b2b_classes_inst ON public.b2b_classes(institution_id);
CREATE INDEX IF NOT EXISTS idx_b2b_class_members_user ON public.b2b_class_members(user_id);
CREATE INDEX IF NOT EXISTS idx_b2b_audit_inst ON public.b2b_audit_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_questions_b2b_inst ON public.questions(b2b_institution_id);

-- ------------------------------------------------------------------------------
-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.b2b_institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_institution_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança: Membro ativo só visualiza dados da sua instituição
CREATE POLICY "Membros leem dados da sua instituicao"
  ON public.b2b_institutions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.b2b_members
      WHERE b2b_members.institution_id = b2b_institutions.id
        AND b2b_members.user_id = auth.uid()
        AND b2b_members.status = 'active'
    )
    OR (auth.jwt() ->> 'email') = 'mario.nascimentolopes@gmail.com'
  );

CREATE POLICY "Membros leem turmas da sua instituicao"
  ON public.b2b_classes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.b2b_members
      WHERE b2b_members.institution_id = b2b_classes.institution_id
        AND b2b_members.user_id = auth.uid()
        AND b2b_members.status = 'active'
    )
    OR (auth.jwt() ->> 'email') = 'mario.nascimentolopes@gmail.com'
  );

CREATE POLICY "Membros leem membros da sua instituicao"
  ON public.b2b_members FOR SELECT
  TO authenticated
  USING (
    institution_id IN (
      SELECT bm.institution_id FROM public.b2b_members bm
      WHERE bm.user_id = auth.uid() AND bm.status = 'active'
    )
    OR (auth.jwt() ->> 'email') = 'mario.nascimentolopes@gmail.com'
  );

-- Inserção de demonstração inicial (Faculdade Demonstração - Regra 5)
INSERT INTO public.b2b_institutions (id, name, slug, is_demo, plan_type, cut_score)
VALUES (
  '00000000-0000-0000-0000-0000000000b2',
  'Faculdade Demonstração',
  'faculdade-demo',
  TRUE,
  'plus',
  60.00
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.b2b_institution_config (institution_id, cut_score)
VALUES (
  '00000000-0000-0000-0000-0000000000b2',
  60.00
) ON CONFLICT (institution_id) DO NOTHING;
