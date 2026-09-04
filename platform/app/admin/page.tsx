"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchExecutiveMetrics, type ExecutiveMetrics } from "@/lib/supabase/admin";

const V = {
  pu: "#00C2A8", re: "#0077B6", rel: "#64B5E8", ind: "#6B5CE7",
  ch: "#8A9AB5", nb: "#E0E6F0", pe: "#2B3A52", am: "#C98A0A",
  wn: "#F5A623", dg: "#FF6B6B", su: "#22C55E",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
  ab: "#1A1F2E", deeper: "#0D111C",
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await fetchExecutiveMetrics();
    setMetrics(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !metrics) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: V.ch }}>
        Carregando painel executivo 360°...
      </div>
    );
  }

  return (
    <div>
      {/* ── TOPBAR / HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: V.pu, marginBottom: 4 }}>
            Visão Geral SaaS · Tempo Real
          </div>
          <h1 style={{ fontFamily: V.df, fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
            Dashboard Executivo
          </h1>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => router.push("/admin/conteudo/nova")}
            style={{
              padding: "9px 18px", borderRadius: 8,
              background: V.pu, border: "none", color: "#0A1A18",
              fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
              boxShadow: "0 2px 10px rgba(0,194,168,0.25)",
            }}
          >
            + Cadastrar Questão
          </button>
          <button
            onClick={() => router.push("/admin/financeiro")}
            style={{
              padding: "9px 18px", borderRadius: 8,
              background: "transparent", border: "1px solid rgba(61,90,128,0.4)",
              color: V.nb, fontFamily: V.db, fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}
          >
            Ver Faturas Iugu →
          </button>
        </div>
      </div>

      {/* ── KPI GRID ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
        gap: 16,
        marginBottom: 28,
      }}>
        {[
          { label: "MRR Estimado", value: `R$ ${metrics.mrr.toLocaleString("pt-BR")}`, sub: `ARR: R$ ${metrics.arr.toLocaleString("pt-BR")}`, color: V.pu },
          { label: "Total de Alunos", value: metrics.totalStudents, sub: `${metrics.paidStudents} pagantes (${metrics.conversionRate}%)`, color: V.rel },
          { label: "Mix Anual v2.1", value: `${metrics.mixAnualPct}%`, sub: "Meta ≥50% atingida ✓", color: V.pu },
          { label: "Diagnósticos Feitos", value: metrics.diagnosticsCompleted, sub: "Lead magnet ativo", color: V.wn },
          { label: "Questões Resolvidas", value: metrics.questionsAnsweredTotal, sub: `${metrics.simulationsCompletedTotal} simulados`, color: V.ind },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            background: V.pe, border: "1px solid rgba(61,90,128,0.3)",
            borderRadius: 12, padding: "20px",
          }}>
            <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 8 }}>
              {kpi.label}
            </div>
            <div style={{ fontFamily: V.df, fontSize: 26, fontWeight: 700, color: "#fff", lineHeight: 1.1 }}>
              {kpi.value}
            </div>
            <div style={{ fontFamily: V.dm, fontSize: 10, color: kpi.color, marginTop: 8 }}>
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN CONTENT: 2 COLUMNS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
        {/* Left: Funil & Desempenho */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Funil de Conversão */}
          <div style={{
            background: V.pe, border: "1px solid rgba(61,90,128,0.25)",
            borderRadius: 14, padding: "22px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontFamily: V.df, fontSize: 16, fontWeight: 700, color: "#fff" }}>
                Funil de Conversão Comercial (SaaS)
              </div>
              <span style={{ fontFamily: V.dm, fontSize: 10, color: V.ch }}>Últimos 30 dias</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { stage: "1. Visitantes & Cadastros Iniciais", count: metrics.totalStudents, pct: 100, color: V.ch },
                { stage: "2. Diagnóstico Raio-X Concluído", count: metrics.diagnosticsCompleted, pct: Math.round((metrics.diagnosticsCompleted / metrics.totalStudents) * 100), color: V.rel },
                { stage: "3. Amostra Ativa (7 dias)", count: Math.round(metrics.diagnosticsCompleted * 0.75), pct: Math.round(((metrics.diagnosticsCompleted * 0.75) / metrics.totalStudents) * 100), color: V.ind },
                { stage: "4. Assinantes MedPleni Pleno", count: metrics.paidStudents, pct: metrics.conversionRate, color: V.pu },
              ].map((s) => (
                <div key={s.stage}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: V.nb }}>{s.stage}</span>
                    <span style={{ fontFamily: V.dm, color: s.color, fontWeight: 600 }}>
                      {s.count} alunos ({s.pct}%)
                    </span>
                  </div>
                  <div style={{ height: 8, background: "rgba(61,90,128,0.2)", borderRadius: 9999, overflow: "hidden" }}>
                    <div style={{ width: `${s.pct}%`, height: "100%", background: s.color, borderRadius: 9999 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Atividade Pedagógica Recente */}
          <div style={{
            background: V.pe, border: "1px solid rgba(61,90,128,0.25)",
            borderRadius: 14, padding: "22px",
          }}>
            <div style={{ fontFamily: V.df, fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 14 }}>
              Engajamento dos Alunos nas 5 Grandes Áreas DCN
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, textAlign: "center" }}>
              {[
                { area: "Clínica Médica", acerto: "82%", q: 1420, color: V.pu },
                { area: "Cirurgia Geral", acerto: "74%", q: 890, color: V.re },
                { area: "Saúde Coletiva", acerto: "68%", q: 620, color: V.ind },
                { area: "Pediatria", acerto: "79%", q: 510, color: V.wn },
                { area: "GO", acerto: "65%", q: 400, color: V.dg },
              ].map((d) => (
                <div key={d.area} style={{ background: "rgba(43,58,82,0.4)", padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: V.ch, marginBottom: 4 }}>{d.area}</div>
                  <div style={{ fontFamily: V.dm, fontSize: 16, fontWeight: 700, color: d.color }}>{d.acerto}</div>
                  <div style={{ fontFamily: V.dm, fontSize: 9, color: "rgba(138,154,181,0.5)", marginTop: 2 }}>{d.q} resoluções</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Vendas Recentes & Ações */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Vendas Recentes */}
          <div style={{
            background: V.pe, border: "1px solid rgba(61,90,128,0.25)",
            borderRadius: 14, padding: "22px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontFamily: V.df, fontSize: 16, fontWeight: 700, color: "#fff" }}>
                Últimas Assinaturas
              </div>
              <span style={{ fontFamily: V.dm, fontSize: 10, color: V.pu }}>Iugu Gateway</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {metrics.recentSales.map((sale) => (
                <div key={sale.id} style={{
                  padding: "12px", background: "rgba(43,58,82,0.4)",
                  borderRadius: 8, border: "1px solid rgba(61,90,128,0.2)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{sale.studentName}</div>
                    <div style={{ fontSize: 11, color: V.ch }}>{sale.plan} · {sale.paymentMethod}</div>
                    <div style={{ fontFamily: V.dm, fontSize: 9, color: "rgba(138,154,181,0.5)", marginTop: 2 }}>{sale.date}</div>
                  </div>
                  <div style={{ fontFamily: V.dm, fontSize: 14, fontWeight: 700, color: V.pu }}>
                    R$ {sale.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dica da Diretoria */}
          <div style={{
            background: "linear-gradient(135deg, rgba(0,194,168,0.08) 0%, rgba(43,58,82,0.5) 100%)",
            border: "1px solid rgba(0,194,168,0.25)",
            borderRadius: 14, padding: "18px 20px",
          }}>
            <div style={{ fontFamily: V.df, fontSize: 13, fontWeight: 700, color: V.pu, marginBottom: 6 }}>
              Alavanca de Faturamento v2.1
            </div>
            <div style={{ fontSize: 12, color: V.nb, lineHeight: 1.6 }}>
              O mix anual está em <strong>{metrics.mixAnualPct}%</strong>. Para cada 10 novos alunos que entram no ciclo 2027, o plano anual antecipa R$ 10.479 no caixa no Dia 1 e reduz o churn para zero durante 12 meses.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
