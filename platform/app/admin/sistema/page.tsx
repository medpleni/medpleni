"use client";

import React, { useState } from "react";

const V = {
  pu: "var(--pulso)", re: "var(--resgate)", rel: "#64B5E8", ind: "#6B5CE7",
  ch: "var(--chumbo)", nb: "var(--neblina)", pe: "var(--petroleo)", am: "#C98A0A",
  wn: "#F5A623", dg: "#FF6B6B", su: "var(--sucesso)",
  cardBg: "var(--card-bg)", cardBorder: "var(--card-border)", heading: "var(--heading-color)",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
};

const mockWebhooks = [
  { id: "wh_01", event: "invoice.status_changed", status: "paid", invoice: "iugu_inv_001", time: "Hoje, 11:42", code: 200 },
  { id: "wh_02", event: "invoice.created", status: "pending", invoice: "iugu_inv_002", time: "Hoje, 09:15", code: 200 },
  { id: "wh_03", event: "subscription.created", status: "active", invoice: "iugu_sub_882", time: "Ontem, 18:20", code: 200 },
];

const mockTeam = [
  { name: "Mário Nascimento", email: "mario.nascimentolopes@gmail.com", role: "Superadmin", status: "Ativo" },
  { name: "Coordenação Pedagógica", email: "docencia@medpleni.com.br", role: "Docente / Conteudista", status: "Ativo" },
  { name: "Controladoria Financeira", email: "financeiro@medpleni.com.br", role: "Financeiro", status: "Ativo" },
  { name: "Customer Success MedPleni", email: "suporte@medpleni.com.br", role: "Suporte / CS", status: "Ativo" },
];

export default function AdminSistemaPage() {
  return (
    <div>
      {/* ── HEADER ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: V.pu, marginBottom: 4 }}>
          Infraestrutura & Governança
        </div>
        <h1 style={{ fontFamily: V.df, fontSize: 28, fontWeight: 700, color: "var(--heading-color)" }}>
          Sistema & Monitoramento Técnico
        </h1>
      </div>

      {/* ── SERVICE HEALTH STATUS ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 14, marginBottom: 24,
      }}>
        {[
          { name: "Banco Supabase (PostgreSQL)", status: "Operacional", ping: "24ms", color: V.su },
          { name: "Iugu Payment Gateway", status: "Pronto para Conexão", ping: "—", color: V.pu },
          { name: "Resend E-mails Transacionais", status: "Operacional", ping: "45ms", color: V.su },
          { name: "Next.js App Engine (Vercel)", status: "Operacional", ping: "12ms", color: V.su },
        ].map((s) => (
          <div key={s.name} style={{
            background: "var(--card-bg)", border: "1px solid var(--card-border)",
            borderRadius: 12, padding: "18px", boxShadow: "var(--card-shadow)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--heading-color)" }}>{s.name}</span>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
            </div>
            <div style={{ fontFamily: V.dm, fontSize: 11, color: s.color, fontWeight: 600 }}>{s.status}</div>
            <div style={{ fontFamily: V.dm, fontSize: 10, color: "var(--chumbo)", marginTop: 4 }}>Latência: {s.ping}</div>
          </div>
        ))}
      </div>

      {/* ── 2 COLUMNS: TEAM & WEBHOOKS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Gestão de Equipe Administrativa */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: "20px", boxShadow: "var(--card-shadow)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: V.df, fontSize: 16, fontWeight: 700, color: "var(--heading-color)" }}>
              Equipe & Permissões RBAC
            </div>
            <button
              onClick={() => alert("Novo administrador pode ser adicionado pelo banco Supabase definindo role.")}
              style={{
                padding: "6px 12px", borderRadius: 6, background: "rgba(0,194,168,0.12)",
                border: "1px solid rgba(0,194,168,0.35)", color: "var(--pulso)", fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}
            >
              + Convidar Membro
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {mockTeam.map((m) => (
              <div key={m.email} style={{
                padding: "12px", background: "var(--input-bg)", borderRadius: 8,
                border: "1px solid var(--card-border)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading-color)" }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: "var(--chumbo)" }}>{m.email}</div>
                </div>
                <span style={{
                  fontFamily: V.dm, fontSize: 9, padding: "3px 8px", borderRadius: 4,
                  background: "rgba(0,194,168,0.15)", color: "var(--pulso)", fontWeight: 700,
                }}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Logs de Webhook Iugu */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: "20px", boxShadow: "var(--card-shadow)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: V.df, fontSize: 16, fontWeight: 700, color: "var(--heading-color)" }}>
              Monitor de Webhooks Iugu
            </div>
            <span style={{ fontFamily: V.dm, fontSize: 10, color: V.su, fontWeight: 600 }}>● Escuta Ativa</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {mockWebhooks.map((w) => (
              <div key={w.id} style={{
                padding: "12px", background: "var(--input-bg)", borderRadius: 8,
                border: "1px solid var(--card-border)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: V.dm, fontSize: 11, color: "var(--pulso)", fontWeight: 700 }}>
                    {w.event}
                  </span>
                  <span style={{ fontFamily: V.dm, fontSize: 10, color: V.su, fontWeight: 600 }}>
                    {w.code} OK
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--chumbo)" }}>
                  Fatura: {w.invoice} · Status: <strong>{w.status}</strong> · {w.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
