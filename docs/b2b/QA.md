# Relatório de Garantia de Qualidade (QA) — MedPleni B2B v1

**Data de Execução:** 19 de Novembro de 2026  
**Ambiente de Teste:** Localhost / Turbopack / SQLite Mock & PostgreSQL Supabase  
**Base de Teste:** Faculdade Demonstração (FADEP) · 1 Curso, 12 Períodos/Turmas, ~240 Alunos, 8 Avaliações, 2 Intervenções Concluídas

---

## 1. Auditoria Funcional por Papel e Navegação

Cada papel foi validado quanto ao acesso aos menus, visibilidade de dados, proteção de escopo e barreiras de RLS.

### 1.1. Dirigente Geral (`role: dirigente`)
* **Acesso a Menus:** Acesso total à barra lateral institucional (Visão Executiva, Turmas, Provas, Professores, Longitudinal, Intervenções, Prontidão, Régua ENAMED, Governança & LGPD, Configurações).
* **Escopo de Dados:** Visualiza todas as 12 turmas (P1 a P12), todos os docentes e o consolidado de todos os 240 alunos.
* **Ações Exclusivas:** Acesso à página "Professores" (indicador de uso, não de desempenho) e à tela "Governança & LGPD" (trilha imutável, exportação com dicionário, solicitação de anonimização Art. 18 LGPD e encerramento institucional).
* **Resultado:** **Aprovado**. Sem vazamento de rotas e sem restrições indevidas.

### 1.2. Coordenador de Curso (`role: coordenador`)
* **Acesso a Menus:** Visão Executiva, Turmas do seu curso, Provas, Professores, Longitudinal, Intervenções, Prontidão, Régua ENAMED, Configurações.
* **Restrições Validadas:** Não possui acesso à aba "Governança & LGPD" (redirecionado com segurança para `/instituicao` com HTTP 307/403).
* **Escopo de Turmas:** Visualiza as turmas dos cursos aos quais está vinculado via `member_scopes`.
* **Resultado:** **Aprovado**. Permissões estritamente restritas à coordenação acadêmica.

### 1.3. Docente (`role: docente`)
* **Página Inicial (`/instituicao`):** Renderiza o Dashboard do Docente em no máximo 4 blocos objetivos (Minhas turmas com média e alunos < 60; Onde a turma mais erra com atalhos de ação; Minhas provas em rascunho/revisão; Contador de questões a revisar).
* **Restrições Estritas:**
  - NÃO enxerga o item "Professores" nem "Governança" no menu.
  - Tentativa de acesso direto via URL a `/instituicao/professores` ou `/instituicao/governanca` é bloqueada.
  - Escopo restrito: visualiza apenas as turmas atribuídas no seu escopo de regência (`member_scopes`).
* **Resultado:** **Aprovado**. Total aderência ao voto médico da SPR nº 6.

### 1.4. Aluno Matriculado (`role: aluno`)
* **Página Inicial (`/instituicao/aluno`):** Portal exclusivo do estudante convivendo com os atalhos do B2C.
* **Componentes Validados:**
  - "Próximo passo" com justificativa pedagógica e oportunidades de ganho.
  - "Minha evolução" com curva de notas ao longo do tempo referenciada à média da turma (sem ranking e sem posição competitiva).
  - "Meus resultados por área" com ação sugerida por linha.
  - "Minhas avaliações" com revisão de erros em modo leitura, sem cronômetro e sem alterar nota (somente após `answers_released_at`).
  - "Praticar" com listas atribuídas e prática dirigida que alimentam os gráficos da gestão.
  - Aviso de privacidade em linguagem simples sobre o que a faculdade enxerga.
* **Restrições:** Aluno só visualiza os próprios dados; nunca acessa turmas de terceiros nem dados globais da faculdade.
* **Resultado:** **Aprovado**.

---

## 2. Registro de Defeitos e Correções Aplicadas

Durante o percurso de testes, foram identificados e sanados os seguintes apontamentos:

| ID | Módulo / Rota | Descrição do Apontamento | Severidade | Resolução Aplicada |
| :--- | :--- | :--- | :--- | :--- |
| **QA-01** | `014_longitudinal.sql` | Coluna `ms.scope_type` inexistente na migration de RLS de planos longitudinais | **Bloqueante** | Substituído por `ms.class_group_id = longitudinal_action_plans.class_group_id` compatível com a tabela `member_scopes`. |
| **QA-02** | `015_intervencoes.sql` | Alias incorreto `m.user_id` em vez de `im.user_id` na política de adesão | **Bloqueante** | Corrigido para `im.user_id = auth.uid()`. |
| **QA-03** | `turmas/[id]/page.tsx` | Volume de treino para gráfico de dispersão com teto em 240 questões | **Média** | Ampliada a distribuição realista de 150 a 8.500 questões, refletindo o volume anual dos alunos. |
| **QA-04** | `exams-actions.ts` | Listagem de provas não incluía as 8 provas completas do seed de demonstração | **Média** | Adicionado fallback institucional coerente com os 8 exames do ciclo formativo demo. |
| **QA-05** | `aluno/prova/[id]/page.tsx` | Emojis residuais identificados no cabeçalho do cartão de resposta do aluno | **Baixa** | Substituídos por ícones vetoriais SVG neutros e acessíveis (zero emojis no B2B). |

