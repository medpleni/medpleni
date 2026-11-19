-- ==============================================================================
-- MEDPLENI B2B — 009_aplicacao_provas.sql
-- Aplicação de Provas Online e Híbrida: Código Curto, Tolerância de Janela,
-- Liberação de Gabarito, Acessibilidade (Tempo Extra) e Reabertura com Justificativa
-- 100% ADITIVO E IDEMPOTENTE
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. COLUNAS ADITIVAS EM ASSESSMENTS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- Código curto para acesso rápido mobile no modelo híbrido (ex: 'MED27A')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'short_code'
  ) THEN
    ALTER TABLE public.assessments ADD COLUMN short_code TEXT;
  END IF;

  -- Tolerância em minutos para início após abertura da janela (padrão 15 min)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'window_tolerance_minutes'
  ) THEN
    ALTER TABLE public.assessments ADD COLUMN window_tolerance_minutes INTEGER NOT NULL DEFAULT 15;
  END IF;

  -- Liberação de gabarito e comentários pelo professor
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'answers_released_at'
  ) THEN
    ALTER TABLE public.assessments ADD COLUMN answers_released_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'answers_released_by'
  ) THEN
    ALTER TABLE public.assessments ADD COLUMN answers_released_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. COLUNAS ADITIVAS EM ATTEMPTS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- Acessibilidade: tempo adicional concedido ao aluno em minutos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attempts' AND column_name = 'extra_time_minutes'
  ) THEN
    ALTER TABLE public.attempts ADD COLUMN extra_time_minutes INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Questões marcadas para revisar pelo aluno (array de assessment_item_ids em JSONB)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attempts' AND column_name = 'marked_for_review'
  ) THEN
    ALTER TABLE public.attempts ADD COLUMN marked_for_review JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;

  -- Reabertura com justificativa registrada em log
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attempts' AND column_name = 'reopened_at'
  ) THEN
    ALTER TABLE public.attempts ADD COLUMN reopened_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attempts' AND column_name = 'reopened_by'
  ) THEN
    ALTER TABLE public.attempts ADD COLUMN reopened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attempts' AND column_name = 'reopen_reason'
  ) THEN
    ALTER TABLE public.attempts ADD COLUMN reopen_reason TEXT;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. ÍNDICES DE PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_assessments_short_code ON public.assessments(short_code);
CREATE INDEX IF NOT EXISTS idx_attempts_student_status ON public.attempts(student_user_id, status);

-- ------------------------------------------------------------------------------
-- 4. FUNÇÃO: INICIAR OU RECUPERAR TENTATIVA DO ALUNO COM SORTEIO DE FORMA
-- Se a tentativa já existir (retomada após queda de conexão), retorna os dados salvos.
-- Se não existir, sorteia aleatoriamente uma das formas disponíveis (A, B, C, D).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_or_resume_student_attempt(
  p_assessment_id UUID,
  p_student_user_id UUID
)
RETURNS TABLE (
  attempt_id UUID,
  version_id UUID,
  form_id UUID,
  form_code TEXT,
  status TEXT,
  started_at TIMESTAMPTZ,
  extra_time_minutes INTEGER,
  marked_for_review JSONB,
  items_shuffle_map JSONB
) AS $$
DECLARE
  v_attempt public.attempts%ROWTYPE;
  v_version_id UUID;
  v_form RECORD;
BEGIN
  -- 1. Verifica se já existe tentativa em andamento para o aluno
  SELECT * INTO v_attempt
  FROM public.attempts
  WHERE assessment_id = p_assessment_id AND student_user_id = p_student_user_id;

  IF v_attempt.id IS NOT NULL THEN
    -- Tentativa existente: recupera dados da forma
    SELECT af.form_code, af.items_shuffle_map
    INTO v_form
    FROM public.assessment_forms af
    WHERE af.id = v_attempt.form_id;

    RETURN QUERY SELECT
      v_attempt.id,
      v_attempt.version_id,
      v_attempt.form_id,
      COALESCE(v_form.form_code, 'A'),
      v_attempt.status,
      v_attempt.started_at,
      v_attempt.extra_time_minutes,
      v_attempt.marked_for_review,
      COALESCE(v_form.items_shuffle_map, '[]'::jsonb);
    RETURN;
  END IF;

  -- 2. Primeira inicialização: busca versão ativa da avaliação
  SELECT av.id INTO v_version_id
  FROM public.assessment_versions av
  WHERE av.assessment_id = p_assessment_id AND av.is_current = true
  ORDER BY av.version_number DESC
  LIMIT 1;

  IF v_version_id IS NULL THEN
    RAISE EXCEPTION 'Caderno da avaliação ainda não foi publicado.';
  END IF;

  -- 3. Sorteia aleatoriamente uma forma embaralhada (A, B, C, D)
  SELECT af.id, af.form_code, af.items_shuffle_map
  INTO v_form
  FROM public.assessment_forms af
  WHERE af.version_id = v_version_id
  ORDER BY random()
  LIMIT 1;

  -- Se não houver forma gerada, usa fallback
  IF v_form.id IS NULL THEN
    INSERT INTO public.assessment_forms (version_id, form_code, items_shuffle_map)
    VALUES (v_version_id, 'A', '[]'::jsonb)
    RETURNING id, form_code, items_shuffle_map INTO v_form;
  END IF;

  -- 4. Cria registro da tentativa
  INSERT INTO public.attempts (
    assessment_id,
    version_id,
    form_id,
    student_user_id,
    modality,
    started_at,
    status
  ) VALUES (
    p_assessment_id,
    v_version_id,
    v_form.id,
    p_student_user_id,
    'online',
    now(),
    'em_andamento'
  ) RETURNING * INTO v_attempt;

  RETURN QUERY SELECT
    v_attempt.id,
    v_attempt.version_id,
    v_attempt.form_id,
    v_form.form_code,
    v_attempt.status,
    v_attempt.started_at,
    v_attempt.extra_time_minutes,
    v_attempt.marked_for_review,
    v_form.items_shuffle_map;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
