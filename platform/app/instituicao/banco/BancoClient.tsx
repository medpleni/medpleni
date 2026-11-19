"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader, EmptyState, IndicatorFootnote } from "@/components/b2b";
import type {
  B2BQuestionSummary,
  B2BQuestionFull,
  BankOverviewStats,
  QuestionDifficulty,
} from "@/lib/b2b/bank-types";
import type { B2BUserContext } from "@/lib/b2b/types";
import type { TaxArea, TaxCenario, TaxTema, TaxCompetencia } from "@/lib/b2b/taxonomy-types";
import {
  searchBankQuestionsAction,
  getQuestionFullDetails,
  createDocentQuestionAction,
  reviewQuestionAction,
  disputeQuestionAction,
} from "@/lib/b2b/bank-actions";

interface Props {
  context: B2BUserContext;
  overview: BankOverviewStats;
  initialQuestions: B2BQuestionSummary[];
  initialTotalCount: number;
  taxonomy: {
    areas: TaxArea[];
    cenarios: TaxCenario[];
    temas: TaxTema[];
    competencias: TaxCompetencia[];
  };
}

type TabKey = "visao_geral" | "explorar" | "revisao" | "nova_questao";

export default function BancoClient({
  context,
  overview: initialOverview,
  initialQuestions,
  initialTotalCount,
  taxonomy,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("visao_geral");
  const [isPending, startTransition] = useTransition();

  // Estados de Busca e Filtros
  const [search, setSearch] = useState("");
  const [filterAreaId, setFilterAreaId] = useState("");
  const [filterCenarioId, setFilterCenarioId] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterOrigin, setFilterOrigin] = useState("");
  const [filterHasImage, setFilterHasImage] = useState<string>("todos");
  const [filterUsedInExams, setFilterUsedInExams] = useState<string>("todos");
  const [filterStatus, setFilterStatus] = useState<string>("todos");

  const [questions, setQuestions] = useState<B2BQuestionSummary[]>(initialQuestions);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [page, setPage] = useState(1);

  // Estados da Fila de Revisão
  const [onlyMyArea, setOnlyMyArea] = useState(false);
  const [selectedQuestionForReview, setSelectedQuestionForReview] = useState<B2BQuestionSummary | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"approved" | "returned_with_comments">("approved");
  const [reviewComments, setReviewComments] = useState("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewStatusMsg, setReviewStatusMsg] = useState<string | null>(null);

  // Estados de Ficha da Questão
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedQuestionDetails, setSelectedQuestionDetails] = useState<B2BQuestionFull | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Estados de Contestação (QB-15)
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeFeedback, setDisputeFeedback] = useState<string | null>(null);

  // Estados de Nova Questão
  const [newStatement, setNewStatement] = useState("");
  const [newClinicalContext, setNewClinicalContext] = useState("");
  const [newAreaId, setNewAreaId] = useState(taxonomy.areas[0]?.id || "");
  const [newCenarioId, setNewCenarioId] = useState("");
  const [newTemaId, setNewTemaId] = useState("");
  const [newCompId, setNewCompId] = useState("");
  const [newDifficulty, setNewDifficulty] = useState<QuestionDifficulty>("media");
  const [newExplanation, setNewExplanation] = useState("");
  const [newProvenance, setNewProvenance] = useState("");
  const [newAlternatives, setNewAlternatives] = useState<
    { letter: "A" | "B" | "C" | "D" | "E"; text: string; is_correct: boolean }[]
  >([
    { letter: "A", text: "", is_correct: true },
    { letter: "B", text: "", is_correct: false },
    { letter: "C", text: "", is_correct: false },
    { letter: "D", text: "", is_correct: false },
    { letter: "E", text: "", is_correct: false },
  ]);
  const [newQuestionFeedback, setNewQuestionFeedback] = useState<string | null>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // AÇÃO DE BUSCA E FILTROS
  // ───────────────────────────────────────────────────────────────────────────
  const handleApplyFilters = (overridePage?: number) => {
    const targetPage = overridePage ?? page;
    startTransition(async () => {
      const res = await searchBankQuestionsAction(
        {
          search: search || undefined,
          areaId: filterAreaId || undefined,
          cenarioId: filterCenarioId || undefined,
          difficulty: filterDifficulty || undefined,
          year: filterYear ? Number(filterYear) : undefined,
          origin: filterOrigin || undefined,
          hasImage: filterHasImage === "sim" ? true : filterHasImage === "nao" ? false : undefined,
          usedInExams:
            filterUsedInExams === "sim" ? true : filterUsedInExams === "nao" ? false : undefined,
          status: filterStatus !== "todos" ? filterStatus : undefined,
          page: targetPage,
          pageSize: 15,
        },
        context.institution.id
      );

      setQuestions(res.questions);
      setTotalCount(res.totalCount);
      if (overridePage) setPage(overridePage);
    });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // CARREGA FICHA COMPLETA DA QUESTÃO
  // ───────────────────────────────────────────────────────────────────────────
  const handleOpenDetails = async (questionId: string) => {
    setIsLoadingDetails(true);
    setDetailsModalOpen(true);
    setSelectedQuestionDetails(null);

    const full = await getQuestionFullDetails(questionId);
    setSelectedQuestionDetails(full);
    setIsLoadingDetails(false);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // EXECUTA REVISÃO EM 1 ETAPA
  // ───────────────────────────────────────────────────────────────────────────
  const handleExecuteReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestionForReview) return;
    setReviewStatusMsg("Gravando parecer...");

    startTransition(async () => {
      try {
        await reviewQuestionAction(selectedQuestionForReview.id, {
          decision: reviewDecision,
          comments: reviewComments,
        });

        setReviewStatusMsg(
          reviewDecision === "approved"
            ? "Questão aprovada e publicada no acervo institucional!"
            : "Questão devolvida ao docente com apontamentos."
        );

        setTimeout(() => {
          setReviewModalOpen(false);
          setReviewStatusMsg(null);
          setSelectedQuestionForReview(null);
          setReviewComments("");
          handleApplyFilters(1);
          router.refresh();
        }, 1200);
      } catch (err: unknown) {
        setReviewStatusMsg(`Erro: ${(err as Error).message}`);
      }
    });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // ENVIO DE CONTESTAÇÃO (QB-15)
  // ───────────────────────────────────────────────────────────────────────────
  const handleSendDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestionDetails) return;
    setDisputeFeedback("Registrando contestação...");

    startTransition(async () => {
      try {
        await disputeQuestionAction(selectedQuestionDetails.id, disputeReason);
        setDisputeFeedback("Contestação enviada com sucesso para análise pedagógica.");
        setTimeout(() => {
          setDisputeModalOpen(false);
          setDisputeFeedback(null);
          setDisputeReason("");
        }, 1200);
      } catch (err: unknown) {
        setDisputeFeedback(`Erro: ${(err as Error).message}`);
      }
    });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // CADASTRO DE NOVA QUESTÃO
  // ───────────────────────────────────────────────────────────────────────────
  const handleCreateQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewQuestionFeedback("Salvando questão e submetendo para revisão...");

    startTransition(async () => {
      try {
        await createDocentQuestionAction({
          statement: newStatement,
          clinicalContext: newClinicalContext || undefined,
          areaId: newAreaId,
          cenarioId: newCenarioId || undefined,
          temaId: newTemaId || undefined,
          competenciaId: newCompId || undefined,
          difficulty: newDifficulty,
          alternatives: newAlternatives,
          explanation: newExplanation,
          provenanceSource: newProvenance || undefined,
        });

        setNewQuestionFeedback("Questão criada com sucesso e encaminhada para a Fila de Revisão!");
        setNewStatement("");
        setNewClinicalContext("");
        setNewExplanation("");
        setNewProvenance("");
        setNewAlternatives([
          { letter: "A", text: "", is_correct: true },
          { letter: "B", text: "", is_correct: false },
          { letter: "C", text: "", is_correct: false },
          { letter: "D", text: "", is_correct: false },
          { letter: "E", text: "", is_correct: false },
        ]);

        setTimeout(() => {
          setNewQuestionFeedback(null);
          setActiveTab("revisao");
          handleApplyFilters(1);
          router.refresh();
        }, 1500);
      } catch (err: unknown) {
        setNewQuestionFeedback(`Erro: ${(err as Error).message}`);
      }
    });
  };

  // Fila de revisão (questões com status in_review)
  const reviewQuestions = questions.filter((q) => q.b2b_status === "in_review");

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "8px 0 40px" }} className="space-y-6">
      {/* Bloco 1: Cabeçalho do Banco */}
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
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 4px", color: "var(--heading-color)" }}>
            Banco de Questões
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--chumbo)" }}>
            Acervo oficial MedPleni e questões privativas de {context.institution.name}.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link
            href="/instituicao/banco/importar"
            style={{
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: 600,
              borderRadius: "8px",
              border: "1px solid var(--card-border)",
              background: "var(--card-bg)",
              color: "var(--heading-color)",
              textDecoration: "none",
              boxShadow: "var(--card-shadow)",
            }}
          >
            Importar Arquivo
          </Link>
          <button
            onClick={() => setActiveTab("nova_questao")}
            style={{
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 600,
              borderRadius: "8px",
              border: "none",
              background: "var(--pulso)",
              color: "#FFFFFF",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0, 194, 168, 0.25)",
            }}
          >
            + Nova Questão
          </button>
        </div>
      </div>

      {/* Bloco 2: Navegação por Abas Limpa e Moderna */}
      <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid var(--card-border)", marginBottom: "20px", overflowX: "auto" }}>
        {[
          { key: "visao_geral", label: "Visão Geral & Cobertura" },
          { key: "explorar", label: `Explorar Acervo (${totalCount})` },
          {
            key: "revisao",
            label: `Fila de Revisão (${initialOverview.total_in_review})`,
          },
          { key: "nova_questao", label: "+ Elaborar Questão" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key as TabKey);
              if (tab.key === "explorar") handleApplyFilters(1);
            }}
            style={{
              padding: "10px 4px",
              fontSize: "13px",
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? "var(--pulso)" : "var(--chumbo)",
              borderBottom: activeTab === tab.key ? "2px solid var(--pulso)" : "2px solid transparent",
              background: "transparent",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ABA 1: VISÃO GERAL & MATRIZ ÁREA × CENÁRIO */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "visao_geral" && (
        <div className="space-y-6">
          {/* Sub-bloco A: KPIs Gerais */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
            <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "16px 20px", boxShadow: "var(--card-shadow)" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--chumbo)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Publicadas Disponíveis</div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#16A34A", marginTop: "4px" }}>
                {initialOverview.total_published}
              </div>
            </div>
            <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "16px 20px", boxShadow: "var(--card-shadow)" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--chumbo)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Em Fila de Revisão</div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#D97706", marginTop: "4px" }}>
                {initialOverview.total_in_review}
              </div>
            </div>
            <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "16px 20px", boxShadow: "var(--card-shadow)" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--chumbo)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Banco Privado Institucional</div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--pulso)", marginTop: "4px" }}>
                {initialOverview.total_private}
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
              <div className="text-xs text-muted-foreground font-medium">Plano Contratado</div>
              <div className="text-lg font-bold text-foreground uppercase mt-1">
                {initialOverview.plan === "plus"
                  ? "Plus (Apexus)"
                  : initialOverview.plan === "acervo"
                  ? "Com Acervo"
                  : "Plataforma Vazia"}
              </div>
            </div>
          </div>

          {/* Sub-bloco B: Distribuição por Grande Área */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-semibold text-foreground text-base">Distribuição por Grande Área (7 Áreas INEP)</h3>
              <p className="text-xs text-muted-foreground">Volume de itens catalogados por eixo curricular</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {taxonomy.areas.map((area) => {
                const stat = initialOverview.area_stats.find((s) => s.area_id === area.id);
                const count = stat ? stat.published_count : 0;
                const inRev = stat ? stat.in_review_count : 0;

                return (
                  <div
                    key={area.id}
                    className="p-3 rounded-lg border border-border bg-background space-y-1 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: `${area.color_hex || "#00C2A8"}15`,
                          color: area.color_hex || "#00C2A8",
                        }}
                      >
                        {area.code}
                      </span>
                      {inRev > 0 && (
                        <span className="text-[10px] text-amber-500 font-semibold">{inRev} em revisão</span>
                      )}
                    </div>
                    <div className="font-medium text-xs text-foreground truncate">{area.name}</div>
                    <div className="text-lg font-bold text-foreground">{count} questões</div>
                  </div>
                );
              })}
            </div>
            <IndicatorFootnote base="Acervo institucional e MedPleni" periodo="Vigência atual" fonte="Tabela public.questions e tax_areas" />
          </div>

          {/* Sub-bloco C: Mapa Área × Cenário (QB-03: sem meta por célula, só quantidade) */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-semibold text-foreground text-base">Mapa de Cobertura: Área × Cenário</h3>
              <p className="text-xs text-muted-foreground">
                Cruzamento dimensional de densidade de itens (sem metas artificiais, exibindo apenas o quantitativo real)
              </p>
            </div>

            {taxonomy.cenarios.length === 0 ? (
              <div className="p-4 rounded-lg bg-muted text-xs text-muted-foreground">
                ℹ️ Cenários ainda não cadastrados. Assim que a lista oficial for importada, a matriz bidimensional será calculada automaticamente.
              </div>
            ) : (
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="bg-muted text-muted-foreground uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Grande Área</th>
                      {taxonomy.cenarios.map((c) => (
                        <th key={c.id} className="py-2.5 px-2">
                          {c.code}
                        </th>
                      ))}
                      <th className="py-2.5 px-3">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {taxonomy.areas.map((a) => {
                      let rowTotal = 0;
                      return (
                        <tr key={a.id} className="hover:bg-muted/30">
                          <td className="py-2.5 px-3 text-left font-medium text-foreground">{a.name}</td>
                          {taxonomy.cenarios.map((c) => {
                            const gridItem = initialOverview.grid_stats.find(
                              (g) => g.area_id === a.id && g.cenario_id === c.id
                            );
                            const val = gridItem ? gridItem.count : 0;
                            rowTotal += val;
                            return (
                              <td
                                key={c.id}
                                className={`py-2 px-2 font-mono ${
                                  val > 0 ? "font-bold text-foreground bg-primary/5" : "text-muted-foreground"
                                }`}
                              >
                                {val}
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-3 font-mono font-bold text-primary">{rowTotal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <IndicatorFootnote base="Matriz canônica INEP" periodo="Tempo real" fonte="Função RPC get_bank_overview_stats" />
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ABA 2: EXPLORAR ACERVO COM FILTROS COMBINADOS (QB-04) */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "explorar" && (
        <div className="space-y-6">
          {/* Sub-bloco A: Barra de Busca e Filtros */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                placeholder="Buscar por palavras no enunciado ou contexto clínico..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters(1)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-xs text-foreground placeholder:text-muted-foreground"
              />
              <button
                onClick={() => handleApplyFilters(1)}
                className="w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-xs font-semibold whitespace-nowrap"
              >
                Filtrar Questões
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
              {/* Área */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground">Área</label>
                <select
                  value={filterAreaId}
                  onChange={(e) => setFilterAreaId(e.target.value)}
                  className="w-full mt-0.5 p-1.5 border border-border rounded bg-background text-foreground text-xs"
                >
                  <option value="">Todas as Áreas</option>
                  {taxonomy.areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cenário */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground">Cenário</label>
                <select
                  value={filterCenarioId}
                  onChange={(e) => setFilterCenarioId(e.target.value)}
                  className="w-full mt-0.5 p-1.5 border border-border rounded bg-background text-foreground text-xs"
                >
                  <option value="">Todos</option>
                  {taxonomy.cenarios.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dificuldade */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground">Dificuldade</label>
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="w-full mt-0.5 p-1.5 border border-border rounded bg-background text-foreground text-xs"
                >
                  <option value="">Todas</option>
                  <option value="facil">Fácil</option>
                  <option value="media">Média</option>
                  <option value="dificil">Difícil</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full mt-0.5 p-1.5 border border-border rounded bg-background text-foreground text-xs"
                >
                  <option value="todos">Todos</option>
                  <option value="published">Publicadas</option>
                  <option value="in_review">Em Revisão</option>
                  <option value="draft">Rascunhos</option>
                </select>
              </div>

              {/* Ano */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground">Ano</label>
                <input
                  type="number"
                  placeholder="Ex: 2024"
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full mt-0.5 p-1.5 border border-border rounded bg-background text-foreground text-xs"
                />
              </div>

              {/* Origem */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground">Banca / Origem</label>
                <input
                  type="text"
                  placeholder="Ex: USP, ENARE"
                  value={filterOrigin}
                  onChange={(e) => setFilterOrigin(e.target.value)}
                  className="w-full mt-0.5 p-1.5 border border-border rounded bg-background text-foreground text-xs"
                />
              </div>

              {/* Com Imagem */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground">Imagem</label>
                <select
                  value={filterHasImage}
                  onChange={(e) => setFilterHasImage(e.target.value)}
                  className="w-full mt-0.5 p-1.5 border border-border rounded bg-background text-foreground text-xs"
                >
                  <option value="todos">Todos</option>
                  <option value="sim">Com Imagem</option>
                  <option value="nao">Sem Imagem</option>
                </select>
              </div>

              {/* Já Usada em Provas */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground">Uso em Provas</label>
                <select
                  value={filterUsedInExams}
                  onChange={(e) => setFilterUsedInExams(e.target.value)}
                  className="w-full mt-0.5 p-1.5 border border-border rounded bg-background text-foreground text-xs"
                >
                  <option value="todos">Todos</option>
                  <option value="sim">Já Utilizada</option>
                  <option value="nao">Inédita em Provas</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sub-bloco B: Lista de Questões Encontradas */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{totalCount} questões encontradas</span>
              <span>Página {page} de {Math.max(1, Math.ceil(totalCount / 15))}</span>
            </div>

            {questions.length === 0 ? (
              <EmptyState
                title="Nenhuma questão encontrada"
                description="Tente ajustar os filtros ou os termos de pesquisa."
              />
            ) : (
              <div className="divide-y divide-border">
                {questions.map((q) => (
                  <div
                    key={q.id}
                    onClick={() => handleOpenDetails(q.id)}
                    className="py-4 cursor-pointer hover:bg-muted/40 transition-colors rounded-lg px-2 -mx-2 space-y-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {q.classification?.area_code && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: `${q.classification.area_color || "#00C2A8"}20`,
                            color: q.classification.area_color || "#00C2A8",
                          }}
                        >
                          {q.classification.area_name}
                        </span>
                      )}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {q.origin_label}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded capitalize bg-muted/60 text-foreground">
                        Dificuldade: {q.classification?.difficulty || "Média"}
                      </span>
                      {q.has_image && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          Com Imagem
                        </span>
                      )}
                      {q.b2b_visibility === "institution_private" && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold">
                          Privada da Instituição
                        </span>
                      )}
                      {q.times_used_in_exams > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          Utilizada em {q.times_used_in_exams} prova(s)
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-foreground font-medium line-clamp-2">
                      {q.statement}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Paginação */}
            {totalCount > 15 && (
              <div className="flex items-center justify-between pt-4 border-t border-border text-xs">
                <button
                  disabled={page <= 1}
                  onClick={() => handleApplyFilters(page - 1)}
                  className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50 hover:bg-muted"
                >
                  ← Página Anterior
                </button>
                <span>Página {page}</span>
                <button
                  disabled={page >= Math.ceil(totalCount / 15)}
                  onClick={() => handleApplyFilters(page + 1)}
                  className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50 hover:bg-muted"
                >
                  Próxima Página →
                </button>
              </div>
            )}
            <IndicatorFootnote base="Itens filtrados" periodo="Tempo real" fonte="Índices de alta performance em public.questions" />
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ABA 3: FILA DE REVISÃO ÚNICA (QB-07 / QB-12) */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "revisao" && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-foreground text-base">Fila de Revisão Pedagógica em 1 Etapa</h3>
              <p className="text-xs text-muted-foreground">
                Itens submetidos pelo corpo docente aguardando aprovação ou devolução com parecer
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={onlyMyArea}
                onChange={(e) => setOnlyMyArea(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>Só minha área</span>
            </label>
          </div>

          {reviewQuestions.length === 0 ? (
            <EmptyState
              title="Fila de revisão zerada"
              description="Nenhuma questão pendente de revisão pedagógica no momento."
            />
          ) : (
            <div className="divide-y divide-border">
              {reviewQuestions.map((q) => (
                <div key={q.id} className="py-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary">
                        {q.classification?.area_name || "Geral"}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                        Aguardando Parecer
                      </span>
                      <span className="text-xs text-muted-foreground">{q.origin_label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenDetails(q.id)}
                        className="text-xs px-3 py-1 border border-border rounded-lg hover:bg-muted text-foreground"
                      >
                        Ver Ficha Completa
                      </button>
                      <button
                        onClick={() => {
                          setSelectedQuestionForReview(q);
                          setReviewDecision("approved");
                          setReviewComments("Questão aprovada para uso em provas e simulados.");
                          setReviewStatusMsg(null);
                          setReviewModalOpen(true);
                        }}
                        className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
                      >
                        Avaliar / Revisar →
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-foreground line-clamp-2">{q.statement}</p>
                </div>
              ))}
            </div>
          )}
          <IndicatorFootnote base="Fila editorial" periodo="Tempo real" fonte="Tabela public.question_reviews" />
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ABA 4: NOVA QUESTÃO POR DOCENTE (QB-06) */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "nova_questao" && (
        <form onSubmit={handleCreateQuestionSubmit} className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-5">
            <div>
              <h3 className="font-semibold text-foreground text-base">Elaboração de Nova Questão (Docente)</h3>
              <p className="text-xs text-muted-foreground">
                Classificação nos 4 eixos taxonômicos, alternativas e justificativa pedagógica obrigatória
              </p>
            </div>

            {/* Enunciado e Contexto */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Enunciado Principal *</label>
                <textarea
                  required
                  rows={3}
                  value={newStatement}
                  onChange={(e) => setNewStatement(e.target.value)}
                  placeholder="Descreva a situação-problema e a pergunta clínica objetiva..."
                  className="w-full mt-1 p-2.5 border border-border rounded-lg bg-background text-xs text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Contexto Clínico / Caso (Opcional)</label>
                <textarea
                  rows={2}
                  value={newClinicalContext}
                  onChange={(e) => setNewClinicalContext(e.target.value)}
                  placeholder="Ex: Paciente de 45 anos, hipertenso prévio, dá entrada com dor precordial..."
                  className="w-full mt-1 p-2.5 border border-border rounded-lg bg-background text-xs text-foreground"
                />
              </div>
            </div>

            {/* 4 Eixos da Taxonomia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">1. Grande Área *</label>
                <select
                  required
                  value={newAreaId}
                  onChange={(e) => setNewAreaId(e.target.value)}
                  className="w-full mt-1 p-2 border border-border rounded-lg bg-background text-xs text-foreground"
                >
                  {taxonomy.areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">2. Cenário de Prática</label>
                <select
                  value={newCenarioId}
                  onChange={(e) => setNewCenarioId(e.target.value)}
                  className="w-full mt-1 p-2 border border-border rounded-lg bg-background text-xs text-foreground"
                >
                  <option value="">Selecione o cenário...</option>
                  {taxonomy.cenarios.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">3. Tema</label>
                <select
                  value={newTemaId}
                  onChange={(e) => setNewTemaId(e.target.value)}
                  className="w-full mt-1 p-2 border border-border rounded-lg bg-background text-xs text-foreground"
                >
                  <option value="">Selecione o tema...</option>
                  {taxonomy.temas
                    .filter((t) => t.area_id === newAreaId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">4. Competência</label>
                <select
                  value={newCompId}
                  onChange={(e) => setNewCompId(e.target.value)}
                  className="w-full mt-1 p-2 border border-border rounded-lg bg-background text-xs text-foreground"
                >
                  <option value="">Selecione a competência...</option>
                  {taxonomy.competencias.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dificuldade */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Dificuldade Estimada</label>
                <select
                  value={newDifficulty}
                  onChange={(e) => setNewDifficulty(e.target.value as QuestionDifficulty)}
                  className="w-full mt-1 p-2 border border-border rounded-lg bg-background text-xs text-foreground"
                >
                  <option value="facil">Fácil</option>
                  <option value="media">Média</option>
                  <option value="dificil">Difícil</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Fonte / Referência</label>
                <input
                  type="text"
                  placeholder="Ex: Diretriz SBC 2024 / Harrison 21ª Ed."
                  value={newProvenance}
                  onChange={(e) => setNewProvenance(e.target.value)}
                  className="w-full mt-1 p-2 border border-border rounded-lg bg-background text-xs text-foreground"
                />
              </div>
            </div>

            {/* Alternativas A a E */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-foreground">
                Alternativas (Selecione a correta como Gabarito) *
              </label>
              {newAlternatives.map((alt, idx) => (
                <div key={alt.letter} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewAlternatives((prev) =>
                        prev.map((a, i) => ({ ...a, is_correct: i === idx }))
                      );
                    }}
                    className={`w-7 h-7 rounded-full text-xs font-bold border flex items-center justify-center shrink-0 transition-colors ${
                      alt.is_correct
                        ? "bg-emerald-500 text-white border-emerald-600"
                        : "bg-muted text-muted-foreground border-border hover:border-primary"
                    }`}
                  >
                    {alt.letter}
                  </button>
                  <input
                    type="text"
                    required
                    value={alt.text}
                    onChange={(e) => {
                      const text = e.target.value;
                      setNewAlternatives((prev) =>
                        prev.map((a, i) => (i === idx ? { ...a, text } : a))
                      );
                    }}
                    placeholder={`Texto da alternativa ${alt.letter}...`}
                    className="w-full p-2 border border-border rounded-lg bg-background text-xs text-foreground"
                  />
                </div>
              ))}
            </div>

            {/* Devolutiva Pedagógica (Obrigatória) */}
            <div>
              <label className="text-xs font-semibold text-foreground">
                Comentário Explicativo / Devolutiva Pedagógica (Obrigatório - QB-06) *
              </label>
              <textarea
                required
                rows={3}
                value={newExplanation}
                onChange={(e) => setNewExplanation(e.target.value)}
                placeholder="Explique detalhadamente por que o gabarito é o correto e por que cada distrator está incorreto..."
                className="w-full mt-1 p-2.5 border border-border rounded-lg bg-background text-xs text-foreground"
              />
            </div>

            {newQuestionFeedback && (
              <div
                className={`p-3 rounded-lg text-xs font-medium ${
                  newQuestionFeedback.startsWith("Erro")
                    ? "bg-rose-500/10 text-rose-600"
                    : "bg-emerald-500/10 text-emerald-600"
                }`}
              >
                {newQuestionFeedback}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-xs font-semibold shadow-xs"
              >
                {isPending ? "Processando..." : "Submeter para Revisão"}
              </button>
            </div>
            <IndicatorFootnote base="Banco privado" periodo="Tempo real" fonte="Submissão docente em public.questions" />
          </div>
        </form>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: FICHA DA QUESTÃO COMPLETA (QB-05) */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {detailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl space-y-4">
            {isLoadingDetails || !selectedQuestionDetails ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Carregando ficha técnica da questão...
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="font-semibold text-foreground text-base">Ficha Técnica da Questão</h3>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>Rótulo: <strong>{selectedQuestionDetails.origin_label}</strong></span>
                      <span>• Versão v{selectedQuestionDetails.version}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailsModalOpen(false)}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                  >
                    ✕ Fechar
                  </button>
                </div>

                {/* 4 Eixos e Tags */}
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {selectedQuestionDetails.classification?.area_name && (
                    <span
                      className="px-2 py-0.5 rounded font-bold"
                      style={{
                        backgroundColor: `${selectedQuestionDetails.classification.area_color || "#00C2A8"}20`,
                        color: selectedQuestionDetails.classification.area_color || "#00C2A8",
                      }}
                    >
                      Área: {selectedQuestionDetails.classification.area_name}
                    </span>
                  )}
                  {selectedQuestionDetails.classification?.cenario_name && (
                    <span className="px-2 py-0.5 rounded bg-muted text-foreground">
                      Cenário: {selectedQuestionDetails.classification.cenario_name}
                    </span>
                  )}
                  {selectedQuestionDetails.classification?.tema_name && (
                    <span className="px-2 py-0.5 rounded bg-muted text-foreground">
                      Tema: {selectedQuestionDetails.classification.tema_name}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded capitalize bg-muted text-foreground">
                    Dificuldade: {selectedQuestionDetails.classification?.difficulty || "Média"}
                  </span>
                </div>

                {/* Enunciado */}
                <div className="space-y-2">
                  {selectedQuestionDetails.clinical_context && (
                    <div className="p-3 rounded-lg bg-muted/40 text-xs italic text-muted-foreground border-l-2 border-primary">
                      {selectedQuestionDetails.clinical_context}
                    </div>
                  )}
                  <div className="text-xs text-foreground font-medium whitespace-pre-line leading-relaxed">
                    {selectedQuestionDetails.statement}
                  </div>
                </div>

                {/* Alternativas */}
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-semibold text-foreground">Alternativas:</div>
                  {selectedQuestionDetails.options.map((opt) => (
                    <div
                      key={opt.letter}
                      className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                        opt.is_correct
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-medium"
                          : "bg-background border-border text-foreground"
                      }`}
                    >
                      <span className="font-bold shrink-0">{opt.letter})</span>
                      <span>{opt.text}</span>
                      {opt.is_correct && <span className="ml-auto font-bold text-[10px]">GABARITO</span>}
                    </div>
                  ))}
                </div>

                {/* Comentário / Devolutiva */}
                <div className="p-3.5 rounded-lg bg-muted/50 border border-border space-y-1">
                  <div className="text-xs font-semibold text-foreground">Devolutiva Pedagógica:</div>
                  <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                    {selectedQuestionDetails.explanation}
                  </p>
                </div>

                {/* Métricas Psicométricas Históricas */}
                <div className="grid grid-cols-3 gap-3 p-3 rounded-lg border border-border text-xs text-center">
                  <div>
                    <div className="text-[10px] text-muted-foreground">Índice Facilidade (p)</div>
                    <div className="font-bold text-foreground mt-0.5">
                      {selectedQuestionDetails.historical_facility_p !== null
                        ? selectedQuestionDetails.historical_facility_p
                        : "Sem dados"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Ponto-Bisserial (r)</div>
                    <div className="font-bold text-foreground mt-0.5">
                      {selectedQuestionDetails.historical_point_biserial_r !== null
                        ? selectedQuestionDetails.historical_point_biserial_r
                        : "Sem dados"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">Uso em Provas</div>
                    <div className="font-bold text-foreground mt-0.5">
                      {selectedQuestionDetails.times_used_in_exams} vez(es)
                    </div>
                  </div>
                </div>

                {/* Histórico de Desempenho por Aplicação (PR-09 / QB-12) */}
                <div className="p-3 rounded-lg border border-border space-y-2">
                  <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Histórico de Desempenho por Aplicação</span>
                    <span className="text-[10px] font-normal text-muted-foreground">
                      {selectedQuestionDetails.application_performances?.length || 0} registro(s)
                    </span>
                  </div>

                  {selectedQuestionDetails.application_performances &&
                  selectedQuestionDetails.application_performances.length > 0 ? (
                    <div className="overflow-x-auto max-h-40 overflow-y-auto">
                      <table className="w-full text-[11px] text-left">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground font-medium">
                            <th className="pb-1">Avaliação</th>
                            <th className="pb-1 text-center">Amostra (n)</th>
                            <th className="pb-1 text-center">Facilidade (p)</th>
                            <th className="pb-1 text-center">Discriminação (D)</th>
                            <th className="pb-1 text-center">Ponto-Bisserial (r)</th>
                            <th className="pb-1 text-right">Sinais</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {selectedQuestionDetails.application_performances.map((perf) => (
                            <tr key={perf.id} className="hover:bg-muted/30">
                              <td className="py-1.5 font-medium text-foreground truncate max-w-[140px]" title={perf.exam_title}>
                                {perf.exam_title}
                              </td>
                              <td className="py-1.5 text-center text-muted-foreground">
                                {perf.sample_size}
                              </td>
                              <td className="py-1.5 text-center font-semibold text-foreground">
                                {perf.facility_p !== null ? (perf.facility_p * 100).toFixed(1) + "%" : "—"}
                              </td>
                              <td className="py-1.5 text-center text-foreground">
                                {perf.discrimination_d !== null ? perf.discrimination_d.toFixed(2) : "—"}
                              </td>
                              <td className="py-1.5 text-center text-foreground">
                                {perf.point_biserial_r !== null ? perf.point_biserial_r.toFixed(2) : "—"}
                              </td>
                              <td className="py-1.5 text-right">
                                {perf.flags && perf.flags.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 justify-end">
                                    {perf.flags.map((flag) => (
                                      <span
                                        key={flag}
                                        className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                      >
                                        {flag.replace(/_/g, " ")}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Normal</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">
                      Esta questão ainda não possui dados históricos de aplicação consolidada.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <button
                    onClick={() => {
                      setDisputeReason("");
                      setDisputeFeedback(null);
                      setDisputeModalOpen(true);
                    }}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Contestar / Apontar Inconsistência (QB-15)
                  </button>

                  <button
                    onClick={() => setDetailsModalOpen(false)}
                    className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90"
                  >
                    Fechar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: PARECER DE REVISÃO EM 1 ETAPA (QB-07) */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {reviewModalOpen && selectedQuestionForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleExecuteReview}
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-lg space-y-4"
          >
            <h3 className="font-semibold text-foreground text-base">Parecer de Revisão Pedagógica</h3>
            <div>
              <label className="text-xs font-medium text-foreground">Decisão do Revisor</label>
              <select
                value={reviewDecision}
                onChange={(e) => setReviewDecision(e.target.value as "approved" | "returned_with_comments")}
                className="w-full mt-1 p-2 border border-border rounded-lg bg-background text-xs text-foreground"
              >
                <option value="approved">Aprovar e Publicar no Acervo</option>
                <option value="returned_with_comments">Devolver ao Docente com Apontamentos</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Comentário / Parecer *</label>
              <textarea
                required
                rows={3}
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder="Insira os apontamentos pedagógicos ou motivos da aprovação/devolução..."
                className="w-full mt-1 p-2.5 border border-border rounded-lg bg-background text-xs text-foreground"
              />
            </div>

            {reviewStatusMsg && (
              <div
                className={`p-2.5 rounded-lg text-xs font-medium ${
                  reviewStatusMsg.startsWith("Erro")
                    ? "bg-rose-500/10 text-rose-600"
                    : "bg-emerald-500/10 text-emerald-600"
                }`}
              >
                {reviewStatusMsg}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90"
              >
                {isPending ? "Gravando..." : "Confirmar Parecer"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: CONTESTAÇÃO DE QUESTÃO (QB-15) */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {disputeModalOpen && selectedQuestionDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSendDispute}
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-lg space-y-4"
          >
            <h3 className="font-semibold text-foreground text-base">Contestar Questão</h3>
            <p className="text-xs text-muted-foreground">
              Aponte inconsistência bibliográfica, ambiguidade no enunciado ou erro no gabarito oficial.
            </p>

            <div>
              <label className="text-xs font-medium text-foreground">Justificativa da Contestação *</label>
              <textarea
                required
                rows={4}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Ex: Conforme a nova diretriz de 2024, a conduta recomendada passou a ser..."
                className="w-full mt-1 p-2.5 border border-border rounded-lg bg-background text-xs text-foreground"
              />
            </div>

            {disputeFeedback && (
              <div
                className={`p-2.5 rounded-lg text-xs font-medium ${
                  disputeFeedback.startsWith("Erro")
                    ? "bg-rose-500/10 text-rose-600"
                    : "bg-emerald-500/10 text-emerald-600"
                }`}
              >
                {disputeFeedback}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDisputeModalOpen(false)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
              >
                {isPending ? "Enviando..." : "Enviar Contestação"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
