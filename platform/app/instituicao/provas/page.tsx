import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getB2BUserContext } from "@/lib/b2b/auth";
import { createClient } from "@/lib/supabase/server";
import { getCanonicalAreas } from "@/lib/b2b/taxonomy";
import {
  listAssessmentsAction,
  listMedPleniTemplatesAction,
} from "@/lib/b2b/exams-actions";
import ProvasClient from "./ProvasClient";

export const metadata: Metadata = {
  title: "Provas e Avaliações | MedPleni Institucional",
  description: "Gestão, montagem assistida por matriz e aplicação de provas regulares e simulados ENAMED",
};

export default async function ProvasPage() {
  const context = await getB2BUserContext();

  if (!context?.institution?.id) {
    redirect("/instituicao");
  }

  const supabase = await createClient();

  // 1. Busca turmas ativas da instituição
  const { data: classGroups } = await supabase
    .from("class_groups")
    .select(`
      id,
      label,
      period,
      courses ( name )
    `)
    .eq("is_active", true)
    .order("period", { ascending: true });

  // 2. Busca docentes da instituição para coautoria e revisão
  const { data: teachers } = await supabase
    .from("institution_members")
    .select(`
      user_id,
      role,
      profiles ( full_name, email )
    `)
    .eq("institution_id", context.institution.id)
    .eq("is_active", true)
    .in("role", ["docente", "coordenador", "dirigente"]);

  // 3. Busca lista de avaliações, templates MedPleni e áreas canônicas
  const [assessments, templates, areas] = await Promise.all([
    listAssessmentsAction(),
    listMedPleniTemplatesAction(),
    getCanonicalAreas("todas"),
  ]);

  type RawClassItem = {
    id: string;
    label: string;
    period: number;
    courses?: { name?: string } | { name?: string }[] | null;
  };
  const formattedClasses = ((classGroups || []) as unknown as RawClassItem[]).map((cg) => {
    const courseName = Array.isArray(cg.courses) ? cg.courses[0]?.name : cg.courses?.name;
    return {
      id: cg.id,
      label: cg.label,
      period: cg.period,
      courseName: courseName || "Medicina",
    };
  });

  type RawTeacherItem = {
    user_id: string;
    role: string;
    profiles?: { full_name?: string; email?: string } | { full_name?: string; email?: string }[] | null;
  };
  const formattedTeachers = ((teachers || []) as unknown as RawTeacherItem[]).map((t) => {
    const prof = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
    return {
      userId: t.user_id,
      name: prof?.full_name || prof?.email || "Docente",
      role: t.role,
    };
  });

  return (
    <ProvasClient
      context={context}
      initialAssessments={assessments}
      templates={templates}
      classGroups={formattedClasses}
      teachers={formattedTeachers}
      canonicalAreas={areas}
    />
  );
}
