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
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "8px 0 40px" }} className="space-y-6">
      {/* Cabeçalho */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          paddingBottom: "16px",
          borderBottom: "1px solid var(--card-border)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "var(--heading-color)" }}>
              Adesão dos Professores
            </h1>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "9999px",
                background: "var(--pulso-dim)",
                color: "var(--pulso)",
                textTransform: "uppercase",
              }}
            >
              Gestão Acadêmica · SPR nº 6
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--chumbo)" }}>
            Métricas de engajamento e adesão do corpo docente ao ecossistema MedPleni.
          </p>
        </div>
      </div>

      {/* AVISO METODOLÓGICO OBRIGATÓRIO (SPR nº 6) */}
      <div
        style={{
          background: "rgba(2, 132, 199, 0.08)",
          border: "1px solid rgba(2, 132, 199, 0.25)",
          borderRadius: "12px",
          padding: "16px 20px",
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
        }}
      >
        <span style={{ fontSize: "16px", marginTop: "2px", flexShrink: 0 }}>ℹ️</span>
        <div style={{ fontSize: "12px", lineHeight: 1.6, color: "var(--chumbo)" }}>
          <strong style={{ color: "var(--heading-color)" }}>Aviso de Interpretação Institucional:</strong> Este painel reflete exclusivamente
          indicadores de <strong>uso e adesão à ferramenta na plataforma</strong> (último login,
          provas montadas, retestes e submissão de questões), e <strong>não</strong> constitui uma
          avaliação de desempenho pedagógico, competência técnica ou mérito docente.
        </div>
      </div>

      {/* 4 Cards de Resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
        <div
          onClick={() => setFilterStatus("todos")}
          style={{
            background: "var(--card-bg)",
            border: filterStatus === "todos" ? "2px solid var(--pulso)" : "1px solid var(--card-border)",
            borderRadius: "12px",
            padding: "16px 20px",
            boxShadow: "var(--card-shadow)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--chumbo)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
            Cadastrados
          </span>
          <span style={{ fontSize: "24px", fontWeight: 800, color: "var(--heading-color)", marginTop: "4px", display: "block" }}>
            {summary.totalRegistered}
          </span>
          <span style={{ fontSize: "11px", color: "var(--chumbo)", marginTop: "2px", display: "block" }}>
            Docentes no sistema
          </span>
        </div>

        <div
          onClick={() => setFilterStatus("active")}
          style={{
            background: "var(--card-bg)",
            border: filterStatus === "active" ? "2px solid #16A34A" : "1px solid var(--card-border)",
            borderRadius: "12px",
            padding: "16px 20px",
            boxShadow: "var(--card-shadow)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#16A34A", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
            Ativos no Período
          </span>
          <span style={{ fontSize: "24px", fontWeight: 800, color: "#16A34A", marginTop: "4px", display: "block" }}>
            {summary.activeInPeriod}
          </span>
          <span style={{ fontSize: "11px", color: "var(--chumbo)", marginTop: "2px", display: "block" }}>
            Acesso nos últimos 30 dias
          </span>
        </div>

        <div
          onClick={() => setFilterStatus("inactive_30_days")}
          style={{
            background: "var(--card-bg)",
            border: filterStatus === "inactive_30_days" ? "2px solid #D97706" : "1px solid var(--card-border)",
            borderRadius: "12px",
            padding: "16px 20px",
            boxShadow: "var(--card-shadow)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#D97706", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
            Sem Acesso 30+ Dias
          </span>
          <span style={{ fontSize: "24px", fontWeight: 800, color: "#D97706", marginTop: "4px", display: "block" }}>
            {summary.inactiveOver30Days}
          </span>
          <span style={{ fontSize: "11px", color: "var(--chumbo)", marginTop: "2px", display: "block" }}>
            Demanda contato da coordenação
          </span>
        </div>

        <div
          onClick={() => setFilterStatus("never_accessed")}
          style={{
            background: "var(--card-bg)",
            border: filterStatus === "never_accessed" ? "2px solid #DC2626" : "1px solid var(--card-border)",
            borderRadius: "12px",
            padding: "16px 20px",
            boxShadow: "var(--card-shadow)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
            Nunca Acessaram
          </span>
          <span style={{ fontSize: "24px", fontWeight: 800, color: "#DC2626", marginTop: "4px", display: "block" }}>
            {summary.neverAccessed}
          </span>
          <span style={{ fontSize: "11px", color: "var(--chumbo)", marginTop: "2px", display: "block" }}>
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
