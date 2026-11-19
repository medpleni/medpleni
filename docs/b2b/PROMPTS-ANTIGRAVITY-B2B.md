# MedPleni B2B — sequência de prompts para o Antigravity

**Versão 1 · 18/11/2026.** 26 prompts, na ordem. Cada um é independente: cole inteiro, espere terminar, confira o diário e siga para o próximo.

## Antes de começar

1. Copie para o repositório, na pasta `medpleni/docs/b2b/`: `ESPEC-B2B.md`, `medpleni-b2b-prototype.html` e `medpleni-mapa-decisoes-96-funcoes.csv`.
2. Abra o Antigravity na raiz `medpleni/` e crie um branch: `git checkout -b feat/b2b-modulo`.
3. Um prompt por conversa nova. O contexto vem dos arquivos em `docs/b2b/`, não da conversa anterior.
4. Depois de cada prompt: leia a entrada nova em `docs/b2b/DIARIO.md`, rode no SQL Editor do Supabase os arquivos que ele listar e faça o teste manual descrito.
5. Se um prompt terminar com dúvida registrada no diário, responda na mesma conversa antes de avançar.

## Mapa

| Fase | Prompts | Entrega |
|---|---|---|
| 0. Preparação | P00 | Reconhecimento do código, sem alterar nada |
| 1. Fundação | P01–P04 | Instituição, papéis, RLS, menu lateral, implantação, classificação |
| 2. Banco | P05–P07 | Banco B2B, importação em lote, motor de questões |
| 3. Provas | P08–P13 | Modelo de prova, montagem, aplicação online e em papel, correção, análise |
| 4. Gestão | P14–P20 | Visão executiva, turmas, acompanhamento, longitudinal, intervenções, docente, aluno |
| 5. Extras aprovados | P21–P23 | Sessões atípicas, prontidão, Régua ENAMED |
| 6. Fechamento | P24–P25 | Governança/LGPD, QA e roteiro de demonstração |

**Caminho mínimo para um piloto:** P00–P05, P08–P15. O restante pode vir depois sem retrabalho.
**Dependem de material dos médicos:** P04 (cenários, temas, competências), P06 (questões do drive), P22 (parâmetros da prontidão).

---

## P00 — Reconhecimento (não altera código)

```
Você vai começar o desenvolvimento do módulo institucional (B2B) do MedPleni. Neste primeiro passo NÃO altere nenhum arquivo de código nem o banco. Só leia e documente.

Leia, nesta ordem:
1. platform/AGENTS.md e a documentação que ele manda consultar em node_modules/next/dist/docs/
2. docs/b2b/ESPEC-B2B.md (fonte de verdade do módulo; leia inteiro)
3. docs/b2b/medpleni-mapa-decisoes-96-funcoes.csv (votos e comentários dos médicos por função)
4. docs/b2b/medpleni-b2b-prototype.html (referência funcional antiga; onde divergir da especificação, vale a especificação)
5. platform/supabase/*.sql, platform/lib/**, platform/middleware.ts, platform/components/layout/** e platform/components/ui/**, platform/app/globals.css

Produza docs/b2b/RECONHECIMENTO.md com:
a) Como autenticação, sessão e papel (profiles.role) funcionam hoje, com os arquivos envolvidos.
b) Esquema real das tabelas existentes que o B2B vai tocar (profiles, questions, question_options, user_answers, simulations, user_simulations) e os problemas que você encontrar (colunas usadas no código que não existem, áreas em texto livre, ausência de resposta por item).
c) Todas as listas de áreas fixas no código, com arquivo e linha.
d) Componentes de layout e de UI reutilizáveis e como o tema claro/escuro é aplicado.
e) Como o SQL é aplicado hoje e se existe algum ambiente de desenvolvimento separado do de produção. Se não existir, diga isso com clareza.
f) Riscos para o B2C ao introduzir o B2B e como você vai isolá-los.
g) Plano técnico para os prompts P01 a P04 (nomes de tabelas, pastas, convenções), coerente com a seção 0 da especificação.
h) Dúvidas que só o Mario pode responder.

Crie também docs/b2b/DIARIO.md com a primeira entrada (data, "P00 reconhecimento", resumo).

Não instale pacotes. Não rode migrations. Não faça commit de código; apenas dos dois arquivos de documentação.
```

---

## P01 — Estrutura institucional, papéis e RLS

```
Siga docs/b2b/ESPEC-B2B.md (seções 0, 2 e 7) e docs/b2b/RECONHECIMENTO.md.

Objetivo: criar a base multi-instituição do B2B, sem tocar no comportamento do B2C.

Banco (arquivo novo platform/supabase/b2b/001_instituicoes.sql, idempotente, só aditivo):
- institutions (nome, sigla, logo_url, cut_score padrão 60, is_demo, plano contratado, configurações jsonb, ativo)
- courses (instituição, nome)
- academic_terms (instituição, rótulo como "2027.1", início, fim)
- class_groups = turmas (curso, período do curso de 1 a 12, rótulo, termo)
- institution_members (instituição, user_id, papel: dirigente | coordenador | docente | aluno, ativo). Um usuário pode ter papéis em mais de uma instituição.
- member_scopes (membro, curso ou turma) para limitar coordenador a cursos e docente a turmas
- enrollments (aluno, turma, RA, situação, datas)
- individual_access_log (quem viu, qual aluno, qual tela, quando)
- Funções SQL security definer para usar nas políticas: is_member(inst), has_role(inst, papéis[]), can_see_student(aluno).
- RLS em todas: membro só enxerga a própria instituição; aluno só os próprios dados; docente só as turmas do seu escopo; dirigente e coordenador conforme a tabela de papéis da especificação; admin MedPleni (profiles.role admin ou superadmin) enxerga tudo.
- NÃO altere o CHECK nem os valores de profiles.role. O papel institucional mora em institution_members.

Código:
- lib/b2b/auth.ts: funções de servidor para obter instituição ativa, papel e escopo do usuário; guarda que redireciona quem não é membro.
- lib/b2b/types.ts com os tipos.
- Seed em platform/supabase/b2b/002_seed_demo.sql: "Faculdade Demonstração" (is_demo), 1 curso, turmas do 1º ao 12º período, cerca de 240 alunos com nomes fictícios, 1 dirigente, 2 coordenadores, 8 docentes. Só dados inventados. O seed precisa poder ser removido por um script 002_seed_demo_down.sql.

Testes: adicione vitest como devDependency e crie testes para as funções puras de lib/b2b. Escreva em docs/b2b/TESTE-RLS.md um roteiro de consultas SQL que provam o isolamento (usuário da instituição A não lê nada da B; aluno não lê outro aluno; docente não lê turma fora do escopo).

Critérios de aceite: build e lint passam; B2C inalterado; roteiro de RLS escrito; diário atualizado com o SQL a rodar.
```

