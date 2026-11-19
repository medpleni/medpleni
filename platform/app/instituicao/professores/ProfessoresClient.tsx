"use client";

import React, { useState } from "react";
import {
  TeacherAdherenceSummary,
  TeacherAdherenceRecord,
} from "@/lib/b2b/docente";
import IndicatorFootnote from "@/components/b2b/IndicatorFootnote";

interface ProfessoresClientProps {
  summary: TeacherAdherenceSummary;
}

export default function ProfessoresClient({ summary }: ProfessoresClientProps) {
  const [filterStatus, setFilterStatus] = useState<
    "todos" | "active" | "inactive_30_days" | "never_accessed"
  >("todos");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTeachers = summary.teachers.filter((t) => {
    if (filterStatus !== "todos" && t.activityStatus !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchEmail = t.email.toLowerCase().includes(q);
      const matchClass = t.assignedClasses.some((c) => c.toLowerCase().includes(q));
      if (!matchName && !matchEmail && !matchClass) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Adesão dos professores
            </h1>
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              Gestão Acadêmica · SPR nº 6
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Métricas de engajamento e adesão do corpo docente ao ecossistema MedPleni.
          </p>
        </div>
      </div>

      {/* AVISO METODOLÓGICO OBRIGATÓRIO (SPR nº 6) */}
      <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 dark:border-blue-900/60 dark:bg-blue-950/30 p-4 flex items-start gap-3">
        <span className="text-base mt-0.5">ℹ️</span>
        <div className="text-xs leading-relaxed text-blue-950 dark:text-blue-200">
          <strong>Aviso de Interpretação Institucional:</strong> Este painel reflete exclusivamente
          indicadores de <strong>uso e adesão à ferramenta na plataforma</strong> (último login,
          provas montadas, retestes e submissão de questões), e <strong>não</strong> constitui uma
          avaliação de desempenho pedagógico, competência técnica ou mérito docente.
        </div>
      </div>

      {/* 4 Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setFilterStatus("todos")}
          className={`rounded-xl border p-3.5 shadow-sm cursor-pointer transition-all ${
            filterStatus === "todos"
              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
              : "border-border bg-card hover:bg-muted/30"
          }`}
        >
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Cadastrados
          </span>
          <span className="text-2xl font-bold text-foreground mt-1 block">
            {summary.totalRegistered}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            Docentes no sistema
          </span>
        </div>

        <div
          onClick={() => setFilterStatus("active")}
          className={`rounded-xl border p-3.5 shadow-sm cursor-pointer transition-all ${
            filterStatus === "active"
              ? "border-emerald-500 bg-emerald-50/20 ring-1 ring-emerald-500/40"
              : "border-border bg-card hover:bg-muted/30"
          }`}
        >
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
            Ativos no Período
          </span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {summary.activeInPeriod}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            Acesso nos últimos 30 dias
          </span>
        </div>

        <div
          onClick={() => setFilterStatus("inactive_30_days")}
          className={`rounded-xl border p-3.5 shadow-sm cursor-pointer transition-all ${
            filterStatus === "inactive_30_days"
              ? "border-amber-500 bg-amber-50/20 ring-1 ring-amber-500/40"
              : "border-border bg-card hover:bg-muted/30"
          }`}
        >
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
            Sem Acesso 30+ Dias
          </span>
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
            {summary.inactiveOver30Days}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            Demanda contato da coordenação
          </span>
        </div>

        <div
          onClick={() => setFilterStatus("never_accessed")}
          className={`rounded-xl border p-3.5 shadow-sm cursor-pointer transition-all ${
            filterStatus === "never_accessed"
              ? "border-rose-500 bg-rose-50/20 ring-1 ring-rose-500/40"
              : "border-border bg-card hover:bg-muted/30"
          }`}
        >
          <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
            Nunca Acessaram
          </span>
          <span className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 block">
            {summary.neverAccessed}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            Pendente onboarding inicial
          </span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterStatus("todos")}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              filterStatus === "todos"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Todos ({summary.totalRegistered})
          </button>
          <button
            onClick={() => setFilterStatus("active")}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              filterStatus === "active"
                ? "bg-emerald-600 text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Ativos ({summary.activeInPeriod})
          </button>
          <button
            onClick={() => setFilterStatus("inactive_30_days")}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              filterStatus === "inactive_30_days"
                ? "bg-amber-600 text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Sem Acesso 30+ Dias ({summary.inactiveOver30Days})
          </button>
          <button
            onClick={() => setFilterStatus("never_accessed")}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
              filterStatus === "never_accessed"
                ? "bg-rose-600 text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Nunca Acessaram ({summary.neverAccessed})
          </button>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar professor ou turma..."
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Tabela de Professores */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[850px]">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="py-3 px-4 font-semibold">Professor / E-mail</th>
                <th className="py-3 px-3 font-semibold">Turmas Atribuídas</th>
                <th className="py-3 px-3 font-semibold text-center">Último Acesso</th>
                <th className="py-3 px-3 font-semibold text-center">Provas Criadas</th>
                <th className="py-3 px-3 font-semibold text-center">Provas Aplicadas</th>
                <th className="py-3 px-3 font-semibold text-center">Alunos Alcançados</th>
                <th className="py-3 px-3 font-semibold text-center">Questões ao Banco</th>
                <th className="py-3 px-4 font-semibold text-right">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground text-xs">
                    Nenhum docente encontrado com o filtro atual.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t) => (
                  <tr key={t.userId} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">
                      <span className="font-bold text-foreground block">{t.name}</span>
                      <span className="text-[11px] text-muted-foreground font-normal">
                        {t.email}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {t.assignedClasses.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {t.assignedClasses.map((cls, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground"
                            >
                              {cls}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">
                          Sem turmas atribuídas
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center text-muted-foreground">
                      {t.lastSignInAt ? (
                        <span>
                          {new Date(t.lastSignInAt).toLocaleDateString("pt-BR")}{" "}
                          <span className="text-[10px] block opacity-75">
                            {new Date(t.lastSignInAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                          Nunca acessou
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center font-bold text-foreground">
                      {t.examsCreatedCount}
                    </td>

                    <td className="py-3 px-3 text-center font-bold text-foreground">
                      {t.examsAppliedCount}
                    </td>

                    <td className="py-3 px-3 text-center font-bold text-foreground">
                      {t.studentsReachedCount}
                    </td>

                    <td className="py-3 px-3 text-center font-bold text-foreground">
                      {t.questionsSubmittedCount}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.activityStatus === "active"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : t.activityStatus === "inactive_30_days"
                            ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                        }`}
                      >
                        {t.activityStatus === "active"
                          ? "Ativo"
                          : t.activityStatus === "inactive_30_days"
                          ? "Inativo 30+ d"
                          : "Nunca acessou"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border bg-muted/20 px-4 py-3">
          <IndicatorFootnote
            base="Membros com papel docente e escopos ativos"
            periodo="Semestre Letivo Atual"
            fonte="Gestão de Acessos e Auditoria MedPleni"
          />
        </div>
      </div>
    </div>
  );
}
