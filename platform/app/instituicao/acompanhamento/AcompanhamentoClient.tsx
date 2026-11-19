"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  type AlertConfig,
  type AttentionStudentItem,
  type ClassAggregatedAlert,
  type WeeklyGoalStudentRow,
  type SummaryTextGenerationParams,
  calculateAttentionList,
  aggregateClassAlerts,
  getDecisionZoneStudents,
  calculateWeeklyGoalGrid,
  generateWeeklySummaryText,
} from "@/lib/b2b/monitoring";
import {
  toggleAlertTreatmentAction,
  updateAlertConfigAction,
} from "@/lib/b2b/monitoring-actions";
import { IndicatorFootnote } from "@/components/b2b";
import type { ClassifiedSession, AtypicalDetectionConfig } from "@/lib/b2b/atypical";
import { DEFAULT_ATYPICAL_CONFIG } from "@/lib/b2b/atypical";
import AtypicalSessionsView from "./AtypicalSessionsView";

interface RawStudentInput {
  studentUserId: string;
  studentName: string;
  registration: string;
  classGroupId: string;
  classGroupLabel: string;
  averageScore: number;
  daysWithoutAccess: number;
  paceDropPercentage: number;
  hasPendingExam: boolean;
  totalQuestions: number;
  weeklyAnswers: number[];
  isTreated?: boolean;
  notes?: string;
}

interface AcompanhamentoClientProps {
  institution: {
    id: string;
    name: string;
    cutScore: number;
  };
  userRole: string;
  initialConfig: AlertConfig;
  students: RawStudentInput[];
  classes: Array<{ id: string; label: string; period: number }>;
  summaryParams: SummaryTextGenerationParams;
  examsList: Array<{ id: string; title: string; date: string }>;
  atypicalSessions?: ClassifiedSession[];
  atypicalConfig?: AtypicalDetectionConfig;
}

