/**
 * MEDPLENI B2B — quality-checker.ts
 * Checagens automáticas de qualidade psicométrica do item (QB-14).
 * Executadas antes do sorteio de amostragem e da revisão médica.
 */

import { calculateStatementSimilarity } from "../importer/duplicate-detector";
import type { AutomatedChecksResult, GeneratedOption } from "./engine-types";

export function runAutomatedQualityChecks(params: {
  statement: string;
  options: GeneratedOption[];
  correctLetter: string;
  explanation: string;
  referenceCitation: string;
  sourceStatement?: string | null;
  maxSimilarityThreshold?: number; // padrão 60%
}): { checks: AutomatedChecksResult; similarityScore: number } {
  const {
    statement,
    options,
    referenceCitation,
    sourceStatement,
    maxSimilarityThreshold = 60,
  } = params;

  const reasons: string[] = [];

  // 1. Uma única alternativa correta
  const correctOptions = options.filter((o) => o.is_correct);
  const singleCorrect = correctOptions.length === 1;
  if (!singleCorrect) {
    reasons.push(
      correctOptions.length === 0
        ? "Nenhuma alternativa marcada como correta."
        : `Múltiplas alternativas marcadas como corretas (${correctOptions.length}).`
    );
  }

  // 2. Alternativas de tamanho homogêneo/parecido (sem distrator discrepante)
  let balancedLength = true;
  if (options.length >= 3) {
    const lengths = options.map((o) => o.text.trim().length);
    const minLen = Math.min(...lengths);
    const maxLen = Math.max(...lengths);
    const ratio = minLen > 0 ? maxLen / minLen : 999;
    if (ratio > 3.2 && maxLen - minLen > 60) {
      balancedLength = false;
      reasons.push(
        `Desequilíbrio de extensão entre alternativas (a maior possui ${ratio.toFixed(1)}x o tamanho da menor).`
      );
    }
  } else {
    balancedLength = false;
    reasons.push(`Número insuficiente de alternativas (${options.length}).`);
  }

  // 3. Sem "Todas as anteriores", "Nenhuma das anteriores" ou opções combinadas (proibição expressa do INEP)
  const forbiddenPhrases = [
    "todas as anteriores",
    "todas estao anteriores",
    "todas estao corretas",
    "todas estão corretas",
    "nenhuma das anteriores",
    "nenhuma das alternativas",
    "todas as alternativas",
    "n.d.a",
    "nda",
    "a e b estao",
    "a e c estao",
    "b e c estao",
    "a e b estão",
    "a e c estão",
    "b e c estão",
  ];

  let noAllAbove = true;
  for (const opt of options) {
    const clean = opt.text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (forbiddenPhrases.some((phrase) => clean.includes(phrase))) {
      noAllAbove = false;
      reasons.push(`Alternativa ${opt.letter} contém formulação proibida ("${opt.text}").`);
    }
  }

  // 4. Comando claro e explícito
  const trimmedStmt = statement.trim();
  const endsWithQuestion = trimmedStmt.endsWith("?");
  const hasCommandPrompt = /(?:qual|assinale|indique|diante|a conduta|o diagnóstico|o tratamento|é correto)/i.test(
    trimmedStmt.slice(-120)
  );
  const clearCommand = endsWithQuestion || hasCommandPrompt;
  if (!clearCommand) {
    reasons.push("Comando final da questão não está claramente formulado ou interrogativo.");
  }

  // 5. Referência bibliográfica citada
  const referencePresent = Boolean(referenceCitation && referenceCitation.trim().length >= 8);
  if (!referencePresent) {
    reasons.push("Ausência de citação de diretriz médica ou referência nacional oficial.");
  }

  // 6. Similaridade segura na reescrita de terceiros
  let similarityScore = 0;
  let safeSimilarity = true;
  if (sourceStatement && sourceStatement.trim()) {
    similarityScore = calculateStatementSimilarity(statement, sourceStatement);
    if (similarityScore > maxSimilarityThreshold) {
      safeSimilarity = false;
      reasons.push(
        `Similaridade com o item de origem (${similarityScore}%) superior ao limite permitido (${maxSimilarityThreshold}%). O item deve ser reescrito com nova apresentação clínica.`
      );
    }
  }

  const allPassed =
    singleCorrect &&
    balancedLength &&
    noAllAbove &&
    clearCommand &&
    referencePresent &&
    safeSimilarity;

  return {
    checks: {
      singleCorrect,
      balancedLength,
      noAllAbove,
      clearCommand,
      referencePresent,
      safeSimilarity,
      allPassed,
      reasons,
    },
    similarityScore,
  };
}
