/**
 * MedPleni B2B — exams-checker.ts
 * Funções puras de checagem pré-publicação da avaliação
 * Executadas no cliente e no servidor sem overhead de rede.
 */

import type {
  ExamMatrixDistribution,
  SelectedQuestionItem,
  ExamPreCheckResult,
} from "./exams-types";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CHECAGENS PRÉ-PUBLICAÇÃO (PR-04)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function runExamPreChecks(
  matrix: ExamMatrixDistribution,
  selectedItems: SelectedQuestionItem[]
): ExamPreCheckResult {
  const discrepancies: string[] = [];

  const totalSelected = selectedItems.length;
  const totalPlanned = matrix.totalQuestions;

  // 1. Matriz cumprida
  let matrixFulfilled = totalSelected === totalPlanned;
  if (totalSelected !== totalPlanned) {
    discrepancies.push(`Quantidade de questões (${totalSelected}) diverge da matriz planejada (${totalPlanned}).`);
  }

  // Verifica cotas de área
  for (const [areaName, targetCount] of Object.entries(matrix.areas || {})) {
    const countInSelected = selectedItems.filter((i) =>
      i.area_name.toLowerCase().includes(areaName.toLowerCase())
    ).length;
    if (countInSelected < targetCount) {
      matrixFulfilled = false;
      discrepancies.push(`Área "${areaName}": faltam ${targetCount - countInSelected} questões.`);
    }
  }

  // 2. Gabaritos preenchidos
  const allKeysPresent = selectedItems.every(
    (i) => i.correct_letter && ["A", "B", "C", "D", "E"].includes(i.correct_letter)
  );
  if (!allKeysPresent) {
    discrepancies.push("Existem itens sem gabarito oficial definido.");
  }

  // 3. Sem duplicatas
  const ids = selectedItems.map((i) => i.id);
  const uniqueIds = new Set(ids);
  const noDuplicates = uniqueIds.size === ids.length;
  if (!noDuplicates) {
    discrepancies.push("Existem questões duplicadas selecionadas no caderno.");
  }

  // 4. Cota de imagens
  const imagesCount = selectedItems.filter((i) => i.has_image).length;
  const imageQuotaMet = imagesCount >= (matrix.minImageQuota || 0);
  if (!imageQuotaMet) {
    discrepancies.push(
      `Cota de imagens insuficiente: ${imagesCount} itens com imagem (mínimo exigido: ${matrix.minImageQuota}).`
    );
  }

  const canPublish = matrixFulfilled && allKeysPresent && noDuplicates && imageQuotaMet;

  return {
    canPublish,
    matrixFulfilled,
    allKeysPresent,
    noDuplicates,
    imageQuotaMet,
    totalSelected,
    totalPlanned,
    discrepancies,
  };
}
