-- ==============================================================================
-- MedPleni — Sala de Aula & Módulos de Revisão (378 Temas Clínicos)
-- Schema SQL com tabelas de aulas, progresso individual do aluno e políticas RLS
-- ==============================================================================

-- 1. Tabela de Conteúdo de Aulas & Recursos Multimídia
CREATE TABLE IF NOT EXISTS public.med_classes (
  id TEXT PRIMARY KEY,                       -- Slug único (ex: 'obstetricia-parto-prematuro')
  index_num INTEGER NOT NULL,               -- Índice 1 a 378
  title TEXT NOT NULL,                      -- Nome do tema
  discipline TEXT NOT NULL,                 -- Especialidade (ex: 'Obstetrícia')
  area TEXT NOT NULL,                       -- Grande Área DCN ('Clínica Médica', 'Cirurgia Geral', 'Pediatria', 'Ginecologia e Obstetrícia', 'Saúde Coletiva')
  subtopics TEXT[] DEFAULT '{}',            -- Lista de habilidades e subtópicos
  estimated_minutes INTEGER DEFAULT 25,     -- Tempo estimado de estudo
  difficulty TEXT DEFAULT 'intermediario',  -- 'iniciante' | 'intermediario' | 'avancado'
  video_url TEXT,                           -- Embed YouTube / Vimeo / Cloudflare Stream
  audio_url TEXT,                           -- Áudio-revisão / Podcast
  slides_json JSONB DEFAULT '[]',           -- Lâminas de slides resumo
  mindmap_url TEXT,                         -- Imagem/vetor do mapa mental
  infographic_url TEXT,                     -- Lâmina de infográfico em alta resolução
  quiz_json JSONB DEFAULT '[]',             -- Perguntas de fixação rápida com gabarito comentado
  status TEXT DEFAULT 'disponivel',         -- 'disponivel' | 'em_breve'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Progresso e Métricas do Aluno
CREATE TABLE IF NOT EXISTS public.med_class_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  video_progress_pct INTEGER DEFAULT 0,
  audio_listened BOOLEAN DEFAULT FALSE,
  quiz_score_pct INTEGER,
  notes TEXT,
  last_studied_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_class UNIQUE (user_id, class_id)
);

-- 3. Índices para Alto Desempenho
CREATE INDEX IF NOT EXISTS idx_med_classes_area ON public.med_classes(area);
CREATE INDEX IF NOT EXISTS idx_med_classes_discipline ON public.med_classes(discipline);
CREATE INDEX IF NOT EXISTS idx_med_classes_index ON public.med_classes(index_num);
CREATE INDEX IF NOT EXISTS idx_med_class_progress_user ON public.med_class_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_med_class_progress_class ON public.med_class_progress(class_id);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE public.med_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.med_class_progress ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso med_classes (Leitura pública para autenticados)
DROP POLICY IF EXISTS "Autenticados podem ler catálogo de aulas" ON public.med_classes;
CREATE POLICY "Autenticados podem ler catálogo de aulas"
  ON public.med_classes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins podem editar catálogo de aulas" ON public.med_classes;
CREATE POLICY "Admins podem editar catálogo de aulas"
  ON public.med_classes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'docente')
    )
  );

-- Políticas de Acesso med_class_progress (Aluno lê e altera apenas seu próprio progresso)
DROP POLICY IF EXISTS "Aluno acessa seu próprio progresso de aulas" ON public.med_class_progress;
CREATE POLICY "Aluno acessa seu próprio progresso de aulas"
  ON public.med_class_progress FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
