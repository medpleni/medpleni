/**
 * MEDPLENI B2B — class-groups.ts
 * Funções puras e cálculos para Gestão de Turmas e Dispersão (TC-01 a TC-08)
 *
 * 1. Resumo e métricas da lista de turmas (TC-01)
 * 2. Rendimento por Área e Cenário agregado (TC-02, TC-03)
 * 3. Gráfico de dispersão com 4 quadrantes, mediana de X e linha de corte 60 (TC-03, TC-08)
 * 4. Trajetória longitudinal e dispersão individual do aluno (TC-06)
 * 5. Provas da turma com total geral institucional (TC-07)
 */

export interface ClassGroupSummaryItem {
  id: string;
  code?: string;
  label: string;
  period: number;
  totalStudents: number;
  participationRate: number;
  averageScore: number;
  trend: "up" | "down" | "stable";
  studentsBelowCutCount: number;
  studentsInDecisionZoneCount: number;
}

export interface AreaScenarioAggregation {
  name: string;
  type: "area" | "cenario";
  averageScore: number;
  questionsCount: number;
  status: "abaixo_60" | "zona_decisao" | "adequado" | "excelente";
}

export interface ScatterStudentPoint {
  studentUserId: string;
  studentName: string;
  registration: string;
  averageScore: number | null; // Y
  questionsCount: number; // X1 (treino B2C)
  examsCount: number; // X2 (simulados B2B)
  isInDecisionZone: boolean; // 51 a 60
  quadrant?: "treina_performa" | "pouco_treino_performa" | "treina_nao_sobe" | "pouco_treino_abaixo";
}

export interface ScatterPlotResult {
  xMetric: "questions" | "exams";
  cutScore: number;
  xMedian: number;
  plottedStudents: ScatterStudentPoint[];
  unplottedStudentsCount: number; // Alunos sem nota (ausentes/sem prova)
  quadrantCounts: {
    treina_performa: number;
    pouco_treino_performa: number;
    treina_nao_sobe: number;
    pouco_treino_abaixo: number;
  };
}

export interface StudentExamHistoryPoint {
  examId: string;
  examTitle: string;
  date: string;
  studentScore: number;
  classAverageScore: number;
  questionsTrainedUntilDate: number;
}

export interface StudentProfileData {
  studentUserId: string;
  studentName: string;
  registration: string;
  classGroupLabel: string;
  period: number;
  overallScore: number;
  totalQuestionsTrained: number;
  totalExamsTaken: number;
  hasB2CTraining: boolean; // Se false, mostra aviso que não usa treino
  areaPerformance: Array<{
    areaName: string;
    studentScore: number;
    classAverageScore: number;
  }>;
  examTrajectory: StudentExamHistoryPoint[];
}

/**
 * 1. Calcula a lista de turmas com índice, participação, tendência e alunos abaixo de 60 (TC-01)
 */
export function calculateClassGroupsList(params: {
  classGroups: Array<{ id: string; label: string; period: number }>;
  enrollments: Array<{ classGroupId: string; studentUserId: string; status: string }>;
  attempts: Array<{
    assessmentId: string;
    classGroupId: string;
    studentUserId: string;
    status: string;
    scorePercentage?: number | null;
    examDate?: string;
  }>;
  cutScore?: number;
}): ClassGroupSummaryItem[] {
  const { classGroups, enrollments, attempts, cutScore = 60 } = params;

  return classGroups
    .map((cg) => {
      const activeEnrollments = enrollments.filter(
        (e) => e.classGroupId === cg.id && e.status === "active"
      );
      const totalStudents = activeEnrollments.length;

      const classAttempts = attempts.filter((a) => a.classGroupId === cg.id);
      const finishedAttempts = classAttempts.filter((a) => a.status === "finalizada" || a.status === "corrigida");
      const absentAttempts = classAttempts.filter((a) => a.status === "ausente");
      const totalFinished = finishedAttempts.length;

      const participationRate =
        totalFinished + absentAttempts.length > 0
          ? Number(((totalFinished / (totalFinished + absentAttempts.length)) * 100).toFixed(1))
          : 0;

      // Média dos estudantes com prova finalizada
      const scores = finishedAttempts
        .map((a) => (a.scorePercentage !== null && a.scorePercentage !== undefined ? Number(a.scorePercentage) : null))
        .filter((s): s is number => s !== null);

      const averageScore =
        scores.length > 0
          ? Number((scores.reduce((sum, v) => sum + v, 0) / scores.length).toFixed(1))
          : 0;

      // Alunos com média individual abaixo de 60
      const studentAverages = new Map<string, number[]>();
      finishedAttempts.forEach((att) => {
        if (att.scorePercentage !== null && att.scorePercentage !== undefined) {
          const list = studentAverages.get(att.studentUserId) || [];
          list.push(Number(att.scorePercentage));
          studentAverages.set(att.studentUserId, list);
        }
      });

      let studentsBelowCutCount = 0;
      let studentsInDecisionZoneCount = 0;

      studentAverages.forEach((studentScores) => {
        const studentAvg = studentScores.reduce((s, v) => s + v, 0) / studentScores.length;
        if (studentAvg < cutScore) {
          studentsBelowCutCount++;
        }
        if (studentAvg >= 51 && studentAvg <= 60) {
          studentsInDecisionZoneCount++;
        }
      });

      // Tendência baseada na data das provas
      // Ordena exames da turma cronologicamente
      const examsChronological = Array.from(
        new Set(classAttempts.map((a) => a.assessmentId))
      ).map((examId) => {
        const examAtt = finishedAttempts.filter((a) => a.assessmentId === examId);
        const examAvg =
          examAtt.length > 0
            ? examAtt.reduce((sum, a) => sum + Number(a.scorePercentage || 0), 0) / examAtt.length
            : 0;
        const examDate = examAtt[0]?.examDate || "2026-01-01";
        return { examId, examAvg, examDate };
      }).sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());

      let trend: "up" | "down" | "stable" = "stable";
      if (examsChronological.length >= 2) {
        const lastExam = examsChronological[examsChronological.length - 1];
        const prevExam = examsChronological[examsChronological.length - 2];
        const diff = lastExam.examAvg - prevExam.examAvg;
        if (diff >= 2.0) trend = "up";
        else if (diff <= -2.0) trend = "down";
      }

      return {
        id: cg.id,
        label: cg.label,
        period: cg.period,
        totalStudents,
        participationRate,
        averageScore,
        trend,
        studentsBelowCutCount,
        studentsInDecisionZoneCount,
      };
    })
    .sort((a, b) => a.period - b.period);
}

