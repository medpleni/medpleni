/**
 * MedPleni B2B — omr-types.ts
 * Definições de Tipos para o Sistema de Leitura Óptica e Correção em Papel (PR-07 / PR-11)
 */

import type { OptionLetter } from "../assessments";

export interface Point2D {
  x: number;
  y: number;
}

export interface CornerMarkers {
  topLeft: Point2D;
  topRight: Point2D;
  bottomLeft: Point2D;
  bottomRight: Point2D;
}

export interface BubbleCoordinate {
  itemNumber: number;
  letter: OptionLetter;
  // Coordenadas normalizadas [0, 1] relativas à folha A4
  normX: number;
  normY: number;
  radiusNorm: number;
}

export interface SheetQRPayload {
  assessmentId: string;
  formCode: string;
  studentUserId?: string;
  studentRegistration?: string; // RA
}

export interface ItemScanResult {
  itemNumber: number;
  assessmentItemId?: string;
  detectedLetter: OptionLetter | null; // null se em branco ou rasurada
  confidence: number; // 0.0 a 1.0
  isDoubleMarked: boolean;
  isBlank: boolean;
  needsHumanReview: boolean;
  bubbleFills: Record<OptionLetter, number>; // Densidade de preenchimento 0.0 a 1.0 por alternativa
  cropSnippetBase64?: string; // Recorte visual da linha da questão para conferência
}

export interface SheetScanResult {
  sheetIndex: number;
  success: boolean;
  qrPayload: SheetQRPayload | null;
  qrDetected: boolean;
  studentName?: string;
  studentRa?: string;
  formCode: string;
  cornersDetected: boolean;
  overallConfidence: number;
  items: ItemScanResult[];
  needsReviewCount: number;
  processingTimeMs: number;
  errorMessage?: string;
}

export interface BatchScanSummary {
  batchId: string;
  assessmentId: string;
  totalSheets: number;
  autoApprovedCount: number; // Folhas 100% confiáveis
  needsReviewCount: number; // Folhas com itens para conferência humana
  unidentifiedCount: number; // Folhas sem QR na fila manual
  averageTimePerSheetMs: number;
  sheets: SheetScanResult[];
}
