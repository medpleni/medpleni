-- ==============================================================================
-- MEDPLENI B2B — 003_convites_e_configuracoes.sql
-- Suporte a Convites Institucionais B2B, Importação em Lote de Matrículas
-- Gestão de Estrutura e Auditoria de Suporte Admin MedPleni
-- 100% ADITIVO E IDEMPOTENTE
-- ==============================================================================

-- 1. Colunas Aditivas na tabela admin_invitations para Vínculo B2B
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_invitations' AND column_name = 'institution_id'
  ) THEN
    ALTER TABLE public.admin_invitations
      ADD COLUMN institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_invitations' AND column_name = 'b2b_role'
  ) THEN
    ALTER TABLE public.admin_invitations
      ADD COLUMN b2b_role VARCHAR(50); -- 'dirigente', 'coordenador', 'docente', 'aluno'
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_invitations' AND column_name = 'b2b_scopes'
  ) THEN
    ALTER TABLE public.admin_invitations
      ADD COLUMN b2b_scopes JSONB DEFAULT '[]'::jsonb; -- IDs de cursos ou turmas
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_admin_invitations_inst ON public.admin_invitations(institution_id);

-- 2. Tabela de Sessões de Suporte / Auditoria de Suporte Admin MedPleni
CREATE TABLE IF NOT EXISTS public.b2b_support_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_sessions_admin ON public.b2b_support_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_support_sessions_inst ON public.b2b_support_sessions(institution_id);

ALTER TABLE public.b2b_support_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Apenas admin MedPleni registra e visualiza sessões de suporte" ON public.b2b_support_sessions;
CREATE POLICY "Apenas admin MedPleni registra e visualiza sessões de suporte"
  ON public.b2b_support_sessions FOR ALL
  TO authenticated
  USING (public.is_medpleni_admin())
  WITH CHECK (public.is_medpleni_admin());

-- 3. Atualiza RLS de admin_invitations para Dirigentes e Coordenadores gerenciarem convites da sua instituição
DROP POLICY IF EXISTS "Dirigentes e Coordenadores gerenciam convites da instituicao" ON public.admin_invitations;
CREATE POLICY "Dirigentes e Coordenadores gerenciam convites da instituicao"
  ON public.admin_invitations FOR ALL
  TO authenticated
  USING (
    public.is_medpleni_admin()
    OR (
      institution_id IS NOT NULL 
      AND public.has_role(institution_id, ARRAY['dirigente', 'coordenador'])
    )
  )
  WITH CHECK (
    public.is_medpleni_admin()
    OR (
      institution_id IS NOT NULL 
      AND public.has_role(institution_id, ARRAY['dirigente', 'coordenador'])
    )
  );

-- 4. Garantir que Admin MedPleni e Dirigentes gerenciem instituições (incluindo INSERT de novas)
DROP POLICY IF EXISTS "Dirigentes e admins gerenciam instituicao" ON public.institutions;
DROP POLICY IF EXISTS "Admin MedPleni gerencia instituicoes" ON public.institutions;
CREATE POLICY "Admin MedPleni e Dirigentes gerenciam instituicoes"
  ON public.institutions FOR ALL
  TO authenticated
  USING (public.is_medpleni_admin() OR public.has_role(id, ARRAY['dirigente']))
  WITH CHECK (public.is_medpleni_admin() OR public.has_role(id, ARRAY['dirigente']));

-- 5. Atualiza regra de membros: Dirigente e Admin alteram todos os papéis; Coordenador apenas docente/aluno
DROP POLICY IF EXISTS "Gestores gerenciam membros" ON public.institution_members;
CREATE POLICY "Gestores gerenciam membros"
  ON public.institution_members FOR ALL
  TO authenticated
  USING (
    public.is_medpleni_admin()
    OR public.has_role(institution_id, ARRAY['dirigente'])
    OR (
      public.has_role(institution_id, ARRAY['coordenador'])
      AND role IN ('docente', 'aluno')
    )
  )
  WITH CHECK (
    public.is_medpleni_admin()
    OR public.has_role(institution_id, ARRAY['dirigente'])
    OR (
      public.has_role(institution_id, ARRAY['coordenador'])
      AND role IN ('docente', 'aluno')
    )
  );

-- 6. Função de Importação em Lote de Matrículas (Alta Performance e Idempotência)
CREATE OR REPLACE FUNCTION public.batch_import_enrollments(
  p_institution_id UUID,
  p_students JSONB -- Array de { name, email, ra, class_group_id }
)
RETURNS JSONB AS $$
DECLARE
  v_student JSONB;
  v_user_id UUID;
  v_member_id UUID;
  v_cg_id UUID;
  v_email TEXT;
  v_name TEXT;
  v_ra TEXT;
  v_imported_count INT := 0;
  v_updated_count INT := 0;
BEGIN
  -- Verifica autorização do chamador
  IF NOT (public.is_medpleni_admin() OR public.has_role(p_institution_id, ARRAY['dirigente', 'coordenador'])) THEN
    RAISE EXCEPTION 'Acesso não autorizado para importar matrículas nesta instituição.';
  END IF;

  FOR v_student IN SELECT * FROM jsonb_array_elements(p_students)
  LOOP
    v_email := LOWER(TRIM(v_student->>'email'));
    v_name := TRIM(v_student->>'name');
    v_ra := TRIM(v_student->>'ra');
    v_cg_id := (v_student->>'class_group_id')::UUID;

    -- Localiza ou cria o usuário em auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = v_email LIMIT 1;
    
    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();
      INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at
      )
      VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        v_email,
        '$2a$10$insecureAuthDummyPasswordPlaceholderForImportedStudents000',
        NOW(),
        jsonb_build_object('full_name', v_name),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        'authenticated',
        'authenticated',
        NOW(),
        NOW()
      );
    END IF;

    -- Garante perfil no profiles
    INSERT INTO public.profiles (id, full_name, email, role, plan, onboarding_completed)
    VALUES (v_user_id, v_name, v_email, 'student', 'aprovacao', TRUE)
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

    -- Garante membro na institution_members
    INSERT INTO public.institution_members (institution_id, user_id, role, is_active)
    VALUES (p_institution_id, v_user_id, 'aluno', TRUE)
    ON CONFLICT (institution_id, user_id) DO UPDATE SET is_active = TRUE
    RETURNING id INTO v_member_id;

    IF v_member_id IS NULL THEN
      SELECT id INTO v_member_id FROM public.institution_members
      WHERE institution_id = p_institution_id AND user_id = v_user_id;
    END IF;

    -- Garante matrícula na turma (idempotente: atualiza se já existir)
    IF EXISTS (SELECT 1 FROM public.enrollments WHERE member_id = v_member_id AND class_group_id = v_cg_id) THEN
      UPDATE public.enrollments
      SET student_registration = v_ra, status = 'active', updated_at = NOW()
      WHERE member_id = v_member_id AND class_group_id = v_cg_id;
      v_updated_count := v_updated_count + 1;
    ELSE
      INSERT INTO public.enrollments (member_id, class_group_id, student_registration, status)
      VALUES (v_member_id, v_cg_id, v_ra, 'active');
      v_imported_count := v_imported_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'imported_count', v_imported_count,
    'updated_count', v_updated_count,
    'total_processed', v_imported_count + v_updated_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
