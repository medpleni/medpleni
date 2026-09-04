"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchQuestions } from "@/lib/supabase/questions";
import type { Questao } from "@/lib/types";

const V = {
  pu: "var(--pulso)",
  re: "var(--resgate)",
  rel: "var(--resid-light)",
  ind: "var(--indigo)",
  ch: "var(--chumbo)",
  nb: "var(--neblina)",
  pe: "var(--petroleo)",
  am: "var(--ambar)",
  wn: "var(--warn)",
  dg: "var(--danger)",
  su: "var(--success)",
  cardBg: "var(--card-bg)",
  cardBorder: "var(--card-border)",
  heading: "var(--heading-color)",
  inputBg: "var(--input-bg)",
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: V.pu, marginBottom: 4, fontWeight: 600 }}>
            Corpo Docente & Conteudistas
          </div>
          <h1 style={{ fontFamily: V.df, fontSize: 28, fontWeight: 700, color: "var(--heading-color)", margin: 0 }}>
            Gestão do Banco de Questões
          </h1>
        </div>

        <button
          onClick={() => router.push("/admin/conteudo/nova")}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            background: `linear-gradient(135deg, ${V.pu}, #009688)`,
            border: "none",
            color: "#FFFFFF",
            fontFamily: V.db,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 2px 10px rgba(0,194,168,0.25)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>+ Cadastrar Nova Questão</span>
        </button>
      </div>

      {/* ── FILTERS ── */}
      <div style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        boxShadow: "var(--card-shadow)",
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 20,
        display: "flex",
        gap: 14,
        alignItems: "center",
        flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: "min(100%, 260px)" }}>
          <input
            type="text"
            placeholder="Buscar por enunciado, subtópico ou tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 8,
              background: "var(--input-bg)",
              border: "1px solid var(--card-border)",
              color: "var(--heading-color)",
              fontFamily: V.db,
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>

        <div className="mobile-scroll-x" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "nowrap", width: "100%", paddingBottom: 4 }}>
          <span style={{ fontSize: 12, color: "var(--chumbo)", fontWeight: 500, whiteSpace: "nowrap" }}>Área:</span>
          {["Todas", "Clínica Médica", "Cirurgia Geral", "Saúde Coletiva", "Pediatria", "GO"].map((a) => (
            <button
              key={a}
              onClick={() => setAreaFilter(a)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                background: areaFilter === a ? "var(--pulso-dim)" : "transparent",
                border: `1px solid ${areaFilter === a ? V.pu : "var(--card-border)"}`,
                color: areaFilter === a ? V.pu : "var(--chumbo)",
                fontFamily: V.db,
                fontSize: 12,
                fontWeight: areaFilter === a ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* ── TABLE OF QUESTIONS ── */}
      <div style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        boxShadow: "var(--card-shadow)",
        borderRadius: 14,
        overflow: "hidden",
      }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--chumbo)" }}>
            Carregando questões...
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table style={{ width: "100%", minWidth: 680, borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--input-bg)", borderBottom: "1px solid var(--card-border)" }}>
                  {["Área DCN", "Subárea & Tema", "Banca / Ano", "Dificuldade", "Gabarito", "Ações"].map((h) => (
                    <th key={h} style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontFamily: V.dm,
                      fontSize: 9,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--chumbo)",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                    <td style={{ padding: "14px 16px", color: V.pu, fontWeight: 700, whiteSpace: "nowrap" }}>
                      {q.area}
                    </td>
                    <td style={{ padding: "14px 16px", maxWidth: 320 }}>
                      <div style={{ fontWeight: 600, color: "var(--heading-color)" }}>{q.subarea}</div>
                      <div style={{ fontSize: 11, color: "var(--chumbo)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {q.enunciado}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--neblina)", whiteSpace: "nowrap" }}>
                      {q.instituicao} · {q.ano}
                    </td>
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                      <span style={{
                        fontFamily: V.dm, fontSize: 10, padding: "2px 7px", borderRadius: 4,
                        background: "rgba(245,166,35,0.12)", color: V.wn, border: "1px solid rgba(245,166,35,0.25)",
                        fontWeight: 600, textTransform: "uppercase",
                      }}>
                        {q.dificuldade}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontFamily: V.dm, fontWeight: 700, color: V.pu }}>
                      {q.gabarito}
                    </td>
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                      <button
                        onClick={() => alert(`Visualização da questão #${q.id}: ${q.enunciado.slice(0, 80)}...`)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          background: "var(--input-bg)",
                          border: "1px solid var(--card-border)",
                          color: "var(--chumbo)",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
