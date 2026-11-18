# MedPleni B2B — Diário de Desenvolvimento

Formato de cada entrada:
> **Data · Prompt · Resumo**  
> Arquivos criados/alterados · SQL a rodar · Como testar · Pendências · Dúvidas

---

## 2026-11-18 · P07 · Piloto do Motor de Geração de Questões Assistida por IA, 3 Modos e Validação por Amostragem (QB-08, QB-09, QB-13, QB-14)

### O que foi feito

- **Schema do Motor e Governança (`006_motor_geracao.sql`):**
  - Tabela `generation_inputs`: cadastro de insumos (Guia de Elaboração de Itens do INEP e Diretrizes/Referências Nacionais por tema médico), com citação bibliográfica, texto base e vínculo com áreas e temas canônicos.
  - Tabela `generation_batches`: controle de lotes com modo de geração (`tema_novo`, `devolutiva_para_original`, `reescrita_terceiros`), parâmetros de amostragem (porcentagem de amostra sorteada, limite de aprovação mínima, default 80%), contadores, custo estimado em USD e status de governança (`sampling_review`, `approved_released`, `rejected`).
  - Tabela `generated_questions`: guarda os itens gerados pelo motor com snapshot completo de prompt, modelo, insumos utilizados, validações psicométricas automatizadas (JSONB), status na amostra (`is_sample`, `sample_review_status`, `sample_review_comment`), e vínculo com a questão publicada gerada quando liberada.
  - Seed inicial: Diretrizes Brasileiras da SBC (Insuficiência Cardíaca 2023 e Hipertensão Arterial 2020) cadastradas como insumos de referência no tema de Clínica Médica escolhido pelos médicos.
  - Políticas de RLS estritas: visualização e criação restritas a administradores e editores MedPleni.
- **Motor e Validação Psicométrica Automatizada (`lib/b2b/engine/`):**
  - `quality-checker.ts` (QB-14): checagens automáticas pré-revisão:
    1. *Alternativa correta única:* exatamente 1 alternativa com gabarito verdadeiro.
    2. *Extensão equilibrada:* razão de tamanho entre a alternativa mais longa e a mais curta $\le 2.5$.
    3. *Diretriz INEP:* proibição estrita de opções do tipo "todas as anteriores", "nenhuma das anteriores", "A e B estão corretas", etc.
    4. *Comando claro:* enunciado finalizado de forma afirmativa ou interrogativa direta.
    5. *Referência científica citada:* verificação da presença de diretriz/artigo nacional referenciado.
    6. *Reescrita segura (QB-13):* similaridade de trigramas Jaccard com a questão de origem obrigatoriamente $< 60\%$ para blindar contra plágio e infração de direitos de terceiros, preservando vínculo rastreado com o item de origem.
  - `generator.ts`: orquestração da síntese nos 3 modos aprovados:
    1. `tema_novo`: gera questão inédita a partir do tema + competência + dificuldade + diretriz nacional.
    2. `devolutiva_para_original`: extrai conceitos da devolutiva/comentário de uma questão existente para gerar 1 ou 2 novas questões originais.
    3. `reescrita_terceiros`: reformulação integral mantendo o vínculo com o item de terceiros e resguardando que a similaridade fique abaixo de 60%.
    - Sorteio aleatório de amostra parametrizada (ex: 20%) para conferência médica prévia.
    - Registro de estimativa de custo de API (~$0.0042 por questão no Gemini 1.5 Flash).
    - **Limite de segurança do piloto:** teto estrito de no máximo 20 questões por lote.
  - `engine-actions.ts`: Server Actions para cadastro de insumos, execução do lote, revisão médica item a item da amostra e cálculo de aprovação com liberação automática para a fila normal (`b2b_status = 'in_review'`).
  - **Regra inegociável da ESPEC atendida:** a IA nunca publica nada diretamente (`b2b_status = 'published'` é proibido para a IA). O motor gera apenas rascunhos em staging; aprovada a amostragem, o lote entra na fila de revisão humana médica (`b2b_status = 'in_review'`).
- **Interface em `/instituicao/admin/motor` (`MotorClient.tsx`):**
  - Acesso estritamente restrito a MedPleni Admin / Editor (`!context?.isMedPleniAdmin` redireciona para `/instituicao`).
  - Layout limpo, sóbrio e elegante, sem "cara de IA" (paleta institucional neutra, sem gradientes roxos/ciberpunk), em 4 abas e até 5 blocos visuais por tela:
    1. *Painel & Métricas:* estatísticas gerais, taxa de aprovação da amostra, custo total acumulado, distribuição por modo e por tema.
    2. *Gerar Lote:* seleção intuitiva dos 3 modos, escolha da diretriz cadastrada, tema, dificuldade, tamanho do lote (com trava em 20), porcentagem de amostra e limite de aprovação.
    3. *Validação por Amostragem:* fila de lotes aguardando conferência médica, exibição lado a lado dos itens sorteados com badges dos critérios do INEP atendidos, botões de aprovar/reprovar com comentário do médico e barra de progresso do limiar de corte do lote.
    4. *Insumos & Diretrizes:* cadastro e listagem dos guias do INEP e diretrizes nacionais associadas às áreas e temas.
- **Qualidade e Testes:**
  - `lib/b2b/__tests__/engine.test.ts`: 9 testes unitários cobrindo todos os critérios do INEP (QB-14), os 3 modos de geração, taxa de similaridade em reescrita (QB-13) e a trava de segurança de até 20 questões por lote.
  - Total da suíte B2B: 64 testes passando em 7 arquivos de teste.

