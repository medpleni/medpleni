# MedPleni — Plano de Ação de Adequações da Plataforma (v1)

**Data:** 15/09/2026
**Base:** Relatório Técnico dos médicos parceiros (Avaliação Estratégica), análises em áudio/vídeo/PPT (Strategic Blueprint) e auditoria do código em `Projetos/Ativos/medpleni/platform`.
**Princípio orientador (do relatório):** confiança antes de sofisticação. P0 → P1 → P2. Nada de escala B2B2C antes do piloto reconciliado.

---

## 1. O que foi lido e o que o código confirma

O relatório dos médicos acerta o alvo. Ao cruzar cada achado com o código, todos os problemas apontados se confirmam — e a auditoria do código revelou que a raiz é mais profunda do que o relatório pôde ver pelas telas: a plataforma hoje **não persiste os dados que o modelo institucional exige**. Boa parte do que aparece no dashboard e na predição é calculada de números fixos no código, não de respostas reais.

Isso não invalida o produto. A camada visual, a navegação, a agenda e os comentários (os "ativos a preservar" do relatório) estão bem construídos e são reaproveitáveis integralmente. O trabalho é de **back-end e modelo de dados**, exatamente como o PPT resume no slide "Ativos da Interface".

### Stack real encontrada

| Camada | O que está em uso |
|---|---|
| Front/app | Next.js 16.2 (App Router), React 19, TypeScript, Tailwind 4, Recharts |
| Backend/dados | Supabase (Postgres + Auth + RLS), 11 arquivos SQL soltos em `platform/supabase/` (sem migrations versionadas) |
| IA | OpenRouter (`anthropic/claude-3.7-sonnet` e `google/gemini-2.0-flash-001`) para o Preceptor IA / Dr. Pleni |
| E-mail | Resend |
| Pagamento | Iugu (`lib/billing/iugu.ts`) — memória do projeto cita Stripe; o código usa Iugu |
| Deploy | Vercel |
| Importação | `scripts/import-questions.mjs` (lote de questões) |

---

## 2. Achados: relatório × código

Legenda de gravidade: **P0** bloqueia piloto institucional · **P1** bloqueia autoria/planejamento B2B · **P2** melhoria contínua.

### 2.1 Taxonomia divergente (P0) — CONFIRMADO, e pior que 7/6/5

Não existe tabela de áreas. `questions.area` e `subarea` são `TEXT` livre. Cada módulo carrega sua própria lista fixa no código:

| Módulo | Arquivo | Áreas |
|---|---|---|
| Tipo global | `lib/types.ts:27-33` | 7 áreas + 9 subáreas misturadas no mesmo tipo `Area` |
| Banco de questões | `app/questoes/page.tsx:36-42` | 7 |
| Criador de simulado | `app/simulados/page.tsx:639-644` | 6 (sem Saúde Mental) |
| Simulado oficial (lista) | `app/simulados/page.tsx:53` | 5 |
| Predição | `lib/supabase/prediction.ts:142` | 5 (`coreAreas`), embora os pesos em `:47-53` tenham 7 |
| Cadastro admin de questão | `app/admin/conteudo/nova/page.tsx:138` | 5 |
| Lista admin | `app/admin/conteudo/page.tsx:121` | 5 (com "GO" como rótulo divergente) |
| Diagnóstico | `lib/supabase/diagnostic.ts:29` | 5 |
| Flashcards | `app/flashcards/page.tsx:921` | 5 |
| Cronograma | `app/cronograma/page.tsx:22` | 5 |
| Catálogo de aulas | `lib/data/classes_catalog.ts:9` | 5 (aulas de Saúde Mental classificadas como Clínica Médica, ex.: linha 2759) |
| IA Médica | `app/ia-medica/page.tsx:118`, `medical_ai_schema.sql:10` | usa "Preventiva", "Geral", "Clinica" — nomes diferentes de todo o resto |
| Página de planos | `app/planos/page.tsx:440` | texto de marketing afirma "5 grandes áreas" |

Nenhum dos 5 componentes da Matriz ENAMED (perfil do egresso, competências, áreas, contextos, conteúdos) existe no modelo de dados.

### 2.2 Modo revisão abre nova prova e altera nota (P0) — CONFIRMADO

