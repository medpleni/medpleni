/**
 * MEDPLENI B2B — aluno.ts
 * Funções de domínio para o Portal do Aluno Institucional (AL-01 a AL-05)
 * Conforme ESPEC-B2B seção 4.8 e deliberações do Dr. Filipe.
 *
 * REGRAS CRÍTICAS:
 * - AL-01: "Próximo passo" com o porquê (área de maior oportunidade de ganho).
 * - AL-02: Evolução pessoal vs. média da turma — SEM ranking e SEM posição.
 * - AL-03: Áreas ordenadas por oportunidade de ganho com ação sugerida por linha.
 * - AL-04: Revisão de erros em modo leitura (sem cronômetro, não altera nota).
 * - AL-05: Prática dirigida por eixo e listas atribuídas (contam em user_answers).
 * - AL-06: REPROVADA (não construir plano até a somativa).
 * - AL-07: FORA DA V1 (não construir agenda).
 */

export interface StudentAreaPerformance {
  area: string;
  totalAnswered: number;
  correctCount: number;
  percentage: number; // 0 a 100
  questionsTrained: number;
  status: "critico" | "zona_decisao" | "seguro"; // <51 critico, 51-60 zona_decisao, >=60 seguro
  actionSuggested: string;
}

export interface NextStepRecommendation {
  priorityArea: string;
  currentScore: number;
  gapToTarget: number;
  rationale: string;
  recommendedAction: string;
  urgency: "alta" | "media" | "normal";
}

export interface StudentExamPerformance {
  examId: string;
  examTitle: string;
  date: string;
  studentScore: number;
  classAverage: number;
  isReleased: boolean;
  totalQuestions: number;
  wrongCount: number;
}

export interface EvolutionTimelineResult {
  timeline: Array<{
    examId: string;
    examTitle: string;
    date: string;
    studentScore: number;
    classAverage: number;
    deltaVsClass: number;
  }>;
  overallAverage: number;
  classOverallAverage: number;
  latestScore: number;
  latestDelta: number;
  hasData: boolean;
}

/**
 * 1. Ordena áreas por oportunidade de ganho (menor aproveitamento primeiro) (AL-03)
 * Gera a ação sugerida contextual para cada linha.
 */
export function sortAreasByGainOpportunity(
  areas: Array<{
    area: string;
    totalAnswered: number;
    correctCount: number;
    questionsTrained?: number;
  }>,
  cutScore = 60
): StudentAreaPerformance[] {
  return areas
    .map((item) => {
      const percentage =
        item.totalAnswered > 0
          ? Math.round((item.correctCount / item.totalAnswered) * 1000) / 10
          : 0;

      let status: "critico" | "zona_decisao" | "seguro" = "seguro";
      let actionSuggested = "Manter rotina com revisões periódicas";

      if (percentage < 51) {
        status = "critico";
        actionSuggested = `Praticar lista dirigida de 20 questões para superar a régua ${cutScore}%`;
      } else if (percentage < cutScore) {
        status = "zona_decisao";
        actionSuggested = `Revisar erros da última avaliação e praticar 10 questões do tema`;
      } else if (percentage < 75) {
        status = "seguro";
        actionSuggested = "Consolidar com simulados temáticos";
      }

      return {
        area: item.area,
        totalAnswered: item.totalAnswered,
        correctCount: item.correctCount,
        percentage,
        questionsTrained: item.questionsTrained || 0,
        status,
        actionSuggested,
      };
    })
    .sort((a, b) => a.percentage - b.percentage); // Menor acerto primeiro (maior oportunidade de ganho)
}

/**
 * 2. Próximo passo com o porquê (AL-01)
 * Aponta a área com menor aproveitamento e explica o porquê é o melhor investimento de estudo.
 */
