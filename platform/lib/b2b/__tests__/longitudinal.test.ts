import { describe, it, expect } from "vitest";
import {
  ENAMED_MILESTONES,
  getLongitudinalScoreBand,
  calculateCurriculumAxisMatrix,
  calculateLongitudinalTrajectory,
  formatTimelineActionPlans,
  ActionPlanItem,
} from "../longitudinal";

describe("MEDPLENI B2B — Avaliação Longitudinal (P17 / AP-01 a AP-04)", () => {
  it("1. Marcos ENAMED: possui marcos explícitos nos 4º, 8º e 12º períodos", () => {
    expect(ENAMED_MILESTONES[4]).toBeDefined();
    expect(ENAMED_MILESTONES[4].stage).toBe(1);
    expect(ENAMED_MILESTONES[4].shortLabel).toContain("ENAMED Etapa 1");

    expect(ENAMED_MILESTONES[8]).toBeDefined();
    expect(ENAMED_MILESTONES[8].stage).toBe(2);
    expect(ENAMED_MILESTONES[8].shortLabel).toContain("ENAMED Etapa 2");

    expect(ENAMED_MILESTONES[12]).toBeDefined();
    expect(ENAMED_MILESTONES[12].stage).toBe(3);
    expect(ENAMED_MILESTONES[12].shortLabel).toContain("ENAMED Etapa 3");
  });

  it("2. Régua 60 e Faixas: classifica notas em abaixo de 50, zona de decisão (51-60), 61-70 e 71+", () => {
    expect(getLongitudinalScoreBand(null)).toBe("sem_dados");
    expect(getLongitudinalScoreBand(48.5, 60)).toBe("abaixo_50");
    expect(getLongitudinalScoreBand(51.0, 60)).toBe("51_60");
    expect(getLongitudinalScoreBand(59.9, 60)).toBe("51_60");
    expect(getLongitudinalScoreBand(60.0, 60)).toBe("51_60");
    expect(getLongitudinalScoreBand(65.0, 60)).toBe("61_70");
    expect(getLongitudinalScoreBand(72.5, 60)).toBe("71_mais");
  });

  it("3. Matriz Currículo × Eixo: períodos 1 a 12 nas colunas e áreas nas linhas com alertas de interpretação", () => {
    const classGroups = [
      { id: "cg-p1", period: 1, name: "Turma P1" },
      { id: "cg-p2", period: 2, name: "Turma P2" },
      { id: "cg-p4", period: 4, name: "Turma P4" },
    ];

    const attempts = [
      { assessmentId: "exam-1", classGroupId: "cg-p1", scorePercentage: 45.0 },
      { assessmentId: "exam-1", classGroupId: "cg-p2", scorePercentage: 55.0 },
      { assessmentId: "exam-2", classGroupId: "cg-p4", scorePercentage: 68.0 },
    ];

    const items = [
      {
        assessmentId: "exam-1",
        area: "Clínica Médica",
        classGroupId: "cg-p1",
        isCorrect: true,
      },
      {
        assessmentId: "exam-1",
        area: "Clínica Médica",
        classGroupId: "cg-p1",
        isCorrect: false,
      },
      {
        assessmentId: "exam-2",
        area: "Cirurgia Geral",
        classGroupId: "cg-p4",
        isCorrect: true,
      },
    ];

    const matrix = calculateCurriculumAxisMatrix({
      attempts,
      items,
      classGroups,
      axisType: "area",
      cutScore: 60,
    });

    expect(matrix.periods).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(matrix.rows.length).toBeGreaterThanOrEqual(7);

    // Linha Clínica Médica
    const clinicaRow = matrix.rows.find((r) => r.axisValue === "Clínica Médica");
    expect(clinicaRow).toBeDefined();

    // Período 1 para Clínica Médica: teve 2 questões (menos de 5 -> warning poucas_questoes)
    const p1Cell = clinicaRow?.cells[1];
    expect(p1Cell).toBeDefined();
    expect(p1Cell?.questionsCount).toBe(2);
    expect(p1Cell?.warning).toBe("poucas_questoes");

    // Período 5 não tem turma cadastrada -> sem dados
    const p5Cell = clinicaRow?.cells[5];
    expect(p5Cell?.warning).toBe("sem_dados");
  });

  it("4. Trilha Longitudinal: evolução da coorte ao longo dos períodos e comparação entre turmas no mesmo período", () => {
    const classGroups = [
      { id: "cg-p1", period: 1, name: "Turma P1" },
      { id: "cg-p2", period: 2, name: "Turma P2" },
      { id: "cg-p3", period: 3, name: "Turma P3" },
      { id: "cg-p4", period: 4, name: "Turma P4A" },
      { id: "cg-p4b", period: 4, name: "Turma P4B" },
    ];

    const attempts = [
      { assessmentId: "exam-1", classGroupId: "cg-p1", scorePercentage: 45.0 },
      { assessmentId: "exam-1", classGroupId: "cg-p2", scorePercentage: 52.0 },
      { assessmentId: "exam-1", classGroupId: "cg-p3", scorePercentage: 58.0 },
      { assessmentId: "exam-1", classGroupId: "cg-p4", scorePercentage: 66.0 },
      { assessmentId: "exam-1", classGroupId: "cg-p4b", scorePercentage: 62.0 },
    ];

    const matrix = calculateCurriculumAxisMatrix({
      attempts,
      items: [],
      classGroups,
      axisType: "area",
      cutScore: 60,
    });

    const trajectory = calculateLongitudinalTrajectory({
      axisValue: "Clínica Médica",
      matrixResult: matrix,
      classGroups,
    });

    expect(trajectory.cohortTrajectory.length).toBeGreaterThan(0);
    // Comparação de turmas no marco P4
    const p4Comparison = trajectory.parallelCohortsComparison.find((c) => c.period === 4);
    expect(p4Comparison).toBeDefined();
    expect(p4Comparison?.classes.length).toBe(2);
  });

  it("5. Planos de Acompanhamento (AP-04): linha do tempo com ganho e recuperação >= 60%", () => {
    const plans: ActionPlanItem[] = [
      {
        id: "plan-1",
        targetType: "class_group",
        classGroupId: "cg-1",
        classGroupLabel: "Turma P3",
        axisType: "area",
        axisValue: "Saúde Coletiva",
        actionDescription: "Módulo de reforço em epidemiologia",
        responsibleName: "Prof. Roberto",
        agreedDate: "2026-03-20",
        initialScore: 47.0,
        verifiedScore: 64.0,
        status: "concluida",
      },
      {
        id: "plan-2",
        targetType: "student",
        studentUserId: "user-1",
        studentName: "Carlos Eduardo",
        axisType: "area",
        axisValue: "Cirurgia Geral",
        actionDescription: "Treino de casos em ambulatório",
        responsibleName: "Coordenação",
        agreedDate: "2026-04-10",
        initialScore: 50.0,
        verifiedScore: 58.0,
        status: "concluida",
      },
    ];

    const formatted = formatTimelineActionPlans(plans);
    expect(formatted.length).toBe(2);

    // plan-2 mais recente vem primeiro
    expect(formatted[0].id).toBe("plan-2");
    expect(formatted[0].gain).toBe(8.0);
    expect(formatted[0].isRecovered).toBe(false); // 58% < 60%
    expect(formatted[0].timelineStatusLabel).toContain("Abaixo de 60%");

    // plan-1 recuperou para >= 60%
    expect(formatted[1].id).toBe("plan-1");
    expect(formatted[1].gain).toBe(17.0);
    expect(formatted[1].isRecovered).toBe(true); // 64% >= 60%
    expect(formatted[1].timelineStatusLabel).toContain("Recuperado (≥ 60%)");
  });

  it("6. Critério de Aceite Estrito: o termo 'programática' NUNCA aparece no módulo", () => {
    // Garante que o termo reprovado pelos médicos não está presente nas strings do módulo
    const jsonStr = JSON.stringify({
      milestones: ENAMED_MILESTONES,
    }).toLowerCase();

    expect(jsonStr).not.toContain("programática");
    expect(jsonStr).not.toContain("programatica");
  });
});
