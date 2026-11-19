-- ─────────────────────────────────────────────────────────────────────────────
-- MEDPLENI B2B — 005_importacao_staging.sql
-- Área de Preparação (Staging) para Importação de Questões e Provas
-- Idempotente e 100% aditivo.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. TABELA DE LOTES DE IMPORTAÇÃO (BATCHES)
CREATE TABLE IF NOT EXISTS public.question_staging_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('docx', 'pdf', 'xlsx', 'csv', 'zip')),
  is_full_exam BOOLEAN NOT NULL DEFAULT false,
  exam_title TEXT,
  status TEXT NOT NULL DEFAULT 'staging' CHECK (status IN ('staging', 'ready_for_review', 'importing', 'completed', 'cancelled')),
  total_items INTEGER NOT NULL DEFAULT 0,
  ready_items INTEGER NOT NULL DEFAULT 0,
  pending_items INTEGER NOT NULL DEFAULT 0,
  duplicate_items INTEGER NOT NULL DEFAULT 0,
  imported_items INTEGER NOT NULL DEFAULT 0,
  ai_accuracy_stats JSONB NOT NULL DEFAULT '{"total_suggested":0, "accepted":0, "overridden":0}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABELA DE ITENS EM STAGING (CONFERÊNCIA ORIGINAL × EXTRAÍDO)
CREATE TABLE IF NOT EXISTS public.question_staging_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.question_staging_batches(id) ON DELETE CASCADE,
  item_order INTEGER NOT NULL,
  original_raw_text TEXT NOT NULL,
  statement TEXT NOT NULL,
  clinical_context TEXT,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_letter TEXT,
  explanation TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  tables JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'pending_key', 'duplicate_warning', 'imported', 'discarded')),
  duplicate_match_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
  duplicate_similarity NUMERIC(5, 2),
  duplicate_statement_snippet TEXT,
  ai_area_id UUID REFERENCES public.tax_areas(id) ON DELETE SET NULL,
  ai_cenario_id UUID REFERENCES public.tax_cenarios(id) ON DELETE SET NULL,
  ai_tema_id UUID REFERENCES public.tax_temas(id) ON DELETE SET NULL,
  ai_competencia_id UUID REFERENCES public.tax_competencias(id) ON DELETE SET NULL,
  ai_difficulty TEXT CHECK (ai_difficulty IN ('facil', 'media', 'dificil')),
  ai_justification TEXT,
  human_confirmed BOOLEAN NOT NULL DEFAULT false,
  human_overridden BOOLEAN NOT NULL DEFAULT false,
  final_area_id UUID REFERENCES public.tax_areas(id) ON DELETE SET NULL,
  final_cenario_id UUID REFERENCES public.tax_cenarios(id) ON DELETE SET NULL,
  final_tema_id UUID REFERENCES public.tax_temas(id) ON DELETE SET NULL,
  final_competencia_id UUID REFERENCES public.tax_competencias(id) ON DELETE SET NULL,
  final_difficulty TEXT DEFAULT 'media' CHECK (final_difficulty IN ('facil', 'media', 'dificil')),
  imported_question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ÍNDICES DE BUSCA E PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_staging_batches_inst ON public.question_staging_batches (institution_id, status);
CREATE INDEX IF NOT EXISTS idx_staging_items_batch ON public.question_staging_items (batch_id, item_order);
CREATE INDEX IF NOT EXISTS idx_staging_items_status ON public.question_staging_items (batch_id, status);

-- 4. RLS NAS TABELAS DE STAGING
ALTER TABLE public.question_staging_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_staging_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "policy_staging_batches_member" ON public.question_staging_batches;
CREATE POLICY "policy_staging_batches_member" ON public.question_staging_batches
  FOR ALL
  USING (
    public.is_medpleni_admin() OR
    EXISTS (
      SELECT 1 FROM public.institution_members im
      WHERE im.institution_id = question_staging_batches.institution_id
        AND im.user_id = auth.uid()
        AND im.role IN ('dirigente', 'coordenador', 'docente')
        AND im.is_active = true
    )
  );

DROP POLICY IF EXISTS "policy_staging_items_member" ON public.question_staging_items;
CREATE POLICY "policy_staging_items_member" ON public.question_staging_items
  FOR ALL
  USING (
    public.is_medpleni_admin() OR
    EXISTS (
      SELECT 1 FROM public.question_staging_batches b
      JOIN public.institution_members im ON im.institution_id = b.institution_id
      WHERE b.id = question_staging_items.batch_id
        AND im.user_id = auth.uid()
        AND im.role IN ('dirigente', 'coordenador', 'docente')
        AND im.is_active = true
    )
  );
