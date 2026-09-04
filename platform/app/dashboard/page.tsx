"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
      background: "var(--card-bg)",
      border: "1px solid var(--sinal)",
      boxShadow: "var(--card-shadow)",
      borderRadius: "6px",
      padding: "6px 10px",
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: "10px",
      color: "var(--neblina)",
    }}>
      <span style={{ color: "var(--pulso)" }}>{payload[0].value}%</span>
      <span style={{ color: "var(--chumbo)", marginLeft: "6px" }}>{label}</span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
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

  const userRole = (profile?.role || "").toLowerCase();
  const isSuperAdminEmail = ["mario.nascimentolopes@gmail.com"].includes(user?.email || "");
  const isAdminUser = isSuperAdminEmail || ["superadmin", "docente", "financeiro", "suporte", "desenvolvedor"].includes(userRole);

  const quickActions = [
    {
      id: "ia-medica",
      title: "Preceptor IA",
      desc: "Tirar dúvidas clínicas & casos",
      icon: "🩺",
      badge: "Dr. Pleni",
      path: "/ia-medica",
      accent: "#00C2A8",
      bgGradient: "linear-gradient(135deg, var(--pulso-dim) 0%, var(--card-bg) 100%)",
      borderColor: "var(--card-border)",
    },
    {
      id: "simulados",
      title: "Simulados",
      desc: "Provas reais & predição IA",
      icon: "📋",
      badge: "Oficiais INEP",
      path: "/simulados",
      accent: "#0077B6",
      bgGradient: "linear-gradient(135deg, rgba(0,119,182,0.08) 0%, var(--card-bg) 100%)",
      borderColor: "var(--card-border)",
    },
    {
      id: "questoes",
      title: "Questões",
      desc: "Treino no banco comentado",
      icon: "📝",
      badge: "10k+ Questões",
      path: "/questoes",
      accent: "#6B5CE7",
      bgGradient: "linear-gradient(135deg, rgba(107,92,231,0.08) 0%, var(--card-bg) 100%)",
      borderColor: "var(--card-border)",
    },
    {
      id: "flashcards",
      title: "Flashcards",
      desc: "Revisão espaçada ativa",
      icon: "⚡",
      badge: "SRS Diário",
      path: "/flashcards",
      accent: "#F5A623",
      bgGradient: "linear-gradient(135deg, rgba(245,166,35,0.08) 0%, var(--card-bg) 100%)",
      borderColor: "var(--card-border)",
    },
    {
      id: "predicao",
      title: "Predição",
      desc: "Raio-X e nota de corte",
      icon: "📊",
      badge: "ENAMED 2027",
      path: "/predicao",
      accent: "#22C55E",
      bgGradient: "linear-gradient(135deg, rgba(34,197,94,0.08) 0%, var(--card-bg) 100%)",
      borderColor: "var(--card-border)",
    },
    {
      id: "cronograma",
      title: "Cronograma",
      desc: "Metas e rotina semanal",
      icon: "📅",
      badge: "Semanal",
      path: "/cronograma",
      accent: "#64B5E8",
      bgGradient: "linear-gradient(135deg, rgba(100,181,232,0.08) 0%, var(--card-bg) 100%)",
      borderColor: "var(--card-border)",
    },
  ];

  return (
    <PageShell
      title="Meu Dashboard"
      badgeText="ENAMED · 2027"
      activeNavId={activeNav}
      onNavigate={setActiveNav}
    >
      {/* ── KPI Row ── */}
      <div className="kpi-grid" style={{ marginBottom: "20px" }}>
        <KPICard
          icon={<IcPred />}
          iconBg="var(--pulso-dim)"
          label="Predição ENAMED 2027"
          value={<>{scoreGeral}<span style={{ fontSize: "16px", color: "var(--pulso)" }}>%</span></>}
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

      {/* ── BARRA HORIZONTAL DE INÍCIO RÁPIDO (AÇÕES PRINCIPAIS) ── */}
      <div style={{ marginBottom: "22px" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          padding: "0 2px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px" }}>⚡</span>
            <span style={{
              fontFamily: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.02em",
              color: "var(--heading-color)",
            }}>
              Início Rápido de Estudo
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isAdminUser && (
              <button
                onClick={() => router.push("/admin")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "var(--input-bg)",
                  border: "1px solid var(--sinal)",
                  color: "var(--pulso)",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "10px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span>⚙️</span>
                <span>Painel Backoffice</span>
                <span>→</span>
              </button>
            )}
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "10px",
              color: "var(--chumbo)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}>
              Módulos Ativos
            </span>
          </div>
        </div>

        {/* Grade de Ações Rápidas */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
        }}>
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => router.push(action.path)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "space-between",
                padding: "14px 14px",
                borderRadius: "10px",
                background: action.bgGradient,
                border: `1px solid ${action.borderColor}`,
                boxShadow: "var(--card-shadow)",
                cursor: "pointer",
                textAlign: "left",
                minHeight: "105px",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.borderColor = action.accent;
                e.currentTarget.style.boxShadow = `0 6px 16px rgba(0,0,0,0.1), 0 0 10px ${action.accent}33`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = action.borderColor;
                e.currentTarget.style.boxShadow = "var(--card-shadow)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "8px" }}>
                <span style={{ fontSize: "20px" }}>{action.icon}</span>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "9px",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: "var(--input-bg)",
                  border: "1px solid var(--sinal)",
                  color: action.accent,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}>
                  {action.badge}
                </span>
              </div>

              <div>
                <div style={{
                  fontFamily: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--heading-color)",
                  marginBottom: "2px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  {action.title}
                  <span style={{ fontSize: "11px", color: action.accent, opacity: 0.8 }}>→</span>
                </div>
                <div style={{
                  fontSize: "11px",
                  color: "var(--chumbo)",
                  lineHeight: "1.3",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>
                  {action.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Grid: left + right ── */}
      <div className="main-grid">
        {/* ── LEFT COLUMN ── */}
        <div className="col-left">

          {/* 1. Predição de Aprovação */}
          <Card hoverable={false}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "14px", color: "var(--heading-color)" }}>
                Índice de Prontidão — ENAMED 2027
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--chumbo)" }}>
                Matriz de Competências DCN
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              <ScoreRing score={scoreGeral} size={130} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700, color: "var(--heading-color)", marginBottom: "4px" }}>
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
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "14px", color: "var(--heading-color)" }}>
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

          {/* 3. Evolução do Índice de Prontidão */}
          <Card hoverable={false}>
            {/* Cabeçalho */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "14px", color: "var(--heading-color)", display: "block" }}>
                  Evolução do Índice
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: "9px", color: "var(--chumbo)" }}>
                  Últimos 8 simulados
                </span>
              </div>
              {/* Delta */}
              <div style={{
                display: "flex", alignItems: "center", gap: "4px",
                background: "var(--pulso-dim)", border: "1px solid var(--pulso)",
                borderRadius: "6px", padding: "3px 8px",
              }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 8V2M2 5l3-3 3 3" stroke="var(--pulso)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: "10px", fontWeight: 700, color: "var(--pulso)" }}>
                  +22.7pts
                </span>
              </div>
            </div>

            {/* Gráfico */}
            <ResponsiveContainer width="100%" height={110}>
              <AreaChart data={mockScoreEvolution} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C2A8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00C2A8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="simulado"
                  tick={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, fill: "var(--chumbo)" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  domain={[65, 100]}
                  tick={{ fontFamily: "'IBM Plex Mono'", fontSize: 8, fill: "var(--chumbo)" }}
                  axisLine={false} tickLine={false}
                />
                <RTooltip
                  contentStyle={{
                    background: "var(--card-bg)", border: "1px solid var(--sinal)",
                    borderRadius: "8px", fontSize: "11px", color: "var(--neblina)",
                  }}
                  formatter={(v) => [`${v ?? ""}%`, "Score"]}
                />
                {/* Linha de meta */}
                <line x1="0%" y1="30%" x2="100%" y2="30%" stroke="#F5A623" strokeWidth={1} strokeDasharray="3 3" />
                <Area
                  type="monotone" dataKey="score"
                  stroke="#00C2A8" strokeWidth={2}
                  fill="url(#scoreGrad)"
                  dot={{ fill: "#00C2A8", r: 2.5, strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: "#00C2A8", stroke: "rgba(0,194,168,0.3)", strokeWidth: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Rodapé: score atual vs meta */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", paddingTop: "10px", borderTop: "1px solid var(--sinal)" }}>
              <div style={{ display: "flex", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ display: "inline-block", width: 8, height: 2, background: "var(--pulso)", borderRadius: 2 }} />
                  <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: "9px", color: "var(--chumbo)" }}>Seu índice</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ display: "inline-block", width: 8, height: 1, background: "var(--warn)", borderRadius: 2, borderTop: "1px dashed var(--warn)" }} />
                  <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: "9px", color: "var(--chumbo)" }}>Meta aprovação</span>
                </div>
              </div>
              <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: "11px", fontWeight: 700, color: "var(--pulso)" }}>
                94.7% atual
              </span>
            </div>
          </Card>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="col-right">

          {/* 4. Recomendações da IA */}
          <Card hoverable={false}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "14px", color: "var(--heading-color)" }}>
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
                    background: "var(--input-bg)",
                    border: "1px solid var(--sinal)",
                    borderRadius: "10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{
                      fontFamily: "var(--font-display)", fontSize: "12px", fontWeight: 700, color: "var(--heading-color)",
                    }}>
                      {rec.area}
                    </span>
                    <span style={{
                      fontFamily: "'IBM Plex Mono'", fontSize: "9px", fontWeight: 600,
                      padding: "2px 6px", borderRadius: 4,
                      background: rec.pct < 60 ? "var(--danger-bg)" : "var(--pulso-dim)",
                      color: rec.pct < 60 ? "var(--danger)" : "var(--pulso)",
                    }}>
                      {rec.pct}% de domínio
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--chumbo)", lineHeight: "1.45", marginBottom: "8px" }}>
                    {rec.desc}
                  </div>
                  <div style={{
                    fontSize: "10.5px", color: "var(--neblina)", background: "var(--card-bg)",
                    border: "1px solid var(--sinal)", padding: "5px 8px", borderRadius: "6px",
                  }}>
                    🎯 <strong style={{ color: "var(--pulso)" }}>Conduta:</strong> {rec.rec}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 5. Próximo Simulado Recomendado */}
          <Card hoverable={false} style={{
            background: "linear-gradient(135deg, var(--pulso-dim) 0%, var(--card-bg) 100%)",
            borderColor: "var(--pulso)",
          }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "14px", color: "var(--heading-color)", marginBottom: "8px" }}>
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
                background: "var(--pulso)",
                color: "#FFFFFF",
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
