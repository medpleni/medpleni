import { describe, it, expect } from "vitest";
import { runAutomatedQualityChecks } from "../engine/quality-checker";
import { executeGenerationBatch } from "../engine/generator";
import type { GeneratedOption } from "../engine/engine-types";

describe("B2B AI Question Generation Engine & Quality Checks (P07 / QB-08, QB-09, QB-13, QB-14)", () => {
  describe("runAutomatedQualityChecks (Psychometric Criteria QB-14)", () => {
    const validOptions: GeneratedOption[] = [
      { letter: "A", text: "Iniciar espironolactona e inibidor de SGLT2 por via oral.", is_correct: true },
      { letter: "B", text: "Prescrever digoxina em dose plena e reavaliar em 30 dias.", is_correct: false },
      { letter: "C", text: "Substituir betabloqueador por diltiazem em dose titulada.", is_correct: false },
      { letter: "D", text: "Adicionar nitrato isolado e suspender IECA imediatamente.", is_correct: false },
      { letter: "E", text: "Manter unicamente diurético de alça sem novas associações.", is_correct: false },
    ];

    it("passes all automated checks for a compliant medical question", () => {
      const res = runAutomatedQualityChecks({
        statement: "Homem de 64 anos com ICFER sintomática mantém dispneia classe II. Qual a conduta terapêutica farmacológica prioritária?",
        options: validOptions,
        correctLetter: "A",
        explanation: "A terapia quádrupla para ICFER inclui Espironolactona e iSGLT2 segundo a SBC.",
        referenceCitation: "Diretriz Brasileira de Insuficiência Cardíaca - SBC 2024",
      });

      expect(res.checks.allPassed).toBe(true);
      expect(res.checks.singleCorrect).toBe(true);
      expect(res.checks.balancedLength).toBe(true);
      expect(res.checks.noAllAbove).toBe(true);
      expect(res.checks.clearCommand).toBe(true);
      expect(res.checks.referencePresent).toBe(true);
    });

    it("fails when more than one option is marked as correct", () => {
      const multiCorrect = validOptions.map((o) => (o.letter === "B" ? { ...o, is_correct: true } : o));
      const res = runAutomatedQualityChecks({
        statement: "Qual a melhor conduta farmacológica?",
        options: multiCorrect,
        correctLetter: "A",
        explanation: "Explicação",
        referenceCitation: "Diretriz SBC 2024",
      });

      expect(res.checks.allPassed).toBe(false);
      expect(res.checks.singleCorrect).toBe(false);
      expect(res.checks.reasons).toContain("Múltiplas alternativas marcadas como corretas (2).");
    });

    it("fails when an option contains forbidden INEP formulation (Todas as anteriores / N.D.A.)", () => {
      const badOptions: GeneratedOption[] = [
        { letter: "A", text: "Opção A correta.", is_correct: true },
        { letter: "B", text: "Opção B válida.", is_correct: false },
        { letter: "C", text: "Opção C válida.", is_correct: false },
        { letter: "D", text: "Todas as anteriores estão corretas.", is_correct: false },
        { letter: "E", text: "Nenhuma das anteriores.", is_correct: false },
      ];

      const res = runAutomatedQualityChecks({
        statement: "Qual o diagnóstico clínico provável?",
        options: badOptions,
        correctLetter: "A",
        explanation: "Explicação",
        referenceCitation: "Diretriz SBC 2024",
      });

      expect(res.checks.allPassed).toBe(false);
      expect(res.checks.noAllAbove).toBe(false);
    });

    it("fails when statement lacks clear command or interrogative ending", () => {
      const res = runAutomatedQualityChecks({
        statement: "Paciente idoso internado com insuficiência cardíaca crônica descompensada e edema pulmonar agudo",
        options: validOptions,
        correctLetter: "A",
        explanation: "Explicação",
        referenceCitation: "Diretriz SBC 2024",
      });

      expect(res.checks.allPassed).toBe(false);
      expect(res.checks.clearCommand).toBe(false);
    });

    it("evaluates safe similarity for third-party rewrites (QB-13)", () => {
      const source = "Homem de 60 anos com dispneia paroxística noturna, turgência jugular a 45 graus e B3 audível.";
      
      // Reescrita bem adaptada (similaridade < 60%)
      const rewrittenGood = "Mulher de 71 anos admitida com cansaço ao repouso, estertores crepitantes e galope ventricular ao exame físico. Qual a conduta inicial recomendada?";
      const resGood = runAutomatedQualityChecks({
        statement: rewrittenGood,
        options: validOptions,
        correctLetter: "A",
        explanation: "Explicação",
        referenceCitation: "Diretriz SBC 2024",
        sourceStatement: source,
        maxSimilarityThreshold: 60,
      });
      expect(resGood.checks.safeSimilarity).toBe(true);

      // Reescrita quase idêntica (plágio / alta similaridade > 60%)
      const rewrittenBad = "Homem de 60 anos apresentando dispneia paroxística noturna, turgência jugular a 45 graus e B3 audível. Qual a conduta?";
      const resBad = runAutomatedQualityChecks({
        statement: rewrittenBad,
        options: validOptions,
        correctLetter: "A",
        explanation: "Explicação",
        referenceCitation: "Diretriz SBC 2024",
        sourceStatement: source,
        maxSimilarityThreshold: 60,
      });
      expect(resBad.checks.safeSimilarity).toBe(false);
    });
  });

  describe("executeGenerationBatch in the 3 Approved Modes", () => {
    it("Mode 1: executes tema_novo with national guideline input and draws sample", async () => {
      const res = await executeGenerationBatch({
        mode: "tema_novo",
        themeTitle: "Insuficiência Cardíaca",
        competencyTitle: "Farmacoterapia e Conduta",
        difficulty: "media",
        guidelineContent: "Terapia quádrupla com iSGLT2, Espironolactona, Betabloqueador e IECA/BRA.",
        guidelineCitation: "Diretriz SBC 2024",
        count: 5,
        samplePercentage: 20, // 20% de 5 = 1 amostra
      });

      expect(res.questions.length).toBe(5);
      expect(res.promptSnapshot).toContain("MODO: TEMA_NOVO");
      expect(res.estimatedCostUsd).toBeGreaterThan(0);

      const sampleQuestions = res.questions.filter((q) => q.isSample);
      expect(sampleQuestions.length).toBe(1);
      expect(res.questions[0].options.length).toBe(5);
      expect(res.questions[0].referenceCitation).toBe("Diretriz SBC 2024");
    });

    it("Mode 2: executes devolutiva_para_original from source explanation", async () => {
      const res = await executeGenerationBatch({
        mode: "devolutiva_para_original",
        themeTitle: "Cardiologia de Emergência",
        difficulty: "media",
        guidelineContent: "Furosemida venosa no perfil B.",
        guidelineCitation: "Diretriz SBC 2024",
        sourceExplanation: "O perfil B requer diurético de alça intravenoso com vasodilatador venoso e arterial para redução da pré-carga.",
        count: 2,
        samplePercentage: 50,
      });

      expect(res.questions.length).toBe(2);
      expect(res.promptSnapshot).toContain("DEVOLUTIVA_PARA_ORIGINAL");
      expect(res.questions[0].explanation).toContain("A partir dos fundamentos da devolutiva");
    });

    it("Mode 3: executes reescrita_terceiros with source link and checks checks pass", async () => {
      const res = await executeGenerationBatch({
        mode: "reescrita_terceiros",
        themeTitle: "Insuficiência Cardíaca Congestiva",
        difficulty: "media",
        guidelineContent: "Critérios de Framingham e diurese.",
        guidelineCitation: "Diretriz SBC 2024",
        sourceStatement: "Paciente de 60 anos com dispneia paroxística e estase jugular a 45 graus.",
        count: 2,
        samplePercentage: 50,
      });

      expect(res.questions.length).toBe(2);
      expect(res.promptSnapshot).toContain("REESCRITA_TERCEIROS");
      expect(res.questions[0].originSimilarityScore).toBeDefined();
    });

    it("enforces pilot safety limit of maximum 20 questions per batch", async () => {
      const res = await executeGenerationBatch({
        mode: "tema_novo",
        themeTitle: "Hipertensão",
        difficulty: "facil",
        guidelineContent: "Diretriz HAS",
        guidelineCitation: "SBC 2024",
        count: 50, // attempts 50
        samplePercentage: 20,
      });

      expect(res.questions.length).toBe(20); // capped at 20
    });
  });
});
