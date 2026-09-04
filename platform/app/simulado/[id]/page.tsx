"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ScoreRing, Card, Badge, ProgressBar } from "@/components/ui";
import type { Simulado, Questao } from "@/lib/types";
import { useUser } from "@/lib/supabase/use-user";
import {
  fetchSimulationDetails,
  finishSimulation,
  type SimulationResultSummary,
  type ExtendedSimulado,
} from "@/lib/supabase/simulations";

import { useTheme } from "@/lib/theme-context";

/* ══════════════════════════════════════════════
   SIMULADO & RELATÓRIO PÓS-SIMULADO REAL
══════════════════════════════════════════════ */

const V = {
  ab: "var(--abismo)", pe: "var(--petroleo)", si: "var(--sinal)",
  nb: "var(--neblina)", ch: "var(--chumbo)", pu: "var(--pulso)",
  re: "var(--resid)", rel: "var(--resid-light)", dg: "var(--danger)", wn: "var(--warn)", su: "var(--success)",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
  dm: "'IBM Plex Mono', monospace",
  heading: "var(--heading-color)",
  cardBg: "var(--card-bg)",
  cardBorder: "var(--card-border)",
  inputBg: "var(--input-bg)",
};

type QState = "done" | "curr" | "skip" | "todo";

export default function SimuladoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const { theme, toggleTheme } = useTheme();
  const simId = (params?.id as string) || "sim_001";

  const [loading, setLoading] = useState(true);
  const [simulation, setSimulation] = useState<ExtendedSimulado | null>(null);
  const [questions, setQuestions] = useState<Questao[]>([]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(3);
  const [answers, setAnswers] = useState<Record<number, { letter: string; confidence: number }>>({});
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [timerSecs, setTimerSecs] = useState(5400); // 90 min padrão
  const [initialDuration, setInitialDuration] = useState(5400);

  const [isFinished, setIsFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultSummary, setResultSummary] = useState<SimulationResultSummary | null>(null);
  const [selectedReviewQIdx, setSelectedReviewQIdx] = useState<number | null>(null);

  // Carrega simulado e questões
  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await fetchSimulationDetails(simId, user?.id);
      setSimulation(data.simulation);
      setQuestions(data.questions);
      const totalSecs = (data.simulation.duracaoMinutos || 90) * 60;
      setTimerSecs(totalSecs);
      setInitialDuration(totalSecs);
      setLoading(false);
    }
    load();
  }, [simId, user]);

  // Timer countdown
  useEffect(() => {
    if (isFinished || loading) return;
    const id = setInterval(() => {
      setTimerSecs((s) => {
        if (s <= 1) {
          clearInterval(id);
          handleFinish();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isFinished, loading]);

  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return {
      h: String(h).padStart(2, "0"),
      m: String(m).padStart(2, "0"),
      s: String(ss).padStart(2, "0"),
    };
  };
  const t = fmtTime(timerSecs);

  const totalQ = questions.length;
  const q = questions[currentIdx] || questions[0];
  const answeredCount = Object.keys(answers).length;
  const skippedCount = skipped.size;

  const getQState = (idx: number): QState => {
    if (idx === currentIdx) return "curr";
    if (answers[idx]) return "done";
    if (skipped.has(idx)) return "skip";
    return "todo";
  };

  const confirmAnswer = () => {
    if (!selectedOpt) return;
    setAnswers((prev) => ({ ...prev, [currentIdx]: { letter: selectedOpt, confidence } }));
    setSkipped((prev) => {
      const n = new Set(prev);
      n.delete(currentIdx);
      return n;
    });

    if (currentIdx + 1 < totalQ) {
      goTo(currentIdx + 1);
    }
  };

  const skipQuestion = () => {
    setSkipped((prev) => new Set(prev).add(currentIdx));
    if (currentIdx + 1 < totalQ) {
      goTo(currentIdx + 1);
    }
  };

  const goTo = (idx: number) => {
    setCurrentIdx(idx);
    const existing = answers[idx];
    if (existing) {
      setSelectedOpt(existing.letter);
      setConfidence(existing.confidence);
    } else {
      setSelectedOpt(null);
      setConfidence(3);
    }
  };

  const handleFinish = async () => {
    if (!simulation || submitting) return;
    setSubmitting(true);

    const timeSpent = Math.max(0, initialDuration - timerSecs);
    const summary = await finishSimulation({
      userId: user?.id,
      simulation,
      questions,
      answers,
      timeSpentSeconds: timeSpent,
    });

    setResultSummary(summary);
    setIsFinished(true);
    setSubmitting(false);
  };

  const qDotStyle = (state: QState): React.CSSProperties => {
    const base: React.CSSProperties = {
      width: 28, height: 28, borderRadius: 6,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: V.dm, fontSize: 10, letterSpacing: "0.04em", cursor: "pointer",
      transition: "all 0.15s",
    };
    switch (state) {
      case "done": return { ...base, background: "var(--pulso-dim)", color: V.pu, border: "1px solid var(--pulso)" };
      case "curr": return { ...base, background: V.pu, color: "#FFFFFF", fontWeight: 700 };
      case "skip": return { ...base, background: "var(--warn-bg)", color: V.wn, border: "1px solid var(--warn)" };
      case "todo": return { ...base, background: "var(--input-bg)", color: V.ch, border: "1px solid var(--sinal)" };
    }
  };

  const optStyle = (letter: string): React.CSSProperties => {
    const isSel = selectedOpt === letter;
    return {
      display: "flex", gap: 14, alignItems: "flex-start",
      padding: "12px 16px",
      background: isSel ? "var(--pulso-dim)" : "var(--card-bg)",
      border: `1.5px solid ${isSel ? "var(--pulso)" : "var(--card-border)"}`,
      borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
      color: "var(--neblina)",
    };
  };

  const optLetterStyle = (letter: string): React.CSSProperties => {
    const isSel = selectedOpt === letter;
    return {
      fontFamily: V.dm, fontSize: 11, letterSpacing: "0.08em",
      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: isSel ? V.pu : "var(--input-bg)",
      color: isSel ? "#FFFFFF" : "var(--neblina)", marginTop: 1,
      border: `1px solid ${isSel ? V.pu : "var(--sinal)"}`,
    };
  };

  if (loading || !simulation || !q) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--abismo)", display: "flex", alignItems: "center", justifyContent: "center", color: V.ch }}>
        Carregando simulado...
      </div>
    );
  }

  /* ══════════════════════════════════════════════
     TELA DE RESULTADO / PÓS-SIMULADO
  ══════════════════════════════════════════════ */
  if (isFinished && resultSummary) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--abismo)", color: "var(--neblina)", padding: "40px 20px" }}>
        <div style={{ maxWidth: 840, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <span style={{
              fontFamily: V.dm, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
              padding: "3px 10px", borderRadius: 9999,
              background: "var(--pulso-dim)", color: V.pu, border: "1px solid var(--pulso)",
            }}>
              {simulation.instituicao} · Simulado Concluído
            </span>
            <div style={{ fontFamily: V.df, fontSize: 28, fontWeight: 700, color: "var(--heading-color)", marginTop: 10, marginBottom: 4 }}>
              Relatório de Desempenho Pós-Simulado
            </div>
            <div style={{ fontSize: 14, color: V.ch }}>
              {simulation.titulo} · {resultSummary.totalQuestions} questões
            </div>
          </div>

          {/* Cards de Resumo */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 16, marginBottom: 20 }}>
            {/* Score Ring */}
            <Card hoverable={false} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28 }}>
              <ScoreRing score={resultSummary.scorePercent} size={150} sublabel="score final" />
              <div style={{
                fontFamily: V.df, fontSize: 18, fontWeight: 700,
                color: resultSummary.passedCutoff ? V.pu : resultSummary.scorePercent >= 60 ? V.wn : V.dg,
                marginTop: 14,
              }}>
                {resultSummary.passedCutoff ? "Acima da Nota de Corte ✓" : "Abaixo da Nota de Corte"}
              </div>
              <div style={{ fontSize: 12, color: V.ch, marginTop: 4, textAlign: "center" }}>
                Nota de corte estimada ({simulation.instituicao}): <strong style={{ color: "#fff" }}>{resultSummary.cutoffScore}%</strong>
              </div>
            </Card>

            {/* KPIs Rápidos */}
            <Card hoverable={false} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 24 }}>
              <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 12 }}>
                Métricas da Sessão
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ background: "rgba(43,58,82,0.3)", padding: 12, borderRadius: 8 }}>
                  <div style={{ fontFamily: V.dm, fontSize: 9, color: V.ch, textTransform: "uppercase" }}>Acertos</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: V.pu }}>
                    {resultSummary.correctAnswers} / {resultSummary.totalQuestions}
                  </div>
                </div>
                <div style={{ background: "rgba(43,58,82,0.3)", padding: 12, borderRadius: 8 }}>
                  <div style={{ fontFamily: V.dm, fontSize: 9, color: V.ch, textTransform: "uppercase" }}>Tempo Total</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: V.nb }}>
                    {Math.floor(resultSummary.timeSpentSeconds / 60)}min {resultSummary.timeSpentSeconds % 60}s
                  </div>
                </div>
                <div style={{ background: "rgba(43,58,82,0.3)", padding: 12, borderRadius: 8 }}>
                  <div style={{ fontFamily: V.dm, fontSize: 9, color: V.ch, textTransform: "uppercase" }}>Média / Questão</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: V.nb }}>
                    {resultSummary.answeredQuestions > 0
                      ? `${Math.round(resultSummary.timeSpentSeconds / resultSummary.answeredQuestions)}s`
                      : "—"}
                  </div>
                </div>
                <div style={{ background: "rgba(43,58,82,0.3)", padding: 12, borderRadius: 8 }}>
                  <div style={{ fontFamily: V.dm, fontSize: 9, color: V.ch, textTransform: "uppercase" }}>Calibração Alta</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: V.rel }}>
                    {resultSummary.confidenceAnalysis.highConfidenceAccuracy}% acerto
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 11, color: V.ch, marginTop: 12 }}>
                * Suas respostas foram salvas no Supabase e já atualizam sua predição de aprovação.
              </div>
            </Card>
          </div>

          {/* Desempenho por Área */}
          <Card hoverable={false} style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 14 }}>
              Desempenho por Área da Prova
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {resultSummary.areaBreakdown.map((ab) => (
                <div key={ab.area}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: V.nb }}>{ab.area}</span>
                    <span style={{ fontFamily: V.dm, fontSize: 11, color: ab.pct >= 75 ? V.pu : ab.pct >= 60 ? V.wn : V.dg }}>
                      {ab.correct}/{ab.total} ({ab.pct}%)
                    </span>
                  </div>
                  <ProgressBar value={ab.pct} variant={ab.pct >= 75 ? "green" : ab.pct >= 60 ? "warn" : "danger"} />
                </div>
              ))}
            </div>
          </Card>

          {/* Revisão de Questões */}
          <Card hoverable={false} style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 14 }}>
              Revisão de Gabarito Questão por Questão
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {questions.map((ques, idx) => {
                const userAns = answers[idx];
                const isCorrect = userAns?.letter === ques.gabarito;
                const isSel = selectedReviewQIdx === idx;

                return (
                  <button
                    key={ques.id}
                    onClick={() => setSelectedReviewQIdx(isSel ? null : idx)}
                    style={{
                      width: 32, height: 32, borderRadius: 6,
                      background: isCorrect ? "rgba(0,194,168,0.15)" : userAns ? "rgba(255,107,107,0.15)" : "rgba(61,90,128,0.15)",
                      border: `1.5px solid ${isSel ? "#fff" : isCorrect ? V.pu : userAns ? V.dg : "rgba(61,90,128,0.3)"}`,
                      color: isCorrect ? V.pu : userAns ? V.dg : V.ch,
                      fontFamily: V.dm, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {selectedReviewQIdx !== null && questions[selectedReviewQIdx] && (
              <div style={{
                padding: "16px 18px", background: "rgba(43,58,82,0.4)",
                borderRadius: 10, border: "1px solid rgba(61,90,128,0.25)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontFamily: V.dm, fontSize: 10, color: V.pu, textTransform: "uppercase" }}>
                    Questão {selectedReviewQIdx + 1} · {questions[selectedReviewQIdx].subarea}
                  </span>
                  <span style={{
                    fontFamily: V.dm, fontSize: 10,
                    color: answers[selectedReviewQIdx]?.letter === questions[selectedReviewQIdx].gabarito ? V.pu : V.dg,
                  }}>
                    Sua resposta: {answers[selectedReviewQIdx]?.letter || "Não respondida"} · Gabarito: {questions[selectedReviewQIdx].gabarito}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: V.nb, lineHeight: 1.6, marginBottom: 10 }}>
                  {questions[selectedReviewQIdx].enunciado}
                </div>
                <div style={{ fontSize: 12, color: V.ch, lineHeight: 1.6, background: "rgba(13,17,28,0.45)", border: "1px solid rgba(0,194,168,0.25)", padding: "12px 14px", borderRadius: 8 }}>
                  <strong style={{ color: V.pu }}>Explicação:</strong> {questions[selectedReviewQIdx].explicacao}
                </div>
              </div>
            )}
          </Card>

          {/* Botões de Ação */}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => router.push("/simulados")}
              style={{
                flex: 1, padding: "12px 0", borderRadius: 8,
                background: "transparent", border: "1.5px solid rgba(61,90,128,0.3)",
                color: V.ch, fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              Voltar aos Simulados
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                flex: 1, padding: "12px 0", borderRadius: 8,
                background: V.pu, border: "none", color: "#0A1A18",
                fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
                boxShadow: "0 4px 16px rgba(0,194,168,0.3)",
              }}
            >
              Ir para o Meu Dashboard →
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════
     TELA DE EXECUÇÃO DO SIMULADO
  ══════════════════════════════════════════════ */
  return (
    <div style={{ background: "var(--abismo)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── SIM TOPBAR ── */}
      <div style={{
        height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", background: "var(--card-bg)",
        borderBottom: "1px solid var(--card-border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div onClick={() => router.push("/dashboard")} style={{ fontFamily: V.df, fontWeight: 700, fontSize: 17, color: V.heading, cursor: "pointer" }}>
            Med<span style={{ color: V.pu }}>Pleni</span>
          </div>
          <div style={{ width: 1, height: 20, background: "var(--card-border)" }} />
          <div style={{ fontSize: 12, color: V.ch, fontFamily: V.dm }}>
            {simulation.instituicao} · {simulation.titulo}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div>
            <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.08em", color: V.ch }}>
              Q {currentIdx + 1} / {totalQ}
            </div>
            <div style={{ width: 140, height: 4, background: "var(--card-border)", borderRadius: 9999, overflow: "hidden", marginTop: 4 }}>
              <div style={{ width: `${((currentIdx + 1) / totalQ) * 100}%`, height: "100%", background: V.pu, borderRadius: 9999, transition: "width 0.3s" }} />
            </div>
          </div>
          <div style={{
            fontFamily: V.dm, fontSize: 14, letterSpacing: "0.04em", color: V.heading,
            background: "var(--input-bg)", padding: "4px 12px", borderRadius: 8,
            border: "1px solid var(--card-border)",
          }}>
            {t.h}:<span style={{ color: V.wn }}>{t.m}</span>:{t.s}
          </div>
          <button
            onClick={handleFinish}
            disabled={submitting}
            style={{
              padding: "6px 14px", background: "rgba(255,107,107,0.1)",
              border: "1.5px solid rgba(255,107,107,0.3)", borderRadius: 8,
              color: V.dg, fontFamily: V.db, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            {submitting ? "Encerrando..." : "Encerrar Simulado"}
          </button>
        </div>
      </div>

      {/* ── SIM LAYOUT: 3 columns ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── LEFT SIDEBAR (Grade de Questões) ── */}
        <div style={{
          width: 210, borderRight: "1px solid var(--card-border)",
          padding: 16, background: "var(--card-bg)", overflowY: "auto",
        }}>
          <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: V.ch, marginBottom: 12 }}>
            Mapa de Questões
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {questions.map((_, i) => (
              <div
                key={i}
                style={qDotStyle(getQState(i))}
                onClick={() => goTo(i)}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Stats */}
          <div style={{ marginTop: 20, borderTop: "1px solid var(--card-border)", paddingTop: 14 }}>
            {[
              { label: "Respondidas", value: answeredCount, color: V.pu },
              { label: "Puladas", value: skippedCount, color: V.wn },
              { label: "Pendentes", value: totalQ - answeredCount - skippedCount, color: V.ch },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: V.ch }}>{s.label}</span>
                <span style={{ fontFamily: V.dm, fontSize: 11, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── MAIN CONTENT (Questão Atual) ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
          {/* Header */}
          <div style={{ padding: "16px 28px", borderBottom: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: V.pu }}>
                Questão {currentIdx + 1}
              </span>
              <span style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: V.ch }}>
                {q.area} · {q.subarea}
              </span>
              <span style={{
                fontFamily: V.dm, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
                padding: "2px 7px", borderRadius: 9999,
                background: "rgba(245,166,35,0.1)", color: V.wn, border: "1px solid rgba(245,166,35,0.15)",
              }}>
                {q.dificuldade}
              </span>
              <span style={{ marginLeft: "auto", fontFamily: V.dm, fontSize: 9, letterSpacing: "0.08em", color: "rgba(138,154,181,0.4)" }}>
                {q.instituicao} · {q.ano}
              </span>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, padding: "24px 28px", display: "flex", gap: 24 }}>
            {/* Questão e Alternativas */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, lineHeight: 1.75, color: V.nb, marginBottom: 8 }}>
                {q.enunciado}
              </div>

              {q.contextoClinico && (
                <div style={{
                  margin: "16px 0", padding: "14px 18px",
                  background: "var(--input-bg)", border: "1px solid var(--card-border)",
                  borderRadius: 8,
                  fontSize: 13, lineHeight: 1.7, color: V.ch, fontStyle: "italic",
                }}>
                  {q.contextoClinico}
                </div>
              )}

              {/* Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
                {q.alternativas.map((alt) => (
                  <div
                    key={alt.letra}
                    style={optStyle(alt.letra)}
                    onClick={() => setSelectedOpt(alt.letra)}
                  >
                    <div style={optLetterStyle(alt.letra)}>{alt.letra}</div>
                    <div style={{
                      fontSize: 13, lineHeight: 1.6,
                      color: selectedOpt === alt.letra ? "var(--heading-color)" : V.nb,
                    }}>
                      {alt.texto}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Painel Lateral de Contexto */}
            <div style={{ width: 220, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 12, padding: 14 }}>
                <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 8 }}>
                  Banca
                </div>
                <div style={{ fontSize: 13, color: V.heading, fontWeight: 600 }}>{simulation.instituicao}</div>
                <div style={{ fontSize: 11, color: V.ch, marginTop: 2 }}>{simulation.area}</div>
              </div>

              {q.tags && q.tags.length > 0 && (
                <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 8 }}>
                    Tags Clínicas
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {q.tags.map((tag) => (
                      <span key={tag} style={{
                        fontFamily: V.dm, fontSize: 8, textTransform: "uppercase",
                        padding: "2px 6px", borderRadius: 9999,
                        background: "var(--input-bg)", color: V.ch, border: "1px solid var(--card-border)",
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer de Navegação */}
          <div style={{
            padding: "14px 28px",
            borderTop: "1px solid var(--card-border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "var(--card-bg)",
          }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => goTo(Math.max(0, currentIdx - 1))}
                disabled={currentIdx === 0}
                style={{
                  padding: "8px 16px", borderRadius: 8,
                  fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: currentIdx === 0 ? "not-allowed" : "pointer",
                  background: "transparent", color: V.ch, border: "1.5px solid var(--card-border)",
                  opacity: currentIdx === 0 ? 0.4 : 1,
                }}
              >
                ← Anterior
              </button>
              <button
                onClick={skipQuestion}
                style={{
                  padding: "8px 16px", borderRadius: 8,
                  fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: "transparent", color: V.wn, border: "1.5px solid rgba(245,166,35,0.25)",
                }}
              >
                Pular questão
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* Confiança */}
              <div>
                <div style={{ fontSize: 10, color: V.ch, textAlign: "right" }}>Grau de Confiança</div>
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  {[1, 2, 3, 4, 5].map((d) => (
                    <div
                      key={d}
                      onClick={() => setConfidence(d)}
                      style={{
                        width: 18, height: 6, borderRadius: 9999, cursor: "pointer",
                        background: d <= confidence ? V.pu : "var(--card-border)",
                        transition: "background 0.15s",
                      }}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={confirmAnswer}
                disabled={!selectedOpt}
                style={{
                  padding: "9px 20px", borderRadius: 8,
                  fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: selectedOpt ? "pointer" : "not-allowed",
                  background: selectedOpt ? V.pu : "rgba(0,194,168,0.3)", color: "#0A1A18", border: "none",
                  boxShadow: selectedOpt ? "0 4px 16px rgba(0,194,168,0.3)" : "none",
                }}
              >
                {currentIdx + 1 === totalQ ? "Salvar e Concluir" : "Confirmar e Avançar →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
