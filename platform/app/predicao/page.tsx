"use client";

import React, { useState } from "react";
import { PageShell } from "@/components/layout";
import { ScoreRing, Card, Badge, ProgressBar } from "@/components/ui";
import { mockKPIs } from "@/lib/mock-data";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer,
  Tooltip as RTooltip, CartesianGrid,
} from "recharts";

const V = {
  pu: "#00C2A8", re: "#0077B6", rel: "#64B5E8", ind: "#6B5CE7",
  ch: "#8A9AB5", nb: "#E0E6F0", pe: "#2B3A52",
  wn: "#F5A623", dg: "#FF6B6B", su: "#22C55E",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
};

const provas = [
  { nome: "ENARE 2026", score: 94.7, trend: "up", status: "excelente", meta: 78 },
  { nome: "USP — HSP 2026", score: 91.2, trend: "up", status: "excelente", meta: 82 },
  { nome: "UNIFESP 2026", score: 88.5, trend: "up", status: "bom", meta: 80 },
  { nome: "Sírio-Libanês 2026", score: 85.1, trend: "stable", status: "bom", meta: 85 },
  { nome: "Einstein 2026", score: 82.3, trend: "down", status: "atencao", meta: 84 },
  { nome: "FMABC 2026", score: 89.8, trend: "up", status: "excelente", meta: 76 },
];

const projection = [
  { semana: "Atual", score: 94.7, meta: 82 },
  { semana: "S+1", score: 95.1, meta: 82 },
  { semana: "S+2", score: 95.4, meta: 82 },
  { semana: "S+3", score: 95.8, meta: 82 },
  { semana: "S+4", score: 96.0, meta: 82 },
  { semana: "S+5", score: 96.3, meta: 82 },
  { semana: "S+6", score: 96.5, meta: 82 },
  { semana: "S+7", score: 96.8, meta: 82 },
  { semana: "S+8", score: 97.0, meta: 82 },
];

const alerts = [
  { area: "Ginecologia e Obstetrícia", pct: 38, desc: "Abaixo do threshold de 60%. Pré-eclâmpsia e DHEG concentram 68% dos erros.", rec: "Simulado focado GO + 20 questões/dia por 2 semanas" },
  { area: "Pediatria", pct: 45, desc: "Taxa de acerto caindo nas últimas 2 semanas. Bronquiolite e convulsão febril são os gaps.", rec: "Revisão ativa + flashcards de urgência pediátrica" },
  { area: "Saúde Coletiva", pct: 58, desc: "Abaixo da média para ENARE (que cobra 15% SC). Portarias e epidemiologia.", rec: "Bloco semanal dedicado + flashcards SUS" },
];

const trendIcon = (t: string) => t === "up" ? "↑" : t === "down" ? "↓" : "→";
const trendColor = (t: string) => t === "up" ? V.pu : t === "down" ? V.dg : V.wn;
const statusVariant = (s: string) => s === "excelente" ? "green" : s === "bom" ? "blue" : s === "atencao" ? "warn" : "danger";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.[0]) return null;
  return (
    <div style={{
      background: "#0D111C", border: "1px solid rgba(61,90,128,0.4)",
      borderRadius: 6, padding: "6px 10px", fontFamily: V.dm, fontSize: 10, color: V.nb,
    }}>
      <span style={{ color: V.pu }}>{payload[0].value}%</span>
      <span style={{ color: V.ch, marginLeft: 6 }}>{label}</span>
    </div>
  );
}

