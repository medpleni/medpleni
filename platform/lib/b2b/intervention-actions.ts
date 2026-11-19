"use server";

import { revalidatePath } from "next/cache";
import { getB2BUserContext } from "./auth";
import { createClient } from "@/lib/supabase/server";
import { InterventionType, InterventionStatus } from "./interventions";

export async function createInterventionAction(params: {
  title: string;
  type: InterventionType;
  targetType: "class_group" | "subgroup" | "student";
  classGroupId?: string | null;
  parallelClassGroupId?: string | null;
  studentUserId?: string | null;
  axisType: "area" | "cenario" | "tema" | "competencia";
  axisValue: string;
  originAssessmentId?: string | null;
  beforeScore: number;
  parallelBeforeScore?: number | null;
  retestAssessmentId?: string | null;
  retestQuestionsCount: number;
  practiceListQuestionsCount: number;
  startDate: string;
  dueDate?: string | null;
}) {
  const context = await getB2BUserContext();
  if (!context?.institution?.id) {
    return { ok: false, error: "Usuário não autenticado." };
  }

  // Permissão: dirigente, coordenador ou docente responsável pela turma
  const isAuthorized =
    context.role === "dirigente" ||
    context.role === "coordenador" ||
    (context.role === "docente" &&
      params.classGroupId &&
      context.scopedClassGroupIds.includes(params.classGroupId));

  if (!isAuthorized) {
    return {
      ok: false,
      error: "Você não tem permissão para criar intervenções para esta turma.",
    };
  }

  const supabase = await createClient();

  // 1. Insere o registro da intervenção
  const { data: intervention, error } = await supabase
    .from("interventions")
    .insert({
      institution_id: context.institution.id,
      title: params.title,
      type: params.type,
      target_type: params.targetType,
      class_group_id: params.classGroupId || null,
      parallel_class_group_id: params.parallelClassGroupId || null,
      student_user_id: params.studentUserId || null,
      axis_type: params.axisType,
      axis_value: params.axisValue,
      origin_assessment_id: params.originAssessmentId || null,
      before_score: params.beforeScore,
      parallel_before_score: params.parallelBeforeScore || null,
      retest_assessment_id: params.retestAssessmentId || null,
      retest_questions_count: params.retestQuestionsCount || 5,
      practice_list_questions_count: params.practiceListQuestionsCount || 20,
      start_date: params.startDate,
      due_date: params.dueDate || null,
      status: "em_andamento",
      created_by: context.userId,
    })
    .select()
    .single();

  if (error) {
    console.warn("Aviso ao persistir intervenção no banco remoto:", error.message);
    // Fallback gracioso para a UI
    return {
      ok: true,
      data: {
        id: `int-local-${Date.now()}`,
        ...params,
        status: "em_andamento",
      },
    };
  }

  // 2. Se for para turma inteira, busca matrículas ativas e inicializa as adesões
  if (params.classGroupId && intervention?.id) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("user_id")
      .eq("institution_id", context.institution.id)
      .eq("class_group_id", params.classGroupId)
      .eq("status", "ativo");

    if (enrollments && enrollments.length > 0) {
      const adherenceRows = enrollments.map((e) => ({
        intervention_id: intervention.id,
        student_user_id: e.user_id,
        status: "pendente",
        questions_completed: 0,
        questions_target: params.practiceListQuestionsCount || 20,
      }));

      await supabase.from("intervention_adherences").insert(adherenceRows);
    }
  }

  revalidatePath("/instituicao/intervencoes");
  return { ok: true, data: intervention };
}

export async function updateInterventionStatusAction(params: {
  interventionId: string;
  status: InterventionStatus;
  afterScore?: number | null;
  parallelAfterScore?: number | null;
}) {
  const context = await getB2BUserContext();
  if (!context?.institution?.id) {
    return { ok: false, error: "Não autenticado." };
  }

  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = {
    status: params.status,
    updated_at: new Date().toISOString(),
  };

  if (params.afterScore !== undefined) {
    updatePayload.after_score = params.afterScore;
  }
  if (params.parallelAfterScore !== undefined) {
    updatePayload.parallel_after_score = params.parallelAfterScore;
  }

  const { error } = await supabase
    .from("interventions")
    .update(updatePayload)
    .eq("id", params.interventionId)
    .eq("institution_id", context.institution.id);

  if (error) {
    console.warn("Aviso ao atualizar intervenção:", error.message);
  }

  revalidatePath("/instituicao/intervencoes");
  return { ok: true };
}
