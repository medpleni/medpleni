/**
 * MEDPLENI B2B — duplicate-detector.ts
 * Detecção de questões duplicadas por similaridade de enunciado (Trigram / Jaccard).
 */

export interface DuplicateMatch {
  isDuplicate: boolean;
  similarity: number; // 0 a 100
  matchedId?: string;
  matchedSnippet?: string;
}

/**
 * Normaliza o texto removendo pontuação, acentuação e espaços múltiplos
 */
export function normalizeStatementForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^\w\s]/g, " ")       // remove pontuação
    .replace(/\s+/g, " ")           // normaliza espaços
    .trim();
}

/**
 * Gera conjunto de 3-grams a partir do texto normalizado
 */
export function getCharacterTrigrams(text: string): Set<string> {
  const norm = normalizeStatementForComparison(text);
  const trigrams = new Set<string>();
  if (norm.length < 3) {
    trigrams.add(norm);
    return trigrams;
  }
  for (let i = 0; i <= norm.length - 3; i++) {
    trigrams.add(norm.substring(i, i + 3));
  }
  return trigrams;
}

/**
 * Calcula a similaridade de Jaccard entre dois enunciados (0.00 a 100.00)
 */
export function calculateStatementSimilarity(textA: string, textB: string): number {
  if (!textA || !textB) return 0;
  if (textA === textB) return 100;

  const triA = getCharacterTrigrams(textA);
  const triB = getCharacterTrigrams(textB);

  if (triA.size === 0 || triB.size === 0) return 0;

  let intersectionCount = 0;
  for (const t of triA) {
    if (triB.has(t)) {
      intersectionCount++;
    }
  }

  const unionCount = triA.size + triB.size - intersectionCount;
  if (unionCount === 0) return 0;

  const score = (intersectionCount / unionCount) * 100;
  return Math.round(score * 10) / 10;
}

/**
 * Compara um enunciado contra uma lista de questões existentes
 * Limiar padrão: 75%
 */
export function findDuplicateInCandidates(
  statement: string,
  candidates: Array<{ id: string; statement: string }>,
  threshold: number = 75
): DuplicateMatch {
  let highestScore = 0;
  let bestCandidate: { id: string; statement: string } | null = null;

  for (const candidate of candidates) {
    const sim = calculateStatementSimilarity(statement, candidate.statement);
    if (sim > highestScore) {
      highestScore = sim;
      bestCandidate = candidate;
    }
  }

  if (highestScore >= threshold && bestCandidate) {
    return {
      isDuplicate: true,
      similarity: highestScore,
      matchedId: bestCandidate.id,
      matchedSnippet: bestCandidate.statement.substring(0, 140) + "...",
    };
  }

  return {
    isDuplicate: false,
    similarity: highestScore,
  };
}
