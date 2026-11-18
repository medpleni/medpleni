import React from "react";
import type { Metadata } from "next";
import { requireB2BMember } from "@/lib/b2b/auth";
import B2BShell from "./components/B2BShell";

export const metadata: Metadata = {
  title: "MedPleni Institucional — Gestão Acadêmica e Avaliação ENAMED",
  description: "Plataforma institucional para faculdades de medicina acompanharem turmas, aplicarem provas e prepararem para o ENAMED.",
};

export default async function InstituicaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guarda de rota de servidor: se o usuário não for membro ativo de nenhuma instituição,
  // é redirecionado silenciosamente para a área do aluno B2C (/dashboard) sem quebras.
  const context = await requireB2BMember();

  return <B2BShell context={context}>{children}</B2BShell>;
}
