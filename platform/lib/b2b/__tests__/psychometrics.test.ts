/**
 * MEDPLENI B2B — psychometrics.test.ts
 * Suíte de testes automatizados para análise psicométrica (PR-09 / QB-12)
 *
 * Contém:
 * 1. Teste com conjunto de dados resolvido à mão passo a passo (documentado abaixo)
 * 2. Casos de borda: todos acertam, todos erram, variância zero, itens anulados
 * 3. Amostra menor que o mínimo (n < 10) e amostra pequena (10 <= n < 30)
 * 4. Sinais: discriminação negativa, discriminação baixa, muito fácil, muito difícil, distrator dominante
 */

import { describe, it, expect } from "vitest";
import {
  calculateFacilityIndex,
  calculateDiscriminationIndex,
  calculateCorrectedPointBiserial,
  calculatePopulationVariance,
  calculateKR20,
  getKR20Interpretation,
  calculateOptionFrequencies,
  evaluateItemFlags,
  calculateExamPsychometrics,
  type ExamItemInput,
  type StudentExamAttemptInput,
} from "../psychometrics";
import { DEFAULT_PSYCHOMETRICS_CONFIG } from "../psychometrics-config";

describe("B2B Psychometrics Engine (PR-09 / QB-12)", () => {
  /**
   * ───────────────────────────────────────────────────────────────────────────
   * CONJUNTO DE DADOS RESOLVIDO À MÃO:
   *
   * n = 10 alunos (S1 a S10)
   * k = 4 questões válidas (Q1 gab A, Q2 gab B, Q3 gab C, Q4 gab D)
   *
   * Matriz de Acertos (1 = acerto, 0 = erro):
   * Aluno | Q1 (A) | Q2 (B) | Q3 (C) | Q4 (D) | Nota Total X
   * ------+--------+--------+--------+--------+-------------
   * S1    |   1    |   1    |   1    |   1    | 4
   * S2    |   1    |   1    |   1    |   1    | 4
   * S3    |   1    |   1    |   1    |   0    | 3
   * S4    |   1    |   1    |   0    |   1    | 3
   * S5    |   1    |   0    |   1    |   1    | 3
   * S6    |   0    |   1    |   1    |   0    | 2
   * S7    |   1    |   0    |   0    |   1    | 2
   * S8    |   0    |   1    |   0    |   0    | 1
   * S9    |   0    |   0    |   1    |   0    | 1
   * S10   |   0    |   0    |   0    |   0    | 0
   *
   * 1. Total Scores X = [4, 4, 3, 3, 3, 2, 2, 1, 1, 0]
   *    Soma = 23 -> Média = 2.3
   *    Desvios (X - 2.3)^2 = [2.89, 2.89, 0.49, 0.49, 0.49, 0.09, 0.09, 1.69, 1.69, 5.29]
   *    Soma dos quadrados = 16.10
   *    Variância Populacional σ² = 16.10 / 10 = 1.61
   *
   * 2. Facilidade (p):
   *    Q1: 6 acertos / 10 = 0.60 -> p(1 - p) = 0.60 * 0.40 = 0.24
   *    Q2: 6 acertos / 10 = 0.60 -> p(1 - p) = 0.60 * 0.40 = 0.24
   *    Q3: 6 acertos / 10 = 0.60 -> p(1 - p) = 0.60 * 0.40 = 0.24
   *    Q4: 5 acertos / 10 = 0.50 -> p(1 - p) = 0.50 * 0.50 = 0.25
   *    Σ p_i(1 - p_i) = 0.24 + 0.24 + 0.24 + 0.25 = 0.97
   *
   * 3. KR-20:
   *    k / (k - 1) = 4 / 3 = 1.3333333333...
   *    1 - (0.97 / 1.61) = 1 - 0.602484472... = 0.39751552795...
   *    KR-20 = (4 / 3) * 0.39751552795... = 0.5300207... ≈ 0.5300
   *
   * 4. Discriminação D (27% extremos):
   *    n = 10 -> round(0.27 * 10) = 3 alunos por grupo
   *    Grupo Superior (Top 3): S1, S2, S3
   *    Grupo Inferior (Bottom 3): S8, S9, S10
   *    Q1: Top 3 acertos = 3/3 (1.00); Bottom 3 acertos = 0/3 (0.00) -> D = 1.00
   *    Q2: Top 3 acertos = 3/3 (1.00); Bottom 3 acertos = 1/3 (0.3333) -> D = 0.6667
   *    Q3: Top 3 acertos = 3/3 (1.00); Bottom 3 acertos = 1/3 (0.3333) -> D = 0.6667
   *    Q4: Top 3 acertos = 2/3 (0.6667); Bottom 3 acertos = 0/3 (0.00) -> D = 0.6667
   *
   * 5. Ponto-Bisserial Corrigida r (Pearson entre y_j e X_{j, -i}):
   *    Para Q1:
   *    y_1 = [1, 1, 1, 1, 1, 0, 1, 0, 0, 0] (média = 0.60)
   *    X_{-1} = X - y_1 = [3, 3, 2, 2, 2, 2, 1, 1, 1, 0] (média = 1.70)
   *    Numerador Cov(Y, Z) * n = Σ (y - 0.6)(X_-1 - 1.7) = 2.80
   *    Denominador = sqrt( Σ(y - 0.6)² * Σ(X_-1 - 1.7)² ) = sqrt(2.40 * 8.10) = sqrt(19.44) ≈ 4.40908
   *    r_1 = 2.80 / 4.40908 ≈ 0.63505... ≈ 0.6351
   * ───────────────────────────────────────────────────────────────────────────
   */

  const solvedItems: ExamItemInput[] = [
    {
      id: "item-1",
      orderIndex: 1,
      statement: "Enunciado da Questão 1",
      correctLetter: "A",
      status: "valido",
      area: "Clínica Médica",
      options: [
        { letter: "A", text: "Alternativa A", is_correct: true },
        { letter: "B", text: "Alternativa B", is_correct: false },
        { letter: "C", text: "Alternativa C", is_correct: false },
        { letter: "D", text: "Alternativa D", is_correct: false },
      ],
    },
    {
      id: "item-2",
      orderIndex: 2,
      statement: "Enunciado da Questão 2",
      correctLetter: "B",
      status: "valido",
      area: "Cirurgia",
      options: [
        { letter: "A", text: "Alternativa A", is_correct: false },
        { letter: "B", text: "Alternativa B", is_correct: true },
        { letter: "C", text: "Alternativa C", is_correct: false },
        { letter: "D", text: "Alternativa D", is_correct: false },
      ],
    },
    {
      id: "item-3",
      orderIndex: 3,
      statement: "Enunciado da Questão 3",
      correctLetter: "C",
      status: "valido",
      area: "Pediatria",
      options: [
        { letter: "A", text: "Alternativa A", is_correct: false },
        { letter: "B", text: "Alternativa B", is_correct: false },
        { letter: "C", text: "Alternativa C", is_correct: true },
        { letter: "D", text: "Alternativa D", is_correct: false },
      ],
    },
    {
      id: "item-4",
      orderIndex: 4,
      statement: "Enunciado da Questão 4",
      correctLetter: "D",
      status: "valido",
      area: "Ginecologia e Obstetrícia",
      options: [
        { letter: "A", text: "Alternativa A", is_correct: false },
        { letter: "B", text: "Alternativa B", is_correct: false },
        { letter: "C", text: "Alternativa C", is_correct: false },
        { letter: "D", text: "Alternativa D", is_correct: true },
      ],
    },
  ];

  const solvedAttempts: StudentExamAttemptInput[] = [
    {
      studentUserId: "s1",
      status: "finalizada",
      answers: new Map([
        ["item-1", "A"],
        ["item-2", "B"],
        ["item-3", "C"],
        ["item-4", "D"],
      ]),
    },
    {
      studentUserId: "s2",
      status: "finalizada",
      answers: new Map([
        ["item-1", "A"],
        ["item-2", "B"],
        ["item-3", "C"],
        ["item-4", "D"],
      ]),
    },
    {
      studentUserId: "s3",
      status: "finalizada",
      answers: new Map([
        ["item-1", "A"],
        ["item-2", "B"],
        ["item-3", "C"],
        ["item-4", "A"], // erro
      ]),
    },
    {
      studentUserId: "s4",
      status: "finalizada",
      answers: new Map([
        ["item-1", "A"],
        ["item-2", "B"],
        ["item-3", "A"], // erro
        ["item-4", "D"],
      ]),
    },
    {
      studentUserId: "s5",
      status: "finalizada",
      answers: new Map([
        ["item-1", "A"],
        ["item-2", "A"], // erro
        ["item-3", "C"],
        ["item-4", "D"],
      ]),
    },
    {
      studentUserId: "s6",
      status: "finalizada",
      answers: new Map([
        ["item-1", "B"], // erro
        ["item-2", "B"],
        ["item-3", "C"],
        ["item-4", "A"], // erro
      ]),
    },
    {
      studentUserId: "s7",
      status: "finalizada",
      answers: new Map([
        ["item-1", "A"],
        ["item-2", "C"], // erro
        ["item-3", "B"], // erro
        ["item-4", "D"],
      ]),
    },
    {
      studentUserId: "s8",
      status: "finalizada",
      answers: new Map([
        ["item-1", "C"], // erro
        ["item-2", "B"],
        ["item-3", "A"], // erro
        ["item-4", "B"], // erro
      ]),
    },
    {
      studentUserId: "s9",
      status: "finalizada",
      answers: new Map([
        ["item-1", "D"], // erro
        ["item-2", "A"], // erro
        ["item-3", "C"],
        ["item-4", "C"], // erro
      ]),
    },
    {
      studentUserId: "s10",
      status: "finalizada",
      answers: new Map([
        ["item-1", "B"], // erro
        ["item-2", "D"], // erro
        ["item-3", "B"], // erro
        ["item-4", "A"], // erro
      ]),
    },
  ];

  it("1. bate exatamente com os cálculos manuais documentados (n = 10, k = 4)", () => {
    const result = calculateExamPsychometrics({
      items: solvedItems,
      attempts: solvedAttempts,
    });

    // Verificação geral da prova
    expect(result.sampleSize).toBe(10);
    expect(result.validItemsCount).toBe(4);
    expect(result.meanScore).toBe(2.3);
    expect(result.scoreVariance).toBe(1.61);

    // KR-20 manual: 0.5300
    expect(result.kr20).toBeCloseTo(0.53, 2);
    expect(result.isSmallSample).toBe(true);
    expect(result.isSampleBelowMinimum).toBe(false);

    // Q1
    const q1 = result.items.find((i) => i.itemId === "item-1")!;
    expect(q1.facilityIndex).toBe(0.60);
    expect(q1.discriminationIndex).toBe(1.00);
    expect(q1.correctedPointBiserial).toBeCloseTo(0.6351, 3);

    // Q2
    const q2 = result.items.find((i) => i.itemId === "item-2")!;
    expect(q2.facilityIndex).toBe(0.60);
    expect(q2.discriminationIndex).toBeCloseTo(0.6667, 3);

    // Q3
    const q3 = result.items.find((i) => i.itemId === "item-3")!;
    expect(q3.facilityIndex).toBe(0.60);
    expect(q3.discriminationIndex).toBeCloseTo(0.6667, 3);

    // Q4
    const q4 = result.items.find((i) => i.itemId === "item-4")!;
    expect(q4.facilityIndex).toBe(0.50);
    expect(q4.discriminationIndex).toBeCloseTo(0.6667, 3);
  });

  it("2. caso de borda: todos acertam (p = 1.0) -> r é null e gera flag 'Muito fácil'", () => {
    const items: ExamItemInput[] = [
      {
        id: "item-all-correct",
        orderIndex: 1,
        statement: "Questão que todos acertaram",
        correctLetter: "A",
        status: "valido",
        options: [{ letter: "A", text: "Correta", is_correct: true }],
      },
      {
        id: "item-mix",
        orderIndex: 2,
        statement: "Questão normal",
        correctLetter: "B",
        status: "valido",
        options: [{ letter: "B", text: "Correta", is_correct: true }],
      },
    ];

    const attempts: StudentExamAttemptInput[] = Array.from({ length: 10 }, (_, idx) => ({
      studentUserId: `stu-${idx}`,
      status: "finalizada",
      answers: new Map([
        ["item-all-correct", "A"], // Todos marcam A
        ["item-mix", idx < 5 ? "B" : "A"], // 5 acertam, 5 erram
      ]),
    }));

    const result = calculateExamPsychometrics({ items, attempts });
    const targetItem = result.items.find((i) => i.itemId === "item-all-correct")!;

    expect(targetItem.facilityIndex).toBe(1.0);
    expect(targetItem.discriminationIndex).toBe(0.0);
    // Variância do item é zero, portanto correlação ponto-bisserial é null
    expect(targetItem.correctedPointBiserial).toBeNull();
    // Gera flag 'muito_facil'
    expect(targetItem.flags.some((f) => f.type === "muito_facil")).toBe(true);
  });

  it("3. caso de borda: todos erram (p = 0.0) -> r é null e gera flag 'Muito difícil'", () => {
    const items: ExamItemInput[] = [
      {
        id: "item-all-wrong",
        orderIndex: 1,
        statement: "Questão que todos erraram",
        correctLetter: "A",
        status: "valido",
        options: [{ letter: "A", text: "Correta", is_correct: true }],
      },
      {
        id: "item-mix",
        orderIndex: 2,
        statement: "Questão normal",
        correctLetter: "B",
        status: "valido",
        options: [{ letter: "B", text: "Correta", is_correct: true }],
      },
    ];

    const attempts: StudentExamAttemptInput[] = Array.from({ length: 10 }, (_, idx) => ({
      studentUserId: `stu-${idx}`,
      status: "finalizada",
      answers: new Map([
        ["item-all-wrong", "B"], // Todos erram marcando B
        ["item-mix", idx < 5 ? "B" : "A"],
      ]),
    }));

    const result = calculateExamPsychometrics({ items, attempts });
    const targetItem = result.items.find((i) => i.itemId === "item-all-wrong")!;

    expect(targetItem.facilityIndex).toBe(0.0);
    expect(targetItem.discriminationIndex).toBe(0.0);
    expect(targetItem.correctedPointBiserial).toBeNull();
    expect(targetItem.flags.some((f) => f.type === "muito_dificil")).toBe(true);
  });

  it("4. caso de borda: variância total zero (todos tiram a mesma nota) -> KR-20 é null", () => {
    const items: ExamItemInput[] = [
      {
        id: "item-1",
        orderIndex: 1,
        statement: "Q1",
        correctLetter: "A",
        status: "valido",
        options: [{ letter: "A", text: "A", is_correct: true }],
      },
      {
        id: "item-2",
        orderIndex: 2,
        statement: "Q2",
        correctLetter: "B",
        status: "valido",
        options: [{ letter: "B", text: "B", is_correct: true }],
      },
    ];

    // Todos os 10 alunos acertam Q1 e erram Q2 -> nota 1 para todos
    const attempts: StudentExamAttemptInput[] = Array.from({ length: 10 }, (_, idx) => ({
      studentUserId: `stu-${idx}`,
      status: "finalizada",
      answers: new Map([
        ["item-1", "A"],
        ["item-2", "A"],
      ]),
    }));

    const result = calculateExamPsychometrics({ items, attempts });
    expect(result.scoreVariance).toBe(0);
    expect(result.kr20).toBeNull();
    expect(result.kr20Interpretation).toContain("dispersão nula");
  });

  it("5. caso de borda: itens anulados são excluídos de k e de KR-20", () => {
    const itemsWithAnnulled: ExamItemInput[] = [
      ...solvedItems,
      {
        id: "item-annulled",
        orderIndex: 5,
        statement: "Questão Anulada por Recurso",
        correctLetter: "A",
        status: "anulado",
        options: [{ letter: "A", text: "A", is_correct: true }],
      },
    ];

    const attemptsWithAnnulled: StudentExamAttemptInput[] = solvedAttempts.map((att) => {
      const map = new Map(att.answers);
      map.set("item-annulled", "B");
      return {
        ...att,
        answers: map,
      };
    });

    const result = calculateExamPsychometrics({
      items: itemsWithAnnulled,
      attempts: attemptsWithAnnulled,
    });

    // 5 itens no total, mas apenas 4 válidos
    expect(result.totalItems).toBe(5);
    expect(result.validItemsCount).toBe(4);
    expect(result.annulledItemsCount).toBe(1);

    // O KR-20 deve permanecer exatamente o mesmo das 4 válidas (0.53)
    expect(result.kr20).toBeCloseTo(0.53, 2);

    const annulledItem = result.items.find((i) => i.itemId === "item-annulled")!;
    expect(annulledItem.isAnulado).toBe(true);
    expect(annulledItem.facilityIndex).toBeNull();
    expect(annulledItem.discriminationIndex).toBeNull();
    expect(annulledItem.correctedPointBiserial).toBeNull();
  });

  it("6. amostra menor que o mínimo (n < 10) -> não calcula D, r nem KR-20", () => {
    // Apenas 6 alunos finalizados
    const smallAttempts = solvedAttempts.slice(0, 6);

    const result = calculateExamPsychometrics({
      items: solvedItems,
      attempts: smallAttempts,
    });

    expect(result.sampleSize).toBe(6);
    expect(result.isSampleBelowMinimum).toBe(true);
    expect(result.kr20).toBeNull();
    expect(result.sampleWarningMessage).toContain("Amostra insuficiente (n = 6");

    for (const item of result.items) {
      // Facilidade simples ainda é calculada
      expect(item.facilityIndex).not.toBeNull();
      // Mas D e r são obrigatoriamente null
      expect(item.discriminationIndex).toBeNull();
      expect(item.correctedPointBiserial).toBeNull();
    }
  });

  it("7. amostra pequena (10 <= n < 30) -> calcula índices mas exibe aviso", () => {
    // 15 alunos finalizados
    const attempts15: StudentExamAttemptInput[] = [
      ...solvedAttempts,
      ...solvedAttempts.slice(0, 5).map((a, idx) => ({
        ...a,
        studentUserId: `extra-${idx}`,
      })),
    ];

    const result = calculateExamPsychometrics({
      items: solvedItems,
      attempts: attempts15,
    });

    expect(result.sampleSize).toBe(15);
    expect(result.isSmallSample).toBe(true);
    expect(result.isSampleBelowMinimum).toBe(false);
    expect(result.kr20).not.toBeNull();
    expect(result.sampleWarningMessage).toContain("Amostra pequena (n = 15");
  });

  it("8. sinal: discriminação negativa (r < 0)", () => {
    // Cria item invertido: alunos mais fracos acertam e os fortes erram
    const items: ExamItemInput[] = [
      {
        id: "item-inverted",
        orderIndex: 1,
        statement: "Item com pegadinha ambígua",
        correctLetter: "A",
        status: "valido",
        options: [{ letter: "A", text: "A", is_correct: true }],
      },
      {
        id: "item-normal-1",
        orderIndex: 2,
        statement: "Item normal 1",
        correctLetter: "B",
        status: "valido",
        options: [{ letter: "B", text: "B", is_correct: true }],
      },
      {
        id: "item-normal-2",
        orderIndex: 3,
        statement: "Item normal 2",
        correctLetter: "C",
        status: "valido",
        options: [{ letter: "C", text: "C", is_correct: true }],
      },
    ];

    // 10 alunos:
    // Alunos 0 a 4 acertam os itens normais (nota 2), mas erram o item invertido (marcam B)
    // Alunos 5 a 9 erram os normais (nota 0), mas acertam o item invertido (marcam A)
    const attempts: StudentExamAttemptInput[] = Array.from({ length: 10 }, (_, idx) => ({
      studentUserId: `stu-${idx}`,
      status: "finalizada",
      answers: new Map([
        ["item-inverted", idx >= 5 ? "A" : "B"], // Invertido
        ["item-normal-1", idx < 5 ? "B" : "A"],
        ["item-normal-2", idx < 5 ? "C" : "A"],
      ]),
    }));

    const result = calculateExamPsychometrics({ items, attempts });
    const invertedItem = result.items.find((i) => i.itemId === "item-inverted")!;

    expect(invertedItem.correctedPointBiserial).toBeLessThan(0);
    expect(invertedItem.flags.some((f) => f.type === "discriminacao_negativa")).toBe(true);
  });

  it("9. sinal: distrator dominante (alternativa errada mais marcada que o gabarito)", () => {
    const items: ExamItemInput[] = [
      {
        id: "item-distractor",
        orderIndex: 1,
        statement: "Item com distrator atrativo B",
        correctLetter: "A",
        status: "valido",
        options: [
          { letter: "A", text: "Gabarito", is_correct: true },
          { letter: "B", text: "Distrator Muito Atraente", is_correct: false },
          { letter: "C", text: "Distrator Neutro", is_correct: false },
        ],
      },
      {
        id: "item-mix",
        orderIndex: 2,
        statement: "Item auxiliar",
        correctLetter: "A",
        status: "valido",
        options: [{ letter: "A", text: "A", is_correct: true }],
      },
    ];

    // 10 alunos: 2 marcam o gabarito A, 7 marcam o distrator B, 1 marca C
    const attempts: StudentExamAttemptInput[] = Array.from({ length: 10 }, (_, idx) => ({
      studentUserId: `stu-${idx}`,
      status: "finalizada",
      answers: new Map([
        ["item-distractor", idx < 2 ? "A" : idx < 9 ? "B" : "C"],
        ["item-mix", "A"],
      ]),
    }));

    const result = calculateExamPsychometrics({ items, attempts });
    const distractorItem = result.items.find((i) => i.itemId === "item-distractor")!;

    expect(distractorItem.dominantDistractorLetter).toBe("B");
    expect(distractorItem.flags.some((f) => f.type === "distrator_dominante")).toBe(true);
  });

  it("10. validação direta das funções puras individuais", () => {
    // Facilidade
    expect(calculateFacilityIndex(15, 20)).toBe(0.75);
    expect(calculateFacilityIndex(0, 0)).toBeNull();

    // Variância populacional
    expect(calculatePopulationVariance([2, 4, 4, 4, 5, 5, 7, 9])).toBe(4.0);

    // Discriminação
    expect(calculateDiscriminationIndex(8, 2, 10, 30, DEFAULT_PSYCHOMETRICS_CONFIG)).toBe(0.6);
    expect(calculateDiscriminationIndex(8, 2, 10, 5, DEFAULT_PSYCHOMETRICS_CONFIG)).toBeNull(); // n < 10

    // Ponto-Bisserial Corrigida
    const itemVec = [1, 1, 1, 0, 0, 1, 0, 0, 1, 0];
    const totalWithout = [5, 4, 6, 2, 1, 4, 2, 3, 5, 1];
    const r = calculateCorrectedPointBiserial(itemVec, totalWithout, DEFAULT_PSYCHOMETRICS_CONFIG);
    expect(r).toBeGreaterThan(0.7);

    // KR-20
    const kr = calculateKR20([0.5, 0.6, 0.7, 0.8], [2, 3, 3, 4, 2, 1, 3, 2, 4, 1]);
    expect(kr).toBeDefined();

    // Interpretações
    expect(getKR20Interpretation(0.85)).toContain("Excelente");
    expect(getKR20Interpretation(0.75)).toContain("Boa");
    expect(getKR20Interpretation(0.65)).toContain("moderada");
    expect(getKR20Interpretation(0.45)).toContain("Baixa");
    expect(getKR20Interpretation(null)).toContain("Amostra insuficiente");

    // Frequência de alternativas
    const freqs = calculateOptionFrequencies(["A", "B", "C"], ["A", "A", "B", null], "A");
    expect(freqs.find((f) => f.letter === "A")?.count).toBe(2);
    expect(freqs.find((f) => f.letter === "Branco")?.count).toBe(1);

    // Avaliação de flags
    const evalFlags = evaluateItemFlags({
      facilityIndex: 0.95,
      pointBiserial: -0.15,
      optionFrequencies: freqs,
      correctLetter: "A",
    });
    expect(evalFlags.flags.some((f) => f.type === "muito_facil")).toBe(true);
    expect(evalFlags.flags.some((f) => f.type === "discriminacao_negativa")).toBe(true);
  });
});
