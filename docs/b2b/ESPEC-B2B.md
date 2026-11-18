# MedPleni Institucional (B2B) — Especificação v1 para desenvolvimento

**Data:** 18/11/2026 · **Fonte de verdade para todos os prompts.** Consolida: 102 votos da central de aprovações (11–12/11), respostas dos médicos no grupo (16–17/11), reunião com a SPR Med (12/11), benchmark SPR (16/11) e reunião de 05/11.
**Decisores técnicos:** Dr. Filipe Moreira de Andrade e Dr. Bruno Farnetano (os votos na conta do Filipe valem pelos dois, confirmado em 16–17/11). **Produto e desenvolvimento:** Mario Lopes.

Legenda: **[DECIDIDO]** aprovado pelos médicos · **[PADRÃO]** escolha técnica minha onde não houve voto; pode mudar · **[ABERTO]** depende de decisão; implementar de forma configurável e não travar.

---

## 0. Regras permanentes (valem para todos os prompts)

1. **Leia antes de codar:** `platform/AGENTS.md` (o Next.js deste projeto é a versão 16 e tem mudanças; consulte `node_modules/next/dist/docs/`), este arquivo e `docs/b2b/DIARIO.md`.
2. **Não quebre o B2C.** Rotas, tabelas e componentes existentes do aluno individual continuam funcionando. Todo o B2B vive em `app/instituicao/**`, `app/api/b2b/**`, `lib/b2b/**`, `components/b2b/**`.
3. **Banco: só mudanças aditivas.** Nada de `DROP`, `TRUNCATE` ou `ALTER ... DROP COLUMN` em tabela existente. Cada mudança vai num arquivo novo, idempotente, em `platform/supabase/b2b/NNN_nome.sql`. **Não execute SQL em produção por conta própria:** gere o arquivo e me avise para eu rodar no SQL Editor.
4. **Multi-tenant com RLS em todas as tabelas novas.** Nenhuma consulta B2B confia só no front. Chave de serviço apenas em rotas de servidor.
5. **Dados reais nunca em seed.** Toda demonstração usa a instituição fictícia `Faculdade Demonstração` (`is_demo = true`), com nomes inventados.
6. **Sem números inventados na tela.** Indicador sem dado mostra "sem dados", nunca valor fixo ou mock. Todo indicador tem rodapé **Base / Período / Fonte**.
7. **Régua 60.** O corte de referência é 60% em tudo: alertas, sinalização, planos, cores. Fica numa configuração da instituição (`cut_score`, padrão 60), nunca espalhado no código.
8. **Telas limpas.** No máximo 5 blocos por tela; o resto vira página própria no menu lateral ou detalhe sob clique. Nada de emoji na interface. Use os componentes e tokens existentes (`components/ui`, `app/globals.css`, temas claro e escuro).
9. **Cálculo no servidor e testado.** Fórmulas ficam em funções puras em `lib/b2b/` com testes automatizados.
10. **Ao terminar cada prompt:** rode `npm run lint` e `npm run build` dentro de `platform/`; corrija o que quebrar; acrescente em `docs/b2b/DIARIO.md` uma entrada com: o que foi feito, arquivos criados, SQL que eu preciso rodar, como testar manualmente, pendências e dúvidas; faça commit local `feat(b2b): PNN <resumo>`. **Não faça push nem deploy.**
11. **Se algo desta especificação conflitar com o código real, pare, registre no diário e proponha a alternativa.** Não invente requisito.

---

## 1. O que é o produto

Plataforma para faculdades de medicina aplicarem provas, analisarem resultados e acompanharem alunos e turmas ao longo do curso, com foco em preparar para o ENAMED (etapas no 4º, 8º e 12º períodos). O principal atrativo comercial é o **banco de questões fornecido pela MedPleni** somado à análise; o professor da instituição não quer escrever questão.

Ofertas [DECIDIDO]: plataforma vazia (a faculdade monta o banco); plataforma com acervo MedPleni; **plus** = plataforma + acervo + mentoria à coordenação (Apexus) + treinamento docente. Preço varia pelo número de alunos. A instituição com acervo recebe o acervo inteiro.

