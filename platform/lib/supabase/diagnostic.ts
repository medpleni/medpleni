import { createClient } from "./client";
import type { Questao, PerformanceStatus } from "../types";

export interface AreaScoreResult {
  area: string;
  total: number;
  acertos: number;
  pct: number;
  status: PerformanceStatus;
}

export interface DiagnosticCalculation {
  overallScore: number;
  areaResults: AreaScoreResult[];
  criticalAreas: string[];
  attentionAreas: string[];
  strongAreas: string[];
  recommendations: { icon: string; text: string }[];
}

/**
 * Calcula a pontuação real por área com base nas respostas dadas pelo médico
 */
export function calculateDiagnosticResult(
  questions: Questao[],
  answers: Record<number, string>
): DiagnosticCalculation {
  const areas = [
    "Clínica Médica",
    "Cirurgia Geral",
    "Saúde Coletiva",
    "Pediatria",
    "Ginecologia e Obstetrícia",
  ];

  const statsByArea: Record<string, { total: number; acertos: number }> = {};
  areas.forEach((a) => {
    statsByArea[a] = { total: 0, acertos: 0 };
  });

  let totalQuestions = 0;
  let totalAcertos = 0;

  questions.forEach((q, idx) => {
    const area = q.area;
    if (!statsByArea[area]) {
      statsByArea[area] = { total: 0, acertos: 0 };
    }
    statsByArea[area].total += 1;
    totalQuestions += 1;

    const chosen = answers[idx];
    if (chosen && chosen === q.gabarito) {
      statsByArea[area].acertos += 1;
      totalAcertos += 1;
    }
  });

  const areaResults: AreaScoreResult[] = Object.entries(statsByArea).map(
    ([area, { total, acertos }]) => {
      // Se não houver questão da área no teste de 10 questões, estabelece valor base
      const pct = total > 0 ? Math.round((acertos / total) * 100) : 60;
      let status: PerformanceStatus = "atencao";
      if (pct >= 75) status = "bom";
      else if (pct >= 55) status = "atencao";
      else status = "critico";

      return { area, total, acertos, pct, status };
    }
  );

  const overallScore =
    totalQuestions > 0
      ? Math.round((totalAcertos / totalQuestions) * 100)
      : 60;

  const criticalAreas = areaResults
    .filter((r) => r.status === "critico")
    .map((r) => r.area);

  const attentionAreas = areaResults
    .filter((r) => r.status === "atencao")
    .map((r) => r.area);

  const strongAreas = areaResults
    .filter((r) => r.status === "bom" || r.status === "excelente")
    .map((r) => r.area);

  const recommendations: { icon: string; text: string }[] = [];

  if (criticalAreas.length > 0) {
    recommendations.push({
      icon: "🔴",
      text: `${criticalAreas.join(" e ")} ${criticalAreas.length > 1 ? "são suas maiores prioridades" : "é sua maior prioridade"} — recomendamos iniciar por simulados focados nesses temas.`,
    });
  }
  if (attentionAreas.length > 0) {
    recommendations.push({
      icon: "🟡",
      text: `${attentionAreas.join(", ")} necessita${attentionAreas.length > 1 ? "m" : ""} de revisão ativa e reforço em flashcards de repetição espaçada.`,
    });
  }
  if (strongAreas.length > 0) {
    recommendations.push({
      icon: "🟢",
      text: `Excelente base em ${strongAreas.join(" e ")}. Mantenha a cadência de questões para sustentar a retenção.`,
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      icon: "🎯",
      text: "Seu diagnóstico geral indica perfil equilibrado. Foque no cronograma adaptativo de alto rendimento.",
    });
  }

  return {
    overallScore,
    areaResults,
    criticalAreas,
    attentionAreas,
    strongAreas,
    recommendations,
  };
}

/**
 * Salva o resultado do Raio-X no Supabase
 */
export async function saveDiagnosticToDb(params: {
  userId: string;
  overallScore: number;
  areaResults: AreaScoreResult[];
  criticalAreas: string[];
  answers: Record<number, string>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("user_diagnostics").insert({
      user_id: params.userId,
      overall_score: params.overallScore,
      area_scores: params.areaResults,
      priority_areas: params.criticalAreas,
      answers: params.answers,
    });

    if (error) {
      console.warn("Aviso ao salvar diagnóstico no banco:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
