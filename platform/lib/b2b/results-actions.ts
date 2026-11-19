/**
 * MEDPLENI B2B — results-actions.ts
 * Server Actions para Fechamento de Correção, Ajustes e Auditoria LGPD
 * - Anular Questão (com justificativa, registro em auditoria e recálculo total)
 * - Trocar Gabarito (com justificativa, registro em auditoria e recálculo total)
 * - Marcar Alunos Ausentes (converte não iniciados em ausentes)
 * - Concluir Correção da Prova (status = 'corrigida')
 * - Registrar Log de Acesso Individual (LGPD)
 */

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getB2BUserContext } from "./auth";
import { calculateAttemptScore, type CalculationItem, type CalculationAnswer, type OptionLetter } from "./assessments";

interface FrozenOptionRow {
  letter: string;
  text: string;
  is_correct: boolean;
}

interface AssessmentItemDbRow {
  id: string;
  weight: number;
  status: string;
  frozen_correct_letter: string;
}

interface AttemptAnswerDbRow {
  assessment_item_id: string;
  marked_base_letter: OptionLetter | null;
}

/**
 * 1. Anula uma questão da prova com justificativa formal, gerando recálculo imediato de todas as notas.
 */
export async function annulAssessmentItemAction(params: {
  assessmentId: string;
  itemId: string;
  reason: string;
}): Promise<{ success: boolean; error?: string; recalculatedAttemptsCount?: number }> {
  try {
    const context = await getB2BUserContext();
    if (!context?.institution?.id || !context.userId) {
      return { success: false, error: "Acesso não autorizado." };
    }

    if (!["dirigente", "coordenador", "docente"].includes(context.role)) {
      return { success: false, error: "Permissão insuficiente para anular questões." };
    }

    if (!params.reason || params.reason.trim().length < 5) {
      return { success: false, error: "A justificativa formal da anulação é obrigatória (mínimo 5 caracteres)." };
    }

    const supabase = await createClient();

    // 1. Busca o item e sua versão
    const { data: item, error: iErr } = await supabase
      .from("assessment_items")
      .select("id, version_id, frozen_correct_letter, status")
      .eq("id", params.itemId)
      .single();

    if (iErr || !item) {
      return { success: false, error: "Item da avaliação não encontrado." };
    }

    // 2. Atualiza o status do item para 'anulado'
    const { error: uErr } = await supabase
      .from("assessment_items")
      .update({ status: "anulado" })
      .eq("id", params.itemId);

    if (uErr) {
      return { success: false, error: "Erro ao anular item: " + uErr.message };
    }

    // 3. Registra em auditoria
    await supabase.from("assessment_item_adjustments").insert({
      assessment_id: params.assessmentId,
      assessment_item_id: params.itemId,
      action_type: "anular",
      previous_letter: item.frozen_correct_letter,
      new_letter: null,
      reason: params.reason.trim(),
      performed_by: context.userId,
    });

    // 4. Executa recálculo de todas as tentativas finalizadas da avaliação
    const recalculatedCount = await recalculateAllAssessmentAttempts(params.assessmentId, item.version_id, supabase);

    revalidatePath(`/instituicao/provas/${params.assessmentId}/resultado`);
    revalidatePath(`/instituicao/provas/${params.assessmentId}/correcao`);

    return { success: true, recalculatedAttemptsCount: recalculatedCount };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg || "Falha inesperada ao anular questão." };
  }
}

/**
 * 2. Altera a alternativa correta (gabarito) de uma questão com justificativa formal e recálculo total.
 */
export async function changeItemCorrectOptionAction(params: {
  assessmentId: string;
  itemId: string;
  newLetter: OptionLetter;
  reason: string;
}): Promise<{ success: boolean; error?: string; recalculatedAttemptsCount?: number }> {
  try {
    const context = await getB2BUserContext();
    if (!context?.institution?.id || !context.userId) {
      return { success: false, error: "Acesso não autorizado." };
    }

    if (!["dirigente", "coordenador", "docente"].includes(context.role)) {
      return { success: false, error: "Permissão insuficiente para alterar gabarito." };
    }

    if (!params.reason || params.reason.trim().length < 5) {
      return { success: false, error: "A justificativa formal da troca de gabarito é obrigatória." };
    }

    const supabase = await createClient();

    // 1. Busca o item
    const { data: item, error: iErr } = await supabase
      .from("assessment_items")
      .select("id, version_id, frozen_correct_letter, frozen_options")
      .eq("id", params.itemId)
      .single();

    if (iErr || !item) {
      return { success: false, error: "Item da avaliação não encontrado." };
    }

    const prevLetter = item.frozen_correct_letter;

    // Atualiza opções congeladas marcando a nova correta
    const updatedOptions = ((item.frozen_options || []) as unknown as FrozenOptionRow[]).map((opt) => ({
      ...opt,
      is_correct: opt.letter === params.newLetter,
    }));

    // 2. Atualiza item no banco
    const { error: uErr } = await supabase
      .from("assessment_items")
      .update({
        frozen_correct_letter: params.newLetter,
        frozen_options: updatedOptions,
      })
      .eq("id", params.itemId);

    if (uErr) {
      return { success: false, error: "Erro ao atualizar gabarito: " + uErr.message };
    }

    // 3. Atualiza is_correct em todas as respostas registradas deste item
    await supabase
      .from("attempt_answers")
      .update({ is_correct: true })
      .eq("assessment_item_id", params.itemId)
      .eq("marked_base_letter", params.newLetter);

    await supabase
      .from("attempt_answers")
      .update({ is_correct: false })
      .eq("assessment_item_id", params.itemId)
      .neq("marked_base_letter", params.newLetter);

    // 4. Registra na auditoria
    await supabase.from("assessment_item_adjustments").insert({
      assessment_id: params.assessmentId,
      assessment_item_id: params.itemId,
      action_type: "trocar_gabarito",
      previous_letter: prevLetter,
      new_letter: params.newLetter,
      reason: params.reason.trim(),
      performed_by: context.userId,
    });

    // 5. Recalcula notas de todas as tentativas
    const recalculatedCount = await recalculateAllAssessmentAttempts(params.assessmentId, item.version_id, supabase);

    revalidatePath(`/instituicao/provas/${params.assessmentId}/resultado`);
    revalidatePath(`/instituicao/provas/${params.assessmentId}/correcao`);

    return { success: true, recalculatedAttemptsCount: recalculatedCount };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg || "Falha inesperada ao trocar gabarito." };
  }
}

