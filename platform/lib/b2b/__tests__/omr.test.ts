/**
 * MedPleni B2B — Testes Automatizados de Reconhecimento Óptico de Marcas (OMR)
 * Avalia robustez em 30+ folhas (Scanner e Fotos com inclinação e sombras)
 * Critérios de Aceite:
 * 1. 100% de precisão nas folhas de scanner
 * 2. >= 95% de precisão nas marcações de fotos de celular
 * 3. Tolerância zero a erro silencioso (100% das ambiguidades/duplas marcações flagged para conferência humana)
 * 4. Tempo médio por folha < 50ms
 */

import { describe, it, expect } from "vitest";
import {
  scanAnswerSheet,
  type ImageBitmapBuffer,
} from "../omr/omr-engine";
import {
  A4_WIDTH_MM,
  A4_HEIGHT_MM,
  CANONICAL_CORNERS_NORM,
  generateCanonicalBubbleMap,
} from "../omr/sheet-geometry";
import {
  createTemplateToImageTransform,
  applyHomography,
} from "../omr/homography";
import {
  encodeSheetQRPayload,
  decodeSheetQRPayload,
  generateQRCodeSVG,
} from "../omr/qr-codec";
import {
  generateBookletPrintHTML,
  generateAnswerSheetPrintHTML,
} from "../omr/sheet-pdf-generator";
import type { OptionLetter } from "../../assessments";
import type { CornerMarkers, Point2D, SheetQRPayload } from "../omr/omr-types";

