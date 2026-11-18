"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getB2BUserContext } from "./auth";
import { parseTaxonomyCSV } from "./taxonomy";

async function verifyTaxonomyEditor() {
  const context = await getB2BUserContext();
  if (!context) {
    throw new Error("Não autenticado.");
  }

  // Apenas Admin MedPleni ou dirigentes/coordenadores podem gerenciar taxonomias globais
  if (!context.isMedPleniAdmin && context.role !== "dirigente") {
    throw new Error("Permissão restrita a administradores e editores MedPleni.");
  }

  return context;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ÁREAS
// ─────────────────────────────────────────────────────────────────────────────

export async function saveTaxArea(data: {
  id?: string;
  code: string;
  name: string;
  color_hex?: string | null;
  order_index: number;
  enamed_stage?: "etapa_1_ciclo_basico" | "etapa_2_3" | "todas";
}) {
  await verifyTaxonomyEditor();
  const supabase = await createClient();

  if (data.id) {
    const { error } = await supabase
      .from("tax_areas")
      .update({
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        color_hex: data.color_hex?.trim() || null,
        order_index: data.order_index,
        enamed_stage: data.enamed_stage || "etapa_2_3",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("tax_areas").insert({
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      color_hex: data.color_hex?.trim() || null,
      order_index: data.order_index,
      enamed_stage: data.enamed_stage || "etapa_2_3",
    });

    if (error) throw new Error(error.message);
  }

  revalidatePath("/instituicao/admin/classificacao");
  return { success: true };
}

export async function toggleTaxAreaActive(id: string, is_active: boolean) {
  await verifyTaxonomyEditor();
  const supabase = await createClient();

  const { error } = await supabase
    .from("tax_areas")
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/instituicao/admin/classificacao");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CENÁRIOS
// ─────────────────────────────────────────────────────────────────────────────

export async function saveTaxCenario(data: {
  id?: string;
  code: string;
  name: string;
  description?: string | null;
}) {
  await verifyTaxonomyEditor();
  const supabase = await createClient();

  if (data.id) {
    const { error } = await supabase
      .from("tax_cenarios")
      .update({
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        description: data.description?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("tax_cenarios").insert({
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      description: data.description?.trim() || null,
    });

    if (error) throw new Error(error.message);
  }

  revalidatePath("/instituicao/admin/classificacao");
  return { success: true };
}

export async function toggleTaxCenarioActive(id: string, is_active: boolean) {
  await verifyTaxonomyEditor();
  const supabase = await createClient();

  const { error } = await supabase
    .from("tax_cenarios")
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/instituicao/admin/classificacao");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. TEMAS E SUBTEMAS
// ─────────────────────────────────────────────────────────────────────────────

export async function saveTaxTema(data: {
  id?: string;
  area_id: string;
  parent_id?: string | null;
  code: string;
  name: string;
}) {
  await verifyTaxonomyEditor();
  const supabase = await createClient();

  if (data.id) {
    const { error } = await supabase
      .from("tax_temas")
      .update({
        area_id: data.area_id,
        parent_id: data.parent_id || null,
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("tax_temas").insert({
      area_id: data.area_id,
      parent_id: data.parent_id || null,
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
    });

    if (error) throw new Error(error.message);
  }

  revalidatePath("/instituicao/admin/classificacao");
  return { success: true };
}

export async function toggleTaxTemaActive(id: string, is_active: boolean) {
  await verifyTaxonomyEditor();
  const supabase = await createClient();

  const { error } = await supabase
    .from("tax_temas")
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/instituicao/admin/classificacao");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. COMPETÊNCIAS
// ─────────────────────────────────────────────────────────────────────────────

export async function saveTaxCompetencia(data: {
  id?: string;
  code: string;
  name: string;
  description?: string | null;
}) {
  await verifyTaxonomyEditor();
  const supabase = await createClient();

  if (data.id) {
    const { error } = await supabase
      .from("tax_competencias")
      .update({
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        description: data.description?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("tax_competencias").insert({
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      description: data.description?.trim() || null,
    });

    if (error) throw new Error(error.message);
  }

  revalidatePath("/instituicao/admin/classificacao");
  return { success: true };
}

export async function toggleTaxCompetenciaActive(id: string, is_active: boolean) {
  await verifyTaxonomyEditor();
  const supabase = await createClient();

  const { error } = await supabase
    .from("tax_competencias")
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/instituicao/admin/classificacao");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. IMPORTAÇÃO CSV EM LOTE (IDEMPOTENTE)
// ─────────────────────────────────────────────────────────────────────────────

export async function importTaxonomyCSVAction(
  type: "areas" | "cenarios" | "temas" | "competencias",
  csvContent: string
) {
  await verifyTaxonomyEditor();
  const rows = parseTaxonomyCSV(csvContent);
  if (rows.length === 0) {
    throw new Error("Nenhuma linha válida encontrada no CSV.");
  }

  const supabase = await createClient();
  let importedCount = 0;

  if (type === "areas") {
    for (const r of rows) {
      await supabase.from("tax_areas").upsert(
        {
          code: r.code.toUpperCase(),
          name: r.name,
          color_hex: r.color_hex || null,
          order_index: r.order_index || 1,
          enamed_stage: (r.enamed_stage as any) || "etapa_2_3",
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "code,enamed_stage" }
      );
      importedCount++;
    }
  } else if (type === "cenarios") {
    for (const r of rows) {
      await supabase.from("tax_cenarios").upsert(
        {
          code: r.code.toUpperCase(),
          name: r.name,
          description: r.description || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "code" }
      );
      importedCount++;
    }
  } else if (type === "temas") {
    // Busca mapa de áreas para vincular
    const { data: areas } = await supabase.from("tax_areas").select("id, code");
    const areaMap = new Map((areas || []).map((a: any) => [a.code.toUpperCase(), a.id]));

    for (const r of rows) {
      const areaId = areaMap.get((r.area_code || "").toUpperCase()) || (areas?.[0]?.id as string);
      if (areaId) {
        await supabase.from("tax_temas").upsert(
          {
            area_id: areaId,
            code: r.code.toUpperCase(),
            name: r.name,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "area_id,code" }
        );
        importedCount++;
      }
    }
  } else if (type === "competencias") {
    for (const r of rows) {
      await supabase.from("tax_competencias").upsert(
        {
          code: r.code.toUpperCase(),
          name: r.name,
          description: r.description || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "code" }
      );
      importedCount++;
    }
  }

  revalidatePath("/instituicao/admin/classificacao");
  return { success: true, count: importedCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. MAPEAMENTO DE-PARA DE ÁREAS LEGADAS
// ─────────────────────────────────────────────────────────────────────────────

export async function mapLegacyAreaAction(legacyText: string, targetAreaId: string) {
  await verifyTaxonomyEditor();
  const supabase = await createClient();

  // 1. Grava no de-para
  const { error: mapErr } = await supabase.from("tax_area_legacy_mapping").upsert(
    {
      legacy_text: legacyText.trim(),
      target_area_id: targetAreaId,
      notes: "Mapeamento manual via painel",
    },
    { onConflict: "legacy_text" }
  );

  if (mapErr) throw new Error(mapErr.message);

  // 2. Classifica retroativamente as questões com este texto
  const { data: orphanQuestions } = await supabase
    .from("questions")
    .select("id, difficulty")
    .ilike("area", legacyText.trim());

  if (orphanQuestions && orphanQuestions.length > 0) {
    for (const q of orphanQuestions) {
      const diff = ["facil", "fácil"].includes(q.difficulty?.toLowerCase())
        ? "facil"
        : ["alta", "muito-alta", "dificil", "difícil"].includes(q.difficulty?.toLowerCase())
        ? "dificil"
        : "media";

      await supabase.from("question_classification").upsert(
        {
          question_id: q.id,
          area_id: targetAreaId,
          difficulty: diff,
          suggestion_origin: "humano",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "question_id" }
      );
    }
  }

  revalidatePath("/instituicao/admin/classificacao");
  return { success: true, updatedCount: orphanQuestions?.length || 0 };
}
