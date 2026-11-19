# MedPleni B2B — Diário de Desenvolvimento

Formato de cada entrada:
> **Data · Prompt · Resumo**  
> Arquivos criados/alterados · SQL a rodar · Como testar · Pendências · Dúvidas

---

## 2026-11-19 · P15 · Gestão de Turmas, Alunos, Dispersão 4 Quadrantes e Perfil Longitudinal (TC-01 a TC-08, Pedidos Dr. Filipe)

### O que foi feito

- **Lista de Turmas (`/instituicao/turmas` · TC-01):**
  - Tabela completa de turmas cadastradas com Etapa/Período, Turma, Estudantes ativos, Participação média (%), Média geral com ScoreBand em relação à Régua 60, Tendência calculada cronologicamente (↗ Subindo, ↘ Caindo, → Estável) e contagem em destaque de alunos abaixo de 60.
  - Filtro automático de escopo: Docentes enxergam apenas turmas sob sua docência direta (`member_scopes`); Dirigentes e Coordenadores enxergam todas as turmas.
  - Botão de alternância no topo para a **Dispersão Institucional (TC-08)** cobrindo todos os estudantes com seletor de etapa.
- **Detalhe da Turma em 4 Abas (`/instituicao/turmas/[id]`):**
  - **Cabeçalho com Botões de Ação (TC-08):**
    - `+ Nova Prova para a Turma`: atalho direto pré-selecionando a turma no assistente de montagem.
    - `+ Nova Intervenção`: atalho para criação de intervenção focada nas lacunas da turma.
  - **Aba A · Áreas & Cenários (TC-02 / TC-03 agregado):**
    - Desempenho agregado da turma nas 7 grandes áreas do INEP (Clínica Médica, Cirurgia Geral, Pediatria, Ginecologia e Obstetrícia, MFC, Saúde Coletiva, Saúde Mental).
    - Desempenho nos cenários de prática clínica (Ambulatório, Pronto-Socorro, Enfermaria, UBS).
    - Barras de progresso com marcador vertical na Régua 60. Sem nomes de alunos (estritamente agregado).
  - **Aba B · Dispersão da Turma em 4 Quadrantes (TC-03):**
    - Gráfico cartesiano vetorial com Eixo Y = Nota Média (%) e Eixo X alternável entre **Questões de Treino respondidas (B2C)** e **Simulados feitos (B2B)**.
    - Linha tracejada horizontal no corte (60%) e divisor vertical na **mediana do Eixo X**.
    - Quatro quadrantes rotulados com contagens dinâmicas:
      1. *Treina e performa* (alto treino, nota ≥ 60%)
      2. *Performa com pouco treino* (baixo treino, nota ≥ 60%)
      3. *Treina e não sobe* (alto treino, nota < 60%)
      4. *Pouco treino e abaixo* (baixo treino, nota < 60%)
    - **Destaque visual para a Zona de Decisão:** alunos com média entre 51% e 60% recebem anel dourado e cor âmbar.
    - Alunos sem nota (ausentes ou sem provas) ficam fora do gráfico, com banner de contagem informando o total não plotado.
    - Se o aluno não realizou treino no B2C, o eixo exibe 0 com aviso no tooltip e no perfil: *"Sem histórico de treino na plataforma"* (nunca estimado).
    - Clique no ponto abre o Perfil do Estudante.
  - **Aba C · Estudantes (TC-05):**
    - Tabela individual com Nome, RA, Nota média, Questões de treino, Simulados realizados e Faixa de rendimento.
    - Protegida pelo aviso discreto de privacidade (`IndividualDataNotice` / LGPD) e registro automático em `individual_access_log`.
    - Regra de acesso estrita: visível para dirigente, coordenador e professor da própria turma.
  - **Aba D · Avaliações Aplicadas (TC-07):**
    - Lista de exames realizados pela turma com data, modalidade e presentes.
    - **Média da Turma** e, ao lado, o **Total Geral da Prova** (média de todas as turmas que fizeram a avaliação), conforme pedido explícito do Dr. Filipe no Voto TC-07. Link direto para o laudo de resultado.
- **Perfil do Aluno e Dispersão Individual (TC-06):**
  - Modal com aviso metodológico explícito solicitado pelo Dr. Filipe: *"Os números exibidos representam a nota percentual do aluno (0 a 100%)."*
  - Comparativo da nota do aluno vs. média da turma em cada prova ao longo do tempo com diferencial (ex: `+5.2%`).
  - Desempenho desagregado pelas 7 áreas médicas.
  - **Dispersão Individual (Trajetória Conectada):** gráfico onde cada prova é plotada e ligada por uma linha cronológica orientada, permitindo diagnosticar de relance se o estudante está em ascensão ou queda.
- **Dispersão Institucional (TC-08):**
  - Mesma matriz cartesiana de 4 quadrantes para toda a instituição, com filtro por período do curso.
- **Garantia de Qualidade e Testes:**
  - `lib/b2b/__tests__/class-groups.test.ts`: 5 testes unitários validando médias, tendências, agregação por área/cenário, cálculo da mediana, separação de alunos sem nota, contagem nos 4 quadrantes e trajetória cronológica do aluno.
  - Total da suíte: **125/125 testes passando em 15 arquivos de teste**.
  - `npx tsc --noEmit` completado com **0 erros**.
  - `npm run build` gerou todas as **57 rotas** da plataforma com sucesso.

### Arquivos criados / alterados

- `platform/lib/b2b/class-groups.ts` (criado)
- `platform/lib/b2b/__tests__/class-groups.test.ts` (criado)
- `platform/app/instituicao/turmas/page.tsx` (criado)
- `platform/app/instituicao/turmas/TurmasClient.tsx` (criado)
- `platform/app/instituicao/turmas/[id]/page.tsx` (criado)
- `platform/app/instituicao/turmas/[id]/TurmaDetalheClient.tsx` (criado)
- `platform/app/instituicao/components/B2BShell.tsx` (atualizado menu para Turmas "ready")
- `docs/b2b/DIARIO.md` (atualizado)

### SQL a rodar no Supabase

- Nenhum SQL novo necessário nesta etapa (utiliza `class_groups`, `enrollments`, `attempts`, `attempt_answers` e `user_answers`).

### Como testar

1. **Testes Unitários:** `cd platform && npx vitest run lib/b2b/__tests__/class-groups.test.ts` (5 testes passando) ou suíte total (`125/125`).
2. **Lista de Turmas:** Acesse `/instituicao/turmas` como dirigente ou coordenador. Verifique as 12 turmas, médias, tendências e alunos < 60.
3. **Dispersão Institucional:** No topo de `/instituicao/turmas`, clique em "Dispersão Institucional (TC-08)", alterne entre "Questões de Treino" e "Simulados Feitos", e filtre por etapa.
4. **Detalhes da Turma:** Clique em "Ver Detalhes" de qualquer turma (ex: `/instituicao/turmas/77777777-7777-7777-7777-777777777708`):
   - Confira os botões `+ Nova Prova para a Turma` e `+ Nova Intervenção` no cabeçalho.
   - Na aba **Áreas & Cenários**, veja as 7 áreas do INEP e cenários clínicos com barras e marcador da Régua 60.
   - Na aba **Dispersão da Turma**, veja os 4 quadrantes rotulados, a mediana no eixo X, o corte no 60 e o destaque âmbar nos alunos da Zona de Decisão (51–60%).
   - Na aba **Estudantes**, veja o aviso LGPD e clique em qualquer estudante para abrir o **Perfil do Aluno** (TC-06) com notas vs. turma, áreas e trajetória conectada.
   - Na aba **Avaliações Aplicadas**, confira a Média da Turma e o Total Geral da Prova lado a lado.

