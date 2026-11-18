-- ==============================================================================
-- MEDPLENI B2B — 002_seed_demo.sql
-- Seed Completo da "Faculdade Demonstração" (FADEP)
-- 1 Instituição, 1 Curso, 12 Períodos/Turmas, 1 Dirigente, 2 Coord., 8 Docentes e 240 Alunos
-- 100% SEGURO — DADOS FICTÍCIOS — REMOVÍVEL POR 002_seed_demo_down.sql
-- ==============================================================================

DO $$
DECLARE
  v_inst_id UUID := '11111111-1111-1111-1111-111111111111';
  v_course_id UUID := '22222222-2222-2222-2222-222222222222';
  v_term_id UUID := '33333333-3333-3333-3333-333333333333';
  v_dir_uid UUID := '44444444-4444-4444-4444-444444444444';
  v_coord1_uid UUID := '55555555-5555-5555-5555-555555555551';
  v_coord2_uid UUID := '55555555-5555-5555-5555-555555555552';
  
  v_doc_ids UUID[] := ARRAY[
    '66666666-6666-6666-6666-666666666601'::UUID,
    '66666666-6666-6666-6666-666666666602'::UUID,
    '66666666-6666-6666-6666-666666666603'::UUID,
    '66666666-6666-6666-6666-666666666604'::UUID,
    '66666666-6666-6666-6666-666666666605'::UUID,
    '66666666-6666-6666-6666-666666666606'::UUID,
    '66666666-6666-6666-6666-666666666607'::UUID,
    '66666666-6666-6666-6666-666666666608'::UUID
  ];
  
  v_doc_names TEXT[] := ARRAY[
    'Dr. Arnaldo Silveira (Clínica Médica)',
    'Dra. Beatriz Albuquerque (Cirurgia Geral)',
    'Dr. Carlos Eduardo Lima (Ginecologia & Obstetrícia)',
    'Dra. Daniela Fontes (Pediatria)',
    'Dr. Evandro Guimarães (Med. Família & Comunidade)',
    'Dra. Fernanda Vasconcelos (Saúde Coletiva)',
    'Dr. Geraldo Peixoto (Saúde Mental)',
    'Dra. Helena Barreto (Urgência & Semiologia)'
  ];

  v_class_ids UUID[] := ARRAY[
    '77777777-7777-7777-7777-777777777701'::UUID,
    '77777777-7777-7777-7777-777777777702'::UUID,
    '77777777-7777-7777-7777-777777777703'::UUID,
    '77777777-7777-7777-7777-777777777704'::UUID,
    '77777777-7777-7777-7777-777777777705'::UUID,
    '77777777-7777-7777-7777-777777777706'::UUID,
    '77777777-7777-7777-7777-777777777707'::UUID,
    '77777777-7777-7777-7777-777777777708'::UUID,
    '77777777-7777-7777-7777-777777777709'::UUID,
    '77777777-7777-7777-7777-777777777710'::UUID,
    '77777777-7777-7777-7777-777777777711'::UUID,
    '77777777-7777-7777-7777-777777777712'::UUID
  ];

  v_first_names TEXT[] := ARRAY['Lucas', 'Mariana', 'Gabriel', 'Juliana', 'Matheus', 'Camila', 'Rodrigo', 'Larissa', 'Felipe', 'Amanda', 'Gustavo', 'Carolina', 'Vinicius', 'Leticia', 'Thiago', 'Fernanda', 'Leonardo', 'Bruna', 'Diego', 'Rafaela'];
  v_last_names TEXT[] := ARRAY['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa'];

  v_period INTEGER;
  v_idx INTEGER;
  v_student_uid UUID;
  v_student_name TEXT;
  v_student_email TEXT;
  v_member_id UUID;
  v_doc_member_id UUID;
  v_ra TEXT;
