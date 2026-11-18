import { requireB2BMember } from "@/lib/b2b/auth";
import { createClient } from "@/lib/supabase/server";
import ConfiguracoesClient from "./ConfiguracoesClient";
import type { Course, AcademicTerm, ClassGroup, B2BRole } from "@/lib/b2b/types";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const context = await requireB2BMember({
    requiredRoles: ["dirigente", "coordenador"],
  });

  const supabase = await createClient();
  const instId = context.institution.id;

  // 1. Cursos
  const { data: coursesData } = await supabase
    .from("courses")
    .select("*")
    .eq("institution_id", instId)
    .order("name", { ascending: true });

  const courses = (coursesData || []) as Course[];
  const courseIds = courses.map((c) => c.id);

  // 2. Termos Letivos
  const { data: termsData } = await supabase
    .from("academic_terms")
    .select("*")
    .eq("institution_id", instId)
    .order("label", { ascending: false });

  const terms = (termsData || []) as AcademicTerm[];

  // 3. Turmas (class_groups)
  let classGroups: any[] = [];
  if (courseIds.length > 0) {
    const { data: cgData } = await supabase
      .from("class_groups")
      .select(`
        *,
        courses ( name ),
        academic_terms ( label )
      `)
      .in("course_id", courseIds)
      .order("period", { ascending: true });

    classGroups = (cgData || []).map((cg: any) => ({
      ...cg,
      courseName: cg.courses?.name,
      termLabel: cg.academic_terms?.label,
    }));
  }

  // 4. Membros da Instituição
  const { data: membersData } = await supabase
    .from("institution_members")
    .select(`
      id,
      user_id,
      role,
      is_active,
      created_at
    `)
    .eq("institution_id", instId)
    .order("created_at", { ascending: true });

  const memberUserIds = (membersData || []).map((m: any) => m.user_id);

  // Perfis dos membros
  let profilesMap = new Map<string, { full_name: string; email: string }>();
  if (memberUserIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", memberUserIds);

    for (const p of profilesData || []) {
      profilesMap.set(p.id, { full_name: p.full_name || "Sem Nome", email: p.email || "" });
    }
  }

  // Escopos dos membros
  const memberIds = (membersData || []).map((m: any) => m.id);
  let scopesMap = new Map<string, { courseIds: string[]; classGroupIds: string[] }>();
  if (memberIds.length > 0) {
    const { data: scopesData } = await supabase
      .from("member_scopes")
      .select("member_id, course_id, class_group_id")
      .in("member_id", memberIds);

    for (const s of scopesData || []) {
      const entry = scopesMap.get(s.member_id) || { courseIds: [], classGroupIds: [] };
      if (s.course_id) entry.courseIds.push(s.course_id);
      if (s.class_group_id) entry.classGroupIds.push(s.class_group_id);
      scopesMap.set(s.member_id, entry);
    }
  }

  const members = (membersData || []).map((m: any) => {
    const prof = profilesMap.get(m.user_id);
    const sc = scopesMap.get(m.id) || { courseIds: [], classGroupIds: [] };
    return {
      id: m.id,
      user_id: m.user_id,
      role: m.role as B2BRole,
      is_active: m.is_active,
      name: prof?.full_name || "Membro sem nome",
      email: prof?.email || "sem-email",
      scopedCourseIds: sc.courseIds,
      scopedClassGroupIds: sc.classGroupIds,
    };
  });

  // 5. Total de Matrículas
  let enrollmentCount = 0;
  if (memberIds.length > 0) {
    const { count } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .in("member_id", memberIds)
      .eq("status", "active");

    enrollmentCount = count || 0;
  }

  return (
    <ConfiguracoesClient
      context={context}
      courses={courses}
      terms={terms}
      classGroups={classGroups}
      members={members}
      enrollmentCount={enrollmentCount}
    />
  );
}
