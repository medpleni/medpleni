"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ScoreRing, ProgressBar, Badge, Card } from "@/components/ui";
import { mockQuestions } from "@/lib/mock-data";

/* ═══════════════════════════════════════════════════
   DIAGNÓSTICO — Raio-X Inicial
═══════════════════════════════════════════════════ */

const V = {
  pu: "#00C2A8", ch: "#8A9AB5", nb: "#E0E6F0",
  wn: "#F5A623", dg: "#FF6B6B", pe: "#2B3A52",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
};

type Phase = "intro" | "questions" | "reveal" | "result";

const TOTAL_DIAG = 10; // 10 questions for diagnostic
const diagQuestions = mockQuestions.slice(0, TOTAL_DIAG);

const resultData = [
  { area: "Clínica Médica", pct: 78, status: "bom" },
  { area: "Cirurgia Geral", pct: 62, status: "atencao" },
  { area: "Saúde Coletiva", pct: 54, status: "critico" },
  { area: "Pediatria", pct: 71, status: "bom" },
  { area: "Ginecologia e Obstetrícia", pct: 45, status: "critico" },
];

const statusVariant = (s: string) =>
  s === "bom" ? "green" : s === "atencao" ? "warn" : "danger";

const statusLabel = (s: string) =>
  s === "bom" ? "Forte" : s === "atencao" ? "Atenção" : "Prioridade";

const overallScore = 62;

