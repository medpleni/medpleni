"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getB2BUserContext, ACTIVE_INSTITUTION_COOKIE } from "./auth";
import type { B2BRole, B2BPlan } from "./types";
import { sendEmail as dispatchResendEmail } from "@/lib/email/resend";
import { renderInvitationEmail } from "@/lib/email/templates/invitation-email";

/**
 * Helper interno para verificar permissões de gestão
 */
async function getAuthorizedActor(allowedRoles: B2BRole[] = ["dirigente", "coordenador"]) {
  const context = await getB2BUserContext();
  if (!context) {
    throw new Error("Não autenticado ou sem acesso institucional.");
  }

  const isAuthorized =
    context.isMedPleniAdmin ||
    allowedRoles.includes(context.role);

  if (!isAuthorized) {
    throw new Error("Acesso não autorizado para esta operação.");
  }

  return context;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ESTRUTURA: CURSOS, TERMOS LETIVOS E TURMAS
// ─────────────────────────────────────────────────────────────────────────────

export async function saveCourse(institutionId: string, course: { id?: string; name: string; is_active?: boolean }) {
  const actor = await getAuthorizedActor(["dirigente", "coordenador"]);
  if (actor.institution.id !== institutionId && !actor.isMedPleniAdmin) {
    throw new Error("Não autorizado para esta instituição.");
  }

  const supabase = await createClient();

  if (course.id) {
    const { error } = await supabase
      .from("courses")
      .update({
        name: course.name.trim(),
        is_active: course.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", course.id)
      .eq("institution_id", institutionId);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("courses").insert({
      institution_id: institutionId,
      name: course.name.trim(),
      is_active: course.is_active ?? true,
    });

    if (error) throw new Error(error.message);
  }

  revalidatePath("/instituicao/configuracoes");
  return { success: true };
}

export async function archiveCourse(institutionId: string, courseId: string) {
  const actor = await getAuthorizedActor(["dirigente"]);
  if (actor.institution.id !== institutionId && !actor.isMedPleniAdmin) {
    throw new Error("Não autorizado para esta instituição.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", courseId)
    .eq("institution_id", institutionId);

  if (error) throw new Error(error.message);

  revalidatePath("/instituicao/configuracoes");
  return { success: true };
}

export async function saveAcademicTerm(
  institutionId: string,
  term: { id?: string; label: string; start_date?: string | null; end_date?: string | null; is_active?: boolean }
) {
  const actor = await getAuthorizedActor(["dirigente", "coordenador"]);
  if (actor.institution.id !== institutionId && !actor.isMedPleniAdmin) {
    throw new Error("Não autorizado para esta instituição.");
  }

  const supabase = await createClient();

  if (term.id) {
    const { error } = await supabase
      .from("academic_terms")
      .update({
        label: term.label.trim(),
        start_date: term.start_date || null,
        end_date: term.end_date || null,
        is_active: term.is_active ?? true,
      })
      .eq("id", term.id)
      .eq("institution_id", institutionId);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("academic_terms").insert({
      institution_id: institutionId,
      label: term.label.trim(),
      start_date: term.start_date || null,
      end_date: term.end_date || null,
      is_active: term.is_active ?? true,
    });

    if (error) throw new Error(error.message);
  }

  revalidatePath("/instituicao/configuracoes");
  return { success: true };
}

export async function archiveAcademicTerm(institutionId: string, termId: string) {
  const actor = await getAuthorizedActor(["dirigente"]);
  if (actor.institution.id !== institutionId && !actor.isMedPleniAdmin) {
    throw new Error("Não autorizado para esta instituição.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("academic_terms")
    .update({ is_active: false })
    .eq("id", termId)
    .eq("institution_id", institutionId);

  if (error) throw new Error(error.message);

  revalidatePath("/instituicao/configuracoes");
  return { success: true };
}

export async function saveClassGroup(
  institutionId: string,
  classGroup: {
    id?: string;
    course_id: string;
    term_id?: string | null;
    period: number;
    label: string;
    is_active?: boolean;
  }
) {
  const actor = await getAuthorizedActor(["dirigente", "coordenador"]);
  if (actor.institution.id !== institutionId && !actor.isMedPleniAdmin) {
    throw new Error("Não autorizado para esta instituição.");
  }

  // Se for coordenador com restrição de curso, valida escopo
  if (actor.role === "coordenador" && actor.scopedCourseIds.length > 0) {
    if (!actor.scopedCourseIds.includes(classGroup.course_id)) {
      throw new Error("Coordenador não tem escopo sobre este curso.");
    }
  }

  const supabase = await createClient();

  if (classGroup.id) {
    const { error } = await supabase
      .from("class_groups")
      .update({
        course_id: classGroup.course_id,
        term_id: classGroup.term_id || null,
        period: classGroup.period,
        label: classGroup.label.trim(),
        is_active: classGroup.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", classGroup.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("class_groups").insert({
      course_id: classGroup.course_id,
      term_id: classGroup.term_id || null,
      period: classGroup.period,
      label: classGroup.label.trim(),
      is_active: classGroup.is_active ?? true,
    });

    if (error) throw new Error(error.message);
  }

  revalidatePath("/instituicao/configuracoes");
  return { success: true };
}

export async function archiveClassGroup(institutionId: string, classGroupId: string) {
  const actor = await getAuthorizedActor(["dirigente", "coordenador"]);
  if (actor.institution.id !== institutionId && !actor.isMedPleniAdmin) {
    throw new Error("Não autorizado para esta instituição.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("class_groups")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", classGroupId);

  if (error) throw new Error(error.message);

  revalidatePath("/instituicao/configuracoes");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PARÂMETROS DA INSTITUIÇÃO
// ─────────────────────────────────────────────────────────────────────────────

export async function updateInstitutionParams(
  institutionId: string,
  params: {
    cut_score: number;
    logo_url?: string | null;
    alerts: {
      below_cut: boolean;
      no_login: boolean;
      no_questions: boolean;
      pace_drop: boolean;
    };
    weekly_target_enabled?: boolean;
    weekly_target_questions?: number;
  }
) {
  const actor = await getAuthorizedActor(["dirigente"]);
  if (actor.institution.id !== institutionId && !actor.isMedPleniAdmin) {
    throw new Error("Apenas dirigentes e administradores podem alterar parâmetros.");
  }

  const supabase = await createClient();

  const currentSettings = actor.institution.settings || { alerts: {}, readiness: {} };
  const updatedSettings = {
    ...currentSettings,
    alerts: {
      below_cut: Boolean(params.alerts?.below_cut),
      no_login: Boolean(params.alerts?.no_login),
      no_questions: Boolean(params.alerts?.no_questions),
      pace_drop: Boolean(params.alerts?.pace_drop),
    },
    weekly_target: {
      enabled: Boolean(params.weekly_target_enabled),
      questions: params.weekly_target_questions || 50,
    },
  };

  const { error } = await supabase
    .from("institutions")
    .update({
      cut_score: params.cut_score,
      logo_url: params.logo_url?.trim() || null,
      settings: updatedSettings,
      updated_at: new Date().toISOString(),
    })
    .eq("id", institutionId);

  if (error) throw new Error(error.message);

  revalidatePath("/instituicao/configuracoes");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. USUÁRIOS E PAPÉIS (CONVITES, ESCOPOS, DESATIVAÇÃO)
// ─────────────────────────────────────────────────────────────────────────────

export async function inviteB2BMember(
  institutionId: string,
  data: {
    fullName: string;
    email: string;
    role: B2BRole;
    scopes?: string[];
  }
) {
  const actor = await getAuthorizedActor(["dirigente", "coordenador"]);
  if (actor.institution.id !== institutionId && !actor.isMedPleniAdmin) {
    throw new Error("Não autorizado para esta instituição.");
  }

  // Regra ESPEC / Prompt: só dirigente e admin MedPleni alteram ou criam dirigentes e coordenadores
  if (actor.role === "coordenador" && (data.role === "dirigente" || data.role === "coordenador")) {
    throw new Error("Coordenador só pode convidar docentes ou alunos.");
  }

  const supabase = await createClient();
  const email = data.email.trim().toLowerCase();
  const token = crypto.randomBytes(24).toString("hex");

  // Expiração padrão de 30 dias para convites
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Mapeamento compatível para tabela de convites
  const legacyRole = data.role === "docente" ? "docente" : "student";
  const plan = "pleno_anual";

  const { data: invRow, error: invError } = await supabase
    .from("admin_invitations")
    .insert({
      email,
      full_name: data.fullName.trim(),
      role: legacyRole,
      plan,
      sub_brand: actor.institution.initials || "B2B",
      access_duration: "1_ano",
      access_expires_at: expiresAt.toISOString(),
      token,
      status: "pending",
      institution_id: institutionId,
      b2b_role: data.role,
      b2b_scopes: data.scopes || [],
      created_by: actor.userId,
    })
    .select("id")
    .single();

  if (invError) {
    throw new Error(`Falha ao registrar convite: ${invError.message}`);
  }

  // Envio de e-mail com Resend (SE NÃO FOR INSTITUIÇÃO DEMO)
  let emailDispatched = false;
  if (!actor.institution.is_demo) {
    try {
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://medpleni.com.br"}/convite/${token}`;
      const html = renderInvitationEmail({
        name: data.fullName.trim(),
        roleLabel: `Membro Institucional (${data.role.toUpperCase()}) - ${actor.institution.name}`,
        planLabel: "Acesso Institucional MedPleni",
        accessPeriodLabel: "30 dias para ativação",
        inviteUrl,
      });

      await dispatchResendEmail({
        to: email,
        subject: `Convite para acessar ${actor.institution.name} no MedPleni`,
        html,
      });
      emailDispatched = true;
    } catch (mailErr) {
      console.warn("[Aviso ao enviar e-mail via Resend]:", mailErr);
    }
  }

  revalidatePath("/instituicao/configuracoes");
  return {
    success: true,
    invitationId: invRow.id,
    token,
    emailDispatched,
    isDemo: actor.institution.is_demo,
  };
}

export async function updateMemberRole(
  institutionId: string,
  memberId: string,
  newRole: B2BRole
) {
  const actor = await getAuthorizedActor(["dirigente"]);
  if (actor.institution.id !== institutionId && !actor.isMedPleniAdmin) {
    throw new Error("Apenas dirigentes e administradores da MedPleni podem alterar papéis.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("institution_members")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("institution_id", institutionId);

  if (error) throw new Error(error.message);

  revalidatePath("/instituicao/configuracoes");
  return { success: true };
}

export async function toggleMemberActive(
  institutionId: string,
  memberId: string,
  isActive: boolean
) {
  const actor = await getAuthorizedActor(["dirigente"]);
  if (actor.institution.id !== institutionId && !actor.isMedPleniAdmin) {
    throw new Error("Apenas dirigentes e administradores da MedPleni podem desativar membros.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("institution_members")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("institution_id", institutionId);

  if (error) throw new Error(error.message);

  revalidatePath("/instituicao/configuracoes");
  return { success: true };
}

export async function updateMemberScopes(
  institutionId: string,
  memberId: string,
  role: B2BRole,
  scopeIds: string[]
) {
  const actor = await getAuthorizedActor(["dirigente"]);
  if (actor.institution.id !== institutionId && !actor.isMedPleniAdmin) {
    throw new Error("Apenas dirigentes e administradores podem atualizar escopos.");
  }

  const supabase = await createClient();

  // Remove escopos anteriores deste membro
  await supabase.from("member_scopes").delete().eq("member_id", memberId);

  // Insere os novos escopos conforme o papel
  if (scopeIds.length > 0) {
    const scopeRows = scopeIds.map((id) => ({
      member_id: memberId,
      course_id: role === "coordenador" ? id : null,
      class_group_id: role === "docente" ? id : null,
    }));

    const { error: insertErr } = await supabase.from("member_scopes").insert(scopeRows);
    if (insertErr) throw new Error(insertErr.message);
  }

  revalidatePath("/instituicao/configuracoes");
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ADMIN MEDPLENI: CRIAÇÃO DE INSTITUIÇÃO E SESSÃO DE SUPORTE
// ─────────────────────────────────────────────────────────────────────────────

export async function adminCreateInstitution(data: {
  name: string;
  initials: string;
  slug: string;
  plan: B2BPlan;
  cut_score?: number;
  is_demo?: boolean;
}) {
  const actor = await getB2BUserContext();
  if (!actor?.isMedPleniAdmin) {
    throw new Error("Apenas administradores MedPleni podem criar novas instituições.");
  }

  const supabase = await createClient();

  const { data: newInst, error } = await supabase
    .from("institutions")
    .insert({
      name: data.name.trim(),
      initials: data.initials.trim().toUpperCase(),
      slug: data.slug.trim().toLowerCase(),
      plan: data.plan,
      cut_score: data.cut_score ?? 60.0,
      is_demo: data.is_demo ?? false,
      settings: {
        alerts: {
          below_cut: false,
          no_login: false,
          no_questions: false,
          pace_drop: false,
        },
        readiness: {
          min_questions_year: 10000,
          min_score_percent: 60,
        },
      },
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Falha ao criar instituição: ${error.message}`);
  }

  revalidatePath("/instituicao/admin");
  return { success: true, institution: newInst };
}

export async function adminEnterAsSupport(targetInstitutionId: string, reason: string) {
  const actor = await getB2BUserContext();
  if (!actor?.isMedPleniAdmin) {
    throw new Error("Acesso restrito ao time administrativo MedPleni.");
  }

  if (!reason?.trim() || reason.trim().length < 5) {
    throw new Error("O motivo de suporte é obrigatório para conformidade e auditoria (mínimo 5 caracteres).");
  }

  const supabase = await createClient();

  // 1. Busca a instituição alvo
  const { data: targetInst, error: instErr } = await supabase
    .from("institutions")
    .select("id, name, slug")
    .eq("id", targetInstitutionId)
    .single();

  if (instErr || !targetInst) {
    throw new Error("Instituição não encontrada.");
  }

  // 2. Registra sessão de suporte na tabela auditada
  const { error: logErr } = await supabase.from("b2b_support_sessions").insert({
    admin_id: actor.userId,
    admin_email: actor.userEmail,
    institution_id: targetInst.id,
    reason: reason.trim(),
  });

  if (logErr) {
    console.warn("Aviso ao registrar log de suporte:", logErr.message);
  }

  // 3. Define o cookie de instituição ativa para a selecionada
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_INSTITUTION_COOKIE, targetInst.slug, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });

  return { success: true, slug: targetInst.slug };
}
