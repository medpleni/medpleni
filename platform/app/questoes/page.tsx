"use client";

import React, { useState, useMemo } from "react";
import { PageShell } from "@/components/layout";
import { Badge, Card } from "@/components/ui";
import { mockQuestions } from "@/lib/mock-data";

/* ═══════════════════════════════════════════
   BANCO DE QUESTÕES — /questoes
═══════════════════════════════════════════ */

const V = {
  pu: "#00C2A8", ch: "#8A9AB5", nb: "#E0E6F0", pe: "#2B3A52",
  re: "#0077B6", ind: "#6B5CE7", wn: "#F5A623", dg: "#FF6B6B",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
};

const instituicoes = ["Todas", "USP", "UNIFESP", "ENARE", "UERJ", "FMABC"];
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

/* mock answered status */
const answeredIds = new Set(["q_001", "q_002", "q_003", "q_005", "q_008", "q_010"]);

export default function QuestoesPage() {
  const [activeNav, setActiveNav] = useState("questoes");
  const [instFilter, setInstFilter] = useState("Todas");
  const [areaFilter, setAreaFilter] = useState("Todas");
  const [difFilter, setDifFilter] = useState("Todas");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showGabarito, setShowGabarito] = useState(false);

  const filtered = useMemo(() => {
    return mockQuestions.filter((q) => {
      if (instFilter !== "Todas" && q.instituicao !== instFilter) return false;
      if (areaFilter !== "Todas") {
        if (areaFilter === "GO" && q.area !== "Ginecologia e Obstetrícia") return false;
        if (areaFilter !== "GO" && q.area !== areaFilter) return false;
      }
      if (difFilter !== "Todas" && difMap[q.dificuldade] !== difFilter) return false;
      if (search && !q.enunciado.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [instFilter, areaFilter, difFilter, search]);

  const chipStyle = (selected: boolean): React.CSSProperties => ({
    padding: "5px 12px", borderRadius: 9999,
    background: selected ? "rgba(0,194,168,0.12)" : "rgba(43,58,82,0.5)",
    border: `1.5px solid ${selected ? "rgba(0,194,168,0.35)" : "rgba(61,90,128,0.25)"}`,
    color: selected ? V.pu : V.ch,
    fontFamily: V.dm, fontSize: 10, letterSpacing: "0.08em",
    cursor: "pointer", transition: "all 0.15s", textTransform: "uppercase" as const,
  });

  return (
    <PageShell title="Banco de Questões" badgeText="3.840 questões" activeNavId={activeNav} onNavigate={setActiveNav}>
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
        {/* Difficulty + Search */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={difFilter}
            onChange={(e) => setDifFilter(e.target.value)}
            style={{
              padding: "7px 12px", borderRadius: 8,
              background: "rgba(43,58,82,0.6)", border: "1.5px solid rgba(61,90,128,0.4)",
              color: V.nb, fontFamily: V.dm, fontSize: 11, outline: "none", cursor: "pointer",
            }}
          >
            {dificuldades.map((d) => <option key={d} value={d}>{d === "Todas" ? "Dificuldade" : d}</option>)}
          </select>
          <input
            type="text" placeholder="Buscar por palavra-chave..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: 200, padding: "8px 14px",
              background: "rgba(43,58,82,0.6)", border: "1.5px solid rgba(61,90,128,0.4)",
              borderRadius: 8, color: V.nb, fontFamily: V.db, fontSize: 13, outline: "none",
            }}
          />
          <span style={{ fontFamily: V.dm, fontSize: 10, color: V.ch }}>
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── QUESTION LIST ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((q) => {
          const isExpanded = expandedId === q.id;
          const isAnswered = answeredIds.has(q.id);
          const ac = areaColor[q.area] || V.ch;
          return (
            <div key={q.id}>
              {/* Card row */}
              <div
                onClick={() => { setExpandedId(isExpanded ? null : q.id); setShowGabarito(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px",
                  background: isExpanded ? "rgba(0,194,168,0.04)" : V.pe,
                  border: `1px solid ${isExpanded ? "rgba(0,194,168,0.25)" : "rgba(61,90,128,0.2)"}`,
                  borderRadius: isExpanded ? "12px 12px 0 0" : 12,
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {/* Area icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: `${ac}15`, border: `1px solid ${ac}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: V.dm, fontSize: 10, fontWeight: 700, color: ac,
                }}>
                  {areaAbbr[q.area] || q.area.slice(0, 2)}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, color: V.nb, lineHeight: 1.5,
                    overflow: "hidden", textOverflow: "ellipsis",
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any,
                  }}>
                    {q.enunciado}
                  </div>
                </div>

                {/* Badges */}
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                  <span style={{
                    fontFamily: V.dm, fontSize: 9, letterSpacing: "0.08em",
                    padding: "2px 8px", borderRadius: 9999,
                    background: "rgba(61,90,128,0.15)", color: V.ch,
                  }}>
                    {q.instituicao}
                  </span>
                  {/* Difficulty dots */}
                  <div style={{ display: "flex", gap: 2 }}>
                    {[1, 2, 3, 4].map((d) => (
                      <div key={d} style={{
                        width: 5, height: 5, borderRadius: "50%",
                        background: d <= difDots(q.dificuldade) ? V.wn : "rgba(61,90,128,0.2)",
                      }} />
                    ))}
                  </div>
                  <Badge variant={isAnswered ? "green" : "neutral"}>
                    {isAnswered ? "Respondida" : "Nova"}
                  </Badge>
                </div>
              </div>

              {/* Expanded view */}
              {isExpanded && (
                <div style={{
                  padding: "20px",
                  background: "rgba(26,31,46,0.8)",
                  border: "1px solid rgba(0,194,168,0.25)",
                  borderTop: "none", borderRadius: "0 0 12px 12px",
                  animation: "fadeUp 0.25s ease",
                }}>
                  <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>

                  {/* Header */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: V.pu }}>
                      Questão {q.numero}
                    </span>
                    <span style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: V.ch }}>
                      {q.subarea}
                    </span>
                    <span style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.08em", color: "rgba(138,154,181,0.4)" }}>
                      {q.instituicao} {q.ano}
                    </span>
                  </div>

                  {/* Enunciado */}
                  <div style={{ fontSize: 14, lineHeight: 1.75, color: V.nb, marginBottom: 8 }}>
                    {q.enunciado}
                  </div>

                  {q.contextoClinico && (
                    <div style={{
                      margin: "12px 0", padding: "12px 14px",
                      background: "rgba(43,58,82,0.4)", border: "1px solid rgba(61,90,128,0.2)",
                      borderLeft: "3px solid rgba(0,194,168,0.4)", borderRadius: 8,
                      fontSize: 13, lineHeight: 1.7, color: V.ch, fontStyle: "italic",
                    }}>
                      {q.contextoClinico}
                    </div>
                  )}

                  {/* Alternativas */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 16 }}>
                    {q.alternativas.map((alt) => {
                      const isCorrect = showGabarito && alt.letra === q.gabarito;
                      const isWrong = showGabarito && alt.letra !== q.gabarito;
                      return (
                        <div key={alt.letra} style={{
                          display: "flex", gap: 12, alignItems: "flex-start",
                          padding: "10px 14px",
                          background: isCorrect ? "rgba(0,194,168,0.08)" : "rgba(43,58,82,0.3)",
                          border: `1.5px solid ${isCorrect ? "rgba(0,194,168,0.4)" : "rgba(61,90,128,0.2)"}`,
                          borderRadius: 8, transition: "all 0.15s",
                          opacity: isWrong ? 0.5 : 1,
                        }}>
                          <div style={{
                            fontFamily: V.dm, fontSize: 11, width: 20, height: 20, borderRadius: 6,
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                            background: isCorrect ? V.pu : "rgba(61,90,128,0.2)",
                            color: isCorrect ? "#0A1A18" : V.ch,
                          }}>
                            {alt.letra}
                          </div>
                          <span style={{ fontSize: 13, lineHeight: 1.6, color: isCorrect ? "#fff" : V.nb }}>
                            {alt.texto}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Gabarito toggle + explanation */}
                  <div style={{ marginTop: 16 }}>
                    {!showGabarito ? (
                      <button onClick={() => setShowGabarito(true)} style={{
                        padding: "8px 18px", borderRadius: 8,
                        background: "rgba(0,194,168,0.1)", border: "1.5px solid rgba(0,194,168,0.25)",
                        color: V.pu, fontFamily: V.db, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}>
                        Ver gabarito comentado
                      </button>
                    ) : (
                      <div style={{
                        marginTop: 8, padding: "14px 16px",
                        background: "rgba(0,194,168,0.04)", border: "1px solid rgba(0,194,168,0.15)",
                        borderRadius: 10,
                      }}>
                        <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: V.pu, marginBottom: 8 }}>
                          Gabarito: {q.gabarito}
                        </div>
                        <div style={{ fontSize: 13, lineHeight: 1.7, color: V.nb }}>
                          {q.explicacao}
                        </div>
                        {q.tags && (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 10 }}>
                            {q.tags.map((t) => (
                              <span key={t} style={{
                                fontFamily: V.dm, fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase",
                                padding: "2px 7px", borderRadius: 9999,
                                background: "rgba(61,90,128,0.15)", color: V.ch,
                              }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: V.ch, fontSize: 14 }}>
            Nenhuma questão encontrada com esses filtros.
          </div>
        )}
      </div>
    </PageShell>
  );
}