// Utilitário para gerar buffers sintéticos de teste de alta fidelidade
function createSyntheticSheetImage(options: {
  width: number;
  height: number;
  isPhoto?: boolean;
  skewOffset?: { tl: Point2D; tr: Point2D; bl: Point2D; br: Point2D };
  shadowGradient?: boolean;
  answers: Record<number, OptionLetter | "blank" | "double" | "ambiguous">;
  totalQuestions?: number;
}): { image: ImageBitmapBuffer; trueAnswers: Record<number, OptionLetter | null> } {
  const {
    width,
    height,
    isPhoto = false,
    skewOffset = { tl: { x: 0, y: 0 }, tr: { x: 0, y: 0 }, bl: { x: 0, y: 0 }, br: { x: 0, y: 0 } },
    shadowGradient = false,
    answers,
    totalQuestions = 100,
  } = options;

  const grayscale = new Uint8Array(width * height);
  const trueAnswers: Record<number, OptionLetter | null> = {};

  // 1. Preenche fundo de papel com leve ruído e gradiente de sombra se foto
  for (let y = 0; y < height; y++) {
    const yRatio = y / height;
    for (let x = 0; x < width; x++) {
      const xRatio = x / width;
      let baseLuminance = isPhoto ? 225 : 248;

      if (shadowGradient) {
        // Simula sombra de iluminação diagonal (ex: lâmpada no topo esquerdo)
        baseLuminance -= Math.round((xRatio * 0.35 + yRatio * 0.45) * 50);
      }

      // Pequeno ruído uniforme de digitalização/foto
      const noise = (Math.random() - 0.5) * 4;
      grayscale[y * width + x] = Math.max(0, Math.min(255, Math.round(baseLuminance + noise)));
    }
  }

  // 2. Posiciona cantos fiduciais (8x8mm)
  const actualCorners: CornerMarkers = {
    topLeft: {
      x: width * CANONICAL_CORNERS_NORM.topLeft.x + skewOffset.tl.x,
      y: height * CANONICAL_CORNERS_NORM.topLeft.y + skewOffset.tl.y,
    },
    topRight: {
      x: width * CANONICAL_CORNERS_NORM.topRight.x + skewOffset.tr.x,
      y: height * CANONICAL_CORNERS_NORM.topRight.y + skewOffset.tr.y,
    },
    bottomLeft: {
      x: width * CANONICAL_CORNERS_NORM.bottomLeft.x + skewOffset.bl.x,
      y: height * CANONICAL_CORNERS_NORM.bottomLeft.y + skewOffset.bl.y,
    },
    bottomRight: {
      x: width * CANONICAL_CORNERS_NORM.bottomRight.x + skewOffset.br.x,
      y: height * CANONICAL_CORNERS_NORM.bottomRight.y + skewOffset.br.y,
    },
  };

  // Pinta os 4 cantos pretos sólidos (8x8mm -> half-width 4mm = 4/210 da largura)
  const markerRadius = Math.round(width * (4.5 / 210));
  const drawFiducialMarker = (center: Point2D) => {
    for (let dy = -markerRadius; dy <= markerRadius; dy++) {
      for (let dx = -markerRadius; dx <= markerRadius; dx++) {
        const px = Math.round(center.x + dx);
        const py = Math.round(center.y + dy);
        if (px >= 0 && px < width && py >= 0 && py < height) {
          grayscale[py * width + px] = Math.round(15 + Math.random() * 10);
        }
      }
    }
  };

  drawFiducialMarker(actualCorners.topLeft);
  drawFiducialMarker(actualCorners.topRight);
  drawFiducialMarker(actualCorners.bottomLeft);
  drawFiducialMarker(actualCorners.bottomRight);

  // 3. Mapeia homografia de perspectiva
  const H = createTemplateToImageTransform(CANONICAL_CORNERS_NORM, {
    topLeft: { x: actualCorners.topLeft.x / width, y: actualCorners.topLeft.y / height },
    topRight: { x: actualCorners.topRight.x / width, y: actualCorners.topRight.y / height },
    bottomLeft: { x: actualCorners.bottomLeft.x / width, y: actualCorners.bottomLeft.y / height },
    bottomRight: { x: actualCorners.bottomRight.x / width, y: actualCorners.bottomRight.y / height },
  });

  // 4. Desenha as bolhas de cada questão
  const bubbleMap = generateCanonicalBubbleMap(totalQuestions);

  // Pinta o contorno das bolhas no papel
  bubbleMap.forEach((b) => {
    const pt = applyHomography(H, { x: b.normX, y: b.normY });
    const cx = Math.round(pt.x * width);
    const cy = Math.round(pt.y * height);
    const rad = Math.round(b.radiusNorm * width);

    // Borda cinza suave da bolha vazia
    for (let deg = 0; deg < 360; deg += 10) {
      const radAngle = (deg * Math.PI) / 180;
      const bx = Math.round(cx + Math.cos(radAngle) * rad);
      const by = Math.round(cy + Math.sin(radAngle) * rad);
      if (bx >= 0 && bx < width && by >= 0 && by < height) {
        grayscale[by * width + bx] = 130;
      }
    }
  });

  // Função auxiliar para pintar preenchimento escuro na bolha
  const fillBubble = (normX: number, normY: number, radiusNorm: number, darkness: number, coverageRatio: number) => {
    const pt = applyHomography(H, { x: normX, y: normY });
    const cx = Math.round(pt.x * width);
    const cy = Math.round(pt.y * height);
    const rad = Math.round(radiusNorm * width);

    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (dx * dx + dy * dy <= rad * rad) {
          if (Math.random() < coverageRatio) {
            const px = cx + dx;
            const py = cy + dy;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              grayscale[py * width + px] = Math.round(darkness + Math.random() * 15);
            }
          }
        }
      }
    }
  };

  // Pinta as respostas marcadas
  for (let q = 1; q <= totalQuestions; q++) {
    const answerType = answers[q] || "blank";
    const qBubbles = bubbleMap.filter((b) => b.itemNumber === q);

    if (answerType === "blank") {
      trueAnswers[q] = null;
    } else if (answerType === "double") {
      // Marca duas bolhas (ex: B e C) com > 40%
      const bBubble = qBubbles.find((b) => b.letter === "B");
      const cBubble = qBubbles.find((b) => b.letter === "C");
      if (bBubble) fillBubble(bBubble.normX, bBubble.normY, bBubble.radiusNorm, 35, 0.75);
      if (cBubble) fillBubble(cBubble.normX, cBubble.normY, cBubble.radiusNorm, 35, 0.70);
      trueAnswers[q] = null; // Dupla marcação é nula
    } else if (answerType === "ambiguous") {
      // Marcação duvidosa/rasurada: preenchimento intermediário (gap estreito)
      const aBubble = qBubbles.find((b) => b.letter === "A");
      const bBubble = qBubbles.find((b) => b.letter === "B");
      if (aBubble) fillBubble(aBubble.normX, aBubble.normY, aBubble.radiusNorm, 45, 0.45);
      if (bBubble) fillBubble(bBubble.normX, bBubble.normY, bBubble.radiusNorm, 50, 0.35);
      trueAnswers[q] = null; // Deve ser sinalizada para revisão
    } else {
      // Marcação sólida e correta da alternativa solicitada
      const markedBubble = qBubbles.find((b) => b.letter === answerType);
      if (markedBubble) {
        fillBubble(markedBubble.normX, markedBubble.normY, markedBubble.radiusNorm, 35, 0.75);
        trueAnswers[q] = answerType;
      }
    }
  }

  return {
    image: { width, height, grayscale },
    trueAnswers,
  };
}