export default function DiagnosticoPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [qIdx, setQIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealProgress, setRevealProgress] = useState(0);

  /* ── Reveal animation ── */
  useEffect(() => {
    if (phase !== "reveal") return;
    const id = setInterval(() => {
      setRevealProgress((p) => {
        if (p >= 100) {
          clearInterval(id);
          setTimeout(() => setPhase("result"), 600);
          return 100;
        }
        return p + 2;
      });
    }, 50);
    return () => clearInterval(id);
  }, [phase]);

  const confirmAnswer = () => {
    if (!selectedOpt) return;
    setAnswers((prev) => ({ ...prev, [qIdx]: selectedOpt }));
    if (qIdx + 1 >= TOTAL_DIAG) {
      setPhase("reveal");
    } else {
      setQIdx((i) => i + 1);
      setSelectedOpt(null);
    }
  };

  const q = diagQuestions[qIdx];

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
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 20%, rgba(0,194,168,0.04) 0%, var(--abismo) 60%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "40px 20px",
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulseDot { 0%,100% { box-shadow: 0 0 0 0 rgba(0,194,168,0.4); } 50% { box-shadow: 0 0 0 14px rgba(0,194,168,0); } }
        @keyframes revealIn { from { opacity:0; transform:scale(0.9); } to { opacity:1; transform:scale(1); } }
      `}</style>

      {/* ── INTRO ── */}
      {phase === "intro" && (
        <div style={{
          maxWidth: 520, textAlign: "center", animation: "fadeUp 0.5s ease",
          marginTop: 60,
        }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🔬</div>
          <div style={{ fontFamily: V.df, fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", marginBottom: 8 }}>
            Raio-X Inicial
          </div>
          <div style={{ fontSize: 15, color: V.ch, lineHeight: 1.7, marginBottom: 12 }}>
            Antes de criar seu plano personalizado, precisamos entender onde você está.
            Responda <strong style={{ color: "#fff" }}>10 questões</strong> de diferentes áreas para mapearmos suas forças e lacunas.
          </div>
          <div style={{
            display: "flex", justifyContent: "center", gap: 24, marginBottom: 32,
            fontFamily: V.dm, fontSize: 10, letterSpacing: "0.08em",
            color: V.ch, textTransform: "uppercase",
          }}>
            <span>⏱ ~8 min</span>
            <span>📋 10 questões</span>
            <span>🎯 5 áreas</span>
          </div>
          <button onClick={() => setPhase("questions")} style={{
            padding: "14px 32px", borderRadius: 10,
            background: V.pu, border: "none", color: "#0A1A18",
            fontFamily: V.db, fontSize: 15, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,194,168,0.35)",
          }}>
            Começar diagnóstico →
          </button>
        </div>
      )}

      {/* ── QUESTIONS ── */}
      {phase === "questions" && (
        <div style={{ width: "100%", maxWidth: 700, animation: "fadeUp 0.3s ease" }}>
          {/* Progress */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch }}>
                Questão {qIdx + 1} de {TOTAL_DIAG}
              </span>
              <span style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.08em", color: V.pu }}>
                {q.area}
              </span>
            </div>
            <div style={{ height: 4, background: "rgba(61,90,128,0.2)", borderRadius: 9999, overflow: "hidden" }}>
              <div style={{ width: `${((qIdx + 1) / TOTAL_DIAG) * 100}%`, height: "100%", background: V.pu, borderRadius: 9999, transition: "width 0.4s" }} />
            </div>
          </div>

          {/* Question card */}
          <div style={{
            background: V.pe, border: "1px solid rgba(61,90,128,0.25)",
            borderRadius: 16, padding: "28px",
          }}>
            <div style={{ fontSize: 14, lineHeight: 1.75, color: V.nb, marginBottom: 8 }}>
              {q.enunciado}
            </div>

            {q.contextoClinico && (
              <div style={{
                margin: "14px 0", padding: "12px 14px",
                background: "rgba(43,58,82,0.4)", border: "1px solid rgba(61,90,128,0.2)",
                borderLeft: "3px solid rgba(0,194,168,0.4)", borderRadius: 8,
                fontSize: 13, lineHeight: 1.7, color: V.ch, fontStyle: "italic",
              }}>
                {q.contextoClinico}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
              {q.alternativas.map((alt) => (
                <div key={alt.letra} style={optStyle(alt.letra)} onClick={() => setSelectedOpt(alt.letra)}>
                  <div style={optLetterStyle(alt.letra)}>{alt.letra}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: selectedOpt === alt.letra ? "#fff" : V.nb }}>
                    {alt.texto}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button onClick={confirmAnswer} style={{
              padding: "10px 24px", borderRadius: 8,
              background: selectedOpt ? V.pu : "rgba(0,194,168,0.3)",
              border: "none", color: "#0A1A18",
              fontFamily: V.db, fontSize: 13, fontWeight: 600,
              cursor: selectedOpt ? "pointer" : "not-allowed",
              boxShadow: selectedOpt ? "0 4px 16px rgba(0,194,168,0.3)" : "none",
            }}>
              {qIdx + 1 >= TOTAL_DIAG ? "Finalizar →" : "Próxima →"}
            </button>
          </div>
        </div>
      )}

      {/* ── REVEAL ── */}
      {phase === "reveal" && (
        <div style={{ textAlign: "center", marginTop: 80, animation: "fadeUp 0.5s ease" }}>
          <div style={{
            width: 24, height: 24, borderRadius: "50%", background: V.pu,
            margin: "0 auto 24px",
            animation: "pulseDot 1.4s ease infinite",
          }} />
          <div style={{ fontFamily: V.df, fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
            Analisando suas respostas...
          </div>
          <div style={{ fontSize: 14, color: V.ch, marginBottom: 32 }}>
            Mapeando forças e lacunas em 5 grandes áreas
          </div>
          <div style={{ width: 300, height: 6, background: "rgba(61,90,128,0.2)", borderRadius: 9999, overflow: "hidden", margin: "0 auto" }}>
            <div style={{ width: `${revealProgress}%`, height: "100%", background: V.pu, borderRadius: 9999, transition: "width 0.1s" }} />
          </div>
          <div style={{ fontFamily: V.dm, fontSize: 11, color: V.ch, marginTop: 8 }}>
            {revealProgress}%
          </div>
        </div>
      )}

      {/* ── RESULT ── */}
      {phase === "result" && (
        <div style={{ width: "100%", maxWidth: 640, animation: "revealIn 0.6s ease" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontFamily: V.df, fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
              Seu Raio-X Inicial
            </div>
            <div style={{ fontSize: 13, color: V.ch }}>
              Baseado em {TOTAL_DIAG} questões de 5 áreas da medicina
            </div>
          </div>

          {/* Score Ring Central */}
          <div style={{
            display: "flex", justifyContent: "center", marginBottom: 32,
          }}>
            <div style={{ textAlign: "center" }}>
              <ScoreRing score={overallScore} size={160} sublabel="diagnóstico" />
              <div style={{ fontFamily: V.df, fontSize: 20, fontWeight: 700, color: V.wn, marginTop: 12 }}>
                Moderado
              </div>
              <div style={{ fontSize: 12, color: V.ch, marginTop: 4 }}>
                Você tem base sólida mas lacunas importantes a corrigir
              </div>
            </div>
          </div>

          {/* Area bars */}
          <Card hoverable={false} style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 16 }}>
              Desempenho por área
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {resultData.map((r) => (
                <div key={r.area}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: V.nb }}>{r.area}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Badge variant={statusVariant(r.status) as any}>{statusLabel(r.status)}</Badge>
                      <span style={{ fontFamily: V.dm, fontSize: 11, color: r.status === "bom" ? V.pu : r.status === "atencao" ? V.wn : V.dg }}>
                        {r.pct}%
                      </span>
                    </div>
                  </div>
                  <ProgressBar
                    value={r.pct}
                    variant={r.status === "bom" ? "green" : r.status === "atencao" ? "warn" : "danger"}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Plano de ação */}
          <Card hoverable={false} style={{
            marginBottom: 16,
            background: "linear-gradient(135deg, rgba(0,194,168,0.06) 0%, rgba(0,119,182,0.04) 100%)",
            borderColor: "rgba(0,194,168,0.2)",
          }}>
            <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: V.pu, marginBottom: 12 }}>
              📋 Plano de Ação Personalizado
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { icon: "🔴", text: "GO e Saúde Coletiva são suas prioridades — recomendamos simulados focados nessas áreas" },
                { icon: "🟡", text: "Cirurgia Geral precisa de atenção moderada — revise os temas de urgência/emergência" },
                { icon: "🟢", text: "Continue fortalecendo CM e Pediatria — você está no caminho certo" },
              ].map((item, i) => (
                <div key={i} style={{
                  display: "flex", gap: 10, alignItems: "flex-start",
                  padding: "10px 12px", background: "rgba(26,31,46,0.5)",
                  borderRadius: 8, border: "1px solid rgba(61,90,128,0.15)",
                }}>
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  <span style={{ fontSize: 12, color: V.nb, lineHeight: 1.6 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button onClick={() => {}} style={{
              flex: 1, padding: "13px 0", borderRadius: 10,
              background: "transparent", border: "1.5px solid rgba(61,90,128,0.3)",
              color: V.ch, fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              Compartilhar resultado
            </button>
            <button onClick={() => router.push("/dashboard")} style={{
              flex: 1, padding: "13px 0", borderRadius: 10,
              background: V.pu, border: "none", color: "#0A1A18",
              fontFamily: V.db, fontSize: 14, fontWeight: 600, cursor: "pointer",
              boxShadow: "0 4px 20px rgba(0,194,168,0.35)",
            }}>
              Começar trial de 7 dias →
            </button>
          </div>

          {/* Footer note */}
          <div style={{
            textAlign: "center", marginTop: 24,
            fontFamily: V.dm, fontSize: 9, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "rgba(138,154,181,0.35)",
          }}>
            Diagnóstico baseado em IA · resultados aprimoram com uso contínuo
          </div>
        </div>
      )}
    </div>
  );
}
