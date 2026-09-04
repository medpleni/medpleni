"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageShell } from "@/components/layout";
import { ScoreRing, Card, Badge, ProgressBar } from "@/components/ui";
import { useUser } from "@/lib/supabase/use-user";
import {
  calculateEnamedPrediction,
  type EnamedPredictionData,
} from "@/lib/supabase/prediction";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer,
  Tooltip as RTooltip, CartesianGrid,
} from "recharts";

const V = {
  pu: "var(--pulso)", re: "var(--resid)", rel: "var(--resid-light)", ind: "var(--indigo)",
  ch: "var(--chumbo)", nb: "var(--neblina)", pe: "var(--petroleo)",
  wn: "var(--warn)", dg: "var(--danger)", su: "var(--success)",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
  heading: "var(--heading-color)",
  cardBg: "var(--card-bg)",
  cardBorder: "var(--card-border)",
  inputBg: "var(--input-bg)",
  sinal: "var(--sinal)",
};

const statusVariant = (s: string) =>
  s === "excelente" ? "green" : s === "bom" ? "blue" : s === "atencao" ? "warn" : "danger";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.[0]) return null;
  return (
    <div style={{
      background: "var(--card-bg)", border: "1px solid var(--sinal)",
      boxShadow: "var(--card-shadow)",
      borderRadius: 6, padding: "6px 10px", fontFamily: V.dm, fontSize: 10, color: "var(--neblina)",
    }}>
      <span style={{ color: V.pu }}>{payload[0].value}%</span>
      <span style={{ color: V.ch, marginLeft: 6 }}>{label}</span>
    </div>
  );
}

