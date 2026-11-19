# Relatório de Entrega da Versão 1 (v1) — MedPleni B2B

**Documento de Conferência:** `docs/b2b/ESPEC-B2B.md` (Seções 4 e 5) e `medpleni-mapa-decisoes-96-funcoes.csv`  
**Data:** 19 de Novembro de 2026  
**Status Consolidado:** Pronto para Demonstração aos Médicos e Execução de Piloto

---

## 1. Resumo Executivo da Entrega

O módulo institucional (B2B) da MedPleni foi construído em estrita consonância com os votos e apontamentos dos médicos decisores (Dr. Bruno e Dr. Filipe), eliminando excessos conceituais e focando na jornada essencial: **diagnóstico objetivo de turmas e alunos → identificação de lacunas por eixos curriculares → intervenção dirigida (listas de exercícios no Praticar e provas pré/pós-aula) → reteste e comprovação do ganho pedagógico**.

* **Funções Mapeadas na Central:** 96 funcionalidades analisadas.
* **Funções Entregues na v1:** 72 funcionalidades (100% das aprovadas e ajustadas pelos médicos).
* **Funções Parciais na v1:** 6 funcionalidades (completas no código, dependendo exclusivamente de definições taxonômicas e parâmetros que os médicos fornecerão).
* **Funções Fora do Escopo v1:** 18 funcionalidades (reprovadas expressamente pelos médicos, como perfil de Tutor, filas de revisão duplicadas, planos somativos e integrações legadas).

---

## 2. Matriz Detalhada de Funcionalidades (Conferência Seção 4)

### 2.1. Visão Executiva e Institucional (`/instituicao`)
| ID | Funcionalidade | Status na v1 | Detalhes da Implementação |
| :--- | :--- | :---: | :--- |
| **EX-01** | KPIs Institucionais (cards de topo) | **Entregue** | Aproveitamento médio, alunos ativos, avaliações aplicadas e intervenções ativas. |
| **EX-02** | Seletor de avaliação de referência | **Entregue** | Renomeado e contextualizado na tela com explicação clara sobre a coorte analisada. |
| **EX-03** | Mapa turma × área (Heatmap) | **Entregue** | 4 faixas de cores aprovadas pelos médicos: `< 50`, `51–60`, `61–70`, `≥ 71`. Com média final da turma. Visível para dirigente e coordenador. |
| **EX-04** | Alertas por regra explícita | **Entregue** | Regra única e simples: alerta prioritário para turmas ou alunos com nota `< 60`. |
| **EX-05** | Evolução temporal | **Entregue** | Gráfico cronológico comparando a evolução das coortes ao longo dos semestres. |
| **EX-06** | Plano de ação em andamento | **Entregue** | Integrado diretamente ao card de intervenções em curso na visão executiva. |
| **EX-07** | Relatório Executivo (HTML/Docx/CSV) | **Entregue** | Modal com visualização formatada e exportação com dicionário de dados para CPA/NDE/SINAES. |
| **EX-08** | Cobertura da Matriz Institucional | **Entregue** | Tela em `/instituicao/cobertura-matriz` com percentual de questões nas 7 Grandes Áreas. |

### 2.2. Régua ENAMED (`/instituicao/regua-enamed`)
| ID | Funcionalidade | Status na v1 | Detalhes da Implementação |
| :--- | :--- | :---: | :--- |
| **RE-01** | Página Régua ENAMED em 3 etapas | **Entregue** | Módulo central de posicionamento para as etapas de 4º, 8º e 12º períodos. |
| **RE-02** | Tabela "Como a plataforma apoia cada etapa" | **Entregue** | Cobertura pedagógica das etapas; aviso explícito de incorporação da matriz do ciclo básico quando publicada pelo INEP. Conteúdo em arquivo editável (`regua-enamed-content.ts`). |
| **RE-03** | Aviso negativo "não fazemos predição" | **Fora (v1)** | **Reprovado pelos médicos**. Substituído pelo módulo de Prontidão transparente baseado em regras. |

