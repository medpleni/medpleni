"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PageShell } from "@/components/layout";
import { ProgressBar } from "@/components/ui";
import { useUser } from "@/lib/supabase/use-user";
import {
  fetchDueFlashcards,
  submitFlashcardReview,
  type FlashcardWithReview,
} from "@/lib/supabase/flashcards";
import type { Area } from "@/lib/types";

const V = {
  pu: "var(--pulso)",
  ch: "var(--chumbo)",
  nb: "var(--neblina)",
  pe: "var(--petroleo)",
  wn: "var(--warn)",
  dg: "var(--danger)",
  su: "var(--success)",
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

function toReviewable(fc: AllFlashcardItem): FlashcardWithReview {
  return {
    id: fc.id,
    frente: fc.front,
    verso: fc.back,
    area: (fc.area as Area) || "Clínica Médica",
    subarea: fc.subarea || "Geral",
    proximaRevisao: new Date().toISOString().split("T")[0],
    intervaloDias: 1,
    facilidade: 2.5,
    easeFactor: 2.5,
    repetitions: 0,
    nextReviewAt: new Date().toISOString(),
    isDue: true,
  };
}

export default function FlashcardsPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<"revisao" | "historico">("revisao");

  // Review Scope (Fila diária vs Deck específico vs Card específico)
  const [activeReviewScope, setActiveReviewScope] = useState<{
    title: string;
    isCustom: boolean;
  } | null>(null);

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

  // Modal Editar Flashcard
  const [editingCard, setEditingCard] = useState<AllFlashcardItem | null>(null);
  const [editForm, setEditForm] = useState({
    front: "",
    back: "",
    area: "Clínica Médica",
    subarea: "Geral",
  });
  const [savingEdit, setSavingEdit] = useState(false);

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

  // Iniciar treino de um card individual
  const startReviewSingleCard = (fc: AllFlashcardItem) => {
    const reviewable = toReviewable(fc);
    setCards([reviewable]);
    setCurrentIdx(0);
    setFlipped(false);
    setActiveReviewScope({
      title: `Card Individual: ${fc.front.replace(/^\[.*?\]\s*/, "").slice(0, 32)}...`,
      isCustom: true,
    });
    setActiveTab("revisao");
  };

  // Iniciar treino de um deck completo
  const startReviewDeck = (deckTitle: string, deckCards: AllFlashcardItem[]) => {
    if (deckCards.length === 0) {
      alert("Este deck ainda não possui flashcards cadastrados.");
      return;
    }
    const reviewableList = deckCards.map(toReviewable);
    setCards(reviewableList);
    setCurrentIdx(0);
    setFlipped(false);
    setActiveReviewScope({
      title: `Deck: ${deckTitle} (${deckCards.length} cards)`,
      isCustom: true,
    });
    setActiveTab("revisao");
  };

  // Resetar para a fila de revisão diária
  const handleResetToDailyQueue = () => {
    setActiveReviewScope(null);
    setCurrentIdx(0);
    setFlipped(false);
    loadCards();
  };

  // Criação de Card Manual
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

  // Abrir Modal de Edição
  const handleOpenEdit = (fc: AllFlashcardItem) => {
    setEditingCard(fc);
    setEditForm({
      front: fc.front,
      back: fc.back,
      area: fc.area || "Clínica Médica",
      subarea: fc.subarea || "Geral",
    });
  };

  // Salvar Edição
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;

    setSavingEdit(true);
    try {
      const res = await fetch("/api/flashcards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCard.id,
          front: editForm.front,
          back: editForm.back,
          area: editForm.area,
          subarea: editForm.subarea,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao atualizar flashcard.");
      }

      setEditingCard(null);
      loadHistory();
      loadCards();
    } catch (err: any) {
      alert(err.message || "Erro ao atualizar flashcard.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Exclusão de Card
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

  // Organização dos Decks
  const decksData = useMemo(() => {
    const preceptorCards = allCards.filter(
      (c) =>
        c.subarea?.toLowerCase().includes("preceptor") ||
        c.subarea?.toLowerCase().includes("ia") ||
        c.front.startsWith("[Resposta Direta") ||
        c.front.startsWith("[Conduta")
    );

    const clinicaCards = allCards.filter((c) => c.area === "Clínica Médica");
    const cirurgiaCards = allCards.filter((c) => c.area === "Cirurgia Geral");
    const pedCards = allCards.filter((c) => c.area === "Pediatria");
    const goCards = allCards.filter((c) => c.area === "Ginecologia e Obstetrícia");
    const scCards = allCards.filter((c) => c.area === "Saúde Coletiva");

    return [
      {
        id: "preceptor",
        title: "Deck Preceptor IA",
        subtitle: "Cards salvos das consultas com Dr. Pleni IA",
        cards: preceptorCards,
        color: "#00C2A8",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        ),
      },
      {
        id: "clinica",
        title: "Clínica Médica",
        subtitle: "Cardio, Nefro, Pneumo, Gastro e Infecto",
        cards: clinicaCards,
        color: "#00C2A8",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        ),
      },
      {
        id: "cirurgia",
        title: "Cirurgia Geral",
        subtitle: "Trauma, Abdome Agudo e Pré/Pós-op",
        cards: cirurgiaCards,
        color: "#3B82F6",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        ),
      },
      {
        id: "pediatria",
        title: "Pediatria",
        subtitle: "Puericultura, Neonatologia e Emergências",
        cards: pedCards,
        color: "#F59E0B",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="5" />
            <path d="M3 21v-2a7 7 0 0 1 14 0v2" />
          </svg>
        ),
      },
      {
        id: "go",
        title: "Ginecologia & Obstetrícia",
        subtitle: "Pré-natal, Sangramentos e Oncologia",
        cards: goCards,
        color: "#EC4899",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="9" r="6" />
            <path d="M12 15v7M9 19h6" />
          </svg>
        ),
      },
      {
        id: "sc",
        title: "Saúde Coletiva & SUS",
        subtitle: "Epidemiologia, Portarias e Ética Médica",
        cards: scCards,
        color: "#10B981",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
    ];
  }, [allCards]);

  // Filtragem do histórico individual
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
              padding: "8px 16px",
              borderRadius: 8,
              background: activeTab === "revisao" ? "rgba(0,194,168,0.15)" : "transparent",
              border: `1px solid ${activeTab === "revisao" ? V.pu : "var(--sinal)"}`,
              color: activeTab === "revisao" ? V.pu : "var(--chumbo)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sessão de Revisão ({total} pendentes)
          </button>

          <button
            onClick={() => {
              setActiveTab("historico");
              loadHistory();
            }}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: activeTab === "historico" ? "rgba(0,194,168,0.15)" : "transparent",
              border: `1px solid ${activeTab === "historico" ? V.pu : "var(--sinal)"}`,
              color: activeTab === "historico" ? V.pu : "var(--chumbo)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Meus Decks & Histórico ({allCards.length})
          </button>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            background: "var(--pulso)",
            border: "none",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 2px 8px rgba(0, 194, 168, 0.25)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Criar Flashcard</span>
        </button>
      </div>

      {/* ── ABA 1: SESSÃO DE REVISÃO ATIVA ── */}
      {activeTab === "revisao" && (
        <>
          {/* Custom Scope Banner (se treinando um card ou deck específico) */}
          {activeReviewScope?.isCustom && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(0, 194, 168, 0.1)",
                border: "1px solid var(--pulso)",
                padding: "10px 18px",
                borderRadius: "10px",
                marginBottom: "16px",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--pulso)" }} />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--heading-color)" }}>
                  Modo de Treino Focado: <span style={{ color: "var(--pulso)" }}>{activeReviewScope.title}</span>
                </span>
              </div>
              <button
                onClick={handleResetToDailyQueue}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--pulso)",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Voltar para a Fila Geral Diária ({allCards.length})
              </button>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: V.ch }}>
              Carregando fila de repetição espaçada...
            </div>
          ) : currentIdx >= total ? (
            <div style={{ maxWidth: 520, margin: "60px auto", textAlign: "center" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "rgba(0, 194, 168, 0.15)",
                  border: "1px solid var(--pulso)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px auto",
                  color: V.pu,
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--heading-color)", marginBottom: 8 }}>
                Sessão de Flashcards Concluída!
              </div>
              <div style={{ fontSize: 14, color: "var(--chumbo)", lineHeight: 1.6, marginBottom: 24 }}>
                Você concluiu a revisão deste bloco. O algoritmo já registrou seu histórico para o agendamento de repetição espaçada.
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button
                  onClick={() => {
                    setCurrentIdx(0);
                    if (!activeReviewScope?.isCustom) loadCards();
                  }}
                  style={{
                    padding: "12px 24px",
                    borderRadius: 8,
                    background: "var(--pulso)",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Reiniciar Esta Sessão
                </button>
                {activeReviewScope?.isCustom && (
                  <button
                    onClick={handleResetToDailyQueue}
                    style={{
                      padding: "12px 20px",
                      borderRadius: 8,
                      background: "transparent",
                      border: "1px solid var(--sinal)",
                      color: "var(--heading-color)",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Ir para Fila Geral
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 24, justifyContent: "center", alignItems: "flex-start", flexWrap: "wrap" }}>
              {/* COLUNA CENTRAL: CARD 3D + SM-2 */}
              <div style={{ flex: 1, maxWidth: 580, minWidth: 320, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch }}>
                      Card {currentIdx + 1} de {total} • {card.area}
                    </span>
                    <span style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.08em", color: V.pu }}>
                      {card.subarea}
                    </span>
                  </div>
                  <ProgressBar value={((currentIdx + 1) / total) * 100} variant="green" />
                </div>

                {/* 3D Flip Card */}
                <div className="flip-container">
                  <div className={`flip-inner ${flipped ? "flipped" : ""}`} onClick={() => setFlipped(!flipped)} style={{ cursor: "pointer" }}>
                    {/* FRENTE */}
                    <div
                      className="flip-front"
                      style={{
                        background: "var(--card-bg)",
                        border: "1px solid var(--card-border)",
                        boxShadow: "var(--card-shadow, none)",
                        padding: "40px 32px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 280,
                      }}
                    >
                      <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--chumbo)", marginBottom: 20 }}>
                        Pergunta / Desafio Clínico
                      </div>
                      <div style={{ fontSize: 16, lineHeight: 1.7, color: "var(--heading-color)", textAlign: "center", fontWeight: 600 }}>
                        {card.frente}
                      </div>
                      <div style={{ marginTop: 32, fontFamily: V.dm, fontSize: 10, color: "var(--pulso)", fontWeight: 600 }}>
                        Clique para virar e ver a resposta →
                      </div>
                    </div>

                    {/* VERSO */}
                    <div
                      className="flip-back"
                      style={{
                        background: "var(--card-bg)",
                        border: "1px solid var(--pulso)",
                        boxShadow: "0 0 20px rgba(0, 194, 168, 0.15)",
                        padding: "36px 32px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        minHeight: 280,
                      }}
                    >
                      <div>
                        <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--pulso)", marginBottom: 12, fontWeight: 700 }}>
                          Resposta & Fundamentação
                        </div>
                        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--neblina)", whiteSpace: "pre-line" }}>
                          {card.verso}
                        </div>
                      </div>
                      <div style={{ textAlign: "center", marginTop: 20, fontFamily: V.dm, fontSize: 10, color: "var(--chumbo)" }}>
                        Clique para desvirar
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botões SM-2 de Autoavaliação */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <button
                    onClick={() => handleRate("dificil")}
                    style={{
                      padding: "14px 8px",
                      borderRadius: 10,
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      background: "rgba(239, 68, 68, 0.1)",
                      color: "#EF4444",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Difícil</span>
                    <span style={{ fontSize: 10, color: "var(--chumbo)" }}>Rever em 1 dia</span>
                  </button>

                  <button
                    onClick={() => handleRate("ok")}
                    style={{
                      padding: "14px 8px",
                      borderRadius: 10,
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      background: "rgba(59, 130, 246, 0.1)",
                      color: "#3B82F6",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Bom</span>
                    <span style={{ fontSize: 10, color: "var(--chumbo)" }}>Rever em 3 dias</span>
                  </button>

                  <button
                    onClick={() => handleRate("facil")}
                    style={{
                      padding: "14px 8px",
                      borderRadius: 10,
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      background: "rgba(16, 185, 129, 0.1)",
                      color: "#10B981",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Fácil</span>
                    <span style={{ fontSize: 10, color: "var(--chumbo)" }}>Rever em 6 dias</span>
                  </button>
                </div>
              </div>

              {/* COLUNA LATERAL: Navegação na Fila */}
              <div
                style={{
                  width: 260,
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  borderRadius: 14,
                  padding: "16px",
                  boxShadow: "var(--card-shadow, none)",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--heading-color)", marginBottom: 10 }}>
                  Fila da Sessão ({total} cards)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 380, overflowY: "auto" }}>
                  {cards.map((c, i) => (
                    <button
                      key={c.id}
                      onClick={() => goTo(i)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 6,
                        border: i === currentIdx ? "1px solid var(--pulso)" : "1px solid var(--sinal)",
                        background: i === currentIdx ? "rgba(0, 194, 168, 0.1)" : "transparent",
                        color: i === currentIdx ? "var(--pulso)" : "var(--neblina)",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: i === currentIdx ? 700 : 500,
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 170 }}>
                        #{i + 1} {c.frente.slice(0, 24)}...
                      </span>
                      {i < currentIdx && <span style={{ color: "#10B981" }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── ABA 2: MEUS DECKS & HISTÓRICO ── */}
      {activeTab === "historico" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* SEÇÃO 1: DECKS VISUAIS COM BOTÃO DE PRATICAR */}
          <div>
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--heading-color)", margin: "0 0 4px 0" }}>
                Seus Decks de Estudo
              </h2>
              <p style={{ fontSize: 13, color: "var(--chumbo)", margin: 0 }}>
                Escolha um deck temático ou o Deck do Preceptor IA para iniciar um treino focado imediatamente.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 14,
              }}
            >
              {decksData.map((deck) => {
                const count = deck.cards.length;
                return (
                  <div
                    key={deck.id}
                    style={{
                      background: "var(--card-bg)",
                      border: "1px solid var(--card-border)",
                      borderRadius: 14,
                      padding: "18px 20px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 14,
                      boxShadow: "var(--card-shadow, none)",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: `${deck.color}15`,
                            color: deck.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {deck.icon}
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: `${deck.color}15`,
                            color: deck.color,
                          }}
                        >
                          {count} {count === 1 ? "card" : "cards"}
                        </span>
                      </div>

                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--heading-color)", margin: "0 0 4px 0" }}>
                        {deck.title}
                      </h3>
                      <p style={{ fontSize: 12, color: "var(--chumbo)", margin: 0, lineHeight: 1.4 }}>
                        {deck.subtitle}
                      </p>
                    </div>

                    <button
                      onClick={() => startReviewDeck(deck.title, deck.cards)}
                      disabled={count === 0}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 8,
                        background: count > 0 ? "var(--pulso)" : "var(--sinal)",
                        color: count > 0 ? "#FFFFFF" : "var(--chumbo)",
                        border: "none",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: count > 0 ? "pointer" : "not-allowed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        boxShadow: count > 0 ? "0 2px 8px rgba(0, 194, 168, 0.25)" : "none",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      <span>Praticar este Deck ({count})</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SEÇÃO 2: REPOSITÓRIO INDIVIDUAL DE FLASHCARDS */}
          <div>
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--heading-color)", margin: "0 0 4px 0" }}>
                Todos os Flashcards Cadastrados ({allCards.length})
              </h2>
              <p style={{ fontSize: 13, color: "var(--chumbo)", margin: 0 }}>
                Consulte, edite ou inicie o treino em qualquer card específico individualmente.
              </p>
            </div>

            {/* Barra de Filtros e Busca */}
            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 16,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <input
                type="text"
                placeholder="Buscar por pergunta, resposta ou mnemônico..."
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 260,
                  padding: "9px 14px",
                  borderRadius: 8,
                  background: "var(--input-bg)",
                  border: "1px solid var(--sinal)",
                  color: "var(--heading-color)",
                  fontSize: 13,
                  outline: "none",
                }}
              />

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Todas", "Clínica Médica", "Cirurgia Geral", "Ginecologia e Obstetrícia", "Pediatria", "Saúde Coletiva"].map((area) => (
                  <button
                    key={area}
                    onClick={() => setAreaFilter(area)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      border: areaFilter === area ? "1px solid var(--pulso)" : "1px solid var(--sinal)",
                      background: areaFilter === area ? "rgba(0, 194, 168, 0.15)" : "transparent",
                      color: areaFilter === area ? "var(--pulso)" : "var(--neblina)",
                      cursor: "pointer",
                    }}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de Cards do Histórico */}
            {loadingHistory ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--chumbo)" }}>Carregando flashcards...</div>
            ) : filteredHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--chumbo)" }}>
                <p>Nenhum flashcard encontrado com os filtros atuais.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                {filteredHistory.map((fc) => (
                  <div
                    key={fc.id}
                    style={{
                      background: "var(--card-bg)",
                      border: "1px solid var(--card-border)",
                      borderRadius: 12,
                      padding: "16px 18px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 12,
                      boxShadow: "var(--card-shadow, none)",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span
                          style={{
                            fontFamily: V.dm,
                            fontSize: 9,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "rgba(0, 194, 168, 0.12)",
                            color: "var(--pulso)",
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          {fc.area}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--chumbo)" }}>{fc.subarea}</span>
                      </div>

                      <div style={{ color: "var(--heading-color)", fontWeight: 700, fontSize: 13, marginBottom: 8, lineHeight: 1.4 }}>
                        {fc.front}
                      </div>

                      <div
                        style={{
                          color: "var(--neblina)",
                          fontSize: 12,
                          lineHeight: 1.5,
                          background: "var(--input-bg, rgba(255,255,255,0.03))",
                          padding: "10px 12px",
                          borderRadius: 8,
                          borderLeft: `3px solid var(--pulso)`,
                          maxHeight: 100,
                          overflowY: "auto",
                        }}
                      >
                        {fc.back}
                      </div>
                    </div>

                    {/* Bottom Actions: Treinar Este Card + Editar + Excluir */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderTop: "1px solid var(--sinal)",
                        paddingTop: 10,
                        gap: 8,
                      }}
                    >
                      <button
                        onClick={() => startReviewSingleCard(fc)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 12px",
                          borderRadius: 6,
                          background: "var(--pulso)",
                          color: "#FFFFFF",
                          border: "none",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <span>Treinar Card</span>
                      </button>

                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => handleOpenEdit(fc)}
                          title="Editar flashcard"
                          style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            background: "transparent",
                            border: "1px solid var(--sinal)",
                            color: "var(--neblina)",
                            fontSize: 11,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                          <span>Editar</span>
                        </button>

                        <button
                          onClick={() => handleDeleteCard(fc.id)}
                          title="Excluir flashcard"
                          style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            background: "transparent",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            color: "#EF4444",
                            fontSize: 11,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 1: NOVO FLASHCARD MANUAL ── */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(13,17,28,0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: 16,
              maxWidth: 500,
              width: "100%",
              padding: 24,
              boxShadow: "var(--card-shadow, none)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, color: "var(--heading-color)", margin: 0, fontWeight: 700 }}>
                Criar Novo Flashcard
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: "transparent", border: "none", color: "var(--chumbo)", fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCard}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 4, fontWeight: 600 }}>
                  Título / Nome do Flashcard (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Critérios de Light no Derrame Pleural"
                  value={newCardForm.title}
                  onChange={(e) => setNewCardForm({ ...newCardForm, title: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    background: "var(--input-bg)",
                    border: "1px solid var(--sinal)",
                    color: "var(--heading-color)",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 4, fontWeight: 600 }}>
                    Grande Área
                  </label>
                  <select
                    value={newCardForm.area}
                    onChange={(e) => setNewCardForm({ ...newCardForm, area: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 8,
                      background: "var(--input-bg)",
                      border: "1px solid var(--sinal)",
                      color: "var(--heading-color)",
                      fontSize: 12,
                      outline: "none",
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
                  <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 4, fontWeight: 600 }}>
                    Subárea / Tópico
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Pneumologia, ACLS..."
                    value={newCardForm.subarea}
                    onChange={(e) => setNewCardForm({ ...newCardForm, subarea: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 8,
                      background: "var(--input-bg)",
                      border: "1px solid var(--sinal)",
                      color: "var(--heading-color)",
                      fontSize: 12,
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 4, fontWeight: 600 }}>
                  Pergunta / Frente do Card *
                </label>
                <textarea
                  rows={2}
                  required
                  value={newCardForm.front}
                  onChange={(e) => setNewCardForm({ ...newCardForm, front: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    background: "var(--input-bg)",
                    border: "1px solid var(--sinal)",
                    color: "var(--heading-color)",
                    fontSize: 13,
                    outline: "none",
                    resize: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 4, fontWeight: 600 }}>
                  Resposta / Verso do Card *
                </label>
                <textarea
                  rows={3}
                  required
                  value={newCardForm.back}
                  onChange={(e) => setNewCardForm({ ...newCardForm, back: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    background: "var(--input-bg)",
                    border: "1px solid var(--sinal)",
                    color: "var(--heading-color)",
                    fontSize: 13,
                    outline: "none",
                    resize: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px solid var(--sinal)",
                    color: "var(--chumbo)",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCard}
                  style={{
                    flex: 1.5,
                    padding: "10px 0",
                    borderRadius: 8,
                    background: "var(--pulso)",
                    border: "none",
                    color: "#FFFFFF",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: savingCard ? "not-allowed" : "pointer",
                  }}
                >
                  {savingCard ? "Criando..." : "Salvar Flashcard"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: EDITAR FLASHCARD ── */}
      {editingCard && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(13,17,28,0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: 16,
              maxWidth: 500,
              width: "100%",
              padding: 24,
              boxShadow: "var(--card-shadow, none)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, color: "var(--heading-color)", margin: 0, fontWeight: 700 }}>
                Editar Flashcard
              </h3>
              <button
                onClick={() => setEditingCard(null)}
                style={{ background: "transparent", border: "none", color: "var(--chumbo)", fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 4, fontWeight: 600 }}>
                    Grande Área
                  </label>
                  <select
                    value={editForm.area}
                    onChange={(e) => setEditForm({ ...editForm, area: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 8,
                      background: "var(--input-bg)",
                      border: "1px solid var(--sinal)",
                      color: "var(--heading-color)",
                      fontSize: 12,
                      outline: "none",
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
                  <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 4, fontWeight: 600 }}>
                    Subárea / Tópico
                  </label>
                  <input
                    type="text"
                    value={editForm.subarea}
                    onChange={(e) => setEditForm({ ...editForm, subarea: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 8,
                      background: "var(--input-bg)",
                      border: "1px solid var(--sinal)",
                      color: "var(--heading-color)",
                      fontSize: 12,
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 4, fontWeight: 600 }}>
                  Pergunta / Frente do Card *
                </label>
                <textarea
                  rows={2}
                  required
                  value={editForm.front}
                  onChange={(e) => setEditForm({ ...editForm, front: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    background: "var(--input-bg)",
                    border: "1px solid var(--sinal)",
                    color: "var(--heading-color)",
                    fontSize: 13,
                    outline: "none",
                    resize: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 4, fontWeight: 600 }}>
                  Resposta / Verso do Card *
                </label>
                <textarea
                  rows={3}
                  required
                  value={editForm.back}
                  onChange={(e) => setEditForm({ ...editForm, back: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    background: "var(--input-bg)",
                    border: "1px solid var(--sinal)",
                    color: "var(--heading-color)",
                    fontSize: 13,
                    outline: "none",
                    resize: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px solid var(--sinal)",
                    color: "var(--chumbo)",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{
                    flex: 1.5,
                    padding: "10px 0",
                    borderRadius: 8,
                    background: "var(--pulso)",
                    border: "none",
                    color: "#FFFFFF",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: savingEdit ? "not-allowed" : "pointer",
                  }}
                >
                  {savingEdit ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
