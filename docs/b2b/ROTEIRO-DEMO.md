# Roteiro de Demonstração Institucional (15 Minutos) — MedPleni B2B

**Objetivo:** Apresentar aos médicos decisores (Dr. Bruno, Dr. Filipe e NDE) a jornada completa da plataforma: do diagnóstico à intervenção formativa e montagem de simulados oficiais.  
**Duração:** 15 minutos (com 5 a 10 minutos para perguntas).  
**Instituição de Demonstração:** Faculdade Demonstração (FADEP).  
**Perfil Utilizado no Roteiro:** Dirigente Geral / Coordenador (`dirigente`).

---

## Linha do Tempo da Apresentação

```
[00:00 - 02:00]  1. Visão Geral Institucional e Heatmap de Turmas
[02:00 - 04:30]  2. Resultado de uma Prova com Curva de Gauss/Distribuição
[04:30 - 06:30]  3. Análise das Questões e Psicométrica dos Itens (TCT)
[06:30 - 08:30]  4. Dispersão da Turma (Acerto × Volume no Praticar)
[08:30 - 10:00]  5. Identificação de Quem Precisa de Atenção (Alunos < 60 e Zona de Decisão)
[10:00 - 12:00]  6. Intervenção Pedagógica com Comparação Antes e Depois
[12:00 - 13:30]  7. Prova em Papel com Leitura Óptica OMR e Folha de Respostas
[13:30 - 15:00]  8. Montagem Assistida de Simulado ENAMED pela Matriz INEP
```

---

## Roteiro Passo a Passo

### 1. Visão Geral Executiva (`/instituicao`) · [00:00 – 02:00]
* **Onde clicar:** Acesse a tela inicial `/instituicao`.
* **O que mostrar:**
  - Os 4 cards do topo: Aproveitamento médio global (63.8%), alunos ativos (240), avaliações realizadas (7) e intervenções ativas (2).
  - O **Heatmap Turma × Área**: Mostre as 12 turmas (P1 a P12) nas linhas e as 7 Grandes Áreas nas colunas. Destaque as 4 faixas de cores aprovadas pelos médicos: vermelho (`< 50`), amarelo/âmbar (`51–60`), azul claro (`61–70`) e azul escuro (`≥ 71`).
  - **Aponte a lacuna na tela:** *"Reparem na Turma P3 em Saúde Coletiva: está com média de 47.5% (faixa vermelha), enquanto nas outras áreas está acima de 60%. Essa é exatamente a lacuna pedagógica que a instituição precisa enxergar no início do semestre."*
  - Mostre o rodapé padronizado: `Base: 240 alunos matriculados · Período: 2026.1/2026.2 · Fonte: Avaliações institucionais e prática`.

### 2. Resultado da Prova com Curva de Distribuição (`/instituicao/provas/[id]/resultado`) · [02:00 – 04:30]
* **Onde clicar:** Menu lateral → **Provas** → Clique no resultado do *"Simulado Nacional ENAMED 2026.2 — 3ª Etapa"* ou *"Avaliação Semestral Integrada"*.
* **O que mostrar:**
  - Card resumo: Média institucional, taxa de participação (95%) e desvio-padrão.
  - **Curva Normal de Distribuição (Histograma e Gauss):** Mostre a curva de distribuição das notas dos 240 alunos com o corte da instituição demarcado na linha de 60%.
  - Mostre os alunos que ficaram na cauda esquerda (`< 50%`) e os que estão na **Zona de Decisão** (`51% a 59%`).
  - **Fala-chave:** *"Aqui a instituição não vê apenas quem passou ou reprovou. Ela enxerga a distribuição normal da coorte e identifica exatamente os estudantes que estão a poucas questões do corte de segurança."*

### 3. Análise das Questões e Psicométrica (TCT) · [04:30 – 06:30]
* **Onde clicar:** Na mesma tela de resultado, role até a tabela **"Análise dos Itens e Psicométrica"**.
* **O que mostrar:**
  - As 4 métricas psicométricas canônicas exigidas pelos médicos:
    1. **Facilidade ($p$):** percentual de acerto do item na prova.
    2. **Discriminação ($D$):** diferença entre o terço superior e o terço inferior. Destaque itens com $D \ge 0.40$ (alta discriminação) e alerte se algum item tiver $D < 0.20$.
    3. **Correlação Ponto-Bisserial Corrigida ($r$):** correlação entre o acerto no item e o escore global sem autocorrelação.
    4. **Confiabilidade da Prova (KR-20):** índice de consistência interna exibido no cabeçalho (ex: $0.84$).
  - Clique em uma questão para abrir o modal de detalhes: mostre o gráfico de atratividade dos distratores (Alternativas A, B, C e D) demonstrando se alguma alternativa errada atraiu indevidamente os melhores alunos.

### 4. Dispersão da Turma (Acerto × Volume no Praticar) (`/instituicao/turmas/[id]`) · [06:30 – 08:30]
* **Onde clicar:** Menu lateral → **Turmas** → Clique na Turma **MED-2027-03P (Turma A)**.
* **O que mostrar:**
  - Aba **"Visão Geral & Dispersão"**.
  - O gráfico de **Dispersão (Scatter Plot):**
    - Eixo Vertical (Y): Média de acerto nas provas.
    - Eixo Horizontal (X): Volume de questões respondidas no Praticar (de 100 a 8.500 questões).
  - Destaque os 4 quadrantes divididos pela linha de corte de 60%:
    - **Alto Volume + Alto Acerto (Quadrante Superior Direito):** Estudantes engajados e com alto aproveitamento.
    - **Baixo Volume + Baixo Acerto (Quadrante Inferior Esquerdo):** Estudantes em risco que não estão utilizando o banco de questões.
    - **Aviso de Aluno que Não Treina:** Aponte o estudante com 0 questões com o badge transparente *"Aluno não praticou no período"*.

