/**
 * MedPleni B2B — Types para Provas e Assistente de Montagem (P09 / PR-01 a PR-06)
 */

import type { AssessmentType, AssessmentModality, AssessmentStatus, OptionLetter } from "./assessments";

export interface ExamMatrixDistribution {
  totalQuestions: number;
  areas: Record<string, number>; // Nome da área canônica -> quantidade
  difficultyCurve: {
    facil: number; // Porcentagem (ex: 30)
    media: number; // Porcentagem (ex: 50)
    dificil: number; // Porcentagem (ex: 20)
  };
  minImageQuota: number; // Quantidade mínima de itens com imagem
}

export interface ExamSummary {
  id: string;
  institution_id: string;
  title: string;
  type: AssessmentType;
  modality: AssessmentModality;
  status: AssessmentStatus;
  starts_at?: string | null;
  ends_at?: string | null;
  duration_minutes: number;
  author_id: string;
  author_name?: string;
  coauthors: string[];
  planned_matrix: ExamMatrixDistribution;
  is_template: boolean;
  template_month?: string | null;
  template_edition?: string | null;
  reviewer_id?: string | null;
  reviewer_name?: string | null;
  review_notes?: string | null;
  created_at: string;
  items_count?: number;
  targets_count?: number;
  class_groups_labels?: string[];
}

export interface SelectedQuestionItem {
  id: string; // ID da questão no banco (questions.id)
  statement: string;
  clinical_context?: string | null;
  area_name: string;
  area_id?: string;
  difficulty: "facil" | "media" | "dificil";
  has_image: boolean;
  origin_label: string; // Ex: 'USP-2025' ou 'MedPleni'
  origin_institution_name?: string | null;
  origin_year?: number | null;
  is_inédita: boolean;
  already_applied_warning?: string | null; // Aviso se já aplicada à turma
  options: Array<{
    letter: OptionLetter;
    text: string;
    is_correct: boolean;
  }>;
  correct_letter: OptionLetter;
  explanation?: string | null;
  weight: number;
}

export interface ExamPreCheckResult {
  canPublish: boolean;
  matrixFulfilled: boolean;
  allKeysPresent: boolean;
  noDuplicates: boolean;
  imageQuotaMet: boolean;
  totalSelected: number;
  totalPlanned: number;
  discrepancies: string[];
}
