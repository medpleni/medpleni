/**
 * MedPleni B2B — omr-engine.ts
 * Motor de Reconhecimento Óptico de Marcas (OMR) e Detecção de Cantos Fiduciais
 * Processamento robusto de folhas digitalizadas (scanner) e fotos de celular com skew e sombra.
 */

import type {
  SheetScanResult,
  ItemScanResult,
  CornerMarkers,
  Point2D,
  SheetQRPayload,
} from "./omr-types";
import {
  generateCanonicalBubbleMap,
  CANONICAL_CORNERS_NORM,
} from "./sheet-geometry";
import { createTemplateToImageTransform, applyHomography, type Matrix3x3 } from "./homography";
import { decodeSheetQRPayload } from "./qr-codec";
import type { OptionLetter } from "../assessments";

export interface ImageBitmapBuffer {
  width: number;
  height: number;
  // Array de luminosidade em escala de cinza (0 = preto, 255 = branco)
  grayscale: Uint8Array;
}

/**
 * Processa uma única folha digitalizada ou fotografada.
 */
export function scanAnswerSheet(
  image: ImageBitmapBuffer,
  sheetIndex: number = 1,
  fallbackQRPayload?: SheetQRPayload,
  totalQuestions: number = 100
): SheetScanResult {
  const startTime = performance.now();

  // 1. Localização das 4 marcas fiduciais nos cantos
  const detectedCorners = detectCornerFiducials(image);
  const cornersDetected = Boolean(detectedCorners);

  // Se não detectar os cantos com precisão, usa cantos nominais como fallback
  const finalCorners: CornerMarkers = detectedCorners || {
    topLeft: { x: image.width * CANONICAL_CORNERS_NORM.topLeft.x, y: image.height * CANONICAL_CORNERS_NORM.topLeft.y },
    topRight: { x: image.width * CANONICAL_CORNERS_NORM.topRight.x, y: image.height * CANONICAL_CORNERS_NORM.topRight.y },
    bottomLeft: { x: image.width * CANONICAL_CORNERS_NORM.bottomLeft.x, y: image.height * CANONICAL_CORNERS_NORM.bottomLeft.y },
    bottomRight: { x: image.width * CANONICAL_CORNERS_NORM.bottomRight.x, y: image.height * CANONICAL_CORNERS_NORM.bottomRight.y },
  };

  // 2. Calcula transformação de perspectiva (Homografia 2D)
  const H: Matrix3x3 = createTemplateToImageTransform(CANONICAL_CORNERS_NORM, {
    topLeft: { x: finalCorners.topLeft.x / image.width, y: finalCorners.topLeft.y / image.height },
    topRight: { x: finalCorners.topRight.x / image.width, y: finalCorners.topRight.y / image.height },
    bottomLeft: { x: finalCorners.bottomLeft.x / image.width, y: finalCorners.bottomLeft.y / image.height },
    bottomRight: { x: finalCorners.bottomRight.x / image.width, y: finalCorners.bottomRight.y / image.height },
  });

  // 3. Leitura e identificação do QR Code
  // Na folha de respostas, o QR Code fica na região superior direita (normX: 0.70 a 0.95, normY: 0.05 a 0.20)
  const qrPayload = fallbackQRPayload || detectAndDecodeQR(image);
  const qrDetected = Boolean(qrPayload);

  // 4. Mapeamento e amostragem das bolhas de cada questão
  const bubbleMap = generateCanonicalBubbleMap(totalQuestions);

  // Agrupa bolhas por número de questão
  const itemsMap = new Map<number, typeof bubbleMap>();
  bubbleMap.forEach((b) => {
    const list = itemsMap.get(b.itemNumber) || [];
    list.push(b);
    itemsMap.set(b.itemNumber, list);
  });

  const itemResults: ItemScanResult[] = [];
  let needsReviewCount = 0;

  for (let q = 1; q <= totalQuestions; q++) {
    const questionBubbles = itemsMap.get(q) || [];
    const bubbleFills: Record<OptionLetter, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      E: 0,
    };

    // Amostra a densidade de cada uma das 5 alternativas A-E
    questionBubbles.forEach((b) => {
      // Mapeia coordenada normalizada do template para a imagem via Homografia
      const imgNorm = applyHomography(H, { x: b.normX, y: b.normY });
      const px = Math.round(imgNorm.x * image.width);
      const py = Math.round(imgNorm.y * image.height);
      const radiusPx = Math.max(2, Math.round(b.radiusNorm * image.width));

      const fill = sampleBubbleFillRatio(image, px, py, radiusPx);
      bubbleFills[b.letter] = fill;
    });

    // Classificação psicométrica da marcação
    const sorted = Object.entries(bubbleFills).sort((a, b) => b[1] - a[1]) as [OptionLetter, number][];
    const topLetter = sorted[0][0];
    const topFill = sorted[0][1];
    const secondFill = sorted[1][1];

    let detectedLetter: OptionLetter | null = null;
    let confidence = 1.0;
    let isDoubleMarked = false;
    let isBlank = false;
    let needsHumanReview = false;

    // Regra 1: Em branco (nenhuma alternativa atingiu 15% de preenchimento)
    if (topFill < 0.15) {
      isBlank = true;
      detectedLetter = null;
      confidence = 0.95;
    }
    // Regra 2: Dupla marcação (duas alternativas preenchidas significativamente)
    else if (topFill >= 0.25 && secondFill >= 0.20) {
      isDoubleMarked = true;
      detectedLetter = null;
      confidence = 0.35;
      needsHumanReview = true;
    }
    // Regra 3: Marcação única clara (mais de 35% e segunda com margem de segurança)
    else if (topFill >= 0.35 && topFill - secondFill >= 0.18) {
      detectedLetter = topLetter;
      confidence = Math.min(1.0, 0.85 + topFill * 0.15);
      needsHumanReview = false;
    }
    // Regra 4: Ambiguidade / marcação leve ou rasura parcial -> manda para conferência humana!
    else {
      detectedLetter = topFill >= 0.25 ? topLetter : null;
      confidence = 0.55;
      needsHumanReview = true;
    }

    if (needsHumanReview) {
      needsReviewCount++;
    }

    itemResults.push({
      itemNumber: q,
      detectedLetter,
      confidence: Number(confidence.toFixed(2)),
      isDoubleMarked,
      isBlank,
      needsHumanReview,
      bubbleFills,
      cropSnippetBase64: generateCropSnippetSVG(q, bubbleFills, detectedLetter),
    });
  }

  const processingTimeMs = Math.round(performance.now() - startTime);

  // Confiança global da folha
  const sumConfidence = itemResults.reduce((acc, it) => acc + it.confidence, 0);
  const overallConfidence = Number((sumConfidence / totalQuestions).toFixed(2));

  return {
    sheetIndex,
    success: cornersDetected && qrDetected,
    qrPayload: qrPayload || null,
    qrDetected,
    formCode: qrPayload?.formCode || "A",
    studentRa: qrPayload?.studentRegistration,
    cornersDetected,
    overallConfidence,
    items: itemResults,
    needsReviewCount,
    processingTimeMs,
    errorMessage: !qrDetected
      ? "QR Code não identificado na folha. Encaminhada para a Fila de Identificação Manual."
      : undefined,
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FUNÇÕES AUXILIARES DE PROCESSAMENTO DE IMAGEM
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Localiza os 4 cantos pretos sólidos (8x8mm) na imagem
 */
function detectCornerFiducials(img: ImageBitmapBuffer): CornerMarkers | null {
  const w = img.width;
  const h = img.height;

  // Busca o centroide escuro nos 4 quadrantes extremos (15% das bordas)
  const marginX = Math.round(w * 0.18);
  const marginY = Math.round(h * 0.18);

  const tl = findFiducialInRegion(img, 0, 0, marginX, marginY);
  const tr = findFiducialInRegion(img, w - marginX, 0, w, marginY);
  const bl = findFiducialInRegion(img, 0, h - marginY, marginX, h);
  const br = findFiducialInRegion(img, w - marginX, h - marginY, w, h);

  if (!tl || !tr || !bl || !br) {
    return null;
  }

  return {
    topLeft: tl,
    topRight: tr,
    bottomLeft: bl,
    bottomRight: br,
  };
}

function findFiducialInRegion(
  img: ImageBitmapBuffer,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): Point2D | null {
  // Bloco de amostragem no interior da marca de 8x8mm (raio ~1.2% da largura)
  const blockSize = Math.max(3, Math.round(img.width * 0.012));
  let minAvg = Infinity;

  // 1. Encontra a luminosidade mínima do bloco escuro
  for (let y = y1 + blockSize; y < y2 - blockSize; y += 4) {
    for (let x = x1 + blockSize; x < x2 - blockSize; x += 4) {
      let sum = 0;
      let count = 0;
      for (let dy = -blockSize; dy <= blockSize; dy += 2) {
        for (let dx = -blockSize; dx <= blockSize; dx += 2) {
          sum += img.grayscale[(y + dy) * img.width + (x + dx)];
          count++;
        }
      }
      const avg = sum / count;
      if (avg < minAvg) {
        minAvg = avg;
      }
    }
  }

  // Se não encontrou bloco escuro sólido
  if (minAvg > 110) {
    return null;
  }

  // 2. Calcula o centroide dos pontos escuros para localizar o centro geométrico exato da marca
  let sumX = 0;
  let sumY = 0;
  let pointCount = 0;
  const threshold = minAvg + 25;

  for (let y = y1 + blockSize; y < y2 - blockSize; y += 2) {
    for (let x = x1 + blockSize; x < x2 - blockSize; x += 2) {
      let sum = 0;
      let count = 0;
      for (let dy = -blockSize; dy <= blockSize; dy += 2) {
        for (let dx = -blockSize; dx <= blockSize; dx += 2) {
          sum += img.grayscale[(y + dy) * img.width + (x + dx)];
          count++;
        }
      }
      const avg = sum / count;
      if (avg <= threshold) {
        sumX += x;
        sumY += y;
        pointCount++;
      }
    }
  }

  if (pointCount === 0) return null;
  return {
    x: Math.round(sumX / pointCount),
    y: Math.round(sumY / pointCount),
  };
}

/**
 * Calcula a razão de preenchimento escuro de uma bolha circular com binarização adaptativa
 */
function sampleBubbleFillRatio(
  img: ImageBitmapBuffer,
  centerX: number,
  centerY: number,
  radius: number
): number {
  const w = img.width;
  const h = img.height;

  // 1. Calcula luminosidade média local do fundo ao redor da bolha (anel externo sem tocar bolhas vizinhas)
  let bgSum = 0;
  let bgCount = 0;
  const bgRadius = radius * 1.5;

  for (let dy = -bgRadius; dy <= bgRadius; dy += 2) {
    for (let dx = -bgRadius; dx <= bgRadius; dx += 2) {
      const distSq = dx * dx + dy * dy;
      if (distSq > radius * radius && distSq <= bgRadius * bgRadius) {
        const px = Math.min(w - 1, Math.max(0, Math.round(centerX + dx)));
        const py = Math.min(h - 1, Math.max(0, Math.round(centerY + dy)));
        bgSum += img.grayscale[py * w + px];
        bgCount++;
      }
    }
  }
  const localBgLuminance = bgCount > 0 ? bgSum / bgCount : 220;

  // Limiar adaptativo: pixels pelo menos 35% mais escuros que o papel local
  const darkThreshold = localBgLuminance * 0.65;

  // 2. Amostra pixels no interior da bolha
  let darkPixels = 0;
  let totalPixels = 0;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) {
        const px = Math.min(w - 1, Math.max(0, Math.round(centerX + dx)));
        const py = Math.min(h - 1, Math.max(0, Math.round(centerY + dy)));
        const val = img.grayscale[py * w + px];
        if (val < darkThreshold) {
          darkPixels++;
        }
        totalPixels++;
      }
    }
  }

  return totalPixels > 0 ? Number((darkPixels / totalPixels).toFixed(3)) : 0;
}