export function calculateNextStepRecommendation(params: {
  areas: StudentAreaPerformance[];
  pendingExamsCount?: number;
  pendingInterventionsCount?: number;
  cutScore?: number;
}): NextStepRecommendation {
  const { areas, pendingExamsCount = 0, pendingInterventionsCount = 0, cutScore = 60 } = params;

  if (areas.length === 0) {
    return {
      priorityArea: "Geral",
      currentScore: 0,
      gapToTarget: cutScore,
      rationale: "Nenhuma avaliação registrada ainda. Realize a avaliação diagnóstica inicial para mapear suas áreas.",
      recommendedAction: "Iniciar avaliação diagnóstica ou praticar lista geral",
      urgency: "normal",
    };
  }

  // A primeira área após ordenação é a de menor aproveitamento
  const weakestArea = areas[0];
  const gap = Math.max(0, Math.round((cutScore - weakestArea.percentage) * 10) / 10);

  let urgency: "alta" | "media" | "normal" = "normal";
  let rationale = "";
  let recommendedAction = "";

  if (weakestArea.percentage < 51) {
    urgency = "alta";
    rationale = `Seu aproveitamento atual em ${weakestArea.area} é de ${weakestArea.percentage}%, abaixo da zona de segurança. Este é o eixo com maior potencial de alavancagem para sua nota geral.`;
    recommendedAction = `Resolver lista dirigida de 20 questões em ${weakestArea.area}`;
  } else if (weakestArea.percentage < cutScore) {
    urgency = "media";
    rationale = `Você está na Zona de Decisão em ${weakestArea.area} (${weakestArea.percentage}%). Faltam apenas ${gap} pontos percentuais para atingir a régua 60.`;
    recommendedAction = `Revisar erros da última avaliação e praticar 10 questões em ${weakestArea.area}`;
  } else {
    urgency = "normal";
    rationale = `Todas as suas áreas estão com aproveitamento acima da régua 60. A área com maior margem de evolução é ${weakestArea.area} (${weakestArea.percentage}%).`;
    recommendedAction = `Consolidar ${weakestArea.area} com prática dirigida de aprofundamento`;
  }

  // Se houver lista de intervenção atribuída pelo professor pendente, prioriza o aviso na recomendação
  if (pendingInterventionsCount > 0) {
    recommendedAction = `Prioridade: concluir lista de exercícios atribuída pelo professor (${pendingInterventionsCount} pendente)`;
  } else if (pendingExamsCount > 0) {
    recommendedAction = `Atenção: você possui ${pendingExamsCount} avaliação aberta agendada para realização`;
  }

  return {
    priorityArea: weakestArea.area,
    currentScore: weakestArea.percentage,
    gapToTarget: gap,
    rationale,
    recommendedAction,
    urgency,
  };
}

/**
 * 3. Evolução Pessoal vs. Média da Turma (AL-02)
 * Ordena em ordem cronológica e compara com a média da turma.
 * GARANTIA: NÃO inclui ranking nem posição.
 */
export function calculateStudentEvolutionTimeline(
  exams: StudentExamPerformance[]
): EvolutionTimelineResult {
  if (!exams || exams.length === 0) {
    return {
      timeline: [],
      overallAverage: 0,
      classOverallAverage: 0,
      latestScore: 0,
      latestDelta: 0,
      hasData: false,
    };
  }

  // Ordena cronologicamente crescente
  const sorted = [...exams].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const timeline = sorted.map((ex) => ({
    examId: ex.examId,
    examTitle: ex.examTitle,
    date: ex.date,
    studentScore: ex.studentScore,
    classAverage: ex.classAverage,
    deltaVsClass: Math.round((ex.studentScore - ex.classAverage) * 10) / 10,
  }));

  const totalStudentScore = timeline.reduce((acc, t) => acc + t.studentScore, 0);
  const totalClassAverage = timeline.reduce((acc, t) => acc + t.classAverage, 0);

  const overallAverage = Math.round((totalStudentScore / timeline.length) * 10) / 10;
  const classOverallAverage = Math.round((totalClassAverage / timeline.length) * 10) / 10;

  const latest = timeline[timeline.length - 1];

  return {
    timeline,
    overallAverage,
    classOverallAverage,
    latestScore: latest.studentScore,
    latestDelta: latest.deltaVsClass,
    hasData: true,
  };
}
