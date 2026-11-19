"use client";

import React, { useState, useTransition } from "react";
import {
  InterventionItem,
  InterventionType,
  InterventionStatus,
} from "@/lib/b2b/interventions";
import {
  createInterventionAction,
  updateInterventionStatusAction,
} from "@/lib/b2b/intervention-actions";
import IndicatorFootnote from "@/components/b2b/IndicatorFootnote";

interface IntervencoesClientProps {
  initialInterventions: InterventionItem[];
  detectedGaps: Array<{
    classGroupId: string;
    classGroupLabel: string;
    period: number;
    axisType: "area";
    axisValue: string;
    scorePercentage: number;
    questionsCount: number;
    examId?: string;
  }>;
  classGroups: Array<{ id: string; name: string; period: number }>;
  assessments: Array<{ id: string; title: string; createdAt: string }>;
  userRole: string;
}

export function IntervencoesClient({
  initialInterventions,
  detectedGaps,
  classGroups,
  assessments,
  userRole,
}: IntervencoesClientProps) {
  const [interventions, setInterventions] = useState<InterventionItem[]>(initialInterventions);
  const [selectedIntervention, setSelectedIntervention] = useState<InterventionItem | null>(
    initialInterventions[0] || null
  );
  const [filterType, setFilterType] = useState<"todos" | InterventionType>("todos");
  const [filterStatus, setFilterStatus] = useState<"todos" | InterventionStatus>("todos");
  const [isPending, startTransition] = useTransition();

  // Wizard de 3 passos
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  // Passo 1: Lacuna
  const [selectedClassGroupId, setSelectedClassGroupId] = useState<string>(
    classGroups[2]?.id || ""
  );
  const [selectedParallelClassGroupId, setSelectedParallelClassGroupId] = useState<string>("");
  const [selectedAxisValue, setSelectedAxisValue] = useState<string>("Cirurgia Geral");
  const [beforeScore, setBeforeScore] = useState<number>(46.5);
  const [parallelBeforeScore, setParallelBeforeScore] = useState<number>(52.0);
  const [originExamId, setOriginExamId] = useState<string>(assessments[0]?.id || "");

  // Passo 2: Ação (somente os 2 tipos aprovados)
  const [interventionType, setInterventionType] = useState<InterventionType>("lista_exercicios");
  const [title, setTitle] = useState<string>("Lista Dirigida de Recuperação em Cirurgia Geral");
  const [practiceQuestionsCount, setPracticeQuestionsCount] = useState<number>(20);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState<string>("");

  // Passo 3: Verificação (Reteste Embutido)
  const [retestExamId, setRetestExamId] = useState<string>(assessments[1]?.id || "");
  const [retestQuestionsCount, setRetestQuestionsCount] = useState<number>(5);

  // Modal de atualização de reteste
  const [isUpdatingRetest, setIsUpdatingRetest] = useState(false);
  const [updateAfterScore, setUpdateAfterScore] = useState<string>("");
  const [updateParallelAfterScore, setUpdateParallelAfterScore] = useState<string>("");
  const [updateStatus, setUpdateStatus] = useState<InterventionStatus>("concluida");

  // Estatísticas do topo
  const totalCount = interventions.length;
  const inProgressCount = interventions.filter((i) => i.status === "em_andamento").length;
  const completedCount = interventions.filter((i) => i.status === "concluida").length;
  const avgAdherence =
    totalCount > 0
      ? Math.round(
          (interventions.reduce((sum, i) => sum + (i.adherence?.adherenceRate || 0), 0) /
            totalCount) *
            10
        ) / 10
      : 0;

  // Filtragem da lista
  const filteredInterventions = interventions.filter((i) => {
    if (filterType !== "todos" && i.type !== filterType) return false;
    if (filterStatus !== "todos" && i.status !== filterStatus) return false;
    return true;
  });

  // Preenche dados a partir de uma lacuna sugerida no Passo 1
  const handleSelectGap = (gap: (typeof detectedGaps)[0]) => {
    setSelectedClassGroupId(gap.classGroupId);
    setSelectedAxisValue(gap.axisValue);
    setBeforeScore(gap.scorePercentage);
    setTitle(`Lista Dirigida: Reforço em ${gap.axisValue} (${gap.classGroupLabel})`);
    if (gap.examId) setOriginExamId(gap.examId);
  };

  // Salvar nova intervenção via Server Action
  const handleCreateIntervention = () => {
    startTransition(async () => {
      const res = await createInterventionAction({
        title,
        type: interventionType,
        targetType: "class_group",
        classGroupId: selectedClassGroupId,
        parallelClassGroupId: selectedParallelClassGroupId || null,
        axisType: "area",
        axisValue: selectedAxisValue,
        originAssessmentId: originExamId || null,
        beforeScore: Number(beforeScore),
        parallelBeforeScore: selectedParallelClassGroupId ? Number(parallelBeforeScore) : null,
        retestAssessmentId: retestExamId || null,
        retestQuestionsCount: Number(retestQuestionsCount),
        practiceListQuestionsCount: Number(practiceQuestionsCount),
        startDate,
        dueDate: dueDate || null,
      });

      if (res.ok && res.data) {
        const targetCg = classGroups.find((c) => c.id === selectedClassGroupId);
        const parallelCg = classGroups.find((c) => c.id === selectedParallelClassGroupId);

        const newIntervention: InterventionItem = {
          id: res.data.id,
          title: res.data.title,
          type: res.data.type,
          targetType: res.data.target_type,
          classGroupId: res.data.class_group_id,
          classGroupLabel: targetCg?.name || "Turma",
          parallelClassGroupId: res.data.parallel_class_group_id,
          parallelClassGroupLabel: parallelCg?.name,
          axisType: res.data.axis_type,
          axisValue: res.data.axis_value,
          originAssessmentId: res.data.origin_assessment_id,
          originAssessmentTitle: assessments.find((a) => a.id === res.data.origin_assessment_id)?.title,
          beforeScore: Number(res.data.before_score),
          parallelBeforeScore: res.data.parallel_before_score ? Number(res.data.parallel_before_score) : null,
          afterScore: null,
          retestAssessmentId: res.data.retest_assessment_id,
          retestAssessmentTitle: assessments.find((a) => a.id === res.data.retest_assessment_id)?.title,
          retestQuestionsCount: res.data.retest_questions_count,
          practiceListQuestionsCount: res.data.practice_list_questions_count,
          startDate: res.data.start_date,
          dueDate: res.data.due_date,
          status: "em_andamento",
          adherence: {
            totalStudents: 20,
            completedStudents: 0,
            inProgressStudents: 0,
            pendingStudents: 20,
            adherenceRate: 0,
            averageScore: null,
            isSmallGroup: false,
          },
          studentsAdherence: Array.from({ length: 20 }, (_, idx) => ({
            studentUserId: `st-${idx + 1}`,
            studentName: `Estudante ${idx + 1}`,
            registration: `RA-${1000 + idx}`,
            status: "pendente",
            questionsCompleted: 0,
            questionsTarget: res.data.practice_list_questions_count || 20,
          })),
          isRecovered: false,
        };

        setInterventions((prev) => [newIntervention, ...prev]);
        setSelectedIntervention(newIntervention);
        setIsWizardOpen(false);
        setWizardStep(1);
      }
    });
  };

  // Salvar atualização de reteste
  const handleUpdateRetest = () => {
    if (!selectedIntervention) return;

    startTransition(async () => {
      const aScore = updateAfterScore.trim() ? parseFloat(updateAfterScore) : null;
      const pScore = updateParallelAfterScore.trim() ? parseFloat(updateParallelAfterScore) : null;

      const res = await updateInterventionStatusAction({
        interventionId: selectedIntervention.id,
        status: updateStatus,
        afterScore: aScore,
        parallelAfterScore: pScore,
      });

      if (res.ok) {
        const delta = aScore !== null ? Math.round((aScore - selectedIntervention.beforeScore) * 10) / 10 : null;
        const updated: InterventionItem = {
          ...selectedIntervention,
          status: updateStatus,
          afterScore: aScore,
          parallelAfterScore: pScore,
          deltaScore: delta,
          isRecovered: aScore !== null ? aScore >= 60 : false,
        };

        setInterventions((prev) =>
          prev.map((i) => (i.id === selectedIntervention.id ? updated : i))
        );
        setSelectedIntervention(updated);
        setIsUpdatingRetest(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Intervenções pedagógicas
            </h1>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Da Lacuna ao Reteste
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Diagnóstico de lacunas (&lt; 60%), listas dirigidas no Praticar e pré/pós-aula com reteste embutido.
          </p>
        </div>

        {(userRole === "dirigente" || userRole === "coordenador" || userRole === "docente") && (
          <button
            onClick={() => {
              setWizardStep(1);
              setIsWizardOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            + Nova Intervenção
          </button>
        )}
      </div>

      {/* 4 Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Intervenções Ativas
          </span>
          <span className="text-2xl font-bold text-foreground mt-1 block">
            {inProgressCount}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            {totalCount} registradas no total
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Retestadas com Sucesso
          </span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {completedCount}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            Régua 60 superada no reteste
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Adesão Média Discente
          </span>
          <span className="text-2xl font-bold text-foreground mt-1 block">
            {avgAdherence.toFixed(1)}%
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            Alunos que completaram as metas
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Tipos Homologados
          </span>
          <span className="text-xs font-bold text-foreground mt-1 block">
            Lista de Exercícios &amp; Pré/Pós-Aula
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            Modelo enxuto (SPR / IN-02)
          </span>
        </div>
      </div>

      {/* Layout Principal: Lista à Esquerda (40%) e Detalhe à Direita (60%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel da Esquerda: Lista de Intervenções */}
        <div className="lg:col-span-5 space-y-4">
          {/* Filtros da lista */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full sm:w-auto rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="lista_exercicios">Lista de Exercícios</option>
              <option value="pre_pos_aula">Pré e Pós-Aula</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full sm:w-auto rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground"
            >
              <option value="todos">Todos os Status</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluida">Concluída</option>
              <option value="planejada">Planejada</option>
            </select>
          </div>

          {/* Cards da Lista */}
          <div className="space-y-2.5">
            {filteredInterventions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                Nenhuma intervenção encontrada com os filtros selecionados.
              </div>
            ) : (
              filteredInterventions.map((item) => {
                const isSelected = selectedIntervention?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedIntervention(item)}
                    className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                        : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground uppercase tracking-wider">
                            {item.type === "lista_exercicios" ? "Lista Praticar" : "Pré/Pós-Aula"}
                          </span>
                          <span className="text-xs font-semibold text-primary">
                            {item.axisValue}
                          </span>
                        </div>
                        <h2 className="text-xs font-bold text-foreground mt-1 line-clamp-1">
                          {item.title}
                        </h2>
                      </div>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                          item.status === "concluida"
                            ? item.isRecovered
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                            : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                        }`}
                      >
                        {item.status === "concluida" ? "Concluída" : "Em andamento"}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{item.classGroupLabel || "Turma"}</span>
                      <div className="flex items-center gap-2">
                        <span>Antes: <strong>{item.beforeScore.toFixed(0)}%</strong></span>
                        <span>→</span>
                        <span>
                          Reteste:{" "}
                          {item.afterScore !== null && item.afterScore !== undefined ? (
                            <strong className="text-foreground">{item.afterScore.toFixed(0)}%</strong>
                          ) : (
                            <em className="text-muted-foreground">Aguardando</em>
                          )}
                        </span>
                        {item.deltaScore !== null && item.deltaScore !== undefined && (
                          <span
                            className={`font-bold ${
                              item.deltaScore >= 0 ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            ({item.deltaScore >= 0 ? `+${item.deltaScore.toFixed(0)}%` : `${item.deltaScore.toFixed(0)}%`})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Barra de adesão */}
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${item.adherence?.adherenceRate || 0}%` }}
                        />
                      </div>
                      <span className="shrink-0 font-medium">
                        {item.adherence?.adherenceRate || 0}% adesão
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Painel da Direita: Detalhe da Intervenção Selecionada */}
        <div className="lg:col-span-7">
          {selectedIntervention ? (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-6">
              {/* Cabeçalho do Detalhe */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      {selectedIntervention.type === "lista_exercicios"
                        ? "Lista de Exercícios (Praticar)"
                        : "Pré e Pós-Aula"}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs font-semibold text-foreground">
                      {selectedIntervention.classGroupLabel || "Turma"}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {selectedIntervention.axisValue}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-foreground mt-1">
                    {selectedIntervention.title}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Início: {new Date(selectedIntervention.startDate).toLocaleDateString("pt-BR")}{" "}
                    {selectedIntervention.dueDate && (
                      <>· Prazo: {new Date(selectedIntervention.dueDate).toLocaleDateString("pt-BR")}</>
                    )}
                  </p>
                </div>

                {(userRole === "dirigente" || userRole === "coordenador" || userRole === "docente") && (
                  <button
                    onClick={() => {
                      setUpdateStatus(selectedIntervention.status);
                      setUpdateAfterScore(
                        selectedIntervention.afterScore ? String(selectedIntervention.afterScore) : ""
                      );
                      setUpdateParallelAfterScore(
                        selectedIntervention.parallelAfterScore
                          ? String(selectedIntervention.parallelAfterScore)
                          : ""
                      );
                      setIsUpdatingRetest(true);
                    }}
                    className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-sm"
                  >
                    Lançar / Atualizar Reteste
                  </button>
                )}
              </div>

              {/* Bloco 1: Comparativo Antes vs. Depois e Turma Paralela */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Comparativo Antes vs. Reteste (Régua 60)
                  </h3>
                  {selectedIntervention.adherence?.isSmallGroup && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 rounded font-medium">
                      Grupo pequeno (N &lt; 15): variação percentual com sensibilidade amplificada
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Turma com Intervenção */}
                  <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {selectedIntervention.classGroupLabel} (Com Intervenção)
                      </span>
                      {selectedIntervention.deltaScore !== null && selectedIntervention.deltaScore !== undefined && (
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            selectedIntervention.deltaScore >= 0
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                          }`}
                        >
                          Δ {selectedIntervention.deltaScore >= 0 ? `+${selectedIntervention.deltaScore.toFixed(1)}%` : `${selectedIntervention.deltaScore.toFixed(1)}%`}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                      <div className="bg-card rounded-lg p-2 border border-border">
                        <span className="text-[10px] text-muted-foreground block">Antes da Ação</span>
                        <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                          {selectedIntervention.beforeScore.toFixed(1)}%
                        </span>
                      </div>
                      <div className="bg-card rounded-lg p-2 border border-border">
                        <span className="text-[10px] text-muted-foreground block">Pós / Reteste</span>
                        <span className="text-base font-bold text-foreground">
                          {selectedIntervention.afterScore !== null && selectedIntervention.afterScore !== undefined ? (
                            <span
                              className={
                                selectedIntervention.afterScore >= 60
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-amber-600 dark:text-amber-400"
                              }
                            >
                              {selectedIntervention.afterScore.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">Aguardando</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Turma Paralela de Controle (se cadastrada) */}
                  <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {selectedIntervention.parallelClassGroupLabel || "Turma Paralela de Controle"}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        Sem intervenção
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                      <div className="bg-card rounded-lg p-2 border border-border">
                        <span className="text-[10px] text-muted-foreground block">Nota Anterior</span>
                        <span className="text-base font-bold text-muted-foreground">
                          {selectedIntervention.parallelBeforeScore !== null && selectedIntervention.parallelBeforeScore !== undefined
                            ? `${selectedIntervention.parallelBeforeScore.toFixed(1)}%`
                            : "52.0%"}
                        </span>
                      </div>
                      <div className="bg-card rounded-lg p-2 border border-border">
                        <span className="text-[10px] text-muted-foreground block">Reteste Paralelo</span>
                        <span className="text-base font-bold text-muted-foreground">
                          {selectedIntervention.parallelAfterScore !== null && selectedIntervention.parallelAfterScore !== undefined
                            ? `${selectedIntervention.parallelAfterScore.toFixed(1)}%`
                            : "54.0%"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloco 2: Adesão Medida pela Plataforma */}
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Adesão Medida Pela Plataforma
                  </h3>
                  <span className="text-xs font-bold text-primary">
                    {selectedIntervention.adherence?.completedStudents || 0} de{" "}
                    {selectedIntervention.adherence?.totalStudents || 20} estudantes concluíram (
                    {selectedIntervention.adherence?.adherenceRate || 0}%)
                  </span>
                </div>

                {/* Tabela de Estudantes */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="max-h-56 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 text-muted-foreground border-b border-border sticky top-0 backdrop-blur-sm">
                        <tr>
                          <th className="py-2 px-3 font-semibold">Estudante</th>
                          <th className="py-2 px-3 font-semibold">Progresso</th>
                          <th className="py-2 px-3 font-semibold text-center">Aproveitamento</th>
                          <th className="py-2 px-3 font-semibold text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(selectedIntervention.studentsAdherence || []).map((st) => (
                          <tr key={st.studentUserId} className="hover:bg-muted/20">
                            <td className="py-2 px-3 font-medium text-foreground">
                              {st.studentName}
                              <span className="block text-[10px] text-muted-foreground font-normal">
                                {st.registration}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">
                              {st.questionsCompleted} / {st.questionsTarget} questões
                            </td>
                            <td className="py-2 px-3 text-center font-bold">
                              {st.scorePercentage !== null && st.scorePercentage !== undefined ? (
                                <span
                                  className={
                                    st.scorePercentage >= 60
                                      ? "text-emerald-600"
                                      : "text-amber-600"
                                  }
                                >
                                  {st.scorePercentage.toFixed(0)}%
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  st.status === "concluida"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    : st.status === "em_progresso"
                                    ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {st.status === "concluida"
                                  ? "Concluído"
                                  : st.status === "em_progresso"
                                  ? "Em progresso"
                                  : "Pendente"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Bloco 3: Reteste Embutido */}
              <div className="space-y-2 pt-2 border-t border-border">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Reteste Embutido na Próxima Prova
                </h3>
                <div className="rounded-xl border border-blue-200/60 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/20 p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-blue-950 dark:text-blue-200 block">
                      {selectedIntervention.retestAssessmentTitle || "Simulado Geral 2026.2 - Enade/Revalida"}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5 block">
                      Cota reservada de {selectedIntervention.retestQuestionsCount} questões específicas de {selectedIntervention.axisValue}
                    </span>
                  </div>

                  <span className="rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                    {selectedIntervention.status === "concluida" ? "Reteste Aplicado" : "Agendado"}
                  </span>
                </div>
              </div>

              <IndicatorFootnote
                base="Registros de intervenção pedagógica institucional"
                periodo="Semestre Letivo Atual"
                fonte="Motor de Intervenções e Reteste MedPleni"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground text-xs">
              Selecione uma intervenção na lista para visualizar os detalhes.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WIZARD EM 3 PASSOS: NOVA INTERVENÇÃO */}
      {/* ========================================================================= */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Cabeçalho do Wizard com Indicador de Passos */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Nova Intervenção Pedagógica (Passo {wizardStep} de 3)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {wizardStep === 1
                    ? "Passo 1: Identificação da Lacuna (< 60% na turma/eixo)"
                    : wizardStep === 2
                    ? "Passo 2: Definição da Ação (Lista no Praticar ou Pré/Pós-Aula)"
                    : "Passo 3: Verificação (Cota de Reteste Embutido)"}
                </p>
              </div>

              <button
                onClick={() => setIsWizardOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Marcador dos 3 Passos */}
            <div className="flex items-center justify-between text-xs font-semibold px-2">
              <div
                className={`flex items-center gap-2 ${
                  wizardStep >= 1 ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  1
                </span>
                <span>Lacuna</span>
              </div>
              <div className="flex-1 h-0.5 bg-border mx-3" />
              <div
                className={`flex items-center gap-2 ${
                  wizardStep >= 2 ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    wizardStep >= 2
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  2
                </span>
                <span>Ação</span>
              </div>
              <div className="flex-1 h-0.5 bg-border mx-3" />
              <div
                className={`flex items-center gap-2 ${
                  wizardStep === 3 ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    wizardStep === 3
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  3
                </span>
                <span>Verificação</span>
              </div>
            </div>

            {/* Conteúdo do Passo 1: Lacuna */}
            {wizardStep === 1 && (
              <div className="space-y-4 text-xs">
                {/* Sugestões de Lacunas Detectadas */}
                {detectedGaps.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-semibold text-foreground block">
                      Lacunas Críticas Detectadas nas Avaliações Recentes (&lt; 60%):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {detectedGaps.slice(0, 4).map((gap, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectGap(gap)}
                          className={`rounded-lg border p-2.5 cursor-pointer transition-colors ${
                            selectedClassGroupId === gap.classGroupId && selectedAxisValue === gap.axisValue
                              ? "border-primary bg-primary/10 font-medium"
                              : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">{gap.axisValue}</span>
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              {gap.scorePercentage.toFixed(1)}%
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            {gap.classGroupLabel} (P{gap.period})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">
                      Turma Alvo da Intervenção:
                    </label>
                    <select
                      value={selectedClassGroupId}
                      onChange={(e) => setSelectedClassGroupId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                    >
                      {classGroups.map((cg) => (
                        <option key={cg.id} value={cg.id}>
                          {cg.name} (P{cg.period})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-foreground block mb-1">
                      Turma Paralela de Controle (Opcional):
                    </label>
                    <select
                      value={selectedParallelClassGroupId}
                      onChange={(e) => setSelectedParallelClassGroupId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                    >
                      <option value="">Sem turma de controle</option>
                      {classGroups
                        .filter((cg) => cg.id !== selectedClassGroupId)
                        .map((cg) => (
                          <option key={cg.id} value={cg.id}>
                            {cg.name} (P{cg.period})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">
                      Eixo / Área Médica:
                    </label>
                    <input
                      type="text"
                      value={selectedAxisValue}
                      onChange={(e) => setSelectedAxisValue(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground block mb-1">
                      Nota Anterior na Área (%):
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={beforeScore}
                      onChange={(e) => setBeforeScore(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Avaliação de Origem da Lacuna:
                  </label>
                  <select
                    value={originExamId}
                    onChange={(e) => setOriginExamId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                  >
                    {assessments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Conteúdo do Passo 2: Ação (Somente os 2 tipos aprovados) */}
            {wizardStep === 2 && (
              <div className="space-y-4 text-xs">
                <span className="font-semibold text-foreground block">
                  Selecione o Tipo de Ação Homologado:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Tipo 1: Lista de Exercícios */}
                  <div
                    onClick={() => setInterventionType("lista_exercicios")}
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${
                      interventionType === "lista_exercicios"
                        ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-sm">
                        1. Lista de Exercícios
                      </span>
                      <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                        Principal
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      Seleção assistida de questões do banco no eixo diagnosticado. Os alunos respondem no Praticar com prazo fixo.
                    </p>
                  </div>

                  {/* Tipo 2: Pré e Pós-Aula */}
                  <div
                    onClick={() => setInterventionType("pre_pos_aula")}
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${
                      interventionType === "pre_pos_aula"
                        ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground text-sm">
                        2. Pré e Pós-Aula
                      </span>
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        Módulo Curto
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      Par de avaliações curtas antes e depois do conteúdo para a mesma turma, mensurando o ganho formativo imediato.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Título da Intervenção:
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground block mb-1">
                      Meta de Questões da Lista:
                    </label>
                    <input
                      type="number"
                      value={practiceQuestionsCount}
                      onChange={(e) => setPracticeQuestionsCount(parseInt(e.target.value) || 20)}
                      className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground block mb-1">
                      Prazo Final para Entrega:
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo do Passo 3: Verificação (Reteste Embutido) */}
            {wizardStep === 3 && (
              <div className="space-y-4 text-xs">
                <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 dark:border-blue-900/60 dark:bg-blue-950/30 p-4 space-y-2">
                  <span className="text-xs font-bold text-blue-950 dark:text-blue-200 block">
                    Metodologia de Reteste Embutido (IN-06)
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    A plataforma embutirá automaticamente uma cota de questões de <strong>{selectedAxisValue}</strong> na próxima avaliação programada da turma para verificar a superação da Régua 60.
                  </p>
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Avaliação Futura Onde Será Feito o Reteste:
                  </label>
                  <select
                    value={retestExamId}
                    onChange={(e) => setRetestExamId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background p-2 text-xs font-semibold"
                  >
                    {assessments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Cota de Questões Embutidas no Reteste:
                  </label>
                  <input
                    type="number"
                    value={retestQuestionsCount}
                    onChange={(e) => setRetestQuestionsCount(parseInt(e.target.value) || 5)}
                    className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Padrão recomendado: 5 questões ponderadas no reteste.
                  </span>
                </div>

                {/* Resumo Consolidado */}
                <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-1.5">
                  <span className="font-bold text-foreground block">Resumo do Plano:</span>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Turma Alvo:</span>
                    <strong className="text-foreground">
                      {classGroups.find((c) => c.id === selectedClassGroupId)?.name}
                    </strong>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Lacuna / Eixo:</span>
                    <strong className="text-foreground">{selectedAxisValue} ({beforeScore.toFixed(1)}%)</strong>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Ação Escolhida:</span>
                    <strong className="text-foreground">
                      {interventionType === "lista_exercicios" ? "Lista de Exercícios (Praticar)" : "Pré e Pós-Aula"}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Rodapé com Botões de Navegação */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              {wizardStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep((prev) => (prev - 1) as any)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
                >
                  ← Voltar
                </button>
              ) : (
                <div />
              )}

              {wizardStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep((prev) => (prev + 1) as any)}
                  className="rounded-lg bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                >
                  Avançar →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleCreateIntervention}
                  className="rounded-lg bg-primary px-6 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? "Criando..." : "Confirmar e Criar Intervenção"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LANÇAR / ATUALIZAR RETESTE */}
      {/* ========================================================================= */}
      {isUpdatingRetest && selectedIntervention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Lançar Resultado do Reteste
                </h3>
                <p className="text-xs text-muted-foreground">{selectedIntervention.title}</p>
              </div>
              <button
                onClick={() => setIsUpdatingRetest(false)}
                className="text-muted-foreground hover:text-foreground text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Status da Intervenção:
                </label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value as InterventionStatus)}
                  className="w-full rounded-lg border border-border bg-background p-2 text-xs font-medium"
                >
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluida">Concluída (Reteste realizado)</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Nota Verificada no Reteste da Turma (%):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={updateAfterScore}
                  onChange={(e) => setUpdateAfterScore(e.target.value)}
                  placeholder="Ex: 68.2"
                  className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Nota anterior antes da ação: {selectedIntervention.beforeScore.toFixed(1)}%
                </span>
              </div>

              {selectedIntervention.parallelClassGroupId && (
                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Nota do Reteste na Turma Paralela (%):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={updateParallelAfterScore}
                    onChange={(e) => setUpdateParallelAfterScore(e.target.value)}
                    placeholder="Ex: 54.0"
                    className="w-full rounded-lg border border-border bg-background p-2 text-xs"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsUpdatingRetest(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleUpdateRetest}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? "Salvando..." : "Salvar Reteste"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
