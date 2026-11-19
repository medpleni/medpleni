"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface RecordPracticeAnswerInput {
  questionId: string;
  selectedLetter: string;
  isCorrect: boolean;
  interventionId?: string;
  studentUserId?: string;
}

export async function recordPracticeAnswer(input: RecordPracticeAnswerInput) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const targetUserId = input.studentUserId || user?.id;

    if (!targetUserId) {
      // Retorna sucesso para fins de demo/interatividade quando deslogado
      return { success: true, demoMode: true };
    }

    // 1. Grava a resposta na tabela user_answers (base do B2C e volume de questões nos gráficos)
    const { data: insertedAnswer, error: answerError } = await supabase
      .from("user_answers")
      .insert({
        user_id: targetUserId,
        question_id: input.questionId,
        selected_letter: input.selectedLetter,
        is_correct: input.isCorrect,
      })
      .select("id")
      .single();

    if (answerError) {
      console.warn("Aviso ao inserir em user_answers:", answerError.message);
    }

    // 2. Se houver vínculo com intervenção (lista de exercícios), atualiza a adesão
    if (input.interventionId) {
      const { data: existingAdherence } = await supabase
        .from("intervention_adherences")
        .select("id, questions_completed, questions_target")
        .eq("intervention_id", input.interventionId)
        .eq("student_user_id", targetUserId)
        .maybeSingle();

      if (existingAdherence) {
        const nextCompleted = (existingAdherence.questions_completed || 0) + 1;
        const target = existingAdherence.questions_target || 20;
        const isDone = nextCompleted >= target;

        await supabase
          .from("intervention_adherences")
          .update({
            questions_completed: nextCompleted,
            status: isDone ? "concluida" : "em_progresso",
            completed_at: isDone ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingAdherence.id);
      } else {
        await supabase.from("intervention_adherences").insert({
          intervention_id: input.interventionId,
          student_user_id: targetUserId,
          questions_completed: 1,
          questions_target: 20,
          status: "em_progresso",
        });
      }
    }

    revalidatePath("/instituicao/aluno");
    revalidatePath("/instituicao/intervencoes");
    revalidatePath("/instituicao/turmas");

    return {
      success: true,
      answerId: insertedAnswer?.id,
    };
  } catch (err: unknown) {
    console.error("Erro em recordPracticeAnswer:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao registrar resposta",
    };
  }
}