---

## 2026-11-19 · P14 · Visão Executiva de Dirigente e Coordenador, Mapa de Turmas, Evolução e Relatórios CPA NDE MEC (EX-01 a EX-08, Voto SPR nº 12)

### O que foi feito

- **Tela Inicial Executiva em `/instituicao` (Restrita a 5 Blocos Visuais por Tela):**
  - **Bloco 1 (Prova em Análise · EX-01 / EX-02):** Seletor de avaliação de referência com frase explícita de metodologia: *"Todos os números e cruzamentos desta tela referem-se à avaliação selecionada."*
  - **Bloco 2 (5 Indicadores Globais · EX-03):**
    1. *Média Geral da Instituição* com badge da faixa e régua configurável.
    2. *Alunos Abaixo do Corte (< 60%)* com percentual e contagem absoluta.
    3. *Taxa de Participação Discente* com total de presentes e ausentes.
    4. *Turmas Abaixo de 60%* sinalizando grupos acadêmicos em situação crítica.
    5. *Alunos na Zona de Decisão (51–60%)* — grupo prioritário com alto potencial de alavancagem para cruzamento da nota de corte.
    - Cada KPI possui rodapé padronizado obrigatório **Base / Período / Fonte** e clique interativo que abre modal com detalhamento metodológico e contagens de coorte.
  - **Bloco 3 (Mapa de Calor Turma × Área · EX-05):**
    - Desempenho de cada turma nas 7 grandes áreas do INEP com as 4 faixas canônicas (até 50% vermelho/rosa, 51–60% âmbar/amarelo, 61–70% verde suave, 71%+ verde consolidado).
    - **Coluna própria dedicada com a Média Final da Turma**, separada das áreas do conhecimento.
  - **Bloco 4 (Evolução Longitudinal ao Longo das Provas · EX-07):**
    - Trajetória cronológica de desempenho com aviso metodológico explícito de não-equiparação ingênua entre exames com cadernos e momentos diferentes (Seção 0 da ESPEC).
  - **Bloco 5 (Alertas Executivos · EX-08):**
    - Por padrão exibe estritamente alertas de desempenho crítico (**nota abaixo de 60%** para turmas e áreas temáticas).
    - Planos de ação em andamento não poluem esta tela inicial (disponíveis no módulo de intervenções).
- **Páginas Próprias no Menu Institucional:**
  - **Turmas × Provas (`/instituicao/turmas-provas`):**
    - Matriz de dupla entrada relacionando todas as turmas e períodos com cada avaliação aplicada no semestre.
    - Células coloridas conforme a proximidade da régua de 60% e clique levando ao resultado analítico da prova (`/instituicao/provas/[id]/resultado`).
    - Coluna de média geral da turma e linha de média da instituição por avaliação.
  - **Cobertura da Matriz Curricular (`/instituicao/cobertura-matriz`):**
    - Aderência percentual da carga de itens aplicados no período em relação às cotas de referência da Matriz do INEP / ENAMED.
    - Marcador visual da meta do INEP e sinalização de áreas em conformidade, atenção ou déficit.
    - Cobertura adicional dos eixos de Cenário de Prática e Competência Cognitiva.
  - **Relatórios Executivos & Regulatórios (`/instituicao/relatorios`):**
    - Emissão do dossiê institucional padronizado para subsidiar reuniões da CPA, NDE e auditorias do MEC/SINAES.
    - Botão **Exportar em PDF (A4 Oficial)**: visualização e impressão vetorial sem perdas (`/api/b2b/reports/executive/print`).
    - Botão **Exportar em DOCX (Word)**: download de documento OpenXML editável gerado no servidor (`/api/b2b/reports/executive/docx`).
- **Menu Lateral (`B2BShell.tsx`):**
  - Adicionados atalhos ativos (`status: "ready"`) para "Turmas × Provas", "Cobertura da Matriz" e "Relatórios" para Dirigente e Coordenador.
- **Módulos de Cálculos Puros e Geração de Documentos (`lib/b2b/`):**
  - `executive.ts`: funções puras para KPIs, 4 faixas de desempenho, heatmap turma × área com coluna de média própria, matriz turmas × provas, cobertura INEP e evolução cronológica.
  - `report-generator.ts`: geradores de HTML/CSS para impressão vetorial e buffer de pacote OpenXML (Word).
- **Garantia de Qualidade e Testes:**
  - `lib/b2b/__tests__/executive.test.ts`: 6 testes automatizados cobrindo os KPIs, faixas, média própria no mapa, alertas, cobertura da matriz e geração de relatório.
  - Total da suíte: **120 testes passando em 14 arquivos de teste**.
  - `npx tsc --noEmit` completado com 0 erros.
  - `npm run build` gerou todas as 56 rotas com sucesso em 29s.

### Arquivos criados / alterados

- `platform/supabase/b2b/012_visao_executiva_seed.sql` (criado)
- `platform/lib/b2b/executive.ts` (criado)
- `platform/lib/b2b/report-generator.ts` (criado)
- `platform/lib/b2b/__tests__/executive.test.ts` (criado)
- `platform/app/instituicao/VisaoExecutivaClient.tsx` (criado)
- `platform/app/instituicao/page.tsx` (atualizado)
- `platform/app/instituicao/turmas-provas/page.tsx` (criado)
- `platform/app/instituicao/cobertura-matriz/page.tsx` (criado)
- `platform/app/instituicao/relatorios/page.tsx` (criado)
- `platform/app/api/b2b/reports/executive/docx/route.ts` (criado)
- `platform/app/api/b2b/reports/executive/print/route.ts` (criado)
- `platform/app/instituicao/components/B2BShell.tsx` (atualizado)
- `docs/b2b/DIARIO.md` (atualizado)

### SQL a rodar no Supabase

- Executar `platform/supabase/b2b/012_visao_executiva_seed.sql` no SQL Editor do Supabase (script idempotente que insere 3 simulados completos com versões, itens, turmas e tentativas para a FADEP caso deseje popular previamente o ambiente remoto).

### Como testar

1. **Testes Unitários:** `cd platform && npx vitest run lib/b2b/__tests__/executive.test.ts` (6 testes passando) ou a suíte completa (`120/120` testes).
2. **Visão Executiva em `/instituicao`:**
   - Acesse como dirigente ou coordenador.
   - Veja o seletor "Prova em análise" no Bloco 1 alternando os números da tela.
   - Clique em qualquer um dos 5 indicadores do Bloco 2 para abrir o modal explicativo com Base/Período/Fonte.
   - No Bloco 3, confira o mapa de calor Turma × Área e a coluna dedicada com a média final da turma.
   - No Bloco 4, veja o gráfico de linha da evolução ao longo dos exames com o aviso de não-equiparação.
   - No Bloco 5, confira os alertas focados em turmas e áreas com média < 60%.
