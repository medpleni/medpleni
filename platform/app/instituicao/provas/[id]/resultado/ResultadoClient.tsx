"use client";

import React, { useState, useMemo } from "react";
import {
  generateExportCSV,
  generateDataDictionary,
  calculateScoreDistribution,
  calculateExamSummaryStats,
  type AssessmentSummaryStats,
  type ScoreDistributionBucket,
  type AxisPerformanceResult,
  type ClassGroupResultItem,
  type StudentResultRow,
  type ExportStudentItemDetail,
} from "@/lib/b2b/results";
import {
  calculateExamPsychometrics,
  type ExamItemInput,
  type StudentExamAttemptInput,
  type ItemPsychometricsResult,
} from "@/lib/b2b/psychometrics";
import {
  annulAssessmentItemAction,
  changeItemCorrectOptionAction,
  markAbsentStudentsAction,
  closeAssessmentCorrectionAction,
  logStudentIndividualAccessAction,
} from "@/lib/b2b/results-actions";
import type { OptionLetter } from "@/lib/b2b/assessments";

interface ItemData {
  id: string;
  orderIndex: number;
  questionId?: string | null;
  statement: string;
  clinicalContext?: string | null;
  correctLetter: string;
  explanation?: string | null;
  status: string;
  weight: number;
  area: string;
  cenario?: string | null;
  tema?: string | null;
  competencia?: string | null;
  options: Array<{ letter: string; text: string; is_correct: boolean }>;
}

interface AdjustmentLog {
  id: string;
  itemId: string;
  actionType: string;
  previousLetter?: string | null;
  newLetter?: string | null;
  reason: string;
  createdAt: string;
  performedByName: string;
}

interface ResultadoClientProps {
  assessment: {
    id: string;
    title: string;
    type: string;
    modality: string;
    status: string;
    answersReleasedAt?: string | null;
    cutScore: number;
  };
  items: ItemData[];
  rawAttempts?: Array<{ id: string; studentUserId: string; status: string }>;
  rawAnswers?: Array<{
    attemptId: string;
    assessmentItemId: string;
    markedBaseLetter: string | null;
    isCorrect: boolean;
  }>;
  summaryStats: AssessmentSummaryStats;
  scoreDistribution: ScoreDistributionBucket[];
  axesPerformance: AxisPerformanceResult[];
  classGroups: Array<{ id: string; name: string; period: number }>;
  classGroupsPerformance: ClassGroupResultItem[];
  studentRows: StudentResultRow[];
  adjustments: AdjustmentLog[];
  exportRecords: ExportStudentItemDetail[];
}

