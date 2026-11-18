# MedPleni B2B — Diário de Desenvolvimento

Formato de cada entrada:
> **Data · Prompt · Resumo**  
> Arquivos criados/alterados · SQL a rodar · Como testar · Pendências · Dúvidas

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
  - `platform/supabase/b2b/001_core_tables.sql`: tabelas core multi-tenant (`b2b_institutions`, `b2b_institution_config`, `b2b_members`, `b2b_classes`, `b2b_class_members`, `b2b_audit_logs`), políticas RLS e seed da faculdade demo.
  - `platform/supabase/b2b/002_areas_seed.sql`: criação da tabela `b2b_areas` e seed das 7 áreas oficiais INEP.
- **Validação:** `npx tsc --noEmit` completado sem erros e `npm run build` gerando 100% das 42 rotas com sucesso.

### Arquivos criados / alterados

- `platform/lib/supabase/admin.ts` (alterado: BUG-01 e BUG-02)
- `platform/lib/supabase/profile.ts` (alterado: INC-01)
- `platform/lib/constants.ts` (criado: constantes canônicas de áreas)
- `platform/supabase/b2b/000_pre_b2b_fixes.sql` (criado)
- `platform/supabase/b2b/001_core_tables.sql` (criado)
- `platform/supabase/b2b/002_areas_seed.sql` (criado)
- `docs/b2b/DIARIO.md` (atualizado)

### SQL a rodar

- `000_pre_b2b_fixes.sql` (já executado pelo Mario)
- `001_core_tables.sql` (já executado pelo Mario)
- `002_areas_seed.sql` (disponível para execução caso deseje popular a tabela `b2b_areas`)

### Como testar

- Compilação limpa via `npx tsc --noEmit`
- Build completo de produção via `npm run build`

---

## 2026-11-18 · P00 · Reconhecimento

### O que foi feito

Leitura completa do código-base sem alterar nenhum arquivo de código ou banco. Produzido o documento de reconhecimento `docs/b2b/RECONHECIMENTO.md` cobrindo os 8 pontos solicitados:

- **Autenticação e sessão:** fluxo completo com `middleware.ts`, `lib/supabase/middleware.ts`, `server.ts`, `client.ts`, `use-user.ts`. O papel (`profiles.role`) vem do banco após o login; o middleware não verifica papel — só autenticação. Guard de papel é client-side no layout do admin.
- **Esquema real das tabelas:** levantadas `profiles`, `questions`, `question_options`, `user_answers`, `simulations`, `user_simulations` com todos os problemas encontrados (ver seção b do RECONHECIMENTO.md).
- **Listas de áreas hardcoded:** mapeadas em 14 arquivos com contagens de 5, 6, 7 ou 16 áreas — nenhuma autoritativa.
- **Componentes de layout e UI:** `PageShell`, `Sidebar`, `Topbar`, `BottomNav`, `MobileDrawer` + 9 componentes de UI. Tema via variáveis CSS + `data-theme` no `<html>`.
- **SQL e ambientes:** sem migrations, sem staging — tudo manual via SQL Editor do Supabase. Único projeto de produção.
- **Riscos B2C:** 8 riscos identificados com estratégia de isolamento por prefixo de pasta e RLS multi-tenant.
- **Plano técnico P01–P04:** tabelas, pastas e convenções definidas, coerentes com seção 0 da ESPEC.
- **Dúvidas:** 10 perguntas para o Mario (H-01 a H-10), 3 de alta urgência (staging, constraints de role, cenários INEP, institution_id em questions).

### Arquivos criados

- `docs/b2b/RECONHECIMENTO.md` (documentação, sem código)
- `docs/b2b/DIARIO.md` (este arquivo)

### SQL a rodar

Nenhum nesta etapa.

### Como testar

Não aplicável — P00 é somente leitura e documentação.

### Pendências abertas

- Aguardar respostas do Mario para H-01 a H-10 antes de iniciar P01.
- Prioridade: H-01 (staging), H-02 (constraints de role), H-03 (cenários INEP), H-04 (institution em questions).

### Dúvidas

Ver seção h do `RECONHECIMENTO.md` — 10 itens catalogados.