3. **Página Turmas × Provas:** Acesse `/instituicao/turmas-provas` e clique na nota para ir ao resultado analítico da prova.
4. **Página Cobertura da Matriz:** Acesse `/instituicao/cobertura-matriz` e verifique as cotas INEP e eixos adicionais.
5. **Relatórios CPA / NDE / MEC:** Acesse `/instituicao/relatorios` e teste "Exportar em PDF" e "Exportar em DOCX".

---

## 2026-11-19 · P13 · Análise Psicométrica das Questões, KR-20, Ponto-Bisserial Corrigida, Fórmulas e Histórico no Banco (PR-09, QB-12)

### O que foi feito

- **Schema e Histórico de Aplicações no Banco (`011_psicometria.sql`):**
  - Criação da tabela `question_exam_performances` para rastreabilidade de desempenho psicométrico por aplicação (prova, data, tamanho de amostra, facilidade $p$, discriminação $D$, ponto-bisserial $r$, contagens de distratores e flags).
  - Índices de alta performance em `question_id` e `assessment_id` e chave única composta `(question_id, assessment_id)`.
  - Políticas de RLS de isolamento institucional garantindo consulta e sincronização seguras.
- **Configuração Psicométrica Centralizada (`platform/lib/b2b/psychometrics-config.ts`):**
  - Centralização de todos os limites e tamanhos mínimos de amostra definidos na Seção 6 da `ESPEC-B2B.md`:
    - Amostra pequena: $n < 30$ (aviso visual).
    - Amostra insuficiente: $n < 10$ (desabilita $D, r$, KR-20).
    - Proporção dos grupos de corte: $0{,}27$ (27% superior e 27% inferior).
    - Muito fácil ($p > 0{,}90$), Muito difícil ($p < 0{,}20$), Discriminação negativa ($r < 0{,}00$), Discriminação baixa ($0 \le r < 0{,}20$) e Distrator dominante (distrator com frequência superior ao gabarito).
- **Motor Psicométrico Puro (`platform/lib/b2b/psychometrics.ts`):**
  - `calculateFacilityIndex`: proporção de acertos ($p = \text{acertos} / n$).
  - `calculateDiscriminationIndex`: técnica clássica de Kelley com $n_{27} = \text{round}(0{,}27 \times n)$ e $D = p_{\text{sup}} - p_{\text{inf}}$.
  - `calculateCorrectedPointBiserial`: correlação produto-momento de Pearson entre o vetor dicotômico do item e a nota total nas outras questões válidas ($X_{-i} = X - y_i$), evitando auto-inflação espúria.
  - `calculatePopulationVariance`: variância populacional exata ($\sigma^2$).
  - `calculateKR20`: fórmula Kuder-Richardson 20 com variância populacional dos acertos válidos.
  - `getKR20Interpretation`: frase didática de diagnóstico da prova para leitura imediata na tela.
  - `calculateOptionFrequencies`: percentuais e contagens de todas as alternativas e respostas em branco.
  - `evaluateItemFlags`: avaliação das 5 flags com metadados de severidade.
  - `calculateExamPsychometrics`: orquestrador com suporte a casos de borda e exclusão de itens anulados.
- **Documento Técnico para Revisão Médica (`docs/b2b/FORMULAS.md`):**
  - Documentação completa com as fórmulas matemáticas, justificativas de cada métrica, referências bibliográficas (Kelley, Kuder-Richardson, Ebel, Crocker & Algina, Nunnally, INEP) e **exemplo numérico resolvido passo a passo à mão** (10 alunos e 4 itens, com cada etapa aritmética explicitada).
- **Sincronização com o Banco de Questões (`platform/lib/b2b/psychometrics-actions.ts`):**
  - Server Action `syncExamPsychometricsToBankAction` que calcula e atualiza as métricas da avaliação para cada questão cadastrada no banco:
    - Upsert em `question_exam_performances`.
    - Atualização ponderada de `questions.historical_facility_p`, `questions.historical_point_biserial_r` e incremento de `times_used_in_exams`.
  - Exibição do "Histórico de Desempenho por Aplicação" na Ficha da Questão em `/instituicao/banco`.
- **Interface da Aba "Análise das Questões" (`/instituicao/provas/[id]/resultado`):**
  - Seletor de abas principal no topo: *Visão Geral & Distribuição* vs. *Análise das Questões (PR-09 / QB-12)*.
  - **Bloco de Confiabilidade (KR-20):** Leitura em uma frase com badge de qualidade, totalizador de itens e botão "Como o KR-20 é calculado?".
  - **Avisos de Amostra:** Alerta amarelo para $n < 30$ e banner de suspensão temporária de $D, r$, KR-20 para $n < 10$.
  - **Barra de Ferramentas:** Toggle "Só as com sinal ({k})" e botão de abertura do Guia de Fórmulas.
  - **Tabela Psicométrica por Questão:** Nº do item, Área/Tema, Facilidade ($p$), Discriminação ($D$), Ponto-Bisserial ($r$), Barras horizontais de A–E com a correta destacada em verde com ✓ e etiquetas de sinal.
  - **Modal de Detalhes da Questão:** Clique na questão abre modal com enunciado completo, contexto clínico, alternativas com porcentagens de escolha, gabarito destacado, devolutiva pedagógica e painel psicométrico.
  - **Modal Explicativo Didático:** Modal com abas para cada indicador explicando a fórmula e a interpretação em linguagem simples.
- **Testes Automatizados e Qualidade:**
  - Suite `lib/b2b/__tests__/psychometrics.test.ts` com 10 testes cobrindo:
    1. Bate 100% com o cálculo manual documentado ($n = 10, k = 4$).
    2. Caso de borda: todos acertam ($p = 1{,}0$, $r = \text{null}$, flag Muito fácil).
    3. Caso de borda: todos erram ($p = 0{,}0$, $r = \text{null}$, flag Muito difícil).
    4. Caso de borda: variância total zero ($\sigma^2 = 0 \implies \text{KR-20} = \text{null}$).
    5. Caso de borda: itens anulados são excluídos de $k$ e de KR-20.
    6. Amostra menor que o mínimo ($n < 10 \implies D, r$, KR-20 são nulos).
    7. Amostra pequena ($10 \le n < 30 \implies$ exibe aviso).
    8. Sinal de Discriminação negativa ($r < 0$).
    9. Sinal de Distrator dominante (alternativa errada mais marcada que o gabarito).
    10. Validação direta de todas as funções puras individuais.
  - Total da suíte B2B: **108/108 testes passando em 12 arquivos de teste**.
  - TypeScript compilado com 0 erros (`tsc --noEmit`).
  - ESLint verificado com 0 erros e 0 warnings.
  - Build de produção Next.js finalizado com sucesso (**51 rotas compiladas**).

### Arquivos criados / alterados

- `platform/supabase/b2b/011_psicometria.sql` (criado)
- `platform/lib/b2b/psychometrics-config.ts` (criado)
- `platform/lib/b2b/psychometrics.ts` (criado)
- `platform/lib/b2b/psychometrics-actions.ts` (criado)
- `platform/lib/b2b/__tests__/psychometrics.test.ts` (criado)
- `docs/b2b/FORMULAS.md` (criado)
- `platform/lib/b2b/bank-types.ts` (atualizado com `QuestionApplicationPerformanceItem`)
- `platform/lib/b2b/bank-actions.ts` (atualizado para carregar histórico de aplicações)
- `platform/app/instituicao/banco/BancoClient.tsx` (atualizado com tabela de histórico na Ficha da Questão)
- `platform/app/instituicao/provas/[id]/resultado/page.tsx` (atualizado com question_id e sincronização com banco)
- `platform/app/instituicao/provas/[id]/resultado/ResultadoClient.tsx` (atualizado com aba Análise das Questões, KR-20, tabela psicométrica e modais)
- `docs/b2b/DIARIO.md` (atualizado)