BEGIN

  -- 1. Cria ou atualiza a Instituição Demo
  INSERT INTO public.institutions (id, name, slug, initials, cut_score, is_demo, plan, is_active)
  VALUES (
    v_inst_id,
    'Faculdade Demonstração de Medicina',
    'fadep-demo',
    'FADEP',
    60.00,
    TRUE,
    'plus',
    TRUE
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    cut_score = EXCLUDED.cut_score,
    is_demo = TRUE;

  -- 2. Curso de Medicina
  INSERT INTO public.courses (id, institution_id, name, is_active)
  VALUES (v_course_id, v_inst_id, 'Medicina', TRUE)
  ON CONFLICT (id) DO NOTHING;

  -- 3. Período Letivo Vigente
  INSERT INTO public.academic_terms (id, institution_id, label, start_date, end_date, is_active)
  VALUES (v_term_id, v_inst_id, '2027.1', '2027-01-15', '2027-06-30', TRUE)
  ON CONFLICT (id) DO NOTHING;

  -- 4. Turmas do 1º ao 12º Período
  FOR v_period IN 1..12 LOOP
    INSERT INTO public.class_groups (id, course_id, term_id, period, label, is_active)
    VALUES (
      v_class_ids[v_period],
      v_course_id,
      v_term_id,
      v_period,
      'MED-2027-' || LPAD(v_period::TEXT, 2, '0') || 'P (Turma A)',
      TRUE
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- 5. Usuário: Dirigente Geral
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at)
  VALUES (
    v_dir_uid,
    '00000000-0000-0000-0000-000000000000',
    'dirigente@fadep-demo.medpleni.com',
    '$2a$10$demoHashedPasswordDummyForMockUsers000000000000000000000',
    NOW(),
    '{"full_name": "Dr. Fernando Nogueira (Dirigente Geral)"}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    'authenticated',
    'authenticated',
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, email, role, plan, onboarding_completed)
  VALUES (v_dir_uid, 'Dr. Fernando Nogueira (Dirigente Geral)', 'dirigente@fadep-demo.medpleni.com', 'student', 'aprovacao', TRUE)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  INSERT INTO public.institution_members (institution_id, user_id, role, is_active)
  VALUES (v_inst_id, v_dir_uid, 'dirigente', TRUE)
  ON CONFLICT (institution_id, user_id) DO NOTHING;

  -- 6. Usuários: 2 Coordenadores (Ciclo Clínico & Internato)
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at)
  VALUES
    (v_coord1_uid, '00000000-0000-0000-0000-000000000000', 'coord.clinico@fadep-demo.medpleni.com', '$2a$10$demoHashedPasswordDummyForMockUsers000000000000000000000', NOW(), '{"full_name": "Dra. Patricia Sampaio (Coord. Ciclo Clínico)"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb, 'authenticated', 'authenticated', NOW(), NOW()),
    (v_coord2_uid, '00000000-0000-0000-0000-000000000000', 'coord.internato@fadep-demo.medpleni.com', '$2a$10$demoHashedPasswordDummyForMockUsers000000000000000000000', NOW(), '{"full_name": "Dr. Marcelo Dantas (Coord. Internato)"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb, 'authenticated', 'authenticated', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, email, role, plan, onboarding_completed)
  VALUES
    (v_coord1_uid, 'Dra. Patricia Sampaio (Coord. Ciclo Clínico)', 'coord.clinico@fadep-demo.medpleni.com', 'student', 'aprovacao', TRUE),
    (v_coord2_uid, 'Dr. Marcelo Dantas (Coord. Internato)', 'coord.internato@fadep-demo.medpleni.com', 'student', 'aprovacao', TRUE)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  INSERT INTO public.institution_members (id, institution_id, user_id, role, is_active)
  VALUES
    (gen_random_uuid(), v_inst_id, v_coord1_uid, 'coordenador', TRUE),
    (gen_random_uuid(), v_inst_id, v_coord2_uid, 'coordenador', TRUE)
  ON CONFLICT (institution_id, user_id) DO NOTHING;

  -- Escopo dos coordenadores no Curso de Medicina
  INSERT INTO public.member_scopes (member_id, course_id)
  SELECT im.id, v_course_id
  FROM public.institution_members im
  WHERE im.user_id IN (v_coord1_uid, v_coord2_uid) AND im.institution_id = v_inst_id
  ON CONFLICT DO NOTHING;

  -- 7. Usuários: 8 Docentes e seus escopos em turmas
  FOR v_idx IN 1..8 LOOP
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at)
    VALUES (
      v_doc_ids[v_idx],
      '00000000-0000-0000-0000-000000000000',
      'docente' || v_idx || '@fadep-demo.medpleni.com',
      '$2a$10$demoHashedPasswordDummyForMockUsers000000000000000000000',
      NOW(),
      jsonb_build_object('full_name', v_doc_names[v_idx]),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      'authenticated',
      'authenticated',
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, full_name, email, role, plan, onboarding_completed)
    VALUES (v_doc_ids[v_idx], v_doc_names[v_idx], 'docente' || v_idx || '@fadep-demo.medpleni.com', 'student', 'aprovacao', TRUE)
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

    INSERT INTO public.institution_members (id, institution_id, user_id, role, is_active)
    VALUES (gen_random_uuid(), v_inst_id, v_doc_ids[v_idx], 'docente', TRUE)
    ON CONFLICT (institution_id, user_id) DO NOTHING;

    SELECT id INTO v_doc_member_id FROM public.institution_members WHERE user_id = v_doc_ids[v_idx] AND institution_id = v_inst_id;

    -- Atribui escopo do docente em turmas correspondentes ao seu ciclo
    -- Docentes 1-4 atuam no ciclo clínico e ENAMED 8P (turmas 5 a 8)
    -- Docentes 5-8 atuam no internato e ENAMED 12P (turmas 9 a 12)
    IF v_idx <= 4 THEN
      INSERT INTO public.member_scopes (member_id, class_group_id)
      VALUES
        (v_doc_member_id, v_class_ids[7]), -- 7º período
        (v_doc_member_id, v_class_ids[8])  -- 8º período (ENAMED 2ª etapa)
      ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO public.member_scopes (member_id, class_group_id)
      VALUES
        (v_doc_member_id, v_class_ids[11]), -- 11º período
        (v_doc_member_id, v_class_ids[12])  -- 12º período (ENAMED 3ª etapa)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- 8. 240 Alunos Fictícios (20 alunos por período × 12 turmas)
  FOR v_period IN 1..12 LOOP
    FOR v_idx IN 1..20 LOOP
      -- Gera UUID determinístico para a demo: 88888888-8888-8888-[periodo 2 digitos]-[aluno 2 digitos]00
      v_student_uid := ('88888888-8888-8888-' || LPAD(v_period::TEXT, 2, '0') || '00-' || LPAD(v_idx::TEXT, 12, '0'))::UUID;
      v_student_name := v_first_names[((v_period + v_idx) % 20) + 1] || ' ' || v_last_names[((v_period * 2 + v_idx) % 20) + 1];
      v_student_email := 'aluno.' || LPAD(v_period::TEXT, 2, '0') || 'p.' || LPAD(v_idx::TEXT, 2, '0') || '@fadep-demo.medpleni.com';
      v_ra := 'RA-FADEP-' || TO_CHAR(2027 - (12 - v_period)/2, 'FM9999') || '-' || LPAD((v_period * 100 + v_idx)::TEXT, 4, '0');

      -- Cria usuário auth
      INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at)
      VALUES (
        v_student_uid,
        '00000000-0000-0000-0000-000000000000',
        v_student_email,
        '$2a$10$demoHashedPasswordDummyForMockUsers000000000000000000000',
        NOW(),
        jsonb_build_object('full_name', v_student_name),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        'authenticated',
        'authenticated',
        NOW(),
        NOW()
      ) ON CONFLICT (id) DO NOTHING;

      -- Perfil B2C associado
      INSERT INTO public.profiles (id, full_name, email, role, plan, onboarding_completed, streak_days)
      VALUES (
        v_student_uid,
        v_student_name,
        v_student_email,
        'student',
        'aprovacao',
        TRUE,
        (v_period * 3 + v_idx) % 45
      ) ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

      -- Membro da Instituição como aluno
      INSERT INTO public.institution_members (id, institution_id, user_id, role, is_active)
      VALUES (gen_random_uuid(), v_inst_id, v_student_uid, 'aluno', TRUE)
      ON CONFLICT (institution_id, user_id) DO NOTHING;

      SELECT id INTO v_member_id FROM public.institution_members WHERE user_id = v_student_uid AND institution_id = v_inst_id;

      -- Matrícula na turma do período
      INSERT INTO public.enrollments (member_id, class_group_id, student_registration, status, start_date)
      VALUES (v_member_id, v_class_ids[v_period], v_ra, 'active', '2027-01-15')
      ON CONFLICT (member_id, class_group_id) DO NOTHING;

    END LOOP;
  END LOOP;

END $$;
