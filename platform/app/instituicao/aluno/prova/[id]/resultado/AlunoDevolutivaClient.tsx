"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

interface ItemDetail {
  id: string;
  orderIndex: number;
  statement: string;
  clinicalContext?: string | null;
  options: Array<{ letter: string; text: string; is_correct: boolean }>;
  correctLetter: string;
  explanation?: string | null;
  area: string;
  tema?: string;
  status: string;
  weight: number;
  studentMarkedLetter: string | null;
  isCorrect: boolean;
  timeSpentSeconds: number;
}

interface AlunoDevolutivaClientProps {
  assessment: {
    id: string;
    title: string;
    type: string;
    answersReleasedAt?: string | null;
  };
  isReleased: boolean;
  isTeacherViewing: boolean;
  student: {
    userId: string;
    name: string;
    classGroupName: string;
  };
  attempt: {
    status: string;
    scorePercentage: number;
    scoreRaw: number;
    formCode: string;
  } | null;
  classGroupAverage: number;
  areaBreakdown: Record<string, { total: number; correct: number }>;
  items: ItemDetail[];
}

export default function AlunoDevolutivaClient({
  assessment,
  isReleased,
  isTeacherViewing,
  student,
  attempt,
  classGroupAverage,
  areaBreakdown,
  items,
}: AlunoDevolutivaClientProps) {
  const [filterMode, setFilterMode] = useState<"todas" | "erros" | "acertos">("todas");
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>("todas");

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchArea = selectedAreaFilter === "todas" || it.area === selectedAreaFilter;
      if (!matchArea) return false;

      if (filterMode === "erros") {
        return !it.isCorrect && it.status !== "anulado";
      }
      if (filterMode === "acertos") {
        return it.isCorrect && it.status !== "anulado";
      }
      return true;
    });
  }, [items, filterMode, selectedAreaFilter]);

  // Se o gabarito ainda não foi liberado pelo professor
  if (!isReleased) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="bg-card border border-border rounded-xl p-8 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center mx-auto text-xl font-bold">
            ⏳
          </div>
          <h1 className="text-lg font-bold text-foreground">
            Gabarito e Comentários Aguardando Liberação
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Sua prova foi entregue com sucesso e está devidamente registrada no sistema.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Os comentários questão a questão, os acertos por área e o gabarito oficial serão disponibilizados nesta mesma tela assim que o professor responsável concluir o período de correção da avaliação.
          </p>
          <div className="pt-2">
            <Link
              href="/instituicao"
              className="inline-block px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Voltar ao Painel Institucional
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const score = attempt?.scorePercentage || 0;
  const isAboveCut = score >= 60;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* ─── AVISO DE MODO DOCENTE (SE APLICÁVEL) ─── */}
      {isTeacherViewing && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center justify-between dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
          <span>
            👁 Visualizando devolutiva pedagógica individual do estudante: <strong>{student.name}</strong> ({student.classGroupName})
          </span>
          <Link
            href={`/instituicao/provas/${assessment.id}/resultado`}
            className="font-bold underline hover:no-underline ml-4"
          >
            Voltar ao Resultado Geral
          </Link>
        </div>
      )}

      {/* ─── BLOCO 1: BANNER DE RESULTADO PESSOAL (SEM RANKING) ─── */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wider">
              Devolutiva Oficial • Modo Leitura
            </span>
            <h1 className="text-xl font-bold text-foreground mt-1 tracking-tight">
              {assessment.title}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Estudante: <strong>{student.name}</strong> • Turma: {student.classGroupName} • Caderno {attempt?.formCode || "A"}
            </p>
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
            <div>
              <div className="text-[11px] font-medium text-muted-foreground">Sua Nota</div>
              <div
                className={`text-3xl font-black ${
                  isAboveCut ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {score}%
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {isAboveCut ? "Acima da régua de 60%" : "Abaixo da régua de 60%"}
              </div>
            </div>

            <div className="border-l border-border pl-6">
              <div className="text-[11px] font-medium text-muted-foreground">Média da Turma</div>
              <div className="text-2xl font-bold text-foreground mt-0.5">
                {classGroupAverage}%
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Sem ranking competitivo
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── BLOCO 2: ACERTOS POR GRANDE ÁREA MÉDICA ─── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
        <h2 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
          Desempenho por Grande Área Médica
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(areaBreakdown).map(([areaName, stat]) => {
            const pct = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
            return (
              <div key={areaName} className="p-3 rounded-lg border border-border bg-muted/30">
                <div className="text-xs font-semibold text-foreground truncate" title={areaName}>
                  {areaName}
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-lg font-bold text-foreground">{pct}%</span>
                  <span className="text-[11px] text-muted-foreground">
                    {stat.correct} de {stat.total}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    style={{ width: `${pct}%` }}
                    className={`h-full rounded-full ${
                      pct >= 60 ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── BLOCO 3: MODO LEITURA E REVISÃO DOS ERROS ─── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Revisão dos Erros em Modo Leitura
            </h2>
            <p className="text-xs text-muted-foreground">
              Sem cronômetro. Estude cada questão com sua resposta assinalada e o comentário oficial do professor.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs">
              <button
                onClick={() => setFilterMode("todas")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  filterMode === "todas" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                }`}
              >
                Todas ({items.length})
              </button>
              <button
                onClick={() => setFilterMode("erros")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  filterMode === "erros" ? "bg-card text-rose-600 shadow-xs" : "text-muted-foreground"
                }`}
              >
                Erros ({items.filter((i) => !i.isCorrect && i.status !== "anulado").length})
              </button>
              <button
                onClick={() => setFilterMode("acertos")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  filterMode === "acertos" ? "bg-card text-emerald-600 shadow-xs" : "text-muted-foreground"
                }`}
              >
                Acertos ({items.filter((i) => i.isCorrect).length})
              </button>
            </div>

            <select
              value={selectedAreaFilter}
              onChange={(e) => setSelectedAreaFilter(e.target.value)}
              className="text-xs rounded-lg border border-border bg-background px-2.5 py-1 text-foreground"
            >
              <option value="todas">Todas as áreas</option>
              {Object.keys(areaBreakdown).map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de Itens */}
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isAnnulled = item.status === "anulado";

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all ${
                  isAnnulled
                    ? "border-muted bg-muted/20"
                    : item.isCorrect
                    ? "border-emerald-200 bg-emerald-50/20 dark:border-emerald-950/40"
                    : "border-rose-200 bg-rose-50/20 dark:border-rose-950/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      Questão {item.orderIndex}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                      {item.area}
                    </span>
                    {item.tema && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {item.tema}
                      </span>
                    )}
                  </div>

                  <div>
                    {isAnnulled ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                        Item Anulado
                      </span>
                    ) : item.isCorrect ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        ✓ Você Acertou
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        ✗ Você Errou
                      </span>
                    )}
                  </div>
                </div>

                {item.clinicalContext && (
                  <div className="text-xs text-muted-foreground italic bg-muted/40 p-2.5 rounded-lg mb-2 border-l-2 border-primary/40">
                    {item.clinicalContext}
                  </div>
                )}

                <div className="text-xs font-medium text-foreground mb-3 leading-relaxed">
                  {item.statement}
                </div>

                {/* Alternativas */}
                <div className="space-y-1.5 mb-3">
                  {item.options.map((opt) => {
                    const isStudentChoice = item.studentMarkedLetter === opt.letter;
                    const isOfficialCorrect = item.correctLetter === opt.letter;

                    let rowStyle = "border-border bg-background";
                    if (isOfficialCorrect) {
                      rowStyle = "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 font-semibold";
                    } else if (isStudentChoice && !item.isCorrect) {
                      rowStyle = "border-rose-400 bg-rose-50/60 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100";
                    }

                    return (
                      <div
                        key={opt.letter}
                        className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${rowStyle}`}
                      >
                        <span className="w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {opt.letter}
                        </span>
                        <div className="flex-1 leading-relaxed">{opt.text}</div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isStudentChoice && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-foreground text-background">
                              Sua Escolha
                            </span>
                          )}
                          {isOfficialCorrect && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                              Gabarito
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Comentário / Devolutiva Pedagógica */}
                {item.explanation && (
                  <div className="mt-3 pt-3 border-t border-border/80 text-xs">
                    <span className="font-bold text-foreground text-[11px] uppercase tracking-wider block mb-1">
                      Comentário & Justificativa Pedagógica
                    </span>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-[11px] bg-muted/20 p-2.5 rounded-lg">
                      {item.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
