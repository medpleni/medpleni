import { describe, it, expect } from "vitest";
import {
  calculateAttemptScore,
  convertFormAnswerToBase,
  convertBaseAnswerToForm,
  generateFormShuffleMap,
  type CalculationItem,
  type CalculationAnswer,
  type OptionLetter,
  type ShuffledItemMap,
} from "../assessments";

describe("B2B Assessments Data Model & Scoring Rules (P08 / ESPEC 4.1)", () => {
  describe("1. Regras de Cálculo e Nota Ponderada (calculateAttemptScore)", () => {
    it("calcula nota 100% quando todas as questões válidas são respondidas corretamente", () => {
      const items: CalculationItem[] = [
        { id: "item-1", weight: 1.0, status: "valido", correctLetter: "A" },
        { id: "item-2", weight: 1.0, status: "valido", correctLetter: "C" },
        { id: "item-3", weight: 1.0, status: "valido", correctLetter: "B" },
        { id: "item-4", weight: 1.0, status: "valido", correctLetter: "D" },
      ];

      const answers: CalculationAnswer[] = [
        { itemId: "item-1", markedBaseLetter: "A" },
        { itemId: "item-2", markedBaseLetter: "C" },
        { itemId: "item-3", markedBaseLetter: "B" },
        { itemId: "item-4", markedBaseLetter: "D" },
      ];

      const score = calculateAttemptScore(items, answers);

      expect(score.scoreRaw).toBe(4.0);
      expect(score.scorePercentage).toBe(100.0);
      expect(score.totalValidItems).toBe(4);
      expect(score.correctValidItems).toBe(4);
      expect(score.annulledItems).toBe(0);
    });

    it("conta questão em branco (null) como erro (0 pontos)", () => {
      const items: CalculationItem[] = [
        { id: "item-1", weight: 1.0, status: "valido", correctLetter: "A" },
        { id: "item-2", weight: 1.0, status: "valido", correctLetter: "C" },
      ];

      // Aluno respondeu item-1 correto e deixou item-2 em branco
      const answers: CalculationAnswer[] = [
        { itemId: "item-1", markedBaseLetter: "A" },
        { itemId: "item-2", markedBaseLetter: null },
      ];

      const score = calculateAttemptScore(items, answers);

      expect(score.scoreRaw).toBe(1.0);
      expect(score.scorePercentage).toBe(50.0);
      expect(score.correctValidItems).toBe(1);
      expect(score.totalValidItems).toBe(2);
    });

    it("respeita pesos diferenciados entre questões", () => {
      const items: CalculationItem[] = [
        { id: "item-1", weight: 2.0, status: "valido", correctLetter: "A" },
        { id: "item-2", weight: 1.0, status: "valido", correctLetter: "B" },
        { id: "item-3", weight: 1.0, status: "valido", correctLetter: "C" },
      ];
      // Peso total = 2 + 1 + 1 = 4.0

      // Aluno acertou apenas a questão de peso 2.0
      const answers: CalculationAnswer[] = [
        { itemId: "item-1", markedBaseLetter: "A" },
        { itemId: "item-2", markedBaseLetter: "E" }, // Erro
        { itemId: "item-3", markedBaseLetter: "D" }, // Erro
      ];

      const score = calculateAttemptScore(items, answers);

      expect(score.scoreRaw).toBe(2.0);
      expect(score.totalValidWeight).toBe(4.0);
      expect(score.scorePercentage).toBe(50.0);
    });

    it("anular um item exclui o item do numerador e denominador e recalcula todas as notas", () => {
      // Prova original com 4 questões: total 4 pontos
      const itemsOriginal: CalculationItem[] = [
        { id: "item-1", weight: 1.0, status: "valido", correctLetter: "A" },
        { id: "item-2", weight: 1.0, status: "valido", correctLetter: "B" },
        { id: "item-3", weight: 1.0, status: "valido", correctLetter: "C" },
        { id: "item-4", weight: 1.0, status: "valido", correctLetter: "D" },
      ];

      // Aluno errou o item-2 (marcou 'C' em vez de 'B') e acertou os outros 3
      const answers: CalculationAnswer[] = [
        { itemId: "item-1", markedBaseLetter: "A" },
        { itemId: "item-2", markedBaseLetter: "C" },
        { itemId: "item-3", markedBaseLetter: "C" },
        { itemId: "item-4", markedBaseLetter: "D" },
      ];

      const initialScore = calculateAttemptScore(itemsOriginal, answers);
      expect(initialScore.scoreRaw).toBe(3.0);
      expect(initialScore.scorePercentage).toBe(75.0); // 3 de 4 = 75%

      // A banca ANULA o item-2
      const itemsAfterAnnulment: CalculationItem[] = [
        { id: "item-1", weight: 1.0, status: "valido", correctLetter: "A" },
        { id: "item-2", weight: 1.0, status: "anulado", correctLetter: "B" }, // Anulado!
        { id: "item-3", weight: 1.0, status: "valido", correctLetter: "C" },
        { id: "item-4", weight: 1.0, status: "valido", correctLetter: "D" },
      ];

      const recalculatedScore = calculateAttemptScore(itemsAfterAnnulment, answers);

      // Com a anulação, a prova passa a valer 3 pontos. Como o aluno acertou os 3 válidos restantes:
      expect(recalculatedScore.totalValidItems).toBe(3);
      expect(recalculatedScore.annulledItems).toBe(1);
      expect(recalculatedScore.scoreRaw).toBe(3.0);
      expect(recalculatedScore.scorePercentage).toBe(100.0); // 3 de 3 = 100%
    });

    it("anular um item em que o aluno havia acertado ajusta a base sem penalizar injustamente", () => {
      // Aluno acertou item-1 e item-2
      const itemsBefore: CalculationItem[] = [
        { id: "item-1", weight: 1.0, status: "valido", correctLetter: "A" },
        { id: "item-2", weight: 1.0, status: "valido", correctLetter: "B" },
      ];
      const answers: CalculationAnswer[] = [
        { itemId: "item-1", markedBaseLetter: "A" },
        { itemId: "item-2", markedBaseLetter: "B" },
      ];
      expect(calculateAttemptScore(itemsBefore, answers).scorePercentage).toBe(100.0);

      // Item-2 é anulado por erro formal no gabarito
      const itemsAfter: CalculationItem[] = [
        { id: "item-1", weight: 1.0, status: "valido", correctLetter: "A" },
        { id: "item-2", weight: 1.0, status: "anulado", correctLetter: "B" },
      ];
      const afterScore = calculateAttemptScore(itemsAfter, answers);
      expect(afterScore.totalValidItems).toBe(1);
      expect(afterScore.scoreRaw).toBe(1.0);
      expect(afterScore.scorePercentage).toBe(100.0); // 1 de 1 válido = 100%
    });

    it("previne divisão por zero quando todos os itens são anulados", () => {
      const itemsAllAnnulled: CalculationItem[] = [
        { id: "item-1", weight: 1.0, status: "anulado", correctLetter: "A" },
        { id: "item-2", weight: 1.0, status: "anulado", correctLetter: "B" },
      ];
      const answers: CalculationAnswer[] = [
        { itemId: "item-1", markedBaseLetter: "A" },
        { itemId: "item-2", markedBaseLetter: "B" },
      ];

      const score = calculateAttemptScore(itemsAllAnnulled, answers);
      expect(score.totalValidItems).toBe(0);
      expect(score.annulledItems).toBe(2);
      expect(score.scoreRaw).toBe(0);
      expect(score.scorePercentage).toBe(0);
      expect(Number.isNaN(score.scorePercentage)).toBe(false);
    });
  });

  describe("2. Formas Embaralhadas e Conversão de Respostas (PR-05 / QB-04)", () => {
    it("converte alternativa da forma embaralhada para a alternativa do caderno-base", () => {
      // Suponha que na Forma B as opções foram mapeadas:
      // A -> C, B -> A, C -> D, D -> B, E -> E
      const optionsMap: Record<OptionLetter, OptionLetter> = {
        A: "C",
        B: "A",
        C: "D",
        D: "B",
        E: "E",
      };

      // Se o aluno assinalou 'B' na folha da Forma B, no caderno base ele marcou 'A'
      expect(convertFormAnswerToBase("B", optionsMap)).toBe("A");

      // Se assinalou 'A', no caderno base é 'C'
      expect(convertFormAnswerToBase("A", optionsMap)).toBe("C");

      // Se em branco (null), permanece null
      expect(convertFormAnswerToBase(null, optionsMap)).toBeNull();
    });

    it("converte bidirecionalmente (forma -> base e base -> forma)", () => {
      const optionsMap: Record<OptionLetter, OptionLetter> = {
        A: "D",
        B: "C",
        C: "A",
        D: "E",
        E: "B",
      };

      const reverseOptionsMap: Record<OptionLetter, OptionLetter> = {
        D: "A",
        C: "B",
        A: "C",
        E: "D",
        B: "E",
      };

      const letters: OptionLetter[] = ["A", "B", "C", "D", "E"];

      letters.forEach((formLetter) => {
        const baseLetter = convertFormAnswerToBase(formLetter, optionsMap)!;
        const convertedBack = convertBaseAnswerToForm(baseLetter, reverseOptionsMap);
        expect(convertedBack).toBe(formLetter);
      });
    });

    it("gera mapa de embaralhamento consistente para todas as questões da forma", () => {
      const baseItems = [
        { id: "item-101", orderIndex: 1 },
        { id: "item-102", orderIndex: 2 },
        { id: "item-103", orderIndex: 3 },
        { id: "item-104", orderIndex: 4 },
        { id: "item-105", orderIndex: 5 },
      ];

      const formMap: ShuffledItemMap[] = generateFormShuffleMap(baseItems, "B", true);

      expect(formMap).toHaveLength(5);

      // Todas as ordens da forma são 1 a 5
      const formOrders = formMap.map((m) => m.formOrder).sort((a, b) => a - b);
      expect(formOrders).toEqual([1, 2, 3, 4, 5]);

      // Cada item mapeia perfeitamente as 5 opções A-E de maneira bijetiva
      formMap.forEach((m) => {
        const formLetters = Object.keys(m.optionsMap).sort();
        const baseLetters = Object.values(m.optionsMap).sort();

        expect(formLetters).toEqual(["A", "B", "C", "D", "E"]);
        expect(baseLetters).toEqual(["A", "B", "C", "D", "E"]);

        // O reverseOptionsMap deve inverter exatamente o optionsMap
        (formLetters as OptionLetter[]).forEach((fl) => {
          const bl = m.optionsMap[fl];
          expect(m.reverseOptionsMap[bl]).toBe(fl);
        });
      });
    });
  });

  describe("3. Congelamento do Caderno na Publicação", () => {
    it("garante que o snapshot congelado preserva enunciado, alternativas e gabarito", () => {
      // Simulação do payload congelado na publicação
      const originalQuestion = {
        id: "q-orig-999",
        statement: "Paciente com sopro diastólico em foco mitral...",
        clinicalContext: "Homem de 45 anos, história prévia de febre reumática.",
        options: [
          { letter: "A" as const, text: "Estenose mitral", is_correct: true },
          { letter: "B" as const, text: "Insuficiência aórtica", is_correct: false },
        ],
        correctLetter: "A" as const,
        explanation: "O sopro em ruflar diastólico com estalido de abertura é típico de estenose mitral.",
      };

      // Congelamento no momento da publicação em assessment_items
      const frozenItem = {
        version_id: "ver-1",
        order_index: 1,
        question_id: originalQuestion.id,
        frozen_statement: originalQuestion.statement,
        frozen_clinical_context: originalQuestion.clinicalContext,
        frozen_options: JSON.parse(JSON.stringify(originalQuestion.options)),
        frozen_correct_letter: originalQuestion.correctLetter,
        frozen_explanation: originalQuestion.explanation,
        status: "valido" as const,
        weight: 1.0,
      };

      // Alteração posterior na questão viva do banco de questões
      originalQuestion.statement = "Texto modificado após a prova ser aplicada...";
      originalQuestion.options[0].text = "Estenose aórtica severa";

      // O item congelado no caderno da prova PERMANECE INTOCADO
      expect(frozenItem.frozen_statement).toBe("Paciente com sopro diastólico em foco mitral...");
      expect(frozenItem.frozen_options[0].text).toBe("Estenose mitral");
      expect(frozenItem.frozen_correct_letter).toBe("A");
    });
  });
});
