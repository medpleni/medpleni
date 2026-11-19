/**
 * MEDPLENI B2B — psychometrics.ts
 * Funções puras para análise psicométrica de itens e provas (PR-09 / QB-12)
 *
 * Fórmulas estritamente conformes com docs/b2b/ESPEC-B2B.md (Seção 6):
 * 1. Índice de Facilidade (p) = acertos ÷ n
 * 2. Índice de Discriminação (D) = p(sup 27%) - p(inf 27%)
 * 3. Correlação Ponto-Bisserial Corrigida (r) = Pearson entre acerto no item e nota total sem o item
 * 4. KR-20 = (k / (k - 1)) * (1 - Σ p(1 - p) / σ²), com σ² = variância populacional dos acertos totais
 * 5. Frequência de cada alternativa (A, B, C, D, E e Em Branco)
 * 6. Sinais por item (Muito fácil, Muito difícil, Discriminação negativa, Discriminação baixa, Distrator dominante)
 */

import {
  DEFAULT_PSYCHOMETRICS_CONFIG,
  ITEM_FLAGS_META,
  type PsychometricsConfig,
  type ItemFlagMeta,
} from "./psychometrics-config";

export interface OptionFrequency {
  letter: string;
  count: number;
  percentage: number;
  isCorrect: boolean;
}

export interface StudentItemResponse {
  studentUserId: string;
  markedBaseLetter: string | null;
  isCorrect: boolean;
}

export interface ExamItemInput {
  id: string;
  orderIndex: number;
  questionId?: string | null;
  statement: string;
  clinicalContext?: string | null;
  correctLetter: string;
  explanation?: string | null;
  status: "valido" | "anulado" | string;
  area?: string | null;
  cenario?: string | null;
  tema?: string | null;
  competencia?: string | null;
  options: Array<{ letter: string; text: string; is_correct: boolean }>;
}

export interface StudentExamAttemptInput {
  studentUserId: string;
  status: "finalizada" | "ausente" | string;
  answers: Map<string, string | null>; // itemId -> markedBaseLetter
}

export interface ItemPsychometricsResult {
  itemId: string;
  orderIndex: number;
  questionId: string | null;
  statement: string;
  clinicalContext: string | null;
  correctLetter: string;
  explanation: string | null;
  status: "valido" | "anulado";
  area: string;
  cenario: string | null;
  tema: string | null;
  competencia: string | null;

  // Métricas
  sampleSize: number;
  correctCount: number;
  facilityIndex: number | null; // p
  discriminationIndex: number | null; // D (27% sup - 27% inf)
  correctedPointBiserial: number | null; // r
  optionFrequencies: OptionFrequency[];
  dominantDistractorLetter: string | null;

  // Sinais e alertas
  flags: ItemFlagMeta[];
  hasSignal: boolean;
  isAnulado: boolean;
}

export interface ExamPsychometricsSummary {
  totalItems: number;
  validItemsCount: number;
  annulledItemsCount: number;
  sampleSize: number; // Alunos finalizados
  meanScore: number;
  scoreVariance: number; // σ² populacional
  kr20: number | null;
  kr20Interpretation: string;

  // Avisos de amostra
  isSmallSample: boolean; // n < 30
  isSampleBelowMinimum: boolean; // n < 10
  sampleWarningMessage: string | null;

  // Itens analisados
  items: ItemPsychometricsResult[];
  itemsWithSignalsCount: number;
}

/**
 * 1. Calcula o Índice de Facilidade (p)
 * p = acertos / total de alunos
 * Varia de 0 a 1. Se totalStudents == 0, retorna null.
 */
export function calculateFacilityIndex(
  correctCount: number,
  totalStudents: number
): number | null {
  if (totalStudents <= 0) return null;
  const p = correctCount / totalStudents;
  return Number(p.toFixed(4));
}

/**
 * 2. Calcula a Variância Populacional (σ²) de um array de pontuações
 * σ² = (1/n) * Σ (X_j - μ)²
 */
export function calculatePopulationVariance(scores: number[]): number {
  const n = scores.length;
  if (n === 0) return 0;
  const mean = scores.reduce((acc, v) => acc + v, 0) / n;
  const sumSquares = scores.reduce((acc, v) => acc + (v - mean) ** 2, 0);
  return sumSquares / n;
}

/**
 * 3. Calcula o Índice de Discriminação (D) pelos grupos extremos de 27%
 * D = p_sup - p_inf
 * Requer n >= sampleSizeMinThreshold (padrão 10). Se n < 10, retorna null.
 */