---

## 2. Papéis e acesso

| Papel | Vê | Faz |
|---|---|---|
| **Dirigente** [DECIDIDO: acesso a tudo] | Tudo da instituição, inclusive dados individuais | Tudo que o coordenador faz |
| **Coordenador** | Tudo do(s) curso(s) sob sua coordenação, inclusive individual | Cria provas, intervenções, turmas, convites |
| **Docente** | Suas turmas; dado individual só dos alunos das suas turmas | Cria e revisa provas e questões; lança correção |
| **Aluno** | Só os próprios dados e a média da turma (sem ranking) | Responde provas, pratica |
| **Admin MedPleni** | Todas as instituições | Implantação, acervo, suporte |
| **Editor MedPleni** | Banco de questões | Produção e revisão do acervo |

Não existe papel **Tutor** [DECIDIDO: removido]. Os indicadores de acompanhamento ficam com o coordenador.
Todo acesso a dado individual de aluno é registrado em log (LGPD).

---

## 3. Classificação das questões [DECIDIDO 17/11]

Quatro eixos, uma única Área: **ÁREA · CENÁRIO · TEMA · COMPETÊNCIA**.

- **Área (7, padrão INEP):** Clínica Médica, Cirurgia, Ginecologia e Obstetrícia, Pediatria, Medicina de Família e Comunidade, Saúde Coletiva, Saúde Mental.
- **Cenário:** lista do INEP enviada pelo Dr. Filipe. **[ABERTO]** peça o arquivo ao Mario; enquanto não chega, a tabela fica vazia e editável.
- **Tema:** lista grande, em construção pelos médicos. **[ABERTO]**
- **Competência:** lista em construção pelos médicos. **[ABERTO]**
- **Dificuldade:** fácil, média, difícil. A IA sugere, o humano confirma.
- **Origem:** só dois formatos de rótulo: `Instituição-ano` (ex.: USP-2025) ou `ano` (ex.: 2025).

Saem os "6 contextos" e as 14 competências fictícias do protótipo. As quatro listas são tabelas editáveis com importação por CSV; nada fixo no código. A taxonomia da 1ª etapa (4º período, ciclo básico) só será definida após publicação do INEP: o modelo precisa aceitar um segundo conjunto de áreas por etapa.

---

## 4. Módulos e decisões

### 4.1 Provas
- **Tipos** [DECIDIDO]: Prova regular; Simulado ENAMED 4º período; Simulado ENAMED 8º período; Simulado ENAMED 12º período; Pré-aula; Pós-aula.
- **Formatos de questão:** múltipla escolha na v1. Discursiva foi mantida no escopo pelos médicos, mas entra depois da v1 **[PADRÃO; confirmar]**. Avaliação prática (OSCE, Mini-CEX) é futuro [DECIDIDO].
- **Modalidades** [DECIDIDO, núcleo]: papel com folha de respostas com QR e correção automática (scanner é o ideal; foto é aceitável); híbrida (caderno em papel, respostas por link/código); 100% online com tempo por item.
- **Fluxo de montagem:** matriz → seleção assistida → **uma única revisão** → publicação. Revisor pode ver outras áreas; caixa "só minha área".
- **Caderno fixo versionado**, versões embaralhadas, gabarito separado, PDF com logo da instituição.
- **Importar prova própria** da instituição (PDF/DOCX) [DECIDIDO].
- **Calendário de provas prontas da MedPleni:** só simulados [DECIDIDO].
- **Filtros de montagem aprovados (SPR):** origem (inédita ou de banca), banca e ano, curva de dificuldade editável, cota de questões com imagem, edição compartilhada entre professores.

### 4.2 Análise da prova [DECIDIDO, com revisão das fórmulas pelos médicos]
Por questão: índice de facilidade, índice de discriminação, correlação ponto-bisserial corrigida, alternativas marcadas. Por prova: KR-20, média, mediana, P25–P75, curva de distribuição com mediana e linha de 60. Fórmulas na seção 6.