/**
 * 2. Rendimento por Área e por Cenário agregado para a turma (TC-02, TC-03)
 */
export function calculateClassAggregatedAreasAndScenarios(params: {
  items: Array<{
    id: string;
    area: string;
    cenario?: string | null;
    status: string;
  }>;
  answers: Array<{
    attemptId: string;
    itemId: string;
    isCorrect: boolean;
  }>;
  classAttemptIds: string[];
  cutScore?: number;
}): {
  areas: AreaScenarioAggregation[];
  scenarios: AreaScenarioAggregation[];
} {
  const { items, answers, classAttemptIds, cutScore = 60 } = params;

  const validItems = items.filter((it) => it.status !== "anulado");
  const classAttemptSet = new Set(classAttemptIds);

  const itemMap = new Map<string, { area: string; cenario?: string | null }>();
  validItems.forEach((it) => itemMap.set(it.id, { area: it.area, cenario: it.cenario }));

  const areaStats = new Map<string, { correct: number; total: number; questions: Set<string> }>();
  const scenarioStats = new Map<string, { correct: number; total: number; questions: Set<string> }>();

  answers.forEach((ans) => {
    if (!classAttemptSet.has(ans.attemptId)) return;
    const it = itemMap.get(ans.itemId);
    if (!it) return;

    // Área
    const aCur = areaStats.get(it.area) || { correct: 0, total: 0, questions: new Set() };
    aCur.total += 1;
    aCur.questions.add(ans.itemId);
    if (ans.isCorrect) aCur.correct += 1;
    areaStats.set(it.area, aCur);

    // Cenário (quando preenchido)
    if (it.cenario) {
      const sCur = scenarioStats.get(it.cenario) || { correct: 0, total: 0, questions: new Set() };
      sCur.total += 1;
      sCur.questions.add(ans.itemId);
      if (ans.isCorrect) sCur.correct += 1;
      scenarioStats.set(it.cenario, sCur);
    }
  });

  function getStatus(score: number): "abaixo_60" | "zona_decisao" | "adequado" | "excelente" {
    if (score < 51) return "abaixo_60";
    if (score <= cutScore) return "zona_decisao";
    if (score <= 70) return "adequado";
    return "excelente";
  }

  const areas: AreaScenarioAggregation[] = Array.from(areaStats.entries())
    .map(([name, stat]) => {
      const avg = stat.total > 0 ? Number(((stat.correct / stat.total) * 100).toFixed(1)) : 0;
      return {
        name,
        type: "area" as const,
        averageScore: avg,
        questionsCount: stat.questions.size,
        status: getStatus(avg),
      };
    })
    .sort((a, b) => b.averageScore - a.averageScore);

  const scenarios: AreaScenarioAggregation[] = Array.from(scenarioStats.entries())
    .map(([name, stat]) => {
      const avg = stat.total > 0 ? Number(((stat.correct / stat.total) * 100).toFixed(1)) : 0;
      return {
        name,
        type: "cenario" as const,
        averageScore: avg,
        questionsCount: stat.questions.size,
        status: getStatus(avg),
      };
    })
    .sort((a, b) => b.averageScore - a.averageScore);

  return { areas, scenarios };
}

