/**
 * MEDPLENI B2B — executive.ts
 * Funções puras para a Visão Executiva de Dirigente e Coordenador (EX-01 a EX-08)
 *
 * 1. Indicadores Executivos (Média, % < 60, Participação, Turmas < 60, Zona de Decisão 51-60)
 * 2. Heatmap Turma × Área com coluna própria de média final e 4 faixas de cor
 * 3. Evolução Longitudinal ao longo das provas com aviso de não equiparação
 * 4. Alertas padrão (apenas nota abaixo de 60)
 * 5. Matriz Turmas × Provas
 * 6. Cobertura da Matriz de Competências / Áreas
 * 7. Relatório Executivo Oficial (CPA, NDE, MEC)
 */

export interface IndicatorFootnote {
  base: string;
  period: string;
  source: string;
}

export type ScoreBandCategory = "ate_50" | "51_60" | "61_70" | "71_mais";

export interface ScoreBandStyle {
  category: ScoreBandCategory;
  label: string;
  colorHex: string;
  badgeClass: string;
}

export const SCORE_BANDS: Record<ScoreBandCategory, ScoreBandStyle> = {
  ate_50: {
    category: "ate_50",
    label: "Até 50% (Crítico)",
    colorHex: "#ef4444",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800",
  },
  "51_60": {
    category: "51_60",
    label: "51–60% (Zona de Decisão)",
    colorHex: "#f59e0b",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800",
  },
  "61_70": {
    category: "61_70",
    label: "61–70% (Adequado)",
    colorHex: "#10b981",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  "71_mais": {
    category: "71_mais",
    label: "71%+ (Excelente)",
    colorHex: "#059669",
    badgeClass: "bg-emerald-200 text-emerald-950 border-emerald-400 dark:bg-emerald-900/60 dark:text-emerald-100 dark:border-emerald-700",
  },
};

export function getScoreBandCategory(score: number): ScoreBandCategory {
  if (score <= 50) return "ate_50";
  if (score <= 60) return "51_60";
  if (score <= 70) return "61_70";
  return "71_mais";
}

export interface ExecutiveKPIsResult {
  institutionMeanScore: number;
  studentsBelowCutCount: number;
  studentsBelowCutPercentage: number;
  participationRate: number;
  totalEnrolled: number;
  totalPresent: number;
  totalAbsent: number;
  classesBelowCutCount: number;
  totalClasses: number;
  decisionZoneCount: number; // 51–60%
  decisionZonePercentage: number;
  footnote: IndicatorFootnote;
}

export interface ClassAreaHeatmapRow {
  classGroupId: string;
  classGroupLabel: string;
  period: number;
  totalStudents: number;
  classAverageScore: number;
  classScoreBand: ScoreBandCategory;
  areas: Array<{
    areaName: string;
    averageScore: number;
    scoreBand: ScoreBandCategory;
    questionsCount: number;
  }>;
}

export interface ExamTimelineItem {
  examId: string;
  title: string;
  date: string;
  type: string;
  totalEvaluated: number;
  institutionMeanScore: number;
  rateBelowCut: number;
}

export interface ExecutiveAlertItem {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "warning";
  classGroupName?: string;
  areaName?: string;
  value: number;
}

export interface MatrixCoverageItem {
  areaName: string;
  questionsCount: number;
  percentageOfTotal: number;
  referencePercentage: number;
  status: "satisfatoria" | "atencao" | "critica";
}

/**
 * 1. Calcula os 5 Indicadores Executivos Principais (EX-03)
 */
export function calculateExecutiveKPIs(params: {
  attempts: Array<{
    status: string;
    score_percentage?: number | null;
    class_group_id?: string | null;
  }>;
  classAverages: Map<string, number>;
  cutScore?: number;
  examTitle: string;
  academicTermLabel?: string;
}): ExecutiveKPIsResult {
  const { attempts, classAverages, cutScore = 60, examTitle, academicTermLabel = "2027.1" } = params;

  const totalEnrolled = attempts.length;
  const presentAttempts = attempts.filter((a) => a.status === "finalizada");
  const absentAttempts = attempts.filter((a) => a.status === "ausente");
  const totalPresent = presentAttempts.length;
  const totalAbsent = absentAttempts.length;

  const participationRate = totalEnrolled > 0 ? Number(((totalPresent / totalEnrolled) * 100).toFixed(1)) : 0;

  const presentScores = presentAttempts.map((a) => Number(a.score_percentage || 0));
  const sumScores = presentScores.reduce((acc, v) => acc + v, 0);
  const institutionMeanScore = totalPresent > 0 ? Number((sumScores / totalPresent).toFixed(1)) : 0;

  // Alunos abaixo de 60
  const studentsBelowCutCount = presentScores.filter((s) => s < cutScore).length;
  const studentsBelowCutPercentage = totalPresent > 0 ? Number(((studentsBelowCutCount / totalPresent) * 100).toFixed(1)) : 0;

  // Alunos na Zona de Decisão (51–60%)
  const decisionZoneCount = presentScores.filter((s) => s >= 51 && s <= 60).length;
  const decisionZonePercentage = totalPresent > 0 ? Number(((decisionZoneCount / totalPresent) * 100).toFixed(1)) : 0;

  // Turmas abaixo de 60
  let classesBelowCutCount = 0;
  classAverages.forEach((avg) => {
    if (avg < cutScore) classesBelowCutCount++;
  });

  return {
    institutionMeanScore,
    studentsBelowCutCount,
    studentsBelowCutPercentage,
    participationRate,
    totalEnrolled,
    totalPresent,
    totalAbsent,
    classesBelowCutCount,
    totalClasses: classAverages.size,
    decisionZoneCount,
    decisionZonePercentage,
    footnote: {
      base: `Prova em análise: ${examTitle}`,
      period: `Período Letivo ${academicTermLabel}`,
      source: "MedPleni B2B • Módulo Executivo",
    },
  };
}

/**
 * 2. Calcula o Heatmap Turma × Área com a média final da turma em coluna própria (EX-05)
 */
export function calculateClassGroupAreaHeatmap(params: {
  classGroups: Array<{ id: string; label: string; period: number }>;
  items: Array<{ id: string; area: string; status: string }>;
  answers: Array<{ attemptId: string; itemId: string; isCorrect: boolean }>;
  attempts: Array<{ id: string; classGroupId: string; status: string; scorePercentage: number }>;
}): ClassAreaHeatmapRow[] {
  const { classGroups, items, answers, attempts } = params;

  // Filtra itens válidos
  const validItems = items.filter((it) => it.status !== "anulado");
  const uniqueAreas = Array.from(new Set(validItems.map((it) => it.area))).sort();

  // Mapeia tentativa -> turma
  const attemptToClassMap = new Map<string, string>();
  const classAttemptsMap = new Map<string, Array<{ id: string; scorePercentage: number }>>();

  attempts
    .filter((a) => a.status === "finalizada")
    .forEach((att) => {
      attemptToClassMap.set(att.id, att.classGroupId);
      const list = classAttemptsMap.get(att.classGroupId) || [];
      list.push({ id: att.id, scorePercentage: att.scorePercentage });
      classAttemptsMap.set(att.classGroupId, list);
    });

  // Mapeia item -> area
  const itemToAreaMap = new Map<string, string>();
  validItems.forEach((it) => itemToAreaMap.set(it.id, it.area));

  // Acertos por (turma, area): Map<class_area, { correct: number; total: number }>
  const cellStats = new Map<string, { correct: number; total: number }>();

  answers.forEach((ans) => {
    const classId = attemptToClassMap.get(ans.attemptId);
    const area = itemToAreaMap.get(ans.itemId);
    if (!classId || !area) return;

    const key = `${classId}_${area}`;
    const cur = cellStats.get(key) || { correct: 0, total: 0 };
    cur.total += 1;
    if (ans.isCorrect) cur.correct += 1;
    cellStats.set(key, cur);
  });

  return classGroups
    .map((cg) => {
      const classAttempts = classAttemptsMap.get(cg.id) || [];
      const totalStudents = classAttempts.length;

      // Média final da turma em coluna própria
      const classAverageScore =
        totalStudents > 0
          ? Number((classAttempts.reduce((sum, a) => sum + a.scorePercentage, 0) / totalStudents).toFixed(1))
          : 0;

      const classScoreBand = getScoreBandCategory(classAverageScore);

      const areaCells = uniqueAreas.map((areaName) => {
        const key = `${cg.id}_${areaName}`;
        const st = cellStats.get(key);
        const avg = st && st.total > 0 ? Number(((st.correct / st.total) * 100).toFixed(1)) : 0;
        const qCount = validItems.filter((i) => i.area === areaName).length;

        return {
          areaName,
          averageScore: avg,
          scoreBand: getScoreBandCategory(avg),
          questionsCount: qCount,
        };
      });

      return {
        classGroupId: cg.id,
        classGroupLabel: cg.label,
        period: cg.period,
        totalStudents,
        classAverageScore,
        classScoreBand,
        areas: areaCells,
      };
    })
    .sort((a, b) => a.period - b.period);
}

/**
 * 3. Calcula a Evolução ao Longo das Provas com Aviso de Não Equiparação (EX-07)
 */
export function calculateExamTimelineEvolution(
  examsWithAttempts: Array<{
    examId: string;
    title: string;
    date: string;
    type: string;
    attempts: Array<{ status: string; score_percentage?: number | null }>;
  }>,
  cutScore = 60
): ExamTimelineItem[] {
  return examsWithAttempts
    .map((ex) => {
      const present = ex.attempts.filter((a) => a.status === "finalizada");
      const scores = present.map((a) => Number(a.score_percentage || 0));
      const mean = scores.length > 0 ? Number((scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1)) : 0;
      const belowCut = scores.filter((s) => s < cutScore).length;
      const rateBelow = scores.length > 0 ? Number(((belowCut / scores.length) * 100).toFixed(1)) : 0;

      return {
        examId: ex.examId,
        title: ex.title,
        date: ex.date,
        type: ex.type,
        totalEvaluated: present.length,
        institutionMeanScore: mean,
        rateBelowCut: rateBelow,
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * 4. Calcula os Alertas Padrão (EX-08: Apenas Nota Abaixo de 60)
 */
export function calculateExecutiveAlerts(
  heatmapRows: ClassAreaHeatmapRow[],
  cutScore = 60
): ExecutiveAlertItem[] {
  const alerts: ExecutiveAlertItem[] = [];

  // Turmas com média final abaixo de 60
  heatmapRows.forEach((row) => {
    if (row.classAverageScore > 0 && row.classAverageScore < cutScore) {
      alerts.push({
        id: `alert-class-${row.classGroupId}`,
        title: `Turma com Média Abaixo de ${cutScore}%`,
        description: `A ${row.classGroupLabel} obteve média final de ${row.classAverageScore}%, configurando desempenho crítico abaixo do corte institucional.`,
        severity: "critical",
        classGroupName: row.classGroupLabel,
        value: row.classAverageScore,
      });
    }

    // Áreas específicas da turma abaixo de 50%
    row.areas.forEach((area) => {
      if (area.averageScore > 0 && area.averageScore <= 50) {
        alerts.push({
          id: `alert-class-area-${row.classGroupId}-${area.areaName}`,
          title: `Desempenho Crítico em Área Temática`,
          description: `A ${row.classGroupLabel} obteve apenas ${area.averageScore}% em ${area.areaName}.`,
          severity: "warning",
          classGroupName: row.classGroupLabel,
          areaName: area.areaName,
          value: area.averageScore,
        });
      }
    });
  });

  return alerts;
}

/**
 * 5. Matriz Turmas × Provas (página própria)
 */
export function calculateClassExamsMatrix(params: {
  classGroups: Array<{ id: string; label: string; period: number }>;
  exams: Array<{ id: string; title: string; date: string }>;
  attempts: Array<{ assessmentId: string; classGroupId: string; status: string; scorePercentage: number }>;
}): Array<{
  classGroupId: string;
  classGroupLabel: string;
  period: number;
  examScores: Array<{
    examId: string;
    averageScore: number;
    scoreBand: ScoreBandCategory;
    evaluatedStudents: number;
  }>;
}> {
  const { classGroups, exams, attempts } = params;

  // Index: class_exam -> list of scores
  const scoreLookup = new Map<string, number[]>();

  attempts
    .filter((a) => a.status === "finalizada")
    .forEach((att) => {
      const key = `${att.classGroupId}_${att.assessmentId}`;
      const list = scoreLookup.get(key) || [];
      list.push(att.scorePercentage);
      scoreLookup.set(key, list);
    });

  return classGroups
    .map((cg) => {
      const examScores = exams.map((ex) => {
        const key = `${cg.id}_${ex.id}`;
        const scores = scoreLookup.get(key) || [];
        const avg = scores.length > 0 ? Number((scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1)) : 0;

        return {
          examId: ex.id,
          averageScore: avg,
          scoreBand: getScoreBandCategory(avg),
          evaluatedStudents: scores.length,
        };
      });

      return {
        classGroupId: cg.id,
        classGroupLabel: cg.label,
        period: cg.period,
        examScores,
      };
    })
    .sort((a, b) => a.period - b.period);
}

/**
 * 6. Cobertura da Matriz de Áreas no Período (página própria)
 */
export function calculateMatrixCoverage(
  items: Array<{ area: string; status: string }>,
  inepAreaWeights: Record<string, number> = {
    "Clínica Médica": 20,
    "Cirurgia Geral": 15,
    "Ginecologia e Obstetrícia": 15,
    "Pediatria": 15,
    "Medicina de Família e Comunidade": 15,
    "Saúde Coletiva": 10,
    "Saúde Mental": 10,
  }
): MatrixCoverageItem[] {
  const validItems = items.filter((it) => it.status !== "anulado");
  const totalValid = validItems.length;

  const countByArea = new Map<string, number>();
  validItems.forEach((it) => {
    countByArea.set(it.area, (countByArea.get(it.area) || 0) + 1);
  });

  return Object.entries(inepAreaWeights).map(([areaName, refWeight]) => {
    const qCount = countByArea.get(areaName) || 0;
    const pct = totalValid > 0 ? Number(((qCount / totalValid) * 100).toFixed(1)) : 0;

    let status: "satisfatoria" | "atencao" | "critica" = "satisfatoria";
    if (qCount === 0) {
      status = "critica";
    } else if (pct < refWeight * 0.7) {
      status = "atencao";
    }

    return {
      areaName,
      questionsCount: qCount,
      percentageOfTotal: pct,
      referencePercentage: refWeight,
      status,
    };
  });
}
