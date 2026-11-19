# Relatório de Auditoria de Rótulos e Diretrizes Pedagógicas B2B (P23)

**Data:** 19/11/2026  
**Referência:** `docs/b2b/ESPEC-B2B.md` (Seções 0, 1 e 4), Votos Médicos da Central de Aprovações (RE-01, RE-02, RE-03).  
**Escopo Auditado:** Todos os módulos institucionais em `platform/app/instituicao/**`, `platform/components/b2b/**` e `platform/lib/b2b/**`.

---

## 1. Resumo Executivo da Auditoria

Em conformidade com a Especificação B2B e o objetivo B do prompt P23, foi realizada uma varredura automatizada e manual em todo o código-fonte do módulo institucional. Todos os desvios identificados foram sanados e validados por suítes de testes automatizados e compilação de produção do Next.js.

| Diretriz Auditada | Critério Estabelecido | Situação Prévia | Correção Realizada | Status Final |
|---|---|---|---|---|
| **Base / Período / Fonte** | Todo indicador e painel analítico deve exibir rodapé padronizado | Ausente em algumas telas auxiliares | Adicionado rodapé padronizado em todas as rotas com indicadores | **100% Conforme** |
| **Nomenclatura de Desempenho** | Proibido chamar percentual de acerto de "nota ENAMED" | Verificada ausência | Rótulos padronizados como "Aproveitamento médio (%)", "Percentual de acerto" ou "Média da coorte" | **100% Conforme** |
| **Eliminação de Emojis** | Proibido o uso de emojis na interface B2B | 53 emojis encontrados em 13 arquivos | Substituídos por ícones SVG vetoriais (Lucide) ou texto neutro | **100% Conforme (0 emojis)** |
| **Termo "Programática"** | Proibido na interface; o módulo chama-se "Avaliação longitudinal" | Ausente em interfaces | Mantido exclusivamente em testes automatizados que atestam a proibição | **100% Conforme** |
| **Papel "Tutor" / Termo "Tutoria"** | Reprovado pelos médicos (função transferida à coordenação/docente) | Encontrado "orientação tutorial" e "tutoria" em 2 arquivos | Corrigido para "orientação pedagógica" e "mentoria clínica / reforço" | **100% Conforme** |
| **Aviso "Não fazemos predição"** | RE-03 reprovada pelos médicos ("Podemos vender algum tipo de previsão") | Verificada ausência | Removido qualquer aviso negativo de "não predição"; preservado apenas o aviso metodológico do indicador de prontidão | **100% Conforme** |
| **Régua de Corte Configurável** | O corte não pode ser fixo no código; vem de `cut_score` (padrão 60%) | Alguns componentes usavam `60` fixo em texto | Integrado à configuração institucional `cut_score` e zona de decisão `[51, cut_score]` | **100% Conforme** |

---

## 2. Detalhamento das Verificações por Diretriz

### 2.1. Toda tela com indicador tem Base / Período / Fonte
A regra permanente nº 6 da Especificação B2B estipula que nenhum indicador pode ter dados inventados e que todo bloco de métricas deve carregar a fundamentação amostral.

**Telas Auditadas e Padronizadas:**
1. `/instituicao` (Visão Executiva):
   - `Base: N alunos presentes · Período: 2026.1 · Fonte: Prova Simulado ENAMED`
2. `/instituicao/turmas` (Lista e Dispersão Institucional):
   - `Base: N estudantes acompanhados (X turmas) · Período: 2026.1 · Fonte: Provas aplicadas, simulados ENAMED e telemetria de treino`
3. `/instituicao/turmas/[id]` (Detalhe da Turma, Áreas/Cenários e Dispersão):
   - `Base: N estudantes avaliados na turma · Período: 2026.1 · Fonte: Provas e simulados aplicados com folhas de resposta e correção online`
