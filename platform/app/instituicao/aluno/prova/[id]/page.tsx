import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getB2BUserContext } from "@/lib/b2b/auth";
import { startOrResumeAttemptAction } from "@/lib/b2b/player-actions";
import PlayerClient from "./PlayerClient";

export const metadata: Metadata = {
  title: "Prova em Andamento | MedPleni",
  description: "Ambiente oficial de realização de provas e simulados institucionais",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AlunoProvaPage({ params }: PageProps) {
  const { id } = await params;
  const context = await getB2BUserContext();

  if (!context?.userId) {
    redirect("/login");
  }

  const res = await startOrResumeAttemptAction(id);

  if (!res.success || !res.data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full p-6 rounded-xl border border-border bg-card text-center space-y-4">
          <div className="text-3xl">⚠️</div>
          <h1 className="text-base font-bold text-foreground">
            Não foi possível carregar a avaliação
          </h1>
          <p className="text-xs text-muted-foreground">
            {res.message || "Verifique se a avaliação foi publicada ou se você tem permissão para realizá-la."}
          </p>
          <a
            href="/instituicao"
            className="inline-block px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Voltar para o Início
          </a>
        </div>
      </div>
    );
  }

  return <PlayerClient initialExamState={res.data} studentName={context.userName} />;
}
