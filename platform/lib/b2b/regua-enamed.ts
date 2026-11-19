/**
 * MEDPLENI B2B — Processamento da Régua ENAMED em 3 Etapas (P23 / RE-01 e RE-02)
 * 
 * Regras Permanentes:
 * - O corte vem sempre da configuração da instituição (padrão cut_score = 60).
 * - Zona de decisão: [51, cut_score].
 * - Não usa o termo "nota ENAMED"; usa "Aproveitamento médio (%)" ou "Percentual de acerto".
 * - Sem predições inventadas e sem o aviso "não fazemos predição" (RE-03 reprovada).
 * - Sem a palavra "programática", sem "Tutor", sem emojis na interface.
 * - Toda etapa traz Base / Período / Fonte padronizados.
 */

import { REGUA_ENAMED_CONTENT, RegulatoryMilestoneContent } from "./regua-enamed-content";

export interface ReguaClassGroupSummary {
  id: string;
  name: string;
  period: number;
  studentsCount: number;
  averageScorePercentage: number;
  studentsBelowCutScore: number;
  studentsInDecisionZone: number;
}

export interface ReguaAssessmentSummary {
  id: string;
  title: string;
  type: string;
  examDate: string;
  modality: string;
  participantsCount: number;
  averageScorePercentage: number;
  status: string;
}

export interface ReguaInterventionSummary {
  id: string;
  title: string;
  actionType: "exercise_list" | "pre_post_lecture";
  classGroupName: string;
  targetCount: number;
  completedCount: number;
  adherencePercentage: number;
  status: string;
}

export interface ReguaStageData {
  stage: 1 | 2 | 3;
  periodTarget: 4 | 8 | 12;
  regulatory: RegulatoryMilestoneContent;
  periodsIncluded: number[];
  classes: ReguaClassGroupSummary[];
  totalStudentsEnrolled: number;
  studentsEvaluatedCount: number;
  overallAveragePercentage: number;
  totalStudentsBelowCutScore: number;
  totalStudentsInDecisionZone: number;
  assessments: ReguaAssessmentSummary[];
  totalAssessmentsCount: number;
  interventions: ReguaInterventionSummary[];
  activeInterventionsCount: number;
  hasSpecialNotice: boolean;
  specialNoticeText?: string;
  footerMetadata: {
    baseText: string;
    periodText: string;
    sourceText: string;
  };
}

export interface ReguaEnamedOverview {
  institutionId: string;
  institutionName: string;
  cutScore: number;
  stages: Record<1 | 2 | 3, ReguaStageData>;
  generatedAt: string;
}

export interface RawAssessmentInput {
  id: string;
  title: string;
  type: string;
  examDate: string;
  modality: string;
  classGroupId?: string | null;
  status?: string;
}

export interface RawAttemptInput {
  assessmentId: string;
  studentUserId: string;
  scorePercentage: number | null;
  status: string;
}

export interface RawClassGroupInput {
  id: string;
  name: string;
  period: number;
  studentsCount?: number;
}

export interface RawInterventionInput {
  id: string;
  title: string;
  actionType: "exercise_list" | "pre_post_lecture";
  classGroupId?: string | null;
  classGroupName?: string;
  targetCount?: number;
  completedCount?: number;
  status?: string;
}

export interface RawStudentScoreInput {
  studentUserId: string;
  classGroupId: string;
  averageScorePercentage: number;
}

/**
 * Mapeia os períodos que compõem a preparação para cada um dos 3 marcos
 */
export function getPeriodsForStage(stage: 1 | 2 | 3): number[] {
  switch (stage) {
    case 1:
      return [1, 2, 3, 4];
    case 2:
      return [5, 6, 7, 8];
    case 3:
      return [9, 10, 11, 12];
  }
}

/**
 * Processa os dados brutos da instituição e calcula a visão da Régua ENAMED para as 3 etapas
 */