- `app/simulados/page.tsx:862-879`: os botões **"Revisar Erros"** e **"Refazer"** fazem exatamente a mesma coisa: `router.push('/simulado/${s.id}')`.
- `app/simulado/[id]/page.tsx:52-91`: a página sempre inicia cronômetro; não existe modo leitura.
- `lib/supabase/simulations.ts:408-416`: ao finalizar, faz `upsert` em `user_simulations` — sobrescreve o resultado anterior.

Achado adicional grave: esse `upsert` grava colunas `percentual_acerto`, `tempo_gasto_segundos`, `data_conclusao`, `score`, que **não existem** no schema (`schema.sql:144-153` define `score_percent`, `time_spent_seconds`, `completed_at`). O erro é engolido pelo `try/catch`. Na prática, **resultados de simulado provavelmente não estão sendo gravados**.

### 2.3 Respostas por item não são persistidas no simulado (P0) — NOVO, o mais crítico

`finishSimulation` calcula a nota em memória e grava só o agregado. **Nenhuma resposta individual do simulado vai para `user_answers`.** Só as questões avulsas (`app/questoes/page.tsx:135`) chamam `submitUserAnswer`. Consequência direta: a "matriz de respostas aluno × item" que o relatório exige como passaporte institucional não existe hoje para simulados.

### 2.4 Simulado não tem conjunto fixo de questões (P0) — NOVO

- Não há tabela `simulation_questions`. `fetchSimulationDetails` (`simulations.ts:443-471`) busca "as primeiras N questões da instituição" no momento de abrir. Duas pessoas (ou a mesma pessoa em dois dias) podem receber provas diferentes sob o mesmo `simulation_id`. Sem `versao_prova`, sem `posicao_exibida`, sem embaralhamento registrado.
- Simulado personalizado (`app/api/simulados/custom/route.ts`): seleciona e embaralha as questões pelos filtros do usuário… e **descarta a seleção**; grava só título e contagem. Ao abrir, `institution = "PERSONALIZADO"` não bate com nenhum filtro e o aluno recebe as primeiras N questões genéricas — as áreas escolhidas são ignoradas.

### 2.5 Índices, ranking e predição sem metodologia (P0 para comunicação / P2 para modelo) — CONFIRMADO

`lib/supabase/prediction.ts`:
- Contagens por área começam com valores fictícios (`:81-85`: 42/36, 28/20…) e só são sobrescritas se houver respostas.
- `percentilNacional = clamp(score + 5, 70, 99)` (`:216`) → todo aluno é "Top 1–30%".
- `rankingEstimado = 1500 × (1 − score/100)` (`:221`).
- Projeção 2027 = score + 4,2 / + 7,5 / + 10,8 fixos (`:182-190`).
- Mínimos forçados: `totalQuestoesResolvidas ≥ 142`, `simuladosRealizados ≥ 3`, streak padrão 14.
- Dashboard tem "Top 8%" e "94,7% atual" escritos à mão (`app/dashboard/page.tsx:261, 556`; `mock-data.ts:41`). Isso explica o Top 8% vs Top 20% e o 74,7% vs 78% vs 94,7% do relatório.
- Pesos por área somam 100% em 7 áreas, mas a tela mostra 5 → soma visível 78% (exatamente o que os médicos observaram).

### 2.6 Cronograma: cabeçalho 23,5 h vs. soma 26,5 h (P1) — CONFIRMADO

O cabeçalho usa `profile.weekly_study_hours` / `aiWeeklyHours` (`cronograma/page.tsx:80,1086`), a lista soma `duracaoMinutos` dos blocos (`:173-203`). Duas fontes. Agravante: o cronograma **é salvo apenas em `localStorage`** (`schedule.ts:382-397`; o "save" no Supabase só toca `updated_at`). Troca de dispositivo = cronograma perdido; instituição nunca verá adesão.

### 2.7 Busca textual imprecisa (P1) — CONFIRMADO

`questions.ts:63`: `ilike('statement', '%termo%')`. Sem tema principal estruturado, sem sinônimos, sem FTS. O caso "diabetes → síndrome nefrótica" é o comportamento esperado desse código.

### 2.8 Origem e curadoria das questões (P0 para B2B) — CONFIRMADO

