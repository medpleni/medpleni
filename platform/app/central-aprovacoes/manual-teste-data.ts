// Dados estruturados do Manual de Teste B2B MedPleni
// Fonte: medpleni-b2b-manual-de-teste.html (Atualizado em 19/11/2026)

export interface ManualTestItem {
  id: string;
  name: string;
  description: string;
  steps: string[];
  evaluationQuestion: string;
  inRevision?: boolean;
}

export interface ManualTestModule {
  key: string;
  name: string;
  path: string;
  note?: string | null;
  items: ManualTestItem[];
}

export interface TestOption {
  value: string;
  label: string;
  badgeClass: 'ok' | 'warn' | 'bad' | 'default';
  color: string;
  bg: string;
}

export const TEST_OPTIONS: TestOption[] = [
  { value: 'ok', label: 'Está bom', badgeClass: 'ok', color: '#00756F', bg: '#E3F5F3' },
  { value: 'aj', label: 'Ajustar', badgeClass: 'warn', color: '#A06D00', bg: '#FBF1DC' },
  { value: 'mv', label: 'Mudar de lugar', badgeClass: 'warn', color: '#A06D00', bg: '#FBF1DC' },
  { value: 'rm', label: 'Tirar', badgeClass: 'bad', color: '#B4403A', bg: '#FBE9E7' },
  { value: 'nf', label: 'Não funcionou', badgeClass: 'bad', color: '#B4403A', bg: '#FBE9E7' },
  { value: 'ne', label: 'Não entendi', badgeClass: 'warn', color: '#A06D00', bg: '#FBF1DC' },
];

