"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout";
import { Badge } from "@/components/ui";
import type { Questao } from "@/lib/types";
import { useUser } from "@/lib/supabase/use-user";
import {
  fetchQuestions,
  submitUserAnswer,
  fetchUserAnswers,
} from "@/lib/supabase/questions";
import { checkUserUsageLimit } from "@/lib/supabase/limits";

/* ═══════════════════════════════════════════
   BANCO DE QUESTÕES INTERATIVO — /questoes
═══════════════════════════════════════════ */

const V = {
  pu: "#00C2A8", ch: "#8A9AB5", nb: "#E0E6F0", pe: "#2B3A52",
  re: "#0077B6", ind: "#6B5CE7", wn: "#F5A623", dg: "#FF6B6B",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
};

const instituicoes = ["Todas", "ENAMED", "USP", "UNIFESP", "ENARE", "UERJ", "FMABC"];
const areas = ["Todas", "Clínica Médica", "Cirurgia Geral", "Saúde Coletiva", "Pediatria", "GO"];
const dificuldades = ["Todas", "Fácil", "Média", "Alta", "Muito Alta"];

const difMap: Record<string, string> = { facil: "Fácil", media: "Média", alta: "Alta", "muito-alta": "Muito Alta" };
const difDots = (d: string) => d === "facil" ? 1 : d === "media" ? 2 : d === "alta" ? 3 : 4;
const areaAbbr: Record<string, string> = {
  "Clínica Médica": "CM", "Cirurgia Geral": "CG", "Saúde Coletiva": "SC",
  "Pediatria": "Ped", "Ginecologia e Obstetrícia": "GO", "Psiquiatria": "Psiq",
};
const areaColor: Record<string, string> = {
  "Clínica Médica": V.pu, "Cirurgia Geral": V.re, "Saúde Coletiva": V.ind,
  "Pediatria": V.wn, "Ginecologia e Obstetrícia": V.dg, "Psiquiatria": "#A99EF5",
};