### Arquivos criados / alterados

- `platform/supabase/b2b/006_motor_geracao.sql`
- `platform/lib/b2b/engine/engine-types.ts`
- `platform/lib/b2b/engine/quality-checker.ts`
- `platform/lib/b2b/engine/generator.ts`
- `platform/lib/b2b/engine/engine-actions.ts`
- `platform/app/instituicao/admin/motor/page.tsx`
- `platform/app/instituicao/admin/motor/MotorClient.tsx`
- `platform/app/instituicao/admin/AdminInstituicaoClient.tsx`
- `platform/lib/b2b/__tests__/engine.test.ts`
- `docs/b2b/DIARIO.md`

### SQL a rodar no Supabase

- Executar `platform/supabase/b2b/006_motor_geracao.sql` no SQL Editor do Supabase (aditivo e idempotente).

### Como testar

1. Acesse `/instituicao/admin` com perfil de Administrador MedPleni.
2. Clique no atalho "Motor IA (Piloto) →" ou acesse diretamente `/instituicao/admin/motor`.
3. Na aba **Gerar Lote**:
   - Escolha o modo 1 (*Tema Novo*), selecione a área de Clínica Médica, a diretriz pré-cadastrada da SBC (Insuficiência Cardíaca), tamanho do lote = 5 e amostra = 40% (2 questões sorteadas).
   - Clique em "Gerar Lote de Questões".
4. Vá para a aba **Validação por Amostragem**:
   - Visualize os 2 itens sorteados para conferência médica com a análise automática dos critérios INEP (sem "todas as anteriores", comando claro, gabarito único, referência citada).
   - Registre a aprovação de ambos: ao atingir a taxa exigida ($\ge 80\%$), o lote é automaticamente liberado para a Fila de Revisão humana padrão (`/instituicao/banco`).
5. Execute os testes automatizados via terminal:
   `cd platform && npx vitest run lib/b2b/__tests__/engine.test.ts`

### Pendências

- **Upload do Guia de Elaboração de Itens do INEP:** o arquivo oficial será fornecido pelo Mario; a tabela `generation_inputs` e o formulário já suportam o upload e vinculação assim que disponibilizado.
- **Lista final de temas/cenários médicos:** aguardando envio pelo Felipe para popular toda a taxonomia do motor.

---

## 2026-11-18 · P06 · Importação de Questões, Staging, Conferência Lado a Lado e Processamento de 1.000+ Questões

### O que foi feito

- **Schema da Área de Preparação / Staging (`005_importacao_staging.sql`):**
  - Tabela `question_staging_batches`: controle de lotes de importação, contadores em tempo real (total, prontas com gabarito, pendentes de chave, duplicatas, importadas), suporte a importação de prova inteira (`is_full_exam`), e métricas de acurácia da IA (`ai_accuracy_stats` com taxa de concordância/calibragem).
  - Tabela `question_staging_items`: guarda o `original_raw_text` integral para permitir a conferência humana lado a lado (original × extraído), alternativas estruturadas A-E, gabarito, justificativa, eixos sugeridos pela IA vs eixos confirmados pelo humano, e status individual (`ready`, `pending_key`, `duplicate_warning`, `imported`, `discarded`).
  - Índices de performance e políticas de RLS garantindo que apenas membros autorizados (`dirigente`, `coordenador`, `docente`) da instituição proprietária visualizem os itens em preparação.
- **Modelos Oficiais de Arquivo para Download:**
  - Publicados modelos oficiais em `platform/public/templates/b2b/`:
    - `modelo_importacao_questoes.docx` (DOCX formatado com tags canônicas)
    - `modelo_importacao_questoes.xlsx` (Planilha XLSX estruturada)
    - `modelo_importacao_questoes.csv` (CSV com UTF-8 BOM)
  - Endpoint de download seguro com headers apropriados em `/api/b2b/templates/download?type=docx|xlsx|csv`.
- **Motores de Extração, Detecção e Classificação (`lib/b2b/importer/`):**
  - `text-parsers.ts`: descompressão pura de arquivos ZIP/DOCX/XLSX (`word/document.xml`), segmentação de blocos com regex para provas médicas e vestibulares de residência, parsing robusto de enunciados, alternativas A-E, gabaritos e comentários. Se o gabarito não constar no arquivo, o item é automaticamente sinalizado como `pending_key`.
  - `duplicate-detector.ts`: cálculo de similaridade de enunciado via 3-grams Jaccard e normalização fonética/acentual contra o acervo existente. Se a similaridade for $\ge 75\%$, emite aviso de duplicata na tela com snippet comparativo.
  - `ai-classifier.ts` (PR-05): inferência assistida por IA sugerindo Grande Área, Cenário, Tema, Competência e Dificuldade (`facil`, `media`, `dificil`) com justificativa curta. **Regra inegociável da ESPEC atendida:** a sugestão da IA nunca é gravada como confirmada diretamente; o humano sempre precisa confirmar ou alterar.
  - `staging-actions.ts`: Server Actions para upload e staging, consulta do lote, correção manual de itens, confirmação de itens aptos e submissão em lote para a Fila de Revisão.
  - **Regra de publicação:** nenhuma questão entra como `published` direto. Ao submeter o lote, os itens são gravados com `b2b_visibility = 'institution_private'` e `b2b_status = 'in_review'` para conferência pedagógica formal.
  - **Importação de prova inteira (PR-15):** quando o usuário marca a opção de prova completa, cria-se adicionalmente o rascunho de prova (`simulations` com `is_published = false`) mantendo a ordem exata das questões no arquivo.
