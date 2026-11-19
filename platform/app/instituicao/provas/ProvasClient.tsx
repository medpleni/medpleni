"use client";

import React, { useState, useTransition } from "react";
import type { B2BUserContext } from "@/lib/b2b/types";
import type { TaxArea } from "@/lib/b2b/taxonomy-types";
import type {
  ExamSummary,
  ExamMatrixDistribution,
  SelectedQuestionItem,
  ExamPreCheckResult,
} from "@/lib/b2b/exams-types";
import {
  getInepReferenceMatrix,
  autoSelectQuestionsAction,
  saveAndPublishExamAction,
  duplicateAssessmentAction,
  adoptMedPleniTemplateAction,
} from "@/lib/b2b/exams-actions";
import { runExamPreChecks } from "@/lib/b2b/exams-checker";
import { IndicatorFootnote } from "@/components/b2b";

interface ClassGroupOption {
  id: string;
  label: string;
  period: number;
  courseName: string;
}

interface TeacherOption {
  userId: string;
  name: string;
  role: string;
}

interface ProvasClientProps {
  context: B2BUserContext;
  initialAssessments: ExamSummary[];
  templates: ExamSummary[];
  classGroups: ClassGroupOption[];
  teachers: TeacherOption[];
  canonicalAreas: TaxArea[];
}