### 4.3 Gestão e acompanhamento
- **Visão executiva:** 5 KPIs; evolução temporal; relatório executivo exportável (insumo para CPA, NDE e MEC); cobertura da matriz.
- **Heatmap turma × área** para dirigente e coordenador, com **média final da turma** e 4 faixas: até 50 / 51–60 / 61–70 / 71 ou mais [DECIDIDO].
- **Alerta padrão:** nota abaixo de 60 [DECIDIDO]. Alertas de engajamento (sem login, sem questões, queda de ritmo, simulado pendente) existem, **desligados por padrão**, e a instituição liga [DECIDIDO].
- **Curva de distribuição** por prova, turma e instituição [DECIDIDO].
- **Dispersão da turma:** Y = nota média; X = nº de questões ou nº de simulados (alternável); linha em 60; quadrantes "treina e performa", "performa com pouco treino", "treina e não sobe", "pouco treino e abaixo" [DECIDIDO].
- **Dispersão individual:** o mesmo gráfico para um aluno ao longo do tempo [DECIDIDO].
- **Quem precisa de você agora:** lista priorizada com motivo [DECIDIDO].
- **Zona de decisão:** alunos na faixa 51–60 [DECIDIDO pelo Dr. Filipe].
- **Meta semanal de questões** com grade aluno × semana [DECIDIDO].
- **Resumo da semana em texto** com botão copiar [DECIDIDO].
- **Matriz turmas × provas** colorida em relação a 60 [DECIDIDO].
- **Adesão dos professores** (só gestão) [DECIDIDO].
- **Rodapé Base / Período / Fonte** em todo indicador [DECIDIDO].

### 4.4 Avaliação longitudinal
Nome do módulo: **"Avaliação longitudinal"** (nunca "programática") [DECIDIDO]. Mapa currículo × competência por período; trilha longitudinal; plano de acompanhamento com referência 60.

### 4.5 Intervenções
No máximo **2 tipos** [DECIDIDO]: **Lista de exercícios** (principal) e **Pré e pós-aula** (par de simulados antes/depois para a mesma turma e conteúdo; o Dr. Bruno pediu que seja intervenção). Fluxo: apontar a lacuna → aplicar → nova prova (reteste embutido). Adesão medida pela plataforma. Intervenção pedagógica mais ampla é serviço do plano plus, não tela.

### 4.6 Banco de questões
Explorar com filtros; ficha da questão (enunciado, alternativas, gabarito, comentário, referência, origem, desempenho, versões); nova questão autoral; nova questão assistida por IA; motores de produção, incluindo **devolutiva → questão original** e **reescrita de acervo de terceiros**; direitos de uso por fonte; qualidade e governança; **revisão em uma única etapa** [DECIDIDO]. Questão de terceiros só entra reescrita, com proveniência registrada; o item de origem nunca é publicado.

### 4.7 Painel do docente
Simples: itens para revisar, provas aguardando, minhas turmas. **Sem** fila de revisão pessoal, **sem** sugestão "replicar intervenção", **sem** "explicações mais consultadas" [DECIDIDO].

### 4.8 Painel do aluno
Próximo passo com o porquê; evolução vs. média da turma (sem ranking); minhas competências; minhas avaliações com "revisar erros" em modo leitura (sem cronômetro, não altera nota); praticar lista dirigida. **Sem** "plano até a somativa" [DECIDIDO].

### 4.9 Previsão / prontidão [DECIDIDO que existirá; parâmetros ABERTOS]
Não é nota prevista em escala ENAMED. É um **indicador de prontidão por regra explícita**, proposto pelo Dr. Filipe: (a) aluno com pelo menos N questões no ano (referência dele: 10.000) tem alta chance de proficiência; (b) aluno que manteve X% em Y simulados. X e Y dependem de quantos simulados a faculdade fará no ano. Tudo configurável por instituição, com a regra visível na tela.

