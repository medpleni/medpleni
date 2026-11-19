"use client";

import React, { useState, useTransition, useMemo } from "react";
import type {
  ReadinessConfig,
  StudentReadinessEvaluation,
  ClassReadinessDistribution,
} from "@/lib/b2b/readiness";
import { READINESS_DISCLAIMER_TEXT } from "@/lib/b2b/readiness";
import {
  saveReadinessConfigAction,
  recordReadinessSnapshotAction,
} from "@/lib/b2b/readiness-actions";

interface ProntidaoClientProps {
  institutionName: string;
  config: ReadinessConfig;
  classes: Array<{ id: string; label: string; period: number }>;
  distributions: ClassReadinessDistribution[];
  allStudents: StudentReadinessEvaluation[];
  userRole: string;
}

export default function ProntidaoClient({
  institutionName,
  config: initialConfig,
  classes,
  distributions,
  allStudents,
  userRole,
}: ProntidaoClientProps) {
  const isAuthorized = userRole === "dirigente" || userRole === "coordenador";
  const [config, setConfig] = useState<ReadinessConfig>(initialConfig);
  const [selectedClassId, setSelectedClassId] = useState<string>("todas");
  const [selectedLevel, setSelectedLevel] = useState<string>("todos");
  const [searchStudent, setSearchStudent] = useState<string>("");

  // Estados para edição de parâmetros
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [tempConfig, setTempConfig] = useState<ReadinessConfig>(initialConfig);
  const [isPendingConfig, startConfigTransition] = useTransition();

  // Estado para salvar snapshot histórico
  const [snapshotFeedback, setSnapshotFeedback] = useState<string | null>(null);
  const [isPendingSnapshot, startSnapshotTransition] = useTransition();

  // Aluno selecionado para modal de detalhe
  const [detailStudent, setDetailStudent] = useState<StudentReadinessEvaluation | null>(null);

  // Turma atual selecionada
  const activeDistribution = useMemo(() => {
    if (selectedClassId === "todas") {
      const high = allStudents.filter((s) => s.level === "alto").length;
      const medium = allStudents.filter((s) => s.level === "medio").length;
      const low = allStudents.filter((s) => s.level === "baixo").length;
      const total = allStudents.length;

      return {
        classGroupId: "todas",
        classGroupLabel: "Todas as Turmas",
        isConfigured: config.volumeRuleEnabled || config.consistencyRuleEnabled,
        totalStudents: total,
        highCount: high,
        mediumCount: medium,
        lowCount: low,
        highPercent: total > 0 ? Math.round((high / total) * 1000) / 10 : 0,
        mediumPercent: total > 0 ? Math.round((medium / total) * 1000) / 10 : 0,
        lowPercent: total > 0 ? Math.round((low / total) * 1000) / 10 : 0,
        students: allStudents,
      };
    }
    return (
      distributions.find((d) => d.classGroupId === selectedClassId) || {
        classGroupId: selectedClassId,
        classGroupLabel: "Turma",
        isConfigured: config.volumeRuleEnabled || config.consistencyRuleEnabled,
        totalStudents: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        highPercent: 0,
        mediumPercent: 0,
        lowPercent: 0,
        students: [],
      }
    );
  }, [selectedClassId, distributions, allStudents, config]);

  // Lista de estudantes filtrada
  const filteredStudents = useMemo(() => {
    return activeDistribution.students.filter((st) => {
      if (selectedLevel !== "todos" && st.level !== selectedLevel) {
        return false;
      }
      if (
        searchStudent.trim() &&
        !st.studentName.toLowerCase().includes(searchStudent.toLowerCase()) &&
        !st.registration.includes(searchStudent)
      ) {
        return false;
      }
      return true;
    });
  }, [activeDistribution, selectedLevel, searchStudent]);

  const handleSaveConfig = () => {
    startConfigTransition(async () => {
      const res = await saveReadinessConfigAction(tempConfig);
      if (res.success) {
        setConfig(tempConfig);
        setIsConfigModalOpen(false);
      }
    });
  };

  const handleCreateSnapshot = () => {
    startSnapshotTransition(async () => {
      const res = await recordReadinessSnapshotAction(allStudents, 2026);
      if (res.success) {
        setSnapshotFeedback(`Snapshot histórico registrado com sucesso (${res.count} estudantes gravados).`);
        setTimeout(() => setSnapshotFeedback(null), 4000);
      }
    });
  };

  const isConfigured = Boolean(
    (config.volumeRuleEnabled && config.minQuestionsYear && config.minQuestionsYear > 0) ||
      (config.consistencyRuleEnabled &&
        config.minScorePercent &&
        config.minScorePercent > 0 &&
        config.minExamsCount &&
        config.minExamsCount > 0)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── 1. CABEÇALHO DO MÓDULO ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Indicador de Prontidão Acadêmica
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 font-semibold border border-teal-200 dark:border-teal-800">
              Metodologia por Regras (Dr. Filipe)
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {institutionName} · Critérios transparentes de esforço e desempenho acordados pela instituição
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isAuthorized && (
            <button
              onClick={() => {
                setTempConfig(config);
                setIsConfigModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 text-teal-700 dark:text-teal-300 font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <span>⚙️</span> Configurar Regras e Metas
            </button>
          )}
          {isAuthorized && isConfigured && (
            <button
              onClick={handleCreateSnapshot}
              disabled={isPendingSnapshot}
              className="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {isPendingSnapshot ? "Gravando..." : "Gravar Snapshot para Calibração"}
            </button>
          )}
        </div>
      </div>

      {snapshotFeedback && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold animate-fadeIn">
          ✓ {snapshotFeedback}
        </div>
      )}

      {/* ── 2. AVISO METODOLÓGICO OBRIGATÓRIO (TEXTO FIXO) ── */}
      <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/20 shadow-sm flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 flex items-center justify-center shrink-0 font-bold text-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <p className="text-xs text-blue-900 dark:text-blue-200/90 leading-relaxed font-medium">
          {READINESS_DISCLAIMER_TEXT}
        </p>
      </div>

      {/* ── 3. SE OS PARÂMETROS ESTIVEREM EM BRANCO: NÃO EXIBE O INDICADOR ── */}
      {!isConfigured ? (
        <div className="p-12 text-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 12h20" />
              <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6" />
              <path d="M6 12V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Indicador de Prontidão Não Configurado
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
            Nenhum parâmetro de esforço ou consistência foi definido para a instituição. Conforme a
            especificação, os dados não são exibidos com valores fictícios para evitar falsa precisão.
            Defina a meta de questões e/ou a quantidade de simulados planejados nas configurações para
            ativar o painel.
          </p>
          {isAuthorized && (
            <button
              onClick={() => {
                setTempConfig(config);
                setIsConfigModalOpen(true);
              }}
              className="mt-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs shadow-sm transition-colors"
            >
              Definir Parâmetros de Prontidão Agora
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── 4. REGRAS ATIVAS ESCRITAS NA TELA (TRANSPARÊNCIA TOTAL) ── */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-xs space-y-2">
            <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              Regras Definidas pela Instituição para o Ciclo Atual:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {config.volumeRuleEnabled && config.minQuestionsYear ? (
                <div className="p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/70 space-y-0.5">
                  <div className="font-bold text-teal-800 dark:text-teal-300">
                    1. Meta de Volume de Treino (Ativa)
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Aluno deve responder pelo menos{" "}
                    <strong className="text-gray-900 dark:text-white">
                      {config.minQuestionsYear.toLocaleString("pt-BR")} questões
                    </strong>{" "}
                    no ano letivo (plataforma B2C + simulados B2B).
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 italic">
                  1. Regra de Volume: Desligada ou sem meta definida
                </div>
              )}

              {config.consistencyRuleEnabled &&
              config.minScorePercent &&
              config.minExamsCount ? (
                <div className="p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/70 space-y-0.5">
                  <div className="font-bold text-teal-800 dark:text-teal-300">
                    2. Meta de Consistência em Simulados (Ativa)
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Aluno deve manter pelo menos{" "}
                    <strong className="text-gray-900 dark:text-white">
                      {config.minScorePercent}% de acerto
                    </strong>{" "}
                    em pelo menos{" "}
                    <strong className="text-gray-900 dark:text-white">
                      {config.minExamsCount} simulados
                    </strong>{" "}
                    aplicados no ano.
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 italic">
                  2. Regra de Consistência: Desligada (em branco até a faculdade definir o cronograma)
                </div>
              )}
            </div>
            <div className="text-[11px] text-gray-500 pt-1">
              Visibilidade para os estudantes:{" "}
              <strong>
                {config.showToStudents ? "Habilitada (visível no portal do aluno)" : "Oculta (apenas gestão e docentes)"}
              </strong>
            </div>
          </div>

          {/* ── 5. DISTRIBUIÇÃO DA TURMA NOS 3 NÍVEIS ── */}
          <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Distribuição de Prontidão: {activeDistribution.classGroupLabel}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Total de {activeDistribution.totalStudents} alunos avaliados no ciclo
                </p>
              </div>

              {/* Seletor de Turma */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Filtrar Turma:</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                >
                  <option value="todas">Todas as Turmas ({allStudents.length})</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} ({c.period}º P)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3 CARDS DE NÍVEIS NEUTROS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Nível Alto */}
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    {config.levelLabels.high || "No caminho"}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {activeDistribution.highPercent}%
                  </span>
                </div>
                <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-200">
                  {activeDistribution.highCount} alunos
                </div>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                  Cumpre integralmente as regras ativas de prontidão.
                </p>
              </div>

              {/* Nível Médio */}
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    {config.levelLabels.medium || "Em atenção"}
                  </span>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    {activeDistribution.mediumPercent}%
                  </span>
                </div>
                <div className="text-2xl font-bold text-amber-900 dark:text-amber-200">
                  {activeDistribution.mediumCount} alunos
                </div>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                  Cumpre parcialmente (volume atingido ou simulados parciais).
                </p>
              </div>

              {/* Nível Baixo */}
              <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                    {config.levelLabels.low || "Distante"}
                  </span>
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                    {activeDistribution.lowPercent}%
                  </span>
                </div>
                <div className="text-2xl font-bold text-rose-900 dark:text-rose-200">
                  {activeDistribution.lowCount} alunos
                </div>
                <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80">
                  Abaixo das metas de esforço e consistência acordadas.
                </p>
              </div>
            </div>

            {/* BARRA TRICOLOR DE DISTRIBUIÇÃO */}
            <div className="space-y-1.5 pt-1">
              <div className="w-full h-3 rounded-full bg-gray-100 dark:bg-gray-800 flex overflow-hidden">
                <div
                  className="bg-emerald-600 transition-all duration-300"
                  style={{ width: `${activeDistribution.highPercent}%` }}
                  title={`${config.levelLabels.high}: ${activeDistribution.highPercent}%`}
                />
                <div
                  className="bg-amber-500 transition-all duration-300"
                  style={{ width: `${activeDistribution.mediumPercent}%` }}
                  title={`${config.levelLabels.medium}: ${activeDistribution.mediumPercent}%`}
                />
                <div
                  className="bg-rose-500 transition-all duration-300"
                  style={{ width: `${activeDistribution.lowPercent}%` }}
                  title={`${config.levelLabels.low}: ${activeDistribution.lowPercent}%`}
                />
              </div>
            </div>
          </div>

          {/* ── 6. LISTA INDIVIDUAL DE ESTUDANTES E METAS ABERTAS ── */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden space-y-3 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Filtro de Nível */}
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 font-medium"
                >
                  <option value="todos">Todos os Níveis ({activeDistribution.students.length})</option>
                  <option value="alto">{config.levelLabels.high} ({activeDistribution.highCount})</option>
                  <option value="medio">{config.levelLabels.medium} ({activeDistribution.mediumCount})</option>
                  <option value="baixo">{config.levelLabels.low} ({activeDistribution.lowCount})</option>
                </select>

                {/* Busca Aluno */}
                <input
                  type="text"
                  placeholder="Buscar estudante ou RA..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 placeholder-gray-400"
                />
              </div>

              <div className="text-xs text-gray-500">
                Mostrando <strong>{filteredStudents.length}</strong> de{" "}
                {activeDistribution.students.length} estudantes
              </div>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-gray-500 font-semibold">
                    <th className="py-3 px-3">Estudante</th>
                    <th className="py-3 px-2">Turma</th>
                    <th className="py-3 px-3 text-center">Nível Atual</th>
                    <th className="py-3 px-3 text-center">Volume no Ano</th>
                    <th className="py-3 px-3 text-center">Simulados Qualificados</th>
                    <th className="py-3 px-4">O que Cumpre & Quanto Falta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        Nenhum estudante encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => {
                      let badgeClass =
                        "bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-300";
                      if (st.level === "alto") {
                        badgeClass =
                          "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300";
                      } else if (st.level === "medio") {
                        badgeClass =
                          "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300";
                      }

                      return (
                        <tr
                          key={st.studentUserId}
                          className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors"
                        >
                          <td className="py-3 px-3 font-semibold text-gray-900 dark:text-white">
                            <button
                              onClick={() => setDetailStudent(st)}
                              className="hover:underline text-left"
                            >
                              {st.studentName}
                            </button>
                            <div className="text-[10px] text-gray-400 font-normal">
                              RA: {st.registration}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {st.classGroupLabel}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${badgeClass}`}>
                              {st.levelLabel}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {st.volumeRuleActive && st.volumeTarget ? (
                              <div>
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {st.questionsAnswered.toLocaleString("pt-BR")}
                                </span>
                                <span className="text-[10px] text-gray-400 block">
                                  Meta: {st.volumeTarget.toLocaleString("pt-BR")} ({st.volumeProgressPercent}%)
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {st.consistencyRuleActive && st.consistencyTargetExams ? (
                              <div>
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {st.qualifyingExamsCount} de {st.consistencyTargetExams}
                                </span>
                                <span className="text-[10px] text-gray-400 block">
                                  com nota ≥ {st.consistencyTargetScore}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-[11px] font-medium text-gray-800 dark:text-gray-200">
                              {st.rulesFulfilledSummary}
                            </div>
                            <div className="text-[10px] text-teal-700 dark:text-teal-400 pt-0.5">
                              {st.missingRequirementsText}
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
        </>
      )}

      {/* ── 7. MODAL DE DETALHE INDIVIDUAL DO ALUNO ── */}
      {detailStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Prontidão Acadêmica: {detailStudent.studentName}
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {detailStudent.classGroupLabel} · RA: {detailStudent.registration}
                </p>
              </div>
              <button
                onClick={() => setDetailStudent(null)}
                className="text-gray-400 hover:text-gray-600 text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-lg border bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <span className="text-gray-400 text-[10px] block uppercase tracking-wider font-semibold">
                    Classificação Atual
                  </span>
                  <span className="text-base font-bold text-gray-900 dark:text-white">
                    {detailStudent.levelLabel}
                  </span>
                </div>
                <span className="text-xs text-teal-700 dark:text-teal-300 font-medium">
                  {detailStudent.rulesFulfilledSummary}
                </span>
              </div>

              {/* Critério 1: Volume */}
              {detailStudent.volumeRuleActive && (
                <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      1. Critério de Volume de Treino
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        detailStudent.volumeFulfilled
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {detailStudent.volumeFulfilled ? "Cumprido" : "Pendente"}
                    </span>
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {detailStudent.questionsAnswered.toLocaleString("pt-BR")} de{" "}
                    {detailStudent.volumeTarget?.toLocaleString("pt-BR")} questões respondidas (
                    {detailStudent.volumeProgressPercent}%)
                  </div>
                  {!detailStudent.volumeFulfilled && (
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                      Faltam {detailStudent.volumeRemaining.toLocaleString("pt-BR")} questões para a meta anual.
                    </div>
                  )}
                </div>
              )}

              {/* Critério 2: Consistência em Simulados */}
              {detailStudent.consistencyRuleActive && (
                <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      2. Critério de Consistência em Simulados
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        detailStudent.consistencyFulfilled
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {detailStudent.consistencyFulfilled ? "Cumprido" : "Pendente"}
                    </span>
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {detailStudent.qualifyingExamsCount} simulado(s) com nota ≥{" "}
                    {detailStudent.consistencyTargetScore}% (Meta:{" "}
                    {detailStudent.consistencyTargetExams} simulados).
                  </div>
                  {!detailStudent.consistencyFulfilled && (
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                      Falta(m) {detailStudent.consistencyRemaining} simulado(s) com aproveitamento mínimo.
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 text-[11px] leading-relaxed">
                {READINESS_DISCLAIMER_TEXT}
              </div>
            </div>

            <div className="p-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
              <button
                onClick={() => setDetailStudent(null)}
                className="px-4 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. MODAL DE CONFIGURAÇÃO DE REGRAS E METAS ── */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Configurar Parâmetros de Prontidão
              </h3>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {/* Regra 1: Volume */}
              <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-900 dark:text-white flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempConfig.volumeRuleEnabled}
                      onChange={(e) =>
                        setTempConfig({
                          ...tempConfig,
                          volumeRuleEnabled: e.target.checked,
                        })
                      }
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>Habilitar Regra de Volume (Questões no Ano)</span>
                  </label>
                </div>

                {tempConfig.volumeRuleEnabled && (
                  <div className="space-y-1 pl-6">
                    <label className="text-[11px] text-gray-500">
                      N · Meta de Questões Respondidas no Ano Letivo:
                    </label>
                    <input
                      type="number"
                      step="500"
                      value={tempConfig.minQuestionsYear || ""}
                      placeholder="Ex: 10000"
                      onChange={(e) =>
                        setTempConfig({
                          ...tempConfig,
                          minQuestionsYear: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-semibold"
                    />
                    <span className="text-[10px] text-gray-400">
                      Referência proposta pelo Dr. Filipe: 10.000 questões
                    </span>
                  </div>
                )}
              </div>

              {/* Regra 2: Consistência */}
              <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-900 dark:text-white flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempConfig.consistencyRuleEnabled}
                      onChange={(e) =>
                        setTempConfig({
                          ...tempConfig,
                          consistencyRuleEnabled: e.target.checked,
                        })
                      }
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>Habilitar Regra de Consistência em Simulados</span>
                  </label>
                </div>

                {tempConfig.consistencyRuleEnabled && (
                  <div className="grid grid-cols-2 gap-3 pl-6">
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">X · Nota Mínima (%):</label>
                      <input
                        type="number"
                        step="0.5"
                        value={tempConfig.minScorePercent || ""}
                        placeholder="Ex: 60"
                        onChange={(e) =>
                          setTempConfig({
                            ...tempConfig,
                            minScorePercent: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-500">Y · Qtd de Simulados:</label>
                      <input
                        type="number"
                        min="1"
                        value={tempConfig.minExamsCount || ""}
                        placeholder="Ex: 3"
                        onChange={(e) =>
                          setTempConfig({
                            ...tempConfig,
                            minExamsCount: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-semibold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Rótulos dos 3 Níveis Neutros */}
              <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 space-y-2">
                <span className="font-bold text-gray-900 dark:text-white block">
                  Rótulos Neutros dos 3 Níveis (Escolha Médica)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-emerald-700 font-semibold">Nível Alto:</label>
                    <input
                      type="text"
                      value={tempConfig.levelLabels.high}
                      onChange={(e) =>
                        setTempConfig({
                          ...tempConfig,
                          levelLabels: { ...tempConfig.levelLabels, high: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-amber-700 font-semibold">Nível Médio:</label>
                    <input
                      type="text"
                      value={tempConfig.levelLabels.medium}
                      onChange={(e) =>
                        setTempConfig({
                          ...tempConfig,
                          levelLabels: { ...tempConfig.levelLabels, medium: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-rose-700 font-semibold">Nível Baixo:</label>
                    <input
                      type="text"
                      value={tempConfig.levelLabels.low}
                      onChange={(e) =>
                        setTempConfig({
                          ...tempConfig,
                          levelLabels: { ...tempConfig.levelLabels, low: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>
              </div>

              {/* Opção de Exibir para o Aluno */}
              <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-800 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={tempConfig.showToStudents}
                    onChange={(e) =>
                      setTempConfig({
                        ...tempConfig,
                        showToStudents: e.target.checked,
                      })
                    }
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>Exibir Indicador de Prontidão no Portal do Estudante</span>
                </label>
                <p className="text-[10px] text-gray-500 pl-6 mt-0.5">
                  Se desmarcado, apenas a Direção, Coordenação e Docentes visualizam a prontidão.
                </p>
              </div>
            </div>

            <div className="p-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-2">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={isPendingConfig}
                className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs shadow-sm transition-colors"
              >
                {isPendingConfig ? "Salvando..." : "Salvar e Recalcular"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 9. RODAPÉ PADRONIZADO BASE / PERÍODO / FONTE ── */}
      <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap items-center justify-between gap-3">
        <div>
          <strong>Base:</strong> Histórico de treino e simulados institucionais ·{" "}
          <strong>Período:</strong> Ciclo letivo 2026 ·{" "}
          <strong>Fonte:</strong> MedPleni Prontidão Pedagógica (Voto Dr. Filipe)
        </div>
        <div className="text-gray-400 dark:text-gray-500">
          Calibração com dados reais do ENAMED no encerramento do ciclo
        </div>
      </div>
    </div>
  );
}
