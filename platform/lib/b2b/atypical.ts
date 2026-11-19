/**
 * MEDPLENI B2B — atypical.ts
 * Detecção e Sinalização de Sessões Atípicas de Prática e Prova Online (Voto SPR nº 9 / ESPEC-B2B 4.10)
 *
 * REGRAS CRÍTICAS:
 * - Apenas para gestão (Dirigente e Coordenador). Nunca visível para o aluno.
 * - NUNCA usar palavras como "fraude" ou "cola" na interface ou nos rótulos.
 * - Aviso obrigatório na tela: "O rótulo indica um padrão, não prova nada; use como ponto de partida para uma conversa."
 * - Sessões com menos de 20 questões não são classificadas.
 * - Limites matemáticos configuráveis por instituição.
 * - Possibilidade de excluir sessões atípicas do volume de questões nos gráficos da gestão.
 */

export type AtypicalPatternType =
  | "chute"
  | "refazendo"
  | "consulta_externa"
  | "tipico"
  | "nao_classificada";

export interface AtypicalDetectionConfig {
  minQuestionsThreshold: number; // default: 20
  chute: {
    maxAverageSeconds: number; // default: 15s
    maxAccuracyPercentage: number; // default: 30%
  };
  refazendo: {
    minRepeatedRatio: number; // default: 0.70 (70%)
    minAccuracyPercentage: number; // default: 85%
  };
  consultaExterna: {
    minAccuracyPercentage: number; // default: 90%
    maxAverageSeconds: number; // default: 25s
    maxStdDevSeconds: number; // default: 8.0s (tempo constante)
  };
}

export const DEFAULT_ATYPICAL_CONFIG: AtypicalDetectionConfig = {
  minQuestionsThreshold: 20,
  chute: {
    maxAverageSeconds: 15,
    maxAccuracyPercentage: 30,
  },
  refazendo: {
    minRepeatedRatio: 0.7,
    minAccuracyPercentage: 85,
  },
  consultaExterna: {
    minAccuracyPercentage: 90,
    maxAverageSeconds: 25,
    maxStdDevSeconds: 8.0,
  },
};

export interface QuestionResponseDetail {
  questionId: string;
  timeSpentSeconds: number;
  isCorrect: boolean;
  wasPreviouslyAnswered?: boolean;
}

export interface SessionMetricsInput {
  sessionId: string;
  studentUserId: string;
  studentName: string;
  classGroupId: string;
  classGroupLabel: string;
  sessionType: "pratica" | "prova_online";
  startedAt: string;
  completedAt: string;
  responses: QuestionResponseDetail[];
  isExcludedFromMetrics?: boolean;
}

export interface ClassifiedSession {
  sessionId: string;
  studentUserId: string;
  studentName: string;
  classGroupId: string;
  classGroupLabel: string;
  sessionType: "pratica" | "prova_online";
  startedAt: string;
  completedAt: string;
  totalQuestions: number;
  correctCount: number;
  accuracyPercentage: number;
  averageSecondsPerQuestion: number;
  stdDevSeconds: number;
  repeatedRatio: number;
  pattern: AtypicalPatternType;
  patternLabel: string;
  patternDescription: string;
  isEligibleForClassification: boolean;
  isExcludedFromMetrics: boolean;
}

/**
 * Classifica uma sessão individual conforme as 3 regras explícitas do Voto SPR nº 9.
 */
