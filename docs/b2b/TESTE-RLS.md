# MedPleni B2B — Roteiro de Testes e Validação de RLS (Multi-Tenant Isolation)

**Data:** 18/11/2026  
**Objetivo:** Provar matematicamente e via consultas SQL a eficácia das políticas de Row Level Security (RLS) implementadas em `platform/supabase/b2b/001_instituicoes.sql`.

---

## 1. Personas e IDs de Teste (Baseados no Seed `002_seed_demo.sql`)

| Persona | E-mail / Identificador | UUID do Usuário (`auth.uid()`) | Papel Institucional | Escopo Permitido |
|---|---|---|---|---|
| **Dirigente (FADEP)** | `dirigente@fadep-demo.medpleni.com` | `44444444-4444-4444-4444-444444444444` | `dirigente` | Toda a FADEP (12 turmas, todos alunos) |
| **Docente Ciclo Clínico** | `docente1@fadep-demo.medpleni.com` | `66666666-6666-6666-6666-666666666601` | `docente` | Somente turmas do 7º e 8º período (`class_group_id` 701 e 702) |
| **Aluno 1 (8º Período)** | `aluno.08p.01@fadep-demo.medpleni.com` | `88888888-8888-8888-0800-000000000001` | `aluno` | Apenas a própria matrícula e sua turma 8P |
| **Aluno 2 (8º Período)** | `aluno.08p.02@fadep-demo.medpleni.com` | `88888888-8888-8888-0800-000000000002` | `aluno` | Colega de turma do Aluno 1 |
| **Usuário Externo (Inst. B)** | `externo@outra-faculdade.edu.br` | `99999999-9999-9999-9999-999999999999` | Sem vínculo FADEP | Nenhum dado da FADEP |
| **Superadmin MedPleni** | `mario.nascimentolopes@gmail.com` | `UUID_MARIO` | Superadmin Global | Acesso irrestrito a todas as instituições |

---

## 2. Como Executar as Simulações no SQL Editor do Supabase

No PostgreSQL do Supabase, você pode simular a sessão de qualquer usuário executando um bloco transacional que define as variáveis de sessão JWT (`auth.uid()`):

```sql
BEGIN;
  -- Simula o papel 'authenticated' e o UID desejado
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = 'UUID_DA_PERSONA';
  SET LOCAL "request.jwt.claim.role" = 'authenticated';
  SET LOCAL "request.jwt.claim.email" = 'EMAIL_DA_PERSONA';

  -- Execute sua consulta aqui
  SELECT * FROM public.class_groups;

ROLLBACK; -- Sempre finalize com ROLLBACK para limpar a sessão de teste
```

---

## 3. Roteiro de Testes de Isolamento

### Caso 1: Usuário da Instituição B (ou sem vínculo) tentando ler dados da Instituição A (FADEP)
* **Hipótese:** A RLS deve retornar **0 linhas**.
* **Consulta de Teste:**

```sql
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = '99999999-9999-9999-9999-999999999999';
  SET LOCAL "request.jwt.claim.role" = 'authenticated';
  SET LOCAL "request.jwt.claim.email" = 'externo@outra-faculdade.edu.br';

  -- 1. Tentativa de ler a instituição FADEP
  SELECT id, name, slug FROM public.institutions WHERE slug = 'fadep-demo';
  -- RESULTADO ESPERADO: 0 linhas.

  -- 2. Tentativa de listar turmas da FADEP
  SELECT * FROM public.class_groups;
  -- RESULTADO ESPERADO: 0 linhas.

  -- 3. Tentativa de ver membros da FADEP
  SELECT * FROM public.institution_members;
  -- RESULTADO ESPERADO: 0 linhas.
ROLLBACK;
```

---

### Caso 2: Aluno NÃO pode ler matrícula e dados individuais de outro Aluno
* **Hipótese:** O Aluno 1 só pode enxergar sua própria matrícula em `enrollments`. A consulta para o Aluno 2 deve retornar **0 linhas**.
* **Consulta de Teste:**

