/**
 * MEDPLENI B2B — engine-types.ts
 * Tipos e interfaces do Motor de Geração Assistida por IA (QB-08, QB-09, QB-13, QB-14).
 */

import type { QuestionDifficulty } from "../bank-types";

export type GenerationMode = "tema_novo" | "devolutiva_para_original" | "reescrita_terceiros";
export type BatchStatus = "generating" | "sampling_review" | "sample_approved" | "sample_rejected" | "released_to_review";
export type SampleReviewStatus = "pending" | "approved" | "rejected";

export interface GenerationInputItem {
  id: string;
  inputType: "inep_guide" | "national_guideline" | "theme_reference";
  title: string;
  areaId?: string | null;
  areaName?: string | null;
  temaId?: string | null;
  temaName?: string | null;
  sourceCitation: string;
  contentText: string;
  fileUrl?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AutomatedChecksResult {
  singleCorrect: boolean;
  balancedLength: boolean;
  noAllAbove: boolean;
  clearCommand: boolean;
  referencePresent: boolean;
  safeSimilarity: boolean;
  allPassed: boolean;
  reasons: string[];
}

export interface GeneratedOption {
  letter: "A" | "B" | "C" | "D" | "E";
  text: string;
  is_correct: boolean;
}

export interface GeneratedQuestionRecord {
  id: string;
  batchId: string;
  sourceQuestionId?: string | null;
  statement: string;
  clinicalContext?: string | null;
  options: GeneratedOption[];
  correctLetter: "A" | "B" | "C" | "D" | "E";
  explanation: string;
  referenceCitation: string;
  originSimilarityScore: number;
  automatedChecks: AutomatedChecksResult;
  passesChecks: boolean;
  isSample: boolean;
  sampleReviewStatus: SampleReviewStatus;
  sampleReviewComment?: string | null;
  sampleReviewedBy?: string | null;
  questionId?: string | null;
  createdAt: string;
}

export interface GenerationBatchRecord {
  id: string;
  createdBy?: string | null;
  mode: GenerationMode;
  areaId?: string | null;
  areaName?: string | null;
  temaId?: string | null;
  temaName?: string | null;
  modelUsed: string;
  promptSnapshot: string;
  inputsUsed: string[];
  samplePercentage: number;
  approvalThresholdPercentage: number;
  status: BatchStatus;
  totalGenerated: number;
  sampleCount: number;
  sampleApprovedCount: number;
  sampleRejectedCount: number;
  estimatedCostUsd: number;
  createdAt: string;
  questions?: GeneratedQuestionRecord[];
}

export interface EngineStatsOverview {
  totalBatches: number;
  totalGeneratedQuestions: number;
  totalSampleReviewed: number;
  overallApprovalRate: number; // 0 a 100
  rateByMode: Record<GenerationMode, { total: number; approved: number; rate: number }>;
  rateByTheme: Array<{ themeName: string; total: number; approved: number; rate: number }>;
}
