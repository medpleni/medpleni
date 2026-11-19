/**
 * MEDPLENI B2B — results.ts
 * Motor de Cálculo Psicométrico e Estatístico de Resultados de Avaliações
 * Conforme docs/b2b/ESPEC-B2B.md (seções 0, 4.2, 4.3 e 6):
 * - Resumo: Presentes, Média, Mediana, P25-P75, % Abaixo do Corte, Rodapé Base/Período/Fonte
 * - Curva de Distribuição em faixas de 5 pontos com Mediana e Linha 60
 * - Rendimento por Eixos (Área, Cenário, Tema, Competência) com Total Geral ao lado (TC-07)
 * - Aviso de Amostra Pequena (< 5 questões) com oscilação estatística
 * - Tabela de Alunos com Faixas e Variação vs Prova Anterior com aviso explícito
 * - Tabela Turmas × Resultado
 * - Exportação Aluno × Item × Alternativa com Mapa de Embaralhamento (PR-10) e Dicionário
 */

export type PerformanceBand = "ate_50" | "faixa_51_60" | "faixa_61_70" | "faixa_71_mais";

export interface AssessmentSummaryStats {
  totalEnrolled: number;
  totalPresent: number;
  totalAbsent: number;
  meanScore: number;
  medianScore: number;
  p25: number;
  p75: number;
  belowCutScoreCount: number;
  belowCutScorePercentage: number;
  cutScore: number;
  minScore: number;
  maxScore: number;
  footer: {
    base: string;
    period: string;
    source: string;
  };
}

export interface ScoreDistributionBucket {
  index: number;
  rangeLabel: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
  isMedianBucket: boolean;
  isCutScoreBucket: boolean;
}

export interface AxisPerformanceItem {
  id: string;
  name: string;
  totalValidQuestions: number;
  averageScorePercentage: number;
  hasLowQuestionCountWarning: boolean; // < 5 questões
  warningText?: string;
}

export interface AxisPerformanceResult {
  axisType: "area" | "cenario" | "tema" | "competencia";
  axisLabel: string;
  items: AxisPerformanceItem[];
  overallExamAverage: number; // Ajuste TC-07: rendimento total geral sempre ao lado
}

export interface ClassGroupResultItem {
  classGroupId: string;
  classGroupName: string;
  period: number;
  totalEnrolled: number;
  totalPresent: number;
  totalAbsent: number;
  meanScore: number;
  medianScore: number;
  belowCutScorePercentage: number;
  deltaFromExamAverage: number;
}

export interface StudentResultRow {
  studentUserId: string;
  studentName: string;
  studentRa: string;
  classGroupId: string;
  classGroupName: string;
  formCode: string;
  status: "presente" | "ausente";
  scoreRaw: number;
  scorePercentage: number;
  performanceBand: PerformanceBand;
  bandLabel: string;
  bandColor: string;
  previousScorePercentage?: number | null;
  previousScoreDelta?: number | null;
  previousExamTitle?: string | null;
  previousExamComparisonNotice?: string;
}

export interface ExportStudentItemDetail {
  studentName: string;
  studentRa: string;
  classGroupName: string;
  formCode: string;
  itemOrderBase: number;
  itemOrderForm: number;
  questionStatementShort: string;
  markedFormLetter: string;
  markedBaseLetter: string;
  correctBaseLetter: string;
  isCorrect: boolean;
  weight: number;
  area: string;
  cenario?: string;
  tema?: string;
  competencia?: string;
  timeSpentSeconds?: number;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. CÁLCULO ESTATÍSTICO DE PERCENTIS E RESUMO DA AVALIAÇÃO
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Interpolação linear exata de percentis (padrão Excel PERCENTILE.INC, R type 7, NumPy linear)
 */
export function calculatePercentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];

  const index = (sortedValues.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) {
    return Number(sortedValues[lower].toFixed(2));
  }

  const interpolated = sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  return Number(interpolated.toFixed(2));
}