---

## P02 — Casca do módulo: rota, menu lateral e padrões de tela

```
Siga docs/b2b/ESPEC-B2B.md (seções 0, 2 e 4) e o diário.

Objetivo: criar a área /instituicao com navegação por papel e os componentes-padrão que todas as telas vão usar. Ainda sem dados reais nas páginas.

Direção de interface, decidida pelos médicos: telas limpas e elegantes, com pouca informação por tela; índice no lado esquerdo em que cada item abre uma tela; cores calmas; fácil de navegar; sem "cara de IA". Referências que eles citaram: SPR Med e Qstione. Use o design system e os temas claro e escuro que já existem no projeto. A decisão visual fina é sua, dentro desses limites; não copie nenhuma das referências.

Faça:
- app/instituicao/layout.tsx com guarda de acesso (lib/b2b/auth), menu lateral, topo com nome da instituição, seletor de instituição (para quem tem mais de uma) e alternância de tema.
- Menu por papel. Dirigente e coordenador: Visão geral, Turmas, Acompanhamento, Provas, Banco de questões, Avaliação longitudinal, Intervenções, Professores, Relatórios, Configurações. Docente: Início, Minhas turmas, Provas, Banco de questões. Aluno: Início, Minhas avaliações, Praticar, Minha evolução. Itens ainda não construídos aparecem como "em construção" só para admin MedPleni e ficam ocultos para os demais.
- components/b2b/: PageHeader (título, subtítulo, ações), FiltersBar (turma, período, prova, intervalo de datas, persistidos na URL), IndicatorFootnote (Base / Período / Fonte, obrigatório em todo indicador), EmptyState ("sem dados", nunca número fictício), ScoreBand (as 4 faixas: até 50, 51–60, 61–70, 71 ou mais, lendo o corte da instituição), DataTable ordenável com exportação CSV, IndividualDataNotice (aviso de dado individual que registra o acesso em individual_access_log).
- Regra de layout verificável: nenhuma página com mais de 5 blocos principais.
- Responsivo: utilizável em notebook e tablet; no celular, menu em gaveta.
- Acesso: quem não é membro de nenhuma instituição não vê nada do B2B e é levado ao painel B2C normal.

Critérios de aceite: logado como cada papel da instituição demo, o menu correto aparece; tema claro e escuro funcionam; nenhuma rota B2C mudou; build e lint passam.
```

---

## P03 — Implantação: estrutura acadêmica, matrículas e usuários

```
Siga docs/b2b/ESPEC-B2B.md (seções 0 e 2). Função aprovada GO-01; papéis conforme a seção 2 (sem Tutor).

Objetivo: permitir que uma instituição seja colocada no ar sem mexer no banco à mão.

Faça em /instituicao/configuracoes:
- Estrutura: cursos, termos letivos e turmas (criar, editar, arquivar).
- Matrículas: importação por CSV (nome, e-mail, RA, turma) com pré-visualização, validação linha a linha, relatório de erros para baixar e confirmação antes de gravar. Reimportar o mesmo arquivo não duplica ninguém.
- Usuários e papéis: listar, convidar por e-mail (reaproveite a infraestrutura de convites e de e-mail existente, sem alterar o fluxo atual do B2C), definir papel e escopo (cursos do coordenador, turmas do docente), desativar.
- Parâmetros da instituição: corte de referência (padrão 60), logo para os PDFs, alertas de engajamento (todos desligados por padrão), meta semanal de questões (desligada por padrão).
- Checklist de implantação com o que falta para a instituição estar pronta.
- Área de admin MedPleni em /instituicao/admin: criar instituição, definir plano contratado (vazia, com acervo, plus), entrar como suporte em qualquer instituição com registro em log.

Regras: só dirigente e admin MedPleni alteram papéis; coordenador gerencia turmas e matrículas dos seus cursos. Nenhum e-mail real é enviado na instituição demo.

Critérios de aceite: importar um CSV de 200 alunos fictícios em menos de 1 minuto com relatório correto de erros; convite cria o vínculo certo; build e lint passam.
```

---

## P04 — Classificação: Área, Cenário, Tema, Competência

```
Siga docs/b2b/ESPEC-B2B.md (seções 0 e 3) e a lista de áreas fixas levantada em docs/b2b/RECONHECIMENTO.md.

Objetivo: substituir áreas em texto livre por uma classificação única e editável, sem quebrar o B2C.

Banco (platform/supabase/b2b/003_taxonomia.sql):
- tax_areas (7 áreas do INEP, com código, nome, ordem, etapa do ENAMED a que se aplica; deixe o modelo aceitar um segundo conjunto para a 1ª etapa/ciclo básico, ainda vazio)
- tax_cenarios, tax_temas (ligado a uma área; aceita hierarquia de dois níveis), tax_competencias. Todas com código, nome, ativo, versão.
- question_classification (questão, área, cenário, tema, competência, dificuldade: facil | media | dificil, classificado_por, confirmado_por, origem da sugestão: humano | ia).
- Tabela de mapeamento de-para entre os textos antigos de questions.area/subarea e as novas áreas. NÃO apague nem renomeie as colunas antigas.
- Seed só das 7 áreas. Cenários, temas e competências ficam vazios: os médicos ainda vão entregar as listas.

Código:
- /instituicao/admin/classificacao (admin e editor MedPleni): CRUD das quatro listas, importação e exportação por CSV, versão e histórico.
- lib/b2b/taxonomy.ts como único ponto de leitura das listas. Qualquer tela nova do B2B usa essa função; nenhuma lista fixa.
- Relatório de quantas questões existentes ficaram sem área mapeada.
- Não refatore as telas do B2C agora; apenas registre no diário onde elas ainda usam listas fixas.

Pergunte ao Mario, antes de terminar, o caminho do arquivo com as áreas e cenários do INEP enviado pelo Dr. Filipe; se ele fornecer, importe os cenários.

Critérios de aceite: quatro listas editáveis; importação CSV idempotente; questões antigas mapeadas para as 7 áreas com relatório das exceções; build e lint passam.
```

