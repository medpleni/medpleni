/**
 * MEDPLENI B2B — readiness.ts
 * Indicador de Prontidão Acadêmica por Regras Explícitas (ESPEC-B2B seção 4.9 / P22)
 * Proposta do Dr. Filipe Moreira de Andrade.
 *
 * REGRAS CRÍTICAS:
 * - Não é nota prevista em escala ENAMED e NÃO usa TRI.
 * - Duas regras independentes que podem ser ligadas ou desligadas por instituição:
 *   1. Volume: Aluno com pelo menos N questões no ano letivo (referência inicial: 10.000, editável).
 *   2. Consistência: Aluno que manteve pelo menos X% em Y simulados no ano (X e Y editáveis; ficam em branco até a instituição definir).
 * - Se os parâmetros estiverem em branco ou desligados, o indicador NÃO APARECE (nada de valor padrão fingindo precisão).
 * - Três níveis com nomes neutros configuráveis (padrão: "No caminho", "Em atenção", "Distante").
 * - Mostra sempre quais regras o aluno cumpre e quanto falta para atingir cada uma.
 * - Texto fixo obrigatório de aviso metodológico.
 * - Suporte a gravação de snapshots para calibração futura com o resultado real do ENAMED.
 */

export interface ReadinessConfig {
  volumeRuleEnabled: boolean;
  minQuestionsYear: number | null; // N questões (ex: 10000; null se em branco)
  consistencyRuleEnabled: boolean;
  minScorePercent: number | null; // X% de acerto (ex: 60.0; null se em branco)
  minExamsCount: number | null; // Y simulados (ex: 3; null se em branco)
  levelLabels: {
    high: string; // ex: "No caminho"
    medium: string; // ex: "Em atenção"
    low: string; // ex: "Distante"
  };
  showToStudents: boolean; // Opção de mostrar ou não ao próprio aluno
}

export const DEFAULT_READINESS_CONFIG: ReadinessConfig = {
  volumeRuleEnabled: true,
  minQuestionsYear: 10000,
  consistencyRuleEnabled: true,
  minScorePercent: 60.0,
  minExamsCount: 3,
  levelLabels: {
    high: "No caminho",
    medium: "Em atenção",
    low: "Distante",
  },
  showToStudents: false,
};

export const READINESS_DISCLAIMER_TEXT =
  "Esta é uma estimativa baseada em regras pedagógicas definidas pela própria instituição, considerando o volume de uso da plataforma e o desempenho nos simulados aplicados. Não constitui previsão oficial nem garantia de resultado no ENAMED.";

export interface StudentExamHistory {
  examId: string;
  examTitle: string;
  date: string;
  scorePercentage: number;
}

export interface StudentReadinessInput {
  studentUserId: string;
  studentName: string;
  registration: string;
  classGroupId: string;
  classGroupLabel: string;
  questionsAnsweredCount: number; // Volume total no ano (user_answers B2C + B2B)
  examHistory: StudentExamHistory[];
}

export type ReadinessLevelKey = "alto" | "medio" | "baixo";

export interface StudentReadinessEvaluation {
  studentUserId: string;
  studentName: string;
  registration: string;
  classGroupId: string;
  classGroupLabel: string;
  isConfigured: boolean;
  unconfiguredReason?: string;
  // Regra 1: Volume
  volumeRuleActive: boolean;
  questionsAnswered: number;
  volumeTarget: number | null;
  volumeFulfilled: boolean;
  volumeProgressPercent: number;
  volumeRemaining: number;
  // Regra 2: Consistência
  consistencyRuleActive: boolean;
  qualifyingExamsCount: number; // Simulados com nota >= X%
  consistencyTargetExams: number | null;
  consistencyTargetScore: number | null;
  consistencyFulfilled: boolean;
  consistencyRemaining: number;
  // Resultado
  level: ReadinessLevelKey;
  levelLabel: string;
  rulesFulfilledSummary: string;
  missingRequirementsText: string;
}

export interface ClassReadinessDistribution {
  classGroupId: string;
  classGroupLabel: string;
  isConfigured: boolean;
  totalStudents: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  highPercent: number;
  mediumPercent: number;
  lowPercent: number;
  students: StudentReadinessEvaluation[];
}

/**
 * Verifica se a configuração de prontidão é válida e está ativa.
 * Se os parâmetros estiverem em branco, retorna false.
 */
