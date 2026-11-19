import { describe, it, expect } from "vitest";
import {
  calculateDocenteDashboard,
  calculateTeacherAdherence,
} from "../docente";

describe("MEDPLENI B2B — Espaço do Docente e Adesão dos Professores (P19 / DO-01 a DO-05 / SPR nº 6)", () => {
  it("1. Objetivo A: Início do Docente em exatamente 4 blocos objetivos e sem fila de revisão na tela", () => {
    const scopedClassGroups = [
      { id: "cg-p7", name: "Turma Medicina P7", period: 7 },
      { id: "cg-p8", name: "Turma Medicina P8", period: 8 },
    ];

    const attempts = [
      {
        assessmentId: "asm-1",
        classGroupId: "cg-p7",
        scorePercentage: 54.0,
        studentUserId: "stu-1",
        submittedAt: "2026-10-20T10:00:00Z",
      },
      {
        assessmentId: "asm-1",
        classGroupId: "cg-p7",
        scorePercentage: 72.0,
        studentUserId: "stu-2",
        submittedAt: "2026-10-20T10:05:00Z",
      },
      {
        assessmentId: "asm-2",
        classGroupId: "cg-p8",
        scorePercentage: 48.0,
        studentUserId: "stu-3",
        submittedAt: "2026-10-22T10:00:00Z",
      },
    ];

    const assessments = [
      { id: "asm-1", title: "Simulado P7", status: "corrigida", startsAt: "2026-10-20T08:00:00Z" },
      { id: "asm-2", title: "Simulado P8", status: "corrigida", startsAt: "2026-10-22T08:00:00Z" },
      { id: "asm-3", title: "Prova Própria Rascunho", status: "rascunho", authorId: "doc-1" },
      { id: "asm-4", title: "Prova Aguardando Revisão", status: "em_revisao", authorId: "doc-1" },
    ];

    const data = calculateDocenteDashboard({
      scopedClassGroups,
      attempts,
      items: [],
      assessments,
      teacherUserId: "doc-1",
      pendingQuestionsReviewCount: 3,
      cutScore: 60,
    });

    // Bloco 1: Minhas turmas
    expect(data.classes).toHaveLength(2);
    expect(data.classes[0].name).toBe("Turma Medicina P7");
    expect(data.classes[0].lastExamAverageScore).toBe(63.0); // (54 + 72) / 2
    expect(data.classes[0].studentsBelowCutCount).toBe(1); // 54 < 60

    // Bloco 2: Onde a turma mais erra
    expect(data.criticalGaps.length).toBeGreaterThan(0);
    expect(data.criticalGaps[0].averageScore).toBeLessThan(60);

    // Bloco 3: Minhas provas
    expect(data.myExams.draftCount).toBe(1);
    expect(data.myExams.awaitingReviewCount).toBe(1);

    // Bloco 4: Questões para revisar (apenas contador, sem fila)
    expect(data.pendingQuestionsToReviewCount).toBe(3);
  });

  it("2. Objetivo B: Indicadores de uso e adesão dos professores (SPR nº 6) com filtros e status de atividade", () => {
    const nowDate = new Date("2026-11-19T10:00:00Z");

    const teachers = [
      {
        userId: "doc-1",
        name: "Dra. Ana Paula",
        email: "ana@fadep.edu.br",
        lastSignInAt: "2026-11-15T08:00:00Z", // Há 4 dias (ativo)
      },
      {
        userId: "doc-2",
        name: "Dr. Carlos Eduardo",
        email: "carlos@fadep.edu.br",
        lastSignInAt: "2026-09-01T08:00:00Z", // Há 79 dias (inativo 30+)
      },
      {
        userId: "doc-3",
        name: "Dr. Fernando Henrique",
        email: "fernando@fadep.edu.br",
        lastSignInAt: null, // Nunca acessou
      },
    ];

    const memberScopes = [
      { userId: "doc-1", classGroupId: "cg-1", classGroupName: "MED P7" },
      { userId: "doc-1", classGroupId: "cg-2", classGroupName: "MED P8" },
      { userId: "doc-2", classGroupId: "cg-3", classGroupName: "MED P9" },
    ];

    const assessments = [
      { id: "asm-1", authorId: "doc-1", status: "publicada" },
      { id: "asm-2", authorId: "doc-1", status: "aplicada" },
      { id: "asm-3", authorId: "doc-2", status: "rascunho" },
    ];

    const questions = [
      { authorId: "doc-1" },
      { authorId: "doc-1" },
      { authorId: "doc-1" },
      { authorId: "doc-2" },
    ];

    const classGroupEnrollmentCounts = new Map<string, number>([
      ["cg-1", 20],
      ["cg-2", 20],
      ["cg-3", 22],
    ]);

    const result = calculateTeacherAdherence({
      teachers,
      memberScopes,
      assessments,
      questions,
      classGroupEnrollmentCounts,
      nowDate,
    });

    expect(result.totalRegistered).toBe(3);
    expect(result.activeInPeriod).toBe(1);
    expect(result.inactiveOver30Days).toBe(1);
    expect(result.neverAccessed).toBe(1);

    // Detalhe doc-1
    const t1 = result.teachers.find((t) => t.userId === "doc-1");
    expect(t1?.activityStatus).toBe("active");
    expect(t1?.assignedClasses).toEqual(["MED P7", "MED P8"]);
    expect(t1?.studentsReachedCount).toBe(40);
    expect(t1?.examsCreatedCount).toBe(2);
    expect(t1?.examsAppliedCount).toBe(1);
    expect(t1?.questionsSubmittedCount).toBe(3);

    // Detalhe doc-3
    const t3 = result.teachers.find((t) => t.userId === "doc-3");
    expect(t3?.activityStatus).toBe("never_accessed");
  });
});