---

## P05 — Banco de questões institucional

```
Siga docs/b2b/ESPEC-B2B.md (seções 0, 3 e 4.6). Funções aprovadas: QB-01, QB-05, QB-06, QB-07, QB-10, QB-12, QB-15; ajustes QB-03 e QB-04.

Objetivo: o banco de questões dentro de /instituicao/banco.

Banco (004_banco.sql, aditivo):
- Em torno de questions: visibilidade (acervo MedPleni | privada da instituição), instituição dona, status (rascunho, em revisão, aprovada, publicada, retirada), origem (instituicao_nome, ano; rótulo exibido só como "Instituição-ano" ou "ano"), proveniência e licença por fonte, tem_imagem, versões da questão, uso em provas, contestações.
- Revisão em UMA etapa: um revisor aprova ou devolve com comentário.
- Regra de conteúdo: questão de terceiros só pode ser publicada na forma reescrita; o item de origem fica guardado, com proveniência, e nunca aparece para instituição.

Telas:
- Visão geral: quantas publicadas, em revisão, por área; mapa área × cenário mostrando só a quantidade (sem meta por célula).
- Explorar: busca e filtros por área, cenário, tema, competência, dificuldade, origem, ano, com ou sem imagem, status, já usada em prova.
- Ficha da questão: enunciado, alternativas, gabarito, comentário/devolutiva, referência, classificação, origem, desempenho histórico (facilidade e ponto-bisserial quando houver dados), versões, provas em que foi usada.
- Nova questão (docente): formulário com os quatro eixos, dificuldade e comentário obrigatório; vai para revisão.
- Fila de revisão única; revisor vê todas as áreas, com caixa "só minha área".
- Acesso: instituição com plano "com acervo" ou "plus" enxerga todo o acervo MedPleni publicado e o seu banco privado; plano "vazia" enxerga só o privado. Uma instituição nunca enxerga o banco privado de outra.

Critérios de aceite: RLS cobre a regra de acesso (teste no roteiro de RLS); filtros combinados respondem rápido com 30 mil questões (crie índices e meça com dados fictícios); build e lint passam.
```

---

## P06 — Importação em lote de questões e de provas

```
Siga docs/b2b/ESPEC-B2B.md (seções 0, 3 e 4.6). Funções: PR-15 (importar prova própria), tarefa "inserir as 1.000+ questões do drive", PR-05 (dificuldade sugerida por IA).

Objetivo: trazer questões de arquivos para o banco com conferência humana.

Faça em /instituicao/banco/importar:
- Entrada: DOCX, PDF com texto, XLSX e CSV. Publique um modelo de planilha e um modelo de DOCX.
- Etapas: envio → extração para uma área de preparação (staging) → tela de conferência lado a lado (original × extraído) → classificação → envio para revisão. Nada entra publicado direto.
- Extração: enunciado, alternativas, gabarito, comentário, imagens e tabelas. Se o gabarito não for encontrado, a questão fica marcada como pendente.
- Detecção de duplicata por similaridade de enunciado, com aviso.
- Classificação assistida: a IA (use o cliente de IA que já existe no projeto) sugere área, cenário, tema, competência e dificuldade, com justificativa curta. O humano confirma ou corrige; a sugestão nunca é gravada como confirmada. Registre a taxa de acerto das sugestões para calibragem.
- Importar prova inteira: mesmo fluxo, gerando ao final uma prova em rascunho com as questões na ordem do arquivo.
- Lote grande em segundo plano, com barra de progresso e relatório final (importadas, pendentes, duplicadas, com erro).

Peça ao Mario o caminho da pasta com as questões dos médicos para usar como caso de teste real em ambiente local. Não envie esse conteúdo para nenhum serviço além do provedor de IA já configurado.

Critérios de aceite: um lote de 1.000 questões é processado com relatório; nenhuma questão é publicada sem passar pela revisão; build e lint passam.
```

---

## P07 — Motor de produção de questões (piloto)

```
Siga docs/b2b/ESPEC-B2B.md (seções 0, 3 e 4.6). Funções aprovadas: QB-08, QB-09, QB-13, QB-14; tarefa do grupo "motor com guia do INEP + referência nacional por tema + validação por amostragem".

Objetivo: piloto controlado de geração de questões, restrito a editor e admin MedPleni, em /instituicao/admin/motor.

Faça:
- Cadastro de insumos: guia de elaboração de itens do INEP (arquivo que o Mario vai fornecer) e, por tema, um ou mais documentos de referência nacional.
- Três modos: (1) questão nova a partir de tema + competência + dificuldade + referência; (2) devolutiva → questão original, gerando 1 ou 2 questões a partir do comentário de uma questão existente; (3) reescrita de questão de terceiros, guardando o vínculo com a origem.
- Cada geração registra modelo, prompt, insumos, custo estimado e autor.
- Checagens automáticas antes da revisão: uma única alternativa correta, alternativas de tamanho parecido, sem "todas as anteriores", comando claro, referência citada, similaridade com a origem abaixo de um limite na reescrita.
- Tudo que o motor gera entra como rascunho e passa pela revisão única. A IA sugere; não altera nem publica sozinha.
- Validação por amostragem: lote gerado → sorteio de uma porcentagem configurável para revisão médica → lote só é liberado para a fila normal se a taxa de aprovação da amostra passar do limite configurado. Painel com taxa de aprovação por tema e por modo.

Limites: sem geração em massa neste prompt. Comece com um tema escolhido pelos médicos e lotes de até 20.

Critérios de aceite: os três modos funcionam para um tema; rastreabilidade completa de cada questão gerada; build e lint passam.
```

---

## P08 — Modelo de prova: caderno fixo e resposta por item

