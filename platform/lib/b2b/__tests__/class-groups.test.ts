import { describe, it, expect } from "vitest";
import {
  calculateClassGroupsList,
  calculateClassAggregatedAreasAndScenarios,
  calculateScatterPlotData,
  calculateStudentTrajectory,
} from "../class-groups";

describe("B2B Class Groups & Scatter Plot Engine (P15 / TC-01 a TC-08)", () => {
  it("1. Calcula resumo da lista de turmas com índice, participação, tendência e alunos abaixo de 60 (TC-01)", () => {
    const classGroups = [
      { id: "cg-1", label: "MED 4º Período", period: 4 },
      { id: "cg-2", label: "MED 8º Período", period: 8 },
    ];

    const enrollments = [
      { classGroupId: "cg-1", studentUserId: "u1", status: "active" },
      { classGroupId: "cg-1", studentUserId: "u2", status: "active" },
      { classGroupId: "cg-2", studentUserId: "u3", status: "active" },
    ];

    const attempts = [
      // cg-1: 1 presente (nota 70) e 1 ausente
      { assessmentId: "exam-1", classGroupId: "cg-1", studentUserId: "u1", status: "finalizada", scorePercentage: 70, examDate: "2026-09-01" },
      { assessmentId: "exam-1", classGroupId: "cg-1", studentUserId: "u2", status: "ausente", scorePercentage: 0, examDate: "2026-09-01" },
      // Segunda prova de cg-1 com aumento de nota (tendência de alta)
      { assessmentId: "exam-2", classGroupId: "cg-1", studentUserId: "u1", status: "finalizada", scorePercentage: 76, examDate: "2026-10-01" },
      // cg-2: 1 presente com nota 54 (Zona de Decisão 51-60 e abaixo do corte 60)
      { assessmentId: "exam-1", classGroupId: "cg-2", studentUserId: "u3", status: "finalizada", scorePercentage: 54, examDate: "2026-09-01" },
    ];

    const summary = calculateClassGroupsList({ classGroups, enrollments, attempts, cutScore: 60 });

    expect(summary).toHaveLength(2);

    // cg-1
    expect(summary[0].id).toBe("cg-1");
    expect(summary[0].totalStudents).toBe(2);
    expect(summary[0].participationRate).toBe(66.7); // 2 finalizadas / 3 tentativas totais
    expect(summary[0].averageScore).toBe(73.0); // (70 + 76) / 2
    expect(summary[0].trend).toBe("up"); // 76 - 70 = +6 >= 2.0
    expect(summary[0].studentsBelowCutCount).toBe(0);

    // cg-2
    expect(summary[1].id).toBe("cg-2");
    expect(summary[1].totalStudents).toBe(1);
    expect(summary[1].averageScore).toBe(54.0);
    expect(summary[1].studentsBelowCutCount).toBe(1);
    expect(summary[1].studentsInDecisionZoneCount).toBe(1);
  });

  it("2. Agrega rendimento por Área e Cenário sem expor nomes de alunos (TC-02, TC-03)", () => {
    const items = [
      { id: "it-1", area: "Clínica Médica", cenario: "Ambulatório", status: "valido" },
      { id: "it-2", area: "Clínica Médica", cenario: "Pronto-Socorro", status: "valido" },
      { id: "it-3", area: "Cirurgia Geral", cenario: "Pronto-Socorro", status: "valido" },
      { id: "it-4", area: "Pediatria", cenario: null, status: "anulado" }, // Deve ser ignorado
    ];

    const answers = [
      // Tentativa 1 (cg-1): acerta it-1 e erra it-2 e erra it-3
      { attemptId: "att-1", itemId: "it-1", isCorrect: true },
      { attemptId: "att-1", itemId: "it-2", isCorrect: false },
      { attemptId: "att-1", itemId: "it-3", isCorrect: false },
      // Tentativa 2 (cg-1): acerta it-1 e acerta it-2 e acerta it-3
      { attemptId: "att-2", itemId: "it-1", isCorrect: true },
      { attemptId: "att-2", itemId: "it-2", isCorrect: true },
      { attemptId: "att-2", itemId: "it-3", isCorrect: true },
    ];

    const result = calculateClassAggregatedAreasAndScenarios({
      items,
      answers,
      classAttemptIds: ["att-1", "att-2"],
      cutScore: 60,
    });

    // Áreas
    const clinica = result.areas.find((a) => a.name === "Clínica Médica");
    expect(clinica).toBeDefined();
    // 3 acertos em 4 respostas = 75%
    expect(clinica?.averageScore).toBe(75.0);
    expect(clinica?.status).toBe("excelente");

    const cirurgia = result.areas.find((a) => a.name === "Cirurgia Geral");
    // 1 acerto em 2 respostas = 50%
    expect(cirurgia?.averageScore).toBe(50.0);
    expect(cirurgia?.status).toBe("abaixo_60");

    // Cenários
    const ambulatorio = result.scenarios.find((s) => s.name === "Ambulatório");
    expect(ambulatorio?.averageScore).toBe(100.0);

    const ps = result.scenarios.find((s) => s.name === "Pronto-Socorro");
    // it-2 (1 acerto / 2) + it-3 (1 acerto / 2) = 2 acertos em 4 = 50%
    expect(ps?.averageScore).toBe(50.0);
  });

  it("3. Constrói Gráfico de Dispersão com 4 Quadrantes, Mediana de X, Corte 60 e Destaque Zona de Decisão (TC-03)", () => {
    const students = [
      // Aluno 1: Treina muito (100) e performa bem (75) -> Treina e performa
      { studentUserId: "s1", studentName: "Aluno 1", registration: "RA-01", averageScore: 75, questionsTrained: 100, examsTaken: 3 },
      // Aluno 2: Pouco treino (20) e performa bem (70) -> Performa com pouco treino
      { studentUserId: "s2", studentName: "Aluno 2", registration: "RA-02", averageScore: 70, questionsTrained: 20, examsTaken: 1 },
      // Aluno 3: Treina muito (90) e não sobe (55, Zona de Decisão 51-60) -> Treina e não sobe
      { studentUserId: "s3", studentName: "Aluno 3", registration: "RA-03", averageScore: 55, questionsTrained: 90, examsTaken: 3 },
      // Aluno 4: Pouco treino (10) e nota baixa (45) -> Pouco treino e abaixo
      { studentUserId: "s4", studentName: "Aluno 4", registration: "RA-04", averageScore: 45, questionsTrained: 10, examsTaken: 1 },
      // Aluno 5: Sem nota (ausente em todas) -> Fica fora do gráfico
      { studentUserId: "s5", studentName: "Aluno 5", registration: "RA-05", averageScore: null, questionsTrained: 0, examsTaken: 0 },
    ];

    const scatter = calculateScatterPlotData({
      students,
      xMetric: "questions",
      cutScore: 60,
    });

    expect(scatter.plottedStudents).toHaveLength(4);
    expect(scatter.unplottedStudentsCount).toBe(1);

    // Mediana de [10, 20, 90, 100] = (20 + 90) / 2 = 55
    expect(scatter.xMedian).toBe(55);

    // Contagens dos 4 quadrantes
    expect(scatter.quadrantCounts.treina_performa).toBe(1); // s1 (100 >= 55, 75 >= 60)
    expect(scatter.quadrantCounts.pouco_treino_performa).toBe(1); // s2 (20 < 55, 70 >= 60)
    expect(scatter.quadrantCounts.treina_nao_sobe).toBe(1); // s3 (90 >= 55, 55 < 60)
    expect(scatter.quadrantCounts.pouco_treino_abaixo).toBe(1); // s4 (10 < 55, 45 < 60)

    // Destaque para Zona de Decisão (51 a 60)
    const s3Point = scatter.plottedStudents.find((p) => p.studentUserId === "s3");
    expect(s3Point?.isInDecisionZone).toBe(true);

    const s1Point = scatter.plottedStudents.find((p) => p.studentUserId === "s1");
    expect(s1Point?.isInDecisionZone).toBe(false);
  });

  it("4. Alterna Eixo X para Simulados Feitos e recalcula quadrantes (TC-03)", () => {
    const students = [
      { studentUserId: "s1", studentName: "Aluno 1", registration: "RA-01", averageScore: 65, questionsTrained: 100, examsTaken: 4 },
      { studentUserId: "s2", studentName: "Aluno 2", registration: "RA-02", averageScore: 62, questionsTrained: 200, examsTaken: 1 },
      { studentUserId: "s3", studentName: "Aluno 3", registration: "RA-03", averageScore: 50, questionsTrained: 300, examsTaken: 3 },
    ];

    const scatter = calculateScatterPlotData({
      students,
      xMetric: "exams",
      cutScore: 60,
    });

    // Mediana de [1, 3, 4] = 3
    expect(scatter.xMedian).toBe(3);
    // s1: exams=4 >= 3, score=65 >= 60 -> treina_performa
    // s2: exams=1 < 3, score=62 >= 60 -> pouco_treino_performa
    // s3: exams=3 >= 3, score=50 < 60 -> treina_nao_sobe
    expect(scatter.quadrantCounts.treina_performa).toBe(1);
    expect(scatter.quadrantCounts.pouco_treino_performa).toBe(1);
    expect(scatter.quadrantCounts.treina_nao_sobe).toBe(1);
  });

  it("5. Calcula Trajetória Longitudinal e Dispersão Individual do Aluno (TC-06)", () => {
    const studentAttempts = [
      { assessmentId: "exam-2", title: "Prova 2", date: "2026-10-15", scorePercentage: 68 },
      { assessmentId: "exam-1", title: "Prova 1", date: "2026-08-10", scorePercentage: 58 },
      { assessmentId: "exam-3", title: "Prova 3", date: "2026-11-20", scorePercentage: 74 },
    ];

    const classExamAverages = new Map<string, number>([
      ["exam-1", 60.0],
      ["exam-2", 64.0],
      ["exam-3", 66.0],
    ]);

    const trajectory = calculateStudentTrajectory({
      studentUserId: "s1",
      studentAttempts,
      classExamAverages,
    });

    // Ordenação estritamente cronológica
    expect(trajectory).toHaveLength(3);
    expect(trajectory[0].examId).toBe("exam-1");
    expect(trajectory[0].studentScore).toBe(58);
    expect(trajectory[0].classAverageScore).toBe(60.0);

    expect(trajectory[1].examId).toBe("exam-2");
    expect(trajectory[1].studentScore).toBe(68);

    expect(trajectory[2].examId).toBe("exam-3");
    expect(trajectory[2].studentScore).toBe(74);
  });
});
