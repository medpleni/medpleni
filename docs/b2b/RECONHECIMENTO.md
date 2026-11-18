# MedPleni B2B — Reconhecimento do Código (P00)

**Data:** 2026-11-18  
**Responsável:** Antigravity (Claude Sonnet 4.6)  
**Fonte de verdade:** `docs/b2b/ESPEC-B2B.md`

---

## a) Autenticação, sessão e papel (`profiles.role`) — como funciona hoje

### Fluxo geral

| Camada | Arquivo | Responsabilidade |
|---|---|---|
| Edge | `platform/middleware.ts` | Chama `updateSession(request)` para renovar o cookie JWT em **toda** requisição (exceto estáticos e imagens) |
| Supabase SSR | `platform/lib/supabase/middleware.ts` | Instancia `createServerClient` com `NEXT_PUBLIC_SUPABASE_ANON_KEY`, faz `auth.getUser()` com timeout de 1200 ms (guarda contra Vercel Edge). Redireciona para `/login` se não autenticado em rota privada; redireciona para `/dashboard` se já logado tentando `/login` ou `/cadastro` |
| Server Components | `platform/lib/supabase/server.ts` | `createClient()` → `createServerClient` lendo cookies via `next/headers`; usado em Route Handlers |
| Client Components | `platform/lib/supabase/client.ts` | `createClient()` → `createBrowserClient`; chave pública anon |
| Hook universal | `platform/lib/supabase/use-user.ts` | `useUser()` — combina `auth.getUser()` com `getProfile(userId)` (SELECT na tabela `profiles`). Escuta `onAuthStateChange`. Expõe `{ user, profile, loading, signOut, refreshProfile }` |

### Como o `role` chega ao front

1. No signup → trigger `handle_new_user()` lê `raw_app_meta_data->>'role'` ou `raw_user_meta_data->>'role'` e insere em `profiles.role` (padrão `'student'`).  
2. Em qualquer componente cliente: `const { profile } = useUser()` → `profile.role`.  
3. Em Route Handlers admin: o role é relido do banco via `SUPABASE_SERVICE_ROLE_KEY` para evitar spoofing.

### Papéis em uso (dispersos em múltiplos arquivos)

| Valor em `profiles.role` | Onde aparece | Observação |
|---|---|---|
| `student` | Schema padrão, `ProfileRow`, trigger | Papel base do B2C |
| `admin` | `ProfileRow` em `profile.ts` | **Orphan**: declarado no tipo TS mas nunca tratado em layout/redirect |
| `mentor` | `ProfileRow` em `profile.ts` | **Orphan**: declarado no tipo TS, sem rota/guard |
| `docente` | `admin_schema.sql`, `admin/layout.tsx`, RLS | Backoffice MedPleni (docente da equipe interna) |
| `financeiro` | `admin_schema.sql`, RLS | Backoffice MedPleni |
| `suporte` | `admin_schema.sql`, RLS | Backoffice MedPleni |
| `desenvolvedor` | `admin_schema.sql`, RLS | Backoffice MedPleni |
| `superadmin` | `admin_schema.sql`, `admin/layout.tsx` | Mario; hardcoded email `mario.nascimentolopes@gmail.com` como fallback |

> **Atenção:** `ProfileRow` em `lib/supabase/profile.ts` (linha 8) declara `role: "student" | "admin" | "mentor"` — desatualizado. Os roles reais em uso são `student | docente | financeiro | suporte | desenvolvedor | superadmin`. O tipo `AdminRole` em `lib/supabase/admin.ts` está correto.

### Proteção de rota (admin)

`platform/app/admin/layout.tsx` (linha 26): guarda com `ADMIN_ALLOWED_ROLES = ["superadmin", "docente", "financeiro", "suporte", "desenvolvedor"]` + fallback de email. A proteção é **client-side**: o layout faz `useEffect` e `router.push("/dashboard")` se não autorizado. **Não há middleware de rota para `/admin`** — um usuário mal-intencionado poderia ver um flash da tela antes do redirect.

