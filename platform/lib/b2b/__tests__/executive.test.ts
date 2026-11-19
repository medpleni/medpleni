/**
 * MEDPLENI B2B — executive.test.ts
 * Suíte de testes automatizados para a Visão Executiva e Relatórios (EX-01 a EX-08)
 */

import { describe, it, expect } from "vitest";
import {
  calculateExecutiveKPIs,
  calculateClassGroupAreaHeatmap,
  calculateExamTimelineEvolution,
  calculateExecutiveAlerts,
  calculateClassExamsMatrix,
  calculateMatrixCoverage,
  getScoreBandCategory,
} from "../executive";
import { generateExecutiveReportHTML } from "../report-generator";

describe("B2B Executive Module (EX-01 a EX-08 / SPR nº 12)", () => {
  it("1. classifica corretamente as 4 faixas de cores canônicas", () => {
    expect(getScoreBandCategory(45)).toBe("ate_50");
    expect(getScoreBandCategory(50)).toBe("ate_50");
    expect(getScoreBandCategory(55)).toBe("51_60");
    expect(getScoreBandCategory(60)).toBe("51_60");
    expect(getScoreBandCategory(65)).toBe("61_70");
    expect(getScoreBandCategory(70)).toBe("61_70");
    expect(getScoreBandCategory(75)).toBe("71_mais");
    expect(getScoreBandCategory(90)).toBe("71_mais");
  });

  it("2. calcula os 5 indicadores executivos com exatidão e rodapé canônico (EX-03)", () => {
    const attempts = [
      { status: "finalizada", score_percentage: 75.0, class_group_id: "cg-1" },
      { status: "finalizada", score_percentage: 58.0, class_group_id: "cg-1" }, // zona de decisão (51-60)
      { status: "finalizada", score_percentage: 42.0, class_group_id: "cg-2" }, // abaixo de 50
      { status: "finalizada", score_percentage: 65.0, class_group_id: "cg-2" },
      { status: "ausente", score_percentage: 0, class_group_id: "cg-2" },
    ];

    const classAverages = new Map<string, number>([
      ["cg-1", 66.5],
      ["cg-2", 53.5], // turma abaixo de 60
    ]);

    const kpis = calculateExecutiveKPIs({
      attempts,
      classAverages,
      cutScore: 60,
      examTitle: "Simulado Nacional 2027.1",
      academicTermLabel: "2027.1",
    });

    expect(kpis.totalEnrolled).toBe(5);
    expect(kpis.totalPresent).toBe(4);
    expect(kpis.totalAbsent).toBe(1);
    expect(kpis.participationRate).toBe(80.0);

    // Média dos 4 presentes: (75 + 58 + 42 + 65) / 4 = 240 / 4 = 60.0%
    expect(kpis.institutionMeanScore).toBe(60.0);

    // Alunos < 60: 58% e 42% (2 de 4 = 50%)
    expect(kpis.studentsBelowCutCount).toBe(2);
    expect(kpis.studentsBelowCutPercentage).toBe(50.0);

    // Zona de Decisão (51–60%): apenas o de 58% (1 de 4 = 25%)
    expect(kpis.decisionZoneCount).toBe(1);
    expect(kpis.decisionZonePercentage).toBe(25.0);

    // Turmas < 60: cg-2 (1 de 2)
    expect(kpis.classesBelowCutCount).toBe(1);
    expect(kpis.totalClasses).toBe(2);

    // Rodapé Base / Período / Fonte
    expect(kpis.footnote.base).toContain("Simulado Nacional 2027.1");
    expect(kpis.footnote.period).toContain("2027.1");
    expect(kpis.footnote.source).toContain("MedPleni B2B");
  });

  it("3. gera o heatmap turma x área com média final em coluna própria (EX-05)", () => {
    const classGroups = [
      { id: "cg-1", label: "MED-04P", period: 4 },
      { id: "cg-2", label: "MED-08P", period: 8 },
    ];

    const items = [
      { id: "item-1", area: "Clínica Médica", status: "valido" },
      { id: "item-2", area: "Cirurgia Geral", status: "valido" },
    ];

    const attempts = [
      { id: "att-1", classGroupId: "cg-1", status: "finalizada", scorePercentage: 100 },
      { id: "att-2", classGroupId: "cg-1", status: "finalizada", scorePercentage: 50 },
      { id: "att-3", classGroupId: "cg-2", status: "finalizada", scorePercentage: 40 },
    ];

    const answers = [
      { attemptId: "att-1", itemId: "item-1", isCorrect: true },
      { attemptId: "att-1", itemId: "item-2", isCorrect: true },
      { attemptId: "att-2", itemId: "item-1", isCorrect: true },
      { attemptId: "att-2", itemId: "item-2", isCorrect: false },
      { attemptId: "att-3", itemId: "item-1", isCorrect: false },
      { attemptId: "att-3", itemId: "item-2", isCorrect: false },
    ];

    const heatmap = calculateClassGroupAreaHeatmap({
      classGroups,
      items,
      attempts,
      answers,
    });

    expect(heatmap).toHaveLength(2);

    // Turma 04P: 2 alunos, média (100 + 50) / 2 = 75.0%
    const cg1 = heatmap.find((h) => h.classGroupId === "cg-1")!;
    expect(cg1.classAverageScore).toBe(75.0);
    expect(cg1.classScoreBand).toBe("71_mais");

    // Clínica Médica na Turma 04P: 2 acertos em 2 = 100%
    const cm1 = cg1.areas.find((a) => a.areaName === "Clínica Médica")!;
    expect(cm1.averageScore).toBe(100.0);
    expect(cm1.scoreBand).toBe("71_mais");

    // Turma 08P: 1 aluno, média 40.0%
    const cg2 = heatmap.find((h) => h.classGroupId === "cg-2")!;
    expect(cg2.classAverageScore).toBe(40.0);
    expect(cg2.classScoreBand).toBe("ate_50");
  });

  it("4. calcula a evolução temporal e alertas apenas para notas < 60 (EX-07 / EX-08)", () => {
    const exams = [
      {
        examId: "ex-1",
        title: "Prova 1",
        date: "2026-09-01",
        type: "simulado",
        attempts: [
          { status: "finalizada", score_percentage: 55 },
          { status: "finalizada", score_percentage: 65 },
        ],
      },
      {
        examId: "ex-2",
        title: "Prova 2",
        date: "2026-10-01",
        type: "simulado",
        attempts: [
          { status: "finalizada", score_percentage: 70 },
          { status: "finalizada", score_percentage: 75 },
        ],
      },
    ];

    const evolution = calculateExamTimelineEvolution(exams, 60);
    expect(evolution).toHaveLength(2);
    expect(evolution[0].institutionMeanScore).toBe(60.0);
    expect(evolution[1].institutionMeanScore).toBe(72.5);

    // Alertas padrão (só nota < 60)
    const heatmapRows = [
      {
        classGroupId: "cg-1",
        classGroupLabel: "Turma Crítica",
        period: 4,
        totalStudents: 10,
        classAverageScore: 54.0, // Alerta
        classScoreBand: "51_60" as const,
        areas: [
          { areaName: "Pediatria", averageScore: 48.0, scoreBand: "ate_50" as const, questionsCount: 5 },
          { areaName: "Clínica", averageScore: 62.0, scoreBand: "61_70" as const, questionsCount: 5 },
        ],
      },
    ];

    const alerts = calculateExecutiveAlerts(heatmapRows, 60);
    expect(alerts.some((a) => a.classGroupName === "Turma Crítica" && a.value === 54.0)).toBe(true);
    expect(alerts.some((a) => a.areaName === "Pediatria" && a.value === 48.0)).toBe(true);
  });

  it("5. calcula a matriz turmas x provas e a cobertura de matriz", () => {
    const matrix = calculateClassExamsMatrix({
      classGroups: [{ id: "cg-1", label: "MED-04P", period: 4 }],
      exams: [{ id: "ex-1", title: "P1", date: "2026-09-01" }],
      attempts: [{ assessmentId: "ex-1", classGroupId: "cg-1", status: "finalizada", scorePercentage: 68.0 }],
    });

    expect(matrix[0].examScores[0].averageScore).toBe(68.0);
    expect(matrix[0].examScores[0].scoreBand).toBe("61_70");

    const items = [
      { area: "Clínica Médica", status: "valido" },
      { area: "Clínica Médica", status: "valido" },
      { area: "Cirurgia Geral", status: "valido" },
    ];

    const coverage = calculateMatrixCoverage(items);
    const cm = coverage.find((c) => c.areaName === "Clínica Médica")!;
    expect(cm.questionsCount).toBe(2);
    expect(cm.status).toBe("satisfatoria");
  });

  it("6. gera o HTML do relatório executivo com identidade institucional (SPR nº 12)", () => {
    const html = generateExecutiveReportHTML({
      institutionName: "Faculdade Demonstração de Medicina",
      institutionInitials: "FADEP",
      courseName: "Medicina",
      academicTerm: "2027.1",
      generatedAt: "19/11/2026",
      generatedByName: "Dr. Fernando Nogueira",
      selectedExamTitle: "Simulado Nacional ENAMED 2027.1",
      kpis: {
        institutionMeanScore: 68.4,
        studentsBelowCutCount: 32,
        studentsBelowCutPercentage: 14.5,
        participationRate: 95.0,
        totalEnrolled: 240,
        totalPresent: 228,
        totalAbsent: 12,
        classesBelowCutCount: 1,
        totalClasses: 12,
        decisionZoneCount: 42,
        decisionZonePercentage: 18.4,
        footnote: {
          base: "Simulado Nacional",
          period: "2027.1",
          source: "MedPleni B2B",
        },
      },
      heatmap: [],
      timeline: [],
      coverage: [],
    });

    expect(html).toContain("Faculdade Demonstração de Medicina (FADEP)");
    expect(html).toContain("68.4%");
    expect(html).toContain("CPA / NDE / MEC");
    expect(html).toContain("Aviso Metodológico de Interpretação");
  });
});
