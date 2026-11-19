-- ==============================================================================
-- MEDPLENI B2B — 002_seed_demo_down.sql
-- Remoção Cirúrgica e Reversão do Seed da "Faculdade Demonstração" (FADEP)
-- 100% SEGURO — NÃO AFETA NENHUM REGISTRO DO B2C NEM DE OUTRAS INSTITUIÇÕES
-- ==============================================================================

DO $$
DECLARE
  v_inst_id UUID := '11111111-1111-1111-1111-111111111111';
  v_alt_inst_id UUID := 'bbbb1111-1111-1111-1111-111111111111';
BEGIN
  -- 1. Remove tentativas e itens associados a provas de demonstração
  DELETE FROM public.attempt_answers
  WHERE attempt_id IN (
    SELECT id FROM public.attempts 
    WHERE assessment_id IN (
      SELECT id FROM public.assessments 
      WHERE institution_id IN (v_inst_id, v_alt_inst_id)
    )
  );

  DELETE FROM public.attempts
  WHERE assessment_id IN (
    SELECT id FROM public.assessments 
    WHERE institution_id IN (v_inst_id, v_alt_inst_id)
  );

  DELETE FROM public.assessment_items
  WHERE version_id IN (
    SELECT id FROM public.assessment_versions
    WHERE assessment_id IN (
      SELECT id FROM public.assessments 
      WHERE institution_id IN (v_inst_id, v_alt_inst_id)
    )
  );

  DELETE FROM public.assessment_forms
  WHERE version_id IN (
    SELECT id FROM public.assessment_versions
    WHERE assessment_id IN (
      SELECT id FROM public.assessments 
      WHERE institution_id IN (v_inst_id, v_alt_inst_id)
    )
  );

  DELETE FROM public.assessment_versions
  WHERE assessment_id IN (
    SELECT id FROM public.assessments 
    WHERE institution_id IN (v_inst_id, v_alt_inst_id)
  );

  DELETE FROM public.assessment_targets
  WHERE assessment_id IN (
    SELECT id FROM public.assessments 
    WHERE institution_id IN (v_inst_id, v_alt_inst_id)
  );

  DELETE FROM public.assessments
  WHERE institution_id IN (v_inst_id, v_alt_inst_id);

  -- 2. Remove intervenções, planos longitudinais e prontidão
  DELETE FROM public.intervention_adherences
  WHERE intervention_id IN (
    SELECT id FROM public.interventions WHERE institution_id IN (v_inst_id, v_alt_inst_id)
  );

  DELETE FROM public.interventions
  WHERE institution_id IN (v_inst_id, v_alt_inst_id);

  DELETE FROM public.longitudinal_action_plans
  WHERE institution_id IN (v_inst_id, v_alt_inst_id);

  DELETE FROM public.readiness_snapshots
  WHERE institution_id IN (v_inst_id, v_alt_inst_id);

  -- 3. Remove logs de governança e auditoria
  DELETE FROM public.b2b_governance_audit_logs
  WHERE institution_id IN (v_inst_id, v_alt_inst_id);

  DELETE FROM public.individual_access_log
  WHERE institution_id IN (v_inst_id, v_alt_inst_id);

  -- 4. Remove a Instituição Demo (ON DELETE CASCADE limpa cursos, turmas, termos, membros, escopos e matrículas)
  DELETE FROM public.institutions
  WHERE id IN (v_inst_id, v_alt_inst_id) OR slug = 'fadep-demo';

  -- 5. Remove os usuários fictícios criados exclusivamente para a demonstração (@fadep-demo.medpleni.com)
  DELETE FROM auth.users
  WHERE email LIKE '%@fadep-demo.medpleni.com';

  DELETE FROM public.profiles
  WHERE email LIKE '%@fadep-demo.medpleni.com';

  RAISE NOTICE 'Seed completo da Faculdade Demonstração (FADEP) removido com sucesso de todas as tabelas.';
END $$;