- **Interface Completa em `/instituicao/banco/importar` (`ImportarClient.tsx`):**
  - Respeito rigoroso à regra de no máximo 5 blocos visuais por tela.
  - **Bloco 1:** Topo com atalho de volta ao banco e botões de download dos modelos (DOCX, XLSX, CSV).
  - **Bloco 2 (Etapa 1):** Upload de arquivos (DOCX, PDF com texto, XLSX, CSV), toggle de prova inteira com título opcional e atalho para auditoria do lote do Drive.
  - **Bloco 3 (Etapa 2):** Painel do lote em staging com cartões KPI (Total, Prontas, Gabarito Pendente, Duplicatas), filtros por status e indicador da taxa de concordância da IA.
  - **Bloco 4 (Etapas 3 & 4):** Painel de conferência lado a lado:
    - *Coluna Esquerda:* Trecho bruto original do arquivo (somente leitura).
    - *Coluna Direita:* Campos estruturados editáveis, seletor visual de gabarito A-E, justificativa, e caixa de validação da classificação da IA (Área, Cenário e Dificuldade com justificativa curta).
    - Avisos destacados para itens com gabarito ausente e itens duplicados.
  - **Bloco 5:** Rodapé padronizado B2B (`IndicatorFootnote`).
- **Validação com o Arquivo Real do Drive (Lote de 1.000+ Questões):**
  - Desenvolvido e executado o benchmark `batch-runner.py` sobre o arquivo real fornecido pelo usuário: `/Users/katiacili/Downloads/Questões MedPleni-20261118T223918Z-1-001.zip`.
  - **Resultado do processamento real:**
    - Total de questões processadas: **1.270 questões**
    - Prontas com gabarito identificado: **847 questões**
    - Pendentes de gabarito: **386 questões**
    - Duplicatas/reaproveitamentos identificados: **37 questões**
    - Erros: **0**
    - Tempo total de processamento: **0.99 segundos** (1.270 questões/segundo)
    - Relatório completo persistido em `platform/public/templates/b2b/relatorio_lote_1000.json`.
- **Qualidade e Testes:**
  - Suite de testes unitários `lib/b2b/__tests__/importer.test.ts` adicionada com 10 testes cobrindo parsing, detecção de duplicatas, ausência de gabarito e classificação assistida (PR-05).
  - Vitest executado: **55/55 testes passando**.
  - TypeScript compilado com **0 erros** (`npx tsc --noEmit`).
  - ESLint verificado com **0 erros**.
  - Next.js build gerou todas as 49 rotas da aplicação perfeitamente.

### Arquivos criados / alterados

- `platform/supabase/b2b/005_importacao_staging.sql` (criado)
- `platform/public/templates/b2b/modelo_importacao_questoes.docx` (criado)
- `platform/public/templates/b2b/modelo_importacao_questoes.xlsx` (criado)
- `platform/public/templates/b2b/modelo_importacao_questoes.csv` (criado)
- `platform/public/templates/b2b/relatorio_lote_1000.json` (criado)
- `platform/app/api/b2b/templates/download/route.ts` (criado)
- `platform/lib/b2b/importer/importer-types.ts` (criado)
- `platform/lib/b2b/importer/text-parsers.ts` (criado)
- `platform/lib/b2b/importer/duplicate-detector.ts` (criado)
- `platform/lib/b2b/importer/ai-classifier.ts` (criado)
- `platform/lib/b2b/importer/staging-actions.ts` (criado)
- `platform/lib/b2b/importer/batch-runner.py` (criado)
- `platform/lib/b2b/__tests__/importer.test.ts` (criado)
- `platform/app/instituicao/banco/importar/page.tsx` (criado)
- `platform/app/instituicao/banco/importar/ImportarClient.tsx` (criado)
- `platform/app/instituicao/banco/BancoClient.tsx` (atualizado com atalho de importação)
- `docs/b2b/DIARIO.md` (atualizado)

### SQL a rodar

Arquivo: `platform/supabase/b2b/005_importacao_staging.sql` (100% aditivo e idempotente).

### Como testar

1. **Testes automatizados:** `cd platform && npm test` (55/55 testes passando).
2. **Build de produção:** `cd platform && npm run build` (49 rotas geradas).
3. **Download de modelos:** Acessar `/instituicao/banco/importar` e baixar os modelos DOCX, XLSX e CSV.
4. **Envio de arquivo teste:** Enviar um DOCX ou CSV e verificar a transição para a tela de staging com conferência lado a lado.
5. **Ajuste e Gabarito:** Selecionar uma alternativa correta, alterar a classificação assistida por IA e salvar a conferência.
6. **Submissão para Revisão:** Submeter o lote e conferir que as questões entraram com status `in_review` na Fila de Revisão de `/instituicao/banco` (nenhuma publicada direto).
7. **Processamento do Lote de 1.000+ Questões:** Executar `python3 platform/lib/b2b/importer/batch-runner.py "/Users/katiacili/Downloads/Questões MedPleni-20261118T223918Z-1-001.zip" 1000` para conferir o processamento instantâneo das 1.270 questões reais do Drive.

---

## 2026-11-18 · P05 · Banco de Questões Institucional, Fichas Técnicas e Fila de Revisão

### O que foi feito