Tabela `questions` não tem `source` (oficial / autoral / IA), `version`, `reviewed_by`, `reviewed_at`, `status` editorial, `competencia_id`, `conteudo_id`. O Preceptor IA cria flashcards com `subarea = "Preceptor IA"` (`api/flashcards/route.ts:49`) — único rastro de origem IA em todo o sistema.

### 2.9 Diagnóstico Raio-X roda sobre questões mock (P0) — NOVO

`app/diagnostico/page.tsx:6,29`: `diagQuestions = mockQuestions.slice(0, N)`. O diagnóstico que alimenta o posicionamento inicial não usa o banco real.

### 2.10 Camada institucional inexistente (P0) — CONFIRMADO

Não há `institutions`, `campuses`, `courses`, `cohorts/turmas`, `enrollments`, `periodo_letivo`. `profiles` tem só `role ∈ {student, admin, mentor}` e `plan`. RLS é por usuário; não há isolamento por instituição. Nenhum exportador.

### 2.11 Outros achados de código (higiene, P1)

- Sem migrations versionadas (Supabase CLI presente, mas SQL avulso).
- Sem testes automatizados.
- `mock-data.ts` (756 linhas) é fallback silencioso em quase todo módulo — mascara falhas de banco.
- Unicidade em `user_simulations (user_id, simulation_id)` não existe; `upsert` sem `onConflict` vira insert.
- Memória do projeto cita "Stripe"; código usa Iugu — alinhar documentação.

---

## 3. Plano de ação por fases

### FASE P0 — Base institucional e integridade (bloqueante) · ~4–6 semanas de dev

Objetivo: passar nos critérios T01, T02, T03 do checklist dos médicos. **Tudo desta fase é feito com a stack atual (Supabase + Next.js).** Nenhum recurso externo pago é necessário.

#### Épico P0.1 — Taxonomia canônica (single source of truth)

Migração SQL:
```
areas (id, slug, nome, ordem, ativo)                    -- 7 áreas oficiais
temas (id, area_id, nome, sinonimos text[], parent_id)   -- hierárquico
competencias (id, codigo, descricao)                     -- 15 (Matriz ENAMED)
contextos (id, nome)                                     -- 6
conteudos (id, nome)                                     -- 21
perfil_egresso (id, nome)                                -- 7
questions: + area_id FK, + tema_principal_id FK, + temas_transversais uuid[]
question_competencias (question_id, competencia_id)      -- N:N
question_conteudos, question_contextos                   -- N:N
```
Código:
- Criar `lib/taxonomy.ts` que lê `areas` do banco (com cache) e **remover todas as 13 listas fixas** da tabela da seção 2.1.
- Separar o tipo `Area` (7) de `Subarea`/`Tema` em `lib/types.ts`.
- Script de migração de dados: mapear `questions.area` texto → `area_id`; auditar Saúde Mental e MFC (hoje diluídas em Clínica Médica / Saúde Coletiva); reclassificar as aulas de `classes_catalog.ts` (ex.: "Saúde Mental na APS" está como Clínica Médica).
- Reescrever `prediction.ts:143` para iterar as 7 áreas vindas do banco.
- Corrigir texto de marketing de `planos/page.tsx:440` ("5 grandes áreas").

Critério de aceite: T01 — criar rascunho de prova com cotas por 7 áreas e cada item aparece na área certa em banco, criador, predição e admin.

#### Épico P0.2 — Modelo de tentativa e matriz de respostas

Migração SQL (nomes alinhados ao pacote mínimo da seção 7 do relatório):
```
assessments (id, titulo, tipo: diagnostico|simulado|prova_institucional|treino, owner_institution_id null, versao, publicado_em)
assessment_items (assessment_id, question_id, question_version, posicao, peso, anulada)   -- caderno FIXO
attempts (id, user_id, assessment_id, assessment_version, cohort_id null, modo: aplicacao|treino|revisao, status, inicio, fim, tempo_total_ms)
attempt_answers (attempt_id, question_id, question_version, posicao_exibida, mapa_ordem_alternativas jsonb, alternativa_id_marcada, letra_exibida, acerto, confianca, tempo_item_ms, respondida_em)
question_versions (question_id, version, snapshot jsonb, gabarito_id, criado_em)   -- versionamento
```
Regras:
- `attempts` é **append-only**; nunca `upsert`. Score é derivado (view ou coluna calculada), nunca sobrescrito.
- Modo `revisao` não cria `attempt_answers`; abre um `review_session` separado (ou apenas leitura de `attempt_answers` da tentativa original).
- Simulado personalizado passa a gravar `assessment_items` com a seleção feita.
- Migrar `user_answers` existentes para `attempt_answers` com `modo = treino`.

