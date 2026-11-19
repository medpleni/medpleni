import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getB2BUserContext } from "@/lib/b2b/auth";
import { startOrResumeAttemptAction } from "@/lib/b2b/player-actions";
import CartaoClient from "./CartaoClient";

export const metadata: Metadata = {
  title: "Cartão de Respostas Digital | MedPleni Híbrida",
  description: "Lançamento ágil de respostas do caderno impresso via celular",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CartaoPage({ params }: PageProps) {
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
          <h1 className="text-base font-bold text-foreground">Cartão indisponível</h1>
          <p className="text-xs text-muted-foreground">{res.message}</p>
        </div>
      </div>
    );
  }

  return <CartaoClient initialExamState={res.data} studentName={context.userName} />;
}