---

## b) Esquema real das tabelas que o B2B vai tocar

### `profiles`

| Coluna | Tipo | Definido em | Notas |
|---|---|---|---|
| `id` | UUID PK | `schema.sql` | FK → `auth.users` |
| `full_name` | TEXT NOT NULL | `schema.sql` | |
| `email` | TEXT NOT NULL | `schema.sql` | |
| `role` | TEXT / VARCHAR(30) | `schema.sql` + `admin_schema.sql` | Constraint original `CHECK (role IN ('student','admin','mentor'))` foi **dropada** em `fix_invitations_and_roles.sql` → campo livre |
| `plan` | TEXT / VARCHAR(50) | `schema.sql` | Constraint original `CHECK` também dropada |
| `sub_brand` | TEXT | `schema.sql` | `RESID/ENAMED/REVALIDA/ESPECIALISTA` |
| `target_exams` | TEXT[] | `schema.sql` | |
| `target_specialty` | TEXT | `schema.sql` | |
| `exam_date` | TEXT | `schema.sql` | Data como texto (sem padronização ISO) |
| `weekly_study_hours` | INTEGER | `schema.sql` | |
| `study_days` | TEXT[] | `schema.sql` | |
| `study_shifts` | TEXT[] | `schema.sql` | |
| `crm` | TEXT | `schema.sql` | |
| `avatar_url` | TEXT | `schema.sql` | |
| `streak_days` | INTEGER | `schema.sql` | |
| `last_active_at` | TIMESTAMPTZ | `schema.sql` | |
| `onboarding_completed` | BOOLEAN | `schema.sql` | |
| `access_expires_at` | TIMESTAMPTZ | `admin_invitations.sql` | Adicionada via `ALTER ... ADD COLUMN IF NOT EXISTS` |
| `status` | VARCHAR(20) | `student_profile_360_schema.sql` | `active/blocked/suspended` |
| `blocked_reason` | TEXT | `student_profile_360_schema.sql` | |
| `created_at` | TIMESTAMPTZ | `schema.sql` | |
| `updated_at` | TIMESTAMPTZ | `schema.sql` | |

**Colunas ausentes que o B2B vai precisar:** `institution_id` (FK para a futura tabela `b2b_institutions`), `b2b_role` (papel dentro da instituição: dirigente, coordenador, docente, aluno-b2b).

### `questions`

| Coluna | Tipo | Notas / Problemas |
|---|---|---|
| `id` | UUID PK | |
| `code` | TEXT UNIQUE | |
| `statement` | TEXT NOT NULL | |
| `clinical_context` | TEXT | |
| `institution` | TEXT NOT NULL | Texto livre (ex.: `'USP'`, `'ENARE'`); sem FK. Para o B2B precisará distinguir "banca de origem" da "instituição proprietária" |
| `year` | INTEGER NOT NULL | |
| `area` | TEXT NOT NULL | **Texto livre** — ver seção c) |
| `subarea` | TEXT NOT NULL | **Texto livre** — sem tabela de referência |
| `difficulty` | TEXT | CHECK `IN ('facil','media','alta','muito-alta')` — esquema original; constraint pode ter sido dropada junto com as de `profiles` |
| `explanation` | TEXT NOT NULL | |
| `tags` | TEXT[] | |
| `created_at` | TIMESTAMPTZ | |
| `sim_type` / `year` / `is_official` / `exam_edition` / `matrix_distribution` | — | Essas colunas foram adicionadas à tabela `simulations`, não a `questions` |

**Colunas ausentes para o B2B:**
- `scenario_id` (FK para tabela de cenários INEP — seção 3 da ESPEC)
- `theme_id` (FK para tabela de temas)
- `competency_id` (FK para tabela de competências)
- `origin_label` (rótulo `Instituição-ano` ou `ano`)
- `owned_by_institution_id` (FK para instituição proprietária)
- `is_public` (se pertence ao acervo MedPleni ou é autoral da instituição)
- `correct_option` — **BUG:** `lib/supabase/admin.ts` linha 212 faz `INSERT ... correct_option: questionData.gabarito` mas esta coluna **não existe** na tabela `questions`. O gabarito correto está em `question_options.is_correct = true`. Este INSERT falha silenciosamente.

