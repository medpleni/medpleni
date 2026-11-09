// Assistente de Inteligência Artificial para Validação B2B MedPleni
// Gera análises clínicas, pedagógicas e estratégicas para as 96 funcionalidades

import { B2BFeatureRaw } from "./features-data";

export interface AIExplanation {
  valorB2B: string;
  impactoPedagogico: string;
  recomendacaoIA: "Aprovar no Piloto" | "Ajustar Escopo" | "Priorizar Pós-Piloto" | "Discutir Jurídico/Comercial";
  justificativaRecomendacao: string;
  perguntaChave: string;
}

export function getFeatureAIExplanation(feature: B2BFeatureRaw): AIExplanation {
  const { id, mod, nome, desc, reuniao, pergunta, sugestao } = feature;

  // Lógica inteligente baseada no módulo e metadados da funcionalidade
  if (mod === "exec") {
    return {
      valorB2B: "Essencial para venda institucional e retenção do contrato. Mantenedores e diretores precisam justificar o investimento no MedPleni em 30 segundos com métricas visuais de conformidade MEC e ENAMED.",
      impactoPedagogico: "Permite à reitoria identificar gargalos curriculares antes do ciclo avaliativo do INEP, evitando notas 1 ou 2 que geram intervenções regulatórias.",
      recomendacaoIA: sugestao === "remover" ? "Ajustar Escopo" : "Aprovar no Piloto",
      justificativaRecomendacao: "Gera o efeito 'uau' na apresentação para reitores e pró-reitores acadêmicos. Deve manter alto nível de síntese sem expor dados sensíveis individuais.",
      perguntaChave: pergunta || "Quais os 3 indicadores que o reitor mais cobra do coordenador de curso na reunião mensal?",
    };
  }

  if (mod === "regua") {
    return {
      valorB2B: "Traduz o curso em 3 marcos objetivos (4º, 8º e 12º semestres), alinhando a faculdade com as fases oficiais do ciclo médico brasileiro.",
      impactoPedagogico: "Diferencia o ciclo básico (fisiopatologia), clínico (semiologia/diagnóstico) e internato (conduta e urgências). Evita cobrar do aluno do 4º semestre matérias de especialista.",
      recomendacaoIA: "Aprovar no Piloto",
      justificativaRecomendacao: "Alinhamento 100% aderente ao formato do ENAMED que os coordenadores acadêmicos estão buscando no mercado.",
      perguntaChave: pergunta || "As notas de corte por etapa devem ser universais ou calibráveis por faculdade parceira?",
    };
  }

  if (mod === "acad") {
    return {
      valorB2B: "É a ferramenta do coordenador acadêmico no dia a dia. Se o coordenador não usar semanalmente, a renovação da assinatura anual corre sério risco.",
      impactoPedagogico: "Identifica se turmas específicas têm lacunas em Pediatria ou Ginecologia, permitindo reforços pontuais antes dos exames de progresso.",
      recomendacaoIA: "Aprovar no Piloto",
      justificativaRecomendacao: "Item crítico para a governança acadêmica. A visão por competência DCN é o principal argumento de venda.",
      perguntaChave: pergunta || "O coordenador deve ter acesso aos nomes de todos os alunos ou a visão inicial deve ser anônima com threshold de proteção?",
    };
  }

  if (mod === "prog") {
    return {
      valorB2B: "Transforma a faculdade de 'aplicadora de provas pontuais' em uma instituição de ensino moderna baseada em Avaliação Programática e Matriz Longitudinal.",
      impactoPedagogico: "Acompanha o ganho de proficiência do estudante ao longo dos 6 anos de graduação, demonstrando evolução real em vez de apenas notas isoladas.",
      recomendacaoIA: sugestao === "remover" ? "Priorizar Pós-Piloto" : "Ajustar Escopo",
      justificativaRecomendacao: "Conceito pedagógico de ponta, mas que exige maturidade dos professores. No piloto, simplificar para 1 ou 2 visualizações longitudinais.",
      perguntaChave: pergunta || "Como garantir que os docentes consigam alimentar a matriz sem sobrecarga burocrática?",
    };
  }

  if (mod === "interv") {
    return {
      valorB2B: "Fecha o ciclo da venda: 'Não apenas diagnosticamos onde o aluno erra, nós fornecemos a intervenção e o reteste com IA'.",
      impactoPedagogico: "Gera planos de estudo e listas de reforço hiper-personalizadas para alunos em risco, reduzindo a evasão e aumentando a aprovação na residência médica.",
      recomendacaoIA: "Aprovar no Piloto",
      justificativaRecomendacao: "Diferencial competitivo imediato contra bancos de questões tradicionais que não têm fluxo de intervenção institucional.",
      perguntaChave: pergunta || "A intervenção é disparada automaticamente pela IA ou precisa de homologação prévia do professor/tutor?",
    };
  }

  if (mod === "tutor") {
    return {
      valorB2B: "Atende às exigências de tutoria e mentoria das DCNs do curso de medicina, fornecendo registros auditáveis de acompanhamento do estudante.",
      impactoPedagogico: "Garante que o aluno com baixo rendimento ou problemas psicopedagógicos receba orientação estruturada e documentada.",
      recomendacaoIA: "Aprovar no Piloto",
      justificativaRecomendacao: "Fila simples e objetiva para o tutor registrar orientações e acompanhar metas pactuadas.",
      perguntaChave: pergunta || "As anotações do tutor devem ser visíveis para o estudante ou restritas à coordenação?",
    };
  }

  if (mod === "prova") {
    return {
      valorB2B: "Coração operacional da faculdade. Se a plataforma economizar 80% do tempo gasto pelos professores na montagem e correção de provas, o produto se torna insubstituível.",
      impactoPedagogico: "Matriz de Prova balanceada por Bloom, DCN e tempo de resposta. A correção por QR Code unifica provas presenciais e digitais na mesma base de dados.",
      recomendacaoIA: "Aprovar no Piloto",
      justificativaRecomendacao: "Funcionalidade prioritária (P1). A geração de gabarito e leitura de cartões-resposta impressos foi apontada como item-chave na reunião de 05/11.",
      perguntaChave: pergunta || "Qual é o fluxo de aprovação da prova antes de ir para a gráfica (coordenador + professor responsável)?",
    };
  }

  if (mod === "qbank") {
    return {
      valorB2B: "Maior ativo de valor do MedPleni: base de 30k+ questões com devolutivas completas e motor de geração inédita via engenharia reversa com o manual do INEP/MEC.",
      impactoPedagogico: "Garante questões no rigor e formato do ENAMED oficial, ensinando o aluno a raciocinar clinicamente através da justificativa das alternativas erradas.",
      recomendacaoIA: "Aprovar no Piloto",
      justificativaRecomendacao: "A base de devolutivas dos médicos sócios é a matéria-prima do diferencial. Motor de IA deve respeitar direitos autorais gerando itens novos calibrados.",
      perguntaChave: pergunta || "As faculdades parceiras poderão contribuir com questões para um banco compartilhado ou a base de terceiros fica estritamente isolada?",
    };
  }

  if (mod === "docente") {
    return {
      valorB2B: "Garante a adesão do corpo docente. Professores de medicina costumam resistir a sistemas complexos; o portal do professor precisa ser 'zero atrito' e 3 cliques.",
      impactoPedagogico: "Permite ao médico-preceptor validar questões, conferir distratores e submeter itens diretamente da enfermaria ou ambulatório.",
      recomendacaoIA: "Aprovar no Piloto",
      justificativaRecomendacao: "Manter interface limpa, sem sobrecarregar o professor com dashboards que só interessam à diretoria.",
      perguntaChave: pergunta || "O professor pode criar questões sem passar pela revisão da coordenação?",
    };
  }

  if (mod === "aluno") {
    return {
      valorB2B: "Gera o NPS do aluno que pressiona a faculdade a renovar o contrato. Aluno que percebe evolução no ENAMED elogia o produto para a coordenação.",
      impactoPedagogico: "Feedbacks imediatos com Raio-X de competências, simulados com cronômetro real e flashcards das lacunas identificadas.",
      recomendacaoIA: "Aprovar no Piloto",
      justificativaRecomendacao: "O aluno não pode enxergar dados dos colegas, apenas seu percentil anônimo na turma para motivação saudável.",
      perguntaChave: pergunta || "O aluno deve ver a nota individual de cada simulado ou apenas o nível de proficiência por área?",
    };
  }

  if (mod === "admin") {
    return {
      valorB2B: "Exigência inegociável do DPO (Encarregado de Dados) e do departamento de TI da mantenedora universitária para aprovação de compliance e LGPD.",
      impactoPedagogico: "Garante integridade de dados e proteção da privacidade de notas médicas e prontuários simulados.",
      recomendacaoIA: "Aprovar no Piloto",
      justificativaRecomendacao: "Auditoria de acessos e anonimização de turmas pequenas são barreiras contratuais para fechar com grandes grupos educacionais.",
      perguntaChave: pergunta || "Qual o tamanho mínimo de turma para exibir médias sem risco de identificar alunos individualmente (regra de 5 ou 10 alunos)?",
    };
  }

  if (mod === "trans") {
    return {
      valorB2B: "Permite personalizar a experiência institucional (white-label com brasão da faculdade) e garantir usabilidade em tablets e smartphones nos hospitais.",
      impactoPedagogico: "Acessibilidade para alunos e preceptores em trânsito no plantão hospitalar.",
      recomendacaoIA: "Ajustar Escopo",
      justificativaRecomendacao: "Manter temas escuro/claro e atalhos rápidos. Customizações pesadas de white-label podem ficar para o Pós-Piloto.",
      perguntaChave: pergunta || "O white label com a marca da faculdade é obrigatório para o contrato piloto ou basta co-branding 'Powered by MedPleni'?",
    };
  }

  // Módulo comercial
  return {
    valorB2B: "Alinhamento das regras de monetização, tiers de assinatura B2B e governança societária entre Mario, Bruno, Filipe e Renato.",
    impactoPedagogico: "Viabiliza a sustentabilidade econômica do projeto e a remuneração justa pelo banco de questões e tutoria médica especializada.",
    recomendacaoIA: "Discutir Jurídico/Comercial",
    justificativaRecomendacao: "Definição do contrato de 20% com Bruno e Filipe e modelo de licenciamento por aluno/mês x taxa de implantação institucional.",
    perguntaChave: pergunta || "Qual o valor de precificação por aluno/mês sugerido para a primeira faculdade piloto?",
  };
}

