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
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
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
