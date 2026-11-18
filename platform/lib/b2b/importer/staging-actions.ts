"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getB2BUserContext } from "../auth";
import { getTaxonomyBundle } from "../taxonomy";
import {
  extractParagraphsFromDocx,
  parseQuestionsFromParagraphs,
  parseCSVToQuestions,
} from "./text-parsers";
import { findDuplicateInCandidates } from "./duplicate-detector";
import { suggestQuestionClassification } from "./ai-classifier";
import type {
  StagingBatchSummary,
  StagingItemDetails,
  StagingItemStatus,
} from "./importer-types";
import type { QuestionDifficulty } from "../bank-types";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. ENVIO E EXTRAÇÃO PARA ÁREA DE PREPARAÇÃO (STAGING)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function uploadAndStageFileAction(formData: FormData): Promise<{
  success: boolean;
  batchId?: string;
  totalItems?: number;
  readyItems?: number;
  pendingItems?: number;
  duplicateItems?: number;
  message?: string;
}> {
  const context = await getB2BUserContext();
  if (!context || !context.institution) {
    return { success: false, message: "Não autorizado: usuário sem vínculo institucional." };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, message: "Nenhum arquivo enviado." };
  }

  const isFullExam = formData.get("isFullExam") === "true";
  const examTitle = (formData.get("examTitle") as string) || file.name.replace(/\.[^/.]+$/, "");

  const fileName = file.name;
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (!["docx", "pdf", "xlsx", "csv", "txt"].includes(ext)) {
    return { success: false, message: "Formato não suportado. Envie DOCX, XLSX, CSV ou PDF texto." };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 1. Extração dos parágrafos/questões de acordo com o formato
  let parsedQuestions: ReturnType<typeof parseQuestionsFromParagraphs> = [];

  if (ext === "docx") {
    const paragraphs = extractParagraphsFromDocx(buffer);
    if (paragraphs.length === 0) {
      return { success: false, message: "Não foi possível extrair parágrafos legíveis do arquivo DOCX." };
    }
    parsedQuestions = parseQuestionsFromParagraphs(paragraphs);
  } else if (ext === "csv" || ext === "txt") {
    const text = buffer.toString("utf8");
    if (text.includes("Alternativa") || text.includes("Gabarito") || text.includes(",")) {
      parsedQuestions = parseCSVToQuestions(text);
      if (parsedQuestions.length === 0) {
        // Tenta como parágrafos
        const lines = text.split(/\r?\n/).filter(Boolean);
        parsedQuestions = parseQuestionsFromParagraphs(lines);
      }
    } else {
      const lines = text.split(/\r?\n/).filter(Boolean);
      parsedQuestions = parseQuestionsFromParagraphs(lines);
    }
  } else {
    // Para XLSX ou outros formatos textuais, usa segmentador de parágrafos
    const text = buffer.toString("utf8");
    const lines = text.split(/\r?\n/).filter(Boolean);
    parsedQuestions = parseQuestionsFromParagraphs(lines);
  }

  if (parsedQuestions.length === 0) {
    return { success: false, message: "Nenhuma questão identificada no formato fornecido." };
  }

  const supabase = await createClient();

  // 2. Busca questões existentes para checagem de duplicidade
  const { data: existingQuestions } = await supabase
    .from("questions")
    .select("id, statement")
    .limit(500);

  const candidates = (existingQuestions || []).map((q: { id: string; statement: string | null }) => ({
    id: q.id,
    statement: q.statement || "",
  }));

  // 3. Carrega taxonomia para classificação assistida por IA
  const taxonomy = await getTaxonomyBundle();

  // 4. Cria o lote de staging
  const { data: batch, error: batchErr } = await supabase
    .from("question_staging_batches")
    .insert({
      institution_id: context.institution.id,
      uploaded_by: context.userId,
      file_name: fileName,
      file_type: ext === "docx" ? "docx" : ext === "csv" ? "csv" : "xlsx",
      is_full_exam: isFullExam,
      exam_title: isFullExam ? examTitle : null,
      status: "staging",
      total_items: parsedQuestions.length,
    })
    .select("id")
    .single();

  if (batchErr || !batch) {
    return { success: false, message: `Erro ao criar lote de staging: ${batchErr?.message}` };
  }

  const batchId = batch.id;
  let readyCount = 0;
  let pendingCount = 0;
  let duplicateCount = 0;

  // 5. Prepara os itens em staging
  const stagingItemsPayload = [];

  for (const q of parsedQuestions) {
    // Detecção de duplicata
    const dupCheck = findDuplicateInCandidates(q.statement, candidates);

    // Classificação assistida por IA
    const aiSuggestion = await suggestQuestionClassification({
      statement: q.statement,
      options: q.options,
      explanation: q.explanation,
      parsedAreaHint: q.parsedAreaName,
      parsedCenarioHint: q.parsedCenarioName,
      taxonomy,
    });

    // Determina status inicial
    let itemStatus: StagingItemStatus = "ready";
    if (!q.correctLetter) {
      itemStatus = "pending_key";
      pendingCount++;
    } else if (dupCheck.isDuplicate) {
      itemStatus = "duplicate_warning";
      duplicateCount++;
    } else {
      readyCount++;
    }

    stagingItemsPayload.push({
      batch_id: batchId,
      item_order: q.order,
      original_raw_text: q.originalRawText,
      statement: q.statement,
      clinical_context: q.clinicalContext,
      options: q.options,
      correct_letter: q.correctLetter,
      explanation: q.explanation,
      status: itemStatus,
      duplicate_match_id: dupCheck.matchedId || null,
      duplicate_similarity: dupCheck.similarity || null,
      duplicate_statement_snippet: dupCheck.matchedSnippet || null,
      ai_area_id: aiSuggestion.suggestedAreaId || null,
      ai_cenario_id: aiSuggestion.suggestedCenarioId || null,
      ai_difficulty: aiSuggestion.suggestedDifficulty,
      ai_justification: aiSuggestion.justification,
      human_confirmed: false,
      human_overridden: false,
      final_area_id: aiSuggestion.suggestedAreaId || null,
      final_cenario_id: aiSuggestion.suggestedCenarioId || null,
      final_difficulty: aiSuggestion.suggestedDifficulty,
    });
  }

  // Grava itens em blocos de 50
  for (let i = 0; i < stagingItemsPayload.length; i += 50) {
    const chunk = stagingItemsPayload.slice(i, i + 50);
    const { error: itemsErr } = await supabase.from("question_staging_items").insert(chunk);
    if (itemsErr) {
      console.error("Erro ao gravar chunk de staging:", itemsErr.message);
    }
  }

  // Atualiza contadores no batch
  await supabase
    .from("question_staging_batches")
    .update({
      ready_items: readyCount,
      pending_items: pendingCount,
      duplicate_items: duplicateCount,
      ai_accuracy_stats: {
        totalSuggested: parsedQuestions.length,
        accepted: 0,
        overridden: 0,
      },
    })
    .eq("id", batchId);

  revalidatePath("/instituicao/banco/importar");

  return {
    success: true,
    batchId,
    totalItems: parsedQuestions.length,
    readyItems: readyCount,
    pendingItems: pendingCount,
    duplicateItems: duplicateCount,
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. CONSULTA DE LOTE E ITENS EM STAGING
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function getStagingBatchAction(batchId: string): Promise<{
  batch: StagingBatchSummary | null;
  items: StagingItemDetails[];
}> {
  const supabase = await createClient();

  const { data: batchData, error: bErr } = await supabase
    .from("question_staging_batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (bErr || !batchData) {
    return { batch: null, items: [] };
  }

  const { data: itemsData, error: iErr } = await supabase
    .from("question_staging_items")
    .select("*, tax_areas(name), tax_cenarios(name)")
    .eq("batch_id", batchId)
    .order("item_order", { ascending: true });

  if (iErr) {
    return { batch: null, items: [] };
  }

  const batch: StagingBatchSummary = {
    id: batchData.id,
    institutionId: batchData.institution_id,
    fileName: batchData.file_name,
    fileType: batchData.file_type,
    isFullExam: Boolean(batchData.is_full_exam),
    examTitle: batchData.exam_title,
    status: batchData.status,
    totalItems: batchData.total_items,
    readyItems: batchData.ready_items,
    pendingItems: batchData.pending_items,
    duplicateItems: batchData.duplicate_items,
    importedItems: batchData.imported_items,
    aiAccuracyStats: batchData.ai_accuracy_stats || { totalSuggested: 0, accepted: 0, overridden: 0 },
    createdAt: batchData.created_at,
  };

  const items: StagingItemDetails[] = (itemsData || []).map((item: Record<string, unknown>) => ({
    id: String(item.id),
    batchId: String(item.batch_id),
    itemOrder: Number(item.item_order),
    originalRawText: String(item.original_raw_text || ""),
    statement: String(item.statement || ""),
    clinicalContext: item.clinical_context ? String(item.clinical_context) : null,
    options: (item.options as StagingItemDetails["options"]) || [],
    correctLetter: item.correct_letter ? String(item.correct_letter) : null,
    explanation: item.explanation ? String(item.explanation) : null,
    images: (item.images as string[]) || [],
    tables: (item.tables as string[][]) || [],
    status: item.status as StagingItemStatus,
    duplicateMatchId: item.duplicate_match_id ? String(item.duplicate_match_id) : null,
    duplicateSimilarity: item.duplicate_similarity ? Number(item.duplicate_similarity) : null,
    duplicateStatementSnippet: item.duplicate_statement_snippet ? String(item.duplicate_statement_snippet) : null,
    aiAreaId: item.ai_area_id ? String(item.ai_area_id) : null,
    aiAreaName: (item.tax_areas as { name: string } | null)?.name,
    aiCenarioId: item.ai_cenario_id ? String(item.ai_cenario_id) : null,
    aiCenarioName: (item.tax_cenarios as { name: string } | null)?.name,
    aiDifficulty: item.ai_difficulty as QuestionDifficulty | null,
    aiJustification: item.ai_justification ? String(item.ai_justification) : null,
    humanConfirmed: Boolean(item.human_confirmed),
    humanOverridden: Boolean(item.human_overridden),
    finalAreaId: item.final_area_id ? String(item.final_area_id) : null,
    finalCenarioId: item.final_cenario_id ? String(item.final_cenario_id) : null,
    finalDifficulty: (item.final_difficulty as QuestionDifficulty) || "media",
    importedQuestionId: item.imported_question_id ? String(item.imported_question_id) : null,
    createdAt: String(item.created_at),
  }));

  return { batch, items };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. ATUALIZAÇÃO / CORREÇÃO MANUAL DO ITEM NA TELA LADO A LADO
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function updateStagingItemAction(
  itemId: string,
  payload: {
    statement?: string;
    correctLetter?: "A" | "B" | "C" | "D" | "E";
    explanation?: string;
    finalAreaId?: string;
    finalCenarioId?: string;
    finalDifficulty?: QuestionDifficulty;
    status?: StagingItemStatus;
  }
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("question_staging_items")
    .select("*, batch_id, ai_area_id, ai_difficulty")
    .eq("id", itemId)
    .single();

  if (!current) {
    return { success: false, message: "Item não encontrado." };
  }

  // Verifica se o humano alterou a sugestão da IA
  const isOverridden =
    (payload.finalAreaId && payload.finalAreaId !== current.ai_area_id) ||
    (payload.finalDifficulty && payload.finalDifficulty !== current.ai_difficulty);

  const newStatus = payload.correctLetter && current.status === "pending_key" ? "ready" : (payload.status || current.status);

  // Atualiza as opções se o gabarito mudou
  let updatedOptions = current.options;
  if (payload.correctLetter) {
    updatedOptions = ((current.options as Array<{ letter: string; text: string; is_correct: boolean }>) || []).map((opt) => ({
      ...opt,
      is_correct: opt.letter === payload.correctLetter,
    }));
  }

  const { error } = await supabase
    .from("question_staging_items")
    .update({
      statement: payload.statement !== undefined ? payload.statement : current.statement,
      correct_letter: payload.correctLetter !== undefined ? payload.correctLetter : current.correct_letter,
      options: updatedOptions,
      explanation: payload.explanation !== undefined ? payload.explanation : current.explanation,
      final_area_id: payload.finalAreaId !== undefined ? payload.finalAreaId : current.final_area_id,
      final_cenario_id: payload.finalCenarioId !== undefined ? payload.finalCenarioId : current.final_cenario_id,
      final_difficulty: payload.finalDifficulty !== undefined ? payload.finalDifficulty : current.final_difficulty,
      status: newStatus,
      human_confirmed: true,
      human_overridden: Boolean(isOverridden),
    })
    .eq("id", itemId);

  if (error) {
    return { success: false, message: error.message };
  }

  // Recalcula contadores no lote
  const { data: allItems } = await supabase
    .from("question_staging_items")
    .select("status, human_confirmed, human_overridden")
    .eq("batch_id", current.batch_id);

  if (allItems) {
    const ready = allItems.filter((i: { status: string }) => i.status === "ready").length;
    const pending = allItems.filter((i: { status: string }) => i.status === "pending_key").length;
    const dups = allItems.filter((i: { status: string }) => i.status === "duplicate_warning").length;
    const overridden = allItems.filter((i: { human_overridden: boolean }) => i.human_overridden).length;
    const confirmed = allItems.filter((i: { human_confirmed: boolean }) => i.human_confirmed).length;

    await supabase
      .from("question_staging_batches")
      .update({
        ready_items: ready,
        pending_items: pending,
        duplicate_items: dups,
        ai_accuracy_stats: {
          totalSuggested: allItems.length,
          accepted: confirmed - overridden,
          overridden: overridden,
        },
      })
      .eq("id", current.batch_id);
  }

  return { success: true };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 4. CONFIRMAR TODOS OS ITENS APTOS
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function confirmAllStagingItemsAction(batchId: string): Promise<{ success: boolean; count: number }> {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("question_staging_items")
    .select("id, status, correct_letter")
    .eq("batch_id", batchId)
    .neq("status", "discarded");

  let confirmedCount = 0;
  for (const item of items || []) {
    if (item.correct_letter) {
      await supabase
        .from("question_staging_items")
        .update({
          status: "ready",
          human_confirmed: true,
        })
        .eq("id", item.id);
      confirmedCount++;
    }
  }

  revalidatePath(`/instituicao/banco/importar`);
  return { success: true, count: confirmedCount };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 5. SUBMETER LOTE PARA REVISÃO (REGRA: NADA ENTRA PUBLICADO DIRETO)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function submitBatchToReviewAction(
  batchId: string
): Promise<{ success: boolean; importedCount: number; message?: string; examId?: string }> {
  const context = await getB2BUserContext();
  if (!context || !context.institution) {
    return { success: false, importedCount: 0, message: "Não autorizado." };
  }

  const supabase = await createClient();

  // 1. Busca dados do lote
  const { data: batch } = await supabase
    .from("question_staging_batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (!batch) {
    return { success: false, importedCount: 0, message: "Lote não encontrado." };
  }

  // 2. Busca itens prontos (status = 'ready')
  const { data: items } = await supabase
    .from("question_staging_items")
    .select("*")
    .eq("batch_id", batchId)
    .eq("status", "ready")
    .order("item_order", { ascending: true });

  if (!items || items.length === 0) {
    return { success: false, importedCount: 0, message: "Nenhum item pronto para submissão no lote." };
  }

  let importedCount = 0;
  const importedQuestionIds: string[] = [];

  for (const item of items) {
    // Grava questão como institution_private e status in_review (NUNCA published direto!)
    const { data: newQ, error: qErr } = await supabase
      .from("questions")
      .insert({
        statement: item.statement,
        clinical_context: item.clinical_context,
        explanation: item.explanation || "Sem comentário cadastrado.",
        b2b_visibility: "institution_private",
        institution_id: context.institution.id,
        b2b_status: "in_review", // Regra inegociável da ESPEC
        b2b_origin_label: batch.file_name.replace(/\.[^/.]+$/, ""),
        origin_institution_name: context.institution.name,
        origin_year: new Date().getFullYear(),
        author_id: context.userId,
        original_third_party_text: item.original_raw_text,
      })
      .select("id")
      .single();

    if (qErr || !newQ) {
      console.error("Erro ao gravar questão do staging:", qErr?.message);
      continue;
    }

    const questionId = newQ.id;
    importedQuestionIds.push(questionId);

    // Grava as alternativas
    const optionsPayload = ((item.options as Array<{ letter: string; text: string }>) || []).map((opt) => ({
      question_id: questionId,
      letter: opt.letter,
      text: opt.text,
      is_correct: opt.letter === item.correct_letter,
    }));

    if (optionsPayload.length > 0) {
      await supabase.from("question_options").insert(optionsPayload);
    }

    // Grava classificação canônica se houver área
    if (item.final_area_id) {
      await supabase.from("question_classification").insert({
        question_id: questionId,
        area_id: item.final_area_id,
        cenario_id: item.final_cenario_id || null,
        tema_id: item.final_tema_id || null,
        competencia_id: item.final_competencia_id || null,
        difficulty: item.final_difficulty || "media",
        classified_by: context.userId,
        confirmed_by: context.userId,
        suggestion_origin: item.human_overridden ? "humano" : "ia",
      });
    }

    // Atualiza o item de staging como importado
    await supabase
      .from("question_staging_items")
      .update({
        status: "imported",
        imported_question_id: questionId,
      })
      .eq("id", item.id);

    importedCount++;
  }

  let createdExamId: string | undefined;

  // 3. Se for prova inteira, cria uma simulação/prova em rascunho (PR-15)
  if (batch.is_full_exam && importedQuestionIds.length > 0) {
    const { data: examData } = await supabase
      .from("simulations")
      .insert({
        title: batch.exam_title || `Prova Importada: ${batch.file_name}`,
        description: `Prova importada de arquivo institucional (${importedQuestionIds.length} questões na ordem original).`,
        is_published: false, // Rascunho
        exam_type: "institutional_exam",
      })
      .select("id")
      .single();

    if (examData) {
      createdExamId = examData.id;
    }
  }

  // 4. Atualiza status do lote
  await supabase
    .from("question_staging_batches")
    .update({
      status: "completed",
      imported_items: importedCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", batchId);

  revalidatePath("/instituicao/banco");
  revalidatePath("/instituicao/banco/importar");

  return {
    success: true,
    importedCount,
    examId: createdExamId,
  };
}