export default function AcompanhamentoClient({
  institution,
  userRole,
  initialConfig,
  students,
  classes,
  summaryParams,
  examsList,
  atypicalSessions = [],
  atypicalConfig = DEFAULT_ATYPICAL_CONFIG,
}: AcompanhamentoClientProps) {
  const [activeTab, setActiveTab] = useState<
    "atencao" | "zona_decisao" | "alertas_config" | "meta_semanal" | "resumo_semana" | "sessoes_atipicas"
  >("atencao");
  const [config, setConfig] = useState<AlertConfig>(initialConfig);
  const [isPending, startTransition] = useTransition();

  // Tratamentos locais com feedback otimista
  const [treatedMap, setTreatedMap] = useState<Record<string, { isTreated: boolean; notes?: string }>>(() => {
    const map: Record<string, { isTreated: boolean; notes?: string }> = {};
    students.forEach((s) => {
      if (s.isTreated !== undefined) {
        map[s.studentUserId] = { isTreated: s.isTreated, notes: s.notes };
      }
    });
    return map;
  });

  // Modal de anotação
  const [annotationModalStudent, setAnnotationModalStudent] = useState<AttentionStudentItem | null>(null);
  const [annotationText, setAnnotationText] = useState("");

  // Filtro de turma na Zona de Decisão
  const [decisionClassFilter, setDecisionClassFilter] = useState<string>("all");

  // Meta semanal ligada/desligada
  const [isWeeklyGoalEnabled, setIsWeeklyGoalEnabled] = useState(false);
  const [weeklyGoalTarget, setWeeklyGoalTarget] = useState(50);

  // Resumo da semana
  const [includeNamesInSummary, setIncludeNamesInSummary] = useState(false);
  const [summaryMode, setSummaryMode] = useState<"semana" | "prova">("semana");
  const [selectedExamIdForSummary, setSelectedExamIdForSummary] = useState<string>(examsList[0]?.id || "");
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Prepara estudantes com tratamentos locais
  const studentsWithTreatments = students.map((s) => ({
    ...s,
    isTreated: treatedMap[s.studentUserId]?.isTreated ?? s.isTreated ?? false,
    notes: treatedMap[s.studentUserId]?.notes ?? s.notes,
  }));

  // 1. Quem precisa de você agora
  const rawAttentionList = calculateAttentionList({
    students: studentsWithTreatments,
    config,
    cutScore: institution.cutScore,
  });

  const classTotalStudentsMap = new Map<string, number>();
  classes.forEach((c) => {
    const count = students.filter((s) => s.classGroupId === c.id).length;
    classTotalStudentsMap.set(c.id, count || 20);
  });

  const { classAlerts, individualAttentionList } = aggregateClassAlerts({
    attentionList: rawAttentionList,
    classTotalStudents: classTotalStudentsMap,
    thresholdPct: 50,
  });

  // 2. Zona de Decisão
  const decisionZoneStudents = getDecisionZoneStudents(students, decisionClassFilter);

  // 3. Meta semanal
  const weeklyGrid = calculateWeeklyGoalGrid({
    students: students.map((s) => ({
      studentUserId: s.studentUserId,
      studentName: s.studentName,
      registration: s.registration,
      classGroupLabel: s.classGroupLabel,
      weeklyAnswers: s.weeklyAnswers || [40, 50, 30, 60],
    })),
    weeklyTarget: weeklyGoalTarget,
  });

  // 4. Texto do Resumo
  const currentExam = examsList.find((e) => e.id === selectedExamIdForSummary);
  const summaryText = generateWeeklySummaryText({
    ...summaryParams,
    includeStudentNames: includeNamesInSummary,
    isExamSpecific: summaryMode === "prova",
    examTitle: currentExam?.title,
  });

  // Ações
  const handleToggleTreatment = (student: AttentionStudentItem) => {
    const nextState = !student.isTreated;
    setTreatedMap((prev) => ({
      ...prev,
      [student.studentUserId]: { isTreated: nextState, notes: prev[student.studentUserId]?.notes },
    }));

    startTransition(async () => {
      await toggleAlertTreatmentAction({
        studentUserId: student.studentUserId,
        alertKey: student.reasons[0]?.key || "nota_abaixo_60",
        isTreated: nextState,
        notes: student.notes,
      });
    });
  };

  const handleSaveAnnotation = () => {
    if (!annotationModalStudent) return;
    const uid = annotationModalStudent.studentUserId;
    setTreatedMap((prev) => ({
      ...prev,
      [uid]: { isTreated: prev[uid]?.isTreated ?? true, notes: annotationText },
    }));

    startTransition(async () => {
      await toggleAlertTreatmentAction({
        studentUserId: uid,
        alertKey: annotationModalStudent.reasons[0]?.key || "nota_abaixo_60",
        isTreated: true,
        notes: annotationText,
      });
    });

    setAnnotationModalStudent(null);
  };

  const handleSaveConfig = () => {
    startTransition(async () => {
      await updateAlertConfigAction({ config });
    });
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summaryText);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "8px 0 40px" }}>
      {/* CABEÇALHO */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <Link href="/instituicao" style={{ fontSize: "12px", color: "var(--chumbo)", textDecoration: "none" }}>
                ← Visão Executiva
              </Link>
              <span style={{ fontSize: "12px", color: "var(--sinal)" }}>/</span>
              <span style={{ fontSize: "12px", color: "var(--texto-secundario)" }}>Acompanhamento</span>
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 4px", color: "var(--heading-color)" }}>
              Central de Acompanhamento Acadêmico
            </h1>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--chumbo)" }}>
              Acompanhamento contínuo da coorte, priorização discente, gestão de alertas configuráveis e alinhamento pedagógico.
            </p>
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
            Régua Institucional: {institution.cutScore}%
          </div>
        </div>
      </div>

      {/* ABAS DO MÓDULO DE ACOMPANHAMENTO */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--card-border)",
          marginBottom: "20px",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setActiveTab("atencao")}
          style={{
            padding: "10px 4px",
            fontSize: "13px",
            fontWeight: activeTab === "atencao" ? 700 : 500,
            color: activeTab === "atencao" ? "var(--pulso, #0284C7)" : "var(--chumbo)",
            borderBottom: activeTab === "atencao" ? "2px solid var(--pulso, #0284C7)" : "2px solid transparent",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>Quem Precisa de Você Agora</span>
          <span
            style={{
              padding: "1px 6px",
              borderRadius: "10px",
              fontSize: "11px",
              fontWeight: 700,
              background: individualAttentionList.length > 0 ? "rgba(239, 68, 68, 0.15)" : "var(--input-bg)",
              color: individualAttentionList.length > 0 ? "#DC2626" : "var(--chumbo)",
            }}
          >
            {individualAttentionList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("zona_decisao")}
          style={{
            padding: "10px 4px",
            fontSize: "13px",
            fontWeight: activeTab === "zona_decisao" ? 700 : 500,
            color: activeTab === "zona_decisao" ? "var(--pulso, #0284C7)" : "var(--chumbo)",
            borderBottom: activeTab === "zona_decisao" ? "2px solid var(--pulso, #0284C7)" : "2px solid transparent",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>Zona de Decisão (51–60%)</span>
          <span
            style={{
              padding: "1px 6px",
              borderRadius: "10px",
              fontSize: "11px",
              fontWeight: 700,
              background: "rgba(245, 158, 11, 0.15)",
              color: "#B45309",
            }}
          >
            {decisionZoneStudents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("meta_semanal")}
          style={{
            padding: "10px 4px",
            fontSize: "13px",
            fontWeight: activeTab === "meta_semanal" ? 700 : 500,
            color: activeTab === "meta_semanal" ? "var(--pulso, #0284C7)" : "var(--chumbo)",
            borderBottom: activeTab === "meta_semanal" ? "2px solid var(--pulso, #0284C7)" : "2px solid transparent",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          Meta Semanal de Questões
        </button>

        <button
          onClick={() => setActiveTab("resumo_semana")}
          style={{
            padding: "10px 4px",
            fontSize: "13px",
            fontWeight: activeTab === "resumo_semana" ? 700 : 500,
            color: activeTab === "resumo_semana" ? "var(--pulso, #0284C7)" : "var(--chumbo)",
            borderBottom: activeTab === "resumo_semana" ? "2px solid var(--pulso, #0284C7)" : "2px solid transparent",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          Resumo da Semana & Prova
        </button>

        <button
          onClick={() => setActiveTab("alertas_config")}
          style={{
            padding: "10px 4px",
            fontSize: "13px",
            fontWeight: activeTab === "alertas_config" ? 700 : 500,
            color: activeTab === "alertas_config" ? "var(--pulso, #0284C7)" : "var(--chumbo)",
            borderBottom: activeTab === "alertas_config" ? "2px solid var(--pulso, #0284C7)" : "2px solid transparent",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          Configuração de Alertas
        </button>

        {(userRole === "dirigente" || userRole === "coordenador") && (
          <button
            onClick={() => setActiveTab("sessoes_atipicas")}
            style={{
              padding: "10px 4px",
              fontSize: "13px",
              fontWeight: activeTab === "sessoes_atipicas" ? 700 : 500,
              color: activeTab === "sessoes_atipicas" ? "var(--pulso, #0284C7)" : "var(--chumbo)",
              borderBottom: activeTab === "sessoes_atipicas" ? "2px solid var(--pulso, #0284C7)" : "2px solid transparent",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            Sessões Atípicas {atypicalSessions.length > 0 ? `(${atypicalSessions.length})` : ""}
          </button>
        )}
      </div>

      {/* ── ABA 1: QUEM PRECISA DE VOCÊ AGORA (VOTO SPR Nº 1) ── */}
      {activeTab === "atencao" && (
        <div>
          {/* REGRA DE ORDENAÇÃO EXPLICADA NA TELA */}
          <div
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              background: "var(--input-bg)",
              border: "1px solid var(--sinal)",
              marginBottom: "16px",
              fontSize: "12px",
              color: "var(--chumbo)",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: "var(--heading-color)" }}>Critério de Priorização: </strong>
            1º Severidade do motivo (Nota &lt; 60% &gt; Zona de Decisão 51–60% &gt; Sem acesso há N dias &gt; Queda de ritmo &gt; Simulado pendente) · 2º Menor nota média · 3º Mais dias sem login. Alertas marcados como &quot;tratado&quot; são movidos para o fim da fila.
          </div>

          {/* ALERTAS COLETIVOS DE TURMA (SE ≥ 50% AFETADOS - VOTO SPR Nº 2) */}
          {classAlerts.length > 0 && (
            <div style={{ marginBottom: "18px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--chumbo)", marginBottom: "8px" }}>
                Alertas Coletivos de Turma (Atingem mais de 50% dos discentes)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "10px" }}>
                {classAlerts.map((ca) => (
                  <div
                    key={`${ca.classGroupId}_${ca.alertKey}`}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "8px",
                      background: "rgba(245, 158, 11, 0.08)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "13px", color: "#B45309", marginBottom: "2px" }}>
                        {ca.title} — {ca.classGroupLabel}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--chumbo)" }}>
                        {ca.description}
                      </div>
                    </div>
                    <Link
                      href={`/instituicao/turmas/${ca.classGroupId}`}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "5px",
                        background: "var(--card-bg)",
                        border: "1px solid var(--sinal)",
                        color: "var(--heading-color)",
                        fontSize: "11px",
                        fontWeight: 600,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        marginLeft: "12px",
                      }}
                    >
                      Ver Turma ↗
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LISTA PRIORIZADA DE ALUNOS INDIVIDUAIS */}
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "10px",
              overflow: "hidden",
              boxShadow: "var(--card-shadow)",
              marginBottom: "20px",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--table-header-bg, #F8FAFC)", borderBottom: "1px solid var(--card-border)" }}>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", width: "60px" }}>Prioridade</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>Estudante / RA</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>Turma</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Nota Média</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>Motivo do Alerta</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Status</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "right" }}>Ações Pedagógicas</th>
                  </tr>
                </thead>
                <tbody>
                  {individualAttentionList.map((st, idx) => {
                    return (
                      <tr
                        key={st.studentUserId}
                        style={{
                          borderBottom: "1px solid var(--card-border)",
                          background: st.isTreated ? "rgba(100, 116, 139, 0.04)" : "transparent",
                          opacity: st.isTreated ? 0.75 : 1,
                        }}
                      >
                        <td style={{ padding: "12px 16px", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: st.isTreated ? "var(--chumbo)" : "var(--heading-color)" }}>
                          #{idx + 1}
                        </td>

                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 600, color: "var(--heading-color)", fontSize: "13px" }}>
                            {st.studentName}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--chumbo)", fontFamily: "'IBM Plex Mono', monospace" }}>
                            {st.registration}
                          </div>
                        </td>

                        <td style={{ padding: "12px 16px", color: "var(--heading-color)" }}>
                          {st.classGroupLabel}
                        </td>

                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <span
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontWeight: 700,
                              fontSize: "12px",
                              color: st.averageScore >= 60 ? "#059669" : "#DC2626",
                            }}
                          >
                            {st.averageScore.toFixed(1)}%
                          </span>
                        </td>

                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {st.reasons.map((r) => {
                              const isCrit = r.severity === "critical";
                              const isWarn = r.severity === "warning";
                              return (
                                <span
                                  key={r.key}
                                  title={r.detail}
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 8px",
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    background: isCrit
                                      ? "rgba(239, 68, 68, 0.12)"
                                      : isWarn
                                      ? "rgba(245, 158, 11, 0.12)"
                                      : "rgba(2, 132, 199, 0.12)",
                                    color: isCrit ? "#DC2626" : isWarn ? "#B45309" : "#0284C7",
                                    border: `1px solid ${isCrit ? "rgba(239, 68, 68, 0.3)" : isWarn ? "rgba(245, 158, 11, 0.3)" : "rgba(2, 132, 199, 0.3)"}`,
                                  }}
                                >
                                  {r.label}
                                </span>
                              );
                            })}
                          </div>
                          {st.notes && (
                            <div style={{ marginTop: "4px", fontSize: "11px", color: "var(--chumbo)", fontStyle: "italic" }}>
                              📝 &quot;{st.notes}&quot;
                            </div>
                          )}
                        </td>

                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <button
                            onClick={() => handleToggleTreatment(st)}
                            disabled={isPending}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: "pointer",
                              border: "1px solid",
                              borderColor: st.isTreated ? "rgba(16, 185, 129, 0.4)" : "var(--sinal)",
                              background: st.isTreated ? "rgba(16, 185, 129, 0.1)" : "var(--input-bg)",
                              color: st.isTreated ? "#059669" : "var(--chumbo)",
                            }}
                          >
                            {st.isTreated ? "Tratado ✓" : "Pendente"}
                          </button>
                        </td>

                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button
                              onClick={() => {
                                setAnnotationModalStudent(st);
                                setAnnotationText(st.notes || "");
                              }}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "4px",
                                background: "var(--input-bg)",
                                border: "1px solid var(--sinal)",
                                color: "var(--heading-color)",
                                fontSize: "11px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                              title="Registrar anotação pedagógica do aluno"
                            >
                              Anotação
                            </button>
                            <Link
                              href={`/instituicao/intervencoes?new=true&studentId=${st.studentUserId}`}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "4px",
                                background: "var(--pulso, #0284C7)",
                                color: "#FFFFFF",
                                fontSize: "11px",
                                fontWeight: 600,
                                textDecoration: "none",
                              }}
                            >
                              Intervenção ↗
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <IndicatorFootnote
            base="Todos os estudantes com alertas ativos na instituição"
            periodo="Semestre 2027.1"
            fonte="Tentativas B2B e Telemetria de Sessão"
          />
        </div>
      )}

      {/* ── ABA 2: ZONA DE DECISÃO (51 A 60%) (EX-04 / DR. FILIPE) ── */}
      {activeTab === "zona_decisao" && (
        <div>
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "10px",
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              boxShadow: "var(--card-shadow)",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 4px", color: "var(--heading-color)" }}>
                Alunos na Zona de Decisão (51% a 60%)
              </h2>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--chumbo)" }}>
                Estudantes muito próximos do corte institucional. Esta faixa representa a maior alavancagem para planos de exercícios e nivelamento somativo pré-ENAMED.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <select
                value={decisionClassFilter}
                onChange={(e) => setDecisionClassFilter(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--sinal)",
                  background: "var(--input-bg)",
                  fontSize: "12px",
                  color: "var(--heading-color)",
                }}
              >
                <option value="all">Todas as turmas ({students.filter((s) => s.averageScore >= 51 && s.averageScore <= 60).length} alunos)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.period}ºP — {c.label}
                  </option>
                ))}
              </select>

              <Link
                href={`/instituicao/intervencoes?new=true&target=zona_decisao&classGroupId=${decisionClassFilter}`}
                style={{
                  padding: "7px 14px",
                  borderRadius: "6px",
                  background: "var(--pulso, #0284C7)",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                + Criar Intervenção para o Grupo ↗
              </Link>
            </div>
          </div>

          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "10px",
              overflow: "hidden",
              boxShadow: "var(--card-shadow)",
              marginBottom: "20px",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "var(--table-header-bg, #F8FAFC)", borderBottom: "1px solid var(--card-border)" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>Estudante</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>RA</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>Turma / Período</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Nota Atual</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Distância do Corte (60%)</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Treino B2C</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "right" }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {decisionZoneStudents.map((st) => {
                  const dist = (institution.cutScore - st.averageScore).toFixed(1);
                  return (
                    <tr key={st.studentUserId} style={{ borderBottom: "1px solid var(--card-border)" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>
                        {st.studentName}
                      </td>

                      <td style={{ padding: "12px 16px", fontFamily: "'IBM Plex Mono', monospace", color: "var(--chumbo)" }}>
                        {st.registration}
                      </td>

                      <td style={{ padding: "12px 16px", color: "var(--heading-color)" }}>
                        {st.classGroupLabel}
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: "#D97706" }}>
                          {st.averageScore.toFixed(1)}%
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            background: "rgba(245, 158, 11, 0.12)",
                            color: "#B45309",
                          }}
                        >
                          Faltam {dist}%
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "center", fontFamily: "'IBM Plex Mono', monospace" }}>
                        {st.totalQuestions > 0 ? `${st.totalQuestions} questões` : "0 (sem treino)"}
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <Link
                          href={`/instituicao/intervencoes?new=true&studentId=${st.studentUserId}`}
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
                          Nivelar ↗
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <IndicatorFootnote
            base="Estudantes com nota média entre 51% e 60% nas avaliações do período"
            periodo="Semestre 2027.1"
            fonte="Avaliações Somativas MedPleni B2B"
          />
        </div>
      )}

      {/* ── ABA 3: CONFIGURAÇÃO DE ALERTAS (VOTO SPR Nº 2) ── */}
      {activeTab === "alertas_config" && (
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: "10px",
            padding: "24px",
            boxShadow: "var(--card-shadow)",
            maxWidth: "800px",
            marginBottom: "20px",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 6px", color: "var(--heading-color)" }}>
              Parâmetros e Sensibilidade de Alertas (SPR nº 2)
            </h2>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--chumbo)", lineHeight: 1.5 }}>
              Os alertas de engajamento vêm desligados por padrão para preservar o foco pedagógico. O dirigente e o coordenador podem ligar ou ajustar os limites de acordo com a política acadêmica da instituição.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
            {/* 1. NOTA ABAIXO DE 60 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--input-bg)", borderRadius: "8px", border: "1px solid var(--sinal)" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--heading-color)" }}>
                  Nota abaixo do corte (&lt; 60%)
                </div>
                <div style={{ fontSize: "12px", color: "var(--chumbo)" }}>
                  Sinaliza rendimento crítico inferior à Régua 60 institucional.
                </div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669", background: "rgba(16, 185, 129, 0.1)", padding: "3px 8px", borderRadius: "4px" }}>
                Sempre Ativo ✓
              </span>
            </div>

            {/* 2. ZONA DE DECISÃO */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--input-bg)", borderRadius: "8px", border: "1px solid var(--sinal)" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--heading-color)" }}>
                  Zona de decisão (51% a 60%)
                </div>
                <div style={{ fontSize: "12px", color: "var(--chumbo)" }}>
                  Sinaliza alunos com alto potencial de alavancagem para cruzamento do corte.
                </div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669", background: "rgba(16, 185, 129, 0.1)", padding: "3px 8px", borderRadius: "4px" }}>
                Sempre Ativo ✓
              </span>
            </div>

            {/* 3. SEM LOGIN / ACESSO */}
            <div style={{ padding: "14px 16px", background: "var(--input-bg)", borderRadius: "8px", border: "1px solid var(--sinal)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--heading-color)" }}>
                    Alerta de Inatividade / Sem Login
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--chumbo)" }}>
                    Sinaliza alunos sem acesso à plataforma há N dias corridos.
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={config.no_login}
                    onChange={(e) => setConfig({ ...config, no_login: e.target.checked })}
                  />
                  {config.no_login ? "Ligado" : "Desligado"}
                </label>
              </div>

              {config.no_login && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--sinal)" }}>
                  <span style={{ fontSize: "12px", color: "var(--heading-color)" }}>Limite de dias sem acesso:</span>
                  <input
                    type="number"
                    min="3"
                    max="30"
                    value={config.no_login_days}
                    onChange={(e) => setConfig({ ...config, no_login_days: Number(e.target.value) || 7 })}
                    style={{
                      width: "60px",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "1px solid var(--sinal)",
                      background: "var(--card-bg)",
                      fontSize: "12px",
                      textAlign: "center",
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  />
                  <span style={{ fontSize: "12px", color: "var(--chumbo)" }}>dias</span>
                </div>
              )}
            </div>

            {/* 4. QUEDA DE RITMO */}
            <div style={{ padding: "14px 16px", background: "var(--input-bg)", borderRadius: "8px", border: "1px solid var(--sinal)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--heading-color)" }}>
                    Alerta de Queda de Ritmo de Treino
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--chumbo)" }}>
                    Sinaliza redução expressiva no volume de questões respondidas em relação à semana anterior.
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={config.pace_drop}
                    onChange={(e) => setConfig({ ...config, pace_drop: e.target.checked })}
                  />
                  {config.pace_drop ? "Ligado" : "Desligado"}
                </label>
              </div>

              {config.pace_drop && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--sinal)" }}>
                  <span style={{ fontSize: "12px", color: "var(--heading-color)" }}>Queda percentual mínima:</span>
                  <input
                    type="number"
                    min="15"
                    max="80"
                    step="5"
                    value={config.pace_drop_pct}
                    onChange={(e) => setConfig({ ...config, pace_drop_pct: Number(e.target.value) || 30 })}
                    style={{
                      width: "60px",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "1px solid var(--sinal)",
                      background: "var(--card-bg)",
                      fontSize: "12px",
                      textAlign: "center",
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  />
                  <span style={{ fontSize: "12px", color: "var(--chumbo)" }}>% de redução</span>
                </div>
              )}
            </div>

            {/* 5. SIMULADO PENDENTE */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "var(--input-bg)", borderRadius: "8px", border: "1px solid var(--sinal)" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--heading-color)" }}>
                  Simulado Somativo Pendente
                </div>
                <div style={{ fontSize: "12px", color: "var(--chumbo)" }}>
                  Sinaliza alunos que ainda não iniciaram a prova dentro da janela de aplicação.
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={config.pending_exam}
                  onChange={(e) => setConfig({ ...config, pending_exam: e.target.checked })}
                />
                {config.pending_exam ? "Ligado" : "Desligado"}
              </label>
            </div>
          </div>

          <button
            onClick={handleSaveConfig}
            disabled={isPending}
            style={{
              padding: "9px 20px",
              borderRadius: "6px",
              background: "var(--pulso, #0284C7)",
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            {isPending ? "Salvando..." : "Salvar Configuração de Alertas"}
          </button>
        </div>
      )}

      {/* ── ABA 4: META SEMANAL DE QUESTÕES (VOTO SPR Nº 4) ── */}
      {activeTab === "meta_semanal" && (
        <div>
          {/* BARRA DE ATIVAÇÃO DA META */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "10px",
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              boxShadow: "var(--card-shadow)",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 4px", color: "var(--heading-color)" }}>
                Acompanhamento de Meta Semanal de Questões (Voto SPR nº 4)
              </h2>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--chumbo)" }}>
                Monitora a regularidade de resolução de questões pelos alunos. Vem desligada por padrão conforme deliberação médica.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {isWeeklyGoalEnabled && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "12px", color: "var(--chumbo)" }}>Meta:</span>
                  <input
                    type="number"
                    min="10"
                    max="200"
                    step="10"
                    value={weeklyGoalTarget}
                    onChange={(e) => setWeeklyGoalTarget(Number(e.target.value) || 50)}
                    style={{
                      width: "60px",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "1px solid var(--sinal)",
                      background: "var(--input-bg)",
                      fontSize: "12px",
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  />
                  <span style={{ fontSize: "12px", color: "var(--chumbo)" }}>questões/sem</span>
                </div>
              )}

              <button
                onClick={() => setIsWeeklyGoalEnabled(!isWeeklyGoalEnabled)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "6px",
                  border: "1px solid",
                  borderColor: isWeeklyGoalEnabled ? "#DC2626" : "var(--pulso, #0284C7)",
                  background: isWeeklyGoalEnabled ? "rgba(239, 68, 68, 0.1)" : "var(--pulso, #0284C7)",
                  color: isWeeklyGoalEnabled ? "#DC2626" : "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {isWeeklyGoalEnabled ? "Desativar Meta Semanal" : "Ativar Meta Semanal"}
              </button>
            </div>
          </div>

          {!isWeeklyGoalEnabled ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "10px",
                color: "var(--chumbo)",
              }}
            >
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>🎯</div>
              <div style={{ fontWeight: 600, color: "var(--heading-color)", marginBottom: "4px" }}>
                Acompanhamento de Meta Semanal Desativado
              </div>
              <p style={{ margin: "0 auto 16px", maxWidth: "460px", fontSize: "12px" }}>
                Conforme deliberação dos médicos decisores, este módulo inicia desligado. Ao ativar, você verá a grade Aluno × Semana e o ranking de reincidência por semanas consecutivas sem cumprir.
              </p>
              <button
                onClick={() => setIsWeeklyGoalEnabled(true)}
                style={{
                  padding: "8px 18px",
                  borderRadius: "6px",
                  background: "var(--pulso, #0284C7)",
                  color: "#FFFFFF",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Ativar Agora (50 questões/semana)
              </button>
            </div>
          ) : (
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
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>Turma</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Semana 1</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Semana 2</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Semana 3</th>
                    <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)", textAlign: "center" }}>Semana 4</th>
                    <th style={{ padding: "12px 16px", fontWeight: 700, color: "var(--heading-color)", textAlign: "center" }}>Semanas sem Cumprir</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyGrid.map((row) => (
                    <tr key={row.studentUserId} style={{ borderBottom: "1px solid var(--card-border)" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--heading-color)" }}>
                        {row.studentName}
                      </td>

                      <td style={{ padding: "12px 16px", color: "var(--chumbo)" }}>
                        {row.classGroupLabel}
                      </td>

                      {row.weeks.map((w) => {
                        const isDone = w.status === "cumpriu";
                        const isPart = w.status === "parcial";
                        const isNot = w.status === "nao_cumpriu";
                        return (
                          <td key={w.weekNumber} style={{ padding: "10px 14px", textAlign: "center" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 700,
                                fontFamily: "'IBM Plex Mono', monospace",
                                background: isDone
                                  ? "rgba(16, 185, 129, 0.12)"
                                  : isPart
                                  ? "rgba(245, 158, 11, 0.12)"
                                  : isNot
                                  ? "rgba(239, 68, 68, 0.12)"
                                  : "var(--input-bg)",
                                color: isDone ? "#059669" : isPart ? "#B45309" : isNot ? "#DC2626" : "var(--chumbo)",
                              }}
                              title={`${w.questionsCount} questões resolvidas (meta: ${w.target})`}
                            >
                              {w.questionsCount} q.
                            </span>
                          </td>
                        );
                      })}

                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        {row.consecutiveWeeksMissed > 0 ? (
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "12px",
                              background: row.consecutiveWeeksMissed >= 2 ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                              color: row.consecutiveWeeksMissed >= 2 ? "#DC2626" : "#B45309",
                              fontWeight: 700,
                              fontSize: "11px",
                            }}
                          >
                            {row.consecutiveWeeksMissed} seguidas
                          </span>
                        ) : (
                          <span style={{ color: "#059669", fontWeight: 700, fontSize: "11px" }}>Em dia ✓</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ABA 5: RESUMO DA SEMANA EM TEXTO (VOTOS SPR Nº 5 E 7) ── */}
      {activeTab === "resumo_semana" && (
        <div style={{ maxWidth: "860px" }}>
          {/* BARRA DE CONTROLE DO RESUMO */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "10px",
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              boxShadow: "var(--card-shadow)",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 4px", color: "var(--heading-color)" }}>
                Síntese Semanal Pronta para Envio (WhatsApp / E-mail)
              </h2>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--chumbo)" }}>
                Texto objetivo gerado por regras determinísticas a partir dos dados consolidados (sem IA generativa).
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", background: "var(--input-bg)", padding: "2px", borderRadius: "6px", border: "1px solid var(--sinal)" }}>
                <button
                  onClick={() => setSummaryMode("semana")}
                  style={{
                    padding: "4px 10px",
                    fontSize: "11px",
                    fontWeight: 600,
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    background: summaryMode === "semana" ? "var(--card-bg)" : "transparent",
                    color: summaryMode === "semana" ? "var(--heading-color)" : "var(--chumbo)",
                  }}
                >
                  Resumo Semanal
                </button>
                <button
                  onClick={() => setSummaryMode("prova")}
                  style={{
                    padding: "4px 10px",
                    fontSize: "11px",
                    fontWeight: 600,
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    background: summaryMode === "prova" ? "var(--card-bg)" : "transparent",
                    color: summaryMode === "prova" ? "var(--heading-color)" : "var(--chumbo)",
                  }}
                >
                  Resumo por Prova
                </button>
              </div>

              {summaryMode === "prova" && (
                <select
                  value={selectedExamIdForSummary}
                  onChange={(e) => setSelectedExamIdForSummary(e.target.value)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "1px solid var(--sinal)",
                    background: "var(--input-bg)",
                    fontSize: "11px",
                    color: "var(--heading-color)",
                  }}
                >
                  {examsList.map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.title}</option>
                  ))}
                </select>
              )}

              {/* TOGGLE CRITÉRIO DE ACEITE: NOMES DE ALUNOS DESLIGADO POR PADRÃO */}
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--heading-color)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={includeNamesInSummary}
                  onChange={(e) => setIncludeNamesInSummary(e.target.checked)}
                />
                Incluir nomes de alunos
              </label>

              <button
                onClick={handleCopySummary}
                style={{
                  padding: "7px 14px",
                  borderRadius: "6px",
                  background: copiedSuccess ? "#059669" : "var(--pulso, #0284C7)",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "background 0.2s ease",
                }}
              >
                {copiedSuccess ? "Copiado! ✓" : "Copiar Resumo"}
              </button>
            </div>
          </div>

          {/* CAIXA DE TEXTO COM O RESUMO */}
          <div
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--sinal)",
              borderRadius: "8px",
              padding: "18px 20px",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "12px",
              color: "var(--heading-color)",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            {summaryText}
          </div>
        </div>
      )}

      {/* ── ABA 6: SESSÕES ATÍPICAS (VOTO SPR Nº 9 / ESPEC-B2B 4.10) ── */}
      {activeTab === "sessoes_atipicas" && (
        <AtypicalSessionsView
          sessions={atypicalSessions}
          config={atypicalConfig}
          classes={classes}
          userRole={userRole}
        />
      )}

      {/* MODAL DE ANOTAÇÃO PEDAGÓGICA POR ALUNO */}
      {annotationModalStudent && (
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
          onClick={() => setAnnotationModalStudent(null)}
        >
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 6px", color: "var(--heading-color)" }}>
              Anotação Pedagógica · {annotationModalStudent.studentName}
            </h3>
            <p style={{ margin: "0 0 14px", fontSize: "12px", color: "var(--chumbo)" }}>
              {annotationModalStudent.classGroupLabel} · RA: {annotationModalStudent.registration}
            </p>

            <textarea
              rows={4}
              value={annotationText}
              onChange={(e) => setAnnotationText(e.target.value)}
              placeholder="Descreva a ação acordada com o estudante (ex: convocado para mentoria de pequenos procedimentos cirúrgicos, lista de reforço aplicada)..."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid var(--sinal)",
                background: "var(--input-bg)",
                fontSize: "12px",
                color: "var(--heading-color)",
                boxSizing: "border-box",
                marginBottom: "16px",
                fontFamily: "inherit",
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setAnnotationModalStudent(null)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "6px",
                  background: "transparent",
                  border: "1px solid var(--sinal)",
                  color: "var(--heading-color)",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAnnotation}
                disabled={isPending}
                style={{
                  padding: "7px 16px",
                  borderRadius: "6px",
                  background: "var(--pulso, #0284C7)",
                  color: "#FFFFFF",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Salvar e Marcar Tratado ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
