"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchQuestions } from "@/lib/supabase/questions";
import type { Questao } from "@/lib/types";

const V = {
  pu: "var(--pulso)", re: "var(--resgate)", rel: "#64B5E8", ind: "#6B5CE7",
  ch: "var(--chumbo)", nb: "var(--neblina)", pe: "var(--petroleo)", am: "#C98A0A",
  wn: "#F5A623", dg: "#FF6B6B", su: "var(--sucesso)",
  cardBg: "var(--card-bg)", cardBorder: "var(--card-border)", heading: "var(--heading-color)",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
};

export default function AdminConteudoPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Questao[]>([]);
  const [loading, setLoading] = useState(true);
  const [areaFilter, setAreaFilter] = useState("Todas");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const qs = await fetchQuestions({
      area: areaFilter !== "Todas" ? areaFilter : undefined,
      search: search || undefined,
      limit: 50,
    });
    setQuestions(qs);
    setLoading(false);
  }, [areaFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div>
      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: V.pu, marginBottom: 4 }}>
            Corpo Docente & Conteudistas
          </div>
          <h1 style={{ fontFamily: V.df, fontSize: 28, fontWeight: 700, color: "#fff" }}>
            Gestão do Banco de Questões
          </h1>
        </div>

        <button
          onClick={() => router.push("/admin/conteudo/nova")}
          style={{
            padding: "10px 20px", borderRadius: 8,
            background: V.pu, border: "none", color: "#0A1A18",
            fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 2px 10px rgba(0,194,168,0.25)",
          }}
        >
          + Cadastrar Nova Questão
        </button>
      </div>

      {/* ── FILTERS ── */}
      <div style={{
        background: V.pe, border: "1px solid rgba(61,90,128,0.25)",
        borderRadius: 12, padding: "16px 20px", marginBottom: 20,
        display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <input
            type="text"
            placeholder="Buscar por enunciado, subtópico ou tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 8,
              background: "rgba(13,17,28,0.5)", border: "1px solid rgba(61,90,128,0.3)",
              color: "#fff", fontFamily: V.db, fontSize: 13, outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: V.ch }}>Área:</span>
          {["Todas", "Clínica Médica", "Cirurgia Geral", "Saúde Coletiva", "Pediatria", "GO"].map((a) => (
            <button
              key={a}
              onClick={() => setAreaFilter(a)}
              style={{
                padding: "6px 12px", borderRadius: 6,
                background: areaFilter === a ? "rgba(0,194,168,0.15)" : "transparent",
                border: `1px solid ${areaFilter === a ? V.pu : "rgba(61,90,128,0.3)"}`,
                color: areaFilter === a ? V.pu : V.ch,
                fontFamily: V.db, fontSize: 12, cursor: "pointer",
              }}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* ── TABLE OF QUESTIONS ── */}
      <div style={{
        background: V.pe, border: "1px solid rgba(61,90,128,0.25)",
        borderRadius: 14, overflow: "hidden",
      }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: V.ch }}>
            Carregando questões...
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#0D111C", borderBottom: "1px solid rgba(61,90,128,0.3)" }}>
                {["Área DCN", "Subárea & Tema", "Banca / Ano", "Dificuldade", "Gabarito", "Ações"].map((h) => (
                  <th key={h} style={{
                    padding: "12px 16px", textAlign: "left",
                    fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em",
                    textTransform: "uppercase", color: V.ch,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.id} style={{ borderBottom: "1px solid rgba(61,90,128,0.15)" }}>
                  <td style={{ padding: "14px 16px", color: V.pu, fontWeight: 600 }}>
                    {q.area}
                  </td>
                  <td style={{ padding: "14px 16px", maxWidth: 300 }}>
                    <div style={{ fontWeight: 600, color: "#fff" }}>{q.subarea}</div>
                    <div style={{ fontSize: 11, color: V.ch, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {q.enunciado}
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", color: V.nb }}>
                    {q.instituicao} · {q.ano}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{
                      fontFamily: V.dm, fontSize: 10, padding: "2px 7px", borderRadius: 4,
                      background: "rgba(245,166,35,0.1)", color: V.wn, border: "1px solid rgba(245,166,35,0.2)",
                    }}>
                      {q.dificuldade}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", fontFamily: V.dm, fontSize: 14, fontWeight: 700, color: V.pu }}>
                    {q.gabarito}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <button
                      onClick={() => alert(`Questão ${q.id}: visualização de comentários ativada.`)}
                      style={{
                        padding: "5px 10px", borderRadius: 6,
                        background: "rgba(61,90,128,0.2)", border: "none",
                        color: V.nb, fontSize: 11, cursor: "pointer",
                      }}
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
