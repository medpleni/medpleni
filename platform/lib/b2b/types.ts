/**
 * MedPleni Institucional (B2B) — Types & Interfaces
 * Fonte de verdade para os modelos de dados e contextos multi-tenant.
 */

export type B2BRole = "dirigente" | "coordenador" | "docente" | "aluno";

export type B2BPlan = "vazia" | "acervo" | "plus";

export type EnrollmentStatus = "active" | "suspended" | "completed" | "transferred";

export interface B2BInstitutionSettings {
  alerts: {
    below_cut: boolean;
    no_login: boolean;
    no_questions: boolean;
    pace_drop: boolean;
  };
  readiness: {
    min_questions_year: number;
    min_score_percent: number;
  };
}

export interface Institution {
  id: string;
  name: string;
  slug: string;
  initials: string;
  logo_url?: string | null;
  cut_score: number; // Régua 60 padrão
  is_demo: boolean;
  plan: B2BPlan;
  settings: B2BInstitutionSettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  institution_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AcademicTerm {
  id: string;
  institution_id: string;
  label: string; // Ex: '2027.1'
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ClassGroup {
  id: string;
  course_id: string;
  term_id?: string | null;
  period: number; // 1 a 12
  label: string; // Ex: 'MED-2027-8P'
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InstitutionMember {
  id: string;
  institution_id: string;
  user_id: string;
  role: B2BRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemberScope {
  id: string;
  member_id: string;
  course_id?: string | null;
  class_group_id?: string | null;
  created_at: string;
}

export interface Enrollment {
  id: string;
  member_id: string;
  class_group_id: string;
  student_registration?: string | null; // RA
  status: EnrollmentStatus;
  start_date: string;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IndividualAccessLog {
  id: string;
  institution_id: string;
  actor_id: string;
  actor_role: string;
  student_user_id: string;
  screen_viewed: string;
  details?: Record<string, unknown>;
  created_at: string;
}

/**
 * Contexto resolvido do usuário na instituição para renderização do layout e permissões
 */
export interface B2BUserContext {
  userId: string;
  institution: Institution;
  member: InstitutionMember;
  role: B2BRole;
  scopedCourseIds: string[]; // Vazio = sem restrição específica (ou todos)
  scopedClassGroupIds: string[]; // Vazio = sem restrição específica (ou todos)
}
