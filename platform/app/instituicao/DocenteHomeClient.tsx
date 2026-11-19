"use client";

import React from "react";
import Link from "next/link";
import { DocenteDashboardData } from "@/lib/b2b/docente";
import IndicatorFootnote from "@/components/b2b/IndicatorFootnote";

interface DocenteHomeClientProps {
  data: DocenteDashboardData;
  teacherName: string;
}

export default function DocenteHomeClient({
  data,
  teacherName,
}: DocenteHomeClientProps) {
  const { classes, criticalGaps, myExams, pendingQuestionsToReviewCount } = data;

  return (
    <div className="space-y-6">
      {/* Boas-vindas ao Docente */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Espaço do docente
            </h1>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Visão Docente
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhamento das suas turmas, diagnóstico de lacunas e gestão de provas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/instituicao/provas"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            + Nova Prova
          </Link>
          <Link
            href="/instituicao/intervencoes"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-sm"
          >
            + Nova Intervenção
          </Link>
        </div>
      </div>

      {/* Grid com no máximo 4 blocos objetivos (DO-01 / DO-02) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ========================================================================= */}
        {/* BLOCO 1: MINHAS TURMAS */}
        {/* ========================================================================= */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Minhas turmas</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Turmas sob sua docência direta e média na avaliação mais recente.
              </p>
            </div>
            <Link
              href="/instituicao/turmas"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Ver todas →
            </Link>
          </div>

          <div className="space-y-3">
            {classes.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                Nenhuma turma atribuída ao seu escopo docente no momento.
              </div>
            ) : (
              classes.map((c) => (
                <div
                  key={c.classGroupId}
                  className="rounded-lg border border-border bg-muted/20 p-3.5 hover:border-primary/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                        P{c.period}
                      </span>
                      <span className="text-sm font-bold text-foreground">{c.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 block">
                      Última prova: {c.lastExamTitle || "Simulado Recente"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block">Média Turma</span>
                      <span
                        className={`font-bold ${
                          c.lastExamAverageScore !== null && c.lastExamAverageScore >= 60
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {c.lastExamAverageScore !== null
                          ? `${c.lastExamAverageScore.toFixed(1)}%`
                          : "—"}
                      </span>
                    </div>

                    <div className="text-right border-l border-border pl-4">
                      <span className="text-[10px] text-muted-foreground block">&lt; 60%</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {c.studentsBelowCutCount} alunos
                      </span>
                    </div>

                    <Link
                      href={`/instituicao/turmas/${c.classGroupId}`}
                      className="rounded-lg bg-card border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                    >
                      Acessar
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BLOCO 2: ONDE A TURMA MAIS ERRA */}
        {/* ========================================================================= */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Onde a turma mais erra</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Áreas e temas com rendimento crítico (&lt; 60%) que demandam reforço.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {criticalGaps.length === 0 ? (
              <div className="text-center py-8 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Nenhuma lacuna crítica abaixo de 60% detectada nas suas turmas.
              </div>
            ) : (
              criticalGaps.map((gap, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-2 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        {gap.axisValue}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {gap.classGroupName} · {gap.questionsCount} questões avaliadas
                      </span>
                    </div>

                    <span className="rounded bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                      {gap.averageScore.toFixed(1)}% acerto
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                    <Link
                      href={`/instituicao/provas?area=${encodeURIComponent(gap.axisValue)}&turma=${gap.classGroupId}`}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Montar prova para a turma →
                    </Link>
                    <span className="text-xs text-muted-foreground">·</span>
                    <Link
                      href={`/instituicao/intervencoes?area=${encodeURIComponent(gap.axisValue)}&turma=${gap.classGroupId}`}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Criar lista de exercícios →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BLOCO 3: MINHAS PROVAS */}
        {/* ========================================================================= */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Minhas provas</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Status das avaliações sob sua autoria ou revisão.
              </p>
            </div>
            <Link
              href="/instituicao/provas"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Ver todas →
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <Link
              href="/instituicao/provas?status=rascunho"
              className="rounded-lg border border-border bg-muted/20 p-3 hover:border-primary/40 transition-colors block"
            >
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Em Rascunho
              </span>
              <span className="text-xl font-bold text-foreground mt-1 block">
                {myExams.draftCount}
              </span>
            </Link>

            <Link
              href="/instituicao/provas?status=em_revisao"
              className="rounded-lg border border-border bg-muted/20 p-3 hover:border-primary/40 transition-colors block"
            >
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Aguard. Revisão
              </span>
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                {myExams.awaitingReviewCount}
              </span>
            </Link>

            <Link
              href="/instituicao/provas?status=aplicada"
              className="rounded-lg border border-border bg-muted/20 p-3 hover:border-primary/40 transition-colors block"
            >
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Aguard. Correção
              </span>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">
                {myExams.awaitingCorrectionCount}
              </span>
            </Link>
          </div>

          {/* Lista compacta de provas recentes */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Avaliações Recentes:
            </span>
            {myExams.recentExams.slice(0, 3).map((ex) => (
              <div
                key={ex.id}
                className="flex items-center justify-between text-xs py-1.5 border-b border-border/40 last:border-0"
              >
                <span className="font-medium text-foreground truncate max-w-[240px]">
                  {ex.title}
                </span>
                <span className="capitalize text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground">
                  {ex.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BLOCO 4: QUESTÕES QUE ME PEDIRAM PARA REVISAR (SEM FILA NA TELA) */}
        {/* ========================================================================= */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="border-b border-border pb-3">
            <h2 className="text-sm font-bold text-foreground">
              Questões que me pediram para revisar
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Itens do banco aguardando parecer ou validação técnica (DO-01).
            </p>
          </div>

          <div className="rounded-xl border border-blue-200/60 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-extrabold text-blue-900 dark:text-blue-100">
                  {pendingQuestionsToReviewCount}
                </span>
                <span className="text-xs font-semibold text-blue-950 dark:text-blue-200">
                  questões aguardando sua revisão
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Conforme aprovado, a tela permanece limpa sem listagem ou filas longas.
              </p>
            </div>

            <Link
              href="/instituicao/banco?tab=revisao"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors shrink-0"
            >
              Abrir Revisão no Banco →
            </Link>
          </div>

          <IndicatorFootnote
            base="Turmas do escopo docente e avaliações atribuídas"
            periodo="Semestre Letivo Atual"
            fonte="MedPleni Institucional · Módulo Docente"
          />
        </div>
      </div>
    </div>
  );
}