```
Siga docs/b2b/ESPEC-B2B.md (seções 0 e 4.1) e os problemas de simulado descritos em docs/b2b/RECONHECIMENTO.md.

Objetivo: o modelo de dados de avaliação do B2B. É a base de toda a análise; faça com cuidado. Não reutilize as tabelas simulations/user_simulations do B2C; crie as do B2B ao lado.

Banco (005_avaliacoes.sql):
- assessments: instituição, título, tipo (prova_regular, simulado_enamed_4, simulado_enamed_8, simulado_enamed_12, pre_aula, pos_aula), modalidade (papel, hibrida, online), status (rascunho, em_revisao, aprovada, publicada, aplicada, corrigida), datas, duração, autor, coautores (edição compartilhada), matriz planejada (jsonb), par pré/pós quando houver.
- assessment_versions: caderno fixo e versionado. Depois de publicado, o caderno não muda; correção de erro gera nova versão ou anulação de item.
- assessment_items: versão, ordem, questão, cópia congelada do enunciado, das alternativas e do gabarito no momento da publicação, situação (válido, anulado), peso.
- assessment_forms: versões embaralhadas (A, B, C…) com o mapa de embaralhamento de questões e alternativas.
- assessment_targets: turmas e alunos convocados.
- attempts: aluno, prova, forma, modalidade, início, fim, situação (não iniciou, em andamento, finalizada, ausente).
- attempt_answers: tentativa, item, alternativa marcada (já convertida para a ordem do caderno-base), correta, tempo no item quando online, origem (online, folha lida, digitação).
- attempt_events: eventos de sessão online (entrada, saída, troca de aba, retorno a uma questão), para uso futuro.
- Views ou funções para nota por aluno e por turma, sempre excluindo itens anulados e contando em branco como erro.
- RLS conforme os papéis. Aluno nunca lê gabarito antes da liberação.

Código: lib/b2b/assessments.ts com as operações (criar, publicar congelando o caderno, anular item, gerar formas embaralhadas) e testes das regras de nota.

Critérios de aceite: publicar congela o conteúdo; anular um item recalcula todas as notas; alternativa marcada em forma embaralhada é registrada corretamente no caderno-base (teste automatizado); build e lint passam.
```

---

## P09 — Montagem da prova

```
Siga docs/b2b/ESPEC-B2B.md (seções 0, 4.1 e 4.6). Funções: PR-01 a PR-06, voto SPR nº 11.

Objetivo: /instituicao/provas com a lista e o assistente de nova prova.

Faça:
- Lista de provas com status; dirigente enxerga todas.
- Assistente em 4 passos:
  1. Definição: título, tipo (incluindo Simulado ENAMED 4º, 8º e 12º período), turmas, data, duração, modalidade.
  2. Matriz: quantidade de questões por área (e, opcionalmente, por cenário, tema e competência), curva de dificuldade editável (fácil, média, difícil) e cota de questões com imagem.
  3. Seleção assistida: a plataforma propõe questões que cumprem a matriz; o professor troca, remove e busca no banco com os filtros de origem (inédita ou de banca), banca e ano; aviso de questão já aplicada à mesma turma.
  4. Revisão única e publicação: checagens automáticas (matriz cumprida, gabaritos preenchidos, sem duplicata), envio a um revisor, aprovação e publicação com geração das formas embaralhadas.
- Edição compartilhada: convidar outros professores como coautores.
- Para os tipos Simulado ENAMED, pré-carregar a matriz com a distribuição por área da referência do INEP para aquela etapa quando ela estiver cadastrada; caso contrário, matriz em branco com aviso.
- Calendário de simulados prontos da MedPleni (só simulados): admin MedPleni publica um simulado-modelo por mês e a instituição o adota com um clique, criando a prova a partir do modelo.
- Duplicar prova existente.

Critérios de aceite: montar uma prova de 100 questões em poucos minutos; a matriz aparece cumprida ou com as lacunas indicadas; build e lint passam.
```

---

## P10 — Aplicação online e híbrida

```
Siga docs/b2b/ESPEC-B2B.md (seções 0 e 4.1). Funções aprovadas: PR-12 (híbrida) e PR-13 (online).

Objetivo: o aluno responder a prova.

Faça:
- Online: tela de prova em /instituicao/aluno/prova/[id], uma questão por vez com navegação, marcar para revisar, cronômetro da prova, salvamento a cada resposta, retomada após queda de conexão, envio final com confirmação. Registre o tempo por item e os eventos de sessão em attempt_events. Janela de aplicação e tolerância configuráveis. Forma embaralhada sorteada por aluno.
- Híbrida: o aluno recebe o caderno em papel e lança só as respostas num cartão digital, acessado por link ou código curto da prova mais RA, no celular. Mesma gravação em attempt_answers.
- Painel de aplicação para o professor: quem iniciou, quem finalizou, quem está ausente; encerrar aplicação; reabrir para um aluno com justificativa registrada.
- Depois de encerrada: liberação de gabarito e de comentários ao aluno somente quando o professor liberar.
- Acessibilidade: tempo adicional por aluno.

Fora deste prompt: modo de prova seguro com bloqueio de tela (não foi votado).

Critérios de aceite: 100 alunos fictícios simultâneos sem perda de resposta (teste de carga simples em ambiente local); queda de conexão não perde o que foi marcado; build e lint passam.
```

---

## P11 — Prova em papel: caderno, folha de respostas com QR e leitura

```
Siga docs/b2b/ESPEC-B2B.md (seções 0 e 4.1). Funções aprovadas e marcadas como essenciais: PR-07 e PR-11. Scanner é o ideal; foto do celular é aceitável.

Objetivo: imprimir e corrigir prova em papel com o mínimo de trabalho manual.

Etapa A, investigação curta (registre em docs/b2b/DECISAO-LEITURA-OPTICA.md antes de implementar): compare ao menos duas abordagens de leitura da folha (processamento no servidor e no navegador) quanto a precisão, custo, tempo por folha e dependências novas. Recomende uma e peça o ok do Mario antes de instalar qualquer dependência pesada.

Etapa B, implementação:
- PDF do caderno por forma (A, B, C…) com logo da instituição, cabeçalho e numeração.
- PDF das folhas de respostas, uma por aluno, com QR único (prova + forma + aluno), marcas de registro nos cantos e bolhas A–E. Layout pensado para leitura, testado em impressão comum.
- Leitura: envio de um PDF multipágina vindo do scanner ou de várias fotos. Para cada folha: localizar marcas, ler QR, ler bolhas, detectar dupla marcação e em branco, calcular confiança.
- Tela de conferência: só as folhas e as questões com baixa confiança pedem intervenção; imagem recortada ao lado do valor lido; correção com um clique.
- Alternativa manual: digitação rápida do gabarito do aluno pelo teclado, para quando a leitura falhar.
- Folha sem QR legível vai para uma fila de identificação manual.
- Tudo grava em attempt_answers com origem "folha lida" ou "digitação".

Critérios de aceite: num conjunto de teste de pelo menos 30 folhas (scanner e foto, incluindo fotos tortas e com sombra), 100% das folhas de scanner e pelo menos 95% das marcações de foto lidas corretamente, e nenhum erro silencioso (toda dúvida vai para conferência); tempo por folha documentado; build e lint passam.
```