- **Schema e Extensões Aditivas no Banco de Dados (`004_banco.sql`):**
  - Adição de colunas não destrutivas em `public.questions`:
    - `b2b_visibility`: `'medpleni_public'` ou `'institution_private'`.
    - `institution_id`: vínculo com a faculdade proprietária (nulo para acervo público MedPleni).
    - `b2b_status`: `'draft'`, `'in_review'`, `'approved'`, `'published'`, `'archived'`.
    - Metadados de proveniência e origem: `origin_institution_name`, `origin_year`, `b2b_origin_label` (formatado estritamente como "Instituição-ano" ou "ano"), `provenance_source`, `license_type`.
    - Proteção de itens de terceiros: `original_third_party_text` (guardado de forma protegida para conformidade e nunca exposto às instituições).
    - Métricas psicométricas: `times_used_in_exams`, `historical_facility_p` ($p$) e `historical_point_biserial_r` ($r_{pb}$).
  - Novas tabelas de suporte ao fluxo editorial e pedagógico:
    - `question_reviews`: histórico de pareceres da etapa única de revisão (`approved`, `returned_with_comments`, `rejected`) com comentários pedagógicos.
    - `question_versions`: versionamento de enunciados, gabaritos e justificativas a cada edição ou parecer.
    - `question_disputes`: canal de contestação/inconsistência pedagógica para apontamentos diretos (QB-15).
  - Índices compostos de alta performance para resposta sub-segundo com mais de 30 mil questões:
    - `idx_questions_b2b_visibility_status`
    - `idx_questions_b2b_filter_combo` (visibilidade, status, ano, imagem, uso em provas)
    - `idx_questions_b2b_text_search` (GIN com `to_tsvector` em português sobre o enunciado)
  - Políticas de RLS de Isolamento de Acervo por Plano (`can_access_question_b2b`):
    - *Plano "vazia":* enxerga estritamente o banco privado da sua instituição (`institution_id = user_inst_id`).
    - *Planos "com acervo" e "plus":* enxergam o acervo publicado MedPleni (`b2b_visibility = 'medpleni_public' AND b2b_status = 'published'`) somado ao seu próprio acervo privado.
    - *Isolamento multi-instituição estrito:* uma instituição **nunca** enxerga questões privadas de outra instituição.
    - *Compatibilidade B2C:* usuários não vinculados continuam acessando o catálogo público MedPleni sem quebra.
  - Função RPC de alto desempenho `get_bank_overview_stats(p_institution_id)`: calcula em lote os quantitativos por grande área e o mapa bidimensional Área × Cenário (sem metas por célula, apenas contagem real - QB-03).
- **Camada de Acesso e Regras de Negócio:**
  - `platform/lib/b2b/bank-types.ts`: interfaces TypeScript completas para questões, filtros, histórico de revisões, versões e funções puras de validação de acesso (`canInstitutionAccessQuestion`), proteção de texto de terceiros (`sanitizeQuestionForInstitution`) e formatação psicométrica.
  - `platform/lib/b2b/bank-actions.ts`: Server Actions para `getBankOverview`, `searchBankQuestionsAction` (filtros combinados), `getQuestionFullDetails`, `createDocentQuestionAction` (submissão docente com comentário obrigatório), `reviewQuestionAction` (parecer em 1 etapa) e `disputeQuestionAction`.
- **Interface Completa em `/instituicao/banco` (`BancoClient.tsx` e `page.tsx`):**
  - Obediência rigorosa ao limite máximo de 5 blocos visuais por tela.
  - **Aba 1 (Visão Geral):** KPIs de acervo por plano, distribuição por área INEP e Matriz Área × Cenário (QB-03).
  - **Aba 2 (Explorar Acervo):** Busca por texto e filtros combinados (área, cenário, tema, competência, dificuldade, ano, banca/origem, com/sem imagem, status, uso em prova - QB-04).
  - **Aba 3 (Fila de Revisão Única):** Lista de itens pendentes com toggle "Só minha área", aprovação imediata ou devolução com apontamentos (QB-07, QB-12).
  - **Aba 4 (Nova Questão):** Formulário docente com classificação nos 4 eixos, 5 alternativas A-E com marcação do gabarito, comentário/devolutiva obrigatória e envio automático para revisão (QB-06).
  - **Modal de Ficha Técnica da Questão (QB-05):** Exibição do enunciado completo, alternativas com destaque verde no gabarito, justificativa detalhada, eixos taxonômicos, métricas psicométricas ($p$ e $r_{pb}$), histórico de versões e botão de contestação (QB-15).
  - **Navegação:** Rota `/instituicao/banco` ativada como "ready" na sidebar para Dirigente, Coordenador e Docente; rota `/instituicao/banco-questoes` redireciona automaticamente para `/instituicao/banco`.
- **Roteiro de Testes e Qualidade:**
  - Roteiro `docs/b2b/TESTE-RLS.md` expandido com os Casos 7, 8 e 9 cobrindo o isolamento do banco.
  - Suite de testes unitários `lib/b2b/__tests__/bank.test.ts` adicionada. Total de **45/45 testes passando no Vitest**.
  - TypeScript compilado com 0 erros (`tsc --noEmit`).
  - ESLint sem nenhum erro no módulo B2B.
  - Build de produção do Next.js gerou todas as 47 rotas com sucesso.

### Arquivos criados / alterados

