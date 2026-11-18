-- ==============================================================================
-- MEDPLENI B2B — 003_taxonomia.sql
-- Taxonomia Única e Editável: Área · Cenário · Tema · Competência
-- Mapeamento De-Para Não Destrutivo das Questões Legadas e RLS Rigorosa
-- 100% ADITIVO E IDEMPOTENTE
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELAS DE TAXONOMIA
-- ------------------------------------------------------------------------------

-- 1.1 Grandes Áreas (7 do INEP com suporte a 2º conjunto para ciclo básico)
CREATE TABLE IF NOT EXISTS public.tax_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  color_hex TEXT,
  order_index INTEGER NOT NULL,
  enamed_stage TEXT NOT NULL DEFAULT 'etapa_2_3' CHECK (enamed_stage IN ('etapa_1_ciclo_basico', 'etapa_2_3', 'todas')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tax_areas_code_stage UNIQUE (code, enamed_stage)
);

-- 1.2 Cenários de Atuação (Atenção Básica, Urgência/Emergência, etc.)
CREATE TABLE IF NOT EXISTS public.tax_cenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.3 Temas e Subtemas (Hierarquia de até 2 níveis ligada a uma Área)
CREATE TABLE IF NOT EXISTS public.tax_temas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES public.tax_areas(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.tax_temas(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tax_temas_area_code UNIQUE (area_id, code)
);

-- 1.4 Competências e Habilidades Clínicas
CREATE TABLE IF NOT EXISTS public.tax_competencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.5 Mapeamento De-Para de Textos Antigos de questions.area e questions.subarea
CREATE TABLE IF NOT EXISTS public.tax_area_legacy_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_text TEXT UNIQUE NOT NULL,
  target_area_id UUID NOT NULL REFERENCES public.tax_areas(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.6 Classificação Canônica das Questões (Question Classification)
CREATE TABLE IF NOT EXISTS public.question_classification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.tax_areas(id) ON DELETE RESTRICT,
  cenario_id UUID REFERENCES public.tax_cenarios(id) ON DELETE SET NULL,
  tema_id UUID REFERENCES public.tax_temas(id) ON DELETE SET NULL,
  competencia_id UUID REFERENCES public.tax_competencias(id) ON DELETE SET NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('facil', 'media', 'dificil')),
  classified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  suggestion_origin TEXT NOT NULL DEFAULT 'humano' CHECK (suggestion_origin IN ('humano', 'ia')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_question_classification_question UNIQUE (question_id)
);

-- ------------------------------------------------------------------------------
-- 2. ÍNDICES DE PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tax_areas_stage ON public.tax_areas(enamed_stage, order_index);
CREATE INDEX IF NOT EXISTS idx_tax_temas_area ON public.tax_temas(area_id);
CREATE INDEX IF NOT EXISTS idx_tax_temas_parent ON public.tax_temas(parent_id);
CREATE INDEX IF NOT EXISTS idx_q_class_area ON public.question_classification(area_id);
CREATE INDEX IF NOT EXISTS idx_q_class_cenario ON public.question_classification(cenario_id);
CREATE INDEX IF NOT EXISTS idx_q_class_tema ON public.question_classification(tema_id);
CREATE INDEX IF NOT EXISTS idx_q_class_comp ON public.question_classification(competencia_id);
CREATE INDEX IF NOT EXISTS idx_q_class_diff ON public.question_classification(difficulty);

-- ------------------------------------------------------------------------------
-- 3. HABILITAÇÃO DE ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.tax_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_cenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_temas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_competencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_area_legacy_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_classification ENABLE ROW LEVEL SECURITY;

-- 3.1 Políticas de Leitura: Pública/Geral para usuários autenticados
DROP POLICY IF EXISTS "Leitura de tax_areas para autenticados" ON public.tax_areas;
CREATE POLICY "Leitura de tax_areas para autenticados"
  ON public.tax_areas FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Leitura de tax_cenarios para autenticados" ON public.tax_cenarios;
CREATE POLICY "Leitura de tax_cenarios para autenticados"
  ON public.tax_cenarios FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Leitura de tax_temas para autenticados" ON public.tax_temas;
CREATE POLICY "Leitura de tax_temas para autenticados"
  ON public.tax_temas FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Leitura de tax_competencias para autenticados" ON public.tax_competencias;
CREATE POLICY "Leitura de tax_competencias para autenticados"
  ON public.tax_competencias FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Leitura de tax_area_legacy_mapping para autenticados" ON public.tax_area_legacy_mapping;
CREATE POLICY "Leitura de tax_area_legacy_mapping para autenticados"
  ON public.tax_area_legacy_mapping FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Leitura de question_classification para autenticados" ON public.question_classification;
CREATE POLICY "Leitura de question_classification para autenticados"
  ON public.question_classification FOR SELECT TO authenticated USING (true);

-- 3.2 Políticas de Edição: Admin MedPleni e Editores autorizados
DROP POLICY IF EXISTS "Gestores MedPleni gerenciam tax_areas" ON public.tax_areas;
CREATE POLICY "Gestores MedPleni gerenciam tax_areas"
  ON public.tax_areas FOR ALL TO authenticated
  USING (public.is_medpleni_admin())
  WITH CHECK (public.is_medpleni_admin());

DROP POLICY IF EXISTS "Gestores MedPleni gerenciam tax_cenarios" ON public.tax_cenarios;
CREATE POLICY "Gestores MedPleni gerenciam tax_cenarios"
  ON public.tax_cenarios FOR ALL TO authenticated
  USING (public.is_medpleni_admin())
  WITH CHECK (public.is_medpleni_admin());

DROP POLICY IF EXISTS "Gestores MedPleni gerenciam tax_temas" ON public.tax_temas;
CREATE POLICY "Gestores MedPleni gerenciam tax_temas"
  ON public.tax_temas FOR ALL TO authenticated
  USING (public.is_medpleni_admin())
  WITH CHECK (public.is_medpleni_admin());

DROP POLICY IF EXISTS "Gestores MedPleni gerenciam tax_competencias" ON public.tax_competencias;
CREATE POLICY "Gestores MedPleni gerenciam tax_competencias"
  ON public.tax_competencias FOR ALL TO authenticated
  USING (public.is_medpleni_admin())
  WITH CHECK (public.is_medpleni_admin());

DROP POLICY IF EXISTS "Gestores MedPleni gerenciam tax_area_legacy_mapping" ON public.tax_area_legacy_mapping;
CREATE POLICY "Gestores MedPleni gerenciam tax_area_legacy_mapping"
  ON public.tax_area_legacy_mapping FOR ALL TO authenticated
  USING (public.is_medpleni_admin())
  WITH CHECK (public.is_medpleni_admin());

DROP POLICY IF EXISTS "Professores e gestores gerenciam classificacao de questao" ON public.question_classification;
CREATE POLICY "Professores e gestores gerenciam classificacao de questao"
  ON public.question_classification FOR ALL TO authenticated
  USING (
    public.is_medpleni_admin()
    OR EXISTS (
      SELECT 1 FROM public.institution_members im
      WHERE im.user_id = auth.uid()
        AND im.role IN ('dirigente', 'coordenador', 'docente')
        AND im.is_active = TRUE
    )
  )
  WITH CHECK (
    public.is_medpleni_admin()
    OR EXISTS (
      SELECT 1 FROM public.institution_members im
      WHERE im.user_id = auth.uid()
        AND im.role IN ('dirigente', 'coordenador', 'docente')
        AND im.is_active = TRUE
    )
  );

-- ------------------------------------------------------------------------------
-- 4. SEED CANÔNICO DAS 7 GRANDES ÁREAS DO INEP (ETAPA 2 E 3)
-- ------------------------------------------------------------------------------
INSERT INTO public.tax_areas (code, name, color_hex, order_index, enamed_stage)
VALUES
  ('CM',  'Clínica Médica',                     '#00C2A8', 1, 'etapa_2_3'),
  ('CG',  'Cirurgia Geral',                     '#0077B6', 2, 'etapa_2_3'),
  ('GO',  'Ginecologia e Obstetrícia',          '#FF6B6B', 3, 'etapa_2_3'),
  ('PED', 'Pediatria',                          '#F5A623', 4, 'etapa_2_3'),
  ('MFC', 'Medicina de Família e Comunidade',   '#00B4D8', 5, 'etapa_2_3'),
  ('SC',  'Saúde Coletiva',                     '#6B5CE7', 6, 'etapa_2_3'),
  ('SM',  'Saúde Mental',                       '#A99EF5', 7, 'etapa_2_3')
ON CONFLICT (code, enamed_stage) DO UPDATE SET
  name = EXCLUDED.name,
  color_hex = EXCLUDED.color_hex,
  order_index = EXCLUDED.order_index;

-- ------------------------------------------------------------------------------
-- 5. SEED DE MAPEAMENTO DE-PARA (TEXTOS ANTIGOS DO B2C PARA AS 7 ÁREAS CANÔNICAS)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_cm_id UUID;
  v_cg_id UUID;
  v_go_id UUID;
  v_ped_id UUID;
  v_mfc_id UUID;
  v_sc_id UUID;
  v_sm_id UUID;
BEGIN
  SELECT id INTO v_cm_id FROM public.tax_areas WHERE code = 'CM' AND enamed_stage = 'etapa_2_3';
  SELECT id INTO v_cg_id FROM public.tax_areas WHERE code = 'CG' AND enamed_stage = 'etapa_2_3';
  SELECT id INTO v_go_id FROM public.tax_areas WHERE code = 'GO' AND enamed_stage = 'etapa_2_3';
  SELECT id INTO v_ped_id FROM public.tax_areas WHERE code = 'PED' AND enamed_stage = 'etapa_2_3';
  SELECT id INTO v_mfc_id FROM public.tax_areas WHERE code = 'MFC' AND enamed_stage = 'etapa_2_3';
  SELECT id INTO v_sc_id FROM public.tax_areas WHERE code = 'SC' AND enamed_stage = 'etapa_2_3';
  SELECT id INTO v_sm_id FROM public.tax_areas WHERE code = 'SM' AND enamed_stage = 'etapa_2_3';

  -- Clínica Médica
  INSERT INTO public.tax_area_legacy_mapping (legacy_text, target_area_id, notes) VALUES
    ('Clínica Médica', v_cm_id, 'Texto oficial'),
    ('Clinica Medica', v_cm_id, 'Sem acento'),
    ('clinica medica', v_cm_id, 'Minúsculas'),
    ('CM', v_cm_id, 'Sigla'),
    ('Cardiologia', v_cm_id, 'Subespecialidade clínica'),
    ('Neurologia', v_cm_id, 'Subespecialidade clínica'),
    ('Pneumologia', v_cm_id, 'Subespecialidade clínica'),
    ('Infectologia', v_cm_id, 'Subespecialidade clínica'),
    ('Endocrinologia', v_cm_id, 'Subespecialidade clínica'),
    ('Reumatologia', v_cm_id, 'Subespecialidade clínica'),
    ('Gastroenterologia', v_cm_id, 'Subespecialidade clínica'),
    ('Urgência e Emergência', v_cm_id, 'Semiologia e Emergência Clínica')
  ON CONFLICT (legacy_text) DO UPDATE SET target_area_id = EXCLUDED.target_area_id;

  -- Cirurgia Geral
  INSERT INTO public.tax_area_legacy_mapping (legacy_text, target_area_id, notes) VALUES
    ('Cirurgia Geral', v_cg_id, 'Texto oficial e decisão H-04'),
    ('Cirurgia', v_cg_id, 'Forma abreviada comum no B2C'),
    ('cirurgia', v_cg_id, 'Minúsculas'),
    ('cirurgia geral', v_cg_id, 'Minúsculas'),
    ('CG', v_cg_id, 'Sigla'),
    ('Ortopedia', v_cg_id, 'Especialidade cirúrgica'),
    ('Oftalmologia', v_cg_id, 'Especialidade cirúrgica')
  ON CONFLICT (legacy_text) DO UPDATE SET target_area_id = EXCLUDED.target_area_id;

  -- Ginecologia e Obstetrícia
  INSERT INTO public.tax_area_legacy_mapping (legacy_text, target_area_id, notes) VALUES
    ('Ginecologia e Obstetrícia', v_go_id, 'Texto oficial'),
    ('Ginecologia e Obstetricia', v_go_id, 'Sem acento'),
    ('ginecologia e obstetricia', v_go_id, 'Minúsculas'),
    ('Ginecologia', v_go_id, 'Forma parcial'),
    ('Obstetrícia', v_go_id, 'Forma parcial'),
    ('Obstetricia', v_go_id, 'Sem acento'),
    ('GO', v_go_id, 'Sigla')
  ON CONFLICT (legacy_text) DO UPDATE SET target_area_id = EXCLUDED.target_area_id;

  -- Pediatria
  INSERT INTO public.tax_area_legacy_mapping (legacy_text, target_area_id, notes) VALUES
    ('Pediatria', v_ped_id, 'Texto oficial'),
    ('pediatria', v_ped_id, 'Minúsculas'),
    ('PED', v_ped_id, 'Sigla'),
    ('Ped', v_ped_id, 'Abreviação')
  ON CONFLICT (legacy_text) DO UPDATE SET target_area_id = EXCLUDED.target_area_id;

  -- Medicina de Família e Comunidade
  INSERT INTO public.tax_area_legacy_mapping (legacy_text, target_area_id, notes) VALUES
    ('Medicina de Família e Comunidade', v_mfc_id, 'Texto oficial'),
    ('Medicina de Familia e Comunidade', v_mfc_id, 'Sem acento'),
    ('medicina de familia e comunidade', v_mfc_id, 'Minúsculas'),
    ('MFC', v_mfc_id, 'Sigla'),
    ('Medicina de Família', v_mfc_id, 'Forma comum'),
    ('Atenção Primária', v_mfc_id, 'APS')
  ON CONFLICT (legacy_text) DO UPDATE SET target_area_id = EXCLUDED.target_area_id;

  -- Saúde Coletiva
  INSERT INTO public.tax_area_legacy_mapping (legacy_text, target_area_id, notes) VALUES
    ('Saúde Coletiva', v_sc_id, 'Texto oficial'),
    ('Saude Coletiva', v_sc_id, 'Sem acento'),
    ('saude coletiva', v_sc_id, 'Minúsculas'),
    ('SC', v_sc_id, 'Sigla'),
    ('Epidemiologia', v_sc_id, 'Subárea'),
    ('SUS', v_sc_id, 'Legislação e SUS')
  ON CONFLICT (legacy_text) DO UPDATE SET target_area_id = EXCLUDED.target_area_id;

  -- Saúde Mental
  INSERT INTO public.tax_area_legacy_mapping (legacy_text, target_area_id, notes) VALUES
    ('Saúde Mental', v_sm_id, 'Texto oficial'),
    ('Saude Mental', v_sm_id, 'Sem acento'),
    ('saude mental', v_sm_id, 'Minúsculas'),
    ('SM', v_sm_id, 'Sigla'),
    ('Psiquiatria', v_sm_id, 'Especialidade clássica mapeada para Saúde Mental')
  ON CONFLICT (legacy_text) DO UPDATE SET target_area_id = EXCLUDED.target_area_id;

END $$;

-- ------------------------------------------------------------------------------
-- 6. MIGRAÇÃO AUTOMÁTICA DAS QUESTÕES EXISTENTES PARA QUESTION_CLASSIFICATION
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_q RECORD;
  v_target_area_id UUID;
  v_clean_diff TEXT;
BEGIN
  FOR v_q IN SELECT id, area, difficulty FROM public.questions
  LOOP
    -- 1. Procura mapeamento exato ou case-insensitive
    SELECT target_area_id INTO v_target_area_id
    FROM public.tax_area_legacy_mapping
    WHERE LOWER(TRIM(legacy_text)) = LOWER(TRIM(v_q.area))
    LIMIT 1;

    -- 2. Se não encontrou no mapping, busca diretamente pelo nome da área
    IF v_target_area_id IS NULL THEN
      SELECT id INTO v_target_area_id
      FROM public.tax_areas
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(v_q.area))
      LIMIT 1;
    END IF;

    -- 3. Normalização da dificuldade (facil, media, dificil)
    v_clean_diff := CASE
      WHEN LOWER(v_q.difficulty) IN ('facil', 'fácil') THEN 'facil'
      WHEN LOWER(v_q.difficulty) IN ('alta', 'muito-alta', 'dificil', 'difícil') THEN 'dificil'
      ELSE 'media'
    END;

    -- 4. Insere a classificação se encontrou área mapeada
    IF v_target_area_id IS NOT NULL THEN
      INSERT INTO public.question_classification (
        question_id,
        area_id,
        difficulty,
        suggestion_origin
      )
      VALUES (
        v_q.id,
        v_target_area_id,
        v_clean_diff,
        'humano'
      )
      ON CONFLICT (question_id) DO UPDATE SET
        area_id = EXCLUDED.area_id,
        difficulty = EXCLUDED.difficulty,
        updated_at = NOW();
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 7. FUNÇÃO DIAGNÓSTICA: RELATÓRIO DE QUESTÕES ÓRFÃS / NÃO MAPEADAS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_unmapped_questions_report()
RETURNS JSONB AS $$
DECLARE
  v_total_questions INT;
  v_classified_questions INT;
  v_unmapped_questions INT;
  v_orphans JSONB;
BEGIN
  SELECT COUNT(*) INTO v_total_questions FROM public.questions;
  SELECT COUNT(*) INTO v_classified_questions FROM public.question_classification;
  v_unmapped_questions := v_total_questions - v_classified_questions;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'legacy_area', area,
        'count', cnt
      )
    ),
    '[]'::jsonb
  )
  INTO v_orphans
  FROM (
    SELECT q.area, COUNT(*) as cnt
    FROM public.questions q
    LEFT JOIN public.question_classification qc ON qc.question_id = q.id
    WHERE qc.id IS NULL
    GROUP BY q.area
    ORDER BY cnt DESC
  ) sub;

  RETURN jsonb_build_object(
    'total_questions', v_total_questions,
    'classified_questions', v_classified_questions,
    'unmapped_questions', v_unmapped_questions,
    'coverage_percent', CASE WHEN v_total_questions > 0 THEN ROUND((v_classified_questions::numeric / v_total_questions::numeric) * 100, 2) ELSE 100 END,
    'orphan_areas', v_orphans
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