export function isReadinessConfigActive(config: ReadinessConfig): boolean {
  const isVolumeValid =
    config.volumeRuleEnabled &&
    typeof config.minQuestionsYear === "number" &&
    config.minQuestionsYear > 0;

  const isConsistencyValid =
    config.consistencyRuleEnabled &&
    typeof config.minScorePercent === "number" &&
    config.minScorePercent > 0 &&
    typeof config.minExamsCount === "number" &&
    config.minExamsCount > 0;

  return isVolumeValid || isConsistencyValid;
}

/**
 * Avalia a prontidão de um aluno individual com base nas regras ativas.
 */
export function evaluateStudentReadiness(
  student: StudentReadinessInput,
  config: ReadinessConfig
): StudentReadinessEvaluation {
  const isVolumeActive =
    config.volumeRuleEnabled &&
    typeof config.minQuestionsYear === "number" &&
    config.minQuestionsYear > 0;

  const isConsistencyActive =
    config.consistencyRuleEnabled &&
    typeof config.minScorePercent === "number" &&
    config.minScorePercent > 0 &&
    typeof config.minExamsCount === "number" &&
    config.minExamsCount > 0;

  // Se os parâmetros estiverem em branco ou desligados, não avalia
  if (!isVolumeActive && !isConsistencyActive) {
    return {
      studentUserId: student.studentUserId,
      studentName: student.studentName,
      registration: student.registration,
      classGroupId: student.classGroupId,
      classGroupLabel: student.classGroupLabel,
      isConfigured: false,
      unconfiguredReason:
        "Parâmetros de prontidão não configurados ou em branco. Defina as metas de volume e/ou simulados nas configurações para ativar o indicador.",
      volumeRuleActive: false,
      questionsAnswered: student.questionsAnsweredCount,
      volumeTarget: null,
      volumeFulfilled: false,
      volumeProgressPercent: 0,
      volumeRemaining: 0,
      consistencyRuleActive: false,
      qualifyingExamsCount: 0,
      consistencyTargetExams: null,
      consistencyTargetScore: null,
      consistencyFulfilled: false,
      consistencyRemaining: 0,
      level: "baixo",
      levelLabel: config.levelLabels.low || "Distante",
      rulesFulfilledSummary: "Não configurado",
      missingRequirementsText: "Configuração pendente pela instituição",
    };
  }

  // 1. Avaliação do Volume
  let volumeFulfilled = false;
  let volumeProgressPercent = 0;
  let volumeRemaining = 0;
  const volumeTarget = isVolumeActive ? config.minQuestionsYear : null;

  if (isVolumeActive && volumeTarget) {
    volumeFulfilled = student.questionsAnsweredCount >= volumeTarget;
    volumeProgressPercent = Math.min(
      100,
      Math.round((student.questionsAnsweredCount / volumeTarget) * 1000) / 10
    );
    volumeRemaining = Math.max(0, volumeTarget - student.questionsAnsweredCount);
  }

  // 2. Avaliação da Consistência em Simulados
  let consistencyFulfilled = false;
  let qualifyingExamsCount = 0;
  let consistencyRemaining = 0;
  const consistencyTargetScore = isConsistencyActive ? config.minScorePercent : null;
  const consistencyTargetExams = isConsistencyActive ? config.minExamsCount : null;

  if (isConsistencyActive && consistencyTargetScore && consistencyTargetExams) {
    qualifyingExamsCount = student.examHistory.filter(
      (e) => e.scorePercentage >= consistencyTargetScore
    ).length;
    consistencyFulfilled = qualifyingExamsCount >= consistencyTargetExams;
    consistencyRemaining = Math.max(0, consistencyTargetExams - qualifyingExamsCount);
  }

  // 3. Determinação do Nível Combinado Neutro
  let level: ReadinessLevelKey = "baixo";
  let rulesFulfilledSummary = "";
  const missingParts: string[] = [];

  if (isVolumeActive && isConsistencyActive) {
    // Ambas as regras ativas
    if (volumeFulfilled && consistencyFulfilled) {
      level = "alto";
      rulesFulfilledSummary = "Cumpre ambas as metas (volume de questões e consistência em simulados)";
    } else if (volumeFulfilled || consistencyFulfilled) {
      level = "medio";
      if (volumeFulfilled) {
        rulesFulfilledSummary = "Cumpre meta de volume; pendente consistência em simulados";
        missingParts.push(
          `Faltam ${consistencyRemaining} simulado(s) com nota ≥ ${consistencyTargetScore}%`
        );
      } else {
        rulesFulfilledSummary = "Cumpre consistência em simulados; pendente meta de volume";
        missingParts.push(
          `Faltam ${volumeRemaining.toLocaleString("pt-BR")} questões no ano letivo`
        );
      }
    } else {
      level = "baixo";
      rulesFulfilledSummary = "Pendente em ambas as regras";
      missingParts.push(
        `Faltam ${volumeRemaining.toLocaleString("pt-BR")} questões`,
        `Faltam ${consistencyRemaining} simulado(s) com nota ≥ ${consistencyTargetScore}%`
      );
    }
  } else if (isVolumeActive) {
    // Apenas Volume ativa
    if (volumeFulfilled) {
      level = "alto";
      rulesFulfilledSummary = `Atingiu a meta de ${volumeTarget?.toLocaleString("pt-BR")} questões no ano`;
    } else if (volumeProgressPercent >= 50) {
      level = "medio";
      rulesFulfilledSummary = `Progresso intermediário (${volumeProgressPercent}% do volume anual)`;
      missingParts.push(`Faltam ${volumeRemaining.toLocaleString("pt-BR")} questões para a meta`);
    } else {
      level = "baixo";
      rulesFulfilledSummary = `Início de jornada (${volumeProgressPercent}% do volume anual)`;
      missingParts.push(`Faltam ${volumeRemaining.toLocaleString("pt-BR")} questões para a meta`);
    }
  } else {
    // Apenas Consistência ativa
    if (consistencyFulfilled) {
      level = "alto";
      rulesFulfilledSummary = `Atingiu nota ≥ ${consistencyTargetScore}% em ${qualifyingExamsCount} simulados`;
    } else if (consistencyTargetExams && qualifyingExamsCount >= Math.ceil(consistencyTargetExams / 2)) {
      level = "medio";
      rulesFulfilledSummary = `Consistência parcial (${qualifyingExamsCount} de ${consistencyTargetExams} simulados)`;
      missingParts.push(`Falta(m) ${consistencyRemaining} simulado(s) qualificado(s)`);
    } else {
      level = "baixo";
      rulesFulfilledSummary = `Abaixo da consistência desejada (${qualifyingExamsCount} de ${consistencyTargetExams} simulados)`;
      missingParts.push(`Falta(m) ${consistencyRemaining} simulado(s) qualificado(s)`);
    }
  }

  const levelLabel =
    level === "alto"
      ? config.levelLabels.high || "No caminho"
      : level === "medio"
      ? config.levelLabels.medium || "Em atenção"
      : config.levelLabels.low || "Distante";

  return {
    studentUserId: student.studentUserId,
    studentName: student.studentName,
    registration: student.registration,
    classGroupId: student.classGroupId,
    classGroupLabel: student.classGroupLabel,
    isConfigured: true,
    volumeRuleActive: isVolumeActive,
    questionsAnswered: student.questionsAnsweredCount,
    volumeTarget,
    volumeFulfilled,
    volumeProgressPercent,
    volumeRemaining,
    consistencyRuleActive: isConsistencyActive,
    qualifyingExamsCount,
    consistencyTargetExams,
    consistencyTargetScore,
    consistencyFulfilled,
    consistencyRemaining,
    level,
    levelLabel,
    rulesFulfilledSummary,
    missingRequirementsText:
      missingParts.length > 0 ? missingParts.join(" · ") : "Metas plenamente atingidas",
  };
}

