"use client";

import React, { useState, useTransition } from "react";
import type { B2BUserContext } from "@/lib/b2b/types";
import type { MonitorCandidate, MonitorStats } from "@/lib/b2b/player-actions";
import {
  reopenStudentAttemptAction,
  setStudentExtraTimeAction,
  closeExamApplicationAction,
  releaseExamAnswersAction,
} from "@/lib/b2b/player-actions";
import { IndicatorFootnote } from "@/components/b2b";

interface MonitorClientProps {
  assessment: {
    id: string;
    title: string;
    type: string;
    modality: string;
    status: string;
    duration_minutes: number;
    starts_at?: string | null;
    ends_at?: string | null;
    answers_released_at?: string | null;
  };
  initialStats: MonitorStats;
  initialCandidates: MonitorCandidate[];
  context: B2BUserContext;
}

export default function MonitorClient({
  assessment,
  initialStats,
  initialCandidates,
  context,
}: MonitorClientProps) {
  const [stats, setStats] = useState<MonitorStats>(initialStats);
  const [candidates, setCandidates] = useState<MonitorCandidate[]>(initialCandidates);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modais de Ação do Professor
  const [reopenCandidate, setReopenCandidate] = useState<MonitorCandidate | null>(null);
  const [reopenReason, setReopenReason] = useState("");

  const [extraTimeCandidate, setExtraTimeCandidate] = useState<MonitorCandidate | null>(null);
  const [extraMinutesInput, setExtraMinutesInput] = useState(15);

  const filteredCandidates = candidates.filter((c) => {
    if (statusFilter !== "todos" && c.status !== statusFilter) return false;
    if (searchTerm.trim() && !c.studentName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleCloseExam = () => {
    if (!confirm("Deseja realmente encerrar a aplicação desta avaliação?")) return;

    startTransition(async () => {
      const res = await closeExamApplicationAction(assessment.id);
      if (res.success) {
        setFeedback({ text: "Aplicação encerrada com sucesso.", type: "success" });
      } else {
        setFeedback({ text: res.message || "Erro ao encerrar prova.", type: "error" });
      }
    });
  };

  const handleReleaseAnswers = () => {
    if (!confirm("Liberar gabaritos e comentários explicativos para todos os alunos convocados?")) return;

    startTransition(async () => {
      const res = await releaseExamAnswersAction(assessment.id);
      if (res.success) {
        setStats({ ...stats, answersReleased: true });
        setFeedback({ text: "Gabaritos e comentários liberados com sucesso para os alunos!", type: "success" });
      } else {
        setFeedback({ text: res.message || "Erro ao liberar gabaritos.", type: "error" });
      }
    });
  };

  const handleReopenSubmit = () => {
    if (!reopenCandidate?.attemptId || !reopenReason.trim()) return;

    startTransition(async () => {
      const res = await reopenStudentAttemptAction({
        attemptId: reopenCandidate.attemptId!,
        reason: reopenReason,
      });

      if (res.success) {
        setFeedback({ text: `Prova reaberta para ${reopenCandidate.studentName}.`, type: "success" });
        setCandidates((prev) =>
          prev.map((c) =>
            c.attemptId === reopenCandidate.attemptId ? { ...c, status: "em_andamento" } : c
          )
        );
        setReopenCandidate(null);
        setReopenReason("");
      } else {
        setFeedback({ text: res.message || "Erro ao reabrir prova.", type: "error" });
      }
    });
  };

  const handleExtraTimeSubmit = () => {
    if (!extraTimeCandidate?.attemptId) return;

    startTransition(async () => {
      const res = await setStudentExtraTimeAction({
        attemptId: extraTimeCandidate.attemptId!,
        extraMinutes: extraMinutesInput,
      });

      if (res.success) {
        setFeedback({ text: `Tempo adicional de ${extraMinutesInput} min concedido com sucesso.`, type: "success" });
        setCandidates((prev) =>
          prev.map((c) =>
            c.attemptId === extraTimeCandidate.attemptId
              ? { ...c, extraTimeMinutes: extraMinutesInput }
              : c
          )
        );
        setExtraTimeCandidate(null);
      } else {
        setFeedback({ text: res.message || "Erro ao conceder tempo extra.", type: "error" });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Notificação */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg flex items-center justify-between text-xs ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="underline ml-4">
            Fechar
          </button>
        </div>
      )}

      {/* BLOCO 1: Topo e Controles do Professor */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <a
              href="/instituicao/provas"
              className="text-xs text-muted-foreground hover:text-foreground font-medium"
            >
              ← Voltar para Provas
            </a>
            <span className="text-muted-foreground">•</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary capitalize">
              {assessment.modality}
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Painel de Aplicação — {assessment.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitoramento em tempo real, controle de presença, acessibilidade e liberação de gabarito
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Encerrar Aplicação */}
          <button
            onClick={handleCloseExam}
            disabled={isPending}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors disabled:opacity-50"
          >
            Encerrar Aplicação
          </button>

          {/* Botão de Liberar Gabarito */}
          <button
            onClick={handleReleaseAnswers}
            disabled={isPending || stats.answersReleased}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors shadow-xs ${
              stats.answersReleased
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 cursor-default"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {stats.answersReleased ? "✓ Gabarito Liberado" : "Liberar Gabarito e Comentários"}
          </button>
        </div>
      </div>

      {/* BLOCO 2: KPIs de Monitoramento */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-lg border border-border bg-card">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Convocados
          </span>
          <span className="text-xl font-bold text-foreground mt-1 block">
            {stats.totalCandidates}
          </span>
        </div>
        <div className="p-3.5 rounded-lg border border-border bg-card">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Não Iniciou
          </span>
          <span className="text-xl font-bold text-zinc-500 mt-1 block">
            {stats.notStarted}
          </span>
        </div>
        <div className="p-3.5 rounded-lg border border-border bg-card">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Em Andamento
          </span>
          <span className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
            {stats.inProgress}
          </span>
        </div>
        <div className="p-3.5 rounded-lg border border-border bg-card">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Finalizadas
          </span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {stats.submitted}
          </span>
        </div>
        <div className="p-3.5 rounded-lg border border-border bg-card">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
            Ausentes
          </span>
          <span className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1 block">
            {stats.absent}
          </span>
        </div>
      </div>

      {/* BLOCO 3: Barra de Filtros */}
      <div className="p-3 rounded-lg border border-border bg-card flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 max-w-sm">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar aluno por nome..."
            className="w-full px-3 py-1.5 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none"
          >
            <option value="todos">Todos os status</option>
            <option value="nao_iniciou">Não iniciou</option>
            <option value="em_andamento">Em andamento</option>
            <option value="finalizada">Finalizada</option>
            <option value="ausente">Ausente</option>
          </select>
        </div>
      </div>

      {/* BLOCO 4: Tabela de Alunos e Ações Individuais */}
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
              <tr>
                <th className="py-2.5 px-3">Aluno</th>
                <th className="py-2.5 px-3">Turma</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Respostas</th>
                <th className="py-2.5 px-3">Tempo Extra</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                    Nenhum aluno encontrado para este filtro.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((c) => {
                  const statusColors: Record<string, string> = {
                    nao_iniciou: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                    em_andamento: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                    finalizada: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                    ausente: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
                  };

                  return (
                    <tr key={c.studentUserId} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-foreground">{c.studentName}</div>
                        <div className="text-[11px] text-muted-foreground">{c.studentEmail}</div>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {c.classGroupLabel}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                            statusColors[c.status] || "bg-zinc-100 text-zinc-800"
                          }`}
                        >
                          {c.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-foreground font-mono">
                        {c.answersCount} salvas
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {c.extraTimeMinutes > 0 ? (
                          <span className="font-bold text-primary">+{c.extraTimeMinutes} min</span>
                        ) : (
                          "0 min"
                        )}
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5">
                        {/* Conceder Tempo Extra */}
                        <button
                          onClick={() => {
                            setExtraTimeCandidate(c);
                            setExtraMinutesInput(c.extraTimeMinutes || 15);
                          }}
                          className="px-2 py-1 text-[11px] font-medium rounded border border-border hover:bg-muted text-foreground transition-colors"
                        >
                          + Tempo
                        </button>

                        {/* Reabrir Prova */}
                        {c.status === "finalizada" && (
                          <button
                            onClick={() => {
                              setReopenCandidate(c);
                              setReopenReason("");
                            }}
                            className="px-2 py-1 text-[11px] font-medium rounded border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950 transition-colors"
                          >
                            Reabrir
                          </button>
                        )}
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
        base={`${candidates.length} alunos convocados`}
        periodo="Ano Letivo 2027"
        fonte="Telemetria de Aplicação em Tempo Real (PR-12, PR-13)"
      />

      {/* MODAL: REABERTURA COM JUSTIFICATIVA REGISTRADA */}
      {reopenCandidate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">
              Reabrir Prova para {reopenCandidate.studentName}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Conforme exigência de auditoria e integridade acadêmica, registre a justificativa formal para a reabertura desta tentativa.
            </p>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Justificativa Obrigatória *
              </label>
              <textarea
                rows={3}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Ex: Aluno apresentou atestado médico comprovando queda de sinal durante o horário regular..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setReopenCandidate(null)}
                disabled={isPending}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReopenSubmit}
                disabled={isPending || reopenReason.trim().length < 5}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-xs disabled:opacity-50"
              >
                {isPending ? "Gravando..." : "Confirmar Reabertura"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ACESSIBILIDADE / TEMPO EXTRA */}
      {extraTimeCandidate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">
              Acessibilidade: Tempo Extra
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Defina o tempo adicional em minutos concedido a <strong>{extraTimeCandidate.studentName}</strong>.
            </p>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Minutos Adicionais
              </label>
              <input
                type="number"
                min={0}
                max={120}
                value={extraMinutesInput}
                onChange={(e) => setExtraMinutesInput(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setExtraTimeCandidate(null)}
                disabled={isPending}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-border hover:bg-muted text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleExtraTimeSubmit}
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
              >
                {isPending ? "Salvando..." : "Salvar Tempo Extra"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
