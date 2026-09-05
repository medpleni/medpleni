"use client";

import React, { useState, useEffect, useCallback } from "react";

interface StudentProfile360ViewProps {
  studentId: string;
  onBack: () => void;
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
  pu: "var(--pulso, #00C2A8)",
  re: "var(--resgate, #0077B6)",
  ch: "var(--chumbo, #64748B)",
  nb: "var(--neblina, #94A3B8)",
  cardBg: "var(--card-bg, #0f172a)",
  cardBorder: "var(--card-border, #1e293b)",
  heading: "var(--heading-color, #f8fafc)",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
};

export default function StudentProfile360View({
  studentId,
  onBack,
  onStudentUpdated,
}: StudentProfile360ViewProps) {
  const [activeTab, setActiveTab] = useState<"visao_geral" | "desempenho" | "emails" | "auditoria" | "gestao">("visao_geral");
  const [data, setData] = useState<Student360Data | null>(null);
  const [loading, setLoading] = useState(true);
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
    fetchStudentData();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [fetchStudentData]);

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

  const handleResendAccess = async () => {
    if (!studentId || !data) return;
    const confirm = window.confirm(`Deseja reenviar o e-mail de acesso oficial para ${data.profile.email}?`);
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
        setFeedbackMsg({ type: "success", text: "Mensagem oficial enviada e arquivada no perfil com sucesso!" });
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

  const initials = p?.fullName
    ? p.fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join("")
    : "AL";

  return (
    <div style={{ paddingBottom: 60, animation: "fadeIn 0.2s ease" }}>
      {/* BARRA SUPERIOR DE NAVEGAÇÃO / BREADCRUMB */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <button
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 8,
            background: "var(--input-bg, #1a2234)",
            border: "1px solid var(--card-border, #2d3b55)",
            color: "var(--heading-color, #f8fafc)",
            fontFamily: V.dm,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--pulso, #00C2A8)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--card-border, #2d3b55)")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Voltar para Alunos & Convites
        </button>

        <div style={{ fontFamily: V.dm, fontSize: 11, color: V.ch, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Backoffice &gt; Alunos & CS &gt; <span style={{ color: "var(--pulso, #00C2A8)" }}>Perfil 360°</span>
        </div>
      </div>

      {/* CARD PRINCIPAL DO ALUNO (HERO VIEW) */}
      <div
        style={{
          background: "var(--card-bg, #1a2234)",
          border: "1px solid var(--card-border, #2d3b55)",
          borderRadius: 14,
          padding: "24px 28px",
          boxShadow: "var(--card-shadow, 0 8px 24px rgba(0,0,0,0.3))",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, minWidth: 260 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(0, 194, 168, 0.2), rgba(0, 119, 182, 0.3))",
                border: "2px solid var(--pulso, #00C2A8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: V.df,
                fontSize: 22,
                fontWeight: 700,
                color: "var(--pulso, #00C2A8)",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <span
                  style={{
                    fontFamily: V.dm,
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: p?.status === "blocked" ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)",
                    border: `1px solid ${p?.status === "blocked" ? "rgba(239, 68, 68, 0.3)" : "rgba(34, 197, 94, 0.3)"}`,
                    color: p?.status === "blocked" ? "#ef4444" : "#22c55e",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  ● {p?.status === "blocked" ? "CONTA BLOQUEADA" : "ATIVO"}
                </span>

                <span
                  style={{
                    fontFamily: V.dm,
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: "rgba(107, 92, 231, 0.2)",
                    color: "#A29BFE",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {p?.role || "STUDENT"}
                </span>

                <span
                  style={{
                    fontFamily: V.dm,
                    fontSize: 10,
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: "rgba(0, 194, 168, 0.15)",
                    color: "var(--pulso, #00C2A8)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {p?.plan === "pleno_anual"
                    ? "Pleno Anual"
                    : p?.plan === "pleno_mensal"
                    ? "Pleno Mensal"
                    : p?.plan === "cortesia_vip"
                    ? "Cortesia VIP"
                    : p?.plan === "aprovacao"
                    ? "Garantia Aprovação"
                    : "Diagnóstico"}
                </span>
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(20px, 3vw, 26px)",
                  fontWeight: 700,
                  color: "var(--heading-color, #f8fafc)",
                  fontFamily: V.df,
                  letterSpacing: "-0.02em",
                }}
              >
                {p ? p.fullName : "Carregando Aluno..."}
              </h1>

              <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 6, fontSize: 13, color: V.ch, flexWrap: "wrap" }}>
                <span>{p?.email}</span>
                {p?.crm && <span>&bull; CRM: {p.crm}</span>}
                <span>&bull; Linha: {p?.subBrand || "RESID"}</span>
                {p?.createdAt && <span>&bull; Cadastro: {new Date(p.createdAt).toLocaleDateString("pt-BR")}</span>}
              </div>
            </div>
          </div>

          {/* Ações Rápidas do Cabeçalho */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={handleResendAccess}
              disabled={actionLoading}
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                background: "linear-gradient(135deg, var(--pulso, #00C2A8), #009688)",
                border: "none",
                color: "#FFFFFF",
                fontFamily: V.db,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 4px 12px rgba(0, 194, 168, 0.25)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              {actionLoading ? "Enviando..." : "Reenviar Acesso"}
            </button>

            <button
              onClick={() => setActiveTab("gestao")}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                background: "var(--input-bg, #1a2234)",
                border: "1px solid var(--card-border, #2d3b55)",
                color: "var(--heading-color, #f8fafc)",
                fontFamily: V.db,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Gerenciar Acesso & Papel
            </button>
          </div>
        </div>
      </div>

      {/* FEEDBACK ALERT */}
      {feedbackMsg && (
        <div
          style={{
            padding: "12px 20px",
            borderRadius: 8,
            marginBottom: 20,
            background: feedbackMsg.type === "success" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${feedbackMsg.type === "success" ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            color: feedbackMsg.type === "success" ? "#4ade80" : "#f87171",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{feedbackMsg.text}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16 }}
          >
            &times;
          </button>
        </div>
      )}

      {/* NAVEGAÇÃO POR ABAS (SEM EMOJIS, DESIGN MINIMALISTA MEDPLENI) */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--card-border, #2d3b55)",
          marginBottom: 24,
          overflowX: "auto",
        }}
      >
        {[
          {
            id: "visao_geral",
            label: "Visão Geral",
            icon: (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            ),
          },
          {
            id: "desempenho",
            label: "Desempenho & Simulados",
            icon: (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            ),
          },
          {
            id: "emails",
            label: `E-mails Enviados (${data?.emails?.length || 0})`,
            icon: (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            ),
          },
          {
            id: "auditoria",
            label: "Auditoria & Logs",
            icon: (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            ),
          },
          {
            id: "gestao",
            label: "Gestão & Ações",
            icon: (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            ),
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 18px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid var(--pulso, #00C2A8)" : "2px solid transparent",
              color: activeTab === tab.id ? "var(--pulso, #00C2A8)" : "var(--chumbo, #64748B)",
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontFamily: V.db,
              fontSize: 13,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTEÚDO PRINCIPAL DAS ABAS */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: V.ch }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: "3px solid rgba(0, 194, 168, 0.2)",
              borderTopColor: "var(--pulso, #00C2A8)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px auto",
            }}
          />
          <p style={{ fontFamily: V.dm, fontSize: 13, margin: 0 }}>Carregando dados consolidados do perfil 360°...</p>
        </div>
      ) : !data ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: V.ch }}>
          Registro não encontrado na base.
        </div>
      ) : (
        <>
          {/* ── ABA 1: VISÃO GERAL ── */}
          {activeTab === "visao_geral" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* CARDS DE MÉTRICAS RÁPIDAS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                <div style={{ background: "var(--card-bg)", padding: "20px 24px", borderRadius: 12, border: "1px solid var(--card-border)" }}>
                  <div style={{ fontFamily: V.dm, fontSize: 11, color: V.ch, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Validade do Acesso
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: p?.accessExpiresAt ? "#f59e0b" : "#10b981", marginTop: 6 }}>
                    {p?.accessExpiresAt ? `Até ${new Date(p.accessExpiresAt).toLocaleDateString("pt-BR")}` : "Vitalício (Sem expiração)"}
                  </div>
                  <div style={{ fontSize: 11, color: V.ch, marginTop: 4 }}>
                    {p?.accessExpiresAt ? "Acesso programado" : "Acesso permanente concedido"}
                  </div>
                </div>

                <div style={{ background: "var(--card-bg)", padding: "20px 24px", borderRadius: 12, border: "1px solid var(--card-border)" }}>
                  <div style={{ fontFamily: V.dm, fontSize: 11, color: V.ch, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Streak de Estudos
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b", fontFamily: V.dm, marginTop: 6 }}>
                    {m?.studyStreak || 0} dias
                  </div>
                  <div style={{ fontSize: 11, color: V.ch, marginTop: 4 }}>Dias seguidos de atividade</div>
                </div>

                <div style={{ background: "var(--card-bg)", padding: "20px 24px", borderRadius: 12, border: "1px solid var(--card-border)" }}>
                  <div style={{ fontFamily: V.dm, fontSize: 11, color: V.ch, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Planejamento Semanal
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--pulso, #00C2A8)", fontFamily: V.dm, marginTop: 6 }}>
                    {m?.weeklyHours || 20}h / semana
                  </div>
                  <div style={{ fontSize: 11, color: V.ch, marginTop: 4 }}>Meta de estudo cadastrada</div>
                </div>

                <div style={{ background: "var(--card-bg)", padding: "20px 24px", borderRadius: 12, border: "1px solid var(--card-border)" }}>
                  <div style={{ fontFamily: V.dm, fontSize: 11, color: V.ch, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Último Acesso
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--heading-color)", marginTop: 8 }}>
                    {p?.lastActiveAt ? new Date(p.lastActiveAt).toLocaleString("pt-BR") : "Nenhum login registrado"}
                  </div>
                  <div style={{ fontSize: 11, color: V.ch, marginTop: 4 }}>Rastreamento de sessão</div>
                </div>
              </div>

              {/* TABELA DE PARÂMETROS CADASTRAIS */}
              <div style={{ background: "var(--card-bg)", borderRadius: 12, border: "1px solid var(--card-border)", overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--card-border)", fontWeight: 700, fontSize: 14, color: "var(--heading-color)" }}>
                  Ficha Cadastral e Metas de Prova
                </div>
                <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, fontSize: 13 }}>
                  <div>
                    <span style={{ color: V.ch, display: "block", fontSize: 11, textTransform: "uppercase", fontFamily: V.dm }}>ID Único do Usuário</span>
                    <code style={{ fontSize: 12, color: "var(--heading-color)", wordBreak: "break-all" }}>{p?.id}</code>
                  </div>
                  <div>
                    <span style={{ color: V.ch, display: "block", fontSize: 11, textTransform: "uppercase", fontFamily: V.dm }}>Sub-marca / Foco</span>
                    <span style={{ color: "var(--heading-color)", fontWeight: 600 }}>{p?.subBrand || "RESID"}</span>
                  </div>
                  <div>
                    <span style={{ color: V.ch, display: "block", fontSize: 11, textTransform: "uppercase", fontFamily: V.dm }}>Especialidade Médica Alvo</span>
                    <span style={{ color: "var(--heading-color)", fontWeight: 600 }}>{p?.targetSpecialty || "Não informada"}</span>
                  </div>
                  <div>
                    <span style={{ color: V.ch, display: "block", fontSize: 11, textTransform: "uppercase", fontFamily: V.dm }}>Provas e Bancas Selecionadas</span>
                    <span style={{ color: "var(--heading-color)", fontWeight: 600 }}>{p?.targetExams?.join(", ") || "ENAMED"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ABA 2: DESEMPENHO ── */}
          {activeTab === "desempenho" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                <div style={{ background: "var(--card-bg)", padding: "20px 24px", borderRadius: 12, border: "1px solid var(--card-border)" }}>
                  <div style={{ fontFamily: V.dm, fontSize: 11, color: V.ch, textTransform: "uppercase" }}>Questões Respondidas</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "var(--heading-color)", fontFamily: V.dm, marginTop: 4 }}>
                    {m?.totalQuestionsAnswered || 0}
                  </div>
                  <div style={{ fontSize: 12, color: "#22c55e", marginTop: 4 }}>{m?.correctAnswers || 0} corretas</div>
                </div>

                <div style={{ background: "var(--card-bg)", padding: "20px 24px", borderRadius: 12, border: "1px solid var(--card-border)" }}>
                  <div style={{ fontFamily: V.dm, fontSize: 11, color: V.ch, textTransform: "uppercase" }}>Taxa de Acerto</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: (m?.accuracyPercentage || 0) >= 70 ? "var(--pulso)" : "#f59e0b", fontFamily: V.dm, marginTop: 4 }}>
                    {m?.accuracyPercentage || 0}%
                  </div>
                  <div style={{ fontSize: 12, color: V.ch, marginTop: 4 }}>Aproveitamento geral</div>
                </div>

                <div style={{ background: "var(--card-bg)", padding: "20px 24px", borderRadius: 12, border: "1px solid var(--card-border)" }}>
                  <div style={{ fontFamily: V.dm, fontSize: 11, color: V.ch, textTransform: "uppercase" }}>Simulados Concluídos</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#38bdf8", fontFamily: V.dm, marginTop: 4 }}>
                    {m?.simulationsCompleted || 0}
                  </div>
                  <div style={{ fontSize: 12, color: V.ch, marginTop: 4 }}>Provas completas</div>
                </div>

                <div style={{ background: "var(--card-bg)", padding: "20px 24px", borderRadius: 12, border: "1px solid var(--card-border)" }}>
                  <div style={{ fontFamily: V.dm, fontSize: 11, color: V.ch, textTransform: "uppercase" }}>Nota Raio-X Diagnóstico</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: m?.diagnosticScore ? "#a855f7" : V.ch, fontFamily: V.dm, marginTop: 4 }}>
                    {m?.diagnosticScore ? `${m.diagnosticScore}%` : "Pendente"}
                  </div>
                  <div style={{ fontSize: 12, color: V.ch, marginTop: 4 }}>Avaliação inicial</div>
                </div>
              </div>

              {/* LISTA DE SIMULADOS */}
              <div style={{ background: "var(--card-bg)", borderRadius: 12, border: "1px solid var(--card-border)", overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--card-border)", fontWeight: 700, fontSize: 14, color: "var(--heading-color)" }}>
                  Simulados Realizados pelo Médico
                </div>
                {data?.simulations?.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: V.ch, fontSize: 13 }}>
                    Nenhum simulado iniciado até o momento.
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "var(--input-bg)", borderBottom: "1px solid var(--card-border)" }}>
                        {["Simulado / Instituição", "Status", "Aproveitamento", "Data"].map((h) => (
                          <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 10, textTransform: "uppercase", color: V.ch, fontFamily: V.dm }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data?.simulations?.map((sim) => (
                        <tr key={sim.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                          <td style={{ padding: "14px 20px" }}>
                            <div style={{ fontWeight: 600, color: "var(--heading-color)" }}>
                              {sim.simulations?.title || "Simulado Oficial"}
                            </div>
                            <div style={{ fontSize: 11, color: V.ch }}>
                              {sim.simulations?.institution} &bull; {sim.simulations?.total_questions || 100} questões
                            </div>
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <span style={{
                              fontFamily: V.dm, fontSize: 10, padding: "2px 8px", borderRadius: 4,
                              background: sim.status === "concluido" ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
                              color: sim.status === "concluido" ? "#22c55e" : "#fbbf24",
                              textTransform: "uppercase", fontWeight: 700,
                            }}>
                              {sim.status}
                            </span>
                          </td>
                          <td style={{ padding: "14px 20px", fontWeight: 700, color: "#38bdf8", fontFamily: V.dm }}>
                            {sim.score_percent !== null ? `${sim.score_percent}%` : "—"}
                          </td>
                          <td style={{ padding: "14px 20px", fontSize: 12, color: V.ch, fontFamily: V.dm }}>
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

          {/* ── ABA 3: E-MAILS ENVIADOS COM PREVIEW ELEGANTE ── */}
          {activeTab === "emails" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div
                style={{
                  background: "var(--card-bg)",
                  borderRadius: 12,
                  border: "1px solid var(--card-border)",
                  padding: "18px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "var(--heading-color)", fontSize: 14 }}>
                    Histórico Completo de E-mails Disparados
                  </div>
                  <div style={{ fontSize: 12, color: V.ch, marginTop: 2 }}>
                    Todas as comunicações enviadas pela plataforma são registradas com a cópia exata para conferência.
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab("gestao")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 6,
                    background: "rgba(0, 194, 168, 0.15)",
                    border: "1px solid rgba(0, 194, 168, 0.3)",
                    color: "var(--pulso, #00C2A8)",
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  + Enviar E-mail Direto
                </button>
              </div>

              <div style={{ background: "var(--card-bg)", borderRadius: 12, border: "1px solid var(--card-border)", overflow: "hidden" }}>
                {data?.emails?.length === 0 ? (
                  <div style={{ padding: 48, textAlign: "center", color: V.ch, fontSize: 13 }}>
                    Nenhum e-mail registrado para este destinatário até o momento.
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "var(--input-bg)", borderBottom: "1px solid var(--card-border)" }}>
                        {["Assunto / Tipo", "Destinatário", "Data de Envio", "Status", "Ação"].map((h) => (
                          <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 10, textTransform: "uppercase", color: V.ch, fontFamily: V.dm }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data?.emails?.map((em) => (
                        <tr key={em.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                          <td style={{ padding: "14px 20px" }}>
                            <div style={{ fontWeight: 600, color: "var(--heading-color)" }}>{em.subject}</div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                              <span style={{
                                fontFamily: V.dm, fontSize: 9, padding: "2px 6px", borderRadius: 4,
                                background: "rgba(107, 92, 231, 0.2)", color: "#A29BFE", textTransform: "uppercase", fontWeight: 700,
                              }}>
                                {em.email_type}
                              </span>
                              {em.resend_id && (
                                <span style={{ fontSize: 10, color: V.ch, fontFamily: V.dm }}>
                                  ID: {em.resend_id}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "14px 20px", color: "var(--heading-color)", fontSize: 12 }}>
                            {em.recipient_email}
                          </td>
                          <td style={{ padding: "14px 20px", color: V.ch, fontSize: 11, fontFamily: V.dm }}>
                            {new Date(em.created_at).toLocaleString("pt-BR")}
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <span style={{
                              fontFamily: V.dm, fontSize: 10, padding: "3px 8px", borderRadius: 4,
                              background: em.status === "failed" ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)",
                              color: em.status === "failed" ? "#ef4444" : "#22c55e",
                              fontWeight: 700, textTransform: "uppercase",
                            }}>
                              {em.status === "sent" ? "Disparado" : em.status}
                            </span>
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <button
                              onClick={() => setPreviewEmail({
                                subject: em.subject,
                                recipient: em.recipient_email,
                                date: new Date(em.created_at).toLocaleString("pt-BR"),
                                html: em.body_html,
                                resendId: em.resend_id,
                              })}
                              style={{
                                padding: "6px 14px",
                                borderRadius: 6,
                                background: "rgba(0, 194, 168, 0.15)",
                                border: "1px solid rgba(0, 194, 168, 0.3)",
                                color: "var(--pulso, #00C2A8)",
                                fontWeight: 700,
                                fontSize: 11,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
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

          {/* ── ABA 4: AUDITORIA ── */}
          {activeTab === "auditoria" && (
            <div style={{ background: "var(--card-bg)", borderRadius: 12, border: "1px solid var(--card-border)", padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--heading-color)", marginBottom: 16 }}>
                Registro de Modificações Administrativas
              </div>
              {data?.auditLogs?.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: V.ch, fontSize: 13 }}>
                  Nenhum evento registrado para este usuário.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {data?.auditLogs?.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        padding: "12px 16px",
                        borderRadius: 8,
                        background: "var(--input-bg)",
                        border: "1px solid var(--card-border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--heading-color)", fontSize: 13 }}>
                          {log.action.replace(/_/g, " ").toUpperCase()}
                        </div>
                        {log.details && (
                          <pre style={{ fontSize: 11, color: V.nb, margin: "4px 0 0 0", fontFamily: V.dm, whiteSpace: "pre-wrap" }}>
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: V.ch, fontFamily: V.dm }}>
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ABA 5: GESTÃO & AÇÕES ── */}
          {activeTab === "gestao" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* FORMULÁRIO DE PAPEL E PLANO */}
              <div style={{ background: "var(--card-bg)", padding: 24, borderRadius: 12, border: "1px solid var(--card-border)" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700, color: "var(--heading-color)" }}>
                  Atualizar Permissões & Plano de Acesso
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: V.ch, marginBottom: 6, fontWeight: 600 }}>
                      Papel no Sistema
                    </label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 8,
                        background: "var(--input-bg)", border: "1px solid var(--card-border)",
                        color: "var(--heading-color)", fontSize: 13,
                      }}
                    >
                      <option value="student">Aluno / Médico Residente</option>
                      <option value="docente">Docente / Especialista</option>
                      <option value="financeiro">Financeiro / Faturamento</option>
                      <option value="suporte">Suporte / Customer Success</option>
                      <option value="desenvolvedor">Desenvolvedor & Engenharia</option>
                      <option value="superadmin">Superadmin Geral</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, color: V.ch, marginBottom: 6, fontWeight: 600 }}>
                      Plano de Assinatura
                    </label>
                    <select
                      value={editPlan}
                      onChange={(e) => setEditPlan(e.target.value)}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 8,
                        background: "var(--input-bg)", border: "1px solid var(--card-border)",
                        color: "var(--heading-color)", fontSize: 13,
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
                    <label style={{ display: "block", fontSize: 12, color: V.ch, marginBottom: 6, fontWeight: 600 }}>
                      Data Limite de Acesso (Vazio = Vitalício)
                    </label>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <input
                        type="date"
                        value={customExpiresAt}
                        onChange={(e) => setCustomExpiresAt(e.target.value)}
                        style={{
                          flex: 1, padding: "10px 14px", borderRadius: 8,
                          background: "var(--input-bg)", border: "1px solid var(--card-border)",
                          color: "var(--heading-color)", fontSize: 13,
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
                          padding: "10px 14px", borderRadius: 8,
                          background: "var(--input-bg)", border: "1px solid var(--card-border)",
                          color: "var(--heading-color)", fontSize: 12, cursor: "pointer",
                        }}
                      >
                        +1 Ano
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomExpiresAt("")}
                        style={{
                          padding: "10px 14px", borderRadius: 8,
                          background: "var(--input-bg)", border: "1px solid var(--card-border)",
                          color: V.ch, fontSize: 12, cursor: "pointer",
                        }}
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                </div>

                {/* BLOQUEIO DE CONTA */}
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--card-border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: editStatus === "blocked" ? "#ef4444" : "var(--heading-color)", fontSize: 14 }}>
                        Status de Acesso do Aluno
                      </div>
                      <div style={{ fontSize: 12, color: V.ch, marginTop: 2 }}>
                        {editStatus === "blocked" ? "O aluno está impedido de acessar a plataforma." : "O aluno tem acesso livre aos conteúdos permitidos pelo plano."}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setEditStatus("active")}
                        style={{
                          padding: "8px 16px", borderRadius: 6,
                          background: editStatus === "active" ? "#22c55e" : "var(--input-bg)",
                          color: editStatus === "active" ? "#0F172A" : "var(--chumbo)",
                          fontWeight: 700, fontSize: 12, border: "none", cursor: "pointer",
                        }}
                      >
                        Ativo
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditStatus("blocked")}
                        style={{
                          padding: "8px 16px", borderRadius: 6,
                          background: editStatus === "blocked" ? "#ef4444" : "var(--input-bg)",
                          color: editStatus === "blocked" ? "#FFFFFF" : "var(--chumbo)",
                          fontWeight: 700, fontSize: 12, border: "none", cursor: "pointer",
                        }}
                      >
                        Bloqueado
                      </button>
                    </div>
                  </div>

                  {editStatus === "blocked" && (
                    <div style={{ marginTop: 14 }}>
                      <label style={{ display: "block", fontSize: 12, color: "#f87171", marginBottom: 6, fontWeight: 600 }}>
                        Motivo do Bloqueio
                      </label>
                      <input
                        type="text"
                        value={blockedReason}
                        onChange={(e) => setBlockedReason(e.target.value)}
                        placeholder="Ex: Inadimplência, compartilhamento indevido de conta..."
                        style={{
                          width: "100%", padding: "10px 14px", borderRadius: 8,
                          background: "var(--input-bg)", border: "1px solid rgba(239, 68, 68, 0.4)",
                          color: "var(--heading-color)", fontSize: 13,
                        }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 24 }}>
                  <button
                    onClick={handleSaveProfile}
                    disabled={actionLoading}
                    style={{
                      padding: "12px 24px", borderRadius: 8,
                      background: "linear-gradient(135deg, var(--pulso, #00C2A8), #009688)",
                      border: "none", color: "#FFFFFF", fontWeight: 700, fontSize: 13, cursor: "pointer",
                    }}
                  >
                    {actionLoading ? "Salvando..." : "Salvar Alterações de Acesso"}
                  </button>
                </div>
              </div>

              {/* FORMULÁRIO DE E-MAIL DIRETO COM TEMPLATE OFICIAL */}
              <form onSubmit={handleSendDirectEmail} style={{ background: "var(--card-bg)", padding: 24, borderRadius: 12, border: "1px solid var(--card-border)" }}>
                <h3 style={{ margin: "0 0 6px 0", fontSize: 16, fontWeight: 700, color: "var(--heading-color)" }}>
                  Enviar E-mail Oficial de Suporte / Pedagógico
                </h3>
                <p style={{ margin: "0 0 20px 0", fontSize: 12, color: V.ch }}>
                  O e-mail é gerado com o template visual oficial da MedPleni e fica arquivado no histórico do aluno.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: V.ch, marginBottom: 6, fontWeight: 600 }}>
                      Assunto
                    </label>
                    <input
                      type="text"
                      required
                      value={directEmailSubject}
                      onChange={(e) => setDirectEmailSubject(e.target.value)}
                      placeholder="Ex: Orientação pedagógica referente ao seu plano de estudos"
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 8,
                        background: "var(--input-bg)", border: "1px solid var(--card-border)",
                        color: "var(--heading-color)", fontSize: 13,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, color: V.ch, marginBottom: 6, fontWeight: 600 }}>
                      Mensagem
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={directEmailMessage}
                      onChange={(e) => setDirectEmailMessage(e.target.value)}
                      placeholder="Escreva a mensagem oficial para o médico aluno..."
                      style={{
                        width: "100%", padding: "12px 14px", borderRadius: 8,
                        background: "var(--input-bg)", border: "1px solid var(--card-border)",
                        color: "var(--heading-color)", fontSize: 13, resize: "vertical",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sendingEmail}
                    style={{
                      alignSelf: "flex-start",
                      padding: "10px 22px", borderRadius: 8,
                      background: "rgba(0, 194, 168, 0.15)",
                      border: "1px solid rgba(0, 194, 168, 0.3)",
                      color: "var(--pulso, #00C2A8)",
                      fontWeight: 700, fontSize: 13, cursor: "pointer",
                    }}
                  >
                    {sendingEmail ? "Disparando Mensagem..." : "Disparar E-mail Oficial"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {/* MODAL DE PREVIEW DO E-MAIL (ESPELHO FIEL EM ALTA RESOLUÇÃO) */}
      {previewEmail && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(5, 10, 18, 0.85)",
            backdropFilter: "blur(8px)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            animation: "fadeIn 0.15s ease",
          }}
          onClick={() => setPreviewEmail(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 780,
              maxHeight: "92vh",
              background: "#1E293B",
              borderRadius: 14,
              border: "1px solid #334155",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            }}
          >
            {/* Header do Cliente de E-mail */}
            <div
              style={{
                padding: "16px 22px",
                borderBottom: "1px solid #334155",
                background: "#0F172A",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontFamily: V.dm, fontSize: 10, color: "var(--pulso, #00C2A8)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
                  Espelho do E-mail Enviado &bull; MedPleni
                </div>
                <div style={{ fontWeight: 700, color: "#F8FAFC", fontSize: 16, marginTop: 2 }}>
                  {previewEmail.subject}
                </div>
                <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <span>Para: <strong style={{ color: "#E2E8F0" }}>{previewEmail.recipient}</strong></span>
                  <span>&bull; Data: {previewEmail.date}</span>
                  {previewEmail.resendId && <span>&bull; ID Resend: <code style={{ color: "var(--pulso, #00C2A8)", fontFamily: V.dm }}>{previewEmail.resendId}</code></span>}
                </div>
              </div>

              <button
                onClick={() => setPreviewEmail(null)}
                style={{
                  background: "transparent",
                  border: "1px solid #334155",
                  color: "#94A3B8",
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                &times;
              </button>
            </div>

            {/* Container Canvas de Alta Legibilidade com Fundo do Layout */}
            <div
              style={{
                flex: 1,
                minHeight: 520,
                background: "#1A1F2E",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <iframe
                title="Pré-visualização do E-mail"
                srcDoc={`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta charset="utf-8">
                      <style>
                        body {
                          margin: 0;
                          padding: 20px 10px;
                          background-color: #1A1F2E;
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                          color: #E0E6F0;
                        }
                      </style>
                    </head>
                    <body>
                      ${previewEmail.html}
                    </body>
                  </html>
                `}
                sandbox="allow-same-origin"
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: 520,
                  border: "none",
                  display: "block",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
