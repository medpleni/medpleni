"use client";

import React, { useState, useEffect, useRef, useTransition, useId } from "react";
import type { StudentExamState, StudentExamQuestion } from "@/lib/b2b/player-actions";
import {
  recordStudentAnswerAction,
  toggleMarkForReviewAction,
  logSessionEventAction,
  submitStudentExamAction,
} from "@/lib/b2b/player-actions";
import type { OptionLetter } from "@/lib/b2b/assessments";

interface PlayerClientProps {
  initialExamState: StudentExamState;
  studentName: string;
}

export default function PlayerClient({ initialExamState, studentName }: PlayerClientProps) {
  const [examState, setExamState] = useState<StudentExamState>(initialExamState);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(initialExamState.remainingSeconds);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(initialExamState.status === "finalizada");
  const [isNavGridOpen, setIsNavGridOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "offline">("saved");
  const [isPending, startTransition] = useTransition();

  const confirmSubmitId = useId();
  const currentQuestion: StudentExamQuestion | undefined = examState.questions[currentIndex];
  const itemStartTimeRef = useRef<number>(Date.now());

  // 1. Cronômetro regressivo com persistência
  useEffect(() => {
    if (isSubmitted || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinalSubmit(); // Tempo esgotado: auto-submete
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSubmitted, remainingSeconds]);

  // 2. Telemetria de sessão (blur, focus, tab switch)
  useEffect(() => {
    const handleBlur = () => {
      logSessionEventAction({
        attemptId: examState.attemptId,
        eventType: "session_blur",
        metadata: { currentQuestionIndex: currentIndex + 1 },
      });
    };

    const handleFocus = () => {
      logSessionEventAction({
        attemptId: examState.attemptId,
        eventType: "session_focus",
        metadata: { currentQuestionIndex: currentIndex + 1 },
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logSessionEventAction({
          attemptId: examState.attemptId,
          eventType: "tab_switch",
          metadata: { currentQuestionIndex: currentIndex + 1 },
        });
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [examState.attemptId, currentIndex]);

  // 3. Salvar resposta (Autosave com backup local em caso de queda)
  const handleSelectOption = (letter: OptionLetter) => {
    if (isSubmitted || !currentQuestion) return;

    const timeSpent = Math.max(1, Math.floor((Date.now() - itemStartTimeRef.current) / 1000));
    itemStartTimeRef.current = Date.now();

    // Atualização otimista imediata na interface
    const updatedQuestions = [...examState.questions];
    updatedQuestions[currentIndex] = {
      ...currentQuestion,
      markedFormLetter: letter,
    };
    setExamState({ ...examState, questions: updatedQuestions });

    // Backup local (proteção contra queda de conexão)
    try {
      const backupKey = `medpleni_attempt_${examState.attemptId}`;
      const savedAnswers = JSON.parse(localStorage.getItem(backupKey) || "{}");
      savedAnswers[currentQuestion.assessmentItemId] = letter;
      localStorage.setItem(backupKey, JSON.stringify(savedAnswers));
    } catch {
      // Ignora erro de quota em localStorage
    }

    // Persistência assíncrona no servidor
    setSaveStatus("saving");
    recordStudentAnswerAction({
      attemptId: examState.attemptId,
      assessmentItemId: currentQuestion.assessmentItemId,
      markedFormLetter: letter,
      timeSpentSeconds: timeSpent,
    })
      .then((res) => {
        setSaveStatus(res.success ? "saved" : "offline");
      })
      .catch(() => {
        setSaveStatus("offline");
      });
  };

  // 4. Marcar para revisar
  const handleToggleReview = () => {
    if (!currentQuestion) return;

    const updatedQuestions = [...examState.questions];
    const newStatus = !currentQuestion.isMarkedForReview;
    updatedQuestions[currentIndex] = {
      ...currentQuestion,
      isMarkedForReview: newStatus,
    };
    setExamState({ ...examState, questions: updatedQuestions });

    toggleMarkForReviewAction({
      attemptId: examState.attemptId,
      assessmentItemId: currentQuestion.assessmentItemId,
    });
  };

  // 5. Finalizar prova
  const handleFinalSubmit = () => {
    startTransition(async () => {
      await submitStudentExamAction(examState.attemptId);
      setIsSubmitted(true);
      setIsSubmitModalOpen(false);
      // Limpa backup
      try {
        localStorage.removeItem(`medpleni_attempt_${examState.attemptId}`);
      } catch {
        // Ignora
      }
    });
  };

  // Formatação do tempo HH:MM:SS
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}:` : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const answeredCount = examState.questions.filter((q) => q.markedFormLetter !== null).length;
  const reviewCount = examState.questions.filter((q) => q.isMarkedForReview).length;
  const totalCount = examState.questions.length;

  // Tela de Conclusão pós-envio
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-xl border border-border bg-card text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-xl font-bold">
            ✓
          </div>
          <h1 className="text-lg font-bold text-foreground">
            Prova Concluída com Sucesso!
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Suas respostas foram registradas e consolidadas no caderno oficial.
          </p>

          <div className="p-3.5 rounded-lg bg-muted/40 border border-border text-xs text-left space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avaliação:</span>
              <span className="font-semibold text-foreground">{examState.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Forma Utilizada:</span>
              <span className="font-semibold text-foreground">Tipo {examState.formCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Questões Respondidas:</span>
              <span className="font-semibold text-foreground">
                {answeredCount} de {totalCount}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground italic">
            O gabarito oficial e os comentários questão a questão estarão disponíveis nesta mesma tela assim que o professor liberar a correção.
          </p>

          <a
            href="/instituicao"
            className="inline-block px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Voltar ao Painel Institucional
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── BARRA SUPERIOR: TÍTULO, CRONÔMETRO E STATUS DE SALVAMENTO ── */}
      <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="font-bold text-xs text-foreground truncate max-w-xs sm:max-w-md">
            {examState.title}
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
            Caderno {examState.formCode}
          </span>
          <span className="text-[11px] text-muted-foreground hidden md:inline">
            • {studentName}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Status do Salvamento */}
          <div className="text-[11px] flex items-center gap-1.5 text-muted-foreground">
            {saveStatus === "saving" && (
              <span className="text-amber-600 dark:text-amber-400">Salvando...</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-emerald-600 dark:text-emerald-400">✓ Salvo</span>
            )}
            {saveStatus === "offline" && (
              <span className="text-rose-600 dark:text-rose-400">Salvo localmente</span>
            )}
          </div>

          {/* Cronômetro Regressivo */}
          <div
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border ${
              remainingSeconds < 300
                ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 animate-pulse"
                : "bg-muted text-foreground border-border"
            }`}
          >
            ⏱ {formatTime(remainingSeconds)}
          </div>

          {/* Botão de Finalizar */}
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
          >
            Entregar Prova
          </button>
        </div>
      </header>

      {/* ── ÁREA PRINCIPAL: UMA QUESTÃO POR VEZ ── */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {currentQuestion && (
          <div className="bg-card border border-border rounded-xl p-5 sm:p-7 space-y-6 shadow-xs">
            {/* Topo da Questão */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Questão {currentQuestion.orderNumber} de {totalCount}
              </span>

              <button
                onClick={handleToggleReview}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                  currentQuestion.isMarkedForReview
                    ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700 font-bold"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                <span>{currentQuestion.isMarkedForReview ? "★" : "☆"}</span>
                {currentQuestion.isMarkedForReview ? "Marcada para Revisar" : "Marcar para Revisar"}
              </button>
            </div>

            {/* Contexto Clínico se houver */}
            {currentQuestion.clinicalContext && (
              <div className="p-3.5 rounded-lg bg-muted/40 border-l-2 border-primary text-xs text-foreground leading-relaxed italic">
                {currentQuestion.clinicalContext}
              </div>
            )}

            {/* Enunciado da Questão */}
            <div className="text-sm text-foreground font-medium leading-relaxed">
              {currentQuestion.statement}
            </div>

            {/* Alternativas A a E */}
            <div className="space-y-2.5 pt-2">
              {currentQuestion.options.map((option) => {
                const isSelected = currentQuestion.markedFormLetter === option.letter;

                return (
                  <button
                    key={option.letter}
                    onClick={() => handleSelectOption(option.letter)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3.5 ${
                      isSelected
                        ? "bg-primary/5 border-primary text-foreground font-medium ring-1 ring-primary shadow-xs"
                        : "bg-card border-border text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {option.letter}
                    </span>
                    <span className="text-xs leading-relaxed pt-0.5">
                      {option.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── NAVEGAÇÃO ANTERIOR / PRÓXIMA ── */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => {
              itemStartTimeRef.current = Date.now();
              setCurrentIndex((prev) => Math.max(0, prev - 1));
            }}
            disabled={currentIndex === 0}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors disabled:opacity-40"
          >
            ← Anterior
          </button>

          <button
            onClick={() => setIsNavGridOpen(!isNavGridOpen)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-primary hover:bg-primary/5 transition-colors"
          >
            Ver Todas ({answeredCount}/{totalCount})
          </button>

          <button
            onClick={() => {
              itemStartTimeRef.current = Date.now();
              setCurrentIndex((prev) => Math.min(totalCount - 1, prev + 1));
            }}
            disabled={currentIndex === totalCount - 1}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            Próxima →
          </button>
        </div>

        {/* ── GAIOLA DE NAVEGAÇÃO (GRADE DE QUESTÕES) ── */}
        {isNavGridOpen && (
          <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span>Mapa de Questões</span>
              <div className="flex items-center gap-3 text-[11px] font-normal text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Respondida
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Para Revisar
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700 inline-block" /> Em Branco
                </span>
              </div>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 max-h-48 overflow-y-auto p-1">
              {examState.questions.map((q, idx) => {
                const isAnswered = q.markedFormLetter !== null;
                const isReview = q.isMarkedForReview;
                const isCurrent = idx === currentIndex;

                let colorClasses = "bg-muted text-foreground hover:bg-muted/80";
                if (isReview) {
                  colorClasses = "bg-amber-500 text-white font-bold";
                } else if (isAnswered) {
                  colorClasses = "bg-emerald-600 text-white font-bold";
                }

                return (
                  <button
                    key={q.assessmentItemId}
                    onClick={() => {
                      itemStartTimeRef.current = Date.now();
                      setCurrentIndex(idx);
                      setIsNavGridOpen(false);
                    }}
                    className={`h-9 rounded-md text-xs font-medium transition-all ${colorClasses} ${
                      isCurrent ? "ring-2 ring-primary ring-offset-1" : ""
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL DE CONFIRMAÇÃO DE ENTREGA ── */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">
              Confirmar Entrega da Prova?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Após a entrega, suas respostas serão registradas definitivamente e você não poderá mais alterá-las.
            </p>

            <div className="p-3.5 rounded-lg bg-muted/40 border border-border text-xs space-y-2">
              <div className="flex justify-between">
                <span>Total de Questões:</span>
                <span className="font-bold text-foreground">{totalCount}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Respondidas:</span>
                <span className="font-bold">{answeredCount}</span>
              </div>
              <div className="flex justify-between text-amber-600 dark:text-amber-400">
                <span>Marcadas para Revisar:</span>
                <span className="font-bold">{reviewCount}</span>
              </div>
              {totalCount - answeredCount > 0 && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
                  <span>Questões em Branco:</span>
                  <span>{totalCount - answeredCount}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                disabled={isPending}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted text-foreground transition-colors"
              >
                Continuar Respondendo
              </button>
              <button
                id={confirmSubmitId}
                onClick={handleFinalSubmit}
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
              >
                {isPending ? "Gravando..." : "Sim, Entregar Agora"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
