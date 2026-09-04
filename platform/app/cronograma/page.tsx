"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PageShell } from "@/components/layout";
import { Badge } from "@/components/ui";
import { useUser } from "@/lib/supabase/use-user";
import { generateAdaptiveWeeklySchedule } from "@/lib/supabase/schedule";
import type { DiaEstudo } from "@/lib/types";

const V = {
  pu: "var(--pulso)", re: "var(--resid)", rel: "var(--resid-light)", ind: "var(--indigo)",
  ch: "var(--chumbo)", nb: "var(--neblina)", pe: "var(--petroleo)", am: "var(--ambar)",
  wn: "var(--warn)", dg: "var(--danger)",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
  heading: "var(--heading-color)",
  cardBg: "var(--card-bg)",
  cardBorder: "var(--card-border)",
  inputBg: "var(--input-bg)",
  sinal: "var(--sinal)",
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

export default function CronogramaPage() {
  const { profile } = useUser();
  const [activeNav, setActiveNav] = useState("cronograma");
  const [schedule, setSchedule] = useState<DiaEstudo[]>([]);
  const [reajusting, setReajusting] = useState(false);
  const [lastAdjusted, setLastAdjusted] = useState("Hoje");

  useEffect(() => {
    const s = generateAdaptiveWeeklySchedule({ profile });
    setSchedule(s);
  }, [profile]);

  const handleReajust = () => {
    setReajusting(true);
    setTimeout(() => {
      const s = generateAdaptiveWeeklySchedule({ profile });
      setSchedule(s);
      setReajusting(false);
      setLastAdjusted(`Agora · ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`);
    }, 600);
  };

  return (
    <PageShell
      title="Cronograma de Estudos"
      badgeText={`Meta: ${profile?.weekly_study_hours || 20}h/semana`}
      activeNavId={activeNav}
      onNavigate={setActiveNav}
    >
      {/* ── Header bar ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Badge variant="green">Ajustado pela IA</Badge>
          <span style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.08em", color: V.ch }}>
            Último ajuste: {lastAdjusted} · Foco: 70% lacunas / 30% manutenção
          </span>
        </div>
        <button
          onClick={handleReajust}
          disabled={reajusting}
          style={{
            padding: "8px 18px", borderRadius: 8,
            background: "transparent", border: "1.5px solid rgba(0,194,168,0.3)",
            color: V.pu, fontFamily: V.db, fontSize: 12, fontWeight: 600, cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {reajusting ? "Recalculando..." : "Reajustar cronograma"}
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

            {schedule.map((dia) => (
              <div key={dia.dia} style={{
                background: "var(--card-bg)", border: "1px solid var(--card-border)",
                boxShadow: "var(--card-shadow)",
                borderRadius: 12, padding: "12px", minHeight: 200,
              }}>
                {/* Day header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontFamily: V.df, fontSize: 13, fontWeight: 600, color: "var(--heading-color)" }}>
                    {dia.diaSemana.slice(0, 3)}
                  </span>
                  <span style={{ fontFamily: V.dm, fontSize: 9, color: "var(--chumbo)" }}>
                    {dia.dia.slice(8)}
                  </span>
                </div>

                {/* Blocks */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {dia.blocos.map((b, i) => {
                    const bc = areaColor[b.area] || V.ch;
                    return (
                      <div key={i} style={{
                        padding: "9px 10px", borderRadius: 8,
                        background: "var(--input-bg)",
                        border: "1px solid var(--card-border)",
                        transition: "all 0.15s",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{
                            fontFamily: V.dm, fontSize: 9, fontWeight: 600, color: bc,
                            background: `${bc}15`, padding: "2px 5px", borderRadius: 4,
                          }}>
                            {b.horario}
                          </span>
                          <span style={{ fontSize: 11 }}>{tipoIcon[b.tipo]}</span>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--heading-color)", lineHeight: 1.3, marginBottom: 2 }}>
                          {b.area}
                        </div>
                        <div style={{ fontSize: 9.5, color: "var(--chumbo)", lineHeight: 1.3 }}>
                          {b.descricao}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Summary */}
        <div className="col-right">
          {/* Distribuição */}
          <div style={{
            background: "var(--card-bg)", border: "1px solid var(--card-border)",
            boxShadow: "var(--card-shadow)",
            borderRadius: 14, padding: "20px", marginBottom: 14,
          }}>
            <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: "var(--heading-color)", marginBottom: 14 }}>
              Distribuição da Semana
            </div>
            {/* Donut bar */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", height: 8, borderRadius: 9999, overflow: "hidden", gap: 2 }}>
                <div style={{ width: "70%", background: V.dg, borderRadius: "9999px 0 0 9999px" }} />
                <div style={{ width: "30%", background: V.pu, borderRadius: "0 9999px 9999px 0" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontFamily: V.dm, fontSize: 10, color: V.dg }}>70% Lacunas (SC, GO, Cirurgia)</span>
                <span style={{ fontFamily: V.dm, fontSize: 10, color: V.pu }}>30% Manutenção (CM, Ped)</span>
              </div>
            </div>
            {/* Legend */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--card-border)", paddingTop: 12 }}>
              {[
                { tipo: "simulado", label: "Simulados cronometrados", horas: "9h30" },
                { tipo: "questoes", label: "Blocos de questões", horas: "6h30" },
                { tipo: "revisao", label: "Revisão ativa", horas: "6h00" },
                { tipo: "flashcards", label: "Flashcards SRS", horas: "2h00" },
              ].map((t) => (
                <div key={t.tipo} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{tipoIcon[t.tipo]}</span>
                    <span style={{ fontSize: 12, color: "var(--neblina)" }}>{t.label}</span>
                  </div>
                  <span style={{ fontFamily: V.dm, fontSize: 11, color: "var(--chumbo)" }}>{t.horas}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dica da IA */}
          <div style={{
            background: "linear-gradient(135deg, rgba(0,194,168,0.06) 0%, rgba(0,119,182,0.04) 100%)",
            border: "1px solid rgba(0,194,168,0.2)",
            borderRadius: 14, padding: "16px",
          }}>
            <div style={{ fontFamily: V.df, fontSize: 13, fontWeight: 600, color: V.pu, marginBottom: 6 }}>
              💡 Recomendação da IA MedPleni
            </div>
            <div style={{ fontSize: 12, color: "var(--neblina)", lineHeight: 1.6 }}>
              Concentre seu estudo de <strong>Saúde Coletiva</strong> nos flashcards matinais e resolva o simulado de <strong>Trauma (Cirurgia)</strong> na quarta-feira para consolidar o índice de corte da sua banca.
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
