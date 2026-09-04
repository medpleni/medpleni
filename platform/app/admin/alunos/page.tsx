"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchAdminStudents, updateStudentPlanManually, type AdminStudentSummary } from "@/lib/supabase/admin";
import { useUser } from "@/lib/supabase/use-user";

const V = {
  pu: "var(--pulso)", re: "var(--resgate)", rel: "#64B5E8", ind: "#6B5CE7",
  ch: "var(--chumbo)", nb: "var(--neblina)", pe: "var(--petroleo)", am: "#C98A0A",
  wn: "#F5A623", dg: "#FF6B6B", su: "var(--sucesso)",
  cardBg: "var(--card-bg)", cardBorder: "var(--card-border)", heading: "var(--heading-color)",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
};

interface AdminInvitation {
  id: string;
  email: string;
  full_name: string;
  role: string;
  plan: string;
  sub_brand: string;
  access_duration: string;
  access_expires_at: string | null;
  token: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  notes?: string;
  created_at: string;
}

export default function AdminAlunosPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<"alunos" | "convites">("alunos");

  // Alunos
  const [students, setStudents] = useState<AdminStudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("Todos");
  const [editingStudent, setEditingStudent] = useState<AdminStudentSummary | null>(null);
  const [newPlan, setNewPlan] = useState("pleno_anual");

  // Convites
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [createdInviteResult, setCreatedInviteResult] = useState<{ inviteUrl: string; name: string; email: string } | null>(null);

  // Form de Convite
  const [inviteForm, setInviteForm] = useState({
    fullName: "",
    email: "",
    role: "student",
    plan: "pleno_anual",
    subBrand: "RESID",
    accessDuration: "1_ano",
    customExpireDate: "",
    sendEmail: true,
    notes: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const list = await fetchAdminStudents(search, planFilter);
    setStudents(list);
    setLoading(false);
  }, [search, planFilter]);

  const loadInvitations = useCallback(async () => {
    setLoadingInvites(true);
    try {
      const res = await fetch("/api/admin/invites");
      const data = await res.json();
      if (data.invitations) {
        setInvitations(data.invitations);
      }
    } catch (err) {
      console.warn("Erro ao carregar convites:", err);
    } finally {
      setLoadingInvites(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadInvitations();
  }, [loadData, loadInvitations]);

  const handleUpdatePlan = async () => {
    if (!editingStudent) return;
    const ok = await updateStudentPlanManually(
      editingStudent.id,
      newPlan,
      user ? { id: user.id, email: user.email || "" } : undefined
    );
    if (ok) {
      alert(`Plano do aluno alterado para ${newPlan} com sucesso!`);
      setEditingStudent(null);
      loadData();
    } else {
      alert("Erro ao alterar plano do aluno.");
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.fullName.trim() || !inviteForm.email.trim()) {
      alert("Preencha o nome completo e o e-mail.");
      return;
    }

    setSendingInvite(true);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Falha ao enviar convite.");
      }

      setCreatedInviteResult({
        inviteUrl: data.inviteUrl,
        name: inviteForm.fullName,
        email: inviteForm.email,
      });

      // Reseta form
      setInviteForm({
        fullName: "",
        email: "",
        role: "student",
        plan: "pleno_anual",
        subBrand: "RESID",
        accessDuration: "1_ano",
        customExpireDate: "",
        sendEmail: true,
        notes: "",
      });

      setShowInviteModal(false);
      loadInvitations();
      loadData();
    } catch (err: any) {
      alert(err.message || "Erro ao processar convite.");
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm("Deseja realmente revogar este convite?")) return;
    try {
      const res = await fetch(`/api/admin/invites?id=${inviteId}`, { method: "DELETE" });
      if (res.ok) {
        loadInvitations();
      }
    } catch (err) {
      alert("Erro ao revogar convite.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Link de convite copiado para a área de transferência!");
  };

  const openWhatsApp = (student: AdminStudentSummary) => {
    const text = encodeURIComponent(
      `Olá ${student.fullName}! Aqui é da equipe pedagógica do MedPleni. Vimos que você realizou seu Diagnóstico Raio-X para o ENAMED 2027. Gostaria de entender em 2 minutos como o plano estruturado ataca suas lacunas prioritárias?`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareInviteWhatsApp = (name: string, inviteUrl: string) => {
    const text = encodeURIComponent(
      `Olá Dr(a). ${name}! Seu acesso à plataforma MedPleni foi liberado. Acesse o link para ativar sua conta: ${inviteUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div>
      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: V.pu, marginBottom: 4 }}>
            Customer Success, Docência & Gestão de Acessos
          </div>
          <h1 style={{ fontFamily: V.df, fontSize: 28, fontWeight: 700, color: "#fff" }}>
            Gestão de Membros & Convites
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setShowInviteModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px", borderRadius: 8,
              background: `linear-gradient(135deg, ${V.pu}, #009688)`,
              border: "none", color: "#0A1A18", fontWeight: 700,
              fontSize: 13, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(0,194,168,0.35)",
            }}
          >
            <span>✉️</span>
            <span>+ Convidar Membro / Aluno</span>
          </button>
        </div>
      </div>

      {/* ── TAB NAVIGATION ── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, borderBottom: "1px solid rgba(61,90,128,0.25)", paddingBottom: 12 }}>
        <button
          onClick={() => setActiveTab("alunos")}
          style={{
            padding: "8px 16px", borderRadius: 8,
            background: activeTab === "alunos" ? "rgba(0,194,168,0.15)" : "transparent",
            border: `1px solid ${activeTab === "alunos" ? V.pu : "transparent"}`,
            color: activeTab === "alunos" ? V.pu : V.ch,
            fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          👥 Base de Médicos & Alunos ({students.length})
        </button>

        <button
          onClick={() => setActiveTab("convites")}
          style={{
            padding: "8px 16px", borderRadius: 8,
            background: activeTab === "convites" ? "rgba(0,194,168,0.15)" : "transparent",
            border: `1px solid ${activeTab === "convites" ? V.pu : "transparent"}`,
            color: activeTab === "convites" ? V.pu : V.ch,
            fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          📨 Convites Enviados ({invitations.length})
        </button>
      </div>

      {/* ── ABA 1: BASE DE ALUNOS ── */}
      {activeTab === "alunos" && (
        <>
          {/* FILTERS */}
          <div style={{
            background: V.pe, border: "1px solid rgba(61,90,128,0.25)",
            borderRadius: 12, padding: "16px 20px", marginBottom: 20,
            display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap",
          }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <input
                type="text"
                placeholder="Buscar por nome, e-mail ou CRM..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 8,
                  background: "rgba(13,17,28,0.5)", border: "1px solid rgba(61,90,128,0.3)",
                  color: "#fff", fontFamily: V.db, fontSize: 13, outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: V.ch }}>Plano:</span>
              {["Todos", "diagnostico", "pleno_mensal", "pleno_anual"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPlanFilter(p)}
                  style={{
                    padding: "6px 12px", borderRadius: 6,
                    background: planFilter === p ? "rgba(0,194,168,0.15)" : "transparent",
                    border: `1px solid ${planFilter === p ? V.pu : "rgba(61,90,128,0.3)"}`,
                    color: planFilter === p ? V.pu : V.ch,
                    fontFamily: V.db, fontSize: 12, cursor: "pointer",
                  }}
                >
                  {p === "Todos" ? "Todos" : p === "diagnostico" ? "Gratuito" : p === "pleno_mensal" ? "Pleno Mensal" : "Pleno Anual"}
                </button>
              ))}
            </div>
          </div>

          {/* STUDENTS TABLE */}
          <div style={{ background: V.pe, border: "1px solid rgba(61,90,128,0.25)", borderRadius: 14, overflow: "hidden" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 40, color: V.ch }}>Carregando lista de alunos...</div>
            ) : students.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: V.ch }}>Nenhum médico encontrado.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#0D111C", borderBottom: "1px solid rgba(61,90,128,0.3)" }}>
                    {["Médico / E-mail", "Papel / Plano", "Meta / Horas", "Streak", "Cadastro", "Ações CS"].map((h) => (
                      <th key={h} style={{
                        padding: "12px 16px", textAlign: "left",
                        fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em",
                        textTransform: "uppercase", color: V.ch,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid rgba(61,90,128,0.15)" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 600, color: "#fff" }}>{s.fullName}</div>
                        <div style={{ fontSize: 11, color: V.ch }}>{s.email} {s.crm ? `· CRM ${s.crm}` : ""}</div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {s.role && s.role !== "student" && (
                            <span style={{
                              fontFamily: V.dm, fontSize: 9, padding: "2px 6px", borderRadius: 4,
                              background: "rgba(107,92,231,0.2)", color: "#A29BFE", textTransform: "uppercase", fontWeight: 700,
                            }}>
                              {s.role}
                            </span>
                          )}
                          <span style={{
                            fontFamily: V.dm, fontSize: 10, padding: "2px 8px", borderRadius: 4,
                            background: s.plan === "pleno_anual" ? "rgba(0,194,168,0.15)" : s.plan === "pleno_mensal" ? "rgba(0,119,182,0.15)" : "rgba(61,90,128,0.2)",
                            color: s.plan === "pleno_anual" ? V.pu : s.plan === "pleno_mensal" ? V.rel : V.ch,
                            fontWeight: 600,
                          }}>
                            {s.plan === "pleno_anual" ? "Pleno Anual" : s.plan === "pleno_mensal" ? "Pleno Mensal" : "Diagnóstico"}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", color: V.nb }}>
                        {s.targetExams[0] || "ENAMED"} · {s.weeklyHours}h/sem
                      </td>
                      <td style={{ padding: "14px 16px", fontFamily: V.dm, fontSize: 12, color: V.wn }}>
                        🔥 {s.streakDays}d
                      </td>
                      <td style={{ padding: "14px 16px", fontFamily: V.dm, fontSize: 11, color: V.ch }}>
                        {s.createdAt}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => openWhatsApp(s)}
                            title="Contato Comercial WhatsApp"
                            style={{
                              padding: "5px 8px", borderRadius: 6,
                              background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
                              color: V.su, fontSize: 11, fontWeight: 600, cursor: "pointer",
                            }}
                          >
                            WhatsApp
                          </button>
                          <button
                            onClick={() => {
                              setEditingStudent(s);
                              setNewPlan(s.plan || "pleno_anual");
                            }}
                            style={{
                              padding: "5px 8px", borderRadius: 6,
                              background: "rgba(61,90,128,0.2)", border: "none",
                              color: V.nb, fontSize: 11, cursor: "pointer",
                            }}
                          >
                            Alterar Plano
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── ABA 2: CONVITES ENVIADOS ── */}
      {activeTab === "convites" && (
        <div style={{ background: V.pe, border: "1px solid rgba(61,90,128,0.25)", borderRadius: 14, overflow: "hidden" }}>
          {loadingInvites ? (
            <div style={{ textAlign: "center", padding: 40, color: V.ch }}>Carregando convites...</div>
          ) : invitations.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: V.ch }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✉️</div>
              <p style={{ margin: 0 }}>Nenhum convite cadastrado ainda.</p>
              <button
                onClick={() => setShowInviteModal(true)}
                style={{
                  marginTop: 12, padding: "8px 16px", borderRadius: 8,
                  background: V.pu, border: "none", color: "#0A1A18", fontWeight: 700, cursor: "pointer", fontSize: 12,
                }}
              >
                Criar Primeiro Convite
              </button>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#0D111C", borderBottom: "1px solid rgba(61,90,128,0.3)" }}>
                  {["Convidado / E-mail", "Papel", "Plano & Foco", "Período / Validade", "Status", "Ações"].map((h) => (
                    <th key={h} style={{
                      padding: "12px 16px", textAlign: "left",
                      fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em",
                      textTransform: "uppercase", color: V.ch,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => {
                  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
                  const fullInviteUrl = `${appUrl}/convite?token=${inv.token}`;

                  return (
                    <tr key={inv.id} style={{ borderBottom: "1px solid rgba(61,90,128,0.15)" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 600, color: "#fff" }}>{inv.full_name}</div>
                        <div style={{ fontSize: 11, color: V.ch }}>{inv.email}</div>
                        {inv.notes && (
                          <div style={{ fontSize: 10, color: V.am, marginTop: 2 }}>📝 {inv.notes}</div>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          fontFamily: V.dm, fontSize: 10, padding: "2px 8px", borderRadius: 4,
                          background: inv.role === "docente" ? "rgba(107,92,231,0.2)" : inv.role === "superadmin" ? "rgba(0,194,168,0.2)" : "rgba(61,90,128,0.2)",
                          color: inv.role === "docente" ? "#A29BFE" : inv.role === "superadmin" ? V.pu : V.nb,
                          fontWeight: 700, textTransform: "uppercase",
                        }}>
                          {inv.role}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ color: "#fff", fontWeight: 500 }}>{inv.plan}</div>
                        <div style={{ fontSize: 11, color: V.ch }}>{inv.sub_brand}</div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ color: V.wn, fontSize: 12 }}>
                          {inv.access_expires_at ? `Até ${new Date(inv.access_expires_at).toLocaleDateString("pt-BR")}` : "Vitalício"}
                        </div>
                        <div style={{ fontSize: 10, color: V.ch }}>
                          Enviado em {new Date(inv.created_at).toLocaleDateString("pt-BR")}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          fontFamily: V.dm, fontSize: 10, padding: "3px 8px", borderRadius: 4,
                          background: inv.status === "accepted" ? "rgba(34,197,94,0.15)" : inv.status === "revoked" ? "rgba(255,107,107,0.15)" : "rgba(245,166,35,0.15)",
                          color: inv.status === "accepted" ? V.su : inv.status === "revoked" ? V.dg : V.wn,
                          fontWeight: 700, textTransform: "uppercase",
                        }}>
                          {inv.status === "accepted" ? "Ativado" : inv.status === "revoked" ? "Revogado" : "Pendente"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {inv.status === "pending" && (
                            <>
                              <button
                                onClick={() => copyToClipboard(fullInviteUrl)}
                                title="Copiar Link de Ativação"
                                style={{
                                  padding: "5px 8px", borderRadius: 6,
                                  background: "rgba(0,194,168,0.15)", border: "1px solid rgba(0,194,168,0.3)",
                                  color: V.pu, fontSize: 11, cursor: "pointer", fontWeight: 600,
                                }}
                              >
                                Copiar Link
                              </button>
                              <button
                                onClick={() => shareInviteWhatsApp(inv.full_name, fullInviteUrl)}
                                title="Enviar via WhatsApp"
                                style={{
                                  padding: "5px 8px", borderRadius: 6,
                                  background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
                                  color: V.su, fontSize: 11, cursor: "pointer", fontWeight: 600,
                                }}
                              >
                                WhatsApp
                              </button>
                              <button
                                onClick={() => handleRevokeInvite(inv.id)}
                                title="Cancelar Convite"
                                style={{
                                  padding: "5px 8px", borderRadius: 6,
                                  background: "rgba(255,107,107,0.15)", border: "none",
                                  color: V.dg, fontSize: 11, cursor: "pointer",
                                }}
                              >
                                Revogar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── MODAL: CONVIDAR MEMBRO / ALUNO / DOCENTE ── */}
      {showInviteModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(13,17,28,0.88)",
          backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 20, overflowY: "auto",
        }}>
          <div style={{
            background: "#1A1F2E", border: "1px solid rgba(0,194,168,0.4)",
            borderRadius: 16, maxWidth: 540, width: "100%", padding: 28,
            boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: V.dm, fontSize: 10, color: V.pu, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Novo Acesso & Concessão
                </div>
                <h2 style={{ fontFamily: V.df, fontSize: 20, fontWeight: 700, color: "#fff", margin: "2px 0 0 0" }}>
                  Enviar Convite Oficial
                </h2>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{ background: "transparent", border: "none", color: V.ch, fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvite}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: V.ch, marginBottom: 4, fontWeight: 600 }}>
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dr. Carlos Eduardo"
                    value={inviteForm.fullName}
                    onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: 8,
                      background: "#0D111C", border: "1px solid rgba(61,90,128,0.3)", color: "#fff",
                      fontSize: 13, outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, color: V.ch, marginBottom: 4, fontWeight: 600 }}>
                    E-mail do Convidado *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="medico@exemplo.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: 8,
                      background: "#0D111C", border: "1px solid rgba(61,90,128,0.3)", color: "#fff",
                      fontSize: 13, outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Papel / Role & Submarca */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: V.ch, marginBottom: 4, fontWeight: 600 }}>
                    Tipo de Perfil (Role) *
                  </label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: 8,
                      background: "#0D111C", border: "1px solid rgba(61,90,128,0.3)", color: "#fff",
                      fontSize: 13, outline: "none",
                    }}
                  >
                    <option value="student">👨‍🎓 Aluno / Médico Residente</option>
                    <option value="docente">🩺 Docente & Professor</option>
                    <option value="financeiro">💳 Financeiro & Faturamento</option>
                    <option value="suporte">🎧 Suporte & CS</option>
                    <option value="desenvolvedor">💻 Desenvolvedor & Engenharia</option>
                    <option value="superadmin">⚡ Superadmin / Gestão</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, color: V.ch, marginBottom: 4, fontWeight: 600 }}>
                    Submarca / Foco Prova
                  </label>
                  <select
                    value={inviteForm.subBrand}
                    onChange={(e) => setInviteForm({ ...inviteForm, subBrand: e.target.value })}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: 8,
                      background: "#0D111C", border: "1px solid rgba(61,90,128,0.3)", color: "#fff",
                      fontSize: 13, outline: "none",
                    }}
                  >
                    <option value="RESID">Residência Médica (RESID)</option>
                    <option value="ENAMED">ENAMED Nacional</option>
                    <option value="REVALIDA">REVALIDA INEP</option>
                    <option value="ESPECIALISTA">Título de Especialista</option>
                  </select>
                </div>
              </div>

              {/* Plano & Período de Acesso */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: V.ch, marginBottom: 4, fontWeight: 600 }}>
                    Plano de Acesso *
                  </label>
                  <select
                    value={inviteForm.plan}
                    onChange={(e) => setInviteForm({ ...inviteForm, plan: e.target.value })}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: 8,
                      background: "#0D111C", border: "1px solid rgba(61,90,128,0.3)", color: "#fff",
                      fontSize: 13, outline: "none",
                    }}
                  >
                    <option value="pleno_anual">MedPleni Pleno (Anual R$ 1.497)</option>
                    <option value="pleno_mensal">MedPleni Pleno (Mensal R$ 247)</option>
                    <option value="cortesia_vip">Cortesia VIP / Bolsista</option>
                    <option value="vitalicio">Acesso Vitalício Completo</option>
                    <option value="diagnostico">Diagnóstico (Gratuito)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, color: V.ch, marginBottom: 4, fontWeight: 600 }}>
                    Período de Acesso (Duração) *
                  </label>
                  <select
                    value={inviteForm.accessDuration}
                    onChange={(e) => setInviteForm({ ...inviteForm, accessDuration: e.target.value })}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: 8,
                      background: "#0D111C", border: "1px solid rgba(61,90,128,0.3)", color: "#fff",
                      fontSize: 13, outline: "none",
                    }}
                  >
                    <option value="30_dias">30 dias (1 mês)</option>
                    <option value="90_dias">90 dias (3 meses)</option>
                    <option value="6_meses">6 meses</option>
                    <option value="1_ano">1 ano (12 meses)</option>
                    <option value="2_anos">2 anos (24 meses)</option>
                    <option value="vitalicio">Vitalício (Sem expiração)</option>
                    <option value="custom">Data Personalizada</option>
                  </select>
                </div>
              </div>

              {inviteForm.accessDuration === "custom" && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 11, color: V.ch, marginBottom: 4, fontWeight: 600 }}>
                    Data Limite de Expiração
                  </label>
                  <input
                    type="date"
                    required
                    value={inviteForm.customExpireDate}
                    onChange={(e) => setInviteForm({ ...inviteForm, customExpireDate: e.target.value })}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: 8,
                      background: "#0D111C", border: "1px solid rgba(61,90,128,0.3)", color: "#fff",
                      fontSize: 13, outline: "none",
                    }}
                  />
                </div>
              )}

              {/* Observações */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, color: V.ch, marginBottom: 4, fontWeight: 600 }}>
                  Observações Internas (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Parceria Hospital Universitário / Professor convidado"
                  value={inviteForm.notes}
                  onChange={(e) => setInviteForm({ ...inviteForm, notes: e.target.value })}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8,
                    background: "#0D111C", border: "1px solid rgba(61,90,128,0.3)", color: "#fff",
                    fontSize: 13, outline: "none",
                  }}
                />
              </div>

              {/* Checkbox Disparo de E-mail */}
              <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  id="sendEmailCheck"
                  checked={inviteForm.sendEmail}
                  onChange={(e) => setInviteForm({ ...inviteForm, sendEmail: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: V.pu, cursor: "pointer" }}
                />
                <label htmlFor="sendEmailCheck" style={{ fontSize: 12, color: V.nb, cursor: "pointer" }}>
                  Disparar e-mail de convite oficial imediatamente via Resend
                </label>
              </div>

              {/* Ações */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 8,
                    background: "transparent", border: "1px solid rgba(61,90,128,0.3)", color: V.ch,
                    fontWeight: 600, fontSize: 13, cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sendingInvite}
                  style={{
                    flex: 2, padding: "10px 0", borderRadius: 8,
                    background: V.pu, border: "none", color: "#0A1A18",
                    fontWeight: 700, fontSize: 13, cursor: sendingInvite ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 16px rgba(0,194,168,0.3)",
                  }}
                >
                  {sendingInvite ? "Gerando Convite..." : "Gerar & Enviar Convite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DE SUCESSO / LINK GERADO ── */}
      {createdInviteResult && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(13,17,28,0.9)",
          backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1100, padding: 20,
        }}>
          <div style={{
            background: "#1A1F2E", border: "1px solid rgba(0,194,168,0.6)",
            borderRadius: 16, maxWidth: 480, width: "100%", padding: 28, textAlign: "center",
            boxShadow: "0 25px 60px rgba(0,0,0,0.7)",
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✨</div>
            <h3 style={{ fontFamily: V.df, fontSize: 22, color: "#fff", margin: "0 0 6px 0" }}>
              Convite Criado com Sucesso!
            </h3>
            <p style={{ color: V.ch, fontSize: 13, marginBottom: 20 }}>
              O acesso de <strong>{createdInviteResult.name}</strong> ({createdInviteResult.email}) foi registrado.
            </p>

            <div style={{
              background: "#0D111C", border: "1px solid rgba(61,90,128,0.4)",
              borderRadius: 8, padding: "10px 12px", marginBottom: 20,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <input
                type="text"
                readOnly
                value={createdInviteResult.inviteUrl}
                style={{
                  flex: 1, background: "transparent", border: "none", color: V.pu,
                  fontFamily: V.dm, fontSize: 11, outline: "none",
                }}
              />
              <button
                onClick={() => copyToClipboard(createdInviteResult.inviteUrl)}
                style={{
                  padding: "6px 12px", borderRadius: 6, background: V.pu,
                  border: "none", color: "#0A1A18", fontWeight: 700, fontSize: 11, cursor: "pointer",
                }}
              >
                Copiar
              </button>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => shareInviteWhatsApp(createdInviteResult.name, createdInviteResult.inviteUrl)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8,
                  background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)",
                  color: V.su, fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}
              >
                📱 Compartilhar WhatsApp
              </button>
              <button
                onClick={() => setCreatedInviteResult(null)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8,
                  background: "rgba(61,90,128,0.2)", border: "none",
                  color: V.nb, fontWeight: 600, fontSize: 13, cursor: "pointer",
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ALTERAÇÃO DE PLANO ── */}
      {editingStudent && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(13,17,28,0.85)",
          backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 20,
        }}>
          <div style={{
            background: "#1A1F2E", border: "1px solid rgba(0,194,168,0.4)",
            borderRadius: 14, maxWidth: 420, width: "100%", padding: 24,
          }}>
            <div style={{ fontFamily: V.df, fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
              Alteração Manual de Acesso
            </div>
            <div style={{ fontSize: 12, color: V.ch, marginBottom: 16 }}>
              Aluno: <strong>{editingStudent.fullName}</strong> ({editingStudent.email})
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: V.ch, marginBottom: 6 }}>Novo Plano</label>
              <select
                value={newPlan}
                onChange={(e) => setNewPlan(e.target.value)}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 6,
                  background: "#0D111C", border: "1px solid rgba(61,90,128,0.3)", color: "#fff",
                }}
              >
                <option value="diagnostico">MedPleni Diagnóstico (Gratuito)</option>
                <option value="pleno_mensal">MedPleni Pleno (Mensal R$ 247)</option>
                <option value="pleno_anual">MedPleni Pleno (Anual R$ 1.497)</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setEditingStudent(null)}
                style={{ flex: 1, padding: "8px 0", borderRadius: 6, background: "transparent", border: "1px solid rgba(61,90,128,0.3)", color: V.ch, cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdatePlan}
                style={{ flex: 1, padding: "8px 0", borderRadius: 6, background: V.pu, border: "none", color: "#0A1A18", fontWeight: 700, cursor: "pointer" }}
              >
                Salvar Alteração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
