import { describe, it, expect } from "vitest";
import {
  sortAreasByGainOpportunity,
  calculateNextStepRecommendation,
  calculateStudentEvolutionTimeline,
} from "../aluno";

describe("Portal do Aluno Institucional (AL-01 a AL-05)", () => {
  it("AL-03: ordena áreas estritamente por oportunidade de ganho (menor aproveitamento primeiro)", () => {
    const rawAreas = [
      { area: "Pediatria", totalAnswered: 40, correctCount: 32 }, // 80%
      { area: "Cirurgia Geral", totalAnswered: 30, correctCount: 12 }, // 40% (crítico)
      { area: "Clínica Médica", totalAnswered: 50, correctCount: 28 }, // 56% (zona de decisão)
      { area: "Ginecologia e Obstetrícia", totalAnswered: 20, correctCount: 14 }, // 70%
    ];

    const sorted = sortAreasByGainOpportunity(rawAreas, 60);

    // Primeiro deve ser a área com menor acerto (Cirurgia Geral, 40%)
    expect(sorted[0].area).toBe("Cirurgia Geral");
    expect(sorted[0].percentage).toBe(40);
    expect(sorted[0].status).toBe("critico");
    expect(sorted[0].actionSuggested).toContain("Praticar lista dirigida");

    // Segundo deve ser Clínica Médica (56%, zona de decisão)
    expect(sorted[1].area).toBe("Clínica Médica");
    expect(sorted[1].percentage).toBe(56);
    expect(sorted[1].status).toBe("zona_decisao");
    expect(sorted[1].actionSuggested).toContain("Revisar erros");

    // Último deve ser a área com maior nota (Pediatria, 80%)
    expect(sorted[3].area).toBe("Pediatria");
    expect(sorted[3].percentage).toBe(80);
    expect(sorted[3].status).toBe("seguro");
  });

  it("AL-01: calcula 'Próximo passo' com o porquê apontando para a maior oportunidade de ganho", () => {
    const areas = sortAreasByGainOpportunity([
      { area: "Saúde Coletiva", totalAnswered: 20, correctCount: 9 }, // 45% (crítico)
      { area: "Clínica Médica", totalAnswered: 30, correctCount: 24 }, // 80%
    ]);

    const recommendation = calculateNextStepRecommendation({
      areas,
      pendingExamsCount: 0,
      pendingInterventionsCount: 1,
    });

    expect(recommendation.priorityArea).toBe("Saúde Coletiva");
    expect(recommendation.currentScore).toBe(45);
    expect(recommendation.gapToTarget).toBe(15);
    expect(recommendation.urgency).toBe("alta");
    expect(recommendation.rationale).toContain("Seu aproveitamento atual em Saúde Coletiva é de 45%");
    // Prioriza lista atribuída se houver pendência
    expect(recommendation.recommendedAction).toContain("concluir lista de exercícios atribuída");
  });

  it("AL-02: calcula linha do tempo comparando com média da turma sem incluir ranking e sem posição", () => {
    const exams = [
      {
        examId: "e2",
        examTitle: "Simulado 2",
        date: "2026-10-15",
        studentScore: 68,
        classAverage: 62,
        isReleased: true,
        totalQuestions: 50,
        wrongCount: 16,
      },
      {
        examId: "e1",
        examTitle: "Simulado 1",
        date: "2026-05-10",
        studentScore: 54,
        classAverage: 58,
        isReleased: true,
        totalQuestions: 50,
        wrongCount: 23,
      },
    ];

    const evolution = calculateStudentEvolutionTimeline(exams);

    // Deve ordenar cronologicamente
    expect(evolution.timeline[0].examId).toBe("e1");
    expect(evolution.timeline[1].examId).toBe("e2");

    // Deve conter notas e deltas vs turma
    expect(evolution.timeline[0].studentScore).toBe(54);
    expect(evolution.timeline[0].classAverage).toBe(58);
    expect(evolution.timeline[0].deltaVsClass).toBe(-4);

    expect(evolution.timeline[1].studentScore).toBe(68);
    expect(evolution.timeline[1].classAverage).toBe(62);
    expect(evolution.timeline[1].deltaVsClass).toBe(6);

    // Médias consolidadas
    expect(evolution.overallAverage).toBe(61);
    expect(evolution.classOverallAverage).toBe(60);

    // Garantia explícita: não possui propriedades de ranking nem de posição
    expect((evolution as unknown as Record<string, unknown>).ranking).toBeUndefined();
    expect((evolution as unknown as Record<string, unknown>).position).toBeUndefined();
  });
});
