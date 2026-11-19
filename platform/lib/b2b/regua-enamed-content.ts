/**
 * MEDPLENI B2B — Conteúdo Regulatório e Marco da Régua ENAMED
 * 
 * ATENÇÃO: Conforme diretriz da especificação (P23 / RE-01 e RE-02):
 * Conteúdo regulatório oficial (número de lei, portarias, datas e pesos)
 * NÃO deve ser inventado pelo assistente de IA.
 * 
 * Todos os pontos pendentes de homologação oficial estão marcados com:
 * "[a preencher pelo Mario com fonte oficial]"
 */

export interface RegulatoryMilestoneContent {
  stage: 1 | 2 | 3;
  period: 4 | 8 | 12;
  title: string;
  stageName: string;
  subtitle: string;
  cycleName: string;
  officialFramework: {
    lawNumber: string;
    ordinanceNumber: string;
    publicationDate: string;
    inepNotice: string;
    stageWeight: string;
    minimumThreshold: string;
  };
  matrixNotice: string;
  description: string;
  focusAreas: string[];
}

export interface ReguaEnamedRegulatoryDoc {
  generalFramework: {
    governingLaw: string;
    decreeOrdinance: string;
    implementationStatus: string;
    regulatoryAgency: string;
    lastUpdateByPlatform: string;
  };
  stages: Record<1 | 2 | 3, RegulatoryMilestoneContent>;
}

export const REGUA_ENAMED_CONTENT: ReguaEnamedRegulatoryDoc = {
  generalFramework: {
    governingLaw: "Lei Federal nº [a preencher pelo Mario com fonte oficial]",
    decreeOrdinance: "Portaria Normativa MEC/INEP nº [a preencher pelo Mario com fonte oficial]",
    implementationStatus: "Em fase de regulamentação e publicação de editais pelo INEP",
    regulatoryAgency: "INEP / MEC / Comissão Nacional de Residência Médica",
    lastUpdateByPlatform: "Novembro/2026",
  },
  stages: {
    1: {
      stage: 1,
      period: 4,
      title: "1ª Etapa · 4º Período",
      stageName: "Ciclo Básico & Transição",
      subtitle: "Avaliação longitudinal de fundamentos morfofuncionais, propedêutica e saúde coletiva",
      cycleName: "Ciclo Básico (1º ao 4º período)",
      officialFramework: {
        lawNumber: "Marco Regulatório ENAMED - Art. [a preencher pelo Mario com fonte oficial]",
        ordinanceNumber: "Portaria de Matriz Específica nº [a preencher pelo Mario com fonte oficial]",
        publicationDate: "[a preencher pelo Mario com fonte oficial]",
        inepNotice: "Edital INEP 1ª Etapa nº [a preencher pelo Mario com fonte oficial]",
        stageWeight: "[a preencher pelo Mario com fonte oficial]",
        minimumThreshold: "60% de aproveitamento (Régua institucional MedPleni)",
      },
      matrixNotice:
        "A matriz oficial do ciclo básico (1ª etapa - 4º período) será incorporada quando o INEP publicar a portaria e edital específico. Atualmente, os simulados e práticas na plataforma utilizam eixos curriculares formativos estruturantes.",
      description:
        "Módulo de verificação formativa da transição entre as ciências básicas e o ciclo clínico. Identifica precocemente lacunas de retenção e raciocínio fisiopatológico.",
      focusAreas: [
        "Morfologia e Fisiologia Integrada",
        "Farmacologia e Patologia Geral",
        "Propedêutica Médica e Semiologia",
        "Saúde Coletiva e Epidemiologia Básica",
        "Atenção Primária à Saúde",
      ],
    },
    2: {
      stage: 2,
      period: 8,
      title: "2ª Etapa · 8º Período",
      stageName: "Ciclo Clínico & Pré-Internato",
      subtitle: "Avaliação do raciocínio diagnóstico, conduta terapêutica e preparação para o internato",
      cycleName: "Ciclo Clínico (5º ao 8º período)",
      officialFramework: {
        lawNumber: "Marco Regulatório ENAMED - Art. [a preencher pelo Mario com fonte oficial]",
        ordinanceNumber: "Portaria de Matriz Clínica nº [a preencher pelo Mario com fonte oficial]",
        publicationDate: "[a preencher pelo Mario com fonte oficial]",
        inepNotice: "Edital INEP 2ª Etapa nº [a preencher pelo Mario com fonte oficial]",
        stageWeight: "[a preencher pelo Mario com fonte oficial]",
        minimumThreshold: "60% de aproveitamento (Régua institucional MedPleni)",
      },
      matrixNotice:
        "Matriz estruturada com base nas diretrizes do ciclo clínico e 7 grandes áreas médicas estabelecidas pelas DCNs.",
      description:
        "Posicionamento consolidado antes do ingresso nas enfermarias e estágios práticos do internato. Mede capacidade de resolução de problemas clínicos em cenários ambulatoriais e hospitalares.",
      focusAreas: [
        "Clínica Médica",
        "Cirurgia Geral",
        "Ginecologia e Obstetrícia",
        "Pediatria",
        "Medicina de Família e Comunidade",
        "Saúde Coletiva",
        "Saúde Mental",
      ],
    },
    3: {
      stage: 3,
      period: 12,
      title: "3ª Etapa · 12º Período",
      stageName: "Internato & Conclusão de Curso",
      subtitle: "Avaliação terminal de competências médicas, tomada de decisão e acesso à residência médica",
      cycleName: "Internato Médico (9º ao 12º período)",
      officialFramework: {
        lawNumber: "Marco Regulatório ENAMED - Art. [a preencher pelo Mario com fonte oficial]",
        ordinanceNumber: "Portaria Terminal e Acesso à Residência nº [a preencher pelo Mario com fonte oficial]",
        publicationDate: "[a preencher pelo Mario com fonte oficial]",
        inepNotice: "Edital INEP Exame Final nº [a preencher pelo Mario com fonte oficial]",
        stageWeight: "[a preencher pelo Mario com fonte oficial]",
        minimumThreshold: "60% de aproveitamento (Régua institucional MedPleni)",
      },
      matrixNotice:
        "Matriz integral alinhada às provas de residência médica de acesso direto e ao padrão de certificação terminal do ENAMED.",
      description:
        "Posicionamento final para conclusão de curso e preparação intensiva para o exame nacional unificado de residência médica.",
      focusAreas: [
        "Clínica Médica de Alta Complexidade e Urgência",
        "Cirurgia e Trauma",
        "Ginecologia, Obstetrícia e Alto Risco",
        "Pediatria e Neonatologia",
        "Medicina de Família, Gestão e Urgência Básica",
        "Saúde Mental e Psiquiatria de Emergência",
      ],
    },
  },
};