- `platform/supabase/b2b/004_banco.sql` (criado)
- `platform/lib/b2b/bank-types.ts` (criado)
- `platform/lib/b2b/bank-actions.ts` (criado)
- `platform/lib/b2b/__tests__/bank.test.ts` (criado)
- `platform/app/instituicao/banco/page.tsx` (criado)
- `platform/app/instituicao/banco/BancoClient.tsx` (criado)
- `platform/app/instituicao/banco-questoes/page.tsx` (criado - redirecionamento)
- `platform/app/instituicao/components/B2BShell.tsx` (atualizado link e status para "ready")
- `docs/b2b/TESTE-RLS.md` (atualizado com casos 7, 8 e 9)
- `docs/b2b/DIARIO.md` (atualizado)

### SQL a rodar

Arquivo: `platform/supabase/b2b/004_banco.sql` (100% aditivo e idempotente).

### Como testar

1. **Testes automatizados:** `cd platform && npm test` (45/45 testes passando).
2. **Build de produção:** `cd platform && npm run build` (47 rotas geradas).
3. **Navegação:** Acessar `/instituicao/banco` como docente, dirigente ou coordenador.
4. **Criação de Questão:** Cadastrar uma questão com comentário obrigatório na aba "Nova Questão" e verificar seu encaminhamento imediato para a Fila de Revisão.
5. **Revisão:** Como revisor, aprovar a questão ou devolver com comentário na aba "Fila de Revisão".
6. **Ficha Técnica e Contestação:** No Explorar, abrir a ficha completa de uma questão e submeter uma contestação pedagógica.

---

## 2026-11-18 · P04 · Classificação: Área, Cenário, Tema, Competência

### O que foi feito

- **Schema de Taxonomia Canônica (`003_taxonomia.sql`):**
  - `tax_areas`: 7 grandes áreas do INEP com ordem, cores oficiais, código e flexibilidade multi-etapa (`etapa_2_3` e `etapa_1_ciclo_basico` quando o INEP publicar a 1ª etapa).
  - `tax_cenarios`: ambientes de prática médica (vazio inicialmente, aguardando arquivo do Dr. Filipe).
  - `tax_temas`: temas com hierarquia de até 2 níveis (tema pai / subtema) vinculados à área correspondente.
  - `tax_competencias`: matriz de competências e habilidades clínicas.
  - `tax_area_legacy_mapping`: tabela de mapeamento de-para não destrutiva que preserva intactas as colunas antigas `questions.area` e `questions.subarea`.
  - `question_classification`: classificação canônica vinculando a questão aos 4 eixos, dificuldade normalizada (`facil`, `media`, `dificil`) e proveniência da sugestão (`humano` ou `ia`).
  - Procedimento de migração retroativa em SQL que classifica automaticamente todo o acervo legado existente e função `get_unmapped_questions_report()` para diagnóstico de cobertura.
- **Ponto Único de Leitura e Tipagem:**
  - `platform/lib/b2b/taxonomy-types.ts`: tipagem TypeScript completa dos 4 eixos.
  - `platform/lib/b2b/taxonomy-csv.ts`: funções puras de parse e exportação CSV com suporte a UTF-8 BOM.
  - `platform/lib/b2b/taxonomy.ts`: camada de acesso autoritativo (`getCanonicalAreas`, `getCenarios`, `getTemas`, `getCompetencias`, `getTaxonomyBundle`, `getTaxonomyMigrationReport`).
  - `platform/lib/b2b/taxonomy-actions.ts`: Server Actions para CRUD das 4 listas, importação CSV idempotente e mapeamento rápido de áreas órfãs.
- **Área Administrativa de Classificação (`/instituicao/admin/classificacao`):**
  - Gestão e edição das 4 listas taxonômicas com atalhos de importação e exportação CSV.
  - Painel de Cobertura e Diagnóstico com contadores de questões migradas, percentual de cobertura e tabela de textos legados com botão de mapeamento imediato.
  - Atalho de navegação adicionado em `/instituicao/admin`.
- **Registro de Ocorrências Legadas no B2C (não refatoradas agora para não quebrar o B2C):**
  - `platform/lib/types.ts`: superset de 16 especialidades antigas (mantido).
  - `platform/lib/supabase/diagnostic.ts`: lista de 5 áreas legadas (mantido).
  - `platform/lib/supabase/prediction.ts`: 7 áreas (mantido).
  - `platform/app/questoes/page.tsx`: 7 áreas (mantido).
  - `platform/app/simulados/page.tsx`: listas de 5 e 6 áreas (mantido).
  - `platform/app/cronograma/page.tsx`: lista de 5 áreas (mantido).
  - `platform/app/flashcards/page.tsx`: lista de 5 áreas (mantido).
  - `platform/app/aulas/page.tsx`: lista de 5 áreas (mantido).
  - *Todas as telas novas do B2B consomem exclusivamente `lib/b2b/taxonomy.ts`.*
- **Garantia de Qualidade e Testes:**
  - Suite `lib/b2b/__tests__/taxonomy.test.ts` adicionada. Total de **33/33 testes passando**.
  - `npx tsc --noEmit` compilado com 0 erros.
  - Build de produção do Next.js gerou todas as 45 rotas sem warnings nem erros.

### Arquivos criados / alterados

