"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getB2BUserContext } from "../auth";
import { executeGenerationBatch } from "./generator";
import type {
  GenerationMode,
  GenerationInputItem,
  GenerationBatchRecord,
  GeneratedQuestionRecord,
  EngineStatsOverview,
  SampleReviewStatus,
} from "./engine-types";
import type { QuestionDifficulty } from "../bank-types";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. CONSULTA E CADASTRO DE INSUMOS
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function listGenerationInputsAction(): Promise<GenerationInputItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("generation_inputs")
    .select("*, tax_areas(name), tax_temas(name)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((d: any) => ({
    id: d.id,
    inputType: d.input_type,
    title: d.title,
    areaId: d.area_id,
    areaName: d.tax_areas?.name,
    temaId: d.tema_id,
    temaName: d.tax_temas?.name,
    sourceCitation: d.source_citation,
    contentText: d.content_text,
    fileUrl: d.file_url,
    isActive: d.is_active,
    createdAt: d.created_at,
  }));
}

export async function createGenerationInputAction(data: {
  inputType: "inep_guide" | "national_guideline" | "theme_reference";
  title: string;
  sourceCitation: string;
  contentText: string;
  areaId?: string;
  temaId?: string;
}): Promise<{ success: boolean; message?: string }> {
  const context = await getB2BUserContext();
  if (!context?.isMedPleniAdmin) {
    return { success: false, message: "Acesso restrito a Admin MedPleni e Editores." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("generation_inputs").insert({
    input_type: data.inputType,
    title: data.title,
    source_citation: data.sourceCitation,
    content_text: data.contentText,
    area_id: data.areaId || null,
    tema_id: data.temaId || null,
    uploaded_by: context.userId,
    is_active: true,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/instituicao/admin/motor");
  return { success: true };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. EXECUÇÃO DE LOTE CONTROLADO (ATÉ 20 QUESTÕES)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function runGenerationBatchAction(params: {
  mode: GenerationMode;
  areaId?: string;
  temaId?: string;
  themeTitle: string;
  competencyTitle?: string;
  difficulty: QuestionDifficulty;
  guidelineId: string;
  count: number;
  samplePercentage: number;
  approvalThresholdPercentage: number;
  sourceQuestionId?: string;
  sourceStatement?: string;
  sourceExplanation?: string;
  modelName?: string;
}): Promise<{ success: boolean; batchId?: string; message?: string }> {
  const context = await getB2BUserContext();
  if (!context?.isMedPleniAdmin) {
    return { success: false, message: "Acesso restrito a Admin MedPleni e Editores." };
  }

  const supabase = await createClient();

  // 1. Busca conteúdo do insumo / diretriz
  const { data: guideline } = await supabase
    .from("generation_inputs")
    .select("title, source_citation, content_text")
    .eq("id", params.guidelineId)
    .single();

  if (!guideline) {
    return { success: false, message: "Diretriz/insumo de referência não encontrado." };
  }

  // 2. Executa a síntese pelo motor
  const execution = await executeGenerationBatch({
    mode: params.mode,
    themeTitle: params.themeTitle,
    competencyTitle: params.competencyTitle,
    difficulty: params.difficulty,
    guidelineContent: guideline.content_text,
    guidelineCitation: guideline.source_citation,
    count: Math.min(20, params.count || 5),
    samplePercentage: params.samplePercentage || 20,
    sourceQuestionId: params.sourceQuestionId,
    sourceStatement: params.sourceStatement,
    sourceExplanation: params.sourceExplanation,
    modelName: params.modelName,
  });

  const sampleCount = execution.questions.filter((q) => q.isSample).length;

  // 3. Grava o lote no banco
  const { data: batch, error: batchErr } = await supabase
    .from("generation_batches")
    .insert({
      created_by: context.userId,
      mode: params.mode,
      area_id: params.areaId || null,
      tema_id: params.temaId || null,
      model_used: params.modelName || "anthropic/claude-3.7-sonnet",
      prompt_snapshot: execution.promptSnapshot,
      inputs_used: [guideline.title, guideline.source_citation],
      sample_percentage: params.samplePercentage || 20,
      approval_threshold_percentage: params.approvalThresholdPercentage || 80,
      status: "sampling_review",
      total_generated: execution.questions.length,
      sample_count: sampleCount,
      estimated_cost_usd: execution.estimatedCostUsd,
    })
    .select("id")
    .single();

  if (batchErr || !batch) {
    return { success: false, message: `Erro ao criar lote: ${batchErr?.message}` };
  }

  const batchId = batch.id;

  // 4. Grava as questões geradas
  const questionsPayload = execution.questions.map((q) => ({
    batch_id: batchId,
    source_question_id: q.sourceQuestionId,
    statement: q.statement,
    clinical_context: q.clinicalContext,
    options: q.options,
    correct_letter: q.correctLetter,
    explanation: q.explanation,
    reference_citation: q.referenceCitation,
    origin_similarity_score: q.originSimilarityScore,
    automated_checks: q.automatedChecks,
    passes_checks: q.passesChecks,
    is_sample: q.isSample,
    sample_review_status: q.isSample ? "pending" : "pending",
  }));

  const { error: qErr } = await supabase.from("generated_questions").insert(questionsPayload);
  if (qErr) {
    console.error("Erro ao gravar questões geradas:", qErr.message);
  }

  revalidatePath("/instituicao/admin/motor");
  return { success: true, batchId };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. REVISÃO MÉDICA DE ITEM DA AMOSTRA (VALIDAÇÃO POR AMOSTRAGEM)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function reviewSampleItemAction(
  questionId: string,
  decision: "approved" | "rejected",
  comment?: string
): Promise<{ success: boolean; batchStatus?: string; message?: string }> {
  const context = await getB2BUserContext();
  if (!context?.isMedPleniAdmin) {
    return { success: false, message: "Acesso restrito a Admin MedPleni e Editores." };
  }

  const supabase = await createClient();

  // 1. Atualiza parecer na questão da amostra
  const { data: qItem } = await supabase
    .from("generated_questions")
    .select("batch_id, is_sample")
    .eq("id", questionId)
    .single();

  if (!qItem) {
    return { success: false, message: "Item não encontrado." };
  }

  await supabase
    .from("generated_questions")
    .update({
      sample_review_status: decision,
      sample_review_comment: comment || null,
      sample_reviewed_by: context.userId,
    })
    .eq("id", questionId);

  const batchId = qItem.batch_id;

  // 2. Busca todas as questões da amostra desse lote
  const { data: sampleQuestions } = await supabase
    .from("generated_questions")
    .select("sample_review_status")
    .eq("batch_id", batchId)
    .eq("is_sample", true);

  const totalSample = sampleQuestions?.length || 0;
  const approvedCount = (sampleQuestions || []).filter((s) => s.sample_review_status === "approved").length;
  const rejectedCount = (sampleQuestions || []).filter((s) => s.sample_review_status === "rejected").length;
  const pendingCount = (sampleQuestions || []).filter((s) => s.sample_review_status === "pending").length;

  const { data: batch } = await supabase
    .from("generation_batches")
    .select("*, tax_areas(name), tax_temas(name)")
    .eq("id", batchId)
    .single();

  let nextBatchStatus = batch?.status || "sampling_review";

  // Se todas as questões da amostra foram revisadas, avalia o limiar
  if (pendingCount === 0 && totalSample > 0 && batch) {
    const approvalRate = Math.round((approvedCount / totalSample) * 100);
    const threshold = batch.approval_threshold_percentage || 80;

    if (approvalRate >= threshold) {
      nextBatchStatus = "released_to_review";

      // LIBERAÇÃO PARA A FILA NORMAL:
      // Grava todas as questões do lote na tabela oficial `public.questions`
      // REGRA: Entram com b2b_status = 'in_review' (NUNCA published direto!)
      const { data: allBatchQuestions } = await supabase
        .from("generated_questions")
        .select("*")
        .eq("batch_id", batchId);

      for (const genQ of allBatchQuestions || []) {
        const { data: newQ } = await supabase
          .from("questions")
          .insert({
            statement: genQ.statement,
            clinical_context: genQ.clinical_context,
            explanation: genQ.explanation,
            b2b_visibility: "medpleni_public",
            b2b_status: "in_review", // Regra inegociável
            b2b_origin_label: `Motor IA — ${batch.model_used.split("/").pop()}`,
            origin_institution_name: "MedPleni",
            origin_year: new Date().getFullYear(),
            provenance_source: genQ.reference_citation,
            author_id: context.userId,
          })
          .select("id")
          .single();

        if (newQ) {
          // Grava alternativas
          const opts = (genQ.options || []).map((o: any) => ({
            question_id: newQ.id,
            letter: o.letter,
            text: o.text,
            is_correct: o.is_correct,
          }));
          if (opts.length > 0) {
            await supabase.from("question_options").insert(opts);
          }

          // Se o lote tiver área definida, vincula na taxonomia
          if (batch.area_id) {
            await supabase.from("question_classification").insert({
              question_id: newQ.id,
              area_id: batch.area_id,
              tema_id: batch.tema_id || null,
              difficulty: "media",
              classified_by: context.userId,
              confirmed_by: context.userId,
              suggestion_origin: "ia",
            });
          }

          // Atualiza vínculo no item gerado
          await supabase
            .from("generated_questions")
            .update({ question_id: newQ.id })
            .eq("id", genQ.id);
        }
      }
    } else {
      nextBatchStatus = "sample_rejected";
    }
  }

  await supabase
    .from("generation_batches")
    .update({
      sample_approved_count: approvedCount,
      sample_rejected_count: rejectedCount,
      status: nextBatchStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", batchId);

  revalidatePath("/instituicao/admin/motor");
  return { success: true, batchStatus: nextBatchStatus };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 4. PAINEL DE MONITORAMENTO & TAXAS DE APROVAÇÃO
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function getEngineOverviewAction(): Promise<{
  batches: GenerationBatchRecord[];
  stats: EngineStatsOverview;
}> {
  const supabase = await createClient();

  const { data: batchesData } = await supabase
    .from("generation_batches")
    .select("*, tax_areas(name), tax_temas(name), generated_questions(*)")
    .order("created_at", { ascending: false })
    .limit(30);

  const batches: GenerationBatchRecord[] = (batchesData || []).map((b: any) => ({
    id: b.id,
    createdBy: b.created_by,
    mode: b.mode,
    areaId: b.area_id,
    areaName: b.tax_areas?.name,
    temaId: b.tema_id,
    temaName: b.tax_temas?.name,
    modelUsed: b.model_used,
    promptSnapshot: b.prompt_snapshot,
    inputsUsed: b.inputs_used || [],
    samplePercentage: b.sample_percentage,
    approvalThresholdPercentage: b.approval_threshold_percentage,
    status: b.status,
    totalGenerated: b.total_generated,
    sampleCount: b.sample_count,
    sampleApprovedCount: b.sample_approved_count,
    sampleRejectedCount: b.sample_rejected_count,
    estimatedCostUsd: Number(b.estimated_cost_usd || 0),
    createdAt: b.created_at,
    questions: (b.generated_questions || []).map((q: any) => ({
      id: q.id,
      batchId: q.batch_id,
      sourceQuestionId: q.source_question_id,
      statement: q.statement,
      clinicalContext: q.clinical_context,
      options: q.options || [],
      correctLetter: q.correct_letter,
      explanation: q.explanation,
      referenceCitation: q.reference_citation,
      originSimilarityScore: Number(q.origin_similarity_score || 0),
      automatedChecks: q.automated_checks || {},
      passesChecks: Boolean(q.passes_checks),
      isSample: Boolean(q.is_sample),
      sampleReviewStatus: q.sample_review_status as SampleReviewStatus,
      sampleReviewComment: q.sample_review_comment,
      sampleReviewedBy: q.sample_reviewed_by,
      questionId: q.question_id,
      createdAt: q.created_at,
    })),
  }));

  // Agrega estatísticas
  let totalBatches = batches.length;
  let totalGeneratedQuestions = 0;
  let totalSampleReviewed = 0;
  let totalSampleApproved = 0;

  const rateByMode: Record<GenerationMode, { total: number; approved: number; rate: number }> = {
    tema_novo: { total: 0, approved: 0, rate: 0 },
    devolutiva_para_original: { total: 0, approved: 0, rate: 0 },
    reescrita_terceiros: { total: 0, approved: 0, rate: 0 },
  };

  const themeMap = new Map<string, { total: number; approved: number }>();

  for (const b of batches) {
    totalGeneratedQuestions += b.totalGenerated;
    const reviewedInBatch = b.sampleApprovedCount + b.sampleRejectedCount;
    totalSampleReviewed += reviewedInBatch;
    totalSampleApproved += b.sampleApprovedCount;

    if (rateByMode[b.mode]) {
      rateByMode[b.mode].total += reviewedInBatch;
      rateByMode[b.mode].approved += b.sampleApprovedCount;
    }

    const tName = b.temaName || b.areaName || "Geral";
    const currTheme = themeMap.get(tName) || { total: 0, approved: 0 };
    currTheme.total += reviewedInBatch;
    currTheme.approved += b.sampleApprovedCount;
    themeMap.set(tName, currTheme);
  }

  // Calcula percentuais
  for (const m of ["tema_novo", "devolutiva_para_original", "reescrita_terceiros"] as GenerationMode[]) {
    rateByMode[m].rate =
      rateByMode[m].total > 0
        ? Math.round((rateByMode[m].approved / rateByMode[m].total) * 100)
        : 100;
  }

  const rateByTheme = Array.from(themeMap.entries()).map(([themeName, val]) => ({
    themeName,
    total: val.total,
    approved: val.approved,
    rate: val.total > 0 ? Math.round((val.approved / val.total) * 100) : 100,
  }));

  const overallApprovalRate =
    totalSampleReviewed > 0 ? Math.round((totalSampleApproved / totalSampleReviewed) * 100) : 100;

  return {
    batches,
    stats: {
      totalBatches,
      totalGeneratedQuestions,
      totalSampleReviewed,
      overallApprovalRate,
      rateByMode,
      rateByTheme,
    },
  };
}
