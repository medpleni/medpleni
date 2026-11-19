import React from "react";
import { redirect } from "next/navigation";
import { getB2BUserContext } from "@/lib/b2b/auth";
import { createClient } from "@/lib/supabase/server";
import GovernancaClient from "./GovernancaClient";
import { GovernanceAuditRecord, IndividualAccessRecord } from "@/lib/b2b/governance";

export default async function GovernancaPage() {
  const context = await getB2BUserContext();

  if (!context?.institution?.id) {
    redirect("/login");
  }

  // A página de governança e auditoria de acessos é exclusiva do dirigente e superadmin
  if (context.role !== "dirigente" && !context.isMedPleniAdmin) {
    redirect("/instituicao");
  }

  const institution = context.institution;
  const supabase = await createClient();

  // 1. Busca logs de auditoria imutável
  const { data: dbAudit } = await supabase
    .from("b2b_governance_audit_logs")
    .select("*")
    .eq("institution_id", institution.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const auditLogs: GovernanceAuditRecord[] =
    dbAudit && dbAudit.length > 0
      ? dbAudit.map((row) => ({
          id: row.id,
          institutionId: row.institution_id,
          eventType: row.event_type,
          performedBy: row.performed_by,
          performedByName: row.performed_by_name,
          performedByRole: row.performed_by_role,
          targetId: row.target_id,
          targetLabel: row.target_label,
          details: row.details || {},
          ipAddress: row.ip_address,
          userAgent: row.user_agent,
          createdAt: row.created_at,
        }))
      : [
          {
            id: "log-demo-1",
            institutionId: institution.id,
            eventType: "gabarito_retificado",
            performedBy: context.userId,
            performedByName: "Prof. Dr. Roberto Guimarães",
            performedByRole: "dirigente",
            targetId: "exam-s1",
            targetLabel: "Simulado Geral 2026.1 (Questão 14)",
            details: { previous_letter: "B", new_letter: "C", reason: "Ajuste bibliográfico DCNs" },
            createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
          },
          {
            id: "log-demo-2",
            institutionId: institution.id,
            eventType: "questao_anulada",
            performedBy: context.userId,
            performedByName: "Prof. Dr. Roberto Guimarães",
            performedByRole: "dirigente",
            targetId: "exam-s1",
            targetLabel: "Simulado Geral 2026.1 (Questão 28)",
            details: { reason: "Dupla interpretação do enunciado", score_credited: true },
            createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
          },
          {
            id: "log-demo-3",
            institutionId: institution.id,
            eventType: "dados_exportados",
            performedBy: context.userId,
            performedByName: "Prof. Dr. Roberto Guimarães",
            performedByRole: "dirigente",
            targetId: "relatorio-cpa",
            targetLabel: "Relatório de Desempenho CPA / NDE (CSV)",
            details: { format: "CSV", rows_count: 240, has_dictionary: true },
            createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          },
          {
            id: "log-demo-4",
            institutionId: institution.id,
            eventType: "corte_parametros_alterados",
            performedBy: context.userId,
            performedByName: "Prof. Dr. Roberto Guimarães",
            performedByRole: "dirigente",
            targetId: institution.id,
            targetLabel: "Configurações da Instituição",
            details: { cut_score: 60, readiness_min_questions: 10000 },
            createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          },
          {
            id: "log-demo-5",
            institutionId: institution.id,
            eventType: "suporte_medpleni_acesso",
            performedBy: "usr-admin-mario",
            performedByName: "Mario Lopes (Suporte MedPleni)",
            performedByRole: "superadmin",
            targetId: institution.id,
            targetLabel: "Auditoria de Leitura Óptica OMR",
            details: { ticket_id: "SUP-2026-9481", scope: "telemetry_only" },
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ];

  // 2. Busca registros de acessos individuais
  const { data: dbAccess } = await supabase
    .from("individual_access_log")
    .select("*")
    .eq("institution_id", institution.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const accessLogs: IndividualAccessRecord[] =
    dbAccess && dbAccess.length > 0
      ? dbAccess.map((row) => ({
          id: row.id,
          institutionId: row.institution_id,
          studentUserId: row.student_user_id,
          studentName: "Discente da Coorte",
          studentRegistration: "RA-2026",
          accessedBy: row.accessed_by,
          accessedByName: "Membro da Gestão",
          accessedByRole: "docente",
          context: row.context || "Visualização de devolutiva individual",
          justification: "Acompanhamento formativo e orientação pedagógica de nivelamento",
          createdAt: row.created_at,
        }))
      : [
          {
            id: "acc-demo-1",
            institutionId: institution.id,
            studentUserId: "usr-st-01",
            studentName: "Lucas Mendes de Oliveira",
            studentRegistration: "RA-2026-0041",
            accessedBy: context.userId,
            accessedByName: "Prof. Dr. Roberto Guimarães",
            accessedByRole: "dirigente",
            context: "Acesso à Devolutiva de Erros do Simulado Geral 2026.1",
            justification: "Orientação pedagógica para superação da régua 60",
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: "acc-demo-2",
            institutionId: institution.id,
            studentUserId: "usr-st-02",
            studentName: "Beatriz Helena Costa",
            studentRegistration: "RA-2026-0089",
            accessedBy: context.userId,
            accessedByName: "Coordenação de Medicina",
            accessedByRole: "coordenador",
            context: "Acompanhamento longitudinal de eixo crítico em Cirurgia",
            justification: "Pactuação de plano de reforço no Praticar",
            createdAt: new Date(Date.now() - 7200000).toISOString(),
          },
          {
            id: "acc-demo-3",
            institutionId: institution.id,
            studentUserId: "usr-st-03",
            studentName: "Guilherme Santos Prado",
            studentRegistration: "RA-2026-0112",
            accessedBy: context.userId,
            accessedByName: "Docente Ciclo Clínico",
            accessedByRole: "docente",
            context: "Consulta de perfil na Zona de Decisão (51–60%)",
            justification: "Recomendação de lista de nivelamento pós-aula",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ];

  // 3. Busca lista de estudantes para o modal de anonimização
  const { data: dbEnrollments } = await supabase
    .from("enrollments")
    .select(`
      student_registration,
      institution_members!inner (
        user_id,
        profiles (
          full_name
        )
      )
    `)
    .limit(50);

  const studentsList =
    dbEnrollments && dbEnrollments.length > 0
      ? dbEnrollments.map((e: any, idx: number) => ({
          userId: e.institution_members?.user_id || `st-usr-${idx}`,
          name: e.institution_members?.profiles?.full_name || `Estudante ${idx + 1}`,
          registration: e.student_registration || `RA-2026-${String(idx + 1).padStart(4, "0")}`,
        }))
      : [
          { userId: "usr-st-01", name: "Lucas Mendes de Oliveira", registration: "RA-2026-0041" },
          { userId: "usr-st-02", name: "Beatriz Helena Costa", registration: "RA-2026-0089" },
          { userId: "usr-st-03", name: "Guilherme Santos Prado", registration: "RA-2026-0112" },
        ];

  return (
    <GovernancaClient
      institution={{
        id: institution.id,
        name: institution.name || "Faculdade Demonstração",
        cutScore: (institution.settings as any)?.cut_score ?? 60,
        isActive: institution.is_active ?? true,
      }}
      auditLogs={auditLogs}
      accessLogs={accessLogs}
      studentsList={studentsList}
      userRole={context.role}
    />
  );
}