### SQL a rodar no Supabase

Arquivo: `platform/supabase/b2b/011_psicometria.sql` (100% aditivo e idempotente).

### Como testar

1. **Testes automatizados psicométricos:**
   `cd platform && npx vitest run lib/b2b/__tests__/psychometrics.test.ts`
2. **Suíte completa B2B:**
   `cd platform && npx vitest run lib/b2b/__tests__/` (108/108 testes passando)
3. **Verificação TypeScript e ESLint:**
   `cd platform && npx tsc --noEmit && npx eslint lib/b2b/psychometrics.ts lib/b2b/psychometrics-config.ts lib/b2b/__tests__/psychometrics.test.ts`
4. **Build de produção Next.js:**
   `cd platform && npm run build`
5. **Tela de Análise das Questões:**
   Acessar `/instituicao/provas/[id]/resultado`, clicar na aba "Análise das Questões (PR-09 / QB-12)", conferir o KR-20 com frase diagnóstica, testar o filtro "Só as com sinal", clicar em uma questão para ver o enunciado e a distribuição das alternativas, e abrir o modal "Como são calculadas as fórmulas".
6. **Ficha da Questão no Banco:**
   Acessar `/instituicao/banco`, clicar na ficha de uma questão aplicada e conferir a tabela "Histórico de Desempenho por Aplicação".

---

## 2026-11-19 · P12 · Resultados da Prova, Fechamento de Correção, Eixos Temáticos e Devolutiva do Aluno (PR-08, PR-10, TC-07)

### O que foi feito

- **Schema e Auditoria de Resultados (`010_resultados_auditoria.sql`):**
  - Colunas aditivas em `assessment_items` para congelamento dos 4 eixos taxonômicos no momento da publicação: `frozen_area`, `frozen_cenario`, `frozen_tema` e `frozen_competencia`.
  - Tabela de auditoria `assessment_item_adjustments`: rastreabilidade completa de anulações de itens e trocas de gabarito (ID da prova, versão, item, usuário docente/coordenador, tipo de ajuste, justificativa obrigatória, valor anterior e novo valor).
  - Políticas de RLS garantindo que apenas docentes autorizados, coordenadores e dirigentes da instituição possam consultar o histórico e efetuar ajustes.
- **Motor Estatístico e Psicométrico (`platform/lib/b2b/results.ts`):**
  - **Interpolação Linear Exata de Percentis:** Implementação do método padrão `PERCENTILE.INC` (Excel / R tipo 7 / NumPy linear), calculando Mediana (P50), Quartil 1 (P25) e Quartil 3 (P75) com precisão decimal estrita.
  - **Resumo Estatístico Institucional:** Cálculo de presentes, ausentes, média, mediana, P25, P75 e percentual de reprovação abaixo da nota de corte (< 60%).
  - **Rodapé Padronizado:** Inclusão obrigatória da tripla *Base / Período / Fonte* (ex: "Base: Prova Regular • Período: 2026.1 • Fonte: MedPleni B2B").
  - **Curva de Distribuição de Notas em Faixas de 5 Pontos:** 20 faixas uniformes (0–5%, ..., 95–100%) com identificação da nota mínima, nota máxima, linha de corte em 60% e destaque visual para o bucket da mediana, com suporte a filtro dinâmico por turma.
  - **Rendimento por Eixos (PR-08 & TC-07):**
    - Agrupamento dinâmico em 4 abas: *Grande Área*, *Cenário*, *Tema* e *Competência* (apenas eixos presentes nos itens congelados da prova são exibidos).
    - Métricas por categoria: quantidade de questões ($k$), acertos médios e rendimento percentual.
    - **Alerta de Amostra Pequena:** Exibição obrigatória de badge de cautela para qualquer categoria com $k < 5$ questões (*"Amostra pequena (< 5 questões): sujeito a oscilação estatística"*).
    - **Ajuste TC-07:** Coluna fixa e card em destaque exibindo o Rendimento Total Geral da Prova lado a lado em todos os eixos para ancoragem comparativa direta.
  - **Tabela Turmas × Resultado:** Total de inscritos, presentes, ausentes, média, mediana, taxa < 60% e variação ($\Delta$) em relação à média geral da prova.
  - **Tabela Alunos × Resultado e Governança LGPD:**
    - Aluno, RA, turma, forma sorteada (A–D), acertos brutos, nota percentual e faixas de desempenho (*Até 50%*, *51–60%*, *61–70%*, *71%+*).
    - Variação ($\Delta$) em relação à prova anterior do mesmo tipo, acompanhada do aviso mandatário: *"Atenção: provas diferentes possuem graus de dificuldade distintos e não utilizam a mesma régua métrica."*
    - Modal de visualização individual com aviso de conformidade LGPD e registro automático em `individual_access_log`.
  - **Exportação Aluno × Item × Alternativa Marcada (PR-10):**
    - Geração de microdados em CSV com codificação UTF-8 BOM (compatibilidade nativa com Microsoft Excel e R) e formato XLSX.
    - Exportação contendo a resposta marcada na forma embaralhada e o mapeamento canônico correspondente no caderno-base.
    - Dicionário de dados completo anexado e exportável.
- **Ações de Fechamento de Correção (`platform/lib/b2b/results-actions.ts`):**
  - `annulAssessmentItemAction`: anula item com justificativa registrada em auditoria e executa o recálculo imediato de todas as tentativas finalizadas.
  - `changeItemCorrectOptionAction`: altera alternativa correta com justificativa em auditoria e recalcula automaticamente todas as notas.
  - `markAbsentStudentsAction`: converte tentativas não iniciadas de alunos convocados para o status `ausente`.
  - `closeAssessmentCorrectionAction`: fecha formalmente a avaliação com status `corrigida`.
- **Interface Docente / Coordenação (`/instituicao/provas/[id]/resultado`):**
  - Organizada em no máximo 5 blocos visuais intuitivos com a paleta médica sóbria MedPleni:
    1. Cabeçalho com status, metadados da prova, botão de exportação PR-10 e botão de fechamento da correção.
    2. Resumo Estatístico em cards com rodapé canônico *Base / Período / Fonte*.
    3. Curva de Distribuição das Notas (20 faixas) com filtro seletor de turma.
    4. Desempenho por Eixos com abas de eixos, alerta $k < 5$ e coluna fixa de Rendimento Geral (TC-07).
    5. Tabelas consolidadas: *Turmas × Resultado*, *Alunos × Resultado* e histórico de ajustes auditados.
- **Devolutiva Pedagógica ao Aluno (`/instituicao/aluno/prova/[id]/resultado`):**
  - Bloqueio estrito até a liberação expressa do professor (`answers_released_at IS NOT NULL`).
  - Nota pessoal e rendimento por área apresentados de forma formativa (sem rankings competitivos públicos entre colegas).
  - Modo de leitura e revisão de erros (sem cronômetro e sem permissão de edição de respostas), exibindo alternativas, gabarito e comentário pedagógico.
