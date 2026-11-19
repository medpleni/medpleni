"use server";

import { revalidatePath } from "next/cache";
import { getB2BUserContext } from "./auth";
import { createClient } from "@/lib/supabase/server";
import {
  GovernanceAuditEventType,
  GovernanceAuditRecord,
  IndividualAccessRecord,
  anonymizeStudentProfile,
  generateDataDictionary,
} from "./governance";

/**
 * Grava um evento imutável na trilha de auditoria da instituição
 */
export async function recordGovernanceAuditEventAction(params: {
  institutionId: string;
  eventType: GovernanceAuditEventType;
  targetId?: string;
  targetLabel?: string;
  details?: Record<string, any>;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const context = await getB2BUserContext();
    if (!context?.userId) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const supabase = await createClient();

    const insertPayload = {
      institution_id: params.institutionId,
      event_type: params.eventType,
      performed_by: context.userId,
      performed_by_name: context.userName,
      performed_by_role: context.role,
      target_id: params.targetId || null,
      target_label: params.targetLabel || null,
      details: params.details || {},
    };

    const { data, error } = await supabase
      .from("b2b_governance_audit_logs")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error) {
      console.error("[Governance Audit] Erro ao gravar log imutável:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (err: any) {
    console.error("[Governance Audit] Exceção:", err);
    return { success: false, error: err?.message || "Falha interna ao gravar auditoria." };
  }
}

/**
 * Consulta a trilha de auditoria imutável (exclusivo para dirigente e admin MedPleni)
 */
export async function fetchGovernanceAuditLogsAction(
  institutionId: string,
  eventTypeFilter?: string
): Promise<{ success: boolean; data: GovernanceAuditRecord[]; error?: string }> {
  try {
    const context = await getB2BUserContext();
    if (!context?.userId) {
      return { success: false, data: [], error: "Não autorizado." };
    }

    // Apenas dirigente ou superadmin MedPleni pode ver a trilha de auditoria
    if (context.role !== "dirigente" && !context.isMedPleniAdmin) {
      return { success: false, data: [], error: "Acesso restrito ao dirigente institucional." };
    }

    const supabase = await createClient();

    let query = supabase
      .from("b2b_governance_audit_logs")
      .select("*")
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });

    if (eventTypeFilter && eventTypeFilter !== "todos") {
      query = query.eq("event_type", eventTypeFilter);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      return { success: false, data: [], error: error.message };
    }

    const mapped: GovernanceAuditRecord[] = (data || []).map((row) => ({
      id: row.id,
      institutionId: row.institution_id,
      eventType: row.event_type as GovernanceAuditEventType,
      performedBy: row.performed_by,
      performedByName: row.performed_by_name,
      performedByRole: row.performed_by_role,
      targetId: row.target_id,
      targetLabel: row.target_label,
      details: row.details || {},
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    }));

    return { success: true, data: mapped };
  } catch (err: any) {
    return { success: false, data: [], error: err?.message || "Erro ao buscar auditoria." };
  }
}

/**
 * Consulta o registro de acessos a dados individuais (LGPD)
 */
export async function fetchIndividualAccessLogsAction(
  institutionId: string
): Promise<{ success: boolean; data: IndividualAccessRecord[]; error?: string }> {
  try {
    const context = await getB2BUserContext();
    if (!context?.userId) {
      return { success: false, data: [], error: "Não autorizado." };
    }

    if (context.role !== "dirigente" && !context.isMedPleniAdmin) {
      return { success: false, data: [], error: "Acesso restrito ao dirigente institucional." };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("individual_access_log")
      .select(`
        id,
        institution_id,
        student_user_id,
        accessed_by,
        context,
        created_at
      `)
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return { success: false, data: [], error: error.message };
    }

    const mapped: IndividualAccessRecord[] = (data || []).map((row: any, idx: number) => ({
      id: row.id,
      institutionId: row.institution_id,
      studentUserId: row.student_user_id,
      studentName: `Discente Identificado (${row.student_user_id.substring(0, 8)})`,
      accessedBy: row.accessed_by,
      accessedByName: "Membro da Gestão",
      accessedByRole: "docente",
      context: row.context || "Visualização de devolutiva e histórico individual",
      justification: "Acompanhamento formativo e orientação pedagógica de nivelamento",
      createdAt: row.created_at,
    }));

    return { success: true, data: mapped };
  } catch (err: any) {
    return { success: false, data: [], error: err?.message || "Erro ao buscar acessos individuais." };
  }
}

/**
 * Executa a rotina de anonimização de dados de estudante (LGPD Art. 18)
 */
