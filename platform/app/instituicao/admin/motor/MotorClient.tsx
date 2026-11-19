"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IndicatorFootnote, EmptyState } from "@/components/b2b";
import type { B2BUserContext } from "@/lib/b2b/types";
import type { TaxArea, TaxTema } from "@/lib/b2b/taxonomy-types";
import type {
  GenerationMode,
  GenerationInputItem,
  GenerationBatchRecord,
  EngineStatsOverview,
} from "@/lib/b2b/engine/engine-types";
import {
  createGenerationInputAction,
  runGenerationBatchAction,
  reviewSampleItemAction,
} from "@/lib/b2b/engine/engine-actions";

interface Props {
  context: B2BUserContext;
  areas: TaxArea[];
  temas: TaxTema[];
  inputs: GenerationInputItem[];
  batches: GenerationBatchRecord[];
  stats: EngineStatsOverview;
}

type TabKey = "painel" | "gerar" | "amostragem" | "insumos";

export default function MotorClient({
  context: _context,
  areas,
  temas,
  inputs,
  batches: initialBatches,
  stats,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("painel");
  const [isPending, startTransition] = useTransition();

  // Estados do Formulário de Geração
  const [mode, setMode] = useState<GenerationMode>("tema_novo");
  const [selectedAreaId, setSelectedAreaId] = useState<string>(areas[0]?.id || "");
  const [selectedTemaId, setSelectedTemaId] = useState<string>(temas[0]?.id || "");
  const [themeTitle, setThemeTitle] = useState<string>("Insuficiência Cardíaca");
  const [competencyTitle, setCompetencyTitle] = useState<string>("Raciocínio Clínico e Tomada de Decisão");
  const [difficulty, setDifficulty] = useState<"facil" | "media" | "dificil">("media");
  const [selectedGuidelineId, setSelectedGuidelineId] = useState<string>(inputs[1]?.id || inputs[0]?.id || "");
  const [batchCount, setBatchCount] = useState<number>(5);
  const [samplePct, setSamplePct] = useState<number>(20);
  const [approvalThreshold, setApprovalThreshold] = useState<number>(80);
  const [modelName, setModelName] = useState<string>("anthropic/claude-3.7-sonnet");

  // Modo 2: Devolutiva
  const [sourceExplanation, setSourceExplanation] = useState<string>(
    "Na insuficiência cardíaca com fração de ejeção reduzida sintomática, a espironolactona e o inibidor de SGLT2 promovem redução comprovada de mortalidade e hospitalização."
  );

  // Modo 3: Reescrita
  const [sourceStatement, setSourceStatement] = useState<string>(
    "Paciente de 62 anos hipertenso com cansaço ao subir escadas, estertores pulmonares e B3. Qual conduta farmacológica inicial?"
  );

  const [generationFeedback, setGenerationFeedback] = useState<string | null>(null);

  // Estados de Cadastro de Insumos
  const [newInputType, setNewInputType] = useState<"national_guideline" | "inep_guide" | "theme_reference">("national_guideline");
  const [newInputTitle, setNewInputTitle] = useState<string>("");
  const [newInputCitation, setNewInputCitation] = useState<string>("");
  const [newInputContent, setNewInputContent] = useState<string>("");
  const [inputFeedback, setInputFeedback] = useState<string | null>(null);

  // Estados de Revisão da Amostra
  const [reviewCommentsMap, setReviewCommentsMap] = useState<Record<string, string>>({});

  // 1. Executar Lote de Geração
  const handleRunBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuidelineId) {
      alert("Selecione uma diretriz/insumo de referência cadastrado.");
      return;
    }

    setGenerationFeedback("Executando motor de síntese, checagens automáticas e amostragem...");

    startTransition(async () => {
      const res = await runGenerationBatchAction({
        mode,
        areaId: selectedAreaId,
        temaId: selectedTemaId,
        themeTitle,
        competencyTitle,
        difficulty,
        guidelineId: selectedGuidelineId,
        count: batchCount,
        samplePercentage: samplePct,
        approvalThresholdPercentage: approvalThreshold,
        sourceStatement: mode === "reescrita_terceiros" ? sourceStatement : undefined,
        sourceExplanation: mode === "devolutiva_para_original" ? sourceExplanation : undefined,
        modelName,
      });

      if (res.success) {
        setGenerationFeedback(`Lote gerado com sucesso! Sorteada a amostra para validação médica.`);
        setTimeout(() => {
          setGenerationFeedback(null);
          setActiveTab("amostragem");
          router.refresh();
        }, 1200);
      } else {
        setGenerationFeedback(`Erro: ${res.message}`);
      }
    });
  };

  // 2. Revisar Item da Amostra
  const handleReviewSample = async (questionId: string, decision: "approved" | "rejected") => {
    const comment = reviewCommentsMap[questionId] || "";
    startTransition(async () => {
      const res = await reviewSampleItemAction(questionId, decision, comment);
      if (res.success) {
        router.refresh();
      } else {
        alert(`Erro ao registrar parecer: ${res.message}`);
      }
    });
  };

  // 3. Cadastrar Novo Insumo
  const handleCreateInput = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputFeedback("Cadastrando diretriz...");
    startTransition(async () => {
      const res = await createGenerationInputAction({
        inputType: newInputType,
        title: newInputTitle,
        sourceCitation: newInputCitation,
        contentText: newInputContent,
        areaId: selectedAreaId || undefined,
        temaId: selectedTemaId || undefined,
      });

      if (res.success) {
        setInputFeedback("Diretriz cadastrada com sucesso!");
        setNewInputTitle("");
        setNewInputCitation("");
        setNewInputContent("");
        setTimeout(() => {
          setInputFeedback(null);
          router.refresh();
        }, 1200);
      } else {
        setInputFeedback(`Erro: ${res.message}`);
      }
    });
  };

  // Lotes aguardando revisão da amostra
  const samplingBatches = initialBatches.filter((b) => b.status === "sampling_review");

  return (
    <div className="space-y-6">
      {/* Bloco 1: Topo e Navegação por Abas (Máximo 5 blocos) */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/instituicao/admin"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Voltar ao Admin MedPleni
              </Link>
            </div>
            <h1 className="text-xl font-bold text-foreground">
              Motor de Geração Assistida & Validação por Amostragem
            </h1>
            <p className="text-xs text-muted-foreground">
              Piloto controlado de síntese médica restrito a Editores e Administradores (QB-08, QB-09, QB-13, QB-14).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-600 font-semibold text-xs border border-amber-500/20">
              Ambiente Piloto (Max 20 itens/lote)
            </span>
          </div>
        </div>

        {/* Abas */}
        <div className="border-t border-border pt-3 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          {[
            { key: "painel", label: "Painel & Taxas de Aprovação" },
            { key: "gerar", label: "Gerar Lote (3 Modos)" },
            {
              key: "amostragem",
              label: `Validação por Amostragem (${samplingBatches.length} pendentes)`,
            },
            { key: "insumos", label: `Insumos & Diretrizes (${inputs.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ABA 1: PAINEL DE MONITORAMENTO & TAXAS DE APROVAÇÃO */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "painel" && (
        <div className="space-y-6">
          {/* Sub-bloco A: KPIs Gerais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border border-border p-4 rounded-xl text-center shadow-xs">
              <div className="text-[10px] text-muted-foreground uppercase font-bold">Total Gerado</div>
              <div className="text-2xl font-bold text-foreground mt-1">{stats.totalGeneratedQuestions}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{stats.totalBatches} lotes executados</div>
            </div>

            <div className="bg-card border border-border p-4 rounded-xl text-center shadow-xs">
              <div className="text-[10px] text-emerald-600 uppercase font-bold">Taxa Global de Aprovação</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.overallApprovalRate}%</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{stats.totalSampleReviewed} itens amostrados</div>
            </div>

            <div className="bg-card border border-border p-4 rounded-xl text-center shadow-xs">
              <div className="text-[10px] text-primary uppercase font-bold">Custo Estimado de IA</div>
              <div className="text-2xl font-bold text-primary mt-1">
                ${(stats.totalGeneratedQuestions * 0.0042).toFixed(2)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Claude 3.7 / Gemini 2.0</div>
            </div>

            <div className="bg-card border border-border p-4 rounded-xl text-center shadow-xs">
              <div className="text-[10px] text-muted-foreground uppercase font-bold">Lotes Liberados</div>
              <div className="text-2xl font-bold text-foreground mt-1">
                {initialBatches.filter((b) => b.status === "released_to_review").length}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Enviados para a revisão única</div>
            </div>
          </div>

          {/* Sub-bloco B: Taxa de Aprovação por Modo e por Tema */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Taxa por Modo */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="font-semibold text-foreground text-sm">Taxa de Aprovação Médica por Modo</h3>
              <div className="space-y-3">
                {[
                  { mode: "tema_novo" as const, title: "(1) Questão Nova (Tema + Diretriz)" },
                  { mode: "devolutiva_para_original" as const, title: "(2) Devolutiva → Questão Original" },
                  { mode: "reescrita_terceiros" as const, title: "(3) Reescrita de Questão de Terceiros" },
                ].map((m) => {
                  const stat = stats.rateByMode[m.mode];
                  return (
                    <div key={m.mode} className="p-3 rounded-lg border border-border bg-background space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{m.title}</span>
                        <span className="font-bold text-emerald-600">{stat.rate}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${stat.rate}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {stat.approved} aprovadas de {stat.total} amostradas
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Taxa por Tema */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="font-semibold text-foreground text-sm">Taxa de Aprovação por Tema</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {stats.rateByTheme.map((t) => (
                  <div key={t.themeName} className="p-2.5 rounded-lg border border-border bg-background flex items-center justify-between text-xs">
                    <div>
                      <div className="font-medium text-foreground">{t.themeName}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {t.approved} aprovadas de {t.total} avaliadas
                      </div>
                    </div>
                    <span className="font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {t.rate}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ABA 2: GERAR LOTE CONTROLADO (3 MODOS) */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "gerar" && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-5">
          <div className="border-b border-border pb-3">
            <h2 className="font-semibold text-foreground text-sm">Configuração do Lote de Síntese</h2>
            <p className="text-xs text-muted-foreground">
              Selecione o modo de geração, o insumo nacional e as diretrizes do INEP. Lote máximo de 20 questões.
            </p>
          </div>

          <form onSubmit={handleRunBatch} className="space-y-4">
            {/* Escolha do Modo */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Modo de Operação *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    key: "tema_novo" as const,
                    title: "(1) Questão Nova",
                    desc: "A partir de tema + competência + diretriz nacional cadastrada",
                  },
                  {
                    key: "devolutiva_para_original" as const,
                    title: "(2) Devolutiva → Original",
                    desc: "Extrai lacuna conceitual do comentário e sintetiza novas questões",
                  },
                  {
                    key: "reescrita_terceiros" as const,
                    title: "(3) Reescrita de Terceiros",
                    desc: "Reescreve com novo caso clínico e similaridade < 60%",
                  },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setMode(item.key)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      mode === item.key
                        ? "border-primary bg-primary/5 text-foreground shadow-xs font-medium"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="font-bold text-xs">{item.title}</div>
                    <div className="text-[11px] mt-1 leading-snug">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Parâmetros do Modo 1: Tema Novo */}
            {mode === "tema_novo" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                <div>
                  <label className="text-[11px] font-semibold text-foreground">Tema Principal</label>
                  <input
                    type="text"
                    required
                    value={themeTitle}
                    onChange={(e) => setThemeTitle(e.target.value)}
                    className="w-full mt-1 p-1.5 border border-border rounded bg-background text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-foreground">Competência Alvo</label>
                  <input
                    type="text"
                    required
                    value={competencyTitle}
                    onChange={(e) => setCompetencyTitle(e.target.value)}
                    className="w-full mt-1 p-1.5 border border-border rounded bg-background text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-foreground">Dificuldade Esperada</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full mt-1 p-1.5 border border-border rounded bg-background text-xs text-foreground"
                  >
                    <option value="facil">Fácil</option>
                    <option value="media">Média</option>
                    <option value="dificil">Difícil</option>
                  </select>
                </div>
              </div>
            )}

            {/* Parâmetros do Modo 2: Devolutiva */}
            {mode === "devolutiva_para_original" && (
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
                <label className="text-[11px] font-semibold text-foreground">
                  Comentário / Devolutiva de Origem (Lacuna Pedagógica a Explorar) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={sourceExplanation}
                  onChange={(e) => setSourceExplanation(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background text-xs text-foreground"
                />
              </div>
            )}

            {/* Parâmetros do Modo 3: Reescrita de Terceiros */}
            {mode === "reescrita_terceiros" && (
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-2">
                <label className="text-[11px] font-semibold text-foreground">
                  Enunciado Original de Terceiros a ser Reescrito *
                </label>
                <textarea
                  rows={3}
                  required
                  value={sourceStatement}
                  onChange={(e) => setSourceStatement(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background text-xs text-foreground"
                />
                <p className="text-[10px] text-muted-foreground">
                  O motor garante vínculo com a origem e checagem de similaridade &lt; 60% para proteção jurídica.
                </p>
              </div>
            )}

            {/* Insumo de Referência Nacional */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Diretriz / Insumo de Referência Nacional *
                </label>
                <select
                  required
                  value={selectedGuidelineId}
                  onChange={(e) => setSelectedGuidelineId(e.target.value)}
                  className="w-full p-2 border border-border rounded-lg bg-background text-xs text-foreground"
                >
                  {inputs.map((inp) => (
                    <option key={inp.id} value={inp.id}>
                      {inp.title} ({inp.sourceCitation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Modelo de Inteligência Artificial *
                </label>
                <select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full p-2 border border-border rounded-lg bg-background text-xs text-foreground"
                >
                  <option value="anthropic/claude-3.7-sonnet">Claude 3.7 Sonnet (Raciocínio Clínico Aprofundado)</option>
                  <option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash (Alta Performance & Diretrizes)</option>
                </select>
              </div>
            </div>

            {/* Parâmetros de Amostragem & Quantidade */}
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Tamanho do Lote (Max 20)</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  required
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                  className="w-full p-2 border border-border rounded-lg bg-background text-xs text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">% de Amostragem Sorteada</label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  required
                  value={samplePct}
                  onChange={(e) => setSamplePct(Number(e.target.value))}
                  className="w-full p-2 border border-border rounded-lg bg-background text-xs text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Limiar de Aprovação (%)</label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  required
                  value={approvalThreshold}
                  onChange={(e) => setApprovalThreshold(Number(e.target.value))}
                  className="w-full p-2 border border-border rounded-lg bg-background text-xs text-foreground"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-border">
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs"
              >
                {isPending ? "Sintetizando Lote e Checando Requisitos..." : `Sintetizar Lote de ${batchCount} Questões`}
              </button>

              <div className="text-xs text-muted-foreground">
                Custo estimado: <span className="font-mono font-bold text-foreground">${(batchCount * 0.0042).toFixed(3)} USD</span>
              </div>
            </div>

            {generationFeedback && (
              <div className="p-3 bg-muted rounded-lg text-xs font-medium text-foreground">
                {generationFeedback}
              </div>
            )}
          </form>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ABA 3: VALIDAÇÃO POR AMOSTRAGEM (REVISÃO MÉDICA) */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "amostragem" && (
        <div className="space-y-6">
          {samplingBatches.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 shadow-xs text-center">
              <EmptyState
                title="Nenhum lote pendente de amostragem"
                description="Todos os lotes gerados já foram avaliados e liberados para a revisão única ou reprovados."
              />
            </div>
          ) : (
            samplingBatches.map((batch) => {
              const sampleQuestions = (batch.questions || []).filter((q) => q.isSample);
              return (
                <div key={batch.id} className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          Lote {batch.mode.toUpperCase()} — {batch.totalGenerated} questões
                        </span>
                        <span className="text-[10px] bg-amber-500/10 text-amber-600 font-bold px-2 py-0.5 rounded border border-amber-500/20">
                          Amostra: {sampleQuestions.length} itens ({batch.samplePercentage}%)
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Limiar de aprovação requerido: <span className="font-bold text-foreground">{batch.approvalThresholdPercentage}%</span>
                      </div>
                    </div>

                    <div className="text-xs">
                      <span className="font-semibold text-emerald-600">{batch.sampleApprovedCount} aprovadas</span>
                      {" · "}
                      <span className="font-semibold text-rose-600">{batch.sampleRejectedCount} reprovadas</span>
                    </div>
                  </div>

                  {/* Questões Sorteadas na Amostra */}
                  <div className="space-y-4">
                    {sampleQuestions.map((q, idx) => (
                      <div key={q.id} className="p-4 rounded-lg border border-border bg-background space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-primary">
                            Item da Amostra #{idx + 1}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            Status: {q.sampleReviewStatus.toUpperCase()}
                          </span>
                        </div>

                        {/* Enunciado */}
                        <p className="text-xs text-foreground font-sans leading-relaxed">
                          {q.statement}
                        </p>

                        {/* Alternativas */}
                        <div className="space-y-1.5">
                          {q.options.map((opt) => (
                            <div
                              key={opt.letter}
                              className={`p-2 rounded text-xs flex items-start gap-2 ${
                                opt.is_correct
                                  ? "border border-emerald-500 bg-emerald-500/10 font-medium"
                                  : "border border-border bg-card"
                              }`}
                            >
                              <span className="font-bold">{opt.letter})</span>
                              <span className="flex-1">{opt.text}</span>
                            </div>
                          ))}
                        </div>

                        {/* Comentário e Referência */}
                        <div className="p-2.5 rounded bg-muted/60 text-[11px] text-foreground space-y-1">
                          <div><strong>Gabarito Oficial:</strong> {q.correctLetter}</div>
                          <div><strong>Justificativa:</strong> {q.explanation}</div>
                          <div><strong>Referência:</strong> {q.referenceCitation}</div>
                        </div>

                        {/* Checagens Automáticas (QB-14) */}
                        <div className="p-2 rounded bg-muted/30 border border-border text-[10px] grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div className={q.automatedChecks.singleCorrect ? "text-emerald-600" : "text-rose-600"}>
                            {q.automatedChecks.singleCorrect ? "✓" : "✗"} Única correta
                          </div>
                          <div className={q.automatedChecks.balancedLength ? "text-emerald-600" : "text-rose-600"}>
                            {q.automatedChecks.balancedLength ? "✓" : "✗"} Tamanho balanceado
                          </div>
                          <div className={q.automatedChecks.noAllAbove ? "text-emerald-600" : "text-rose-600"}>
                            {q.automatedChecks.noAllAbove ? "✓" : "✗"} Sem &ldquo;todas anteriores&rdquo;
                          </div>
                          <div className={q.automatedChecks.clearCommand ? "text-emerald-600" : "text-rose-600"}>
                            {q.automatedChecks.clearCommand ? "✓" : "✗"} Comando claro
                          </div>
                          <div className={q.automatedChecks.referencePresent ? "text-emerald-600" : "text-rose-600"}>
                            {q.automatedChecks.referencePresent ? "✓" : "✗"} Referência citada
                          </div>
                          <div className={q.automatedChecks.safeSimilarity ? "text-emerald-600" : "text-rose-600"}>
                            {q.automatedChecks.safeSimilarity ? "✓" : "✗"} Similaridade segura ({q.originSimilarityScore}%)
                          </div>
                        </div>

                        {/* Parecer do Revisor */}
                        {q.sampleReviewStatus === "pending" ? (
                          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-border">
                            <input
                              type="text"
                              placeholder="Comentário médico do parecer (opcional)..."
                              value={reviewCommentsMap[q.id] || ""}
                              onChange={(e) =>
                                setReviewCommentsMap((prev) => ({ ...prev, [q.id]: e.target.value }))
                              }
                              className="w-full sm:flex-1 p-1.5 border border-border rounded bg-background text-xs text-foreground"
                            />
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => handleReviewSample(q.id, "approved")}
                                disabled={isPending}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition-colors flex-1 sm:flex-none"
                              >
                                ✓ Aprovar Item
                              </button>
                              <button
                                onClick={() => handleReviewSample(q.id, "rejected")}
                                disabled={isPending}
                                className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-semibold hover:bg-rose-700 transition-colors flex-1 sm:flex-none"
                              >
                                ✕ Reprovar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs font-medium pt-1 text-muted-foreground">
                            Parecer registrado: <span className="font-bold text-foreground">{q.sampleReviewStatus.toUpperCase()}</span>
                            {q.sampleReviewComment && ` — "${q.sampleReviewComment}"`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ABA 4: CADASTRO DE INSUMOS & DIRETRIZES NACIONAIS */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "insumos" && (
        <div className="space-y-6">
          {/* Sub-bloco A: Formulário de Novo Insumo */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="font-semibold text-foreground text-sm">Cadastrar Novo Insumo ou Diretriz Nacional</h3>
            <p className="text-xs text-muted-foreground">
              O arquivo oficial do INEP fornecido pelo Mario ou novas diretrizes de sociedades médicas (SBC, FEBRASGO, etc.) podem ser cadastrados aqui.
            </p>

            <form onSubmit={handleCreateInput} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-foreground">Tipo de Insumo</label>
                  <select
                    value={newInputType}
                    onChange={(e) => setNewInputType(e.target.value as any)}
                    className="w-full mt-1 p-1.5 border border-border rounded bg-background text-xs text-foreground"
                  >
                    <option value="national_guideline">Diretriz de Sociedade Brasileira (ex: SBC, FEBRASGO)</option>
                    <option value="inep_guide">Guia Oficial do INEP (Elaboração de Itens)</option>
                    <option value="theme_reference">Artigo / Referência Temática Específica</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-foreground">Título do Documento *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Diretriz Brasileira de Insuficiência Cardíaca 2024"
                    value={newInputTitle}
                    onChange={(e) => setNewInputTitle(e.target.value)}
                    className="w-full mt-1 p-1.5 border border-border rounded bg-background text-xs text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-foreground">Citação Bibliográfica Oficial *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Arquivos Brasileiros de Cardiologia, SBC, 2024; 121(3):e20230890."
                  value={newInputCitation}
                  onChange={(e) => setNewInputCitation(e.target.value)}
                  className="w-full mt-1 p-1.5 border border-border rounded bg-background text-xs text-foreground"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-foreground">Trecho de Recomendações / Texto da Diretriz *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Cole aqui as recomendações principais, classes de indicação e níveis de evidência..."
                  value={newInputContent}
                  onChange={(e) => setNewInputContent(e.target.value)}
                  className="w-full mt-1 p-2 border border-border rounded bg-background text-xs text-foreground"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-xs font-semibold disabled:opacity-50 transition-colors"
                >
                  Salvar Diretriz
                </button>

                {inputFeedback && (
                  <span className="text-xs font-medium text-emerald-600 animate-fade-in">
                    {inputFeedback}
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Sub-bloco B: Lista de Insumos Cadastrados */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="font-semibold text-foreground text-sm">Insumos e Diretrizes Cadastrados ({inputs.length})</h3>
            <div className="space-y-3">
              {inputs.map((inp) => (
                <div key={inp.id} className="p-3.5 rounded-lg border border-border bg-background space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground">{inp.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase font-bold">
                      {inp.inputType.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-[11px] text-primary font-medium">{inp.sourceCitation}</div>
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {inp.contentText}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bloco 5: Rodapé Padronizado B2B */}
      <IndicatorFootnote
        base="Motor de Geração Assistida & Amostragem Médica"
        periodo="Piloto MedPleni"
        fonte="Tabelas generation_batches, generation_inputs e generated_questions"
      />
    </div>
  );
}
