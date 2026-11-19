import { describe, it, expect } from "vitest";
import { getInepReferenceMatrix } from "../exams-actions";
import { runExamPreChecks } from "../exams-checker";
import type { ExamMatrixDistribution, SelectedQuestionItem } from "../exams-types";

describe("B2B Exam Assembly & Pre-Check Rules (P09 / PR-01 a PR-06)", () => {
  describe("1. Matriz de Referência do INEP (ENAMED)", () => {
    it("retorna matriz padrão de 100 itens para simulados ENAMED", async () => {
      const res4 = await getInepReferenceMatrix("simulado_enamed_4");
      const res8 = await getInepReferenceMatrix("simulado_enamed_8");
      const res12 = await getInepReferenceMatrix("simulado_enamed_12");

      expect(res4.isAvailable).toBe(true);
      expect(res8.isAvailable).toBe(true);
      expect(res12.isAvailable).toBe(true);

      expect(res12.matrix.totalQuestions).toBe(100);

      // Soma das áreas do INEP deve ser exatamente 100
      const totalAreaQuestions = Object.values(res12.matrix.areas).reduce((a, b) => a + b, 0);
      expect(totalAreaQuestions).toBe(100);

      // 7 Grandes Áreas
      expect(Object.keys(res12.matrix.areas)).toHaveLength(7);
      expect(res12.matrix.areas["Clínica Médica"]).toBe(20);
      expect(res12.matrix.minImageQuota).toBe(10);
    });

    it("retorna matriz livre para provas regulares", async () => {
      const res = await getInepReferenceMatrix("prova_regular");
      expect(res.isAvailable).toBe(false);
      expect(res.matrix.totalQuestions).toBe(20);
    });
  });

  describe("2. Checagens Automáticas Pré-Publicação (runExamPreChecks - PR-04)", () => {
    const validMatrix: ExamMatrixDistribution = {
      totalQuestions: 10,
      areas: {
        "Clínica Médica": 5,
        "Cirurgia Geral": 5,
      },
      difficultyCurve: { facil: 30, media: 50, dificil: 20 },
      minImageQuota: 2,
    };

    function generateMockItems(count: number): SelectedQuestionItem[] {
      return Array.from({ length: count }, (_, i) => ({
        id: `q-${i + 1}`,
        statement: `Questão ${i + 1}`,
        area_name: i < 5 ? "Clínica Médica" : "Cirurgia Geral",
        difficulty: "media" as const,
        has_image: i < 3, // 3 com imagem
        origin_label: "MedPleni",
        is_inédita: true,
        options: [
          { letter: "A" as const, text: "Opção A", is_correct: true },
          { letter: "B" as const, text: "Opção B", is_correct: false },
        ],
        correct_letter: "A" as const,
        weight: 1.0,
      }));
    }

    it("aprova publicação quando a matriz de 10 questões é perfeitamente cumprida", () => {
      const items = generateMockItems(10);
      const checks = runExamPreChecks(validMatrix, items);

      expect(checks.canPublish).toBe(true);
      expect(checks.matrixFulfilled).toBe(true);
      expect(checks.allKeysPresent).toBe(true);
      expect(checks.noDuplicates).toBe(true);
      expect(checks.imageQuotaMet).toBe(true);
      expect(checks.discrepancies).toHaveLength(0);
    });

    it("reprova publicação e aponta lacunas quando faltam questões para cumprir a matriz", () => {
      // 8 questões em vez de 10
      const items = generateMockItems(8);
      const checks = runExamPreChecks(validMatrix, items);

      expect(checks.canPublish).toBe(false);
      expect(checks.matrixFulfilled).toBe(false);
      expect(checks.discrepancies.some((d) => d.includes("diverge da matriz"))).toBe(true);
    });

    it("reprova quando a cota de imagens não é atingida", () => {
      const items = generateMockItems(10).map((item) => ({
        ...item,
        has_image: false, // Nenhuma com imagem
      }));

      const checks = runExamPreChecks(validMatrix, items);

      expect(checks.canPublish).toBe(false);
      expect(checks.imageQuotaMet).toBe(false);
      expect(checks.discrepancies.some((d) => d.includes("Cota de imagens insuficiente"))).toBe(true);
    });

    it("detecta duplicatas no caderno", () => {
      const items = generateMockItems(10);
      // Força ID duplicado
      items[9].id = items[0].id;

      const checks = runExamPreChecks(validMatrix, items);

      expect(checks.canPublish).toBe(false);
      expect(checks.noDuplicates).toBe(false);
      expect(checks.discrepancies.some((d) => d.includes("duplicadas"))).toBe(true);
    });
  });

  describe("3. Performance e Montagem de Prova de 100 Itens", () => {
    it("processa e valida uma prova completa de 100 itens em menos de 10 milissegundos", () => {
      const matrix100: ExamMatrixDistribution = {
        totalQuestions: 100,
        areas: {
          "Clínica Médica": 20,
          "Cirurgia Geral": 15,
          "Ginecologia e Obstetrícia": 15,
          Pediatria: 15,
          "Medicina de Família e Comunidade": 15,
          "Saúde Coletiva": 10,
          "Saúde Mental": 10,
        },
        difficultyCurve: { facil: 30, media: 50, dificil: 20 },
        minImageQuota: 10,
      };

      const start = performance.now();

      // Monta 100 itens
      const items100: SelectedQuestionItem[] = [];
      let idCounter = 1;
      for (const [area, count] of Object.entries(matrix100.areas)) {
        for (let i = 0; i < count; i++) {
          items100.push({
            id: `q-perf-${idCounter++}`,
            statement: `Questão clínica de alta relevância sobre ${area}`,
            area_name: area,
            difficulty: i % 3 === 0 ? "facil" : i % 3 === 1 ? "media" : "dificil",
            has_image: i < 2,
            origin_label: "ENAMED-2025",
            is_inédita: false,
            options: [
              { letter: "A", text: "Alternativa correta", is_correct: true },
              { letter: "B", text: "Distrator", is_correct: false },
            ],
            correct_letter: "A",
            weight: 1.0,
          });
        }
      }

      const checks = runExamPreChecks(matrix100, items100);
      const elapsed = performance.now() - start;

      expect(items100).toHaveLength(100);
      expect(checks.canPublish).toBe(true);
      expect(elapsed).toBeLessThan(10); // Menos de 10ms
    });
  });
});
