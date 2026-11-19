import { Metadata } from "next";
import { requireB2BMember } from "@/lib/b2b/auth";
import { getTaxonomyBundle } from "@/lib/b2b/taxonomy";
import { createClient } from "@/lib/supabase/server";
import { getStagingBatchAction } from "@/lib/b2b/importer/staging-actions";
import type { StagingItemDetails, StagingBatchSummary } from "@/lib/b2b/importer/importer-types";
import ImportarClient from "./ImportarClient";

export const metadata: Metadata = {
  title: "Importação e Staging de Questões | MedPleni B2B",
  description: "Extração, conferência lado a lado e classificação assistida por IA de itens de prova",
};

export default async function ImportarQuestoesPage() {
  const context = await requireB2BMember({
    requiredRoles: ["dirigente", "coordenador", "docente"],
  });

  const [taxonomy, supabase] = await Promise.all([
    getTaxonomyBundle(),
    createClient(),
  ]);

  // Busca se há lote recente em preparação (staging)
  const { data: latestBatch } = await supabase
    .from("question_staging_batches")
    .select("id")
    .eq("institution_id", context.institution.id)
    .eq("status", "staging")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let initialBatch: StagingBatchSummary | null = null;
  let initialItems: StagingItemDetails[] = [];

  if (latestBatch?.id) {
    const batchDetails = await getStagingBatchAction(latestBatch.id);
    initialBatch = batchDetails.batch;
    initialItems = batchDetails.items;
  }

  return (
    <ImportarClient
      context={context}
      taxonomy={taxonomy}
      initialBatch={initialBatch}
      initialItems={initialItems}
    />
  );
}