### `question_options`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `question_id` | UUID FK → `questions` | |
| `letter` | CHAR(1) | CHECK `A/B/C/D/E` |
| `text` | TEXT | |
| `is_correct` | BOOLEAN | Único ponto de verdade do gabarito |

Sem problemas estruturais. Sem colunas de alternativa para B2B.

### `user_answers`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → `auth.users` | |
| `question_id` | UUID FK → `questions` | |
| `selected_letter` | CHAR(1) | |
| `is_correct` | BOOLEAN | |
| `confidence` | INTEGER | 1–5 |
| `time_spent_seconds` | INTEGER | |
| `context_type` | TEXT | `standalone/simulation/diagnostic` — sem `'exam'` para o contexto de prova B2B |
| `simulation_id` | UUID | Sem FK declarada (campo livre, sem `REFERENCES`) |
| `created_at` | TIMESTAMPTZ | |

**Problemas:**
- `simulation_id` sem constraint FK — integridade referencial não garantida.
- Sem `institution_id` nem `exam_id` — impossível isolar respostas por prova B2B sem adicionar colunas ou uma tabela pivot.
- `context_type` não tem valor `'exam'` para distinguir prova institucional.

### `simulations`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `title` | TEXT | |
| `institution` | TEXT | Texto livre — igual ao problema de `questions.institution` |
| `area` | TEXT | Texto livre |
| `total_questions` | INTEGER | |
| `duration_minutes` | INTEGER | |
| `description` | TEXT | |
| `is_active` | BOOLEAN | |
| `created_at` | TIMESTAMPTZ | |
| `sim_type` | VARCHAR(50) | Adicionado por `simulations_hub_schema.sql`; sem CHECK adequado para tipos B2B |
| `year` | INTEGER | Adicionado por `simulations_hub_schema.sql` |
| `is_official` | BOOLEAN | Adicionado por `simulations_hub_schema.sql` |
| `exam_edition` | VARCHAR(50) | Adicionado por `simulations_hub_schema.sql` |
| `matrix_distribution` | JSONB | Adicionado por `simulations_hub_schema.sql` |

**Problemas:**
- Tabela usada tanto para simulados B2C quanto para (futuros) exames B2B — sem distinção de posse (`owned_by`).
- Sem `institution_id` para multi-tenancy.
- Sem `exam_type` alinhado com a ESPEC (`prova_regular`, `simulado_enamed_4`, `simulado_enamed_8`, `simulado_enamed_12`, `pre_aula`, `pos_aula`).
- **Crítico:** Não existe tabela de itens de prova (`exam_question_items`) relacionando `simulation_id` ↔ `question_id` com posição e versão. Hoje o simulado não grava quais questões foram apresentadas — o aluno não pode revisar questão por questão; `user_simulations` só grava `score_percent` total.

### `user_simulations`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → `auth.users` | |
| `simulation_id` | UUID FK → `simulations` | |
| `status` | TEXT | `nao_iniciado/em_andamento/concluido` |
| `score_percent` | NUMERIC(5,2) | |
| `started_at` | TIMESTAMPTZ | |
| `completed_at` | TIMESTAMPTZ | |
| `time_spent_seconds` | INTEGER | |

**Problema crítico:** Sem vínculo entre `user_simulations` e `user_answers` — é impossível calcular desempenho por questão, por área, índice de discriminação ou KR-20 para uma prova específica. As fórmulas da seção 6 da ESPEC (facilidade, discriminação, ponto-bisserial, KR-20) exigem respostas *por item do exame* vinculadas ao `user_simulation`.

---

## c) Listas de áreas fixas no código