Código:
- `finishSimulation` → grava tentativa + respostas item a item (transação via RPC Postgres `finish_attempt(...)`).
- `fetchSimulationDetails` → lê `assessment_items` na ordem gravada; não refaz a query por instituição.
- Corrigir nomes de colunas do `upsert` (bug 2.2) como hotfix imediato antes mesmo da refatoração.
- Diagnóstico Raio-X → virar um `assessment` do tipo `diagnostico` com itens reais do banco.

Critério de aceite: T03 — exportar 100 % das respostas de uma aplicação de teste e reconciliar com o que a tela mostra.

#### Épico P0.3 — Modo revisão separado (hotfix de 1–2 dias, depois refinamento)

- Nova rota `/simulado/[id]/revisao/[attemptId]`: sem cronômetro, sem barra "Q1/60 pendentes", lê `attempt_answers`, mostra alternativa marcada × gabarito × comentário, filtros "só erradas / só baixa confiança".
- "Refazer" → cria **nova** tentativa (`modo = treino`), nunca altera a anterior. Exibir histórico de tentativas.
- Botão "Revisar Erros" e "Refazer" deixam de apontar para a mesma rota.

Critério de aceite: revisar não altera nenhum número histórico (verificável no export).

#### Épico P0.4 — Camada institucional e RLS multi-tenant

```
institutions (id, nome, cnpj, plano_b2b, ativo)
campuses (id, institution_id, nome)
courses (id, campus_id, nome)
cohorts (id, course_id, nome, periodo_letivo, periodo_curso)
enrollments (user_id, cohort_id, papel: aluno|coordenador|docente, ativo, desde)
assessment_applications (id, assessment_id, cohort_id, janela_inicio, janela_fim, obrigatoria)
attempts.application_id FK null
```
- RLS: coordenador/docente vê só sua instituição; aluno vê só o próprio; admin Plenitude vê tudo. Usar `auth.jwt()` claims ou função `current_institution()`.
- Reaproveitar `admin_invitations` para convite em lote por turma (CSV de e-mails).
- Painel `/institucional` mínimo: turma → aplicação → participação (presentes/ausentes) → distribuição de notas → fragilidade por área/competência.

Critério de aceite: T02 — vincular alunos de teste a uma turma e conferir participação/ausências.

#### Épico P0.5 — Exportação bruta auditável

- Endpoint `GET /api/export/application/[id].csv` (e `.xlsx`) com os 6 blocos do relatório: coorte, aplicação/tentativa, questão/currículo, alternativa, gabarito/correção, adicionais (`tempo_item`, `confianca`, `exposicao_previa`, `data_exportacao`).
- Gerado por uma **view Postgres** `v_export_respostas` — assim a instituição reproduz qualquer indicador fora da plataforma.
- Segundo arquivo: dicionário de dados + hash do export (auditabilidade).

#### Épico P0.6 — Honestidade dos indicadores (comunicação)

Enquanto o modelo preditivo não for validado (P2), a plataforma não pode exibir "87,4 % de probabilidade" nem "Top 8 %". Ações imediatas:
- Remover `percentilNacional`, `rankingEstimado` e `projecao2027` da UI, ou rotular como **"simulação ilustrativa — não validada"** com texto de metodologia.
- Remover valores fixos (`:81-85`, `142`, `3`, `14`, dashboard "Top 8%" e "94,7%").
- Uma única função `computeIndices(userId)` no servidor, usada por dashboard, predição e admin. Distinguir explicitamente: **taxa de acerto** (fato), **índice interno ponderado** (fórmula publicada), **meta** e **proficiência** (só quando houver psicometria).
- Página pública `/metodologia` com fórmulas, população de comparação e limites.

#### Épico P0.7 — Origem e curadoria do banco