export default function QuestoesPage() {
  const router = useRouter();
  const { user, profile } = useUser();
  const [activeNav, setActiveNav] = useState("questoes");
  const [instFilter, setInstFilter] = useState("Todas");
  const [areaFilter, setAreaFilter] = useState("Todas");
  const [difFilter, setDifFilter] = useState("Todas");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [questions, setQuestions] = useState<Questao[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAnswersMap, setUserAnswersMap] = useState<Record<string, { selected: string; isCorrect: boolean }>>({});
  const [selectedLetterMap, setSelectedLetterMap] = useState<Record<string, string>>({});
  const [submittingMap, setSubmittingMap] = useState<Record<string, boolean>>({});
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const qs = await fetchQuestions({
      institution: instFilter,
      area: areaFilter,
      difficulty: difFilter,
      search: search || undefined,
    });
    setQuestions(qs);

    if (user?.id) {
      const ans = await fetchUserAnswers(user.id);
      setUserAnswersMap(ans);
    }
    setLoading(false);
  }, [instFilter, areaFilter, difFilter, search, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectOption = (questionId: string, letter: string) => {
    if (userAnswersMap[questionId]) return; // já respondida
    setSelectedLetterMap((prev) => ({ ...prev, [questionId]: letter }));
  };

  const handleAnswerSubmit = async (q: Questao) => {
    const chosen = selectedLetterMap[q.id];
    if (!chosen) return;

    // Checa limites do plano gratuito
    if (user?.id) {
      const limitStatus = await checkUserUsageLimit(user.id, "questions", profile?.plan || "diagnostico");
      if (limitStatus.hasReachedLimit) {
        setShowPaywallModal(true);
        return;
      }
    }

    const isCorrect = chosen === q.gabarito;
    setSubmittingMap((prev) => ({ ...prev, [q.id]: true }));

    // Atualiza estado local imediatamente
    setUserAnswersMap((prev) => ({
      ...prev,
      [q.id]: { selected: chosen, isCorrect },
    }));

    if (user?.id) {
      await submitUserAnswer({
        userId: user.id,
        questionId: q.id,
        selectedLetter: chosen,
        isCorrect: isCorrect,
        contextType: "standalone",
      });
    }

    setSubmittingMap((prev) => ({ ...prev, [q.id]: false }));
  };

  const chipStyle = (selected: boolean): React.CSSProperties => ({
    padding: "5px 12px", borderRadius: 9999,
    background: selected ? "rgba(0,194,168,0.12)" : "rgba(43,58,82,0.5)",
    border: `1.5px solid ${selected ? "rgba(0,194,168,0.35)" : "rgba(61,90,128,0.25)"}`,
    color: selected ? V.pu : V.ch,
    fontFamily: V.dm, fontSize: 10, letterSpacing: "0.08em",
    cursor: "pointer", transition: "all 0.15s", textTransform: "uppercase" as const,
  });

  return (
    <PageShell
      title="Banco de Questões"
      badgeText={`${questions.length} questões disponíveis`}
      activeNavId={activeNav}
      onNavigate={setActiveNav}
    >
      {/* ── FILTER BAR ── */}
      <div style={{ marginBottom: 20 }}>
        {/* Institution chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", color: V.ch, textTransform: "uppercase", alignSelf: "center", marginRight: 4 }}>
            Instituição
          </span>
          {instituicoes.map((i) => (
            <span key={i} style={chipStyle(instFilter === i)} onClick={() => setInstFilter(i)}>{i}</span>
          ))}
        </div>
        {/* Area chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", color: V.ch, textTransform: "uppercase", alignSelf: "center", marginRight: 4 }}>
            Área
          </span>
          {areas.map((a) => (
            <span key={a} style={chipStyle(areaFilter === a)} onClick={() => setAreaFilter(a)}>{a}</span>
          ))}
        </div>
        {/* Difficulty chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", color: V.ch, textTransform: "uppercase", alignSelf: "center", marginRight: 4 }}>
            Dificuldade
          </span>
          {dificuldades.map((d) => (
            <span key={d} style={chipStyle(difFilter === d)} onClick={() => setDifFilter(d)}>{d}</span>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Buscar por tema, doença ou palavra-chave..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 8,
            background: "rgba(43,58,82,0.4)", border: "1px solid rgba(61,90,128,0.25)",
            color: V.nb, fontFamily: V.db, fontSize: 13, outline: "none",
          }}
        />
      </div>

      {/* ── QUESTION LIST ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: V.ch, fontSize: 14 }}>
            Carregando questões do banco...
          </div>
        ) : (
          questions.map((q, idx) => {
            const isExpanded = expandedId === q.id || idx === 0;
            const userAns = userAnswersMap[q.id];
            const isAnswered = !!userAns;
            const currentSelected = selectedLetterMap[q.id];
            const ac = areaColor[q.area] || V.ch;

            return (
              <div key={q.id} style={{
                background: V.pe,
                border: `1px solid ${isAnswered ? (userAns.isCorrect ? "rgba(0,194,168,0.3)" : "rgba(255,107,107,0.3)") : "rgba(61,90,128,0.2)"}`,
                borderRadius: 12, overflow: "hidden", transition: "all 0.2s",
              }}>
                {/* Header row (always visible) */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : q.id)}
                  style={{
                    padding: "14px 18px", display: "flex", alignItems: "center",
                    justifyContent: "space-between", cursor: "pointer", gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{
                      fontFamily: V.dm, fontSize: 10, padding: "2px 7px", borderRadius: 4,
                      background: `${ac}15`, color: ac, border: `1px solid ${ac}30`,
                    }}>
                      {areaAbbr[q.area] || q.area}
                    </span>
                    <span style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: "#fff" }}>
                      {q.subarea}
                    </span>
                    <span style={{ fontFamily: V.dm, fontSize: 10, color: V.ch }}>
                      {q.instituicao} · {q.ano}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {isAnswered && (
                      <Badge variant={userAns.isCorrect ? "green" : "danger"}>
                        {userAns.isCorrect ? "Acertou" : "Errou"}
                      </Badge>
                    )}
                    <span style={{ color: V.ch, fontSize: 12 }}>
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ padding: "0 18px 18px", borderTop: "1px solid rgba(61,90,128,0.15)" }}>
                    <div style={{ fontSize: 14, lineHeight: 1.7, color: V.nb, margin: "14px 0" }}>
                      {q.enunciado}
                    </div>

                    {q.contextoClinico && (
                      <div style={{
                        margin: "12px 0", padding: "12px 16px",
                        background: "rgba(13,17,28,0.45)", border: "1px solid rgba(61,90,128,0.25)",
                        borderRadius: 8, fontSize: 13, lineHeight: 1.6, color: V.ch, fontStyle: "italic",
                      }}>
                        {q.contextoClinico}
                      </div>
                    )}

                    {/* Alternativas */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                      {q.alternativas.map((alt) => {
                        const isChosen = currentSelected === alt.letra || userAns?.selected === alt.letra;
                        const isRightAnswer = isAnswered && alt.letra === q.gabarito;
                        const isWrongChoice = isAnswered && isChosen && !userAns.isCorrect;

                        let optBg = "rgba(43,58,82,0.3)";
                        let optBorder = "rgba(61,90,128,0.25)";
                        if (isRightAnswer) {
                          optBg = "rgba(0,194,168,0.12)";
                          optBorder = "rgba(0,194,168,0.5)";
                        } else if (isWrongChoice) {
                          optBg = "rgba(255,107,107,0.12)";
                          optBorder = "rgba(255,107,107,0.5)";
                        } else if (isChosen && !isAnswered) {
                          optBg = "rgba(0,194,168,0.08)";
                          optBorder = "rgba(0,194,168,0.4)";
                        }

                        return (
                          <div
                            key={alt.letra}
                            onClick={() => handleSelectOption(q.id, alt.letra)}
                            style={{
                              display: "flex", gap: 12, alignItems: "flex-start",
                              padding: "10px 14px", borderRadius: 8,
                              background: optBg, border: `1px solid ${optBorder}`,
                              cursor: isAnswered ? "default" : "pointer", transition: "all 0.15s",
                            }}
                          >
                            <span style={{
                              fontFamily: V.dm, fontSize: 11, fontWeight: 700,
                              width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              background: isRightAnswer ? V.pu : isWrongChoice ? V.dg : isChosen ? V.pu : "rgba(61,90,128,0.2)",
                              color: isRightAnswer || (isChosen && !isWrongChoice) ? "#0A1A18" : "#fff",
                            }}>
                              {alt.letra}
                            </span>
                            <span style={{ fontSize: 13, lineHeight: 1.5, color: isRightAnswer ? "#fff" : V.nb }}>
                              {alt.texto}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Botão Responder ou Gabarito Comentado */}
                    {!isAnswered ? (
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                        <button
                          onClick={() => handleAnswerSubmit(q)}
                          disabled={!currentSelected || submittingMap[q.id]}
                          style={{
                            padding: "9px 22px", borderRadius: 8,
                            background: currentSelected ? V.pu : "rgba(0,194,168,0.3)",
                            border: "none", color: "#0A1A18",
                            fontFamily: V.db, fontSize: 13, fontWeight: 600,
                            cursor: currentSelected ? "pointer" : "not-allowed",
                            boxShadow: currentSelected ? "0 4px 16px rgba(0,194,168,0.3)" : "none",
                          }}
                        >
                          {submittingMap[q.id] ? "Enviando..." : "Responder Questão"}
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        marginTop: 18, padding: "16px 18px",
                        background: "rgba(0,194,168,0.05)", border: "1px solid rgba(0,194,168,0.2)",
                        borderRadius: 10,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <span style={{ fontFamily: V.dm, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: userAns.isCorrect ? V.pu : V.dg, fontWeight: 700 }}>
                            {userAns.isCorrect ? "✓ Resposta Correta" : `✗ Resposta Incorreta · Gabarito Oficial: ${q.gabarito}`}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, lineHeight: 1.75, color: V.nb }}>
                          {q.explicacao}
                        </div>
                        {q.tags && q.tags.length > 0 && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                            {q.tags.map((t) => (
                              <span key={t} style={{
                                fontFamily: V.dm, fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase",
                                padding: "2px 8px", borderRadius: 9999,
                                background: "rgba(61,90,128,0.2)", color: V.ch,
                              }}>
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {!loading && questions.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: V.ch, fontSize: 14 }}>
            Nenhuma questão encontrada com esses filtros.
          </div>
        )}
      </div>

      {/* ── MODAL PAYWALL (LIMITE DO PLANO GRATUITO) ── */}
      {showPaywallModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(13,17,28,0.85)",
          backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 20,
        }}>
          <div style={{
            background: "#1A1F2E", border: "1.5px solid rgba(0,194,168,0.4)",
            borderRadius: 16, maxWidth: 440, width: "100%", padding: 28, textAlign: "center",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
            <div style={{ fontFamily: V.df, fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
              Limite Mensal Atingido (50 Questões)
            </div>
            <div style={{ fontSize: 13, color: V.ch, lineHeight: 1.6, marginBottom: 20 }}>
              Você atingiu a cota mensal gratuita do plano <strong>MedPleni Diagnóstico</strong>.
              Destrave acesso ilimitado a todo o banco e simulados com o <strong>MedPleni Pleno</strong> com 30 dias de garantia incondicional.
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowPaywallModal(false)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8,
                  background: "transparent", border: "1px solid rgba(61,90,128,0.3)",
                  color: V.ch, fontFamily: V.db, fontSize: 13, cursor: "pointer",
                }}
              >
                Continuar Grátis
              </button>
              <button
                onClick={() => router.push("/planos")}
                style={{
                  flex: 1.5, padding: "10px 0", borderRadius: 8,
                  background: V.pu, border: "none", color: "#0A1A18",
                  fontFamily: V.db, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(0,194,168,0.3)",
                }}
              >
                Ver Planos Pleno →
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