```sql
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = '88888888-8888-8888-0800-000000000001'; -- Aluno 1
  SET LOCAL "request.jwt.claim.role" = 'authenticated';
  SET LOCAL "request.jwt.claim.email" = 'aluno.08p.01@fadep-demo.medpleni.com';

  -- 1. Deve retornar apenas 1 linha: sua própria matrícula
  SELECT e.id, e.student_registration, im.user_id 
  FROM public.enrollments e
  JOIN public.institution_members im ON im.id = e.member_id;
  -- RESULTADO ESPERADO: 1 linha (apenas user_id = 88888888-8888-8888-0800-000000000001).

  -- 2. Tentativa forçada de filtrar pelo Aluno 2
  SELECT * FROM public.enrollments e
  JOIN public.institution_members im ON im.id = e.member_id
  WHERE im.user_id = '88888888-8888-8888-0800-000000000002';
  -- RESULTADO ESPERADO: 0 linhas (bloqueado pela função can_see_student).
ROLLBACK;
```

---

### Caso 3: Docente só enxerga turmas dentro do seu escopo (`member_scopes`)
* **Hipótese:** O Docente 1 possui escopo somente no 7º e 8º período (`MED-2027-07P` e `MED-2027-08P`). Ele **não pode ver** as turmas do Internato (11º e 12º períodos).
* **Consulta de Teste:**

```sql
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = '66666666-6666-6666-6666-666666666601'; -- Docente 1
  SET LOCAL "request.jwt.claim.role" = 'authenticated';
  SET LOCAL "request.jwt.claim.email" = 'docente1@fadep-demo.medpleni.com';

  -- Listagem de turmas visíveis para o Docente 1
  SELECT id, period, label FROM public.class_groups ORDER BY period;
  -- RESULTADO ESPERADO: Exatamente 2 linhas (Períodos 7 e 8).
  -- Períodos 1 a 6 e 9 a 12 NÃO DEVEM APARECER.

  -- Tentativa de consultar diretamente uma turma do 12º período
  SELECT * FROM public.class_groups WHERE period = 12;
  -- RESULTADO ESPERADO: 0 linhas.
ROLLBACK;
```

---

### Caso 4: Docente não pode ver aluno matriculado fora de suas turmas
* **Hipótese:** O Docente 1 só pode ver dados individuais de alunos das turmas 7P e 8P. Alunos do 12º período devem ter visibilidade negada pela policy de `enrollments`.
* **Consulta de Teste:**

```sql
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = '66666666-6666-6666-6666-666666666601'; -- Docente 1
  SET LOCAL "request.jwt.claim.role" = 'authenticated';
  SET LOCAL "request.jwt.claim.email" = 'docente1@fadep-demo.medpleni.com';

  -- Consulta alunos do 12º período
  SELECT e.* 
  FROM public.enrollments e
  JOIN public.class_groups cg ON cg.id = e.class_group_id
  WHERE cg.period = 12;
  -- RESULTADO ESPERADO: 0 linhas (Bloqueado pela função security definer can_see_student).

  -- Consulta alunos do 8º período (seu escopo)
  SELECT COUNT(*) 
  FROM public.enrollments e
  JOIN public.class_groups cg ON cg.id = e.class_group_id
  WHERE cg.period = 8;
  -- RESULTADO ESPERADO: 20 linhas (os 20 alunos da turma sob sua responsabilidade).
ROLLBACK;
```

---

### Caso 5: Dirigente possui visão completa da instituição
* **Hipótese:** O Dirigente da FADEP visualiza todas as 12 turmas e todos os 240 alunos, mas não visualiza outras instituições caso existam.
* **Consulta de Teste:**

```sql
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = '44444444-4444-4444-4444-444444444444'; -- Dirigente
  SET LOCAL "request.jwt.claim.role" = 'authenticated';
  SET LOCAL "request.jwt.claim.email" = 'dirigente@fadep-demo.medpleni.com';

  -- Total de turmas visíveis
  SELECT COUNT(*) FROM public.class_groups;
  -- RESULTADO ESPERADO: 12 turmas.

  -- Total de matrículas visíveis
  SELECT COUNT(*) FROM public.enrollments;
  -- RESULTADO ESPERADO: 240 matrículas.
ROLLBACK;
```

---

### Caso 6: Superadmin MedPleni (Acesso Irrestrito para Suporte e Implantação)
* **Hipótese:** O Superadmin MedPleni passa pelo bypass de `is_medpleni_admin()`, enxergando todas as instituições cadastradas.
* **Consulta de Teste:**

```sql
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.role" = 'authenticated';
  SET LOCAL "request.jwt.claim.email" = 'mario.nascimentolopes@gmail.com';

  SELECT COUNT(*) FROM public.institutions;
  -- RESULTADO ESPERADO: Contagem total de instituições cadastradas no banco.
ROLLBACK;
```