> Legenda: **7A** = 7 áreas INEP/ESPEC | **6A** = 6 áreas (sem Saúde Mental) | **5A** = 5 áreas (mínimo)

| Arquivo | Linha(s) | Áreas na lista | Conjunto |
|---|---|---|---|
| `platform/lib/types.ts` | 26–42 | Clínica Médica, Cirurgia Geral, Saúde Coletiva, Pediatria, GO, MFC, Saúde Mental **+ Psiquiatria, U&E, Cardio, Neuro, Pneumo, Infecto, Endo, Reumato, Gastro** (16 áreas) | Superset |
| `platform/lib/supabase/diagnostic.ts` | 29–33 | CM, Cirurgia Geral, Saúde Coletiva, Pediatria, GO (5 áreas — **falta MFC e Saúde Mental**) | **5A** |
| `platform/lib/supabase/prediction.ts` | 47–53 | CM, GO, Pediatria, MFC, Cirurgia Geral, Saúde Coletiva, Saúde Mental (7 áreas) | **7A** ✓ |
| `platform/lib/supabase/simulations.ts` | 143–144 | CM, Cirurgia Geral (trecho parcial visível) | Parcial |
| `platform/app/questoes/page.tsx` | 36–42 | CM, MFC, Cirurgia Geral, GO, Pediatria, Saúde Coletiva, Saúde Mental (7 áreas) | **7A** ✓ |
| `platform/app/questoes/page.tsx` | 49–55 | Mapa de abreviações das 7 áreas | **7A** ✓ |
| `platform/app/simulados/page.tsx` | 53 | CM, Cirurgia Geral, GO, Pediatria, Saúde Coletiva (5 áreas) | **5A** |
| `platform/app/simulados/page.tsx` | 639–644 | CM, Cirurgia Geral, GO, Pediatria, Saúde Coletiva, MFC (6 áreas — **falta Saúde Mental**) | **6A** |
| `platform/app/cronograma/page.tsx` | 22–26 | CM, Cirurgia Geral, Pediatria, GO, Saúde Coletiva (5 áreas — **falta MFC e Saúde Mental**) | **5A** |
| `platform/app/flashcards/page.tsx` | (filtros internos) | CM, Cirurgia Geral, Pediatria, GO, Saúde Coletiva | **5A** |
| `platform/app/onboarding/page.tsx` | 66 | CM, Cirurgia Geral, Pediatria, GO, Psiquiatria, Ortopedia, Dermatologia, Oftalmologia | Especialidades (diferente) |
| `platform/app/aulas/page.tsx` | 100–110 | CM, Cirurgia Geral, Pediatria, GO, Saúde Coletiva | **5A** |
| `platform/lib/data/classes_catalog.ts` | (campo `area`) | CM, Cirurgia Geral, Pediatria, GO, Saúde Coletiva, MFC | **6A** (herdado de `med_classes`) |
| `platform/lib/mock-data.ts` | (vários) | Misto | Misto |
| `platform/supabase/classes_classroom_schema.sql` | 12 | Clínica Médica, Cirurgia Geral, Pediatria, GO, Saúde Coletiva (5 áreas no comentário) | **5A** |

**Resumo do problema:** A ESPEC define 7 áreas padrão INEP. O código usa 5, 6 ou 7 dependendo do arquivo. Nenhuma lista é autoritativa num único lugar. Para o B2B, criar tabela `b2b_areas` como fonte única e remover todas as listas hardcoded ao longo dos prompts.

---

## d) Componentes de layout e UI reutilizáveis + tema claro/escuro

### Componentes de layout (`platform/components/layout/`)

