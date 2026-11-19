import { describe, it, expect } from "vitest";
import {
  evaluateStudentReadiness,
  calculateClassReadinessDistribution,
  isReadinessConfigActive,
  DEFAULT_READINESS_CONFIG,
  type ReadinessConfig,
  type StudentReadinessInput,
} from "../readiness";

describe("Indicador de Prontidão Acadêmica (ESPEC-B2B 4.9 / P22)", () => {
  const baseStudent: StudentReadinessInput = {
    studentUserId: "st-1",
    studentName: "Lucas Mendes",
    registration: "20261001",
    classGroupId: "cg-1",
    classGroupLabel: "MED 8º Período (2026.2)",
    questionsAnsweredCount: 11200, // Atingiu volume (>= 10.000)
    examHistory: [
      { examId: "e1", examTitle: "Simulado 1", date: "2026-03-10", scorePercentage: 64.0 },
      { examId: "e2", examTitle: "Simulado 2", date: "2026-06-15", scorePercentage: 58.0 },
      { examId: "e3", examTitle: "Simulado 3", date: "2026-09-20", scorePercentage: 66.5 },
      { examId: "e4", examTitle: "Simulado 4", date: "2026-11-05", scorePercentage: 71.0 },
    ], // 3 simulados >= 60%
  };

  it("não exibe o indicador se os parâmetros estiverem em branco ou ambas as regras desligadas", () => {
    const blankConfig: ReadinessConfig = {
      volumeRuleEnabled: false,
      minQuestionsYear: null,
      consistencyRuleEnabled: false,
      minScorePercent: null,
      minExamsCount: null,
      levelLabels: { high: "No caminho", medium: "Em atenção", low: "Distante" },
      showToStudents: false,
    };

    expect(isReadinessConfigActive(blankConfig)).toBe(false);

    const result = evaluateStudentReadiness(baseStudent, blankConfig);
    expect(result.isConfigured).toBe(false);
    expect(result.unconfiguredReason).toContain("Parâmetros de prontidão não configurados");
  });

  it("classifica como 'No caminho' (nível alto) quando o aluno cumpre ambas as regras", () => {
    const result = evaluateStudentReadiness(baseStudent, DEFAULT_READINESS_CONFIG);

    expect(result.isConfigured).toBe(true);
    expect(result.level).toBe("alto");
    expect(result.levelLabel).toBe("No caminho");
    expect(result.volumeFulfilled).toBe(true);
    expect(result.consistencyFulfilled).toBe(true);
    expect(result.missingRequirementsText).toBe("Metas plenamente atingidas");
  });

  it("classifica como 'Em atenção' (nível médio) quando cumpre volume mas falta simulado", () => {
    const studentMissingExams: StudentReadinessInput = {
      ...baseStudent,
      questionsAnsweredCount: 12000, // cumpriu volume
      examHistory: [
        { examId: "e1", examTitle: "Simulado 1", date: "2026-03-10", scorePercentage: 54.0 },
        { examId: "e2", examTitle: "Simulado 2", date: "2026-06-15", scorePercentage: 58.0 },
        { examId: "e3", examTitle: "Simulado 3", date: "2026-09-20", scorePercentage: 65.0 }, // apenas 1 simulado >= 60%
      ],
    };

    const result = evaluateStudentReadiness(studentMissingExams, DEFAULT_READINESS_CONFIG);

    expect(result.level).toBe("medio");
    expect(result.levelLabel).toBe("Em atenção");
    expect(result.volumeFulfilled).toBe(true);
    expect(result.consistencyFulfilled).toBe(false);
    expect(result.missingRequirementsText).toContain("Faltam 2 simulado(s) com nota ≥ 60%");
  });

  it("classifica como 'Em atenção' (nível médio) quando cumpre simulados mas falta volume de questões", () => {
    const studentMissingVolume: StudentReadinessInput = {
      ...baseStudent,
      questionsAnsweredCount: 6500, // faltam 3.500 questões para 10.000
    };

    const result = evaluateStudentReadiness(studentMissingVolume, DEFAULT_READINESS_CONFIG);

    expect(result.level).toBe("medio");
    expect(result.levelLabel).toBe("Em atenção");
    expect(result.volumeFulfilled).toBe(false);
    expect(result.consistencyFulfilled).toBe(true);
    expect(result.volumeRemaining).toBe(3500);
    expect(result.missingRequirementsText).toContain("Faltam 3.500 questões no ano letivo");
  });

  it("classifica como 'Distante' (nível baixo) quando não cumpre nenhuma das duas regras", () => {
    const studentLow: StudentReadinessInput = {
      ...baseStudent,
      questionsAnsweredCount: 3000,
      examHistory: [
        { examId: "e1", examTitle: "Simulado 1", date: "2026-03-10", scorePercentage: 48.0 },
      ],
    };

    const result = evaluateStudentReadiness(studentLow, DEFAULT_READINESS_CONFIG);

    expect(result.level).toBe("baixo");
    expect(result.levelLabel).toBe("Distante");
    expect(result.volumeFulfilled).toBe(false);
    expect(result.consistencyFulfilled).toBe(false);
    expect(result.missingRequirementsText).toContain("Faltam 7.000 questões");
    expect(result.missingRequirementsText).toContain("Faltam 3 simulado(s)");
  });

  it("permite alterar N, X e Y e recalcula imediatamente", () => {
    // Aluno com 4.000 questões e 2 simulados com 55%
    const student: StudentReadinessInput = {
      ...baseStudent,
      questionsAnsweredCount: 4000,
      examHistory: [
        { examId: "e1", examTitle: "S1", date: "2026-03", scorePercentage: 55 },
        { examId: "e2", examTitle: "S2", date: "2026-06", scorePercentage: 56 },
      ],
    };

    // Com config padrão (N=10000, X=60, Y=3) -> 'baixo'
    const eval1 = evaluateStudentReadiness(student, DEFAULT_READINESS_CONFIG);
    expect(eval1.level).toBe("baixo");

    // Reconfigurando para N=3500, X=50, Y=2 -> aluno agora cumpre ambas as metas -> 'alto'
    const customConfig: ReadinessConfig = {
      ...DEFAULT_READINESS_CONFIG,
      minQuestionsYear: 3500,
      minScorePercent: 50.0,
      minExamsCount: 2,
    };
    const eval2 = evaluateStudentReadiness(student, customConfig);
    expect(eval2.level).toBe("alto");
    expect(eval2.volumeFulfilled).toBe(true);
    expect(eval2.consistencyFulfilled).toBe(true);
  });

  it("aceita rótulos neutros customizáveis pela instituição médica", () => {
    const customLabelsConfig: ReadinessConfig = {
      ...DEFAULT_READINESS_CONFIG,
      levelLabels: {
        high: "Consistente",
        medium: "Moderado",
        low: "Inicial",
      },
    };

    const evalHigh = evaluateStudentReadiness(baseStudent, customLabelsConfig);
    expect(evalHigh.levelLabel).toBe("Consistente");
  });

  it("calcula a distribuição agregada da turma corretamente", () => {
    const students: StudentReadinessInput[] = [
      baseStudent, // alto
      { ...baseStudent, studentUserId: "st-2", questionsAnsweredCount: 5000 }, // medio
      { ...baseStudent, studentUserId: "st-3", questionsAnsweredCount: 1500, examHistory: [] }, // baixo
      { ...baseStudent, studentUserId: "st-4", questionsAnsweredCount: 1200, examHistory: [] }, // baixo
    ];

    const distribution = calculateClassReadinessDistribution(
      "cg-1",
      "Turma MED P8",
      students,
      DEFAULT_READINESS_CONFIG
    );

    expect(distribution.isConfigured).toBe(true);
    expect(distribution.totalStudents).toBe(4);
    expect(distribution.highCount).toBe(1);
    expect(distribution.mediumCount).toBe(1);
    expect(distribution.lowCount).toBe(2);
    expect(distribution.highPercent).toBe(25);
    expect(distribution.mediumPercent).toBe(25);
    expect(distribution.lowPercent).toBe(50);
  });
});
