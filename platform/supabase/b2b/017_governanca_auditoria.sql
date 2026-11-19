-- ==============================================================================
-- MEDPLENI B2B — 017_governanca_auditoria.sql
-- Governança, Trilha de Auditoria Imutável e LGPD (P24 / ESPEC-B2B 0 e 2)
-- ==============================================================================

-- 1. TABELA DE AUDITORIA IMUTÁVEL DE GOVERNANÇA B2B
CREATE TABLE IF NOT EXISTS public.b2b_governance_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'gabarito_retificado',
      'questao_anulada',
      'prova_reaberta',
      'papel_alterado',
      'dados_exportados',
      'suporte_medpleni_acesso',
      'corte_parametros_alterados',
      'anonimizacao_aluno',
      'encerramento_instituicao'
    )
  ),
  performed_by UUID NOT NULL,
  performed_by_name TEXT NOT NULL,
  performed_by_role TEXT NOT NULL,
  target_id TEXT,
  target_label TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de Alta Performance para Auditoria e Compliance
CREATE INDEX IF NOT EXISTS idx_b2b_gov_audit_inst_type 
ON public.b2b_governance_audit_logs(institution_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_b2b_gov_audit_performed_by 
ON public.b2b_governance_audit_logs(performed_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_b2b_gov_audit_target 
ON public.b2b_governance_audit_logs(target_id);

-- 2. TRIGGER DE IMUTABILIDADE ESTREITA (PREVINE QUALQUER UPDATE OU DELETE)
CREATE OR REPLACE FUNCTION public.fn_prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'A trilha de auditoria do MedPleni B2B é imutável para conformidade regulatória e LGPD. Operações de UPDATE ou DELETE são terminantemente proibidas.';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_b2b_gov_audit_mutation ON public.b2b_governance_audit_logs;
CREATE TRIGGER trg_prevent_b2b_gov_audit_mutation
BEFORE UPDATE OR DELETE ON public.b2b_governance_audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.fn_prevent_audit_log_mutation();

-- 3. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.b2b_governance_audit_logs ENABLE ROW LEVEL SECURITY;

-- 3.1. Inserção permitida para ações autenticadas do sistema e usuários com papel institucional
DROP POLICY IF EXISTS "Sistema e membros inserem logs de governanca" ON public.b2b_governance_audit_logs;
CREATE POLICY "Sistema e membros inserem logs de governanca"
ON public.b2b_governance_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_medpleni_admin() OR
  public.has_role(institution_id, ARRAY['dirigente', 'coordenador', 'docente'])
);

-- 3.2. Consulta permitida exclusivamente para Dirigente e Superadmin MedPleni
DROP POLICY IF EXISTS "Dirigente e Admin consultam trilha de auditoria" ON public.b2b_governance_audit_logs;
CREATE POLICY "Dirigente e Admin consultam trilha de auditoria"
ON public.b2b_governance_audit_logs
FOR SELECT
TO authenticated
USING (
  public.is_medpleni_admin() OR
  public.has_role(institution_id, ARRAY['dirigente'])
);

-- 4. SEED DE DEMONSTRAÇÃO DE EVENTOS DE AUDITORIA PARA A FADEP (CASO EXISTA)
DO $$
DECLARE
  v_inst_id UUID;
  v_dirigente_uid UUID;
  v_admin_uid UUID;
BEGIN
  -- Identifica a instituição FADEP (por id clássico ou flag de demo)
  SELECT id INTO v_inst_id 
  FROM public.institutions 
  WHERE id = '11111111-1111-1111-1111-111111111111' 
     OR id = 'bbbb1111-1111-1111-1111-111111111111' 
     OR is_demo = TRUE 
  LIMIT 1;

  IF v_inst_id IS NOT NULL THEN
    -- Identifica o dirigente ou qualquer membro da instituição para autoria dos logs
    SELECT user_id INTO v_dirigente_uid
    FROM public.institution_members
    WHERE institution_id = v_inst_id AND role = 'dirigente'
    LIMIT 1;

    IF v_dirigente_uid IS NULL THEN
      SELECT id INTO v_dirigente_uid FROM auth.users LIMIT 1;
      IF v_dirigente_uid IS NULL THEN
        v_dirigente_uid := '44444444-4444-4444-4444-444444444444'::uuid;
      END IF;
    END IF;

    v_admin_uid := v_dirigente_uid;

    -- Evento 1: Retificação de Gabarito
    INSERT INTO public.b2b_governance_audit_logs (
      id, institution_id, event_type, performed_by, performed_by_name, performed_by_role,
      target_id, target_label, details, created_at
    ) VALUES (
      'ffff1111-1111-1111-1111-000000000001', v_inst_id, 'gabarito_retificado',
      v_dirigente_uid,
      'Prof. Dr. Roberto Guimarães', 'dirigente',
      'aaaa2222-2222-2222-2222-222222222222', 'Simulado Geral 2026.1 (Questão 14)',
      '{"item_order": 14, "previous_letter": "B", "new_letter": "C", "reason": "Ajuste bibliográfico DCNs 2026", "affected_students": 42}'::jsonb,
      now() - interval '14 days'
    ) ON CONFLICT (id) DO NOTHING;

    -- Evento 2: Anulação de Questão
    INSERT INTO public.b2b_governance_audit_logs (
      id, institution_id, event_type, performed_by, performed_by_name, performed_by_role,
      target_id, target_label, details, created_at
    ) VALUES (
      'ffff2222-2222-2222-2222-000000000002', v_inst_id, 'questao_anulada',
      v_dirigente_uid,
      'Prof. Dr. Roberto Guimarães', 'dirigente',
      'aaaa2222-2222-2222-2222-222222222222', 'Simulado Geral 2026.1 (Questão 28)',
      '{"item_order": 28, "reason": "Dupla interpretação do enunciado", "affected_students": 42, "score_credited": true}'::jsonb,
      now() - interval '12 days'
    ) ON CONFLICT (id) DO NOTHING;

    -- Evento 3: Exportação de Dados com Dicionário
    INSERT INTO public.b2b_governance_audit_logs (
      id, institution_id, event_type, performed_by, performed_by_name, performed_by_role,
      target_id, target_label, details, created_at
    ) VALUES (
      'ffff3333-3333-3333-3333-000000000003', v_inst_id, 'dados_exportados',
      v_dirigente_uid,
      'Prof. Dr. Roberto Guimarães', 'dirigente',
      'export-2026-05', 'Relatório Executivo CPA/NDE (CSV)',
      '{"format": "CSV", "rows_count": 240, "purpose": "Autoavaliação CPA SINAES", "has_data_dictionary": true}'::jsonb,
      now() - interval '5 days'
    ) ON CONFLICT (id) DO NOTHING;

    -- Evento 4: Alteração de Corte e Parâmetros
    INSERT INTO public.b2b_governance_audit_logs (
      id, institution_id, event_type, performed_by, performed_by_name, performed_by_role,
      target_id, target_label, details, created_at
    ) VALUES (
      'ffff4444-4444-4444-4444-000000000004', v_inst_id, 'corte_parametros_alterados',
      v_dirigente_uid,
      'Prof. Dr. Roberto Guimarães', 'dirigente',
      v_inst_id::text, 'Configurações Institucionais da FADEP',
      '{"previous_cut_score": 60, "new_cut_score": 60, "readiness_volume_target": 10000, "decision_zone_min": 51}'::jsonb,
      now() - interval '2 days'
    ) ON CONFLICT (id) DO NOTHING;

    -- Evento 5: Acesso de Suporte Técnico MedPleni
    INSERT INTO public.b2b_governance_audit_logs (
      id, institution_id, event_type, performed_by, performed_by_name, performed_by_role,
      target_id, target_label, details, created_at
    ) VALUES (
      'ffff5555-5555-5555-5555-000000000005', v_inst_id, 'suporte_medpleni_acesso',
      v_admin_uid,
      'Mario Lopes (Suporte MedPleni)', 'superadmin',
      v_inst_id::text, 'Auditoria de Leitura Óptica OMR',
      '{"ticket_id": "SUP-2026-9481", "purpose": "Homologação de calibração de lote OMR", "data_accessed": "telemetry_only"}'::jsonb,
      now() - interval '1 day'
    ) ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