export function classifySession(
  session: SessionMetricsInput,
  customConfig?: Partial<AtypicalDetectionConfig>
): ClassifiedSession {
  const config: AtypicalDetectionConfig = {
    minQuestionsThreshold:
      customConfig?.minQuestionsThreshold ?? DEFAULT_ATYPICAL_CONFIG.minQuestionsThreshold,
    chute: {
      ...DEFAULT_ATYPICAL_CONFIG.chute,
      ...(customConfig?.chute || {}),
    },
    refazendo: {
      ...DEFAULT_ATYPICAL_CONFIG.refazendo,
      ...(customConfig?.refazendo || {}),
    },
    consultaExterna: {
      ...DEFAULT_ATYPICAL_CONFIG.consultaExterna,
      ...(customConfig?.consultaExterna || {}),
    },
  };

  const totalQuestions = session.responses.length;
  const isExcludedFromMetrics = Boolean(session.isExcludedFromMetrics);

  // 1. Sessões com menos de 20 questões NÃO são classificadas
  if (totalQuestions < config.minQuestionsThreshold) {
    const correctCount = session.responses.filter((r) => r.isCorrect).length;
    const accuracy =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 1000) / 10 : 0;
    const totalTime = session.responses.reduce((acc, r) => acc + r.timeSpentSeconds, 0);
    const avgTime = totalQuestions > 0 ? Math.round((totalTime / totalQuestions) * 10) / 10 : 0;

    return {
      sessionId: session.sessionId,
      studentUserId: session.studentUserId,
      studentName: session.studentName,
      classGroupId: session.classGroupId,
      classGroupLabel: session.classGroupLabel,
      sessionType: session.sessionType,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      totalQuestions,
      correctCount,
      accuracyPercentage: accuracy,
      averageSecondsPerQuestion: avgTime,
      stdDevSeconds: 0,
      repeatedRatio: 0,
      pattern: "nao_classificada",
      patternLabel: "Não classificada (< 20 questões)",
      patternDescription:
        "Sessões com menos de 20 questões não são classificadas para evitar distorções amostrais.",
      isEligibleForClassification: false,
      isExcludedFromMetrics,
    };
  }

  // 2. Cálculo dos parâmetros estatísticos da sessão
  const correctCount = session.responses.filter((r) => r.isCorrect).length;
  const accuracyPercentage = Math.round((correctCount / totalQuestions) * 1000) / 10;

  const totalTimeSeconds = session.responses.reduce((acc, r) => acc + r.timeSpentSeconds, 0);
  const averageSecondsPerQuestion =
    Math.round((totalTimeSeconds / totalQuestions) * 10) / 10;

  // Desvio padrão dos tempos por questão
  const variance =
    session.responses.reduce(
      (acc, r) => acc + Math.pow(r.timeSpentSeconds - averageSecondsPerQuestion, 2),
      0
    ) / totalQuestions;
  const stdDevSeconds = Math.round(Math.sqrt(variance) * 10) / 10;

  // Proporção de questões já respondidas anteriormente pelo aluno
  const repeatedCount = session.responses.filter((r) => r.wasPreviouslyAnswered).length;
  const repeatedRatio = Math.round((repeatedCount / totalQuestions) * 100) / 100;

  // 3. Aplicação das Regras
  let pattern: AtypicalPatternType = "tipico";
  let patternLabel = "Padrão Típico";
  let patternDescription = "Ritmo e desempenho dentro da faixa esperada de estudo.";

  // Regra 1: Chute (Tempo muito baixo com acerto perto do acaso)
  const isChute =
    averageSecondsPerQuestion <= config.chute.maxAverageSeconds &&
    accuracyPercentage <= config.chute.maxAccuracyPercentage;

  // Regra 2: Refazendo (Alta proporção de questões já respondidas com acerto alto)
  const isRefazendo =
    repeatedRatio >= config.refazendo.minRepeatedRatio &&
    accuracyPercentage >= config.refazendo.minAccuracyPercentage;

  // Regra 3: Padrão compatível com consulta externa (Acerto alto, tempo muito baixo e constante)
  const isConsultaExterna =
    accuracyPercentage >= config.consultaExterna.minAccuracyPercentage &&
    averageSecondsPerQuestion <= config.consultaExterna.maxAverageSeconds &&
    stdDevSeconds <= config.consultaExterna.maxStdDevSeconds;

  if (isChute) {
    pattern = "chute";
    patternLabel = "Padrão de resposta rápida com acerto ao acaso";
    patternDescription = `Tempo médio de ${averageSecondsPerQuestion}s por questão (≤ ${config.chute.maxAverageSeconds}s) com aproveitamento de ${accuracyPercentage}% (≤ ${config.chute.maxAccuracyPercentage}%).`;
  } else if (isConsultaExterna) {
    pattern = "consulta_externa";
    patternLabel = "Padrão compatível com consulta externa";
    patternDescription = `Aproveitamento de ${accuracyPercentage}% (≥ ${config.consultaExterna.minAccuracyPercentage}%) com tempo médio constante de ${averageSecondsPerQuestion}s (desvio padrão de ${stdDevSeconds}s ≤ ${config.consultaExterna.maxStdDevSeconds}s).`;
  } else if (isRefazendo) {
    pattern = "refazendo";
    patternLabel = "Padrão de repetição de itens prévios";
    patternDescription = `${Math.round(repeatedRatio * 100)}% das questões já resolvidas anteriormente (≥ ${Math.round(config.refazendo.minRepeatedRatio * 100)}%) com aproveitamento elevado de ${accuracyPercentage}%.`;
  }

  return {
    sessionId: session.sessionId,
    studentUserId: session.studentUserId,
    studentName: session.studentName,
    classGroupId: session.classGroupId,
    classGroupLabel: session.classGroupLabel,
    sessionType: session.sessionType,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    totalQuestions,
    correctCount,
    accuracyPercentage,
    averageSecondsPerQuestion,
    stdDevSeconds,
    repeatedRatio,
    pattern,
    patternLabel,
    patternDescription,
    isEligibleForClassification: true,
    isExcludedFromMetrics,
  };
}