- `platform/supabase/b2b/003_taxonomia.sql` (criado)
- `platform/lib/b2b/taxonomy-types.ts` (criado)
- `platform/lib/b2b/taxonomy-csv.ts` (criado)
- `platform/lib/b2b/taxonomy.ts` (criado)
- `platform/lib/b2b/taxonomy-actions.ts` (criado)
- `platform/lib/b2b/__tests__/taxonomy.test.ts` (criado)
- `platform/app/instituicao/admin/classificacao/page.tsx` (criado)
- `platform/app/instituicao/admin/classificacao/ClassificacaoClient.tsx` (criado)
- `platform/app/instituicao/admin/AdminInstituicaoClient.tsx` (atualizado com atalho para taxonomia)
- `docs/b2b/DIARIO.md` (atualizado)

### SQL a rodar

Arquivo: `platform/supabase/b2b/003_taxonomia.sql` (aditivo e idempotente).

### Como testar

1. **Testes automatizados:** `cd platform && npm test` (33/33 testes passando).
2. **Build de produção:** `cd platform && npm run build` (45 rotas geradas com sucesso).
3. **Classificação e Taxonomia:**
   - Acessar `/instituicao/admin/classificacao` com usuário superadmin/admin MedPleni.
   - Navegar entre as 4 abas (Áreas, Cenários, Temas, Competências).
   - Testar a exportação de CSV das Áreas.
   - Verificar a aba "Relatório de Questões" para auditar a cobertura e o mapeamento de-para.

### Pendências / Dúvidas

- **Cenários do INEP:** Mario solicitou hoje ao Dr. Filipe e aguarda o envio. A estrutura em `tax_cenarios`, o CRUD no painel e o parser CSV já estão prontos para carga imediata assim que o arquivo for disponibilizado.

---

## 2026-11-18 · P03 · Configurações Institucionais (GO-01), Importação CSV, Convites e Admin MedPleni

### O que foi feito

- **SQL Aditivo e Idempotente (`003_convites_e_configuracoes.sql`):**
  - Colunas B2B em `admin_invitations` (`institution_id`, `b2b_role`, `b2b_scopes`) para reaproveitamento total da infraestrutura de convites sem tocar no fluxo do B2C.
  - Tabela `b2b_support_sessions` para auditoria estrita de sessões de suporte administrativo da MedPleni em qualquer instituição (com justificativa obrigatória registrada).
  - Atualização das políticas de RLS de `admin_invitations` e `institution_members`: somente Dirigente e Admin MedPleni alteram papéis institucionais; Coordenador gerencia apenas turmas, alunos e docentes.
  - Função SQL `batch_import_enrollments(p_institution_id, p_students)` com `SECURITY DEFINER` para importação em lote atômica, idempotente e ultrarrápida no banco de dados.
- **Engine de Importação de Matrículas (`platform/lib/b2b/csv-enrollment.ts`):**
  - Parser e validador linha a linha com suporte a vírgula (`,`) e ponto-e-vírgula (`;`).
  - Validação estrita: formato de e-mail, preenchimento de nome e RA, matching da turma contra as turmas cadastradas na instituição, e detecção de duplicidades intra-arquivo (RA ou e-mail repetido).
  - Geração de relatório de erros para download em CSV formatado com BOM UTF-8 (compatível com Excel).
  - Performance comprovada: processa e valida 240+ alunos em menos de 50ms.
- **Server Actions e API de Matrículas:**
  - `platform/lib/b2b/config-actions.ts`: ações de servidor para criar, editar e arquivar cursos, termos e turmas; atualizar parâmetros (corte, logo, alertas e metas); enviar convites institucionais; alterar papéis e escopos; e ações exclusivas de Admin MedPleni (criar faculdade e entrar como suporte auditado).
  - `platform/app/api/b2b/enrollments/import/route.ts`: endpoint em lote que grava matrículas com idempotência — reimportar o mesmo CSV atualiza registros sem duplicar nenhum aluno.
  - Vínculo automático no aceite de convite em `platform/app/api/invites/[token]/route.ts`.
- **Interface /instituicao/configuracoes (`ConfiguracoesClient.tsx` e `page.tsx`):**
  - Estrutura: gestão de Cursos, Termos Letivos e Turmas (1º ao 12º período).
  - Matrículas: upload de CSV com drag-and-drop, contadores em tempo real (válidas vs inválidas), relatório de erros para download, amostra pré-visualizada e botão de gravação com confirmação.
  - Usuários e Papéis: listagem de membros, escopos atribuídos, botão de desativação/reativação e modal de convite com seleção de cursos/turmas. Regra de proteção demo ativa (bloqueia disparos de e-mail real via Resend se `is_demo = true`).
  - Parâmetros: corte de referência (padrão 60%), URL de logo para PDFs, 4 alertas de engajamento (desligados por padrão) e meta semanal de questões (desligada por padrão).
  - Checklist de Implantação: 8 passos de prontidão operacional com barra de progresso e botões de atalho direto para a aba de resolução.
- **Interface /instituicao/admin (`AdminInstituicaoClient.tsx` e `page.tsx`):**
  - Área restrita aos Administradores MedPleni (`isMedPleniAdmin`).
  - Criação de novas instituições com seleção de plano (`vazia`, `acervo`, `plus`), corte inicial e flag de demonstração.
  - Botão "Entrar como suporte" em qualquer instituição, exigindo justificativa obrigatória registrada em log para fins de governança e LGPD, chaveando a instituição ativa via cookie seguro.
- **Garantia de Qualidade e Testes:**
  - Adicionada suite de testes unitários `lib/b2b/__tests__/csv-enrollment.test.ts`. Total de **29/29 testes passando**.
  - `npx tsc --noEmit` sem nenhum erro de tipagem.
  - Build de produção do Next.js compilado com sucesso gerando todas as 45 rotas estáticas e dinâmicas.