/**
 * 3. Marca como ausentes todos os alunos convocados que não iniciaram ou não entregaram a prova.
 */
export async function markAbsentStudentsAction(assessmentId: string): Promise<{
  success: boolean;
  markedAbsentCount: number;
  error?: string;
}> {
  try {
    const context = await getB2BUserContext();
    if (!context?.institution?.id) {
      return { success: false, markedAbsentCount: 0, error: "Acesso não autorizado." };
    }

    const supabase = await createClient();

    // 1. Atualiza tentativas existentes com status 'nao_iniciou' para 'ausente'
    const { data: updated, error: uErr } = await supabase
      .from("attempts")
      .update({
        status: "ausente",
        score_raw: 0,
        score_percentage: 0,
      })
      .eq("assessment_id", assessmentId)
      .eq("status", "nao_iniciou")
      .select("id");

    if (uErr) {
      return { success: false, markedAbsentCount: 0, error: uErr.message };
    }

    revalidatePath(`/instituicao/provas/${assessmentId}/resultado`);

    return { success: true, markedAbsentCount: updated?.length || 0 };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, markedAbsentCount: 0, error: errorMsg };
  }
}

/**
 * 4. Conclui formalmente a correção da prova (status = 'corrigida')
 */
export async function closeAssessmentCorrectionAction(assessmentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const context = await getB2BUserContext();
    if (!context?.institution?.id) {
      return { success: false, error: "Acesso não autorizado." };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("assessments")
      .update({
        status: "corrigida",
        updated_at: new Date().toISOString(),
      })
      .eq("id", assessmentId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/instituicao/provas/${assessmentId}/resultado`);
    revalidatePath("/instituicao/provas");

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * 5. Registra log de auditoria de visualização individual de dados de aluno (Conformidade LGPD)
 */
export async function logStudentIndividualAccessAction(params: {
  studentUserId: string;
  reason: string;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const context = await getB2BUserContext();
    if (!context?.institution?.id || !context.userId) {
      return { success: false, error: "Não autenticado." };
    }

    const supabase = await createClient();

    await supabase.from("individual_access_log").insert({
      institution_id: context.institution.id,
      viewer_user_id: context.userId,
      student_user_id: params.studentUserId,
      reason: params.reason || "Visualização pedagógica de resultado de avaliação",
      metadata: params.metadata || {},
    });

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Função auxiliar interna para recalcular todas as tentativas de uma versão
 */
async function recalculateAllAssessmentAttempts(
  assessmentId: string,
  versionId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<number> {
  // 1. Busca todos os itens da versão
  const { data: allItems } = await supabase
    .from("assessment_items")
    .select("id, weight, status, frozen_correct_letter")
    .eq("version_id", versionId);

  if (!allItems || allItems.length === 0) return 0;

  const calcItems: CalculationItem[] = (allItems as AssessmentItemDbRow[]).map((i) => ({
    id: i.id,
    weight: Number(i.weight || 1),
    status: i.status as "valido" | "anulado",
    correctLetter: i.frozen_correct_letter as OptionLetter,
  }));

  // 2. Busca tentativas finalizadas da avaliação
  const { data: attempts } = await supabase
    .from("attempts")
    .select("id")
    .eq("assessment_id", assessmentId)
    .eq("status", "finalizada");

  if (!attempts || attempts.length === 0) return 0;

  // 3. Para cada tentativa, busca as respostas e recalcula a nota
  for (const att of attempts as Array<{ id: string }>) {
    const { data: answers } = await supabase
      .from("attempt_answers")
      .select("assessment_item_id, marked_base_letter")
      .eq("attempt_id", att.id);

    const calcAnswers: CalculationAnswer[] = ((answers || []) as AttemptAnswerDbRow[]).map((ans) => ({
      itemId: ans.assessment_item_id,
      markedBaseLetter: ans.marked_base_letter as OptionLetter | null,
    }));

    const scoreResult = calculateAttemptScore(calcItems, calcAnswers);

    await supabase
      .from("attempts")
      .update({
        score_raw: scoreResult.scoreRaw,
        score_percentage: scoreResult.scorePercentage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", att.id);
  }

  return attempts.length;
}
