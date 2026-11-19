import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getB2BUserContext } from "@/lib/b2b/auth";
import { createClient } from "@/lib/supabase/server";
import { getExamMonitorDataAction } from "@/lib/b2b/player-actions";
import MonitorClient from "./MonitorClient";

export const metadata: Metadata = {
  title: "Monitoramento de Aplicação | MedPleni",
  description: "Acompanhamento em tempo real, controle de presença e acessibilidade",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MonitorPage({ params }: PageProps) {
  const { id } = await params;
  const context = await getB2BUserContext();

  if (!context?.institution?.id) {
    redirect("/instituicao");
  }

  const supabase = await createClient();

  // Busca dados básicos da avaliação
  const { data: assessment, error } = await supabase
    .from("assessments")
    .select("id, title, type, modality, status, duration_minutes, starts_at, ends_at, answers_released_at")
    .eq("id", id)
    .single();

  if (error || !assessment) {
    redirect("/instituicao/provas");
  }

  const { stats, candidates } = await getExamMonitorDataAction(id);

  return (
    <MonitorClient
      assessment={assessment}
      initialStats={stats}
      initialCandidates={candidates}
      context={context}
    />
  );
}
