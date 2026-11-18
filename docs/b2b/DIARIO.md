# MedPleni B2B — Diário de Desenvolvimento

Formato de cada entrada:
> **Data · Prompt · Resumo**  
> Arquivos criados/alterados · SQL a rodar · Como testar · Pendências · Dúvidas

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