```
questions: + source enum(oficial, autoral, ia), + status enum(rascunho, em_revisao, aprovada, arquivada),
           + created_by, + reviewed_by, + reviewed_at, + review_notes, + banca_original, + licenca
question_reviews (question_id, reviewer_id, decisao, comentario, criado_em)   -- trilha editorial
```
- Nada com `source = ia` e `status ≠ aprovada` entra em simulado/diagnóstico.
- Tela admin "Fila de revisão" para os médicos parceiros aprovarem/rejeitarem (eles são o recurso de curadoria).
- Ajustar `scripts/import-questions.mjs` para exigir `source` e `versão`.

#### Épico P0.8 — Higiene de engenharia (paralelo)

- Adotar Supabase CLI migrations (`supabase/migrations/*`), consolidando os 11 SQL.
- Remover fallback silencioso para `mock-data.ts` em produção (falhar visivelmente em dev; página vazia com mensagem em prod).
- Testes mínimos: cálculo de nota, export reconciliado, RLS por instituição.
- Persistir cronograma em tabela `study_blocks` (resolve 2.6 e habilita "adesão ao cronograma" para P1).

---

### FASE P1 — Autoria e planejamento · ~4 semanas

- **Filtro hierárquico e cotas**: seleção por área → tema → competência; cotas por área ao montar prova (usa P0.1).
- **Cesta de prova / caderno**: montar `assessment` a partir da cesta; gerar caderno PDF + folha de respostas + gabarito separado (T06). PDF via `@react-pdf/renderer` ou Puppeteer na Vercel — stack atual.
- **Importação/exportação de itens**: JSON/CSV com imagens e fórmulas (Supabase Storage para imagens; LaTeX/KaTeX para fórmulas) sem perda (T05).
- **Busca melhorada**: Postgres FTS (`tsvector` em português + `unaccent`) + filtro por `tema_principal_id` + tabela de sinônimos. Separar "buscar texto" de "filtrar por tema" na UI. Opcional: `pgvector` (extensão nativa do Supabase) para busca semântica.
- **Plano anual/mensal/semanal**: cronograma em banco, derivado de disponibilidade + data-alvo; cabeçalho, progresso e distribuição saem da **mesma** query (fecha 2.6). Replanejamento após atraso (T07). Cada tarefa vinculada a `assessment`, aula ou lista de itens específica (fecha "tarefas levam a módulos gerais").
- **Intervenção acionável (institucional)**: coordenador cria `intervention_plans (cohort_id, area/tema, ações, prazo)`; alunos recebem tarefas; sistema mede adesão e compara pré/pós.

---

### FASE P2 — Melhoria contínua e psicometria · contínuo

Com `attempt_answers` populado por pelo menos uma aplicação real:
- **Teoria Clássica dos Testes** direto em SQL/views: dificuldade (p), discriminação (correlação ponto-bisserial), análise de distratores (% por alternativa por grupo alto/baixo), **KR-20** por aplicação. Tudo reproduzível a partir do export (T04).
- **Validação da predição**: só depois do ENAMED com resultado real dos alunos (calibração, erro de previsão, intervalo). Até lá, o índice é descritivo.
- **Acompanhamento longitudinal** por turma/aluno: evolução entre aplicações comparáveis, reteste.
- **Preceptor IA ancorado**: RAG com `pgvector` sobre apostilas MedPleni + diretrizes revisadas; taxonomia de erros de resposta; conjunto de testes revisado pelos médicos parceiros antes de cada troca de modelo.
- **Flashcards**: gerados a partir dos erros do aluno (attempt_answers) e vinculados a tema/competência, revisados.

---

## 4. Recursos: o que a stack atual cobre × o que é externo