### 5. Identificação de Quem Precisa de Atenção · [08:30 – 10:00]
* **Onde clicar:** Na mesma tela da turma, vá para a aba **"Estudantes"** ou no menu **"Acompanhamento"**.
* **O que mostrar:**
  - Filtro rápido: Alunos `< 60` e Alunos na **Zona de Decisão** (`51% a 59%`).
  - Abra o modal de perfil de um aluno (ex: *Lucas Silva*):
    - Mostre a evolução individual dele comparada à média da turma (sem ranking, sem expor posição vexatória).
    - As notas são apresentadas de forma transparente por área.
    - Registro de auditoria LGPD: mostre o badge discreto informando que a visualização do perfil individual fica gravada na trilha de auditoria para o Dirigente.

### 6. Intervenção Pedagógica (Antes e Depois) (`/instituicao/intervencoes`) · [10:00 – 12:00]
* **Onde clicar:** Menu lateral → **Intervenções**.
* **O que mostrar:**
  - **A História de Sucesso da Turma P3:**
    - Clique na intervenção concluída: *"Reforço Curricular em Epidemiologia e SUS"*.
    - Mostre o diagnóstico inicial: média de **47.5%** na Avaliação Integrada 2026.1.
    - Ação executada: Lista de exercícios dirigida de 25 questões atribuída aos estudantes no Praticar.
    - Taxa de adesão: **92%** dos alunos realizaram a lista completa.
    - Reteste na prova seguinte: média saltou para **68.0%** (ganho de **+20.5 pontos percentuais**).
  - **O Par Pré e Pós-Aula na Turma P8:**
    - Mostre o par em *"Emergências Clínicas"*: Pré-aula em 42.0% e Pós-aula imediata em 74.0% (+32 p.p. de ganho imediato).
  - **Assistente em 3 Passos:** Mostre o botão **"+ Nova Intervenção"**:
    - Passo 1: Escolha da lacuna (vinda de uma prova com resultado < 60).
    - Passo 2: Escolha do tipo (apenas os 2 aprovados: Lista de exercícios ou Pré/Pós-aula).
    - Passo 3: Vinculação do reteste na próxima prova.

### 7. Prova em Papel com Leitura Óptica OMR (`/instituicao/provas/[id]/correcao`) · [12:00 – 13:30]
* **Onde clicar:** Menu lateral → **Provas** → Prova Presencial Impressa → **Correção Óptica**.
* **O que mostrar:**
  - **Download de Cadernos e Folhas de Resposta:** Demonstre os botões que geram o PDF vetorial com diagramação em duas colunas, QR code individual e marcas de calibração em L.
  - **Processamento de Lote:** Mostre o upload de folhas escaneadas e fotos de celular.
  - **Fila de Conferência Assistida:** Mostre o recorte visual da bolha ampliado na tela quando uma marcação for ambígua ou rasurada, permitindo ao professor confirmar com 1 clique sem digitar nada.
  - **Fala-chave:** *"A faculdade pode aplicar a prova presencialmente no papel, passar pelo scanner de mesa ou fotografar com celular, e a plataforma faz a leitura com tolerância zero a erro silencioso."*

### 8. Montagem Assistida de Simulado ENAMED (`/instituicao/provas`) · [13:30 – 15:00]
* **Onde clicar:** Menu lateral → **Provas** → Botão **"+ Nova Avaliação"**.
* **O que mostrar:**
  - Seletor de Tipo: Mostre as opções específicas aprovadas: **Simulado ENAMED 4º Período**, **8º Período** e **12º Período**.
  - **Matriz Oficial INEP:** Demonstre a distribuição automática de 100 questões divididas nas 7 Grandes Áreas e a curva de dificuldade planejada (30% Fácil, 50% Média, 20% Difícil).
  - Etapa de Seleção de Itens: Mostre a busca no acervo com classificação por área, cenário do INEP e estatísticas psicométricas históricas ($p$ e $D$).
  - **Fechamento:** *"A montagem de uma prova institucional completa leva menos de 5 minutos, garantindo aderência rigorosa às diretrizes curriculares nacionais."*

---

## O que Depende dos Médicos para a Versão Final

Ao final da apresentação, pontue objetivamente os itens de conteúdo médico que estão prontos no sistema aguardando a validação final da equipe de especialistas:

1. **Árvore de Classificação Clínica (Temas e Competências):** O sistema hoje classifica perfeitamente por **7 Grandes Áreas** e **Cenários de Atuação INEP**. Para ativar os filtros de temas específicos e competências clínicas, precisamos da lista estruturada que os médicos utilizam.
2. **Matriz da 1ª Etapa do Ciclo Básico:** A plataforma já está preparada; quando o INEP publicar a portaria oficial da 1ª etapa, a matriz será plugada em `regua-enamed-content.ts`.
3. **Parâmetros da Regra de Consistência de Prontidão:** Definir o percentual de acerto mínimo (ex: 65%) e a quantidade de simulados anuais que a instituição adotará como meta.
4. **Nomenclatura Preferida dos Níveis:** Confirmar se preferem manter *"No caminho"*, *"Em atenção"* e *"Distante"* ou se desejam termos como *"Apto"*, *"Em desenvolvimento"* e *"Prioritário"*.