| Componente | Props principais | Uso |
|---|---|---|
| `PageShell` | `title`, `badgeText`, `activeNavId`, `onNavigate`, `children` | Wrapper padrão B2C: inclui Sidebar, Topbar, BottomNav e MobileDrawer. Detecta parceiros pelo e-mail e adiciona item "Central B2B" na nav |
| `Sidebar` | `sections`, `activeId`, `onNavigate`, `userName`, `userRole`, `userInitials` | Sidebar desktop (oculta via `.desktop-sidebar` CSS em mobile). Renderiza seções de nav com ícones SVG inline |
| `Topbar` | `title`, `badgeText`, `actions`, `onOpenMenu` | Header fixo com toggle de tema (sol/lua) e link para `/perfil` |
| `BottomNav` | `activeId`, `onNavigate`, `onOpenMenu` | Nav mobile fixa no fundo (oculta via CSS em desktop) |
| `MobileDrawer` | `isOpen`, `onClose`, `activeId`, `userName`, `userRole`, `userInitials` | Menu lateral em overlay para mobile |

### Componentes de UI (`platform/components/ui/`)

| Componente | Props | Descrição |
|---|---|---|
| `Card` | `children`, `style`, `hoverable` | Card com `var(--card-bg)` + hover com borda teal |
| `Button` | `variant` (primary/secondary/ghost/danger), `size` (sm/md/lg) | Todos os botões do sistema |
| `Badge` | `variant` (green/blue/purple/warn/danger/neutral) | Chips de status com ponto colorido |
| `KPICard` | `icon`, `label`, `value`, `delta`, `deltaDirection`, `iconBg`, `valueColor` | Card de indicador com delta up/down |
| `ProgressBar` | — | Barra de progresso |
| `ScoreRing` | — | Anel de pontuação circular |
| `HeatmapCell` | — | Célula individual do heatmap |
| `Tooltip` | — | Tooltip flutuante |
| `Input` | — | Campo de texto estilizado |

Todos os componentes consomem variáveis CSS (`var(--card-bg)`, `var(--pulso)`, etc.) definidas em `globals.css`.

### Como o tema claro/escuro funciona

```
globals.css
  :root, [data-theme="dark"]  → tokens dark (padrão)
  [data-theme="light"]        → tokens light (mesmo conjunto de variáveis, valores diferentes)

app/layout.tsx
  <head> → script inline anti-flicker: lê localStorage('medpleni_theme')
           ou preferência do SO e seta data-theme antes do primeiro render

lib/theme-context.tsx
  ThemeProvider → mantém estado React em sincronia com data-theme no <html>
  useTheme()    → { theme, toggleTheme, setTheme }

Topbar.tsx
  Botão sol/lua → chama toggleTheme()
admin/layout.tsx
  Mesmo padrão com botão próprio de toggle
```

**Mecanismo:** `document.documentElement.setAttribute('data-theme', value)` atualiza os tokens CSS globalmente. Nenhum componente usa `dark:` do Tailwind; tudo via variáveis CSS. O B2B deve seguir o mesmo padrão — nunca hardcodar cores hex diretamente em componentes novos.

---

## e) Como o SQL é aplicado e ambiente de desenvolvimento separado

### Como o SQL é aplicado hoje

**Não existe sistema de migrations.** Os arquivos `.sql` em `platform/supabase/` são scripts avulsos executados manualmente pelo Mario no **SQL Editor do Supabase Dashboard** (URL confirmada em `fix_invitations_and_roles.sql`: `supabase.com/dashboard/project/yfaaiemwzdgvyfnavgxa/sql`).

Ordem implícita dos arquivos (pela dependência):
1. `schema.sql` — base
2. `admin_schema.sql` — adiciona `role`, auditoria
3. `admin_invitations.sql` — `admin_invitations`, `access_expires_at`
4. `fix_invitations_and_roles.sql` — dropa constraints de `role` e `plan`
5. `student_profile_360_schema.sql` — `status`, `blocked_reason`, `user_emails_log`
6. `classes_classroom_schema.sql` — `med_classes`, `med_class_progress`
7. `medical_ai_schema.sql` — `ai_conversations`, `ai_messages`
8. `simulations_hub_schema.sql` — colunas extras em `simulations`
9. `fix_flashcards_rls.sql` — ajusta RLS de flashcards
10. `b2b_approvals.sql` — `b2b_approvals` (central de votos)
11. `seed.sql` + `seed_simulations.sql` — dados iniciais