export function calculateDiscriminationIndex(
  upperCorrect: number,
  lowerCorrect: number,
  groupSize: number,
  totalStudents: number,
  config: PsychometricsConfig = DEFAULT_PSYCHOMETRICS_CONFIG
): number | null {
  if (totalStudents < config.sampleSizeMinThreshold || groupSize <= 0) {
    return null;
  }
  const pSup = upperCorrect / groupSize;
  const pInf = lowerCorrect / groupSize;
  const d = pSup - pInf;
  return Number(d.toFixed(4));
}

/**
 * 4. Calcula a Correlação Ponto-Bisserial Corrigida (r)
 * Correlação de Pearson entre o vetor binário do item (y_j ∈ {0, 1})
 * e a nota total de acertos do aluno SEM o próprio item (X_{j, -i}).
 *
 * Casos de borda:
 * - Se n < sampleSizeMinThreshold (padrão 10): retorna null
 * - Se todos acertam ou todos erram o item (Var(y) = 0): retorna null
 * - Se todos os alunos têm a mesma nota no restante da prova (Var(X_-i) = 0): retorna null
 */
export function calculateCorrectedPointBiserial(
  itemScores: number[],
  totalScoresWithoutItem: number[],
  config: PsychometricsConfig = DEFAULT_PSYCHOMETRICS_CONFIG
): number | null {
  const n = itemScores.length;
  if (n < config.sampleSizeMinThreshold || n !== totalScoresWithoutItem.length) {
    return null;
  }

  // Média de y e de X_-i
  let sumY = 0;
  let sumZ = 0;
  for (let i = 0; i < n; i++) {
    sumY += itemScores[i];
    sumZ += totalScoresWithoutItem[i];
  }
  const meanY = sumY / n;
  const meanZ = sumZ / n;

  // Soma de quadrados e produtos cruzados
  let ssY = 0;
  let ssZ = 0;
  let sYZ = 0;

  for (let i = 0; i < n; i++) {
    const diffY = itemScores[i] - meanY;
    const diffZ = totalScoresWithoutItem[i] - meanZ;
    ssY += diffY * diffY;
    ssZ += diffZ * diffZ;
    sYZ += diffY * diffZ;
  }

  // Se qualquer variância for zero, a correlação é matematicamente indefinida
  if (ssY <= 1e-12 || ssZ <= 1e-12) {
    return null;
  }

  const denominator = Math.sqrt(ssY * ssZ);
  if (denominator <= 1e-12) return null;

  const r = sYZ / denominator;
  // Limita a [-1, 1] contra pequenos erros de ponto flutuante
  const clamped = Math.max(-1, Math.min(1, r));
  return Number(clamped.toFixed(4));
}

/**
 * 5. Calcula o coeficiente KR-20 (Kuder-Richardson Fórmula 20)
 * KR-20 = (k / (k - 1)) * (1 - Σ p_i(1 - p_i) / σ_X²)
 *
 * k: quantidade de itens válidos
 * p_i: facilidade de cada item válido
 * σ_X²: variância populacional do total de acertos válidos
 *
 * Se n < sampleSizeMinThreshold, ou k < 2, ou σ_X² == 0: retorna null
 */
export function calculateKR20(
  itemFacilityIndices: number[],
  totalScores: number[],
  config: PsychometricsConfig = DEFAULT_PSYCHOMETRICS_CONFIG
): number | null {
  const k = itemFacilityIndices.length;
  const n = totalScores.length;

  if (k < 2 || n < config.sampleSizeMinThreshold) {
    return null;
  }

  const scoreVariance = calculatePopulationVariance(totalScores);
  if (scoreVariance <= 1e-12) {
    return null;
  }

  let sumPq = 0;
  for (const p of itemFacilityIndices) {
    sumPq += p * (1 - p);
  }

  const kr20 = (k / (k - 1)) * (1 - sumPq / scoreVariance);
  return Number(kr20.toFixed(4));
}

/**
 * Interpretação em uma frase do KR-20 para apresentação na tela
 */
export function getKR20Interpretation(kr20: number | null): string {
  if (kr20 === null) {
    return "Amostra insuficiente (n < 10) ou dispersão nula para cálculo da consistência interna.";
  }
  if (kr20 >= 0.80) {
    return `Excelente consistência interna da prova (KR-20 = ${kr20.toFixed(2)}). Itens coesos e alta confiabilidade na medição.`;
  }
  if (kr20 >= 0.70) {
    return `Boa consistência interna (KR-20 = ${kr20.toFixed(2)}), adequada para exames somativos e tomada de decisão.`;
  }
  if (kr20 >= 0.60) {
    return `Consistência interna moderada (KR-20 = ${kr20.toFixed(2)}), aceitável para avaliações formativas e diagnósticas.`;
  }
  return `Baixa consistência interna (KR-20 = ${kr20.toFixed(2)}). A prova apresenta alta dispersão ou itens com baixa correlação entre si.`;
}