### Arquivos criados / alterados

- `platform/supabase/b2b/003_convites_e_configuracoes.sql` (criado)
- `platform/lib/b2b/csv-enrollment.ts` (criado)
- `platform/lib/b2b/__tests__/csv-enrollment.test.ts` (criado)
- `platform/lib/b2b/config-actions.ts` (criado)
- `platform/app/api/b2b/enrollments/import/route.ts` (criado)
- `platform/app/instituicao/configuracoes/page.tsx` (criado)
- `platform/app/instituicao/configuracoes/ConfiguracoesClient.tsx` (criado)
- `platform/app/instituicao/admin/page.tsx` (criado)
- `platform/app/instituicao/admin/AdminInstituicaoClient.tsx` (criado)
- `platform/app/instituicao/components/B2BShell.tsx` (atualizado menu para Configurações "ready" e atalho Admin MedPleni)
- `platform/app/api/invites/[token]/route.ts` (atualizado com vínculo institucional B2B no aceite)
- `docs/b2b/DIARIO.md` (atualizado)

### SQL a rodar

Arquivo: `platform/supabase/b2b/003_convites_e_configuracoes.sql` (100% aditivo e idempotente).

### Como testar

1. **Testes automatizados:** `cd platform && npm test` (29/29 testes passando).
2. **Build de produção:** `cd platform && npm run build` (45 rotas geradas).
3. **Importação CSV:** Na aba Matrículas, testar envio de CSV com alunos válidos e com erros intencionais para validar download do relatório.
4. **Admin MedPleni:** Acessar `/instituicao/admin` com `mario.nascimentolopes@gmail.com`, criar uma instituição teste e usar o recurso "Entrar como suporte".

---

## 2026-11-18 · P02 · Área /instituicao, Navegação por Papel e Componentes-Padrão B2B

### O que foi feito

- **Layout e Guarda de Acesso (`app/instituicao/layout.tsx` e `B2BShell.tsx`):**
  - Implementada a guarda de servidor `requireB2BMember()`: usuários que não possuem vínculo institucional são redirecionados de forma transparente para `/dashboard` (B2C), sem qualquer vazamento ou quebra.
  - Sidebar responsiva (desktop fixa de 240px; gaveta mobile/drawer com backdrop em telas menores).
  - Topbar institucional com nome da faculdade, sigla, seletor de instituições com Server Action (`switchActiveInstitution`), indicador da Régua 60 e alternância de tema claro/escuro integrado aos tokens CSS existentes.
  - **Menu Seletivo por Papel:**
    - *Dirigente e Coordenador:* Visão geral, Turmas, Acompanhamento, Provas, Banco de questões, Avaliação longitudinal, Intervenções, Professores, Relatórios e Configurações.
    - *Docente:* Início, Minhas turmas, Provas e Banco de questões.
    - *Aluno:* Início, Minhas avaliações, Praticar e Minha evolução.
    - *Regra de itens em construção:* Itens em desenvolvimento aparecem com badge "Em breve" apenas para Admin MedPleni e permanecem ocultos para os demais usuários.
- **Componentes-Padrão (`components/b2b/`):**
  - `PageHeader`: cabeçalho limpo com título, subtítulo e ações.
  - `FiltersBar`: filtros de período/etapa, turma, prova e intervalo de datas persistidos em query params na URL com transição suave.
  - `IndicatorFootnote`: rodapé padronizado obrigatório para rastreabilidade (*Base · Período · Fonte*).
  - `EmptyState`: componente elegante para ausência de registros sem números fictícios.
  - `ScoreBand` e `ScoreBandLegend`: classificação nas 4 faixas aprovadas pelos médicos (≤ 50%, 51–60% Zona de Decisão, 61–70% Proficiente, ≥ 71% Excelente) com suporte à régua configurável.
  - `DataTable`: tabela ordenável por colunas, paginação, busca e exportação instantânea para CSV com download UTF-8 BOM.
  - `IndividualDataNotice`: banner LGPD discreto com disparo automático de auditoria para `POST /api/b2b/audit-access`.
- **Página Inicial (`app/instituicao/page.tsx`):**
  - Construída seguindo estritamente a regra dos **no máximo 5 blocos principais** por tela.
- **Testes Unitários:**
  - Adicionada suite `components/b2b/__tests__/components.test.ts`. Total de **22/22 testes passando**.
- **Validação:**
  - Build de produção do Next.js gerou todas as 44 rotas com sucesso em 8.4s.

### Arquivos criados / alterados

- `platform/app/instituicao/layout.tsx` (criado)
- `platform/app/instituicao/page.tsx` (criado)
- `platform/app/instituicao/components/B2BShell.tsx` (criado)
- `platform/app/api/b2b/audit-access/route.ts` (criado)
- `platform/lib/b2b/actions.ts` (criado)
- `platform/components/b2b/PageHeader.tsx` (criado)
- `platform/components/b2b/FiltersBar.tsx` (criado)
- `platform/components/b2b/IndicatorFootnote.tsx` (criado)
- `platform/components/b2b/EmptyState.tsx` (criado)
- `platform/components/b2b/ScoreBand.tsx` (criado)
- `platform/components/b2b/DataTable.tsx` (criado)
- `platform/components/b2b/IndividualDataNotice.tsx` (criado)
- `platform/components/b2b/index.ts` (criado)
- `platform/components/b2b/__tests__/components.test.ts` (criado)
- `platform/lib/b2b/types.ts` (atualizado com `AvailableInstitution` e contexto enriquecido)
- `platform/lib/b2b/auth.ts` (atualizado com fallback para superadmin MedPleni e lista de faculdades)
- `docs/b2b/DIARIO.md` (atualizado)

