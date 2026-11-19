-- ─────────────────────────────────────────────────────────────────────────────
-- MEDPLENI B2B — 006_motor_geracao.sql
-- Piloto do Motor de Geração Assistida por IA, Insumos e Validação por Amostragem
-- Funções QB-08, QB-09, QB-13, QB-14.
-- Idempotente e 100% aditivo.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. CADASTRO DE INSUMOS E DIRETRIZES NACIONAIS
CREATE TABLE IF NOT EXISTS public.generation_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_type TEXT NOT NULL CHECK (input_type IN ('inep_guide', 'national_guideline', 'theme_reference')),
  title TEXT NOT NULL,
  area_id UUID REFERENCES public.tax_areas(id) ON DELETE SET NULL,
  tema_id UUID REFERENCES public.tax_temas(id) ON DELETE SET NULL,
  source_citation TEXT NOT NULL,
  content_text TEXT NOT NULL,
  file_url TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. LOTES DE GERAÇÃO COM CONTROLE DE VALIDAÇÃO POR AMOSTRAGEM
CREATE TABLE IF NOT EXISTS public.generation_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('tema_novo', 'devolutiva_para_original', 'reescrita_terceiros')),
  area_id UUID REFERENCES public.tax_areas(id) ON DELETE SET NULL,
  tema_id UUID REFERENCES public.tax_temas(id) ON DELETE SET NULL,
  model_used TEXT NOT NULL DEFAULT 'anthropic/claude-3.7-sonnet',
  prompt_snapshot TEXT NOT NULL,
  inputs_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  sample_percentage INTEGER NOT NULL DEFAULT 20,
  approval_threshold_percentage INTEGER NOT NULL DEFAULT 80,
  status TEXT NOT NULL DEFAULT 'sampling_review'
    CHECK (status IN ('generating', 'sampling_review', 'sample_approved', 'sample_rejected', 'released_to_review')),
  total_generated INTEGER NOT NULL DEFAULT 0,
  sample_count INTEGER NOT NULL DEFAULT 0,
  sample_approved_count INTEGER NOT NULL DEFAULT 0,
  sample_rejected_count INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(8, 4) DEFAULT 0.0000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. QUESTÕES GERADAS PELO MOTOR
CREATE TABLE IF NOT EXISTS public.generated_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.generation_batches(id) ON DELETE CASCADE,
  source_question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
  statement TEXT NOT NULL,
  clinical_context TEXT,
  options JSONB NOT NULL,
  correct_letter TEXT NOT NULL CHECK (correct_letter IN ('A', 'B', 'C', 'D', 'E')),
  explanation TEXT NOT NULL,
  reference_citation TEXT NOT NULL,
  origin_similarity_score NUMERIC(5, 2) DEFAULT 0,
  automated_checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  passes_checks BOOLEAN NOT NULL DEFAULT true,
  is_sample BOOLEAN NOT NULL DEFAULT false,
  sample_review_status TEXT DEFAULT 'pending' CHECK (sample_review_status IN ('pending', 'approved', 'rejected')),
  sample_review_comment TEXT,
  sample_reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_gen_inputs_tema ON public.generation_inputs(tema_id, is_active);
CREATE INDEX IF NOT EXISTS idx_gen_batches_mode ON public.generation_batches(mode, status);
CREATE INDEX IF NOT EXISTS idx_gen_questions_batch ON public.generated_questions(batch_id, is_sample);

-- 5. RLS: ACESSO RESTRITO A ADMIN MEDPLENI E EDITOR
ALTER TABLE public.generation_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "policy_gen_inputs_admin" ON public.generation_inputs;
CREATE POLICY "policy_gen_inputs_admin" ON public.generation_inputs
  FOR ALL
  USING (
    public.is_medpleni_admin() OR
    EXISTS (
      SELECT 1 FROM public.institution_members im
      WHERE im.user_id = auth.uid()
        AND im.role IN ('admin', 'editor', 'dirigente')
        AND im.is_active = true
    )
  );