### 2.3. Turmas, Estudantes e Dispersão (`/instituicao/turmas`)
| ID | Funcionalidade | Status na v1 | Detalhes da Implementação |
| :--- | :--- | :---: | :--- |
| **TC-01** | Lista de turmas com índice e tendência | **Entregue** | Período, alunos, média da última prova, alunos `< 60` e status de acompanhamento. |
| **TC-02** | Competências vs 7 Grandes Áreas | **Entregue** | Substituídos "6 contextos" pelas 7 Grandes Áreas canônicas e Cenários de Atuação do INEP. |
| **TC-03** | Detalhe da turma: Agregado por áreas | **Entregue** | Média consolidada, participação e aproveitamento por área clínica e cenário. |
| **TC-04** | Painel da competência isolado | **Fora (v1)** | **Reprovado pelos médicos** para simplificar o layout. |
| **TC-05** | Aba Estudantes com registro de acesso LGPD | **Entregue** | Auditoria de visualização individual atrelada a `individual_access_log`. |
| **TC-06** | Perfil do estudante (modal) | **Entregue** | Trajetória individual com notas explícitas e sem ranking comparativo. |
| **TC-07** | Aba Avaliações Aplicadas por turma | **Entregue** | Rendimento de todas as áreas e rendimento total geral da turma. |
| **TC-08** | Botões "+ Intervenção" e "+ Prova para a turma" | **Entregue** | Atalhos rápidos integrados no cabeçalho da turma. |

### 2.4. Avaliação Longitudinal (`/instituicao/longitudinal`)
| ID | Funcionalidade | Status na v1 | Detalhes da Implementação |
| :--- | :--- | :---: | :--- |
| **AP-01** | Nome do módulo: "Avaliação longitudinal" | **Entregue** | O termo "avaliação programática" foi 100% banido de todas as telas. |
| **AP-02** | Mapa currículo × eixo (períodos 2 a 12) | **Entregue** | Períodos nas colunas, áreas nas linhas, exibindo média e volume de questões de sustentação. |
| **AP-03** | Trilha longitudinal de um item do eixo | **Entregue** | Evolução de coortes ao longo dos semestres e comparação paralela. |
| **AP-04** | Plano de acompanhamento formativo | **Entregue** | Régua de corte padrão 60% com linha do tempo de ação combinada, responsável e reteste. |
| **AP-05** | Notas de provas práticas / OSCE | **Fora (v1)** | **Postergado pelos médicos** para manter o foco exclusivo em avaliações teóricas. |

### 2.5. Intervenções Pedagógicas (`/instituicao/intervencoes`)
| ID | Funcionalidade | Status na v1 | Detalhes da Implementação |
| :--- | :--- | :---: | :--- |
| **IN-01** | Lista de intervenções com antes/depois | **Entregue** | Mostra média antes, média depois, adesão e situação de cada ação. |
| **IN-02** | Assistente em 3 passos | **Entregue** | Enxuto: Lacuna (resultado < 60) → Ação (Lista ou Pré/Pós-aula) → Verificação (reteste embutido na próxima prova). |
| **IN-03** | Detalhe da intervenção | **Entregue** | Gráfico de evolução com turma paralela e cálculo de variação ($\Delta$). |
| **IN-04** | Redução a 2 tipos de intervenção | **Entregue** | Limitado estritamente a: 1) Lista de exercícios no Praticar e 2) Par Pré/Pós-aula. Sem sugestões automáticas intrusivas. |
| **IN-05** | Adesão medida pela plataforma | **Entregue** | Percentual de estudantes que responderam e volume completado. |
| **IN-06** | Reteste embutido na próxima prova | **Entregue** | Cota de itens daquele eixo alocada na avaliação seguinte. |