export default function PredicaoPage() {
  const { user } = useUser();
  const [activeNav, setActiveNav] = useState("predicao");
  const [data, setData] = useState<EnamedPredictionData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const pred = await calculateEnamedPrediction(user?.id);
    setData(pred);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !data) {
    return (
      <PageShell title="Predição ENAMED 2027" badgeText="Calculando..." activeNavId={activeNav} onNavigate={setActiveNav}>
        <div style={{ textAlign: "center", padding: 60, color: V.ch }}>
          Processando matriz de competências do ENAMED...
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Predição de Desempenho — ENAMED 2027"
      badgeText="Ciclo de Preparação 2027"
      activeNavId={activeNav}
      onNavigate={setActiveNav}
    >
      <div className="main-grid">
        {/* LEFT */}
        <div className="col-left">
          {/* Score central ENAMED */}
          <Card hoverable={false}>
            <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
              <ScoreRing score={data.scoreGeralEnamed} size={150} sublabel="Índice ENAMED" />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontFamily: V.df, fontSize: 24, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
                    {data.statusGeral}
                  </span>
                  <Badge variant={data.scoreGeralEnamed >= 78 ? "green" : "warn"}>
                    {data.scoreGeralEnamed >= 78 ? "Meta 2027 Atingida ✓" : "Em Evolução"}
                  </Badge>
                </div>

                <div style={{ fontSize: 13, color: V.ch, lineHeight: 1.6, marginTop: 6 }}>
                  Predição calibrada sobre a **Matriz de Competências do INEP / DCNs**.
                  Você está no <strong style={{ color: V.pu }}>Top {100 - data.percentilNacional}%</strong> dos candidatos projetados para o ciclo 2027.
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <span style={{
                    fontFamily: V.dm, fontSize: 10, padding: "3px 8px", borderRadius: 6,
                    background: "rgba(0,194,168,0.1)", color: V.pu, border: "1px solid rgba(0,194,168,0.25)",
                  }}>
                    Nota de Corte Estimada: 78%
                  </span>
                  <span style={{
                    fontFamily: V.dm, fontSize: 10, padding: "3px 8px", borderRadius: 6,
                    background: "rgba(61,90,128,0.15)", color: V.ch,
                  }}>
                    Ranking Projetado: #{data.rankingEstimado}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Matriz de Competências do ENAMED */}
          <Card hoverable={false}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: "#fff" }}>
                Matriz de Competências — ENAMED (5 Grandes Áreas)
              </div>
              <span style={{ fontFamily: V.dm, fontSize: 9, color: V.ch, textTransform: "uppercase" }}>
                Pesos Oficiais DCN
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Área Médica", "Peso ENAMED", "Seu Score", "Meta", "Situação"].map((h) => (
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
                  {data.competencias.map((c) => (
                    <tr key={c.area} style={{ borderBottom: "1px solid rgba(61,90,128,0.1)" }}>
                      <td style={{ padding: "10px", fontSize: 13, color: V.nb }}>{c.area}</td>
                      <td style={{ padding: "10px", fontFamily: V.dm, fontSize: 11, color: V.ch }}>
                        {c.pesoEnamed}%
                      </td>
                      <td style={{ padding: "10px", fontFamily: V.dm, fontSize: 14, fontWeight: 600, color: "#fff" }}>
                        {c.score}%
                      </td>
                      <td style={{ padding: "10px", fontFamily: V.dm, fontSize: 11, color: V.ch }}>
                        {c.meta}%
                      </td>
                      <td style={{ padding: "10px" }}>
                        <Badge variant={statusVariant(c.status) as any}>
                          {c.score >= c.meta ? "Aprovado" : "Abaixo da Meta"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Curva de Projeção até 2027 */}
          <Card hoverable={false}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: "#fff" }}>
                Curva de Evolução Projetada até o ENAMED 2027
              </div>
              <span style={{ fontFamily: V.dm, fontSize: 9, color: V.pu }}>
                Cadência: 20h/semana
              </span>
            </div>

            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.projecao2027} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(61,90,128,0.15)" strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" stroke="#8A9AB5" tick={{ fontFamily: "'IBM Plex Mono'", fontSize: 9 }} />
                  <YAxis domain={[50, 100]} stroke="#8A9AB5" tick={{ fontFamily: "'IBM Plex Mono'", fontSize: 9 }} />
                  <RTooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="score" stroke="#00C2A8" strokeWidth={2.5} dot={{ fill: "#00C2A8", r: 4 }} />
                  <Line type="monotone" dataKey="metaEnamed" stroke="rgba(245,166,35,0.7)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 10, fontFamily: V.dm, fontSize: 9, color: V.ch }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 12, height: 2, background: V.pu, display: "inline-block" }} /> Score Projetado
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 12, height: 2, background: V.wn, display: "inline-block" }} /> Meta ENAMED (78%)
              </span>
            </div>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="col-right">
          {/* Alertas Críticos ENAMED */}
          <Card hoverable={false}>
            <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 14 }}>
              Alertas da IA para o ENAMED 2027
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.alertasEnamed.map((al) => (
                <div key={al.area} style={{
                  padding: "14px 16px", background: "rgba(43,58,82,0.35)",
                  borderRadius: 10, border: "1px solid rgba(61,90,128,0.25)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{al.area}</span>
                    <span style={{
                      fontFamily: V.dm, fontSize: 9, fontWeight: 600,
                      padding: "2px 6px", borderRadius: 4,
                      background: al.pct < 60 ? "rgba(255,107,107,0.12)" : "rgba(245,166,35,0.12)",
                      color: al.pct < 60 ? V.dg : V.wn,
                    }}>
                      {al.pct}% acerto
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: V.ch, lineHeight: 1.5, marginBottom: 10 }}>
                    {al.desc}
                  </div>
                  <div style={{
                    fontSize: 11, color: V.nb, background: "rgba(13,17,28,0.5)",
                    border: "1px solid rgba(61,90,128,0.2)",
                    padding: "6px 10px", borderRadius: 6,
                  }}>
                    🎯 <strong style={{ color: V.pu }}>Conduta:</strong> {al.rec}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Dica Estratégica ENAMED 2027 */}
          <Card hoverable={false} style={{
            background: "linear-gradient(135deg, rgba(0,194,168,0.06) 0%, rgba(0,119,182,0.04) 100%)",
            borderColor: "rgba(0,194,168,0.2)",
          }}>
            <div style={{ fontFamily: V.df, fontSize: 13, fontWeight: 600, color: V.pu, marginBottom: 8 }}>
              💡 Estratégia de Preparação ENAMED
            </div>
            <div style={{ fontSize: 12, color: V.nb, lineHeight: 1.6 }}>
              O ENAMED valoriza fortemente o raciocínio clínico aplicado ao <strong>SUS e à Atenção Primária</strong>. Candidatos com mais de 80% em Saúde Coletiva garantem uma folga decisiva de pontuação sobre a média nacional.
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
