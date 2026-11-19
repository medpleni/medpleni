"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  StudentAreaPerformance,
  NextStepRecommendation,
  EvolutionTimelineResult,
} from "@/lib/b2b/aluno";
import { recordPracticeAnswer } from "@/lib/b2b/aluno-actions";

export interface StudentPortalExam {
  id: string;
  title: string;
  type: string;
  date: string;
  status: "aberta" | "realizada" | "agendada";
  studentScore?: number;
  classAverage?: number;
  isReleased: boolean;
  totalQuestions: number;
  wrongCount?: number;
  wrongItems?: Array<{
    id: string;
    statement: string;
    clinicalContext?: string;
    selectedLetter: string;
    correctLetter: string;
    explanation?: string;
    area: string;
    options: Array<{ letter: string; text: string; isCorrect: boolean }>;
  }>;
}

export interface StudentPortalIntervention {
  id: string;
  title: string;
  axisValue: string;
  type: string;
  dueDate?: string;
  questionsTarget: number;
  questionsCompleted: number;
  status: "pendente" | "em_progresso" | "concluida";
}

export interface PracticeQuestion {
  id: string;
  statement: string;
  clinicalContext?: string;
  area: string;
  subarea?: string;
  explanation?: string;
  options: Array<{ letter: string; text: string; isCorrect: boolean }>;
}

interface AlunoPortalClientProps {
  studentName: string;
  classGroupName: string;
  period: number;
  institutionName: string;
  initialTab?: string;
  nextStep: NextStepRecommendation;
  areas: StudentAreaPerformance[];
  evolution: EvolutionTimelineResult;
  exams: StudentPortalExam[];
  interventions: StudentPortalIntervention[];
  practiceQuestions: PracticeQuestion[];
  isDemoStudent?: boolean;
}

