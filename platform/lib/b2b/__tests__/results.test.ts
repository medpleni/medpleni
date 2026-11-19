/**
 * MEDPLENI B2B — Testes Automatizados de Resultados Psicométricos (P12 / PR-08, PR-10, TC-07)
 * Valida a exatidão matemática contra cálculo independente em planilha para a Prova Demo FADEP
 * Critérios de Aceite:
 * 1. Números batem exatamente com cálculo independente de planilha (Mean, Median, P25, P75, % < 60)
 * 2. Distribuição em faixas de 5 pontos com linha do corte (60%) e mediana
 * 3. Rendimento por eixos com aviso de amostra pequena (< 5 questões) e total geral (TC-07)
 * 4. Recálculo total em caso de anulação de item ou troca de gabarito
 * 5. Variação vs prova anterior com aviso de régua métrica distinta
 * 6. Exportação PR-10 e Dicionário de Dados
 */

import { describe, it, expect } from "vitest";
import {
  calculatePercentile,
  calculateExamSummaryStats,
  calculateScoreDistribution,
  calculateAllAxesPerformance,
  calculateClassGroupsPerformance,
  buildStudentResultRows,
  generateExportCSV,
  generateDataDictionary,
  getPerformanceBand,
  type RawItemPerformanceInput,
  type ExportStudentItemDetail,
} from "../results";
import { calculateAttemptScore, type CalculationItem, type CalculationAnswer } from "../assessments";

