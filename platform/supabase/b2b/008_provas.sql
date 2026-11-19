-- ==============================================================================
-- MEDPLENI B2B — 008_provas.sql
-- Provas Institucionais: Suporte a Modelos Mensais MedPleni, Duplicação,
-- Checagem de Questões Já Aplicadas à Mesma Turma e RLS para Modelos
-- 100% ADITIVO E IDEMPOTENTE
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. COLUNAS ADITIVAS EM ASSESSMENTS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- Flag de Simulado Modelo publicado pela MedPleni
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'is_template'
  ) THEN
    ALTER TABLE public.assessments ADD COLUMN is_template BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Mês de referência do modelo (ex: '2027-03' para Março de 2027)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'template_month'
  ) THEN
    ALTER TABLE public.assessments ADD COLUMN template_month TEXT;
  END IF;

  -- Edição descritiva do modelo (ex: 'Edição 1 - 2027.1')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'template_edition'
  ) THEN
    ALTER TABLE public.assessments ADD COLUMN template_edition TEXT;
  END IF;

  -- Revisor designado para a etapa única de revisão
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'reviewer_id'
  ) THEN
    ALTER TABLE public.assessments ADD COLUMN reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Parecer / Comentário da revisão
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'review_notes'
  ) THEN
    ALTER TABLE public.assessments ADD COLUMN review_notes TEXT;
  END IF;

  -- Prova de origem se tiver sido gerada a partir de uma duplicação ou modelo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'source_assessment_id'
  ) THEN
    ALTER TABLE public.assessments ADD COLUMN source_assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. FUNÇÃO: CHECAR SE QUESTÕES JÁ FORAM APLICADAS ÀS MESMAS TURMAS
-- Retorna os IDs das questões que já foram incluídas em provas publicadas/aplicadas
-- destinadas a uma lista de turmas informadas.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_already_applied_questions(
  p_class_group_ids UUID[]
)
RETURNS TABLE (
  question_id UUID,
  assessment_id UUID,
  assessment_title TEXT,
  class_group_id UUID,
  applied_at TIMESTAMPTZ
) AS $$
BEGIN
  IF p_class_group_ids IS NULL OR array_length(p_class_group_ids, 1) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    ai.question_id,
    a.id AS assessment_id,
    a.title AS assessment_title,
    at.class_group_id,
    a.created_at AS applied_at
  FROM public.assessment_items ai
  JOIN public.assessment_versions av ON av.id = ai.version_id
  JOIN public.assessments a ON a.id = av.assessment_id
  JOIN public.assessment_targets at ON at.assessment_id = a.id
  WHERE at.target_type = 'class_group'
    AND at.class_group_id = ANY(p_class_group_ids)
    AND a.status IN ('publicada', 'aplicada', 'corrigida')
    AND ai.question_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------------------------
-- 3. POLÍTICA RLS PARA MODELOS DA MEDPLENI (IS_TEMPLATE = TRUE)
-- Qualquer membro autenticado de qualquer instituição pode ler modelos da MedPleni.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "policy_assessments_templates_select" ON public.assessments;
CREATE POLICY "policy_assessments_templates_select" ON public.assessments
  FOR SELECT
  USING (
    is_template = true
  );

-- ------------------------------------------------------------------------------
-- 4. SEED DE SIMULADOS-MODELO DA MEDPLENI (CALENDÁRIO NACIONAL)
-- Modelos pré-fabricados de simulados ENAMED para adoção em um clique.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_admin_id UUID;
  v_demo_inst_id UUID;
  v_sim_id UUID;
  v_version_id UUID;
BEGIN
  -- Localiza um usuário admin ou primeiro usuário do sistema
  SELECT id INTO v_admin_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_demo_inst_id FROM public.institutions WHERE is_demo = true LIMIT 1;

  IF v_admin_id IS NOT NULL AND v_demo_inst_id IS NOT NULL THEN
    -- Simulado ENAMED Modelo 1: Março 2027
    IF NOT EXISTS (
      SELECT 1 FROM public.assessments
      WHERE is_template = true AND template_month = '2027-03'
    ) THEN
      INSERT INTO public.assessments (
        institution_id,
        title,
        type,
        modality,
        status,
        duration_minutes,
        author_id,
        planned_matrix,
        is_template,
        template_month,
        template_edition,
        is_active
      ) VALUES (
        v_demo_inst_id,
        'Simulado Nacional ENAMED 2027.1 — Março (100 Itens)',
        'simulado_enamed_12',
        'online',
        'publicada',
        240,
        v_admin_id,
        '{
          "total_questions": 100,
          "areas": {
            "Clinica Medica": 20,
            "Cirurgia Geral": 15,
            "Ginecologia e Obstetricia": 15,
            "Pediatria": 15,
            "Medicina de Familia e Comunidade": 15,
            "Saude Coletiva": 10,
            "Saude Mental": 10
          },
          "difficulty_curve": { "facil": 30, "media": 50, "dificil": 20 },
          "min_image_quota": 10
        }'::jsonb,
        true,
        '2027-03',
        'Edição Nacional 2027.1 - 100 Itens',
        true
      ) RETURNING id INTO v_sim_id;

      -- Cria versão congelada do modelo
      INSERT INTO public.assessment_versions (
        assessment_id,
        version_number,
        published_by,
        changelog,
        is_current
      ) VALUES (
        v_sim_id,
        1,
        v_admin_id,
        'Gabarito oficial do Simulado Nacional ENAMED 2027.1 homologado pela equipe pedagógica MedPleni',
        true
      ) RETURNING id INTO v_version_id;
    END IF;

    -- Simulado ENAMED Modelo 2: Abril 2027
    IF NOT EXISTS (
      SELECT 1 FROM public.assessments
      WHERE is_template = true AND template_month = '2027-04'
    ) THEN
      INSERT INTO public.assessments (
        institution_id,
        title,
        type,
        modality,
        status,
        duration_minutes,
        author_id,
        planned_matrix,
        is_template,
        template_month,
        template_edition,
        is_active
      ) VALUES (
        v_demo_inst_id,
        'Simulado Nacional ENAMED 2027.1 — Abril (100 Itens)',
        'simulado_enamed_12',
        'online',
        'publicada',
        240,
        v_admin_id,
        '{
          "total_questions": 100,
          "areas": {
            "Clinica Medica": 20,
            "Cirurgia Geral": 15,
            "Ginecologia e Obstetricia": 15,
            "Pediatria": 15,
            "Medicina de Familia e Comunidade": 15,
            "Saude Coletiva": 10,
            "Saude Mental": 10
          },
          "difficulty_curve": { "facil": 25, "media": 55, "dificil": 20 },
          "min_image_quota": 12
        }'::jsonb,
        true,
        '2027-04',
        'Edição Nacional 2027.1 - 100 Itens',
        true
      );
    END IF;
  END IF;
END $$;
