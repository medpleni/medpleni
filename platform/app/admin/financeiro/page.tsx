"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

const V = {
  pu: "#00C2A8", re: "#0077B6", rel: "#64B5E8", ind: "#6B5CE7",
  ch: "#8A9AB5", nb: "#E0E6F0", pe: "#2B3A52", am: "#C98A0A",
  wn: "#F5A623", dg: "#FF6B6B", su: "#22C55E",
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
  const [filter, setFilter] = useState("todos");

  return (
    <div>
      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: V.pu, marginBottom: 4 }}>
            Controladoria & Faturamento
          </div>
          <h1 style={{ fontFamily: V.df, fontSize: 28, fontWeight: 700, color: "#fff" }}>
            Financeiro & Iugu Gateway
          </h1>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => alert("Acesso ao painel oficial da Iugu será habilitado com as chaves de API.")}
            style={{
              padding: "9px 18px", borderRadius: 8, background: "rgba(0,194,168,0.1)",
              border: "1px solid rgba(0,194,168,0.3)", color: V.pu, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Abrir Painel Iugu ↗
          </button>
        </div>
      </div>

      {/* ── FINANCIAL KPIS ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 14, marginBottom: 24,
      }}>
        {[
          { label: "Faturamento Anualizado (ARR)", value: "R$ 149.400", sub: "MRR: R$ 12.450/mês", color: V.pu },
          { label: "Receita Antecipada Hoje", value: "R$ 3.241", sub: "3 assinaturas liquidadas", color: V.rel },
          { label: "Mix Anual v2.1", value: "68%", sub: "Meta ≥50% superada ✓", color: V.pu },
          { label: "Taxa de Reembolso 30d", value: "2.1%", sub: "Threshold de segurança < 10%", color: V.su },
        ].map((k) => (
          <div key={k.label} style={{
            background: V.pe, border: "1px solid rgba(61,90,128,0.3)",
            borderRadius: 12, padding: "18px 20px",
          }}>
            <div style={{ fontFamily: V.dm, fontSize: 9, color: V.ch, textTransform: "uppercase", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: V.df, fontSize: 24, fontWeight: 700, color: "#fff" }}>{k.value}</div>
            <div style={{ fontFamily: V.dm, fontSize: 10, color: k.color, marginTop: 6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── INVOICES TABLE ── */}
      <div style={{
        background: V.pe, border: "1px solid rgba(61,90,128,0.25)",
        borderRadius: 14, overflow: "hidden",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(61,90,128,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: V.df, fontSize: 16, fontWeight: 700, color: "#fff" }}>
            Extrato de Faturas e Assinaturas (Iugu)
          </div>
          <span style={{ fontFamily: V.dm, fontSize: 10, color: V.pu }}>Sincronização Ativa</span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#0D111C", borderBottom: "1px solid rgba(61,90,128,0.3)" }}>
              {["Aluno / E-mail", "Plano", "Valor", "Método", "Status Iugu", "Data / Hora", "Ações"].map((h) => (
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
            {mockInvoices.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: "1px solid rgba(61,90,128,0.15)" }}>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ fontWeight: 600, color: "#fff" }}>{inv.student}</div>
                  <div style={{ fontSize: 11, color: V.ch }}>{inv.email}</div>
                </td>
                <td style={{ padding: "14px 16px", color: V.nb }}>
                  {inv.plan}
                </td>
                <td style={{ padding: "14px 16px", fontFamily: V.dm, fontSize: 14, fontWeight: 700, color: "#fff" }}>
                  R$ {inv.amount}
                </td>
                <td style={{ padding: "14px 16px", color: V.ch, fontSize: 12 }}>
                  {inv.method}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{
                    fontFamily: V.dm, fontSize: 10, padding: "2px 8px", borderRadius: 9999,
                    background: inv.status === "pago" ? "rgba(0,194,168,0.15)" : "rgba(245,166,35,0.15)",
                    color: inv.status === "pago" ? V.pu : V.wn,
                    border: `1px solid ${inv.status === "pago" ? "rgba(0,194,168,0.3)" : "rgba(245,166,35,0.3)"}`,
                  }}>
                    {inv.status === "pago" ? "✓ Liquidado" : "⏳ Pendente"}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", fontFamily: V.dm, fontSize: 11, color: V.ch }}>
                  {inv.date}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <button
                    onClick={() => alert(`Fatura ${inv.id} detalhada.`)}
                    style={{
                      padding: "4px 8px", borderRadius: 4, background: "rgba(61,90,128,0.2)",
                      border: "none", color: V.nb, fontSize: 11, cursor: "pointer",
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
  );
}
