"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ReguaEnamedOverview, ReguaStageData } from "@/lib/b2b/regua-enamed";
import { REGUA_ENAMED_CONTENT } from "@/lib/b2b/regua-enamed-content";

interface ReguaEnamedClientProps {
  overview: ReguaEnamedOverview;
  userRole?: string;
}

export function ReguaEnamedClient({ overview, userRole = "coordenador" }: ReguaEnamedClientProps) {
  const [selectedStage, setSelectedStage] = useState<1 | 2 | 3>(1);
  const [showRegulatoryModal, setShowRegulatoryModal] = useState(false);

  const stageData: ReguaStageData = overview.stages[selectedStage];
  const cutScore = overview.cutScore;

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "8px 0 40px" }} className="space-y-6">
      {/* Cabeçalho do Módulo */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          paddingBottom: "16px",
          borderBottom: "1px solid var(--card-border)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: "9999px",
                background: "var(--pulso-dim)",
                color: "var(--pulso)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Módulo Central de Posicionamento Institucional
            </span>
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 4px", color: "var(--heading-color)" }}>
            Régua ENAMED
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--chumbo)", maxWidth: "800px" }}>
            Acompanhamento integrado dos marcos avaliativos do Exame Nacional (4º, 8º e 12º períodos),
            diagnóstico de turmas em preparação, simulados aplicados e intervenções em curso.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => setShowRegulatoryModal(true)}
            style={{
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: 600,
              borderRadius: "8px",
              border: "1px solid var(--card-border)",
              background: "var(--card-bg)",
              color: "var(--heading-color)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "var(--card-shadow)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Marco Regulatório Oficial
          </button>
          <Link
            href="/instituicao/provas/nova"
            style={{
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 600,
              borderRadius: "8px",
              background: "var(--pulso)",
              color: "#FFFFFF",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 4px rgba(0, 194, 168, 0.25)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Montar Simulado ENAMED
          </Link>
        </div>
      </div>

      {/* Régua Visual dos 3 Marcos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
        {([1, 2, 3] as const).map((stageNum) => {
          const stage = overview.stages[stageNum];
          const isSelected = selectedStage === stageNum;
          const avg = stage.overallAveragePercentage;
          const isPassing = avg >= cutScore;

          return (
            <button
              key={stageNum}
              onClick={() => setSelectedStage(stageNum)}
              style={{
                textAlign: "left",
                padding: "20px",
                borderRadius: "12px",
                border: isSelected ? "2px solid var(--pulso)" : "1px solid var(--card-border)",
                background: isSelected ? "var(--pulso-dim)" : "var(--card-bg)",
                boxShadow: "var(--card-shadow)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--pulso)" }}>
                  {stage.regulatory.title}
                </span>
                <span style={{ fontSize: "11px", fontWeight: 500, padding: "2px 8px", borderRadius: "9999px", background: "var(--input-bg)", color: "var(--chumbo)", border: "1px solid var(--sinal)" }}>
                  {stage.periodsIncluded.map((p) => `${p}ºP`).join(", ")}
                </span>
              </div>

              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--heading-color)", marginBottom: "12px" }}>
                {stage.regulatory.stageName}
              </div>

              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: "28px", fontWeight: 800, color: "var(--heading-color)" }}>
                    {avg > 0 ? `${avg}%` : "—"}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--chumbo)", marginLeft: "6px" }}>aproveitamento médio</span>
                </div>
                {avg > 0 && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: "6px",
                      background: isPassing ? "rgba(34, 197, 94, 0.12)" : "rgba(245, 166, 35, 0.12)",
                      color: isPassing ? "#16A34A" : "#D97706",
                    }}
                  >
                    {isPassing ? `≥ ${cutScore}% (meta)` : `< ${cutScore}% (atenção)`}
                  </span>
                )}
              </div>

              {/* Sub-indicadores rápidos */}
              <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--card-border)", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", textAlign: "center" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--heading-color)" }}>{stage.assessments.length}</div>
                  <div style={{ fontSize: "10px", color: "var(--chumbo)" }}>Simulados</div>
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--heading-color)" }}>{stage.classes.length}</div>
                  <div style={{ fontSize: "10px", color: "var(--chumbo)" }}>Turmas</div>
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#D97706" }}>
                    {stage.totalStudentsBelowCutScore}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--chumbo)" }}>&lt; {cutScore}%</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {/* Alerta Institucional da 1ª Etapa (INEP) */}
      {stageData.hasSpecialNotice && stageData.specialNoticeText && (
        <div
          style={{
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            borderRadius: "12px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <div style={{ color: "#D97706", marginTop: "2px", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div style={{ fontSize: "12px", color: "#B45309", lineHeight: 1.6 }}>
            <strong style={{ display: "block", marginBottom: "2px", color: "#92400E" }}>Nota Técnica sobre a Matriz da 1ª Etapa (INEP):</strong>
            {stageData.specialNoticeText}
          </div>
        </div>
      )}

      {/* Grid de 4 KPIs da Etapa Selecionada */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
        {/* KPI 1: Simulados da Etapa */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "16px 20px", boxShadow: "var(--card-shadow)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--chumbo)", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Simulados Aplicados</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--heading-color)" }}>
            {stageData.assessments.length}
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--chumbo)" }}>
            {stageData.assessments.reduce((sum, a) => sum + a.participantsCount, 0)} participações computadas
          </p>
        </div>

        {/* KPI 2: Turmas na Rota */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "16px 20px", boxShadow: "var(--card-shadow)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--chumbo)", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Turmas na Rota</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--heading-color)" }}>
            {stageData.classes.length} turmas
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--chumbo)" }}>
            {stageData.totalStudentsEnrolled} alunos matriculados nos períodos {stageData.periodsIncluded.join(", ")}
          </p>
        </div>

        {/* KPI 3: Alunos em Atenção / Zona de Decisão */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "16px 20px", boxShadow: "var(--card-shadow)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--chumbo)", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Alunos &lt; {cutScore}%</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#D97706" }}>
            {stageData.totalStudentsBelowCutScore}
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--chumbo)" }}>
            {stageData.totalStudentsInDecisionZone} na zona de decisão (51% a {cutScore}%)
          </p>
        </div>

        {/* KPI 4: Intervenções Ativas */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "16px 20px", boxShadow: "var(--card-shadow)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "var(--chumbo)", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Intervenções em Curso</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--pulso)" }}>
            {stageData.interventions.length}
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--chumbo)" }}>
            {stageData.interventions.filter((i) => i.actionType === "exercise_list").length} listas ·{" "}
            {stageData.interventions.filter((i) => i.actionType === "pre_post_lecture").length} pré/pós-aula
          </p>
        </div>
      </div>

      {/* Conteúdo Detalhado da Etapa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Simulados Aplicados e Turmas */}
        <div className="lg:col-span-2 space-y-6">
          {/* Seção 1: Simulados da Etapa */}
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "12px",
              boxShadow: "var(--card-shadow)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--card-border)" }}>
              <div>
                <h2 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 2px", color: "var(--heading-color)" }}>
                  Simulados da {stageData.regulatory.title}
                </h2>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--chumbo)" }}>
                  Provas simuladas de formato oficial aplicadas às turmas preparatórias
                </p>
              </div>
              <Link
                href="/instituicao/provas"
                style={{ fontSize: "12px", color: "var(--pulso)", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                Ver todas as provas
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>

            {stageData.assessments.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", fontSize: "12px", color: "var(--chumbo)" }}>
                Nenhum simulado cadastrado exclusivamente para esta etapa até o momento.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "var(--table-header-bg, #F8FAFC)", borderBottom: "1px solid var(--card-border)" }}>
                      <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>Título do Simulado</th>
                      <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>Modalidade</th>
                      <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>Data</th>
                      <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Participantes</th>
                      <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "right" }}>Aproveitamento Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stageData.assessments.map((a) => {
                      const isPassing = a.averageScorePercentage >= cutScore;
                      return (
                        <tr key={a.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                          <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                            <Link href={`/instituicao/provas/${a.id}/resultado`} style={{ color: "var(--heading-color)", textDecoration: "none" }}>
                              {a.title}
                            </Link>
                          </td>
                          <td style={{ padding: "12px 16px", color: "var(--chumbo)", textTransform: "capitalize" }}>
                            {a.modality.replace("_", " ")}
                          </td>
                          <td style={{ padding: "12px 16px", color: "var(--chumbo)" }}>
                            {a.examDate}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "var(--heading-color)" }}>
                            {a.participantsCount}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 700,
                                background: isPassing ? "rgba(34, 197, 94, 0.12)" : "rgba(245, 166, 35, 0.12)",
                                color: isPassing ? "#16A34A" : "#D97706",
                              }}
                            >
                              {a.averageScorePercentage > 0 ? `${a.averageScorePercentage}%` : "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Seção 2: Turmas Chegando à Etapa */}
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "12px",
              boxShadow: "var(--card-shadow)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--card-border)" }}>
              <div>
                <h2 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 2px", color: "var(--heading-color)" }}>
                  Turmas na Rota de Preparação
                </h2>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--chumbo)" }}>
                  Desempenho consolidado das coortes que prestarão a {stageData.regulatory.title}
                </p>
              </div>
              <Link
                href="/instituicao/turmas"
                style={{ fontSize: "12px", color: "var(--pulso)", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                Gerenciar turmas
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--table-header-bg, #F8FAFC)", borderBottom: "1px solid var(--card-border)" }}>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>Turma</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Período</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Alunos</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Abaixo de {cutScore}%</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Zona Decisão (51–{cutScore}%)</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "right" }}>Média da Turma</th>
                  </tr>
                </thead>
                <tbody>
                  {stageData.classes.map((cls) => {
                    const isPassing = cls.averageScorePercentage >= cutScore;
                    return (
                      <tr key={cls.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                          <Link href={`/instituicao/turmas/${cls.id}`} style={{ color: "var(--heading-color)", textDecoration: "none" }}>
                            {cls.name}
                          </Link>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center", color: "var(--chumbo)" }}>
                          {cls.period}ºP
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center", color: "var(--chumbo)" }}>
                          {cls.studentsCount}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "#D97706" }}>
                          {cls.studentsBelowCutScore}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center", color: "var(--chumbo)" }}>
                          {cls.studentsInDecisionZone}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 700,
                              background: isPassing ? "rgba(34, 197, 94, 0.12)" : "rgba(245, 166, 35, 0.12)",
                              color: isPassing ? "#16A34A" : "#D97706",
                            }}
                          >
                            {cls.averageScorePercentage > 0 ? `${cls.averageScorePercentage}%` : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Coluna 3: Intervenções Ativas & Eixos Temáticos */}
        <div className="space-y-6">
          {/* Intervenções em Curso */}
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "12px",
              boxShadow: "var(--card-shadow)",
              padding: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "var(--heading-color)" }}>Intervenções em Curso</h2>
              <Link
                href="/instituicao/intervencoes"
                style={{ fontSize: "12px", color: "var(--pulso)", fontWeight: 600, textDecoration: "none" }}
              >
                Ver todas
              </Link>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: "12px", color: "var(--chumbo)" }}>
              Ações corretivas de nivelamento ativas para as turmas desta etapa
            </p>

            {stageData.interventions.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", fontSize: "12px", color: "var(--chumbo)", border: "1px dashed var(--sinal)", borderRadius: "8px" }}>
                Nenhuma intervenção ativa para as turmas desta etapa.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {stageData.interventions.map((inv) => (
                  <div key={inv.id} style={{ padding: "12px", border: "1px solid var(--card-border)", borderRadius: "8px", background: "var(--input-bg)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--heading-color)" }}>
                        {inv.title}
                      </span>
                      <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", padding: "2px 6px", borderRadius: "4px", background: "var(--pulso-dim)", color: "var(--pulso)" }}>
                        {inv.actionType === "exercise_list" ? "Lista" : "Pré/Pós"}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--chumbo)", marginBottom: "8px" }}>
                      {inv.classGroupName}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                      <span style={{ color: "var(--chumbo)" }}>Adesão:</span>
                      <span style={{ fontWeight: 700, color: "var(--heading-color)" }}>{inv.adherencePercentage}%</span>
                    </div>
                    <div style={{ width: "100%", background: "var(--sinal)", borderRadius: "9999px", height: "6px", overflow: "hidden" }}>
                      <div
                        style={{
                          background: "var(--pulso)",
                          height: "6px",
                          borderRadius: "9999px",
                          width: `${Math.min(100, inv.adherencePercentage)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Eixos Prioritários da Etapa */}
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "12px",
              boxShadow: "var(--card-shadow)",
              padding: "20px",
            }}
          >
            <h2 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 2px", color: "var(--heading-color)" }}>Eixos Estruturantes</h2>
            <p style={{ margin: "0 0 14px", fontSize: "12px", color: "var(--chumbo)" }}>
              Grandes áreas de foco formativo para a {stageData.regulatory.title}
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
              {stageData.regulatory.focusAreas.map((area, idx) => (
                <li key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--heading-color)" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "9999px", background: "var(--pulso)", flexShrink: 0 }} />
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Rodapé Padronizado Base / Período / Fonte */}
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: "12px",
          padding: "14px 18px",
          fontSize: "11px",
          color: "var(--chumbo)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
          <span>{stageData.footerMetadata.baseText}</span>
          <span>·</span>
          <span>{stageData.footerMetadata.periodText}</span>
          <span>·</span>
          <span>{stageData.footerMetadata.sourceText}</span>
        </div>
        <div>
          Régua de corte configurada: <strong style={{ color: "var(--pulso)" }}>{cutScore}%</strong>
        </div>
      </div>

      {/* Modal de Marco Regulatório Oficial */}
      {showRegulatoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">Marco Regulatório do ENAMED</h3>
                <p className="text-xs text-muted-foreground">
                  Informações regulatórias e normativas oficiais por etapa
                </p>
              </div>
              <button
                onClick={() => setShowRegulatoryModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Aviso Obrigatório: Conteúdo a preencher pelo Mario */}
            <div className="bg-muted/50 border border-border rounded-lg p-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Nota de Governança Institucional:</span> Os dados
              normativos e marcos legais abaixo devem ser revisados e validados pelo coordenador geral de produto
              (Mario Lopes) com base nas fontes e editais oficiais do INEP e MEC.
            </div>

            {/* Tabela do Marco Geral */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                Diretrizes Gerais do Exame
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded border border-border bg-muted/20">
                  <div className="text-[10px] text-muted-foreground">Lei Federal de Criação</div>
                  <div className="font-mono text-xs text-foreground mt-0.5">
                    {REGUA_ENAMED_CONTENT.generalFramework.governingLaw}
                  </div>
                </div>
                <div className="p-2.5 rounded border border-border bg-muted/20">
                  <div className="text-[10px] text-muted-foreground">Portaria Normativa MEC/INEP</div>
                  <div className="font-mono text-xs text-foreground mt-0.5">
                    {REGUA_ENAMED_CONTENT.generalFramework.decreeOrdinance}
                  </div>
                </div>
              </div>
            </div>

            {/* Parâmetros Específicos por Etapa */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                Parâmetros Específicos da {stageData.regulatory.title}
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2.5 rounded border border-border bg-muted/10">
                  <span className="text-muted-foreground">Edital INEP Específico:</span>
                  <span className="font-mono text-foreground">
                    {stageData.regulatory.officialFramework.inepNotice}
                  </span>
                </div>
                <div className="flex justify-between p-2.5 rounded border border-border bg-muted/10">
                  <span className="text-muted-foreground">Data de Publicação / Vigência:</span>
                  <span className="font-mono text-foreground">
                    {stageData.regulatory.officialFramework.publicationDate}
                  </span>
                </div>
                <div className="flex justify-between p-2.5 rounded border border-border bg-muted/10">
                  <span className="text-muted-foreground">Peso no Escore Final:</span>
                  <span className="font-mono text-foreground">
                    {stageData.regulatory.officialFramework.stageWeight}
                  </span>
                </div>
                <div className="flex justify-between p-2.5 rounded border border-border bg-muted/10">
                  <span className="text-muted-foreground">Linha de Corte da Plataforma:</span>
                  <span className="font-semibold text-foreground">
                    {stageData.regulatory.officialFramework.minimumThreshold}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                onClick={() => setShowRegulatoryModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition"
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