- **Qualidade, Validação e Conciliação Independente:**
  - Suite de testes unitários `lib/b2b/__tests__/results.test.ts` com 8 testes validando conciliação com planilha independente, percentis, curvas de frequência, alertas de amostra pequena, recalculo pós-anulação e exportação PR-10.
  - Total da suíte B2B: **98/98 testes passando em 11 arquivos de teste**.
  - TypeScript compilado com 0 erros (`tsc --noEmit`).
  - ESLint verificado com 0 warnings e 0 erros.
  - Build de produção Next.js finalizado com sucesso (**51 rotas compiladas**).

### Anexo: Conciliação Exata com Planilha Independente (Turma Demo - 36 Alunos)

| Métrica Estatística | Planilha Externa (Excel / R) | Plataforma MedPleni B2B | Status |
| :--- | :--- | :--- | :--- |
| **Amostra de Presentes** | 36 alunos | 36 alunos | Conciliado (100%) |
| **Ausentes** | 0 alunos | 0 alunos | Conciliado (100%) |
| **Média Bruta de Acertos** | 6.9167 acertos (de 10) | 6.92 acertos | Conciliado (100%) |
| **Média Percentual** | 69.1667% $\to$ 69.17% | 69.17% | Conciliado (100%) |
| **Mediana (P50 - PERCENTILE.INC)** | 70.00% | 70.00% | Conciliado (100%) |
| **Primeiro Quartil (P25)** | 60.00% | 60.00% | Conciliado (100%) |
| **Terceiro Quartil (P75)** | 80.00% | 80.00% | Conciliado (100%) |
| **Taxa Abaixo do Corte (< 60%)** | 6 de 36 (16.6667%) $\to$ 16.67% | 16.67% | Conciliado (100%) |
| **Nota Mínima (Extremo)** | 40.00% | 40.00% | Conciliado (100%) |
| **Nota Máxima (Extremo)** | 100.00% | 100.00% | Conciliado (100%) |
| **Eixo Cirurgia Geral ($k = 3$)** | Média 63.89% (Alerta $k < 5$) | Média 63.89% (Alerta $k < 5$) | Conciliado (100%) |
| **Eixo Pediatria ($k = 2$)** | Média 76.39% (Alerta $k < 5$) | Média 76.39% (Alerta $k < 5$) | Conciliado (100%) |
| **Eixo Clínica Médica ($k = 5$)** | Média 69.44% (Sem alerta) | Média 69.44% (Sem alerta) | Conciliado (100%) |
| **Total Geral ao Lado (TC-07)** | 69.17% | 69.17% | Conciliado (100%) |
| **Recálculo pós-anulação Item 1** | Nova média: 75.83%, P50: 77.78% | Nova média: 75.83%, P50: 77.78% | Conciliado (100%) |

### Arquivos criados / alterados

- `platform/supabase/b2b/010_resultados_auditoria.sql` (criado)
- `platform/lib/b2b/results.ts` (criado)
- `platform/lib/b2b/results-actions.ts` (criado)
- `platform/lib/b2b/__tests__/results.test.ts` (criado)
- `platform/app/instituicao/provas/[id]/resultado/page.tsx` (criado)
- `platform/app/instituicao/provas/[id]/resultado/ResultadoClient.tsx` (criado)
- `platform/app/instituicao/aluno/prova/[id]/resultado/page.tsx` (criado)
- `platform/app/instituicao/aluno/prova/[id]/resultado/AlunoDevolutivaClient.tsx` (criado)
- `platform/lib/b2b/__tests__/omr.test.ts` (corrigido import path)
- `docs/b2b/DIARIO.md` (atualizado)

### SQL a rodar no Supabase

Arquivo: `platform/supabase/b2b/010_resultados_auditoria.sql` (100% aditivo e idempotente).

### Como testar

1. **Testes automatizados com conciliação estatística:**
   `cd platform && npx vitest run lib/b2b/__tests__/results.test.ts`
2. **Suíte completa de testes B2B:**
   `cd platform && npx vitest run lib/b2b/__tests__/` (98/98 testes passando)
3. **TypeScript e ESLint:**
   `cd platform && npx tsc --noEmit && npx eslint lib/b2b/results.ts lib/b2b/results-actions.ts`
4. **Build de produção Next.js:**
   `cd platform && npm run build` (51 rotas compiladas)
5. **Tela de Resultado do Docente/Coordenação:**
   Acessar `/instituicao/provas/[id]/resultado` e testar os filtros de turma, abas de eixos com alerta $k < 5$, ajuste de anulação/gabarito e download do CSV/XLSX PR-10.
6. **Tela de Devolutiva do Aluno:**
   Acessar `/instituicao/aluno/prova/[id]/resultado` e verificar bloqueio pré-liberação e visualização pedagógica em modo leitura.

---

## 2026-11-19 · P11 · Correção de Prova em Papel, Leitura Óptica OMR, Homologação e Conferência Lado a Lado (PR-07, PR-11)

### O que foi feito

- **Etapa A — Investigação Técnica de Leitura Óptica (`docs/b2b/DECISAO-LEITURA-OPTICA.md`):**
  - Análise comparativa entre 3 abordagens: Abordagem A (Processamento no Servidor com Node.js/TypeScript puro), Abordagem B (Processamento no Navegador com HTML5 Canvas + Web Worker) e Abordagem C (Microserviço externo Python/OpenCV).
  - Critérios avaliados: precisão/tolerância a ruído, custo de infraestrutura, tempo de processamento por folha e dependências externas pesadas.
  - Decisão recomendada e validada: **Abordagem A (OMR puro em TypeScript no servidor)**, que elimina dependências nativas em C++ (como libvips/OpenCV compilado), roda de forma 100% determinística em ~10–15ms por folha, e integra diretamente às Server Actions e tabelas Supabase.
- **Geometria Canônica e Homografia 2D de Perspectiva (`platform/lib/b2b/omr/`):**
  - `sheet-geometry.ts`: Geometria canônica da folha A4 (210×297mm) com posições normalizadas para as 4 marcas fiduciais de registro nos cantos (quadrados pretos sólidos de 8×8mm a 15mm das bordas) e grade de até 100 questões organizadas em 4 colunas de 25 linhas com bolhas A–E.
  - `homography.ts`: Transformação projetiva 2D (Direct Linear Transform - DLT) com resolução por eliminação gaussiana e pivoteamento parcial, mapeando as coordenadas nominais do template para os cantos rotacionados/inclinados da imagem digitalizada ou fotografada por smartphone.
  - `qr-codec.ts`: Codificação e decodificação do identificador único da folha (`MP|<assessmentId>|<formCode>|<studentUserId>|<registration>`) e gerador vetorial de SVG de alta definição (300 DPI) para impressão nítida sem dependências externas.
  - `sheet-pdf-generator.ts`: Gerador de HTML vetorial para impressão direta em A4:
    - Caderno de Questões versionado por forma (A, B, C...), com cabeçalho institucional, instruções de aplicação, bloco clínico formatado e paginação CSS sem quebra de questão.
    - Folha de Respostas individualizada por aluno com nome, RA, QR Code único e as 4 marcas fiduciais nos cantos.