---

## P12 — Correção e resultados da prova

```
Siga docs/b2b/ESPEC-B2B.md (seções 0, 4.2, 4.3 e 6). Funções: PR-08, PR-10, ajuste TC-07 (total geral).

Objetivo: a página de resultado de uma prova em /instituicao/provas/[id]/resultado.

Faça:
- Fechamento da correção: anular questão, trocar gabarito com justificativa (gera recálculo e registro em auditoria), marcar ausentes.
- Resumo: presentes, média, mediana, P25–P75, percentual abaixo do corte, com rodapé Base / Período / Fonte.
- Curva de distribuição das notas em faixas de 5 pontos, com a mediana marcada, a linha do corte (60) e os extremos visíveis. Filtro por turma.
- Resultado por área, cenário, tema e competência (abas; só aparecem os eixos que as questões da prova têm), sempre com o total geral da prova ao lado.
- Tabela de alunos com nota, faixa e variação em relação à prova anterior do mesmo tipo; acesso individual com o aviso e o registro em log.
- Tabela turmas × resultado.
- Exportação aluno × item × alternativa marcada, com o mapa de embaralhamento, em CSV e XLSX, e um dicionário de dados.
- Devolutiva ao aluno: nota, acertos por área, revisão dos erros em modo leitura (sem cronômetro e sem alterar a nota), disponível só após a liberação.

Regras: nunca comparar provas diferentes como se fossem a mesma régua sem dizer isso na tela; áreas com menos de 5 questões na prova aparecem com aviso de oscilação.

Critérios de aceite: números batem com um cálculo independente feito em planilha para a prova da instituição demo (anexe a conferência ao diário); build e lint passam.
```

---

## P13 — Análise psicométrica

```
Siga docs/b2b/ESPEC-B2B.md (seções 0, 4.2 e 6). Função PR-09, aprovada com ajuste, e QB-12. O Dr. Filipe pediu atenção especial e vai revisar as fórmulas: índice de discriminação, índice de facilidade, ponto-bisserial corrigida e KR-20.

Objetivo: aba "Análise das questões" no resultado da prova.

Faça:
- lib/b2b/psychometrics.ts com funções puras para: índice de facilidade; índice de discriminação pelos grupos de 27% superior e inferior; correlação ponto-bisserial corrigida (item contra o total sem o item); KR-20; frequência de cada alternativa; sinais por item. Use exatamente as definições da seção 6. Limites dos sinais e tamanhos mínimos de amostra em um arquivo de configuração.
- Testes automatizados com um conjunto de dados pequeno cujo resultado esperado foi calculado à mão e está descrito no próprio teste, mais os casos de borda: todos acertam, todos erram, variância zero, itens anulados, amostra menor que o mínimo.
- Tela: KR-20 da prova com leitura em uma frase; tabela por questão com classificação, facilidade, discriminação, ponto-bisserial, barras das alternativas marcadas (correta em destaque) e etiquetas de sinal (muito fácil, muito difícil, discriminação baixa, discriminação negativa, distrator dominante); filtro "só as com sinal"; clique abre o enunciado.
- Cada indicador tem um "como é calculado" com a fórmula e uma explicação em linguagem simples.
- Página docs/b2b/FORMULAS.md com as fórmulas, um exemplo numérico resolvido e as referências, para os médicos revisarem.
- Os índices alimentam a ficha da questão no banco (histórico de desempenho por aplicação).

Critérios de aceite: testes passam; aviso de amostra pequena aparece quando deve; FORMULAS.md pronto para revisão; build e lint passam.
```

---

## P14 — Visão geral da gestão

```
Siga docs/b2b/ESPEC-B2B.md (seções 0, 4.3 e 5). Funções: EX-01, EX-02 (renomear e explicar), EX-03, EX-05, EX-07, EX-08; voto SPR nº 12.

Objetivo: a tela inicial de dirigente e coordenador em /instituicao e as páginas ligadas a ela. Respeite o limite de 5 blocos por tela.

Tela inicial:
1. Seletor "Prova em análise" (antes chamado "avaliação de referência"), com uma linha explicando que todos os números da tela se referem à prova escolhida.
2. Cinco indicadores: nota média da instituição, percentual de alunos abaixo de 60, participação, turmas abaixo de 60, alunos na zona de decisão (51–60). Cada um com rodapé Base / Período / Fonte e clique que leva ao detalhe.
3. Mapa turma × área com a média final da turma numa coluna própria e as 4 faixas de cor (até 50, 51–60, 61–70, 71 ou mais). Disponível para dirigente e coordenador.
4. Evolução ao longo das provas, com o aviso de que provas diferentes não são estritamente comparáveis.
5. Alertas: por padrão, só "nota abaixo de 60".

Páginas próprias no menu:
- Turmas × provas: média de cada turma em cada prova, colorida em relação a 60, clique leva ao resultado da prova.
- Cobertura da matriz: quanto de cada área (e demais eixos, quando houver) já foi avaliado no período.
- Relatórios: relatório executivo em PDF e DOCX com identidade da instituição, pensado como insumo para CPA, NDE e MEC: resumo, indicadores, mapa, evolução, ações em andamento, metodologia e limites de interpretação.

Não coloque o bloco "plano de ação em andamento" na tela inicial (ficou em discussão); o acesso é pelo menu Intervenções.

Critérios de aceite: todos os números vêm de attempts/attempt_answers da instituição demo; nenhum valor fixo; relatório gerado; build e lint passam.
```

---

## P15 — Turmas, alunos e gráficos de dispersão

