-- ==============================================================================
-- MEDPLENI B2B — 018_seed_demo_completo.sql
-- Seed de Demonstração Completo e Coerente para a "Faculdade Demonstração" (FADEP)
-- 12 Turmas, ~240 Alunos, 8 Provas (ENAMED Etapas 1, 2 e 3, Prova em Papel OMR,
-- Par Pré/Pós-Aula, Regulares), Respostas por Item Realistas (Lacuna -> Intervenção -> Melhora),
-- Volumes de Prática no Praticar e Intervenções Concluídas.
-- 100% Reversível por 002_seed_demo_down.sql
-- ==============================================================================

DO $$
DECLARE
  v_inst_id UUID := '11111111-1111-1111-1111-111111111111';
  v_dirigente_uid UUID := '44444444-4444-4444-4444-444444444444';
  v_course_id UUID := '22222222-2222-2222-2222-222222222222';
  v_term_id UUID := '33333333-3333-3333-3333-333333333333';

  -- 8 Provas Aplicadas / Agendadas
  v_exam1_id UUID := 'aaaa1111-1111-1111-1111-000000000001'; -- Simulado ENAMED 1ª Etapa (4º P - Ciclo Básico)
  v_exam2_id UUID := 'aaaa2222-2222-2222-2222-000000000002'; -- Avaliação Integrada 2026.1 (Online - Lacuna P3)
  v_exam3_id UUID := 'aaaa3333-3333-3333-3333-000000000003'; -- Simulado ENAMED 2ª Etapa (8º P - Ciclo Clínico)
  v_exam4_id UUID := 'aaaa4444-4444-4444-4444-000000000004'; -- Prova Presencial em Papel (OMR Scanner & Foto)
  v_exam5_id UUID := 'aaaa5555-5555-5555-5555-000000000005'; -- Pré-Aula: Emergências Clínicas (P8 - Antes)
  v_exam6_id UUID := 'aaaa6666-6666-6666-6666-000000000006'; -- Pós-Aula: Emergências Clínicas (P8 - Depois)
  v_exam7_id UUID := 'aaaa7777-7777-7777-7777-000000000007'; -- Simulado Nacional ENAMED 3ª Etapa (12º P - P3 Recuperada)
  v_exam8_id UUID := 'aaaa8888-8888-8888-8888-000000000008'; -- Simulado Geral Integrado 2027.1 (Agendada)

  -- Versões Congeladas
  v_ver1_id UUID := 'bbbb1111-1111-1111-1111-000000000001';
  v_ver2_id UUID := 'bbbb2222-2222-2222-2222-000000000002';
  v_ver3_id UUID := 'bbbb3333-3333-3333-3333-000000000003';
  v_ver4_id UUID := 'bbbb4444-4444-4444-4444-000000000004';
  v_ver5_id UUID := 'bbbb5555-5555-5555-5555-000000000005';
  v_ver6_id UUID := 'bbbb6666-6666-6666-6666-000000000006';
  v_ver7_id UUID := 'bbbb7777-7777-7777-7777-000000000007';
  v_ver8_id UUID := 'bbbb8888-8888-8888-8888-000000000008';

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

  v_period INTEGER;
  v_s_idx INTEGER;
  v_q_idx INTEGER;
  v_item_id UUID;
  v_student_uid UUID;
  v_att_id UUID;
  v_is_correct BOOLEAN;
  v_letter TEXT;
  v_score_raw INTEGER;
  v_score_pct NUMERIC(5,2);
  v_area_name TEXT;
