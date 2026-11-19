"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ReguaEnamedOverview, ReguaStageData } from "@/lib/b2b/regua-enamed";
import { REGUA_ENAMED_CONTENT } from "@/lib/b2b/regua-enamed-content";

interface ReguaEnamedClientProps {
  overview: ReguaEnamedOverview;
  userRole?: string;
}

export function ReguaEnamedClient({ overview, userRole = "coordenador" }: ReguaEnamedClientProps) {
  const [selectedStage, setSelectedStage] = useState<1 | 2 | 3>(1);
  const [showRegulatoryModal, setShowRegulatoryModal] = useState(false);

  const stageData: ReguaStageData = overview.stages[selectedStage];
  const cutScore = overview.cutScore;

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary mb-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Módulo Central de Posicionamento Institucional
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Régua ENAMED
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Acompanhamento integrado dos marcos avaliativos do Exame Nacional (4º, 8º e 12º períodos),
              diagnóstico de turmas em preparação, simulados aplicados e intervenções em curso.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRegulatoryModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium border border-border rounded-lg bg-card hover:bg-muted transition text-foreground"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Marco Regulatório Oficial
            </button>
            <Link
              href="/instituicao/provas/nova"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Montar Simulado ENAMED
            </Link>
          </div>
        </div>

        {/* Régua Visual dos 3 Marcos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {([1, 2, 3] as const).map((stageNum) => {
            const stage = overview.stages[stageNum];
            const isSelected = selectedStage === stageNum;
            const avg = stage.overallAveragePercentage;
            const isPassing = avg >= cutScore;

            return (
              <button
                key={stageNum}
                onClick={() => setSelectedStage(stageNum)}
                className={`text-left p-4 rounded-xl border transition relative ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    {stage.regulatory.title}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {stage.periodsIncluded.map((p) => `${p}ºP`).join(", ")}
                  </span>
                </div>

                <div className="text-sm font-semibold text-foreground">
                  {stage.regulatory.stageName}
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-bold text-foreground">
                      {avg > 0 ? `${avg}%` : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">aproveitamento médio</span>
                  </div>
                  {avg > 0 && (
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        isPassing
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {isPassing ? `≥ ${cutScore}% (meta)` : `< ${cutScore}% (atenção)`}
                    </span>
                  )}
                </div>

                {/* Sub-indicadores rápidos */}
                <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="font-semibold text-foreground">{stage.assessments.length}</div>
                    <div className="text-[10px] text-muted-foreground">Simulados</div>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{stage.classes.length}</div>
                    <div className="text-[10px] text-muted-foreground">Turmas</div>
                  </div>
                  <div>
                    <div className="font-semibold text-amber-600 dark:text-amber-400">
                      {stage.totalStudentsBelowCutScore}
                    </div>
                    <div className="text-[10px] text-muted-foreground">&lt; {cutScore}%</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Alerta Institucional da 1ª Etapa (INEP) */}
      {stageData.hasSpecialNotice && stageData.specialNoticeText && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <div className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="text-xs text-amber-900 dark:text-amber-200">
            <p className="font-semibold mb-0.5">Nota Técnica sobre a Matriz da 1ª Etapa (INEP):</p>
            <p>{stageData.specialNoticeText}</p>
          </div>
        </div>
      )}

      {/* Grid de 4 KPIs da Etapa Selecionada */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Simulados da Etapa */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Simulados Aplicados</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stageData.assessments.length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stageData.assessments.reduce((sum, a) => sum + a.participantsCount, 0)} participações computadas
          </p>
        </div>

        {/* KPI 2: Turmas na Rota */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Turmas na Rota</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stageData.classes.length} turmas
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stageData.totalStudentsEnrolled} alunos matriculados nos períodos {stageData.periodsIncluded.join(", ")}
          </p>
        </div>

        {/* KPI 3: Alunos em Atenção / Zona de Decisão */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Alunos &lt; {cutScore}%</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stageData.totalStudentsBelowCutScore}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stageData.totalStudentsInDecisionZone} na zona de decisão (51% a {cutScore}%)
          </p>
        </div>

        {/* KPI 4: Intervenções Ativas */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Intervenções em Curso</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stageData.interventions.length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stageData.interventions.filter((i) => i.actionType === "exercise_list").length} listas ·{" "}
            {stageData.interventions.filter((i) => i.actionType === "pre_post_lecture").length} pré/pós-aula
          </p>
        </div>
      </div>

      {/* Conteúdo Detalhado da Etapa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Simulados Aplicados e Turmas */}
        <div className="lg:col-span-2 space-y-6">
          {/* Seção 1: Simulados da Etapa */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Simulados da {stageData.regulatory.title}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Provas simuladas de formato oficial aplicadas às turmas preparatórias
                </p>
              </div>
              <Link
                href="/instituicao/provas"
                className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                Ver todas as provas
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>

            {stageData.assessments.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                Nenhum simulado cadastrado exclusivamente para esta etapa até o momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">Título do Simulado</th>
                      <th className="py-2.5 px-3">Modalidade</th>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3 text-center">Participantes</th>
                      <th className="py-2.5 px-3 text-right">Aproveitamento Médio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stageData.assessments.map((a) => {
                      const isPassing = a.averageScorePercentage >= cutScore;
                      return (
                        <tr key={a.id} className="hover:bg-muted/30">
                          <td className="py-3 px-3 font-medium text-foreground">
                            <Link href={`/instituicao/provas/${a.id}/resultado`} className="hover:text-primary">
                              {a.title}
                            </Link>
                          </td>
                          <td className="py-3 px-3 text-muted-foreground capitalize">
                            {a.modality.replace("_", " ")}
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">
                            {a.examDate}
                          </td>
                          <td className="py-3 px-3 text-center font-medium text-foreground">
                            {a.participantsCount}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span
                              className={`font-semibold px-2 py-0.5 rounded text-xs ${
                                isPassing
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {a.averageScorePercentage > 0 ? `${a.averageScorePercentage}%` : "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Seção 2: Turmas Chegando à Etapa */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Turmas na Rota de Preparação
                </h2>
                <p className="text-xs text-muted-foreground">
                  Desempenho consolidado das coortes que prestarão a {stageData.regulatory.title}
                </p>
              </div>
              <Link
                href="/instituicao/turmas"
                className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                Gerenciar turmas
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Turma</th>
                    <th className="py-2.5 px-3 text-center">Período</th>
                    <th className="py-2.5 px-3 text-center">Alunos</th>
                    <th className="py-2.5 px-3 text-center">Abaixo de {cutScore}%</th>
                    <th className="py-2.5 px-3 text-center">Zona Decisão (51–{cutScore}%)</th>
                    <th className="py-2.5 px-3 text-right">Média da Turma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stageData.classes.map((cls) => {
                    const isPassing = cls.averageScorePercentage >= cutScore;
                    return (
                      <tr key={cls.id} className="hover:bg-muted/30">
                        <td className="py-3 px-3 font-medium text-foreground">
                          <Link href={`/instituicao/turmas/${cls.id}`} className="hover:text-primary">
                            {cls.name}
                          </Link>
                        </td>
                        <td className="py-3 px-3 text-center text-muted-foreground font-mono">
                          {cls.period}ºP
                        </td>
                        <td className="py-3 px-3 text-center text-muted-foreground">
                          {cls.studentsCount}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-amber-600 dark:text-amber-400">
                          {cls.studentsBelowCutScore}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-muted-foreground">
                          {cls.studentsInDecisionZone}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`font-semibold px-2 py-0.5 rounded text-xs ${
                              isPassing
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {cls.averageScorePercentage > 0 ? `${cls.averageScorePercentage}%` : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Coluna 3: Intervenções Ativas & Eixos Temáticos */}
        <div className="space-y-6">
          {/* Intervenções em Curso */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-foreground">Intervenções em Curso</h2>
              <Link
                href="/instituicao/intervencoes"
                className="text-xs text-primary hover:underline font-medium"
              >
                Ver todas
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Ações corretivas de nivelamento ativas para as turmas desta etapa
            </p>

            {stageData.interventions.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                Nenhuma intervenção ativa para as turmas desta etapa.
              </div>
            ) : (
              <div className="space-y-3">
                {stageData.interventions.map((inv) => (
                  <div key={inv.id} className="p-3 border border-border rounded-lg bg-muted/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground line-clamp-1">
                        {inv.title}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {inv.actionType === "exercise_list" ? "Lista" : "Pré/Pós"}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mb-2">
                      {inv.classGroupName}
                    </div>

                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Adesão:</span>
                      <span className="font-semibold text-foreground">{inv.adherencePercentage}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, inv.adherencePercentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Eixos Prioritários da Etapa */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground mb-1">Eixos Estruturantes</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Grandes áreas de foco formativo para a {stageData.regulatory.title}
            </p>
            <ul className="space-y-2">
              {stageData.regulatory.focusAreas.map((area, idx) => (
                <li key={idx} className="flex items-center gap-2 text-xs text-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Rodapé Padronizado Base / Período / Fonte */}
      <div className="bg-card border border-border rounded-xl p-4 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>{stageData.footerMetadata.baseText}</span>
          <span className="hidden sm:inline">·</span>
          <span>{stageData.footerMetadata.periodText}</span>
          <span className="hidden sm:inline">·</span>
          <span>{stageData.footerMetadata.sourceText}</span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          Régua de corte configurada: <strong>{cutScore}%</strong>
        </div>
      </div>

      {/* Modal de Marco Regulatório Oficial */}
      {showRegulatoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">Marco Regulatório do ENAMED</h3>
                <p className="text-xs text-muted-foreground">
                  Informações regulatórias e normativas oficiais por etapa
                </p>
              </div>
              <button
                onClick={() => setShowRegulatoryModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Aviso Obrigatório: Conteúdo a preencher pelo Mario */}
            <div className="bg-muted/50 border border-border rounded-lg p-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Nota de Governança Institucional:</span> Os dados
              normativos e marcos legais abaixo devem ser revisados e validados pelo coordenador geral de produto
              (Mario Lopes) com base nas fontes e editais oficiais do INEP e MEC.
            </div>

            {/* Tabela do Marco Geral */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                Diretrizes Gerais do Exame
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded border border-border bg-muted/20">
                  <div className="text-[10px] text-muted-foreground">Lei Federal de Criação</div>
                  <div className="font-mono text-xs text-foreground mt-0.5">
                    {REGUA_ENAMED_CONTENT.generalFramework.governingLaw}
                  </div>
                </div>
                <div className="p-2.5 rounded border border-border bg-muted/20">
                  <div className="text-[10px] text-muted-foreground">Portaria Normativa MEC/INEP</div>
                  <div className="font-mono text-xs text-foreground mt-0.5">
                    {REGUA_ENAMED_CONTENT.generalFramework.decreeOrdinance}
                  </div>
                </div>
              </div>
            </div>

            {/* Parâmetros Específicos por Etapa */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                Parâmetros Específicos da {stageData.regulatory.title}
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2.5 rounded border border-border bg-muted/10">
                  <span className="text-muted-foreground">Edital INEP Específico:</span>
                  <span className="font-mono text-foreground">
                    {stageData.regulatory.officialFramework.inepNotice}
                  </span>
                </div>
                <div className="flex justify-between p-2.5 rounded border border-border bg-muted/10">
                  <span className="text-muted-foreground">Data de Publicação / Vigência:</span>
                  <span className="font-mono text-foreground">
                    {stageData.regulatory.officialFramework.publicationDate}
                  </span>
                </div>
                <div className="flex justify-between p-2.5 rounded border border-border bg-muted/10">
                  <span className="text-muted-foreground">Peso no Escore Final:</span>
                  <span className="font-mono text-foreground">
                    {stageData.regulatory.officialFramework.stageWeight}
                  </span>
                </div>
                <div className="flex justify-between p-2.5 rounded border border-border bg-muted/10">
                  <span className="text-muted-foreground">Linha de Corte da Plataforma:</span>
                  <span className="font-semibold text-foreground">
                    {stageData.regulatory.officialFramework.minimumThreshold}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                onClick={() => setShowRegulatoryModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition"
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