---

### Caso 7: Isolamento do Plano "Vazia" no Banco de Questões (P05)
* **Hipótese:** Membro de instituição cujo plano é `'vazia'` NÃO pode ler questões do acervo MedPleni (`b2b_visibility = 'medpleni_public'`), enxergando unicamente itens privados criados pela sua própria instituição.
* **Consulta de Teste:**

```sql
BEGIN;
  -- Supondo que a Instituição B possua plano 'vazia'
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = '99999999-9999-9999-9999-999999999999';
  SET LOCAL "request.jwt.claim.role" = 'authenticated';

  -- Tentativa de ler questões públicas da MedPleni
  SELECT COUNT(*) FROM public.questions
  WHERE b2b_visibility = 'medpleni_public';
  -- RESULTADO ESPERADO: 0 linhas.
ROLLBACK;
```

---

### Caso 8: Isolamento Estrito entre Bancos Privados de Instituições (P05)
* **Hipótese:** A Instituição A NUNCA tem permissão de leitura sobre questões marcadas como `b2b_visibility = 'institution_private'` pertencentes à Instituição B, mesmo que o plano de A seja `'plus'`.
* **Consulta de Teste:**

```sql
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = '66666666-6666-6666-6666-666666666601'; -- Docente da FADEP
  SET LOCAL "request.jwt.claim.role" = 'authenticated';

  -- Tentativa de consultar itens privados de outra instituição
  SELECT id, statement, institution_id 
  FROM public.questions 
  WHERE b2b_visibility = 'institution_private'
    AND institution_id != '11111111-1111-1111-1111-111111111111';
  -- RESULTADO ESPERADO: 0 linhas.
ROLLBACK;
```

---

### Caso 9: Instituição com Plano "Com Acervo" ou "Plus" (P05)
* **Hipótese:** Docente ou Dirigente da FADEP (plano `'plus'`) enxerga o acervo MedPleni publicado (`b2b_visibility = 'medpleni_public' AND b2b_status = 'published'`) e o banco privado da sua instituição, mas não itens em rascunho de outras fontes.
* **Consulta de Teste:**

```sql
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = '66666666-6666-6666-6666-666666666601'; -- Docente da FADEP
  SET LOCAL "request.jwt.claim.role" = 'authenticated';

  SELECT b2b_visibility, b2b_status, COUNT(*)
  FROM public.questions
  GROUP BY b2b_visibility, b2b_status;
  -- RESULTADO ESPERADO: 
  -- medpleni_public: apenas status 'published'
  -- institution_private: apenas institution_id da FADEP
ROLLBACK;
```

---

### Caso 10: Isolamento de Escopo do Docente e Bloqueio à Página Professores (P19)
* **Hipótese:** 
  1. Docente só pode consultar turmas que constam em `member_scopes` (ex: 7º e 8º períodos), retornando 0 linhas para turmas fora do seu escopo (ex: 1º ao 6º ou 9º ao 12º).
  2. Docente NÃO pode ver outros docentes em `institution_members` exceto os que compartilham a mesma turma via `enrollments`.
  3. No front-end e middleware, `/instituicao/professores` redireciona imediatamente qualquer usuário com papel `docente` de volta para `/instituicao`.
* **Consulta de Teste:**

```sql
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = '66666666-6666-6666-6666-666666666601'; -- Docente com escopo P7 e P8
  SET LOCAL "request.jwt.claim.role" = 'authenticated';

  -- 1. Consulta turmas da instituição
  SELECT id, code, period FROM public.class_groups;
  -- RESULTADO ESPERADO: Apenas as 2 turmas atribuídas em member_scopes (P7 e P8).
  -- Turmas P1..P6 e P9..P12 NUNCA aparecem.

  -- 2. Tentativa de forçar consulta direta a turma fora do escopo (ex: P1)
  SELECT * FROM public.class_groups WHERE period = 1;
  -- RESULTADO ESPERADO: 0 linhas.

  -- 3. Tentativa de listar tentativas de alunos de turmas fora do escopo
  SELECT att.id, att.score_percentage
  FROM public.attempts att
  JOIN public.class_groups cg ON cg.id = att.class_group_id
  WHERE cg.period = 1;
  -- RESULTADO ESPERADO: 0 linhas.
ROLLBACK;
```


