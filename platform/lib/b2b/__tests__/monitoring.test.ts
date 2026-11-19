import { describe, it, expect } from "vitest";
import {
  calculateAttentionList,
  aggregateClassAlerts,
  getDecisionZoneStudents,
  calculateWeeklyGoalGrid,
  generateWeeklySummaryText,
  DEFAULT_ALERT_CONFIG,
  type AlertConfig,
} from "../monitoring";

describe("B2B Monitoring, Alerts & Weekly Summary Engine (P16 / Votos SPR 1 a 7)", () => {
  const sampleStudents = [
    // Aluno 1: Nota 48 (crítico < 60), 10 dias sem acesso, 40% queda de ritmo
    {
      studentUserId: "u1",
      studentName: "Lucas Mendes",
      registration: "RA-01",
      classGroupId: "cg-1",
      classGroupLabel: "MED 4º Período",
      averageScore: 48.0,
      daysWithoutAccess: 10,
      paceDropPercentage: 40,
      hasPendingExam: true,
    },
    // Aluno 2: Nota 56 (Zona de Decisão 51-60), 2 dias sem acesso (ativo), sem queda de ritmo
    {
      studentUserId: "u2",
      studentName: "Beatriz Lima",
      registration: "RA-02",
      classGroupId: "cg-1",
      classGroupLabel: "MED 4º Período",
      averageScore: 56.5,
      daysWithoutAccess: 2,
      paceDropPercentage: 0,
      hasPendingExam: false,
    },
    // Aluno 3: Nota 75 (aprovado), 15 dias sem acesso (sem login), 50% queda
    {
      studentUserId: "u3",
      studentName: "Carlos Eduardo",
      registration: "RA-03",
      classGroupId: "cg-2",
      classGroupLabel: "MED 8º Período",
      averageScore: 75.0,
      daysWithoutAccess: 15,
      paceDropPercentage: 50,
      hasPendingExam: true,
    },
    // Aluno 4: Nota 82 (aprovado e engajado), sem alertas
    {
      studentUserId: "u4",
      studentName: "Mariana Souza",
      registration: "RA-04",
      classGroupId: "cg-2",
      classGroupLabel: "MED 8º Período",
      averageScore: 82.0,
      daysWithoutAccess: 1,
      paceDropPercentage: 0,
      hasPendingExam: false,
    },
  ];

  it("1. Funciona só com a nota quando todos os alertas de engajamento estão desligados (critério de aceite)", () => {
    // Config padrão: no_login = false, pace_drop = false, pending_exam = false
    const list = calculateAttentionList({
      students: sampleStudents,
      config: DEFAULT_ALERT_CONFIG,
      cutScore: 60,
    });

    // Apenas u1 (< 60) e u2 (51-60) devem entrar. u3 tem nota 75 e alertas de engajamento estão desligados.
    expect(list).toHaveLength(2);

    expect(list[0].studentUserId).toBe("u1");
    expect(list[0].reasons[0].key).toBe("nota_abaixo_60");

    expect(list[1].studentUserId).toBe("u2");
    expect(list[1].reasons[0].key).toBe("zona_decisao");
  });

  it("2. Ligar alertas de engajamento altera a lista de forma previsível (critério de aceite)", () => {
    const customConfig: AlertConfig = {
      ...DEFAULT_ALERT_CONFIG,
      no_login: true,
      no_login_days: 7,
      pace_drop: true,
      pace_drop_pct: 30,
      pending_exam: true,
    };

    const list = calculateAttentionList({
      students: sampleStudents,
      config: customConfig,
      cutScore: 60,
    });

    // Agora u3 entra devido a sem_acesso (15 dias >= 7), queda_ritmo e simulado_pendente
    expect(list).toHaveLength(3);

    // u1 continua em 1º lugar pois nota < 60 tem maior severidade
    expect(list[0].studentUserId).toBe("u1");
    expect(list[0].reasons.some((r) => r.key === "sem_acesso")).toBe(true);

    // u2 em 2º lugar (zona de decisão)
    expect(list[1].studentUserId).toBe("u2");

    // u3 em 3º lugar (alerta de engajamento)
    expect(list[2].studentUserId).toBe("u3");
    expect(list[2].reasons[0].key).toBe("sem_acesso");
  });

  it("3. Agrega alertas de turma quando atingem mais de 50% dos alunos da turma (Voto SPR nº 2)", () => {
    // 3 alunos da mesma turma com queda de ritmo
    const attentionList = [
      {
        studentUserId: "u1",
        studentName: "A1",
        registration: "RA1",
        classGroupId: "cg-1",
        classGroupLabel: "MED 4º Período",
        averageScore: 55,
        reasons: [{ key: "queda_ritmo" as const, label: "Queda de Ritmo", severity: "info" as const, detail: "", weight: 4 }],
        daysWithoutAccess: 1,
        paceDropPercentage: 40,
        hasPendingExam: false,
        isTreated: false,
      },
      {
        studentUserId: "u2",
        studentName: "A2",
        registration: "RA2",
        classGroupId: "cg-1",
        classGroupLabel: "MED 4º Período",
        averageScore: 58,
        reasons: [{ key: "queda_ritmo" as const, label: "Queda de Ritmo", severity: "info" as const, detail: "", weight: 4 }],
        daysWithoutAccess: 1,
        paceDropPercentage: 40,
        hasPendingExam: false,
        isTreated: false,
      },
      {
        studentUserId: "u3",
        studentName: "A3",
        registration: "RA3",
        classGroupId: "cg-1",
        classGroupLabel: "MED 4º Período",
        averageScore: 50,
        reasons: [
          { key: "nota_abaixo_60" as const, label: "Nota Abaixo de 60", severity: "critical" as const, detail: "", weight: 1 },
          { key: "queda_ritmo" as const, label: "Queda de Ritmo", severity: "info" as const, detail: "", weight: 4 },
        ],
        daysWithoutAccess: 1,
        paceDropPercentage: 40,
        hasPendingExam: false,
        isTreated: false,
      },
    ];

    // Turma cg-1 tem 4 alunos no total. 3 alunos com queda de ritmo = 75% >= 50%
    const classTotalMap = new Map<string, number>([["cg-1", 4]]);

    const { classAlerts, individualAttentionList } = aggregateClassAlerts({
      attentionList,
      classTotalStudents: classTotalMap,
      thresholdPct: 50,
    });

    // Deve gerar 1 Alerta de Turma para Queda de Ritmo
    expect(classAlerts).toHaveLength(1);
    expect(classAlerts[0].alertKey).toBe("queda_ritmo");
    expect(classAlerts[0].affectedCount).toBe(3);
    expect(classAlerts[0].affectedPercentage).toBe(75);

    // O motivo "queda_ritmo" é removido da lista individual, restando apenas o motivo "nota_abaixo_60" de u3
    expect(individualAttentionList).toHaveLength(1);
    expect(individualAttentionList[0].studentUserId).toBe("u3");
    expect(individualAttentionList[0].reasons[0].key).toBe("nota_abaixo_60");
  });

  it("4. Filtra e ordena alunos na Zona de Decisão (51 a 60%) com filtro por turma", () => {
    const students = [
      { studentUserId: "s1", studentName: "S1", registration: "RA1", classGroupId: "cg-1", classGroupLabel: "Turma 1", averageScore: 54.5, totalQuestions: 120 },
      { studentUserId: "s2", studentName: "S2", registration: "RA2", classGroupId: "cg-1", classGroupLabel: "Turma 1", averageScore: 59.0, totalQuestions: 80 },
      { studentUserId: "s3", studentName: "S3", registration: "RA3", classGroupId: "cg-2", classGroupLabel: "Turma 2", averageScore: 52.0, totalQuestions: 90 },
      { studentUserId: "s4", studentName: "S4", registration: "RA4", classGroupId: "cg-1", classGroupLabel: "Turma 1", averageScore: 48.0, totalQuestions: 50 }, // Fora (< 51)
      { studentUserId: "s5", studentName: "S5", registration: "RA5", classGroupId: "cg-2", classGroupLabel: "Turma 2", averageScore: 68.0, totalQuestions: 200 }, // Fora (> 60)
    ];

    // Sem filtro de turma
    const allDecision = getDecisionZoneStudents(students, "all");
    expect(allDecision).toHaveLength(3);
    expect(allDecision.map((s) => s.studentUserId)).toEqual(["s3", "s1", "s2"]); // Ordenado crescente

    // Com filtro para cg-1
    const cg1Decision = getDecisionZoneStudents(students, "cg-1");
    expect(cg1Decision).toHaveLength(2);
    expect(cg1Decision.map((s) => s.studentUserId)).toEqual(["s1", "s2"]);
  });

  it("5. Calcula grade de meta semanal e semanas seguidas sem cumprir (Voto SPR nº 4)", () => {
    const students = [
      // Aluno 1: cumpriu todas as 4 semanas
      { studentUserId: "s1", studentName: "S1", registration: "RA1", classGroupLabel: "T1", weeklyAnswers: [60, 55, 50, 70] },
      // Aluno 2: não cumpriu na última semana (1 semana sem cumprir)
      { studentUserId: "s2", studentName: "S2", registration: "RA2", classGroupLabel: "T1", weeklyAnswers: [55, 60, 50, 20] },
      // Aluno 3: não cumpriu nas últimas 3 semanas (3 semanas sem cumprir)
      { studentUserId: "s3", studentName: "S3", registration: "RA3", classGroupLabel: "T1", weeklyAnswers: [50, 15, 0, 0] },
    ];

    const grid = calculateWeeklyGoalGrid({
      students,
      weeklyTarget: 50,
      weeksLabels: ["Sem 1", "Sem 2", "Sem 3", "Sem 4"],
    });

    // Ordenação por maior reincidência (consecutiveWeeksMissed)
    expect(grid[0].studentUserId).toBe("s3");
    expect(grid[0].consecutiveWeeksMissed).toBe(3);

    expect(grid[1].studentUserId).toBe("s2");
    expect(grid[1].consecutiveWeeksMissed).toBe(1);

    expect(grid[2].studentUserId).toBe("s1");
    expect(grid[2].consecutiveWeeksMissed).toBe(0);
  });

  it("6. Resumo da semana NÃO contém nome de aluno por padrão e inclui sob toggle (critério de aceite)", () => {
    const params = {
      institutionName: "Faculdade Demonstração",
      periodLabel: "2027.1",
      totalStudents: 240,
      participationRate: 95.0,
      averageScore: 65.4,
      classesBelowCut: ["MED 1º Período"],
      studentsBelowCutCount: 42,
      studentsInDecisionZoneCount: 34,
      criticalStudents: [
        { name: "Lucas Mendes", score: 45.2, classLabel: "MED 1ºP" },
        { name: "Beatriz Lima", score: 48.0, classLabel: "MED 1ºP" },
      ],
      weakestArea: { name: "Cirurgia Geral", score: 52.4 },
      highlightClass: { name: "MED 12º Período", evolution: "+4.8% no simulado" },
    };

    // Padrão: includeStudentNames = false (omitido)
    const textDefault = generateWeeklySummaryText(params);
    expect(textDefault).toContain("RESUMO SEMANAL DE ACOMPANHAMENTO");
    expect(textDefault).toContain("Nomes individuais omitidos por padrão de privacidade");
    expect(textDefault).not.toContain("Lucas Mendes");
    expect(textDefault).not.toContain("Beatriz Lima");

    // Toggle ligado: includeStudentNames = true
    const textWithNames = generateWeeklySummaryText({
      ...params,
      includeStudentNames: true,
    });
    expect(textWithNames).toContain("ESTUDANTES PRIORITÁRIOS");
    expect(textWithNames).toContain("Lucas Mendes");
    expect(textWithNames).toContain("Beatriz Lima");
  });
});
