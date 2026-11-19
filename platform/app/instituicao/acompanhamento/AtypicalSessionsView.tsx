"use client";

import React, { useState, useTransition, useMemo } from "react";
import type {
  ClassifiedSession,
  AtypicalDetectionConfig,
  AtypicalPatternType,
} from "@/lib/b2b/atypical";
import {
  toggleAtypicalSessionExclusion,
  saveAtypicalConfig,
} from "@/lib/b2b/atypical-actions";

interface AtypicalSessionsViewProps {
  sessions: ClassifiedSession[];
  config: AtypicalDetectionConfig;
  classes: Array<{ id: string; label: string; period: number }>;
  userRole: string;
}

export default function AtypicalSessionsView({
  sessions,
  config,
  classes,
  userRole,
}: AtypicalSessionsViewProps) {
  const isAuthorized = userRole === "dirigente" || userRole === "coordenador";

  // Estados de filtros
  const [selectedClass, setSelectedClass] = useState<string>("todas");
  const [selectedPattern, setSelectedPattern] = useState<string>("todos_atipicos");
  const [searchStudent, setSearchStudent] = useState<string>("");
  const [onlyExcluded, setOnlyExcluded] = useState<boolean>(false);

  // Estados para edição de configurações
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [tempConfig, setTempConfig] = useState<AtypicalDetectionConfig>(config);
  const [isPendingConfig, startConfigTransition] = useTransition();

  // Estado para exclusão interativa
  const [localExcludedMap, setLocalExcludedMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    sessions.forEach((s) => {
      map[s.sessionId] = s.isExcludedFromMetrics;
    });
    return map;
  });
  const [isPendingToggle, startToggleTransition] = useTransition();

  // Estado para modal de detalhe
  const [detailSession, setDetailSession] = useState<ClassifiedSession | null>(null);

  // Filtra as sessões
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Filtro de turma
      if (selectedClass !== "todas" && s.classGroupId !== selectedClass) {
        return false;
      }

      // Filtro de aluno
      if (
        searchStudent.trim() &&
        !s.studentName.toLowerCase().includes(searchStudent.toLowerCase())
      ) {
        return false;
      }

      const isExcluded = localExcludedMap[s.sessionId] ?? s.isExcludedFromMetrics;
      if (onlyExcluded && !isExcluded) {
        return false;
      }

      // Filtro de padrão
      if (selectedPattern === "todos_atipicos") {
        return (
          s.pattern === "chute" ||
          s.pattern === "refazendo" ||
          s.pattern === "consulta_externa"
        );
      }
      if (selectedPattern !== "todas") {
        return s.pattern === selectedPattern;
      }

      return true;
    });
  }, [sessions, selectedClass, selectedPattern, searchStudent, onlyExcluded, localExcludedMap]);

  // Contadores de resumo
  const summary = useMemo(() => {
    const total = sessions.length;
    const chute = sessions.filter((s) => s.pattern === "chute").length;
    const refazendo = sessions.filter((s) => s.pattern === "refazendo").length;
    const consulta = sessions.filter((s) => s.pattern === "consulta_externa").length;
    const excluded = Object.values(localExcludedMap).filter(Boolean).length;

    return {
      total,
      atypicalTotal: chute + refazendo + consulta,
      chute,
      refazendo,
      consulta,
      excluded,
    };
  }, [sessions, localExcludedMap]);

  // Trata toggle de exclusão de métricas
  const handleToggleExclusion = (sessionId: string) => {
    const current = Boolean(localExcludedMap[sessionId]);
    const next = !current;

    setLocalExcludedMap((prev) => ({
      ...prev,
      [sessionId]: next,
    }));

    startToggleTransition(async () => {
      await toggleAtypicalSessionExclusion(sessionId, next);
    });
  };

  // Trata salvamento de nova configuração
  const handleSaveConfig = () => {
    startConfigTransition(async () => {
      await saveAtypicalConfig(tempConfig);
      setIsConfigModalOpen(false);
    });
  };

  if (!isAuthorized) {
    return (
      <div className="p-8 text-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-500">
        Acesso restrito exclusivamente à Direção Acadêmica e Coordenação de Medicina.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── 1. AVISO METODOLÓGICO OBRIGATÓRIO NA TELA (Voto SPR nº 9) ── */}
      <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/20 shadow-sm flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 font-bold text-sm">
          ⚠️
        </div>
        <div className="space-y-1">
          <div className="text-xs font-bold text-amber-950 dark:text-amber-200 uppercase tracking-wider">
            Aviso de Interpretação Pedagógica
          </div>
          <p className="text-xs text-amber-900 dark:text-amber-300 font-medium leading-relaxed">
            &ldquo;O rótulo indica um padrão, não prova nada; use como ponto de partida para uma
            conversa.&rdquo;
          </p>
          <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 leading-relaxed pt-0.5">
            A sinalização algorítmica apoia a orientação pedagógica pela coordenação e identifica eventuais hábitos de
            estudo ineficazes. Nenhuma sanção disciplinar deve ser fundamentada exclusivamente em
            sinalizações deste painel.
          </p>
        </div>
      </div>

      {/* ── 2. CARDS DE RESUMO (KPIs) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            Sessões Analisadas
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {summary.total}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">≥ 20 questões por sessão</div>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10 shadow-sm">
          <div className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
            Padrão Chute
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
            {summary.chute}
          </div>
          <div className="text-[10px] text-amber-600/80 dark:text-amber-400/70 mt-0.5">
            Tempo ≤ {config.chute.maxAverageSeconds}s · Acerto ≤ {config.chute.maxAccuracyPercentage}%
          </div>
        </div>

        <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/30 dark:bg-purple-950/10 shadow-sm">
          <div className="text-[11px] font-medium text-purple-800 dark:text-purple-300">
            Padrão Refazendo
          </div>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-400 mt-1">
            {summary.refazendo}
          </div>
          <div className="text-[10px] text-purple-600/80 dark:text-purple-400/70 mt-0.5">
            Repetição ≥ {Math.round(config.refazendo.minRepeatedRatio * 100)}% · Acerto ≥{" "}
            {config.refazendo.minAccuracyPercentage}%
          </div>
        </div>

        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/10 shadow-sm">
          <div className="text-[11px] font-medium text-blue-800 dark:text-blue-300">
            Consulta Externa
          </div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">
            {summary.consulta}
          </div>
          <div className="text-[10px] text-blue-600/80 dark:text-blue-400/70 mt-0.5">
            Acerto ≥ {config.consultaExterna.minAccuracyPercentage}% · Tempo constante
          </div>
        </div>

        <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10 shadow-sm col-span-2 sm:col-span-1">
          <div className="text-[11px] font-medium text-red-800 dark:text-red-300">
            Excluídas dos Gráficos
          </div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-400 mt-1">
            {summary.excluded}
          </div>
          <div className="text-[10px] text-red-600/80 dark:text-red-400/70 mt-0.5">
            Expurgadas das métricas
          </div>
        </div>
      </div>

      {/* ── 3. REGRAS EXPLÍCITAS ESCRITAS NA TELA E BOTÃO CONFIGURAR ── */}
      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 text-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700/60 pb-2.5">
          <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            Regras Matemáticas de Classificação por Sessão (Transparência Algorítmica)
          </span>
          <button
            onClick={() => {
              setTempConfig(config);
              setIsConfigModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 text-teal-700 dark:text-teal-300 font-medium text-[11px] transition-colors flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
          >
            <span>⚙️</span> Editar Limiares da Instituição
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-gray-600 dark:text-gray-300">
          <div className="p-2.5 rounded bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 space-y-1">
            <div className="font-bold text-amber-700 dark:text-amber-400">1. Padrão Chute</div>
            <p>
              Tempo médio por questão ≤ <strong>{config.chute.maxAverageSeconds}s</strong> E taxa de
              acerto ≤ <strong>{config.chute.maxAccuracyPercentage}%</strong>.
            </p>
          </div>

          <div className="p-2.5 rounded bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 space-y-1">
            <div className="font-bold text-purple-700 dark:text-purple-400">2. Padrão Refazendo</div>
            <p>
              Proporção de questões previamente resolvidas ≥{" "}
              <strong>{Math.round(config.refazendo.minRepeatedRatio * 100)}%</strong> E taxa de acerto ≥{" "}
              <strong>{config.refazendo.minAccuracyPercentage}%</strong>.
            </p>
          </div>

          <div className="p-2.5 rounded bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 space-y-1">
            <div className="font-bold text-blue-700 dark:text-blue-400">3. Consulta Externa</div>
            <p>
              Acerto ≥ <strong>{config.consultaExterna.minAccuracyPercentage}%</strong> E tempo médio ≤{" "}
              <strong>{config.consultaExterna.maxAverageSeconds}s</strong> com desvio padrão ≤{" "}
              <strong>{config.consultaExterna.maxStdDevSeconds}s</strong>.
            </p>
          </div>
        </div>

        <div className="text-[10px] text-gray-500 italic">
          * Sessões com menos de {config.minQuestionsThreshold} questões não são classificadas para
          evitar desvios e falsos positivos em amostras pequenas.
        </div>
      </div>

      {/* ── 4. BARRA DE FILTROS ── */}
      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Filtro por Turma */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
          >
            <option value="todas">Todas as Turmas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.period}º P)
              </option>
            ))}
          </select>

          {/* Filtro por Padrão */}
          <select
            value={selectedPattern}
            onChange={(e) => setSelectedPattern(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
          >
            <option value="todos_atipicos">Todos os Padrões Atípicos ({summary.atypicalTotal})</option>
            <option value="chute">Padrão Chute ({summary.chute})</option>
            <option value="refazendo">Padrão Refazendo ({summary.refazendo})</option>
            <option value="consulta_externa">Padrão Consulta Externa ({summary.consulta})</option>
            <option value="todas">Todas as Sessões ({summary.total})</option>
          </select>

          {/* Busca por Aluno */}
          <input
            type="text"
            placeholder="Buscar aluno..."
            value={searchStudent}
            onChange={(e) => setSearchStudent(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyExcluded}
              onChange={(e) => setOnlyExcluded(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500"
            />
            <span>Apenas excluídas dos gráficos ({summary.excluded})</span>
          </label>
        </div>
      </div>

      {/* ── 5. TABELA DE SESSÕES SINALIZADAS ── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-gray-500 font-semibold">
                <th className="py-3 px-4">Estudante</th>
                <th className="py-3 px-3">Turma</th>
                <th className="py-3 px-3">Data / Tipo</th>
                <th className="py-3 px-3 text-center">Questões</th>
                <th className="py-3 px-3 text-center">Acerto (%)</th>
                <th className="py-3 px-3 text-center">Tempo Médio</th>
                <th className="py-3 px-3 text-center">Desvio Padrão</th>
                <th className="py-3 px-3 text-center">% Repetidas</th>
                <th className="py-3 px-4">Classificação Algorítmica</th>
                <th className="py-3 px-4 text-center">Excluir dos Gráficos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-400 text-xs">
                    Nenhuma sessão encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s) => {
                  const isExcluded = localExcludedMap[s.sessionId] ?? s.isExcludedFromMetrics;

                  let badgeColor =
                    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
                  if (s.pattern === "chute") {
                    badgeColor = "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300";
                  } else if (s.pattern === "refazendo") {
                    badgeColor =
                      "bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-300";
                  } else if (s.pattern === "consulta_externa") {
                    badgeColor = "bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300";
                  }

                  return (
                    <tr
                      key={s.sessionId}
                      className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors ${
                        isExcluded ? "opacity-60 bg-red-50/10" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                        <button
                          onClick={() => setDetailSession(s)}
                          className="hover:underline text-left"
                          title="Clique para ver justificativa detalhada"
                        >
                          {s.studentName}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {s.classGroupLabel}
                      </td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        <div>{new Date(s.startedAt).toLocaleDateString("pt-BR")}</div>
                        <div className="text-[10px] text-gray-400 capitalize">
                          {s.sessionType.replace("_", " ")}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-medium">{s.totalQuestions}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-bold ${
                            s.accuracyPercentage >= 60
                              ? "text-teal-700 dark:text-teal-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {s.accuracyPercentage}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-medium">
                        {s.averageSecondsPerQuestion}s
                      </td>
                      <td className="py-3 px-3 text-center text-gray-500">
                        {s.stdDevSeconds > 0 ? `±${s.stdDevSeconds}s` : "—"}
                      </td>
                      <td className="py-3 px-3 text-center text-gray-500">
                        {Math.round(s.repeatedRatio * 100)}%
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${badgeColor}`}
                          title={s.patternDescription}
                        >
                          {s.patternLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleExclusion(s.sessionId)}
                          disabled={isPendingToggle}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                            isExcluded
                              ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200"
                          }`}
                        >
                          {isExcluded ? "✓ Excluída" : "Manter"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 6. MODAL DE DETALHE PEDAGÓGICO DA SESSÃO ── */}
      {detailSession && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Detalhamento da Sessão: {detailSession.studentName}
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {detailSession.classGroupLabel} · {new Date(detailSession.startedAt).toLocaleString("pt-BR")}
                </p>
              </div>
              <button
                onClick={() => setDetailSession(null)}
                className="text-gray-400 hover:text-gray-600 text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1">
                <div className="font-bold text-amber-900 dark:text-amber-300">
                  {detailSession.patternLabel}
                </div>
                <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
                  {detailSession.patternDescription}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-gray-600 dark:text-gray-300">
                <div className="p-2.5 rounded bg-gray-50 dark:bg-gray-800/40">
                  <span className="text-gray-400 text-[10px] block">Questões na Sessão</span>
                  <strong className="text-sm text-gray-900 dark:text-white">
                    {detailSession.totalQuestions}
                  </strong>
                </div>
                <div className="p-2.5 rounded bg-gray-50 dark:bg-gray-800/40">
                  <span className="text-gray-400 text-[10px] block">Taxa de Acerto</span>
                  <strong className="text-sm text-gray-900 dark:text-white">
                    {detailSession.accuracyPercentage}%
                  </strong>
                </div>
                <div className="p-2.5 rounded bg-gray-50 dark:bg-gray-800/40">
                  <span className="text-gray-400 text-[10px] block">Tempo Médio / Questão</span>
                  <strong className="text-sm text-gray-900 dark:text-white">
                    {detailSession.averageSecondsPerQuestion}s
                  </strong>
                </div>
                <div className="p-2.5 rounded bg-gray-50 dark:bg-gray-800/40">
                  <span className="text-gray-400 text-[10px] block">Desvio Padrão do Tempo</span>
                  <strong className="text-sm text-gray-900 dark:text-white">
                    ±{detailSession.stdDevSeconds}s
                  </strong>
                </div>
              </div>

              <div className="p-3 rounded bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-300 leading-relaxed">
                <strong>Orientações para o Diálogo Pedagógico:</strong>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  <li>Pergunte ao aluno como ele organizou seu tempo e estratégia nesta sessão.</li>
                  <li>Evite abordagens punitivas; foque na retenção e no aprendizado sustentável.</li>
                  <li>
                    Se a sessão não refletir estudo deliberado, use a opção de exclusão para não
                    distorcer os gráficos da turma.
                  </li>
                </ul>
              </div>
            </div>

            <div className="p-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
              <button
                onClick={() => {
                  handleToggleExclusion(detailSession.sessionId);
                  setDetailSession(null);
                }}
                className="text-xs font-semibold text-red-600 hover:text-red-700"
              >
                {localExcludedMap[detailSession.sessionId]
                  ? "Reintegrar às métricas"
                  : "Excluir das métricas"}
              </button>
              <button
                onClick={() => setDetailSession(null)}
                className="px-3.5 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. MODAL DE EDIÇÃO DE LIMITES (CONFIGURAÇÃO) ── */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Editar Limiares de Detecção da Instituição
              </h3>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-base"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Mínimo de Questões por Sessão:
                </label>
                <input
                  type="number"
                  value={tempConfig.minQuestionsThreshold}
                  onChange={(e) =>
                    setTempConfig({
                      ...tempConfig,
                      minQuestionsThreshold: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-3 space-y-2">
                <span className="font-bold text-amber-700 dark:text-amber-400 block">
                  1. Padrão Chute
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-500">Tempo Máximo (s):</label>
                    <input
                      type="number"
                      value={tempConfig.chute.maxAverageSeconds}
                      onChange={(e) =>
                        setTempConfig({
                          ...tempConfig,
                          chute: {
                            ...tempConfig.chute,
                            maxAverageSeconds: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full px-2.5 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500">Acerto Máximo (%):</label>
                    <input
                      type="number"
                      value={tempConfig.chute.maxAccuracyPercentage}
                      onChange={(e) =>
                        setTempConfig({
                          ...tempConfig,
                          chute: {
                            ...tempConfig.chute,
                            maxAccuracyPercentage: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full px-2.5 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-3 space-y-2">
                <span className="font-bold text-purple-700 dark:text-purple-400 block">
                  2. Padrão Refazendo
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-500">% Repetidas Mínima:</label>
                    <input
                      type="number"
                      step="0.05"
                      value={tempConfig.refazendo.minRepeatedRatio}
                      onChange={(e) =>
                        setTempConfig({
                          ...tempConfig,
                          refazendo: {
                            ...tempConfig.refazendo,
                            minRepeatedRatio: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full px-2.5 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500">Acerto Mínimo (%):</label>
                    <input
                      type="number"
                      value={tempConfig.refazendo.minAccuracyPercentage}
                      onChange={(e) =>
                        setTempConfig({
                          ...tempConfig,
                          refazendo: {
                            ...tempConfig.refazendo,
                            minAccuracyPercentage: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full px-2.5 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-3 space-y-2">
                <span className="font-bold text-blue-700 dark:text-blue-400 block">
                  3. Padrão Consulta Externa
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500">Acerto Mín (%):</label>
                    <input
                      type="number"
                      value={tempConfig.consultaExterna.minAccuracyPercentage}
                      onChange={(e) =>
                        setTempConfig({
                          ...tempConfig,
                          consultaExterna: {
                            ...tempConfig.consultaExterna,
                            minAccuracyPercentage: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Tempo Máx (s):</label>
                    <input
                      type="number"
                      value={tempConfig.consultaExterna.maxAverageSeconds}
                      onChange={(e) =>
                        setTempConfig({
                          ...tempConfig,
                          consultaExterna: {
                            ...tempConfig.consultaExterna,
                            maxAverageSeconds: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Desvio Máx (s):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={tempConfig.consultaExterna.maxStdDevSeconds}
                      onChange={(e) =>
                        setTempConfig({
                          ...tempConfig,
                          consultaExterna: {
                            ...tempConfig.consultaExterna,
                            maxStdDevSeconds: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-[11px]"
                    />
                  </div>
                </div>
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
                {isPendingConfig ? "Salvando..." : "Salvar Limiares"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RODAPÉ PADRONIZADO BASE / PERÍODO / FONTE ── */}
      <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap items-center justify-between gap-3">
        <div>
          <strong>Base:</strong> Sessões de prática e prova online com ≥ 20 questões ·{" "}
          <strong>Período:</strong> Ciclo letivo 2026.2 ·{" "}
          <strong>Fonte:</strong> MedPleni Telemetria de Respostas (user_answers & assessment_attempts)
        </div>
        <div className="text-gray-400 dark:text-gray-500">
          Metodologia: Voto SPR nº 9 · Sem uso de rótulos punitivos
        </div>
      </div>
    </div>
  );
}