4. `/instituicao/acompanhamento` (Acompanhamento e Sessões Atípicas):
   - `Base: N estudantes acompanhados (X turmas) · Período: 2026.1 · Fonte: Provas aplicadas, telemetria de treino e registros pedagógicos`
   - Painel de sessões atípicas: `Base: Sessões de prática e prova · Fonte: Telemetria de Respostas (user_answers & assessment_attempts)`
5. `/instituicao/longitudinal` (Mapa Currículo × Eixo, Trilha e Planos):
   - `Base: Matriz curricular de 12 períodos acompanhados longitudinalmente · Período: 2026.1 · Fonte: Provas somativas, simulados ENAMED e planos de acompanhamento`
6. `/instituicao/intervencoes` (Listas e Pré/Pós-aula):
   - `Base: N intervenções registradas · Período: 2026.1 · Fonte: Listas de exercícios no Praticar e Provas Pré/Pós-aula`
7. `/instituicao/professores` (Engajamento Docente):
   - `Base: Membros com papel docente e escopos ativos · Período: Semestre Letivo Atual · Fonte: Gestão de Acessos e Auditoria MedPleni`
8. `/instituicao/prontidao` (Prontidão Acadêmica):
   - `Base: N estudantes avaliados · Período: 2026.1 · Fonte: MedPleni Prontidão Pedagógica por Regras`
9. `/instituicao/regua-enamed` (Posicionamento em 3 Etapas):
   - `Base: N estudantes acompanhados (X turmas) · Período: 2026.1 · Fonte: Provas, simulados aplicados e intervenções pedagógicas ativas`
10. `/instituicao/turmas-provas`, `/instituicao/cobertura-matriz` e `/instituicao/relatorios`:
   - Todas complementadas com rodapé padronizado referenciando a matriz canônica, DCNs e instâncias institucionais (NDE / CPA).
11. `/instituicao/aluno` (Portal do Estudante):
   - `Base: Avaliações institucionais finalizadas e sessões de estudo individual · Fonte: MedPleni Avaliações B2B + Plataforma de Treino B2C`

---

### 2.2. Nenhuma tela chama percentual de acerto de "nota ENAMED"
- **Varredura:** `grep -rn -i "nota.*enamed"`
- **Resultado:** Zero ocorrências na interface do usuário.
- **Rótulos Oficiais Aplicados:**
  - "Percentual de Acerto (%)"
  - "Aproveitamento Médio (%)"
  - "Média da Turma / Coorte (%)"
  - "Resultado no Simulado (%)"
- Apenas nos comentários de código do cálculo de prontidão e testes existe a menção expressa de que o indicador *não* deve ser confundido com nota ENAMED ou cálculo por TRI.

---

### 2.3. Eliminação Total de Emojis na Interface
A Especificação B2B (Seção 0, Regra 8) proíbe emojis na interface. Uma varredura identificou 53 emojis inseridos em protótipos anteriores. Todos foram substituídos por ícones SVG estruturados ou tags textuais limpas:

