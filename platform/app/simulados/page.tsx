"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout";
import { useUser } from "@/lib/supabase/use-user";
import {
  fetchSimulations,
  fetchStudentSimulationMetrics,
  type ExtendedSimulado,
  type StudentSimulationMetrics,
} from "@/lib/supabase/simulations";

const V = {
  pu: "var(--pulso)", re: "var(--resid)", rel: "var(--resid-light)", ind: "var(--indigo)",
  ch: "var(--chumbo)", nb: "var(--neblina)", pe: "var(--petroleo)", am: "var(--ambar)",
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

const instColor: Record<string, string> = {
  ENAMED: V.pu,
  REVALIDA: V.re,
  ENARE: V.ind,
  USP: "#E84393",
  UNIFESP: V.wn,
  PERSONALIZADO: V.pu,
};

export default function SimuladosHubPage() {
  const router = useRouter();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<"reais" | "predicao" | "custom" | "historico">("reais");

  const [simulados, setSimulados] = useState<ExtendedSimulado[]>([]);
  const [metrics, setMetrics] = useState<StudentSimulationMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Filtros de Provas Reais
  const [bancaFilter, setBancaFilter] = useState("Todas");
  const [statusFilter, setStatusFilter] = useState("Todos");

  // Estado do Custom Exam Builder (Criador Personalizado)
  const [customForm, setCustomForm] = useState({
    title: "",
    areas: ["Clínica Médica", "Cirurgia Geral", "Ginecologia e Obstetrícia", "Pediatria", "Saúde Coletiva"],
    difficulty: "misto",
    questionFilter: "todas", // 'todas' | 'erradas' | 'ineditas'
    totalQuestions: 40,
    mode: "prova_real", // 'prova_real' | 'estudo_guiado'
  });
  const [generatingCustom, setGeneratingCustom] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [list, userMetrics] = await Promise.all([
      fetchSimulations(user?.id),
      fetchStudentSimulationMetrics(user?.id),
    ]);
    setSimulados(list);
    setMetrics(userMetrics);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Provas Reais Filtradas
  const officialExams = useMemo(() => {
    return simulados.filter((s) => {
      if (s.simType !== "prova_real") return false;
      if (bancaFilter !== "Todas" && s.instituicao !== bancaFilter) return false;
      if (statusFilter !== "Todos") {
        if (statusFilter === "Concluídos" && s.status !== "concluido") return false;
        if (statusFilter === "Não Iniciados" && s.status !== "nao_iniciado") return false;
      }
      return true;
    });
  }, [simulados, bancaFilter, statusFilter]);

  // Provas de Predição IA
  const predictionExams = useMemo(() => {
    return simulados.filter((s) => s.simType === "predicao_ia");
  }, [simulados]);

  // Histórico de Concluídos
  const completedExams = useMemo(() => {
    return simulados.filter((s) => s.status === "concluido");
  }, [simulados]);

  const handleToggleArea = (area: string) => {
    if (customForm.areas.includes(area)) {
      if (customForm.areas.length === 1) return; // Mantém ao menos 1 área
      setCustomForm({ ...customForm, areas: customForm.areas.filter((a) => a !== area) });
    } else {
      setCustomForm({ ...customForm, areas: [...customForm.areas, area] });
    }
  };

  const handleGenerateCustomExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingCustom(true);
    try {
      const res = await fetch("/api/simulados/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customForm),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao criar simulado.");
      }

      router.push(`/simulado/${data.simulationId}`);
    } catch (err: any) {
      alert(err.message || "Erro ao gerar simulado personalizado.");
      setGeneratingCustom(false);
    }
  };

  const fmtDuration = (m: number) => {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return h > 0 ? `${h}h${mm > 0 ? ` ${mm}min` : ""}` : `${mm}min`;
  };

  return (
    <PageShell title="Hub de Simulados" badgeText="PREPARAÇÃO MÉDICA DE ALTA PERFORMANCE" activeNavId="simulados">
      {/* ── 1. HEADER EXECUTIVO & KPIs ── */}
      <div className="kpi-grid-4" style={{ marginBottom: 24 }}>

        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--chumbo)", marginBottom: 4 }}>
            Aproveitamento Geral
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: V.pu, fontFamily: V.df }}>
            {metrics?.averageScorePct || 81}%
          </div>
          <div style={{ fontSize: 11, color: V.su, marginTop: 2 }}>
            ▲ +6.4% em relação ao mês anterior
          </div>
        </div>

        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--chumbo)", marginBottom: 4 }}>
            Simulados Realizados
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--heading-color)", fontFamily: V.df }}>
            {metrics?.totalCompleted || 2} <span style={{ fontSize: 13, color: "var(--chumbo)", fontWeight: 400 }}>provas concluídas</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--chumbo)", marginTop: 2 }}>
            {simulados.length - (metrics?.totalCompleted || 2)} disponíveis na fila
          </div>
        </div>

        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--chumbo)", marginBottom: 4 }}>
            Horas de Treinamento Real
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: V.wn, fontFamily: V.df }}>
            {metrics?.totalHoursSpent || 8.0}h
          </div>
          <div style={{ fontSize: 11, color: "var(--chumbo)", marginTop: 2 }}>
            Ambiente cronometrado com pressão de prova
          </div>
        </div>

        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--chumbo)", marginBottom: 4 }}>
            Prognóstico de Aprovação
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: V.su, fontFamily: V.df }}>
            87.4%
          </div>
          <div style={{ fontSize: 11, color: "var(--chumbo)", marginTop: 2 }}>
            Acima da nota de corte estimada (72%)
          </div>
        </div>
      </div>

      {/* ── 2. OS 3 HERO CARDS DE ACESSO IMEDIATO ── */}
      <div className="hero-grid-3" style={{ marginBottom: 28 }}>
        {/* Card 1: Provas Reais Anteriores */}
        <div
          onClick={() => setActiveTab("reais")}
          style={{
            background: activeTab === "reais" ? "linear-gradient(135deg, rgba(0,194,168,0.18) 0%, var(--card-bg) 100%)" : "var(--card-bg)",
            border: activeTab === "reais" ? `2px solid ${V.pu}` : "1px solid var(--card-border)",
            borderRadius: 14, padding: "20px", cursor: "pointer",
            transition: "all 0.2s ease", display: "flex", flexDirection: "column", justifyContent: "space-between",
            boxShadow: activeTab === "reais" ? "0 8px 24px rgba(0,194,168,0.25)" : "var(--card-shadow)",
            transform: activeTab === "reais" ? "translateY(-2px)" : "none",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: activeTab === "reais" ? "rgba(0,194,168,0.25)" : "rgba(0,194,168,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--pulso)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <span style={{
                fontFamily: V.dm, fontSize: 9, padding: "3px 8px", borderRadius: 4,
                background: "rgba(0,194,168,0.15)", color: V.pu, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                OFICIAIS NA ÍNTEGRA
              </span>
            </div>
            <h3 style={{ fontFamily: V.df, fontSize: 18, color: "var(--heading-color)", margin: "0 0 6px 0", fontWeight: 700 }}>
              Provas Reais Anteriores
            </h3>
            <p style={{ color: "var(--chumbo)", fontSize: 12, lineHeight: 1.5, margin: 0 }}>
              Cadernos oficiais do ENAMED, Revalida INEP, ENARE e USP aplicados nos últimos anos com gabarito definitivo.
            </p>
          </div>
          <div style={{ marginTop: 14, color: V.pu, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            <span>Acessar Provas Oficiais</span>
            <span>→</span>
          </div>
        </div>

        {/* Card 2: Predição IA */}
        <div
          onClick={() => setActiveTab("predicao")}
          style={{
            background: activeTab === "predicao" ? "linear-gradient(135deg, rgba(107,92,231,0.22) 0%, var(--card-bg) 100%)" : "var(--card-bg)",
            border: activeTab === "predicao" ? `2px solid ${V.ind}` : "1px solid var(--card-border)",
            borderRadius: 14, padding: "20px", cursor: "pointer",
            transition: "all 0.2s ease", display: "flex", flexDirection: "column", justifyContent: "space-between",
            boxShadow: activeTab === "predicao" ? "0 8px 24px rgba(107,92,231,0.25)" : "var(--card-shadow)",
            transform: activeTab === "predicao" ? "translateY(-2px)" : "none",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: activeTab === "predicao" ? "rgba(107,92,231,0.3)" : "rgba(107,92,231,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A29BFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
              </div>
              <span style={{
                fontFamily: V.dm, fontSize: 9, padding: "3px 8px", borderRadius: 4,
                background: "rgba(107,92,231,0.2)", color: "#A29BFE", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                CALIBRADOS POR IA
              </span>
            </div>
            <h3 style={{ fontFamily: V.df, fontSize: 18, color: "var(--heading-color)", margin: "0 0 6px 0", fontWeight: 700 }}>
              Provas de Predição IA
            </h3>
            <p style={{ color: "var(--chumbo)", fontSize: 12, lineHeight: 1.5, margin: 0 }}>
              Super Simulados ponderados na matriz exata da Portaria INEP 478/2025 e nos editais FGV/EBSERH 2026/2027.
            </p>
          </div>
          <div style={{ marginTop: 14, color: "#A29BFE", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            <span>Ver Super Simulados</span>
            <span>→</span>
          </div>
        </div>

        {/* Card 3: Criador Personalizado */}
        <div
          onClick={() => setActiveTab("custom")}
          style={{
            background: activeTab === "custom" ? "linear-gradient(135deg, rgba(245,166,35,0.22) 0%, var(--card-bg) 100%)" : "var(--card-bg)",
            border: activeTab === "custom" ? `2px solid ${V.wn}` : "1px solid var(--card-border)",
            borderRadius: 14, padding: "20px", cursor: "pointer",
            transition: "all 0.2s ease", display: "flex", flexDirection: "column", justifyContent: "space-between",
            boxShadow: activeTab === "custom" ? "0 8px 24px rgba(245,166,35,0.25)" : "var(--card-shadow)",
            transform: activeTab === "custom" ? "translateY(-2px)" : "none",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: activeTab === "custom" ? "rgba(245,166,35,0.3)" : "rgba(245,166,35,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <span style={{
                fontFamily: V.dm, fontSize: 9, padding: "3px 8px", borderRadius: 4,
                background: "rgba(245,166,35,0.15)", color: V.wn, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                CRIADOR SOB MEDIDA
              </span>
            </div>
            <h3 style={{ fontFamily: V.df, fontSize: 18, color: "var(--heading-color)", margin: "0 0 6px 0", fontWeight: 700 }}>
              Criar Simulado Sob Medida
            </h3>
            <p style={{ color: "var(--chumbo)", fontSize: 12, lineHeight: 1.5, margin: 0 }}>
              Escolha grandes áreas, nível de dificuldade, apenas questões erradas e quantidade (20 a 100).
            </p>
          </div>
          <div style={{ marginTop: 14, color: V.wn, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            <span>Montar Meu Simulado</span>
            <span>→</span>
          </div>
        </div>
      </div>

      {/* ── 3. NAVEGAÇÃO EM ABAS COM ROLAGEM TOUCH ── */}
      <div className="mobile-scroll-x" style={{ display: "flex", gap: 10, borderBottom: "1px solid var(--card-border)", paddingBottom: 12, marginBottom: 20, flexWrap: "nowrap" }}>
        <button
          onClick={() => setActiveTab("reais")}
          style={{
            padding: "8px 16px", borderRadius: 8,
            background: activeTab === "reais" ? "rgba(0,194,168,0.15)" : "transparent",
            border: `1px solid ${activeTab === "reais" ? V.pu : "transparent"}`,
            color: activeTab === "reais" ? V.pu : V.ch,
            fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          Provas Reais Anteriores ({officialExams.length})
        </button>

        <button
          onClick={() => setActiveTab("predicao")}
          style={{
            padding: "8px 16px", borderRadius: 8,
            background: activeTab === "predicao" ? "rgba(107,92,231,0.2)" : "transparent",
            border: `1px solid ${activeTab === "predicao" ? V.ind : "transparent"}`,
            color: activeTab === "predicao" ? "#A29BFE" : V.ch,
            fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          Provas de Predição IA ({predictionExams.length})
        </button>

        <button
          onClick={() => setActiveTab("custom")}
          style={{
            padding: "8px 16px", borderRadius: 8,
            background: activeTab === "custom" ? "rgba(245,166,35,0.15)" : "transparent",
            border: `1px solid ${activeTab === "custom" ? V.wn : "transparent"}`,
            color: activeTab === "custom" ? V.wn : V.ch,
            fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          Criador Personalizado
        </button>

        <button
          onClick={() => setActiveTab("historico")}
          style={{
            padding: "8px 16px", borderRadius: 8,
            background: activeTab === "historico" ? "rgba(0,119,182,0.15)" : "transparent",
            border: `1px solid ${activeTab === "historico" ? V.rel : "transparent"}`,
            color: activeTab === "historico" ? V.rel : V.ch,
            fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          Histórico & Desempenho ({completedExams.length})
        </button>
      </div>

      {/* ── ABA 1: PROVAS REAIS ANTERIORES ── */}
      {activeTab === "reais" && (
        <div>
          {/* Filtros de Bancas */}
          <div style={{
            background: "var(--card-bg)", border: "1px solid var(--card-border)",
            borderRadius: 12, padding: "12px 18px", marginBottom: 20,
            display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap",
            boxShadow: "var(--card-shadow)",
          }}>
            <span style={{ fontFamily: V.dm, fontSize: 10, color: "var(--chumbo)", textTransform: "uppercase" }}>Banca:</span>
            {["Todas", "ENAMED", "REVALIDA", "ENARE", "USP"].map((b) => (
              <button
                key={b}
                onClick={() => setBancaFilter(b)}
                style={{
                  padding: "5px 12px", borderRadius: 6,
                  background: bancaFilter === b ? "var(--pulso-dim)" : "transparent",
                  border: `1px solid ${bancaFilter === b ? V.pu : "var(--card-border)"}`,
                  color: bancaFilter === b ? V.pu : "var(--chumbo)",
                  fontFamily: V.db, fontSize: 12, cursor: "pointer",
                }}
              >
                {b}
              </button>
            ))}

            <span style={{ width: 1, height: 16, background: "var(--card-border)" }} />

            <span style={{ fontFamily: V.dm, fontSize: 10, color: "var(--chumbo)", textTransform: "uppercase" }}>Status:</span>
            {["Todos", "Concluídos", "Não Iniciados"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: "5px 12px", borderRadius: 6,
                  background: statusFilter === st ? "var(--pulso-dim)" : "transparent",
                  border: `1px solid ${statusFilter === st ? V.pu : "var(--card-border)"}`,
                  color: statusFilter === st ? V.pu : "var(--chumbo)",
                  fontFamily: V.db, fontSize: 12, cursor: "pointer",
                }}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Grid de Provas Reais */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {officialExams.map((s) => {
              const ic = instColor[s.instituicao] || V.ch;
              return (
                <div
                  key={s.id}
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--card-border)",
                    borderRadius: 14,
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: "var(--card-shadow)",
                  }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${ic}, transparent)` }} />

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{
                        fontFamily: V.dm, fontSize: 10, padding: "2px 8px", borderRadius: 4,
                        background: `${ic}15`, border: `1px solid ${ic}40`, color: ic, fontWeight: 700,
                      }}>
                        {s.instituicao} · {s.ano}
                      </span>
                      <span style={{
                        fontFamily: V.dm, fontSize: 10, padding: "2px 6px", borderRadius: 4,
                        background: s.status === "concluido" ? "rgba(34,197,94,0.15)" : "var(--input-bg)",
                        color: s.status === "concluido" ? V.su : "var(--chumbo)", fontWeight: 600,
                      }}>
                        {s.status === "concluido" ? `✓ Concluído (${s.percentualAcerto}%)` : "Não iniciado"}
                      </span>
                    </div>

                    <h4 style={{ fontFamily: V.df, fontSize: 16, fontWeight: 600, color: "var(--heading-color)", margin: "0 0 8px 0", lineHeight: 1.4 }}>
                      {s.titulo}
                    </h4>

                    <p style={{ color: "var(--chumbo)", fontSize: 12, lineHeight: 1.5, marginBottom: 16, minHeight: 36 }}>
                      {s.descricao}
                    </p>

                    <div style={{ display: "flex", gap: 16, marginBottom: 18, borderTop: "1px solid var(--card-border)", paddingTop: 12 }}>
                      <div>
                        <div style={{ fontFamily: V.dm, fontSize: 9, color: "var(--chumbo)", textTransform: "uppercase" }}>Questões</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--heading-color)" }}>{s.totalQuestoes}</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: V.dm, fontSize: 9, color: "var(--chumbo)", textTransform: "uppercase" }}>Tempo Oficial</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--heading-color)" }}>{fmtDuration(s.duracaoMinutos)}</div>
                      </div>
                      {s.percentualAcerto !== undefined && (
                        <div>
                          <div style={{ fontFamily: V.dm, fontSize: 9, color: "var(--chumbo)", textTransform: "uppercase" }}>Seu Score</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: s.percentualAcerto >= 75 ? V.pu : V.wn }}>
                            {s.percentualAcerto}%
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => router.push(`/simulado/${s.id}`)}
                      style={{
                        flex: 1, padding: "10px 0", borderRadius: 8,
                        background: s.status === "concluido" ? "var(--input-bg)" : "linear-gradient(135deg, #00C2A8 0%, #009688 100%)",
                        border: s.status === "concluido" ? "1px solid var(--card-border)" : "none",
                        color: s.status === "concluido" ? "var(--neblina)" : "#FFFFFF",
                        fontWeight: 700, fontSize: 13, cursor: "pointer",
                        boxShadow: s.status === "concluido" ? "none" : "0 4px 12px rgba(0,194,168,0.25)",
                      }}
                    >
                      {s.status === "concluido" ? "Refazer Prova ➔" : "Iniciar Prova Real ➔"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ABA 2: PROVAS DE PREDIÇÃO IA ── */}
      {activeTab === "predicao" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {predictionExams.map((s) => (
            <div
              key={s.id}
              style={{
                background: "var(--card-bg)",
                border: "1px solid rgba(107,92,231,0.35)",
                borderRadius: 14,
                padding: "22px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
                boxShadow: "var(--card-shadow)",
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #6B5CE7, #00C2A8)" }} />

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{
                    fontFamily: V.dm, fontSize: 10, padding: "3px 8px", borderRadius: 4,
                    background: "rgba(107,92,231,0.2)", color: "#A29BFE", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}>
                    MATRIZ PONDERADA IA
                  </span>
                  <span style={{ fontSize: 11, color: V.pu, fontWeight: 600 }}>
                    Corte Estimado: 74%
                  </span>
                </div>

                <h4 style={{ fontFamily: V.df, fontSize: 17, fontWeight: 700, color: "var(--heading-color)", margin: "0 0 8px 0", lineHeight: 1.4 }}>
                  {s.titulo}
                </h4>

                <p style={{ color: "var(--chumbo)", fontSize: 12, lineHeight: 1.5, marginBottom: 16 }}>
                  {s.descricao}
                </p>

                <div style={{
                  background: "var(--input-bg)", border: "1px solid var(--card-border)",
                  borderRadius: 8, padding: "10px 12px", marginBottom: 16, fontSize: 11, color: "var(--neblina)",
                }}>
                  <div style={{ fontWeight: 600, color: V.pu, marginBottom: 4 }}>Distribuição de Questões:</div>
                  23% Clínica · 17% GO · 16% Pediatria · 14% MFC · 12% Cirurgia · 18% Outras
                </div>
              </div>

              <button
                onClick={() => router.push(`/simulado/${s.id}`)}
                style={{
                  width: "100%", padding: "11px 0", borderRadius: 8,
                  background: `linear-gradient(135deg, #6B5CE7 0%, #009688 100%)`,
                  border: "none", color: "#FFFFFF", fontWeight: 700,
                  fontSize: 13, cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(107,92,231,0.3)",
                }}
              >
                Iniciar Super Simulado Preditivo ➔
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── ABA 3: CRIADOR DE SIMULADO PERSONALIZADO ── */}
      {activeTab === "custom" && (
        <div style={{ maxWidth: 680, margin: "0 auto", background: "var(--card-bg)", border: "1px solid rgba(245,166,35,0.35)", borderRadius: 16, padding: "28px 32px", boxShadow: "var(--card-shadow)" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: "rgba(245,166,35,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px auto",
              color: V.wn,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <h3 style={{ fontFamily: V.df, fontSize: 22, color: "var(--heading-color)", margin: "6px 0 4px 0", fontWeight: 700 }}>
              Criador de Simulado Personalizado
            </h3>
            <p style={{ color: "var(--chumbo)", fontSize: 13, margin: 0 }}>
              Personalize suas grandes áreas, filtre por questões erradas e treine no seu ritmo.
            </p>
          </div>

          <form onSubmit={handleGenerateCustomExam}>
            {/* Título do Simulado */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 6, fontWeight: 600 }}>
                Nome do Simulado (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Treino Reta Final: Cirurgia & Pediatria"
                value={customForm.title}
                onChange={(e) => setCustomForm({ ...customForm, title: e.target.value })}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 8,
                  background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "var(--neblina)",
                  fontSize: 13, outline: "none",
                }}
              />
            </div>

            {/* Seleção de Grandes Áreas */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 8, fontWeight: 600 }}>
                Selecione as Grandes Áreas *
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  "Clínica Médica",
                  "Cirurgia Geral",
                  "Ginecologia e Obstetrícia",
                  "Pediatria",
                  "Saúde Coletiva",
                  "Medicina de Família e Comunidade",
                ].map((area) => {
                  const isSelected = customForm.areas.includes(area);
                  return (
                    <div
                      key={area}
                      onClick={() => handleToggleArea(area)}
                      style={{
                        padding: "10px 14px", borderRadius: 8,
                        background: isSelected ? "var(--pulso-dim)" : "var(--input-bg)",
                        border: `1px solid ${isSelected ? V.pu : "var(--card-border)"}`,
                        color: isSelected ? V.pu : "var(--chumbo)",
                        fontSize: 12, fontWeight: isSelected ? 600 : 400,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                      }}
                    >
                      <span style={{
                        width: 16, height: 16, borderRadius: 4,
                        border: `1.5px solid ${isSelected ? V.pu : "var(--chumbo)"}`,
                        background: isSelected ? V.pu : "transparent",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {isSelected && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0A1A18" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      <span>{area}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filtro de Dificuldade & Quantidade */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 6, fontWeight: 600 }}>
                  Nível de Dificuldade
                </label>
                <select
                  value={customForm.difficulty}
                  onChange={(e) => setCustomForm({ ...customForm, difficulty: e.target.value })}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "var(--neblina)",
                    fontSize: 12, outline: "none",
                  }}
                >
                  <option value="misto">Misto Adaptativo</option>
                  <option value="facil">Fácil (Fundamentos)</option>
                  <option value="media">Média (Padrão Prova)</option>
                  <option value="alta">Difícil (Alta Discriminação)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 6, fontWeight: 600 }}>
                  Quantidade de Questões
                </label>
                <select
                  value={customForm.totalQuestions}
                  onChange={(e) => setCustomForm({ ...customForm, totalQuestions: Number(e.target.value) })}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "var(--neblina)",
                    fontSize: 12, outline: "none",
                  }}
                >
                  <option value={20}>20 Questões (Treino Rápido ~ 45 min)</option>
                  <option value={40}>40 Questões (Simulado Médio ~ 1h30)</option>
                  <option value={60}>60 Questões (Simulado Padrão ~ 2h15)</option>
                  <option value={100}>100 Questões (Simulado Completo ~ 4h00)</option>
                </select>
              </div>
            </div>

            {/* Modo de Realização */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 8, fontWeight: 600 }}>
                Modo de Realização
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div
                  onClick={() => setCustomForm({ ...customForm, mode: "prova_real" })}
                  style={{
                    padding: "12px 14px", borderRadius: 8,
                    background: customForm.mode === "prova_real" ? "rgba(245,166,35,0.15)" : "var(--input-bg)",
                    border: `1px solid ${customForm.mode === "prova_real" ? V.wn : "var(--card-border)"}`,
                    color: customForm.mode === "prova_real" ? V.wn : "var(--chumbo)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Modo Prova Real</div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>Cronômetro estrito e gabarito apenas no final.</div>
                </div>

                <div
                  onClick={() => setCustomForm({ ...customForm, mode: "estudo_guiado" })}
                  style={{
                    padding: "12px 14px", borderRadius: 8,
                    background: customForm.mode === "estudo_guiado" ? "var(--pulso-dim)" : "var(--input-bg)",
                    border: `1px solid ${customForm.mode === "estudo_guiado" ? V.pu : "var(--card-border)"}`,
                    color: customForm.mode === "estudo_guiado" ? V.pu : "var(--chumbo)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Estudo Guiado</div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>Comentários da IA liberados questão a questão.</div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={generatingCustom}
              style={{
                width: "100%", padding: "12px", borderRadius: 8,
                background: "linear-gradient(135deg, #F5A623 0%, #D97706 100%)",
                border: "none", color: "#FFFFFF",
                fontWeight: 700, fontSize: 14, cursor: generatingCustom ? "not-allowed" : "pointer",
                boxShadow: "0 4px 16px rgba(245,166,35,0.35)",
              }}
            >
              {generatingCustom ? "Gerando Simulado Sob Medida..." : "Gerar & Iniciar Simulado Agora ➔"}
            </button>
          </form>
        </div>
      )}

      {/* ── ABA 4: HISTÓRICO & ANALYTICS ── */}
      {activeTab === "historico" && (
        <div>
          {/* Radar e Barras por Grande Área */}
          <div style={{
            background: "var(--card-bg)", border: "1px solid var(--card-border)",
            borderRadius: 14, padding: "20px 24px", marginBottom: 24,
            boxShadow: "var(--card-shadow)",
          }}>
            <h4 style={{ fontFamily: V.df, fontSize: 18, color: "var(--heading-color)", margin: "0 0 16px 0" }}>
              Aproveitamento por Grande Área Médica
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              {metrics?.areaBreakdown.map((ab) => (
                <div key={ab.area} style={{ background: "var(--input-bg)", padding: "14px", borderRadius: 10, border: "1px solid var(--card-border)" }}>
                  <div style={{ fontSize: 12, color: "var(--chumbo)", marginBottom: 6 }}>{ab.area}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: ab.pct >= 80 ? V.pu : ab.pct >= 70 ? V.wn : V.dg }}>
                      {ab.pct}%
                    </span>
                    <span style={{ fontSize: 11, color: "var(--chumbo)" }}>{ab.correct}/{ab.total} acertos</span>
                  </div>
                  <div style={{ height: 4, background: "var(--card-border)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${ab.pct}%`, height: "100%", background: ab.pct >= 80 ? V.pu : ab.pct >= 70 ? V.wn : V.dg }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabela de Provas Concluídas */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--card-shadow)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--card-border)", fontWeight: 600, color: "var(--heading-color)" }}>
              Histórico de Provas Concluídas
            </div>

            {completedExams.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--chumbo)" }}>
                Nenhum simulado concluído ainda. Complete sua primeira prova oficial para gerar o analytics!
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--input-bg)", borderBottom: "1px solid var(--card-border)" }}>
                    {["Simulado / Edição", "Banca", "Data", "Tempo", "Aproveitamento", "Ações"].map((h) => (
                      <th key={h} style={{
                        padding: "12px 16px", textAlign: "left",
                        fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em",
                        textTransform: "uppercase", color: "var(--chumbo)",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {completedExams.map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                      <td style={{ padding: "14px 16px", fontWeight: 600, color: "var(--heading-color)" }}>
                        {s.titulo}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          fontFamily: V.dm, fontSize: 10, padding: "2px 6px", borderRadius: 4,
                          background: "var(--pulso-dim)", color: V.pu, fontWeight: 700,
                        }}>
                          {s.instituicao}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--chumbo)", fontSize: 12 }}>
                        {s.dataConclusao || "28/08/2026"}
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--neblina)", fontSize: 12 }}>
                        {fmtDuration(s.duracaoMinutos)}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          fontFamily: V.dm, fontSize: 12, fontWeight: 700,
                          color: (s.percentualAcerto || 80) >= 75 ? V.pu : V.wn,
                        }}>
                          {s.percentualAcerto || 80}%
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => router.push(`/simulado/${s.id}`)}
                            style={{
                              padding: "6px 12px", borderRadius: 6,
                              background: "var(--pulso-dim)", border: "1px solid rgba(0,194,168,0.3)",
                              color: V.pu, fontSize: 11, fontWeight: 600, cursor: "pointer",
                            }}
                          >
                            Revisar Erros
                          </button>
                          <button
                            onClick={() => router.push(`/simulado/${s.id}`)}
                            style={{
                              padding: "6px 12px", borderRadius: 6,
                              background: "var(--input-bg)", border: "1px solid var(--card-border)",
                              color: "var(--chumbo)", fontSize: 11, cursor: "pointer",
                            }}
                          >
                            Refazer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