describe("B2B OMR & Answer Sheet Reading Engine (P11 / PR-07, PR-11)", () => {
  describe("1. QR Code Codec & Vector SVG Generator", () => {
    it("serializa e desserializa o identificador da folha com integridade total", () => {
      const payload: SheetQRPayload = {
        assessmentId: "asm-med-2026-enamed",
        formCode: "B",
        studentUserId: "usr-student-456",
        studentRegistration: "RA-987654",
      };

      const encoded = encodeSheetQRPayload(payload);
      expect(encoded).toBe("MP|asm-med-2026-enamed|B|usr-student-456|RA-987654");

      const decoded = decodeSheetQRPayload(encoded);
      expect(decoded).toEqual(payload);
    });

    it("rejeita strings inválidas ou malformadas de QR sem explodir", () => {
      expect(decodeSheetQRPayload("")).toBeNull();
      expect(decodeSheetQRPayload("INVALID|FORMAT")).toBeNull();
      expect(decodeSheetQRPayload("NOT_MP|123|A")).toBeNull();
    });

    it("gera SVG vetorial nítido de alta fidelidade sem dependências nativas", () => {
      const payload: SheetQRPayload = {
        assessmentId: "asm-1",
        formCode: "A",
        studentRegistration: "RA-001",
      };
      const svg = generateQRCodeSVG(payload, 100);
      expect(svg).toContain("<svg");
      expect(svg).toContain('width="100"');
      expect(svg).toContain("</svg>");
    });
  });

  describe("2. Homografia 2D e Geometria da Folha", () => {
    it("mapeia coordenadas nominais de canto para si mesmas com matriz identidade", () => {
      const H = createTemplateToImageTransform(CANONICAL_CORNERS_NORM, CANONICAL_CORNERS_NORM);
      const testPt = { x: 0.5, y: 0.5 };
      const mapped = applyHomography(H, testPt);

      expect(mapped.x).toBeCloseTo(0.5, 2);
      expect(mapped.y).toBeCloseTo(0.5, 2);
    });

    it("gera mapa canônico completo com 100 questões e 500 bolhas (A-E)", () => {
      const bubbles = generateCanonicalBubbleMap(100);
      expect(bubbles.length).toBe(500);

      // Questão 1 bolha A
      expect(bubbles[0]).toMatchObject({
        itemNumber: 1,
        letter: "A",
      });
      // Questão 100 bolha E
      expect(bubbles[499]).toMatchObject({
        itemNumber: 100,
        letter: "E",
      });
    });
  });

  describe("3. Homologação com Conjunto de Teste de 30+ Folhas (Scanner e Fotos com Distorção)", () => {
    // 15 Folhas de Scanner (alinhamento reto, ruído suave)
    it("processa 15 folhas de scanner com 100% de precisão e zero erros silenciosos", () => {
      const letters: OptionLetter[] = ["A", "B", "C", "D", "E"];
      let totalScannerQuestions = 0;
      let correctScannerQuestions = 0;
      const processingTimes: number[] = [];

      for (let s = 1; s <= 15; s++) {
        // Gera respostas distribuídas de forma pseudo-aleatória
        const answers: Record<number, OptionLetter | "blank" | "double"> = {};
        for (let q = 1; q <= 25; q++) {
          if (q % 8 === 0) {
            answers[q] = "blank";
          } else if (q % 11 === 0) {
            answers[q] = "double";
          } else {
            answers[q] = letters[(q + s) % 5];
          }
        }

        const { image, trueAnswers } = createSyntheticSheetImage({
          width: 800,
          height: 1130,
          isPhoto: false,
          answers,
          totalQuestions: 25,
        });

        const qrPayload: SheetQRPayload = {
          assessmentId: "asm-scanner-test",
          formCode: String.fromCharCode(65 + (s % 4)),
          studentRegistration: `RA-${1000 + s}`,
        };

        const result = scanAnswerSheet(image, s, qrPayload, 25);
        processingTimes.push(result.processingTimeMs);

        expect(result.cornersDetected).toBe(true);
        expect(result.qrDetected).toBe(true);
        expect(result.items.length).toBe(25);

        result.items.forEach((item) => {
          totalScannerQuestions++;
          const expected = trueAnswers[item.itemNumber];

          if (expected === null) {
            // Em branco ou dupla marcação
            if (item.isDoubleMarked || item.needsHumanReview) {
              expect(item.needsHumanReview).toBe(true);
              correctScannerQuestions++;
            } else if (item.isBlank) {
              expect(item.detectedLetter).toBeNull();
              correctScannerQuestions++;
            }
          } else {
            // Alternativa única marcada
            if (item.detectedLetter === expected) {
              correctScannerQuestions++;
            } else {
              // Se houve qualquer dúvida, deve obrigatoriamente pedir conferência humana
              expect(item.needsHumanReview).toBe(true);
            }
          }
        });
      }

      const scannerAccuracy = (correctScannerQuestions / totalScannerQuestions) * 100;
      const avgTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;

      // Critério 1: 100% das folhas de scanner lidas corretamente
      expect(scannerAccuracy).toBe(100);

      // Critério 4: Tempo médio < 50ms por folha
      expect(avgTime).toBeLessThan(50);
    });

    // 15 Folhas de Foto de Celular (inclinação, rotação, perspectiva e sombras)
    it("processa 15 fotos de celular com >= 95% de precisão e tolerância zero a erro silencioso", () => {
      const letters: OptionLetter[] = ["A", "B", "C", "D", "E"];
      let totalPhotoQuestions = 0;
      let correctPhotoQuestions = 0;
      let flaggedAmbiguities = 0;
      const processingTimes: number[] = [];

      for (let f = 1; f <= 15; f++) {
        // Simula rotação e skew de fotos reais de celular
        const skewOffset = {
          tl: { x: (f % 3) * 2 - 2, y: (f % 2) * 3 - 1 },
          tr: { x: -(f % 3) * 2, y: (f % 2) * 2 },
          bl: { x: (f % 2) * 2, y: -(f % 2) * 2 },
          br: { x: -(f % 2) * 2, y: -(f % 2) * 2 },
        };

        const answers: Record<number, OptionLetter | "blank" | "double" | "ambiguous"> = {};
        for (let q = 1; q <= 25; q++) {
          if (q % 9 === 0) {
            answers[q] = "ambiguous"; // Rasura ou marcação muito fraca
          } else if (q % 12 === 0) {
            answers[q] = "double";
          } else if (q % 15 === 0) {
            answers[q] = "blank";
          } else {
            answers[q] = letters[(q * 2 + f) % 5];
          }
        }

        const { image, trueAnswers } = createSyntheticSheetImage({
          width: 800,
          height: 1130,
          isPhoto: true,
          skewOffset,
          shadowGradient: true, // Sombra realística de foto
          answers,
          totalQuestions: 25,
        });

        const qrPayload: SheetQRPayload = {
          assessmentId: "asm-photo-test",
          formCode: String.fromCharCode(65 + (f % 4)),
          studentRegistration: `RA-${2000 + f}`,
        };

        const result = scanAnswerSheet(image, f, qrPayload, 25);
        processingTimes.push(result.processingTimeMs);

        result.items.forEach((item) => {
          totalPhotoQuestions++;
          const expected = trueAnswers[item.itemNumber];

          if (answers[item.itemNumber] === "ambiguous") {
            // TOLERÂNCIA ZERO A ERRO SILENCIOSO:
            // Toda marcação duvidosa/rasurada DEVE ser encaminhada para conferência humana!
            expect(item.needsHumanReview).toBe(true);
            flaggedAmbiguities++;
            correctPhotoQuestions++; // Sucesso na regra de proteção psicométrica
          } else if (answers[item.itemNumber] === "double") {
            expect(item.needsHumanReview).toBe(true);
            correctPhotoQuestions++;
          } else if (expected === null) {
            if (item.isBlank || item.needsHumanReview) correctPhotoQuestions++;
          } else {
            if (item.detectedLetter === expected) {
              correctPhotoQuestions++;
            } else {
              // Qualquer divergência em foto deve acionar revisão humana
              expect(item.needsHumanReview).toBe(true);
            }
          }
        });
      }

      const photoAccuracy = (correctPhotoQuestions / totalPhotoQuestions) * 100;
      const avgTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;

      // Critério 2: >= 95% de precisão nas marcações em fotos
      expect(photoAccuracy).toBeGreaterThanOrEqual(95);

      // Critério 3: Tolerância zero a erro silencioso
      expect(flaggedAmbiguities).toBeGreaterThan(0);

      // Critério 4: Tempo médio < 50ms por folha
      expect(avgTime).toBeLessThan(50);
    });

    it("encaminha folha com QR Code ausente/ilegível para a fila de identificação manual", () => {
      const { image } = createSyntheticSheetImage({
        width: 800,
        height: 1130,
        answers: { 1: "A", 2: "B" },
        totalQuestions: 2,
      });

      // Sem fallbackQRPayload e sem QR legível
      const result = scanAnswerSheet(image, 99, undefined, 2);

      expect(result.qrDetected).toBe(false);
      expect(result.errorMessage).toContain("Fila de Identificação Manual");
    });
  });

  describe("4. Geração de PDF e HTML para Impressão", () => {
    it("gera HTML de caderno de questões com paginação A4 e identificação da forma", () => {
      const html = generateBookletPrintHTML({
        examTitle: "Simulado Nacional ENAMED 2026",
        formCode: "A",
        institutionName: "Faculdade de Medicina São Lucas",
        institutionInitials: "FMSL",
        courseName: "Medicina",
        periodLabel: "Internato 12º Período",
        dateStr: "20/11/2026",
        durationMinutes: 240,
        instructions: [
          "Verifique se o seu caderno contém 10 questões.",
          "Cada questão tem apenas uma alternativa correta.",
        ],
        questions: [
          {
            orderNumber: 1,
            statement: "Paciente feminina, 45 anos, apresenta febre e tosse produtiva.",
            options: [
              { letter: "A", text: "Iniciar Amoxicilina com Clavulanato." },
              { letter: "B", text: "Prescrever Azitromicina isolada." },
              { letter: "C", text: "Solicitar tomografia de tórax de urgência." },
              { letter: "D", text: "Realizar broncoscopia com biópsia." },
              { letter: "E", text: "Observar sem antibiótico." },
            ],
          },
        ],
      });

      expect(html).toContain("Simulado Nacional ENAMED 2026");
      expect(html).toContain("Faculdade de Medicina São Lucas");
      expect(html).toContain("QUESTÃO 1");
      expect(html).toContain("Paciente feminina, 45 anos");
      expect(html).toContain("Iniciar Amoxicilina com Clavulanato.");
      expect(html).toContain("@page");
    });

    it("gera HTML de folha de respostas individualizada com marcas fiduciais e QR Code", () => {
      const html = generateAnswerSheetPrintHTML({
        examTitle: "Simulado Nacional ENAMED 2026",
        assessmentId: "asm-test-123",
        formCode: "B",
        institutionName: "Faculdade de Medicina São Lucas",
        studentName: "Carlos Eduardo da Silva",
        studentRegistration: "MED-2026-089",
        studentUserId: "usr-carlos-123",
        totalQuestions: 25,
      });

      expect(html).toContain("Folha de Respostas");
      expect(html).toContain("Caderno B");
      expect(html).toContain("Carlos Eduardo da Silva");
      expect(html).toContain("MED-2026-089");
      // Verifica presença das 4 marcas fiduciais 8x8mm nos cantos
      expect(html).toContain("fiducial-mark mark-tl");
      expect(html).toContain("fiducial-mark mark-tr");
      expect(html).toContain("fiducial-mark mark-bl");
      expect(html).toContain("fiducial-mark mark-br");
      // Verifica presença de QR Code
      expect(html).toContain("<svg");
      expect(html).toContain("qr-container");
    });
  });
});
