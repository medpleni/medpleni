import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getB2BUserContext } from "@/lib/b2b/auth";
import { createClient } from "@/lib/supabase/server";
import CorrecaoClient from "./CorrecaoClient";

export const metadata: Metadata = {
  title: "Correção Óptica e Conferência | MedPleni",
  description: "Leitura automática de folhas de respostas em papel e conferência assistida",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CorrecaoPage({ params }: PageProps) {
  const { id } = await params;
  const context = await getB2BUserContext();

  if (!context?.institution?.id) {
    redirect("/instituicao");
  }

  const supabase = await createClient();

  // 1. Busca avaliação
  const { data: assessment, error: aErr } = await supabase
    .from("assessments")
    .select("id, title, type, modality, status, planned_matrix")
    .eq("id", id)
    .single();

  if (aErr || !assessment) {
    redirect("/instituicao/provas");
  }

  // 2. Busca alunos da instituição para alocação na fila manual e digitação
  const { data: members } = await supabase
    .from("institution_members")
    .select(`
      user_id,
      profiles ( full_name, email )
    `)
    .eq("institution_id", context.institution.id)
    .eq("role", "aluno")
    .eq("is_active", true);

  interface RawStudentMember {
    user_id: string;
    profiles?: { full_name?: string; email?: string } | { full_name?: string; email?: string }[] | null;
  }

  const students = ((members || []) as unknown as RawStudentMember[]).map((m) => {
    const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return {
      userId: m.user_id,
      name: prof?.full_name || prof?.email || "Estudante",
      email: prof?.email || "",
      ra: `RA-${m.user_id.slice(0, 6).toUpperCase()}`,
    };
  });

  interface PlannedMatrix {
    totalQuestions?: number;
  }
  const matrix = (assessment.planned_matrix || {}) as PlannedMatrix;
  const totalQuestions = matrix.totalQuestions || 20;

  return (
    <CorrecaoClient
      assessment={assessment}
      students={students}
      totalQuestions={totalQuestions}
      context={context}
    />
  );
}
