"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getB2BUserContext } from "./auth";
import {
  recordAttemptAnswer,
  submitAttempt,
  convertBaseAnswerToForm,
  type OptionLetter,
  type ShuffledItemMap,
} from "./assessments";

export interface StudentExamQuestion {
  assessmentItemId: string;
  orderNumber: number; // Número de ordem na forma do aluno (1 a N)
  statement: string;
  clinicalContext?: string | null;
  options: Array<{
    letter: OptionLetter;
    text: string;
  }>;
  hasImage: boolean;
  markedFormLetter: OptionLetter | null;
  isMarkedForReview: boolean;
}

export interface StudentExamState {
  attemptId: string;
  assessmentId: string;
  title: string;
  status: "nao_iniciou" | "em_andamento" | "finalizada" | "ausente";
  formCode: string;
  startedAt: string;
  totalDurationSeconds: number;
  remainingSeconds: number;
  questions: StudentExamQuestion[];
  answersReleased: boolean;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. INICIAR OU RETOMAR TENTATIVA DO ALUNO (ONLINE)
 * Resistente a queda de conexão: se o aluno recarregar a página, retoma
 * exatamente a forma sorteada e as alternativas previamente marcadas.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function startOrResumeAttemptAction(
  assessmentId: string
): Promise<{ success: boolean; data?: StudentExamState; message?: string }> {
  const context = await getB2BUserContext();
  if (!context?.userId) {
    return { success: false, message: "Usuário não autenticado." };
  }

  const supabase = await createClient();

  // 1. Busca dados da avaliação
  const { data: assessment, error: aErr } = await supabase
    .from("assessments")
    .select("id, title, status, duration_minutes, starts_at, ends_at, window_tolerance_minutes, answers_released_at")
    .eq("id", assessmentId)
    .single();

  if (aErr || !assessment) {
    return { success: false, message: "Avaliação não encontrada." };
  }

  // 2. Chama RPC para iniciar ou recuperar a tentativa com a forma sorteada
  const { data: attemptRows, error: attErr } = await supabase.rpc(
    "start_or_resume_student_attempt",
    {
      p_assessment_id: assessmentId,
      p_student_user_id: context.userId,
    }
  );

  if (attErr || !attemptRows || attemptRows.length === 0) {
    return { success: false, message: attErr?.message || "Erro ao inicializar prova do aluno." };
  }

  const att = attemptRows[0];
  const attemptId = att.attempt_id;
  const versionId = att.version_id;
  const formCode = att.form_code || "A";
  const shuffleMap = (att.items_shuffle_map || []) as ShuffledItemMap[];
  const markedForReview = Array.isArray(att.marked_for_review) ? (att.marked_for_review as string[]) : [];

  // 3. Busca itens congelados do caderno
  const { data: rawItems } = await supabase
    .from("assessment_items")
    .select("id, order_index, frozen_statement, frozen_clinical_context, frozen_options, status")
    .eq("version_id", versionId)
    .order("order_index", { ascending: true });

  // 4. Busca respostas já salvas para esta tentativa (recuperação pós-queda)
  const { data: existingAnswers } = await supabase
    .from("attempt_answers")
    .select("assessment_item_id, marked_form_letter")
    .eq("attempt_id", attemptId);

  const answerMap = new Map<string, OptionLetter>();
  (existingAnswers || []).forEach((a) => {
    if (a.marked_form_letter) {
      answerMap.set(a.assessment_item_id, a.marked_form_letter as OptionLetter);
    }
  });

  // 5. Monta a lista de questões na ordem da forma embaralhada do aluno
  const baseItemsMap = new Map((rawItems || []).map((i) => [i.id, i]));
  const questions: StudentExamQuestion[] = [];

  if (shuffleMap.length > 0) {
    // Ordena pelo formOrder
    const sortedShuffle = [...shuffleMap].sort((a, b) => a.formOrder - b.formOrder);
    sortedShuffle.forEach((itemMap) => {
      const baseItem = baseItemsMap.get(itemMap.assessmentItemId);
      if (!baseItem) return;

      const baseOptions = (baseItem.frozen_options || []) as Array<{
        letter: OptionLetter;
        text: string;
      }>;

      // Reordena as alternativas conforme o mapeamento da forma
      const formOptions = (["A", "B", "C", "D", "E"] as OptionLetter[]).map((formLetter) => {
        const baseLetter = itemMap.optionsMap[formLetter];
        const opt = baseOptions.find((o) => o.letter === baseLetter);
        return {
          letter: formLetter,
          text: opt?.text || "",
        };
      });

      questions.push({
        assessmentItemId: baseItem.id,
        orderNumber: itemMap.formOrder,
        statement: baseItem.frozen_statement,
        clinicalContext: baseItem.frozen_clinical_context,
        options: formOptions,
        hasImage: Boolean(baseItem.frozen_statement.includes("img") || baseItem.frozen_statement.includes("image")),
        markedFormLetter: answerMap.get(baseItem.id) || null,
        isMarkedForReview: markedForReview.includes(baseItem.id),
      });
    });
  } else {
    // Fallback: ordem original
    (rawItems || []).forEach((baseItem, idx) => {
      questions.push({
        assessmentItemId: baseItem.id,
        orderNumber: idx + 1,
        statement: baseItem.frozen_statement,
        clinicalContext: baseItem.frozen_clinical_context,
        options: (baseItem.frozen_options as Array<{ letter: OptionLetter; text: string }>) || [],
        hasImage: false,
        markedFormLetter: answerMap.get(baseItem.id) || null,
        isMarkedForReview: markedForReview.includes(baseItem.id),
      });
    });
  }

  // 6. Cálculo do tempo restante
  const durationTotalMinutes = (assessment.duration_minutes || 120) + (att.extra_time_minutes || 0);
  const totalDurationSeconds = durationTotalMinutes * 60;
  const startedTimeMs = new Date(att.started_at).getTime();
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedTimeMs) / 1000));
  const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);

  // Registra telemetria de sessão
  await supabase.from("attempt_events").insert({
    attempt_id: attemptId,
    event_type: "session_start",
    metadata: { resume: att.status === "em_andamento", form: formCode },
  });

  return {
    success: true,
    data: {
      attemptId,
      assessmentId,
      title: assessment.title,
      status: att.status,
      formCode,
      startedAt: att.started_at,
      totalDurationSeconds,
      remainingSeconds,
      questions,
      answersReleased: Boolean(assessment.answers_released_at),
    },
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. SALVAR RESPOSTA DO ALUNO EM TEMPO REAL (PERSISTÊNCIA POR ITEM)
 * Salva a cada clique na alternativa, convertendo para a ordem do caderno-base.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function recordStudentAnswerAction(params: {
  attemptId: string;
  assessmentItemId: string;
  markedFormLetter: OptionLetter | null;
  timeSpentSeconds: number;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await recordAttemptAnswer({
      attemptId: params.attemptId,
      assessmentItemId: params.assessmentItemId,
      markedFormLetter: params.markedFormLetter,
      timeSpentSeconds: params.timeSpentSeconds,
      origin: "online",
    });
    return { success: res.success, message: res.message };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, message: error?.message || "Erro ao salvar resposta." };
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. MARCAR / DESMARCAR QUESTÃO PARA REVISAR
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function toggleMarkForReviewAction(params: {
  attemptId: string;
  assessmentItemId: string;
}): Promise<{ success: boolean; markedList?: string[] }> {
  const supabase = await createClient();

  const { data: attempt } = await supabase
    .from("attempts")
    .select("marked_for_review")
    .eq("id", params.attemptId)
    .single();

  if (!attempt) {
    return { success: false };
  }

  let list = Array.isArray(attempt.marked_for_review)
    ? (attempt.marked_for_review as string[])
    : [];

  if (list.includes(params.assessmentItemId)) {
    list = list.filter((id) => id !== params.assessmentItemId);
  } else {
    list.push(params.assessmentItemId);
  }

  await supabase
    .from("attempts")
    .update({ marked_for_review: list })
    .eq("id", params.attemptId);

  return { success: true, markedList: list };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 4. LOG DE EVENTOS DE SESSÃO / AUDITORIA (TELEMETRIA)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function logSessionEventAction(params: {
  attemptId: string;
  eventType: "session_blur" | "session_focus" | "tab_switch" | "question_view" | "question_answer" | "session_submit";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createClient();
  await supabase.from("attempt_events").insert({
    attempt_id: params.attemptId,
    event_type: params.eventType,
    metadata: params.metadata || {},
  });
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 5. FINALIZAÇÃO DA PROVA PELO ALUNO
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function submitStudentExamAction(
  attemptId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient();
    await supabase.from("attempt_events").insert({
      attempt_id: attemptId,
      event_type: "session_submit",
      metadata: { submitted_by_student: true },
    });

    const res = await submitAttempt(attemptId);
    return { success: res.success, message: res.message };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, message: error?.message || "Erro ao submeter prova." };
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 6. PAINEL DE MONITORAMENTO DO PROFESSOR (APLICAÇÃO EM TEMPO REAL)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface MonitorCandidate {
  attemptId?: string;
  studentUserId: string;
  studentName: string;
  studentEmail: string;
  studentRa?: string;
  classGroupLabel: string;
  status: "nao_iniciou" | "em_andamento" | "finalizada" | "ausente";
  startedAt?: string | null;
  submittedAt?: string | null;
  answersCount: number;
  scorePercentage?: number;
  extraTimeMinutes: number;
}

export interface MonitorStats {
  totalCandidates: number;
  notStarted: number;
  inProgress: number;
  submitted: number;
  absent: number;
  answersReleased: boolean;
}

export async function getExamMonitorDataAction(
  assessmentId: string
): Promise<{ success: boolean; stats: MonitorStats; candidates: MonitorCandidate[] }> {
  const supabase = await createClient();

  // 1. Busca prova
  const { data: exam } = await supabase
    .from("assessments")
    .select("answers_released_at")
    .eq("id", assessmentId)
    .single();

  // 2. Busca tentativas existentes
  const { data: attempts } = await supabase
    .from("attempts")
    .select(`
      id,
      student_user_id,
      class_group_id,
      status,
      started_at,
      submitted_at,
      score_percentage,
      extra_time_minutes,
      profiles ( full_name, email ),
      class_groups ( label ),
      attempt_answers ( count )
    `)
    .eq("assessment_id", assessmentId);

  const candidates: MonitorCandidate[] = (attempts || []).map((att) => {
    interface RawProf {
      full_name?: string;
      email?: string;
    }
    const prof: RawProf = Array.isArray(att.profiles) ? att.profiles[0] || {} : att.profiles || {};

    interface RawCg {
      label?: string;
    }
    const cg: RawCg = Array.isArray(att.class_groups) ? att.class_groups[0] || {} : att.class_groups || {};

    const rawAns = att.attempt_answers as unknown as Array<{ count?: number }>;
    const answersCount = rawAns && rawAns[0]?.count ? rawAns[0].count : 0;

    return {
      attemptId: att.id,
      studentUserId: att.student_user_id,
      studentName: prof.full_name || prof.email || "Aluno",
      studentEmail: prof.email || "",
      classGroupLabel: cg.label || "Geral",
      status: att.status as MonitorCandidate["status"],
      startedAt: att.started_at,
      submittedAt: att.submitted_at,
      answersCount,
      scorePercentage: att.score_percentage !== null ? Number(att.score_percentage) : undefined,
      extraTimeMinutes: att.extra_time_minutes || 0,
    };
  });

  const stats: MonitorStats = {
    totalCandidates: candidates.length,
    notStarted: candidates.filter((c) => c.status === "nao_iniciou").length,
    inProgress: candidates.filter((c) => c.status === "em_andamento").length,
    submitted: candidates.filter((c) => c.status === "finalizada").length,
    absent: candidates.filter((c) => c.status === "ausente").length,
    answersReleased: Boolean(exam?.answers_released_at),
  };

  return { success: true, stats, candidates };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 7. AÇÕES DO PROFESSOR NO MONITOR
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Reabrir prova para um aluno com justificativa obrigatória registrada em log
 */
export async function reopenStudentAttemptAction(params: {
  attemptId: string;
  reason: string;
}): Promise<{ success: boolean; message?: string }> {
  if (!params.reason || params.reason.trim().length < 5) {
    return { success: false, message: "É obrigatório registrar uma justificativa válida para reabertura." };
  }

  const context = await getB2BUserContext();
  if (!context?.userId) {
    return { success: false, message: "Usuário não autenticado." };
  }
  const supabase = await createClient();

  const { error } = await supabase
    .from("attempts")
    .update({
      status: "em_andamento",
      reopened_at: new Date().toISOString(),
      reopened_by: context.userId,
      reopen_reason: params.reason.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.attemptId);

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true };
}

/**
 * Acessibilidade: Conceder tempo adicional ao aluno
 */
export async function setStudentExtraTimeAction(params: {
  attemptId: string;
  extraMinutes: number;
}): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("attempts")
    .update({
      extra_time_minutes: params.extraMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.attemptId);

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true };
}

/**
 * Encerrar aplicação da prova
 */
export async function closeExamApplicationAction(
  assessmentId: string
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();

  // 1. Marca tentativas 'em_andamento' como 'finalizada'
  const { data: runningAttempts } = await supabase
    .from("attempts")
    .select("id")
    .eq("assessment_id", assessmentId)
    .eq("status", "em_andamento");

  for (const att of runningAttempts || []) {
    await submitAttempt(att.id);
  }

  // 2. Marca tentativas 'nao_iniciou' como 'ausente'
  await supabase
    .from("attempts")
    .update({ status: "ausente", updated_at: new Date().toISOString() })
    .eq("assessment_id", assessmentId)
    .eq("status", "nao_iniciou");

  // 3. Atualiza prova para 'aplicada'
  await supabase
    .from("assessments")
    .update({ status: "aplicada", updated_at: new Date().toISOString() })
    .eq("id", assessmentId);

  revalidatePath("/instituicao/provas");
  return { success: true };
}

/**
 * Liberar gabarito e comentários para os alunos
 */
export async function releaseExamAnswersAction(
  assessmentId: string
): Promise<{ success: boolean; message?: string }> {
  const context = await getB2BUserContext();
  if (!context?.userId) {
    return { success: false, message: "Usuário não autenticado." };
  }
  const supabase = await createClient();

  const { error } = await supabase
    .from("assessments")
    .update({
      status: "corrigida",
      answers_released_at: new Date().toISOString(),
      answers_released_by: context.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assessmentId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/instituicao/provas");
  return { success: true };
}