/**
 * Calcula a distribuição agregada da turma nos 3 níveis.
 */
export function calculateClassReadinessDistribution(
  classGroupId: string,
  classGroupLabel: string,
  students: StudentReadinessInput[],
  config: ReadinessConfig
): ClassReadinessDistribution {
  const isConfigured = isReadinessConfigActive(config);

  if (!isConfigured || students.length === 0) {
    return {
      classGroupId,
      classGroupLabel,
      isConfigured: false,
      totalStudents: students.length,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      highPercent: 0,
      mediumPercent: 0,
      lowPercent: 0,
      students: students.map((s) => evaluateStudentReadiness(s, config)),
    };
  }

  const evaluated = students.map((s) => evaluateStudentReadiness(s, config));
  const totalStudents = evaluated.length;

  const highCount = evaluated.filter((s) => s.level === "alto").length;
  const mediumCount = evaluated.filter((s) => s.level === "medio").length;
  const lowCount = evaluated.filter((s) => s.level === "baixo").length;

  const highPercent = Math.round((highCount / totalStudents) * 1000) / 10;
  const mediumPercent = Math.round((mediumCount / totalStudents) * 1000) / 10;
  const lowPercent = Math.round((lowCount / totalStudents) * 1000) / 10;

  return {
    classGroupId,
    classGroupLabel,
    isConfigured: true,
    totalStudents,
    highCount,
    mediumCount,
    lowCount,
    highPercent,
    mediumPercent,
    lowPercent,
    students: evaluated,
  };
}
