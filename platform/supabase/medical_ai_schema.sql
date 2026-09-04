-- ══════════════════════════════════════════════════════════════
-- MEDPLENI — SCHEMA DE IA MÉDICA & PRECEPTOR CLÍNICO (DR. PLENI)
-- ══════════════════════════════════════════════════════════════

-- 1. Tabela de Conversas / Sessões de Estudo
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova Dúvida Clínica',
  area TEXT NOT NULL DEFAULT 'Geral', -- 'Clinica', 'Cirurgia', 'GO', 'Pediatria', 'Preventiva', 'Geral'
  mode TEXT NOT NULL DEFAULT 'tira_duvidas', -- 'tira_duvidas', 'caso_clinico', 'dissecar_questao', 'mnemonicos'
  model_used VARCHAR(100) DEFAULT 'anthropic/claude-3.7-sonnet',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Mensagens do Chat
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb, -- Armazena referências bibliográficas, modo, tokens, flashcard_created
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated ON public.ai_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON public.ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created ON public.ai_messages(created_at ASC);

-- 4. Habilita RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS (Usuário acessa apenas suas próprias conversas)
DROP POLICY IF EXISTS "Usuário acessa suas próprias conversas de IA" ON public.ai_conversations;
CREATE POLICY "Usuário acessa suas próprias conversas de IA"
  ON public.ai_conversations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuário acessa suas próprias mensagens de IA" ON public.ai_messages;
CREATE POLICY "Usuário acessa suas próprias mensagens de IA"
  ON public.ai_messages FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);
