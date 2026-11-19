import { describe, it, expect } from "vitest";
import {
  parseQuestionsFromParagraphs,
  parseSingleQuestionBlock,
  parseCSVToQuestions,
} from "../importer/text-parsers";
import {
  calculateStatementSimilarity,
  findDuplicateInCandidates,
  normalizeStatementForComparison,
} from "../importer/duplicate-detector";
import { suggestQuestionClassification } from "../importer/ai-classifier";
import type { TaxArea, TaxCenario, TaxTema, TaxCompetencia } from "../taxonomy-types";

describe("B2B Question Importer & Staging Engine (P06)", () => {
  describe("text-parsers (Segmentation & Parsing)", () => {
    it("parses structured question with statement, alternatives, gabarito and explanation", () => {
      const sample = `QUESTÃO 1 - Clínica Médica
Classificação pelo INEP
Área: Clínica Médica
Cenário: Rede de Urgência e Emergência
Homem de 85 anos com pneumonia bacteriana comunitária internado em UTI apresenta comportamento flutuante e déficit de atenção. Qual o diagnóstico mais provável?
A) Depressão maior.
B) Delirium misto.
C) Psicose não orgânica.
D) Evolução da demência.
E) Transtorno de ansiedade.
Gabarito: B
Resposta comentada
O quadro agudo e flutuante de déficit de atenção em idoso internado é típico de delirium misto.`;

      const q = parseSingleQuestionBlock(sample, 1);
      expect(q).not.toBeNull();
      expect(q?.order).toBe(1);
      expect(q?.statement).toContain("Homem de 85 anos com pneumonia");
      expect(q?.options.length).toBe(5);
      expect(q?.correctLetter).toBe("B");
      expect(q?.options.find((o) => o.letter === "B")?.is_correct).toBe(true);
      expect(q?.options.find((o) => o.letter === "A")?.is_correct).toBe(false);
      expect(q?.explanation).toContain("típico de delirium misto");
      expect(q?.parsedAreaName).toBe("Clínica Médica");
      expect(q?.parsedCenarioName).toBe("Rede de Urgência e Emergência");
    });

    it("marks correctLetter as null when gabarito is missing from the file", () => {
      const sampleWithoutKey = `QUESTÃO 2 - Cirurgia Geral
Paciente jovem vítima de trauma abdominal fechado instável hemodinamicamente.
A) Tomografia imediata.
B) Laparotomia exploradora.
C) Reposição volêmica sem cirurgia.
D) Observação clínica.`;

      const q = parseSingleQuestionBlock(sampleWithoutKey, 2);
      expect(q).not.toBeNull();
      expect(q?.correctLetter).toBeNull();
      expect(q?.options.length).toBe(4);
      expect(q?.options.every((o) => !o.is_correct)).toBe(true);
    });

    it("parses CSV lines into structured questions", () => {
      const csv = `Numero,Enunciado,AlternativaA,AlternativaB,AlternativaC,AlternativaD,AlternativaE,Gabarito,Comentario
1,"Mulher de 28 anos com febre e disúria.",Ciprofloxacino,Nitrofurantoína,Fosfomicina,Ceftriaxona,Amoxicilina,B,"Primeira linha em cistite não complicada."`;

      const qs = parseCSVToQuestions(csv);
      expect(qs.length).toBe(1);
      expect(qs[0].statement).toBe("Mulher de 28 anos com febre e disúria.");
      expect(qs[0].correctLetter).toBe("B");
      expect(qs[0].options.length).toBe(5);
      expect(qs[0].explanation).toBe("Primeira linha em cistite não complicada.");
    });
  });

  describe("duplicate-detector (Similarity & Trigram Jaccard)", () => {
    it("normalizes text ignoring accents, casing and special characters", () => {
      const norm1 = normalizeStatementForComparison("Paciente com Dor Aguda, em FID!");
      const norm2 = normalizeStatementForComparison("paciente com dor aguda em fid");
      expect(norm1).toBe(norm2);
    });

    it("returns 100% similarity for identical statements", () => {
      const text = "Homem de 45 anos hipertenso admitido com dor torácica opressiva.";
      expect(calculateStatementSimilarity(text, text)).toBe(100);
    });

    it("detects high similarity (> 75%) in slightly edited questions", () => {
      const textA = "Homem de 45 anos, hipertenso, admitido com dor precordial típica opressiva.";
      const textB = "Homem de 45 anos hipertenso admitido no pronto socorro com dor precordial típica opressiva.";
      const sim = calculateStatementSimilarity(textA, textB);
      expect(sim).toBeGreaterThanOrEqual(75);

      const check = findDuplicateInCandidates(textA, [{ id: "q-orig", statement: textB }]);
      expect(check.isDuplicate).toBe(true);
      expect(check.matchedId).toBe("q-orig");
    });

    it("returns low similarity (< 35%) for distinct clinical questions", () => {
      const textA = "Homem de 45 anos hipertenso com dor torácica opressiva.";
      const textB = "Criança de 3 anos com estridor laríngeo e tosse ladrante há 2 dias.";
      const sim = calculateStatementSimilarity(textA, textB);
      expect(sim).toBeLessThan(35);

      const check = findDuplicateInCandidates(textA, [{ id: "q-pedia", statement: textB }]);
      expect(check.isDuplicate).toBe(false);
    });
  });

  describe("ai-classifier (Assisted 4-Axes + Difficulty Inference PR-05)", () => {
    const mockTaxonomy = {
      areas: [
        { id: "area-cm", code: "CM", name: "Clínica Médica", is_active: true, order_index: 1, enamed_stage: "etapa_2_3" },
        { id: "area-cg", code: "CG", name: "Cirurgia Geral", is_active: true, order_index: 2, enamed_stage: "etapa_2_3" },
        { id: "area-go", code: "GO", name: "Ginecologia e Obstetrícia", is_active: true, order_index: 3, enamed_stage: "etapa_2_3" },
        { id: "area-ped", code: "PED", name: "Pediatria", is_active: true, order_index: 4, enamed_stage: "etapa_2_3" },
      ] as TaxArea[],
      cenarios: [
        { id: "cen-urg", code: "URG", name: "Rede de Urgência e Emergência", is_active: true },
        { id: "cen-amb", code: "AMB", name: "Atenção Primária / UBS", is_active: true },
      ] as TaxCenario[],
      temas: [] as TaxTema[],
      competencias: [] as TaxCompetencia[],
    };

    it("infers Cirurgia Geral for surgical abdomen presentation", async () => {
      const res = await suggestQuestionClassification({
        statement: "Paciente com apendicite aguda perfurada e peritonite submetido a laparotomia.",
        options: [{ letter: "A", text: "Cirurgia" }, { letter: "B", text: "Clínica" }],
        taxonomy: mockTaxonomy,
      });

      expect(res.suggestedAreaId).toBe("area-cg");
      expect(res.suggestedAreaName).toBe("Cirurgia Geral");
      expect(res.justification).toBeDefined();
    });

    it("infers Ginecologia e Obstetrícia for pregnancy/delivery presentation", async () => {
      const res = await suggestQuestionClassification({
        statement: "Gestante de 32 semanas em trabalho de parto prematuro com dilatação cervical de 4cm.",
        options: [{ letter: "A", text: "Tocólise" }, { letter: "B", text: "Cesariana" }],
        taxonomy: mockTaxonomy,
      });

      expect(res.suggestedAreaId).toBe("area-go");
      expect(res.suggestedAreaName).toBe("Ginecologia e Obstetrícia");
    });

    it("infers difficulty accurately based on lab complexity and multi-step reasoning (PR-05)", async () => {
      const simpleQ = await suggestQuestionClassification({
        statement: "Qual o agente etiológico mais comum da erisipela?",
        options: [{ letter: "A", text: "Streptococcus" }],
        taxonomy: mockTaxonomy,
      });
      expect(simpleQ.suggestedDifficulty).toBe("facil");

      const complexQ = await suggestQuestionClassification({
        statement: "Homem de 65 anos admitido em choque séptico. Gasometria: pH=7.18, PaO2=58, PaCO2=48, HCO3=14, BE=-10, lactato=4.8 mmol/L. Diante do quadro descrito, qual a melhor conduta terapêutica imediata para estabilização hemodinâmica e ajuste ventilatório?",
        options: [{ letter: "A", text: "Conduta A" }],
        taxonomy: mockTaxonomy,
      });
      expect(complexQ.suggestedDifficulty).toBe("dificil");
    });
  });
});