| Arquivo | Emoji Encontrado | Substituição Implementada |
|---|---|---|
| `VisaoExecutivaClient.tsx` | 📊, 🎯, 📄, 🔍, 🚨, ⚠️ | Links textuais limpos, setas SVG, badges "Crítico" e "Atenção" |
| `BancoClient.tsx` | 📥, 📷 | "Importar Arquivo", "Com Imagem" |
| `ImportarClient.tsx` | 📄, 📊, 📑 | "Modelo DOCX", "Modelo Planilha XLSX", "Modelo CSV" |
| `ProntidaoClient.tsx` | 💾, ℹ️, 📐, 📋 | Botão com SVG disquete, SVG info, SVG régua, cabeçalho de regras limpo |
| `AcompanhamentoClient.tsx` | 📝, 🎯 | Aspas simples sem emoji, badge "Meta Semanal de Questões" |
| `AtypicalSessionsView.tsx` | 📐 | Título vetorial "Regras Matemáticas de Classificação por Sessão" |
| `TurmaDetalheClient.tsx` | 🔒 | Ícone SVG de cadeado (aviso de privacidade e dados individuais) |
| `MotorClient.tsx` | 📊, ⚡, 🔍, 📚 | Abas textuais limpas |
| `AlunoPortalClient.tsx` | 🎯, 📈, 🩺, 📝, 💡, ✍️, 🔍, 🔒, 📖 | Abas e cartões limpos com ícones SVG funcionais |
| `AlunoDevolutivaClient.tsx` | 👁 | Texto limpo "Visualizando devolutiva pedagógica..." |
| `ProvasClient.tsx` | 📷 | Badge "Com Imagem" |
| `CorrecaoClient.tsx` | 📄, 📷 | Botão "Imprimir Cadernos" e SVG câmera no upload de lote |
| `ResultadoClient.tsx` | 📥, 📖, 📘, 🚫, ⚠️, ❌, 🔄, 🔒 | Botões textuais, badges "Amostra Insuficiente", "Anulação de Item", "Gabarito Retificado" |
| `ConfiguracoesClient.tsx` | ℹ️ | Texto de orientação institucional sem emoji |
| `monitoring.ts` | 📋, 📊, ⚠️, 👤, 🔒, 📌 | Relatório de texto puro sem emojis, com marcação Markdown clara |

---

### 2.4. A palavra "programática" não aparece; "Tutor" não aparece
- **"Programática":** O termo foi banido da interface (função AP-01, P20). A rota e o título oficial são **"Avaliação longitudinal"**. A ausência do termo é garantida por teste unitário estrito (`platform/lib/b2b/__tests__/longitudinal.test.ts`).
- **"Tutor" / "Tutoria":**
  - Em `AtypicalSessionsView.tsx`: alterado de "orientação tutorial" para "orientação pedagógica pela coordenação".
  - Em `LongitudinalClient.tsx`: alterado de "tutoria" para "mentoria clínica, lista de exercícios ou revisão prática".

---

### 2.5. Função RE-03 reprovada: Retirada de avisos "Não fazemos predição"
- No voto sobre a função RE-03, os médicos deliberaram que a plataforma não deve carregar mensagens negativas dizendo "não fazemos predição de nota".
- Qualquer texto com essa conotação negativa foi removido.
- O que permanece é unicamente a nota metodológica transparente exigida para o Indicador de Prontidão (P22), que descreve as regras de volume e consistência sem prometer nota oficial nem falsa precisão.

---

### 2.6. Régua de corte configurável da instituição
- A linha de corte de referência padrão é 60% (`cut_score`), mas não está codificada de forma rígida (*hardcoded*).
- O valor é lido de `institution.cut_score` (ou `institution.settings.cut_score`), refletindo dinamicamente em:
  - Alertas automáticos (< `cut_score`).
  - Zona de Decisão (faixa entre 51% e `cut_score`).
  - Cores dos gráficos e tabelas de dispersão.
  - Planos de acompanhamento longitudinal.
  - Indicadores e faixas da Régua ENAMED.

---

## 3. Verificação Automatizada

A integridade do código e a conformidade com as diretrizes foram validadas com comandos executados no ambiente:

1. **Varredura Unicode de Emojis:**
   - Script Python de inspeção em `platform/app/instituicao`, `platform/components/b2b` e `platform/lib/b2b`: **ZERO emojis encontrados**.
2. **TypeScript Compiler (`tsc`):**
   - `./platform/node_modules/.bin/tsc --noEmit -p platform/tsconfig.json`: **Zero erros de tipagem**.
3. **Vitest Test Suite:**
   - `vitest run`: **168 testes aprovados em 23 suítes de testes**, incluindo os testes de auditoria de rótulos em `regua-enamed.test.ts` e `longitudinal.test.ts`.
4. **Next.js Production Build:**
   - `npm run build`: Compilação bem-sucedida de todas as 62 rotas estáticas e dinâmicas, incluindo `/instituicao/regua-enamed`.