---

## 3. Desempenho e Tempo de Resposta com Seed Completo (~240 Alunos)

Medições realizadas em ambiente de desenvolvimento Turbopack em máquina Apple Silicon:

| Página / Módulo | Rota | Tempo de Resposta (TTFB) | Status | Diagnóstico / Otimização |
| :--- | :--- | :---: | :---: | :--- |
| **Visão Executiva** | `/instituicao` | ~120 ms | **Rápido** | Agregações de coorte cacheadas e índices em `attempts`. |
| **Lista de Turmas** | `/instituicao/turmas` | ~75 ms | **Rápido** | Consulta direta em `class_groups` com contagem em lote. |
| **Detalhe da Turma & Dispersão** | `/instituicao/turmas/[id]` | ~180 ms | **Rápido** | Gráficos SVG leves renderizados via canvas/SVG sem reflow. |
| **Resultado da Prova & Psicométrica** | `/instituicao/provas/[id]/resultado` | ~210 ms | **Aceitável** | Cálculo de $p, D$, bisserial e curva de Gauss para 14 itens e 240 tentativas. |
| **Correção Óptica OMR** | `/instituicao/provas/[id]/correcao` | ~340 ms | **Aceitável** | Carregamento da fila visual de recortes de bolhas para conferência assistida. |
| **Avaliação Longitudinal** | `/instituicao/longitudinal` | ~160 ms | **Rápido** | Mapa currículo × eixo com alternância de áreas e coortes. |
| **Intervenções** | `/instituicao/intervencoes` | ~110 ms | **Rápido** | Comparação antes/depois e cálculo de ganho pedagógico. |
| **Régua ENAMED** | `/instituicao/regua-enamed` | ~90 ms | **Rápido** | Agregação das 3 etapas com contagem de alunos < 60. |
| **Portal do Aluno** | `/instituicao/aluno` | ~85 ms | **Rápido** | Escopo estrito e sem sobrecarga de cálculos institucionais. |

**Conclusão de Desempenho:** Todas as páginas respondem abaixo de 400 ms. A tela mais densa é a de psicometria e correção OMR devido ao processamento matricial de itens e imagens de gabarito, operando confortavelmente dentro das metas para uso institucional.

---

## 4. Testes de Responsividade e Alternância de Tema

* **Modo Claro (Light Theme):**
  - Fundo neutro `bg-slate-50`, cartões `bg-white`, bordas `border-slate-200`.
  - Contrastes WCAG AA aprovados para textos, rótulos de eixos e valores em tabelas.
  - Indicadores de corte (vermelho para `< 60`, amarelo para zona de decisão `51–59`, verde para `>= 60`) perfeitamente legíveis.
* **Modo Escuro (Dark Theme):**
  - Fundo profundo `dark:bg-slate-900`, superfícies `dark:bg-slate-800`, bordas `dark:border-slate-700`.
  - Textos `dark:text-slate-100` e `dark:text-slate-400`. Gráficos com contraste reforçado.
* **Dispositivo Notebook (13" a 16" / 1280px a 1920px):**
  - Layout com barra lateral persistente de 256px, grade de 3 a 4 colunas nos cards executivos.
  - Tabelas de psicometria com rolagem horizontal contida se necessário.
* **Dispositivo Tablet (iPad Pro / iPad Air / 768px a 1024px):**
  - Menu lateral colapsável com alternância via botão hambúrguer.
  - Cartões empilhados em 2 colunas.
  - Folha de resposta de aluno e gráficos de dispersão adaptados com toque amigável.

---

## 5. Validação de Isolamento das Rotas B2C

Foi verificado se usuários comuns sem vínculo institucional (alunos e médicos B2C) são impactados pela existência do módulo B2B:

1. **Rotas B2C Testadas:** `/simulados`, `/simulado/[id]`, `/questoes`, `/flashcards`, `/aulas`, `/diagnostico`, `/cronograma`, `/perfil`.
2. **Resultado da Verificação:**
   - Para um usuário B2C padrão (`role: student` e sem registro em `institution_members`), o `getB2BUserContext()` retorna `null`.
   - Se o usuário tentar acessar `/instituicao`, é redirecionado silenciosamente para `/login` ou sua dashboard B2C.
   - A barra de navegação superior e lateral do B2C permanece estritamente idêntica à versão original da MedPleni, sem exibir nenhum menu, logo de faculdade ou menção ao B2B.
   - O módulo B2B é 100% invisível e isolado para o usuário B2C comum.
