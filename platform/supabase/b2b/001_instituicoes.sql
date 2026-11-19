-- ==============================================================================
-- MEDPLENI B2B — 001_instituicoes.sql
-- Base Multi-Instituição, Escopos, Matrículas, Auditoria LGPD e RLS Rigorosa
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELAS CORE DO B2B
-- ------------------------------------------------------------------------------

-- 1.1 Instituições de Ensino
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  initials TEXT NOT NULL,
  logo_url TEXT,
  cut_score NUMERIC(5, 2) NOT NULL DEFAULT 60.00, -- Régua 60 (Regra 7 da ESPEC)
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  plan TEXT NOT NULL DEFAULT 'plus' CHECK (plan IN ('vazia', 'acervo', 'plus')),
  settings JSONB NOT NULL DEFAULT '{
    "alerts": {
      "below_cut": true,
      "no_login": false,
      "no_questions": false,
      "pace_drop": false
    },
    "readiness": {
      "min_questions_year": 10000,
      "min_score_percent": 60
    }
  }'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 Cursos da Instituição (ex: Medicina)
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(institution_id, name)
);

-- 1.3 Períodos Letivos / Termos Acadêmicos (ex: 2027.1)
CREATE TABLE IF NOT EXISTS public.academic_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(institution_id, label)
);

-- 1.4 Turmas / Grupos de Aula (class_groups)
CREATE TABLE IF NOT EXISTS public.class_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  term_id UUID REFERENCES public.academic_terms(id) ON DELETE SET NULL,
  period INTEGER NOT NULL CHECK (period BETWEEN 1 AND 12),
  label TEXT NOT NULL, -- ex: 'Turma A', 'MED-2027-8P'
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.5 Membros da Instituição (Papel institucional independente de profiles.role)
CREATE TABLE IF NOT EXISTS public.institution_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('dirigente', 'coordenador', 'docente', 'aluno')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(institution_id, user_id)
);

-- 1.6 Escopos de Acesso por Membro (Coord. de curso ou Docente de turma)
CREATE TABLE IF NOT EXISTS public.member_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.institution_members(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  class_group_id UUID REFERENCES public.class_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_member_scope_exclusive CHECK (
    (course_id IS NOT NULL AND class_group_id IS NULL) OR
    (course_id IS NULL AND class_group_id IS NOT NULL)
  )
);

-- 1.7 Matrículas de Alunos nas Turmas (enrollments)
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.institution_members(id) ON DELETE CASCADE,
  class_group_id UUID NOT NULL REFERENCES public.class_groups(id) ON DELETE CASCADE,
  student_registration TEXT, -- RA ou matrícula acadêmica
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'completed', 'transferred')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(member_id, class_group_id)
);