### Existe ambiente de desenvolvimento separado de produção?

**Não existe.** O projeto usa um único Supabase project (`yfaaiemwzdgvyfnavgxa`). O `.env.local` aponta para produção; não há `.env.development` nem referência a um segundo projeto Supabase de staging. **Toda migration B2B deve ser gerada como arquivo SQL e entregue ao Mario para execução — nunca executada automaticamente pelo agente.**

---

## f) Riscos para o B2C ao introduzir o B2B e plano de isolamento

### Riscos identificados

| Risco | Impacto | Probabilidade |
|---|---|---|
| **Migration errada em tabela compartilhada** (`profiles`, `questions`, `user_answers`, `simulations`) apaga coluna ou quebra constraint | Dados B2C perdidos ou corrompidos | Alta se não houver revisão |
| **RLS frouxa em tabela nova** deixa dados de uma instituição visíveis para outra | Vazamento de dados entre clientes (LGPD) | Média — multi-tenant exige cuidado extra |
| **Nova rota `/instituicao/**` sem guard** permite acesso por aluno B2C | Exposição de dados institucionais | Baixa (guard por `role`) |
| **Componente B2B importado no bundle B2C** aumenta tamanho da página do aluno | Performance | Baixa (tree-shaking) |
| **`context_type` em `user_answers` sem `'exam'`** faz respostas B2B ficarem como `'standalone'** ou `'simulation'` | Relatórios misturados | Alta se não adicionarmos o valor |
| **Campo `institution` texto-livre em `questions`** conflita com conceito de "instituição proprietária" B2B | Consultas ambíguas | Média |
| **RLS de `questions`** hoje permite SELECT para qualquer autenticado — o banco B2C ficaria exposto para alunos B2B e vice-versa se não segmentarmos | Vazamento do acervo | Alta se não adicionarmos `institution_id` + policy |
| **Seed data** usa `DELETE FROM simulations` antes de reinserir — se rodada em produção no futuro destroi dados B2B | Perda de dados | Alta (nunca rodar seed em prod) |

### Estratégia de isolamento

1. **Todo o B2B vive em prefixo próprio:** `app/instituicao/**`, `app/api/b2b/**`, `lib/b2b/**`, `components/b2b/**`. Zero importação cruzada em componentes B2C existentes.
2. **Novas tabelas** (p.ex. `b2b_institutions`, `b2b_exams`, `b2b_exam_items`, `b2b_classes`, `b2b_members`) têm RLS com `institution_id = auth.jwt()->'institution_id'` ou função helper — nunca dependem só do `user_id` global.
3. **Tabelas compartilhadas** (`questions`, `user_answers`) ganham colunas aditivas opcionais (`institution_id`, `exam_id`). RLS existente permanece; novas policies B2B adicionadas em OR para o papel correto.
4. **SQL**: cada arquivo novo em `platform/supabase/b2b/NNN_nome.sql`, idempotente, sem `DROP` ou `TRUNCATE`.
5. **Middleware** não precisa mudar para P01-P04; a guarda de rota `/instituicao` pode ser adicionada como bloco adicional em `lib/supabase/middleware.ts` sem alterar a lógica B2C.

---

## g) Plano técnico para P01–P04

> Baseado na seção 0 da ESPEC-B2B.md e no estado atual do código.

### Nomes de tabelas B2B (todas novas, aditivas)

| Tabela | Propósito |
|---|---|
| `b2b_institutions` | Cadastro de faculdades (`is_demo`, `cut_score`, `plan_type`, `logo_url`, etc.) |
| `b2b_members` | Vínculo `user_id ↔ institution_id` com `b2b_role` (dirigente, coordenador, docente, aluno) |
| `b2b_classes` | Turmas (período, ano, curso) |
| `b2b_class_members` | Vínculo aluno ↔ turma |
| `b2b_areas` | 7 áreas INEP (fonte única; substitui listas hardcoded) |
| `b2b_scenarios` | Cenários INEP (vazio inicialmente, editável via CSV) |
| `b2b_themes` | Temas (vazio inicialmente) |
| `b2b_competencies` | Competências (vazio inicialmente) |
| `b2b_exams` | Provas/simulados institucionais (tipo, turma, período, data) |
| `b2b_exam_questions` | Itens de prova (exam_id ↔ question_id, posição, versão embaralhada) |
| `b2b_exam_answers` | Respostas por item de prova B2B (user_id, exam_id, question_id, selected_letter) |
| `b2b_institution_questions` | Questões autorais de cada instituição (FK para `questions.id`) |
| `b2b_audit_log` | Log de acesso a dado individual (LGPD) |
| `b2b_institution_config` | Config por instituição: `cut_score`, alertas habilitados, prontidão |

### Pastas e convenções

```
platform/
├── app/
│   ├── instituicao/           # Rotas B2B (layouts separados por papel)
│   │   ├── layout.tsx         # Guard: valida b2b_role, seleciona institution_id
│   │   ├── dashboard/         # P02 — painéis por papel
│   │   ├── turmas/            # P02
│   │   ├── provas/            # P03
│   │   ├── banco-questoes/    # P04
│   │   ├── relatorios/        # P04+
│   │   └── configuracoes/     # P01
│   └── api/
│       └── b2b/               # Route Handlers B2B (service role apenas aqui)
│           ├── institutions/
│           ├── exams/
│           ├── analytics/
│           └── ...
├── components/
│   └── b2b/                   # Componentes exclusivos B2B
│       ├── Heatmap.tsx
│       ├── ScatterPlot.tsx
│       ├── ExamBuilder.tsx
│       └── ...
├── lib/
│   └── b2b/                   # Lógica de negócio B2B
│       ├── formulas.ts        # Facilidade, discriminação, KR-20, etc. (testados)
│       ├── analytics.ts       # Agregações por turma/instituição
│       ├── readiness.ts       # Indicador de prontidão por regra
│       └── ...
└── supabase/
    └── b2b/                   # Migrations aditivas
        ├── 001_core_tables.sql
        ├── 002_areas_seed.sql
        ├── 003_rls_policies.sql
        └── ...
```

### Plano por prompt

**P01 — Setup e tabelas core**
- Criar `001_core_tables.sql`: `b2b_institutions`, `b2b_members`, `b2b_classes`, `b2b_class_members`, `b2b_areas` (7 áreas seed), `b2b_institution_config`
- Criar `002_question_extensions.sql`: colunas aditivas em `questions` (`b2b_institution_id`, `b2b_origin_label`, `b2b_is_public`) e em `user_answers` (`b2b_exam_id`)
- Guard de rota `app/instituicao/layout.tsx` verificando `b2b_members` via server
- Seed da instituição demo `Faculdade Demonstração` (`is_demo = true`)

**P02 — Painéis por papel (dirigente, coordenador, docente, aluno)**
- Componentes de layout B2B (sidebar com itens de menu por papel)
- Dashboard executivo: 5 KPIs, heatmap turma × área, dispersão
- Dashboard do coordenador: turmas, alertas, zona de decisão
- Painel do docente: provas aguardando, itens para revisar, minhas turmas
- Painel do aluno B2B: próximo passo, evolução vs. média da turma

**P03 — Provas e correção**
- Tabelas `b2b_exams`, `b2b_exam_questions`, `b2b_exam_answers`
- Builder de prova: matriz → seleção assistida → revisão única → publicação
- Modalidades: papel (QR), híbrida, 100% online
- Fórmulas em `lib/b2b/formulas.ts` com testes

**P04 — Banco de questões B2B**
- Interface de criação, revisão e importação de questões
- Filtros: área, cenário, tema, competência, dificuldade, origem
- Motor "devolutiva → questão" com IA assistida
- Gestão de direitos de uso por fonte

### Coerência com seção 0 da ESPEC

- Regra 2 (não quebrar B2C): todo código B2B em prefixo isolado ✓
- Regra 3 (SQL aditivo): scripts em `supabase/b2b/NNN_*.sql` ✓
- Regra 4 (RLS multi-tenant): `institution_id` em todas as tabelas novas ✓
- Regra 5 (sem dados reais no seed): usar `is_demo = true` + nomes fictícios ✓
- Regra 6 (sem números inventados): toda tela mostra "sem dados" se vazio ✓
- Regra 7 (Régua 60 em config): `cut_score DEFAULT 60` em `b2b_institution_config` ✓
- Regra 8 (temas limpos): reutilizar `components/ui/` existentes, sem emoji ✓
- Regra 9 (cálculo no servidor): `lib/b2b/formulas.ts` como funções puras ✓

---

## h) Dúvidas que só o Mario pode responder

| # | Dúvida | Impacto no B2B | Urgência |
|---|---|---|---|
| H-01 | O projeto Supabase `yfaaiemwzdgvyfnavgxa` é o único ambiente? Existe ou pode-se criar um projeto de staging para executar as migrations B2B antes de ir a produção? | Sem staging, toda migration vai direto a prod com alunos B2C ativos | **Alta** |
| H-02 | O arquivo `fix_invitations_and_roles.sql` dropou as constraints de `role` e `plan` em `profiles`. O banco atual aceita qualquer valor nesses campos? Confirmar antes de criar papéis B2B | Papéis B2B serão adicionados ao mesmo campo `role` ou será um campo separado `b2b_role`? | **Alta** |
| H-03 | O Dr. Filipe confirmou a lista de cenários INEP. Quando o arquivo chega? A ESPEC diz "peça o arquivo ao Mario". Sem isso a tabela `b2b_scenarios` fica vazia | Bloqueia classificação de questões e filtros B2B | **Alta** |
| H-04 | O campo `institution` em `questions` e `simulations` é texto livre (ex.: `'USP'`, `'ENARE'`). Para o B2B, "instituição" significa a faculdade compradora. Esses campos têm usos incompatíveis. Devo criar `b2b_institution_id` separado em `questions` ou renomear/migrar `institution`? | Arquitetura dos próximos 3 prompts | **Alta** |
| H-05 | Bug confirmado: `lib/supabase/admin.ts` linha 212 insere `correct_option` que não existe em `questions`. As questões criadas pelo backoffice têm gabarito salvo corretamente? (O gabarito real está em `question_options.is_correct`) | Se as questões do banco atual estão sem gabarito, o B2B herda o problema | **Média** |
| H-06 | `ProfileRow` em `profile.ts` declara `role: "student" | "admin" | "mentor"`. Devo atualizar esse tipo para o conjunto real antes do P01 (quebraria zero comportamento pois os campos orphan nunca são usados em guards)? | Consistência de tipos TS | Baixa |
| H-07 | Qual é o tenant de entrada? O primeiro cliente B2B já está definido (SPR Med)? Preciso de dados reais do cliente ou só a demo é suficiente para P01? | Define o escopo do seed de demo | **Média** |
| H-08 | A ESPEC diz que a taxonomia da 1ª etapa (4º período) só será definida após publicação do INEP. O modelo precisa aceitar um segundo conjunto de áreas por etapa. Isso é uma tabela `b2b_stage_areas` ou um campo `stage` em `b2b_areas`? | Arquitetura de classificação | **Média** |
| H-09 | O campo `exam_date` em `profiles` é `TEXT`. Para o B2B, datas de prova precisam de precisão (cálculo de período letivo). Devo padronizar como `DATE` em novas tabelas? | Consistência de dados longitudinais | Baixa |
| H-10 | Sem framework de testes instalado (confirmado na ESPEC). Os testes das fórmulas B2B (`lib/b2b/formulas.ts`) devem ser escritos com qual ferramenta? Vitest? O Mario quer instalar um pacote ou prefere testes inline com `console.assert`? | P03 depende disso (Regra 9: fórmulas testadas) | **Média** |
