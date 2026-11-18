import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type {
  B2BRole,
  Institution,
  InstitutionMember,
  MemberScope,
  B2BUserContext,
} from "./types";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FUNÇÕES PURAS DE PERMISSÃO E ESCOPO (Testáveis isoladamente via vitest)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Verifica se um papel atende a uma lista de papéis permitidos.
 * Se nenhuma lista for passada, qualquer membro ativo é aceito.
 */
export function hasB2BRole(userRole: B2BRole, allowedRoles?: B2BRole[]): boolean {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }
  return allowedRoles.includes(userRole);
}

/**
 * Verifica se o usuário tem permissão para visualizar uma turma específica.
 * - Dirigente: vê qualquer turma da sua instituição.
 * - Coordenador: vê qualquer turma dos cursos sob sua coordenação.
 * - Docente: vê SOMENTE turmas do seu escopo direto.
 * - Aluno: vê SOMENTE a turma onde está matriculado.
 */
export function canAccessClassGroup(
  role: B2BRole,
  classGroupId: string,
  scopedClassGroupIds: string[]
): boolean {
  if (role === "dirigente") {
    return true;
  }
  if (role === "coordenador") {
    // Se o coordenador tiver escopo específico de turmas ou cursos
    return scopedClassGroupIds.length === 0 || scopedClassGroupIds.includes(classGroupId);
  }
  // Docente e Aluno: restrito estritamente às turmas sob seu escopo / matrícula
  return scopedClassGroupIds.includes(classGroupId);
}

/**
 * Verifica se o usuário tem permissão para visualizar um curso.
 * - Dirigente: vê todos.
 * - Coordenador: se tiver escopo de curso, só os autorizados; senão todos da sua instituição.
 * - Docente / Aluno: acesso indireto apenas pelas turmas.
 */
export function canAccessCourse(
  role: B2BRole,
  courseId: string,
  scopedCourseIds: string[]
): boolean {
  if (role === "dirigente") {
    return true;
  }
  if (role === "coordenador") {
    return scopedCourseIds.length === 0 || scopedCourseIds.includes(courseId);
  }
  return false;
}

/**
 * Regra de acesso a dados individuais de estudante (LGPD).
 * - O próprio aluno pode ver seus dados.
 * - Dirigente e Coordenador da instituição podem ver.
 * - Docente pode ver SOMENTE se o aluno estiver em ao menos uma turma do escopo do docente.
 */
export function canViewStudentProfile(params: {
  actorRole: B2BRole;
  actorId: string;
  studentUserId: string;
  actorScopedClassIds: string[];
  studentClassGroupIds: string[];
}): boolean {
  const { actorRole, actorId, studentUserId, actorScopedClassIds, studentClassGroupIds } = params;

  // 1. O próprio estudante
  if (actorId === studentUserId) {
    return true;
  }

  // 2. Dirigente e Coordenador
  if (actorRole === "dirigente" || actorRole === "coordenador") {
    return true;
  }

  // 3. Docente: intersecção entre as turmas do docente e as do aluno
  if (actorRole === "docente") {
    return actorScopedClassIds.some((cId) => studentClassGroupIds.includes(cId));
  }

  return false;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FUNÇÕES DE SERVIDOR (Server Components, Route Handlers e Server Actions)
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const ACTIVE_INSTITUTION_COOKIE = "medpleni_b2b_active_institution";

/**
 * Obtém o contexto completo do usuário na instituição ativa.
 * Retorna null se o usuário não estiver autenticado ou não pertencer a nenhuma instituição B2B.
 */
export async function getB2BUserContext(targetSlug?: string): Promise<B2BUserContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // 1. Busca todas as instituições em que o usuário é membro ativo
  const { data: memberships, error: memError } = await supabase
    .from("institution_members")
    .select(`
      id,
      institution_id,
      user_id,
      role,
      is_active,
      created_at,
      updated_at,
      institutions (
        id,
        name,
        slug,
        initials,
        logo_url,
        cut_score,
        is_demo,
        plan,
        settings,
        is_active,
        created_at,
        updated_at
      )
    `)
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (memError || !memberships || memberships.length === 0) {
    return null;
  }

  // 2. Determina a instituição ativa (por parâmetro, cookie ou primeira disponível)
  const cookieStore = await cookies();
  const cookieSlug = cookieStore.get(ACTIVE_INSTITUTION_COOKIE)?.value;
  const activeSlug = targetSlug || cookieSlug;

  let activeMembership = memberships.find(
    (m: any) => m.institutions?.slug === activeSlug
  );

  if (!activeMembership) {
    activeMembership = memberships[0];
  }

  const institution = activeMembership.institutions as unknown as Institution;
  const member: InstitutionMember = {
    id: activeMembership.id,
    institution_id: activeMembership.institution_id,
    user_id: activeMembership.user_id,
    role: activeMembership.role as B2BRole,
    is_active: activeMembership.is_active,
    created_at: activeMembership.created_at,
    updated_at: activeMembership.updated_at,
  };

  // 3. Busca os escopos específicos atribuídos a este membro
  const { data: scopes } = await supabase
    .from("member_scopes")
    .select("course_id, class_group_id")
    .eq("member_id", member.id);

  const scopedCourseIds = (scopes || [])
    .map((s: any) => s.course_id)
    .filter(Boolean) as string[];

  const scopedClassGroupIds = (scopes || [])
    .map((s: any) => s.class_group_id)
    .filter(Boolean) as string[];

  return {
    userId: user.id,
    institution,
    member,
    role: member.role,
    scopedCourseIds,
    scopedClassGroupIds,
  };
}

/**
 * Guarda de rota do servidor para o módulo institucional.
 * Redireciona usuários não autenticados para o /login e usuários sem permissão para o /dashboard (B2C).
 */
export async function requireB2BMember(options?: {
  requiredRoles?: B2BRole[];
  institutionSlug?: string;
}): Promise<B2BUserContext> {
  const context = await getB2BUserContext(options?.institutionSlug);

  if (!context) {
    // Se o usuário não tem vínculo B2B, não quebra nada: redireciona para o B2C
    redirect("/dashboard");
  }

  if (options?.requiredRoles && options.requiredRoles.length > 0) {
    if (!hasB2BRole(context.role, options.requiredRoles)) {
      // Sem o papel necessário nesta instituição
      redirect("/dashboard");
    }
  }

  return context;
}

/**
 * Registra acesso individual a dados de aluno para conformidade com a LGPD.
 */
export async function logIndividualStudentAccess(params: {
  institutionId: string;
  actorId: string;
  actorRole: string;
  studentUserId: string;
  screenViewed: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("individual_access_log").insert({
      institution_id: params.institutionId,
      actor_id: params.actorId,
      actor_role: params.actorRole,
      student_user_id: params.studentUserId,
      screen_viewed: params.screenViewed,
      details: params.details || {},
    });
  } catch (err) {
    console.warn("Falha ao gravar individual_access_log LGPD:", err);
  }
}
