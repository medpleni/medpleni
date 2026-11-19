"use client";

import React, { useState, useTransition } from "react";
import {
  AxisType,
  ENAMED_MILESTONES,
  LongitudinalMatrixResult,
  LongitudinalTrajectoryResult,
  ActionPlanItem,
  formatTimelineActionPlans,
  calculateLongitudinalTrajectory,
} from "@/lib/b2b/longitudinal";
import { createActionPlanAction, updateActionPlanStatusAction } from "@/lib/b2b/longitudinal-actions";
import IndicatorFootnote from "@/components/b2b/IndicatorFootnote";

interface LongitudinalClientProps {
  initialMatrix: LongitudinalMatrixResult;
  classGroups: Array<{ id: string; period: number; name: string }>;
  assessments: Array<{ id: string; title: string; createdAt: string }>;
  initialPlans: ActionPlanItem[];
  userRole: string;
}

export function LongitudinalClient({
  initialMatrix,
  classGroups,
  assessments,
  initialPlans,
  userRole,
}: LongitudinalClientProps) {
  const [activeTab, setActiveTab] = useState<"matriz" | "trilha" | "planos">("matriz");
  const [axisType, setAxisType] = useState<AxisType>("area");
  const [selectedAxisValue, setSelectedAxisValue] = useState<string>("Clínica Médica");
  const [plans, setPlans] = useState<ActionPlanItem[]>(initialPlans);
  const [isPending, startTransition] = useTransition();

  // Modal de novo plano
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [modalTargetType, setModalTargetType] = useState<"class_group" | "student">("class_group");
  const [modalClassGroupId, setModalClassGroupId] = useState<string>(classGroups[2]?.id || "");
  const [modalAxisValue, setModalAxisValue] = useState<string>("Clínica Médica");
  const [modalActionDescription, setModalActionDescription] = useState<string>("");
  const [modalResponsibleName, setModalResponsibleName] = useState<string>("Coordenação de Curso");
  const [modalAgreedDate, setModalAgreedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [modalDeadlineDate, setModalDeadlineDate] = useState<string>("");
  const [modalVerificationExamId, setModalVerificationExamId] = useState<string>("");
  const [modalInitialScore, setModalInitialScore] = useState<number>(48.0);
  const [modalNotes, setModalNotes] = useState<string>("");

  // Modal de atualização de plano
  const [editingPlan, setEditingPlan] = useState<ActionPlanItem | null>(null);
  const [editStatus, setEditStatus] = useState<ActionPlanItem["status"]>("em_andamento");
  const [editVerifiedScore, setEditVerifiedScore] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");

  // Tooltip ou detalhe de célula clicada
  const [selectedCellDetail, setSelectedCellDetail] = useState<{
    axis: string;
    period: number;
    score: number | null;
    questionsCount: number;
    examsCount: number;
    warning: string | null;
  } | null>(null);

  // Calcula a trilha dinâmica para o eixo selecionado
  const trajectory: LongitudinalTrajectoryResult = calculateLongitudinalTrajectory({
    axisValue: selectedAxisValue,
    axisType,
    matrixResult: initialMatrix,
    classGroups,
  });

  const timelinePlans = formatTimelineActionPlans(plans);

  // Salvar novo plano
  const handleSavePlan = () => {
    if (!modalActionDescription.trim()) return;

    startTransition(async () => {
      const res = await createActionPlanAction({
        targetType: modalTargetType,
        classGroupId: modalTargetType === "class_group" ? modalClassGroupId : null,
        axisType,
        axisValue: modalAxisValue,
        actionDescription: modalActionDescription,
        responsibleName: modalResponsibleName,
        agreedDate: modalAgreedDate,
        deadlineDate: modalDeadlineDate || null,
        verificationAssessmentId: modalVerificationExamId || null,
        initialScore: Number(modalInitialScore),
        notes: modalNotes,
      });

      if (res.ok && res.data) {
        const targetCg = classGroups.find((c) => c.id === modalClassGroupId);
        const newPlan: ActionPlanItem = {
          id: res.data.id,
          targetType: res.data.target_type,
          classGroupId: res.data.class_group_id,
          classGroupLabel: targetCg?.name || "Turma",
          axisType: res.data.axis_type,
          axisValue: res.data.axis_value,
          actionDescription: res.data.action_description,
          responsibleName: res.data.responsible_name,
          agreedDate: res.data.agreed_date,
          deadlineDate: res.data.deadline_date,
          verificationAssessmentId: res.data.verification_assessment_id,
          verificationAssessmentTitle: assessments.find((a) => a.id === res.data.verification_assessment_id)?.title,
          initialScore: Number(res.data.initial_score),
          status: res.data.status,
          notes: res.data.notes,
        };
        setPlans((prev) => [newPlan, ...prev]);
        setIsNewPlanModalOpen(false);
        setModalActionDescription("");
        setModalNotes("");
      }
    });
  };

  // Atualizar plano existente
  const handleUpdatePlan = () => {
    if (!editingPlan) return;

    startTransition(async () => {
      const vScore = editVerifiedScore.trim() ? parseFloat(editVerifiedScore) : null;
      const res = await updateActionPlanStatusAction({
        planId: editingPlan.id,
        status: editStatus,
        verifiedScore: vScore,
        notes: editNotes,
      });

      if (res.ok) {
        setPlans((prev) =>
          prev.map((p) =>
            p.id === editingPlan.id
              ? {
                  ...p,
                  status: editStatus,
                  verifiedScore: vScore,
                  notes: editNotes,
                }
              : p
          )
        );
        setEditingPlan(null);
      }
    });
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "8px 0 40px" }} className="space-y-6">
      {/* Cabeçalho */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "var(--heading-color)" }}>
              Avaliação Longitudinal
            </h1>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "9999px",
                background: "var(--pulso-dim)",
                color: "var(--pulso)",
                textTransform: "uppercase",
              }}
            >
              DCNs art. 36–37
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--chumbo)" }}>
            Acompanhamento curricular e progressão por períodos com referência na Régua 60 e marcos do ENAMED.
          </p>
        </div>

        {/* Abas Modernas com Indicador de Foco */}
        <div
          style={{
            display: "inline-flex",
            background: "var(--input-bg)",
            padding: "3px",
            borderRadius: "8px",
            border: "1px solid var(--card-border)",
          }}
        >
          <button
            onClick={() => setActiveTab("matriz")}
            style={{
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: 600,
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              background: activeTab === "matriz" ? "var(--card-bg)" : "transparent",
              color: activeTab === "matriz" ? "var(--heading-color)" : "var(--chumbo)",
              boxShadow: activeTab === "matriz" ? "var(--card-shadow)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            Matriz Currículo × Eixo
          </button>
          <button
            onClick={() => setActiveTab("trilha")}
            style={{
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: 600,
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              background: activeTab === "trilha" ? "var(--card-bg)" : "transparent",
              color: activeTab === "trilha" ? "var(--heading-color)" : "var(--chumbo)",
              boxShadow: activeTab === "trilha" ? "var(--card-shadow)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            Trilha Longitudinal
          </button>
          <button
            onClick={() => setActiveTab("planos")}
            style={{
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: 600,
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              background: activeTab === "planos" ? "var(--card-bg)" : "transparent",
              color: activeTab === "planos" ? "var(--heading-color)" : "var(--chumbo)",
              boxShadow: activeTab === "planos" ? "var(--card-shadow)" : "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            }}
          >
            <span>Planos de Acompanhamento</span>
            {plans.length > 0 && (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "9999px",
                  background: "var(--pulso-dim)",
                  color: "var(--pulso)",
                }}
              >
                {plans.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: MATRIZ CURRÍCULO × EIXO */}
      {/* ========================================================================= */}
      {activeTab === "matriz" && (
        <div className="space-y-6">
          {/* Barra de Controles: Seletor de Eixo e Resumo de Células */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Eixo em análise:
              </span>
              <div className="inline-flex rounded-lg border border-border p-0.5 bg-background">
                {(["area", "cenario", "tema", "competencia"] as AxisType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setAxisType(type)}
                    className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                      axisType === type
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {type === "area"
                      ? "Áreas (7 INEP)"
                      : type === "cenario"
                      ? "Cenários de Prática"
                      : type === "tema"
                      ? "Temas"
                      : "Competências"}
                  </button>
                ))}
              </div>
            </div>

            {/* Legenda de Faixas */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="text-muted-foreground font-medium">Faixas (Régua 60):</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-rose-500/20 border border-rose-500/40" />
                <span className="text-muted-foreground">&lt; 51% (Crítico)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-amber-500/25 border border-amber-500/50" />
                <span className="font-medium text-amber-700 dark:text-amber-400">51–60% (Zona Decisão)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-emerald-500/15 border border-emerald-500/30" />
                <span className="text-muted-foreground">61–70%</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-emerald-500/30 border border-emerald-500/60" />
                <span className="text-muted-foreground">≥ 71%</span>
              </span>
            </div>
          </div>

          {/* Destaque dos 3 Marcos ENAMED */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[4, 8, 12].map((p) => {
              const m = ENAMED_MILESTONES[p];
              return (
                <div
                  key={p}
                  className="rounded-xl border border-blue-200/60 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/20 p-3.5 flex items-start gap-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs shadow-sm">
                    P{p}
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-blue-950 dark:text-blue-200">
                      {m.label}
                    </h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      {m.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabela da Matriz com Períodos P1 a P12 */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[980px]">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                    <th className="py-3 px-4 font-semibold w-48 sticky left-0 bg-muted/90 backdrop-blur-sm z-10">
                      {axisType === "area"
                        ? "Área (INEP)"
                        : axisType === "cenario"
                        ? "Cenário"
                        : axisType === "tema"
                        ? "Tema"
                        : "Competência"}
                    </th>
                    <th className="py-3 px-3 font-semibold text-center w-20">Média Geral</th>
                    {initialMatrix.periods.map((p) => {
                      const isMilestone = p === 4 || p === 8 || p === 12;
                      return (
                        <th
                          key={p}
                          className={`py-3 px-2 text-center font-semibold w-16 ${
                            isMilestone
                              ? "bg-blue-100/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-x border-blue-200 dark:border-blue-900/60 font-bold"
                              : ""
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <span>P{p}</span>
                            {isMilestone && (
                              <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tighter">
                                ENAMED
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {initialMatrix.rows.map((row) => (
                    <tr key={row.axisValue} className="hover:bg-muted/30 transition-colors">
                      {/* Eixo / Área */}
                      <td className="py-3 px-4 font-medium text-foreground sticky left-0 bg-card/95 backdrop-blur-sm z-10 border-r border-border/50">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              setSelectedAxisValue(row.axisValue);
                              setActiveTab("trilha");
                            }}
                            className="text-left font-medium hover:text-primary transition-colors hover:underline text-xs"
                            title="Ver evolução longitudinal desta área"
                          >
                            {row.axisValue}
                          </button>
                          <span className="text-[10px] text-muted-foreground">
                            {row.totalQuestions} itens
                          </span>
                        </div>
                      </td>

                      {/* Média Geral da Linha */}
                      <td className="py-2.5 px-3 text-center border-r border-border/50 font-bold">
                        {row.overallAverage !== null ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs ${
                              row.overallAverage < 51
                                ? "text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 font-bold"
                                : row.overallAverage <= initialMatrix.cutScore
                                ? "text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 font-bold"
                                : "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300"
                            }`}
                          >
                            {row.overallAverage.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Células P1 a P12 */}
                      {initialMatrix.periods.map((p) => {
                        const cell = row.cells[p];
                        const isMilestone = p === 4 || p === 8 || p === 12;

                        let bgClass = "bg-transparent text-muted-foreground";
                        if (cell.scoreBand === "abaixo_50") {
                          bgClass = "bg-rose-500/15 text-rose-800 dark:text-rose-200 font-semibold";
                        } else if (cell.scoreBand === "51_60") {
                          bgClass = "bg-amber-500/20 text-amber-900 dark:text-amber-200 font-bold ring-1 ring-inset ring-amber-500/30";
                        } else if (cell.scoreBand === "61_70") {
                          bgClass = "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
                        } else if (cell.scoreBand === "71_mais") {
                          bgClass = "bg-emerald-500/25 text-emerald-900 dark:text-emerald-100 font-semibold";
                        }

                        return (
                          <td
                            key={p}
                            onClick={() =>
                              setSelectedCellDetail({
                                axis: row.axisValue,
                                period: p,
                                score: cell.averageScore,
                                questionsCount: cell.questionsCount,
                                examsCount: cell.examsCount,
                                warning: cell.warning,
                              })
                            }
                            className={`py-2 px-1 text-center cursor-pointer transition-transform hover:scale-105 ${
                              isMilestone ? "border-x border-blue-200/80 dark:border-blue-900/60" : ""
                            }`}
                          >
                            <div className={`py-1.5 px-1 rounded-md text-xs relative ${bgClass}`}>
                              {cell.averageScore !== null ? (
                                <div className="leading-tight">
                                  <span>{cell.averageScore.toFixed(0)}%</span>
                                  <span className="block text-[9px] opacity-75 font-normal">
                                    {cell.questionsCount}q
                                  </span>
                                </div>
                              ) : (
                                <span className="opacity-40 text-[10px]">—</span>
                              )}

                              {/* Alerta discreto de interpretação */}
                              {cell.warning && (
                                <span
                                  className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-amber-500"
                                  title={
                                    cell.warning === "poucas_questoes"
                                      ? "Menos de 5 questões sustentam esta média"
                                      : cell.warning === "poucas_provas"
                                      ? "Baseado em apenas 1 avaliação"
                                      : "Sem dados suficientes"
                                  }
                                />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Aviso Metodológico no Rodapé da Tabela */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-border bg-muted/20 px-4 py-3 gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                <span>
                  O ponto âmbar no canto da célula sinaliza aviso de interpretação (menos de 5 questões ou apenas 1 prova no período).
                </span>
              </div>

              <IndicatorFootnote
                base="Avaliações aplicadas na instituição"
                periodo="Períodos 1 a 12 (Ciclo Básico, Clínico e Internato)"
                fonte="Motor de Avaliação Longitudinal MedPleni"
              />
            </div>
          </div>

          {/* Modal / Detalhe da Célula Clicada */}
          {selectedCellDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      Detalhamento do Período P{selectedCellDetail.period}
                    </span>
                    <h3 className="text-lg font-bold text-foreground mt-0.5">
                      {selectedCellDetail.axis}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedCellDetail(null)}
                    className="text-muted-foreground hover:text-foreground p-1 text-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg bg-muted p-3">
                      <span className="text-[11px] text-muted-foreground block">Aproveitamento Médio</span>
                      <span className="text-xl font-bold text-foreground">
                        {selectedCellDetail.score !== null ? `${selectedCellDetail.score.toFixed(1)}%` : "—"}
                      </span>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <span className="text-[11px] text-muted-foreground block">Itens Avaliados</span>
                      <span className="text-xl font-bold text-foreground">
                        {selectedCellDetail.questionsCount}
                      </span>
                    </div>
                  </div>

                  {selectedCellDetail.warning && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                      <strong>Aviso de Interpretação:</strong>{" "}
                      {selectedCellDetail.warning === "poucas_questoes"
                        ? "Esta média é sustentada por menos de 5 questões. Recomenda-se cautela ao inferir proficiência definitiva sem novos instrumentos avaliativos."
                        : selectedCellDetail.warning === "poucas_provas"
                        ? "Houve apenas uma prova realizada neste período para o eixo em questão."
                        : "Sem volume amostral suficiente."}
                    </div>
                  )}

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setSelectedAxisValue(selectedCellDetail.axis);
                        setSelectedCellDetail(null);
                        setActiveTab("trilha");
                      }}
                      className="w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Explorar na Trilha Longitudinal
                    </button>
                    {(userRole === "dirigente" || userRole === "coordenador") && (
                      <button
                        onClick={() => {
                          const targetCg = classGroups.find((c) => c.period === selectedCellDetail.period);
                          setModalAxisValue(selectedCellDetail.axis);
                          if (targetCg) setModalClassGroupId(targetCg.id);
                          setModalInitialScore(selectedCellDetail.score || 50.0);
                          setSelectedCellDetail(null);
                          setIsNewPlanModalOpen(true);
                        }}
                        className="w-full rounded-lg border border-border py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        Criar Plano de Acompanhamento para P{selectedCellDetail.period}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: TRILHA LONGITUDINAL */}
      {/* ========================================================================= */}
      {activeTab === "trilha" && (
        <div className="space-y-6">
          {/* Seletor do Eixo para a Trilha */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Visualizando Trilha de:
              </span>
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={selectedAxisValue}
                  onChange={(e) => setSelectedAxisValue(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {initialMatrix.rows.map((r) => (
                    <option key={r.axisValue} value={r.axisValue}>
                      {r.axisValue}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">
                  (Régua de referência: {initialMatrix.cutScore}%)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Marcos ENAMED destacados
              </span>
            </div>
          </div>

          {/* Gráfico / Visualização da Evolução Temporal da Coorte */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Evolução da Coorte ao Longo dos Períodos (P1 a P12)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Trajetória contínua da média discente em <strong>{selectedAxisValue}</strong> em comparação com o corte de 60%.
                </p>
              </div>
            </div>

            {/* Representação Vetorial / Barras com Trajetória e Corte */}
            <div className="space-y-3 pt-2">
              <div className="relative border-b border-border pb-4">
                {/* Linha de corte 60% */}
                <div
                  className="absolute top-0 bottom-4 border-l-2 border-dashed border-primary/60 z-10 pointer-events-none"
                  style={{ left: "60%" }}
                >
                  <span className="absolute -top-4 -left-6 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                    Corte 60%
                  </span>
                </div>

                <div className="space-y-2">
                  {trajectory.cohortTrajectory.map((point) => {
                    const isMilestone = point.period === 4 || point.period === 8 || point.period === 12;
                    return (
                      <div key={point.period} className="flex items-center text-xs gap-3">
                        {/* Rótulo do Período */}
                        <div className="w-24 shrink-0 font-medium text-foreground flex items-center gap-1.5">
                          <span
                            className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
                              isMilestone
                                ? "bg-blue-600 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            P{point.period}
                          </span>
                          <span className="truncate">{point.classGroupLabel}</span>
                        </div>

                        {/* Barra de Progresso com marcador de 60 */}
                        <div className="relative flex-1 h-7 rounded-md bg-muted/60 overflow-hidden flex items-center px-2">
                          <div
                            className={`absolute left-0 top-0 bottom-0 transition-all rounded-r-md ${
                              point.averageScore < 51
                                ? "bg-rose-500/30"
                                : point.isInDecisionZone
                                ? "bg-amber-500/40 ring-1 ring-amber-500"
                                : "bg-emerald-500/35"
                            }`}
                            style={{ width: `${Math.min(100, point.averageScore)}%` }}
                          />

                          <span className="relative z-10 font-bold text-foreground text-xs ml-1">
                            {point.averageScore.toFixed(1)}%
                          </span>
                          <span className="relative z-10 ml-auto text-[10px] text-muted-foreground">
                            {point.questionsCount} itens analisados
                          </span>
                        </div>

                        {/* Indicador de Status */}
                        <div className="w-28 shrink-0 text-right">
                          {point.averageScore < 51 ? (
                            <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                              Abaixo de 51%
                            </span>
                          ) : point.isInDecisionZone ? (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                              Zona Decisão
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              Adequado (≥60)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Comparativo entre Turmas Paralelas no Mesmo Período */}
            <div className="pt-4 border-t border-border">
              <h2 className="text-sm font-bold text-foreground">
                Comparativo Entre Turmas Paralelas nos Marcos do ENAMED
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Avaliação de consistência institucional entre coortes nos pontos de checagem intermediários.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                {trajectory.parallelCohortsComparison.map((comp) => {
                  const m = ENAMED_MILESTONES[comp.period];
                  return (
                    <div
                      key={comp.period}
                      className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-xs font-bold text-foreground">
                          {m?.shortLabel || `Período P${comp.period}`}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {comp.classes.length} turmas
                        </span>
                      </div>

                      <div className="space-y-2">
                        {comp.classes.map((cls) => (
                          <div
                            key={cls.classGroupId}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-muted-foreground truncate max-w-[140px]">
                              {cls.classLabel}
                            </span>
                            <span
                              className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                                cls.averageScore >= 60
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                              }`}
                            >
                              {cls.averageScore.toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <IndicatorFootnote
              base="Turmas e coortes da graduação médica"
              periodo="Trajetória longitudinal completa"
              fonte="Motor de Avaliação Longitudinal MedPleni"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: PLANOS DE ACOMPANHAMENTO (AP-04 / DCN art. 36-37) */}
      {/* ========================================================================= */}
      {activeTab === "planos" && (
        <div className="space-y-6">
          {/* Banner de Ação */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Planos de Acompanhamento Curricular e Reteste
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Instrumento formativo formal para estudantes ou turmas com aproveitamento abaixo de 60%, com reteste embutido na avaliação seguinte.
              </p>
            </div>

            {(userRole === "dirigente" || userRole === "coordenador") && (
              <button
                onClick={() => setIsNewPlanModalOpen(true)}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                + Novo Plano de Acompanhamento
              </button>
            )}
          </div>

          {/* Linha do Tempo Visual das Ações e Ganhos Verificados */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-foreground border-b border-border pb-3">
              Linha do Tempo de Ações Combinadas e Resultados de Reteste
            </h2>

            {timelinePlans.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-xs">
                Nenhum plano de acompanhamento registrado até o momento.
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {timelinePlans.map((plan) => (
                  <div key={plan.id} className="relative group">
                    {/* Marcador circular da timeline */}
                    <div
                      className={`absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background transition-transform group-hover:scale-125 ${
                        plan.status === "concluida"
                          ? plan.isRecovered
                            ? "bg-emerald-500"
                            : "bg-rose-500"
                          : "bg-amber-500"
                      }`}
                    />

                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3 hover:border-primary/40 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                            {plan.axisValue}
                          </span>
                          <span className="text-xs font-semibold text-foreground">
                            {plan.targetType === "class_group"
                              ? plan.classGroupLabel || "Turma"
                              : plan.studentName || "Estudante Individual"}
                          </span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">
                            Pactuado em: {new Date(plan.agreedDate).toLocaleDateString("pt-BR")}
                          </span>
                        </div>

                        {/* Status badge */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              plan.status === "concluida"
                                ? plan.isRecovered
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                            }`}
                          >
                            {plan.timelineStatusLabel}
                          </span>

                          {(userRole === "dirigente" || userRole === "coordenador") && (
                            <button
                              onClick={() => {
                                setEditingPlan(plan);
                                setEditStatus(plan.status);
                                setEditVerifiedScore(plan.verifiedScore ? String(plan.verifiedScore) : "");
                                setEditNotes(plan.notes || "");
                              }}
                              className="text-xs text-muted-foreground hover:text-primary underline px-1"
                            >
                              Atualizar
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-foreground leading-relaxed font-medium">
                        {plan.actionDescription}
                      </p>

                      {/* Caixa de Reteste e Ganho */}
                      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/50 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Responsável:</span>
                          <span className="font-semibold text-foreground">{plan.responsibleName}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Nota Inicial:</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            {plan.initialScore.toFixed(1)}%
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-muted-foreground">Reteste:</span>
                          {plan.verifiedScore !== undefined && plan.verifiedScore !== null ? (
                            <span
                              className={`font-bold ${
                                plan.verifiedScore >= 60
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {plan.verifiedScore.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">Aguardando prova</span>
                          )}

                          {plan.gain !== null && (
                            <span
                              className={`text-[11px] font-bold ${
                                plan.gain >= 0 ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              ({plan.gain >= 0 ? `+${plan.gain.toFixed(1)}%` : `${plan.gain.toFixed(1)}%`})
                            </span>
                          )}
                        </div>
                      </div>

                      {plan.notes && (
                        <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-border/30">
                          <strong>Observações:</strong> {plan.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <IndicatorFootnote
              base="Planos formativos formalizados no sistema"
              periodo="Semestre Letivo Atual"
              fonte="Comitê de Acompanhamento / DCNs art. 36-37"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVO PLANO DE ACOMPANHAMENTO */}
      {/* ========================================================================= */}
      {isNewPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Novo Plano de Acompanhamento Formativo
                </h3>
                <p className="text-xs text-muted-foreground">
                  Registrar ação combinada para grupo ou estudante abaixo da Régua 60.
                </p>
              </div>
              <button
                onClick={() => setIsNewPlanModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Alvo */}
              <div>
                <label className="font-semibold text-foreground block mb-1">Público-alvo:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={modalTargetType === "class_group"}
                      onChange={() => setModalTargetType("class_group")}
                    />
                    <span>Turma Inteira</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={modalTargetType === "student"}
                      onChange={() => setModalTargetType("student")}
                    />
                    <span>Estudante Específico</span>
                  </label>
                </div>
              </div>

              {/* Seletor de Turma */}
              {modalTargetType === "class_group" && (
                <div>
                  <label className="font-semibold text-foreground block mb-1">Turma:</label>
                  <select
                    value={modalClassGroupId}
                    onChange={(e) => setModalClassGroupId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                  >
                    {classGroups.map((cg) => (
                      <option key={cg.id} value={cg.id}>
                        {cg.name} (P{cg.period})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Eixo e Nota Inicial */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Eixo / Área:</label>
                  <input
                    type="text"
                    value={modalAxisValue}
                    onChange={(e) => setModalAxisValue(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Nota Inicial (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={modalInitialScore}
                    onChange={(e) => setModalInitialScore(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                  />
                </div>
              </div>

              {/* Descrição da Ação Combinada */}
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Ação Combinada (Ex: lista de exercícios, mentoria clínica, revisão prática):
                </label>
                <textarea
                  rows={3}
                  value={modalActionDescription}
                  onChange={(e) => setModalActionDescription(e.target.value)}
                  placeholder="Descreva as medidas formativas pactuadas..."
                  className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                />
              </div>

              {/* Responsável e Data */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Responsável:</label>
                  <input
                    type="text"
                    value={modalResponsibleName}
                    onChange={(e) => setModalResponsibleName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Data do Acordo:</label>
                  <input
                    type="date"
                    value={modalAgreedDate}
                    onChange={(e) => setModalAgreedDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                  />
                </div>
              </div>

              {/* Avaliação de Verificação (Reteste) */}
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Prova onde será verificado o reteste:
                </label>
                <select
                  value={modalVerificationExamId}
                  onChange={(e) => setModalVerificationExamId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                >
                  <option value="">Selecione uma avaliação futura...</option>
                  {assessments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Observações */}
              <div>
                <label className="font-semibold text-foreground block mb-1">Observações Adicionais:</label>
                <input
                  type="text"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Informações relevantes para o prontuário pedagógico..."
                  className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsNewPlanModalOpen(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending || !modalActionDescription.trim()}
                onClick={handleSavePlan}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? "Gravando..." : "Salvar Plano"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ATUALIZAR STATUS / NOTA DE RETESTE */}
      {/* ========================================================================= */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Atualizar Plano de Acompanhamento
                </h3>
                <p className="text-xs text-muted-foreground">{editingPlan.axisValue}</p>
              </div>
              <button
                onClick={() => setEditingPlan(null)}
                className="text-muted-foreground hover:text-foreground text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Status da Ação:</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as ActionPlanItem["status"])}
                  className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                >
                  <option value="planejada">Planejada</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluida">Concluída / Verificada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Nota Verificada no Reteste (%):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editVerifiedScore}
                  onChange={(e) => setEditVerifiedScore(e.target.value)}
                  placeholder="Ex: 64.5"
                  className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Nota inicial pactuada: {editingPlan.initialScore.toFixed(1)}%
                </span>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Anotações de Conclusão / Desempenho:
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ex: Aluno realizou o reteste e superou a régua de 60%..."
                  className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleUpdatePlan}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? "Atualizando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Rodapé Padronizado Base / Período / Fonte */}
      <div className="mt-6 p-4 rounded-xl border border-border bg-card text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span><strong>Base:</strong> Matriz curricular de 12 períodos acompanhados longitudinalmente</span>
          <span className="hidden sm:inline">·</span>
          <span><strong>Período:</strong> 2026.1 (Ciclo Anual de Acompanhamento)</span>
          <span className="hidden sm:inline">·</span>
          <span><strong>Fonte:</strong> Provas somativas, simulados ENAMED e planos de acompanhamento</span>
        </div>
        <div>
          Régua de corte configurada: <strong>60%</strong>
        </div>
      </div>
    </div>
  );
}
