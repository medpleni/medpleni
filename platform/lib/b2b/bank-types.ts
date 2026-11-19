/**
 * MEDPLENI B2B — bank-types.ts
 * Tipos e interfaces do Banco de Questões Institucional.
 */

import type { B2BPlan } from "./types";

export type QuestionVisibility = "medpleni_public" | "institution_private";
export type QuestionStatus = "draft" | "in_review" | "approved" | "published" | "archived";
export type QuestionDifficulty = "facil" | "media" | "dificil";

export interface QuestionOptionItem {
  id?: string;
  letter: "A" | "B" | "C" | "D" | "E";
  text: string;
  is_correct: boolean;
}

export interface QuestionClassificationDetails {
  area_id: string;
  area_name: string;
  area_code: string;
  area_color?: string | null;
  cenario_id?: string | null;
  cenario_name?: string | null;
  tema_id?: string | null;
  tema_name?: string | null;
  competencia_id?: string | null;
  competencia_name?: string | null;
  difficulty: QuestionDifficulty;
  suggestion_origin?: "humano" | "ia";
}

export interface B2BQuestionSummary {
  id: string;
  statement: string;
  clinical_context?: string | null;
  origin_label: string;
  origin_institution_name?: string | null;
  origin_year?: number | null;
  b2b_visibility: QuestionVisibility;
  b2b_status: QuestionStatus;
  institution_id?: string | null;
  has_image: boolean;
  times_used_in_exams: number;
  historical_facility_p?: number | null;
  historical_point_biserial_r?: number | null;
  created_at: string;
  classification?: QuestionClassificationDetails | null;
}

export interface B2BQuestionFull extends B2BQuestionSummary {
  explanation: string;
  license_type?: string | null;
  provenance_source?: string | null;
  author_id?: string | null;
  version: number;
  options: QuestionOptionItem[];
  reviews: QuestionReviewItem[];
  versions: QuestionVersionItem[];
  application_performances?: QuestionApplicationPerformanceItem[];
}

export interface QuestionApplicationPerformanceItem {
  id: string;
  assessment_id: string;
  exam_title: string;
  sample_size: number;
  facility_p: number | null;
  discrimination_d: number | null;
  point_biserial_r: number | null;
  flags: string[];
  applied_at: string;
}

export interface QuestionReviewItem {
  id: string;
  question_id: string;
  reviewer_id: string;
  reviewer_name?: string;
  reviewer_role: string;
  decision: "approved" | "returned_with_comments" | "rejected";
  comments: string;
  created_at: string;
}

export interface QuestionVersionItem {
  id: string;
  version: number;
  statement: string;
  explanation?: string | null;
  change_summary?: string | null;
  created_at: string;
}

export interface BankFilterParams {
  search?: string;
  areaId?: string;
  cenarioId?: string;
  temaId?: string;
  competenciaId?: string;
  difficulty?: string;
  year?: number;
  origin?: string;
  hasImage?: boolean;
  status?: string;
  usedInExams?: boolean;
  visibility?: string;
  page?: number;
  pageSize?: number;
}

export interface BankAreaStat {
  area_id: string;
  code: string;
  name: string;
  color_hex?: string | null;
  published_count: number;
  in_review_count: number;
}

export interface BankGridStat {
  area_id: string;
  cenario_id: string;
  count: number;
}

export interface BankOverviewStats {
  total_published: number;
  total_in_review: number;
  total_draft: number;
  total_private: number;
  plan: B2BPlan;
  area_stats: BankAreaStat[];
  grid_stats: BankGridStat[];
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES PURAS DE REGRA DE NEGÓCIO E FORMATAÇÃO (B2B ESPEC)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formata a origem conforme especificação:
 * "Instituição-ano" ou apenas "ano".
 */
export function formatQuestionOriginLabel(
  institutionName?: string | null,
  year?: number | null
): string {
  const cleanInst = institutionName?.trim();
  if (cleanInst && year) {
    return `${cleanInst}-${year}`;
  }
  if (year) {
    return `${year}`;
  }
  if (cleanInst) {
    return cleanInst;
  }
  return "Autoral MedPleni";
}

/**
 * Avalia se uma instituição sob determinado plano tem permissão para visualizar a questão.
 * Espelha rigorosamente a RLS can_access_question_b2b:
 * - vazia: só enxerga privada da sua instituição.
 * - acervo / plus: enxerga acervo publicado MedPleni + privada da sua instituição.
 * - Uma instituição NUNCA enxerga privada de outra instituição.
 */
export function canInstitutionAccessQuestion({
  plan,
  userInstitutionId,
  questionVisibility,
  questionStatus,
  questionInstitutionId,
}: {
  plan: B2BPlan;
  userInstitutionId: string;
  questionVisibility: QuestionVisibility;
  questionStatus: QuestionStatus;
  questionInstitutionId?: string | null;
}): boolean {
  // 1. Privada da própria instituição: sempre acessível para membros daquela instituição
  if (
    questionVisibility === "institution_private" &&
    questionInstitutionId &&
    questionInstitutionId === userInstitutionId
  ) {
    return true;
  }

  // 2. Privada de outra instituição: NUNCA acessível
  if (
    questionVisibility === "institution_private" &&
    questionInstitutionId &&
    questionInstitutionId !== userInstitutionId
  ) {
    return false;
  }

  // 3. Acervo MedPleni Público
  if (questionVisibility === "medpleni_public") {
    // Só questões com status 'published' são visíveis no acervo institucional
    if (questionStatus !== "published") {
      return false;
    }
    // Plano "vazia" não possui acesso ao acervo MedPleni
    if (plan === "vazia") {
      return false;
    }
    // Planos "acervo" e "plus" têm acesso integral
    return plan === "acervo" || plan === "plus";
  }

  return false;
}

/**
 * Regra de proteção de conteúdo de terceiros:
 * O texto original de terceiros nunca pode ser exposto à instituição;
 * apenas a versão reescrita (statement) é servida.
 */
export function sanitizeQuestionForInstitution<T extends { statement: string; original_third_party_text?: string | null }>(
  question: T
): Omit<T, "original_third_party_text"> {
  const safeQuestion = { ...question };
  delete safeQuestion.original_third_party_text;
  return safeQuestion;
}

/**
 * Formata índice de facilidade psicométrica (p)
 */
export function formatFacilityIndex(p?: number | null): string {
  if (p === null || p === undefined || isNaN(p)) return "—";
  return `${Math.round(p * 100)}%`;
}

/**
 * Formata correlação ponto-bisserial (r_pb)
 */
export function formatPointBiserial(r?: number | null): string {
  if (r === null || r === undefined || isNaN(r)) return "—";
  return r.toFixed(2);
}

