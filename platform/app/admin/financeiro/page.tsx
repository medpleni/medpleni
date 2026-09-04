"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

const V = {
  pu: "var(--pulso)",
  re: "var(--resgate)",
  rel: "var(--resid-light)",
  ind: "var(--indigo)",
  ch: "var(--chumbo)",
  nb: "var(--neblina)",
  pe: "var(--petroleo)",
  am: "var(--ambar)",
  wn: "var(--warn)",
  dg: "var(--danger)",
  su: "var(--success)",
  cardBg: "var(--card-bg)",
  cardBorder: "var(--card-border)",
  heading: "var(--heading-color)",
  inputBg: "var(--input-bg)",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
};

const mockInvoices = [
  { id: "iugu_inv_001", student: "Dra. Mariana Costa", email: "mariana.costa@med.br", plan: "Pleno Anual", amount: 1497, method: "Cartão (12×)", status: "pago", date: "30/08/2026 11:42" },
  { id: "iugu_inv_002", student: "Dr. Lucas Silveira", email: "lucas.silveira@usp.br", plan: "Pleno Anual", amount: 1497, method: "PIX", status: "pago", date: "30/08/2026 09:15" },
  { id: "iugu_inv_003", student: "Dra. Beatriz Mendes", email: "beatriz.mendes@unifesp.br", plan: "Pleno Mensal", amount: 247, method: "Cartão", status: "pago", date: "29/08/2026 18:20" },
  { id: "iugu_inv_004", student: "Dr. Gabriel Rocha", email: "gabriel.rocha@ufrj.br", plan: "Pleno Anual", amount: 1497, method: "PIX", status: "pendente", date: "29/08/2026 14:10" },
  { id: "iugu_inv_005", student: "Dra. Camila Nogueira", email: "camila.nog@hc.fm.usp.br", plan: "Pleno Anual", amount: 1497, method: "Cartão (12×)", status: "pago", date: "28/08/2026 16:45" },
];

export default function AdminFinanceiroPage() {
  const router = useRouter();

  return (
    <div>
      {/* ── TOPBAR / HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: V.pu, marginBottom: 4 }}>
            Controladoria & Faturamento
          </div>
          <h1 style={{ fontFamily: V.df, fontSize: 28, fontWeight: 700, color: "var(--heading-color)", margin: 0 }}>
            Financeiro & Iugu Gateway
          </h1>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => alert("Acesso ao painel oficial da Iugu será habilitado com as chaves de API em produção.")}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              background: "var(--pulso-dim)",
              border: `1px solid ${V.pu}`,
              color: V.pu,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Abrir Painel Iugu ↗
          </button>
        </div>
      </div>

      {/* ── FINANCIAL KPIS ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 12,
        marginBottom: 24,
      }}>
        {[
          { label: "Faturamento Anualizado (ARR)", value: "R$ 149.400", sub: "MRR: R$ 12.450/mês", color: V.pu },
          { label: "Receita Antecipada Hoje", value: "R$ 3.241", sub: "3 assinaturas liquidadas", color: V.rel },
          { label: "Mix Anual v2.1", value: "68%", sub: "Meta ≥50% superada ✓", color: V.pu },
          { label: "Taxa de Reembolso 30d", value: "2.1%", sub: "Threshold de segurança < 10%", color: V.su },
        ].map((k) => (
          <div key={k.label} style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            boxShadow: "var(--card-shadow)",
            borderRadius: 12,
            padding: "16px",
          }}>
            <div style={{ fontFamily: V.dm, fontSize: 9, color: "var(--chumbo)", textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
              {k.label}
            </div>
            <div style={{ fontFamily: V.df, fontSize: 24, fontWeight: 700, color: "var(--heading-color)" }}>
              {k.value}
            </div>
            <div style={{ fontFamily: V.dm, fontSize: 10, color: k.color, marginTop: 6, fontWeight: 600 }}>
              {k.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── INVOICES TABLE ── */}
      <div style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        boxShadow: "var(--card-shadow)",
        borderRadius: 14,
        overflow: "hidden",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--card-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontFamily: V.df, fontSize: 16, fontWeight: 700, color: "var(--heading-color)" }}>
            Extrato de Faturas e Assinaturas (Iugu)
          </div>
          <span style={{ fontFamily: V.dm, fontSize: 10, color: V.pu, fontWeight: 600 }}>● Sincronização Ativa</span>
        </div>

        <div className="admin-table-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 680, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--input-bg)", borderBottom: "1px solid var(--card-border)" }}>
                {["Aluno / E-mail", "Plano", "Valor", "Método", "Status Iugu", "Data / Hora", "Ações"].map((h) => (
                  <th key={h} style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontFamily: V.dm,
                    fontSize: 9,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--chumbo)",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockInvoices.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                    <div style={{ fontWeight: 600, color: "var(--heading-color)" }}>{inv.student}</div>
                    <div style={{ fontSize: 11, color: "var(--chumbo)" }}>{inv.email}</div>
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--neblina)", whiteSpace: "nowrap" }}>
                    {inv.plan}
                  </td>
                  <td style={{ padding: "14px 16px", fontFamily: V.dm, fontSize: 14, fontWeight: 700, color: "var(--heading-color)", whiteSpace: "nowrap" }}>
                    R$ {inv.amount}
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--chumbo)", fontSize: 12, whiteSpace: "nowrap" }}>
                    {inv.method}
                  </td>
                  <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                    <span style={{
                      fontFamily: V.dm, fontSize: 10, padding: "2px 8px", borderRadius: 9999,
                      background: inv.status === "pago" ? "rgba(34,197,94,0.12)" : "rgba(245,166,35,0.12)",
                      color: inv.status === "pago" ? V.su : V.wn,
                      border: `1px solid ${inv.status === "pago" ? "rgba(34,197,94,0.3)" : "rgba(245,166,35,0.3)"}`,
                      fontWeight: 600,
                    }}>
                      {inv.status === "pago" ? "Liquidado" : "Pendente"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", fontFamily: V.dm, fontSize: 11, color: "var(--chumbo)", whiteSpace: "nowrap" }}>
                    {inv.date}
                  </td>
                  <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => alert(`Fatura ${inv.id} detalhada.`)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 6,
                        background: "var(--input-bg)",
                        border: "1px solid var(--card-border)",
                        color: "var(--chumbo)",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Ver Fatura
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