### 4.10 Sessões atípicas [DECIDIDO]
Sinalização de padrão de chute, de refazer questão e de possível uso de IA, com regra explícita e o aviso "indica padrão, não prova". Visível só para a gestão.

---

## 5. Fora da v1

| Item | Motivo |
|---|---|
| Papel Tutor, plano do aluno até a somativa, extras do painel docente, aviso "sem predição" | Reprovados |
| Avaliação prática (OSCE, Mini-CEX), registro de feedback oral | Futuro |
| Painel da competência (TC-04) | Reprovado sem comentário; sem resposta à pergunta. Não construir |
| Bloco "plano de ação" na tela do dirigente (EX-06) | Em discussão, sem resposta. Não pôr na tela inicial; acesso pelo menu Intervenções |
| Meta por célula no mapa de cobertura (QB-02) | Sem resposta. Mostrar só a quantidade, sem meta |
| Apostilas no B2B | Dr. Bruno pediu para entender antes. Já existe `med_classes` no B2C; não integrar agora |
| Modo prova seguro (tela cheia, bloqueio de atalhos) | Não chegou a ser votado |
| White label, integrações SIS/LTI/SSO, busca global | Sem voto |
| TRI, nota em escala ENAMED | Sem base de dados para calibrar |
| Discursiva | Depois da v1 (confirmar) |

---

## 6. Fórmulas (os médicos vão revisar; manter num único arquivo)

Notação: prova com *k* questões válidas (anulada sai de tudo), *n* alunos com prova finalizada; resposta em branco conta como erro.

- **Nota do aluno (%)** = acertos ÷ questões válidas × 100.
- **Índice de facilidade (p)** do item = alunos que acertaram ÷ *n*. Varia de 0 a 1.
- **Índice de discriminação (D)** = p do grupo superior − p do grupo inferior, onde os grupos são os 27% de maior e os 27% de menor nota total. Varia de −1 a 1.
- **Ponto-bisserial corrigida (r)** = correlação de Pearson entre o acerto no item (0/1) e a nota total **sem o próprio item**.
- **KR-20** = (k ÷ (k − 1)) × (1 − Σ pᵢ·(1 − pᵢ) ÷ σ²), com σ² = variância populacional do total de acertos.
- **Mediana, P25, P75** da nota.
- **Sinais por item** (limites configuráveis): muito fácil p > 0,90; muito difícil p < 0,20; discriminação negativa r < 0; discriminação baixa r < 0,20; distrator dominante = alternativa errada mais marcada que a correta.
- **Amostra pequena:** com *n* < 30, exibir os índices com o aviso "amostra pequena" [PADRÃO]; com *n* < 10, não calcular D, r nem KR-20.
- **Faixas de cor:** até 50 / 51–60 / 61–70 / 71 ou mais.

---

## 7. Estado do código hoje (levantado em 18/11)

- `platform/`: Next.js 16.2.3 App Router, React 19, TypeScript, Tailwind 4, Supabase (`@supabase/ssr`), Recharts, Resend. Sem framework de testes.
- SQL solto em `platform/supabase/*.sql`, sem migrations.
- Tabelas: `profiles` (com `role`), `questions`, `question_options`, `user_answers`, `simulations`, `user_simulations`, `user_diagnostics`, `flashcards`, `med_classes`, `med_class_progress`, `admin_invitations`, `admin_audit_logs`, `b2b_approvals` e outras de IA e e-mail.
- Papéis em uso no código: `student`, `docente`, `admin`, `superadmin`, `mentor`.
- Lacunas conhecidas: simulado não grava resposta por item nem tem caderno fixo; áreas escritas como texto livre em várias listas (5, 6 ou 7 áreas); sem instituição, turma ou período; indicadores com valores fixos em algumas telas do B2C.
- Central de aprovações em `app/central-aprovacoes` (não mexer).
- Referência funcional: `docs/b2b/medpleni-b2b-prototype.html` (protótipo de 19/10, **anterior às decisões**; onde divergir, vale este arquivo).
