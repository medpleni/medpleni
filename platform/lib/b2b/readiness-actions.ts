"use server";

import { createClient } from "@/lib/supabase/server";
import { getB2BUserContext } from "./auth";
import { revalidatePath } from "next/cache";
import type { ReadinessConfig, StudentReadinessEvaluation } from "./readiness";

export async function saveReadinessConfigAction(config: ReadinessConfig) {
  try {
    const context = await getB2BUserContext();
    if (!context?.institution?.id) {
      return { success: false, error: "Instituição não identificada" };
    }

    if (context.role !== "dirigente" && context.role !== "coordenador") {
      return {
        success: false,
        error: "Apenas dirigentes e coordenadores podem configurar os parâmetros de prontidão",
      };
    }

    const supabase = await createClient();

    const { data: inst } = await supabase
      .from("institutions")
      .select("settings")
      .eq("id", context.institution.id)
      .single();

    const currentSettings = inst?.settings || {};
    const updatedSettings = {
      ...currentSettings,
      readiness: {
        volumeRuleEnabled: config.volumeRuleEnabled,
        minQuestionsYear: config.minQuestionsYear,
        consistencyRuleEnabled: config.consistencyRuleEnabled,
        minScorePercent: config.minScorePercent,
        minExamsCount: config.minExamsCount,
        levelLabels: config.levelLabels,
        showToStudents: config.showToStudents,
      },
    };

    await supabase
      .from("institutions")
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.institution.id);

    revalidatePath("/instituicao/prontidao");
    revalidatePath("/instituicao/turmas");
    revalidatePath("/instituicao/configuracoes");
    revalidatePath("/instituicao/aluno");

    return { success: true };
  } catch (err: unknown) {
    console.error("Erro ao salvar configuração de prontidão:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao salvar configuração",
    };
  }
}

export async function recordReadinessSnapshotAction(
  evaluations: StudentReadinessEvaluation[],
  academicYear = 2026
) {
  try {
    const context = await getB2BUserContext();
    if (!context?.institution?.id) {
      return { success: false, error: "Instituição não identificada" };
    }

    const supabase = await createClient();

    const rows = evaluations
      .filter((ev) => ev.isConfigured)
      .map((ev) => ({
        institution_id: context.institution.id,
        student_user_id: ev.studentUserId,
        class_group_id: ev.classGroupId || null,
        academic_year: academicYear,
        volume_count: ev.questionsAnswered,
        volume_target: ev.volumeTarget,
        volume_fulfilled: ev.volumeFulfilled,
        qualifying_exams_count: ev.qualifyingExamsCount,
        consistency_target_score: ev.consistencyTargetScore,
        consistency_target_exams: ev.consistencyTargetExams,
        consistency_fulfilled: ev.consistencyFulfilled,
        level: ev.level,
        level_label: ev.levelLabel,
        notes: ev.rulesFulfilledSummary,
      }));

    if (rows.length > 0) {
      await supabase.from("readiness_snapshots").insert(rows);
    }

    return { success: true, count: rows.length };
  } catch (err: unknown) {
    console.error("Erro ao registrar snapshot de prontidão:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao salvar snapshot",
    };
  }
}
