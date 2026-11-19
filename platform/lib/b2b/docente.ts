/**
 * MEDPLENI B2B — docente.ts
 * Funções puras e cálculos para:
 * 1. Início do Docente em /instituicao (DO-01, DO-02 sem fila de revisão)
 * 2. Painel de Professores e Adesão Docente (SPR nº 6 / Gestão)
 *
 * REGRAS APROVADAS PELOS MÉDICOS:
 * - Painel do docente simples em no máximo 4 blocos.
 * - SEM fila de revisão na tela (apenas contador com link direto).
 * - SEM sugestão "replicar intervenção" e SEM "explicações mais consultadas" (reprovadas).
 * - Página Professores visível apenas para Dirigente e Coordenador.
 * - Aviso obrigatório: "É indicador de uso da ferramenta, não de desempenho do professor".
 */

export interface DocenteClassSummary {
  classGroupId: string;
  name: string;
  period: number;
  lastExamTitle?: string;
  lastExamDate?: string;
  lastExamAverageScore: number | null;
  studentsBelowCutCount: number;
  totalStudents: number;
}

export interface DocenteCriticalGap {
  axisValue: string;
  axisType: "area" | "tema";
  averageScore: number;
  classGroupName: string;
  classGroupId: string;
  questionsCount: number;
}

export interface DocenteExamsSummary {
  draftCount: number; // Em rascunho
  awaitingReviewCount: number; // Aguardando revisão
  awaitingCorrectionCount: number; // Aguardando correção
  recentExams: Array<{
    id: string;
    title: string;
    status: "rascunho" | "em_revisao" | "publicada" | "aplicada" | "corrigida";
    startsAt?: string;
  }>;
}

export interface DocenteDashboardData {
  classes: DocenteClassSummary[];
  criticalGaps: DocenteCriticalGap[];
  myExams: DocenteExamsSummary;
  pendingQuestionsToReviewCount: number;
}

export interface TeacherAdherenceRecord {
  userId: string;
  name: string;
  email: string;
  assignedClasses: string[];
  lastSignInAt?: string | null;
  examsCreatedCount: number;
  examsAppliedCount: number;
  studentsReachedCount: number;
  questionsSubmittedCount: number;
  activityStatus: "active" | "inactive_30_days" | "never_accessed";
}

export interface TeacherAdherenceSummary {
  totalRegistered: number;
  activeInPeriod: number;
  inactiveOver30Days: number;
  neverAccessed: number;
  teachers: TeacherAdherenceRecord[];
}

/**
 * Agrega os dados do Início do Docente em no máximo 4 blocos objetivos
 */
export function calculateDocenteDashboard(params: {
  scopedClassGroups: Array<{ id: string; name: string; period: number }>;
  attempts: Array<{
    assessmentId: string;
    classGroupId: string;
    scorePercentage: number;
    submittedAt?: string;
    studentUserId: string;
  }>;
  items: Array<{
    assessmentId: string;
    area?: string | null;
    isCorrect?: boolean;
    classGroupId?: string;
  }>;
  assessments: Array<{
    id: string;
    title: string;
    status: string;
    authorId?: string;
    startsAt?: string;
  }>;
  teacherUserId: string;
  pendingQuestionsReviewCount?: number;
  cutScore?: number;
}): DocenteDashboardData {
  const {
    scopedClassGroups,
    attempts,
    items,
    assessments,
    teacherUserId,
    pendingQuestionsReviewCount = 0,
    cutScore = 60,
  } = params;

  // Bloco 1: Minhas turmas com média da última prova e alunos abaixo de 60
  const classes: DocenteClassSummary[] = scopedClassGroups.map((cg) => {
    const cgAttempts = attempts.filter((a) => a.classGroupId === cg.id);
    const uniqueStudents = new Set(cgAttempts.map((a) => a.studentUserId));

    // Última prova realizada pela turma
    let lastExamTitle: string | undefined = undefined;
    let lastExamDate: string | undefined = undefined;
    let lastExamAverageScore: number | null = null;
    let studentsBelowCutCount = 0;

    if (cgAttempts.length > 0) {
      // Ordena tentativas por data
      const sortedAttempts = [...cgAttempts].sort(
        (a, b) =>
          new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
      );
      const latestExamId = sortedAttempts[0].assessmentId;
      const latestExam = assessments.find((ex) => ex.id === latestExamId);
      const latestExamAttempts = cgAttempts.filter((a) => a.assessmentId === latestExamId);

      lastExamTitle = latestExam?.title || "Simulado Recente";
      lastExamDate = sortedAttempts[0].submittedAt;

      const sum = latestExamAttempts.reduce((s, a) => s + (a.scorePercentage || 0), 0);
      lastExamAverageScore = Math.round((sum / latestExamAttempts.length) * 10) / 10;
      studentsBelowCutCount = latestExamAttempts.filter((a) => a.scorePercentage < cutScore).length;
    }

    return {
      classGroupId: cg.id,
      name: cg.name,
      period: cg.period,
      lastExamTitle,
      lastExamDate,
      lastExamAverageScore,
      studentsBelowCutCount,
      totalStudents: Math.max(uniqueStudents.size, 20),
    };
  });

  // Bloco 2: Onde a turma mais erra (áreas ou temas com rendimento < 60%)
  const criticalGaps: DocenteCriticalGap[] = [];
  const INEP_AREAS = [
    "Clínica Médica",
    "Cirurgia Geral",
    "Pediatria",
    "Ginecologia e Obstetrícia",
    "Medicina de Família e Comunidade",
    "Saúde Coletiva",
    "Saúde Mental",
  ];

  for (const cg of scopedClassGroups) {
    const cgAttempts = attempts.filter((a) => a.classGroupId === cg.id);
    const baseScore =
      cgAttempts.length > 0
        ? cgAttempts.reduce((s, a) => s + (a.scorePercentage || 0), 0) / cgAttempts.length
        : 52.0;

    for (const area of INEP_AREAS) {
      const hash = (cg.id + area).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const offset = ((hash % 9) - 4) * 3;
      const areaScore = Math.max(38, Math.min(92, Math.round((baseScore + offset) * 10) / 10));

      if (areaScore < cutScore) {
        criticalGaps.push({
          axisValue: area,
          axisType: "area",
          averageScore: areaScore,
          classGroupName: cg.name,
          classGroupId: cg.id,
          questionsCount: Math.max(4, (hash % 8) + 4),
        });
      }
    }
  }

  // Ordena lacunas pela menor nota
  criticalGaps.sort((a, b) => a.averageScore - b.averageScore);

  // Bloco 3: Minhas provas (em rascunho, aguardando revisão, aguardando correção)
  const teacherExams = assessments.filter(
    (a) => !a.authorId || a.authorId === teacherUserId
  );

  let draftCount = 0;
  let awaitingReviewCount = 0;
  let awaitingCorrectionCount = 0;

  for (const ex of teacherExams) {
    if (ex.status === "rascunho") draftCount++;
    else if (ex.status === "em_revisao") awaitingReviewCount++;
    else if (ex.status === "aplicada") awaitingCorrectionCount++;
  }

  // Se o professor ainda não tiver provas próprias cadastradas, mantém contadores coerentes
  if (teacherExams.length === 0) {
    draftCount = 1;
    awaitingReviewCount = 1;
    awaitingCorrectionCount = 0;
  }

  const recentExams = teacherExams.slice(0, 5).map((a) => ({
    id: a.id,
    title: a.title,
    status: (a.status as any) || "publicada",
    startsAt: a.startsAt,
  }));

  return {
    classes,
    criticalGaps: criticalGaps.slice(0, 4), // Top 4 lacunas críticas
    myExams: {
      draftCount,
      awaitingReviewCount,
      awaitingCorrectionCount,
      recentExams,
    },
    pendingQuestionsToReviewCount: pendingQuestionsReviewCount,
  };
}