export default function AlunoPortalClient({
  studentName,
  classGroupName,
  period,
  institutionName,
  initialTab = "inicio",
  nextStep,
  areas,
  evolution,
  exams,
  interventions,
  practiceQuestions,
  isDemoStudent = false,
}: AlunoPortalClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"inicio" | "evolucao" | "areas" | "avaliacoes" | "praticar">(
    (initialTab as "inicio" | "evolucao" | "areas" | "avaliacoes" | "praticar") || "inicio"
  );

  // Estado para revisão de erros em modo leitura
  const [reviewExam, setReviewExam] = useState<StudentPortalExam | null>(null);

  // Estado para a prática de questões
  const [practiceArea, setPracticeArea] = useState<string>("todas");
  const [practiceInterventionId, setPracticeInterventionId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerConfirmed, setIsAnswerConfirmed] = useState(false);
  const [sessionAnsweredCount, setSessionAnsweredCount] = useState(0);
  const [isPendingAnswer, startAnswerTransition] = useTransition();

  // Filtra questões disponíveis para prática
  const filteredQuestions = practiceQuestions.filter((q) => {
    if (practiceArea === "todas") return true;
    return q.area.toLowerCase().includes(practiceArea.toLowerCase());
  });

  const currentQuestion =
    filteredQuestions.length > 0
      ? filteredQuestions[currentQuestionIndex % filteredQuestions.length]
      : null;

  // Trata submissão da prática
  const handleConfirmAnswer = () => {
    if (!currentQuestion || !selectedOption || isAnswerConfirmed) return;

    const correctOption = currentQuestion.options.find((o) => o.isCorrect);
    const isCorrect = correctOption?.letter === selectedOption;

    setIsAnswerConfirmed(true);
    setSessionAnsweredCount((prev) => prev + 1);

    startAnswerTransition(async () => {
      await recordPracticeAnswer({
        questionId: currentQuestion.id,
        selectedLetter: selectedOption,
        isCorrect,
        interventionId: practiceInterventionId || undefined,
      });
      router.refresh();
    });
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setIsAnswerConfirmed(false);
    setCurrentQuestionIndex((prev) => prev + 1);
  };

  const startPracticeForArea = (areaName: string) => {
    setPracticeArea(areaName);
    setPracticeInterventionId(null);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerConfirmed(false);
    setActiveTab("praticar");
  };

  const startPracticeForIntervention = (interv: StudentPortalIntervention) => {
    setPracticeInterventionId(interv.id);
    setPracticeArea(interv.axisValue);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerConfirmed(false);
    setActiveTab("praticar");
  };

  // Separa provas abertas e provas realizadas
  const openExams = exams.filter((e) => e.status === "aberta");
  const finishedExams = exams.filter((e) => e.status === "realizada");
  const pendingInterventions = interventions.filter((i) => i.status !== "concluida");

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* ── CABEÇALHO DO ESTUDANTE ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Espaço do Estudante
            </h1>
            {isDemoStudent && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
                Modo Demonstração
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {studentName} · {classGroupName} ({period}º Período) · {institutionName}
          </p>
        </div>

        {/* NAVEGAÇÃO POR ABAS */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveTab("inicio")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === "inicio"
                ? "bg-white dark:bg-gray-900 text-teal-700 dark:text-teal-400 shadow-sm font-semibold"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            🎯 Início
          </button>
          <button
            onClick={() => setActiveTab("evolucao")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === "evolucao"
                ? "bg-white dark:bg-gray-900 text-teal-700 dark:text-teal-400 shadow-sm font-semibold"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            📈 Minha evolução
          </button>
          <button
            onClick={() => setActiveTab("areas")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === "areas"
                ? "bg-white dark:bg-gray-900 text-teal-700 dark:text-teal-400 shadow-sm font-semibold"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            🩺 Resultados por área
          </button>
          <button
            onClick={() => setActiveTab("avaliacoes")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === "avaliacoes"
                ? "bg-white dark:bg-gray-900 text-teal-700 dark:text-teal-400 shadow-sm font-semibold"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            📝 Minhas avaliações
          </button>
          <button
            onClick={() => setActiveTab("praticar")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === "praticar"
                ? "bg-white dark:bg-gray-900 text-teal-700 dark:text-teal-400 shadow-sm font-semibold"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            ✍️ Praticar
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ABA 1: INÍCIO (PRÓXIMO PASSO COM O PORQUÊ, PENDÊNCIAS E PRIVACIDADE) */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "inicio" && (
        <div className="space-y-6">
          {/* 1.1 CARD DE DESTAQUE: PRÓXIMO PASSO COM O PORQUÊ (AL-01) */}
          <div className="p-6 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-gradient-to-r from-teal-50 via-cyan-50 to-emerald-50 dark:from-teal-950/30 dark:via-cyan-950/20 dark:to-emerald-950/30 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1">
                    <span>💡</span> Próximo passo prioritário
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      nextStep.urgency === "alta"
                        ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                        : nextStep.urgency === "media"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                    }`}
                  >
                    {nextStep.urgency === "alta"
                      ? "Atenção Crítica"
                      : nextStep.urgency === "media"
                      ? "Zona de Decisão"
                      : "Evolução Contínua"}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Oportunidade de ganho em {nextStep.priorityArea} ({nextStep.currentScore}%)
                </h2>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed max-w-2xl">
                  {nextStep.rationale}
                </p>
                <div className="text-xs font-semibold text-teal-900 dark:text-teal-200 pt-1">
                  Recomendação prática: {nextStep.recommendedAction}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <button
                  onClick={() => startPracticeForArea(nextStep.priorityArea)}
                  className="px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <span>✍️</span> Praticar {nextStep.priorityArea}
                </button>
              </div>
            </div>
          </div>

          {/* 1.2 DUAS COLUNAS: PROVAS ABERTAS E LISTAS DE EXERCÍCIOS PENDENTES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Provas Abertas */}
            <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>📝</span> Provas Abertas ({openExams.length})
                </h3>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  Avaliações institucionais
                </span>
              </div>

              {openExams.length === 0 ? (
                <div className="p-6 text-center rounded-lg border border-dashed border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                  Nenhuma prova aberta agendada para este momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {openExams.map((exam) => (
                    <div
                      key={exam.id}
                      className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-teal-500/50 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div>
                        <div className="text-xs font-semibold text-gray-900 dark:text-white">
                          {exam.title}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {new Date(exam.date).toLocaleDateString("pt-BR")} · {exam.totalQuestions} questões
                        </div>
                      </div>
                      <Link
                        href={`/instituicao/aluno/prova/${exam.id}`}
                        className="px-3 py-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs shrink-0 transition-colors"
                      >
                        Iniciar Prova
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Listas de Exercícios Pendentes (Intervenções) */}
            <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>📋</span> Listas Atribuídas ({pendingInterventions.length})
                </h3>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  Intervenções pedagógicas
                </span>
              </div>

              {pendingInterventions.length === 0 ? (
                <div className="p-6 text-center rounded-lg border border-dashed border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                  Todas as listas de exercícios atribuídas estão em dia!
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingInterventions.map((interv) => {
                    const pct = Math.min(
                      100,
                      Math.round((interv.questionsCompleted / interv.questionsTarget) * 100)
                    );
                    return (
                      <div
                        key={interv.id}
                        className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-semibold text-gray-900 dark:text-white">
                            {interv.title}
                          </div>
                          <button
                            onClick={() => startPracticeForIntervention(interv)}
                            className="px-2.5 py-1 rounded bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-semibold text-[11px] hover:bg-teal-100 transition-colors shrink-0"
                          >
                            Resolver Lista
                          </button>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                            <span>Eixo: {interv.axisValue}</span>
                            <span>
                              {interv.questionsCompleted} / {interv.questionsTarget} questões ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-teal-600 rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 1.3 AVISO DE PRIVACIDADE EM LINGUAGEM SIMPLES */}
          <div className="p-5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>O que a sua faculdade enxerga sobre você</span>
            </div>
            <p className="text-xs text-blue-800 dark:text-blue-300/90 leading-relaxed">
              A coordenação acadêmica e os professores das suas turmas têm acesso ao seu
              aproveitamento por área de formação, às notas das avaliações institucionais, ao volume
              de questões que você pratica e ao cumprimento de listas de exercícios pedagógicas.{" "}
              <strong>
                Seus dados individuais nunca são expostos em rankings públicos nem compartilhados
                com outros estudantes.
              </strong>
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ABA 2: MINHA EVOLUÇÃO (EVOLUÇÃO PESSOAL VS MÉDIA DA TURMA) (AL-02) */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "evolucao" && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>📈</span> Evolução ao Longo do Tempo vs. Média da Turma
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Comparação direta das suas notas com a média da coorte. Sem ranking e sem exposição de posição.
                </p>
              </div>

              {/* Legenda visual */}
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-teal-600 inline-block" />
                  <span className="text-gray-700 dark:text-gray-300">Minha Nota</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />
                  <span className="text-gray-700 dark:text-gray-300">Média da Turma</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-red-500 inline-block" />
                  <span className="text-gray-700 dark:text-gray-300">Régua 60</span>
                </div>
              </div>
            </div>

            {/* GRÁFICO SVG SIMPLIFICADO E RESPONSIVO */}
            {evolution.timeline.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 dark:text-gray-400">
                Nenhuma avaliação corrigida para traçar a evolução longitudinal.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="overflow-x-auto">
                  <div className="min-w-[500px] h-64 relative border-b border-l border-gray-200 dark:border-gray-700 p-4 flex items-end justify-between gap-6">
                    {/* Linha tracejada da Régua 60 */}
                    <div
                      className="absolute left-0 right-0 border-t-2 border-dashed border-red-400 dark:border-red-500/80 pointer-events-none z-0"
                      style={{ bottom: "60%" }}
                    >
                      <span className="absolute -top-3 right-2 text-[10px] font-bold text-red-600 dark:text-red-400 bg-white dark:bg-gray-900 px-1 rounded">
                        Régua 60%
                      </span>
                    </div>

                    {/* Barras/Pontos por avaliação */}
                    {evolution.timeline.map((item, idx) => {
                      const studentHeight = Math.max(8, Math.min(100, item.studentScore));
                      const classHeight = Math.max(8, Math.min(100, item.classAverage));
                      const isAboveCut = item.studentScore >= 60;

                      return (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center justify-end h-full relative z-10 group"
                        >
                          {/* Dica flutuante */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap z-30">
                            Você: {item.studentScore}% · Turma: {item.classAverage}% (Δ{" "}
                            {item.deltaVsClass > 0 ? `+${item.deltaVsClass}` : item.deltaVsClass}%)
                          </div>

                          <div className="w-full flex items-end justify-center gap-2 h-full pb-1">
                            {/* Barra da turma */}
                            <div
                              className="w-4 bg-gray-300 dark:bg-gray-700 rounded-t transition-all duration-300"
                              style={{ height: `${classHeight}%` }}
                              title={`Média da Turma: ${item.classAverage}%`}
                            />
                            {/* Barra do aluno */}
                            <div
                              className={`w-6 rounded-t transition-all duration-300 ${
                                isAboveCut
                                  ? "bg-teal-600 dark:bg-teal-500"
                                  : "bg-amber-500 dark:bg-amber-600"
                              }`}
                              style={{ height: `${studentHeight}%` }}
                              title={`Minha Nota: ${item.studentScore}%`}
                            />
                          </div>

                          {/* Rótulo da prova */}
                          <div className="text-center mt-2 max-w-[120px]">
                            <div className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 truncate">
                              {item.examTitle}
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">
                              {new Date(item.date).toLocaleDateString("pt-BR", {
                                month: "short",
                                year: "2-digit",
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3 CARDS DE SÍNTESE */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/70 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Minha Média Geral</div>
                    <div
                      className={`text-2xl font-bold mt-1 ${
                        evolution.overallAverage >= 60
                          ? "text-teal-700 dark:text-teal-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {evolution.overallAverage}%
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/70 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Média Geral da Turma</div>
                    <div className="text-2xl font-bold text-gray-700 dark:text-gray-300 mt-1">
                      {evolution.classOverallAverage}%
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/70 text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Última Prova vs. Turma</div>
                    <div
                      className={`text-2xl font-bold mt-1 ${
                        evolution.latestDelta >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-500 dark:text-red-400"
                      }`}
                    >
                      {evolution.latestDelta > 0
                        ? `+${evolution.latestDelta}%`
                        : `${evolution.latestDelta}%`}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ABA 3: RESULTADOS POR ÁREA (ORDENADOS POR OPORTUNIDADE DE GANHO) (AL-03) */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "areas" && (
        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>🩺</span> Aproveitamento por Área de Formação
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Ordenado por oportunidade de ganho: eixos com menor aproveitamento no topo com ação sugerida.
              </p>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Referência da régua de corte: <strong className="text-gray-900 dark:text-white">60%</strong>
            </div>
          </div>

          <div className="space-y-3">
            {areas.map((item, idx) => {
              const isBelowCut = item.percentage < 60;
              const isCritical = item.percentage < 51;

              return (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/30 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:border-gray-300 dark:hover:border-gray-700"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {item.area}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          isCritical
                            ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                            : isBelowCut
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                        }`}
                      >
                        {isCritical
                          ? "Crítico (<51%)"
                          : isBelowCut
                          ? "Zona de Decisão (51-60%)"
                          : "Seguro (≥60%)"}
                      </span>
                    </div>

                    {/* Barra de progresso */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 max-w-md h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCritical
                              ? "bg-red-500"
                              : isBelowCut
                              ? "bg-amber-500"
                              : "bg-teal-600"
                          }`}
                          style={{ width: `${Math.min(100, item.percentage)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white min-w-[45px]">
                        {item.percentage}%
                      </span>
                    </div>

                    <div className="text-xs text-gray-600 dark:text-gray-400 flex flex-wrap items-center gap-3 pt-0.5">
                      <span>
                        {item.correctCount} acertos em {item.totalAnswered} questões respondidas
                      </span>
                      <span>•</span>
                      <span className="text-teal-700 dark:text-teal-400 font-medium">
                        Ação: {item.actionSuggested}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => startPracticeForArea(item.area)}
                    className="px-3.5 py-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-teal-700 dark:text-teal-300 border border-gray-200 dark:border-gray-700 font-medium text-xs shrink-0 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>✍️</span> Praticar este eixo
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ABA 4: MINHAS AVALIAÇÕES & REVISAR ERROS EM MODO LEITURA (AL-04) */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "avaliacoes" && (
        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>📝</span> Minhas Avaliações e Provas
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Resultados oficiais e opção de revisão pedagógica de erros em modo leitura (sem cronômetro e sem alterar nota).
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {finishedExams.map((exam) => (
              <div
                key={exam.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {exam.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {new Date(exam.date).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-4">
                    <span>
                      Sua Nota:{" "}
                      <strong
                        className={
                          (exam.studentScore || 0) >= 60
                            ? "text-teal-700 dark:text-teal-400"
                            : "text-amber-600 dark:text-amber-400"
                        }
                      >
                        {exam.studentScore}%
                      </strong>
                    </span>
                    <span>Média da Turma: {exam.classAverage}%</span>
                    <span>{exam.totalQuestions} questões</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {exam.isReleased ? (
                    <>
                      <button
                        onClick={() => setReviewExam(exam)}
                        className="px-3.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-medium text-xs hover:bg-teal-100 transition-colors flex items-center gap-1.5"
                      >
                        <span>🔍</span> Revisar Erros (Modo Leitura)
                      </button>
                      <Link
                        href={`/instituicao/aluno/prova/${exam.id}/resultado`}
                        className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs"
                      >
                        Ver Devolutiva Completa →
                      </Link>
                    </>
                  ) : (
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 italic flex items-center gap-1">
                      <span>🔒</span> Aguardando liberação do gabarito pelo docente
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ABA 5: PRATICAR (LISTAS ATRIBUÍDAS E PRÁTICA DIRIGIDA POR EIXO) (AL-05) */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "praticar" && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>✍️</span> Praticar Questões do Banco
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Respostas registradas contam diretamente para o volume de treino no acompanhamento institucional.
                </p>
              </div>

              {/* Filtro de Eixo / Lista */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-gray-400">Área Médica:</label>
                <select
                  value={practiceArea}
                  onChange={(e) => {
                    setPracticeArea(e.target.value);
                    setCurrentQuestionIndex(0);
                    setSelectedOption(null);
                    setIsAnswerConfirmed(false);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                >
                  <option value="todas">Todas as áreas</option>
                  {areas.map((a, i) => (
                    <option key={i} value={a.area}>
                      {a.area} ({a.percentage}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* INTERFACE DE RESOLUÇÃO DE QUESTÃO */}
            {!currentQuestion ? (
              <div className="p-8 text-center text-xs text-gray-500 dark:text-gray-400">
                Nenhuma questão disponível para o filtro selecionado. Tente selecionar &quot;Todas as áreas&quot;.
              </div>
            ) : (
              <div className="space-y-5 max-w-3xl mx-auto">
                {/* Meta e badges */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-semibold text-gray-700 dark:text-gray-300">
                      {currentQuestion.area}
                    </span>
                    {currentQuestion.subarea && (
                      <span className="text-gray-500">{currentQuestion.subarea}</span>
                    )}
                  </div>
                  <div>
                    Questão {(currentQuestionIndex % filteredQuestions.length) + 1} de{" "}
                    {filteredQuestions.length}
                    {sessionAnsweredCount > 0 && (
                      <span className="ml-2 text-teal-600 font-medium">
                        ({sessionAnsweredCount} respondidas nesta sessão)
                      </span>
                    )}
                  </div>
                </div>

                {/* Contexto Clínico */}
                {currentQuestion.clinicalContext && (
                  <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-gray-800/40 border-l-4 border-teal-500 text-xs text-gray-700 dark:text-gray-300 italic leading-relaxed">
                    {currentQuestion.clinicalContext}
                  </div>
                )}

                {/* Enunciado */}
                <div className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed">
                  {currentQuestion.statement}
                </div>

                {/* Alternativas */}
                <div className="space-y-2 pt-2">
                  {currentQuestion.options.map((opt) => {
                    const isSelected = selectedOption === opt.letter;
                    const isCorrect = opt.isCorrect;

                    let btnStyle =
                      "border-gray-200 dark:border-gray-700 hover:border-teal-500/50 bg-white dark:bg-gray-800";

                    if (isAnswerConfirmed) {
                      if (isCorrect) {
                        btnStyle =
                          "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold";
                      } else if (isSelected && !isCorrect) {
                        btnStyle =
                          "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200";
                      } else {
                        btnStyle = "border-gray-200 dark:border-gray-800 opacity-60";
                      }
                    } else if (isSelected) {
                      btnStyle =
                        "border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 shadow-sm font-medium";
                    }

                    return (
                      <button
                        key={opt.letter}
                        disabled={isAnswerConfirmed}
                        onClick={() => setSelectedOption(opt.letter)}
                        className={`w-full p-3.5 rounded-lg border text-left text-xs transition-colors flex items-start gap-3 ${btnStyle}`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected
                              ? "bg-teal-600 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                          }`}
                        >
                          {opt.letter}
                        </span>
                        <span className="flex-1 mt-0.5 leading-relaxed">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>

                {/* FEEDBACK IMEDIATO COM COMENTÁRIO EXPLICATIVO */}
                {isAnswerConfirmed && (
                  <div className="p-4 rounded-lg border border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/30 space-y-2 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      {selectedOption ===
                      currentQuestion.options.find((o) => o.isCorrect)?.letter ? (
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <span>✅</span> Resposta Correta! Excelente.
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                          <span>❌</span> Resposta Incorreta.
                        </span>
                      )}
                    </div>
                    {currentQuestion.explanation && (
                      <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed pt-1">
                        <strong>Comentário Pedagógico:</strong> {currentQuestion.explanation}
                      </div>
                    )}
                    <div className="text-[11px] text-teal-800 dark:text-teal-300 pt-1 font-medium">
                      ✓ Resposta gravada com sucesso e contabilizada no seu treino institucional.
                    </div>
                  </div>
                )}

                {/* BOTÕES DE AÇÃO */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-gray-500">
                    {practiceInterventionId && (
                      <span>Vinculada à lista de intervenção pedagógica</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {!isAnswerConfirmed ? (
                      <button
                        disabled={!selectedOption || isPendingAnswer}
                        onClick={handleConfirmAnswer}
                        className="px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium text-xs shadow-sm transition-colors"
                      >
                        {isPendingAnswer ? "Gravando..." : "Confirmar Resposta"}
                      </button>
                    ) : (
                      <button
                        onClick={handleNextQuestion}
                        className="px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs shadow-sm transition-colors flex items-center gap-2"
                      >
                        Próxima Questão <span>→</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL DE REVISÃO DE ERROS EM MODO LEITURA (AL-04) */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {reviewExam && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>📖</span> Revisão de Erros: {reviewExam.title}
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Modo Leitura Pedagógico · Sem cronômetro e sem alteração da nota oficial ({reviewExam.studentScore}%)
                </p>
              </div>
              <button
                onClick={() => setReviewExam(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
              {(!reviewExam.wrongItems || reviewExam.wrongItems.length === 0) ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  Parabéns! Você não cometeu erros registrados nesta avaliação ou eles foram integralmente superados.
                </div>
              ) : (
                reviewExam.wrongItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 space-y-3"
                  >
                    <div className="flex items-center justify-between text-gray-500 text-[11px]">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        Item {idx + 1} · {item.area}
                      </span>
                      <span className="text-red-500 font-medium">Marcou: ({item.selectedLetter}) · Correta: ({item.correctLetter})</span>
                    </div>

                    {item.clinicalContext && (
                      <p className="text-gray-600 dark:text-gray-400 italic bg-white dark:bg-gray-900/60 p-2.5 rounded border border-gray-100 dark:border-gray-800">
                        {item.clinicalContext}
                      </p>
                    )}

                    <div className="font-medium text-gray-900 dark:text-white leading-relaxed">
                      {item.statement}
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {item.options.map((opt) => (
                        <div
                          key={opt.letter}
                          className={`p-2 rounded text-[11px] flex items-start gap-2 ${
                            opt.isCorrect
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold border border-emerald-300 dark:border-emerald-800"
                              : opt.letter === item.selectedLetter
                              ? "bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border border-red-300 dark:border-red-800"
                              : "text-gray-600 dark:text-gray-400 opacity-70"
                          }`}
                        >
                          <span className="font-bold shrink-0">({opt.letter})</span>
                          <span>{opt.text}</span>
                        </div>
                      ))}
                    </div>

                    {item.explanation && (
                      <div className="p-2.5 rounded bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 text-[11px] leading-relaxed">
                        <strong>Comentário do Professor:</strong> {item.explanation}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
              <button
                onClick={() => setReviewExam(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium text-xs transition-colors"
              >
                Fechar Revisão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RODAPÉ PADRONIZADO BASE / PERÍODO / FONTE ── */}
      <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap items-center justify-between gap-3">
        <div>
          <strong>Base:</strong> Registros individuais do estudante ({studentName}) ·{" "}
          <strong>Período:</strong> Ciclo letivo 2026.2 ·{" "}
          <strong>Fonte:</strong> MedPleni Avaliações B2B + Plataforma de Treino B2C
        </div>
        <div className="text-gray-400 dark:text-gray-500">
          Régua de proficiência: 60% · DCN Medicina art. 36-37
        </div>
      </div>
    </div>
  );
}