DROP POLICY IF EXISTS "policy_gen_batches_admin" ON public.generation_batches;
CREATE POLICY "policy_gen_batches_admin" ON public.generation_batches
  FOR ALL
  USING (
    public.is_medpleni_admin() OR
    EXISTS (
      SELECT 1 FROM public.institution_members im
      WHERE im.user_id = auth.uid()
        AND im.role IN ('admin', 'editor', 'dirigente')
        AND im.is_active = true
    )
  );

DROP POLICY IF EXISTS "policy_gen_questions_admin" ON public.generated_questions;
CREATE POLICY "policy_gen_questions_admin" ON public.generated_questions
  FOR ALL
  USING (
    public.is_medpleni_admin() OR
    EXISTS (
      SELECT 1 FROM public.institution_members im
      WHERE im.user_id = auth.uid()
        AND im.role IN ('admin', 'editor', 'dirigente')
        AND im.is_active = true
    )
  );

-- 6. SEED DE INSUMOS INICIAIS (DIRETRIZES NACIONAIS PARA PILOTO)
INSERT INTO public.generation_inputs (input_type, title, source_citation, content_text)
VALUES
(
  'inep_guide',
  'Guia de Elaboração de Itens do INEP (Diretrizes Gerais)',
  'INEP / Ministério da Educação — Diretrizes Oficiais do ENAMED / Revalida',
  'Critérios de elaboração de itens de múltipla escolha: 1) O enunciado deve conter situação-problema clínica clara e contextualizada; 2) O comando da questão deve ser afirmativo e direto, evitando termos negativos ("exceto", "incorreta"); 3) Todas as alternativas devem ser plausíveis, homogêneas em tamanho e gramaticalmente coordenadas com o enunciado; 4) É estritamente vedado o uso de "Todas as anteriores", "Nenhuma das anteriores" ou opções combinadas ("A e B estão corretas"); 5) O gabarito deve ser único, inequívoco e embasado em diretriz de consenso nacional ou tratado padrão-ouro; 6) A justificativa deve explicar a pertinência do gabarito e a razão do erro de cada distrator.'
),
(
  'national_guideline',
  'Diretriz Brasileira de Insuficiência Cardíaca Crônica e Aguda',
  'Sociedade Brasileira de Cardiologia (SBC) — Atualização 2023/2024',
  'Recomendações Chave: 1) Terapia quádrupla fundamental para IC com Fração de Ejeção Reduzida (ICFER, FEVE <= 40%): Inibidor de SGLT2 (Dapagliflozina ou Empagliflozina), Betabloqueador comprovado (Carvedilol, Succinato de Metoprolol ou Bisoprolol), Antagonista do Receptor Mineralocorticoide (Espironolactona) e Inibidor de Neprilisina/BRA (Sacubitril/Valsartana) ou IECA/BRA; 2) No paciente descompensado (perfil B - quente e úmido): uso imediato de diuréticos de alça intravenosos (Furosemida) associado a vasodilatador se PA sistólica >= 90 mmHg; 3) O uso de inotrópicos (Dobutamina/Milrinona) é reservado para choque cardiogênico ou baixo débito refratário (perfil L ou C); 4) BNP/NT-proBNP como ferramenta de exclusão diagnóstica.'
),
(
  'national_guideline',
  'Diretriz Brasileira de Hipertensão Arterial',
  'Sociedade Brasileira de Cardiologia (SBC) / SBH — 2024',
  'Classificação: PA ótima < 120/80; Normal 120-129/80-84; Pré-hipertensão 130-139/85-89; HAS Estágio 1 (140-159/90-99); HAS Estágio 2 (160-179/100-109); HAS Estágio 3 (>= 180/110 mmHg). Metas pressóricas: < 130/80 mmHg para a maioria dos pacientes de alto risco cardiovascular. Tratamento inicial na maioria dos hipertensos estágio 1 de moderado a alto risco e estágio 2: combinação de 2 classes de fármacos em dose baixa (IECA/BRA + BCC ou Diurético Tiazídico).'
)
ON CONFLICT DO NOTHING;