/**
 * 6. Calcula a frequência e percentual de marcação de cada alternativa (A–E e Em Branco)
 */
export function calculateOptionFrequencies(
  optionLetters: string[],
  markedResponses: Array<string | null>,
  correctLetter: string
): OptionFrequency[] {
  const total = markedResponses.length;
  const countMap = new Map<string, number>();

  // Inicializa contadores
  optionLetters.forEach((letter) => countMap.set(letter, 0));
  countMap.set("branco", 0);

  markedResponses.forEach((ans) => {
    if (!ans || !optionLetters.includes(ans)) {
      countMap.set("branco", (countMap.get("branco") || 0) + 1);
    } else {
      countMap.set(ans, (countMap.get(ans) || 0) + 1);
    }
  });

  const frequencies: OptionFrequency[] = optionLetters.map((letter) => {
    const count = countMap.get(letter) || 0;
    const percentage = total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;
    return {
      letter,
      count,
      percentage,
      isCorrect: letter.toUpperCase() === correctLetter.toUpperCase(),
    };
  });

  // Adiciona opção em branco se houver marcações nulas
  const blankCount = countMap.get("branco") || 0;
  if (blankCount > 0) {
    frequencies.push({
      letter: "Branco",
      count: blankCount,
      percentage: total > 0 ? Number(((blankCount / total) * 100).toFixed(1)) : 0,
      isCorrect: false,
    });
  }

  return frequencies;
}

/**
 * 7. Avalia os sinais e etiquetas psicométricas de um item
 */
export function evaluateItemFlags(
  params: {
    facilityIndex: number | null;
    pointBiserial: number | null;
    optionFrequencies: OptionFrequency[];
    correctLetter: string;
  },
  config: PsychometricsConfig = DEFAULT_PSYCHOMETRICS_CONFIG
): { flags: ItemFlagMeta[]; dominantDistractorLetter: string | null } {
  const { facilityIndex, pointBiserial, optionFrequencies, correctLetter } = params;
  const flags: ItemFlagMeta[] = [];

  // Sinal: Muito fácil (p > 0.90)
  if (facilityIndex !== null && facilityIndex > config.flagVeryEasyThreshold) {
    flags.push(ITEM_FLAGS_META.muito_facil);
  }

  // Sinal: Muito difícil (p < 0.20)
  if (facilityIndex !== null && facilityIndex < config.flagVeryHardThreshold) {
    flags.push(ITEM_FLAGS_META.muito_dificil);
  }

  // Sinal: Discriminação negativa (r < 0)
  if (pointBiserial !== null && pointBiserial < config.flagNegativeDiscriminationThreshold) {
    flags.push(ITEM_FLAGS_META.discriminacao_negativa);
  }
  // Sinal: Discriminação baixa (0 <= r < 0.20)
  else if (
    pointBiserial !== null &&
    pointBiserial >= config.flagNegativeDiscriminationThreshold &&
    pointBiserial < config.flagLowDiscriminationThreshold
  ) {
    flags.push(ITEM_FLAGS_META.discriminacao_baixa);
  }

  // Sinal: Distrator dominante
  // Uma alternativa incorreta foi mais marcada que a correta
  const correctOpt = optionFrequencies.find(
    (o) => o.letter.toUpperCase() === correctLetter.toUpperCase()
  );
  const correctCount = correctOpt ? correctOpt.count : 0;

  let dominantDistractorLetter: string | null = null;
  let maxDistractorCount = -1;

  for (const opt of optionFrequencies) {
    if (opt.letter.toUpperCase() === correctLetter.toUpperCase()) continue;
    if (opt.letter === "Branco") continue;

    if (opt.count > correctCount && opt.count > maxDistractorCount) {
      maxDistractorCount = opt.count;
      dominantDistractorLetter = opt.letter;
    }
  }

  if (dominantDistractorLetter !== null) {
    flags.push(ITEM_FLAGS_META.distrator_dominante);
  }

  return { flags, dominantDistractorLetter };
}

/**
 * 8. Função de orquestração completa: Análise Psicométrica de Toda a Prova
 * Processa todos os itens e tentativas de alunos finalizados, calculando
 * facilidade, discriminação, ponto-bisserial corrigida, KR-20 e sinais.
 */
