/**
 * MedPleni B2B — sheet-geometry.ts
 * Geometria Canônica da Folha de Respostas A4 (210mm x 297mm)
 * Posições normalizadas [0, 1] para 100 questões em 4 colunas de 25
 */

import type { BubbleCoordinate, CornerMarkers, Point2D } from "./omr-types";
import type { OptionLetter } from "../assessments";

// Dimensões A4 em milímetros
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

// Posições das 4 marcas de registro fiduciais nos cantos (quadrados pretos de 8x8mm)
export const CANONICAL_CORNERS_MM: CornerMarkers = {
  topLeft: { x: 15, y: 15 },
  topRight: { x: 195, y: 15 },
  bottomLeft: { x: 15, y: 282 },
  bottomRight: { x: 195, y: 282 },
};

export const CANONICAL_CORNERS_NORM: CornerMarkers = {
  topLeft: {
    x: CANONICAL_CORNERS_MM.topLeft.x / A4_WIDTH_MM,
    y: CANONICAL_CORNERS_MM.topLeft.y / A4_HEIGHT_MM,
  },
  topRight: {
    x: CANONICAL_CORNERS_MM.topRight.x / A4_WIDTH_MM,
    y: CANONICAL_CORNERS_MM.topRight.y / A4_HEIGHT_MM,
  },
  bottomLeft: {
    x: CANONICAL_CORNERS_MM.bottomLeft.x / A4_WIDTH_MM,
    y: CANONICAL_CORNERS_MM.bottomLeft.y / A4_HEIGHT_MM,
  },
  bottomRight: {
    x: CANONICAL_CORNERS_MM.bottomRight.x / A4_WIDTH_MM,
    y: CANONICAL_CORNERS_MM.bottomRight.y / A4_HEIGHT_MM,
  },
};

/**
 * Gera a tabela de posições normalizadas de todas as bolhas (1 a totalQuestions)
 * Organizada em até 4 colunas (25 questões por coluna).
 */
export function generateCanonicalBubbleMap(totalQuestions: number = 100): BubbleCoordinate[] {
  const letters: OptionLetter[] = ["A", "B", "C", "D", "E"];
  const bubbles: BubbleCoordinate[] = [];

  const QUESTIONS_PER_COL = 25;
  const numCols = Math.ceil(totalQuestions / QUESTIONS_PER_COL);

  // Parâmetros em mm
  const startY_mm = 65; // Abaixo do cabeçalho e QR code
  const rowHeight_mm = 8.2;
  const bubbleSpacingX_mm = 5.2;
  const bubbleRadius_mm = 2.0;

  // Largura de cada coluna de questões (espaçamento entre colunas)
  const colWidth_mm = (195 - 15) / numCols;

  for (let q = 1; q <= totalQuestions; q++) {
    const colIdx = Math.floor((q - 1) / QUESTIONS_PER_COL);
    const rowIdx = (q - 1) % QUESTIONS_PER_COL;

    const colStartX_mm = 16 + colIdx * colWidth_mm + 10; // 10mm para rótulo do número
    const rowY_mm = startY_mm + rowIdx * rowHeight_mm;

    letters.forEach((letter, lIdx) => {
      const bubbleX_mm = colStartX_mm + lIdx * bubbleSpacingX_mm;

      bubbles.push({
        itemNumber: q,
        letter,
        normX: bubbleX_mm / A4_WIDTH_MM,
        normY: rowY_mm / A4_HEIGHT_MM,
        radiusNorm: bubbleRadius_mm / A4_WIDTH_MM,
      });
    });
  }

  return bubbles;
}
