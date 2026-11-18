# MedPleni B2B — Diário de Desenvolvimento

Formato de cada entrada:
> **Data · Prompt · Resumo**  
> Arquivos criados/alterados · SQL a rodar · Como testar · Pendências · Dúvidas

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
