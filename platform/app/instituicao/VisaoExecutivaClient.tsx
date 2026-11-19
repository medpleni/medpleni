"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SCORE_BANDS,
  type ExecutiveKPIsResult,
  type ClassAreaHeatmapRow,
  type ExamTimelineItem,
  type ExecutiveAlertItem,
} from "@/lib/b2b/executive";

interface VisaoExecutivaClientProps {
  institution: {
    id: string;
    name: string;
    initials: string;
    cutScore: number;
  };
  userRole: string;
  availableExams: Array<{
    id: string;
    title: string;
    type: string;
    startsAt: string;
    status: string;
  }>;
  selectedExamId: string;
  kpis: ExecutiveKPIsResult;
  heatmapRows: ClassAreaHeatmapRow[];
  timelineItems: ExamTimelineItem[];
  alerts: ExecutiveAlertItem[];
}

export default function VisaoExecutivaClient({
  institution,
  userRole,
  availableExams,
  selectedExamId,
  kpis,
  heatmapRows,
  timelineItems,
  alerts,
}: VisaoExecutivaClientProps) {
  const router = useRouter();

  // Modal para detalhe sob clique nos KPIs
  const [activeKpiModal, setActiveKpiModal] = useState<string | null>(null);

  // Áreas presentes no heatmap
  const areas = heatmapRows.length > 0 ? heatmapRows[0].areas.map((a) => a.areaName) : [];

  const handleSelectExam = (examId: string) => {
    router.push(`/instituicao?examId=${examId}`);
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "8px 0 40px" }} className="space-y-6">
      {/* ─── BLOCO 1: SELETOR 'PROVA EM ANÁLISE' E IDENTIDADE (EX-01 / EX-02) ─── */}
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: "12px",
          boxShadow: "var(--card-shadow)",
          padding: "20px",
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: "var(--pulso-dim)",
                  color: "var(--pulso)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Painel do {userRole === "dirigente" ? "Dirigente Geral" : "Coordenador de Curso"}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: "var(--input-bg)",
                  border: "1px solid var(--sinal)",
                  color: "var(--chumbo)",
                }}
              >
                {institution.initials}
              </span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--chumbo)" }}>
                Régua de Corte: {institution.cutScore}%
              </span>
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 4px", color: "var(--heading-color)" }}>
              Visão Executiva de Aprendizagem
            </h1>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--chumbo)" }}>
              Acompanhamento central de proficiência acadêmica, matrizes por área e conformidade CPA/NDE.
            </p>
          </div>

          {/* Seletor "Prova em análise" com explicação direta */}
          <div
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--sinal)",
              borderRadius: "10px",
              padding: "12px 14px",
              minWidth: "280px",
            }}
          >
            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--heading-color)", display: "flex", justifyContent: "space-between" }}>
              <span>Prova em análise:</span>
              <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--chumbo)" }}>
                {availableExams.length} avaliação(ões)
              </span>
            </label>

            <select
              value={selectedExamId}
              onChange={(e) => handleSelectExam(e.target.value)}
              style={{
                width: "100%",
                fontSize: "12px",
                borderRadius: "6px",
                border: "1px solid var(--sinal)",
                background: "var(--card-bg)",
                padding: "6px 10px",
                color: "var(--heading-color)",
                marginTop: "6px",
                fontWeight: 500,
                outline: "none",
              }}
            >
              {availableExams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({new Date(ex.startsAt).toLocaleDateString("pt-BR")})
                </option>
              ))}
            </select>

            <div style={{ fontSize: "11px", color: "var(--chumbo)", marginTop: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ color: "var(--pulso)", fontWeight: 700 }}>ℹ</span>
              <span>Todos os números e mapas desta tela referem-se à prova escolhida.</span>
            </div>
          </div>
        </div>

        {/* Atalhos Rápidos para Páginas do Menu */}
        <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--sinal)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", fontSize: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "var(--chumbo)", fontWeight: 500, fontSize: "11px" }}>Navegação rápida:</span>
            <Link
              href="/instituicao/turmas-provas"
              style={{ padding: "4px 10px", borderRadius: "6px", background: "var(--input-bg)", border: "1px solid var(--sinal)", color: "var(--heading-color)", fontWeight: 500, fontSize: "11px", textDecoration: "none" }}
            >
              Matriz Turmas × Provas
            </Link>
            <Link
              href="/instituicao/cobertura-matriz"
              style={{ padding: "4px 10px", borderRadius: "6px", background: "var(--input-bg)", border: "1px solid var(--sinal)", color: "var(--heading-color)", fontWeight: 500, fontSize: "11px", textDecoration: "none" }}
            >
              Cobertura da Matriz
            </Link>
            <Link
              href="/instituicao/relatorios"
              style={{ padding: "4px 10px", borderRadius: "6px", background: "var(--input-bg)", border: "1px solid var(--sinal)", color: "var(--heading-color)", fontWeight: 500, fontSize: "11px", textDecoration: "none" }}
            >
              Relatórios (CPA / NDE / MEC)
            </Link>
          </div>

          <Link
            href={`/instituicao/provas/${selectedExamId}/resultado`}
            style={{ color: "var(--pulso)", fontWeight: 600, fontSize: "12px", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}
          >
            Abrir resultado completo da prova ➔
          </Link>
        </div>
      </div>

      {/* ─── BLOCO 2: CINCO INDICADORES EXECUTIVOS COM CLIQUE E RODAPÉ (EX-03) ─── */}
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: "12px",
          boxShadow: "var(--card-shadow)",
          padding: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--heading-color)", margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Indicadores Globais da Prova em Análise
          </h2>
          <span style={{ fontSize: "11px", color: "var(--chumbo)" }}>Clique em um indicador para detalhes</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Card 1: Nota Média da Instituição */}
          <button
            onClick={() => setActiveKpiModal("media")}
            style={{
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid var(--sinal)",
              background: "var(--input-bg)",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--chumbo)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Nota Média da Instituição
              </div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--heading-color)", marginTop: "4px" }}>
                {kpis.institutionMeanScore}%
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "var(--chumbo)", marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>{kpis.institutionMeanScore >= institution.cutScore ? "✓ Acima da régua 60" : "⚠ Abaixo do corte"}</span>
              <span style={{ color: "var(--pulso)", fontWeight: 700 }}>→</span>
            </div>
          </button>

          {/* Card 2: Alunos Abaixo de 60 */}
          <button
            onClick={() => setActiveKpiModal("abaixo_60")}
            style={{
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              background: "rgba(239, 68, 68, 0.05)",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Alunos Abaixo de 60%
              </div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#DC2626", marginTop: "4px" }}>
                {kpis.studentsBelowCutPercentage}%
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "var(--chumbo)", marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>{kpis.studentsBelowCutCount} de {kpis.totalPresent} presentes</span>
              <span style={{ color: "#DC2626", fontWeight: 700 }}>→</span>
            </div>
          </button>

          {/* Card 3: Participação */}
          <button
            onClick={() => setActiveKpiModal("participacao")}
            style={{
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid var(--sinal)",
              background: "var(--input-bg)",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--chumbo)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Taxa de Participação
              </div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--heading-color)", marginTop: "4px" }}>
                {kpis.participationRate}%
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "var(--chumbo)", marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>{kpis.totalPresent} presentes ({kpis.totalAbsent} ausentes)</span>
              <span style={{ color: "var(--pulso)", fontWeight: 700 }}>→</span>
            </div>
          </button>

          {/* Card 4: Turmas Abaixo de 60 */}
          <button
            onClick={() => setActiveKpiModal("turmas_60")}
            style={{
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              background: "rgba(245, 158, 11, 0.05)",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#D97706", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Turmas Abaixo de 60%
              </div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--heading-color)", marginTop: "4px" }}>
                {kpis.classesBelowCutCount} <span style={{ fontSize: "13px", fontWeight: 400, color: "var(--chumbo)" }}>de {kpis.totalClasses}</span>
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "var(--chumbo)", marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>{kpis.classesBelowCutCount === 0 ? "Nenhuma turma crítica" : "Requer atenção do NDE"}</span>
              <span style={{ color: "#D97706", fontWeight: 700 }}>→</span>
            </div>
          </button>

          {/* Card 5: Zona de Decisão (51–60%) */}
          <button
            onClick={() => setActiveKpiModal("zona_decisao")}
            style={{
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              background: "rgba(245, 158, 11, 0.05)",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#D97706", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Zona de Decisão (51–60%)
              </div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#D97706", marginTop: "4px" }}>
                {kpis.decisionZonePercentage}%
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "var(--chumbo)", marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>{kpis.decisionZoneCount} alunos limítrofes</span>
              <span style={{ color: "#D97706", fontWeight: 700 }}>→</span>
            </div>
          </button>
        </div>

        {/* Rodapé Padronizado Base / Período / Fonte */}
        <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid var(--sinal)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "var(--chumbo)", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <span><strong>Base:</strong> {kpis.footnote.base}</span> • <span><strong>Período:</strong> {kpis.footnote.period}</span> • <span><strong>Fonte:</strong> {kpis.footnote.source}</span>
          </div>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#16A34A" }}>
            ✓ Dados auditados em tempo real
          </span>
        </div>
      </div>

      {/* ─── BLOCO 3: MAPA TURMA × ÁREA COM COLUNA DE MÉDIA FINAL (EX-05) ─── */}
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: "12px",
          boxShadow: "var(--card-shadow)",
          padding: "20px",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--heading-color)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Mapa de Calor: Turmas × Grandes Áreas Médicas
            </h2>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--chumbo)" }}>
              Desempenho por área com a média final da turma em coluna própria. Régua de referência institucional em 60%.
            </p>
          </div>

          {/* Legenda das 4 Faixas Canônicas de Cor */}
          <div className="flex items-center gap-2 flex-wrap text-[10px] font-semibold">
            {Object.values(SCORE_BANDS).map((b) => (
              <span key={b.category} className={`px-2 py-0.5 rounded border ${b.badgeClass}`}>
                {b.label}
              </span>
            ))}
          </div>
        </div>

        {heatmapRows.length > 0 ? (
          <div style={{ border: "1px solid var(--card-border)", borderRadius: "8px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
              <thead style={{ background: "var(--table-header-bg, #F8FAFC)", borderBottom: "1px solid var(--card-border)", color: "var(--heading-color)", fontWeight: 600 }}>
                <tr>
                  <th className="py-2.5 px-3">Turma / Período</th>
                  <th className="py-2.5 px-3 text-center">Alunos</th>
                  <th className="py-2.5 px-3 text-center font-bold" style={{ borderLeft: "1px solid var(--card-border)", borderRight: "1px solid var(--card-border)" }}>
                    Média Final da Turma
                  </th>
                  {areas.map((ar) => (
                    <th key={ar} className="py-2.5 px-3 text-center min-w-[100px]">
                      {ar}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapRows.map((row) => {
                  const finalBand = SCORE_BANDS[row.classScoreBand];

                  return (
                    <tr key={row.classGroupId} style={{ borderBottom: "1px solid var(--card-border)" }}>
                      <td className="py-2.5 px-3">
                        <span style={{ fontWeight: 700, color: "var(--heading-color)", display: "block" }}>{row.classGroupLabel}</span>
                        <span style={{ fontSize: "10px", color: "var(--chumbo)" }}>{row.period}º Período</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono" style={{ color: "var(--chumbo)" }}>
                        {row.totalStudents}
                      </td>

                      {/* Coluna Própria: Média Final da Turma */}
                      <td className="py-2.5 px-3 text-center" style={{ borderLeft: "1px solid var(--card-border)", borderRight: "1px solid var(--card-border)" }}>
                        <span className={`inline-block px-2.5 py-1 rounded font-bold text-xs border ${finalBand.badgeClass}`}>
                          {row.classAverageScore}%
                        </span>
                      </td>

                      {/* Colunas das Áreas Médicas */}
                      {row.areas.map((cell) => {
                        const band = SCORE_BANDS[cell.scoreBand];
                        return (
                          <td key={cell.areaName} className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded font-semibold text-[11px] border ${band.badgeClass}`}
                              title={`${row.classGroupLabel} em ${cell.areaName}: ${cell.averageScore}% (${cell.questionsCount} questões)`}
                            >
                              {cell.averageScore}%
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "32px", textAlign: "center", fontSize: "12px", color: "var(--chumbo)", border: "1px dashed var(--sinal)", borderRadius: "8px" }}>
            Nenhuma turma avaliada na prova selecionada.
          </div>
        )}
      </div>

      {/* ─── BLOCO 4: EVOLUÇÃO TEMPORAL AO LONGO DAS PROVAS COM AVISO (EX-07) ─── */}
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: "12px",
          boxShadow: "var(--card-shadow)",
          padding: "20px",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--heading-color)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Acompanhamento Longitudinal das Provas
            </h2>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--chumbo)" }}>
              Trajetória de desempenho institucional ao longo do calendário acadêmico.
            </p>
          </div>
          <Link
            href="/instituicao/turmas-provas"
            style={{ color: "var(--pulso)", fontWeight: 600, fontSize: "11px", textDecoration: "none" }}
          >
            Ver matriz completa Turmas × Provas ➔
          </Link>
        </div>

        {/* Aviso Metodológico Explícito (EX-07) */}
        <div style={{ padding: "10px 14px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", fontSize: "11px", color: "#B45309", marginBottom: "16px", display: "flex", alignItems: "flex-start", gap: "8px" }}>
          <span>⚠</span>
          <div>
            <strong>Aviso Metodológico de Interpretação:</strong> Avaliações diferentes possuem graus de dificuldade distintos e não utilizam a mesma régua métrica estrita. As variações indicam tendências pedagógicas institucionais, e não deslocamentos lineares diretos.
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {timelineItems.map((item, idx) => (
            <div
              key={item.examId}
              style={{
                padding: "16px",
                borderRadius: "10px",
                border: item.examId === selectedExamId ? "1.5px solid var(--pulso)" : "1px solid var(--sinal)",
                background: item.examId === selectedExamId ? "var(--pulso-dim)" : "var(--input-bg)",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--chumbo)", textTransform: "uppercase" }}>
                  Avaliação {idx + 1}
                </span>
                <span style={{ fontSize: "11px", color: "var(--chumbo)" }}>
                  {item.date ? new Date(item.date).toLocaleDateString("pt-BR") : "Data não definida"}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--heading-color)", marginBottom: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.title}>
                {item.title}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", borderTop: "1px solid var(--sinal)", paddingTop: "8px" }}>
                <div>
                  <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--heading-color)" }}>
                    {item.institutionMeanScore}%
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--chumbo)", display: "block" }}>
                    Média Institucional
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#DC2626" }}>
                    {item.rateBelowCut}%
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--chumbo)", display: "block" }}>
                    % Abaixo de 60
                  </span>
                </div>
              </div>
              <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid var(--sinal)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
                <span style={{ color: "var(--chumbo)" }}>{item.totalEvaluated} alunos</span>
                <button
                  onClick={() => handleSelectExam(item.examId)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--pulso)",
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {item.examId === selectedExamId ? "✓ Em análise" : "Analisar ➔"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── BLOCO 5: ALERTAS PADRÃO (APENAS NOTA ABAIXO DE 60) (EX-08) ─── */}
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: "12px",
          boxShadow: "var(--card-shadow)",
          padding: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <div>
            <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--heading-color)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Painel de Alertas Pedagógicos
            </h2>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--chumbo)" }}>
              Por padrão institucional, são sinalizadas turmas e áreas com rendimento abaixo da régua de 60%.
            </p>
          </div>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--chumbo)" }}>
            {alerts.length} alerta(s) ativo(s)
          </span>
        </div>

        {alerts.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "12px" }}>
            {alerts.map((al) => (
              <div
                key={al.id}
                style={{
                  padding: "14px 16px",
                  borderRadius: "10px",
                  border: al.severity === "critical" ? "1px solid rgba(220, 38, 38, 0.25)" : "1px solid rgba(217, 119, 6, 0.25)",
                  background: al.severity === "critical" ? "rgba(220, 38, 38, 0.05)" : "rgba(217, 119, 6, 0.05)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    background: al.severity === "critical" ? "#DC2626" : "#D97706",
                    color: "#FFFFFF",
                    whiteSpace: "nowrap",
                  }}
                >
                  {al.severity === "critical" ? "Crítico" : "Atenção"}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: 700, fontSize: "13px", color: "var(--heading-color)" }}>
                    <span>{al.title}</span>
                    <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{al.value}%</span>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--chumbo)", lineHeight: 1.5 }}>
                    {al.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "16px", borderRadius: "8px", background: "rgba(22, 163, 74, 0.08)", border: "1px solid rgba(22, 163, 74, 0.25)", color: "#16A34A", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 700 }}>✓</span>
            <span>
              Nenhuma turma ou grande área apresentou média inferior a 60% nesta prova. Todos os indicadores atendem à meta institucional.
            </span>
          </div>
        )}
      </div>

      {/* ─── MODAL DE DETALHAMENTO DE KPI SOB CLIQUE ─── */}
      {activeKpiModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 50 }}>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "12px", maxWidth: "480px", width: "100%", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--card-border)", paddingBottom: "12px", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--heading-color)", margin: 0 }}>
                {activeKpiModal === "media" && "Detalhamento da Nota Média"}
                {activeKpiModal === "abaixo_60" && "Alunos Abaixo do Corte (< 60%)"}
                {activeKpiModal === "participacao" && "Detalhamento de Participação"}
                {activeKpiModal === "turmas_60" && "Turmas Abaixo de 60%"}
                {activeKpiModal === "zona_decisao" && "Alunos na Zona de Decisão (51–60%)"}
              </h3>
              <button
                onClick={() => setActiveKpiModal(null)}
                style={{ background: "none", border: "none", color: "var(--chumbo)", cursor: "pointer", fontSize: "16px", fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: "13px", color: "var(--chumbo)", lineHeight: 1.6, marginBottom: "20px" }}>
              {activeKpiModal === "media" && (
                <p>
                  A média geral da instituição foi calculada considerando todos os <strong>{kpis.totalPresent} estudantes finalizados</strong> na avaliação <em>{kpis.footnote.base}</em>, totalizando <strong>{kpis.institutionMeanScore}%</strong>.
                </p>
              )}
              {activeKpiModal === "abaixo_60" && (
                <p>
                  Total de <strong>{kpis.studentsBelowCutCount} estudantes</strong> ({kpis.studentsBelowCutPercentage}%) obtiveram nota inferior a 60%. Estes alunos foram priorizados para listas de exercícios formativas.
                </p>
              )}
              {activeKpiModal === "participacao" && (
                <p>
                  De <strong>{kpis.totalEnrolled} alunos convocados</strong>, <strong>{kpis.totalPresent}</strong> compareceram e concluíram a avaliação, resultando em uma taxa de adesão de <strong>{kpis.participationRate}%</strong> ({kpis.totalAbsent} ausentes).
                </p>
              )}
              {activeKpiModal === "turmas_60" && (
                <p>
                  <strong>{kpis.classesBelowCutCount} de {kpis.totalClasses} turmas</strong> apresentaram rendimento médio abaixo da nota de corte de 60%, exigindo intervenção direcionada do corpo docente.
                </p>
              )}
              {activeKpiModal === "zona_decisao" && (
                <p>
                  Conforme definição pedagógica do Dr. Filipe, <strong>{kpis.decisionZoneCount} alunos ({kpis.decisionZonePercentage}%)</strong> encontram-se na faixa 51–60%. Estes alunos possuem alto potencial de ascensão para o nível proficiente mediante pequenos reforços dirigidos.
                </p>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--card-border)", paddingTop: "14px" }}>
              <Link
                href={`/instituicao/provas/${selectedExamId}/resultado`}
                style={{ fontSize: "12px", color: "var(--pulso)", fontWeight: 600, textDecoration: "none" }}
              >
                Ver na página da prova ➔
              </Link>
              <button
                onClick={() => setActiveKpiModal(null)}
                style={{
                  padding: "8px 16px",
                  fontSize: "12px",
                  fontWeight: 600,
                  borderRadius: "8px",
                  background: "var(--pulso)",
                  color: "#FFFFFF",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
