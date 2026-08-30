"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageShell } from "@/components/layout";
import { KPICard, ScoreRing, Card, ProgressBar, Badge } from "@/components/ui";
import { useUser } from "@/lib/supabase/use-user";
import {
  calculateEnamedPrediction,
  type EnamedPredictionData,
} from "@/lib/supabase/prediction";
import {
  mockScoreEvolution,
  mockRecommendations,
  mockSimulados,
} from "@/lib/mock-data";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from "recharts";

/* ── Helpers ── */
const statusColor = (s: string) =>
  s === "excelente" ? "#00C2A8" : s === "bom" ? "#64B5E8" : s === "atencao" ? "#F5A623" : "#FF6B6B";

const statusVariant = (s: string) =>
  s === "excelente" ? "green" : s === "bom" ? "blue" : s === "atencao" ? "warn" : "danger";



/* ── KPI Icons ── */
function IcPred() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M2 12V7l3-2 3 2 3-3 3 1.5" stroke="#00C2A8" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IcSim() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="#64B5E8" strokeWidth="1.3" />
      <path d="M5 7h6M5 10h4" stroke="#64B5E8" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function IcRank() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke="#A99EF5" strokeWidth="1.3" />
      <path d="M8 5v3l2 2" stroke="#A99EF5" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function IcStreak() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M8 2l1.8 4.2L14 7l-3 3 .7 4.2L8 12l-3.7 2.2L5 10 2 7l4.2-.8z" stroke="#F5A623" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.[0]) return null;
  return (
    <div style={{
      background: "#0D111C",
      border: "1px solid rgba(61,90,128,0.4)",
      borderRadius: "6px",
      padding: "6px 10px",
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: "10px",
      color: "#E0E6F0",
    }}>
      <span style={{ color: "#00C2A8" }}>{payload[0].value}%</span>
      <span style={{ color: "#8A9AB5", marginLeft: "6px" }}>{label}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { user, profile } = useUser();
  const [activeNav, setActiveNav] = useState("dashboard");
  const [data, setData] = useState<EnamedPredictionData | null>(null);

  const loadData = useCallback(async () => {
    const pred = await calculateEnamedPrediction(user?.id);
    setData(pred);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const scoreGeral = data?.scoreGeralEnamed || 84.5;
  const streak = profile?.streak_days ?? (data?.streakDias || 14);
  const questoesResolvidas = data?.totalQuestoesResolvidas || 142;
  const taxaAcerto = data?.taxaAcertoGeral || 78;

  return (
    <PageShell
      title="Meu Dashboard"
      badgeText="ENAMED · 2027"
      activeNavId={activeNav}
      onNavigate={setActiveNav}
    >
      {/* ── KPI Row ── */}
      <div className="kpi-grid">
        <KPICard
          icon={<IcPred />}
          iconBg="rgba(0,194,168,0.1)"
          label="Predição ENAMED 2027"
          value={<>{scoreGeral}<span style={{ fontSize: "16px", color: "#00C2A8" }}>%</span></>}
          delta="↑ Meta 78%"
          deltaDirection="up"
        />
        <KPICard
          icon={<IcSim />}
          iconBg="rgba(0,119,182,0.1)"
          label="Questões resolvidas"
          value={questoesResolvidas}
          delta={`${taxaAcerto}% acerto`}
          deltaDirection="up"
        />
        <KPICard
          icon={<IcRank />}
          iconBg="rgba(107,92,231,0.1)"
          label="Ranking projetado"
          value={`#${data?.rankingEstimado || 147}`}
          delta="Top 8%"
          deltaDirection="up"
        />
        <KPICard
          icon={<IcStreak />}
          iconBg="rgba(245,166,35,0.1)"
          label="Streak de estudo"
          value={streak}
          delta="🔥 dias seguidos"
          deltaDirection="up"
        />
      </div>

      {/* ── Main Grid: left + right ── */}
      <div className="main-grid">
        {/* ── LEFT COLUMN ── */}
        <div className="col-left">

          {/* 1. Predição de Aprovação */}
          <Card hoverable={false}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "14px", color: "#fff" }}>
                Índice de Prontidão — ENAMED 2027
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--chumbo)" }}>
                Matriz de Competências DCN
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              <ScoreRing score={scoreGeral} size={130} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>
                  {scoreGeral >= 78 ? "Prontidão Elevada ✓" : "Em Evolução"}
                </div>
                <div style={{ fontSize: "12px", color: "var(--chumbo)", lineHeight: "1.5", marginBottom: "12px" }}>
                  Sua pontuação ponderada nas 5 grandes áreas atinge a meta histórica de aprovação para o ENAMED.
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <Badge variant="green">Meta 78% ✓</Badge>
                  <Badge variant="blue">DCNs Alinhadas</Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* 2. Desempenho por Grande Área do ENAMED */}
          <Card hoverable={false}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "14px", color: "#fff" }}>
                Desempenho por Grande Área (ENAMED)
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: "9px", color: "var(--chumbo)", textTransform: "uppercase" }}>
                5 Grandes Eixos
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {(data?.competencias || []).map((comp) => (
                <div key={comp.area}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", color: "var(--neblina)", fontWeight: 500 }}>
                      {comp.area} <span style={{ fontSize: "10px", color: "var(--chumbo)" }}>(Peso {comp.pesoEnamed}%)</span>
                    </span>
                    <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: "11px", color: statusColor(comp.status) }}>
                      {comp.score}%
                    </span>
                  </div>
                  <ProgressBar
                    value={comp.score}
                    variant={comp.status === "excelente" ? "green" : comp.status === "bom" ? "blue" : comp.status === "atencao" ? "warn" : "danger"}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* 3. Atividade da Semana */}
          <Card hoverable={false}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "14px", color: "#fff" }}>
                Atividade da Semana
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: "9px", color: "var(--chumbo)", textTransform: "uppercase" }}>
                Últimos 7 dias
              </span>
            </div>

            {/* Pills de dias da semana */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
              {[
                { d: "S", active: true, today: false },
                { d: "T", active: true, today: false },
                { d: "Q", active: true, today: false },
                { d: "Q", active: false, today: false },
                { d: "S", active: true, today: false },
                { d: "S", active: false, today: false },
                { d: "D", active: false, today: true },
              ].map((item, i) => (
                <div key={i} style={{
                  flex: 1, aspectRatio: "1 / 1", borderRadius: "8px",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  background: item.today
                    ? "rgba(0,194,168,0.15)"
                    : item.active
                    ? "rgba(0,194,168,0.08)"
                    : "rgba(43,58,82,0.25)",
                  border: `1px solid ${item.today ? "rgba(0,194,168,0.5)" : item.active ? "rgba(0,194,168,0.2)" : "rgba(61,90,128,0.2)"}`,
                }}>
                  <span style={{
                    fontFamily: "'IBM Plex Mono'", fontSize: "9px",
                    color: item.active || item.today ? "#00C2A8" : "var(--chumbo)",
                    fontWeight: item.today ? 700 : 400,
                  }}>
                    {item.d}
                  </span>
                  <span style={{ fontSize: "14px", marginTop: "1px" }}>
                    {item.active || item.today ? "●" : "·"}
                  </span>
                </div>
              ))}
            </div>

            {/* Métricas rápidas da semana */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {[
                { label: "Questões", value: "48", icon: "❓", color: "#64B5E8" },
                { label: "Flashcards", value: "120", icon: "🔁", color: "#00C2A8" },
                { label: "Simulados", value: "2", icon: "⏱️", color: "#A99EF5" },
              ].map((m) => (
                <div key={m.label} style={{
                  background: "rgba(43,58,82,0.3)", borderRadius: "8px",
                  border: "1px solid rgba(61,90,128,0.2)",
                  padding: "10px 10px 8px",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: "16px", marginBottom: "4px" }}>{m.icon}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: "15px", fontWeight: 700, color: m.color, lineHeight: 1 }}>
                    {m.value}
                  </div>
                  <div style={{ fontSize: "9px", color: "var(--chumbo)", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="col-right">

          {/* 4. Recomendações da IA */}
          <Card hoverable={false}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "14px", color: "#fff" }}>
                Recomendações da IA
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: "9px", color: "var(--chumbo)", textTransform: "uppercase" }}>
                Prioridade ENAMED
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(data?.alertasEnamed || []).map((rec, i) => (
                <div
                  key={i}
                  style={{
                    padding: "12px 14px",
                    background: "rgba(43,58,82,0.35)",
                    border: "1px solid rgba(61,90,128,0.25)",
                    borderRadius: "10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{
                      fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 700, color: "#fff",
                    }}>
                      {rec.area}
                    </span>
                    <span style={{
                      fontFamily: "'IBM Plex Mono'", fontSize: "9px", fontWeight: 600,
                      padding: "2px 6px", borderRadius: 4,
                      background: rec.pct < 60 ? "rgba(255,107,107,0.12)" : "rgba(0,194,168,0.12)",
                      color: rec.pct < 60 ? "#FF6B6B" : "#00C2A8",
                    }}>
                      {rec.pct}% de domínio
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--chumbo)", lineHeight: "1.45", marginBottom: "8px" }}>
                    {rec.desc}
                  </div>
                  <div style={{
                    fontSize: "10.5px", color: "#E0E6F0", background: "rgba(13,17,28,0.5)",
                    border: "1px solid rgba(61,90,128,0.2)", padding: "5px 8px", borderRadius: "6px",
                  }}>
                    🎯 <strong style={{ color: "#00C2A8" }}>Conduta:</strong> {rec.rec}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 5. Próximo Simulado Recomendado */}
          <Card hoverable={false} style={{
            background: "linear-gradient(135deg, rgba(0,194,168,0.06) 0%, var(--petroleo) 100%)",
            borderColor: "rgba(0,194,168,0.3)",
          }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "14px", color: "#fff", marginBottom: "8px" }}>
              Próxima Ação Recomendada
            </div>
            <div style={{ fontSize: "12px", color: "var(--neblina)", lineHeight: "1.5", marginBottom: "14px" }}>
              Realizar o <strong>Simulado ENAMED — Saúde Coletiva e DCNs</strong> para consolidar seu índice de prontidão.
            </div>
            <a
              href="/simulados"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                padding: "9px 0",
                background: "#00C2A8",
                color: "#0A1A18",
                borderRadius: "8px",
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                fontWeight: 600,
                boxShadow: "0 2px 10px rgba(0,194,168,0.25)",
              }}
            >
              Iniciar Simulado do ENAMED →
            </a>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
