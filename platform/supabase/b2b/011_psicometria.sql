-- =============================================================================
-- MEDPLENI B2B - MIGRATION 011: PSICOMETRIA E HISTÓRICO DE APLICAÇÃO (PR-09 / QB-12)
-- =============================================================================
-- 1. Cria tabela question_exam_performances para rastreabilidade de desempenho
--    psicométrico por aplicação (prova, data, amostra, facilidade, discriminação,
--    ponto-bisserial e distratores).
-- 2. Políticas de RLS para isolamento institucional.
-- 3. Índices de consulta rápida para a ficha da questão no banco.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.question_exam_performances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  assessment_item_id UUID REFERENCES public.assessment_items(id) ON DELETE SET NULL,
  exam_title TEXT NOT NULL,
  sample_size INTEGER NOT NULL,
  facility_p NUMERIC(5, 4),
  discrimination_d NUMERIC(5, 4),
  point_biserial_r NUMERIC(5, 4),
  distractor_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_question_exam_perf UNIQUE (question_id, assessment_id)
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_qep_question_id ON public.question_exam_performances(question_id);
CREATE INDEX IF NOT EXISTS idx_qep_assessment_id ON public.question_exam_performances(assessment_id);

-- RLS
ALTER TABLE public.question_exam_performances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qep_select_policy" ON public.question_exam_performances;
CREATE POLICY "qep_select_policy" ON public.question_exam_performances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = question_exam_performances.assessment_id
      AND (
        a.institution_id IN (
          SELECT m.institution_id FROM public.institution_members m
          WHERE m.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin')
        )
      )
    )
  );

DROP POLICY IF EXISTS "qep_insert_policy" ON public.question_exam_performances;
CREATE POLICY "qep_insert_policy" ON public.question_exam_performances
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = question_exam_performances.assessment_id
      AND (
        a.institution_id IN (
          SELECT m.institution_id FROM public.institution_members m
          WHERE m.user_id = auth.uid()
          AND m.role IN ('dirigente', 'coordenador', 'docente')
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin')
        )
      )
    )
  );