export default function ResultadoClient({
  assessment,
  items,
  rawAttempts = [],
  rawAnswers = [],
  summaryStats: initialSummary,
  scoreDistribution: initialDistribution,
  axesPerformance,
  classGroups,
  classGroupsPerformance,
  studentRows,
  adjustments,
  exportRecords,
}: ResultadoClientProps) {
  // Aba principal: 'geral' (Visão Geral da Prova) ou 'questoes' (Análise das Questões PR-09 / QB-12)
  const [mainTab, setMainTab] = useState<"geral" | "questoes">("geral");

  // Filtro de turma para a curva de distribuição e estatísticas
  const [selectedClassGroupId, setSelectedClassGroupId] = useState<string>("all");

  // Abas de eixos e detalhamento
  const [activeAxisTab, setActiveAxisTab] = useState<string>(
    axesPerformance.length > 0 ? axesPerformance[0].axisType : "area"
  );
  const [detailSubTab, setDetailSubTab] = useState<"turmas" | "alunos">("turmas");

  // Filtros da aba de análise das questões
  const [filterOnlySignals, setFilterOnlySignals] = useState(false);
  const [selectedPsychItem, setSelectedPsychItem] = useState<ItemPsychometricsResult | null>(null);
  const [isFormulasModalOpen, setIsFormulasModalOpen] = useState(false);
  const [selectedFormulaTopic, setSelectedFormulaTopic] = useState<"geral" | "p" | "d" | "r" | "kr20">("geral");

  // Filtros da tabela de alunos
  const [studentSearch, setStudentSearch] = useState("");
  const [studentBandFilter, setStudentBandFilter] = useState<string>("all");

  // Modais de ação docente
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>(items[0]?.id || "");
  const [adjustActionType, setAdjustActionType] = useState<"anular" | "trocar_gabarito">("anular");
  const [newCorrectLetter, setNewCorrectLetter] = useState<OptionLetter>("A");
  const [adjustReason, setAdjustReason] = useState("");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);
  const [adjustFeedback, setAdjustFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Modal LGPD de visualização de aluno
  const [lgpdModalStudent, setLgpdModalStudent] = useState<StudentResultRow | null>(null);
  const [isLoggingLgpd, setIsLoggingLgpd] = useState(false);

  // Modal Dicionário de Dados
  const [isDictModalOpen, setIsDictModalOpen] = useState(false);

  // Estado de ações rápidas
  const [isMarkingAbsent, setIsMarkingAbsent] = useState(false);
  const [isClosingCorrection, setIsClosingCorrection] = useState(false);
  const [generalFeedback, setGeneralFeedback] = useState<string | null>(null);

  // ─── ANÁLISE PSICOMÉTRICA PURA (PR-09 / QB-12) ─────────────────────────────
  const examPsychometrics = useMemo(() => {
    const answersByAttempt = new Map<string, Map<string, string | null>>();
    rawAnswers.forEach((ans) => {
      const map = answersByAttempt.get(ans.attemptId) || new Map<string, string | null>();
      map.set(ans.assessmentItemId, ans.markedBaseLetter);
      answersByAttempt.set(ans.attemptId, map);
    });

    const attemptsInput: StudentExamAttemptInput[] = rawAttempts.map((att) => ({
      studentUserId: att.studentUserId,
      status: att.status,
      answers: answersByAttempt.get(att.id) || new Map(),
    }));

    const itemsInput: ExamItemInput[] = items.map((it) => ({
      id: it.id,
      orderIndex: it.orderIndex,
      questionId: it.questionId,
      statement: it.statement,
      clinicalContext: it.clinicalContext,
      correctLetter: it.correctLetter,
      explanation: it.explanation,
      status: it.status,
      area: it.area,
      cenario: it.cenario,
      tema: it.tema,
      competencia: it.competencia,
      options: it.options,
    }));

    return calculateExamPsychometrics({
      items: itemsInput,
      attempts: attemptsInput,
    });
  }, [items, rawAttempts, rawAnswers]);

  // Itens psicométricos filtrados por "Só as com sinal"
  const displayedPsychItems = useMemo(() => {
    if (!filterOnlySignals) return examPsychometrics.items;
    return examPsychometrics.items.filter((item) => item.hasSignal);
  }, [examPsychometrics, filterOnlySignals]);

  // ─── CÁLCULOS FILTRADOS POR TURMA ──────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    if (selectedClassGroupId === "all") return studentRows;
    return studentRows.filter((s) => s.classGroupId === selectedClassGroupId);
  }, [studentRows, selectedClassGroupId]);

  const currentSummary = useMemo(() => {
    if (selectedClassGroupId === "all") return initialSummary;

    const presentScores = filteredStudents
      .filter((s) => s.status === "presente")
      .map((s) => s.scorePercentage);

    const absentCount = filteredStudents.filter((s) => s.status === "ausente").length;
    const cgName = classGroups.find((c) => c.id === selectedClassGroupId)?.name || "Turma";

    return calculateExamSummaryStats({
      presentScores,
      totalEnrolled: filteredStudents.length,
      totalAbsent: absentCount,
      cutScore: assessment.cutScore,
      academicTermLabel: "2027.1",
      assessmentTitle: `${assessment.title} (${cgName})`,
    });
  }, [selectedClassGroupId, filteredStudents, initialSummary, classGroups, assessment]);

  const currentDistribution = useMemo(() => {
    if (selectedClassGroupId === "all") return initialDistribution;
    const presentScores = filteredStudents
      .filter((s) => s.status === "presente")
      .map((s) => s.scorePercentage);

    return calculateScoreDistribution(
      presentScores,
      assessment.cutScore,
      currentSummary.medianScore
    );
  }, [selectedClassGroupId, filteredStudents, initialDistribution, assessment.cutScore, currentSummary]);

  // Alunos filtrados por busca e faixa
  const searchedStudents = useMemo(() => {
    return filteredStudents.filter((st) => {
      const matchSearch =
        st.studentName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        st.studentRa.toLowerCase().includes(studentSearch.toLowerCase());
      const matchBand =
        studentBandFilter === "all" || st.performanceBand === studentBandFilter;
      return matchSearch && matchBand;
    });
  }, [filteredStudents, studentSearch, studentBandFilter]);

  // ─── HANDLERS DE AÇÕES DOCENTES ───────────────────────────────────────────

  const handleApplyAdjustment = async () => {
    if (!adjustReason || adjustReason.trim().length < 5) {
      setAdjustFeedback({ type: "error", msg: "A justificativa formal é obrigatória (mínimo 5 caracteres)." });
      return;
    }

    setIsSubmittingAdjust(true);
    setAdjustFeedback(null);

    let res;
    if (adjustActionType === "anular") {
      res = await annulAssessmentItemAction({
        assessmentId: assessment.id,
        itemId: selectedItemId,
        reason: adjustReason,
      });
    } else {
      res = await changeItemCorrectOptionAction({
        assessmentId: assessment.id,
        itemId: selectedItemId,
        newLetter: newCorrectLetter,
        reason: adjustReason,
      });
    }

    setIsSubmittingAdjust(false);

    if (res.success) {
      setAdjustFeedback({
        type: "success",
        msg: `Ajuste aplicado com sucesso! ${res.recalculatedAttemptsCount || 0} tentativas recalculadas.`,
      });
      setAdjustReason("");
      setTimeout(() => {
        setIsAdjustModalOpen(false);
        setAdjustFeedback(null);
        window.location.reload();
      }, 1200);
    } else {
      setAdjustFeedback({ type: "error", msg: res.error || "Erro ao processar ajuste." });
    }
  };

  const handleMarkAbsent = async () => {
    if (!confirm("Deseja marcar como ausentes todos os alunos convocados que não entregaram a avaliação?")) {
      return;
    }
    setIsMarkingAbsent(true);
    const res = await markAbsentStudentsAction(assessment.id);
    setIsMarkingAbsent(false);
    if (res.success) {
      setGeneralFeedback(`${res.markedAbsentCount} aluno(s) marcado(s) como ausente(s).`);
      setTimeout(() => window.location.reload(), 1000);
    } else {
      alert(res.error || "Erro ao marcar ausentes.");
    }
  };

  const handleCloseCorrection = async () => {
    if (!confirm("Deseja concluir o período de correção desta avaliação? O status mudará para 'Corrigida'.")) {
      return;
    }
    setIsClosingCorrection(true);
    const res = await closeAssessmentCorrectionAction(assessment.id);
    setIsClosingCorrection(false);
    if (res.success) {
      setGeneralFeedback("Correção da avaliação concluída formalmente!");
      setTimeout(() => window.location.reload(), 1000);
    } else {
      alert(res.error || "Erro ao concluir correção.");
    }
  };

  const handleDownloadCSV = () => {
    const csvData = generateExportCSV(exportRecords);
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medpleni_export_${assessment.id.slice(0, 8)}_aluno_item.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmLgpdView = async () => {
    if (!lgpdModalStudent) return;
    setIsLoggingLgpd(true);
    await logStudentIndividualAccessAction({
      studentUserId: lgpdModalStudent.studentUserId,
      reason: `Consulta de devolutiva individual da prova ${assessment.title}`,
      metadata: { assessmentId: assessment.id, scorePercentage: lgpdModalStudent.scorePercentage },
    });
    setIsLoggingLgpd(false);
    const studentId = lgpdModalStudent.studentUserId;
    setLgpdModalStudent(null);
    window.location.href = `/instituicao/aluno/prova/${assessment.id}/resultado?studentId=${studentId}`;
  };

  // Eixo selecionado
  const activeAxisData = axesPerformance.find((ax) => ax.axisType === activeAxisTab);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── BLOCO 1: CABEÇALHO, STATUS E AÇÕES DE FECHAMENTO (MÁX 5 BLOCOS) ─── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wider">
                {assessment.type.replace(/_/g, " ")}
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  assessment.status === "corrigida"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400"
                }`}
              >
                Status: {assessment.status}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                Modalidade: {assessment.modality}
              </span>
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              {assessment.title}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Resultado consolidado da prova institucional com análise psicométrica, curvas de distribuição e conformidade LGPD.
            </p>
          </div>

          {/* Barra de Ações Rápidas */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsAdjustModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors"
            >
              ⚙ Ajustar / Anular Item
            </button>
            <button
              onClick={handleMarkAbsent}
              disabled={isMarkingAbsent}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors disabled:opacity-50"
            >
              {isMarkingAbsent ? "Marcando..." : "Marcar Ausentes"}
            </button>
            {assessment.status !== "corrigida" && (
              <button
                onClick={handleCloseCorrection}
                disabled={isClosingCorrection}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isClosingCorrection ? "Concluindo..." : "Concluir Correção"}
              </button>
            )}
            <button
              onClick={handleDownloadCSV}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              title="Exportar Aluno × Item × Alternativa com Mapa de Embaralhamento"
            >
              Exportar Dados (CSV)
            </button>
            <button
              onClick={() => setIsDictModalOpen(true)}
              className="px-2 py-1.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              title="Ver Dicionário de Dados da Exportação"
            >
              Dicionário
            </button>
          </div>
        </div>

        {generalFeedback && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium dark:bg-emerald-950/40 dark:text-emerald-300">
            ✓ {generalFeedback}
          </div>
        )}
      </div>

      {/* ─── NAVEGAÇÃO PRINCIPAL: VISÃO GERAL VS ANÁLISE DAS QUESTÕES ─── */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setMainTab("geral")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
            mainTab === "geral"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Visão Geral &amp; Distribuição</span>
        </button>

        <button
          onClick={() => setMainTab("questoes")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 ${
            mainTab === "questoes"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Análise das Questões (PR-09 / QB-12)</span>
          {examPsychometrics.itemsWithSignalsCount > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                mainTab === "questoes"
                  ? "bg-amber-400 text-amber-950"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
              }`}
            >
              {examPsychometrics.itemsWithSignalsCount} com sinal
            </span>
          )}
        </button>
      </div>

      {mainTab === "geral" ? (
        <>
      {/* ─── BLOCO 2: RESUMO ESTATÍSTICO COM RODAPÉ BASE/PERÍODO/FONTE ─── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Resumo Estatístico da Avaliação
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">Filtrar por Turma:</label>
            <select
              value={selectedClassGroupId}
              onChange={(e) => setSelectedClassGroupId(e.target.value)}
              className="text-xs rounded-lg border border-border bg-background px-2.5 py-1 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="all">Todas as turmas convocadas ({studentRows.length} alunos)</option>
              {classGroups.map((cg) => (
                <option key={cg.id} value={cg.id}>
                  {cg.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Presentes */}
          <div className="bg-muted/40 border border-border/80 rounded-lg p-3">
            <div className="text-[11px] font-medium text-muted-foreground">Presentes / Ausentes</div>
            <div className="text-xl font-extrabold text-foreground mt-1">
              {currentSummary.totalPresent}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                de {currentSummary.totalEnrolled}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {currentSummary.totalAbsent} ausente(s) registrado(s)
            </div>
          </div>

          {/* Card 2: Média */}
          <div className="bg-muted/40 border border-border/80 rounded-lg p-3">
            <div className="text-[11px] font-medium text-muted-foreground">Média das Notas</div>
            <div className="text-xl font-extrabold text-foreground mt-1">
              {currentSummary.meanScore}%
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Escala de acerto 0 a 100%
            </div>
          </div>

          {/* Card 3: Mediana */}
          <div className="bg-muted/40 border border-border/80 rounded-lg p-3">
            <div className="text-[11px] font-medium text-muted-foreground">Mediana (P50)</div>
            <div className="text-xl font-extrabold text-foreground mt-1">
              {currentSummary.medianScore}%
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              50% dos alunos acima/abaixo
            </div>
          </div>

          {/* Card 4: Intervalo Interquartil P25 - P75 */}
          <div className="bg-muted/40 border border-border/80 rounded-lg p-3">
            <div className="text-[11px] font-medium text-muted-foreground">Faixa Central (P25–P75)</div>
            <div className="text-xl font-extrabold text-foreground mt-1">
              {currentSummary.p25}% – {currentSummary.p75}%
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Intervalo interquartil
            </div>
          </div>

          {/* Card 5: Abaixo do Corte (60%) */}
          <div className="bg-muted/40 border border-border/80 rounded-lg p-3">
            <div className="text-[11px] font-medium text-muted-foreground">Abaixo do Corte (&lt; {currentSummary.cutScore}%)</div>
            <div
              className={`text-xl font-extrabold mt-1 ${
                currentSummary.belowCutScorePercentage > 30
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-foreground"
              }`}
            >
              {currentSummary.belowCutScorePercentage}%
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {currentSummary.belowCutScoreCount} aluno(s) na zona de atenção
            </div>
          </div>
        </div>

        {/* Rodapé Base / Período / Fonte conforme ESPEC */}
        <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between text-[11px] text-muted-foreground gap-2">
          <span>{currentSummary.footer.base}</span>
          <span>{currentSummary.footer.period}</span>
          <span>{currentSummary.footer.source}</span>
        </div>
      </div>

      {/* ─── BLOCO 3: CURVA DE DISTRIBUIÇÃO EM FAIXAS DE 5 PONTOS ─── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Curva de Distribuição das Notas (Faixas de 5 Pontos)
            </h2>
            <p className="text-xs text-muted-foreground">
              Distribuição de frequência dos alunos presentes. Linha de referência no corte institucional de 60% e mediana indicada.
            </p>
          </div>
          <div className="text-xs font-semibold text-muted-foreground flex items-center gap-3">
            <span>Nota Mínima: <strong className="text-foreground">{currentSummary.minScore}%</strong></span>
            <span>Nota Máxima: <strong className="text-foreground">{currentSummary.maxScore}%</strong></span>
          </div>
        </div>

        {/* Histograma em 20 Faixas */}
        <div className="h-56 w-full flex items-end gap-1.5 pt-6 pb-2 px-1 border-b border-border overflow-x-auto">
          {currentDistribution.map((bucket) => {
            const maxCount = Math.max(...currentDistribution.map((b) => b.count), 1);
            const heightPercent = Math.max(6, Math.round((bucket.count / maxCount) * 100));

            const isCutLine = bucket.min === 60;
            const isBelowCut = bucket.max <= 60;

            return (
              <div
                key={bucket.index}
                className="flex-1 min-w-[28px] h-full flex flex-col justify-end items-center relative group"
              >
                {/* Linha do corte de 60 */}
                {isCutLine && (
                  <div
                    className="absolute -top-4 bottom-0 left-0 w-0.5 bg-rose-500 z-10"
                    title="Linha do Corte (60%)"
                  >
                    <span className="absolute -top-4 -left-3 text-[9px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-1 rounded">
                      Corte 60%
                    </span>
                  </div>
                )}

                {/* Marcador de Mediana */}
                {bucket.isMedianBucket && (
                  <div className="absolute -top-5 text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-1 rounded border border-amber-300">
                    Mediana
                  </div>
                )}

                {/* Valor no topo da coluna */}
                {bucket.count > 0 && (
                  <span className="text-[10px] font-semibold text-muted-foreground mb-1">
                    {bucket.count}
                  </span>
                )}

                {/* Barra */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-sm transition-all duration-200 ${
                    isBelowCut
                      ? "bg-rose-200 dark:bg-rose-900/60 hover:bg-rose-300"
                      : "bg-emerald-200 dark:bg-emerald-900/60 hover:bg-emerald-300"
                  } ${bucket.isMedianBucket ? "ring-2 ring-amber-500" : ""}`}
                />

                {/* Rótulo da faixa */}
                <span className="text-[9px] font-medium text-muted-foreground mt-1.5 -rotate-45 sm:rotate-0 whitespace-nowrap">
                  {bucket.min}
                </span>

                {/* Tooltip ao passar o mouse */}
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-popover text-popover-foreground border border-border shadow-md rounded px-2 py-1 text-[11px] whitespace-nowrap z-20">
                  <span className="font-bold">{bucket.rangeLabel}</span>
                  <span>{bucket.count} aluno(s) ({bucket.percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-300 dark:bg-rose-900" />
              Abaixo do Corte (&lt; 60%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-300 dark:bg-emerald-900" />
              Proficiente (&ge; 60%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm border-2 border-amber-500" />
              Faixa da Mediana ({currentSummary.medianScore}%)
            </span>
          </div>
          <span>Total de faixas: 20</span>
        </div>
      </div>

      {/* ─── BLOCO 4: RENDIMENTO POR EIXO COM TOTAL GERAL AO LADO (PR-08 / TC-07) ─── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Rendimento por Eixo Taxonômico (PR-08)
            </h2>
            <p className="text-xs text-muted-foreground">
              Desempenho por categoria. Conforme ajuste TC-07, o rendimento total geral da avaliação é exibido ao lado para comparação.
            </p>
          </div>

          {/* Abas dos Eixos Existentes na Prova */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            {axesPerformance.map((ax) => (
              <button
                key={ax.axisType}
                onClick={() => setActiveAxisTab(ax.axisType)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  activeAxisTab === ax.axisType
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {ax.axisLabel}
              </button>
            ))}
          </div>
        </div>

        {activeAxisData ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Tabela de categorias do eixo (3 colunas na grade) */}
            <div className="lg:col-span-3 border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">{activeAxisData.axisLabel}</th>
                    <th className="py-2.5 px-3 text-center">Nº Questões</th>
                    <th className="py-2.5 px-3 text-right">Acerto Médio</th>
                    <th className="py-2.5 px-3 text-center">Status Amostral</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeAxisData.items.map((cat) => (
                    <tr key={cat.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-medium text-foreground">{cat.name}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{cat.totalValidQuestions}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-foreground">
                        {cat.averageScorePercentage}%
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {cat.hasLowQuestionCountWarning ? (
                          <span
                            className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
                            title={cat.warningText}
                          >
                            ⚠ Amostra &lt; 5 itens
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                            ✓ Representativa
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Card Fixo: Rendimento Total Geral da Prova (Ajuste TC-07) */}
            <div className="border border-border bg-muted/20 rounded-lg p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Ajuste TC-07 • Referência
                </span>
                <h3 className="text-sm font-bold text-foreground mt-1">Total Geral da Prova</h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Média consolidada de todas as áreas e itens válidos da avaliação para contraste com as categorias ao lado.
                </p>

                <div className="mt-4 pt-3 border-t border-border">
                  <div className="text-2xl font-black text-foreground">
                    {activeAxisData.overallExamAverage}%
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Média de todos os alunos presentes
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 text-[10px] text-muted-foreground">
                Regra: Áreas com menos de 5 questões sofrem oscilação estatística acentuada.
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Nenhuma questão da avaliação foi categorizada com este eixo.
          </div>
        )}
      </div>

      {/* ─── BLOCO 5: TABELAS DETALHADAS (TURMAS × RESULTADO & ALUNOS COM VARIAÇÃO) ─── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDetailSubTab("turmas")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                detailSubTab === "turmas"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              Tabela Turmas × Resultado ({classGroupsPerformance.length})
            </button>
            <button
              onClick={() => setDetailSubTab("alunos")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                detailSubTab === "alunos"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              Tabela de Alunos Convocados ({searchedStudents.length})
            </button>
          </div>

          {detailSubTab === "alunos" && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Buscar por nome ou RA..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="text-xs rounded-lg border border-border bg-background px-3 py-1 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary w-44"
              />
              <select
                value={studentBandFilter}
                onChange={(e) => setStudentBandFilter(e.target.value)}
                className="text-xs rounded-lg border border-border bg-background px-2.5 py-1 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="all">Todas as faixas</option>
                <option value="ate_50">Até 50% (Crítico)</option>
                <option value="faixa_51_60">51–60% (Zona de Decisão)</option>
                <option value="faixa_61_70">61–70% (Proficiente)</option>
                <option value="faixa_71_mais">71%+ (Excelente)</option>
              </select>
            </div>
          )}
        </div>

        {/* SUB-ABA 1: TURMAS × RESULTADO */}
        {detailSubTab === "turmas" && (
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Turma Convocada</th>
                  <th className="py-2.5 px-3 text-center">Convocados</th>
                  <th className="py-2.5 px-3 text-center">Presentes</th>
                  <th className="py-2.5 px-3 text-center">Ausentes</th>
                  <th className="py-2.5 px-3 text-right">Média Turma</th>
                  <th className="py-2.5 px-3 text-right">Mediana</th>
                  <th className="py-2.5 px-3 text-right">% &lt; 60%</th>
                  <th className="py-2.5 px-3 text-right">Δ vs Média Geral</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {classGroupsPerformance.map((cg) => (
                  <tr key={cg.classGroupId} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-semibold text-foreground">
                      {cg.classGroupName}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">{cg.totalEnrolled}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-emerald-600 font-bold">
                      {cg.totalPresent}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-rose-600">
                      {cg.totalAbsent}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-foreground">
                      {cg.meanScore}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">{cg.medianScore}%</td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {cg.belowCutScorePercentage}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      <span
                        className={
                          cg.deltaFromExamAverage >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }
                      >
                        {cg.deltaFromExamAverage >= 0 ? "+" : ""}
                        {cg.deltaFromExamAverage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SUB-ABA 2: ALUNOS CONVOCADOS COM VARIAÇÃO HISTÓRICA & LGPD */}
        {detailSubTab === "alunos" && (
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Estudante</th>
                  <th className="py-2.5 px-3">RA</th>
                  <th className="py-2.5 px-3">Turma</th>
                  <th className="py-2.5 px-3 text-center">Caderno</th>
                  <th className="py-2.5 px-3 text-right">Nota Bruta</th>
                  <th className="py-2.5 px-3 text-right">Nota (%)</th>
                  <th className="py-2.5 px-3 text-center">Faixa Desempenho</th>
                  <th className="py-2.5 px-3 text-center">Variação vs Prova Anterior</th>
                  <th className="py-2.5 px-3 text-center">Acesso Individual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {searchedStudents.map((st) => (
                  <tr key={st.studentUserId} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-semibold text-foreground">
                      {st.studentName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">{st.studentRa}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{st.classGroupName}</td>
                    <td className="py-2.5 px-3 text-center font-bold">{st.formCode}</td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {st.status === "presente" ? st.scoreRaw : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-foreground">
                      {st.status === "presente" ? `${st.scorePercentage}%` : "Ausente"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {st.status === "presente" ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${st.bandColor}`}
                        >
                          {st.bandLabel}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Ausente</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {st.previousScoreDelta !== null && st.previousScoreDelta !== undefined ? (
                        <div
                          className="cursor-help inline-flex items-center gap-1 font-bold"
                          title={st.previousExamComparisonNotice}
                        >
                          <span
                            className={
                              st.previousScoreDelta >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }
                          >
                            {st.previousScoreDelta >= 0 ? "+" : ""}
                            {st.previousScoreDelta}%
                          </span>
                          <span className="text-[9px] text-muted-foreground">ℹ</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">1ª Prova</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => setLgpdModalStudent(st)}
                        className="px-2 py-1 text-[11px] font-semibold rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
                      >
                        Ver Devolutiva
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      ) : (
        /* ─── ABA ANÁLISE DAS QUESTÕES (PR-09 / QB-12) ─── */
        <div className="space-y-6">
          {/* BLOCO 1: CONFIABILIDADE DA PROVA (KR-20) E AVISOS DE AMOSTRA */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Consistência Interna &amp; Confiabilidade (PR-09)
                  </span>
                  {examPsychometrics.kr20 !== null && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        examPsychometrics.kr20 >= 0.8
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : examPsychometrics.kr20 >= 0.7
                          ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                          : examPsychometrics.kr20 >= 0.6
                          ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                          : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                      }`}
                    >
                      {examPsychometrics.kr20 >= 0.8
                        ? "Excelente"
                        : examPsychometrics.kr20 >= 0.7
                        ? "Boa"
                        : examPsychometrics.kr20 >= 0.6
                        ? "Moderada"
                        : "Baixa"}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-2xl font-black text-foreground">
                    KR-20 = {examPsychometrics.kr20 !== null ? examPsychometrics.kr20.toFixed(2) : "—"}
                  </h2>
                  <span className="text-xs text-muted-foreground font-mono">
                    (k = {examPsychometrics.validItemsCount} válidas • n = {examPsychometrics.sampleSize} alunos)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                  {examPsychometrics.kr20Interpretation}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setSelectedFormulaTopic("kr20");
                    setIsFormulasModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors"
                >
                  ℹ Como o KR-20 é calculado?
                </button>
                <button
                  onClick={() => {
                    setSelectedFormulaTopic("geral");
                    setIsFormulasModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Guia de Fórmulas &amp; Sinais
                </button>
              </div>
            </div>

            {/* Aviso de Amostra Pequena / Abaixo do Mínimo */}
            {examPsychometrics.sampleWarningMessage && (
              <div
                className={`mt-4 p-3 rounded-lg border text-xs flex items-center gap-2.5 ${
                  examPsychometrics.isSampleBelowMinimum
                    ? "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
                    : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300"
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border">
                  {examPsychometrics.isSampleBelowMinimum ? "Amostra Insuficiente" : "Atenção"}
                </span>
                <span className="font-medium">{examPsychometrics.sampleWarningMessage}</span>
              </div>
            )}

            {/* Grid com métricas da prova */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/60 text-xs">
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                <div className="text-[10px] text-muted-foreground">Média de Acertos Válidos</div>
                <div className="text-base font-bold text-foreground mt-0.5">
                  {examPsychometrics.meanScore} de {examPsychometrics.validItemsCount}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                <div className="text-[10px] text-muted-foreground">Variância Populacional (σ²)</div>
                <div className="text-base font-bold text-foreground mt-0.5">
                  {examPsychometrics.scoreVariance.toFixed(2)}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                <div className="text-[10px] text-muted-foreground">Itens com Sinal Psicométrico</div>
                <div className="text-base font-bold text-foreground mt-0.5">
                  {examPsychometrics.itemsWithSignalsCount} de {examPsychometrics.totalItems} (
                  {examPsychometrics.totalItems > 0
                    ? ((examPsychometrics.itemsWithSignalsCount / examPsychometrics.totalItems) * 100).toFixed(0)
                    : 0}
                  %)
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                <div className="text-[10px] text-muted-foreground">Itens Anulados / Válidos</div>
                <div className="text-base font-bold text-foreground mt-0.5">
                  {examPsychometrics.annulledItemsCount} anulado(s) • {examPsychometrics.validItemsCount} válido(s)
                </div>
              </div>
            </div>
          </div>

          {/* BLOCO 2: TABELA DE QUESTÕES COM FILTRO E SINAIS */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Tabela Psicométrica por Questão
                </h3>
                <p className="text-xs text-muted-foreground">
                  Clique em qualquer questão para abrir o enunciado completo, alternativas, gabarito e análise clínica.
                </p>
              </div>

              {/* Controles de Filtro */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-foreground px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors">
                  <input
                    type="checkbox"
                    checked={filterOnlySignals}
                    onChange={(e) => setFilterOnlySignals(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Só as com sinal ({examPsychometrics.itemsWithSignalsCount})</span>
                </label>

                <span className="text-xs text-muted-foreground">
                  Exibindo {displayedPsychItems.length} de {examPsychometrics.totalItems} questões
                </span>
              </div>
            </div>

            {/* Tabela de Itens */}
            <div className="border border-border rounded-lg overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Questão</th>
                    <th className="py-2.5 px-3">Classificação</th>
                    <th className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedFormulaTopic("p");
                          setIsFormulasModalOpen(true);
                        }}
                        className="hover:underline inline-flex items-center gap-1 font-semibold"
                        title="Ver fórmula do Índice de Facilidade"
                      >
                        Facilidade (p) ℹ
                      </button>
                    </th>
                    <th className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedFormulaTopic("d");
                          setIsFormulasModalOpen(true);
                        }}
                        className="hover:underline inline-flex items-center gap-1 font-semibold"
                        title="Ver fórmula do Índice de Discriminação"
                      >
                        Discriminação (D) ℹ
                      </button>
                    </th>
                    <th className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedFormulaTopic("r");
                          setIsFormulasModalOpen(true);
                        }}
                        className="hover:underline inline-flex items-center gap-1 font-semibold"
                        title="Ver fórmula da Ponto-Bisserial Corrigida"
                      >
                        Ponto-Bisserial (r) ℹ
                      </button>
                    </th>
                    <th className="py-2.5 px-3 text-center min-w-[160px]">
                      Distribuição de Respostas (A–E)
                    </th>
                    <th className="py-2.5 px-3 text-center min-w-[140px]">Sinais Psicométricos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayedPsychItems.map((item) => (
                    <tr
                      key={item.itemId}
                      onClick={() => setSelectedPsychItem(item)}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      {/* Questão */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground hover:text-primary transition-colors">
                            Q{item.orderIndex < 10 ? `0${item.orderIndex}` : item.orderIndex}
                          </span>
                          {item.isAnulado && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Anulada
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[200px]" title={item.statement}>
                          {item.statement}
                        </p>
                      </td>

                      {/* Classificação */}
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-foreground block">{item.area}</span>
                        {item.tema && (
                          <span className="text-[10px] text-muted-foreground block truncate max-w-[150px]">
                            {item.tema}
                          </span>
                        )}
                      </td>

                      {/* Facilidade (p) */}
                      <td className="py-2.5 px-3 text-center">
                        {item.facilityIndex !== null ? (
                          <div>
                            <span
                              className={`font-bold block ${
                                item.facilityIndex > 0.9
                                  ? "text-sky-600 dark:text-sky-400"
                                  : item.facilityIndex < 0.2
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-foreground"
                              }`}
                            >
                              {(item.facilityIndex * 100).toFixed(1)}%
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              p = {item.facilityIndex.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Discriminação (D) */}
                      <td className="py-2.5 px-3 text-center">
                        {item.discriminationIndex !== null ? (
                          <span
                            className={`font-bold ${
                              item.discriminationIndex >= 0.4
                                ? "text-emerald-600 dark:text-emerald-400"
                                : item.discriminationIndex >= 0.2
                                ? "text-foreground"
                                : item.discriminationIndex >= 0
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {item.discriminationIndex > 0 ? "+" : ""}
                            {item.discriminationIndex.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]" title="Amostra < 10 ou item anulado">
                            —
                          </span>
                        )}
                      </td>

                      {/* Ponto-Bisserial Corrigida (r) */}
                      <td className="py-2.5 px-3 text-center">
                        {item.correctedPointBiserial !== null ? (
                          <span
                            className={`font-bold ${
                              item.correctedPointBiserial >= 0.3
                                ? "text-emerald-600 dark:text-emerald-400"
                                : item.correctedPointBiserial >= 0.2
                                ? "text-foreground"
                                : item.correctedPointBiserial >= 0
                                ? "text-orange-600 dark:text-orange-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {item.correctedPointBiserial > 0 ? "+" : ""}
                            {item.correctedPointBiserial.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]" title="Variância zero ou amostra < 10">
                            —
                          </span>
                        )}
                      </td>

                      {/* Barras de Alternativas (A–E) */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1 justify-center">
                          {item.optionFrequencies.map((opt) => (
                            <div
                              key={opt.letter}
                              className={`flex flex-col items-center justify-end p-1 rounded min-w-[28px] text-[10px] transition-transform hover:scale-105 ${
                                opt.isCorrect
                                  ? "bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold dark:bg-emerald-950/60 dark:border-emerald-700 dark:text-emerald-200"
                                  : opt.letter === item.dominantDistractorLetter
                                  ? "bg-purple-100 border border-purple-300 text-purple-900 font-bold dark:bg-purple-950/60 dark:border-purple-700 dark:text-purple-200"
                                  : "bg-muted/60 text-muted-foreground"
                              }`}
                              title={`${opt.letter}: ${opt.count} aluno(s) (${opt.percentage}%) ${
                                opt.isCorrect ? "— GABARITO OFICIAL" : ""
                              }`}
                            >
                              <span className="font-mono">
                                {opt.letter}
                                {opt.isCorrect && "✓"}
                              </span>
                              <span className="text-[9px] font-mono mt-0.5">{opt.percentage.toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Sinais */}
                      <td className="py-2.5 px-3 text-center">
                        {item.flags.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {item.flags.map((flag) => (
                              <span
                                key={flag.type}
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${flag.badgeClass}`}
                                title={flag.description}
                              >
                                {flag.shortLabel}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            ✓ Equilibrado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: AJUSTAR QUESTÃO (ANULAR / TROCAR GABARITO) ─── */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground">
                Ajuste e Recálculo de Questão da Prova
              </h3>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Selecione a Questão:</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border bg-background px-3 py-1.5 text-foreground mt-1"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      Questão {it.orderIndex} — Gabarito Atual: {it.correctLetter} ({it.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Ação Desejada:</label>
                <div className="flex items-center gap-3 mt-1">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="radio"
                      name="adjustType"
                      checked={adjustActionType === "anular"}
                      onChange={() => setAdjustActionType("anular")}
                    />
                    Anular Questão (exclui do cálculo sem penalizar alunos)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="radio"
                      name="adjustType"
                      checked={adjustActionType === "trocar_gabarito"}
                      onChange={() => setAdjustActionType("trocar_gabarito")}
                    />
                    Trocar Gabarito
                  </label>
                </div>
              </div>

              {adjustActionType === "trocar_gabarito" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Nova Alternativa Correta:</label>
                  <div className="flex items-center gap-2 mt-1">
                    {(["A", "B", "C", "D", "E"] as OptionLetter[]).map((letter) => (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => setNewCorrectLetter(letter)}
                        className={`w-9 h-9 rounded-lg font-bold text-xs border ${
                          newCorrectLetter === letter
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Justificativa Pedagógica Formal (obrigatória para auditoria):
                </label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ex: Item anulado por duplicidade de gabarito técnico entre as alternativas B e C..."
                  rows={3}
                  className="w-full text-xs rounded-lg border border-border bg-background p-2.5 text-foreground mt-1 focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              {adjustFeedback && (
                <div
                  className={`p-2.5 rounded text-xs font-medium ${
                    adjustFeedback.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {adjustFeedback.msg}
                </div>
              )}

              {/* Histórico de Auditoria de Ajustes Anteriores */}
              {adjustments && adjustments.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <span className="text-[11px] font-bold text-foreground uppercase tracking-wider block mb-1.5">
                    Histórico de Auditoria ({adjustments.length} registro(s))
                  </span>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {adjustments.map((adj) => (
                      <div key={adj.id} className="p-2 rounded bg-muted/40 border border-border text-[11px]">
                        <div className="flex items-center justify-between font-semibold">
                          <span>
                            {adj.actionType === "anular" ? "Anulação de Item" : `Gabarito Retificado: ${adj.previousLetter} ➔ ${adj.newLetter}`}
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            {new Date(adj.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[10px] mt-0.5">&ldquo;{adj.reason}&rdquo;</p>
                        <div className="text-[9px] text-muted-foreground mt-0.5">Por: {adj.performedByName}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyAdjustment}
                disabled={isSubmittingAdjust}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmittingAdjust ? "Processando e recalculando..." : "Confirmar e Recalcular Notas"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: AVISO E REGISTRO LGPD PARA VISUALIZAÇÃO DE ALUNO ─── */}
      {lgpdModalStudent && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <h3>Aviso de Conformidade e Auditoria LGPD</h3>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Você está prestes a acessar os dados individuais e a devolutiva detalhada do estudante{" "}
              <strong className="text-foreground">{lgpdModalStudent.studentName}</strong> (
              {lgpdModalStudent.studentRa}).
            </p>
            <p className="text-[11px] text-muted-foreground bg-muted p-2.5 rounded-lg border border-border">
              Conforme as diretrizes institucionais e a legislação de proteção de dados (LGPD), este acesso será
              formalmente registrado em log de auditoria com seu usuário, data e finalidade pedagógica.
            </p>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <button
                onClick={() => setLgpdModalStudent(null)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border bg-background hover:bg-muted"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmLgpdView}
                disabled={isLoggingLgpd}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isLoggingLgpd ? "Registrando log..." : "Confirmar Acesso e Abrir Devolutiva"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: DICIONÁRIO DE DADOS DA EXPORTAÇÃO (PR-10) ─── */}
      {isDictModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full p-5 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  Dicionário de Dados — Exportação Aluno × Item × Alternativa
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Referência técnica das colunas contidas no arquivo CSV exportado (PR-10).
                </p>
              </div>
              <button
                onClick={() => setIsDictModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 pr-1 flex-1">
              {Object.entries(generateDataDictionary()).map(([col, meta]) => (
                <div key={col} className="p-2.5 rounded-lg border border-border bg-muted/20 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-foreground text-[11px]">{col}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                      {meta.tipo}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">{meta.descricao}</p>
                  <p className="text-[10px] text-primary/80 mt-1">Regra: {meta.regra}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end border-t border-border pt-3">
              <button
                onClick={() => setIsDictModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: DETALHES DA QUESTÃO E DEVOLUTIVA PSICOMÉTRICA (PR-09 / QB-12) ─── */}
      {selectedPsychItem && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl max-w-3xl w-full p-5 shadow-xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-foreground">
                  Questão {selectedPsychItem.orderIndex < 10 ? `0${selectedPsychItem.orderIndex}` : selectedPsychItem.orderIndex}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-muted text-foreground">
                  {selectedPsychItem.area}
                </span>
                {selectedPsychItem.tema && (
                  <span className="text-xs text-muted-foreground">• {selectedPsychItem.tema}</span>
                )}
                {selectedPsychItem.isAnulado && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    Item Anulado
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedPsychItem(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Corpo rolável */}
            <div className="overflow-y-auto space-y-4 pr-1 flex-1 text-xs">
              {/* Contexto Clínico se houver */}
              {selectedPsychItem.clinicalContext && (
                <div className="p-3 rounded-lg bg-muted/40 border border-border italic text-muted-foreground leading-relaxed">
                  {selectedPsychItem.clinicalContext}
                </div>
              )}

              {/* Enunciado */}
              <div className="p-3.5 rounded-lg border border-border bg-card space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Enunciado:
                </div>
                <p className="text-foreground text-xs leading-relaxed whitespace-pre-line font-medium">
                  {selectedPsychItem.statement}
                </p>
              </div>

              {/* Alternativas e Frequências */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Alternativas &amp; Distribuição de Escolhas dos Alunos:
                </div>
                <div className="space-y-1.5">
                  {items
                    .find((it) => it.id === selectedPsychItem.itemId)
                    ?.options.map((opt) => {
                      const freq = selectedPsychItem.optionFrequencies.find(
                        (f) => f.letter.toUpperCase() === opt.letter.toUpperCase()
                      );
                      const isCorrect = opt.letter.toUpperCase() === selectedPsychItem.correctLetter.toUpperCase();
                      const isDominant = opt.letter === selectedPsychItem.dominantDistractorLetter;

                      return (
                        <div
                          key={opt.letter}
                          className={`p-2.5 rounded-lg border transition-colors ${
                            isCorrect
                              ? "bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800"
                              : isDominant
                              ? "bg-purple-50/80 border-purple-300 dark:bg-purple-950/30 dark:border-purple-800"
                              : "bg-muted/20 border-border"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <span
                                className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                                  isCorrect
                                    ? "bg-emerald-600 text-white"
                                    : isDominant
                                    ? "bg-purple-600 text-white"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {opt.letter}
                              </span>
                              <span className="text-foreground leading-snug">{opt.text}</span>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-bold text-foreground block">
                                {freq ? `${freq.percentage}%` : "0%"}
                              </span>
                              <span className="text-[10px] text-muted-foreground block">
                                {freq ? `${freq.count} aluno(s)` : "0"}
                              </span>
                            </div>
                          </div>

                          <div className="mt-1 flex items-center gap-2">
                            {isCorrect && (
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                ✓ GABARITO OFICIAL
                              </span>
                            )}
                            {isDominant && (
                              <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400">
                                ⚠ DISTRATOR DOMINANTE (mais assinalado que o gabarito)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Devolutiva / Comentário */}
              {selectedPsychItem.explanation && (
                <div className="p-3 rounded-lg bg-sky-50/60 border border-sky-200 dark:bg-sky-950/30 dark:border-sky-800 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
                    Comentário Pedagógico / Devolutiva:
                  </div>
                  <p className="text-sky-900 dark:text-sky-200 text-xs leading-relaxed whitespace-pre-line">
                    {selectedPsychItem.explanation}
                  </p>
                </div>
              )}

              {/* Painel de Métricas Psicométricas da Questão */}
              <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Diagnóstico Psicométrico do Item nesta Prova:
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 rounded bg-background border border-border">
                    <div className="text-[10px] text-muted-foreground">Facilidade (p)</div>
                    <div className="text-sm font-bold text-foreground mt-0.5">
                      {selectedPsychItem.facilityIndex !== null
                        ? `${(selectedPsychItem.facilityIndex * 100).toFixed(1)}% (p = ${selectedPsychItem.facilityIndex})`
                        : "—"}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-background border border-border">
                    <div className="text-[10px] text-muted-foreground">Discriminação (D)</div>
                    <div className="text-sm font-bold text-foreground mt-0.5">
                      {selectedPsychItem.discriminationIndex !== null
                        ? selectedPsychItem.discriminationIndex.toFixed(2)
                        : "—"}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-background border border-border">
                    <div className="text-[10px] text-muted-foreground">Ponto-Bisserial (r)</div>
                    <div className="text-sm font-bold text-foreground mt-0.5">
                      {selectedPsychItem.correctedPointBiserial !== null
                        ? selectedPsychItem.correctedPointBiserial.toFixed(2)
                        : "—"}
                    </div>
                  </div>
                </div>

                {/* Sinais Ativos */}
                {selectedPsychItem.flags.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    <div className="text-[10px] font-semibold text-muted-foreground">
                      Sinais e Alertas Identificados:
                    </div>
                    <div className="space-y-1">
                      {selectedPsychItem.flags.map((flag) => (
                        <div
                          key={flag.type}
                          className={`p-2 rounded border text-xs flex items-start gap-2 ${flag.badgeClass}`}
                        >
                          <span className="font-bold shrink-0">{flag.shortLabel}:</span>
                          <span>{flag.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                    ✓ Item psicometricamente equilibrado: discriminação satisfatória e distribuição coerente de distratores.
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <button
                onClick={() => {
                  setSelectedFormulaTopic("geral");
                  setIsFormulasModalOpen(true);
                }}
                className="text-xs text-primary hover:underline font-medium"
              >
                Como esses indicadores são calculados?
              </button>
              <button
                onClick={() => setSelectedPsychItem(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: GUIA EXPLICATIVO DE FÓRMULAS E CRITÉRIOS (DR. FILIPE / DR. BRUNO) ─── */}
      {isFormulasModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full p-5 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  Como são calculados os indicadores psicométricos
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Fórmulas e definições conforme ESPEC-B2B.md (Seção 6) e aprovações médicas (Dr. Filipe e Dr. Bruno).
                </p>
              </div>
              <button
                onClick={() => setIsFormulasModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Abas internas do guia de fórmulas */}
            <div className="flex items-center gap-1 border-b border-border pb-2 overflow-x-auto text-xs">
              <button
                onClick={() => setSelectedFormulaTopic("geral")}
                className={`px-2.5 py-1 rounded font-medium ${
                  selectedFormulaTopic === "geral" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Visão Geral
              </button>
              <button
                onClick={() => setSelectedFormulaTopic("p")}
                className={`px-2.5 py-1 rounded font-medium ${
                  selectedFormulaTopic === "p" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Facilidade (p)
              </button>
              <button
                onClick={() => setSelectedFormulaTopic("d")}
                className={`px-2.5 py-1 rounded font-medium ${
                  selectedFormulaTopic === "d" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Discriminação (D)
              </button>
              <button
                onClick={() => setSelectedFormulaTopic("r")}
                className={`px-2.5 py-1 rounded font-medium ${
                  selectedFormulaTopic === "r" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Ponto-Bisserial (r)
              </button>
              <button
                onClick={() => setSelectedFormulaTopic("kr20")}
                className={`px-2.5 py-1 rounded font-medium ${
                  selectedFormulaTopic === "kr20" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                KR-20
              </button>
            </div>

            {/* Conteúdo rolável */}
            <div className="overflow-y-auto space-y-3 pr-1 flex-1 text-xs leading-relaxed text-muted-foreground">
              {selectedFormulaTopic === "geral" && (
                <div className="space-y-3">
                  <p>
                    A plataforma MedPleni utiliza os parâmetros clássicos da psicometria educacional e do Guia de Itens do INEP para avaliar a qualidade técnica das provas e de cada questão individual.
                  </p>
                  <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1.5">
                    <div className="font-bold text-foreground text-xs">Critérios e Amostras:</div>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>
                        <strong>Amostra pequena (n &lt; 30):</strong> A plataforma calcula os indicadores normalmente, mas exibe aviso visual destacando risco de flutuação estatística.
                      </li>
                      <li>
                        <strong>Amostra insuficiente (n &lt; 10):</strong> Para n &lt; 10, o cálculo de Discriminação (D), Ponto-Bisserial (r) e KR-20 é desabilitado para evitar distorções graves.
                      </li>
                      <li>
                        <strong>Itens anulados:</strong> Saem integralmente do cálculo de consistência (KR-20) e do escore total dos alunos, não penalizando a turma.
                      </li>
                    </ul>
                  </div>
                  <p className="text-[11px] text-primary">
                    O documento completo com as fórmulas teóricas e o exemplo numérico resolvido passo a passo está disponível em <code className="font-mono bg-muted px-1 py-0.5 rounded">docs/b2b/FORMULAS.md</code>.
                  </p>
                </div>
              )}

              {selectedFormulaTopic === "p" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted border border-border font-mono text-center text-foreground font-bold text-sm">
                    p = (Acertos no Item) ÷ (Total de Alunos da Amostra)
                  </div>
                  <div className="space-y-2">
                    <div className="font-bold text-foreground">Como é calculado:</div>
                    <p>
                      O Índice de Facilidade (p) mede a proporção de alunos que responderam corretamente ao item. Varia entre 0,00 (0% de acerto) e 1,00 (100% de acerto).
                    </p>
                    <div className="font-bold text-foreground">Interpretação:</div>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>p &gt; 0,90 (Muito Fácil):</strong> Quase todos os estudantes acertam. Contribui pouco para discriminar níveis de proficiência.</li>
                      <li><strong>0,40 ≤ p ≤ 0,70 (Faixa Ideal):</strong> Dificuldade média adequada, onde o item atinge seu maior potencial discriminativo.</li>
                      <li><strong>p &lt; 0,20 (Muito Difícil):</strong> Menos de 20% de acertos. Recomenda-se analisar se houve excesso de complexidade ou ambiguidade.</li>
                    </ul>
                  </div>
                </div>
              )}

              {selectedFormulaTopic === "d" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted border border-border font-mono text-center text-foreground font-bold text-sm">
                    D = p(27% Superior) − p(27% Inferior)
                  </div>
                  <div className="space-y-2">
                    <div className="font-bold text-foreground">Como é calculado:</div>
                    <p>
                      Conforme a clássica técnica de Kelley (1939), ordenam-se os alunos da prova por nota total e selecionam-se os 27% com melhor desempenho (grupo superior) e os 27% com menor desempenho (grupo inferior). O índice D é a diferença entre a taxa de acerto desses dois grupos.
                    </p>
                    <div className="font-bold text-foreground">Interpretação:</div>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>D ≥ 0,40:</strong> Discriminação excelente. Item de alto valor seletivo.</li>
                      <li><strong>0,20 ≤ D &lt; 0,40:</strong> Discriminação boa a moderada.</li>
                      <li><strong>D &lt; 0,20:</strong> Discriminação fraca.</li>
                      <li><strong>D &lt; 0 (Discriminação Negativa):</strong> Crítico. Alunos mais fracos acertaram mais que os alunos com melhor nota geral. Indica pegadinha involuntária ou erro de gabarito.</li>
                    </ul>
                  </div>
                </div>
              )}

              {selectedFormulaTopic === "r" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted border border-border font-mono text-center text-foreground font-bold text-sm">
                    r = Pearson(Acerto no Item, Nota Total sem o Item)
                  </div>
                  <div className="space-y-2">
                    <div className="font-bold text-foreground">Como é calculado:</div>
                    <p>
                      Calcula a correlação de Pearson entre o vetor binário de acerto (0 ou 1) e o total de acertos nas outras questões da prova. A correção (exclusão do próprio item do total) é essencial para evitar falsa correlação espúria e auto-inflação estatística.
                    </p>
                    <div className="font-bold text-foreground">Interpretação:</div>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>r ≥ 0,30:</strong> Excelente coerência interna. O item caminha na mesma direção da prova.</li>
                      <li><strong>0,00 ≤ r &lt; 0,20 (Discriminação Baixa):</strong> O item pouco contribui para a régua da prova.</li>
                      <li><strong>r &lt; 0 (Discriminação Negativa):</strong> Alerta crítico. Deve ser inspecionado imediatamente pelo docente responsável.</li>
                    </ul>
                  </div>
                </div>
              )}

              {selectedFormulaTopic === "kr20" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted border border-border font-mono text-center text-foreground font-bold text-sm">
                    KR-20 = [k / (k − 1)] × [1 − (Σ pᵢ(1 − pᵢ)) / σ²]
                  </div>
                  <div className="space-y-2">
                    <div className="font-bold text-foreground">Como é calculado:</div>
                    <p>
                      A fórmula Kuder-Richardson 20 afere a consistência interna da avaliação como um todo (equivalente ao Alfa de Cronbach para itens dicotômicos de acerto e erro). Compara a soma das variâncias dos itens com a variância populacional da nota total (σ²).
                    </p>
                    <div className="font-bold text-foreground">Interpretação e Leitura:</div>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>KR-20 ≥ 0,80:</strong> Excelente confiabilidade e consistência interna.</li>
                      <li><strong>0,70 ≤ KR-20 &lt; 0,80:</strong> Boa confiabilidade, amplamente recomendada para avaliações somativas e decisões de aprovação.</li>
                      <li><strong>0,60 ≤ KR-20 &lt; 0,70:</strong> Confiabilidade moderada, aceitável para testes formativos e diagnósticos.</li>
                      <li><strong>KR-20 &lt; 0,60:</strong> Baixa confiabilidade. A prova possui itens contraditórios ou grande dispersão de respostas.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end border-t border-border pt-3">
              <button
                onClick={() => setIsFormulasModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