```
Siga docs/b2b/ESPEC-B2B.md (seções 0, 2 e 4.3). Funções: TC-01, TC-03, TC-05, TC-06, TC-07, TC-08; refazer TC-02 com áreas e cenários; pedidos B e C do Dr. Filipe. NÃO construir o painel da competência (TC-04).

Objetivo: /instituicao/turmas.

Faça:
- Lista de turmas: média, participação, tendência, alunos abaixo de 60.
- Detalhe da turma em abas:
  a) Resultado por área e por cenário (e por tema e competência quando as listas existirem), agregado, sem nomes.
  b) Dispersão: cada ponto é um aluno; eixo Y = nota média; eixo X alternável entre número de questões respondidas no período e número de simulados feitos; linha tracejada no corte (60); divisor vertical na mediana do eixo X; quatro quadrantes rotulados (treina e performa; performa com pouco treino; treina e não sobe; pouco treino e abaixo) com a contagem de alunos em cada um; destaque visual para quem está entre 51 e 60; clique no ponto abre o aluno. Alunos sem nota ficam fora, com a contagem informada.
  c) Estudantes: tabela individual, protegida pelo aviso de dado individual e pelo registro de acesso.
  d) Provas aplicadas à turma, com o total geral de cada uma.
  Botões no cabeçalho: nova intervenção e nova prova para a turma.
- Perfil do aluno: notas ao longo do tempo comparadas à média da turma; resultado por área; e a dispersão individual: o mesmo gráfico, com um ponto por período ou por prova, ligados em ordem cronológica, para ver se está subindo ou caindo. Deixe claro na tela que os números são a nota do aluno.
- Mesma dispersão disponível para a instituição inteira, com filtro por período do curso.

Fonte do eixo X: respostas de treino do aluno na plataforma (user_answers do B2C, para alunos matriculados) e tentativas de simulado no B2B. Se o aluno não usa o treino, o eixo "questões" mostra zero com aviso, nunca um valor estimado.

Regra de acesso (TC-05): dado individual visível para dirigente, coordenador e professor da própria turma.

Critérios de aceite: gráficos corretos com os dados da instituição demo, conferidos em uma amostra manual; build e lint passam.
```

---

## P16 — Acompanhamento: quem precisa de atenção, alertas, meta e resumo da semana

```
Siga docs/b2b/ESPEC-B2B.md (seções 0 e 4.3). Votos SPR aprovados nº 1, 2, 3, 4, 5 e 7; ajuste EX-04 e TU-02 (régua 60). O papel Tutor não existe: tudo aqui pertence ao coordenador e ao dirigente.

Objetivo: /instituicao/acompanhamento, com cada função em página ou aba própria.

Faça:
- Quem precisa de você agora: lista priorizada de alunos com o motivo em etiqueta (nota abaixo de 60, zona de decisão, sem acesso há N dias, queda de ritmo, simulado pendente). A regra de ordenação aparece escrita na tela. Só entram motivos de alertas que estejam ligados; "nota abaixo de 60" e "zona de decisão" estão sempre ligados.
- Zona de decisão: alunos com nota entre 51 e 60, com filtro por turma e atalho para criar intervenção para o grupo.
- Alertas: nota abaixo de 60 ligado por padrão. Os de engajamento (sem login, sem questões, queda de ritmo, simulado pendente) vêm desligados; dirigente ou coordenador liga e ajusta os limites. Alerta que atinge a maior parte de uma turma vira um alerta de turma, não dezenas de alertas individuais. Registro de anotação por aluno e marcação de "tratado".
- Meta semanal de questões: desligada por padrão; quando ligada, grade aluno × semana com cumpriu, parcial, não cumpriu e inativo, evolução por semana e ordenação por semanas seguidas sem cumprir.
- Resumo da semana: texto curto gerado por regras a partir dos dados (sem IA generativa nesta versão): participação, destaques, alunos e turmas que pedem atenção, área mais fraca. Botão "copiar" em formato pronto para WhatsApp ou e-mail. O mesmo recurso por prova ("resumo para a coordenação").
- Rodapé Base / Período / Fonte em tudo.

Critérios de aceite: com todos os alertas de engajamento desligados, a página funciona só com a nota; ligar um alerta muda a lista de forma previsível; o texto copiado não contém nome de aluno por padrão (opção explícita para incluir); build e lint passam.
```

---

## P17 — Avaliação longitudinal

```
Siga docs/b2b/ESPEC-B2B.md (seções 0 e 4.4). Funções: AP-01 (nome), AP-02, AP-03, AP-04 (referência 60). AP-05 (notas de provas práticas) fica fora.

Objetivo: /instituicao/longitudinal. O nome do módulo é "Avaliação longitudinal"; a expressão "avaliação programática" não aparece em nenhum lugar da interface.

Faça:
- Mapa currículo × eixo: períodos do curso nas colunas; nas linhas, as áreas (e, quando existirem, competências ou temas, com alternância). Cada célula mostra o resultado médio das provas daquele período e quantas questões o sustentam.
- Trilha longitudinal: escolhido um item do eixo, a evolução de uma coorte de alunos ao longo dos períodos e a comparação entre turmas no mesmo período.
- Plano de acompanhamento: para a turma ou o aluno abaixo de 60 num eixo, registro simples de ação combinada, responsável pelo registro, data e a prova em que será verificado. Linha do tempo com o que foi feito e o resultado seguinte.
- Marcos das três etapas do ENAMED (4º, 8º e 12º períodos) visíveis no mapa.
- Avisos de interpretação quando uma célula tiver poucas questões ou poucas provas.

Critérios de aceite: funciona só com áreas enquanto competências e temas não chegam; nenhum texto com "programática"; build e lint passam.
```

---

## P18 — Intervenções

```
Siga docs/b2b/ESPEC-B2B.md (seções 0 e 4.5). Funções: IN-01, IN-02 (ajuste), IN-03, IN-04 (reduzir), IN-05, IN-06; voto SPR nº 10 como intervenção, por pedido do Dr. Bruno.

Objetivo: /instituicao/intervencoes, enxuto.

Somente dois tipos:
1. Lista de exercícios (principal): seleção de questões do banco pelos eixos em que a turma ou o grupo foi mal, com prazo; o aluno responde em Praticar.
2. Pré e pós-aula: par de provas curtas (tipos pre_aula e pos_aula), com as mesmas características e questões diferentes, para a mesma turma e conteúdo; a plataforma mede o ganho.

Faça:
- Assistente em 3 passos: lacuna (vinda de um resultado: turma ou grupo + eixo abaixo de 60) → ação (um dos dois tipos) → verificação (em qual prova o eixo será medido de novo; o reteste é embutido na próxima prova como cota de questões daquele eixo).
- Lista de intervenções com antes, depois, adesão e situação.
- Detalhe: resultado antes e depois, comparação com turma paralela quando existir, adesão medida pela plataforma (quem fez a lista, quanto fez), variação com aviso quando o grupo for pequeno.
- Quem cria: coordenador e dirigente; docente só para as próprias turmas, se a instituição permitir nas configurações.

Não crie outros tipos de ação, nem sugestões automáticas de "replicar em outra turma".

Critérios de aceite: criar as duas intervenções de ponta a ponta na instituição demo e ver o antes e depois; build e lint passam.
```

