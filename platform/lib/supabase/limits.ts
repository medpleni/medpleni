import { createClient } from "./client";

export interface UsageLimitStatus {
  isFreePlan: boolean;
  feature: "questions" | "flashcards" | "simulations";
  usedThisMonth: number;
  maxMonthlyLimit: number;
  hasReachedLimit: boolean;
}

export const PLAN_LIMITS = {
  diagnostico: {
    questions: 50,
    flashcards: 30,
    simulations: 1,
  },
  pleno: {
    questions: Infinity,
    flashcards: Infinity,
    simulations: Infinity,
  },
};

/**
 * Verifica o consumo mensal do usuário gratuito e checa se bateu o teto do plano
 */
export async function checkUserUsageLimit(
  userId?: string,
  feature: "questions" | "flashcards" | "simulations" = "questions",
  userPlan: string = "diagnostico"
): Promise<UsageLimitStatus> {
  const isFree = userPlan === "diagnostico" || !userPlan;
  const maxLimit = isFree ? PLAN_LIMITS.diagnostico[feature] : Infinity;

  if (!isFree || !userId) {
    return {
      isFreePlan: isFree,
      feature,
      usedThisMonth: 0,
      maxMonthlyLimit: maxLimit,
      hasReachedLimit: false,
    };
  }

  try {
    const supabase = createClient();
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    const dateStr = firstDayOfMonth.toISOString();

    let count = 0;

    if (feature === "questions") {
      const { count: ansCount } = await supabase
        .from("user_answers")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", dateStr);

      count = ansCount || 0;
    } else if (feature === "flashcards") {
      const { count: revCount } = await supabase
        .from("user_flashcard_reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("last_reviewed_at", dateStr);

      count = revCount || 0;
    } else if (feature === "simulations") {
      const { count: simCount } = await supabase
        .from("user_simulations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "concluido")
        .gte("created_at", dateStr);

      count = simCount || 0;
    }

    return {
      isFreePlan: true,
      feature,
      usedThisMonth: count,
      maxMonthlyLimit: maxLimit,
      hasReachedLimit: count >= maxLimit,
    };
  } catch (err) {
    console.warn("Aviso ao verificar limites de uso:", err);
    return {
      isFreePlan: true,
      feature,
      usedThisMonth: 0,
      maxMonthlyLimit: maxLimit,
      hasReachedLimit: false,
    };
  }
}