describe("B2B Exam Results, Psychometrics & Statistics (P12 / PR-08, PR-10, TC-07)", () => {
  // ───────────────────────────────────────────────────────────────────────────
  // CONJUNTO DE DADOS INDEPENDENTE DE CONFERÊNCIA (Planilha Prova Demo FADEP)
  // Prova com 20 questões aplicada a 40 alunos (36 presentes, 4 ausentes)
  // ───────────────────────────────────────────────────────────────────────────
  const independentStudentScores = [
    35.0, 40.0, 45.0, 45.0, 50.0, 50.0, 55.0, 55.0, 55.0, 60.0,
    60.0, 60.0, 60.0, 65.0, 65.0, 65.0, 70.0, 70.0, 70.0, 70.0,
    75.0, 75.0, 75.0, 75.0, 80.0, 80.0, 80.0, 80.0, 85.0, 85.0,
    85.0, 90.0, 90.0, 95.0, 95.0, 100.0,
  ];

  describe("1. Conferência Independente de Planilha (Estatísticas Descritivas)", () => {
    it("valida interpolação exata de percentis idêntica ao Excel PERCENTILE.INC", () => {
      // Vetor ordenado de teste: [40, 50, 60, 70, 80]
      const simple = [40, 50, 60, 70, 80];
      expect(calculatePercentile(simple, 0.5)).toBe(60);
      expect(calculatePercentile(simple, 0.25)).toBe(50);
      expect(calculatePercentile(simple, 0.75)).toBe(70);

      // Vetor par: [10, 20, 30, 40] -> index(0.5) = 1.5 -> (20 + 30)/2 = 25
      const even = [10, 20, 30, 40];
      expect(calculatePercentile(even, 0.5)).toBe(25);
      expect(calculatePercentile(even, 0.25)).toBe(17.5);
      expect(calculatePercentile(even, 0.75)).toBe(32.5);
    });

    it("apresenta números que batem exatamente com a planilha de conferência para a prova demo", () => {
      // Cálculos independentes da planilha para os 36 alunos:
      // Soma = 2490.0
      // Média = 2490.0 / 36 = 69.1666... -> 69.17%
      // Mediana (36 alunos): index = 35 * 0.5 = 17.5 -> (scores[17] + scores[18])/2 = (70.0 + 70.0)/2 = 70.0%
      // P25: index = 35 * 0.25 = 8.75 -> scores[8] + 0.75 * (scores[9] - scores[8]) = 55.0 + 0.75*(60.0 - 55.0) = 58.75%
      // P75: index = 35 * 0.75 = 26.25 -> scores[26] + 0.25 * (scores[27] - scores[26]) = 80.0 + 0.25*(80.0 - 80.0) = 80.0%
      // Abaixo de 60%: scores < 60 são [35, 40, 45, 45, 50, 50, 55, 55, 55] -> 9 alunos -> (9 / 36) * 100 = 25.0%

      const stats = calculateExamSummaryStats({
        presentScores: independentStudentScores,
        totalEnrolled: 40,
        totalAbsent: 4,
        cutScore: 60,
        academicTermLabel: "2027.1",
        assessmentTitle: "Simulado Integrado ENAMED 2027.1 — 8º Período",
      });

      expect(stats.totalEnrolled).toBe(40);
      expect(stats.totalPresent).toBe(36);
      expect(stats.totalAbsent).toBe(4);
      expect(stats.meanScore).toBe(69.17);
      expect(stats.medianScore).toBe(70.0);
      expect(stats.p25).toBe(58.75);
      expect(stats.p75).toBe(80.0);
      expect(stats.belowCutScoreCount).toBe(9);
      expect(stats.belowCutScorePercentage).toBe(25.0);
      expect(stats.minScore).toBe(35.0);
      expect(stats.maxScore).toBe(100.0);

      // Rodapé obrigatório Base / Período / Fonte conforme ESPEC
      expect(stats.footer.base).toContain("Base: 36 alunos presentes (4 ausentes)");
      expect(stats.footer.period).toContain("Período: 2027.1");
      expect(stats.footer.source).toContain("Fonte: MedPleni Avaliações");
    });
  });

  describe("2. Curva de Distribuição em Faixas de 5 Pontos", () => {
    it("gera exatamente 20 faixas contínuas com a linha de corte e mediana demarcadas", () => {
      const buckets = calculateScoreDistribution(independentStudentScores, 60, 70.0);
      expect(buckets.length).toBe(20);

      // Total de alunos somados em todas as faixas deve ser exatamente 36
      const totalCount = buckets.reduce((acc, b) => acc + b.count, 0);
      expect(totalCount).toBe(36);

      // Faixa 55-60%: scores [55, 55, 55] -> 3 alunos
      const bucket55to60 = buckets.find((b) => b.min === 55 && b.max === 60);
      expect(bucket55to60?.count).toBe(3);

      // Faixa 60-65%: scores [60, 60, 60, 60] -> 4 alunos
      const bucket60to65 = buckets.find((b) => b.min === 60 && b.max === 65);
      expect(bucket60to65?.count).toBe(4);
      expect(bucket60to65?.isCutScoreBucket).toBe(true);

      // Faixa da mediana (70.0%): faixa [70, 75)
      const medianBucket = buckets.find((b) => b.isMedianBucket);
      expect(medianBucket?.min).toBeLessThanOrEqual(70.0);
      expect(medianBucket?.max).toBeGreaterThanOrEqual(70.0);
    });
  });

  describe("3. Rendimento por Eixos, Aviso de Amostra Pequena e Ajuste TC-07", () => {
    it("aplica aviso de oscilação (< 5 questões) e fixa o total geral ao lado (TC-07)", () => {
      const items: RawItemPerformanceInput[] = [
        // Clínica Médica: 6 questões (>= 5 -> sem aviso)
        { itemId: "1", area: "Clínica Médica", status: "valido", weight: 1, answers: [{ studentUserId: "s1", isCorrect: true }] },
        { itemId: "2", area: "Clínica Médica", status: "valido", weight: 1, answers: [{ studentUserId: "s1", isCorrect: true }] },
        { itemId: "3", area: "Clínica Médica", status: "valido", weight: 1, answers: [{ studentUserId: "s1", isCorrect: true }] },
        { itemId: "4", area: "Clínica Médica", status: "valido", weight: 1, answers: [{ studentUserId: "s1", isCorrect: true }] },
        { itemId: "5", area: "Clínica Médica", status: "valido", weight: 1, answers: [{ studentUserId: "s1", isCorrect: true }] },
        { itemId: "6", area: "Clínica Médica", status: "valido", weight: 1, answers: [{ studentUserId: "s1", isCorrect: false }] },

        // Cirurgia Geral: 3 questões (< 5 -> deve acionar aviso de oscilação)
        { itemId: "7", area: "Cirurgia Geral", status: "valido", weight: 1, answers: [{ studentUserId: "s1", isCorrect: true }] },
        { itemId: "8", area: "Cirurgia Geral", status: "valido", weight: 1, answers: [{ studentUserId: "s1", isCorrect: true }] },
        { itemId: "9", area: "Cirurgia Geral", status: "valido", weight: 1, answers: [{ studentUserId: "s1", isCorrect: false }] },

        // Questão anulada não deve entrar na contagem de válidos
        { itemId: "10", area: "Cirurgia Geral", status: "anulado", weight: 1, answers: [{ studentUserId: "s1", isCorrect: false }] },
      ];

      const axes = calculateAllAxesPerformance(items, 69.03);
      expect(axes.length).toBe(1); // Só 'area' tem itens preenchidos

      const areaAxis = axes[0];
      expect(areaAxis.axisType).toBe("area");
      expect(areaAxis.overallExamAverage).toBe(69.03); // Ajuste TC-07: total geral sempre ao lado!

      const clinica = areaAxis.items.find((i) => i.name === "Clínica Médica");
      expect(clinica?.totalValidQuestions).toBe(6);
      expect(clinica?.hasLowQuestionCountWarning).toBe(false);

      const cirurgia = areaAxis.items.find((i) => i.name === "Cirurgia Geral");
      expect(cirurgia?.totalValidQuestions).toBe(3); // A anulada foi excluída!
      expect(cirurgia?.hasLowQuestionCountWarning).toBe(true);
      expect(cirurgia?.warningText).toContain("Amostra pequena (< 5 questões)");
    });
  });

  describe("4. Tabela Turmas × Resultado e Desempenho dos Alunos com Variação", () => {
    it("calcula média por turma e desvio relativo à média geral da prova", () => {
      const classGroups = [
        { id: "cg-1", name: "MED-2027-08P (Turma A)", period: 8 },
        { id: "cg-2", name: "MED-2027-08P (Turma B)", period: 8 },
      ];

      const studentsData = [
        // Turma A (média 70)
        { classGroupId: "cg-1", status: "presente" as const, scorePercentage: 60 },
        { classGroupId: "cg-1", status: "presente" as const, scorePercentage: 80 },
        // Turma B (média 50)
        { classGroupId: "cg-2", status: "presente" as const, scorePercentage: 40 },
        { classGroupId: "cg-2", status: "presente" as const, scorePercentage: 60 },
      ];

      const cgResults = calculateClassGroupsPerformance(classGroups, studentsData, 60.0, 60);
      expect(cgResults.length).toBe(2);

      const turmaA = cgResults.find((c) => c.classGroupId === "cg-1");
      expect(turmaA?.meanScore).toBe(70.0);
      expect(turmaA?.deltaFromExamAverage).toBe(10.0);

      const turmaB = cgResults.find((c) => c.classGroupId === "cg-2");
      expect(turmaB?.meanScore).toBe(50.0);
      expect(turmaB?.deltaFromExamAverage).toBe(-10.0);
      expect(turmaB?.belowCutScorePercentage).toBe(50.0);
    });

    it("classifica faixas de desempenho e adiciona aviso obrigatório na variação histórica", () => {
      expect(getPerformanceBand(48).band).toBe("ate_50");
      expect(getPerformanceBand(55).band).toBe("faixa_51_60");
      expect(getPerformanceBand(65).band).toBe("faixa_61_70");
      expect(getPerformanceBand(82).band).toBe("faixa_71_mais");

      const studentRows = buildStudentResultRows({
        students: [
          {
            studentUserId: "u1",
            studentName: "Lucas Silva",
            studentRa: "RA-2027-001",
            classGroupId: "cg-1",
            classGroupName: "8º Período",
            formCode: "A",
            status: "presente",
            scoreRaw: 75,
            scorePercentage: 75.0,
            previousScorePercentage: 70.0,
          },
        ],
        previousExamTitle: "Simulado Diagnóstico 2026.2",
      });

      expect(studentRows[0].previousScoreDelta).toBe(5.0);
      // Regra obrigatória: nunca comparar provas diferentes sem avisar na tela
      expect(studentRows[0].previousExamComparisonNotice).toContain("Simulado Diagnóstico 2026.2");
      expect(studentRows[0].previousExamComparisonNotice).toContain("não utilizam a mesma régua métrica");
    });
  });

  describe("5. Anulação e Recálculo Automático de Notas", () => {
    it("recalcula notas instantaneamente quando um item é anulado sem prejudicar alunos", () => {
      const items: CalculationItem[] = [
        { id: "i1", weight: 1, status: "valido", correctLetter: "A" },
        { id: "i2", weight: 1, status: "valido", correctLetter: "B" },
        { id: "i3", weight: 1, status: "valido", correctLetter: "C" },
        { id: "i4", weight: 1, status: "valido", correctLetter: "D" },
      ];

      // Aluno acertou i1 e errou i2, i3, i4 -> 1 de 4 = 25%
      const answers: CalculationAnswer[] = [
        { itemId: "i1", markedBaseLetter: "A" },
        { itemId: "i2", markedBaseLetter: "C" }, // Errou
        { itemId: "i3", markedBaseLetter: "A" }, // Errou
        { itemId: "i4", markedBaseLetter: null }, // Em branco
      ];

      const before = calculateAttemptScore(items, answers);
      expect(before.totalValidItems).toBe(4);
      expect(before.scorePercentage).toBe(25);

      // Questão i2 foi anulada pelo professor
      items[1].status = "anulado";

      const after = calculateAttemptScore(items, answers);
      expect(after.totalValidItems).toBe(3); // Denominador agora é 3
      expect(after.annulledItems).toBe(1);
      // Aluno acertou 1 de 3 = 33.33%
      expect(after.scorePercentage).toBe(33.33);
    });
  });

  describe("6. Exportação PR-10 e Dicionário de Dados", () => {
    it("gera CSV com UTF-8 BOM, cabeçalhos padronizados e dicionário de dados completo", () => {
      const sampleExport: ExportStudentItemDetail[] = [
        {
          studentName: "Lucas Silva",
          studentRa: "RA-2027-001",
          classGroupName: "MED-2027-08P",
          formCode: "B",
          itemOrderBase: 1,
          itemOrderForm: 5,
          questionStatementShort: "Paciente com dispneia e estalido de abertura mitral...",
          markedFormLetter: "C",
          markedBaseLetter: "A",
          correctBaseLetter: "A",
          isCorrect: true,
          weight: 1.0,
          area: "Clínica Médica",
          cenario: "Ambulatório",
          tema: "Valvopatias",
          competencia: "Diagnóstico Clínico",
          timeSpentSeconds: 45,
        },
      ];

      const csv = generateExportCSV(sampleExport);

      // Verifica presença do BOM UTF-8 (\uFEFF)
      expect(csv.startsWith("\uFEFF")).toBe(true);
      expect(csv).toContain("aluno_nome;aluno_ra;turma;forma_caderno;item_ordem_base;item_ordem_forma");
      expect(csv).toContain('"Lucas Silva";"RA-2027-001";"MED-2027-08P";"B";1;5');
      expect(csv).toContain('"Clínica Médica"');

      // Verifica dicionário de dados
      const dict = generateDataDictionary();
      expect(dict.aluno_nome).toBeDefined();
      expect(dict.forma_caderno).toBeDefined();
      expect(dict.item_ordem_forma).toBeDefined();
      expect(dict.alternativa_marcada_base).toBeDefined();
      expect(dict.acertou).toBeDefined();
    });
  });
});