export const MANUAL_TESTE_MODULES: ManualTestModule[] = [
  {
    "key": "GE",
    "name": "Navegação geral",
    "path": "toda a área /instituicao",
    "note": null,
    "items": [
      {
        "id": "GE-01",
        "name": "Menu lateral",
        "description": "Lista de módulos à esquerda; cada item abre uma tela.",
        "steps": [
          "Passe por todos os itens do menu, de cima para baixo.",
          "Veja se os nomes dizem o que a tela faz."
        ],
        "evaluationQuestion": "A ordem do menu faz sentido? Tem item demais? Algum nome confuso? O que você agruparia?",
        "inRevision": false
      },
      {
        "id": "GE-02",
        "name": "Tema claro e escuro",
        "description": "Botão no canto superior direito alterna o tema.",
        "steps": [
          "Alterne entre claro e escuro em duas ou três telas."
        ],
        "evaluationQuestion": "Qual deve ser o padrão? Alguma tela fica ilegível em um dos temas?",
        "inRevision": false
      },
      {
        "id": "GE-03",
        "name": "Uso em notebook, tablet e celular",
        "description": "A plataforma deve funcionar em telas menores.",
        "steps": [
          "Abra a Visão geral e uma turma no celular ou tablet."
        ],
        "evaluationQuestion": "Dá para usar? O que quebra?",
        "inRevision": false
      }
    ]
  },
  {
    "key": "VG",
    "name": "Visão geral",
    "path": "Menu › Visão geral",
    "note": "É a primeira tela do dirigente e do coordenador. Na reunião de 19/11 ficou combinado que ela está poluída e que vamos escolher o que fica.",
    "items": [
      {
        "id": "VG-01",
        "name": "Prova em análise",
        "description": "Caixa de seleção no topo. Todos os números da tela se referem à prova escolhida.",
        "steps": [
          "Troque a prova selecionada.",
          "Confira se os indicadores e o mapa mudam."
        ],
        "evaluationQuestion": "Ficou claro que a tela inteira depende dessa escolha? O nome está bom?",
        "inRevision": false
      },
      {
        "id": "VG-02",
        "name": "Indicadores do topo",
        "description": "Cinco números: nota média da instituição, alunos abaixo de 60%, participação, turmas abaixo de 60% e zona de decisão (51 a 60%).",
        "steps": [
          "Leia os cinco e o rodapé Base / Período / Fonte.",
          "Clique em um indicador para ver o detalhe."
        ],
        "evaluationQuestion": "São esses os cinco números que um diretor quer ver primeiro? Qual sai, qual entra?",
        "inRevision": false
      },
      {
        "id": "VG-03",
        "name": "Mapa de calor: turmas × áreas",
        "description": "Tabela com uma linha por turma e uma coluna por área, mais a média final da turma. Cores em quatro faixas: até 50, 51–60, 61–70, 71 ou mais.",
        "steps": [
          "Localize a turma e a área mais fracas.",
          "Confira se a coluna Média final aparece."
        ],
        "evaluationQuestion": "As 7 áreas estão corretas? Na reunião foi dito que do 1º ao 3º período essas áreas não se aplicam: como você mostraria os períodos iniciais?",
        "inRevision": false
      },
      {
        "id": "VG-04",
        "name": "Evolução entre provas",
        "description": "Cartões com a média da instituição em cada prova e o percentual abaixo de 60.",
        "steps": [
          "Compare as três provas.",
          "Leia o aviso sobre provas diferentes não serem a mesma régua."
        ],
        "evaluationQuestion": "Ajuda a enxergar tendência? O aviso é necessário?",
        "inRevision": false
      },
      {
        "id": "VG-05",
        "name": "Painel de alertas",
        "description": "Lista de turmas e áreas abaixo de 60%.",
        "steps": [
          "Role até os alertas e leia três deles."
        ],
        "evaluationQuestion": "É útil ou é repetição do mapa de calor? Alertas demais?",
        "inRevision": false
      },
      {
        "id": "VG-06",
        "name": "A tela inicial como um todo",
        "description": "Decisão pendente: o que permanece na primeira tela.",
        "steps": [
          "Olhe a tela inteira sem rolar e depois rolando."
        ],
        "evaluationQuestion": "Liste, em ordem, os 3 ou 4 blocos que devem ficar. O resto vira página própria.",
        "inRevision": false
      }
    ]
  },
  {
    "key": "TU",
    "name": "Turmas",
    "path": "Menu › Turmas",
    "note": null,
    "items": [
      {
        "id": "TU-01",
        "name": "Lista de turmas",
        "description": "Todas as turmas com período, número de alunos, média e alunos abaixo de 60.",
        "steps": [
          "Abra a lista e ordene mentalmente da pior para a melhor.",
          "Clique em uma turma."
        ],
        "evaluationQuestion": "Faltou alguma coluna? Alguma sobra?",
        "inRevision": false
      },
      {
        "id": "TU-02",
        "name": "Turma: resultado por área e cenário",
        "description": "Dentro da turma, o desempenho agregado por área e por cenário, sem nomes de alunos.",
        "steps": [
          "Abra uma turma do 8º ou do 12º período.",
          "Veja as áreas e os cenários."
        ],
        "evaluationQuestion": "Os cenários listados estão corretos e completos? (O Dr. Filipe ficou de enviar a lista oficial.)",
        "inRevision": false
      },
      {
        "id": "TU-03",
        "name": "Turma: gráfico de dispersão",
        "description": "Cada ponto é um aluno. Vertical: nota média. Horizontal: número de questões feitas ou de simulados (alternável). Linha tracejada em 60% e quatro quadrantes.",
        "steps": [
          "Abra a dispersão de uma turma.",
          "Alterne o eixo entre questões e simulados.",
          "Clique em um ponto."
        ],
        "evaluationQuestion": "Era esse o gráfico pedido? Os nomes dos quadrantes estão bons? O destaque de quem está perto da linha aparece?",
        "inRevision": false
      },
      {
        "id": "TU-04",
        "name": "Turma: aba Estudantes",
        "description": "Tabela com os alunos e suas notas. É dado individual, com aviso e registro de acesso.",
        "steps": [
          "Abra a aba de estudantes.",
          "Leia o aviso de dado individual."
        ],
        "evaluationQuestion": "As colunas servem? O aviso atrapalha ou é adequado?",
        "inRevision": false
      },
      {
        "id": "TU-05",
        "name": "Perfil do aluno e dispersão individual",
        "description": "Ao abrir um aluno: notas ao longo do tempo comparadas à média da turma, resultado por área e o gráfico do mesmo aluno no tempo.",
        "steps": [
          "Clique em um aluno.",
          "Veja se dá para dizer se ele está subindo ou caindo."
        ],
        "evaluationQuestion": "O gráfico individual mostra a evolução com clareza? O que mais você quer ver do aluno?",
        "inRevision": false
      },
      {
        "id": "TU-06",
        "name": "Turma: provas aplicadas",
        "description": "Lista das provas feitas pela turma, com a nota geral de cada uma.",
        "steps": [
          "Abra a aba de provas da turma.",
          "Entre no resultado de uma prova."
        ],
        "evaluationQuestion": "O total geral aparece ao lado das áreas?",
        "inRevision": false
      },
      {
        "id": "TU-07",
        "name": "Turma: prontidão",
        "description": "Quantos alunos estão em cada nível (No caminho, Em atenção, Distante) pela regra de volume de questões e de simulados.",
        "steps": [
          "Abra a prontidão da turma.",
          "Veja o que falta para um aluno mudar de nível."
        ],
        "evaluationQuestion": "Os três nomes servem? A referência de 10.000 questões no ano vale para começar?",
        "inRevision": false
      },
      {
        "id": "TU-08",
        "name": "Turma: intervenções",
        "description": "Intervenções ligadas à turma.",
        "steps": [
          "Abra a aba de intervenções."
        ],
        "evaluationQuestion": "Em revisão: na reunião o Dr. Filipe propôs não oferecer intervenção, só mostrar em que área e tema o aluno vai mal. Tiramos esta aba?",
        "inRevision": true
      }
    ]
  },
  {
    "key": "AC",
    "name": "Acompanhamento",
    "path": "Menu › Acompanhamento",
    "note": "Funções inspiradas no que vimos na SPR e aprovadas no grupo. Cada uma fica em uma aba.",
    "items": [
      {
        "id": "AC-01",
        "name": "Quem precisa de atenção agora",
        "description": "Lista priorizada de alunos, com o motivo ao lado (nota abaixo de 60, zona de decisão e outros).",
        "steps": [
          "Abra a lista.",
          "Leia a regra de ordenação escrita na tela."
        ],
        "evaluationQuestion": "A ordem de prioridade faz sentido? Você usaria isso toda semana?",
        "inRevision": false
      },
      {
        "id": "AC-02",
        "name": "Zona de decisão",
        "description": "Alunos com nota entre 51 e 60%.",
        "steps": [
          "Abra a aba e filtre por turma."
        ],
        "evaluationQuestion": "A faixa 51–60 é a certa? O que você faria com essa lista?",
        "inRevision": false
      },
      {
        "id": "AC-03",
        "name": "Meta semanal de questões",
        "description": "Grade aluno × semana mostrando quem cumpriu, cumpriu em parte ou não cumpriu a meta.",
        "steps": [
          "Abra a grade.",
          "Procure quem está há mais semanas sem cumprir."
        ],
        "evaluationQuestion": "Qual meta semanal vocês recomendariam? A grade é legível?",
        "inRevision": false
      },
      {
        "id": "AC-04",
        "name": "Resumo da semana",
        "description": "Texto curto pronto para copiar e mandar à direção por WhatsApp ou e-mail.",
        "steps": [
          "Gere o resumo.",
          "Clique em copiar e cole em uma conversa de teste."
        ],
        "evaluationQuestion": "O texto está no tom certo? O que um diretor quer ler ali? (Há uma menção à SPR na tela que será removida.)",
        "inRevision": false
      },
      {
        "id": "AC-05",
        "name": "Configuração de alertas",
        "description": "Alertas de engajamento vêm desligados; a instituição liga os que quiser.",
        "steps": [
          "Ligue um alerta.",
          "Volte à lista de atenção e veja se mudou."
        ],
        "evaluationQuestion": "Quais alertas valem a pena? Algum deveria vir ligado?",
        "inRevision": false
      },
      {
        "id": "AC-06",
        "name": "Sessões atípicas",
        "description": "Sinaliza padrões de resposta incomuns (chute, refazer questão, possível consulta externa), com a regra escrita.",
        "steps": [
          "Abra a aba e leia as três regras."
        ],
        "evaluationQuestion": "As regras são razoáveis? O aviso 'indica padrão, não prova' está claro?",
        "inRevision": false
      }
    ]
  },
  {
    "key": "PR",
    "name": "Provas",
    "path": "Menu › Provas",
    "note": "Algumas telas deste módulo ainda estão em outro visual; avalie a função, não a aparência.",
    "items": [
      {
        "id": "PR-01",
        "name": "Lista de provas",
        "description": "Todas as provas com situação: rascunho, em revisão, publicada, aplicada, corrigida.",
        "steps": [
          "Abra a lista.",
          "Identifique uma prova corrigida e uma em rascunho."
        ],
        "evaluationQuestion": "As situações estão claras?",
        "inRevision": false
      },
      {
        "id": "PR-02",
        "name": "Nova prova · 1. Definição",
        "description": "Título, tipo (prova regular, Simulado ENAMED 4º, 8º ou 12º período, pré-aula, pós-aula), turmas, data e modalidade (online, papel com QR, híbrida).",
        "steps": [
          "Clique em nova prova.",
          "Escolha um Simulado ENAMED e a modalidade papel."
        ],
        "evaluationQuestion": "Os tipos e as três modalidades estão certos? Falta algum?",
        "inRevision": false
      },
      {
        "id": "PR-03",
        "name": "Nova prova · 2. Matriz",
        "description": "Quantas questões por área, a proporção de fáceis, médias e difíceis e a cota de questões com imagem.",
        "steps": [
          "Monte uma matriz de 20 questões.",
          "Mude a curva de dificuldade."
        ],
        "evaluationQuestion": "É assim que vocês planejam uma prova? O que falta definir aqui?",
        "inRevision": false
      },
      {
        "id": "PR-04",
        "name": "Nova prova · 3. Seleção",
        "description": "A plataforma propõe questões que cumprem a matriz; você troca, remove e busca no banco.",
        "steps": [
          "Veja a proposta.",
          "Troque uma questão."
        ],
        "evaluationQuestion": "A proposta automática ajuda? Os filtros de busca bastam?",
        "inRevision": false
      },
      {
        "id": "PR-05",
        "name": "Nova prova · 4. Revisão e publicação",
        "description": "Checagens automáticas e uma única revisão antes de publicar.",
        "steps": [
          "Chegue até o passo 4.",
          "Leia as checagens."
        ],
        "evaluationQuestion": "Uma revisão só está adequado? Alguma checagem a mais?",
        "inRevision": false
      },
      {
        "id": "PR-06",
        "name": "Monitor de aplicação",
        "description": "Durante a prova: quem iniciou, quem terminou, quem faltou.",
        "steps": [
          "Abra o monitor de uma prova."
        ],
        "evaluationQuestion": "O professor precisa de mais alguma informação durante a aplicação?",
        "inRevision": false
      },
      {
        "id": "PR-07",
        "name": "Prova online (visão do aluno)",
        "description": "Tela em que o aluno responde, com cronômetro e navegação entre questões.",
        "steps": [
          "Use 'Ir para Área do Aluno' no rodapé do menu.",
          "Abra uma prova disponível e responda algumas questões."
        ],
        "evaluationQuestion": "A tela é confortável para 100 questões? Algo distrai?",
        "inRevision": false
      },
      {
        "id": "PR-08",
        "name": "Cartão de respostas digital (híbrida)",
        "description": "O aluno recebe o caderno em papel e marca só as respostas no celular.",
        "steps": [
          "Na área do aluno, abra uma prova híbrida.",
          "Marque as respostas."
        ],
        "evaluationQuestion": "Funcionaria em sala? O que pode dar errado?",
        "inRevision": false
      },
      {
        "id": "PR-09",
        "name": "Prova em papel: caderno e folha com QR",
        "description": "PDF do caderno e folha de respostas individual com QR code.",
        "steps": [
          "Em uma prova de papel, gere os PDFs.",
          "Se puder, imprima uma folha de respostas."
        ],
        "evaluationQuestion": "A folha está no padrão que vocês usam? Bolhas, tamanho, identificação do aluno.",
        "inRevision": false
      },
      {
        "id": "PR-10",
        "name": "Correção: leitura das folhas e digitação",
        "description": "Envio das folhas digitalizadas ou fotografadas para leitura automática, com conferência; alternativa de digitar pelo teclado.",
        "steps": [
          "Abra a correção de uma prova.",
          "Veja as abas Leitura de lote e Digitação por teclado."
        ],
        "evaluationQuestion": "O fluxo é simples o bastante para uma secretaria? Ainda não foi testado com folhas reais.",
        "inRevision": false
      },
      {
        "id": "PR-11",
        "name": "Resultado: resumo e curva de distribuição",
        "description": "Média, mediana, percentual abaixo de 60 e o gráfico de distribuição das notas com a mediana e a linha de 60.",
        "steps": [
          "Abra o resultado de uma prova corrigida.",
          "Localize a mediana e a linha de 60 no gráfico."
        ],
        "evaluationQuestion": "Era essa a curva pedida? Os extremos aparecem bem?",
        "inRevision": false
      },
      {
        "id": "PR-12",
        "name": "Resultado por área e cenário",
        "description": "Desempenho da prova separado por área e por cenário, com o total geral.",
        "steps": [
          "Alterne entre as abas de área e cenário."
        ],
        "evaluationQuestion": "Quando os temas entrarem, como você quer vê-los aqui?",
        "inRevision": false
      },
      {
        "id": "PR-13",
        "name": "Análise das questões",
        "description": "Por questão: facilidade, discriminação, ponto-bisserial corrigida, alternativas marcadas e etiquetas de alerta. Para a prova: KR-20.",
        "steps": [
          "Abra a análise das questões.",
          "Filtre só as questões com alerta.",
          "Abra o 'como é calculado' de um índice."
        ],
        "evaluationQuestion": "Os índices e os limites dos alertas estão corretos? A explicação está clara para um professor?",
        "inRevision": false
      },
      {
        "id": "PR-14",
        "name": "Exportação",
        "description": "Planilha aluno × questão × alternativa marcada.",
        "steps": [
          "Exporte o resultado de uma prova."
        ],
        "evaluationQuestion": "O arquivo serve para a análise que vocês fazem hoje?",
        "inRevision": false
      }
    ]
  },
  {
    "key": "BQ",
    "name": "Banco de questões",
    "path": "Menu › Banco de questões",
    "note": "As 1.255 questões do drive foram importadas, mas a classificação por área e cenário ainda não foi carregada; os contadores aparecem zerados.",
    "items": [
      {
        "id": "BQ-01",
        "name": "Visão geral e cobertura",
        "description": "Quantas questões existem por área e por cenário.",
        "steps": [
          "Abra a visão geral."
        ],
        "evaluationQuestion": "Depois de corrigida a classificação, que números você quer ver aqui?",
        "inRevision": false
      },
      {
        "id": "BQ-02",
        "name": "Explorar e filtrar",
        "description": "Busca de questões com filtros por área, cenário, tema, dificuldade, origem e ano.",
        "steps": [
          "Busque uma questão por palavra.",
          "Use dois filtros juntos."
        ],
        "evaluationQuestion": "Os filtros são os que um professor usaria?",
        "inRevision": false
      },
      {
        "id": "BQ-03",
        "name": "Ficha da questão",
        "description": "Enunciado, alternativas, gabarito, comentário, classificação, origem e histórico de desempenho.",
        "steps": [
          "Abra uma questão.",
          "Confira enunciado, gabarito e comentário."
        ],
        "evaluationQuestion": "A questão foi importada corretamente? Formatação, imagens, tabelas.",
        "inRevision": false
      },
      {
        "id": "BQ-04",
        "name": "Elaborar questão",
        "description": "Formulário para o professor escrever uma questão nova.",
        "steps": [
          "Clique em elaborar questão.",
          "Preencha até a classificação."
        ],
        "evaluationQuestion": "Os campos obrigatórios estão certos? (Área, cenário e tema obrigatórios; competência opcional.)",
        "inRevision": false
      },
      {
        "id": "BQ-05",
        "name": "Importação de arquivos",
        "description": "Envio de DOCX, planilha ou PDF, com conferência lado a lado antes de entrar no banco.",
        "steps": [
          "Abra a importação.",
          "Baixe um dos modelos de arquivo."
        ],
        "evaluationQuestion": "O modelo de arquivo é viável para vocês preencherem?",
        "inRevision": false
      },
      {
        "id": "BQ-06",
        "name": "Revisão",
        "description": "Fila única de revisão antes de a questão ser publicada.",
        "steps": [
          "Localize a fila de revisão."
        ],
        "evaluationQuestion": "Quem revisa? O fluxo de uma etapa está adequado?",
        "inRevision": false
      }
    ]
  },
  {
    "key": "RE",
    "name": "Régua ENAMED",
    "path": "Menu › Régua ENAMED",
    "note": null,
    "items": [
      {
        "id": "RE-01",
        "name": "As três etapas",
        "description": "Página com as etapas do 4º, 8º e 12º períodos e a situação da instituição em cada uma.",
        "steps": [
          "Abra a página e leia as três etapas."
        ],
        "evaluationQuestion": "O conteúdo está correto do ponto de vista regulatório? O que você mostraria a um diretor aqui?",
        "inRevision": false
      }
    ]
  },
  {
    "key": "LO",
    "name": "Avaliação longitudinal",
    "path": "Menu › Avaliação longitudinal",
    "note": "O gráfico desta tela ainda está fora do padrão visual.",
    "items": [
      {
        "id": "LO-01",
        "name": "Mapa currículo × área",
        "description": "Períodos do curso nas colunas e áreas nas linhas, com o resultado médio em cada cruzamento.",
        "steps": [
          "Abra o mapa.",
          "Localize os marcos do 4º, 8º e 12º períodos."
        ],
        "evaluationQuestion": "Dá para ler a trajetória do curso? As áreas servem para os períodos iniciais?",
        "inRevision": false
      },
      {
        "id": "LO-02",
        "name": "Trilha de uma área",
        "description": "Evolução de uma área ao longo dos períodos e comparação entre turmas.",
        "steps": [
          "Escolha uma área e veja a evolução."
        ],
        "evaluationQuestion": "É útil para o coordenador? O que falta?",
        "inRevision": false
      },
      {
        "id": "LO-03",
        "name": "Plano de acompanhamento",
        "description": "Registro de ação combinada para turma ou aluno abaixo de 60, com data e prova de verificação.",
        "steps": [
          "Abra um plano existente."
        ],
        "evaluationQuestion": "Mantemos? Está ligado à decisão sobre intervenções.",
        "inRevision": true
      }
    ]
  },
  {
    "key": "IN",
    "name": "Intervenções",
    "path": "Menu › Intervenções",
    "note": "Em revisão. Na reunião de 19/11 o Dr. Filipe propôs não oferecer intervenção na plataforma, apenas mostrar em que área e tema o aluno vai mal.",
    "items": [
      {
        "id": "IN-01",
        "name": "Lista de intervenções",
        "description": "Intervenções com resultado antes e depois e adesão.",
        "steps": [
          "Abra a lista."
        ],
        "evaluationQuestion": "Tiramos o módulo inteiro do menu, ou algo aqui vale manter?",
        "inRevision": true
      },
      {
        "id": "IN-02",
        "name": "Nova intervenção",
        "description": "Assistente em 3 passos, com dois tipos: lista de exercícios e pré e pós-aula.",
        "steps": [
          "Abra o assistente."
        ],
        "evaluationQuestion": "Se o módulo sair, a lista de exercícios para o aluno deve continuar existindo em outro lugar?",
        "inRevision": true
      }
    ]
  },
  {
    "key": "PF",
    "name": "Professores",
    "path": "Menu › Professores",
    "note": null,
    "items": [
      {
        "id": "PF-01",
        "name": "Adesão dos professores",
        "description": "Quem acessa, quantas provas criou, quem nunca entrou. Visível só para a gestão.",
        "steps": [
          "Abra a página.",
          "Use os filtros de quem nunca acessou."
        ],
        "evaluationQuestion": "Um diretor usaria isso? Algum cuidado com a forma de mostrar?",
        "inRevision": false
      }
    ]
  },
  {
    "key": "PT",
    "name": "Prontidão acadêmica",
    "path": "Menu › Prontidão acadêmica",
    "note": "Nesta tela os números são ilustrativos; avalie o formato e a regra, não os valores.",
    "items": [
      {
        "id": "PT-01",
        "name": "Prontidão da instituição",
        "description": "Distribuição dos alunos em três níveis, pelas regras de volume (questões no ano) e consistência (X% em Y simulados).",
        "steps": [
          "Abra a página.",
          "Abra um aluno e veja o que falta para mudar de nível."
        ],
        "evaluationQuestion": "Quais valores usar: quantas questões no ano, qual percentual, em quantos simulados? O nome 'Prontidão' serve?",
        "inRevision": false
      }
    ]
  },
  {
    "key": "TP",
    "name": "Turmas × Provas",
    "path": "Menu › Turmas × Provas",
    "note": null,
    "items": [
      {
        "id": "TP-01",
        "name": "Matriz turmas × provas",
        "description": "Média de cada turma em cada prova, colorida em relação a 60%.",
        "steps": [
          "Abra a matriz.",
          "Clique em uma célula."
        ],
        "evaluationQuestion": "Página própria ou parte da Visão geral?",
        "inRevision": false
      }
    ]
  },
  {
    "key": "CM",
    "name": "Cobertura da matriz",
    "path": "Menu › Cobertura da matriz",
    "note": null,
    "items": [
      {
        "id": "CM-01",
        "name": "Cobertura",
        "description": "Quanto de cada área já foi avaliado no período.",
        "steps": [
          "Abra a página."
        ],
        "evaluationQuestion": "Isso interessa à coordenação? Faz sentido sem temas?",
        "inRevision": false
      }
    ]
  },
  {
    "key": "RL",
    "name": "Relatórios",
    "path": "Menu › Relatórios",
    "note": null,
    "items": [
      {
        "id": "RL-01",
        "name": "Relatório executivo",
        "description": "Documento exportável com indicadores, mapa e evolução, pensado como insumo para CPA, NDE e MEC.",
        "steps": [
          "Gere o relatório de uma prova.",
          "Abra o arquivo."
        ],
        "evaluationQuestion": "O conteúdo serve para uma reunião de NDE? O que precisa constar?",
        "inRevision": false
      }
    ]
  },
  {
    "key": "CF",
    "name": "Configurações",
    "path": "Menu › Configurações",
    "note": null,
    "items": [
      {
        "id": "CF-01",
        "name": "Estrutura acadêmica",
        "description": "Cursos, períodos letivos e turmas.",
        "steps": [
          "Abra a aba de estrutura."
        ],
        "evaluationQuestion": "Na reunião surgiu a necessidade de disciplinas próprias por período e por faculdade. Como vocês cadastrariam isso?",
        "inRevision": false
      },
      {
        "id": "CF-02",
        "name": "Importação de matrículas",
        "description": "Planilha com nome, e-mail, RA e turma.",
        "steps": [
          "Abra a aba e veja o modelo."
        ],
        "evaluationQuestion": "É o que a secretaria de uma faculdade consegue fornecer?",
        "inRevision": false
      },
      {
        "id": "CF-03",
        "name": "Usuários e papéis",
        "description": "Dirigente, coordenador, docente e aluno.",
        "steps": [
          "Abra a aba de usuários."
        ],
        "evaluationQuestion": "Os quatro papéis bastam?",
        "inRevision": false
      },
      {
        "id": "CF-04",
        "name": "Parâmetros",
        "description": "Nota de corte (60%), alertas e meta semanal.",
        "steps": [
          "Abra os parâmetros."
        ],
        "evaluationQuestion": "Algum outro parâmetro que a faculdade deva poder mudar?",
        "inRevision": false
      }
    ]
  },
  {
    "key": "GV",
    "name": "Governança e LGPD",
    "path": "Menu › Governança & LGPD",
    "note": null,
    "items": [
      {
        "id": "GV-01",
        "name": "Privacidade e auditoria",
        "description": "Registro de quem acessou dados individuais, trilha de alterações e regras de retenção.",
        "steps": [
          "Passe pelas quatro abas."
        ],
        "evaluationQuestion": "Isso responde ao que uma faculdade pergunta sobre dados de alunos?",
        "inRevision": false
      }
    ]
  },
  {
    "key": "AL",
    "name": "Área do aluno",
    "path": "Rodapé do menu › Ir para Área do Aluno",
    "note": null,
    "items": [
      {
        "id": "AL-01",
        "name": "Início do aluno",
        "description": "Próximo passo sugerido, provas abertas e listas pendentes.",
        "steps": [
          "Entre na área do aluno."
        ],
        "evaluationQuestion": "A orientação ao aluno é a certa? (A ideia da reunião: mostrar área e tema em que ele vai mal.)",
        "inRevision": false
      },
      {
        "id": "AL-02",
        "name": "Minha evolução",
        "description": "Notas do aluno no tempo, com a média da turma como referência, sem ranking.",
        "steps": [
          "Abra Minha evolução."
        ],
        "evaluationQuestion": "Mostrar a média da turma ajuda ou pressiona?",
        "inRevision": false
      },
      {
        "id": "AL-03",
        "name": "Resultados por área",
        "description": "Desempenho do aluno por área, do mais fraco ao mais forte.",
        "steps": [
          "Abra Resultados por área."
        ],
        "evaluationQuestion": "Quando houver temas, o aluno deve ver 'estude pneumonia'?",
        "inRevision": false
      },
      {
        "id": "AL-04",
        "name": "Minhas avaliações",
        "description": "Resultados e revisão dos erros em modo leitura.",
        "steps": [
          "Abra uma avaliação corrigida.",
          "Revise um erro."
        ],
        "evaluationQuestion": "A devolutiva está suficiente?",
        "inRevision": false
      },
      {
        "id": "AL-05",
        "name": "Praticar",
        "description": "Listas de questões para treino.",
        "steps": [
          "Abra uma lista e responda duas questões."
        ],
        "evaluationQuestion": "É a experiência de treino que vocês querem vender às faculdades?",
        "inRevision": false
      }
    ]
  },
  {
    "key": "DO",
    "name": "Visão do docente",
    "path": "depende de login de professor (a liberar)",
    "note": null,
    "items": [
      {
        "id": "DO-01",
        "name": "Início do docente",
        "description": "Tela simples com minhas turmas, onde a turma mais erra, minhas provas e questões a revisar.",
        "steps": [
          "Aguarde o login de professor que o Mario vai enviar.",
          "Entre e veja os quatro blocos."
        ],
        "evaluationQuestion": "Está simples o bastante para um professor que usa pouco a plataforma?",
        "inRevision": false
      }
    ]
  }
];
