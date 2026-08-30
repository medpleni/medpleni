"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchAdminStudents, updateStudentPlanManually, type AdminStudentSummary } from "@/lib/supabase/admin";
import { useUser } from "@/lib/supabase/use-user";

const V = {
  pu: "#00C2A8", re: "#0077B6", rel: "#64B5E8", ind: "#6B5CE7",
  ch: "#8A9AB5", nb: "#E0E6F0", pe: "#2B3A52", am: "#C98A0A",
  wn: "#F5A623", dg: "#FF6B6B", su: "#22C55E",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
};

export default function AdminAlunosPage() {
  const { user } = useUser();
  const [students, setStudents] = useState<AdminStudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("Todos");
  const [editingStudent, setEditingStudent] = useState<AdminStudentSummary | null>(null);
  const [newPlan, setNewPlan] = useState("pleno_anual");

  const loadData = useCallback(async () => {
    setLoading(true);
    const list = await fetchAdminStudents(search, planFilter);
    setStudents(list);
    setLoading(false);
  }, [search, planFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const openWhatsApp = (student: AdminStudentSummary) => {
    const text = encodeURIComponent(
      `Olá ${student.fullName}! Aqui é da equipe pedagógica do MedPleni. Vimos que você realizou seu Diagnóstico Raio-X para o ENAMED 2027. Gostaria de entender em 2 minutos como o plano estruturado ataca suas lacunas prioritárias?`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div>
      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: V.pu, marginBottom: 4 }}>
            Customer Success & Atendimento
          </div>
          <h1 style={{ fontFamily: V.df, fontSize: 28, fontWeight: 700, color: "#fff" }}>
            Gestão da Base de Alunos
          </h1>
        </div>

        <div style={{ fontFamily: V.dm, fontSize: 12, color: V.ch }}>
          {students.length} médicos cadastrados
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div style={{
        background: V.pe, border: "1px solid rgba(61,90,128,0.25)",
        borderRadius: 12, padding: "16px 20px", marginBottom: 20,
        display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <input
            type="text"
            placeholder="Buscar aluno por nome, e-mail ou CRM..."
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

      {/* ── STUDENTS TABLE ── */}
      <div style={{
        background: V.pe, border: "1px solid rgba(61,90,128,0.25)",
        borderRadius: 14, overflow: "hidden",
      }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: V.ch }}>
            Carregando lista de alunos...
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#0D111C", borderBottom: "1px solid rgba(61,90,128,0.3)" }}>
                {["Médico / E-mail", "Plano Atual", "Meta / Horas", "Streak", "Cadastro", "Ações CS"].map((h) => (
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
                    <span style={{
                      fontFamily: V.dm, fontSize: 10, padding: "2px 8px", borderRadius: 4,
                      background: s.plan === "pleno_anual" ? "rgba(0,194,168,0.15)" : s.plan === "pleno_mensal" ? "rgba(0,119,182,0.15)" : "rgba(61,90,128,0.2)",
                      color: s.plan === "pleno_anual" ? V.pu : s.plan === "pleno_mensal" ? V.rel : V.ch,
                      fontWeight: 600,
                    }}>
                      {s.plan === "pleno_anual" ? "Pleno Anual" : s.plan === "pleno_mensal" ? "Pleno Mensal" : "Diagnóstico"}
                    </span>
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
                        title="Contato Comercial WhatsApp pós-diagnóstico"
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
