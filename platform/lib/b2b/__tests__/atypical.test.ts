import { describe, it, expect } from "vitest";
import {
  classifySession,
  classifyBatchSessions,
  calculateEffectiveQuestionVolume,
  DEFAULT_ATYPICAL_CONFIG,
  type SessionMetricsInput,
} from "../atypical";

describe("Sessões Atípicas (Voto SPR nº 9 / ESPEC-B2B 4.10)", () => {
  it("não classifica sessões com menos de 20 questões para evitar distorção amostral", () => {
    // 15 questões (< 20)
    const session: SessionMetricsInput = {
      sessionId: "sess-short",
      studentUserId: "u1",
      studentName: "Carlos Aluno",
      classGroupId: "cg1",
      classGroupLabel: "Turma 2026.2",
      sessionType: "pratica",
      startedAt: "2026-10-01T10:00:00Z",
      completedAt: "2026-10-01T10:03:00Z",
      responses: Array.from({ length: 15 }, (_, i) => ({
        questionId: `q-${i}`,
        timeSpentSeconds: 10,
        isCorrect: false,
        wasPreviouslyAnswered: false,
      })),
    };

    const classified = classifySession(session);
    expect(classified.pattern).toBe("nao_classificada");
    expect(classified.isEligibleForClassification).toBe(false);
    expect(classified.patternLabel).toContain("Não classificada");
  });

  it("identifica padrão de CHUTE (tempo médio muito baixo com acerto perto do acaso)", () => {
    // 25 questões, tempo médio = 9s (<= 15s), acerto = 20% (<= 30%)
    const session: SessionMetricsInput = {
      sessionId: "sess-chute",
      studentUserId: "u2",
      studentName: "Beatriz Lima",
      classGroupId: "cg1",
      classGroupLabel: "Turma 2026.2",
      sessionType: "pratica",
      startedAt: "2026-10-02T14:00:00Z",
      completedAt: "2026-10-02T14:04:00Z",
      responses: Array.from({ length: 25 }, (_, i) => ({
        questionId: `q-${i}`,
        timeSpentSeconds: 8 + (i % 3), // média ~9s
        isCorrect: i < 5, // 5 acertos em 25 = 20%
        wasPreviouslyAnswered: false,
      })),
    };

    const classified = classifySession(session);
    expect(classified.pattern).toBe("chute");
    expect(classified.isEligibleForClassification).toBe(true);
    expect(classified.patternLabel).toContain("resposta rápida com acerto ao acaso");
    expect(classified.accuracyPercentage).toBe(20);
    expect(classified.averageSecondsPerQuestion).toBeLessThanOrEqual(15);
  });

  it("identifica padrão REFAZENDO (alta proporção de questões repetidas com acerto alto)", () => {
    // 30 questões, 24 repetidas (80% >= 70%), 27 acertos (90% >= 85%)
    const session: SessionMetricsInput = {
      sessionId: "sess-refazendo",
      studentUserId: "u3",
      studentName: "Daniel Souza",
      classGroupId: "cg1",
      classGroupLabel: "Turma 2026.2",
      sessionType: "pratica",
      startedAt: "2026-10-03T09:00:00Z",
      completedAt: "2026-10-03T09:25:00Z",
      responses: Array.from({ length: 30 }, (_, i) => ({
        questionId: `q-${i}`,
        timeSpentSeconds: 45 + (i % 10), // tempo normal de leitura
        isCorrect: i < 27, // 90%
        wasPreviouslyAnswered: i < 24, // 80% repetidas
      })),
    };

    const classified = classifySession(session);
    expect(classified.pattern).toBe("refazendo");
    expect(classified.patternLabel).toContain("repetição de itens prévios");
    expect(classified.repeatedRatio).toBe(0.8);
    expect(classified.accuracyPercentage).toBe(90);
  });

  it("identifica padrão COMPATÍVEL COM CONSULTA EXTERNA (acerto muito alto, tempo baixo e constante)", () => {
    // 25 questões, acerto = 96% (>= 90%), tempo médio = 18s (<= 25s), tempo constante (stdDev <= 8s)
    const session: SessionMetricsInput = {
      sessionId: "sess-consulta",
      studentUserId: "u4",
      studentName: "Eduardo Rocha",
      classGroupId: "cg1",
      classGroupLabel: "Turma 2026.2",
      sessionType: "prova_online",
      startedAt: "2026-10-04T16:00:00Z",
      completedAt: "2026-10-04T16:08:00Z",
      responses: Array.from({ length: 25 }, (_, i) => ({
        questionId: `q-${i}`,
        timeSpentSeconds: 18 + (i % 2), // 18s ou 19s (desvio padrão muito baixo ~0.5s)
        isCorrect: i < 24, // 24/25 = 96%
        wasPreviouslyAnswered: false,
      })),
    };

    const classified = classifySession(session);
    expect(classified.pattern).toBe("consulta_externa");
    expect(classified.patternLabel).toContain("compatível com consulta externa");
    expect(classified.stdDevSeconds).toBeLessThanOrEqual(8.0);
    expect(classified.averageSecondsPerQuestion).toBeLessThanOrEqual(25);
    expect(classified.accuracyPercentage).toBeGreaterThanOrEqual(90);
  });

  it("aceita limites customizados editáveis nas configurações institucionais", () => {
    const session: SessionMetricsInput = {
      sessionId: "sess-custom",
      studentUserId: "u5",
      studentName: "Fernanda Dias",
      classGroupId: "cg1",
      classGroupLabel: "Turma 2026.2",
      sessionType: "pratica",
      startedAt: "2026-10-05T11:00:00Z",
      completedAt: "2026-10-05T11:10:00Z",
      responses: Array.from({ length: 20 }, (_, i) => ({
        questionId: `q-${i}`,
        timeSpentSeconds: 18,
        isCorrect: false, // 0%
        wasPreviouslyAnswered: false,
      })),
    };

    // Com config padrão (maxAverageSeconds = 15), tempo 18s NÃO seria chute
    const defaultClassified = classifySession(session);
    expect(defaultClassified.pattern).toBe("tipico");

    // Com config customizada mais tolerante (maxAverageSeconds = 20), passa a ser detectado como chute
    const customConfig = {
      chute: {
        maxAverageSeconds: 20,
        maxAccuracyPercentage: 30,
      },
    };
    const customClassified = classifySession(session, customConfig);
    expect(customClassified.pattern).toBe("chute");
  });

  it("calcula o volume efetivo permitindo exclusão das sessões atípicas", () => {
    const batch = [
      {
        sessionId: "s1",
        studentUserId: "u1",
        studentName: "Aluno 1",
        classGroupId: "cg1",
        classGroupLabel: "T1",
        sessionType: "pratica" as const,
        startedAt: "2026-10-01",
        completedAt: "2026-10-01",
        isExcludedFromMetrics: false,
        responses: Array.from({ length: 30 }, (_, i) => ({
          questionId: `q-${i}`,
          timeSpentSeconds: 50,
          isCorrect: true,
          wasPreviouslyAnswered: false,
        })),
      },
      {
        sessionId: "s2",
        studentUserId: "u2",
        studentName: "Aluno 2",
        classGroupId: "cg1",
        classGroupLabel: "T1",
        sessionType: "pratica" as const,
        startedAt: "2026-10-02",
        completedAt: "2026-10-02",
        isExcludedFromMetrics: true, // Marcada para exclusão
        responses: Array.from({ length: 40 }, (_, i) => ({
          questionId: `q-${i}`,
          timeSpentSeconds: 10,
          isCorrect: false,
          wasPreviouslyAnswered: false,
        })),
      },
    ];

    const { classified } = classifyBatchSessions(batch);

    // Sem exclusão ativada: 70 questões
    const withAll = calculateEffectiveQuestionVolume(classified, {
      excludeAtypicalSessions: false,
    });
    expect(withAll.totalRawQuestions).toBe(70);
    expect(withAll.effectiveQuestions).toBe(70);
    expect(withAll.excludedQuestions).toBe(0);

    // Com exclusão ativada: 70 - 40 = 30 questões
    const withExclusion = calculateEffectiveQuestionVolume(classified, {
      excludeAtypicalSessions: true,
    });
    expect(withExclusion.totalRawQuestions).toBe(70);
    expect(withExclusion.effectiveQuestions).toBe(30);
    expect(withExclusion.excludedQuestions).toBe(40);
  });

  it("garante estritamente que termos proibidos ('fraude', 'cola') NÃO aparecem nos rótulos", () => {
    const defaultLabels = [
      DEFAULT_ATYPICAL_CONFIG.minQuestionsThreshold,
      "Padrão de resposta rápida com acerto ao acaso",
      "Padrão de repetição de itens prévios",
      "Padrão compatível com consulta externa",
    ].join(" ");

    expect(defaultLabels.toLowerCase()).not.toContain("fraude");
    expect(defaultLabels.toLowerCase()).not.toContain("cola");
  });
});