/**
 * Calcula o resumo estatístico completo da prova com rodapé Base/Período/Fonte
 */
export function calculateExamSummaryStats(params: {
  presentScores: number[]; // Array de notas (%) dos alunos presentes
  totalEnrolled: number;
  totalAbsent: number;
  cutScore?: number;
  academicTermLabel?: string;
  assessmentTitle?: string;
}): AssessmentSummaryStats {
  const {
    presentScores,
    totalEnrolled,
    totalAbsent,
    cutScore = 60,
    academicTermLabel = "2027.1",
    assessmentTitle = "Caderno Oficial",
  } = params;

  const totalPresent = presentScores.length;

  if (totalPresent === 0) {
    return {
      totalEnrolled,
      totalPresent: 0,
      totalAbsent,
      meanScore: 0,
      medianScore: 0,
      p25: 0,
      p75: 0,
      belowCutScoreCount: 0,
      belowCutScorePercentage: 0,
      cutScore,
      minScore: 0,
      maxScore: 0,
      footer: {
        base: `Alunos presentes: 0 de ${totalEnrolled} convocados`,
        period: academicTermLabel,
        source: `MedPleni Avaliações • ${assessmentTitle}`,
      },
    };
  }

  // Ordena para cálculo de percentis
  const sorted = [...presentScores].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const meanScore = Number((sum / totalPresent).toFixed(2));
  const medianScore = calculatePercentile(sorted, 0.5);
  const p25 = calculatePercentile(sorted, 0.25);
  const p75 = calculatePercentile(sorted, 0.75);

  const minScore = sorted[0];
  const maxScore = sorted[sorted.length - 1];

  const belowCutScoreCount = sorted.filter((score) => score < cutScore).length;
  const belowCutScorePercentage = Number(
    ((belowCutScoreCount / totalPresent) * 100).toFixed(2)
  );

  return {
    totalEnrolled,
    totalPresent,
    totalAbsent,
    meanScore,
    medianScore,
    p25,
    p75,
    belowCutScoreCount,
    belowCutScorePercentage,
    cutScore,
    minScore,
    maxScore,
    footer: {
      base: `Base: ${totalPresent} alunos presentes (${totalAbsent} ausentes)`,
      period: `Período: ${academicTermLabel}`,
      source: `Fonte: MedPleni Avaliações • ${assessmentTitle}`,
    },
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. CURVA DE DISTRIBUIÇÃO DAS NOTAS EM FAIXAS DE 5 PONTOS
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function calculateScoreDistribution(
  presentScores: number[],
  cutScore: number = 60,
  medianScore: number = 60
): ScoreDistributionBucket[] {
  const buckets: ScoreDistributionBucket[] = [];
  const total = presentScores.length;

  // 20 faixas: [0, 5), [5, 10), ..., [95, 100]
  for (let i = 0; i < 20; i++) {
    const min = i * 5;
    const max = min + 5;
    const isLast = i === 19;

    const count = presentScores.filter((s) => {
      if (isLast) {
        return s >= min && s <= max; // 100% entra na última faixa
      }
      return s >= min && s < max;
    }).length;

    const percentage = total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;
    const isCutScoreBucket = min <= cutScore && cutScore <= max;
    const isMedianBucket = min <= medianScore && medianScore <= max;

    buckets.push({
      index: i + 1,
      rangeLabel: `${min}–${max}%`,
      min,
      max,
      count,
      percentage,
      isMedianBucket,
      isCutScoreBucket,
    });
  }

  return buckets;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. RESULTADO POR EIXOS (ÁREA, CENÁRIO, TEMA, COMPETÊNCIA)
 * Conforme PR-08 e ajuste TC-07 (total geral sempre ao lado)
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface RawItemPerformanceInput {
  itemId: string;
  area: string;
  cenario?: string | null;
  tema?: string | null;
  competencia?: string | null;
  weight: number;
  status: "valido" | "anulado";
  answers: Array<{
    studentUserId: string;
    isCorrect: boolean;
  }>;
}

export function calculateAllAxesPerformance(
  items: RawItemPerformanceInput[],
  overallExamAverage: number
): AxisPerformanceResult[] {
  // Filtra apenas itens válidos (anulados saem das estatísticas)
  const validItems = items.filter((it) => it.status === "valido");

  const results: AxisPerformanceResult[] = [];

  const axesConfig: Array<{
    type: "area" | "cenario" | "tema" | "competencia";
    label: string;
    extractor: (it: RawItemPerformanceInput) => string | null | undefined;
  }> = [
    { type: "area", label: "Grande Área", extractor: (it) => it.area },
    { type: "cenario", label: "Cenário de Atuação", extractor: (it) => it.cenario },
    { type: "tema", label: "Tema Clínico", extractor: (it) => it.tema },
    { type: "competencia", label: "Competência", extractor: (it) => it.competencia },
  ];

  axesConfig.forEach((cfg) => {
    const categoryMap = new Map<
      string,
      {
        totalQuestions: number;
        studentCorrectCount: number;
        studentTotalAttempts: number;
      }
    >();

    validItems.forEach((it) => {
      const val = cfg.extractor(it)?.trim();
      if (!val) return; // Se não tiver este eixo preenchido, pula

      const current = categoryMap.get(val) || {
        totalQuestions: 0,
        studentCorrectCount: 0,
        studentTotalAttempts: 0,
      };

      current.totalQuestions += 1;
      it.answers.forEach((ans) => {
        current.studentTotalAttempts += 1;
        if (ans.isCorrect) {
          current.studentCorrectCount += 1;
        }
      });

      categoryMap.set(val, current);
    });

    // Se a prova possui questões categorizadas neste eixo, inclui a aba
    if (categoryMap.size > 0) {
      const itemsList: AxisPerformanceItem[] = Array.from(categoryMap.entries()).map(
        ([name, stat]) => {
          const avg =
            stat.studentTotalAttempts > 0
              ? Number(
                  ((stat.studentCorrectCount / stat.studentTotalAttempts) * 100).toFixed(1)
                )
              : 0;

          const isLow = stat.totalQuestions < 5;

          return {
            id: name,
            name,
            totalValidQuestions: stat.totalQuestions,
            averageScorePercentage: avg,
            hasLowQuestionCountWarning: isLow,
            warningText: isLow
              ? "Amostra pequena (< 5 questões): sujeito a oscilação estatística"
              : undefined,
          };
        }
      );

      // Ordena por nome
      itemsList.sort((a, b) => a.name.localeCompare(b.name));

      results.push({
        axisType: cfg.type,
        axisLabel: cfg.label,
        items: itemsList,
        overallExamAverage,
      });
    }
  });

  return results;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 4. TABELA TURMAS × RESULTADO
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function calculateClassGroupsPerformance(
  classGroups: Array<{ id: string; name: string; period: number }>,
  studentsData: Array<{
    classGroupId: string;
    status: "presente" | "ausente";
    scorePercentage: number;
  }>,
  overallExamAverage: number,
  cutScore: number = 60
): ClassGroupResultItem[] {
  return classGroups.map((cg) => {
    const cgStudents = studentsData.filter((s) => s.classGroupId === cg.id);
    const totalEnrolled = cgStudents.length;
    const presentStudents = cgStudents.filter((s) => s.status === "presente");
    const totalPresent = presentStudents.length;
    const totalAbsent = cgStudents.filter((s) => s.status === "ausente").length;

    const presentScores = presentStudents.map((s) => s.scorePercentage);
    const sorted = [...presentScores].sort((a, b) => a - b);

    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const meanScore = totalPresent > 0 ? Number((sum / totalPresent).toFixed(1)) : 0;
    const medianScore = totalPresent > 0 ? calculatePercentile(sorted, 0.5) : 0;

    const belowCutCount = sorted.filter((s) => s < cutScore).length;
    const belowCutScorePercentage =
      totalPresent > 0 ? Number(((belowCutCount / totalPresent) * 100).toFixed(1)) : 0;

    const deltaFromExamAverage =
      totalPresent > 0 ? Number((meanScore - overallExamAverage).toFixed(1)) : 0;

    return {
      classGroupId: cg.id,
      classGroupName: cg.name,
      period: cg.period,
      totalEnrolled,
      totalPresent,
      totalAbsent,
      meanScore,
      medianScore,
      belowCutScorePercentage,
      deltaFromExamAverage,
    };
  });
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 5. FAIXAS DE DESEMPENHO E TABELA DE ALUNOS COM VARIAÇÃO HISTÓRICA
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function getPerformanceBand(scorePercentage: number): {
  band: PerformanceBand;
  label: string;
  color: string;
} {
  if (scorePercentage < 51) {
    return { band: "ate_50", label: "Até 50% (Crítico)", color: "text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400" };
  }
  if (scorePercentage <= 60) {
    return { band: "faixa_51_60", label: "51–60% (Zona de Decisão)", color: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400" };
  }
  if (scorePercentage <= 70) {
    return { band: "faixa_61_70", label: "61–70% (Proficiente)", color: "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400" };
  }
  return { band: "faixa_71_mais", label: "71%+ (Excelente)", color: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400" };
}

export function buildStudentResultRows(params: {
  students: Array<{
    studentUserId: string;
    studentName: string;
    studentRa: string;
    classGroupId: string;
    classGroupName: string;
    formCode: string;
    status: "presente" | "ausente";
    scoreRaw: number;
    scorePercentage: number;
    previousScorePercentage?: number | null;
  }>;
  previousExamTitle?: string | null;
}): StudentResultRow[] {
  const { students, previousExamTitle } = params;

  return students.map((st) => {
    const bandInfo = getPerformanceBand(st.scorePercentage);

    let previousScoreDelta: number | null = null;
    let notice = "";

    if (st.previousScorePercentage !== undefined && st.previousScorePercentage !== null) {
      previousScoreDelta = Number((st.scorePercentage - st.previousScorePercentage).toFixed(1));
      notice = previousExamTitle
        ? `Variação nominal calculada em relação a "${previousExamTitle}". Atenção: provas diferentes possuem graus de dificuldade distintos e não utilizam a mesma régua métrica.`
        : "Atenção: provas diferentes possuem graus de dificuldade distintos e não utilizam a mesma régua métrica.";
    } else {
      notice = "Primeira avaliação deste tipo realizada pelo aluno no sistema.";
    }

    return {
      studentUserId: st.studentUserId,
      studentName: st.studentName,
      studentRa: st.studentRa,
      classGroupId: st.classGroupId,
      classGroupName: st.classGroupName,
      formCode: st.formCode,
      status: st.status,
      scoreRaw: st.scoreRaw,
      scorePercentage: st.scorePercentage,
      performanceBand: bandInfo.band,
      bandLabel: bandInfo.label,
      bandColor: bandInfo.color,
      previousScorePercentage: st.previousScorePercentage,
      previousScoreDelta,
      previousExamTitle,
      previousExamComparisonNotice: notice,
    };
  });
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 6. EXPORTAÇÃO ALUNO × ITEM × ALTERNATIVA (PR-10) E DICIONÁRIO DE DADOS
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function generateExportCSV(records: ExportStudentItemDetail[]): string {
  const headers = [
    "aluno_nome",
    "aluno_ra",
    "turma",
    "forma_caderno",
    "item_ordem_base",
    "item_ordem_forma",
    "questao_enunciado_curto",
    "alternativa_marcada_forma",
    "alternativa_marcada_base",
    "gabarito_base",
    "acertou",
    "peso",
    "area",
    "cenario",
    "tema",
    "competencia",
    "tempo_gasto_segundos",
  ];

  const escapeCSV = (str: unknown) => {
    if (str === null || str === undefined) return "";
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const lines = [headers.join(";")];

  records.forEach((r) => {
    const row = [
      escapeCSV(r.studentName),
      escapeCSV(r.studentRa),
      escapeCSV(r.classGroupName),
      escapeCSV(r.formCode),
      r.itemOrderBase,
      r.itemOrderForm,
      escapeCSV(r.questionStatementShort),
      escapeCSV(r.markedFormLetter || ""),
      escapeCSV(r.markedBaseLetter || ""),
      escapeCSV(r.correctBaseLetter),
      r.isCorrect ? 1 : 0,
      r.weight,
      escapeCSV(r.area),
      escapeCSV(r.cenario || ""),
      escapeCSV(r.tema || ""),
      escapeCSV(r.competencia || ""),
      r.timeSpentSeconds || 0,
    ];
    lines.push(row.join(";"));
  });

  // UTF-8 BOM para garantir abertura correta no Excel sem corromper acentos
  return "\uFEFF" + lines.join("\r\n");
}

export function generateDataDictionary(): Record<string, { descricao: string; tipo: string; regra: string }> {
  return {
    aluno_nome: {
      descricao: "Nome civil completo do estudante cadastrado na instituição",
      tipo: "Texto",
      regra: "Obrigatório",
    },
    aluno_ra: {
      descricao: "Registro Acadêmico institucional do aluno",
      tipo: "Texto",
      regra: "Formato RA-XXXXX",
    },
    turma: {
      descricao: "Turma e período letivo em que o estudante está matriculado",
      tipo: "Texto",
      regra: "Identificação da turma cadastrada",
    },
    forma_caderno: {
      descricao: "Código da forma embaralhada atribuída ao aluno no momento da prova",
      tipo: "Texto",
      regra: "A, B, C, D...",
    },
    item_ordem_base: {
      descricao: "Número de ordem canônica da questão no Caderno Base congelado",
      tipo: "Inteiro",
      regra: "1 a N",
    },
    item_ordem_forma: {
      descricao: "Número de ordem em que a questão apareceu para o aluno nesta forma",
      tipo: "Inteiro",
      regra: "1 a N conforme mapa de embaralhamento",
    },
    questao_enunciado_curto: {
      descricao: "Primeiros 100 caracteres do enunciado da questão para identificação rápida",
      tipo: "Texto",
      regra: "Snapshot congelado",
    },
    alternativa_marcada_forma: {
      descricao: "Letra que o aluno assinalou na sua folha ou player online",
      tipo: "Caractere",
      regra: "A, B, C, D, E ou VAZIO se em branco",
    },
    alternativa_marcada_base: {
      descricao: "Letra correspondente da resposta do aluno convertida para a ordem do Caderno Base",
      tipo: "Caractere",
      regra: "A, B, C, D, E ou VAZIO se em branco",
    },
    gabarito_base: {
      descricao: "Letra oficial correta no Caderno Base",
      tipo: "Caractere",
      regra: "A, B, C, D, E",
    },
    acertou: {
      descricao: "Indicador binário de acerto do item",
      tipo: "Booleano / Binário",
      regra: "1 se acertou, 0 se errou ou deixou em branco; itens anulados saem do cálculo",
    },
    peso: {
      descricao: "Peso do item na pontuação ponderada",
      tipo: "Decimal",
      regra: "Padrão 1.00",
    },
    area: {
      descricao: "Grande área da medicina conforme padrão INEP (7 áreas)",
      tipo: "Texto",
      regra: "Taxonomia oficial do ENAMED",
    },
    cenario: {
      descricao: "Cenário de prática/atuação clínica",
      tipo: "Texto",
      regra: "Opcional",
    },
    tema: {
      descricao: "Tema clínico específico da questão",
      tipo: "Texto",
      regra: "Opcional",
    },
    competencia: {
      descricao: "Competência médica avaliada pelo item",
      tipo: "Texto",
      regra: "Opcional",
    },
    tempo_gasto_segundos: {
      descricao: "Tempo total em segundos registrado pelo player na resolução deste item",
      tipo: "Inteiro",
      regra: "Disponível na modalidade online",
    },
  };
}
