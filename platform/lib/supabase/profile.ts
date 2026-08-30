import { createClient } from "./client";
import type { Usuario, ProvAlvo, Plano, SubBrand } from "../types";

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: "student" | "admin" | "mentor";
  plan: Plano;
  sub_brand: SubBrand;
  target_exams: string[];
  target_specialty?: string;
  exam_date?: string;
  weekly_study_hours: number;
  study_days: string[];
  study_shifts: string[];
  crm?: string;
  avatar_url?: string;
  streak_days: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export function profileToUsuario(profile: Partial<ProfileRow>): Usuario {
  const nome = profile.full_name || "Doutor(a)";
  const initials = nome
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "MP";

  return {
    id: profile.id || "",
    nome: nome,
    email: profile.email || "",
    crm: profile.crm || undefined,
    plano: (profile.plan as Plano) || "diagnostico",
    provaAlvo: ((profile.target_exams as ProvAlvo[]) || ["ENARE", "USP"]),
    subBrand: (profile.sub_brand as SubBrand) || "RESID",
    avatarUrl: profile.avatar_url || undefined,
    iniciais: initials,
    streakDias: profile.streak_days || 0,
    dataProva: profile.exam_date || undefined,
  };
}

/**
 * Busca o perfil completo do usuário no Supabase
 */
export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.warn("Erro ao buscar perfil:", error.message);
    return null;
  }

  return data as ProfileRow;
}

/**
 * Atualiza campos do perfil no Supabase
 */
export async function updateProfile(
  userId: string,
  updates: Partial<ProfileRow>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("Erro ao atualizar perfil:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Salva as escolhas do onboarding do aluno no Supabase
 */
export async function saveOnboardingData(
  userId: string,
  data: {
    foco: string;
    provas: string[];
    especialidades: string[];
    dataProva?: string;
    horasSemanais: number;
    diasSemana: string[];
    periodos: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const subBrandMap: Record<string, SubBrand> = {
    residencia: "RESID",
    enamed: "ENAMED",
    revalida: "REVALIDA",
    especializacao: "ESPECIALISTA",
  };

  const payload: Partial<ProfileRow> = {
    sub_brand: subBrandMap[data.foco] || "RESID",
    target_exams: data.provas,
    target_specialty: data.especialidades.join(", "),
    exam_date: data.dataProva || undefined,
    weekly_study_hours: data.horasSemanais,
    study_days: data.diasSemana,
    study_shifts: data.periodos,
    onboarding_completed: true,
  };

  return updateProfile(userId, payload);
}
