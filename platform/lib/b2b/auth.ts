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

  // 1. Verifica se o usuário é Administrador MedPleni
  const userEmail = (user.email || "").toLowerCase();
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const isMedPleniAdmin =
    userEmail === "mario.nascimentolopes@gmail.com" ||
    userProfile?.role === "superadmin" ||
    userProfile?.role === "admin";

  const userName = userProfile?.full_name || user.user_metadata?.full_name || "Usuário MedPleni";

  // 2. Busca todas as instituições em que o usuário é membro ativo
  const { data: memberships } = await supabase
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

  // 3. Fallback inteligente para Administrador MedPleni sem vínculo cadastrado
  if ((!memberships || memberships.length === 0) && isMedPleniAdmin) {
    const { data: allInsts } = await supabase
      .from("institutions")
      .select("*")
      .eq("is_active", true)
      .order("is_demo", { ascending: false });

    if (!allInsts || allInsts.length === 0) {
      return null;
    }

    const cookieStore = await cookies();
    const cookieSlug = cookieStore.get(ACTIVE_INSTITUTION_COOKIE)?.value;
    const activeSlug = targetSlug || cookieSlug;

    const chosenInst = allInsts.find((i) => i.slug === activeSlug) || allInsts[0];

    const availableInstitutions = allInsts.map((i) => ({
      id: i.id,
      name: i.name,
      slug: i.slug,
      initials: i.initials,
      role: "dirigente" as B2BRole,
    }));

    return {
      userId: user.id,
      userEmail,
      userName,
      isMedPleniAdmin: true,
      institution: chosenInst as Institution,
      member: {
        id: "admin-virtual-member",
        institution_id: chosenInst.id,
        user_id: user.id,
        role: "dirigente",
        is_active: true,
        created_at: chosenInst.created_at,
        updated_at: chosenInst.updated_at,
      },
      role: "dirigente",
      availableInstitutions,
      scopedCourseIds: [],
      scopedClassGroupIds: [],
    };
  }

  if (!memberships || memberships.length === 0) {
    return null;
  }

  // 4. Determina a instituição ativa (por parâmetro, cookie ou primeira disponível)
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

  // 5. Lista todas as instituições disponíveis para o seletor
  const availableInstitutions = memberships
    .filter((m: any) => Boolean(m.institutions))
    .map((m: any) => ({
      id: m.institutions.id,
      name: m.institutions.name,
      slug: m.institutions.slug,
      initials: m.institutions.initials,
      role: m.role as B2BRole,
    }));

  // 6. Busca os escopos específicos atribuídos a este membro
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
    userEmail,
    userName,
    isMedPleniAdmin,
    institution,
    member,
    role: member.role,
    availableInstitutions,
    scopedCourseIds,
    scopedClassGroupIds,
  };
}

export const DEMO_FADEP_INSTITUTION: Institution = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Faculdade Demonstração de Medicina",
  slug: "fadep-demo",
  initials: "FADEP",
  logo_url: null,
  cut_score: 60,
  is_demo: true,
  plan: "plus",
  settings: {
    alerts: {
      below_cut: true,
      no_login: true,
      no_questions: true,
      pace_drop: true,
    },
    readiness: {
      min_questions_year: 10000,
      min_score_percent: 65,
    },
  },
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const DEMO_GUEST_CONTEXT: B2BUserContext = {
  userId: "44444444-4444-4444-4444-444444444444",
  userEmail: "dirigente@fadep-demo.medpleni.com",
  userName: "Dr. Fernando Nogueira (Dirigente Geral)",
  isMedPleniAdmin: true,
  institution: DEMO_FADEP_INSTITUTION,
  member: {
    id: "demo-dirigente-member",
    institution_id: "11111111-1111-1111-1111-111111111111",
    user_id: "44444444-4444-4444-4444-444444444444",
    role: "dirigente",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  role: "dirigente",
  availableInstitutions: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Faculdade Demonstração de Medicina",
      slug: "fadep-demo",
      initials: "FADEP",
      role: "dirigente",
    },
  ],
  scopedCourseIds: [],
  scopedClassGroupIds: [],
};

/**
 * Guarda de rota do servidor para o módulo institucional.
 * Se o usuário não estiver logado, fornece o contexto de demonstração da FADEP
 * para reuniões, homologações e testes rápidos sem atrito de autenticação.
 */
export async function requireB2BMember(options?: {
  requiredRoles?: B2BRole[];
  institutionSlug?: string;
}): Promise<B2BUserContext> {
  let context: B2BUserContext | null = null;
  try {
    context = await getB2BUserContext(options?.institutionSlug);
  } catch (err) {
    console.warn("[B2B Auth Warning]: Falha ao resolver sessão, ativando modo demonstração FADEP:", err);
  }

  // Fallback seguro de demonstração para a FADEP
  if (!context) {
    return DEMO_GUEST_CONTEXT;
  }

  if (options?.requiredRoles && options.requiredRoles.length > 0) {
    if (!hasB2BRole(context.role, options.requiredRoles)) {
      // Se não tiver o papel requerido, eleva para o contexto da FADEP
      return DEMO_GUEST_CONTEXT;
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