BEGIN
  -- 1. Garante que a Instituição Demo FADEP existe e tem as configurações completas
  INSERT INTO public.institutions (id, name, slug, initials, cut_score, is_demo, plan, is_active, settings)
  VALUES (
    v_inst_id,
    'Faculdade Demonstração de Medicina',
    'fadep-demo',
    'FADEP',
    60.00,
    TRUE,
    'plus',
    TRUE,
    '{"cut_score": 60, "decision_zone_min": 51, "readiness": {"volumeRuleEnabled": true, "minQuestionsYear": 10000, "consistencyRuleEnabled": true, "minScorePercent": 65, "minExamsCount": 4, "levelLabels": {"high": "No caminho", "medium": "Em atenção", "low": "Distante"}, "showToStudents": true}}'::jsonb
  ) ON CONFLICT (id) DO UPDATE SET
    cut_score = 60.00,
    is_demo = TRUE,
    settings = EXCLUDED.settings;

  -- 2. Insere/Atualiza as 8 Avaliações
  INSERT INTO public.assessments (
    id, institution_id, title, type, modality, status, starts_at, ends_at, duration_minutes, author_id, planned_matrix
  ) VALUES
  (
    v_exam1_id, v_inst_id, 'Simulado ENAMED 2026.1 — 1ª Etapa (4º Período)', 'simulado_enamed_4', 'online', 'corrigida',
    '2026-04-12 08:00:00-03', '2026-04-12 12:00:00-03', 240, v_dirigente_uid, '{"total_questions": 14}'::jsonb
  ),
  (
    v_exam2_id, v_inst_id, 'Avaliação Semestral Integrada 2026.1', 'prova_regular', 'online', 'corrigida',
    '2026-05-20 08:00:00-03', '2026-05-20 12:00:00-03', 240, v_dirigente_uid, '{"total_questions": 14}'::jsonb
  ),
  (
    v_exam3_id, v_inst_id, 'Simulado ENAMED 2026.2 — 2ª Etapa (8º Período)', 'simulado_enamed_8', 'online', 'corrigida',
    '2026-09-15 08:00:00-03', '2026-09-15 12:00:00-03', 240, v_dirigente_uid, '{"total_questions": 14}'::jsonb
  ),
  (
    v_exam4_id, v_inst_id, 'Prova Presencial Impressa 2026.2 (Leitura Óptica OMR)', 'prova_regular', 'papel', 'corrigida',
    '2026-10-18 08:00:00-03', '2026-10-18 12:00:00-03', 240, v_dirigente_uid, '{"total_questions": 14}'::jsonb
  ),
  (
    v_exam5_id, v_inst_id, 'Pré-Aula: Emergências Clínicas e Cardiovasculares', 'pre_aula', 'online', 'corrigida',
    '2026-10-25 08:00:00-03', '2026-10-25 08:45:00-03', 45, v_dirigente_uid, '{"total_questions": 10}'::jsonb
  ),
  (
    v_exam6_id, v_inst_id, 'Pós-Aula: Emergências Clínicas e Cardiovasculares', 'pos_aula', 'online', 'corrigida',
    '2026-10-25 11:30:00-03', '2026-10-25 12:15:00-03', 45, v_dirigente_uid, '{"total_questions": 10}'::jsonb
  ),
  (
    v_exam7_id, v_inst_id, 'Simulado Nacional ENAMED 2026.2 — 3ª Etapa (12º Período)', 'simulado_enamed_12', 'online', 'corrigida',
    '2026-11-10 08:00:00-03', '2026-11-10 12:00:00-03', 240, v_dirigente_uid, '{"total_questions": 14}'::jsonb
  ),
  (
    v_exam8_id, v_inst_id, 'Simulado Geral Integrado 2027.1', 'prova_regular', 'hibrida', 'publicada',
    '2027-03-25 08:00:00-03', '2027-03-25 12:00:00-03', 240, v_dirigente_uid, '{"total_questions": 14}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    modality = EXCLUDED.modality,
    status = EXCLUDED.status,
    starts_at = EXCLUDED.starts_at;

  -- 3. Versões Congeladas
  INSERT INTO public.assessment_versions (id, assessment_id, version_number, published_by, is_current)
  VALUES
    (v_ver1_id, v_exam1_id, 1, v_dirigente_uid, true),
    (v_ver2_id, v_exam2_id, 1, v_dirigente_uid, true),
    (v_ver3_id, v_exam3_id, 1, v_dirigente_uid, true),
    (v_ver4_id, v_exam4_id, 1, v_dirigente_uid, true),
    (v_ver5_id, v_exam5_id, 1, v_dirigente_uid, true),
    (v_ver6_id, v_exam6_id, 1, v_dirigente_uid, true),
    (v_ver7_id, v_exam7_id, 1, v_dirigente_uid, true),
    (v_ver8_id, v_exam8_id, 1, v_dirigente_uid, true)
  ON CONFLICT (id) DO NOTHING;

  -- 4. Cria Itens Congelados para as Avaliações Principais (14 itens cada)
  -- Versão 2 (Avaliação Semestral 2026.1 - onde P3 foi mal em Saúde Coletiva)
  FOR v_q_idx IN 1..14 LOOP
    v_item_id := ('dddd2222-2222-2222-2222-' || LPAD(v_q_idx::TEXT, 12, '0'))::UUID;
    v_area_name := v_areas[((v_q_idx - 1) % 7) + 1];
    INSERT INTO public.assessment_items (
      id, version_id, order_index, frozen_statement, frozen_options,
      frozen_correct_letter, frozen_explanation, frozen_area, status, weight
    ) VALUES (
      v_item_id, v_ver2_id, v_q_idx,
      'Questão ' || v_q_idx || ' sobre conduta diagnóstica em ' || v_area_name,
      '[{"letter": "A", "text": "Alternativa correta", "is_correct": true}, {"letter": "B", "text": "Alternativa B", "is_correct": false}, {"letter": "C", "text": "Alternativa C", "is_correct": false}, {"letter": "D", "text": "Alternativa D", "is_correct": false}]'::jsonb,
      'A', 'Comentário fundamentado nas diretrizes curriculares nacionais.', v_area_name, 'valido', 1.0
    ) ON CONFLICT (id) DO UPDATE SET frozen_area = EXCLUDED.frozen_area;
  END LOOP;

  -- Versão 7 (Simulado Nacional 2026.2 - onde P3 se recupera)
  FOR v_q_idx IN 1..14 LOOP
    v_item_id := ('dddd7777-7777-7777-7777-' || LPAD(v_q_idx::TEXT, 12, '0'))::UUID;
    v_area_name := v_areas[((v_q_idx - 1) % 7) + 1];
    INSERT INTO public.assessment_items (
      id, version_id, order_index, frozen_statement, frozen_options,
      frozen_correct_letter, frozen_explanation, frozen_area, status, weight
    ) VALUES (
      v_item_id, v_ver7_id, v_q_idx,
      'Questão ' || v_q_idx || ' de validação formativa em ' || v_area_name,
      '[{"letter": "A", "text": "Alternativa correta", "is_correct": true}, {"letter": "B", "text": "Alternativa B", "is_correct": false}, {"letter": "C", "text": "Alternativa C", "is_correct": false}, {"letter": "D", "text": "Alternativa D", "is_correct": false}]'::jsonb,
      'A', 'Justificativa clínica baseada em evidência de nível 1.', v_area_name, 'valido', 1.0
    ) ON CONFLICT (id) DO UPDATE SET frozen_area = EXCLUDED.frozen_area;
  END LOOP;

  -- Versão 5 e 6 (Pré e Pós-Aula de Emergências)
  FOR v_q_idx IN 1..10 LOOP
    INSERT INTO public.assessment_items (
      id, version_id, order_index, frozen_statement, frozen_options, frozen_correct_letter, frozen_area, status, weight
    ) VALUES (
      ('dddd5555-5555-5555-5555-' || LPAD(v_q_idx::TEXT, 12, '0'))::UUID,
      v_ver5_id, v_q_idx, 'Caso clínico pré-aula ' || v_q_idx || ' em Emergências', '[]'::jsonb, 'A', 'Clínica Médica', 'valido', 1.0
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.assessment_items (
      id, version_id, order_index, frozen_statement, frozen_options, frozen_correct_letter, frozen_area, status, weight
    ) VALUES (
      ('dddd6666-6666-6666-6666-' || LPAD(v_q_idx::TEXT, 12, '0'))::UUID,
      v_ver6_id, v_q_idx, 'Caso clínico pós-aula ' || v_q_idx || ' em Emergências', '[]'::jsonb, 'A', 'Clínica Médica', 'valido', 1.0
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- 5. Vincula Turmas Alvo
  FOR v_period IN 1..12 LOOP
    -- Provas Semestrais vinculam todas as 12 turmas
    INSERT INTO public.assessment_targets (assessment_id, target_type, class_group_id)
    VALUES 
      (v_exam2_id, 'class_group', v_class_ids[v_period]),
      (v_exam7_id, 'class_group', v_class_ids[v_period]),
      (v_exam8_id, 'class_group', v_class_ids[v_period])
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Provas Específicas vinculam turmas direcionadas
  INSERT INTO public.assessment_targets (assessment_id, target_type, class_group_id)
  VALUES 
    (v_exam1_id, 'class_group', v_class_ids[4]), -- 4º Período
    (v_exam3_id, 'class_group', v_class_ids[8]), -- 8º Período
    (v_exam4_id, 'class_group', v_class_ids[3]), -- Presencial P3
    (v_exam4_id, 'class_group', v_class_ids[8]), -- Presencial P8
    (v_exam5_id, 'class_group', v_class_ids[8]), -- Pré-Aula P8
    (v_exam6_id, 'class_group', v_class_ids[8])  -- Pós-Aula P8
  ON CONFLICT DO NOTHING;

  -- 6. Gera Tentativas e Respostas Realistas para os ~240 Alunos
  FOR v_period IN 1..12 LOOP
    FOR v_s_idx IN 1..20 LOOP
      v_student_uid := ('88888888-8888-8888-' || LPAD(v_period::TEXT, 2, '0') || '00-' || LPAD(v_s_idx::TEXT, 12, '0'))::UUID;

      -- A) Tentativa no Exame 2 (Avaliação Integrada 2026.1):
      -- Se for Turma P3 (v_period = 3), o aluno erra muito Saúde Coletiva (itens 6 e 13) -> média 47.5%
      v_att_id := ('eeee2222-' || LPAD(v_period::TEXT, 4, '0') || '-2222-2222-' || LPAD(v_s_idx::TEXT, 12, '0'))::UUID;
      IF v_period = 3 THEN
        v_score_raw := GREATEST(5, LEAST(9, 6 + ((v_s_idx * 3) % 4) - 1)); -- P3 tem média ~47.5% em Saúde Coletiva
      ELSE
        v_score_raw := GREATEST(6, LEAST(14, 7 + (v_period / 2) + ((v_s_idx * 5) % 4) - 1));
      END IF;
      v_score_pct := ROUND((v_score_raw::NUMERIC / 14.0) * 100.0, 2);

      INSERT INTO public.attempts (
        id, assessment_id, version_id, student_user_id, class_group_id,
        modality, status, score_raw, score_percentage, started_at, submitted_at
      ) VALUES (
        v_att_id, v_exam2_id, v_ver2_id, v_student_uid, v_class_ids[v_period],
        'online', 'finalizada', v_score_raw, v_score_pct,
        '2026-05-20 08:05:00-03', '2026-05-20 11:20:00-03'
      ) ON CONFLICT (id) DO UPDATE SET score_percentage = EXCLUDED.score_percentage;

      -- Respostas detalhadas do Exame 2 para P3
      IF v_period = 3 THEN
        FOR v_q_idx IN 1..14 LOOP
          v_item_id := ('dddd2222-2222-2222-2222-' || LPAD(v_q_idx::TEXT, 12, '0'))::UUID;
          -- Saúde Coletiva é questão 6 e 13: erra 80% das vezes
          IF v_q_idx IN (6, 13) THEN
            v_is_correct := (v_s_idx % 5 = 0); -- Apenas 20% acertam
            v_letter := CASE WHEN v_is_correct THEN 'A' ELSE 'C' END;
          ELSE
            v_is_correct := (v_q_idx <= v_score_raw);
            v_letter := CASE WHEN v_is_correct THEN 'A' ELSE 'B' END;
          END IF;

          INSERT INTO public.attempt_answers (
            attempt_id, assessment_item_id, marked_form_letter, marked_base_letter, is_correct
          ) VALUES (
            v_att_id, v_item_id, v_letter, v_letter, v_is_correct
          ) ON CONFLICT (attempt_id, assessment_item_id) DO NOTHING;
        END LOOP;
      END IF;

      -- B) Tentativa no Exame 7 (Simulado Nacional 2026.2 - Melhora após Intervenção):
      -- Turma P3 salta em Saúde Coletiva para 68.0%!
      v_att_id := ('eeee7777-' || LPAD(v_period::TEXT, 4, '0') || '-7777-7777-' || LPAD(v_s_idx::TEXT, 12, '0'))::UUID;
      IF v_period = 3 THEN
        v_score_raw := GREATEST(8, LEAST(12, 9 + ((v_s_idx * 3) % 4) - 1)); -- Média 68.0%!
      ELSE
        v_score_raw := GREATEST(7, LEAST(14, 8 + (v_period / 2) + ((v_s_idx * 7) % 4) - 1));
      END IF;
      v_score_pct := ROUND((v_score_raw::NUMERIC / 14.0) * 100.0, 2);

      INSERT INTO public.attempts (
        id, assessment_id, version_id, student_user_id, class_group_id,
        modality, status, score_raw, score_percentage, started_at, submitted_at
      ) VALUES (
        v_att_id, v_exam7_id, v_ver7_id, v_student_uid, v_class_ids[v_period],
        'online', 'finalizada', v_score_raw, v_score_pct,
        '2026-11-10 08:05:00-03', '2026-11-10 11:35:00-03'
      ) ON CONFLICT (id) DO UPDATE SET score_percentage = EXCLUDED.score_percentage;

      -- Respostas detalhadas do Exame 7 para P3 (recuperação comprovada)
      IF v_period = 3 THEN
        FOR v_q_idx IN 1..14 LOOP
          v_item_id := ('dddd7777-7777-7777-7777-' || LPAD(v_q_idx::TEXT, 12, '0'))::UUID;
          IF v_q_idx IN (6, 13) THEN
            v_is_correct := (v_s_idx % 4 <> 0); -- 75% acertam agora!
            v_letter := CASE WHEN v_is_correct THEN 'A' ELSE 'D' END;
          ELSE
            v_is_correct := (v_q_idx <= v_score_raw);
            v_letter := CASE WHEN v_is_correct THEN 'A' ELSE 'B' END;
          END IF;

          INSERT INTO public.attempt_answers (
            attempt_id, assessment_item_id, marked_form_letter, marked_base_letter, is_correct
          ) VALUES (
            v_att_id, v_item_id, v_letter, v_letter, v_is_correct
          ) ON CONFLICT (attempt_id, assessment_item_id) DO NOTHING;
        END LOOP;
      END IF;

      -- C) Pré e Pós-Aula na Turma P8 (v_period = 8):
      IF v_period = 8 THEN
        -- Pré-Aula (Exame 5): 42.0%
        v_score_raw := GREATEST(3, LEAST(6, 4 + (v_s_idx % 3) - 1));
        v_score_pct := ROUND((v_score_raw::NUMERIC / 10.0) * 100.0, 2);
        INSERT INTO public.attempts (
          id, assessment_id, version_id, student_user_id, class_group_id,
          modality, status, score_raw, score_percentage, started_at, submitted_at
        ) VALUES (
          ('eeee5555-0008-5555-5555-' || LPAD(v_s_idx::TEXT, 12, '0'))::UUID,
          v_exam5_id, v_ver5_id, v_student_uid, v_class_ids[8],
          'online', 'finalizada', v_score_raw, v_score_pct,
          '2026-10-25 08:05:00-03', '2026-10-25 08:40:00-03'
        ) ON CONFLICT (id) DO UPDATE SET score_percentage = EXCLUDED.score_percentage;

        -- Pós-Aula (Exame 6): 74.0% (+32 pontos percentuais de ganho)
        v_score_raw := GREATEST(6, LEAST(9, 7 + (v_s_idx % 3)));
        v_score_pct := ROUND((v_score_raw::NUMERIC / 10.0) * 100.0, 2);
        INSERT INTO public.attempts (
          id, assessment_id, version_id, student_user_id, class_group_id,
          modality, status, score_raw, score_percentage, started_at, submitted_at
        ) VALUES (
          ('eeee6666-0008-6666-6666-' || LPAD(v_s_idx::TEXT, 12, '0'))::UUID,
          v_exam6_id, v_ver6_id, v_student_uid, v_class_ids[8],
          'online', 'finalizada', v_score_raw, v_score_pct,
          '2026-10-25 11:35:00-03', '2026-10-25 12:10:00-03'
        ) ON CONFLICT (id) DO UPDATE SET score_percentage = EXCLUDED.score_percentage;
      END IF;

    END LOOP;
  END LOOP;

  -- 7. Intervenções Concluídas
  -- Intervenção 1: Lista no Praticar para Turma P3 em Saúde Coletiva
  INSERT INTO public.interventions (
    id, institution_id, type, target_type, class_group_id, parallel_class_group_id,
    axis_type, axis_value, title, origin_assessment_id, before_score,
    parallel_before_score, parallel_after_score, after_score,
    start_date, due_date, retest_assessment_id, retest_questions_count,
    practice_list_questions_count, status
  ) VALUES (
    'ffff1111-1111-1111-1111-000000000001', v_inst_id, 'lista_exercicios', 'class_group', v_class_ids[3], v_class_ids[4],
    'area', 'Saúde Coletiva', 'Reforço Curricular em Epidemiologia e SUS', v_exam2_id, 47.5,
    52.0, 55.0, 68.0,
    '2026-05-25', '2026-06-30', v_exam7_id, 5,
    25, 'concluida'
  ) ON CONFLICT (id) DO UPDATE SET
    before_score = EXCLUDED.before_score,
    after_score = EXCLUDED.after_score,
    status = EXCLUDED.status;

  -- Adesão da Turma P3 (92% de adesão na lista)
  FOR v_s_idx IN 1..20 LOOP
    v_student_uid := ('88888888-8888-8888-0300-' || LPAD(v_s_idx::TEXT, 12, '0'))::UUID;
    INSERT INTO public.intervention_adherences (
      intervention_id, student_user_id, status, questions_completed, questions_target, score_percentage, completed_at
    ) VALUES (
      'ffff1111-1111-1111-1111-000000000001', v_student_uid,
      CASE WHEN v_s_idx <= 18 THEN 'concluida' WHEN v_s_idx = 19 THEN 'em_progresso' ELSE 'pendente' END,
      CASE WHEN v_s_idx <= 18 THEN 25 WHEN v_s_idx = 19 THEN 14 ELSE 0 END,
      25,
      CASE WHEN v_s_idx <= 18 THEN 68.0 + ((v_s_idx * 3) % 15) ELSE NULL END,
      CASE WHEN v_s_idx <= 18 THEN now() - interval '20 days' ELSE NULL END
    ) ON CONFLICT (intervention_id, student_user_id) DO NOTHING;
  END LOOP;

  -- Intervenção 2: Par Pré/Pós Aula em Emergências na Turma P8
  INSERT INTO public.interventions (
    id, institution_id, type, target_type, class_group_id, parallel_class_group_id,
    axis_type, axis_value, title, origin_assessment_id, before_score,
    parallel_before_score, parallel_after_score, after_score,
    start_date, due_date, pre_exam_id, post_exam_id, status
  ) VALUES (
    'ffff2222-2222-2222-2222-000000000002', v_inst_id, 'pre_pos_aula', 'class_group', v_class_ids[8], NULL,
    'tema', 'Emergências Cardiovasculares', 'Módulo Teórico-Prático de Parada Cardiorrespiratória', v_exam5_id, 42.0,
    NULL, NULL, 74.0,
    '2026-10-25', '2026-10-25', v_exam5_id, v_exam6_id, 'concluida'
  ) ON CONFLICT (id) DO UPDATE SET
    before_score = EXCLUDED.before_score,
    after_score = EXCLUDED.after_score,
    status = EXCLUDED.status;

  -- Adesão da Turma P8 (95% de adesão no par pré/pós)
  FOR v_s_idx IN 1..20 LOOP
    v_student_uid := ('88888888-8888-8888-0800-' || LPAD(v_s_idx::TEXT, 12, '0'))::UUID;
    INSERT INTO public.intervention_adherences (
      intervention_id, student_user_id, status, questions_completed, questions_target, score_percentage, completed_at
    ) VALUES (
      'ffff2222-2222-2222-2222-000000000002', v_student_uid,
      CASE WHEN v_s_idx <= 19 THEN 'concluida' ELSE 'pendente' END,
      CASE WHEN v_s_idx <= 19 THEN 20 ELSE 0 END,
      20,
      CASE WHEN v_s_idx <= 19 THEN 74.0 + ((v_s_idx * 2) % 12) ELSE NULL END,
      CASE WHEN v_s_idx <= 19 THEN now() - interval '15 days' ELSE NULL END
    ) ON CONFLICT (intervention_id, student_user_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Seed completo da FADEP gerado com sucesso: 12 turmas, ~240 alunos, 8 provas, histórico realista e intervenções concluídas.';
END $$;
