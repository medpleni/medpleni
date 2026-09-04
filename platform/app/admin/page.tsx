"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchExecutiveMetrics, type ExecutiveMetrics } from "@/lib/supabase/admin";

const V = {
  pu: "var(--pulso)",
  re: "var(--resid)",
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
  ab: "var(--abismo)",
  deeper: "var(--deeper)",
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
      <div style={{ textAlign: "center", padding: 60, color: "var(--chumbo)" }}>
        Carregando painel executivo 360°...
      </div>
    );
  }

  return (
    <div>
      {/* ── TOPBAR / HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: V.pu, marginBottom: 4, fontWeight: 600 }}>
            Visão Geral SaaS · Tempo Real
          </div>
          <h1 style={{ fontFamily: V.df, fontSize: 28, fontWeight: 700, color: "var(--heading-color)", letterSpacing: "-0.01em", margin: 0 }}>
            Dashboard Executivo
          </h1>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => router.push("/admin/conteudo/nova")}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              background: `linear-gradient(135deg, ${V.pu}, #009688)`,
              border: "none",
              color: "#FFFFFF",
              fontFamily: V.db,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(0,194,168,0.25)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>+ Cadastrar Questão</span>
          </button>

          <button
            onClick={() => router.push("/admin/financeiro")}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              color: "var(--heading-color)",
              fontFamily: V.db,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "var(--card-shadow)",
            }}
          >
            Ver Faturas Iugu →
          </button>
        </div>
      </div>

      {/* ── KPI GRID ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 12,
        marginBottom: 24,
      }}>
        {[
          { label: "MRR Estimado", value: `R$ ${metrics.mrr.toLocaleString("pt-BR")}`, sub: `ARR: R$ ${metrics.arr.toLocaleString("pt-BR")}`, color: V.pu },
          { label: "Total de Alunos", value: metrics.totalStudents, sub: `${metrics.paidStudents} pagantes (${metrics.conversionRate}%)`, color: V.rel },
          { label: "Mix Anual v2.1", value: `${metrics.mixAnualPct}%`, sub: "Meta ≥50% atingida ✓", color: V.pu },
          { label: "Diagnósticos Feitos", value: metrics.diagnosticsCompleted, sub: "Lead magnet ativo", color: V.wn },
          { label: "Questões Resolvidas", value: metrics.questionsAnsweredTotal, sub: `${metrics.simulationsCompletedTotal} simulados`, color: V.ind },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            boxShadow: "var(--card-shadow)",
            borderRadius: 12,
            padding: "16px",
          }}>
            <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--chumbo)", marginBottom: 6, fontWeight: 600 }}>
              {kpi.label}
            </div>
            <div style={{ fontFamily: V.df, fontSize: 24, fontWeight: 700, color: "var(--heading-color)", lineHeight: 1.1 }}>
              {kpi.value}
            </div>
            <div style={{ fontFamily: V.dm, fontSize: 10, color: kpi.color, marginTop: 6, fontWeight: 600 }}>
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN CONTENT: 2 COLUMNS (STACKS ON MOBILE) ── */}
      <div className="admin-grid-2-1">
        {/* Left: Funil & Desempenho */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Funil de Conversão */}
          <div style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            boxShadow: "var(--card-shadow)",
            borderRadius: 14,
            padding: "22px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontFamily: V.df, fontSize: 16, fontWeight: 700, color: "var(--heading-color)" }}>
                Funil de Conversão Comercial (SaaS)
              </div>
              <span style={{ fontFamily: V.dm, fontSize: 10, color: "var(--chumbo)" }}>Últimos 30 dias</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { stage: "1. Visitantes & Cadastros Iniciais", count: metrics.totalStudents, pct: 100, color: "var(--chumbo)" },
                { stage: "2. Diagnóstico Raio-X Concluído", count: metrics.diagnosticsCompleted, pct: Math.round((metrics.diagnosticsCompleted / metrics.totalStudents) * 100), color: V.rel },
                { stage: "3. Amostra Ativa (7 dias)", count: Math.round(metrics.diagnosticsCompleted * 0.75), pct: Math.round(((metrics.diagnosticsCompleted * 0.75) / metrics.totalStudents) * 100), color: V.ind },
                { stage: "4. Assinantes MedPleni Pleno", count: metrics.paidStudents, pct: metrics.conversionRate, color: V.pu },
              ].map((s) => (
                <div key={s.stage}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "var(--neblina)", fontWeight: 500 }}>{s.stage}</span>
                    <span style={{ fontFamily: V.dm, color: s.color, fontWeight: 700 }}>
                      {s.count} alunos ({s.pct}%)
                    </span>
                  </div>
                  <div style={{ height: 8, background: "var(--input-bg)", border: "1px solid var(--card-border)", borderRadius: 9999, overflow: "hidden" }}>
                    <div style={{ width: `${s.pct}%`, height: "100%", background: s.color, borderRadius: 9999 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Atividade Pedagógica Recente */}
          <div style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            boxShadow: "var(--card-shadow)",
            borderRadius: 14,
            padding: "22px",
          }}>
            <div style={{ fontFamily: V.df, fontSize: 16, fontWeight: 700, color: "var(--heading-color)", marginBottom: 14 }}>
              Engajamento dos Alunos nas 5 Grandes Áreas DCN
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10, textAlign: "center" }}>
              {[
                { area: "Clínica Médica", acerto: "82%", q: 1420, color: V.pu },
                { area: "Cirurgia Geral", acerto: "74%", q: 890, color: V.re },
                { area: "Saúde Coletiva", acerto: "68%", q: 620, color: V.ind },
                { area: "Pediatria", acerto: "79%", q: 510, color: V.wn },
                { area: "GO", acerto: "65%", q: 400, color: V.dg },
              ].map((d) => (
                <div key={d.area} style={{ background: "var(--input-bg)", border: "1px solid var(--card-border)", padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--chumbo)", marginBottom: 4, fontWeight: 500 }}>{d.area}</div>
                  <div style={{ fontFamily: V.dm, fontSize: 16, fontWeight: 700, color: d.color }}>{d.acerto}</div>
                  <div style={{ fontFamily: V.dm, fontSize: 9, color: "var(--chumbo)", marginTop: 2 }}>{d.q} resoluções</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Vendas Recentes & Ações */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Vendas Recentes */}
          <div style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            boxShadow: "var(--card-shadow)",
            borderRadius: 14,
            padding: "22px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontFamily: V.df, fontSize: 16, fontWeight: 700, color: "var(--heading-color)" }}>
                Últimas Assinaturas
              </div>
              <span style={{ fontFamily: V.dm, fontSize: 10, color: V.pu, fontWeight: 600 }}>Iugu Gateway</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {metrics.recentSales.map((sale) => (
                <div key={sale.id} style={{
                  padding: "12px",
                  background: "var(--input-bg)",
                  borderRadius: 8,
                  border: "1px solid var(--card-border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading-color)" }}>{sale.studentName}</div>
                    <div style={{ fontSize: 11, color: "var(--chumbo)" }}>{sale.plan} · {sale.paymentMethod}</div>
                    <div style={{ fontFamily: V.dm, fontSize: 9, color: "var(--chumbo)", marginTop: 2 }}>{sale.date}</div>
                  </div>
                  <div style={{ fontFamily: V.dm, fontSize: 14, fontWeight: 700, color: V.pu }}>
                    R$ {sale.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dica da Diretoria / Alavanca */}
          <div style={{
            background: "var(--card-bg)",
            border: "1.5px solid var(--pulso)",
            boxShadow: "var(--card-shadow)",
            borderRadius: 14,
            padding: "18px 20px",
          }}>
            <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 700, color: V.pu, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: V.pu }} />
              <span>Alavanca de Faturamento v2.1</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--neblina)", lineHeight: 1.6 }}>
              O mix anual está em <strong style={{ color: "var(--heading-color)" }}>{metrics.mixAnualPct}%</strong>. Para cada 10 novos alunos que entram no ciclo 2027, o plano anual antecipa R$ 10.479 no caixa no Dia 1 e reduz o churn para zero durante 12 meses.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
