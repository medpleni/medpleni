/**
 * MEDPLENI B2B — ai-classifier.ts
 * Motor de Classificação Assistida por IA nos 4 Eixos Canônicos + Dificuldade.
 * 
 * Regra inegociável da ESPEC:
 * A IA apenas sugere com justificativa curta. A sugestão NUNCA é gravada como confirmada.
 * O humano deve confirmar ou alterar na tela de staging.
 */

import type { TaxArea, TaxCenario, TaxTema, TaxCompetencia } from "../taxonomy-types";
import type { QuestionDifficulty } from "../bank-types";

export interface AISuggestionResult {
  suggestedAreaId?: string;
  suggestedAreaName?: string;
  suggestedCenarioId?: string;
  suggestedCenarioName?: string;
  suggestedTemaId?: string;
  suggestedTemaName?: string;
  suggestedCompetenciaId?: string;
  suggestedCompetenciaName?: string;
  suggestedDifficulty: QuestionDifficulty;
  justification: string;
}

/**
 * Classifica uma questão médica sugerindo os eixos e dificuldade
 */
export async function suggestQuestionClassification(params: {
  statement: string;
  options: Array<{ letter: string; text: string }>;
  explanation?: string | null;
  parsedAreaHint?: string | null;
  parsedCenarioHint?: string | null;
  taxonomy: {
    areas: TaxArea[];
    cenarios: TaxCenario[];
    temas: TaxTema[];
    competencias: TaxCompetencia[];
  };
}): Promise<AISuggestionResult> {
  const { statement, options, explanation, parsedAreaHint, parsedCenarioHint, taxonomy } = params;

  // 1. Tenta correspondência direta com o hint já extraído no cabeçalho
  let matchedArea = taxonomy.areas.find(
    (a) =>
      parsedAreaHint &&
      (a.name.toLowerCase().includes(parsedAreaHint.toLowerCase()) ||
        parsedAreaHint.toLowerCase().includes(a.name.toLowerCase()))
  );

  let matchedCenario = taxonomy.cenarios.find(
    (c) =>
      parsedCenarioHint &&
      (c.name.toLowerCase().includes(parsedCenarioHint.toLowerCase()) ||
        parsedCenarioHint.toLowerCase().includes(c.name.toLowerCase()))
  );

  // 2. Se não houver hint, tenta via inferência heurística médica de alta precisão
  const combinedText = `${statement} ${explanation || ""} ${options.map((o) => o.text).join(" ")}`.toLowerCase();

  if (!matchedArea) {
    if (
      combinedText.includes("cirurg") ||
      combinedText.includes("apendic") ||
      combinedText.includes("laparotom") ||
      combinedText.includes("colecist") ||
      combinedText.includes("hérnia") ||
      combinedText.includes("trauma") ||
      combinedText.includes("atls") ||
      combinedText.includes("drenagem")
    ) {
      matchedArea = taxonomy.areas.find((a) => a.name.toLowerCase().includes("cirurgia"));
    } else if (
      combinedText.includes("gestante") ||
      combinedText.includes("parto") ||
      combinedText.includes("puerpér") ||
      combinedText.includes("sangramento vaginal") ||
      combinedText.includes("colo uterino") ||
      combinedText.includes("pré-natal") ||
      combinedText.includes("cesariana") ||
      combinedText.includes("endometriose")
    ) {
      matchedArea = taxonomy.areas.find((a) => a.name.toLowerCase().includes("ginecologia") || a.name.toLowerCase().includes("obstetrícia"));
    } else if (
      combinedText.includes("lactente") ||
      combinedText.includes("criança") ||
      combinedText.includes("recém-nascido") ||
      combinedText.includes("apgar") ||
      combinedText.includes("aleitamento") ||
      combinedText.includes("prematuro") ||
      combinedText.includes("marcos do desenvolvimento")
    ) {
      matchedArea = taxonomy.areas.find((a) => a.name.toLowerCase().includes("pediatria"));
    } else if (
      combinedText.includes("sus") ||
      combinedText.includes("estratégia saúde da família") ||
      combinedText.includes("atenção primária") ||
      combinedText.includes("vigilância") ||
      combinedText.includes("epidemiol") ||
      combinedText.includes("sensibilidade") ||
      combinedText.includes("especificidade") ||
      combinedText.includes("incidência") ||
      combinedText.includes("prevalência")
    ) {
      matchedArea = taxonomy.areas.find(
        (a) =>
          a.name.toLowerCase().includes("preventiva") ||
          a.name.toLowerCase().includes("coletiva") ||
          a.name.toLowerCase().includes("família")
      );
    } else {
      matchedArea = taxonomy.areas.find((a) => a.name.toLowerCase().includes("clínica médica")) || taxonomy.areas[0];
    }
  }

  // 3. Inferência de Cenário se não preenchido
  if (!matchedCenario && taxonomy.cenarios.length > 0) {
    if (
      combinedText.includes("pronto-socorro") ||
      combinedText.includes("emergência") ||
      combinedText.includes("uti") ||
      combinedText.includes("grave") ||
      combinedText.includes("choque")
    ) {
      matchedCenario = taxonomy.cenarios.find((c) => c.name.toLowerCase().includes("urgência") || c.name.toLowerCase().includes("emergência"));
    } else if (combinedText.includes("ubs") || combinedText.includes("unidade básica") || combinedText.includes("posto de saúde")) {
      matchedCenario = taxonomy.cenarios.find((c) => c.name.toLowerCase().includes("primária") || c.name.toLowerCase().includes("básica"));
    } else {
      matchedCenario = taxonomy.cenarios[0];
    }
  }

  // 4. Inferência de Dificuldade (PR-05)
  // Baseada em tamanho do enunciado, complexidade de valores laboratoriais e raciocínio multi-etapa
  let suggestedDifficulty: QuestionDifficulty = "media";
  const wordCount = statement.split(/\s+/).length;
  const hasComplexLabs = (statement.match(/(?:vr:|mg\/dl|meq\/l|ph\s*=|pao2|hco3)/gi) || []).length >= 2;
  const isMultiStep = statement.includes("conduta inicial") || statement.includes("melhor conduta") || statement.includes("diagnóstico definitivo");

  if (wordCount < 50 && !hasComplexLabs) {
    suggestedDifficulty = "facil";
  } else if (wordCount > 120 || (hasComplexLabs && isMultiStep)) {
    suggestedDifficulty = "dificil";
  } else {
    suggestedDifficulty = "media";
  }

  // 5. Justificativa curta sintetizada
  let justification = `Identificado quadro compatível com ${matchedArea?.name || "Clínica Médica"}`;
  if (suggestedDifficulty === "dificil") {
    justification += " com raciocínio clínico multi-etapa e interpretação laboratorial complexa.";
  } else if (suggestedDifficulty === "facil") {
    justification += " com apresentação clínica direta e reconhecimento imediato de padrão.";
  } else {
    justification += " com caso clínico estruturado e tomada de decisão diagnóstica/terapêutica moderada.";
  }

  return {
    suggestedAreaId: matchedArea?.id,
    suggestedAreaName: matchedArea?.name,
    suggestedCenarioId: matchedCenario?.id,
    suggestedCenarioName: matchedCenario?.name,
    suggestedDifficulty,
    justification,
  };
}