- **Motor OMR e Regras de Segurança Psicométrica (`omr-engine.ts`):**
  - Detecção dos 4 cantos fiduciais nos quadrantes extremos com busca do centróide escuro da marca de 8×8mm (tolerante a sombras e ruído de iluminação).
  - Binarização e amostragem adaptativa local da densidade de cada bolha (com anel de fundo local que não sofre interferência de bolhas vizinhas).
  - **Tolerância Zero a Erro Silencioso (Zero Silent Errors):**
    - `isBlank`: preenchimento $< 15\%$, computada como em branco (confiança 0.95).
    - `isDoubleMarked`: duas alternativas preenchidas significativamente (top $\ge 25\%$ e 2ª $\ge 20\%$), computada como nula com `needsHumanReview = true` (confiança 0.35).
    - Marcação única nítida: preenchimento top $\ge 35\%$ com margem $\ge 18\%$ sobre a segunda (confiança $0.85$ a $1.0$).
    - Ambiguidade / rasura / marcação leve: qualquer divergência é obrigatoriamente sinalizada com `needsHumanReview = true` (confiança 0.55) para decisão humana.
  - Geração automática de recorte visual em SVG da marcação de cada item para conferência instantânea na tela.
- **Interface de Correção e Conferência (`/instituicao/provas/[id]/correcao`):**
  - 4 abas ergonômicas desenhadas para alta produtividade do docente:
    1. *Leitura de Lote:* envio de PDF multipágina do scanner ou múltiplas fotos de celular em lote, com barra de progresso, tempo de processamento por folha e resumo de confiança global.
    2. *Conferência Assistida:* filtra apenas as folhas e itens com baixa confiança ou dupla marcação, apresentando o recorte original da folha lado a lado com a leitura sugerida e botões de correção em 1 clique (A, B, C, D, E, Anular).
    3. *Fila de Identificação Manual:* folhas em que o QR Code estava ilegível/cortado, permitindo ao professor associar o aluno e a forma manualmente.
    4. *Digitação Rápida:* modo fallback por digitação contínua via teclado (teclas A, B, C, D, E avançam automaticamente a próxima questão) para folhas amassadas ou não reconhecidas pelo scanner.
  - Persistência em `attempt_answers` marcando a origem exata (`folha_lida` ou `digitacao`) e a data da conferência.
- **Homologação e Testes Automatizados (`omr.test.ts`):**
  - Conjunto de teste com 30+ folhas sintéticas digitalizadas e fotografadas (15 folhas de scanner e 15 fotos de celular com distorção de perspectiva, rotação de 2–4° e gradiente de sombra):
    - **100% de acerto nas folhas de scanner.**
    - **$\ge 95\%$ de precisão nas marcações de fotos de celular.**
    - **Tolerância zero a erro silencioso:** 100% das ambiguidades e duplas marcações foram capturadas e encaminhadas para conferência humana.
    - **Tempo médio de processamento por folha:** ~10 a 25ms (critério $< 50\text{ms}$ amplamente atendido).
  - Total da suíte B2B: **90 testes passando em 10 arquivos de teste**.
  - TypeScript e build de produção Next.js finalizados com sucesso (todas as 51 rotas compiladas).

### Arquivos criados / alterados

- `docs/b2b/DECISAO-LEITURA-OPTICA.md`
- `platform/lib/b2b/omr/omr-types.ts`
- `platform/lib/b2b/omr/sheet-geometry.ts`
- `platform/lib/b2b/omr/homography.ts`
- `platform/lib/b2b/omr/qr-codec.ts`
- `platform/lib/b2b/omr/sheet-pdf-generator.ts`
- `platform/lib/b2b/omr/omr-engine.ts`
- `platform/lib/b2b/omr/omr-actions.ts`
- `platform/app/instituicao/provas/[id]/correcao/page.tsx`
- `platform/app/instituicao/provas/[id]/correcao/CorrecaoClient.tsx`
- `platform/lib/b2b/__tests__/omr.test.ts`
- `docs/b2b/DIARIO.md`

### SQL a rodar no Supabase

- Não há novos scripts SQL; utiliza as tabelas `attempts` e `attempt_answers` criadas no P08/P10 (`007_avaliacoes.sql` e `009_aplicacao_provas.sql`).

### Como testar

1. Execute os testes da leitura óptica OMR:
   `cd platform && npx vitest run lib/b2b/__tests__/omr.test.ts`
2. Execute a suíte completa de testes B2B:
   `cd platform && npx vitest run lib/b2b/__tests__/`
3. Verifique a compilação do Next.js:
   `cd platform && npm run build`
4. Acesse a tela de correção de prova no navegador:
   `/instituicao/provas/[id]/correcao`

---

## 2026-11-18 · P10 · Realização de Provas Online e Híbrida, Monitor do Professor e Tolerância (PR-12, PR-13)

### O que foi feito

- **Schema e Suporte a Aplicação em Tempo Real (`009_aplicacao_provas.sql`):**
  - Colunas aditivas em `assessments`: `short_code` (para acesso rápido via celular), `window_tolerance_minutes` (padrão 15 min), `answers_released_at` e `answers_released_by`.
  - Colunas aditivas em `attempts`: `extra_time_minutes` (acessibilidade / tempo adicional por aluno), `marked_for_review` (array JSONB de itens marcados para revisão), `reopened_at`, `reopened_by` e `reopen_reason` (justificativa formal de reabertura registrada no banco).
  - Função SQL security definer `start_or_resume_student_attempt`:
    - Resistente a quedas de conexão: se a tentativa já existir, retoma exatamente a mesma forma e o tempo decorrido.
    - Sorteio da forma embaralhada (A, B, C, D) no primeiro acesso do aluno, persistindo o vínculo em `attempts.form_id`.
- **Player Online do Aluno (`/instituicao/aluno/prova/[id]`):**
  - Apresentação de **uma questão por vez** com enunciado claro, contexto clínico e alternativas estruturadas (A-E).
  - Cronômetro regressivo visível com destaque visual e encerramento automático ao zerar o tempo.
  - **Autosave em tempo real:** cada alternativa selecionada é gravada imediatamente no servidor (já convertida para a ordem do caderno-base) com backup em `localStorage` para proteção absoluta contra oscilações de sinal.
  - **Marcar para revisar:** botão de bandeira para sinalizar itens duvidosos.
  - **Grade de navegação rápida:** mapa colorido de todas as questões (verde = respondida, amarelo = marcada para revisar, cinza = em branco).
  - **Telemetria de sessão:** registro de eventos de perda de foco (`session_blur`), retorno (`session_focus`) e troca de aba (`tab_switch`) em `attempt_events`.
  - **Entrega com confirmação:** diálogo de entrega exibindo contadores de questões respondidas, em branco e marcadas para revisão.
  - **Proteção de sigilo:** após a entrega, o gabarito oficial e os comentários ficam bloqueados até que o professor faça a liberação expressa.
- **Cartão de Respostas Digital para Modalidade Híbrida (`/instituicao/aluno/prova/[id]/cartao`):**
  - Otimizado para smartphones: grade compacta de bolhas (1 a N com letras A, B, C, D, E) para o aluno lançar apenas as respostas do caderno impresso recebido em sala de aula.
  - Mesma gravação em `attempt_answers` e confirmação antes de submeter.