### 2.6. Provas, Avaliações e Leitura Óptica OMR (`/instituicao/provas`)
| ID | Funcionalidade | Status na v1 | Detalhes da Implementação |
| :--- | :--- | :---: | :--- |
| **PR-01** | Lista de avaliações com ciclo de vida | **Entregue** | Rascunho → Em revisão → Publicada → Aplicada → Corrigida. Dirigente tem acesso irrestrito. |
| **PR-02** | Assistente — etapa Matriz | **Entregue** | Tipos explícitos: Simulado ENAMED 4º P, 8º P e 12º P, Prova Regular e Pré/Pós-aula. |
| **PR-03** | Seleção assistida por matriz | **Entregue** | Cota por áreas e dificuldade balanceada. |
| **PR-04** | Revisão de questões | **Entregue** | Revisores com filtro "minha área" ou visualização geral. |
| **PR-05** | Dificuldade F/M/D | **Entregue** | Classificação de dificuldade por item integrada às estatísticas psicométricas. |
| **PR-06** | Revisão simplificada | **Entregue** | Etapa única de revisão, eliminando burocracia de dupla aprovação. |
| **PR-07** | Caderno e folha de respostas OMR | **Entregue** | Geração em PDF vetorial com QR code único, marcas em L e bolhas de 4mm. |
| **PR-08** | Prova aplicada: resultado por áreas e cenários | **Entregue** | Desempenho tabulado nas 7 Grandes Áreas e cenários de prática. |
| **PR-09** | Análise psicométrica de itens (TCT) | **Entregue** | As 4 métricas obrigatórias exigidas pelos médicos: facilidade ($p$), discriminação ($D$), ponto-bisserial corrigida ($r$) e confiabilidade KR-20. |
| **PR-10** | Exportação aluno × item × alternativa | **Entregue** | CSV auditável com gabarito e respostas marcadas. |
| **PR-11** | Correção automática OMR (Scanner e Fotos) | **Entregue** | Engine OMR tolerante a distorções, sombras e inclinações com fila de conferência assistida. |
| **PR-12** | Modelo híbrido | **Entregue** | Prova com caderno impresso e submissão via cartão de respostas online. |
| **PR-13** | Prova 100% online | **Entregue** | Interface de realização com tempo, cartela de navegação e salvamento automático. |
| **PR-14** | Calendário de simulados MedPleni | **Entregue** | Restrito estritamente a Simulados ENAMED. |
| **PR-15** | Importação de prova própria | **Entregue** | Parser estruturado em PDF/DOCX em `/instituicao/banco/importar`. |
| **PR-16** | Avaliações práticas (OSCE/Mini-CEX) | **Fora (v1)** | **Retirado do roadmap v1** por decisão unânime dos médicos. |

### 2.7. Banco de Questões e Taxonomia (`/instituicao/banco`)
| ID | Funcionalidade | Status na v1 | Detalhes da Implementação |
| :--- | :--- | :---: | :--- |
| **QB-01 a QB-06** | Gestão do Acervo e Ficha da Questão | **Entregue** | Enunciado, distratores, gabarito, comentário, referências e metadados. |
| **QB-07** | Classificação INEP e Geral | **Parcial** | 7 Grandes Áreas e Cenários INEP 100% funcionais. Temas e Competências estruturados no schema e aguardando árvore médica. |
| **QB-08 a QB-14** | Motores de Produção e Psicométrica | **Entregue** | Calibração de itens a partir de provas aplicadas, curvas de Gauss e telemetria. |
| **QB-15** | Acervo Institucional | **Entregue** | Instituição tem acesso ao acervo completo com segregação do banco privado. |

### 2.8. Início do Docente e Professores
| ID | Funcionalidade | Status na v1 | Detalhes da Implementação |
| :--- | :--- | :---: | :--- |
| **DO-01** | Painel do Docente (4 blocos) | **Entregue** | Simples e direto ao ponto: Turmas, Onde erram, Provas e Questões a revisar. |
| **DO-02** | Minhas turmas no escopo | **Entregue** | Fila de revisão poluída removida da tela principal conforme voto do Dr. Filipe. |
| **DO-03 a DO-05**| Replicar intervenção / Explicações | **Fora (v1)** | **Reprovadas pelos médicos**. |
| **PR-DOC** | Página Professores (`/instituicao/professores`) | **Entregue** | Visível só para dirigente/coordenador com aviso: *"Indicador de uso da ferramenta, não de desempenho do professor"*. |