-- 1.8 Log de Auditoria LGPD de Acessos Individuais
CREATE TABLE IF NOT EXISTS public.individual_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_role TEXT NOT NULL,
  student_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  screen_viewed TEXT NOT NULL, -- ex: 'perfil_estudante_modal', 'evolucao_individual'
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. ÍNDICES DE ALTA PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_inst_slug ON public.institutions(slug);
CREATE INDEX IF NOT EXISTS idx_courses_inst ON public.courses(institution_id);
CREATE INDEX IF NOT EXISTS idx_terms_inst ON public.academic_terms(institution_id);
CREATE INDEX IF NOT EXISTS idx_class_groups_course ON public.class_groups(course_id);
CREATE INDEX IF NOT EXISTS idx_class_groups_period ON public.class_groups(period);
CREATE INDEX IF NOT EXISTS idx_inst_members_inst ON public.institution_members(institution_id);
CREATE INDEX IF NOT EXISTS idx_inst_members_user ON public.institution_members(user_id);
CREATE INDEX IF NOT EXISTS idx_inst_members_role ON public.institution_members(role);
CREATE INDEX IF NOT EXISTS idx_member_scopes_member ON public.member_scopes(member_id);
CREATE INDEX IF NOT EXISTS idx_member_scopes_class ON public.member_scopes(class_group_id);
CREATE INDEX IF NOT EXISTS idx_member_scopes_course ON public.member_scopes(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_member ON public.enrollments(member_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON public.enrollments(class_group_id);
CREATE INDEX IF NOT EXISTS idx_access_log_inst ON public.individual_access_log(institution_id);
CREATE INDEX IF NOT EXISTS idx_access_log_student ON public.individual_access_log(student_user_id);
CREATE INDEX IF NOT EXISTS idx_access_log_created ON public.individual_access_log(created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. FUNÇÕES SECURITY DEFINER
-- ------------------------------------------------------------------------------

-- Verifica se é Admin da MedPleni (profiles.role = 'admin' / 'superadmin')
CREATE OR REPLACE FUNCTION public.is_medpleni_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role IN ('admin', 'superadmin') OR p.email = 'mario.nascimentolopes@gmail.com')
    )
    OR (auth.jwt() ->> 'email') = 'mario.nascimentolopes@gmail.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Verifica se o usuário é membro ativo da instituição especificada
CREATE OR REPLACE FUNCTION public.is_member(inst_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_medpleni_admin() THEN
    RETURN TRUE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.institution_id = inst_id
      AND im.user_id = auth.uid()
      AND im.is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Verifica se o usuário possui algum dos papéis informados na instituição
CREATE OR REPLACE FUNCTION public.has_role(inst_id UUID, required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_medpleni_admin() THEN
    RETURN TRUE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.institution_members im
    WHERE im.institution_id = inst_id
      AND im.user_id = auth.uid()
      AND im.role = ANY(required_roles)
      AND im.is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Retorna a instituição associada a uma turma
CREATE OR REPLACE FUNCTION public.get_class_group_institution(cg_id UUID)
RETURNS UUID AS $$
  SELECT c.institution_id
  FROM public.class_groups cg
  JOIN public.courses c ON c.id = cg.course_id
  WHERE cg.id = cg_id;
$$ LANGUAGE sql STABLE;

-- Verifica se o usuário autenticado tem permissão legal (LGPD) para ver o aluno especificado
CREATE OR REPLACE FUNCTION public.can_see_student(student_uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- 1. O próprio estudante sempre pode ver seus dados
  IF auth.uid() = student_uid THEN
    RETURN TRUE;
  END IF;

  -- 2. Admin MedPleni vê tudo
  IF public.is_medpleni_admin() THEN
    RETURN TRUE;
  END IF;

  -- 3. Dirigente da instituição onde o aluno possui matrícula ativa
  IF EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.institution_members stu_m ON stu_m.id = e.member_id
    JOIN public.institution_members dir_m ON dir_m.institution_id = stu_m.institution_id
    WHERE stu_m.user_id = student_uid
      AND dir_m.user_id = auth.uid()
      AND dir_m.role = 'dirigente'
      AND dir_m.is_active = TRUE
      AND stu_m.is_active = TRUE
      AND e.status = 'active'
  ) THEN
    RETURN TRUE;
  END IF;

  -- 4. Coordenador: vê alunos dos cursos sob sua coordenação (com ou sem escopo restritivo)
  IF EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.class_groups cg ON cg.id = e.class_group_id
    JOIN public.institution_members stu_m ON stu_m.id = e.member_id
    JOIN public.institution_members coord_m ON coord_m.institution_id = stu_m.institution_id
    LEFT JOIN public.member_scopes ms ON ms.member_id = coord_m.id AND ms.course_id IS NOT NULL
    WHERE stu_m.user_id = student_uid
      AND coord_m.user_id = auth.uid()
      AND coord_m.role = 'coordenador'
      AND coord_m.is_active = TRUE
      AND stu_m.is_active = TRUE
      AND e.status = 'active'
      AND (ms.course_id IS NULL OR ms.course_id = cg.course_id)
  ) THEN
    RETURN TRUE;
  END IF;

  -- 5. Docente: SOMENTE alunos matriculados nas turmas em que o docente possui escopo explícito
  IF EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.institution_members stu_m ON stu_m.id = e.member_id
    JOIN public.institution_members doc_m ON doc_m.institution_id = stu_m.institution_id
    JOIN public.member_scopes ms ON ms.member_id = doc_m.id
    WHERE stu_m.user_id = student_uid
      AND doc_m.user_id = auth.uid()
      AND doc_m.role = 'docente'
      AND doc_m.is_active = TRUE
      AND stu_m.is_active = TRUE
      AND e.status = 'active'
      AND ms.class_group_id = e.class_group_id
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------------------------
-- 4. HABILITAR ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.individual_access_log ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 5. POLÍTICAS RLS (Row Level Security)
-- ------------------------------------------------------------------------------

-- ── 5.1 institutions ──
DROP POLICY IF EXISTS "Membros leem sua propria instituicao" ON public.institutions;
CREATE POLICY "Membros leem sua propria instituicao"
  ON public.institutions FOR SELECT
  TO authenticated
  USING (public.is_member(id));

DROP POLICY IF EXISTS "Dirigentes e admins gerenciam instituicao" ON public.institutions;
CREATE POLICY "Dirigentes e admins gerenciam instituicao"
  ON public.institutions FOR ALL
  TO authenticated
  USING (public.has_role(id, ARRAY['dirigente']));

-- ── 5.2 courses ──
DROP POLICY IF EXISTS "Membros leem cursos da instituicao" ON public.courses;
CREATE POLICY "Membros leem cursos da instituicao"
  ON public.courses FOR SELECT
  TO authenticated
  USING (public.is_member(institution_id));

DROP POLICY IF EXISTS "Gestores gerenciam cursos" ON public.courses;
CREATE POLICY "Gestores gerenciam cursos"
  ON public.courses FOR ALL
  TO authenticated
  USING (public.has_role(institution_id, ARRAY['dirigente', 'coordenador']));

-- ── 5.3 academic_terms ──
DROP POLICY IF EXISTS "Membros leem termos da instituicao" ON public.academic_terms;
CREATE POLICY "Membros leem termos da instituicao"
  ON public.academic_terms FOR SELECT
  TO authenticated
  USING (public.is_member(institution_id));

DROP POLICY IF EXISTS "Gestores gerenciam termos" ON public.academic_terms;
CREATE POLICY "Gestores gerenciam termos"
  ON public.academic_terms FOR ALL
  TO authenticated
  USING (public.has_role(institution_id, ARRAY['dirigente', 'coordenador']));

-- ── 5.4 class_groups (Turmas) ──
DROP POLICY IF EXISTS "Visualizacao seletiva de turmas" ON public.class_groups;
CREATE POLICY "Visualizacao seletiva de turmas"
  ON public.class_groups FOR SELECT
  TO authenticated
  USING (
    -- Admin / Dirigente da instituição vê todas
    public.has_role(public.get_class_group_institution(id), ARRAY['dirigente'])
    -- Coordenador vê as do curso (ou geral se sem restrição)
    OR EXISTS (
      SELECT 1 FROM public.institution_members im
      LEFT JOIN public.member_scopes ms ON ms.member_id = im.id AND ms.course_id IS NOT NULL
      WHERE im.user_id = auth.uid()
        AND im.role = 'coordenador'
        AND im.institution_id = public.get_class_group_institution(class_groups.id)
        AND im.is_active = TRUE
        AND (ms.course_id IS NULL OR ms.course_id = class_groups.course_id)
    )
    -- Docente: vê apenas turmas do seu escopo
    OR EXISTS (
      SELECT 1 FROM public.institution_members im
      JOIN public.member_scopes ms ON ms.member_id = im.id
      WHERE im.user_id = auth.uid()
        AND im.role = 'docente'
        AND im.is_active = TRUE
        AND ms.class_group_id = class_groups.id
    )
    -- Aluno: vê apenas sua própria turma
    OR EXISTS (
      SELECT 1 FROM public.institution_members im
      JOIN public.enrollments e ON e.member_id = im.id
      WHERE im.user_id = auth.uid()
        AND im.role = 'aluno'
        AND im.is_active = TRUE
        AND e.class_group_id = class_groups.id
        AND e.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Gestores gerenciam turmas" ON public.class_groups;
CREATE POLICY "Gestores gerenciam turmas"
  ON public.class_groups FOR ALL
  TO authenticated
  USING (public.has_role(public.get_class_group_institution(id), ARRAY['dirigente', 'coordenador']));

-- ── 5.5 institution_members ──
DROP POLICY IF EXISTS "Visualizacao seletiva de membros" ON public.institution_members;
CREATE POLICY "Visualizacao seletiva de membros"
  ON public.institution_members FOR SELECT
  TO authenticated
  USING (
    -- Próprio usuário sempre se enxerga
    user_id = auth.uid()
    -- Admin / Dirigente / Coordenador enxergam todos da instituição
    OR public.has_role(institution_id, ARRAY['dirigente', 'coordenador'])
    -- Docente: enxerga apenas colegas e alunos com quem compartilha turma
    OR EXISTS (
      SELECT 1 FROM public.institution_members my_m
      JOIN public.member_scopes my_ms ON my_ms.member_id = my_m.id
      JOIN public.enrollments e ON e.class_group_id = my_ms.class_group_id
      WHERE my_m.user_id = auth.uid()
        AND my_m.role = 'docente'
        AND my_m.is_active = TRUE
        AND e.member_id = institution_members.id
        AND e.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Gestores gerenciam membros" ON public.institution_members;
CREATE POLICY "Gestores gerenciam membros"
  ON public.institution_members FOR ALL
  TO authenticated
  USING (public.has_role(institution_id, ARRAY['dirigente', 'coordenador']));

-- ── 5.6 member_scopes ──
DROP POLICY IF EXISTS "Leitura de escopos de membros" ON public.member_scopes;
CREATE POLICY "Leitura de escopos de membros"
  ON public.member_scopes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.institution_members im
      WHERE im.id = member_scopes.member_id
        AND (im.user_id = auth.uid() OR public.has_role(im.institution_id, ARRAY['dirigente', 'coordenador']))
    )
  );

DROP POLICY IF EXISTS "Gestores gerenciam escopos" ON public.member_scopes;
CREATE POLICY "Gestores gerenciam escopos"
  ON public.member_scopes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.institution_members im
      WHERE im.id = member_scopes.member_id
        AND public.has_role(im.institution_id, ARRAY['dirigente', 'coordenador'])
    )
  );

-- ── 5.7 enrollments (Matrículas) ──
DROP POLICY IF EXISTS "Leitura autorizada de matriculas" ON public.enrollments;
CREATE POLICY "Leitura autorizada de matriculas"
  ON public.enrollments FOR SELECT
  TO authenticated
  USING (
    public.can_see_student((
      SELECT im.user_id FROM public.institution_members im WHERE im.id = enrollments.member_id
    ))
  );

DROP POLICY IF EXISTS "Gestores gerenciam matriculas" ON public.enrollments;
CREATE POLICY "Gestores gerenciam matriculas"
  ON public.enrollments FOR ALL
  TO authenticated
  USING (
    public.has_role(public.get_class_group_institution(class_group_id), ARRAY['dirigente', 'coordenador'])
  );

-- ── 5.8 individual_access_log ──
DROP POLICY IF EXISTS "Gestores consultam logs LGPD" ON public.individual_access_log;
CREATE POLICY "Gestores consultam logs LGPD"
  ON public.individual_access_log FOR SELECT
  TO authenticated
  USING (public.has_role(institution_id, ARRAY['dirigente', 'coordenador']));

DROP POLICY IF EXISTS "Membros registram logs LGPD" ON public.individual_access_log;
CREATE POLICY "Membros registram logs LGPD"
  ON public.individual_access_log FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND public.is_member(institution_id)
  );
