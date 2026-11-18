"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getB2BUserContext } from "./auth";
import type {
  B2BQuestionSummary,
  B2BQuestionFull,
  BankFilterParams,
  BankOverviewStats,
  QuestionDifficulty,
  QuestionReviewItem,
  QuestionVisibility,
  QuestionStatus,
} from "./bank-types";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. VISÃO GERAL DO BANCO (RPC + FALLBACK)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function getBankOverview(institutionId?: string): Promise<BankOverviewStats> {
  const context = await getB2BUserContext();
  const instId = institutionId || context?.institution?.id;
  const supabase = await createClient();

  const { data: rpcData, error: rpcErr } = await supabase.rpc("get_bank_overview_stats", {
    p_institution_id: instId || null,
  });

  if (!rpcErr && rpcData) {
    return rpcData as BankOverviewStats;
  }

  // Fallback seguro em caso de indisponibilidade momentânea da RPC
  const { count: pubCount } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("b2b_status", "published");

  const { count: revCount } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("b2b_status", "in_review");

  return {
    total_published: pubCount || 0,
    total_in_review: revCount || 0,
    total_draft: 0,
    total_private: 0,
    plan: context?.institution?.plan || "plus",
    area_stats: [],
    grid_stats: [],
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. BUSCA E FILTROS COMBINADOS (EXPLORAR ACERVO)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function searchBankQuestionsAction(
  params: BankFilterParams,
  institutionId?: string
): Promise<{ questions: B2BQuestionSummary[]; totalCount: number }> {
  const context = await getB2BUserContext();
  const instId = institutionId || context?.institution?.id;
  const isMedPleniAdmin = context?.isMedPleniAdmin ?? false;
  const instPlan = context?.institution?.plan || "plus";

  const supabase = await createClient();
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(50, Math.max(5, params.pageSize || 15));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("questions").select(
    `
      id,
      statement,
      clinical_context,
      b2b_origin_label,
      origin_institution_name,
      origin_year,
      b2b_visibility,
      b2b_status,
      institution_id,
      has_image,
      times_used_in_exams,
      historical_facility_p,
      historical_point_biserial_r,
      created_at,
      question_classification (
        area_id,
        cenario_id,
        tema_id,
        competencia_id,
        difficulty,
        suggestion_origin,
        tax_areas ( name, code, color_hex ),
        tax_cenarios ( name ),
        tax_temas ( name ),
        tax_competencias ( name )
      )
    `,
    { count: "exact" }
  );

  // Regra de Isolamento por Plano:
  if (!isMedPleniAdmin) {
    if (instPlan === "vazia") {
      // Instituição com plano "vazia" enxerga APENAS o seu banco privado
      if (instId) {
        query = query.eq("institution_id", instId);
      } else {
        return { questions: [], totalCount: 0 };
      }
    } else {
      // Planos 'acervo' ou 'plus' enxergam acervo MedPleni publicado + banco privado próprio
      if (instId) {
        query = query.or(
          `and(b2b_visibility.eq.medpleni_public,b2b_status.eq.published),institution_id.eq.${instId}`
        );
      } else {
        query = query.eq("b2b_visibility", "medpleni_public").eq("b2b_status", "published");
      }
    }
  }

  // Filtros textuais e categóricos
  if (params.search?.trim()) {
    query = query.ilike("statement", `%${params.search.trim()}%`);
  }

  if (params.status && params.status !== "todos") {
    query = query.eq("b2b_status", params.status);
  }

  if (params.year) {
    query = query.eq("origin_year", params.year);
  }

  if (params.origin?.trim()) {
    query = query.ilike("origin_institution_name", `%${params.origin.trim()}%`);
  }

  if (typeof params.hasImage === "boolean") {
    query = query.eq("has_image", params.hasImage);
  }

  if (typeof params.usedInExams === "boolean") {
    if (params.usedInExams) {
      query = query.gt("times_used_in_exams", 0);
    } else {
      query = query.eq("times_used_in_exams", 0);
    }
  }

  // Ordenação padrão por mais recentes
  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;
  if (error) {
    console.error("Erro ao buscar questões no banco B2B:", error.message);
    return { questions: [], totalCount: 0 };
  }

  interface RawClassificationRow {
    area_id: string;
    cenario_id?: string | null;
    tema_id?: string | null;
    competencia_id?: string | null;
    difficulty?: QuestionDifficulty;
    suggestion_origin?: "humano" | "ia";
    tax_areas?: { name: string; code: string; color_hex?: string | null } | null;
    tax_cenarios?: { name: string } | null;
    tax_temas?: { name: string } | null;
    tax_competencias?: { name: string } | null;
  }

  interface RawQuestionSummaryRow {
    id: string;
    statement: string;
    clinical_context?: string | null;
    b2b_origin_label?: string | null;
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
    question_classification?: RawClassificationRow | RawClassificationRow[] | null;
  }

  const questions: B2BQuestionSummary[] = (data || []).map((item: unknown) => {
    const q = item as RawQuestionSummaryRow;
    const rawClass = Array.isArray(q.question_classification)
      ? q.question_classification[0]
      : q.question_classification;

    let classification = null;
    if (rawClass) {
      classification = {
        area_id: rawClass.area_id,
        area_name: rawClass.tax_areas?.name || "Geral",
        area_code: rawClass.tax_areas?.code || "GEN",
        area_color: rawClass.tax_areas?.color_hex,
        cenario_id: rawClass.cenario_id,
        cenario_name: rawClass.tax_cenarios?.name,
        tema_id: rawClass.tema_id,
        tema_name: rawClass.tax_temas?.name,
        competencia_id: rawClass.competencia_id,
        competencia_name: rawClass.tax_competencias?.name,
        difficulty: (rawClass.difficulty as QuestionDifficulty) || "media",
        suggestion_origin: rawClass.suggestion_origin,
      };
    }

    return {
      id: q.id,
      statement: q.statement,
      clinical_context: q.clinical_context,
      origin_label: q.b2b_origin_label || "MedPleni",
      origin_institution_name: q.origin_institution_name,
      origin_year: q.origin_year,
      b2b_visibility: q.b2b_visibility,
      b2b_status: q.b2b_status,
      institution_id: q.institution_id,
      has_image: Boolean(q.has_image),
      times_used_in_exams: q.times_used_in_exams || 0,
      historical_facility_p: q.historical_facility_p ? Number(q.historical_facility_p) : null,
      historical_point_biserial_r: q.historical_point_biserial_r
        ? Number(q.historical_point_biserial_r)
        : null,
      created_at: q.created_at,
      classification,
    };
  });

  return { questions, totalCount: count || 0 };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. FICHA DA QUESTÃO COMPLETA (QB-05)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function getQuestionFullDetails(questionId: string): Promise<B2BQuestionFull | null> {
  const supabase = await createClient();

  const { data: q, error: qErr } = await supabase
    .from("questions")
    .select(
      `
        *,
        question_classification (
          area_id,
          cenario_id,
          tema_id,
          competencia_id,
          difficulty,
          suggestion_origin,
          tax_areas ( name, code, color_hex ),
          tax_cenarios ( name ),
          tax_temas ( name ),
          tax_competencias ( name )
        ),
        question_options ( id, letter, text, is_correct ),
        question_reviews ( id, reviewer_id, reviewer_role, decision, comments, created_at ),
        question_versions ( id, version, statement, explanation, change_summary, created_at )
      `
    )
    .eq("id", questionId)
    .single();

  if (qErr || !q) {
    return null;
  }

  // Mapeia perfil do revisor se houver
  const reviews: QuestionReviewItem[] = ((q as Record<string, unknown>).question_reviews as Record<string, unknown>[] || []).map((r) => ({
    id: String(r.id),
    question_id: questionId,
    reviewer_id: String(r.reviewer_id),
    reviewer_role: String(r.reviewer_role),
    decision: r.decision as "approved" | "returned_with_comments" | "rejected",
    comments: String(r.comments || ""),
    created_at: String(r.created_at),
  }));

  const rawClass = Array.isArray(q.question_classification)
    ? q.question_classification[0]
    : q.question_classification;

  let classification = null;
  if (rawClass) {
    classification = {
      area_id: rawClass.area_id,
      area_name: rawClass.tax_areas?.name || "Geral",
      area_code: rawClass.tax_areas?.code || "GEN",
      area_color: rawClass.tax_areas?.color_hex,
      cenario_id: rawClass.cenario_id,
      cenario_name: rawClass.tax_cenarios?.name,
      tema_id: rawClass.tema_id,
      tema_name: rawClass.tax_temas?.name,
      competencia_id: rawClass.competencia_id,
      competencia_name: rawClass.tax_competencias?.name,
      difficulty: (rawClass.difficulty as QuestionDifficulty) || "media",
      suggestion_origin: rawClass.suggestion_origin,
    };
  }

  const rawOptions = ((q as Record<string, unknown>).question_options as { letter: "A" | "B" | "C" | "D" | "E"; text: string; is_correct: boolean }[] || []);
  const options = rawOptions.sort((a, b) =>
    a.letter.localeCompare(b.letter)
  );

  return {
    id: q.id,
    statement: q.statement,
    clinical_context: q.clinical_context,
    explanation: q.explanation || "Sem comentário cadastrado.",
    origin_label: q.b2b_origin_label || "MedPleni",
    origin_institution_name: q.origin_institution_name,
    origin_year: q.origin_year,
    b2b_visibility: q.b2b_visibility,
    b2b_status: q.b2b_status,
    institution_id: q.institution_id,
    has_image: Boolean(q.has_image),
    times_used_in_exams: q.times_used_in_exams || 0,
    historical_facility_p: q.historical_facility_p ? Number(q.historical_facility_p) : null,
    historical_point_biserial_r: q.historical_point_biserial_r
      ? Number(q.historical_point_biserial_r)
      : null,
    license_type: q.license_type,
    provenance_source: q.provenance_source,
    author_id: q.author_id,
    version: q.version || 1,
    created_at: q.created_at,
    classification,
    options,
    reviews,
    versions: q.question_versions || [],
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 4. NOVA QUESTÃO POR DOCENTE (QB-06)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function createDocentQuestionAction(data: {
  statement: string;
  clinicalContext?: string;
  areaId: string;
  cenarioId?: string;
  temaId?: string;
  competenciaId?: string;
  difficulty: QuestionDifficulty;
  alternatives: { letter: "A" | "B" | "C" | "D" | "E"; text: string; is_correct: boolean }[];
  explanation: string;
  provenanceSource?: string;
  licenseType?: string;
}) {
  const context = await getB2BUserContext();
  if (!context) {
    throw new Error("Não autenticado.");
  }

  if (!data.statement?.trim()) {
    throw new Error("O enunciado da questão é obrigatório.");
  }

  if (!data.explanation?.trim()) {
    throw new Error("O comentário/devolutiva explicativa é obrigatório (Regra QB-06).");
  }

  if (!data.alternatives || data.alternatives.length < 2) {
    throw new Error("A questão deve conter pelo menos 2 alternativas.");
  }

  const hasCorrect = data.alternatives.some((a) => a.is_correct);
  if (!hasCorrect) {
    throw new Error("Você deve indicar qual alternativa é o gabarito correto.");
  }

  const supabase = await createClient();
  const year = new Date().getFullYear();
  const instName = context.institution.name;
  const originLabel = `${context.institution.initials || "B2B"}-${year}`;

  // 1. Insere questão no banco privado da instituição com status 'in_review'
  const { data: newQ, error: qErr } = await supabase
    .from("questions")
    .insert({
      statement: data.statement.trim(),
      clinical_context: data.clinicalContext?.trim() || null,
      institution: instName,
      year,
      area: "Clínica Médica", // compatibilidade B2C
      subarea: "Geral",
      difficulty: data.difficulty === "dificil" ? "alta" : data.difficulty,
      explanation: data.explanation.trim(),
      institution_id: context.institution.id,
      b2b_visibility: "institution_private",
      b2b_status: "in_review", // vai para revisão
      b2b_origin_label: originLabel,
      origin_institution_name: instName,
      origin_year: year,
      provenance_source: data.provenanceSource?.trim() || `Elaboração Docente (${context.userName})`,
      license_type: data.licenseType || "propria_instituicao",
      author_id: context.userId,
      version: 1,
    })
    .select("id")
    .single();

  if (qErr || !newQ) {
    throw new Error(`Falha ao salvar questão: ${qErr?.message}`);
  }

  // 2. Insere as opções
  const optionRows = data.alternatives.map((alt) => ({
    question_id: newQ.id,
    letter: alt.letter,
    text: alt.text.trim(),
    is_correct: alt.is_correct,
  }));

  const { error: optErr } = await supabase.from("question_options").insert(optionRows);
  if (optErr) throw new Error(optErr.message);

  // 3. Insere a classificação nos 4 eixos
  const { error: classErr } = await supabase.from("question_classification").insert({
    question_id: newQ.id,
    area_id: data.areaId,
    cenario_id: data.cenarioId || null,
    tema_id: data.temaId || null,
    competencia_id: data.competenciaId || null,
    difficulty: data.difficulty,
    classified_by: context.userId,
    confirmed_by: null,
    suggestion_origin: "humano",
  });
  if (classErr) throw new Error(classErr.message);

  // 4. Registra snapshot na tabela question_versions
  await supabase.from("question_versions").insert({
    question_id: newQ.id,
    version: 1,
    statement: data.statement.trim(),
    explanation: data.explanation.trim(),
    options_snapshot: optionRows,
    classification_snapshot: {
      area_id: data.areaId,
      cenario_id: data.cenarioId,
      tema_id: data.temaId,
      competencia_id: data.competenciaId,
      difficulty: data.difficulty,
    },
    edited_by: context.userId,
    change_summary: "Criação original pelo docente",
  });

  revalidatePath("/instituicao/banco");
  return { success: true, questionId: newQ.id };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 5. REVISÃO EM UMA ETAPA ÚNICA (QB-07 / QB-12)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function reviewQuestionAction(
  questionId: string,
  data: {
    decision: "approved" | "returned_with_comments";
    comments: string;
  }
) {
  const context = await getB2BUserContext();
  if (!context) throw new Error("Não autenticado.");

  const isAllowed =
    context.isMedPleniAdmin ||
    context.role === "dirigente" ||
    context.role === "coordenador" ||
    context.role === "docente";

  if (!isAllowed) {
    throw new Error("Apenas membros docentes e gestores podem revisar questões.");
  }

  const supabase = await createClient();

  // 1. Grava a decisão do revisor
  const { error: revErr } = await supabase.from("question_reviews").insert({
    question_id: questionId,
    reviewer_id: context.userId,
    reviewer_role: context.role,
    decision: data.decision,
    comments: data.comments.trim(),
  });

  if (revErr) throw new Error(revErr.message);

  // 2. Atualiza o status da questão
  // Se aprovada -> 'published' ou 'approved'. Se devolvida -> 'draft'
  const newStatus = data.decision === "approved" ? "published" : "draft";

  const { error: qUpdateErr } = await supabase
    .from("questions")
    .update({ b2b_status: newStatus })
    .eq("id", questionId);

  if (qUpdateErr) throw new Error(qUpdateErr.message);

  revalidatePath("/instituicao/banco");
  return { success: true, newStatus };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 6. CONTESTAÇÃO DE QUESTÃO (QB-15)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function disputeQuestionAction(questionId: string, reason: string) {
  const context = await getB2BUserContext();
  if (!context) throw new Error("Não autenticado.");

  if (!reason?.trim() || reason.trim().length < 5) {
    throw new Error("Descreva detalhadamente o motivo da contestação (mínimo 5 caracteres).");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("question_disputes").insert({
    question_id: questionId,
    institution_id: context.institution.id,
    author_id: context.userId,
    reason: reason.trim(),
  });

  if (error) throw new Error(error.message);

  revalidatePath("/instituicao/banco");
  return { success: true };
}
