-- ==============================================================================
-- MEDPLENI B2B — 002_seed_demo_down.sql
-- Remoção Cirúrgica e Reversão do Seed da "Faculdade Demonstração" (FADEP)
-- 100% SEGURO — NÃO AFETA NENHUM REGISTRO DO B2C NEM DE OUTRAS INSTITUIÇÕES
-- ==============================================================================

DO $$
DECLARE
  v_inst_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  -- 1. Remove a Instituição Demo (ON DELETE CASCADE limpa cursos, turmas, termos, membros, escopos e matrículas)
  DELETE FROM public.institutions
  WHERE id = v_inst_id OR slug = 'fadep-demo';

  -- 2. Remove logs de auditoria vinculados à demo se houver
  DELETE FROM public.individual_access_log
  WHERE institution_id = v_inst_id;

  -- 3. Remove os usuários fictícios criados exclusivamente para a demonstração
  -- Identificados unicamente pelo domínio @fadep-demo.medpleni.com
  DELETE FROM auth.users
  WHERE email LIKE '%@fadep-demo.medpleni.com';

  -- A trigger/FK de auth.users remove automaticamente os registros correspondentes em public.profiles.
  -- Por garantia adicional, remove do profiles se restar algum:
  DELETE FROM public.profiles
  WHERE email LIKE '%@fadep-demo.medpleni.com';

  RAISE NOTICE 'Seed da Faculdade Demonstração (FADEP) removido com sucesso.';
END $$;