/**
 * 3. Gráfico de Dispersão com 4 Quadrantes, Mediana de X e Linha de Corte 60 (TC-03, TC-08)
 */
export function calculateScatterPlotData(params: {
  students: Array<{
    studentUserId: string;
    studentName: string;
    registration: string;
    averageScore: number | null; // NULL se aluno sem nota
    questionsTrained: number; // user_answers B2C
    examsTaken: number; // attempts B2B
  }>;
  xMetric: "questions" | "exams";
  cutScore?: number;
}): ScatterPlotResult {
  const { students, xMetric, cutScore = 60 } = params;

  // Alunos plotados: aqueles que possuem nota média válida
  const plottedRaw = students.filter((s) => s.averageScore !== null && s.averageScore !== undefined);
  const unplottedStudentsCount = students.length - plottedRaw.length;

  if (plottedRaw.length === 0) {
    return {
      xMetric,
      cutScore,
      xMedian: 0,
      plottedStudents: [],
      unplottedStudentsCount,
      quadrantCounts: {
        treina_performa: 0,
        pouco_treino_performa: 0,
        treina_nao_sobe: 0,
        pouco_treino_abaixo: 0,
      },
    };
  }

  // Calcula a mediana de X para a linha vertical divisora
  const xValues = plottedRaw
    .map((s) => (xMetric === "questions" ? s.questionsTrained : s.examsTaken))
    .sort((a, b) => a - b);

  const mid = Math.floor(xValues.length / 2);
  const xMedian =
    xValues.length % 2 !== 0
      ? xValues[mid]
      : Number(((xValues[mid - 1] + xValues[mid]) / 2).toFixed(1));

  const quadrantCounts = {
    treina_performa: 0,
    pouco_treino_performa: 0,
    treina_nao_sobe: 0,
    pouco_treino_abaixo: 0,
  };

  const plottedStudents: ScatterStudentPoint[] = plottedRaw.map((s) => {
    const xVal = xMetric === "questions" ? s.questionsTrained : s.examsTaken;
    const yVal = s.averageScore as number;

    const isInDecisionZone = yVal >= 51 && yVal <= cutScore;

    let quadrant: "treina_performa" | "pouco_treino_performa" | "treina_nao_sobe" | "pouco_treino_abaixo";

    if (xVal >= xMedian && yVal >= cutScore) {
      quadrant = "treina_performa";
      quadrantCounts.treina_performa++;
    } else if (xVal < xMedian && yVal >= cutScore) {
      quadrant = "pouco_treino_performa";
      quadrantCounts.pouco_treino_performa++;
    } else if (xVal >= xMedian && yVal < cutScore) {
      quadrant = "treina_nao_sobe";
      quadrantCounts.treina_nao_sobe++;
    } else {
      quadrant = "pouco_treino_abaixo";
      quadrantCounts.pouco_treino_abaixo++;
    }

    return {
      studentUserId: s.studentUserId,
      studentName: s.studentName,
      registration: s.registration,
      averageScore: yVal,
      questionsCount: s.questionsTrained,
      examsCount: s.examsTaken,
      isInDecisionZone,
      quadrant,
    };
  });

  return {
    xMetric,
    cutScore,
    xMedian,
    plottedStudents,
    unplottedStudentsCount,
    quadrantCounts,
  };
}

/**
 * 4. Trajetória Longitudinal e Dispersão Individual do Aluno (TC-06)
 */
export function calculateStudentTrajectory(params: {
  studentUserId: string;
  studentAttempts: Array<{
    assessmentId: string;
    title: string;
    date: string;
    scorePercentage?: number | null;
  }>;
  classExamAverages: Map<string, number>; // examId -> média da turma
  userAnswersCountUntilDate?: Map<string, number>; // examId -> questões respondidas até aquela prova
}): StudentExamHistoryPoint[] {
  const { studentAttempts, classExamAverages, userAnswersCountUntilDate } = params;

  return studentAttempts
    .filter((a) => a.scorePercentage !== null && a.scorePercentage !== undefined)
    .map((a) => {
      const studentScore = Number(a.scorePercentage);
      const classAvg = classExamAverages.get(a.assessmentId) || 60;
      const questionsTrained = userAnswersCountUntilDate?.get(a.assessmentId) || 0;

      return {
        examId: a.assessmentId,
        examTitle: a.title,
        date: a.date,
        studentScore,
        classAverageScore: classAvg,
        questionsTrainedUntilDate: questionsTrained,
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