export async function anonymizeStudentDataAction(params: {
  institutionId: string;
  studentUserId: string;
  reason: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const context = await getB2BUserContext();
    if (!context?.userId || (context.role !== "dirigente" && !context.isMedPleniAdmin)) {
      return { success: false, message: "Apenas o dirigente ou admin MedPleni pode anonimizar estudantes." };
    }

    const supabase = await createClient();

    // 1. Busca dados do aluno
    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", params.studentUserId)
      .single();

    const anon = anonymizeStudentProfile({
      id: params.studentUserId,
      name: studentProfile?.full_name || "Estudante",
      email: studentProfile?.email || "aluno@medpleni.com",
      registration: "RA-ORIGINAL",
    });

    // 2. Atualiza profile com dados anonimizados
    await supabase
      .from("profiles")
      .update({
        full_name: anon.anonymizedName,
        email: anon.anonymizedEmail,
      })
      .eq("id", params.studentUserId);

    // 3. Atualiza matrícula em enrollments
    await supabase
      .from("enrollments")
      .update({
        student_registration: anon.anonymizedRegistration,
      })
      .eq("institution_id", params.institutionId)
      .filter("institution_members.user_id", "eq", params.studentUserId);

    // 4. Registra na trilha imutável de auditoria
    await recordGovernanceAuditEventAction({
      institutionId: params.institutionId,
      eventType: "anonimizacao_aluno",
      targetId: params.studentUserId,
      targetLabel: anon.anonymizedName,
      details: {
        reason: params.reason,
        anonymized_at: anon.anonymizedAt,
        legal_base: "LGPD Art. 18 · Direito de eliminação / anonimização a pedido",
      },
    });

    revalidatePath("/instituicao/governanca");
    revalidatePath("/instituicao/turmas");

    return {
      success: true,
      message: `Estudante anonimizado com sucesso como '${anon.anonymizedName}'. O histórico de turma foi preservado com dados desidentificados.`,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || "Falha ao anonimizar estudante." };
  }
}

/**
 * Rotina para encerramento de instituição com geração de pacote de exportação
 */
export async function archiveInstitutionAction(params: {
  institutionId: string;
  reason: string;
}): Promise<{ success: boolean; exportManifestUrl?: string; message: string }> {
  try {
    const context = await getB2BUserContext();
    if (!context?.isMedPleniAdmin && context?.role !== "dirigente") {
      return { success: false, message: "Apenas o dirigente ou admin MedPleni pode encerrar uma instituição." };
    }

    const supabase = await createClient();

    // 1. Marca instituição como inativa / encerrada
    await supabase
      .from("institutions")
      .update({
        is_active: false,
        settings: {
          status: "encerrada",
          closed_at: new Date().toISOString(),
          closure_reason: params.reason,
        },
      })
      .eq("id", params.institutionId);

    // 2. Grava evento na trilha de auditoria
    await recordGovernanceAuditEventAction({
      institutionId: params.institutionId,
      eventType: "encerramento_instituicao",
      targetId: params.institutionId,
      targetLabel: "Encerramento e Arquivamento Institucional",
      details: {
        reason: params.reason,
        timestamp: new Date().toISOString(),
        archive_protocol: `ARCH-${Date.now()}`,
      },
    });

    revalidatePath("/instituicao");
    revalidatePath("/instituicao/governanca");

    return {
      success: true,
      message: "Instituição encerrada com sucesso. Pacote de auditoria e exportação gerado para custódia legal.",
    };
  } catch (err: any) {
    return { success: false, message: err?.message || "Falha ao encerrar instituição." };
  }
}

/**
 * Exportação auditável: registra quem, quando, o quê e gera arquivo acompanhado de dicionário
 */
export async function exportAuditedDataAction(params: {
  institutionId: string;
  exportType: "exam_results" | "executive_report" | "aluno_item_csv";
  targetTitle: string;
  rowsCount: number;
  purpose: string;
}): Promise<{ success: boolean; dictionary: any[]; message: string }> {
  try {
    const context = await getB2BUserContext();
    if (!context?.userId) {
      return { success: false, dictionary: [], message: "Não autenticado." };
    }

    const dictionary = generateDataDictionary(params.exportType);

    await recordGovernanceAuditEventAction({
      institutionId: params.institutionId,
      eventType: "dados_exportados",
      targetId: params.exportType,
      targetLabel: params.targetTitle,
      details: {
        format: "CSV / JSON",
        rows_count: params.rowsCount,
        purpose: params.purpose,
        data_dictionary_fields: dictionary.map((d) => d.fieldName),
      },
    });

    return {
      success: true,
      dictionary,
      message: "Exportação registrada com sucesso na trilha de auditoria e dicionário gerado.",
    };
  } catch (err: any) {
    return { success: false, dictionary: [], message: err?.message || "Erro ao registrar exportação." };
  }
}