| Necessidade | Já cobre com a stack atual? | Recurso externo (se algum) |
|---|---|---|
| Taxonomia, tentativas, coorte, RLS multi-tenant | **Sim** — Postgres/Supabase | — |
| Export CSV/XLSX auditável | **Sim** — view + route handler | — |
| Modo revisão separado | **Sim** — Next.js | — |
| Busca por tema + FTS em português | **Sim** — Postgres `tsvector`, `unaccent`, `pg_trgm` | Opcional: Typesense/Meilisearch se o acervo passar de dezenas de milhares |
| Busca semântica | **Sim** — `pgvector` (nativo Supabase) + embeddings via OpenRouter/OpenAI | Custo de embeddings (baixo) |
| Psicometria TCT (p, discriminação, distratores, KR-20) | **Sim** — SQL puro / TypeScript | — |
| TRI (Teoria de Resposta ao Item) | Não nativamente | Serviço Python (`mirt`/`girth`/`py-irt`) em Supabase Edge Function ou Railway; só faz sentido com milhares de respostas |
| Geração de caderno PDF | **Sim** — `@react-pdf/renderer` ou Puppeteer | — |
| Imagens em questões | **Sim** — Supabase Storage | — |
| Fórmulas | **Sim** — KaTeX | — |
| IA ancorada (RAG) | **Sim** — pgvector + OpenRouter | — |
| Matriz de Referência ENAMED oficial (7/15/7/6/21) | Documento público INEP | **Necessário obter o texto oficial** para carregar como seed (não inventar) |
| Curadoria editorial das questões e do Preceptor IA | Não é software | **Os dois médicos parceiros** — é o recurso humano mais valioso do plano |
| Turma piloto e avaliação comum | Não é software | Instituição parceira via os médicos |
| Migrations, CI, testes | **Sim** — Supabase CLI, GitHub Actions, Vitest/Playwright | — |
| Pagamento institucional (B2B faturado) | Iugu já integrado | Contrato/nota manual no piloto |

Conclusão: **toda a fase P0 e quase toda a P1 se resolvem dentro do Supabase + Next.js já contratados.** Os únicos itens "de fora" são conteúdo (Matriz oficial), pessoas (curadoria médica, turma piloto) e, lá na P2, um eventual microsserviço Python para TRI.

---

## 5. Ordem de execução sugerida (para começar agora)

**Sprint 0 (esta semana) — hotfixes sem migração:**
1. Corrigir colunas do `upsert` em `finishSimulation` (resultados passam a gravar).
2. "Revisar Erros" → rota de leitura sem cronômetro (versão mínima lendo o `resultSummary`/últimas respostas).
3. Remover números fixos do dashboard/predição e rotular projeção como ilustrativa.
4. Salvar respostas item a item do simulado em `user_answers` com `context_type = simulation` (ponte até `attempt_answers` existir).
5. Corrigir "5 grandes áreas" no texto de planos.

**Sprints 1–2 — P0.1 + P0.2:** taxonomia canônica, migrations versionadas, modelo de tentativa, caderno fixo, simulado personalizado gravando seleção, diagnóstico com questões reais.

**Sprint 3 — P0.3 + P0.7:** revisão definitiva com histórico de tentativas; origem/status/curadoria das questões; fila de revisão para os médicos.

**Sprints 4–5 — P0.4 + P0.5 + P0.6:** camada institucional, RLS, painel do coordenador mínimo, exportação reconciliada, página de metodologia.

**Marco: piloto institucional** — 1 turma, 1 avaliação comum, reconciliação 100 %, documentação do ciclo localizar → intervir → verificar. Só depois P1.

---

## 6. Decisões que precisam do Mario / dos médicos

1. **Matriz ENAMED oficial**: quem fornece o texto exato dos 15 competências / 6 contextos / 21 conteúdos para o seed? (Os médicos provavelmente têm.)
2. **Saúde Mental e MFC**: reclassificação do acervo atual será manual (médicos) ou assistida por IA + aprovação humana?
3. **O que fazer com a predição hoje**: esconder até validar, ou manter como "índice interno" com metodologia publicada? Recomendação: índice interno com fórmula publicada; probabilidade e ranking fora do ar.
4. **Piloto**: qual instituição/turma, e qual avaliação comum (simulado MedPleni ou prova própria da instituição importada)?
5. **Modelo comercial B2B no piloto**: gratuito em troca de dados/caso, ou pago?
6. **Papéis dos médicos na plataforma**: criar perfil `revisor` com acesso à fila de curadoria e ao painel institucional do piloto?

---

## 7. Checklist de aceite (do relatório) mapeado para o plano

| Teste | Fase/Épico que o resolve |
|---|---|
| T01 — 7 áreas e temas com cotas | P0.1 + P1 cotas |
| T02 — Aplicação por turma, presenças/ausências | P0.4 |
| T03 — Exportação reconciliada 100 % | P0.2 + P0.5 |
| T04 — Psicometria reproduzível | P2 (depende de T03) |
| T05 — Portabilidade de itens com imagens/fórmulas | P1 |
| T06 — Caderno + folha + gabarito separado | P1 |
| T07 — Plano até a prova com replanejamento | P0.8 (persistência) + P1 |
