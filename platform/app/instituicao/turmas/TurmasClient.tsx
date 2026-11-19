"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  type ClassGroupSummaryItem,
  type ScatterPlotResult,
} from "@/lib/b2b/class-groups";
import { SCORE_BANDS, getScoreBandCategory } from "@/lib/b2b/executive";

interface TurmasClientProps {
  institution: {
    name: string;
    cutScore: number;
  };
  userRole: string;
  turmas: ClassGroupSummaryItem[];
  institutionalScatter: {
    questions: ScatterPlotResult;
    exams: ScatterPlotResult;
  };
}

export default function TurmasClient({
  institution,
  userRole,
  turmas,
  institutionalScatter,
}: TurmasClientProps) {
  const [activeView, setActiveView] = useState<"lista" | "dispersao_institucional">("lista");
  const [xMetric, setXMetric] = useState<"questions" | "exams">("questions");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<string | null>(null);

  const cutScore = institution.cutScore;
  const currentScatter = institutionalScatter[xMetric];

  // Filtro por período na dispersão institucional (TC-08)
  const filteredStudents = periodFilter === "all"
    ? currentScatter.plottedStudents
    : currentScatter.plottedStudents.filter((s) => {
        const turma = turmas.find((t) => t.id === s.registration || s.studentName.includes(`${periodFilter}º`));
        return turma ? String(turma.period) === periodFilter : true;
      });

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "8px 0 40px" }}>
      {/* CABEÇALHO */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <Link href="/instituicao" style={{ fontSize: "12px", color: "var(--chumbo)", textDecoration: "none" }}>
                ← Visão Geral
              </Link>
              <span style={{ fontSize: "12px", color: "var(--sinal)" }}>/</span>
              <span style={{ fontSize: "12px", color: "var(--texto-secundario)" }}>Gestão Acadêmica</span>
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 4px", color: "var(--heading-color)" }}>
              Turmas & Acompanhamento de Rendimento
            </h1>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--chumbo)" }}>
              {userRole === "docente"
                ? "Turmas sob sua docência direta. Acompanhe a evolução acadêmica e o desempenho individual."
                : `Visão geral das ${turmas.length} turmas cadastradas na ${institution.name}.`}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                display: "inline-flex",
                background: "var(--input-bg)",
                padding: "3px",
                borderRadius: "6px",
                border: "1px solid var(--sinal)",
              }}
            >
              <button
                onClick={() => setActiveView("lista")}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  background: activeView === "lista" ? "var(--card-bg)" : "transparent",
                  color: activeView === "lista" ? "var(--heading-color)" : "var(--chumbo)",
                  boxShadow: activeView === "lista" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                }}
              >
                Lista de Turmas
              </button>
              <button
                onClick={() => setActiveView("dispersao_institucional")}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  background: activeView === "dispersao_institucional" ? "var(--card-bg)" : "transparent",
                  color: activeView === "dispersao_institucional" ? "var(--heading-color)" : "var(--chumbo)",
                  boxShadow: activeView === "dispersao_institucional" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                }}
              >
                Dispersão Institucional (TC-08)
              </button>
            </div>

            <div
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                background: "var(--input-bg)",
                border: "1px solid var(--sinal)",
                fontSize: "12px",
                fontWeight: 600,
                fontFamily: "'IBM Plex Mono', monospace",
                color: "var(--heading-color)",
              }}
            >
              Régua 60: {cutScore}%
            </div>
          </div>
        </div>
      </div>

      {/* VISÃO 1: LISTA DE TURMAS (TC-01) */}
      {activeView === "lista" && (
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: "10px",
            overflow: "hidden",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "var(--table-header-bg, #F8FAFC)", borderBottom: "1px solid var(--card-border)" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>Etapa</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>Turma / Grupo</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Alunos</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Participação</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Média Geral</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Tendência</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Abaixo de 60</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {turmas.map((turma) => {
                  const band = SCORE_BANDS[getScoreBandCategory(turma.averageScore)];
                  return (
                    <tr
                      key={turma.id}
                      style={{
                        borderBottom: "1px solid var(--card-border)",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "var(--input-bg)",
                            border: "1px solid var(--sinal)",
                            color: "var(--heading-color)",
                          }}
                        >
                          {turma.period}ºP
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <Link
                          href={`/instituicao/turmas/${turma.id}`}
                          style={{
                            fontWeight: 600,
                            fontSize: "13px",
                            color: "var(--heading-color)",
                            textDecoration: "none",
                          }}
                        >
                          {turma.label}
                        </Link>
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "center", color: "var(--heading-color)", fontWeight: 500 }}>
                        {turma.totalStudents} ativos
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: turma.participationRate >= 90 ? "var(--heading-color)" : "#D97706" }}>
                          {turma.participationRate}%
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span
                          className={band.badgeClass}
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontWeight: 700,
                            fontSize: "12px",
                            border: "1px solid transparent",
                          }}
                        >
                          {turma.averageScore.toFixed(1)}%
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        {turma.trend === "up" ? (
                          <span style={{ color: "#059669", fontWeight: 600, fontSize: "11px" }}>↗ Subindo</span>
                        ) : turma.trend === "down" ? (
                          <span style={{ color: "#DC2626", fontWeight: 600, fontSize: "11px" }}>↘ Caindo</span>
                        ) : (
                          <span style={{ color: "var(--chumbo)", fontWeight: 500, fontSize: "11px" }}>→ Estável</span>
                        )}
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        {turma.studentsBelowCutCount > 0 ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              background: "rgba(239, 68, 68, 0.1)",
                              color: "#DC2626",
                              fontWeight: 700,
                              fontSize: "11px",
                              border: "1px solid rgba(239, 68, 68, 0.25)",
                            }}
                          >
                            {turma.studentsBelowCutCount} alunos
                          </span>
                        ) : (
                          <span style={{ color: "#059669", fontWeight: 600, fontSize: "11px" }}>Nenhum</span>
                        )}
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <Link
                          href={`/instituicao/turmas/${turma.id}`}
                          style={{
                            padding: "5px 12px",
                            borderRadius: "5px",
                            background: "var(--input-bg)",
                            border: "1px solid var(--sinal)",
                            color: "var(--pulso, #0284C7)",
                            fontWeight: 600,
                            fontSize: "12px",
                            textDecoration: "none",
                          }}
                        >
                          Ver Detalhes ↗
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISÃO 2: DISPERSÃO INSTITUCIONAL (TC-08) */}
      {activeView === "dispersao_institucional" && (
        <div>
          {/* BARRA DE CONTROLE DA DISPERSÃO */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              padding: "12px 16px",
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "8px",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--heading-color)" }}>
                Eixo X (Esforço / Treino):
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => setXMetric("questions")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: xMetric === "questions" ? "var(--pulso, #0284C7)" : "var(--sinal)",
                    background: xMetric === "questions" ? "rgba(2, 132, 199, 0.1)" : "var(--card-bg)",
                    color: xMetric === "questions" ? "var(--pulso, #0284C7)" : "var(--heading-color)",
                  }}
                >
                  Questões de Treino (B2C)
                </button>
                <button
                  onClick={() => setXMetric("exams")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: xMetric === "exams" ? "var(--pulso, #0284C7)" : "var(--sinal)",
                    background: xMetric === "exams" ? "rgba(2, 132, 199, 0.1)" : "var(--card-bg)",
                    color: xMetric === "exams" ? "var(--pulso, #0284C7)" : "var(--heading-color)",
                  }}
                >
                  Simulados Realizados (B2B)
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <label htmlFor="period-filter-select" style={{ fontSize: "12px", color: "var(--chumbo)" }}>Filtrar por etapa:</label>
              <select
                id="period-filter-select"
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  background: "var(--input-bg)",
                  border: "1px solid var(--sinal)",
                  color: "var(--heading-color)",
                }}
              >
                <option value="all">Todos os períodos ({currentScatter.plottedStudents.length} alunos)</option>
                {turmas.map((t) => (
                  <option key={t.id} value={String(t.period)}>
                    {t.period}º Período ({t.label})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* PAINEL DOS 4 QUADRANTES COM GRÁFICO CARTESIANO */}
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "10px",
              padding: "20px",
              boxShadow: "var(--card-shadow)",
              marginBottom: "16px",
            }}
          >
            {/* CABEÇALHO DO GRÁFICO */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 4px", color: "var(--heading-color)" }}>
                  Dispersão Institucional: Rendimento Médio vs. Volume de Treino
                </h3>
                <span style={{ fontSize: "12px", color: "var(--chumbo)" }}>
                  Eixo Y: Nota média (%) · Eixo X: {xMetric === "questions" ? "Questões respondidas" : "Simulados realizados"} · Divisor vertical na mediana institucional ({currentScatter.xMedian}) · Linha horizontal no corte ({cutScore}%)
                </span>
              </div>

              {currentScatter.unplottedStudentsCount > 0 && (
                <div style={{ fontSize: "11px", color: "#D97706", background: "rgba(217, 119, 6, 0.1)", padding: "4px 8px", borderRadius: "4px" }}>
                  {currentScatter.unplottedStudentsCount} estudantes sem nota (ausentes/sem prova) não plotados
                </div>
              )}
            </div>

            {/* GRÁFICO CARTESIANO SVG VETORIAL */}
            <div style={{ position: "relative", width: "100%", height: "420px", background: "var(--input-bg)", borderRadius: "8px", border: "1px solid var(--sinal)", overflow: "hidden" }}>
              {/* RÓTULOS DOS 4 QUADRANTES */}
              <div style={{ position: "absolute", top: "12px", right: "16px", textAlign: "right", pointerEvents: "none", zIndex: 1 }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#059669" }}>
                  Treina e Performa ({currentScatter.quadrantCounts.treina_performa})
                </span>
                <div style={{ fontSize: "10px", color: "var(--chumbo)" }}>Alto treino · Nota ≥ 60%</div>
              </div>

              <div style={{ position: "absolute", top: "12px", left: "60px", textAlign: "left", pointerEvents: "none", zIndex: 1 }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--pulso, #0284C7)" }}>
                  Performa com Pouco Treino ({currentScatter.quadrantCounts.pouco_treino_performa})
                </span>
                <div style={{ fontSize: "10px", color: "var(--chumbo)" }}>Baixo treino · Nota ≥ 60%</div>
              </div>

              <div style={{ position: "absolute", bottom: "30px", right: "16px", textAlign: "right", pointerEvents: "none", zIndex: 1 }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#D97706" }}>
                  Treina e Não Sobe ({currentScatter.quadrantCounts.treina_nao_sobe})
                </span>
                <div style={{ fontSize: "10px", color: "var(--chumbo)" }}>Alto treino · Nota &lt; 60%</div>
              </div>

              <div style={{ position: "absolute", bottom: "30px", left: "60px", textAlign: "left", pointerEvents: "none", zIndex: 1 }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#DC2626" }}>
                  Pouco Treino e Abaixo ({currentScatter.quadrantCounts.pouco_treino_abaixo})
                </span>
                <div style={{ fontSize: "10px", color: "var(--chumbo)" }}>Baixo treino · Nota &lt; 60%</div>
              </div>

              {/* LINHA DE CORTE 60 (HORIZONTAL) */}
              <div
                style={{
                  position: "absolute",
                  left: "50px",
                  right: 0,
                  top: "40%", // 60% da escala de 0 a 100 fica a 40% do topo
                  height: "1px",
                  borderTop: "2px dashed rgba(220, 38, 38, 0.6)",
                  zIndex: 2,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: "8px",
                    top: "-18px",
                    fontSize: "10px",
                    fontWeight: 700,
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: "#DC2626",
                    background: "var(--card-bg)",
                    padding: "1px 4px",
                    borderRadius: "3px",
                  }}
                >
                  Corte: 60%
                </span>
              </div>

              {/* LINHA DA MEDIANA DE X (VERTICAL) */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: "25px",
                  left: "50%",
                  width: "1px",
                  borderLeft: "2px dashed rgba(2, 132, 199, 0.5)",
                  zIndex: 2,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    bottom: "4px",
                    left: "4px",
                    fontSize: "10px",
                    fontWeight: 700,
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: "var(--pulso, #0284C7)",
                    background: "var(--card-bg)",
                    padding: "1px 4px",
                    borderRadius: "3px",
                  }}
                >
                  Mediana: {currentScatter.xMedian}
                </span>
              </div>

              {/* RENDERIZAÇÃO DOS PONTOS DOS ESTUDANTES */}
              <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                {filteredStudents.map((st) => {
                  const score = st.averageScore ?? 0;
                  const xVal = xMetric === "questions" ? st.questionsCount : st.examsCount;

                  // Mapeamento de coordenadas
                  // Y: 0% = bottom, 100% = top
                  const cy = `${100 - score * 0.9}%`;
                  // X: mapeamento em torno da mediana (50% central)
                  const maxX = Math.max(1, currentScatter.xMedian * 2.2);
                  const cx = `${Math.min(94, Math.max(6, (xVal / maxX) * 100))}%`;

                  const isDecision = st.isInDecisionZone;

                  return (
                    <g key={st.studentUserId}>
                      {isDecision && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r="9"
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth="2"
                          strokeDasharray="2,2"
                        />
                      )}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isDecision ? "6" : "5"}
                        fill={
                          isDecision
                            ? "#F59E0B"
                            : score >= 60
                            ? "#10B981"
                            : "#EF4444"
                        }
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                        style={{ cursor: "pointer", transition: "transform 0.1s ease" }}
                        onClick={() => setSelectedStudentForModal(st.studentUserId)}
                      >
                        <title>{`${st.studentName} (${st.registration})\nNota média: ${score.toFixed(1)}%\n${xMetric === "questions" ? "Questões: " + st.questionsCount : "Simulados: " + st.examsCount}${isDecision ? "\n★ ZONA DE DECISÃO (51–60%)" : ""}`}</title>
                      </circle>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* LEGENDA E INSTRUÇÕES */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                marginTop: "12px",
                fontSize: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10B981" }} />
                  <span style={{ color: "var(--heading-color)" }}>Aprovado (≥ 60%)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#F59E0B", border: "2px dashed #B45309" }} />
                  <span style={{ color: "var(--heading-color)", fontWeight: 600 }}>Zona de Decisão (51–60%)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#EF4444" }} />
                  <span style={{ color: "var(--heading-color)" }}>Abaixo do Corte (&lt; 51%)</span>
                </div>
              </div>

              <div style={{ color: "var(--chumbo)", fontSize: "11px" }}>
                Clique em qualquer ponto para abrir o perfil detalhado e a trajetória individual do estudante.
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Rodapé Padronizado Base / Período / Fonte */}
      <div
        style={{
          marginTop: "24px",
          padding: "12px 16px",
          borderRadius: "8px",
          border: "1px solid var(--card-border)",
          background: "var(--card-bg)",
          fontSize: "11px",
          color: "var(--chumbo)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div>
          <span><strong>Base:</strong> {turmas.reduce((sum, t) => sum + t.totalStudents, 0)} estudantes acompanhados ({turmas.length} turmas)</span> •{" "}
          <span><strong>Período:</strong> 2026.1</span> •{" "}
          <span><strong>Fonte:</strong> Provas aplicadas, simulados ENAMED e telemetria de treino</span>
        </div>
        <div>Régua de corte configurada: <strong>{institution?.cutScore ?? 60}%</strong></div>
      </div>
    </div>
  );
}