---

## P19 — Painel do docente e adesão dos professores

```
Siga docs/b2b/ESPEC-B2B.md (seções 0, 4.3 e 4.7). Funções: DO-01, DO-02 sem "fila de revisão"; DO-03, DO-04 e DO-05 reprovadas; voto SPR nº 6.

Objetivo A, início do docente em /instituicao (quando o papel é docente). Simples, no máximo 4 blocos:
- Minhas turmas com a média da última prova e os alunos abaixo de 60.
- Onde a turma mais erra (por área ou tema), com atalho "montar prova para a turma" e "criar lista de exercícios".
- Minhas provas: em rascunho, aguardando revisão, aguardando correção.
- Questões que me pediram para revisar (contador com link; sem fila na tela).

Objetivo B, página Professores, visível só para dirigente e coordenador:
- Cadastrados, ativos no período, nunca acessaram.
- Por professor: último acesso, provas criadas, provas aplicadas, alunos alcançados, questões enviadas ao banco.
- Filtros: ativos, sem acesso há 30 dias ou mais, nunca acessaram.
- É indicador de uso da ferramenta, não de desempenho do professor: escreva isso na tela.

Critérios de aceite: docente não enxerga a página Professores nem dados de turmas fora do seu escopo (inclua no roteiro de RLS); build e lint passam.
```

---

## P20 — Área do aluno institucional

```
Siga docs/b2b/ESPEC-B2B.md (seções 0 e 4.8). Funções: AL-01 a AL-05; AL-06 reprovada; AL-07 fora por enquanto.

Objetivo: a experiência do aluno matriculado por uma instituição, em /instituicao/aluno, convivendo com as telas B2C que ele já tem.

Faça:
- Início: "Próximo passo" com o porquê (a área ou tema em que ele tem mais a ganhar e o que fazer), provas abertas e listas de exercícios pendentes.
- Minha evolução: suas notas ao longo do tempo com a média da turma como referência. Sem ranking e sem posição.
- Meus resultados por área (e por tema e competência quando existirem), ordenados por oportunidade de ganho, com ação sugerida por linha.
- Minhas avaliações: resultado e "revisar erros" em modo leitura, sem cronômetro e sem alterar nota, só depois da liberação pelo professor.
- Praticar: listas de exercícios atribuídas e prática dirigida por eixo, com comentário após responder. As respostas contam para o volume de questões usado nos gráficos da gestão.
- Aviso de privacidade em linguagem simples: o que a faculdade enxerga sobre ele.

Não crie "plano até a somativa" nem agenda.

Critérios de aceite: aluno só vê os próprios dados; resposta de prática aparece no gráfico de dispersão da turma; build e lint passam.
```

---

## P21 — Sessões atípicas

```
Siga docs/b2b/ESPEC-B2B.md (seções 0 e 4.10). Voto SPR nº 9, aprovado.

Objetivo: sinalizar padrões incomuns de resposta em prática e em prova online, com regra explícita, só para a gestão.

Faça:
- lib/b2b/atypical.ts com três classificações por sessão, cada uma com limites configuráveis e documentados: chute (tempo por questão muito baixo com acerto perto do acaso); refazendo (alta proporção de questões já respondidas antes pelo mesmo aluno, com acerto alto); padrão compatível com consulta externa (acerto muito alto com tempo por questão muito baixo e constante). Sessões com menos de 20 questões não são classificadas.
- Página em Acompanhamento: sessões classificadas por semana, por turma e por aluno, com a regra escrita na tela e o aviso "o rótulo indica um padrão, não prova nada; use como ponto de partida para uma conversa".
- Essas sessões podem ser excluídas, por opção, do volume de questões usado nos gráficos.
- Visível só para dirigente e coordenador. Nunca aparece para o aluno nem em exportações por padrão.
- Não use a palavra "fraude" ou "cola" na interface.

Critérios de aceite: testes das três regras com casos sintéticos; limites editáveis nas configurações; build e lint passam.
```

---

## P22 — Indicador de prontidão

```
Siga docs/b2b/ESPEC-B2B.md (seções 0 e 4.9). Decisão: existirá algum tipo de previsão; o formato proposto pelo Dr. Filipe é por regra, e os parâmetros ainda serão fechados.

Objetivo: um indicador de prontidão por aluno e por turma, transparente e configurável. Não é nota prevista do ENAMED e não usa TRI.

Faça:
- Duas regras, cada uma podendo ser ligada ou desligada por instituição:
  1. Volume: aluno com pelo menos N questões respondidas no ano letivo (valor inicial de referência 10.000, editável).
  2. Consistência: aluno que manteve pelo menos X% de acerto em pelo menos Y simulados no ano (X e Y editáveis; ficam em branco até a instituição informar quantos simulados fará).
- Resultado em três níveis com nome neutro (por exemplo: no caminho, em atenção, distante), mostrando sempre quais regras o aluno cumpre e quanto falta. A escolha final dos nomes é dos médicos; deixe configurável.
- Visão por turma: quantos alunos em cada nível; visão individual no perfil do aluno; opção de mostrar ou não ao próprio aluno.
- Texto fixo junto ao indicador: é uma estimativa por regra definida pela instituição, baseada no uso da plataforma e nos simulados aplicados; não é previsão oficial nem garantia de resultado.
- Guarde o histórico do indicador para, no futuro, comparar com o resultado real do ENAMED e calibrar.

Com os parâmetros em branco, o indicador não aparece (nada de valor padrão fingindo precisão).

Critérios de aceite: mudar N, X ou Y recalcula; regra visível na tela; build e lint passam.
```

---

## P23 — Régua ENAMED e revisão dos rótulos