export function calculateExamPsychometrics(
  params: {
    items: ExamItemInput[];
    attempts: StudentExamAttemptInput[];
  },
  customConfig?: Partial<PsychometricsConfig>
): ExamPsychometricsSummary {
  const config: PsychometricsConfig = {
    ...DEFAULT_PSYCHOMETRICS_CONFIG,
    ...customConfig,
  };

  const { items, attempts } = params;

  // Filtra apenas tentativas finalizadas (n)
  const finishedAttempts = attempts.filter((a) => a.status === "finalizada");
  const n = finishedAttempts.length;

  const isSmallSample = n > 0 && n < config.sampleSizeWarningThreshold;
  const isSampleBelowMinimum = n < config.sampleSizeMinThreshold;

  let sampleWarningMessage: string | null = null;
  if (isSampleBelowMinimum) {
    sampleWarningMessage = `Amostra insuficiente (n = ${n} alunos; mínimo = ${config.sampleSizeMinThreshold}). O cálculo de discriminação (D), ponto-bisserial (r) e KR-20 foi desabilitado.`;
  } else if (isSmallSample) {
    sampleWarningMessage = `Amostra pequena (n = ${n} alunos; recomendado ≥ ${config.sampleSizeWarningThreshold}). Os índices estatísticos estão sujeitos a oscilações.`;
  }

  // Separa itens válidos (anulados saem de k e do cálculo total da prova)
  const validItems = items.filter((it) => it.status !== "anulado");
  const validItemIds = new Set(validItems.map((it) => it.id));
  const kValid = validItems.length;

  // Calcula a matriz de acertos dicotômicos: aluno -> itemId -> 0 | 1
  // Resposta em branco ou nula conta como erro (0)
  const studentScoresOnValidItems: number[] = [];
  const studentItemMatrix = new Map<string, Map<string, number>>();

  for (const att of finishedAttempts) {
    let studentTotalValid = 0;
    const itemMap = new Map<string, number>();

    for (const item of items) {
      if (item.status === "anulado") {
        itemMap.set(item.id, 0);
        continue;
      }

      const marked = att.answers.get(item.id);
      const isCorrect =
        Boolean(marked) &&
        String(marked).trim().toUpperCase() === String(item.correctLetter).trim().toUpperCase();

      const score = isCorrect ? 1 : 0;
      itemMap.set(item.id, score);
      studentTotalValid += score;
    }

    studentItemMatrix.set(att.studentUserId, itemMap);
    studentScoresOnValidItems.push(studentTotalValid);
  }

  // Média e variância populacional da nota total (número de acertos válidos)
  const meanScore =
    n > 0 ? studentScoresOnValidItems.reduce((acc, v) => acc + v, 0) / n : 0;
  const scoreVariance = calculatePopulationVariance(studentScoresOnValidItems);

  // Ordenação de alunos por nota total para o grupo superior e inferior (27%)
  const sortedStudents = [...finishedAttempts].sort((a, b) => {
    const scoreA = studentItemMatrix.get(a.studentUserId)
      ? Array.from(studentItemMatrix.get(a.studentUserId)!.entries())
          .filter(([itemId]) => validItemIds.has(itemId))
          .reduce((sum, [, s]) => sum + s, 0)
      : 0;
    const scoreB = studentItemMatrix.get(b.studentUserId)
      ? Array.from(studentItemMatrix.get(b.studentUserId)!.entries())
          .filter(([itemId]) => validItemIds.has(itemId))
          .reduce((sum, [, s]) => sum + s, 0)
      : 0;
    return scoreB - scoreA; // Decrescente
  });

  const groupSize = Math.max(1, Math.round(n * config.upperLowerGroupRatio));
  const upperGroup = sortedStudents.slice(0, groupSize);
  const lowerGroup = sortedStudents.slice(Math.max(0, n - groupSize));

  // Análise individual de cada questão
  const analyzedItems: ItemPsychometricsResult[] = [];
  const validPList: number[] = [];

  for (const item of items) {
    const isAnulado = item.status === "anulado";
    const optionLetters = item.options.map((o) => o.letter);
    if (!optionLetters.includes("A")) optionLetters.push("A", "B", "C", "D", "E");
    const uniqueOptionLetters = Array.from(new Set(optionLetters)).sort();

    // Respostas marcadas por todos os alunos nesta questão
    const markedLetters: Array<string | null> = [];
    const itemScores: number[] = [];
    const scoresWithoutItem: number[] = [];

    let correctCount = 0;

    for (const att of finishedAttempts) {
      const marked = att.answers.get(item.id) || null;
      markedLetters.push(marked);

      const isCorrect =
        Boolean(marked) &&
        String(marked).trim().toUpperCase() === String(item.correctLetter).trim().toUpperCase();

      const itemScore = isCorrect ? 1 : 0;
      itemScores.push(itemScore);
      if (isCorrect) correctCount++;

      // Nota total do aluno sem este item
      const totalScore = studentScoresOnValidItems[finishedAttempts.indexOf(att)] || 0;
      const scoreWithout = isAnulado ? totalScore : totalScore - itemScore;
      scoresWithoutItem.push(scoreWithout);
    }

    // Frequência de alternativas
    const optionFrequencies = calculateOptionFrequencies(
      uniqueOptionLetters,
      markedLetters,
      item.correctLetter
    );

    if (isAnulado) {
      // Item anulado: sai do KR-20 e tem métricas nulas
      analyzedItems.push({
        itemId: item.id,
        orderIndex: item.orderIndex,
        questionId: item.questionId || null,
        statement: item.statement,
        clinicalContext: item.clinicalContext || null,
        correctLetter: item.correctLetter,
        explanation: item.explanation || null,
        status: "anulado",
        area: item.area || "Clínica Médica",
        cenario: item.cenario || null,
        tema: item.tema || null,
        competencia: item.competencia || null,
        sampleSize: n,
        correctCount,
        facilityIndex: null,
        discriminationIndex: null,
        correctedPointBiserial: null,
        optionFrequencies,
        dominantDistractorLetter: null,
        flags: [],
        hasSignal: false,
        isAnulado: true,
      });
      continue;
    }

    // 1. Facilidade (p)
    const facilityIndex = calculateFacilityIndex(correctCount, n);
    if (facilityIndex !== null) validPList.push(facilityIndex);

    // 2. Discriminação (D)
    let upperCorrect = 0;
    for (const att of upperGroup) {
      const marked = att.answers.get(item.id);
      if (
        marked &&
        String(marked).trim().toUpperCase() === String(item.correctLetter).trim().toUpperCase()
      ) {
        upperCorrect++;
      }
    }

    let lowerCorrect = 0;
    for (const att of lowerGroup) {
      const marked = att.answers.get(item.id);
      if (
        marked &&
        String(marked).trim().toUpperCase() === String(item.correctLetter).trim().toUpperCase()
      ) {
        lowerCorrect++;
      }
    }

    const discriminationIndex = calculateDiscriminationIndex(
      upperCorrect,
      lowerCorrect,
      groupSize,
      n,
      config
    );

    // 3. Ponto-Bisserial Corrigida (r)
    const correctedPointBiserial = calculateCorrectedPointBiserial(
      itemScores,
      scoresWithoutItem,
      config
    );

    // 4. Sinais por Item
    const { flags, dominantDistractorLetter } = evaluateItemFlags(
      {
        facilityIndex,
        pointBiserial: correctedPointBiserial,
        optionFrequencies,
        correctLetter: item.correctLetter,
      },
      config
    );

    analyzedItems.push({
      itemId: item.id,
      orderIndex: item.orderIndex,
      questionId: item.questionId || null,
      statement: item.statement,
      clinicalContext: item.clinicalContext || null,
      correctLetter: item.correctLetter,
      explanation: item.explanation || null,
      status: "valido",
      area: item.area || "Clínica Médica",
      cenario: item.cenario || null,
      tema: item.tema || null,
      competencia: item.competencia || null,
      sampleSize: n,
      correctCount,
      facilityIndex,
      discriminationIndex,
      correctedPointBiserial,
      optionFrequencies,
      dominantDistractorLetter,
      flags,
      hasSignal: flags.length > 0,
      isAnulado: false,
    });
  }

  // 5. Coeficiente KR-20 da prova
  const kr20 = calculateKR20(validPList, studentScoresOnValidItems, config);
  const kr20Interpretation = getKR20Interpretation(kr20);

  const itemsWithSignalsCount = analyzedItems.filter((i) => i.hasSignal).length;

  return {
    totalItems: items.length,
    validItemsCount: kValid,
    annulledItemsCount: items.length - kValid,
    sampleSize: n,
    meanScore: Number(meanScore.toFixed(2)),
    scoreVariance: Number(scoreVariance.toFixed(4)),
    kr20,
    kr20Interpretation,
    isSmallSample,
    isSampleBelowMinimum,
    sampleWarningMessage,
    items: analyzedItems,
    itemsWithSignalsCount,
  };
}
