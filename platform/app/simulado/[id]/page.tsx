"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { mockQuestions } from "@/lib/mock-data";

/* ══════════════════════════════════════════════
   SIMULADO PAGE — pixel-perfect from medpleni-part3-dashboard.html
══════════════════════════════════════════════ */

const TOTAL_Q = 120;
const INITIAL_Q = 22; // q0…q21 already answered

type QState = "done" | "curr" | "skip" | "todo";

export default function SimuladoPage() {
  /* ── State ── */
  const [currentIdx, setCurrentIdx] = useState(INITIAL_Q); // 0-indexed
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(3);
  const [answers, setAnswers] = useState<Record<number, { letter: string; confidence: number }>>({});
  const [skipped, setSkipped] = useState<Set<number>>(new Set([23, 24])); // q24,q25 in 1-indexed
  const [timerSecs, setTimerSecs] = useState(6442); // 01:47:22

  /* ── Timer ── */
  useEffect(() => {
    const id = setInterval(() => setTimerSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return { h: String(h).padStart(2, "0"), m: String(m).padStart(2, "0"), s: String(ss).padStart(2, "0") };
  };
  const t = fmtTime(timerSecs);

  /* ── Question data ── */
  const q = mockQuestions[currentIdx % mockQuestions.length];
  const answeredCount = Object.keys(answers).length + INITIAL_Q;
  const skippedCount = skipped.size;

  /* ── Q State helpers ── */
  const getQState = (idx: number): QState => {
    if (idx === currentIdx) return "curr";
    if (idx < INITIAL_Q || answers[idx]) return "done";
    if (skipped.has(idx)) return "skip";
    return "todo";
  };

  /* ── Actions ── */
  const confirmAnswer = () => {
    if (!selectedOpt) return;
    setAnswers((prev) => ({ ...prev, [currentIdx]: { letter: selectedOpt, confidence } }));
    setSkipped((prev) => { const n = new Set(prev); n.delete(currentIdx); return n; });
    goNext();
  };

  const skipQuestion = () => {
    setSkipped((prev) => new Set(prev).add(currentIdx));
    goNext();
  };

  const goNext = () => {
    setSelectedOpt(null);
    setConfidence(3);
    setCurrentIdx((prev) => Math.min(prev + 1, TOTAL_Q - 1));
  };

  const goPrev = () => {
    setSelectedOpt(null);
    setConfidence(3);
    setCurrentIdx((prev) => Math.max(0, prev - 1));
  };

  /* ── Styles (all extracted from medpleni-part3-dashboard.html) ── */
  const V = {
    ab: "#1A1F2E", pe: "#2B3A52", si: "#3D5A80",
    nb: "#E0E6F0", ch: "#8A9AB5", pu: "#00C2A8",
    re: "#0077B6", rel: "#64B5E8", dg: "#FF6B6B", wn: "#F5A623",
    df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
    db: "var(--font-body), 'Inter', sans-serif",
    dm: "'IBM Plex Mono', monospace",
  };

  /* ── Q-dot colors from sim-q-num classes ── */
  const qDotStyle = (state: QState): React.CSSProperties => {
    const base: React.CSSProperties = {
      width: 28, height: 28, borderRadius: 6,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: V.dm, fontSize: 9, letterSpacing: "0.04em", cursor: "pointer",
    };
    switch (state) {
      case "done": return { ...base, background: "rgba(0,194,168,0.12)", color: V.pu, border: "1px solid rgba(0,194,168,0.2)" };
      case "curr": return { ...base, background: V.pu, color: "#0A1A18", fontWeight: 700 };
      case "skip": return { ...base, background: "rgba(245,166,35,0.1)", color: V.wn, border: "1px solid rgba(245,166,35,0.15)" };
      case "todo": return { ...base, background: "rgba(61,90,128,0.1)", color: V.ch, border: "1px solid rgba(61,90,128,0.15)" };
    }
  };

  const optStyle = (letter: string): React.CSSProperties => {
    const isSel = selectedOpt === letter;
    return {
      display: "flex", gap: 14, alignItems: "flex-start",
      padding: "12px 16px",
      background: isSel ? "rgba(0,194,168,0.06)" : "rgba(43,58,82,0.3)",
      border: `1.5px solid ${isSel ? "rgba(0,194,168,0.4)" : "rgba(61,90,128,0.25)"}`,
      borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
    };
  };

  const optLetterStyle = (letter: string): React.CSSProperties => {
    const isSel = selectedOpt === letter;
    return {
      fontFamily: V.dm, fontSize: 11, letterSpacing: "0.08em",
      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: isSel ? V.pu : "rgba(61,90,128,0.2)",
      color: isSel ? "#0A1A18" : V.ch, marginTop: 1,
    };
  };

  return (
    <div style={{ background: "#0D111C", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── SIM TOPBAR ── */}
      <div style={{
        height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", background: "#0D111C",
        borderBottom: "1px solid rgba(61,90,128,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontFamily: V.df, fontWeight: 700, fontSize: 17, color: "#fff" }}>
            Med<span style={{ color: V.pu }}>Pleni</span>
          </div>
          <div style={{ width: 1, height: 20, background: "rgba(61,90,128,0.3)" }} />
          <div style={{ fontSize: 12, color: V.ch, fontFamily: V.dm }}>
            RESID · Simulado Intensivo 2026 · Clínica Médica
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div>
            <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.08em", color: V.ch }}>
              Q {currentIdx + 1} / {TOTAL_Q}
            </div>
            <div style={{ width: 160, height: 4, background: "rgba(61,90,128,0.2)", borderRadius: 9999, overflow: "hidden", marginTop: 4 }}>
              <div style={{ width: `${((currentIdx + 1) / TOTAL_Q) * 100}%`, height: "100%", background: V.pu, borderRadius: 9999, transition: "width 0.3s" }} />
            </div>
          </div>
          <div style={{
            fontFamily: V.dm, fontSize: 15, letterSpacing: "0.04em", color: "#fff",
            background: "rgba(61,90,128,0.2)", padding: "4px 12px", borderRadius: 8,
          }}>
            {t.h}:<span style={{ color: V.wn }}>{t.m}</span>:{t.s}
          </div>
          <button style={{
            padding: "6px 14px", background: "transparent",
            border: "1.5px solid rgba(255,107,107,0.3)", borderRadius: 8,
            color: V.dg, fontFamily: V.db, fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>
            Encerrar
          </button>
        </div>
      </div>

      {/* ── SIM LAYOUT: 3 columns ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── LEFT SIDEBAR (200px) ── */}
        <div style={{
          width: 200, flexShrink: 0, background: "#0D111C",
          borderRight: "1px solid rgba(61,90,128,0.15)", padding: 16,
          overflowY: "auto",
        }}>
          <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: V.ch, marginBottom: 12 }}>
            Questões
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5 }}>
            {Array.from({ length: 30 }, (_, i) => (
              <div
                key={i}
                style={qDotStyle(getQState(i))}
                onClick={() => { setCurrentIdx(i); setSelectedOpt(null); }}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.08em", color: "rgba(138,154,181,0.4)", textAlign: "center", marginTop: 6 }}>
            ... {TOTAL_Q - 30} questões
          </div>
          {/* Stats */}
          <div style={{ marginTop: 16, borderTop: "1px solid rgba(61,90,128,0.15)", paddingTop: 14 }}>
            {[
              { label: "Respondidas", value: answeredCount, color: V.pu },
              { label: "Puladas", value: skippedCount, color: V.wn },
              { label: "Acerto parcial", value: "~82%", color: "#fff" },
              { label: "Tempo médio", value: "1m 52s", color: V.ch },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: V.ch }}>{s.label}</span>
                <span style={{ fontFamily: V.dm, fontSize: 11, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ flex: 1, background: V.ab, display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div style={{ padding: "20px 28px 16px", borderBottom: "1px solid rgba(61,90,128,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: V.pu }}>
                Questão {currentIdx + 1}
              </span>
              <span style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: V.ch }}>
                {q.area} · {q.subarea.split(" — ")[0]}
              </span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontFamily: V.dm, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
                padding: "2px 7px", borderRadius: 9999,
                background: "rgba(245,166,35,0.1)", color: V.wn, border: "1px solid rgba(245,166,35,0.15)",
              }}>
                {q.dificuldade === "facil" ? "Fácil" : q.dificuldade === "media" ? "Média" : q.dificuldade === "alta" ? "Alta" : "Muito Alta"}
              </span>
              <span style={{ marginLeft: "auto", fontFamily: V.dm, fontSize: 9, letterSpacing: "0.08em", color: "rgba(138,154,181,0.4)" }}>
                {q.instituicao} {q.ano} · adaptada
              </span>
            </div>
          </div>

          {/* Body: question + panel */}
          <div style={{ flex: 1, padding: "24px 28px", display: "flex", gap: 28, overflowY: "auto" }}>
            {/* Question */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, lineHeight: 1.75, color: V.nb, marginBottom: 6 }}
                dangerouslySetInnerHTML={{ __html: q.enunciado.replace(/<(\d)/g, '&lt;$1').replace(/(\d)>/g, '$1&gt;') }}
              />

              {q.contextoClinico && (
                <div style={{
                  margin: "16px 0", padding: "14px 16px",
                  background: "rgba(43,58,82,0.4)", border: "1px solid rgba(61,90,128,0.2)",
                  borderLeft: "3px solid rgba(0,194,168,0.4)", borderRadius: 8,
                  fontSize: 13, lineHeight: 1.7, color: V.ch, fontStyle: "italic",
                }}>
                  {q.contextoClinico}
                </div>
              )}

              <div style={{ fontSize: 13, color: V.nb, marginBottom: 16 }}>
                Qual a conduta <strong style={{ color: "#fff" }}>imediata</strong> mais adequada para este paciente?
              </div>

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
                      color: selectedOpt === alt.letra ? "#fff" : V.nb,
                    }}>
                      {alt.texto}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Side panel (200px) */}
            <div style={{ width: 200, flexShrink: 0 }}>
              {/* Mini ring */}
              <div style={{
                background: V.pe, border: "1px solid rgba(61,90,128,0.25)",
                borderRadius: 12, padding: 16, marginBottom: 12,
              }}>
                <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 12 }}>
                  Meu desempenho em {q.subarea.split(" — ")[0]}
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(61,90,128,0.2)" strokeWidth="8" />
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#64B5E8" strokeWidth="8"
                      strokeDasharray="201.1" strokeDashoffset="40.2" strokeLinecap="round"
                      transform="rotate(-90 40 40)" />
                    <text x="40" y="36" textAnchor="middle" fontFamily="'IBM Plex Mono'" fontSize="14" fill="white">80%</text>
                    <text x="40" y="48" textAnchor="middle" fontFamily="'Inter'" fontSize="7" fill="#8A9AB5">acerto</text>
                  </svg>
                </div>
                <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.08em", color: V.ch, textAlign: "center", marginTop: 8 }}>
                  42 questões respondidas
                </div>
              </div>

              {/* Fonte */}
              <div style={{
                background: V.pe, border: "1px solid rgba(61,90,128,0.25)",
                borderRadius: 12, padding: 16, marginBottom: 12,
              }}>
                <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 12 }}>
                  Fonte
                </div>
                <div style={{ fontSize: 11, color: V.ch, lineHeight: 1.5 }}>
                  <strong style={{ color: V.nb, display: "block", marginBottom: 4 }}>
                    {q.subarea} — Diretriz
                  </strong>
                  SBC/SBH 2023 · Classe I, Nível A
                </div>
              </div>

              {/* Tags */}
              <div style={{
                background: V.pe, border: "1px solid rgba(61,90,128,0.25)",
                borderRadius: 12, padding: 16,
              }}>
                <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 12 }}>
                  Tags relacionadas
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {(q.tags || []).map((tag) => (
                    <span key={tag} style={{
                      fontFamily: V.dm, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
                      padding: "2px 7px", borderRadius: 9999,
                      background: "rgba(61,90,128,0.15)", color: V.ch,
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div style={{
            padding: "14px 28px",
            borderTop: "1px solid rgba(61,90,128,0.15)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "#0D111C",
          }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={goPrev} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 8,
                fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: "transparent", color: V.ch, border: "1.5px solid rgba(61,90,128,0.3)",
                transition: "all 0.15s",
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                Anterior
              </button>
              <button onClick={skipQuestion} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 8,
                fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: "transparent", color: V.wn, border: "1.5px solid rgba(245,166,35,0.25)",
                transition: "all 0.15s",
              }}>
                Pular questão
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Confidence dots */}
              <div>
                <div style={{ fontSize: 11, color: V.ch }}>Nível de confiança</div>
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  {[1, 2, 3, 4, 5].map((d) => (
                    <div
                      key={d}
                      onClick={() => setConfidence(d)}
                      style={{
                        width: 20, height: 6, borderRadius: 9999, cursor: "pointer",
                        background:
                          d <= confidence
                            ? d <= 3 ? V.pu : V.wn
                            : "rgba(61,90,128,0.2)",
                        transition: "background 0.15s",
                      }}
                    />
                  ))}
                </div>
              </div>

              <button onClick={confirmAnswer} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 8,
                fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: V.pu, color: "#0A1A18", border: "none",
                boxShadow: "0 4px 16px rgba(0,194,168,0.3)",
                transition: "all 0.15s",
                opacity: selectedOpt ? 1 : 0.5,
              }}>
                Confirmar resposta
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