```
Siga docs/b2b/ESPEC-B2B.md (seções 0, 1 e 4). Funções: RE-01 e RE-02 aprovadas; RE-03 reprovada (retirar o aviso "não fazemos predição").

Objetivo A, página "Régua ENAMED" no menu, tratada pelos médicos como módulo central de posicionamento:
- As três etapas (4º, 8º e 12º períodos) e, para cada uma, o que a instituição tem na plataforma: simulados daquela etapa aplicados, resultado das turmas que estão chegando à etapa, alunos abaixo de 60 e na zona de decisão, intervenções em curso.
- Para a 1ª etapa, um aviso de que a matriz do ciclo básico será incorporada quando o INEP publicar.
- Conteúdo regulatório (número da lei, datas, pesos) NÃO deve ser escrito por você: deixe os textos em um arquivo de conteúdo editável e marque "a preencher pelo Mario com fonte oficial".

Objetivo B, auditoria de rótulos em todo o módulo:
- Toda tela com indicador tem Base / Período / Fonte.
- Nenhuma tela chama percentual de acerto de "nota ENAMED".
- A palavra "programática" não aparece; "Tutor" não aparece; não há emoji.
- O corte vem sempre da configuração da instituição.
- Gere docs/b2b/AUDITORIA-ROTULOS.md com o que foi verificado e corrigido.

Critérios de aceite: página funcional com dados da instituição demo; relatório de auditoria; build e lint passam.
```

---

## P24 — Governança, privacidade e auditoria

```
Siga docs/b2b/ESPEC-B2B.md (seções 0 e 2). As funções GO-02 a GO-08 não receberam voto dos médicos; aqui entra só o mínimo técnico e legal para operar com dados de alunos. Integrações com sistemas acadêmicos, SSO e white label ficam fora.

Faça:
- Revisão completa de RLS de todas as tabelas do B2B, executando o roteiro docs/b2b/TESTE-RLS.md e registrando o resultado.
- Trilha de auditoria imutável para: troca de gabarito, anulação de questão, reabertura de prova, alteração de papel, exportação de dados, acesso de suporte da MedPleni, alteração do corte e dos parâmetros.
- Tela de consulta ao registro de acesso a dados individuais, para o dirigente.
- Exportação auditável: toda exportação registra quem, quando, o quê, e gera um arquivo com dicionário de dados.
- Segurança do gabarito: gabarito e caderno não trafegam para o navegador do aluno antes da liberação; verifique as respostas das rotas.
- Retenção e exclusão: rotina para anonimizar os dados de um aluno a pedido e para encerrar uma instituição, exportando antes.
- Página "Privacidade e dados" para a instituição com o que é coletado, para quê e quem acessa, em texto editável. Não redija cláusulas jurídicas: deixe marcado "texto a validar pelo jurídico".
- Uso agregado pela MedPleni (desempenho das questões do acervo entre instituições): só dado agregado e sem identificação da instituição; documente a regra.
- Lista em docs/b2b/PENDENCIAS-JURIDICAS.md do que precisa de decisão humana (base legal, contrato de operador, RIPD).

Critérios de aceite: roteiro de RLS 100% aprovado; auditoria registrando os eventos listados; build e lint passam.
```

---

## P25 — QA final, dados de demonstração e roteiro

```
Siga docs/b2b/ESPEC-B2B.md e todo o docs/b2b/DIARIO.md.

Objetivo: deixar o módulo pronto para ser mostrado aos médicos e para um piloto.

Faça:
- Seed de demonstração completo e coerente para a "Faculdade Demonstração": 12 turmas, cerca de 240 alunos fictícios, 6 a 8 provas aplicadas ao longo de dois semestres (incluindo um Simulado ENAMED de cada etapa, uma prova em papel e um par pré e pós-aula), respostas por item geradas de forma realista (com uma área claramente mais fraca numa turma, para a história de lacuna → intervenção → melhora), respostas de prática com volumes variados para os gráficos de dispersão, duas intervenções concluídas. Tudo removível.
- Percorra cada papel (dirigente, coordenador, docente, aluno) e cada item do menu; registre defeitos em docs/b2b/QA.md e corrija os que bloqueiam.
- Confira contra a seção 4 e a seção 5 da especificação: liste o que foi entregue, o que ficou parcial e o que está fora, em docs/b2b/ENTREGA-V1.md, com o ID das funções da central quando houver.
- Desempenho: páginas principais com resposta rápida usando o seed; registre as mais lentas e a causa.
- Teste em tema claro e escuro, notebook e tablet.
- Confirme que todas as rotas B2C continuam funcionando e que um usuário sem instituição não percebe o B2B.
- Roteiro de demonstração de 15 minutos em docs/b2b/ROTEIRO-DEMO.md, na ordem: visão geral → resultado de uma prova com curva de distribuição → análise das questões → dispersão da turma → quem precisa de atenção → intervenção com antes e depois → prova em papel com folha de respostas → montagem de um Simulado ENAMED.
- Lista do que depende dos médicos para a v1 ficar completa: cenários, temas, competências, parâmetros da prontidão, revisão das fórmulas, nomes dos níveis.

Não faça push nem deploy. Deixe no diário o passo a passo para eu publicar em um ambiente de teste quando decidir.
```

---

## Decisões que travam prompts (levar à reunião de 19/11)

| # | Pergunta | Trava |
|---|---|---|
| 1 | Reenviar a lista de **áreas e cenários** do INEP; prazo para **competências** e para uma primeira versão de **temas** | P04, P05, P09, P17 |
| 2 | Os dois tipos de intervenção são **lista de exercícios** e **pré e pós-aula**? | P18 |
| 3 | **Discursiva** entra na primeira versão ou logo depois? | P08–P12 |
| 4 | Quantos **simulados por ano** a faculdade fará, e quais X% e Y simulados definem a prontidão; o número de 10.000 questões vale como referência? | P22 |
| 5 | Dr. Filipe: votos dos itens **5 a 13** da lista da SPR (a mensagem dele chegou só até o item 4; o Dr. Bruno aprovou 1–7, 9, 11 e 12) | P16, P19, P21 |
| 6 | **Modo prova seguro** (tela cheia, bloqueio de atalhos): o item 8 não saiu na mensagem enviada. Entra? | P10 |
| 7 | **Apostilas**: explicar ao Dr. Bruno; a plataforma B2C já tem aulas por tema. Entra no B2B depois? | fora da v1 |
| 8 | **Painel da competência**, bloco **plano de ação** do dirigente e **meta por célula** do banco: sem resposta; segui com "não construir / fora da tela inicial / sem meta" | P05, P14, P15 |
| 9 | **Layout:** as 10 telas não receberam voto no banco. Aprovam a direção "menu lateral, telas limpas, tema claro como padrão"? | P02 |
| 10 | Revisão das **fórmulas** (seção 6 da especificação) e dos limites dos sinais | P13 |
| 11 | Material para o motor: **guia do INEP** e **referência nacional por tema**; tema do piloto | P07 |