export default function ProvasClient({
  context,
  initialAssessments,
  templates,
  classGroups,
  teachers,
  canonicalAreas,
}: ProvasClientProps) {
  const [assessments, setAssessments] = useState<ExamSummary[]>(initialAssessments);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [typeFilter, setTypeFilter] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  // Modais
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Estado do Assistente (Wizard)
  const [title, setTitle] = useState("");
  const [examType, setExamType] = useState<string>("prova_regular");
  const [modality, setModality] = useState<string>("online");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [selectedClassGroups, setSelectedClassGroups] = useState<string[]>([]);
  const [coauthors, setCoauthors] = useState<string[]>([]);
  const [reviewerId, setReviewerId] = useState<string>("");
  const [reviewerFilterAreaOnly, setReviewerFilterAreaOnly] = useState(false);

  // Matriz
  const [matrix, setMatrix] = useState<ExamMatrixDistribution>({
    totalQuestions: 20,
    areas: {
      "Clínica Médica": 5,
      "Cirurgia Geral": 4,
      "Ginecologia e Obstetrícia": 4,
      Pediatria: 4,
      "Medicina de Família e Comunidade": 3,
    },
    difficultyCurve: { facil: 30, media: 50, dificil: 20 },
    minImageQuota: 2,
  });

  // Itens Selecionados no Caderno
  const [selectedItems, setSelectedItems] = useState<SelectedQuestionItem[]>([]);
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);

  // KPIs
  const totalExams = assessments.length;
  const publishedCount = assessments.filter((a) => a.status === "publicada" || a.status === "aplicada").length;
  const inReviewOrDraftCount = assessments.filter((a) => a.status === "rascunho" || a.status === "em_revisao").length;
  const enamedCount = assessments.filter((a) => a.type.startsWith("simulado_enamed")).length;

  // Filtros de visualização
  const filteredAssessments = assessments.filter((a) => {
    if (statusFilter !== "todos" && a.status !== statusFilter) return false;
    if (typeFilter !== "todos" && a.type !== typeFilter) return false;
    if (searchTerm.trim() && !a.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Ações do Assistente
  const handleLoadInepMatrix = async () => {
    const res = await getInepReferenceMatrix(examType);
    setMatrix(res.matrix);
  };

  const handleRunAutoSelection = async () => {
    setIsAutoSelecting(true);
    try {
      const items = await autoSelectQuestionsAction({
        matrix,
        classGroupIds: selectedClassGroups,
      });
      setSelectedItems(items);
    } catch {
      setFeedbackMessage({ text: "Erro ao executar seleção assistida.", type: "error" });
    } finally {
      setIsAutoSelecting(false);
    }
  };

  const handleDuplicate = async (examId: string) => {
    startTransition(async () => {
      const res = await duplicateAssessmentAction(examId);
      if (res.success && res.newAssessmentId) {
        setFeedbackMessage({ text: "Avaliação duplicada com sucesso como novo rascunho.", type: "success" });
        // Recarrega localmente
        const found = assessments.find((a) => a.id === examId);
        if (found) {
          setAssessments([
            {
              ...found,
              id: res.newAssessmentId,
              title: `${found.title} (Cópia)`,
              status: "rascunho",
              created_at: new Date().toISOString(),
            },
            ...assessments,
          ]);
        }
      } else {
        setFeedbackMessage({ text: res.message || "Erro ao duplicar.", type: "error" });
      }
    });
  };

  const handleAdoptTemplate = async (templateId: string) => {
    startTransition(async () => {
      const res = await adoptMedPleniTemplateAction(templateId);
      if (res.success && res.assessmentId) {
        setFeedbackMessage({ text: "Simulado Nacional adotado com sucesso!", type: "success" });
        setIsTemplatesModalOpen(false);
        const tpl = templates.find((t) => t.id === templateId);
        if (tpl) {
          setAssessments([
            {
              ...tpl,
              id: res.assessmentId,
              title: `${tpl.title} — ${context.institution.initials}`,
              status: "rascunho",
              is_template: false,
              created_at: new Date().toISOString(),
            },
            ...assessments,
          ]);
        }
      } else {
        setFeedbackMessage({ text: res.message || "Erro ao adotar simulado.", type: "error" });
      }
    });
  };

  const handleSaveExam = async (actionType: "save_draft" | "send_to_review" | "publish_now") => {
    startTransition(async () => {
      const res = await saveAndPublishExamAction({
        title,
        type: examType,
        modality,
        startsAt,
        endsAt,
        durationMinutes,
        classGroupIds: selectedClassGroups,
        coauthors,
        reviewerId: reviewerId || undefined,
        matrix,
        items: selectedItems,
        action: actionType,
      });

      if (res.success && res.assessmentId) {
        const msg =
          actionType === "publish_now"
            ? "Avaliação publicada oficialmente! Caderno congelado e 4 formas (A, B, C, D) geradas."
            : actionType === "send_to_review"
            ? "Avaliação enviada para a fila de revisão única."
            : "Rascunho salvo com sucesso.";
        setFeedbackMessage({ text: msg, type: "success" });
        setIsWizardOpen(false);
        // Atualiza lista
        setAssessments([
          {
            id: res.assessmentId,
            institution_id: context.institution.id,
            title,
            type: examType as ExamSummary["type"],
            modality: modality as ExamSummary["modality"],
            status: actionType === "publish_now" ? "publicada" : actionType === "send_to_review" ? "em_revisao" : "rascunho",
            duration_minutes: durationMinutes,
            author_id: context.userId,
            coauthors,
            planned_matrix: matrix,
            is_template: false,
            created_at: new Date().toISOString(),
            targets_count: selectedClassGroups.length,
          },
          ...assessments,
        ]);
      } else {
        setFeedbackMessage({ text: res.message || "Erro ao salvar avaliação.", type: "error" });
      }
    });
  };

  const preChecks: ExamPreCheckResult = runExamPreChecks(matrix, selectedItems);

  return (
    <div className="space-y-6">
      {/* Notificação / Feedback */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between text-sm ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs underline ml-4 hover:opacity-80"
          >
            Fechar
          </button>
        </div>
      )}

      {/* BLOCO 1: Topo e Ações Principais */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Provas e Avaliações
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestão curricular, montagem assistida por matriz de referência e aplicação de simulados ENAMED
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTemplatesModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Simulados Prontos MedPleni
          </button>
          <button
            onClick={() => {
              setIsWizardOpen(true);
              setWizardStep(1);
            }}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova Prova (Assistente)
          </button>
        </div>
      </div>

      {/* BLOCO 2: KPIs Executivos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg border border-border bg-card">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Total de Provas
          </span>
          <span className="text-xl font-bold text-foreground mt-1 block">
            {totalExams}
          </span>
        </div>
        <div className="p-3.5 rounded-lg border border-border bg-card">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Publicadas / Em Andamento
          </span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {publishedCount}
          </span>
        </div>
        <div className="p-3.5 rounded-lg border border-border bg-card">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Em Revisão / Rascunhos
          </span>
          <span className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
            {inReviewOrDraftCount}
          </span>
        </div>
        <div className="p-3.5 rounded-lg border border-border bg-card">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Simulados ENAMED
          </span>
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">
            {enamedCount}
          </span>
        </div>
      </div>

      {/* BLOCO 3: Barra de Filtros e Busca */}
      <div className="p-3 rounded-lg border border-border bg-card flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 max-w-sm">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar prova por título..."
            className="w-full px-3 py-1.5 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none"
          >
            <option value="todos">Todos os status</option>
            <option value="rascunho">Rascunho</option>
            <option value="em_revisao">Em revisão</option>
            <option value="aprovada">Aprovada</option>
            <option value="publicada">Publicada</option>
            <option value="aplicada">Aplicada</option>
            <option value="corrigida">Corrigida</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none"
          >
            <option value="todos">Todos os tipos</option>
            <option value="prova_regular">Prova regular</option>
            <option value="simulado_enamed_4">Simulado ENAMED 4º P</option>
            <option value="simulado_enamed_8">Simulado ENAMED 8º P</option>
            <option value="simulado_enamed_12">Simulado ENAMED 12º P</option>
            <option value="pre_aula">Pré-aula</option>
            <option value="pos_aula">Pós-aula</option>
          </select>
        </div>
      </div>

      {/* BLOCO 4: Lista de Avaliações */}
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
              <tr>
                <th className="py-2.5 px-3">Título / Tipo</th>
                <th className="py-2.5 px-3">Modalidade</th>
                <th className="py-2.5 px-3">Turmas Convocadas</th>
                <th className="py-2.5 px-3">Duração</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredAssessments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                    Nenhuma avaliação encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredAssessments.map((exam) => {
                  const statusColors: Record<string, string> = {
                    rascunho: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                    em_revisao: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                    aprovada: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
                    publicada: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                    aplicada: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
                    corrigida: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
                  };

                  return (
                    <tr key={exam.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-foreground">{exam.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                          {exam.type.replace(/_/g, " ")}
                        </div>
                      </td>
                      <td className="py-3 px-3 capitalize text-muted-foreground">
                        {exam.modality}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {exam.class_groups_labels && exam.class_groups_labels.length > 0
                          ? exam.class_groups_labels.join(", ")
                          : "Geral da Instituição"}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {exam.duration_minutes} min
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                            statusColors[exam.status] || "bg-zinc-100 text-zinc-800"
                          }`}
                        >
                          {exam.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleDuplicate(exam.id)}
                            disabled={isPending}
                            className="px-2 py-1 text-[11px] font-medium rounded border border-border hover:bg-muted text-foreground transition-colors"
                          >
                            Duplicar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BLOCO 5: Rodapé Padronizado */}
      <IndicatorFootnote
        base={`${assessments.length} avaliações cadastradas`}
        periodo="Ano Letivo 2027"
        fonte="Módulo de Provas MedPleni B2B (PR-01 a PR-06)"
      />

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: ASSISTENTE DE NOVA PROVA EM 4 PASSOS (WIZARD)                 */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Topo do Wizard com Navegação em 4 Passos */}
            <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Assistente de Nova Prova — Passo {wizardStep} de 4
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {wizardStep === 1 && "Definição: parâmetros gerais, turmas e coautores"}
                  {wizardStep === 2 && "Matriz: distribuição por área, dificuldade e cota de imagem"}
                  {wizardStep === 3 && "Seleção assistida: composição inteligente e checagem de reuso"}
                  {wizardStep === 4 && "Revisão única e publicação com formas embaralhadas"}
                </p>
              </div>
              <button
                onClick={() => setIsWizardOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Stepper Visual */}
            <div className="grid grid-cols-4 border-b border-border text-center text-xs font-medium">
              {[
                { step: 1, label: "1. Definição" },
                { step: 2, label: "2. Matriz" },
                { step: 3, label: "3. Seleção" },
                { step: 4, label: "4. Revisão" },
              ].map((s) => (
                <div
                  key={s.step}
                  className={`py-2 border-b-2 transition-colors ${
                    wizardStep === s.step
                      ? "border-primary text-primary font-bold bg-primary/5"
                      : wizardStep > s.step
                      ? "border-emerald-500 text-emerald-600 font-semibold"
                      : "border-transparent text-muted-foreground"
                  }`}
                >
                  {s.label}
                </div>
              ))}
            </div>

            {/* Conteúdo do Passo */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* PASSO 1: DEFINIÇÃO */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Título da Avaliação *
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Simulado Integrado ENAMED — 8º Período"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Tipo de Avaliação *
                      </label>
                      <select
                        value={examType}
                        onChange={(e) => setExamType(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none"
                      >
                        <option value="prova_regular">Prova regular</option>
                        <option value="simulado_enamed_4">Simulado ENAMED 4º Período</option>
                        <option value="simulado_enamed_8">Simulado ENAMED 8º Período</option>
                        <option value="simulado_enamed_12">Simulado ENAMED 12º Período</option>
                        <option value="pre_aula">Pré-aula</option>
                        <option value="pos_aula">Pós-aula</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Modalidade *
                      </label>
                      <select
                        value={modality}
                        onChange={(e) => setModality(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none"
                      >
                        <option value="online">100% Online (com tempo por item)</option>
                        <option value="papel">Papel (folha de respostas com QR code)</option>
                        <option value="hibrida">Híbrida (caderno papel + link)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Duração (minutos)
                      </label>
                      <input
                        type="number"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Janela de Aplicação (Início)
                      </label>
                      <input
                        type="datetime-local"
                        value={startsAt}
                        onChange={(e) => setStartsAt(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Turmas Convocadas */}
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">
                      Turmas Convocadas
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-border p-3 rounded-lg max-h-36 overflow-y-auto">
                      {classGroups.map((cg) => (
                        <label
                          key={cg.id}
                          className="flex items-center gap-2 text-xs text-foreground cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedClassGroups.includes(cg.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedClassGroups([...selectedClassGroups, cg.id]);
                              } else {
                                setSelectedClassGroups(selectedClassGroups.filter((id) => id !== cg.id));
                              }
                            }}
                            className="rounded border-input text-primary focus:ring-primary"
                          />
                          <span>
                            {cg.label} ({cg.period}º P)
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Edição Compartilhada (Coautores - Voto SPR 11) */}
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">
                      Coautores (Edição Compartilhada entre Professores)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-border p-3 rounded-lg max-h-32 overflow-y-auto">
                      {teachers
                        .filter((t) => t.userId !== context.userId)
                        .map((t) => (
                          <label
                            key={t.userId}
                            className="flex items-center gap-2 text-xs text-foreground cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={coauthors.includes(t.userId)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCoauthors([...coauthors, t.userId]);
                                } else {
                                  setCoauthors(coauthors.filter((id) => id !== t.userId));
                                }
                              }}
                              className="rounded border-input text-primary focus:ring-primary"
                            />
                            <span>{t.name}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PASSO 2: MATRIZ */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        Matriz de Referência do INEP (ENAMED)
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Carregue a distribuição oficial de 100 itens divididos nas 7 áreas canônicas.
                      </span>
                    </div>
                    <button
                      onClick={handleLoadInepMatrix}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Carregar Matriz Padrão INEP
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Total de Questões
                      </label>
                      <input
                        type="number"
                        value={matrix.totalQuestions}
                        onChange={(e) =>
                          setMatrix({ ...matrix, totalQuestions: Number(e.target.value) })
                        }
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Cota Mínima com Imagem
                      </label>
                      <input
                        type="number"
                        value={matrix.minImageQuota}
                        onChange={(e) =>
                          setMatrix({ ...matrix, minImageQuota: Number(e.target.value) })
                        }
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        Curva de Dificuldade (% Fácil / Média / Difícil)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Fácil"
                          value={matrix.difficultyCurve.facil}
                          onChange={(e) =>
                            setMatrix({
                              ...matrix,
                              difficultyCurve: {
                                ...matrix.difficultyCurve,
                                facil: Number(e.target.value),
                              },
                            })
                          }
                          className="w-1/3 px-2 py-1.5 text-xs rounded-lg border border-input bg-background text-center focus:outline-none"
                        />
                        <input
                          type="number"
                          placeholder="Média"
                          value={matrix.difficultyCurve.media}
                          onChange={(e) =>
                            setMatrix({
                              ...matrix,
                              difficultyCurve: {
                                ...matrix.difficultyCurve,
                                media: Number(e.target.value),
                              },
                            })
                          }
                          className="w-1/3 px-2 py-1.5 text-xs rounded-lg border border-input bg-background text-center focus:outline-none"
                        />
                        <input
                          type="number"
                          placeholder="Difícil"
                          value={matrix.difficultyCurve.dificil}
                          onChange={(e) =>
                            setMatrix({
                              ...matrix,
                              difficultyCurve: {
                                ...matrix.difficultyCurve,
                                dificil: Number(e.target.value),
                              },
                            })
                          }
                          className="w-1/3 px-2 py-1.5 text-xs rounded-lg border border-input bg-background text-center focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Distribuição por Área Canônica */}
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">
                      Quantidade de Questões por Área
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {canonicalAreas.map((area) => {
                        const count = matrix.areas[area.name] || 0;
                        return (
                          <div
                            key={area.id}
                            className="flex items-center justify-between p-2 rounded-lg border border-border bg-card"
                          >
                            <span className="text-xs text-foreground font-medium truncate pr-2">
                              {area.name}
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={count}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setMatrix({
                                  ...matrix,
                                  areas: { ...matrix.areas, [area.name]: val },
                                });
                              }}
                              className="w-16 px-2 py-1 text-xs rounded border border-input bg-background text-center focus:outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* PASSO 3: SELEÇÃO ASSISTIDA */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-lg bg-primary/5 border border-primary/20">
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Montagem Assistida Inteligente
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        A plataforma busca no acervo e propõe itens que cumprem exatamente sua matriz de áreas, dificuldades e cota de imagens.
                      </span>
                    </div>
                    <button
                      onClick={handleRunAutoSelection}
                      disabled={isAutoSelecting}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {isAutoSelecting ? "Selecionando..." : "Executar Seleção Assistida"}
                    </button>
                  </div>

                  {/* Resumo da Matriz e Itens Selecionados */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span>
                      Total Selecionado:{" "}
                      <strong className="text-foreground">{selectedItems.length}</strong> de{" "}
                      <strong className="text-foreground">{matrix.totalQuestions}</strong> questões
                    </span>
                    <span>
                      Itens com imagem:{" "}
                      <strong className="text-foreground">
                        {selectedItems.filter((i) => i.has_image).length}
                      </strong>{" "}
                      (mínimo: {matrix.minImageQuota})
                    </span>
                  </div>

                  {/* Lista de Itens com Badges e Avisos de Reuso */}
                  <div className="border border-border rounded-lg divide-y divide-border/60 max-h-96 overflow-y-auto">
                    {selectedItems.length === 0 ? (
                      <div className="p-8 text-center text-xs text-muted-foreground">
                        Nenhuma questão selecionada ainda. Clique no botão acima para montar o caderno assistido.
                      </div>
                    ) : (
                      selectedItems.map((item, idx) => (
                        <div key={item.id} className="p-3 hover:bg-muted/30 transition-colors space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-foreground">
                                  #{idx + 1}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-foreground">
                                  {item.area_name}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 uppercase">
                                  {item.difficulty}
                                </span>
                                {item.has_image && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                    Com Imagem
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground">
                                  Origem: {item.origin_label}
                                </span>
                              </div>
                              <p className="text-xs text-foreground line-clamp-2">
                                {item.statement}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                setSelectedItems(selectedItems.filter((_, i) => i !== idx))
                              }
                              className="text-muted-foreground hover:text-rose-600 text-xs p-1"
                              title="Remover questão do caderno"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Aviso se já foi aplicada à mesma turma (PR-03) */}
                          {item.already_applied_warning && (
                            <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5 font-medium">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                              </svg>
                              {item.already_applied_warning}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* PASSO 4: REVISÃO ÚNICA E PUBLICAÇÃO */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  {/* Checagens Automáticas Pré-Publicação */}
                  <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Checagens Automáticas do Caderno
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={preChecks.matrixFulfilled ? "text-emerald-600" : "text-amber-600"}>
                          {preChecks.matrixFulfilled ? "✓" : "⚠"}
                        </span>
                        <span>
                          Matriz Cumprida: {preChecks.totalSelected} / {preChecks.totalPlanned}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={preChecks.allKeysPresent ? "text-emerald-600" : "text-rose-600"}>
                          {preChecks.allKeysPresent ? "✓" : "✗"}
                        </span>
                        <span>Gabaritos 100% Preenchidos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={preChecks.noDuplicates ? "text-emerald-600" : "text-rose-600"}>
                          {preChecks.noDuplicates ? "✓" : "✗"}
                        </span>
                        <span>Sem Questões Duplicadas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={preChecks.imageQuotaMet ? "text-emerald-600" : "text-amber-600"}>
                          {preChecks.imageQuotaMet ? "✓" : "⚠"}
                        </span>
                        <span>Cota de Imagens Atendida</span>
                      </div>
                    </div>

                    {preChecks.discrepancies.length > 0 && (
                      <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                        <div className="font-bold">Pontos de Atenção:</div>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {preChecks.discrepancies.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Revisor Designado (Revisão Única - PR-04 / PR-06) */}
                  <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Revisão Única por Docente
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">
                          Professor Revisor Designado
                        </label>
                        <select
                          value={reviewerId}
                          onChange={(e) => setReviewerId(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none"
                        >
                          <option value="">Selecione um professor revisor...</option>
                          {teachers.map((t) => (
                            <option key={t.userId} value={t.userId}>
                              {t.name} ({t.role})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          id="areaOnlyToggle"
                          checked={reviewerFilterAreaOnly}
                          onChange={(e) => setReviewerFilterAreaOnly(e.target.checked)}
                          className="rounded border-input text-primary focus:ring-primary"
                        />
                        <label htmlFor="areaOnlyToggle" className="text-xs text-foreground cursor-pointer">
                          Permitir que o revisor veja apenas itens da sua área (PR-04)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé do Wizard com Navegação */}
            <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
              <div>
                {wizardStep > 1 && (
                  <button
                    onClick={() => setWizardStep((wizardStep - 1) as 1 | 2 | 3 | 4)}
                    className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted text-foreground transition-colors"
                  >
                    ← Voltar
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {wizardStep < 4 ? (
                  <button
                    onClick={() => {
                      if (wizardStep === 1 && !title.trim()) {
                        setFeedbackMessage({ text: "Informe o título da avaliação.", type: "error" });
                        return;
                      }
                      setWizardStep((wizardStep + 1) as 1 | 2 | 3 | 4);
                    }}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Avançar →
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleSaveExam("save_draft")}
                      disabled={isPending}
                      className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted text-foreground transition-colors disabled:opacity-50"
                    >
                      Salvar Rascunho
                    </button>
                    {reviewerId && (
                      <button
                        onClick={() => handleSaveExam("send_to_review")}
                        disabled={isPending}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
                      >
                        Enviar para Revisão
                      </button>
                    )}
                    <button
                      onClick={() => handleSaveExam("publish_now")}
                      disabled={isPending || selectedItems.length === 0}
                      className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                      Aprovar e Publicar Agora
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: CALENDÁRIO DE SIMULADOS PRONTOS DA MEDPLENI                   */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {isTemplatesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Simulados Prontos da MedPleni (Calendário Nacional)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Simulados oficiais montados pela equipe pedagógica para adoção imediata com 1 clique
                </p>
              </div>
              <button
                onClick={() => setIsTemplatesModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-3">
              {templates.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Nenhum modelo publicado pela MedPleni no momento.
                </div>
              ) : (
                templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-4 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground">
                          {tpl.title}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
                          {tpl.template_month}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        100 questões inéditas e comentadas cobrindo as 7 áreas do INEP • Duração: 4h • Gabarito oficial congelado
                      </p>
                    </div>
                    <button
                      onClick={() => handleAdoptTemplate(tpl.id)}
                      disabled={isPending}
                      className="px-3.5 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap self-start sm:self-auto disabled:opacity-50"
                    >
                      Adotar com 1 Clique
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-border bg-muted/20 text-right">
              <button
                onClick={() => setIsTemplatesModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted text-foreground transition-colors"
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