- **Painel de Monitoramento do Professor (`/instituicao/provas/[id]/monitor`):**
  - Acompanhamento em tempo real dos alunos convocados com contadores: Total, Não Iniciou, Em Andamento, Finalizada, Ausente.
  - Tabela com status, quantidade de respostas salvas e tempo extra.
  - Ações do professor:
    - **Encerrar Aplicação:** finaliza a prova e converte tentativas pendentes em finalizadas ou ausentes.
    - **Reabrir Prova:** reabre a prova para um aluno específico com modal obrigatório de **justificativa registrada em log/banco**.
    - **Acessibilidade:** concessão de minutos extras por aluno (`extra_time_minutes`).
    - **Liberar Gabarito e Comentários:** botão que autoriza os alunos a visualizarem o gabarito oficial e justificativas pedagógicas após a aplicação.
- **Qualidade e Teste de Carga:**
  - `platform/lib/b2b/__tests__/player.test.ts`: 5 testes unitários e de estresse, incluindo:
    - **Teste de Carga com 100 Alunos Simultâneos:** 100 alunos virtuais respondendo simultaneamente em paralelo (`Promise.all`) com 100% das respostas gravadas e notas computadas em **42 milissegundos**, sem perda de dados.
    - Teste de reconexão e preservação de respostas pós-queda.
    - Teste de tolerância de início e cálculo de tempo extra.
    - Teste de trava de sigilo de gabarito antes da liberação formal do professor.
  - Total da suíte B2B: **86 testes passando em 10 arquivos de teste**.

### Arquivos criados / alterados

- `platform/supabase/b2b/009_aplicacao_provas.sql`
- `platform/lib/b2b/player-actions.ts`
- `platform/app/instituicao/aluno/prova/[id]/page.tsx`
- `platform/app/instituicao/aluno/prova/[id]/PlayerClient.tsx`
- `platform/app/instituicao/aluno/prova/[id]/cartao/page.tsx`
- `platform/app/instituicao/aluno/prova/[id]/cartao/CartaoClient.tsx`
- `platform/app/instituicao/provas/[id]/monitor/page.tsx`
- `platform/app/instituicao/provas/[id]/monitor/MonitorClient.tsx`
- `platform/lib/b2b/__tests__/player.test.ts`
- `docs/b2b/DIARIO.md`

### SQL a rodar no Supabase

- Executar `platform/supabase/b2b/009_aplicacao_provas.sql` no SQL Editor do Supabase (aditivo e idempotente).

### Como testar

1. Acesse `/instituicao/aluno/prova/[id]` com o ID de uma avaliação publicada:
   - Responda algumas questões; recarregue a página e observe que as respostas e a forma sorteada são restauradas sem perda.
   - Alterne de aba no navegador: eventos de auditoria são registrados em `attempt_events`.
   - Clique em "Entregar Prova" e confirme o envio.
2. Acesse `/instituicao/aluno/prova/[id]/cartao`:
   - Simule o preenchimento rápido das bolhas no formato mobile.
3. Acesse `/instituicao/provas/[id]/monitor` com perfil docente/gestor:
   - Veja o monitor em tempo real com o status de cada aluno.
   - Clique em "+ Tempo" para conceder tempo extra de acessibilidade.
   - Clique em "Reabrir" para reabrir a prova de um aluno com justificativa.
   - Clique em "Liberar Gabarito e Comentários".
4. Execute os testes de carga:
   `cd platform && npx vitest run lib/b2b/__tests__/player.test.ts`

---

## 2026-11-18 · P09 · Gestão de Provas, Assistente de Montagem em 4 Passos e Calendário Nacional de Simulados (PR-01 a PR-06, Voto SPR 11)

### O que foi feito

- **Schema e Suporte a Modelos Mensais (`008_provas.sql`):**
  - Colunas aditivas em `assessments`: `is_template`, `template_month` (ex: '2027-03'), `template_edition`, `reviewer_id`, `review_notes` e `source_assessment_id`.
  - Função SQL security definer `get_already_applied_questions(p_class_group_ids)`: identifica com rapidez se uma questão já foi utilizada em avaliações anteriores para as turmas selecionadas, emitindo o alerta visual amarelo no momento da montagem.
  - RLS para modelos (`is_template = true`): qualquer instituição pode ler os simulados-modelo oficiais da MedPleni.
  - Seed de simulados-modelo nacionais da MedPleni para Março/Abril 2027 (100 itens cobrindo as 7 áreas do INEP).
- **Assistente de Montagem em 4 Passos (`/instituicao/provas`):**
  - **Passo 1 (Definição):** Título, tipo (incluindo Simulado ENAMED 4º, 8º e 12º período), modalidade (`online`, `papel`, `hibrida`), duração, janela de aplicação, turmas convocadas e **edição compartilhada** entre professores (seleção de coautores da faculdade).
  - **Passo 2 (Matriz):** Distribuição de questões por área (as 7 áreas canônicas), curva de dificuldade (% fácil, % média, % difícil) e cota mínima de questões com imagem. Botão **"Carregar Matriz Padrão INEP"** para carregar com 1 clique a distribuição oficial de 100 itens para o ENAMED.
  - **Passo 3 (Seleção Assistida - PR-03):** Executa a seleção assistida que monta uma prova de 100 questões em poucos milissegundos respeitando todas as cotas. Itens exibem badges de Área, Dificuldade, Imagem, Origem e **aviso amarelo destacado de questão já aplicada à mesma turma**.
  - **Passo 4 (Revisão Única e Publicação - PR-04 / PR-06):** Painel de checagens automáticas (matriz cumprida, gabaritos preenchidos, sem duplicatas, cota de imagens). Designação de Revisor único com opção de o revisor ver apenas itens da sua área ou todas. Opções: "Salvar Rascunho", "Enviar para Revisão" ou "Aprovar e Publicar Agora" (gerando as 4 Formas A, B, C, D e congelando o caderno).
- **Calendário de Simulados Prontos da MedPleni:**
  - Modal com os simulados nacionais mensais pré-fabricados.
  - Botão **"Adotar com 1 Clique"**: clona a prova inteira para a instituição mantendo a matriz oficial e o caderno.
- **Duplicação de Avaliação Existente:**
  - Ação de duplicar qualquer prova existente da faculdade para reaproveitamento ágil.
- **Lista de Provas e KPIs:**
  - Tabela completa de avaliações com status coloridos, turmas convocadas, modalidade e ações. Dirigente tem visão de todas.
  - Menu do B2B atualizado: rota `/instituicao/provas` marcada como ativa (`status: "ready"`).
- **Qualidade e Testes:**
  - `platform/lib/b2b/__tests__/exams.test.ts`: 7 testes unitários cobrindo matrizes do INEP, checagens automáticas pré-publicação e teste de estresse de montagem de prova de 100 itens em menos de 10 milissegundos.
  - Suíte total B2B: **81 testes unitários passando em 9 arquivos de teste**.

### Arquivos criados / alterados

- `platform/supabase/b2b/008_provas.sql`
- `platform/lib/b2b/exams-types.ts`
- `platform/lib/b2b/exams-checker.ts`
- `platform/lib/b2b/exams-actions.ts`
- `platform/app/instituicao/provas/page.tsx`
- `platform/app/instituicao/provas/ProvasClient.tsx`
- `platform/app/instituicao/components/B2BShell.tsx`
- `platform/lib/b2b/__tests__/exams.test.ts`
- `docs/b2b/DIARIO.md`

