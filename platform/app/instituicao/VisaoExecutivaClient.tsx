"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SCORE_BANDS,
  type ExecutiveKPIsResult,
  type ClassAreaHeatmapRow,
  type ExamTimelineItem,
  type ExecutiveAlertItem,
} from "@/lib/b2b/executive";

interface VisaoExecutivaClientProps {
  institution: {
    id: string;
    name: string;
    initials: string;
    cutScore: number;
  };
  userRole: string;
  availableExams: Array<{
    id: string;
    title: string;
    type: string;
    startsAt: string;
    status: string;
  }>;
  selectedExamId: string;
  kpis: ExecutiveKPIsResult;
  heatmapRows: ClassAreaHeatmapRow[];
  timelineItems: ExamTimelineItem[];
  alerts: ExecutiveAlertItem[];
}

export default function VisaoExecutivaClient({
  institution,
  userRole,
  availableExams,
  selectedExamId,
  kpis,
  heatmapRows,
  timelineItems,
  alerts,
}: VisaoExecutivaClientProps) {
  const router = useRouter();

  // Modal para detalhe sob clique nos KPIs
  const [activeKpiModal, setActiveKpiModal] = useState<string | null>(null);

  // Áreas presentes no heatmap
  const areas = heatmapRows.length > 0 ? heatmapRows[0].areas.map((a) => a.areaName) : [];

  const handleSelectExam = (examId: string) => {
    router.push(`/instituicao?examId=${examId}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── BLOCO 1: SELETOR 'PROVA EM ANÁLISE' E IDENTIDADE (EX-01 / EX-02) ─── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">
                Painel do {userRole === "dirigente" ? "Dirigente Geral" : "Coordenador de Curso"}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wider">
                {institution.initials}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                Régua de Corte: {institution.cutScore}%
              </span>
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Visão Executiva de Aprendizagem
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
              Acompanhamento central de proficiência acadêmica, matrizes por área e conformidade CPA/NDE.
            </p>
          </div>

          {/* Seletor "Prova em análise" com explicação direta */}
          <div className="bg-muted/30 border border-border rounded-lg p-3 min-w-[280px] md:max-w-md">
            <label className="text-[11px] font-bold text-foreground flex items-center justify-between">
              <span>Prova em análise:</span>
              <span className="text-[10px] font-normal text-muted-foreground">
                {availableExams.length} avaliação(ões)
              </span>
            </label>

            <select
              value={selectedExamId}
              onChange={(e) => handleSelectExam(e.target.value)}
              className="w-full text-xs rounded-md border border-border bg-background px-2.5 py-1.5 text-foreground mt-1.5 font-medium focus:ring-1 focus:ring-primary focus:outline-hidden"
            >
              {availableExams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({new Date(ex.startsAt).toLocaleDateString("pt-BR")})
                </option>
              ))}
            </select>

            <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 leading-tight">
              <span className="text-primary font-bold">ℹ</span>
              <span>Todos os números e mapas desta tela referem-se à prova escolhida.</span>
            </div>
          </div>
        </div>

        {/* Atalhos Rápidos para Páginas do Menu */}
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium text-[11px]">Navegação rápida:</span>
            <Link
              href="/instituicao/turmas-provas"
              className="px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground font-medium text-[11px] transition-colors"
            >
              📊 Matriz Turmas × Provas
            </Link>
            <Link
              href="/instituicao/cobertura-matriz"
              className="px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground font-medium text-[11px] transition-colors"
            >
              🎯 Cobertura da Matriz
            </Link>
            <Link
              href="/instituicao/relatorios"
              className="px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground font-medium text-[11px] transition-colors"
            >
              📄 Relatórios (CPA / NDE / MEC)
            </Link>
          </div>

          <Link
            href={`/instituicao/provas/${selectedExamId}/resultado`}
            className="text-primary hover:underline font-semibold text-[11px] flex items-center gap-1"
          >
            Abrir resultado completo da prova ➔
          </Link>
        </div>
      </div>

      {/* ─── BLOCO 2: CINCO INDICADORES EXECUTIVOS COM CLIQUE E RODAPÉ (EX-03) ─── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Indicadores Globais da Prova em Análise
          </h2>
          <span className="text-[11px] text-muted-foreground">Clique em um indicador para detalhes</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Card 1: Nota Média da Instituição */}
          <button
            onClick={() => setActiveKpiModal("media")}
            className="p-3.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors text-left flex flex-col justify-between group"
          >
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider group-hover:text-primary transition-colors">
                Nota Média da Instituição
              </div>
              <div className="text-2xl font-black text-foreground mt-1">
                {kpis.institutionMeanScore}%
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-2 flex items-center justify-between">
              <span>{kpis.institutionMeanScore >= institution.cutScore ? "✓ Acima da régua 60" : "⚠ Abaixo do corte"}</span>
              <span className="text-primary">🔍</span>
            </div>
          </button>

          {/* Card 2: Alunos Abaixo de 60 */}
          <button
            onClick={() => setActiveKpiModal("abaixo_60")}
            className="p-3.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors text-left flex flex-col justify-between group"
          >
            <div>
              <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                Alunos Abaixo de 60%
              </div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {kpis.studentsBelowCutPercentage}%
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-2 flex items-center justify-between">
              <span>{kpis.studentsBelowCutCount} de {kpis.totalPresent} presentes</span>
              <span className="text-primary">🔍</span>
            </div>
          </button>

          {/* Card 3: Participação */}
          <button
            onClick={() => setActiveKpiModal("participacao")}
            className="p-3.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors text-left flex flex-col justify-between group"
          >
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider group-hover:text-primary transition-colors">
                Taxa de Participação
              </div>
              <div className="text-2xl font-black text-foreground mt-1">
                {kpis.participationRate}%
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-2 flex items-center justify-between">
              <span>{kpis.totalPresent} presentes ({kpis.totalAbsent} ausentes)</span>
              <span className="text-primary">🔍</span>
            </div>
          </button>

          {/* Card 4: Turmas Abaixo de 60 */}
          <button
            onClick={() => setActiveKpiModal("turmas_60")}
            className="p-3.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors text-left flex flex-col justify-between group"
          >
            <div>
              <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Turmas Abaixo de 60%
              </div>
              <div className="text-2xl font-black text-foreground mt-1">
                {kpis.classesBelowCutCount} <span className="text-xs font-normal text-muted-foreground">de {kpis.totalClasses}</span>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-2 flex items-center justify-between">
              <span>{kpis.classesBelowCutCount === 0 ? "Nenhuma turma crítica" : "Requer atenção do NDE"}</span>
              <span className="text-primary">🔍</span>
            </div>
          </button>

          {/* Card 5: Zona de Decisão (51–60%) - Dr. Filipe */}
          <button
            onClick={() => setActiveKpiModal("zona_decisao")}
            className="p-3.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors text-left flex flex-col justify-between group"
          >
            <div>
              <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                Zona de Decisão (51–60%)
              </div>
              <div className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">
                {kpis.decisionZonePercentage}%
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-2 flex items-center justify-between">
              <span>{kpis.decisionZoneCount} alunos limítrofes</span>
              <span className="text-primary">🔍</span>
            </div>
          </button>
        </div>

        {/* Rodapé Padronizado Base / Período / Fonte */}
        <div className="mt-3.5 pt-2.5 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground flex-wrap gap-2">
          <div>
            <span><strong>Base:</strong> {kpis.footnote.base}</span> • <span><strong>Período:</strong> {kpis.footnote.period}</span> • <span><strong>Fonte:</strong> {kpis.footnote.source}</span>
          </div>
          <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
            ✓ Dados auditados em tempo real
          </span>
        </div>
      </div>

      {/* ─── BLOCO 3: MAPA TURMA × ÁREA COM COLUNA DE MÉDIA FINAL (EX-05) ─── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Mapa de Calor: Turmas × Grandes Áreas Médicas
            </h2>
            <p className="text-xs text-muted-foreground">
              Desempenho por área com a média final da turma em coluna própria. Régua de referência institucional em 60%.
            </p>
          </div>

          {/* Legenda das 4 Faixas Canônicas de Cor */}
          <div className="flex items-center gap-2 flex-wrap text-[10px] font-semibold">
            {Object.values(SCORE_BANDS).map((b) => (
              <span key={b.category} className={`px-2 py-0.5 rounded border ${b.badgeClass}`}>
                {b.label}
              </span>
            ))}
          </div>
        </div>

        {heatmapRows.length > 0 ? (
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Turma / Período</th>
                  <th className="py-2.5 px-3 text-center">Alunos</th>
                  <th className="py-2.5 px-3 text-center bg-muted/90 font-bold border-l border-r border-border">
                    Média Final da Turma
                  </th>
                  {areas.map((ar) => (
                    <th key={ar} className="py-2.5 px-3 text-center min-w-[100px]">
                      {ar}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {heatmapRows.map((row) => {
                  const finalBand = SCORE_BANDS[row.classScoreBand];

                  return (
                    <tr key={row.classGroupId} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-foreground block">{row.classGroupLabel}</span>
                        <span className="text-[10px] text-muted-foreground">{row.period}º Período</span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-muted-foreground font-mono">
                        {row.totalStudents}
                      </td>

                      {/* Coluna Própria: Média Final da Turma */}
                      <td className="py-2.5 px-3 text-center border-l border-r border-border">
                        <span className={`inline-block px-2.5 py-1 rounded font-bold text-xs border ${finalBand.badgeClass}`}>
                          {row.classAverageScore}%
                        </span>
                      </td>

                      {/* Colunas das Áreas Médicas */}
                      {row.areas.map((cell) => {
                        const band = SCORE_BANDS[cell.scoreBand];
                        return (
                          <td key={cell.areaName} className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded font-semibold text-[11px] border ${band.badgeClass}`}
                              title={`${row.classGroupLabel} em ${cell.areaName}: ${cell.averageScore}% (${cell.questionsCount} questões)`}
                            >
                              {cell.averageScore}%
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
            Nenhuma turma avaliada na prova selecionada.
          </div>
        )}
      </div>

      {/* ─── BLOCO 4: EVOLUÇÃO TEMPORAL AO LONGO DAS PROVAS COM AVISO (EX-07) ─── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Acompanhamento Longitudinal das Provas
            </h2>
            <p className="text-xs text-muted-foreground">
              Trajetória de desempenho institucional ao longo do calendário acadêmico.
            </p>
          </div>

          <Link
            href="/instituicao/turmas-provas"
            className="text-xs text-primary hover:underline font-semibold"
          >
            Ver matriz completa Turmas × Provas ➔
          </Link>
        </div>

        {/* Aviso de Não Equiparação Obrigatório */}
        <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900 text-xs dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200 mb-4 flex items-start gap-2">
          <span className="font-bold text-base shrink-0">⚠️</span>
          <div className="leading-relaxed">
            <strong>Aviso Metodológico de Interpretação:</strong> Avaliações diferentes possuem graus de dificuldade distintos e não utilizam a mesma régua métrica estrita. As variações indicam tendências pedagógicas institucionais, e não deslocamentos lineares diretos.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {timelineItems.map((ex, idx) => (
            <div
              key={ex.examId}
              className={`p-4 rounded-lg border transition-colors ${
                ex.examId === selectedExamId
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "border-border bg-card hover:bg-muted/20"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Avaliação {idx + 1}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {new Date(ex.date).toLocaleDateString("pt-BR")}
                </span>
              </div>

              <h3 className="font-bold text-xs text-foreground truncate" title={ex.title}>
                {ex.title}
              </h3>

              <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-border">
                <div>
                  <div className="text-[10px] text-muted-foreground">Média Institucional</div>
                  <div className="text-xl font-black text-foreground">{ex.institutionMeanScore}%</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground">% Abaixo de 60</div>
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400">{ex.rateBelowCut}%</div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">{ex.totalEvaluated} alunos avaliados</span>
                <button
                  onClick={() => handleSelectExam(ex.examId)}
                  className="text-primary hover:underline font-semibold"
                >
                  {ex.examId === selectedExamId ? "✓ Em análise" : "Analisar ➔"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── BLOCO 5: ALERTAS PADRÃO (APENAS NOTA ABAIXO DE 60) (EX-08) ─── */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Painel de Alertas Pedagógicos
            </h2>
            <p className="text-xs text-muted-foreground">
              Por padrão institucional, são sinalizadas turmas e áreas com rendimento abaixo da régua de 60%.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">
            {alerts.length} alerta(s) ativo(s)
          </span>
        </div>

        {alerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.map((al) => (
              <div
                key={al.id}
                className={`p-3 rounded-lg border text-xs flex items-start gap-3 ${
                  al.severity === "critical"
                    ? "bg-rose-50/70 border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-200"
                    : "bg-amber-50/70 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200"
                }`}
              >
                <span className="text-base shrink-0 mt-0.5">
                  {al.severity === "critical" ? "🚨" : "⚠️"}
                </span>
                <div className="flex-1">
                  <div className="font-bold flex items-center justify-between">
                    <span>{al.title}</span>
                    <span className="font-mono text-[11px]">{al.value}%</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed opacity-90">{al.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300">
            <span>✓</span>
            <span className="font-medium">
              Nenhuma turma ou grande área apresentou média inferior a 60% nesta prova. Todos os indicadores atendem à meta institucional.
            </span>
          </div>
        )}
      </div>

      {/* ─── MODAL DE DETALHAMENTO DE KPI SOB CLIQUE ─── */}
      {activeKpiModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground">
                {activeKpiModal === "media" && "Detalhamento da Nota Média"}
                {activeKpiModal === "abaixo_60" && "Alunos Abaixo do Corte (< 60%)"}
                {activeKpiModal === "participacao" && "Detalhamento de Participação"}
                {activeKpiModal === "turmas_60" && "Turmas Abaixo de 60%"}
                {activeKpiModal === "zona_decisao" && "Alunos na Zona de Decisão (51–60%)"}
              </h3>
              <button
                onClick={() => setActiveKpiModal(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-muted-foreground space-y-2">
              {activeKpiModal === "media" && (
                <p>
                  A média geral da instituição foi calculada considerando todos os <strong>{kpis.totalPresent} estudantes finalizados</strong> na avaliação <em>{kpis.footnote.base}</em>, totalizando <strong>{kpis.institutionMeanScore}%</strong>.
                </p>
              )}
              {activeKpiModal === "abaixo_60" && (
                <p>
                  Total de <strong>{kpis.studentsBelowCutCount} estudantes</strong> ({kpis.studentsBelowCutPercentage}%) obtiveram nota inferior a 60%. Estes alunos foram priorizados para listas de exercícios formativas.
                </p>
              )}
              {activeKpiModal === "participacao" && (
                <p>
                  De <strong>{kpis.totalEnrolled} alunos convocados</strong>, <strong>{kpis.totalPresent}</strong> compareceram e concluíram a avaliação, resultando em uma taxa de adesão de <strong>{kpis.participationRate}%</strong> ({kpis.totalAbsent} ausentes).
                </p>
              )}
              {activeKpiModal === "turmas_60" && (
                <p>
                  <strong>{kpis.classesBelowCutCount} de {kpis.totalClasses} turmas</strong> apresentaram rendimento médio abaixo da nota de corte de 60%, exigindo intervenção direcionada do corpo docente.
                </p>
              )}
              {activeKpiModal === "zona_decisao" && (
                <p>
                  Conforme definição pedagógica do Dr. Filipe, <strong>{kpis.decisionZoneCount} alunos ({kpis.decisionZonePercentage}%)</strong> encontram-se na faixa 51–60%. Estes alunos possuem alto potencial de ascensão para o nível proficiente mediante pequenos reforços dirigidos.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <Link
                href={`/instituicao/provas/${selectedExamId}/resultado`}
                className="text-xs text-primary hover:underline font-semibold"
              >
                Ver na página da prova ➔
              </Link>
              <button
                onClick={() => setActiveKpiModal(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
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
