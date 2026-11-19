/**
 * MedPleni B2B — homography.ts
 * Cálculo de Homografia Projetiva 2D (Transformação de Perspectiva)
 * Permite corrigir fotos inclinadas, rotacionadas ou com perspectiva de celular.
 */

import type { Point2D, CornerMarkers } from "./omr-types";

export type Matrix3x3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

/**
 * Resolve a matriz de homografia 3x3 que mapeia 4 pontos de origem (src) para 4 pontos de destino (dst)
 * usando o algoritmo DLT (Direct Linear Transformation) e eliminação gaussiana.
 */
export function computeHomography(
  src: [Point2D, Point2D, Point2D, Point2D],
  dst: [Point2D, Point2D, Point2D, Point2D]
): Matrix3x3 {
  // Monta sistema de 8 equações lineares: A * h = b
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const sx = src[i].x;
    const sy = src[i].y;
    const dx = dst[i].x;
    const dy = dst[i].y;

    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);

    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }

  // Eliminação de Gauss-Jordan
  const h = solveLinearSystem8x8(A, b);

  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1.0],
  ];
}

/**
 * Transforma um ponto 2D usando a matriz de homografia 3x3:
 * [x', y', w']^T = H * [x, y, 1]^T
 * (u, v) = (x'/w', y'/w')
 */
export function applyHomography(H: Matrix3x3, pt: Point2D): Point2D {
  const x = pt.x;
  const y = pt.y;

  const wPrime = H[2][0] * x + H[2][1] * y + H[2][2];
  const safeW = Math.abs(wPrime) < 1e-7 ? 1e-7 : wPrime;

  const xPrime = H[0][0] * x + H[0][1] * y + H[0][2];
  const yPrime = H[1][0] * x + H[1][1] * y + H[1][2];

  return {
    x: xPrime / safeW,
    y: yPrime / safeW,
  };
}

/**
 * Cria a matriz de homografia que mapeia pontos canônicos normalizados [0, 1]
 * para os pixels reais da imagem baseando-se nas 4 marcas de registro detectadas.
 */
export function createTemplateToImageTransform(
  canonicalCorners: CornerMarkers,
  detectedCorners: CornerMarkers
): Matrix3x3 {
  const src: [Point2D, Point2D, Point2D, Point2D] = [
    canonicalCorners.topLeft,
    canonicalCorners.topRight,
    canonicalCorners.bottomLeft,
    canonicalCorners.bottomRight,
  ];

  const dst: [Point2D, Point2D, Point2D, Point2D] = [
    detectedCorners.topLeft,
    detectedCorners.topRight,
    detectedCorners.bottomLeft,
    detectedCorners.bottomRight,
  ];

  return computeHomography(src, dst);
}

/**
 * Solver numérico de sistema linear 8x8 via Eliminação de Gauss com pivoteamento parcial
 */
function solveLinearSystem8x8(A: number[][], b: number[]): number[] {
  const n = 8;
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let i = 0; i < n; i++) {
    // Busca pivô máximo
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k;
      }
    }

    const temp = M[i];
    M[i] = M[maxRow];
    M[maxRow] = temp;

    const pivot = M[i][i];
    if (Math.abs(pivot) < 1e-9) continue;

    for (let j = i; j <= n; j++) {
      M[i][j] /= pivot;
    }

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = M[k][i];
        for (let j = i; j <= n; j++) {
          M[k][j] -= factor * M[i][j];
        }
      }
    }
  }

  return M.map((row) => row[n]);
}
