-- ==============================================================================
-- MEDPLENI — Database Schema (Supabase PostgreSQL)
-- Versão 1.0 — 2026
-- ==============================================================================

-- Habilita extensão para UUIDs se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TABELA DE PERFIS DE USUÁRIO (PROFILES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'mentor')),
  plan TEXT NOT NULL DEFAULT 'diagnostico' CHECK (plan IN ('diagnostico', 'residente', 'aprovacao')),
  sub_brand TEXT NOT NULL DEFAULT 'RESID' CHECK (sub_brand IN ('RESID', 'ENAMED', 'REVALIDA', 'ESPECIALISTA')),
  target_exams TEXT[] DEFAULT '{}',
  target_specialty TEXT,
  exam_date TEXT,
  weekly_study_hours INTEGER DEFAULT 20,
  study_days TEXT[] DEFAULT '{}',
  study_shifts TEXT[] DEFAULT '{}',
  crm TEXT,
  avatar_url TEXT,
  streak_days INTEGER DEFAULT 0,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. TRIGGER PARA CRIAÇÃO AUTOMÁTICA DE PERFIL NO SIGNUP
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    plan,
    sub_brand,
    onboarding_completed
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_app_meta_data->>'role', NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'plan', 'diagnostico'),
    COALESCE(NEW.raw_user_meta_data->>'sub_brand', 'RESID'),
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dispara trigger após INSERT na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 3. TABELA DE QUESTÕES (QUESTIONS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  statement TEXT NOT NULL,
  clinical_context TEXT,
  institution TEXT NOT NULL,
  year INTEGER NOT NULL,
  area TEXT NOT NULL,
  subarea TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'media' CHECK (difficulty IN ('facil', 'media', 'alta', 'muito-alta')),
  explanation TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. TABELA DE ALTERNATIVAS (QUESTION_OPTIONS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  letter CHAR(1) NOT NULL CHECK (letter IN ('A', 'B', 'C', 'D', 'E')),
  text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(question_id, letter)
);

-- ------------------------------------------------------------------------------
-- 5. TABELA DE RESPOSTAS DO USUÁRIO (USER_ANSWERS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_letter CHAR(1) NOT NULL CHECK (selected_letter IN ('A', 'B', 'C', 'D', 'E')),
  is_correct BOOLEAN NOT NULL,
  confidence INTEGER DEFAULT 3 CHECK (confidence BETWEEN 1 AND 5),
  time_spent_seconds INTEGER DEFAULT 0,
  context_type TEXT NOT NULL DEFAULT 'standalone' CHECK (context_type IN ('standalone', 'simulation', 'diagnostic')),
  simulation_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. TABELA DE DIAGNÓSTICOS RAIO-X (USER_DIAGNOSTICS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score NUMERIC(5, 2) NOT NULL,
  area_scores JSONB NOT NULL,
  priority_areas TEXT[] DEFAULT '{}',
  answers JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. TABELA DE SIMULADOS (SIMULATIONS & USER_SIMULATIONS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  institution TEXT NOT NULL,
  area TEXT NOT NULL,
  total_questions INTEGER NOT NULL DEFAULT 100,
  duration_minutes INTEGER NOT NULL DEFAULT 240,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  simulation_id UUID NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('nao_iniciado', 'em_andamento', 'concluido')),
  score_percent NUMERIC(5, 2),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER DEFAULT 0
);

-- ------------------------------------------------------------------------------
-- 8. TABELA DE FLASHCARDS & REVISÕES (SRS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  area TEXT NOT NULL,
  subarea TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_flashcard_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  ease_factor NUMERIC(4, 2) DEFAULT 2.50,
  interval_days INTEGER DEFAULT 1,
  repetitions INTEGER DEFAULT 0,
  next_review_at TIMESTAMPTZ DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, flashcard_id)
);

-- ------------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_flashcard_reviews ENABLE ROW LEVEL SECURITY;

-- Perfis: Usuário pode ler e atualizar seu próprio perfil
CREATE POLICY "Perfis visíveis pelo próprio usuário ou admin"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR (auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Usuário pode atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Questões e Alternativas: Leitura para usuários autenticados
CREATE POLICY "Questões visíveis para autenticados"
  ON public.questions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Alternativas visíveis para autenticados"
  ON public.question_options FOR SELECT
  USING (auth.role() = 'authenticated');

-- Respostas: O usuário só acessa as suas próprias respostas
CREATE POLICY "Respostas gerenciadas pelo próprio usuário"
  ON public.user_answers FOR ALL
  USING (auth.uid() = user_id);

-- Diagnósticos: O usuário só acessa os seus próprios diagnósticos
CREATE POLICY "Diagnósticos gerenciados pelo próprio usuário"
  ON public.user_diagnostics FOR ALL
  USING (auth.uid() = user_id);

-- Simulados: Leitura pública para autenticados, inscrições privadas por usuário
CREATE POLICY "Simulados visíveis para autenticados"
  ON public.simulations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Simulados do usuário gerenciados pelo próprio usuário"
  ON public.user_simulations FOR ALL
  USING (auth.uid() = user_id);

-- Flashcards: Leitura para autenticados, revisões privadas por usuário
CREATE POLICY "Flashcards visíveis para autenticados"
  ON public.flashcards FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Revisões gerenciadas pelo próprio usuário"
  ON public.user_flashcard_reviews FOR ALL
  USING (auth.uid() = user_id);
