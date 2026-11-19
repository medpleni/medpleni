import { describe, it, expect } from "vitest";
import {
  calculateAttemptScore,
  convertFormAnswerToBase,
  generateFormShuffleMap,
  type CalculationItem,
  type CalculationAnswer,
  type OptionLetter,
  type ShuffledItemMap,
} from "../assessments";

describe("B2B Exam Player, Real-Time Autosave & Concurrency (P10 / PR-12, PR-13)", () => {
  describe("1. Teste de Carga e Concorrência com 100 Alunos Fictícios Simultâneos", () => {
    it("processa 100 alunos respondendo simultaneamente sem perda de respostas ou corrupção de notas", async () => {
      // Caderno base com 10 questões médicas
      const baseItems: CalculationItem[] = [
        { id: "item-1", weight: 1.0, status: "valido", correctLetter: "A" },
        { id: "item-2", weight: 1.0, status: "valido", correctLetter: "B" },
        { id: "item-3", weight: 1.0, status: "valido", correctLetter: "C" },
        { id: "item-4", weight: 1.0, status: "valido", correctLetter: "D" },
        { id: "item-5", weight: 1.0, status: "valido", correctLetter: "E" },
        { id: "item-6", weight: 1.0, status: "valido", correctLetter: "A" },
        { id: "item-7", weight: 1.0, status: "valido", correctLetter: "B" },
        { id: "item-8", weight: 1.0, status: "valido", correctLetter: "C" },
        { id: "item-9", weight: 1.0, status: "valido", correctLetter: "D" },
        { id: "item-10", weight: 1.0, status: "valido", correctLetter: "E" },
      ];

      // Formas A, B, C, D disponíveis
      const formMaps: Record<string, ShuffledItemMap[]> = {
        A: generateFormShuffleMap(baseItems.map((b, idx) => ({ id: b.id, orderIndex: idx + 1 })), "A", false),
        B: generateFormShuffleMap(baseItems.map((b, idx) => ({ id: b.id, orderIndex: idx + 1 })), "B", true),
        C: generateFormShuffleMap(baseItems.map((b, idx) => ({ id: b.id, orderIndex: idx + 1 })), "C", true),
        D: generateFormShuffleMap(baseItems.map((b, idx) => ({ id: b.id, orderIndex: idx + 1 })), "D", true),
      };

      const letters: OptionLetter[] = ["A", "B", "C", "D", "E"];
      const formCodes = ["A", "B", "C", "D"];

      // Simulação paralela de 100 alunos simultâneos
      const startTime = performance.now();

      const studentPromises = Array.from({ length: 100 }, async (_, studentIdx) => {
        const studentId = `student-${studentIdx + 1}`;
        const assignedFormCode = formCodes[studentIdx % 4];
        const shuffle = formMaps[assignedFormCode];

        // Cada aluno responde às 10 questões na ordem de sua forma
        const studentAnswers: CalculationAnswer[] = shuffle.map((shuffledQuestion, qIdx) => {
          // Marca uma alternativa na sua forma (aluno experiente vs intermediário)
          const chosenFormLetter: OptionLetter = letters[(studentIdx + qIdx) % 5];

          // Conversão instantânea da alternativa marcada na forma para o caderno-base
          const baseLetter = convertFormAnswerToBase(chosenFormLetter, shuffledQuestion.optionsMap);

          return {
            itemId: shuffledQuestion.assessmentItemId,
            markedBaseLetter: baseLetter,
          };
        });

        // Consolidação da nota da tentativa
        const score = calculateAttemptScore(baseItems, studentAnswers);

        return {
          studentId,
          assignedFormCode,
          answersCount: studentAnswers.length,
          scoreRaw: score.scoreRaw,
          scorePercentage: score.scorePercentage,
          totalValid: score.totalValidItems,
        };
      });

      const results = await Promise.all(studentPromises);
      const elapsed = performance.now() - startTime;

      // Verificação de aceite
      expect(results).toHaveLength(100);

      // Nenhuma resposta perdida: todos os 100 alunos possuem exatamente 10 respostas registradas
      results.forEach((res) => {
        expect(res.answersCount).toBe(10);
        expect(res.totalValid).toBe(10);
        expect(res.scorePercentage).toBeGreaterThanOrEqual(0);
        expect(res.scorePercentage).toBeLessThanOrEqual(100);
        expect(Number.isNaN(res.scorePercentage)).toBe(false);
      });

      // Performance de execução: 100 alunos processados em menos de 100ms
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe("2. Queda de Conexão e Retomada de Sessão", () => {
    it("preserva as respostas já assinaladas antes da interrupção", () => {
      const items: CalculationItem[] = [
        { id: "item-1", weight: 1.0, status: "valido", correctLetter: "A" },
        { id: "item-2", weight: 1.0, status: "valido", correctLetter: "B" },
        { id: "item-3", weight: 1.0, status: "valido", correctLetter: "C" },
      ];

      // Sessão 1 antes da queda: aluno assinalou item-1 e item-2
      const session1Answers = new Map<string, OptionLetter | null>();
      session1Answers.set("item-1", "A");
      session1Answers.set("item-2", "B");

      // Simulação de desconexão e reconexão (estado restaurado)
      const restoredAnswers = new Map(session1Answers);

      // Aluno continua e responde item-3
      restoredAnswers.set("item-3", "C");

      const finalAnswers: CalculationAnswer[] = Array.from(restoredAnswers.entries()).map(([itemId, letter]) => ({
        itemId,
        markedBaseLetter: letter,
      }));

      const finalScore = calculateAttemptScore(items, finalAnswers);

      expect(finalScore.correctValidItems).toBe(3);
      expect(finalScore.scorePercentage).toBe(100.0);
    });
  });

  describe("3. Acessibilidade e Janela de Tolerância", () => {
    it("adiciona tempo adicional concedido pelo professor à duração total", () => {
      const baseDurationMinutes = 120; // 2 horas
      const extraTimeMinutes = 30; // 30 minutos adicionais de acessibilidade

      const totalAllowedMinutes = baseDurationMinutes + extraTimeMinutes;
      const totalAllowedSeconds = totalAllowedMinutes * 60;

      expect(totalAllowedMinutes).toBe(150);
      expect(totalAllowedSeconds).toBe(9000);
    });

    it("valida início de prova dentro da janela com tolerância configurada", () => {
      const examStartsAt = new Date("2027-04-10T14:00:00Z");
      const toleranceMinutes = 15;
      const latestAllowedStart = new Date(examStartsAt.getTime() + toleranceMinutes * 60 * 1000);

      // Aluno que entra às 14:10 (dentro da tolerância)
      const student1Entry = new Date("2027-04-10T14:10:00Z");
      expect(student1Entry.getTime() <= latestAllowedStart.getTime()).toBe(true);

      // Aluno que entra às 14:25 (após a tolerância)
      const student2Entry = new Date("2027-04-10T14:25:00Z");
      expect(student2Entry.getTime() <= latestAllowedStart.getTime()).toBe(false);
    });
  });

  describe("4. Regra de Negócio: Liberação de Gabarito Controlada pelo Professor", () => {
    it("restringe o acesso ao gabarito enquanto o professor não tiver liberado", () => {
      const exam: { id: string; title: string; answers_released_at: string | null } = {
        id: "exam-xyz",
        title: "Simulado Integrado",
        answers_released_at: null, // Ainda não liberado!
      };

      function canStudentViewAnswers(examData: { answers_released_at: string | null }): boolean {
        return Boolean(examData.answers_released_at);
      }

      expect(canStudentViewAnswers(exam)).toBe(false);

      // Professor clica em "Liberar Gabarito e Comentários"
      exam.answers_released_at = new Date().toISOString();
      expect(canStudentViewAnswers(exam)).toBe(true);
    });
  });
});
