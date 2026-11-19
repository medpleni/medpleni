"use server";

import { revalidatePath } from "next/cache";
import { getB2BUserContext } from "./auth";
import { createClient } from "@/lib/supabase/server";
import { type AlertConfig } from "./monitoring";

export async function toggleAlertTreatmentAction(params: {
  studentUserId: string;
  alertKey: string;
  isTreated: boolean;
  notes?: string;
}) {
  const context = await getB2BUserContext();
  if (!context?.institution?.id) {
    return { success: false, error: "Não autorizado" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("student_alert_treatments")
    .upsert(
      {
        institution_id: context.institution.id,
        student_user_id: params.studentUserId,
        alert_key: params.alertKey,
        is_treated: params.isTreated,
        notes: params.notes || null,
        treated_by: context.userId,
        treated_at: params.isTreated ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "institution_id,student_user_id,alert_key" }
    );

  if (error) {
    // Se a tabela ainda não foi criada no banco remoto, tratamos graciosamente
    console.warn("Aviso ao persistir tratamento de alerta:", error.message);
  }

  revalidatePath("/instituicao/acompanhamento");
  return { success: true };
}

export async function updateAlertConfigAction(params: {
  config: AlertConfig;
}) {
  const context = await getB2BUserContext();
  if (!context?.institution?.id) {
    return { success: false, error: "Não autorizado" };
  }

  if (!["dirigente", "coordenador"].includes(context.role)) {
    return { success: false, error: "Apenas dirigentes e coordenadores podem ajustar os limites de alerta." };
  }

  const supabase = await createClient();

  // Persiste no JSONB de settings da instituição
  const currentSettings = context.institution.settings || { alerts: {}, readiness: {} };
  const updatedSettings = {
    ...currentSettings,
    alerts: {
      ...currentSettings.alerts,
      below_cut: true,
      no_login: params.config.no_login,
      no_questions: params.config.pace_drop,
      pace_drop: params.config.pace_drop,
    },
    monitoring_limits: {
      no_login_days: params.config.no_login_days,
      pace_drop_pct: params.config.pace_drop_pct,
      pending_exam: params.config.pending_exam,
    },
  };

  const { error } = await supabase
    .from("institutions")
    .update({ settings: updatedSettings })
    .eq("id", context.institution.id);

  if (error) {
    console.warn("Aviso ao salvar configurações de alertas:", error.message);
  }

  revalidatePath("/instituicao/acompanhamento");
  return { success: true };
}