export function computeReguaEnamedOverview(params: {
  institutionId: string;
  institutionName: string;
  cutScore?: number;
  classes: RawClassGroupInput[];
  assessments: RawAssessmentInput[];
  attempts: RawAttemptInput[];
  studentScores?: RawStudentScoreInput[];
  interventions?: RawInterventionInput[];
  academicPeriodLabel?: string;
}): ReguaEnamedOverview {
  const cutScore = typeof params.cutScore === "number" ? params.cutScore : 60;
  const periodLabel = params.academicPeriodLabel || "2026.1";

  // Mapeia turmas por id
  const classMap = new Map<string, RawClassGroupInput>();
  params.classes.forEach((cg) => classMap.set(cg.id, cg));

  const stagesResult: Record<1 | 2 | 3, ReguaStageData> = {
    1: buildStageData(1, 4, params, cutScore, periodLabel, classMap),
    2: buildStageData(2, 8, params, cutScore, periodLabel, classMap),
    3: buildStageData(3, 12, params, cutScore, periodLabel, classMap),
  };

  return {
    institutionId: params.institutionId,
    institutionName: params.institutionName,
    cutScore,
    stages: stagesResult,
    generatedAt: new Date().toISOString(),
  };
}

function buildStageData(
  stage: 1 | 2 | 3,
  periodTarget: 4 | 8 | 12,
  params: {
    classes: RawClassGroupInput[];
    assessments: RawAssessmentInput[];
    attempts: RawAttemptInput[];
    studentScores?: RawStudentScoreInput[];
    interventions?: RawInterventionInput[];
  },
  cutScore: number,
  periodLabel: string,
  classMap: Map<string, RawClassGroupInput>
): ReguaStageData {
  const stagePeriods = getPeriodsForStage(stage);
  const regulatory = REGUA_ENAMED_CONTENT.stages[stage];

  // 1. Turmas nesta etapa
  const stageClassesRaw = params.classes.filter((c) => stagePeriods.includes(c.period));

  // 2. Simulados e provas vinculados a esta etapa
  const stageAssessmentsRaw = params.assessments.filter((a) => {
    // Verificação por tipo explícito de simulado
    if (stage === 1 && a.type === "simulado_enamed_4") return true;
    if (stage === 2 && a.type === "simulado_enamed_8") return true;
    if (stage === 3 && a.type === "simulado_enamed_12") return true;

    // Ou por vinculação à turma da etapa
    if (a.classGroupId) {
      const cls = classMap.get(a.classGroupId);
      if (cls && stagePeriods.includes(cls.period)) {
        return true;
      }
    }
    return false;
  });

  // Monta resumo de cada avaliação
  const stageAssessmentSummaries: ReguaAssessmentSummary[] = stageAssessmentsRaw.map((a) => {
    const validAttempts = params.attempts.filter(
      (att) => att.assessmentId === a.id && att.status === "finalizada" && att.scorePercentage !== null
    );
    const count = validAttempts.length;
    const avg =
      count > 0
        ? Number((validAttempts.reduce((sum, att) => sum + (att.scorePercentage || 0), 0) / count).toFixed(1))
        : 0;

    return {
      id: a.id,
      title: a.title,
      type: a.type,
      examDate: a.examDate,
      modality: a.modality,
      participantsCount: count,
      averageScorePercentage: avg,
      status: a.status || "finalizada",
    };
  });

  // 3. Processa notas dos estudantes da etapa
  const stageClassSummaries: ReguaClassGroupSummary[] = stageClassesRaw.map((cls) => {
    const classStudents = (params.studentScores || []).filter((s) => s.classGroupId === cls.id);
    const count = classStudents.length > 0 ? classStudents.length : cls.studentsCount || 0;

    let avg = 0;
    let belowCut = 0;
    let decisionZone = 0;

    if (classStudents.length > 0) {
      const totalScore = classStudents.reduce((sum, s) => sum + s.averageScorePercentage, 0);
      avg = Number((totalScore / classStudents.length).toFixed(1));
      belowCut = classStudents.filter((s) => s.averageScorePercentage < cutScore).length;
      decisionZone = classStudents.filter(
        (s) => s.averageScorePercentage >= 51 && s.averageScorePercentage <= cutScore
      ).length;
    }

    return {
      id: cls.id,
      name: cls.name,
      period: cls.period,
      studentsCount: count,
      averageScorePercentage: avg,
      studentsBelowCutScore: belowCut,
      studentsInDecisionZone: decisionZone,
    };
  });

  // 4. Intervenções em curso na etapa
  const stageClassIds = new Set(stageClassesRaw.map((c) => c.id));
  const stageInterventionsRaw = (params.interventions || []).filter(
    (inv) => inv.classGroupId && stageClassIds.has(inv.classGroupId)
  );

  const stageInterventions: ReguaInterventionSummary[] = stageInterventionsRaw.map((inv) => {
    const target = inv.targetCount || 0;
    const completed = inv.completedCount || 0;
    const adherence = target > 0 ? Number(((completed / target) * 100).toFixed(1)) : 0;
    const cls = inv.classGroupId ? classMap.get(inv.classGroupId) : null;

    return {
      id: inv.id,
      title: inv.title,
      actionType: inv.actionType,
      classGroupName: inv.classGroupName || cls?.name || "Turma da Etapa",
      targetCount: target,
      completedCount: completed,
      adherencePercentage: adherence,
      status: inv.status || "em_andamento",
    };
  });

  // Totais da etapa
  const totalStudentsEnrolled = stageClassSummaries.reduce((sum, c) => sum + c.studentsCount, 0);
  const allStageStudentScores = (params.studentScores || []).filter((s) => stageClassIds.has(s.classGroupId));
  const studentsEvaluatedCount = allStageStudentScores.length;

  const overallAveragePercentage =
    studentsEvaluatedCount > 0
      ? Number(
          (
            allStageStudentScores.reduce((sum, s) => sum + s.averageScorePercentage, 0) / studentsEvaluatedCount
          ).toFixed(1)
        )
      : stageClassSummaries.length > 0 && stageClassSummaries.some((c) => c.averageScorePercentage > 0)
      ? Number(
          (
            stageClassSummaries.reduce((sum, c) => sum + c.averageScorePercentage, 0) /
            stageClassSummaries.filter((c) => c.averageScorePercentage > 0).length
          ).toFixed(1)
        )
      : 0;

  const totalStudentsBelowCutScore = stageClassSummaries.reduce((sum, c) => sum + c.studentsBelowCutScore, 0);
  const totalStudentsInDecisionZone = stageClassSummaries.reduce((sum, c) => sum + c.studentsInDecisionZone, 0);

  return {
    stage,
    periodTarget,
    regulatory,
    periodsIncluded: stagePeriods,
    classes: stageClassSummaries,
    totalStudentsEnrolled,
    studentsEvaluatedCount,
    overallAveragePercentage,
    totalStudentsBelowCutScore,
    totalStudentsInDecisionZone,
    assessments: stageAssessmentSummaries,
    totalAssessmentsCount: stageAssessmentSummaries.length,
    interventions: stageInterventions,
    activeInterventionsCount: stageInterventions.filter((i) => i.status === "em_andamento").length,
    hasSpecialNotice: stage === 1,
    specialNoticeText: stage === 1 ? regulatory.matrixNotice : undefined,
    footerMetadata: {
      baseText: `Base: ${studentsEvaluatedCount > 0 ? studentsEvaluatedCount : totalStudentsEnrolled} estudantes acompanhados (${stageClassSummaries.length} turmas)`,
      periodText: `Período: ${periodLabel}`,
      sourceText: "Fonte: Provas, simulados aplicados e intervenções pedagógicas ativas",
    },
  };
}