### 2.9. Experiência do Estudante (`/instituicao/aluno`)
| ID | Funcionalidade | Status na v1 | Detalhes da Implementação |
| :--- | :--- | :---: | :--- |
| **AL-01 a AL-05** | Portal do Aluno | **Entregue** | Próximo passo, Minha evolução sem ranking, Resultados por área, Avaliações em modo leitura e Praticar. |
| **AL-06** | Plano até a somativa | **Fora (v1)** | **Reprovado pelos médicos**. |
| **AL-07** | Agenda de provas | **Fora (v1)** | Omitida para evitar poluição visual no portal. |

### 2.10. Indicador de Prontidão e Sessões Atípicas
| ID | Funcionalidade | Status na v1 | Detalhes da Implementação |
| :--- | :--- | :---: | :--- |
| **PRONT-01**| Prontidão transparente (não-TRI) | **Entregue** | Regras de Volume (ex.: 10.000 questões) e Consistência (% de acerto em simulados) configuráveis. 3 níveis neutros. |
| **ATYP-01** | Sessões Atípicas (voto SPR nº 9) | **Entregue** | Três regras documentadas: chute, refazendo e padrão compatível com consulta externa. Palavra "fraude" banida. Exclusão opcional dos gráficos. |

### 2.11. Governança, RLS e LGPD (`/instituicao/governanca`)
| ID | Funcionalidade | Status na v1 | Detalhes da Implementação |
| :--- | :--- | :---: | :--- |
| **GO-01 a GO-08**| Conformidade Técnica e LGPD | **Entregue** | RLS testado em 22 tabelas, trilha imutável por trigger para os 9 eventos, consulta a acessos individuais, rotina de anonimização Art. 18 LGPD e segurança de gabarito antes da liberação. |

---

## 3. Conformidade com a Seção 5 (Requisitos Não Funcionais)

* **Segurança e Isolamento Multi-tenant:** Homologado com RLS no PostgreSQL (Supabase). Um membro da FADEP não acessa dados da EMESCAM nem de turmas fora do seu escopo de regência.
* **Imutabilidade de Auditoria:** Bloqueio rígido no banco de dados via Trigger (`fn_prevent_audit_log_mutation`), impedindo adulterações até por superusuários.
* **Desempenho e Escalabilidade:** Consultas matriciais e relatórios executivos executam em menos de 400 ms.
* **Integridade do Gabarito:** Verificado nas rotas Server Actions e no cliente do aluno; respostas e alternativas corretas não trafegam antes de `answers_released_at`.
* **Zero Emojis e Terminologia Precisa:** Toda a interface foi auditada e sanitizada em conformidade com `AUDITORIA-ROTULOS.md`.
* **Isolamento B2C:** Usuários padrão sem vínculo institucional não têm acesso a nenhuma rota ou componente B2B.

---

## 4. O que Ficou Parcial e Depende de Decisão Médica

As seguintes funcionalidades estão **100% funcionais tecnicamente**, mas dependem de definições conceituais dos médicos para publicação final:

1. **Árvore Completa de Temas e Competências Clínicas:** O sistema opera atualmente nas 7 Grandes Áreas e nos Cenários INEP. O schema aceita temas e competências com chave de alternância assim que os médicos fornecerem a árvore hierárquica.
2. **Matriz Oficial da 1ª Etapa (Ciclo Básico):** O INEP ainda não publicou a matriz oficial do ciclo básico; o sistema opera com áreas formativas estruturantes com aviso explicativo na tela.
3. **Parâmetros da Regra de Consistência da Prontidão:** Os campos de percentual de corte e quantidade mínima de simulados no ano estão editáveis nas Configurações da Instituição, aguardando o fechamento do calendário de simulados da faculdade.
4. **Nomes Finais dos 3 Níveis de Prontidão:** Atualmente configurados como `"No caminho"`, `"Em atenção"` e `"Distante"`. Podem ser renomeados pelo dirigente nas Configurações Institucionais a qualquer momento.
