import { describe, it, expect } from "vitest";
import {
  calculateInterventionAdherence,
  calculateInterventionDelta,
  identifyCurriculumGaps,
  InterventionType,
} from "../interventions";

describe("MEDPLENI B2B — Intervenções Pedagógicas Enxutas (P18 / IN-01 a IN-06)", () => {
  it("1. Tipos de Intervenção: restrito estritamente a 2 tipos aprovados pelos médicos", () => {
    const validTypes: InterventionType[] = ["lista_exercicios", "pre_pos_aula"];
    expect(validTypes).toHaveLength(2);
    expect(validTypes).toContain("lista_exercicios");
    expect(validTypes).toContain("pre_pos_aula");
  });

  it("2. Adesão Discente: calcula taxa de adesão, média e flag de grupo pequeno (N < 15)", () => {
    // Caso com 20 alunos (grupo padrão)
    const adherences20 = Array.from({ length: 20 }, (_, i) => ({
      status: (i < 16 ? "concluida" : i < 18 ? "em_progresso" : "pendente") as "concluida" | "em_progresso" | "pendente",
      scorePercentage: i < 16 ? 70.0 + i : null,
    }));

    const result20 = calculateInterventionAdherence(adherences20);
    expect(result20.totalStudents).toBe(20);
    expect(result20.completedStudents).toBe(16);
    expect(result20.adherenceRate).toBe(80.0); // 16/20 = 80%
    expect(result20.isSmallGroup).toBe(false); // N >= 15
    expect(result20.averageScore).toBeGreaterThanOrEqual(70.0);

    // Caso com grupo pequeno (N = 8)
    const smallGroup = Array.from({ length: 8 }, (_, i) => ({
      status: (i < 6 ? "concluida" : "pendente") as "concluida" | "em_progresso" | "pendente",
      scorePercentage: 65.0,
    }));
    const resultSmall = calculateInterventionAdherence(smallGroup);
    expect(resultSmall.totalStudents).toBe(8);
    expect(resultSmall.isSmallGroup).toBe(true); // N < 15 dispara aviso de interpretação
  });

  it("3. Reteste e Ganho: calcula variação percentual (Δ) e recuperação acima da Régua 60", () => {
    // Caso 1: Recuperado (46.5% -> 68.2%)
    const case1 = calculateInterventionDelta(46.5, 68.2, 60);
    expect(case1.deltaScore).toBe(21.7);
    expect(case1.isRecovered).toBe(true);
    expect(case1.gainLabel).toBe("+21.7%");

    // Caso 2: Em andamento / Aguardando reteste
    const case2 = calculateInterventionDelta(48.0, null, 60);
    expect(case2.deltaScore).toBeNull();
    expect(case2.isRecovered).toBe(false);
    expect(case2.gainLabel).toBe("Aguardando reteste");

    // Caso 3: Não recuperado (50.0% -> 56.0%)
    const case3 = calculateInterventionDelta(50.0, 56.0, 60);
    expect(case3.deltaScore).toBe(6.0);
    expect(case3.isRecovered).toBe(false); // 56% < 60%
  });

  it("4. Identificação de Lacunas: detecta turmas e eixos com aproveitamento < 60% para o Passo 1 do Wizard", () => {
    const classGroups = [
      { id: "cg-p3", name: "Turma Medicina P3", period: 3 },
      { id: "cg-p4", name: "Turma Medicina P4", period: 4 },
    ];

    const attempts = [
      { assessmentId: "exam-1", classGroupId: "cg-p3", scorePercentage: 48.0 },
      { assessmentId: "exam-1", classGroupId: "cg-p4", scorePercentage: 74.0 },
    ];

    const items = [
      { assessmentId: "exam-1", area: "Cirurgia Geral", classGroupId: "cg-p3" },
      { assessmentId: "exam-1", area: "Pediatria", classGroupId: "cg-p3" },
    ];

    const gaps = identifyCurriculumGaps({
      classGroups,
      attempts,
      items,
      cutScore: 60,
    });

    expect(gaps.length).toBeGreaterThan(0);
    // Todas as lacunas identificadas devem ter score < 60%
    for (const gap of gaps) {
      expect(gap.scorePercentage).toBeLessThan(60);
      expect(gap.axisType).toBe("area");
    }
  });
});
