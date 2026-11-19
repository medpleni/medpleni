/**
 * MEDPLENI B2B — taxonomy.ts
 * Fonte única de verdade e leitura das quatro listas taxonômicas no servidor:
 * ÁREA · CENÁRIO · TEMA · COMPETÊNCIA
 * 
 * Nenhuma tela nova do B2B deve possuir listas hardcoded.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  TaxArea,
  TaxCenario,
  TaxTema,
  TaxCompetencia,
  TaxonomyBundle,
  TaxonomyMigrationReport,
} from "./taxonomy-types";

export * from "./taxonomy-types";
export * from "./taxonomy-csv";

// ─────────────────────────────────────────────────────────────────────────────
// 1. LEITURA CANÔNICA DE TAXONOMIA (Server Components & Actions)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca todas as grandes áreas ativas ordenadas
 */
export async function getCanonicalAreas(stage: string = "etapa_2_3"): Promise<TaxArea[]> {
  const supabase = await createClient();
  let query = supabase
    .from("tax_areas")
    .select("*")
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  if (stage !== "todas") {
    query = query.or(`enamed_stage.eq.${stage},enamed_stage.eq.todas`);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("Aviso ao buscar tax_areas:", error.message);
    return [];
  }
  return (data || []) as TaxArea[];
}

/**
 * Busca todos os cenários de atuação ativos
 */
export async function getCenarios(): Promise<TaxCenario[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tax_cenarios")
    .select("*")
    .eq("is_active", true)
    .order("code", { ascending: true });

  if (error) {
    console.warn("Aviso ao buscar tax_cenarios:", error.message);
    return [];
  }
  return (data || []) as TaxCenario[];
}

/**
 * Busca temas (com filtro opcional por área)
 */
export async function getTemas(areaId?: string): Promise<TaxTema[]> {
  const supabase = await createClient();
  let query = supabase
    .from("tax_temas")
    .select("*, tax_areas(name)")
    .eq("is_active", true)
    .order("code", { ascending: true });

  if (areaId) {
    query = query.eq("area_id", areaId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("Aviso ao buscar tax_temas:", error.message);
    return [];
  }
  return (data || []).map((t: any) => ({
    ...t,
    areaName: t.tax_areas?.name,
  })) as TaxTema[];
}

/**
 * Busca todas as competências ativas
 */
export async function getCompetencias(): Promise<TaxCompetencia[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tax_competencias")
    .select("*")
    .eq("is_active", true)
    .order("code", { ascending: true });

  if (error) {
    console.warn("Aviso ao buscar tax_competencias:", error.message);
    return [];
  }
  return (data || []) as TaxCompetencia[];
}

/**
 * Retorna as 4 listas taxonômicas em uma única chamada unificada
 */
export async function getTaxonomyBundle(): Promise<TaxonomyBundle> {
  const [areas, cenarios, temas, competencias] = await Promise.all([
    getCanonicalAreas("todas"),
    getCenarios(),
    getTemas(),
    getCompetencias(),
  ]);

  return { areas, cenarios, temas, competencias };
}

/**
 * Retorna o relatório de cobertura de migração das questões legadas
 */
export async function getTaxonomyMigrationReport(): Promise<TaxonomyMigrationReport> {
  const supabase = await createClient();

  // Tenta chamar a RPC get_unmapped_questions_report
  const { data: rpcData, error: rpcErr } = await supabase.rpc("get_unmapped_questions_report");
  if (!rpcErr && rpcData) {
    return {
      totalQuestions: rpcData.total_questions || 0,
      classifiedQuestions: rpcData.classified_questions || 0,
      unmappedQuestions: rpcData.unmapped_questions || 0,
      coveragePercent: rpcData.coverage_percent || 0,
      orphanAreas: rpcData.orphan_areas || [],
    };
  }

  // Fallback direto via queries paralelas
  const { count: totalQuestions } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true });

  const { count: classifiedQuestions } = await supabase
    .from("question_classification")
    .select("*", { count: "exact", head: true });

  const total = totalQuestions || 0;
  const classified = classifiedQuestions || 0;
  const unmapped = Math.max(0, total - classified);
  const coveragePercent = total > 0 ? Number(((classified / total) * 100).toFixed(2)) : 100;

  return {
    totalQuestions: total,
    classifiedQuestions: classified,
    unmappedQuestions: unmapped,
    coveragePercent,
    orphanAreas: [],
  };
}
