-- ══════════════════════════════════════════════════════════════
-- MEDPLENI — POLÍTICAS RLS PARA FLASHCARDS & REPETIÇÃO ESPAÇADA
-- ══════════════════════════════════════════════════════════════

-- 1. Habilita RLS nas tabelas de flashcards
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_flashcard_reviews ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para a tabela flashcards (Leitura pública e inserção por usuários autenticados)
DROP POLICY IF EXISTS "Flashcards visíveis para autenticados" ON public.flashcards;
DROP POLICY IF EXISTS "Usuários autenticados criam flashcards" ON public.flashcards;

CREATE POLICY "Flashcards visíveis para autenticados"
  ON public.flashcards FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Usuários autenticados criam flashcards"
  ON public.flashcards FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados gerenciam flashcards"
  ON public.flashcards FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Políticas para a tabela user_flashcard_reviews (Usuário gerencia suas próprias revisões)
DROP POLICY IF EXISTS "Revisões gerenciadas pelo próprio usuário" ON public.user_flashcard_reviews;

CREATE POLICY "Revisões gerenciadas pelo próprio usuário"
  ON public.user_flashcard_reviews FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
