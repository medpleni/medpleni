"use client";

import React, { useState, useEffect, useCallback } from "react";

interface StudentDrawerProps {
  studentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStudentUpdated?: () => void;
}

interface Student360Data {
  profile: {
    id: string;
    fullName: string;
    email: string;
    crm: string | null;
    role: string;
    plan: string;
    targetExams: string[];
    targetSpecialty: string;
    weeklyStudyHours: number;
    streakDays: number;
    status: "active" | "blocked";
    blockedReason: string | null;
    accessExpiresAt: string | null;
    subBrand: string;
    lastActiveAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  metrics: {
    totalQuestionsAnswered: number;
    correctAnswers: number;
    accuracyPercentage: number;
    simulationsCompleted: number;
    diagnosticScore: number | null;
    diagnosticPriorityAreas: string[];
    studyStreak: number;
    weeklyHours: number;
  };
  simulations: Array<{
    id: string;
    status: string;
    score_percent: number | null;
    started_at: string;
    completed_at: string | null;
    time_spent_seconds: number;
    simulations: {
      id: string;
      title: string;
      institution: string;
      total_questions: number;
    } | null;
  }>;
  latestDiagnostic: any;
  emails: Array<{
    id: string;
    recipient_email: string;
    subject: string;
    email_type: string;
    status: string;
    body_html: string;
    resend_id?: string;
    created_at: string;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    admin_id: string;
    created_at: string;
    details: any;
  }>;
}

const V = {
  pu: "var(--pulso)",
  re: "var(--resgate)",
  rel: "#64B5E8",
  ind: "#6B5CE7",
  ch: "var(--chumbo)",
  nb: "var(--neblina)",
  pe: "var(--petroleo)",
  am: "#C98A0A",
  wn: "#F5A623",
  dg: "#FF6B6B",
  su: "var(--sucesso)",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
};

export default function StudentDrawer360({
  studentId,
  isOpen,
  onClose,
  onStudentUpdated,
}: StudentDrawerProps) {
  const [activeTab, setActiveTab] = useState<"visao_geral" | "desempenho" | "emails" | "auditoria" | "gestao">("visao_geral");
  const [data, setData] = useState<Student360Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Estados do formulário de gestão
  const [editRole, setEditRole] = useState("student");
  const [editPlan, setEditPlan] = useState("pleno_anual");
  const [editStatus, setEditStatus] = useState<"active" | "blocked">("active");
  const [blockedReason, setBlockedReason] = useState("");
  const [customExpiresAt, setCustomExpiresAt] = useState("");

  // Estado do envio de e-mail direto
  const [directEmailSubject, setDirectEmailSubject] = useState("");
  const [directEmailMessage, setDirectEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Estado do modal de preview de e-mail
  const [previewEmail, setPreviewEmail] = useState<{
    subject: string;
    recipient: string;
    date: string;
    html: string;
    resendId?: string;
  } | null>(null);

  const fetchStudentData = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`/api/admin/students/${studentId}`);
      const json = await res.json();
      if (json.success && json.student) {
        setData(json.student);
        setEditRole(json.student.profile.role || "student");
        setEditPlan(json.student.profile.plan || "pleno_anual");
        setEditStatus(json.student.profile.status || "active");
        setBlockedReason(json.student.profile.blockedReason || "");
        if (json.student.profile.accessExpiresAt) {
          setCustomExpiresAt(json.student.profile.accessExpiresAt.split("T")[0]);
        } else {
          setCustomExpiresAt("");
        }
      } else {
        setFeedbackMsg({ type: "error", text: json.error || "Não foi possível carregar o aluno." });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err?.message || "Erro de conexão ao carregar perfil." });
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (isOpen && studentId) {
      fetchStudentData();
      setActiveTab("visao_geral");
    }
  }, [isOpen, studentId, fetchStudentData]);

  // Tecla ESC para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewEmail) {
          setPreviewEmail(null);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, previewEmail, onClose]);

  if (!isOpen) return null;

  // Handler para atualizar perfil
  const handleSaveProfile = async () => {
    if (!studentId) return;
    setActionLoading(true);
    setFeedbackMsg(null);
    try {
      const payload: Record<string, any> = {
        action: "update_profile",
        role: editRole,
        plan: editPlan,
        status: editStatus,
        blocked_reason: editStatus === "blocked" ? blockedReason : null,
        access_expires_at: customExpiresAt ? new Date(`${customExpiresAt}T23:59:59`).toISOString() : null,
      };

      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setFeedbackMsg({ type: "success", text: "Alterações salvas com sucesso!" });
        await fetchStudentData();
        onStudentUpdated?.();
      } else {
        setFeedbackMsg({ type: "error", text: json.error || "Erro ao salvar alterações." });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err?.message || "Falha na requisição." });
    } finally {
      setActionLoading(false);
    }
  };

  // Handler para reenviar link de acesso
  const handleResendAccess = async () => {
    if (!studentId || !data) return;
    const confirm = window.confirm(`Deseja reenviar o e-mail com link de acesso para ${data.profile.email}?`);
    if (!confirm) return;

    setActionLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend_access" }),
      });

      const json = await res.json();
      if (json.success) {
        setFeedbackMsg({ type: "success", text: json.message || "Link de acesso enviado com sucesso!" });
        await fetchStudentData();
      } else {
        setFeedbackMsg({ type: "error", text: json.error || "Erro ao reenviar e-mail de acesso." });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err?.message || "Falha na requisição." });
    } finally {
      setActionLoading(false);
    }
  };

  // Handler para enviar e-mail direto ao aluno
  const handleSendDirectEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !directEmailSubject.trim() || !directEmailMessage.trim()) return;

    setSendingEmail(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_direct_email",
          subject: directEmailSubject,
          message: directEmailMessage,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setFeedbackMsg({ type: "success", text: "Mensagem enviada e arquivada com sucesso!" });
        setDirectEmailSubject("");
        setDirectEmailMessage("");
        await fetchStudentData();
      } else {
        setFeedbackMsg({ type: "error", text: json.error || "Erro ao enviar e-mail." });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err?.message || "Falha na requisição." });
    } finally {
      setSendingEmail(false);
    }
  };

  const p = data?.profile;
  const m = data?.metrics;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(5, 10, 18, 0.72)",
          backdropFilter: "blur(6px)",
          zIndex: 90,
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Drawer Slide-over */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          maxWidth: 780,
          background: "var(--card-bg, #0f172a)",
          borderLeft: "1px solid var(--card-border, #1e293b)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "slideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* CABEÇALHO DO DRAWER */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--card-border, #1e293b)",
            background: "var(--input-bg, rgba(15, 23, 42, 0.95))",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <span
                style={{
                  fontFamily: V.dm,
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: "rgba(0, 229, 153, 0.15)",
                  color: "#00e599",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Perfil 360° do Aluno
              </span>

              {p && (
                <>
                  <span
                    style={{
                      fontFamily: V.dm,
                      fontSize: 10,
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: p.status === "blocked" ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
                      color: p.status === "blocked" ? "#ef4444" : "#22c55e",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: p.status === "blocked" ? "#ef4444" : "#22c55e",
                      }}
                    />
                    {p.status === "blocked" ? "CONTA BLOQUEADA" : "ATIVO"}
                  </span>

                  <span
                    style={{
                      fontFamily: V.dm,
                      fontSize: 10,
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: "rgba(107, 92, 231, 0.2)",
                      color: "#a29bfe",
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    {p.role}
                  </span>
                </>
              )}
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                color: "var(--heading-color, #f8fafc)",
                fontFamily: V.df,
                letterSpacing: "-0.02em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {p ? p.fullName : "Carregando Aluno..."}
            </h2>

            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 4, fontSize: 12, color: V.ch, flexWrap: "wrap" }}>
              <span>{p?.email}</span>
              {p?.crm && <span>&bull; CRM: {p.crm}</span>}
              {p?.createdAt && (
                <span>
                  &bull; Cadastrado em: {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "transparent",
              border: "1px solid var(--card-border, #334155)",
              color: "var(--chumbo, #94a3b8)",
              width: 32,
              height: 32,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* FEEDBACK ALERT */}
        {feedbackMsg && (
          <div
            style={{
              padding: "10px 24px",
              background: feedbackMsg.type === "success" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
              borderBottom: `1px solid ${feedbackMsg.type === "success" ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
              color: feedbackMsg.type === "success" ? "#4ade80" : "#f87171",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>{feedbackMsg.text}</span>
            <button
              onClick={() => setFeedbackMsg(null)}
              style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 14 }}
            >
              &times;
            </button>
          </div>
        )}

        {/* NAVEGAÇÃO DE ABAS DO PERFIL */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--card-border, #1e293b)",
            background: "rgba(15, 23, 42, 0.5)",
            padding: "0 16px",
            overflowX: "auto",
          }}
        >
          {[
            { id: "visao_geral", label: "Visão Geral", icon: "👤" },
            { id: "desempenho", label: "Desempenho", icon: "📊" },
            { id: "emails", label: `E-mails (${data?.emails?.length || 0})`, icon: "✉️" },
            { id: "auditoria", label: "Auditoria", icon: "📋" },
            { id: "gestao", label: "Gestão & Ações", icon: "⚙️" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "14px 14px",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #00e599" : "2px solid transparent",
                color: activeTab === tab.id ? "#00e599" : "var(--chumbo, #94a3b8)",
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* CORPO DO DRAWER COM SCROLL */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", background: "var(--bg-main, #0b0f19)" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: V.ch }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  border: "3px solid rgba(0, 229, 153, 0.2)",
                  borderTopColor: "#00e599",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  margin: "0 auto 16px auto",
                }}
              />
              <p style={{ fontSize: 13, margin: 0 }}>Consultando base de dados do aluno...</p>
            </div>
          ) : !data ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: V.ch }}>
              Dados do aluno não encontrados.
            </div>
          ) : (
            <>
              {/* ── ABA 1: VISÃO GERAL ── */}
              {activeTab === "visao_geral" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* ALERTA DE BLOQUEIO SE HOUVER */}
                  {p?.status === "blocked" && (
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 10,
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                      }}
                    >
                      <span style={{ fontSize: 20 }}>⚠️</span>
                      <div>
                        <div style={{ fontWeight: 700, color: "#ef4444", fontSize: 13 }}>
                          CONTA BLOQUEADA PARA ACESSO
                        </div>
                        <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 2 }}>
                          Motivo: {p.blockedReason || "Acesso suspenso por decisão administrativa."}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CARDS DE STATUS RÁPIDO */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                    <div
                      style={{
                        background: "var(--card-bg, #1e293b)",
                        padding: 16,
                        borderRadius: 10,
                        border: "1px solid var(--card-border, #334155)",
                      }}
                    >
                      <div style={{ fontSize: 11, color: V.ch, textTransform: "uppercase", fontFamily: V.dm }}>
                        Plano Atual
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#38bdf8", marginTop: 4 }}>
                        {p?.plan === "pleno_anual"
                          ? "Pleno Anual"
                          : p?.plan === "pleno_mensal"
                          ? "Pleno Mensal"
                          : p?.plan === "aprovacao"
                          ? "Garantia Aprovação"
                          : p?.plan === "cortesia_vip"
                          ? "Cortesia VIP"
                          : "Diagnóstico (Free)"}
                      </div>
                    </div>

                    <div
                      style={{
                        background: "var(--card-bg, #1e293b)",
                        padding: 16,
                        borderRadius: 10,
                        border: "1px solid var(--card-border, #334155)",
                      }}
                    >
                      <div style={{ fontSize: 11, color: V.ch, textTransform: "uppercase", fontFamily: V.dm }}>
                        Validade do Acesso
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: p?.accessExpiresAt ? "#f59e0b" : "#10b981", marginTop: 4 }}>
                        {p?.accessExpiresAt
                          ? new Date(p.accessExpiresAt).toLocaleDateString("pt-BR")
                          : "Vitalício (Sem expiração)"}
                      </div>
                    </div>

                    <div
                      style={{
                        background: "var(--card-bg, #1e293b)",
                        padding: 16,
                        borderRadius: 10,
                        border: "1px solid var(--card-border, #334155)",
                      }}
                    >
                      <div style={{ fontSize: 11, color: V.ch, textTransform: "uppercase", fontFamily: V.dm }}>
                        Streak de Estudos
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: V.wn, marginTop: 4 }}>
                        🔥 {m?.studyStreak || 0} dias
                      </div>
                    </div>

                    <div
                      style={{
                        background: "var(--card-bg, #1e293b)",
                        padding: 16,
                        borderRadius: 10,
                        border: "1px solid var(--card-border, #334155)",
                      }}
                    >
                      <div style={{ fontSize: 11, color: V.ch, textTransform: "uppercase", fontFamily: V.dm }}>
                        Carga Semanal
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#a855f7", marginTop: 4 }}>
                        ⏱️ {m?.weeklyHours || 20}h / sem
                      </div>
                    </div>
                  </div>

                  {/* TABELA DE IDENTIFICAÇÃO E DADOS */}
                  <div
                    style={{
                      background: "var(--card-bg, #1e293b)",
                      borderRadius: 12,
                      border: "1px solid var(--card-border, #334155)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "14px 18px",
                        background: "rgba(255, 255, 255, 0.02)",
                        borderBottom: "1px solid var(--card-border, #334155)",
                        fontWeight: 700,
                        fontSize: 13,
                        color: "var(--heading-color, #f8fafc)",
                      }}
                    >
                      Ficha Cadastral e Parâmetros de Estudo
                    </div>
                    <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 13 }}>
                      <div>
                        <span style={{ color: V.ch, display: "block", fontSize: 11 }}>ID do Usuário (UUID)</span>
                        <code style={{ fontSize: 11, color: "#94a3b8", wordBreak: "break-all" }}>{p?.id}</code>
                      </div>
                      <div>
                        <span style={{ color: V.ch, display: "block", fontSize: 11 }}>Sub-marca / Linha</span>
                        <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{p?.subBrand || "RESID"}</span>
                      </div>
                      <div>
                        <span style={{ color: V.ch, display: "block", fontSize: 11 }}>Especialidade Alvo</span>
                        <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{p?.targetSpecialty || "Não definida"}</span>
                      </div>
                      <div>
                        <span style={{ color: V.ch, display: "block", fontSize: 11 }}>Provas Alvo Selecionadas</span>
                        <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{p?.targetExams?.join(", ") || "ENAMED"}</span>
                      </div>
                      <div>
                        <span style={{ color: V.ch, display: "block", fontSize: 11 }}>Última Atividade Registrada</span>
                        <span style={{ color: "#e2e8f0" }}>
                          {p?.lastActiveAt ? new Date(p.lastActiveAt).toLocaleString("pt-BR") : "Ainda sem registros"}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: V.ch, display: "block", fontSize: 11 }}>Data de Inscrição</span>
                        <span style={{ color: "#e2e8f0" }}>
                          {p?.createdAt ? new Date(p.createdAt).toLocaleString("pt-BR") : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AÇÕES RÁPIDAS */}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button
                      onClick={handleResendAccess}
                      disabled={actionLoading}
                      style={{
                        flex: 1,
                        minWidth: 200,
                        padding: "12px 18px",
                        borderRadius: 8,
                        background: "linear-gradient(135deg, #00e599, #00b4d8)",
                        border: "none",
                        color: "#0b0f19",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      {actionLoading ? "Enviando..." : "Reenviar Link de Acesso / Senha"}
                    </button>

                    <button
                      onClick={() => setActiveTab("gestao")}
                      style={{
                        padding: "12px 18px",
                        borderRadius: 8,
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid var(--card-border, #334155)",
                        color: "#f8fafc",
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Gerenciar Papel & Plano &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* ── ABA 2: DESEMPENHO ── */}
              {activeTab === "desempenho" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                    <div style={{ background: "var(--card-bg, #1e293b)", padding: 16, borderRadius: 10, border: "1px solid var(--card-border, #334155)" }}>
                      <div style={{ fontSize: 11, color: V.ch, textTransform: "uppercase" }}>Questões Respondidas</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#f8fafc", marginTop: 4 }}>
                        {m?.totalQuestionsAnswered || 0}
                      </div>
                      <div style={{ fontSize: 11, color: "#4ade80", marginTop: 2 }}>
                        {m?.correctAnswers || 0} acertos
                      </div>
                    </div>

                    <div style={{ background: "var(--card-bg, #1e293b)", padding: 16, borderRadius: 10, border: "1px solid var(--card-border, #334155)" }}>
                      <div style={{ fontSize: 11, color: V.ch, textTransform: "uppercase" }}>Taxa de Acerto Geral</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: (m?.accuracyPercentage || 0) >= 70 ? "#00e599" : "#f59e0b", marginTop: 4 }}>
                        {m?.accuracyPercentage || 0}%
                      </div>
                      <div style={{ fontSize: 11, color: V.ch, marginTop: 2 }}>Precisão diagnóstica</div>
                    </div>

                    <div style={{ background: "var(--card-bg, #1e293b)", padding: 16, borderRadius: 10, border: "1px solid var(--card-border, #334155)" }}>
                      <div style={{ fontSize: 11, color: V.ch, textTransform: "uppercase" }}>Simulados Concluídos</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#38bdf8", marginTop: 4 }}>
                        {m?.simulationsCompleted || 0}
                      </div>
                      <div style={{ fontSize: 11, color: V.ch, marginTop: 2 }}>Provas oficiais</div>
                    </div>

                    <div style={{ background: "var(--card-bg, #1e293b)", padding: 16, borderRadius: 10, border: "1px solid var(--card-border, #334155)" }}>
                      <div style={{ fontSize: 11, color: V.ch, textTransform: "uppercase" }}>Nota Raio-X Diagnóstico</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: m?.diagnosticScore ? "#a855f7" : V.ch, marginTop: 4 }}>
                        {m?.diagnosticScore ? `${m.diagnosticScore}%` : "Pendente"}
                      </div>
                      <div style={{ fontSize: 11, color: V.ch, marginTop: 2 }}>Última avaliação</div>
                    </div>
                  </div>

                  {/* SIMULADOS DO ALUNO */}
                  <div style={{ background: "var(--card-bg, #1e293b)", borderRadius: 12, border: "1px solid var(--card-border, #334155)", overflow: "hidden" }}>
                    <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--card-border, #334155)", fontWeight: 700, fontSize: 13, color: "var(--heading-color, #f8fafc)" }}>
                      Histórico de Simulados Realizados
                    </div>

                    {data?.simulations?.length === 0 ? (
                      <div style={{ padding: 24, textAlign: "center", color: V.ch, fontSize: 13 }}>
                        Nenhum simulado iniciado por este aluno até o momento.
                      </div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid var(--card-border, #334155)" }}>
                            {["Simulado / Instituição", "Status", "Aproveitamento", "Início"].map((h) => (
                              <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, textTransform: "uppercase", color: V.ch, fontFamily: V.dm }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data?.simulations?.map((sim) => (
                            <tr key={sim.id} style={{ borderBottom: "1px solid var(--card-border, #334155)" }}>
                              <td style={{ padding: "12px 16px" }}>
                                <div style={{ fontWeight: 600, color: "#f8fafc" }}>
                                  {sim.simulations?.title || "Simulado MedPleni"}
                                </div>
                                <div style={{ fontSize: 11, color: V.ch }}>
                                  {sim.simulations?.institution || "Instituição"} &bull; {sim.simulations?.total_questions || 100} questões
                                </div>
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <span style={{
                                  fontSize: 10, padding: "2px 6px", borderRadius: 4,
                                  background: sim.status === "concluido" ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
                                  color: sim.status === "concluido" ? "#4ade80" : "#fbbf24",
                                  textTransform: "uppercase", fontWeight: 700,
                                }}>
                                  {sim.status}
                                </span>
                              </td>
                              <td style={{ padding: "12px 16px", fontWeight: 700, color: "#38bdf8" }}>
                                {sim.score_percent !== null ? `${sim.score_percent}%` : "—"}
                              </td>
                              <td style={{ padding: "12px 16px", fontSize: 11, color: V.ch }}>
                                {new Date(sim.started_at).toLocaleDateString("pt-BR")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* ── ABA 3: E-MAILS ENVIADOS (CÓPIA E PREVIEW) ── */}
              {activeTab === "emails" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 10,
                      background: "rgba(0, 180, 216, 0.08)",
                      border: "1px solid rgba(0, 180, 216, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: "#38bdf8", fontSize: 13 }}>
                        Registro Central de Comunicação por E-mail
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                        Toda comunicação enviada automaticamente pela plataforma ou suporte fica espelhada aqui para auditoria.
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab("gestao")}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 6,
                        background: "rgba(56, 189, 248, 0.2)",
                        border: "1px solid rgba(56, 189, 248, 0.4)",
                        color: "#38bdf8",
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      + Novo E-mail
                    </button>
                  </div>

                  <div style={{ background: "var(--card-bg, #1e293b)", borderRadius: 12, border: "1px solid var(--card-border, #334155)", overflow: "hidden" }}>
                    {data?.emails?.length === 0 ? (
                      <div style={{ padding: 40, textAlign: "center", color: V.ch, fontSize: 13 }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                        Nenhum e-mail registrado para este destinatário ainda.
                      </div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid var(--card-border, #334155)" }}>
                            {["Assunto / Tipo", "Destinatário", "Data & Hora", "Status", "Ação"].map((h) => (
                              <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10, textTransform: "uppercase", color: V.ch, fontFamily: V.dm }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data?.emails?.map((em) => (
                            <tr key={em.id} style={{ borderBottom: "1px solid var(--card-border, #334155)" }}>
                              <td style={{ padding: "14px 16px" }}>
                                <div style={{ fontWeight: 600, color: "#f8fafc" }}>{em.subject}</div>
                                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                                  <span style={{
                                    fontFamily: V.dm, fontSize: 9, padding: "2px 6px", borderRadius: 4,
                                    background: "rgba(107, 92, 231, 0.2)", color: "#a29bfe", textTransform: "uppercase",
                                  }}>
                                    {em.email_type}
                                  </span>
                                  {em.resend_id && (
                                    <span style={{ fontSize: 10, color: V.ch, fontFamily: V.dm }}>
                                      ID: {em.resend_id.substring(0, 10)}...
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: "14px 16px", color: "#cbd5e1", fontSize: 12 }}>
                                {em.recipient_email}
                              </td>
                              <td style={{ padding: "14px 16px", color: V.ch, fontSize: 11, fontFamily: V.dm }}>
                                {new Date(em.created_at).toLocaleString("pt-BR")}
                              </td>
                              <td style={{ padding: "14px 16px" }}>
                                <span style={{
                                  fontSize: 10, padding: "3px 8px", borderRadius: 4,
                                  background: em.status === "failed" ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)",
                                  color: em.status === "failed" ? "#ef4444" : "#22c55e",
                                  fontWeight: 700, textTransform: "uppercase",
                                }}>
                                  {em.status === "sent" ? "Disparado" : em.status}
                                </span>
                              </td>
                              <td style={{ padding: "14px 16px" }}>
                                <button
                                  onClick={() => setPreviewEmail({
                                    subject: em.subject,
                                    recipient: em.recipient_email,
                                    date: new Date(em.created_at).toLocaleString("pt-BR"),
                                    html: em.body_html,
                                    resendId: em.resend_id,
                                  })}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: 6,
                                    background: "rgba(0, 229, 153, 0.15)",
                                    border: "1px solid rgba(0, 229, 153, 0.3)",
                                    color: "#00e599",
                                    fontWeight: 600,
                                    fontSize: 11,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                  Visualizar E-mail
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* ── ABA 4: AUDITORIA & LOGS ── */}
              {activeTab === "auditoria" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ fontSize: 12, color: V.ch }}>
                    Eventos administrativos e modificações de perfil auditadas para fins de conformidade.
                  </div>

                  <div style={{ background: "var(--card-bg, #1e293b)", borderRadius: 12, border: "1px solid var(--card-border, #334155)", overflow: "hidden" }}>
                    {data?.auditLogs?.length === 0 ? (
                      <div style={{ padding: 30, textAlign: "center", color: V.ch, fontSize: 13 }}>
                        Nenhuma ação administrativa registrada para este aluno.
                      </div>
                    ) : (
                      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                        {data?.auditLogs?.map((log) => (
                          <div
                            key={log.id}
                            style={{
                              padding: "12px 16px",
                              borderRadius: 8,
                              background: "rgba(255, 255, 255, 0.02)",
                              border: "1px solid var(--card-border, #334155)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: 16,
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, color: "#f8fafc", fontSize: 13, textTransform: "capitalize" }}>
                                {log.action.replace(/_/g, " ")}
                              </div>
                              {log.details && (
                                <pre
                                  style={{
                                    fontSize: 11,
                                    color: "#94a3b8",
                                    margin: "4px 0 0 0",
                                    fontFamily: V.dm,
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-all",
                                  }}
                                >
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              )}
                            </div>
                            <span style={{ fontSize: 11, color: V.ch, fontFamily: V.dm, whiteSpace: "nowrap" }}>
                              {new Date(log.created_at).toLocaleString("pt-BR")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── ABA 5: GESTÃO & AÇÕES ── */}
              {activeTab === "gestao" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {/* SEÇÃO 1: ALTERAÇÃO DE PAPEL E PLANO */}
                  <div style={{ background: "var(--card-bg, #1e293b)", padding: 20, borderRadius: 12, border: "1px solid var(--card-border, #334155)" }}>
                    <h3 style={{ margin: "0 0 16px 0", fontSize: 15, fontWeight: 700, color: "#f8fafc" }}>
                      Modificar Nível de Acesso & Plano
                    </h3>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 12, color: V.ch, marginBottom: 6 }}>
                          Papel no Sistema (Role)
                        </label>
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: 8,
                            background: "var(--input-bg, #0b0f19)",
                            border: "1px solid var(--card-border, #334155)",
                            color: "#f8fafc",
                            fontSize: 13,
                          }}
                        >
                          <option value="student">Aluno / Médico Residente</option>
                          <option value="docente">Docente / Especialista</option>
                          <option value="financeiro">Financeiro / Faturamento</option>
                          <option value="suporte">Suporte / CS</option>
                          <option value="desenvolvedor">Desenvolvedor & Engenharia</option>
                          <option value="superadmin">Superadmin Geral</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 12, color: V.ch, marginBottom: 6 }}>
                          Plano de Assinatura
                        </label>
                        <select
                          value={editPlan}
                          onChange={(e) => setEditPlan(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: 8,
                            background: "var(--input-bg, #0b0f19)",
                            border: "1px solid var(--card-border, #334155)",
                            color: "#f8fafc",
                            fontSize: 13,
                          }}
                        >
                          <option value="diagnostico">MedPleni Diagnóstico (Gratuito)</option>
                          <option value="pleno_mensal">MedPleni Pleno (Mensal)</option>
                          <option value="pleno_anual">MedPleni Pleno (Anual)</option>
                          <option value="aprovacao">Garantia Aprovação</option>
                          <option value="cortesia_vip">Cortesia VIP / Bolsista</option>
                        </select>
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={{ display: "block", fontSize: 12, color: V.ch, marginBottom: 6 }}>
                          Data de Expiração do Acesso (Deixe em branco para vitalício/sem limite)
                        </label>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            type="date"
                            value={customExpiresAt}
                            onChange={(e) => setCustomExpiresAt(e.target.value)}
                            style={{
                              flex: 1,
                              padding: "10px 12px",
                              borderRadius: 8,
                              background: "var(--input-bg, #0b0f19)",
                              border: "1px solid var(--card-border, #334155)",
                              color: "#f8fafc",
                              fontSize: 13,
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setFullYear(d.getFullYear() + 1);
                              setCustomExpiresAt(d.toISOString().split("T")[0]);
                            }}
                            style={{
                              padding: "10px 14px",
                              borderRadius: 8,
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid var(--card-border, #334155)",
                              color: "#cbd5e1",
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            +1 Ano
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomExpiresAt("")}
                            style={{
                              padding: "10px 14px",
                              borderRadius: 8,
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid var(--card-border, #334155)",
                              color: "#cbd5e1",
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            Limpar (Vitalício)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO 2: BLOQUEIO / DESBLOQUEIO DE CONTA */}
                  <div
                    style={{
                      background: editStatus === "blocked" ? "rgba(239, 68, 68, 0.05)" : "var(--card-bg, #1e293b)",
                      padding: 20,
                      borderRadius: 12,
                      border: editStatus === "blocked" ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid var(--card-border, #334155)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: editStatus === "blocked" ? "#ef4444" : "#f8fafc" }}>
                          Bloqueio de Acesso do Aluno
                        </h3>
                        <p style={{ margin: "4px 0 0 0", fontSize: 12, color: V.ch }}>
                          Quando bloqueado, o aluno não conseguirá fazer login ou responder simulados.
                        </p>
                      </div>

                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setEditStatus("active")}
                          style={{
                            padding: "8px 14px",
                            borderRadius: 6,
                            background: editStatus === "active" ? "#22c55e" : "rgba(255, 255, 255, 0.05)",
                            color: editStatus === "active" ? "#0b0f19" : "#94a3b8",
                            fontWeight: 700,
                            fontSize: 12,
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Ativo
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditStatus("blocked")}
                          style={{
                            padding: "8px 14px",
                            borderRadius: 6,
                            background: editStatus === "blocked" ? "#ef4444" : "rgba(255, 255, 255, 0.05)",
                            color: editStatus === "blocked" ? "#ffffff" : "#94a3b8",
                            fontWeight: 700,
                            fontSize: 12,
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Bloqueado
                        </button>
                      </div>
                    </div>

                    {editStatus === "blocked" && (
                      <div style={{ marginTop: 14 }}>
                        <label style={{ display: "block", fontSize: 12, color: "#f87171", marginBottom: 6, fontWeight: 600 }}>
                          Motivo do Bloqueio (visível internamente e na notificação do aluno)
                        </label>
                        <input
                          type="text"
                          value={blockedReason}
                          onChange={(e) => setBlockedReason(e.target.value)}
                          placeholder="Ex: Inadimplência da mensalidade, compartilhamento de senha..."
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: 8,
                            background: "var(--input-bg, #0b0f19)",
                            border: "1px solid rgba(239, 68, 68, 0.4)",
                            color: "#f8fafc",
                            fontSize: 13,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* BOTÃO PARA SALVAR ALTERAÇÕES GERAIS */}
                  <button
                    onClick={handleSaveProfile}
                    disabled={actionLoading}
                    style={{
                      padding: "14px 24px",
                      borderRadius: 10,
                      background: "linear-gradient(135deg, #00e599, #00b4d8)",
                      border: "none",
                      color: "#0b0f19",
                      fontWeight: 800,
                      fontSize: 14,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    {actionLoading ? "Salvando Alterações..." : "Confirmar e Salvar Alterações de Perfil"}
                  </button>

                  <hr style={{ border: "none", borderTop: "1px solid var(--card-border, #334155)", margin: "8px 0" }} />

                  {/* SEÇÃO 3: ENVIAR E-MAIL DIRETO / SUPORTE PERSONALIZADO */}
                  <form onSubmit={handleSendDirectEmail} style={{ background: "var(--card-bg, #1e293b)", padding: 20, borderRadius: 12, border: "1px solid var(--card-border, #334155)" }}>
                    <h3 style={{ margin: "0 0 6px 0", fontSize: 15, fontWeight: 700, color: "#f8fafc" }}>
                      Enviar E-mail Direto ao Aluno
                    </h3>
                    <p style={{ margin: "0 0 16px 0", fontSize: 12, color: V.ch }}>
                      A mensagem será disparada pelo Resend e uma cópia fiel ficará armazenada na aba &ldquo;E-mails Enviados&rdquo;.
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 12, color: V.ch, marginBottom: 6 }}>
                          Assunto da Mensagem
                        </label>
                        <input
                          type="text"
                          required
                          value={directEmailSubject}
                          onChange={(e) => setDirectEmailSubject(e.target.value)}
                          placeholder="Ex: Atualização sobre seu plano de mentoria MedPleni"
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: 8,
                            background: "var(--input-bg, #0b0f19)",
                            border: "1px solid var(--card-border, #334155)",
                            color: "#f8fafc",
                            fontSize: 13,
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 12, color: V.ch, marginBottom: 6 }}>
                          Conteúdo da Mensagem
                        </label>
                        <textarea
                          required
                          rows={4}
                          value={directEmailMessage}
                          onChange={(e) => setDirectEmailMessage(e.target.value)}
                          placeholder="Escreva as orientações, feedbacks pedagógicos ou avisos importantes para o médico aluno..."
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: 8,
                            background: "var(--input-bg, #0b0f19)",
                            border: "1px solid var(--card-border, #334155)",
                            color: "#f8fafc",
                            fontSize: 13,
                            resize: "vertical",
                          }}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={sendingEmail}
                        style={{
                          alignSelf: "flex-start",
                          padding: "10px 20px",
                          borderRadius: 8,
                          background: "rgba(56, 189, 248, 0.2)",
                          border: "1px solid rgba(56, 189, 248, 0.4)",
                          color: "#38bdf8",
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        {sendingEmail ? "Enviando..." : "Disparar Mensagem de Suporte"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL DE PREVIEW DO E-MAIL (ESPELHO FIEL) */}
      {previewEmail && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(8px)",
            zIndex: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            animation: "fadeIn 0.2s ease",
          }}
          onClick={() => setPreviewEmail(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 720,
              maxHeight: "90vh",
              background: "#161b22",
              borderRadius: 14,
              border: "1px solid #30363d",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 20px 48px rgba(0,0,0,0.8)",
            }}
          >
            {/* Header do Preview */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #30363d",
                background: "#0d1117",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "#8b949e", textTransform: "uppercase", fontFamily: V.dm }}>
                  Espelho do E-mail Enviado
                </div>
                <div style={{ fontWeight: 700, color: "#f0f6fc", fontSize: 16, marginTop: 2 }}>
                  {previewEmail.subject}
                </div>
                <div style={{ fontSize: 12, color: "#8b949e", marginTop: 2 }}>
                  Para: <strong style={{ color: "#c9d1d9" }}>{previewEmail.recipient}</strong> &bull; {previewEmail.date}
                  {previewEmail.resendId && ` &bull; Resend ID: ${previewEmail.resendId}`}
                </div>
              </div>

              <button
                onClick={() => setPreviewEmail(null)}
                style={{
                  background: "transparent",
                  border: "1px solid #30363d",
                  color: "#c9d1d9",
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                &times;
              </button>
            </div>

            {/* Iframe com sandbox com o HTML renderizado fielmente */}
            <div style={{ flex: 1, minHeight: 480, background: "#0d1117" }}>
              <iframe
                title="Preview do E-mail"
                srcDoc={previewEmail.html}
                sandbox="allow-same-origin"
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: 480,
                  border: "none",
                  display: "block",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
