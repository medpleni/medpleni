-- ==============================================================================
-- MEDPLENI B2B — 012_visao_executiva_seed.sql
-- Seed de Avaliações, Versões, Itens, Tentativas e Respostas da Instituição Demo
-- (Faculdade Demonstração de Medicina - FADEP) para a Visão Executiva
-- ==============================================================================

DO $$
DECLARE
  v_inst_id UUID := '11111111-1111-1111-1111-111111111111';
  v_admin_id UUID := '44444444-4444-4444-4444-444444444444'; -- Dirigente
  
  -- 3 Avaliações ao longo do tempo (Evolução Temporal)
  v_exam1_id UUID := 'aaaa1111-1111-1111-1111-111111111111'; -- Simulado 2026.2 (Set/2026)
  v_exam2_id UUID := 'aaaa2222-2222-2222-2222-222222222222'; -- Avaliação Integrada (Out/2026)
  v_exam3_id UUID := 'aaaa3333-3333-3333-3333-333333333333'; -- Simulado Nacional 2027.1 (Nov/2026) - Prova em Análise Atual
  
  v_ver1_id UUID := 'bbbb1111-1111-1111-1111-111111111111';
  v_ver2_id UUID := 'bbbb2222-2222-2222-2222-222222222222';
  v_ver3_id UUID := 'bbbb3333-3333-3333-3333-333333333333';

  v_form3_id UUID := 'cccc3333-3333-3333-3333-333333333333';

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

  v_areas TEXT[] := ARRAY[
    'Clínica Médica',
    'Cirurgia Geral',
    'Ginecologia e Obstetrícia',
    'Pediatria',
    'Medicina de Família e Comunidade',
    'Saúde Coletiva',
    'Saúde Mental'
  ];

  v_item_id UUID;
  v_student_uid UUID;
  v_att_id UUID;
  v_period INTEGER;
  v_s_idx INTEGER;
  v_q_idx INTEGER;
  v_is_correct BOOLEAN;
  v_score_raw INTEGER;
  v_score_pct NUMERIC(5, 2);
  v_status TEXT;
  v_target_cg UUID;
  v_letter TEXT;