export default function PredicaoPage() {
  const [activeNav, setActiveNav] = useState("predicao");

  return (
    <PageShell title="Predição de Aprovação" badgeText="Atualizado há 2h" activeNavId={activeNav} onNavigate={setActiveNav}>
      <div className="main-grid">
        {/* LEFT */}
        <div className="col-left">
          {/* Score central */}
          <Card hoverable={false}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <ScoreRing score={mockKPIs.predicaoAprovacao} size={150} sublabel="aprovação geral" />
              <div>
                <div style={{ fontFamily: V.df, fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
                  Excelente
                </div>
                <div style={{ fontSize: 13, color: V.ch, lineHeight: 1.6, marginTop: 4 }}>
                  Baseado em <strong style={{ color: "#fff" }}>63 simulados</strong> e <strong style={{ color: "#fff" }}>3.840 questões</strong>.
                  Você está no <strong style={{ color: V.pu }}>top 8%</strong> dos candidatos.
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <Badge variant="green">Meta ENARE ✓</Badge>
                  <Badge variant="green">Meta USP ✓</Badge>
                  <Badge variant="warn">Einstein ~</Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Tabela de provas */}
          <Card hoverable={false}>
            <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 14 }}>
              Score por Prova-Alvo
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Prova", "Score", "Trend", "Meta", "Status"].map((h) => (
                      <th key={h} style={{
                        fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
                        color: V.ch, textAlign: "left", padding: "8px 10px",
                        borderBottom: "1px solid rgba(61,90,128,0.2)",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {provas.map((p) => (
                    <tr key={p.nome} style={{ borderBottom: "1px solid rgba(61,90,128,0.1)" }}>
                      <td style={{ padding: "10px", fontSize: 13, color: V.nb }}>{p.nome}</td>
                      <td style={{ padding: "10px", fontFamily: V.dm, fontSize: 14, fontWeight: 600, color: "#fff" }}>
                        {p.score}%
                      </td>
                      <td style={{ padding: "10px", fontSize: 16, color: trendColor(p.trend) }}>
                        {trendIcon(p.trend)}
                      </td>
                      <td style={{ padding: "10px", fontFamily: V.dm, fontSize: 11, color: V.ch }}>
                        {p.meta}%
                      </td>
                      <td style={{ padding: "10px" }}>
                        <Badge variant={statusVariant(p.status) as any}>
                          {p.status === "excelente" ? "Acima" : p.status === "bom" ? "Na meta" : "Atenção"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Projeção */}
          <Card hoverable={false}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: "#fff" }}>
                Projeção de Score — Próximas 8 Semanas
              </span>
              <span style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.1em", color: V.ch, textTransform: "uppercase" }}>
                Modelo preditivo v3.1
              </span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={projection} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid stroke="rgba(61,90,128,0.1)" strokeDasharray="3 3" />
                <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fontFamily: V.dm, fontSize: 8, fill: V.ch }} />
                <YAxis domain={[80, 100]} axisLine={false} tickLine={false} tick={{ fontFamily: V.dm, fontSize: 8, fill: V.ch }} tickFormatter={(v: number) => `${v}%`} />
                <RTooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="meta" stroke="rgba(245,166,35,0.4)" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
                <Line type="monotone" dataKey="score" stroke={V.pu} strokeWidth={2.5} dot={{ r: 3.5, fill: V.pu, stroke: "none" }} activeDot={{ r: 5, fill: V.pu, stroke: "#0D111C", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: V.dm, fontSize: 9, color: V.ch }}>
                <span style={{ width: 12, height: 2, background: V.pu, borderRadius: 2 }} /> Score projetado
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: V.dm, fontSize: 9, color: V.ch }}>
                <span style={{ width: 12, height: 2, background: V.wn, borderRadius: 2, opacity: 0.4 }} /> Meta mínima
              </span>
            </div>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="col-right">
          <Card hoverable={false} style={{ background: "linear-gradient(135deg, rgba(255,107,107,0.06) 0%, rgba(43,58,82,1) 100%)", borderColor: "rgba(255,107,107,0.2)" }}>
            <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: V.dg, marginBottom: 14 }}>
              ⚠ Alertas de Risco
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {alerts.map((a) => (
                <div key={a.area} style={{
                  padding: "12px", background: "rgba(26,31,46,0.6)",
                  border: "1px solid rgba(61,90,128,0.15)", borderRadius: 10,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{a.area}</span>
                    <span style={{ fontFamily: V.dm, fontSize: 12, fontWeight: 600, color: a.pct < 50 ? V.dg : V.wn }}>{a.pct}%</span>
                  </div>
                  <ProgressBar value={a.pct} variant={a.pct < 50 ? "danger" : "warn"} />
                  <div style={{ fontSize: 11, color: V.ch, lineHeight: 1.5, marginTop: 8 }}>{a.desc}</div>
                  <div style={{
                    marginTop: 8, padding: "8px 10px", borderRadius: 6,
                    background: "rgba(0,194,168,0.06)", border: "1px solid rgba(0,194,168,0.12)",
                    fontSize: 11, color: V.pu, lineHeight: 1.5,
                  }}>
                    💡 {a.rec}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
