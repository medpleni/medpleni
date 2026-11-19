"use server";

import { createClient } from "@/lib/supabase/server";
import { getB2BUserContext } from "./auth";
import { revalidatePath } from "next/cache";
import type { AtypicalDetectionConfig } from "./atypical";

export async function toggleAtypicalSessionExclusion(sessionId: string, shouldExclude: boolean) {
  try {
    const context = await getB2BUserContext();
    if (!context?.institution?.id) {
      return { success: false, error: "Instituição não identificada" };
    }

    if (context.role !== "dirigente" && context.role !== "coordenador") {
      return { success: false, error: "Apenas dirigentes e coordenadores podem alterar exclusão de sessões atípicas" };
    }

    const supabase = await createClient();

    // Lê configurações atuais
    const { data: inst } = await supabase
      .from("institutions")
      .select("settings")
      .eq("id", context.institution.id)
      .single();

    const currentSettings = inst?.settings || {};
    const excludedIds: string[] = Array.isArray(currentSettings.atypical_excluded_sessions)
      ? currentSettings.atypical_excluded_sessions
      : [];

    let nextExcluded: string[];
    if (shouldExclude) {
      nextExcluded = Array.from(new Set([...excludedIds, sessionId]));
    } else {
      nextExcluded = excludedIds.filter((id) => id !== sessionId);
    }

    const updatedSettings = {
      ...currentSettings,
      atypical_excluded_sessions: nextExcluded,
    };

    await supabase
      .from("institutions")
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.institution.id);

    revalidatePath("/instituicao/acompanhamento");
    revalidatePath("/instituicao/turmas");

    return {
      success: true,
      isExcluded: shouldExclude,
      totalExcluded: nextExcluded.length,
    };
  } catch (err: unknown) {
    console.error("Erro ao alterar exclusão de sessão atípica:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido",
    };
  }
}

export async function saveAtypicalConfig(config: Partial<AtypicalDetectionConfig>) {
  try {
    const context = await getB2BUserContext();
    if (!context?.institution?.id) {
      return { success: false, error: "Instituição não identificada" };
    }

    if (context.role !== "dirigente" && context.role !== "coordenador") {
      return { success: false, error: "Apenas dirigentes e coordenadores podem editar limiares de detecção" };
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
      atypical_config: {
        ...(currentSettings.atypical_config || {}),
        ...config,
      },
    };

    await supabase
      .from("institutions")
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.institution.id);

    revalidatePath("/instituicao/acompanhamento");
    revalidatePath("/instituicao/configuracoes");

    return { success: true };
  } catch (err: unknown) {
    console.error("Erro ao salvar configuração de sessões atípicas:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro desconhecido",
    };
  }
}
