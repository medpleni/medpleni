"use client";

import React, { useState } from "react";
import { PageShell } from "@/components/layout";
import { Card, Badge } from "@/components/ui";
import { mockSchedule } from "@/lib/mock-data";

const V = {
  pu: "#00C2A8", re: "#0077B6", rel: "#64B5E8", ind: "#6B5CE7",
  ch: "#8A9AB5", nb: "#E0E6F0", pe: "#2B3A52", am: "#C98A0A",
  wn: "#F5A623", dg: "#FF6B6B",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
};

const areaColor: Record<string, string> = {
  "Clínica Médica": V.pu, "Cirurgia Geral": V.re,
  "Saúde Coletiva": V.ind, "Pediatria": V.wn,
  "Ginecologia e Obstetrícia": V.dg, "Psiquiatria": "#A99EF5",
};

const tipoIcon: Record<string, string> = {
  simulado: "📝", questoes: "❓", revisao: "📖", flashcards: "🔁", descanso: "☕",
};

const tipoLabel: Record<string, string> = {
  simulado: "Simulado", questoes: "Questões", revisao: "Revisão", flashcards: "Flashcards", descanso: "Descanso",
};

/* Donut chart data */
const donutData = [
  { label: "Lacunas", pct: 70, color: V.dg },
  { label: "Manutenção", pct: 30, color: V.pu },
];

export default function CronogramaPage() {
  const [activeNav, setActiveNav] = useState("cronograma");

  return (
    <PageShell title="Cronograma de Estudos" badgeText="Semana 14 · Abr 2026" activeNavId={activeNav} onNavigate={setActiveNav}>
      {/* ── Header bar ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Badge variant="green">Ajustado pela IA</Badge>
          <span style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.08em", color: V.ch }}>
            Último ajuste: 12/04/2026 · 14:32
          </span>
        </div>
        <button style={{
          padding: "8px 18px", borderRadius: 8,
          background: "transparent", border: "1.5px solid rgba(0,194,168,0.3)",
          color: V.pu, fontFamily: V.db, fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>
          Reajustar cronograma
        </button>
      </div>

      <div className="main-grid">
        {/* LEFT — Calendar */}
        <div className="col-left">
          {/* Week grid */}
          <div className="cronograma-grid" style={{
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8,
          }}>
            <style>{`
              @media (max-width:1024px) { .cronograma-grid { grid-template-columns: repeat(3,1fr) !important; } }
              @media (max-width:640px) { .cronograma-grid { grid-template-columns: 1fr !important; } }
            `}</style>

            {mockSchedule.map((dia) => (
              <div key={dia.dia} style={{
                background: V.pe, border: "1px solid rgba(61,90,128,0.2)",
                borderRadius: 12, padding: "12px", minHeight: 200,
              }}>
                {/* Day header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontFamily: V.df, fontSize: 13, fontWeight: 600, color: "#fff" }}>
                    {dia.diaSemana.slice(0, 3)}
                  </span>
                  <span style={{ fontFamily: V.dm, fontSize: 9, color: V.ch }}>
                    {dia.dia.slice(8)}
                  </span>
                </div>

                {/* Blocks */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {dia.blocos.map((b, i) => {
                    const bc = areaColor[b.area] || V.ch;
                    return (
                      <div key={i} style={{
                        padding: "8px 10px", borderRadius: 8,
                        background: `${bc}10`, borderLeft: `3px solid ${bc}`,
                        transition: "all 0.15s",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ fontFamily: V.dm, fontSize: 9, color: bc }}>{b.horario}</span>
                          <span style={{ fontSize: 10 }}>{tipoIcon[b.tipo]}</span>
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: V.nb, lineHeight: 1.3, marginBottom: 2 }}>
                          {tipoLabel[b.tipo]}
                        </div>
                        <div style={{ fontSize: 9, color: V.ch, lineHeight: 1.3 }}>
                          {b.area.length > 16 ? b.area.slice(0, 14) + "…" : b.area}
                        </div>
                        <div style={{ fontFamily: V.dm, fontSize: 8, color: "rgba(138,154,181,0.4)", marginTop: 2 }}>
                          {b.duracao}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Stats */}
        <div className="col-right">
          {/* Donut */}
          <Card hoverable={false}>
            <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 14 }}>
              Distribuição do Plano
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                {/* Background */}
                <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(61,90,128,0.15)" strokeWidth="14" />
                {/* Lacunas (70%) */}
                <circle cx="60" cy="60" r="45" fill="none" stroke={V.dg} strokeWidth="14"
                  strokeDasharray={`${0.7 * 283} ${0.3 * 283}`}
                  strokeLinecap="round" transform="rotate(-90 60 60)" />
                {/* Manutenção (30%) */}
                <circle cx="60" cy="60" r="45" fill="none" stroke={V.pu} strokeWidth="14"
                  strokeDasharray={`${0.3 * 283} ${0.7 * 283}`}
                  strokeDashoffset={`-${0.7 * 283}`}
                  strokeLinecap="round" transform="rotate(-90 60 60)" />
                <text x="60" y="56" textAnchor="middle" fontFamily={V.dm} fontSize="10" fill={V.ch}>foco</text>
                <text x="60" y="70" textAnchor="middle" fontFamily={V.dm} fontSize="14" fill="#fff" fontWeight="600">70/30</text>
              </svg>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
              {donutData.map((d) => (
                <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                  <span style={{ fontFamily: V.dm, fontSize: 10, color: V.ch }}>{d.label} {d.pct}%</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Weekly stats */}
          <Card hoverable={false}>
            <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 14 }}>
              Resumo Semanal
            </div>
            {[
              { label: "Horas planejadas", value: "22h30", color: V.nb },
              { label: "Simulados", value: "4", color: V.pu },
              { label: "Questões", value: "~280", color: V.rel },
              { label: "Flashcards", value: "4 sessões", color: V.ind },
              { label: "Revisões", value: "5 blocos", color: V.wn },
              { label: "Descanso", value: "Domingo", color: V.ch },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(61,90,128,0.1)" }}>
                <span style={{ fontSize: 12, color: V.ch }}>{s.label}</span>
                <span style={{ fontFamily: V.dm, fontSize: 12, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </Card>

          {/* Legend */}
          <Card hoverable={false}>
            <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 12 }}>
              Legenda por Área
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(areaColor).map(([area, color]) => (
                <div key={area} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: V.nb }}>{area}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