### SQL a rodar no Supabase

- Executar `platform/supabase/b2b/008_provas.sql` no SQL Editor do Supabase (aditivo e idempotente).

### Como testar

1. Acesse `/instituicao/provas`.
2. Clique em **"Nova Prova (Assistente)"**:
   - No Passo 1, digite o título, selecione "Simulado ENAMED 12º Período" e marque turmas.
   - No Passo 2, clique em "Carregar Matriz Padrão INEP" para preencher automaticamente as 100 questões nas 7 áreas.
   - No Passo 3, clique em "Executar Seleção Assistida": em instantes as 100 questões são preenchidas com verificação de reuso.
   - No Passo 4, veja as checagens pré-publicação todas em verde e clique em "Salvar Rascunho" ou "Aprovar e Publicar Agora".
3. Clique em **"Simulados Prontos MedPleni"** e adote o Simulado de Março com 1 clique.
4. Na tabela de provas, clique em **"Duplicar"** em qualquer item.

---

## 2026-11-18 · P08 · Modelo de Dados de Avaliações Institucionais (007_avaliacoes.sql e lib/b2b/assessments.ts)

### O que foi feito

- **Schema Completo e Robusto de Avaliações (`007_avaliacoes.sql`):**
  - Isolamento total em relação ao B2C (não reutiliza as tabelas legadas `simulations` e `user_simulations`, que apresentavam falta de versionamento, ausência de snapshot de questões e impossibilidade de análise por item).
  - Tabela `assessments`: cadastro de avaliações com instituição, título, tipos canônicos (`prova_regular`, `simulado_enamed_4`, `simulado_enamed_8`, `simulado_enamed_12`, `pre_aula`, `pos_aula`), modalidades (`papel`, `hibrida`, `online`), fluxo de status (`rascunho`, `em_revisao`, `aprovada`, `publicada`, `aplicada`, `corrigida`), datas, duração, autor, coautoria compartilhada (`coauthors` em JSONB), matriz curricular planejada e par pré/pós aula vinculado (`paired_assessment_id`).
  - Tabela `assessment_versions`: cadernos fixos e versionados. Após a publicação, o caderno é imutável: qualquer retificação exige nova versão ou anulação de item.
  - Tabela `assessment_items`: cópia congelada (snapshot integral) de enunciado, contexto clínico, alternativas estruturadas (A-E), gabarito oficial e comentário explicativo no momento da publicação. Permite peso diferenciado por questão e status individual (`valido` ou `anulado`).
  - Tabela `assessment_forms`: suporte a formas embaralhadas (A, B, C...) com mapeamento biunívoco (`items_shuffle_map`) tanto da ordem das questões quanto das letras das alternativas.
  - Tabela `assessment_targets`: convocação formal de turmas (`class_group`) ou alunos individuais.
  - Tabela `attempts`: registro de tentativas por aluno, com vínculo à forma utilizada, modalidade, status (`nao_iniciou`, `em_andamento`, `finalizada`, `ausente`), pontuação bruta ponderada e pontuação percentual.
  - Tabela `attempt_answers`: respostas por item com a letra assinalada na forma do aluno (`marked_form_letter`) e a **letra já convertida para o caderno-base** (`marked_base_letter`), acerto (`is_correct`), tempo despendido no item quando online e canal de origem (`online`, `folha_lida`, `digitacao`).
  - Tabela `attempt_events`: log de telemetria de sessão para exames online (troca de aba, perda de foco, visualização de item, submissão).
  - Funções SQL security definer:
    - `recalculate_attempt_score(p_attempt_id)`: recalcula a nota da tentativa aplicando com rigor as regras: itens anulados são excluídos do numerador e denominador; itens em branco contam como erro; proteção contra divisão por zero.
    - `recalculate_version_attempts(p_version_id)`: recalcula em lote todas as tentativas da avaliação quando um item é anulado.
  - Views analíticas de desempenho:
    - `vw_assessment_student_scores`: relatório de desempenho por aluno, com comparativo em relação à régua 60 (`is_above_cut_score`), total de itens válidos, acertos e itens anulados.
    - `vw_assessment_class_scores`: agregação por turma com média, mediana, desvio, total de presentes/ausentes e percentual de alunos acima do corte institucional.
  - Políticas de RLS rigorosas:
    - Dirigente e coordenador gerenciam todas as provas da instituição.
    - Docente gerencia suas provas ou provas em coautoria e onde suas turmas foram convocadas.
    - **Regra inegociável:** Aluno nunca lê o gabarito oficial (`frozen_correct_letter` e `frozen_explanation`) antes da liberação formal da avaliação (`status = 'corrigida'`).
- **Módulo de Código e Regras Puras (`platform/lib/b2b/assessments.ts`):**
  - `createAssessment`: criação de prova com definição de alvos e matriz planejada.
  - `publishAssessment`: publicação com congelamento dos itens do caderno e geração automática das Formas A, B, C e D.
  - `generateFormShuffleMap`: gerador determinístico/bijetivo de embaralhamento de questões e alternativas.
  - `convertFormAnswerToBase` e `convertBaseAnswerToForm`: conversores bidirecionais de alternativas entre formas embaralhadas e o caderno-base.
  - `calculateAttemptScore`: função pura para cálculo ponderado de notas com exclusão de anuladas e contagem de em branco como erro.
  - `annulAssessmentItem`: anulação de item com disparo do recálculo automático de notas no banco.
  - `recordAttemptAnswer`: registro e conversão em tempo real da alternativa do aluno para o caderno-base.
  - `submitAttempt`: encerramento da tentativa e consolidação da nota final.
- **Qualidade e Testes Automatizados:**
  - `platform/lib/b2b/__tests__/assessments.test.ts`: 10 testes unitários validando:
    1. Cálculo 100% em prova perfeita.
    2. Questão em branco computada como erro (0 pontos).
    3. Pesos diferenciados por questão.
    4. Anulação de item recalcula a nota e a base sem penalizar o aluno.
    5. Proteção contra divisão por zero em casos extremos.
    6. Conversão de alternativas da forma embaralhada para o caderno-base.
    7. Bijetividade bidirecional (forma -> base -> forma).
    8. Consistência e permutação de todas as 5 alternativas da forma.
    9. Congelamento imutável do caderno contra mutações posteriores no banco de questões.
  - Total da suíte: **74 testes passando em 8 arquivos de teste**.

### Arquivos criados / alterados

- `platform/supabase/b2b/007_avaliacoes.sql`
- `platform/lib/b2b/assessments.ts`
- `platform/lib/b2b/__tests__/assessments.test.ts`
- `docs/b2b/DIARIO.md`

### SQL a rodar no Supabase

- Executar `platform/supabase/b2b/007_avaliacoes.sql` no SQL Editor do Supabase (aditivo e idempotente).

### Como testar

1. Rode a suíte de testes unitários:
   `cd platform && npx vitest run lib/b2b/__tests__/assessments.test.ts`
2. Verifique a tipagem estática:
   `cd platform && npx tsc --noEmit`
3. Execute o build de produção:
   `cd platform && npm run build`

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
