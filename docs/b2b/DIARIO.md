# MedPleni B2B — Diário de Desenvolvimento

Formato de cada entrada:
> **Data · Prompt · Resumo**  
> Arquivos criados/alterados · SQL a rodar · Como testar · Pendências · Dúvidas

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

### Arquivos criados / alterados

- `platform/supabase/b2b/001_instituicoes.sql` (criado)
- `platform/supabase/b2b/002_seed_demo.sql` (criado)
- `platform/supabase/b2b/002_seed_demo_down.sql` (criado)
- `platform/lib/b2b/types.ts` (criado)
- `platform/lib/b2b/auth.ts` (criado)
- `platform/lib/b2b/__tests__/auth.test.ts` (criado)
- `platform/vitest.config.mjs` (criado)
- `platform/package.json` (atualizado com vitest, vite e script `"test"`)
- `docs/b2b/TESTE-RLS.md` (criado)
- `docs/b2b/DIARIO.md` (atualizado)

### SQL a rodar

1. `platform/supabase/b2b/001_instituicoes.sql` (criar as tabelas e políticas RLS)
2. `platform/supabase/b2b/002_seed_demo.sql` (popular a faculdade demo com 240 alunos para desenvolvimento)
3. (*Opcional para remoção*) `platform/supabase/b2b/002_seed_demo_down.sql`

### Como testar

- Testes unitários de regras puras: `cd platform && npm test` (16/16 testes aprovados)
- Verificação de tipos TypeScript: `cd platform && npx tsc --noEmit`
- Testes práticos de RLS: executar as consultas do arquivo `docs/b2b/TESTE-RLS.md` no SQL Editor do Supabase.

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
