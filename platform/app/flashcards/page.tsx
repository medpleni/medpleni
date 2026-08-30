"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageShell } from "@/components/layout";
import { ProgressBar } from "@/components/ui";
import { useUser } from "@/lib/supabase/use-user";
import {
  fetchDueFlashcards,
  submitFlashcardReview,
  type FlashcardWithReview,
} from "@/lib/supabase/flashcards";

/* ═══════════════════════════════════════════
   FLASHCARDS — Spaced Repetition (SRS Real)
═══════════════════════════════════════════ */

const V = {
  pu: "#00C2A8", ch: "#8A9AB5", nb: "#E0E6F0", pe: "#2B3A52",
  wn: "#F5A623", dg: "#FF6B6B", su: "#22C55E",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
};

export default function FlashcardsPage() {
  const { user } = useUser();
  const [activeNav, setActiveNav] = useState("flashcards");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [cards, setCards] = useState<FlashcardWithReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionCount, setSessionCount] = useState(0);

  const loadCards = useCallback(async () => {
    setLoading(true);
    const list = await fetchDueFlashcards(user?.id);
    setCards(list);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const total = cards.length;
  const card = cards[currentIdx] || cards[0];

  const handleRate = async (rating: "dificil" | "ok" | "facil") => {
    if (!card) return;

    // Atualiza algoritmo SM-2 no Supabase
    await submitFlashcardReview({
      userId: user?.id,
      flashcardId: card.id,
      rating,
      currentEase: card.easeFactor,
      currentInterval: card.intervaloDias,
      currentReps: card.repetitions,
    });

    setSessionCount((prev) => prev + 1);
    setFlipped(false);

    setTimeout(() => {
      if (currentIdx < total - 1) {
        setCurrentIdx((i) => i + 1);
      } else {
        // Concluiu todos da fila
        setCurrentIdx(total);
      }
    }, 200);
  };

  const goTo = (idx: number) => {
    setFlipped(false);
    setTimeout(() => setCurrentIdx(idx), 100);
  };

  return (
    <PageShell title="Flashcards" badgeText={`${sessionCount} revisados hoje`} activeNavId={activeNav} onNavigate={setActiveNav}>
      <style>{`
        .flip-container { perspective: 1000px; width: 100%; max-width: 560px; margin: 0 auto; }
        .flip-inner { position: relative; width: 100%; min-height: 300px; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); transform-style: preserve-3d; }
        .flip-inner.flipped { transform: rotateY(180deg); }
        .flip-front, .flip-back { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 16px; }
        .flip-back { transform: rotateY(180deg); }
      `}</style>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: V.ch }}>
          Carregando fila de repetição espaçada...
        </div>
      ) : currentIdx >= total ? (
        /* Sessão Concluída */
        <div style={{ maxWidth: 520, margin: "60px auto", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <div style={{ fontFamily: V.df, fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
            Sessão de Spaced Repetition Concluída!
          </div>
          <div style={{ fontSize: 14, color: V.ch, lineHeight: 1.6, marginBottom: 24 }}>
            Você revisou <strong style={{ color: V.pu }}>{sessionCount} flashcards</strong> hoje.
            O algoritmo já reagendou os próximos cards de acordo com seu ritmo de retenção e curva de esquecimento.
          </div>
          <button
            onClick={() => {
              setCurrentIdx(0);
              loadCards();
            }}
            style={{
              padding: "12px 24px", borderRadius: 8,
              background: V.pu, border: "none", color: "#0A1A18",
              fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Reiniciar Sessão de Flashcards
          </button>
        </div>
      ) : (
        <>
          {/* ── Progress ── */}
          <div style={{ maxWidth: 560, margin: "0 auto 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch }}>
                Card {currentIdx + 1} de {total} · {card.area}
              </span>
              <span style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.08em", color: V.pu }}>
                {card.subarea}
              </span>
            </div>
            <ProgressBar value={((currentIdx + 1) / total) * 100} variant="green" />
          </div>

          <div style={{ display: "flex", gap: 24, alignItems: "flex-start", justifyContent: "center", flexWrap: "wrap" }}>

            {/* ── MAIN CARD with flip ── */}
            <div className="flip-container">
              <div className={`flip-inner ${flipped ? "flipped" : ""}`} onClick={() => setFlipped(!flipped)} style={{ cursor: "pointer" }}>
                {/* FRONT */}
                <div className="flip-front" style={{
                  background: V.pe, border: "1px solid rgba(61,90,128,0.25)",
                  padding: "40px 32px", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 20 }}>
                    Pergunta
                  </div>
                  <div style={{ fontSize: 16, lineHeight: 1.7, color: V.nb, textAlign: "center" }}>
                    {card.frente}
                  </div>
                  <div style={{ marginTop: 32, fontFamily: V.dm, fontSize: 10, color: "rgba(138,154,181,0.35)" }}>
                    Toque para virar →
                  </div>
                </div>

                {/* BACK */}
                <div className="flip-back" style={{
                  background: "linear-gradient(135deg, rgba(0,194,168,0.06) 0%, rgba(43,58,82,1) 100%)",
                  border: "1px solid rgba(0,194,168,0.2)",
                  padding: "40px 32px", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: V.pu, marginBottom: 20 }}>
                    Resposta
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.8, color: V.nb, textAlign: "center" }}>
                    {card.verso.split(/(\b(?:Universalidade|Equidade|Integralidade|PNAB|ESF|ACS|RAS|APS|TMI|NASF-AB|Descentralização|Regionalização|SUS|Incidência|Prevalência)\b)/gi).map((part, i) => {
                      if (i % 2 === 1) return <strong key={i} style={{ color: V.pu }}>{part}</strong>;
                      return part;
                    })}
                  </div>
                  <div style={{ marginTop: 32, fontFamily: V.dm, fontSize: 10, color: "rgba(138,154,181,0.35)" }}>
                    Toque para voltar ←
                  </div>
                </div>
              </div>
            </div>

            {/* ── SIDE QUEUE ── */}
            <div style={{ width: 180, flexShrink: 0 }}>
              <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 10 }}>
                Próximos cards
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {cards.slice(currentIdx + 1, currentIdx + 6).map((fc, i) => (
                  <div
                    key={fc.id}
                    onClick={() => goTo(currentIdx + 1 + i)}
                    style={{
                      padding: "10px 12px", borderRadius: 8,
                      background: "rgba(43,58,82,0.4)", border: "1px solid rgba(61,90,128,0.15)",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontSize: 11, color: V.nb, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {fc.frente}
                    </div>
                    <div style={{ fontFamily: V.dm, fontSize: 8, color: V.ch, marginTop: 4 }}>
                      {fc.subarea}
                    </div>
                  </div>
                ))}
                {currentIdx >= total - 1 && (
                  <div style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, color: V.ch }}>
                    Fim da fila ✓
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RATING BUTTONS (SM-2) ── */}
          <div style={{ maxWidth: 560, margin: "20px auto 0" }}>
            <div style={{ textAlign: "center", marginBottom: 14 }}>
              <span style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.08em", color: V.ch }}>
                Intervalo atual: {card.intervaloDias} dia{card.intervaloDias > 1 ? "s" : ""} · Facilidade SM-2: {card.facilidade.toFixed(1)}
              </span>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => handleRate("dificil")} style={{
                flex: 1, padding: "12px 0", borderRadius: 10,
                background: "transparent", border: `1.5px solid rgba(255,107,107,0.3)`,
                color: V.dg, fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "all 0.15s",
              }}>
                😓 Difícil (+1d)
              </button>
              <button onClick={() => handleRate("ok")} style={{
                flex: 1, padding: "12px 0", borderRadius: 10,
                background: "transparent", border: `1.5px solid rgba(245,166,35,0.3)`,
                color: V.wn, fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "all 0.15s",
              }}>
                🤔 Ok (+3d)
              </button>
              <button onClick={() => handleRate("facil")} style={{
                flex: 1, padding: "12px 0", borderRadius: 10,
                background: "transparent", border: `1.5px solid rgba(34,197,94,0.3)`,
                color: V.su, fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "all 0.15s",
              }}>
                😊 Fácil (+7d)
              </button>
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
}
