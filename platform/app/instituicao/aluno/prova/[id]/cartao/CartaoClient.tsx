"use client";

import React, { useState, useTransition } from "react";
import type { StudentExamState } from "@/lib/b2b/player-actions";
import { recordStudentAnswerAction, submitStudentExamAction } from "@/lib/b2b/player-actions";
import type { OptionLetter } from "@/lib/b2b/assessments";

interface CartaoClientProps {
  initialExamState: StudentExamState;
  studentName: string;
}

export default function CartaoClient({ initialExamState, studentName }: CartaoClientProps) {
  const [examState, setExamState] = useState<StudentExamState>(initialExamState);
  const [isSubmitted, setIsSubmitted] = useState(initialExamState.status === "finalizada");
  const [isPending, startTransition] = useTransition();

  const handleSelectBubble = (index: number, letter: OptionLetter) => {
    if (isSubmitted) return;

    const item = examState.questions[index];
    if (!item) return;

    // Toggle se clicar na mesma já marcada
    const newLetter = item.markedFormLetter === letter ? null : letter;

    const updated = [...examState.questions];
    updated[index] = { ...item, markedFormLetter: newLetter };
    setExamState({ ...examState, questions: updated });

    recordStudentAnswerAction({
      attemptId: examState.attemptId,
      assessmentItemId: item.assessmentItemId,
      markedFormLetter: newLetter,
      timeSpentSeconds: 5,
    });
  };

  const handleFinalSubmit = () => {
    startTransition(async () => {
      await submitStudentExamAction(examState.attemptId);
      setIsSubmitted(true);
    });
  };

  const answeredCount = examState.questions.filter((q) => q.markedFormLetter !== null).length;
  const totalCount = examState.questions.length;

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full p-6 rounded-xl border border-border bg-card text-center space-y-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-lg font-bold">
            ✓
          </div>
          <h1 className="text-base font-bold text-foreground">Cartão Entregue!</h1>
          <p className="text-xs text-muted-foreground">
            {answeredCount} de {totalCount} questões preenchidas no caderno {examState.formCode}.
          </p>
          <a
            href="/instituicao"
            className="inline-block px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Voltar
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto border-x border-border">
      {/* Topo Mobile */}
      <header className="p-4 border-b border-border bg-card sticky top-0 z-10 space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-xs text-foreground truncate pr-2">
            Cartão de Respostas — {examState.title}
          </h1>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary shrink-0">
            Tipo {examState.formCode}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{studentName}</span>
          <span className="font-semibold text-foreground">
            {answeredCount} de {totalCount} preenchidas
          </span>
        </div>
      </header>

      {/* Grade de Bolhas */}
      <main className="flex-1 p-4 space-y-2.5 overflow-y-auto">
        {examState.questions.map((q, idx) => (
          <div
            key={q.assessmentItemId}
            className="flex items-center justify-between p-2 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
          >
            <span className="text-xs font-bold text-muted-foreground w-8">
              #{idx + 1}
            </span>

            <div className="flex items-center gap-2">
              {(["A", "B", "C", "D", "E"] as OptionLetter[]).map((letter) => {
                const isSelected = q.markedFormLetter === letter;
                return (
                  <button
                    key={letter}
                    onClick={() => handleSelectBubble(idx, letter)}
                    className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary ring-offset-1"
                        : "bg-muted text-foreground hover:bg-muted/80 border border-input"
                    }`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </main>

      {/* Rodapé com botão de envio */}
      <footer className="p-4 border-t border-border bg-card sticky bottom-0">
        <button
          onClick={handleFinalSubmit}
          disabled={isPending}
          className="w-full py-2.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
        >
          {isPending ? "Gravando..." : `Finalizar e Enviar Cartão (${answeredCount}/${totalCount})`}
        </button>
      </footer>
    </div>
  );
}
