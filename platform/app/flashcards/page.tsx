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

const V = {
  pu: "var(--pulso)", ch: "var(--chumbo)", nb: "var(--neblina)", pe: "var(--petroleo)",
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

interface AllFlashcardItem {
  id: string;
  front: string;
  back: string;
  area: string;
  subarea: string;
  created_at?: string;
}

export default function FlashcardsPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<"revisao" | "historico">("revisao");
  
  // SRS Review State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [cards, setCards] = useState<FlashcardWithReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionCount, setSessionCount] = useState(0);

  // History State
  const [allCards, setAllCards] = useState<AllFlashcardItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState("");
  const [areaFilter, setAreaFilter] = useState("Todas");

  // Modal Novo Flashcard Manual
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCardForm, setNewCardForm] = useState({
    title: "",
    front: "",
    back: "",
    area: "Clínica Médica",
    subarea: "Geral",
  });
  const [savingCard, setSavingCard] = useState(false);

  const loadCards = useCallback(async () => {
    setLoading(true);
    const list = await fetchDueFlashcards(user?.id);
    setCards(list);
    setLoading(false);
  }, [user]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/flashcards");
      const data = await res.json();
      if (data.flashcards) {
        setAllCards(data.flashcards);
      }
    } catch (err) {
      console.warn("Erro ao carregar histórico de flashcards:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
    loadHistory();
  }, [loadCards, loadHistory]);

  const total = cards.length;
  const card = cards[currentIdx] || cards[0];

  const handleRate = async (rating: "dificil" | "ok" | "facil") => {
    if (!card) return;

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
        setCurrentIdx(total);
      }
    }, 200);
  };

  const goTo = (idx: number) => {
    setFlipped(false);
    setTimeout(() => setCurrentIdx(idx), 100);
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardForm.front.trim() || !newCardForm.back.trim()) {
      alert("Preencha a pergunta e a resposta do flashcard.");
      return;
    }

    setSavingCard(true);
    try {
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front: newCardForm.title ? `[${newCardForm.title}] ${newCardForm.front}` : newCardForm.front,
          back: newCardForm.back,
          area: newCardForm.area,
          subarea: newCardForm.subarea,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao salvar flashcard.");
      }

      alert("Flashcard criado com sucesso!");
      setShowCreateModal(false);
      setNewCardForm({ title: "", front: "", back: "", area: "Clínica Médica", subarea: "Geral" });
      loadHistory();
      loadCards();
    } catch (err: any) {
      alert(err.message || "Erro ao salvar flashcard.");
    } finally {
      setSavingCard(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm("Deseja realmente excluir este flashcard?")) return;
    try {
      await fetch(`/api/flashcards?id=${cardId}`, { method: "DELETE" });
      setAllCards(allCards.filter((c) => c.id !== cardId));
      loadCards();
    } catch (err) {
      alert("Erro ao excluir flashcard.");
    }
  };

  // Filtragem do histórico
  const filteredHistory = allCards.filter((c) => {
    const matchesArea = areaFilter === "Todas" || c.area === areaFilter;
    const s = searchHistory.toLowerCase();
    const matchesSearch =
      !s ||
      c.front.toLowerCase().includes(s) ||
      c.back.toLowerCase().includes(s) ||
      c.subarea.toLowerCase().includes(s);
    return matchesArea && matchesSearch;
  });

  return (
    <PageShell title="Flashcards" badgeText={`${sessionCount} revisados hoje`} activeNavId="flashcards">
      <style>{`
        .flip-container { perspective: 1000px; width: 100%; }
        .flip-inner { position: relative; width: 100%; min-height: 280px; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); transform-style: preserve-3d; }
        .flip-inner.flipped { transform: rotateY(180deg); }
        .flip-front, .flip-back { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 16px; }
        .flip-back { transform: rotateY(180deg); }
      `}</style>

      {/* ── HEADER & ABAS ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setActiveTab("revisao")}
            style={{
              padding: "8px 16px", borderRadius: 8,
              background: activeTab === "revisao" ? "rgba(0,194,168,0.15)" : "transparent",
              border: `1px solid ${activeTab === "revisao" ? V.pu : "rgba(61,90,128,0.3)"}`,
              color: activeTab === "revisao" ? V.pu : V.ch,
              fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            ⚡ Sessão de Revisão ({total} pendentes)
          </button>

          <button
            onClick={() => {
              setActiveTab("historico");
              loadHistory();
            }}
            style={{
              padding: "8px 16px", borderRadius: 8,
              background: activeTab === "historico" ? "rgba(0,194,168,0.15)" : "transparent",
              border: `1px solid ${activeTab === "historico" ? V.pu : "rgba(61,90,128,0.3)"}`,
              color: activeTab === "historico" ? V.pu : V.ch,
              fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            📚 Meus Decks & Histórico ({allCards.length})
          </button>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: "8px 16px", borderRadius: 8,
            background: `linear-gradient(135deg, ${V.pu}, #009688)`,
            border: "none", color: "#0A1A18", fontWeight: 700,
            fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <span>➕</span>
          <span>Criar Flashcard</span>
        </button>
      </div>

      {/* ── ABA 1: SESSÃO DE REVISÃO ATIVA ── */}
      {activeTab === "revisao" && (
        <>
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: V.ch }}>
              Carregando fila de repetição espaçada...
            </div>
          ) : currentIdx >= total ? (
            <div style={{ maxWidth: 520, margin: "60px auto", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <div style={{ fontFamily: V.df, fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
                Sessão de Repetição Espaçada Concluída!
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
            <div style={{ display: "flex", gap: 24, justifyContent: "center", alignItems: "flex-start", flexWrap: "wrap" }}>
              
              {/* ── COLUNA CENTRAL: CARD + BOTÕES SM-2 100% ALINHADOS ── */}
              <div style={{ flex: 1, maxWidth: 580, minWidth: 320, display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Progresso do card */}
                <div>
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

                {/* Card Flip */}
                <div className="flip-container">
                  <div className={`flip-inner ${flipped ? "flipped" : ""}`} onClick={() => setFlipped(!flipped)} style={{ cursor: "pointer" }}>
                    {/* FRENTE */}
                    <div className="flip-front" style={{
                      background: V.pe, border: "1px solid rgba(61,90,128,0.25)",
                      padding: "40px 32px", display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", minHeight: 280,
                    }}>
                      <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 20 }}>
                        Pergunta
                      </div>
                      <div style={{ fontSize: 16, lineHeight: 1.7, color: V.nb, textAlign: "center", fontWeight: 500 }}>
                        {card.frente}
                      </div>
                      <div style={{ marginTop: 32, fontFamily: V.dm, fontSize: 10, color: "rgba(138,154,181,0.4)" }}>
                        Toque para virar e ver a resposta →
                      </div>
                    </div>

                    {/* VERSO */}
                    <div className="flip-back" style={{
                      background: "linear-gradient(135deg, rgba(0,194,168,0.08) 0%, rgba(43,58,82,1) 100%)",
                      border: "1px solid rgba(0,194,168,0.3)",
                      padding: "40px 32px", display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", minHeight: 280,
                    }}>
                      <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: V.pu, marginBottom: 20 }}>
                        Resposta
                      </div>
                      <div style={{ fontSize: 14, lineHeight: 1.8, color: V.nb, textAlign: "center", whiteSpace: "pre-wrap" }}>
                        {card.verso}
                      </div>
                      <div style={{ marginTop: 32, fontFamily: V.dm, fontSize: 10, color: "rgba(138,154,181,0.4)" }}>
                        Toque para voltar à pergunta ←
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── BOTÕES SM-2 RIGOROSAMENTE CENTRALIZADOS ABAIXO DO BLOCO DO CARD ── */}
                <div style={{
                  background: "rgba(13,17,28,0.5)",
                  border: "1px solid rgba(61,90,128,0.2)",
                  borderRadius: 12,
                  padding: "14px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}>
                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.08em", color: V.ch }}>
                      Intervalo atual: {card.intervaloDias} dia{card.intervaloDias > 1 ? "s" : ""} · Facilidade SM-2: {card.facilidade.toFixed(1)}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                    <button onClick={() => handleRate("dificil")} style={{
                      flex: 1, padding: "12px 0", borderRadius: 8,
                      background: "rgba(255,107,107,0.1)", border: `1.5px solid rgba(255,107,107,0.35)`,
                      color: V.dg, fontFamily: V.db, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      transition: "all 0.15s",
                    }}>
                      😓 Difícil (+1d)
                    </button>
                    <button onClick={() => handleRate("ok")} style={{
                      flex: 1, padding: "12px 0", borderRadius: 8,
                      background: "rgba(245,166,35,0.1)", border: `1.5px solid rgba(245,166,35,0.35)`,
                      color: V.wn, fontFamily: V.db, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      transition: "all 0.15s",
                    }}>
                      🤔 Ok (+3d)
                    </button>
                    <button onClick={() => handleRate("facil")} style={{
                      flex: 1, padding: "12px 0", borderRadius: 8,
                      background: "rgba(34,197,94,0.1)", border: `1.5px solid rgba(34,197,94,0.35)`,
                      color: V.su, fontFamily: V.db, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      transition: "all 0.15s",
                    }}>
                      😊 Fácil (+7d)
                    </button>
                  </div>
                </div>
              </div>

              {/* ── COLUNA LATERAL: PRÓXIMOS CARDS NA FILA ── */}
              <div style={{ width: 220, flexShrink: 0 }}>
                <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 10 }}>
                  Próximos na Fila
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
                      <div style={{ fontFamily: V.dm, fontSize: 8, color: V.pu, marginTop: 4 }}>
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
          )}
        </>
      )}

      {/* ── ABA 2: MEUS DECKS & HISTÓRICO DE FLASHCARDS ── */}
      {activeTab === "historico" && (
        <div>
          {/* Filtros e Busca */}
          <div style={{
            background: V.pe, border: "1px solid rgba(61,90,128,0.25)",
            borderRadius: 12, padding: "14px 18px", marginBottom: 20,
            display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap",
          }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <input
                type="text"
                placeholder="Buscar por pergunta, resposta ou mnemônico..."
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 8,
                  background: "rgba(13,17,28,0.5)", border: "1px solid rgba(61,90,128,0.3)",
                  color: "#fff", fontFamily: V.db, fontSize: 13, outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["Todas", "Clínica Médica", "Cirurgia Geral", "Ginecologia e Obstetrícia", "Pediatria", "Saúde Coletiva"].map((a) => (
                <button
                  key={a}
                  onClick={() => setAreaFilter(a)}
                  style={{
                    padding: "6px 10px", borderRadius: 6,
                    background: areaFilter === a ? "rgba(0,194,168,0.15)" : "transparent",
                    border: `1px solid ${areaFilter === a ? V.pu : "rgba(61,90,128,0.3)"}`,
                    color: areaFilter === a ? V.pu : V.ch,
                    fontFamily: V.db, fontSize: 11, cursor: "pointer",
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Cards do Histórico */}
          {loadingHistory ? (
            <div style={{ textAlign: "center", padding: 40, color: V.ch }}>Carregando flashcards...</div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: V.ch }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <p>Nenhum flashcard encontrado com os filtros atuais.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {filteredHistory.map((fc) => (
                <div
                  key={fc.id}
                  style={{
                    background: V.pe,
                    border: "1px solid rgba(61,90,128,0.25)",
                    borderRadius: 12,
                    padding: "16px 18px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{
                        fontFamily: V.dm, fontSize: 9, padding: "2px 6px", borderRadius: 4,
                        background: "rgba(0,194,168,0.12)", color: V.pu, fontWeight: 700, textTransform: "uppercase",
                      }}>
                        {fc.area}
                      </span>
                      <span style={{ fontSize: 10, color: V.ch }}>{fc.subarea}</span>
                    </div>

                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 13, marginBottom: 8, lineHeight: 1.4 }}>
                      {fc.front}
                    </div>

                    <div style={{
                      color: V.nb, fontSize: 12, lineHeight: 1.5,
                      background: "rgba(13,17,28,0.4)", padding: "8px 10px", borderRadius: 6,
                      borderLeft: `2px solid ${V.pu}`, maxHeight: 90, overflowY: "auto",
                    }}>
                      {fc.back}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid rgba(61,90,128,0.15)", paddingTop: 8 }}>
                    <button
                      onClick={() => handleDeleteCard(fc.id)}
                      title="Excluir flashcard"
                      style={{ background: "transparent", border: "none", color: V.dg, fontSize: 11, cursor: "pointer" }}
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: NOVO FLASHCARD MANUAL ── */}
      {showCreateModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(13,17,28,0.85)",
          backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 20,
        }}>
          <div style={{
            background: "#1A1F2E", border: "1px solid rgba(0,194,168,0.4)",
            borderRadius: 16, maxWidth: 500, width: "100%", padding: 24,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontFamily: V.df, fontSize: 18, color: "#fff", margin: 0 }}>
                Criar Novo Flashcard
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: "transparent", border: "none", color: V.ch, fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCard}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, color: V.ch, marginBottom: 4, fontWeight: 600 }}>
                  Título / Nome do Flashcard (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Critérios de Light no Derrame Pleural"
                  value={newCardForm.title}
                  onChange={(e) => setNewCardForm({ ...newCardForm, title: e.target.value })}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8,
                    background: "#0D111C", border: "1px solid rgba(61,90,128,0.3)", color: "#fff",
                    fontSize: 13, outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: V.ch, marginBottom: 4, fontWeight: 600 }}>
                    Grande Área
                  </label>
                  <select
                    value={newCardForm.area}
                    onChange={(e) => setNewCardForm({ ...newCardForm, area: e.target.value })}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: 8,
                      background: "#0D111C", border: "1px solid rgba(61,90,128,0.3)", color: "#fff",
                      fontSize: 12, outline: "none",
                    }}
                  >
                    <option value="Clínica Médica">Clínica Médica</option>
                    <option value="Cirurgia Geral">Cirurgia Geral</option>
                    <option value="Ginecologia e Obstetrícia">Ginecologia e Obstetrícia</option>
                    <option value="Pediatria">Pediatria</option>
                    <option value="Saúde Coletiva">Saúde Coletiva / Preventiva</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, color: V.ch, marginBottom: 4, fontWeight: 600 }}>
                    Subárea / Tópico
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Pneumologia, ACLS..."
                    value={newCardForm.subarea}
                    onChange={(e) => setNewCardForm({ ...newCardForm, subarea: e.target.value })}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: 8,
                      background: "#0D111C", border: "1px solid rgba(61,90,128,0.3)", color: "#fff",
                      fontSize: 12, outline: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, color: V.ch, marginBottom: 4, fontWeight: 600 }}>
                  Pergunta / Frente do Card *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Qual a pergunta ou conceito a ser lembrado?"
                  value={newCardForm.front}
                  onChange={(e) => setNewCardForm({ ...newCardForm, front: e.target.value })}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8,
                    background: "#0D111C", border: "1px solid rgba(61,90,128,0.3)", color: "#fff",
                    fontSize: 13, outline: "none", resize: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, color: V.ch, marginBottom: 4, fontWeight: 600 }}>
                  Resposta / Verso do Card *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Resposta detalhada, critérios ou mnemônico..."
                  value={newCardForm.back}
                  onChange={(e) => setNewCardForm({ ...newCardForm, back: e.target.value })}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8,
                    background: "#0D111C", border: "1px solid rgba(61,90,128,0.3)", color: "#fff",
                    fontSize: 13, outline: "none", resize: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 8,
                    background: "transparent", border: "1px solid rgba(61,90,128,0.3)", color: V.ch,
                    fontWeight: 600, fontSize: 13, cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCard}
                  style={{
                    flex: 2, padding: "10px 0", borderRadius: 8,
                    background: V.pu, border: "none", color: "#0A1A18",
                    fontWeight: 700, fontSize: 13, cursor: savingCard ? "not-allowed" : "pointer",
                  }}
                >
                  {savingCard ? "Salvando..." : "Salvar Flashcard"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
