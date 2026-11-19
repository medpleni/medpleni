/**
 * MEDPLENI B2B — Governança, Auditoria Imutável, LGPD e Privacidade (P24)
 * 
 * Regras Permanentes:
 * 1. Trilha de auditoria imutável (sem UPDATE ou DELETE).
 * 2. Visualização de dados individuais restrita e auditada.
 * 3. Exportações sempre auditadas com dicionário de dados gerado.
 * 4. Uso agregado pela MedPleni exclusivamente estatístico e desidentificado.
 * 5. Termos jurídicos marcados como "texto a validar pelo jurídico".
 */

export type GovernanceAuditEventType =
  | "gabarito_retificado"
  | "questao_anulada"
  | "prova_reaberta"
  | "papel_alterado"
  | "dados_exportados"
  | "suporte_medpleni_acesso"
  | "corte_parametros_alterados"
  | "anonimizacao_aluno"
  | "encerramento_instituicao";

export interface GovernanceAuditRecord {
  id: string;
  institutionId: string;
  eventType: GovernanceAuditEventType;
  performedBy: string;
  performedByName: string;
  performedByRole: string;
  targetId?: string | null;
  targetLabel?: string | null;
  details: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface IndividualAccessRecord {
  id: string;
  institutionId: string;
  studentUserId: string;
  studentName?: string;
  studentRegistration?: string;
  accessedBy: string;
  accessedByName: string;
  accessedByRole: string;
  context: string;
  justification?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface ExportDataDictionaryItem {
  fieldName: string;
  dataType: string;
  description: string;
  isPersonalData: boolean;
  legalBase: string;
}

export interface PrivacyPolicySection {
  id: string;
  title: string;
  category: "coleta" | "finalidade" | "acesso" | "retencao" | "direitos";
  content: string;
  responsibleLegalNote: string;
}

/**
 * Rótulos amigáveis para os tipos de evento de auditoria
 */
export const AUDIT_EVENT_LABELS: Record<GovernanceAuditEventType, { label: string; severity: "info" | "warning" | "critical" }> = {
  gabarito_retificado: { label: "Retificação de Gabarito", severity: "warning" },
  questao_anulada: { label: "Anulação de Questão", severity: "warning" },
  prova_reaberta: { label: "Reabertura de Prova", severity: "warning" },
  papel_alterado: { label: "Alteração de Papel Institucional", severity: "critical" },
  dados_exportados: { label: "Exportação de Dados Acadêmicos", severity: "info" },
  suporte_medpleni_acesso: { label: "Acesso de Suporte Técnico MedPleni", severity: "warning" },
  corte_parametros_alterados: { label: "Alteração do Corte ou Parâmetros", severity: "critical" },
  anonimizacao_aluno: { label: "Anonimização de Estudante (LGPD Art. 18)", severity: "critical" },
  encerramento_instituicao: { label: "Encerramento e Arquivamento de Instituição", severity: "critical" },
};

/**
 * Gera dicionário de dados dinâmico que acompanha qualquer arquivo exportado
 */
export function generateDataDictionary(exportType: string): ExportDataDictionaryItem[] {
  switch (exportType) {
    case "exam_results":
    case "aluno_item_csv":
      return [
        {
          fieldName: "student_id",
          dataType: "UUID / String",
          description: "Identificador interno ou hash anonimizado do discente na plataforma",
          isPersonalData: true,
          legalBase: "Execução de contrato educacional / Tutela de procedimentos formativos",
        },
        {
          fieldName: "student_registration",
          dataType: "String",
          description: "Matrícula acadêmica oficial (RA) fornecida pela secretaria",
          isPersonalData: true,
          legalBase: "Gestão acadêmica e registro de notas",
        },
        {
          fieldName: "class_group",
          dataType: "String",
          description: "Código da turma e período letivo matriculado",
          isPersonalData: false,
          legalBase: "Agrupamento curricular",
        },
        {
          fieldName: "assessment_title",
          dataType: "String",
          description: "Título da avaliação ou simulado aplicado",
          isPersonalData: false,
          legalBase: "Registro de instrumento avaliativo",
        },
        {
          fieldName: "score_percentage",
          dataType: "Float (0.0 a 100.0)",
          description: "Aproveitamento percentual no exame (acertos válidos ÷ total de itens válidos)",
          isPersonalData: true,
          legalBase: "Desempenho acadêmico",
        },
        {
          fieldName: "item_order",
          dataType: "Integer",
          description: "Número de ordem do item na prova",
          isPersonalData: false,
          legalBase: "Métrica psicométrica",
        },
        {
          fieldName: "marked_letter",
          dataType: "Char (A-E)",
          description: "Alternativa marcada pelo estudante",
          isPersonalData: true,
          legalBase: "Registro de resposta para cálculo de distratores",
        },
        {
          fieldName: "is_correct",
          dataType: "Boolean",
          description: "Indicador de acerto do item",
          isPersonalData: true,
          legalBase: "Cálculo de aproveitamento",
        },
      ];

    case "executive_report":
    default:
      return [
        {
          fieldName: "indicator_name",
          dataType: "String",
          description: "Nome oficial do KPI ou métrica de autoavaliação institucional",
          isPersonalData: false,
          legalBase: "Relatório de autoavaliação (CPA / NDE / SINAES)",
        },
        {
          fieldName: "period",
          dataType: "String",
          description: "Semestre ou ciclo letivo de referência",
          isPersonalData: false,
          legalBase: "Temporalidade de gestão",
        },
        {
          fieldName: "sample_base",
          dataType: "Integer",
          description: "Volume de estudantes ou avaliações que fundamentam o cálculo",
          isPersonalData: false,
          legalBase: "Representatividade amostral",
        },
        {
          fieldName: "value_percentage",
          dataType: "Float",
          description: "Resultado percentual consolidado",
          isPersonalData: false,
          legalBase: "Análise de rendimento curricular",
        },
      ];
  }
}

/**
 * REGRA ESTRITA: Uso Agregado de Questões pela MedPleni entre Instituições
 * 
 * Para calibrar a dificuldade e o poder de discriminação do banco compartilhado:
 * 1. NUNCA trafega identificador de estudante (nome, RA, e-mail).
 * 2. NUNCA trafega nome ou ID de qualquer faculdade parceira.
 * 3. Trafega unicamente: question_id, volume de respondentes (n), taxa de facilidade (p),
 *    índice de discriminação (D) e coeficiente ponto-bisserial corrigido.
 */
export function validateMedpleniCrossInstitutionAggregation(data: {
  questionId: string;
  totalAttempts: number;
  facilityIndex: number;
  discriminationIndex: number;
  pointBiserial: number;
  institutionId?: string;
  studentId?: string;
  studentName?: string;
}): { isValid: boolean; sanitizedPayload: any; errorMessage?: string } {
  // Verificação de isolamento: se houver qualquer tentativa de vazar dados de instituição ou aluno, rejeita
  if (data.institutionId || data.studentId || data.studentName) {
    return {
      isValid: false,
      sanitizedPayload: null,
      errorMessage:
        "Violação de Governança: Dados agregados entre instituições da MedPleni proíbem estritamente identificadores de instituições ou estudantes.",
    };
  }

  return {
    isValid: true,
    sanitizedPayload: {
      question_id: data.questionId,
      sample_size: data.totalAttempts,
      difficulty_index: Number(data.facilityIndex.toFixed(3)),
      discrimination_index: Number(data.discriminationIndex.toFixed(3)),
      point_biserial: Number(data.pointBiserial.toFixed(3)),
      aggregated_at: new Date().toISOString(),
    },
  };
}

/**
 * Lógica pura de anonimização de discente a pedido (LGPD Art. 18)
 * Mantém os cálculos históricos de turma preservando integridade estatística,
 * mas rompe definitivamente o vínculo com a pessoa física.
 */
export function anonymizeStudentProfile(student: {
  id: string;
  name: string;
  email: string;
  registration: string;
}) {
  const shortHash = Math.random().toString(36).substring(2, 8).toUpperCase();
  return {
    id: student.id,
    anonymizedName: `Estudante Desidentificado [${shortHash}]`,
    anonymizedEmail: `anonimo.${shortHash}@privacidade.medpleni.invalid`,
    anonymizedRegistration: `RA-ANON-${shortHash}`,
    isAnonymized: true,
    anonymizedAt: new Date().toISOString(),
  };
}

/**
 * Conteúdo institucional da página "Privacidade e dados"
 * Não redige cláusulas jurídicas terminativas: explicitamente marcado
 * como "texto a validar pelo jurídico".
 */
export const PRIVACY_AND_DATA_POLICY_SECTIONS: PrivacyPolicySection[] = [
  {
    id: "coleta",
    title: "1. Dados Coletados pela Plataforma",
    category: "coleta",
    content:
      "A plataforma coleta dados estritamente necessários para a execução das avaliações médicas e acompanhamento curricular: nome do aluno, e-mail institucional, matrícula acadêmica (RA), turma e período. Durante as avaliações, são coletadas as alternativas assinaladas, tempo gasto por questão, folhas de respostas escaneadas ou fotografadas e histórico de sessões de treino no Praticar.",
    responsibleLegalNote: "[texto a validar pelo jurídico: enquadramento com a DPO da instituição]",
  },
  {
    id: "finalidade",
    title: "2. Finalidade do Tratamento",
    category: "finalidade",
    content:
      "Os dados são utilizados com o propósito exclusivo de: (a) apuração automática de notas e diagnósticos psicométricos de provas; (b) acompanhamento longitudinal do rendimento acadêmico em relação à régua 60 e marcos do ENAMED; (c) prescrição de intervenções pedagógicas e listas de exercícios direcionadas; (d) emissão de relatórios executivos para órgãos de regulação (CPA, NDE, MEC).",
    responsibleLegalNote: "[texto a validar pelo jurídico: adequação às finalidades do PPC e Diretrizes Curriculares]",
  },
  {
    id: "acesso",
    title: "3. Níveis de Acesso e Governança Interna",
    category: "acesso",
    content:
      "O acesso aos dados individuais é rigorosamente compartimentado por Row Level Security (RLS) no banco de dados: (a) Aluno enxerga apenas suas notas e comparativo com a média da turma (sem ranking); (b) Docente enxerga apenas turmas sob seu escopo; (c) Coordenador e Dirigente possuem visão integral do curso; (d) Todo acesso pontual a perfil individual de estudante é auditado com registro de quem, quando, justificativa e IP.",
    responsibleLegalNote: "[texto a validar pelo jurídico: conferência da matriz de responsabilidade institucional]",
  },
  {
    id: "retencao",
    title: "4. Retenção, Anonimização e Exclusão",
    category: "retencao",
    content:
      "Os dados dos estudantes são conservados durante o ciclo de formação e pelo prazo regulatório de guarda do acervo acadêmico exigido pelo Ministério da Educação. A qualquer momento, mediante solicitação formal amparada pelo Art. 18 da LGPD, a instituição pode acionar a rotina de desidentificação do estudante, que remove vínculos nominais e preserva unicamente médias agregadas para não corromper o histórico da coorte.",
    responsibleLegalNote: "[texto a validar pelo jurídico: conciliação entre prazo do MEC e LGPD Art. 16]",
  },
  {
    id: "direitos",
    title: "5. Uso Agregado de Questões e Não-Comercialização",
    category: "direitos",
    content:
      "A MedPleni não comercializa dados pessoais nem compartilha informações de estudantes com terceiros. Métricas de calibração psicométrica de questões (como grau de facilidade e discriminação) são processadas de forma agregada, sem identificar qualquer estudante e sem menção à faculdade de origem.",
    responsibleLegalNote: "[texto a validar pelo jurídico: inclusão no termo aditivo de operador de dados]",
  },
];