### SQL a rodar

Nenhum SQL novo nesta etapa (utiliza as tabelas do P01).

### Como testar

1. Testes automatizados: `cd platform && npm test` (22/22 testes passando).
2. Teste manual de navegação:
   - Acessar `/instituicao` logado com usuário da demo (`dirigente@fadep-demo.medpleni.com`, `coord.clinico@fadep-demo.medpleni.com`, `docente1@fadep-demo.medpleni.com` ou `aluno.08p.01@fadep-demo.medpleni.com`).
   - Verificar se o menu seletivo corresponde ao papel do usuário logado.
   - Alternar tema claro e escuro no topo.
   - Testar o DataTable e o download do arquivo CSV.

---

## 2026-11-18 · P01 · Base Multi-Instituição, Escopos, Matrículas, RLS e Vitest

### O que foi feito

- **Schema Institucional B2B (`001_instituicoes.sql`):**
  - Criadas as tabelas multi-tenant aditivas: `institutions`, `courses`, `academic_terms`, `class_groups` (turmas), `institution_members` (papéis B2B: dirigente, coordenador, docente, aluno), `member_scopes` (delimitação por curso ou turma), `enrollments` (matrículas de alunos com RA) e `individual_access_log` (auditoria LGPD).
  - Funções PostgreSQL `SECURITY DEFINER`: `is_medpleni_admin()`, `is_member(inst_id)`, `has_role(inst_id, roles[])`, `can_see_student(student_uid)` e `get_class_group_institution(cg_id)`.
  - Políticas de RLS rigorosas em todas as 8 tabelas: isolamento completo entre instituições, alunos restritos aos próprios dados, docentes restritos às suas turmas, coordenadores e dirigentes conforme a matriz de papéis, e superadmin MedPleni com acesso total.
- **Tipagem e Autenticação de Servidor:**
  - `platform/lib/b2b/types.ts`: interfaces TypeScript completas para todas as entidades B2B.
  - `platform/lib/b2b/auth.ts`: funções de servidor para resolver instituição ativa, obter membro e escopos, registrar logs de auditoria e guarda `requireB2BMember` que redireciona acessos não autorizados para o B2C sem quebras.
- **Testes com Vitest:**
  - `vitest` e `vite` instalados como devDependencies.
  - `platform/lib/b2b/__tests__/auth.test.ts`: suite com 16 testes unitários validando permissões puras, escopos de turmas, escopos de cursos e regras LGPD para perfis individuais. Todos os 16 testes passando.
- **Seed de Demonstração e Rollback:**
  - `platform/supabase/b2b/002_seed_demo.sql`: provisiona a "Faculdade Demonstração" (FADEP), 1 curso de Medicina, 12 turmas (1º ao 12º período), 1 dirigente, 2 coordenadores, 8 docentes escopados e 240 alunos fictícios com matrículas ativas.
  - `platform/supabase/b2b/002_seed_demo_down.sql`: script cirúrgico de limpeza e remoção de todo o seed demo sem afetar dados do B2C.
- **Documentação de RLS:**
  - Criado `docs/b2b/TESTE-RLS.md` com roteiro de 6 cenários de consultas simulando JWTs de diferentes personas para validação prática no Supabase SQL Editor.

---

## 2026-11-18 · P00.1 · Correções Pré-B2B e Alinhamento de Áreas

### O que foi feito

- **Decisão H-04 Alinhada:** Confirmado com o Mario que a string oficial no banco e sistema é **"Cirurgia Geral"**, mantendo total compatibilidade com o acervo existente do B2C.
- **BUG-01 corrigido:** Removida a inserção da coluna inexistente `correct_option` em `platform/lib/supabase/admin.ts`.
- **BUG-02 corrigido:** Corrigido o UPDATE de plano em `platform/lib/supabase/admin.ts` para usar o nome real da coluna (`plan` em vez de `plano`).
- **INC-01 corrigido:** Atualizada a tipagem de `ProfileRow.role` em `platform/lib/supabase/profile.ts` para refletir todos os papéis reais do sistema.
- **AREA-01 (Passo 1):** Criado `platform/lib/constants.ts` com a constante canônica `AREAS_INEP`, abreviações e cores temáticas.
- **SQL Gerados e Executados pelo Mario:**
  - `platform/supabase/b2b/000_pre_b2b_fixes.sql`: limpeza de órfãos, FK `simulation_id` em `user_answers`, ampliação de `context_type` para aceitar `'exam'`, e colunas aditivas em `questions`.
  - `platform/supabase/b2b/001_core_tables.sql`: tabelas core multi-tenant de teste inicial.
  - `platform/supabase/b2b/002_areas_seed.sql`: criação da tabela `b2b_areas` e seed das 7 áreas oficiais INEP.
- **Validação:** `npx tsc --noEmit` completado sem erros e `npm run build` gerando 100% das 42 rotas com sucesso.

---

## 2026-11-18 · P00 · Reconhecimento

### O que foi feito

Leitura completa do código-base sem alterar nenhum arquivo de código ou banco. Produzido o documento de reconhecimento `docs/b2b/RECONHECIMENTO.md` cobrindo os 8 pontos solicitados.
