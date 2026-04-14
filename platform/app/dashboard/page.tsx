"use client";

import React, { useState } from "react";
import { PageShell } from "@/components/layout";
import { KPICard, ScoreRing, Card, ProgressBar, HeatmapCell, Badge } from "@/components/ui";
import {
  mockUser,
  mockKPIs,
  mockProgress,
  mockHeatmap,
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

const progressVariant = (pct: number) =>
  pct >= 80 ? "green" : pct >= 65 ? "blue" : pct >= 50 ? "warn" : "danger";

const hmDays = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

/* ── KPI Icons (from medpleni-part3-dashboard.html) ── */
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

/* ── Chart tooltip ── */
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

/* ══════════════════════════════════════════════════════════
   DASHBOARD PAGE
══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const [activeNav, setActiveNav] = useState("dashboard");

  return (
    <PageShell
      title="Meu Dashboard"
      badgeText={`RESID · ${mockUser.provaAlvo[1]} 2026`}
      activeNavId={activeNav}
      onNavigate={setActiveNav}
    >
      {/* ── KPI Row ── */}
      <div className="kpi-grid">
        <KPICard
          icon={<IcPred />}
          iconBg="rgba(0,194,168,0.1)"
          label="Predição de aprovação"
          value={<>{mockKPIs.predicaoAprovacao}<span style={{ fontSize: "16px", color: "#00C2A8" }}>%</span></>}
          delta="↑ 3.1%"
          deltaDirection="up"
        />
        <KPICard
          icon={<IcSim />}
          iconBg="rgba(0,119,182,0.1)"
          label="Simulados realizados"
          value={mockKPIs.simuladosRealizados}
          delta="↑ 8"
          deltaDirection="up"
        />
        <KPICard
          icon={<IcRank />}
          iconBg="rgba(107,92,231,0.1)"
          label="Ranking nacional"
          value={`#${mockKPIs.rankingNacional}`}
          delta="↑ 12"
          deltaDirection="up"
        />
        <KPICard
          icon={<IcStreak />}
          iconBg="rgba(245,166,35,0.1)"
          label="Streak de dias"
          value={mockKPIs.streakDias}
          delta="🔥 14d"
          deltaDirection="up"
        />
      </div>

      {/* ── Main Grid: left + right ── */}
      <div className="main-grid">
        {/* ── LEFT COLUMN ── */}
        <div className="col-left">

          {/* Score de Predição */}
          <Card hoverable={false}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontFamily: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif", fontSize: "14px", fontWeight: 600, color: "#fff" }}>
                Score de Predição de Aprovação
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", letterSpacing: "0.1em", color: "var(--chumbo)", textTransform: "uppercase" }}>
                HSP São Paulo · R1 Clínica Médica
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <ScoreRing score={mockKPIs.predicaoAprovacao} size={130} sublabel="aprovação" />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif", fontSize: "32px", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>
                  Excelente
                </div>
                <div style={{ fontSize: "12px", color: "var(--chumbo)", marginTop: "4px", lineHeight: 1.5 }}>
                  Você está no <strong style={{ color: "#fff" }}>top 8%</strong> dos candidatos ao HSP 2026.<br />
                  Acerto geral: <strong style={{ color: "#fff" }}>81.4%</strong> · Meta: 78%
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
                  <Badge variant="green">Psiquiatria ✓</Badge>
                  <Badge variant="green">Clínica Méd. ✓</Badge>
                  <Badge variant="warn">Pediatria ~</Badge>
                  <Badge variant="danger">GO atenção</Badge>
                </div>
                <div style={{ marginTop: "12px", fontSize: "11px", color: "var(--chumbo)" }}>
                  Atualizado há 2h · baseado em 63 simulados · 3.840 questões respondidas
                </div>
              </div>
            </div>
          </Card>

          {/* Heatmap de Lacunas */}
          <Card hoverable={false}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontFamily: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif", fontSize: "14px", fontWeight: 600, color: "#fff" }}>
                Heatmap de Lacunas por Área
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", letterSpacing: "0.1em", color: "var(--chumbo)", textTransform: "uppercase" }}>
                Últimas 4 semanas
              </span>
            </div>
            {/* Day labels */}
            <div style={{ display: "grid", gridTemplateColumns: "80px repeat(7, 1fr)", marginBottom: "4px" }}>
              <div />
              {hmDays.map(d => (
                <div key={d} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "8px", letterSpacing: "0.08em", color: "rgba(138,154,181,0.5)", textAlign: "center", textTransform: "uppercase" }}>
                  {d}
                </div>
              ))}
            </div>
            {/* Rows */}
            {mockHeatmap.map((row, ri) => (
              <div key={ri} style={{ display: "grid", gridTemplateColumns: "80px repeat(7, 1fr)", gap: "3px", marginBottom: "3px", alignItems: "center" }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", letterSpacing: "0.04em", color: "var(--chumbo)", paddingRight: "8px", textAlign: "right", whiteSpace: "nowrap" }}>
                  {row.area}
                </div>
                {row.dias.map((h, ci) => (
                  <HeatmapCell key={ci} intensity={h as 0|1|2|3|4|5} tooltip={`${row.area} — ${hmDays[ci]}`} delay={ri * 7 + ci} />
                ))}
              </div>
            ))}
            {/* Legend */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(61,90,128,0.15)" }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", color: "var(--chumbo)" }}>Menos</span>
              {([0,1,2,3,4,5] as const).map(i => (
                <HeatmapCell key={i} intensity={i} style={{ width: "16px", height: "10px", aspectRatio: "unset", minWidth: "unset" }} />
              ))}
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", color: "var(--chumbo)" }}>Mais</span>
              <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--chumbo)" }}>
                ⚠ GO e Pediatria precisam de atenção esta semana
              </span>
            </div>
          </Card>

          {/* Evolução do Score — Recharts */}
          <Card hoverable={false}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontFamily: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif", fontSize: "14px", fontWeight: 600, color: "#fff" }}>
                Evolução do Score de Predição
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", letterSpacing: "0.1em", color: "var(--chumbo)", textTransform: "uppercase" }}>
                Últimos 8 simulados
              </span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={mockScoreEvolution} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00C2A8" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#00C2A8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="simulado"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, fill: "#8A9AB5" }}
                />
                <YAxis
                  domain={[60, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, fill: "#8A9AB5" }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <RTooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#00C2A8"
                  strokeWidth={2}
                  fill="url(#chartGrad)"
                  dot={{ r: 3.5, fill: "#00C2A8", stroke: "none" }}
                  activeDot={{ r: 5, fill: "#00C2A8", stroke: "#0D111C", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* ── RIGHT COLUMN (300px) ── */}
        <div className="col-right">

          {/* Desempenho por área */}
          <Card hoverable={false}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontFamily: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif", fontSize: "14px", fontWeight: 600, color: "#fff" }}>Por área</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", letterSpacing: "0.1em", color: "var(--chumbo)", textTransform: "uppercase" }}>Acerto %</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {mockProgress.map((p) => (
                <div key={p.area}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ color: "var(--neblina)" }}>{p.area}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", color: statusColor(p.status) }}>
                      {p.percentualAcerto}%
                    </span>
                  </div>
                  <ProgressBar value={p.percentualAcerto} variant={progressVariant(p.percentualAcerto) as any} />
                </div>
              ))}
            </div>
          </Card>

          {/* Recomendações IA */}
          <Card hoverable={false}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontFamily: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif", fontSize: "14px", fontWeight: 600, color: "#fff" }}>Recomendações IA</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", letterSpacing: "0.1em", color: "var(--chumbo)", textTransform: "uppercase" }}>Prioridade alta</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {mockRecommendations.slice(0, 3).map((r) => (
                <div key={r.rank} style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                  padding: "12px",
                  background: "rgba(26,31,46,0.6)",
                  border: "1px solid rgba(61,90,128,0.2)",
                  borderRadius: "10px",
                }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px", letterSpacing: "0.1em", color: "var(--pulso)", minWidth: "20px", paddingTop: "1px" }}>
                    {String(r.rank).padStart(2, "0")}
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#fff", marginBottom: "3px" }}>{r.titulo}</div>
                    <div style={{ fontSize: "11px", color: "var(--chumbo)", lineHeight: 1.5 }}>{r.descricao}</div>
                    <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                      <Badge variant={statusVariant(r.status) as any}>
                        {r.status === "critico" ? "Crítico" : r.status === "atencao" ? "Moderado" : "Preventivo"}
                      </Badge>
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: "9px",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        padding: "2px 7px",
                        borderRadius: "9999px",
                        background: "rgba(61,90,128,0.15)",
                        color: "var(--chumbo)",
                      }}>
                        {r.totalQuestoes} questões
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button style={{
              marginTop: "12px",
              width: "100%",
              padding: "9px",
              background: "rgba(0,194,168,0.08)",
              border: "1.5px solid rgba(0,194,168,0.2)",
              borderRadius: "8px",
              fontFamily: "'Inter', sans-serif",
              fontSize: "12px",
              fontWeight: 600,
              color: "#00C2A8",
              cursor: "pointer",
            }}>
              Iniciar simulado focado →
            </button>
          </Card>

          {/* Próxima prova */}
          <Card hoverable={false} style={{
            background: "linear-gradient(135deg, rgba(0,119,182,0.08) 0%, rgba(0,194,168,0.04) 100%)",
            borderColor: "rgba(0,119,182,0.2)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontFamily: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif", fontSize: "14px", fontWeight: 600, color: "#64B5E8" }}>
                RESID · USP 2026
              </span>
              <Badge variant="green">Meta atingida</Badge>
            </div>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "32px", color: "#fff", lineHeight: 1 }}>47</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", letterSpacing: "0.1em", color: "var(--chumbo)", textTransform: "uppercase", marginTop: "2px" }}>dias</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "12px", color: "var(--chumbo)" }}>Prova em 47 dias · 23 Mar 2026</div>
                <div style={{ height: "4px", background: "rgba(61,90,128,0.2)", borderRadius: "9999px", margin: "8px 0", overflow: "hidden" }}>
                  <div style={{ width: "74%", height: "100%", background: "#64B5E8", borderRadius: "9999px" }} />
                </div>
                <div style={{ fontSize: "11px", color: "var(--chumbo)" }}>74% do plano de estudos concluído</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