BEGIN
  -- 1. Cria as 3 avaliações institucionais
  INSERT INTO public.assessments (
    id, institution_id, title, type, modality, status, starts_at, ends_at, duration_minutes, author_id, planned_matrix
  ) VALUES
  (
    v_exam1_id, v_inst_id, 'Simulado ENAMED 2026.2 — Etapa 1', 'simulado_enamed_4', 'online', 'corrigida',
    '2026-09-15 08:00:00-03', '2026-09-15 12:00:00-03', 240, v_admin_id,
    '{"total_questions": 14}'::jsonb
  ),
  (
    v_exam2_id, v_inst_id, 'Avaliação Semestral Integrada 2026.2', 'prova_regular', 'hibrida', 'corrigida',
    '2026-10-20 08:00:00-03', '2026-10-20 12:00:00-03', 240, v_admin_id,
    '{"total_questions": 14}'::jsonb
  ),
  (
    v_exam3_id, v_inst_id, 'Simulado Nacional ENAMED 2027.1 — Março', 'simulado_enamed_12', 'online', 'corrigida',
    '2026-11-10 08:00:00-03', '2026-11-10 12:00:00-03', 240, v_admin_id,
    '{"total_questions": 14}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    status = EXCLUDED.status,
    starts_at = EXCLUDED.starts_at;

  -- 2. Cria versões congeladas
  INSERT INTO public.assessment_versions (id, assessment_id, version_number, published_by, is_current)
  VALUES
    (v_ver1_id, v_exam1_id, 1, v_admin_id, true),
    (v_ver2_id, v_exam2_id, 1, v_admin_id, true),
    (v_ver3_id, v_exam3_id, 1, v_admin_id, true)
  ON CONFLICT (id) DO NOTHING;

  -- 3. Cria Forma A para o Simulado 3
  INSERT INTO public.assessment_forms (id, version_id, form_code, items_shuffle_map)
  VALUES (v_form3_id, v_ver3_id, 'A', '[]'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  -- 4. Cria itens congelados para o Simulado 3 (14 itens: 2 por Grande Área)
  FOR v_q_idx IN 1..14 LOOP
    v_item_id := ('dddd3333-3333-3333-3333-' || LPAD(v_q_idx::TEXT, 12, '0'))::UUID;
    INSERT INTO public.assessment_items (
      id, version_id, order_index, frozen_statement, frozen_options,
      frozen_correct_letter, frozen_explanation, frozen_area, frozen_tema, status, weight
    ) VALUES (
      v_item_id,
      v_ver3_id,
      v_q_idx,
      'Questão ' || v_q_idx || ' sobre conduta médica em ' || v_areas[((v_q_idx - 1) % 7) + 1] || ' com base nas diretrizes nacionais.',
      '[{"letter": "A", "text": "Alternativa A", "is_correct": true}, {"letter": "B", "text": "Alternativa B", "is_correct": false}, {"letter": "C", "text": "Alternativa C", "is_correct": false}, {"letter": "D", "text": "Alternativa D", "is_correct": false}]'::jsonb,
      'A',
      'Justificativa pedagógica e evidência científica para a questão ' || v_q_idx,
      v_areas[((v_q_idx - 1) % 7) + 1],
      'Tema ' || v_q_idx || ' de ' || v_areas[((v_q_idx - 1) % 7) + 1],
      'valido',
      1.0
    ) ON CONFLICT (id) DO UPDATE SET
      frozen_area = EXCLUDED.frozen_area,
      status = 'valido';
  END LOOP;

  -- Cria itens também para o Exame 1 e Exame 2
  FOR v_q_idx IN 1..14 LOOP
    v_item_id := ('dddd1111-1111-1111-1111-' || LPAD(v_q_idx::TEXT, 12, '0'))::UUID;
    INSERT INTO public.assessment_items (
      id, version_id, order_index, frozen_statement, frozen_options,
      frozen_correct_letter, frozen_area, status, weight
    ) VALUES (
      v_item_id, v_ver1_id, v_q_idx, 'Item Prova 1 ' || v_q_idx, '[]'::jsonb, 'A',
      v_areas[((v_q_idx - 1) % 7) + 1], 'valido', 1.0
    ) ON CONFLICT (id) DO NOTHING;

    v_item_id := ('dddd2222-2222-2222-2222-' || LPAD(v_q_idx::TEXT, 12, '0'))::UUID;
    INSERT INTO public.assessment_items (
      id, version_id, order_index, frozen_statement, frozen_options,
      frozen_correct_letter, frozen_area, status, weight
    ) VALUES (
      v_item_id, v_ver2_id, v_q_idx, 'Item Prova 2 ' || v_q_idx, '[]'::jsonb, 'A',
      v_areas[((v_q_idx - 1) % 7) + 1], 'valido', 1.0
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- 5. Vincula turmas convocadas em assessment_targets para os 3 simulados
  FOR v_period IN 1..12 LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.assessment_targets 
      WHERE assessment_id = v_exam3_id AND class_group_id = v_class_ids[v_period]
    ) THEN
      INSERT INTO public.assessment_targets (assessment_id, target_type, class_group_id)
      VALUES (v_exam3_id, 'class_group', v_class_ids[v_period]);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.assessment_targets 
      WHERE assessment_id = v_exam1_id AND class_group_id = v_class_ids[v_period]
    ) THEN
      INSERT INTO public.assessment_targets (assessment_id, target_type, class_group_id)
      VALUES (v_exam1_id, 'class_group', v_class_ids[v_period]);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.assessment_targets 
      WHERE assessment_id = v_exam2_id AND class_group_id = v_class_ids[v_period]
    ) THEN
      INSERT INTO public.assessment_targets (assessment_id, target_type, class_group_id)
      VALUES (v_exam2_id, 'class_group', v_class_ids[v_period]);
    END IF;
  END LOOP;

  -- 6. Cria Tentativas (Attempts) e Respostas reais para os alunos de todas as 12 turmas
  -- Simulado 3 (Atual): 240 alunos (20 por turma)
  FOR v_period IN 1..12 LOOP
    v_target_cg := v_class_ids[v_period];

    FOR v_s_idx IN 1..20 LOOP
      v_student_uid := ('88888888-8888-8888-' || LPAD(v_period::TEXT, 2, '0') || '00-' || LPAD(v_s_idx::TEXT, 12, '0'))::UUID;
      v_att_id := ('eeee3333-' || LPAD(v_period::TEXT, 4, '0') || '-3333-3333-' || LPAD(v_s_idx::TEXT, 12, '0'))::UUID;

      -- 1 aluno ausente por turma (ausência = 5%)
      IF v_s_idx = 20 THEN
        v_status := 'ausente';
        v_score_raw := 0;
        v_score_pct := 0.00;
      ELSE
        v_status := 'finalizada';
        -- Simula notas realistas:
        -- Turmas iniciais (1-4) têm média em torno de 55-62 (algumas na zona de decisão e abaixo de 60)
        -- Turmas intermediárias (5-8) têm média 60-68
        -- Turmas finais (9-12) têm média 68-76
        v_score_raw := GREATEST(5, LEAST(14, 7 + (v_period / 2) + ((v_s_idx * 7) % 5) - 2));
        v_score_pct := ROUND((v_score_raw::NUMERIC / 14.0) * 100.0, 2);
      END IF;

      INSERT INTO public.attempts (
        id, assessment_id, version_id, form_id, student_user_id, class_group_id,
        modality, status, score_raw, score_percentage, started_at, submitted_at
      ) VALUES (
        v_att_id, v_exam3_id, v_ver3_id, v_form3_id, v_student_uid, v_target_cg,
        'online', v_status, v_score_raw, v_score_pct,
        '2026-11-10 08:05:00-03', '2026-11-10 11:30:00-03'
      ) ON CONFLICT (id) DO UPDATE SET
        score_raw = EXCLUDED.score_raw,
        score_percentage = EXCLUDED.score_percentage,
        status = EXCLUDED.status;

      -- Se finalizada, insere as 14 respostas do aluno em attempt_answers
      IF v_status = 'finalizada' THEN
        FOR v_q_idx IN 1..14 LOOP
          v_item_id := ('dddd3333-3333-3333-3333-' || LPAD(v_q_idx::TEXT, 12, '0'))::UUID;
          -- Acertos condicionados ao score_raw do aluno
          IF v_q_idx <= v_score_raw THEN
            v_is_correct := true;
            v_letter := 'A'; -- Gabarito oficial
          ELSE
            v_is_correct := false;
            v_letter := CASE (v_q_idx % 3) WHEN 0 THEN 'B' WHEN 1 THEN 'C' ELSE 'D' END;
          END IF;

          INSERT INTO public.attempt_answers (
            attempt_id, assessment_item_id, marked_form_letter, marked_base_letter, is_correct
          ) VALUES (
            v_att_id, v_item_id, v_letter, v_letter, v_is_correct
          ) ON CONFLICT (attempt_id, assessment_item_id) DO UPDATE SET
            marked_base_letter = EXCLUDED.marked_base_letter,
            is_correct = EXCLUDED.is_correct;
        END LOOP;
      END IF;

      -- Tentativa no Exame 1 (Setembro) para linha do tempo
      v_att_id := ('eeee1111-' || LPAD(v_period::TEXT, 4, '0') || '-1111-1111-' || LPAD(v_s_idx::TEXT, 12, '0'))::UUID;
      v_score_raw := GREATEST(4, LEAST(14, 6 + (v_period / 2) + ((v_s_idx * 5) % 5) - 2));
      v_score_pct := ROUND((v_score_raw::NUMERIC / 14.0) * 100.0, 2);
      INSERT INTO public.attempts (
        id, assessment_id, version_id, student_user_id, class_group_id,
        modality, status, score_raw, score_percentage, started_at, submitted_at
      ) VALUES (
        v_att_id, v_exam1_id, v_ver1_id, v_student_uid, v_target_cg,
        'online', 'finalizada', v_score_raw, v_score_pct,
        '2026-09-15 08:05:00-03', '2026-09-15 11:30:00-03'
      ) ON CONFLICT (id) DO NOTHING;

      -- Tentativa no Exame 2 (Outubro) para linha do tempo
      v_att_id := ('eeee2222-' || LPAD(v_period::TEXT, 4, '0') || '-2222-2222-' || LPAD(v_s_idx::TEXT, 12, '0'))::UUID;
      v_score_raw := GREATEST(5, LEAST(14, 7 + (v_period / 2) + ((v_s_idx * 3) % 4) - 1));
      v_score_pct := ROUND((v_score_raw::NUMERIC / 14.0) * 100.0, 2);
      INSERT INTO public.attempts (
        id, assessment_id, version_id, student_user_id, class_group_id,
        modality, status, score_raw, score_percentage, started_at, submitted_at
      ) VALUES (
        v_att_id, v_exam2_id, v_ver2_id, v_student_uid, v_target_cg,
        'hibrida', 'finalizada', v_score_raw, v_score_pct,
        '2026-10-20 08:05:00-03', '2026-10-20 11:30:00-03'
      ) ON CONFLICT (id) DO NOTHING;

    END LOOP;
  END LOOP;

END $$;
