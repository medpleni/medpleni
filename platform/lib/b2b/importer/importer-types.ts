/**
-- MEDPLENI B2B — importer-types.ts
-- Tipos e interfaces para a esteira de importação e staging de questões.
*/

import type { QuestionDifficulty } from "../bank-types";

export type StagingBatchStatus = "staging" | "ready_for_review" | "importing" | "completed" | "cancelled";
export type StagingItemStatus = "ready" | "pending_key" | "duplicate_warning" | "imported" | "discarded";

export interface StagingOptionItem {
  letter: "A" | "B" | "C" | "D" | "E";
  text: string;
  is_correct: boolean;
}

export interface ParsedQuestionItem {
  order: number;
  originalRawText: string;
  statement: string;
  clinicalContext?: string | null;
  options: StagingOptionItem[];
  correctLetter?: "A" | "B" | "C" | "D" | "E" | null;
  explanation?: string | null;
  images?: string[];
  tables?: Array<Array<string>>;
  originInstitution?: string | null;
  originYear?: number | null;
  parsedAreaName?: string | null;
  parsedCenarioName?: string | null;
}

export interface StagingBatchSummary {
  id: string;
  institutionId: string;
  fileName: string;
  fileType: "docx" | "pdf" | "xlsx" | "csv" | "zip";
  isFullExam: boolean;
  examTitle?: string | null;
  status: StagingBatchStatus;
  totalItems: number;
  readyItems: number;
  pendingItems: number;
  duplicateItems: number;
  importedItems: number;
  aiAccuracyStats: {
    totalSuggested: number;
    accepted: number;
    overridden: number;
  };
  createdAt: string;
}

export interface StagingItemDetails {
  id: string;
  batchId: string;
  itemOrder: number;
  originalRawText: string;
  statement: string;
  clinicalContext?: string | null;
  options: StagingOptionItem[];
  correctLetter?: string | null;
  explanation?: string | null;
  images: string[];
  tables: Array<Array<string>>;
  status: StagingItemStatus;
  duplicateMatchId?: string | null;
  duplicateSimilarity?: number | null;
  duplicateStatementSnippet?: string | null;
  aiAreaId?: string | null;
  aiAreaName?: string | null;
  aiCenarioId?: string | null;
  aiCenarioName?: string | null;
  aiTemaId?: string | null;
  aiTemaName?: string | null;
  aiCompetenciaId?: string | null;
  aiCompetenciaName?: string | null;
  aiDifficulty?: QuestionDifficulty | null;
  aiJustification?: string | null;
  humanConfirmed: boolean;
  humanOverridden: boolean;
  finalAreaId?: string | null;
  finalCenarioId?: string | null;
  finalTemaId?: string | null;
  finalCompetenciaId?: string | null;
  finalDifficulty: QuestionDifficulty;
  importedQuestionId?: string | null;
  createdAt: string;
}
