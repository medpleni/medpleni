"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout";
import { Badge, Card } from "@/components/ui";
import { mockSimulados } from "@/lib/mock-data";

/* ═══════════════════════════════════════════
   LISTA DE SIMULADOS — /simulados
═══════════════════════════════════════════ */

const V = {
  pu: "#00C2A8", re: "#0077B6", ind: "#6B5CE7", am: "#C98A0A",
  ch: "#8A9AB5", nb: "#E0E6F0", pe: "#2B3A52",
  wn: "#F5A623", dg: "#FF6B6B", su: "#22C55E",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
};

const instColor: Record<string, string> = {
  USP: V.re, UNIFESP: V.ind, ENARE: V.pu, UERJ: V.wn,
  FMABC: V.am, ENAMED: V.re, REVALIDA: V.ind,
};

const statusLabel: Record<string, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

const statusVariant: Record<string, string> = {
  nao_iniciado: "neutral",
  em_andamento: "warn",
  concluido: "green",
};

const filterOpts = ["Todos", "USP", "UNIFESP", "ENARE", "UERJ"];
const statusOpts = ["Todos", "Não iniciado", "Em andamento", "Concluído"];

const fmtDuration = (m: number) => {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? `${h}h${mm > 0 ? `${mm}min` : ""}` : `${mm}min`;
};

export default function SimuladosPage() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("simulados");
  const [instFilter, setInstFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");

  const filtered = useMemo(() => {
    return mockSimulados.filter((s) => {
      if (instFilter !== "Todos" && s.instituicao !== instFilter) return false;
      if (statusFilter !== "Todos" && statusLabel[s.status] !== statusFilter) return false;
      return true;
    });
  }, [instFilter, statusFilter]);

  const chipStyle = (selected: boolean): React.CSSProperties => ({
    padding: "5px 12px", borderRadius: 9999,
    background: selected ? "rgba(0,194,168,0.12)" : "rgba(43,58,82,0.5)",
    border: `1.5px solid ${selected ? "rgba(0,194,168,0.35)" : "rgba(61,90,128,0.25)"}`,
    color: selected ? V.pu : V.ch,
    fontFamily: V.dm, fontSize: 10, letterSpacing: "0.08em",
    cursor: "pointer", transition: "all 0.15s", textTransform: "uppercase" as const,
  });

  return (
    <PageShell title="Simulados" badgeText={`${mockSimulados.length} disponíveis`} activeNavId={activeNav} onNavigate={setActiveNav}>
      {/* ── FILTER BAR ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
        <span style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", color: V.ch, textTransform: "uppercase" }}>
          Filtrar:
        </span>
        {filterOpts.map((f) => (
          <span key={f} style={chipStyle(instFilter === f)} onClick={() => setInstFilter(f)}>{f}</span>
        ))}
        <span style={{ width: 1, height: 16, background: "rgba(61,90,128,0.3)" }} />
        {statusOpts.map((s) => (
          <span key={s} style={chipStyle(statusFilter === s)} onClick={() => setStatusFilter(s)}>{s}</span>
        ))}
      </div>

      {/* ── SIMULADO GRID ── */}
      <div className="simulado-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 14,
      }}>
        <style>{`
          @media (max-width:1024px) { .simulado-grid { grid-template-columns: repeat(2,1fr) !important; } }
          @media (max-width:640px) { .simulado-grid { grid-template-columns: 1fr !important; } }
        `}</style>

        {filtered.map((s) => {
          const ic = instColor[s.instituicao] || V.ch;
          return (
            <div key={s.id} style={{
              background: V.pe, border: "1px solid rgba(61,90,128,0.2)",
              borderRadius: 14, padding: "20px", transition: "all 0.2s",
              position: "relative", overflow: "hidden",
            }}>
              {/* Top accent bar */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, ${ic} 0%, ${ic}40 100%)`,
              }} />

              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{
                  fontFamily: V.dm, fontSize: 10, letterSpacing: "0.1em",
                  padding: "3px 8px", borderRadius: 6,
                  background: `${ic}15`, color: ic, border: `1px solid ${ic}30`,
                }}>
                  {s.instituicao}
                </span>
                <Badge variant={statusVariant[s.status] as any}>
                  {statusLabel[s.status]}
                </Badge>
              </div>

              {/* Title */}
              <div style={{ fontFamily: V.df, fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 6, lineHeight: 1.4 }}>
                {s.titulo}
              </div>

              {/* Description */}
              {s.descricao && (
                <div style={{ fontSize: 12, color: V.ch, lineHeight: 1.5, marginBottom: 14, minHeight: 36 }}>
                  {s.descricao}
                </div>
              )}

              {/* Stats */}
              <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: V.ch }}>Questões</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: V.nb }}>{s.totalQuestoes}</div>
                </div>
                <div>
                  <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: V.ch }}>Tempo</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: V.nb }}>{fmtDuration(s.duracaoMinutos)}</div>
                </div>
                {s.status === "concluido" && s.percentualAcerto !== undefined && (
                  <div>
                    <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: V.ch }}>Score</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: s.percentualAcerto >= 75 ? V.pu : s.percentualAcerto >= 60 ? V.wn : V.dg }}>
                      {s.percentualAcerto}%
                    </div>
                  </div>
                )}
              </div>

              {/* CTA */}
              {s.status !== "concluido" ? (
                <button onClick={() => router.push(`/simulado/${s.id}`)} style={{
                  width: "100%", padding: "9px 0", borderRadius: 8,
                  background: V.pu, border: "none", color: "#0A1A18",
                  fontFamily: V.db, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 2px 12px rgba(0,194,168,0.25)",
                }}>
                  {s.status === "em_andamento" ? "Continuar →" : "Iniciar →"}
                </button>
              ) : (
                <button onClick={() => router.push(`/simulado/${s.id}`)} style={{
                  width: "100%", padding: "9px 0", borderRadius: 8,
                  background: "transparent", border: "1.5px solid rgba(61,90,128,0.3)",
                  color: V.ch, fontFamily: V.db, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>
                  Revisar questões
                </button>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: V.ch, fontSize: 14 }}>
          Nenhum simulado encontrado com esses filtros.
        </div>
      )}
    </PageShell>
  );
}