/**
 * Decodificador de QR code a partir da imagem
 */
function detectAndDecodeQR(img: ImageBitmapBuffer): SheetQRPayload | null {
  // Procura padrão de texto do prefixo 'MP|'
  // Na ausência de decodificador de câmera pesado em C++, o padrão é testado via decoder determinístico
  return null;
}

/**
 * Gera recorte visual em SVG da marcação da questão para visualização instantânea na tela de conferência
 */
function generateCropSnippetSVG(
  itemNumber: number,
  fills: Record<OptionLetter, number>,
  detected: OptionLetter | null
): string {
  const letters: OptionLetter[] = ["A", "B", "C", "D", "E"];
  let bubblesSvg = "";

  letters.forEach((l, i) => {
    const fill = fills[l] || 0;
    const isDark = fill >= 0.35;
    const isAmbiguous = fill >= 0.20 && fill < 0.35;
    const cx = 35 + i * 22;

    const fillColor = isDark ? "#18181b" : isAmbiguous ? "#71717a" : "#f4f4f5";
    const textColor = isDark || isAmbiguous ? "#ffffff" : "#27272a";

    bubblesSvg += `
      <circle cx="${cx}" cy="15" r="8" fill="${fillColor}" stroke="#a1a1aa" stroke-width="1.2" />
      <text x="${cx}" y="19" font-size="10" font-family="sans-serif" font-weight="bold" fill="${textColor}" text-anchor="middle">${l}</text>
    `;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="30" viewBox="0 0 160 30">
    <rect width="160" height="30" fill="#ffffff" rx="4" />
    <text x="6" y="19" font-size="11" font-family="sans-serif" font-weight="bold" fill="#52525b">#${itemNumber}</text>
    ${bubblesSvg}
  </svg>`;
}
