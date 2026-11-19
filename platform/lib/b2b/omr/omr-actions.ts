"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getB2BUserContext } from "../auth";
import { scanAnswerSheet, type ImageBitmapBuffer } from "./omr-engine";
import { recordAttemptAnswer, submitAttempt, type OptionLetter } from "../assessments";
import type {
  SheetScanResult,
  BatchScanSummary,
  SheetQRPayload,
} from "./omr-types";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. PROCESSAR LOTE DE FOLHAS ESCANEADAS OU FOTOGRAFADAS
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function processScannedBatchAction(params: {
  assessmentId: string;
  sheets: Array<{
    sheetIndex: number;
    imageWidth: number;
    imageHeight: number;
    grayscaleBase64: string; // Buffer de pixels em base64
    fallbackPayload?: SheetQRPayload;
  }>;
  totalQuestions?: number;
}): Promise<BatchScanSummary> {
  const context = await getB2BUserContext();
  const supabase = await createClient();

  const totalQuestions = params.totalQuestions || 20;
  const sheetResults: SheetScanResult[] = [];
  let autoApprovedCount = 0;
  let needsReviewCount = 0;
  let unidentifiedCount = 0;
  let totalTime = 0;

  for (const s of params.sheets) {
    const rawBuffer = Buffer.from(s.grayscaleBase64, "base64");
    const imageBuffer: ImageBitmapBuffer = {
      width: s.imageWidth,
      height: s.imageHeight,
      grayscale: new Uint8Array(rawBuffer),
    };

    const res = scanAnswerSheet(imageBuffer, s.sheetIndex, s.fallbackPayload, totalQuestions);
    totalTime += res.processingTimeMs;

    if (!res.qrDetected && !s.fallbackPayload) {
      unidentifiedCount++;
    } else if (res.needsReviewCount > 0) {
      needsReviewCount++;
    } else {
      autoApprovedCount++;
    }

    // Se a folha tiver QR identificado e aluno associado, grava ou cria a tentativa
    if (res.qrPayload?.studentUserId) {
      const studentId = res.qrPayload.studentUserId;

      // 1. Inicia ou recupera tentativa
      const { data: attRows } = await supabase.rpc("start_or_resume_student_attempt", {
        p_assessment_id: params.assessmentId,
        p_student_user_id: studentId,
      });

      if (attRows && attRows.length > 0) {
        const attemptId = attRows[0].attempt_id;
        const versionId = attRows[0].version_id;

        // Busca itens do caderno
        const { data: items } = await supabase
          .from("assessment_items")
          .select("id, order_index")
          .eq("version_id", versionId)
          .order("order_index", { ascending: true });

        const itemMap = new Map((items || []).map((i) => [i.order_index, i.id]));

        // Grava as respostas lidas
        for (const itemRes of res.items) {
          const itemId = itemMap.get(itemRes.itemNumber);
          if (itemId) {
            itemRes.assessmentItemId = itemId;
            // Só grava se tiver certeza ou se foi detectado
            await recordAttemptAnswer({
              attemptId,
              assessmentItemId: itemId,
              markedFormLetter: itemRes.detectedLetter,
              timeSpentSeconds: 0,
              origin: "folha_lida",
            });
          }
        }
      }
    }

    sheetResults.push(res);
  }

  const avgTime = sheetResults.length > 0 ? Math.round(totalTime / sheetResults.length) : 0;

  return {
    batchId: `batch-${Date.now()}`,
    assessmentId: params.assessmentId,
    totalSheets: sheetResults.length,
    autoApprovedCount,
    needsReviewCount,
    unidentifiedCount,
    averageTimePerSheetMs: avgTime,
    sheets: sheetResults,
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. CORREÇÃO EM 1 CLIQUE NA TELA DE CONFERÊNCIA
 * Grava a intervenção do professor ao lado do recorte visual.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function saveManualReviewAnswerAction(params: {
  attemptId: string;
  assessmentItemId: string;
  confirmedLetter: OptionLetter | null;
  origin?: "folha_lida" | "digitacao";
}): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await recordAttemptAnswer({
      attemptId: params.attemptId,
      assessmentItemId: params.assessmentItemId,
      markedFormLetter: params.confirmedLetter,
      timeSpentSeconds: 0,
      origin: params.origin || "folha_lida",
    });

    return { success: res.success, message: res.message };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, message: error?.message || "Erro ao salvar correção." };
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. ALTERNATIVA MANUAL: DIGITAÇÃO RÁPIDA DE GABARITO PELO TECLADO
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function saveManualKeyboardEntryAction(params: {
  assessmentId: string;
  studentUserId: string;
  answers: Array<{ itemNumber: number; letter: OptionLetter | null }>;
}): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();

  // 1. Inicia ou recupera tentativa
  const { data: attRows, error: attErr } = await supabase.rpc("start_or_resume_student_attempt", {
    p_assessment_id: params.assessmentId,
    p_student_user_id: params.studentUserId,
  });

  if (attErr || !attRows || attRows.length === 0) {
    return { success: false, message: "Erro ao abrir tentativa para digitação." };
  }

  const attemptId = attRows[0].attempt_id;
  const versionId = attRows[0].version_id;

  // 2. Busca itens
  const { data: items } = await supabase
    .from("assessment_items")
    .select("id, order_index")
    .eq("version_id", versionId)
    .order("order_index", { ascending: true });

  const itemMap = new Map((items || []).map((i) => [i.order_index, i.id]));

  for (const ans of params.answers) {
    const itemId = itemMap.get(ans.itemNumber);
    if (itemId) {
      await recordAttemptAnswer({
        attemptId,
        assessmentItemId: itemId,
        markedFormLetter: ans.letter,
        origin: "digitacao",
      });
    }
  }

  // 3. Finaliza tentativa
  await submitAttempt(attemptId);

  revalidatePath(`/instituicao/provas/${params.assessmentId}/correcao`);
  return { success: true };
}