/**
 * Classifica uma lista de sessões e calcula os KPIs institucionais.
 */
export function classifyBatchSessions(
  sessions: SessionMetricsInput[],
  config?: Partial<AtypicalDetectionConfig>
): {
  classified: ClassifiedSession[];
  summary: {
    totalSessions: number;
    atypicalCount: number;
    chuteCount: number;
    refazendoCount: number;
    consultaExternaCount: number;
    unclassifiedCount: number;
    excludedFromMetricsCount: number;
  };
} {
  const classified = sessions.map((s) => classifySession(s, config));

  const chuteCount = classified.filter((s) => s.pattern === "chute").length;
  const refazendoCount = classified.filter((s) => s.pattern === "refazendo").length;
  const consultaExternaCount = classified.filter((s) => s.pattern === "consulta_externa").length;
  const unclassifiedCount = classified.filter((s) => s.pattern === "nao_classificada").length;
  const excludedFromMetricsCount = classified.filter((s) => s.isExcludedFromMetrics).length;

  return {
    classified,
    summary: {
      totalSessions: classified.length,
      atypicalCount: chuteCount + refazendoCount + consultaExternaCount,
      chuteCount,
      refazendoCount,
      consultaExternaCount,
      unclassifiedCount,
      excludedFromMetricsCount,
    },
  };
}

/**
 * Calcula o volume efetivo de questões de treino expurgando sessões marcadas para exclusão.
 */
export function calculateEffectiveQuestionVolume(
  classifiedSessions: ClassifiedSession[],
  options: { excludeAtypicalSessions: boolean }
): {
  totalRawQuestions: number;
  effectiveQuestions: number;
  excludedQuestions: number;
} {
  let totalRawQuestions = 0;
  let excludedQuestions = 0;

  for (const s of classifiedSessions) {
    totalRawQuestions += s.totalQuestions;
    if (options.excludeAtypicalSessions && s.isExcludedFromMetrics) {
      excludedQuestions += s.totalQuestions;
    }
  }

  return {
    totalRawQuestions,
    effectiveQuestions: totalRawQuestions - excludedQuestions,
    excludedQuestions,
  };
}
