"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  type AreaScenarioAggregation,
  type ScatterPlotResult,
  type ScatterStudentPoint,
  type StudentProfileData,
} from "@/lib/b2b/class-groups";
import type { ClassReadinessDistribution } from "@/lib/b2b/readiness";
import { READINESS_DISCLAIMER_TEXT } from "@/lib/b2b/readiness";
import { SCORE_BANDS, getScoreBandCategory } from "@/lib/b2b/executive";

interface ExamRowItem {
  examId: string;
  title: string;
  date: string;
  modality: string;
  totalPresent: number;
  classMeanScore: number;
  examOverallMeanScore: number; // TC-07: Total geral ao lado
}

interface TurmaDetalheClientProps {
  turma: {
    id: string;
    label: string;
    period: number;
    totalStudents: number;
    averageScore: number;
    participationRate: number;
  };
  cutScore: number;
  userRole: string;
  areas: AreaScenarioAggregation[];
  scenarios: AreaScenarioAggregation[];
  scatterQuestions: ScatterPlotResult;
  scatterExams: ScatterPlotResult;
  studentProfiles: Record<string, StudentProfileData>;
  examsApplied: ExamRowItem[];
  readinessDistribution?: ClassReadinessDistribution;
}

export default function TurmaDetalheClient({
  turma,
  cutScore,
  userRole,
  areas,
  scenarios,
  scatterQuestions,
  scatterExams,
  studentProfiles,
  examsApplied,
  readinessDistribution,
}: TurmaDetalheClientProps) {
  const [activeTab, setActiveTab] = useState<"areas_cenarios" | "dispersao" | "estudantes" | "avaliacoes" | "prontidao">("areas_cenarios");
  const [xMetric, setXMetric] = useState<"questions" | "exams">("questions");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");

  const currentScatter = xMetric === "questions" ? scatterQuestions : scatterExams;
  const selectedStudent = selectedStudentId ? studentProfiles[selectedStudentId] : null;

  // Filtragem de estudantes na tabela
  const studentsList = currentScatter.plottedStudents.concat(
    // Inclui também os não plotados se houver
    Object.values(studentProfiles)
      .filter((sp) => !currentScatter.plottedStudents.some((p) => p.studentUserId === sp.studentUserId))
      .map((sp) => ({
        studentUserId: sp.studentUserId,
        studentName: sp.studentName,
        registration: sp.registration,
        averageScore: null,
        questionsCount: sp.totalQuestionsTrained,
        examsCount: sp.totalExamsTaken,
        isInDecisionZone: false,
      }))
  );

  const filteredStudents = studentsList.filter((s) =>
    s.studentName.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.registration.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Registro de auditoria LGPD ao abrir aluno
  const handleOpenStudent = (studentUserId: string) => {
    setSelectedStudentId(studentUserId);
    fetch("/api/b2b/audit-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentUserId,
        screenViewed: `/instituicao/turmas/${turma.id}#perfil_aluno`,
      }),
    }).catch(() => {});
  };

  const turmaBand = SCORE_BANDS[getScoreBandCategory(turma.averageScore)];

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "8px 0 40px" }}>
      {/* NAVEGAÇÃO E BREADCRUMB */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <Link href="/instituicao/turmas" style={{ fontSize: "12px", color: "var(--chumbo)", textDecoration: "none" }}>
            ← Turmas
          </Link>
          <span style={{ fontSize: "12px", color: "var(--sinal)" }}>/</span>
          <span style={{ fontSize: "12px", color: "var(--texto-secundario)" }}>{turma.period}º Período</span>
        </div>

        {/* CABEÇALHO DA TURMA COM BOTÕES DE AÇÃO (TC-08) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "var(--heading-color)" }}>
                {turma.label}
              </h1>
              <span
                className={turmaBand.badgeClass}
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  fontFamily: "'IBM Plex Mono', monospace",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  border: "1px solid transparent",
                }}
              >
                Média: {turma.averageScore.toFixed(1)}%
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--chumbo)" }}>
              {turma.totalStudents} estudantes matriculados · Participação média de {turma.participationRate}% · Régua institucional: {cutScore}%
            </p>
          </div>

          {/* BOTÕES DE AÇÃO NO CABEÇALHO (TC-08) */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Link
              href={`/instituicao/provas?new=true&classGroupId=${turma.id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "6px",
                background: "var(--pulso, #0284C7)",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 600,
                textDecoration: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
              }}
            >
              <span>+</span> Nova Prova para a Turma
            </Link>

            <Link
              href={`/instituicao/intervencoes?new=true&classGroupId=${turma.id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "6px",
                background: "var(--card-bg)",
                border: "1px solid var(--sinal)",
                color: "var(--heading-color)",
                fontSize: "12px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <span>+</span> Nova Intervenção
            </Link>
          </div>
        </div>
      </div>

      {/* ABAS DO DETALHE DA TURMA */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--card-border)",
          marginBottom: "20px",
          gap: "24px",
        }}
      >
        <button
          onClick={() => setActiveTab("areas_cenarios")}
          style={{
            padding: "10px 4px",
            fontSize: "13px",
            fontWeight: activeTab === "areas_cenarios" ? 700 : 500,
            color: activeTab === "areas_cenarios" ? "var(--pulso, #0284C7)" : "var(--chumbo)",
            borderBottom: activeTab === "areas_cenarios" ? "2px solid var(--pulso, #0284C7)" : "2px solid transparent",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          Áreas & Cenários (Agregado)
        </button>

        <button
          onClick={() => setActiveTab("dispersao")}
          style={{
            padding: "10px 4px",
            fontSize: "13px",
            fontWeight: activeTab === "dispersao" ? 700 : 500,
            color: activeTab === "dispersao" ? "var(--pulso, #0284C7)" : "var(--chumbo)",
            borderBottom: activeTab === "dispersao" ? "2px solid var(--pulso, #0284C7)" : "2px solid transparent",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          Dispersão da Turma (TC-03)
        </button>

        <button
          onClick={() => setActiveTab("estudantes")}
          style={{
            padding: "10px 4px",
            fontSize: "13px",
            fontWeight: activeTab === "estudantes" ? 700 : 500,
            color: activeTab === "estudantes" ? "var(--pulso, #0284C7)" : "var(--chumbo)",
            borderBottom: activeTab === "estudantes" ? "2px solid var(--pulso, #0284C7)" : "2px solid transparent",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          Estudantes ({turma.totalStudents})
        </button>

        <button
          onClick={() => setActiveTab("avaliacoes")}
          style={{
            padding: "10px 4px",
            fontSize: "13px",
            fontWeight: activeTab === "avaliacoes" ? 700 : 500,
            color: activeTab === "avaliacoes" ? "var(--pulso, #0284C7)" : "var(--chumbo)",
            borderBottom: activeTab === "avaliacoes" ? "2px solid var(--pulso, #0284C7)" : "2px solid transparent",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          Avaliações Aplicadas ({examsApplied.length})
        </button>

        {readinessDistribution && readinessDistribution.isConfigured && (
          <button
            onClick={() => setActiveTab("prontidao")}
            style={{
              padding: "10px 4px",
              fontSize: "13px",
              fontWeight: activeTab === "prontidao" ? 700 : 500,
              color: activeTab === "prontidao" ? "var(--pulso, #0284C7)" : "var(--chumbo)",
              borderBottom: activeTab === "prontidao" ? "2px solid var(--pulso, #0284C7)" : "2px solid transparent",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            Prontidão da Turma
          </button>
        )}
      </div>

      {/* ABA 1: ÁREAS E CENÁRIOS AGREGADOS (TC-02, TC-03) */}
      {activeTab === "areas_cenarios" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "20px" }}>
          {/* GRANDES ÁREAS DO INEP */}
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "10px",
              padding: "20px",
              boxShadow: "var(--card-shadow)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "var(--heading-color)" }}>
                Grandes Áreas Médicas (INEP)
              </h2>
              <span style={{ fontSize: "11px", color: "var(--chumbo)" }}>Desempenho agregado da turma</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {areas.map((area) => {
                const band = SCORE_BANDS[getScoreBandCategory(area.averageScore)];
                return (
                  <div key={area.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--heading-color)" }}>
                        {area.name}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "11px", color: "var(--chumbo)" }}>{area.questionsCount} itens</span>
                        <span
                          className={band.badgeClass}
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            fontFamily: "'IBM Plex Mono', monospace",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            border: "1px solid transparent",
                          }}
                        >
                          {area.averageScore.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div style={{ height: "8px", background: "var(--input-bg)", borderRadius: "4px", overflow: "hidden", position: "relative" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, area.averageScore)}%`,
                          background: band.colorHex,
                          borderRadius: "4px",
                        }}
                      />
                      {/* Marcador da Régua 60 */}
                      <div
                        style={{
                          position: "absolute",
                          left: `${cutScore}%`,
                          top: 0,
                          bottom: 0,
                          width: "2px",
                          background: "#0F172A",
                          zIndex: 2,
                        }}
                        title={`Régua 60: ${cutScore}%`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CENÁRIOS DE PRÁTICA */}
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "10px",
              padding: "20px",
              boxShadow: "var(--card-shadow)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "var(--heading-color)" }}>
                Cenários de Prática Médica
              </h2>
              <span style={{ fontSize: "11px", color: "var(--chumbo)" }}>Ambientes de atuação clínica</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {scenarios.map((scen) => {
                const band = SCORE_BANDS[getScoreBandCategory(scen.averageScore)];
                return (
                  <div key={scen.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--heading-color)" }}>
                        {scen.name}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "11px", color: "var(--chumbo)" }}>{scen.questionsCount} itens</span>
                        <span
                          className={band.badgeClass}
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            fontFamily: "'IBM Plex Mono', monospace",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            border: "1px solid transparent",
                          }}
                        >
                          {scen.averageScore.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div style={{ height: "8px", background: "var(--input-bg)", borderRadius: "4px", overflow: "hidden", position: "relative" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, scen.averageScore)}%`,
                          background: band.colorHex,
                          borderRadius: "4px",
                        }}
                      />
                      {/* Marcador da Régua 60 */}
                      <div
                        style={{
                          position: "absolute",
                          left: `${cutScore}%`,
                          top: 0,
                          bottom: 0,
                          width: "2px",
                          background: "#0F172A",
                          zIndex: 2,
                        }}
                        title={`Régua 60: ${cutScore}%`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: GRÁFICO DE DISPERSÃO DA TURMA (TC-03) */}
      {activeTab === "dispersao" && (
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "var(--card-shadow)",
          }}
        >
          {/* CONTROLES DO EIXO X */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 2px", color: "var(--heading-color)" }}>
                Matriz de Dispersão da Turma (4 Quadrantes)
              </h2>
              <span style={{ fontSize: "12px", color: "var(--chumbo)" }}>
                Eixo Y: Nota média (%) · Eixo X: {xMetric === "questions" ? "Questões de treino respondidas no período (B2C)" : "Simulados e avaliações feitas (B2B)"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--chumbo)", fontWeight: 500 }}>Alternar Eixo X:</span>
              <button
                onClick={() => setXMetric("questions")}
                style={{
                  padding: "5px 12px",
                  borderRadius: "5px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: xMetric === "questions" ? "var(--pulso, #0284C7)" : "var(--sinal)",
                  background: xMetric === "questions" ? "rgba(2, 132, 199, 0.1)" : "var(--input-bg)",
                  color: xMetric === "questions" ? "var(--pulso, #0284C7)" : "var(--heading-color)",
                }}
              >
                Questões Respondidas
              </button>
              <button
                onClick={() => setXMetric("exams")}
                style={{
                  padding: "5px 12px",
                  borderRadius: "5px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: xMetric === "exams" ? "var(--pulso, #0284C7)" : "var(--sinal)",
                  background: xMetric === "exams" ? "rgba(2, 132, 199, 0.1)" : "var(--input-bg)",
                  color: xMetric === "exams" ? "var(--pulso, #0284C7)" : "var(--heading-color)",
                }}
              >
                Simulados Feitos
              </button>
            </div>
          </div>

          {/* ÁREA GRÁFICA CARTESIANA SVG */}
          <div style={{ position: "relative", width: "100%", height: "420px", background: "var(--input-bg)", borderRadius: "8px", border: "1px solid var(--sinal)", overflow: "hidden" }}>
            {/* RÓTULOS DOS 4 QUADRANTES COM CONTAGEM */}
            <div style={{ position: "absolute", top: "12px", right: "16px", textAlign: "right", pointerEvents: "none", zIndex: 1 }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#059669" }}>
                Treina e Performa ({currentScatter.quadrantCounts.treina_performa})
              </span>
              <div style={{ fontSize: "10px", color: "var(--chumbo)" }}>Treino ≥ {currentScatter.xMedian} · Nota ≥ 60%</div>
            </div>

            <div style={{ position: "absolute", top: "12px", left: "60px", textAlign: "left", pointerEvents: "none", zIndex: 1 }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--pulso, #0284C7)" }}>
                Performa com Pouco Treino ({currentScatter.quadrantCounts.pouco_treino_performa})
              </span>
              <div style={{ fontSize: "10px", color: "var(--chumbo)" }}>Treino &lt; {currentScatter.xMedian} · Nota ≥ 60%</div>
            </div>

            <div style={{ position: "absolute", bottom: "30px", right: "16px", textAlign: "right", pointerEvents: "none", zIndex: 1 }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#D97706" }}>
                Treina e Não Sobe ({currentScatter.quadrantCounts.treina_nao_sobe})
              </span>
              <div style={{ fontSize: "10px", color: "var(--chumbo)" }}>Treino ≥ {currentScatter.xMedian} · Nota &lt; 60%</div>
            </div>

            <div style={{ position: "absolute", bottom: "30px", left: "60px", textAlign: "left", pointerEvents: "none", zIndex: 1 }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#DC2626" }}>
                Pouco Treino e Abaixo ({currentScatter.quadrantCounts.pouco_treino_abaixo})
              </span>
              <div style={{ fontSize: "10px", color: "var(--chumbo)" }}>Treino &lt; {currentScatter.xMedian} · Nota &lt; 60%</div>
            </div>

            {/* LINHA DE CORTE 60 (HORIZONTAL) */}
            <div
              style={{
                position: "absolute",
                left: "50px",
                right: 0,
                top: "40%",
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

            {/* PONTOS DOS ESTUDANTES */}
            <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              {currentScatter.plottedStudents.map((st) => {
                const score = st.averageScore ?? 0;
                const xVal = xMetric === "questions" ? st.questionsCount : st.examsCount;

                const cy = `${100 - score * 0.9}%`;
                const maxX = Math.max(1, currentScatter.xMedian * 2.1);
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
                      style={{ cursor: "pointer" }}
                      onClick={() => handleOpenStudent(st.studentUserId)}
                    >
                      <title>{`${st.studentName} (${st.registration})\nNota Média: ${score.toFixed(1)}%\n${xMetric === "questions" ? "Questões respondidas: " + st.questionsCount : "Simulados: " + st.examsCount}${st.questionsCount === 0 ? "\n(Aviso: sem treino registrado no B2C)" : ""}${isDecision ? "\n★ ZONA DE DECISÃO (51–60%)" : ""}\nClique para ver o perfil do aluno`}</title>
                    </circle>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* AVISOS DE RODAPÉ DA DISPERSÃO */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginTop: "12px", fontSize: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10B981" }} />
                <span>≥ 60%</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#F59E0B", border: "2px dashed #B45309" }} />
                <span style={{ fontWeight: 600 }}>Zona de Decisão (51–60%)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#EF4444" }} />
                <span>&lt; 51%</span>
              </div>
            </div>

            {currentScatter.unplottedStudentsCount > 0 && (
              <span style={{ fontSize: "11px", color: "#D97706", background: "rgba(217, 119, 6, 0.1)", padding: "3px 8px", borderRadius: "4px" }}>
                {currentScatter.unplottedStudentsCount} estudantes sem nota (ausentes/sem provas) não foram plotados
              </span>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: LISTA INDIVIDUAL DE ESTUDANTES (TC-05) */}
      {activeTab === "estudantes" && (
        <div>
          {/* AVISO DISCRETO LGPD (TC-05) */}
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: "var(--input-bg)",
              border: "1px solid var(--sinal)",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "var(--chumbo)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>
                <strong>Acesso a Dados Individuais:</strong> Visível para dirigente, coordenador e professor da própria turma. Todos os acessos individuais são auditados para fins de governança acadêmica e LGPD.
              </span>
            </div>
            <input
              type="text"
              placeholder="Buscar aluno ou RA..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              style={{
                padding: "4px 10px",
                borderRadius: "4px",
                border: "1px solid var(--sinal)",
                background: "var(--card-bg)",
                fontSize: "12px",
                color: "var(--heading-color)",
                minWidth: "180px",
              }}
            />
          </div>

          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "10px",
              overflow: "hidden",
              boxShadow: "var(--card-shadow)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "var(--table-header-bg, #F8FAFC)", borderBottom: "1px solid var(--card-border)" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>Estudante</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>Matrícula / RA</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Nota Média</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Treino B2C</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Simulados</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Faixa</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "right" }}>Perfil</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((st) => {
                  const score = st.averageScore;
                  const band = score !== null ? SCORE_BANDS[getScoreBandCategory(score)] : null;
                  return (
                    <tr
                      key={st.studentUserId}
                      style={{
                        borderBottom: "1px solid var(--card-border)",
                        cursor: "pointer",
                      }}
                      onClick={() => handleOpenStudent(st.studentUserId)}
                    >
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>
                        {st.studentName}
                      </td>

                      <td style={{ padding: "12px 16px", fontFamily: "'IBM Plex Mono', monospace", color: "var(--chumbo)" }}>
                        {st.registration}
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        {score !== null ? (
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: "12px", color: band?.colorHex }}>
                            {score.toFixed(1)}%
                          </span>
                        ) : (
                          <span style={{ color: "var(--chumbo)" }}>Sem nota</span>
                        )}
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        {st.questionsCount > 0 ? (
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{st.questionsCount} questões</span>
                        ) : (
                          <span style={{ color: "var(--chumbo)", fontSize: "11px" }}>0 (sem treino)</span>
                        )}
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "center", fontFamily: "'IBM Plex Mono', monospace" }}>
                        {st.examsCount} feitas
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        {score !== null && band ? (
                          <span
                            className={band.badgeClass}
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: 600,
                              border: "1px solid transparent",
                            }}
                          >
                            {st.isInDecisionZone ? "Zona de Decisão" : band.label.split("(")[0].trim()}
                          </span>
                        ) : (
                          <span style={{ color: "var(--chumbo)" }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenStudent(st.studentUserId);
                          }}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "4px",
                            background: "var(--input-bg)",
                            border: "1px solid var(--sinal)",
                            color: "var(--pulso, #0284C7)",
                            fontWeight: 600,
                            fontSize: "11px",
                            cursor: "pointer",
                          }}
                        >
                          Ver Trajetória ↗
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 4: AVALIAÇÕES APLICADAS (TC-07 COM TOTAL GERAL AO LADO) */}
      {activeTab === "avaliacoes" && (
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: "10px",
            overflow: "hidden",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--card-border)" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "var(--heading-color)" }}>
              Avaliações Aplicadas à Turma
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--chumbo)" }}>
              Comparativo entre a Média da Turma e o Total Geral Institucional (todas as turmas que realizaram a avaliação), conforme o Voto TC-07.
            </p>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--table-header-bg, #F8FAFC)", borderBottom: "1px solid var(--card-border)" }}>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>Avaliação / Prova</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>Data</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Modalidade</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Presentes</th>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: "var(--heading-color)", textAlign: "center", background: "var(--input-bg)" }}>
                  Média da Turma
                </th>
                <th style={{ padding: "12px 16px", fontWeight: 700, color: "var(--heading-color)", textAlign: "center" }}>
                  Total Geral da Prova
                </th>
                <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "right" }}>Laudo</th>
              </tr>
            </thead>
            <tbody>
              {examsApplied.map((ex) => {
                const classBand = SCORE_BANDS[getScoreBandCategory(ex.classMeanScore)];
                const overallBand = SCORE_BANDS[getScoreBandCategory(ex.examOverallMeanScore)];

                return (
                  <tr key={ex.examId} style={{ borderBottom: "1px solid var(--card-border)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>
                      <Link
                        href={`/instituicao/provas/${ex.examId}/resultado`}
                        style={{ color: "var(--heading-color)", textDecoration: "none" }}
                      >
                        {ex.title}
                      </Link>
                    </td>

                    <td style={{ padding: "12px 16px", color: "var(--chumbo)" }}>
                      {new Date(ex.date).toLocaleDateString("pt-BR")}
                    </td>

                    <td style={{ padding: "12px 16px", textAlign: "center", textTransform: "capitalize" }}>
                      {ex.modality}
                    </td>

                    <td style={{ padding: "12px 16px", textAlign: "center", fontFamily: "'IBM Plex Mono', monospace" }}>
                      {ex.totalPresent} alunos
                    </td>

                    <td style={{ padding: "12px 16px", textAlign: "center", background: "var(--input-bg)" }}>
                      <span
                        className={classBand.badgeClass}
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
                        {ex.classMeanScore.toFixed(1)}%
                      </span>
                    </td>

                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontWeight: 700,
                          fontSize: "12px",
                          color: overallBand.colorHex,
                        }}
                      >
                        {ex.examOverallMeanScore.toFixed(1)}%
                      </span>
                    </td>

                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <Link
                        href={`/instituicao/provas/${ex.examId}/resultado`}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "4px",
                          background: "var(--input-bg)",
                          border: "1px solid var(--sinal)",
                          color: "var(--pulso, #0284C7)",
                          fontWeight: 600,
                          fontSize: "11px",
                          textDecoration: "none",
                        }}
                      >
                        Ver Resultado ↗
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ABA 5: PRONTIDÃO DA TURMA (P22) */}
      {activeTab === "prontidao" && readinessDistribution && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "10px",
              background: "rgba(2, 132, 199, 0.06)",
              border: "1px solid rgba(2, 132, 199, 0.2)",
              fontSize: "12px",
              color: "var(--heading-color)",
              lineHeight: 1.6,
            }}
          >
            <strong>Aviso de Interpretação:</strong> {READINESS_DISCLAIMER_TEXT}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            <div style={{ padding: "16px", borderRadius: "10px", background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
              <span style={{ fontSize: "11px", color: "#059669", fontWeight: 700, textTransform: "uppercase" }}>No caminho</span>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--heading-color)", margin: "4px 0" }}>
                {readinessDistribution.highCount} alunos ({readinessDistribution.highPercent}%)
              </div>
              <span style={{ fontSize: "11px", color: "var(--chumbo)" }}>Cumpre integralmente as regras</span>
            </div>

            <div style={{ padding: "16px", borderRadius: "10px", background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
              <span style={{ fontSize: "11px", color: "#D97706", fontWeight: 700, textTransform: "uppercase" }}>Em atenção</span>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--heading-color)", margin: "4px 0" }}>
                {readinessDistribution.mediumCount} alunos ({readinessDistribution.mediumPercent}%)
              </div>
              <span style={{ fontSize: "11px", color: "var(--chumbo)" }}>Cumpre parcialmente os critérios</span>
            </div>

            <div style={{ padding: "16px", borderRadius: "10px", background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
              <span style={{ fontSize: "11px", color: "#DC2626", fontWeight: 700, textTransform: "uppercase" }}>Distante</span>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--heading-color)", margin: "4px 0" }}>
                {readinessDistribution.lowCount} alunos ({readinessDistribution.lowPercent}%)
              </div>
              <span style={{ fontSize: "11px", color: "var(--chumbo)" }}>Abaixo do esforço e consistência</span>
            </div>
          </div>

          {/* BARRA TRICOLOR */}
          <div style={{ width: "100%", height: "12px", borderRadius: "6px", background: "var(--input-bg)", display: "flex", overflow: "hidden" }}>
            <div style={{ width: `${readinessDistribution.highPercent}%`, background: "#059669" }} />
            <div style={{ width: `${readinessDistribution.mediumPercent}%`, background: "#F59E0B" }} />
            <div style={{ width: `${readinessDistribution.lowPercent}%`, background: "#EF4444" }} />
          </div>

          {/* TABELA DE ALUNOS COM PRONTIDÃO */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "10px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "var(--input-bg)", borderBottom: "1px solid var(--card-border)", color: "var(--chumbo)", fontWeight: 600 }}>
                  <th style={{ padding: "12px 16px" }}>Estudante</th>
                  <th style={{ padding: "12px 16px", textAlign: "center" }}>Nível de Prontidão</th>
                  <th style={{ padding: "12px 16px", textAlign: "center" }}>Volume no Ano</th>
                  <th style={{ padding: "12px 16px", textAlign: "center" }}>Simulados Qualificados</th>
                  <th style={{ padding: "12px 16px" }}>O que Cumpre & Quanto Falta</th>
                </tr>
              </thead>
              <tbody>
                {readinessDistribution.students.map((st) => (
                  <tr key={st.studentUserId} style={{ borderBottom: "1px solid var(--card-border)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>
                      <button onClick={() => setSelectedStudentId(st.studentUserId)} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 600, color: "var(--heading-color)", textAlign: "left" }}>
                        {st.studentName}
                      </button>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: st.level === "alto" ? "rgba(5, 150, 105, 0.15)" : st.level === "medio" ? "rgba(217, 119, 6, 0.15)" : "rgba(220, 38, 38, 0.15)",
                        color: st.level === "alto" ? "#059669" : st.level === "medio" ? "#D97706" : "#DC2626",
                      }}>
                        {st.levelLabel}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center", fontFamily: "'IBM Plex Mono', monospace" }}>
                      {st.questionsAnswered.toLocaleString("pt-BR")} / {st.volumeTarget?.toLocaleString("pt-BR") || "—"} ({st.volumeProgressPercent}%)
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center", fontFamily: "'IBM Plex Mono', monospace" }}>
                      {st.qualifyingExamsCount} / {st.consistencyTargetExams || "—"} simulados
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "11px", color: "var(--chumbo)" }}>
                      <div>{st.rulesFulfilledSummary}</div>
                      <div style={{ color: "var(--pulso, #0284C7)", fontWeight: 600 }}>{st.missingRequirementsText}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL PERFIL DO ALUNO COM TRAJETÓRIA E DISPERSÃO INDIVIDUAL (TC-06) */}
      {selectedStudent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setSelectedStudentId(null)}
        >
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "800px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABEÇALHO DO MODAL */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", borderBottom: "1px solid var(--card-border)", paddingBottom: "14px" }}>
              <div>
                <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--chumbo)", fontWeight: 700 }}>
                  Perfil Individual do Estudante (TC-06)
                </span>
                <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "2px 0 4px", color: "var(--heading-color)" }}>
                  {selectedStudent.studentName}
                </h3>
                <div style={{ display: "flex", gap: "10px", fontSize: "12px", color: "var(--chumbo)" }}>
                  <span>RA: <strong style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{selectedStudent.registration}</strong></span>
                  <span>•</span>
                  <span>{selectedStudent.classGroupLabel}</span>
                  <span>•</span>
                  <span>Média Consolidada: <strong style={{ color: selectedStudent.overallScore >= 60 ? "#059669" : "#DC2626" }}>{selectedStudent.overallScore.toFixed(1)}%</strong></span>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudentId(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "20px",
                  color: "var(--chumbo)",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* CARD DE PRONTIDÃO DO ESTUDANTE */}
            {readinessDistribution && readinessDistribution.isConfigured && (() => {
              const stReadiness = readinessDistribution.students.find((s) => s.studentUserId === selectedStudent.studentUserId);
              if (!stReadiness) return null;
              return (
                <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(2, 132, 199, 0.05)", border: "1px solid rgba(2, 132, 199, 0.15)", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--chumbo)", textTransform: "uppercase" }}>Prontidão Acadêmica:</span>
                    <strong style={{ marginLeft: "8px", color: stReadiness.level === "alto" ? "#059669" : stReadiness.level === "medio" ? "#D97706" : "#DC2626" }}>{stReadiness.levelLabel}</strong>
                    <div style={{ fontSize: "11px", color: "var(--chumbo)", marginTop: "2px" }}>{stReadiness.rulesFulfilledSummary} · {stReadiness.missingRequirementsText}</div>
                  </div>
                </div>
              );
            })()}

            {/* AVISO EXPLÍCITO SOLICITADO PELO DR. FILIPE NO VOTO TC-06 */}
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                background: "rgba(2, 132, 199, 0.08)",
                border: "1px solid rgba(2, 132, 199, 0.25)",
                fontSize: "12px",
                color: "var(--pulso, #0284C7)",
                marginBottom: "18px",
              }}
            >
              <strong>Atenção Metodológica:</strong> Os números exibidos nesta tela representam estritamente a <strong>nota percentual do aluno (0 a 100%)</strong> nas provas somativas institucionais.
            </div>

            {/* 1. NOTAS AO LONGO DO TEMPO VS MÉDIA DA TURMA */}
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 10px", color: "var(--heading-color)" }}>
                1. Evolução nas Avaliações vs. Média da Turma
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {selectedStudent.examTrajectory.map((pt) => {
                  const diff = pt.studentScore - pt.classAverageScore;
                  return (
                    <div
                      key={pt.examId}
                      style={{
                        padding: "10px 14px",
                        background: "var(--input-bg)",
                        borderRadius: "6px",
                        border: "1px solid var(--sinal)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--heading-color)" }}>
                          {pt.examTitle}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--chumbo)" }}>
                          {new Date(pt.date).toLocaleDateString("pt-BR")}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "10px", color: "var(--chumbo)", textTransform: "uppercase" }}>Nota do Aluno</div>
                          <span style={{ fontSize: "14px", fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: pt.studentScore >= 60 ? "#059669" : "#DC2626" }}>
                            {pt.studentScore.toFixed(1)}%
                          </span>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "10px", color: "var(--chumbo)", textTransform: "uppercase" }}>Média Turma</div>
                          <span style={{ fontSize: "13px", fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", color: "var(--heading-color)" }}>
                            {pt.classAverageScore.toFixed(1)}%
                          </span>
                        </div>

                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: diff >= 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            color: diff >= 0 ? "#059669" : "#DC2626",
                          }}
                        >
                          {diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. DISPERSÃO INDIVIDUAL (PONTOS LIGADOS EM ORDEM CRONOLÓGICA) */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h4 style={{ fontSize: "13px", fontWeight: 700, margin: 0, color: "var(--heading-color)" }}>
                  2. Dispersão Individual (Trajetória Cronológica Conectada)
                </h4>
                <span style={{ fontSize: "11px", color: "var(--chumbo)" }}>
                  Pontos ligados em ordem de aplicação (1 → 2 → 3)
                </span>
              </div>

              <div style={{ position: "relative", width: "100%", height: "240px", background: "var(--input-bg)", borderRadius: "8px", border: "1px solid var(--sinal)", overflow: "hidden" }}>
                {/* Linha horizontal no corte 60 */}
                <div style={{ position: "absolute", left: 0, right: 0, top: "40%", borderTop: "2px dashed rgba(220, 38, 38, 0.6)", zIndex: 1 }} />

                <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
                  {/* Linhas conectando os pontos da trajetória */}
                  {selectedStudent.examTrajectory.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="var(--pulso, #0284C7)"
                      strokeWidth="2.5"
                      points={selectedStudent.examTrajectory
                        .map((pt, idx) => {
                          const x = `${(idx / Math.max(1, selectedStudent.examTrajectory.length - 1)) * 80 + 10}%`;
                          const y = `${100 - pt.studentScore * 0.9}%`;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />
                  )}

                  {/* Pontos de cada avaliação */}
                  {selectedStudent.examTrajectory.map((pt, idx) => {
                    const cx = `${(idx / Math.max(1, selectedStudent.examTrajectory.length - 1)) * 80 + 10}%`;
                    const cy = `${100 - pt.studentScore * 0.9}%`;

                    return (
                      <g key={pt.examId}>
                        <circle
                          cx={cx}
                          cy={cy}
                          r="6"
                          fill={pt.studentScore >= 60 ? "#10B981" : "#EF4444"}
                          stroke="#FFFFFF"
                          strokeWidth="2"
                        />
                        <text
                          x={cx}
                          y={cy}
                          dy="-10"
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="700"
                          fill="var(--heading-color)"
                        >
                          {pt.studentScore.toFixed(0)}%
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* 3. RENDIMENTO POR ÁREA DO CONHECIMENTO */}
            <div>
              <h4 style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 10px", color: "var(--heading-color)" }}>
                3. Desempenho Desagregado por Área do Conhecimento
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
                {selectedStudent.areaPerformance.map((ap) => (
                  <div
                    key={ap.areaName}
                    style={{
                      padding: "8px 12px",
                      background: "var(--input-bg)",
                      borderRadius: "6px",
                      border: "1px solid var(--sinal)",
                    }}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--heading-color)", marginBottom: "4px" }}>
                      {ap.areaName}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: ap.studentScore >= 60 ? "#059669" : "#DC2626" }}>
                        {ap.studentScore.toFixed(1)}%
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--chumbo)" }}>
                        Turma: {ap.classAverageScore.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
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
          <span><strong>Base:</strong> {turma.totalStudents} estudantes avaliados na turma {turma.label}</span> •{" "}
          <span><strong>Período:</strong> 2026.1 ({turma.period}º Período)</span> •{" "}
          <span><strong>Fonte:</strong> Provas e simulados aplicados com folhas de resposta e correção online</span>
        </div>
        <div>Régua de corte configurada: <strong>{cutScore}%</strong></div>
      </div>
    </div>
  );
}