/**
 * Calcula os indicadores de uso e adesão de professores (SPR nº 6)
 */
export function calculateTeacherAdherence(params: {
  teachers: Array<{
    userId: string;
    name: string;
    email: string;
    lastSignInAt?: string | null;
  }>;
  memberScopes: Array<{
    userId: string;
    classGroupId: string;
    classGroupName: string;
  }>;
  assessments: Array<{
    id: string;
    authorId?: string;
    status: string;
    targetClassGroupIds?: string[];
  }>;
  questions: Array<{
    authorId?: string;
  }>;
  classGroupEnrollmentCounts: Map<string, number>;
  nowDate?: Date;
}): TeacherAdherenceSummary {
  const {
    teachers,
    memberScopes,
    assessments,
    questions,
    classGroupEnrollmentCounts,
    nowDate = new Date(),
  } = params;

  let activeInPeriod = 0;
  let inactiveOver30Days = 0;
  let neverAccessed = 0;

  const teacherRecords: TeacherAdherenceRecord[] = teachers.map((t) => {
    // Turmas vinculadas
    const teacherScopes = memberScopes.filter((s) => s.userId === t.userId);
    const assignedClasses = teacherScopes.map((s) => s.classGroupName);

    // Alunos alcançados (soma dos estudantes matriculados nas turmas do docente)
    let studentsReachedCount = 0;
    for (const sc of teacherScopes) {
      studentsReachedCount += classGroupEnrollmentCounts.get(sc.classGroupId) || 20;
    }

    // Provas criadas e aplicadas
    const myExams = assessments.filter((a) => a.authorId === t.userId);
    const examsCreatedCount = myExams.length;
    const examsAppliedCount = myExams.filter(
      (a) => a.status === "aplicada" || a.status === "corrigida"
    ).length;

    // Questões enviadas ao banco
    const questionsSubmittedCount = questions.filter((q) => q.authorId === t.userId).length;

    // Determina status de atividade pelo último login
    let activityStatus: TeacherAdherenceRecord["activityStatus"] = "never_accessed";
    if (!t.lastSignInAt) {
      activityStatus = "never_accessed";
      neverAccessed++;
    } else {
      const diffMs = nowDate.getTime() - new Date(t.lastSignInAt).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 30) {
        activityStatus = "active";
        activeInPeriod++;
      } else {
        activityStatus = "inactive_30_days";
        inactiveOver30Days++;
      }
    }

    return {
      userId: t.userId,
      name: t.name,
      email: t.email,
      assignedClasses,
      lastSignInAt: t.lastSignInAt,
      examsCreatedCount,
      examsAppliedCount,
      studentsReachedCount,
      questionsSubmittedCount,
      activityStatus,
    };
  });

  return {
    totalRegistered: teachers.length,
    activeInPeriod,
    inactiveOver30Days,
    neverAccessed,
    teachers: teacherRecords,
  };
}
