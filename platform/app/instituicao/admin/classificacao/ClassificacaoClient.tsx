"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DataTable, EmptyState, IndicatorFootnote } from "@/components/b2b";
import type {
  TaxArea,
  TaxCenario,
  TaxTema,
  TaxCompetencia,
  TaxonomyMigrationReport,
} from "@/lib/b2b/taxonomy-types";
import { exportTaxonomyToCSV } from "@/lib/b2b/taxonomy-csv";
import {
  saveTaxArea,
  toggleTaxAreaActive,
  saveTaxCenario,
  toggleTaxCenarioActive,
  saveTaxTema,
  toggleTaxTemaActive,
  saveTaxCompetencia,
  toggleTaxCompetenciaActive,
  importTaxonomyCSVAction,
  mapLegacyAreaAction,
} from "@/lib/b2b/taxonomy-actions";

interface Props {
  areas: TaxArea[];
  cenarios: TaxCenario[];
  temas: TaxTema[];
  competencias: TaxCompetencia[];
  report: TaxonomyMigrationReport;
}

type TabKey = "areas" | "cenarios" | "temas" | "competencias" | "relatorio";

export default function ClassificacaoClient({
  areas: initialAreas,
  cenarios: initialCenarios,
  temas: initialTemas,
  competencias: initialCompetencias,
  report: initialReport,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("areas");
  const [isPending, startTransition] = useTransition();

  // Estados de Áreas
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<TaxArea | null>(null);
  const [areaCode, setAreaCode] = useState("");
  const [areaName, setAreaName] = useState("");
  const [areaColor, setAreaColor] = useState("#00C2A8");
  const [areaOrder, setAreaOrder] = useState(1);
  const [areaStage, setAreaStage] = useState<"etapa_2_3" | "etapa_1_ciclo_basico">("etapa_2_3");

  // Estados de Cenários
  const [cenarioModalOpen, setCenarioModalOpen] = useState(false);
  const [editingCenario, setEditingCenario] = useState<TaxCenario | null>(null);
  const [cenarioCode, setCenarioCode] = useState("");
  const [cenarioName, setCenarioName] = useState("");
  const [cenarioDesc, setCenarioDesc] = useState("");

  // Estados de Temas
  const [temaModalOpen, setTemaModalOpen] = useState(false);
  const [editingTema, setEditingTema] = useState<TaxTema | null>(null);
  const [temaAreaId, setTemaAreaId] = useState(initialAreas[0]?.id || "");
  const [temaParentId, setTemaParentId] = useState("");
  const [temaCode, setTemaCode] = useState("");
  const [temaName, setTemaName] = useState("");
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>("todas");

  // Estados de Competências
  const [compModalOpen, setCompModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<TaxCompetencia | null>(null);
  const [compCode, setCompCode] = useState("");
  const [compName, setCompName] = useState("");
  const [compDesc, setCompDesc] = useState("");

  // Estados de Importação CSV
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<"areas" | "cenarios" | "temas" | "competencias">("areas");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Estados de Mapeamento De-Para
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [mappingLegacyText, setMappingLegacyText] = useState("");
  const [mappingTargetAreaId, setMappingTargetAreaId] = useState(initialAreas[0]?.id || "");
  const [mappingFeedback, setMappingFeedback] = useState<string | null>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // AÇÕES DE EXPORTAÇÃO CSV
  // ───────────────────────────────────────────────────────────────────────────
  const handleExportCSV = (type: "areas" | "cenarios" | "temas" | "competencias") => {
    let items: any[] = [];
    if (type === "areas") items = initialAreas;
    else if (type === "cenarios") items = initialCenarios;
    else if (type === "temas") items = initialTemas;
    else if (type === "competencias") items = initialCompetencias;

    const csvContent = exportTaxonomyToCSV(type, items);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `taxonomia-${type}-medpleni.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // AÇÕES DE IMPORTAÇÃO CSV
  // ───────────────────────────────────────────────────────────────────────────
  const handleImportCSVSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setImportStatus("Importando dados...");
    const content = await importFile.text();

    startTransition(async () => {
      try {
        const res = await importTaxonomyCSVAction(importType, content);
        setImportStatus(`Sucesso: ${res.count} itens importados ou atualizados com idempotência.`);
        setTimeout(() => {
          setImportModalOpen(false);
          setImportStatus(null);
          setImportFile(null);
          router.refresh();
        }, 1500);
      } catch (err: any) {
        setImportStatus(`Erro: ${err.message}`);
      }
    });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // MAPEAMENTO RÁPIDO DE ÁREAS ÓRFÃS
  // ───────────────────────────────────────────────────────────────────────────
  const handleQuickMapLegacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setMappingFeedback("Mapeando questões legadas...");

    startTransition(async () => {
      try {
        const res = await mapLegacyAreaAction(mappingLegacyText, mappingTargetAreaId);
        setMappingFeedback(`Sucesso: ${res.updatedCount} questões migradas para a nova área.`);
        setTimeout(() => {
          setMappingModalOpen(false);
          setMappingFeedback(null);
          router.refresh();
        }, 1500);
      } catch (err: any) {
        setMappingFeedback(`Erro: ${err.message}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Bloco 1: Cabeçalho com Ações Globais */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title="Taxonomia Médica Unificada"
          subtitle="ÁREA · CENÁRIO · TEMA · COMPETÊNCIA — Fonte única de verdade sem listas hardcoded"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setImportType(activeTab === "relatorio" ? "areas" : (activeTab as any));
              setImportFile(null);
              setImportStatus(null);
              setImportModalOpen(true);
            }}
            className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-muted font-medium text-foreground shadow-xs"
          >
            Importar CSV
          </button>
          {activeTab !== "relatorio" && (
            <button
              onClick={() => handleExportCSV(activeTab as any)}
              className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-muted font-medium text-foreground shadow-xs"
            >
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {/* Bloco 2: Navegação por Abas (Máximo 5 blocos) */}
      <div className="border-b border-border flex items-center gap-2 overflow-x-auto pb-1 text-sm font-medium">
        {[
          { key: "areas", label: `1. Áreas (${initialAreas.length})` },
          { key: "cenarios", label: `2. Cenários (${initialCenarios.length})` },
          { key: "temas", label: `3. Temas (${initialTemas.length})` },
          { key: "competencias", label: `4. Competências (${initialCompetencias.length})` },
          {
            key: "relatorio",
            label: `Relatório de Questões (${initialReport.coveragePercent}% Mapeadas)`,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabKey)}
            className={`px-4 py-2 rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-card border-t border-x border-border text-primary font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ABA 1: ÁREAS */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "areas" && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground text-base">Grandes Áreas do INEP</h3>
              <p className="text-xs text-muted-foreground">
                7 áreas canônicas para o ENAMED (2ª e 3ª etapa) com suporte a conjunto da 1ª etapa (Ciclo Básico)
              </p>
            </div>
            <button
              onClick={() => {
                setEditingArea(null);
                setAreaCode("");
                setAreaName("");
                setAreaColor("#00C2A8");
                setAreaOrder(initialAreas.length + 1);
                setAreaStage("etapa_2_3");
                setAreaModalOpen(true);
              }}
              className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
            >
              + Nova Área
            </button>
          </div>

          <DataTable
            data={initialAreas}
            keyExtractor={(a) => a.id}
            columns={[
              {
                key: "order",
                header: "Ordem",
                render: (a) => <span className="font-mono text-xs text-muted-foreground">{a.order_index}</span>,
              },
              {
                key: "code",
                header: "Sigla",
                render: (a) => (
                  <span
                    className="font-mono text-xs px-2 py-0.5 rounded font-bold"
                    style={{
                      backgroundColor: `${a.color_hex || "#00C2A8"}20`,
                      color: a.color_hex || "#00C2A8",
                    }}
                  >
                    {a.code}
                  </span>
                ),
              },
              {
                key: "name",
                header: "Nome da Área",
                render: (a) => <span className="font-semibold text-foreground text-sm">{a.name}</span>,
              },
              {
                key: "stage",
                header: "Etapa ENAMED",
                render: (a) => (
                  <span className="text-xs text-muted-foreground">
                    {a.enamed_stage === "etapa_1_ciclo_basico" ? "1ª Etapa (Ciclo Básico)" : "2ª e 3ª Etapa (Clínico/Internato)"}
                  </span>
                ),
              },
              {
                key: "version",
                header: "Versão",
                render: (a) => <span className="text-xs font-mono text-muted-foreground">v{a.version}</span>,
              },
              {
                key: "actions",
                header: "Ações",
                render: (a) => (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setEditingArea(a);
                        setAreaCode(a.code);
                        setAreaName(a.name);
                        setAreaColor(a.color_hex || "#00C2A8");
                        setAreaOrder(a.order_index);
                        setAreaStage(a.enamed_stage as any);
                        setAreaModalOpen(true);
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => toggleTaxAreaActive(a.id, !a.is_active)}
                      className={`text-xs hover:underline ${a.is_active ? "text-rose-600" : "text-emerald-600"}`}
                    >
                      {a.is_active ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                ),
              },
            ]}
          />
          <IndicatorFootnote base="Classificação canônica" periodo="Vigência ENAMED" fonte="Tabela public.tax_areas" />
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ABA 2: CENÁRIOS */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "cenarios" && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground text-base">Cenários de Atuação Profissional</h3>
              <p className="text-xs text-muted-foreground">
                Ambientes clínicos (ex: Atenção Básica, Urgência/Emergência, Enfermaria, Ambulatório de Especialidades)
              </p>
            </div>
            <button
              onClick={() => {
                setEditingCenario(null);
                setCenarioCode("");
                setCenarioName("");
                setCenarioDesc("");
                setCenarioModalOpen(true);
              }}
              className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
            >
              + Novo Cenário
            </button>
          </div>

          {initialCenarios.length === 0 ? (
            <EmptyState
              title="Nenhum cenário cadastrado"
              description="Aguardando a lista oficial do INEP enviada pelo Dr. Filipe. Você pode cadastrar manualmente ou importar via CSV."
            />
          ) : (
            <DataTable
              data={initialCenarios}
              keyExtractor={(c) => c.id}
              columns={[
                {
                  key: "code",
                  header: "Código",
                  render: (c) => <span className="font-mono text-xs font-bold text-primary">{c.code}</span>,
                },
                {
                  key: "name",
                  header: "Nome do Cenário",
                  render: (c) => <span className="font-medium text-foreground">{c.name}</span>,
                },
                {
                  key: "desc",
                  header: "Descrição",
                  render: (c) => <span className="text-xs text-muted-foreground">{c.description || "-"}</span>,
                },
                {
                  key: "version",
                  header: "Versão",
                  render: (c) => <span className="text-xs font-mono text-muted-foreground">v{c.version}</span>,
                },
                {
                  key: "actions",
                  header: "Ações",
                  render: (c) => (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setEditingCenario(c);
                          setCenarioCode(c.code);
                          setCenarioName(c.name);
                          setCenarioDesc(c.description || "");
                          setCenarioModalOpen(true);
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleTaxCenarioActive(c.id, !c.is_active)}
                        className={`text-xs hover:underline ${c.is_active ? "text-rose-600" : "text-emerald-600"}`}
                      >
                        {c.is_active ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          )}
          <IndicatorFootnote base="Cenários cadastrados" periodo="Tempo real" fonte="Tabela public.tax_cenarios" />
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ABA 3: TEMAS E SUBTEMAS */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "temas" && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-foreground text-base">Temas e Subtemas</h3>
              <p className="text-xs text-muted-foreground">
                Estrutura hierárquica de 2 níveis ligada a uma das 7 áreas do INEP
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedAreaFilter}
                onChange={(e) => setSelectedAreaFilter(e.target.value)}
                className="text-xs px-3 py-1.5 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="todas">Todas as Áreas</option>
                {initialAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setEditingTema(null);
                  setTemaAreaId(initialAreas[0]?.id || "");
                  setTemaParentId("");
                  setTemaCode("");
                  setTemaName("");
                  setTemaModalOpen(true);
                }}
                className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
              >
                + Novo Tema
              </button>
            </div>
          </div>

          {initialTemas.length === 0 ? (
            <EmptyState
              title="Nenhum tema cadastrado"
              description="A taxonomia de temas está em construção pelos médicos. Você pode cadastrar temas ou importar o CSV quando pronto."
            />
          ) : (
            <DataTable
              data={
                selectedAreaFilter === "todas"
                  ? initialTemas
                  : initialTemas.filter((t) => t.area_id === selectedAreaFilter)
              }
              keyExtractor={(t) => t.id}
              columns={[
                {
                  key: "code",
                  header: "Código",
                  render: (t) => <span className="font-mono text-xs font-bold text-primary">{t.code}</span>,
                },
                {
                  key: "name",
                  header: "Tema",
                  render: (t) => (
                    <div>
                      <div className="font-medium text-foreground">{t.name}</div>
                      {t.parentName && (
                        <div className="text-[10px] text-muted-foreground">Subtema de: {t.parentName}</div>
                      )}
                    </div>
                  ),
                },
                {
                  key: "area",
                  header: "Área Vinculada",
                  render: (t) => <span className="text-xs text-muted-foreground">{t.areaName || "-"}</span>,
                },
                {
                  key: "version",
                  header: "Versão",
                  render: (t) => <span className="text-xs font-mono text-muted-foreground">v{t.version}</span>,
                },
                {
                  key: "actions",
                  header: "Ações",
                  render: (t) => (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setEditingTema(t);
                          setTemaAreaId(t.area_id);
                          setTemaParentId(t.parent_id || "");
                          setTemaCode(t.code);
                          setTemaName(t.name);
                          setTemaModalOpen(true);
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleTaxTemaActive(t.id, !t.is_active)}
                        className={`text-xs hover:underline ${t.is_active ? "text-rose-600" : "text-emerald-600"}`}
                      >
                        {t.is_active ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          )}
          <IndicatorFootnote base="Temas cadastrados" periodo="Tempo real" fonte="Tabela public.tax_temas" />
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ABA 4: COMPETÊNCIAS */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "competencias" && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground text-base">Competências e Habilidades</h3>
              <p className="text-xs text-muted-foreground">
                Matriz de competências médicas conforme diretrizes curriculares do INEP
              </p>
            </div>
            <button
              onClick={() => {
                setEditingComp(null);
                setCompCode("");
                setCompName("");
                setCompDesc("");
                setCompModalOpen(true);
              }}
              className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
            >
              + Nova Competência
            </button>
          </div>

          {initialCompetencias.length === 0 ? (
            <EmptyState
              title="Nenhuma competência cadastrada"
              description="A lista de competências está em elaboração pela comissão médica. Pode ser importada por CSV a qualquer momento."
            />
          ) : (
            <DataTable
              data={initialCompetencias}
              keyExtractor={(c) => c.id}
              columns={[
                {
                  key: "code",
                  header: "Código",
                  render: (c) => <span className="font-mono text-xs font-bold text-primary">{c.code}</span>,
                },
                {
                  key: "name",
                  header: "Competência",
                  render: (c) => <span className="font-medium text-foreground">{c.name}</span>,
                },
                {
                  key: "desc",
                  header: "Descrição / Habilidade",
                  render: (c) => <span className="text-xs text-muted-foreground">{c.description || "-"}</span>,
                },
                {
                  key: "version",
                  header: "Versão",
                  render: (c) => <span className="text-xs font-mono text-muted-foreground">v{c.version}</span>,
                },
                {
                  key: "actions",
                  header: "Ações",
                  render: (c) => (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setEditingComp(c);
                          setCompCode(c.code);
                          setCompName(c.name);
                          setCompDesc(c.description || "");
                          setCompModalOpen(true);
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleTaxCompetenciaActive(c.id, !c.is_active)}
                        className={`text-xs hover:underline ${c.is_active ? "text-rose-600" : "text-emerald-600"}`}
                      >
                        {c.is_active ? "Desativar" : "Ativar"}
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          )}
          <IndicatorFootnote base="Competências ativas" periodo="Tempo real" fonte="Tabela public.tax_competencias" />
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* ABA 5: RELATÓRIO DE MIGRAÇÃO DE QUESTÕES */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === "relatorio" && (
        <div className="space-y-6">
          {/* Indicadores de Cobertura */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
              <div className="text-xs text-muted-foreground font-medium">Total de Questões</div>
              <div className="text-2xl font-bold text-foreground mt-1">{initialReport.totalQuestions}</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
              <div className="text-xs text-muted-foreground font-medium">Classificadas nas 7 Áreas</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {initialReport.classifiedQuestions}
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
              <div className="text-xs text-muted-foreground font-medium">Sem Área Mapeada</div>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {initialReport.unmappedQuestions}
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
              <div className="text-xs text-muted-foreground font-medium">Taxa de Cobertura</div>
              <div className="text-2xl font-bold text-primary mt-1">{initialReport.coveragePercent}%</div>
            </div>
          </div>

          {/* Lista de Textos Órfãos / Mapeamento Rápido */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-semibold text-foreground text-base">Mapeamento De-Para de Textos Antigos</h3>
              <p className="text-xs text-muted-foreground">
                Textos livres legados em questions.area que ainda necessitam de correspondência para as 7 áreas oficiais
              </p>
            </div>

            {initialReport.orphanAreas.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ 100% das questões existentes no banco estão mapeadas e classificadas com sucesso nas 7 áreas canônicas!
              </div>
            ) : (
              <div className="divide-y divide-border">
                {initialReport.orphanAreas.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-foreground">"{item.legacy_area}"</span>
                      <span className="text-muted-foreground ml-2">({item.count} questões)</span>
                    </div>
                    <button
                      onClick={() => {
                        setMappingLegacyText(item.legacy_area);
                        setMappingTargetAreaId(initialAreas[0]?.id || "");
                        setMappingFeedback(null);
                        setMappingModalOpen(true);
                      }}
                      className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
                    >
                      Mapear para Área →
                    </button>
                  </div>
                ))}
              </div>
            )}
            <IndicatorFootnote base="Questões no acervo" periodo="Histórico integral" fonte="Tabelas public.questions e question_classification" />
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: NOVA / EDITAR ÁREA */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {areaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await saveTaxArea({
                id: editingArea?.id,
                code: areaCode,
                name: areaName,
                color_hex: areaColor,
                order_index: areaOrder,
                enamed_stage: areaStage,
              });
              setAreaModalOpen(false);
              router.refresh();
            }}
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-lg space-y-4"
          >
            <h3 className="font-semibold text-foreground text-base">
              {editingArea ? "Editar Área" : "Nova Grande Área"}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Sigla</label>
                <input
                  type="text"
                  required
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value.toUpperCase())}
                  placeholder="CM"
                  className="w-full mt-1 px-3 py-1.5 border border-border rounded-lg bg-background text-xs uppercase font-mono text-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Ordem</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={areaOrder}
                  onChange={(e) => setAreaOrder(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-1.5 border border-border rounded-lg bg-background text-xs text-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Cor (Hex)</label>
                <input
                  type="color"
                  value={areaColor}
                  onChange={(e) => setAreaColor(e.target.value)}
                  className="w-full mt-1 h-8 p-1 border border-border rounded-lg bg-background cursor-pointer"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Nome da Área</label>
              <input
                type="text"
                required
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                placeholder="Ex: Clínica Médica"
                className="w-full mt-1 px-3 py-1.5 border border-border rounded-lg bg-background text-xs text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Etapa do ENAMED</label>
              <select
                value={areaStage}
                onChange={(e) => setAreaStage(e.target.value as any)}
                className="w-full mt-1 px-3 py-1.5 border border-border rounded-lg bg-background text-xs text-foreground"
              >
                <option value="etapa_2_3">2ª e 3ª Etapa (Clínico e Internato)</option>
                <option value="etapa_1_ciclo_basico">1ª Etapa (Ciclo Básico / 4º Período)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAreaModalOpen(false)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: NOVO / EDITAR CENÁRIO */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {cenarioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await saveTaxCenario({
                id: editingCenario?.id,
                code: cenarioCode,
                name: cenarioName,
                description: cenarioDesc,
              });
              setCenarioModalOpen(false);
              router.refresh();
            }}
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-lg space-y-4"
          >
            <h3 className="font-semibold text-foreground text-base">
              {editingCenario ? "Editar Cenário" : "Novo Cenário"}
            </h3>
            <div>
              <label className="text-xs font-medium text-foreground">Código</label>
              <input
                type="text"
                required
                value={cenarioCode}
                onChange={(e) => setCenarioCode(e.target.value.toUpperCase())}
                placeholder="Ex: APS"
                className="w-full mt-1 px-3 py-1.5 border border-border rounded-lg bg-background text-xs uppercase font-mono text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Nome do Cenário</label>
              <input
                type="text"
                required
                value={cenarioName}
                onChange={(e) => setCenarioName(e.target.value)}
                placeholder="Ex: Atenção Primária à Saúde"
                className="w-full mt-1 px-3 py-1.5 border border-border rounded-lg bg-background text-xs text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Descrição</label>
              <textarea
                rows={2}
                value={cenarioDesc}
                onChange={(e) => setCenarioDesc(e.target.value)}
                placeholder="Ex: Unidades Básicas de Saúde, Estratégia de Saúde da Família e Domicílio."
                className="w-full mt-1 p-2 border border-border rounded-lg bg-background text-xs text-foreground resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCenarioModalOpen(false)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: NOVO / EDITAR TEMA */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {temaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await saveTaxTema({
                id: editingTema?.id,
                area_id: temaAreaId,
                parent_id: temaParentId || null,
                code: temaCode,
                name: temaName,
              });
              setTemaModalOpen(false);
              router.refresh();
            }}
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-lg space-y-4"
          >
            <h3 className="font-semibold text-foreground text-base">
              {editingTema ? "Editar Tema" : "Novo Tema"}
            </h3>
            <div>
              <label className="text-xs font-medium text-foreground">Área Vinculada</label>
              <select
                value={temaAreaId}
                onChange={(e) => setTemaAreaId(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 border border-border rounded-lg bg-background text-xs text-foreground"
              >
                {initialAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Tema Pai (opcional, para subtema)</label>
              <select
                value={temaParentId}
                onChange={(e) => setTemaParentId(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 border border-border rounded-lg bg-background text-xs text-foreground"
              >
                <option value="">Nenhum (Tema Principal de 1º Nível)</option>
                {initialTemas
                  .filter((t) => t.area_id === temaAreaId && t.id !== editingTema?.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Código</label>
                <input
                  type="text"
                  required
                  value={temaCode}
                  onChange={(e) => setTemaCode(e.target.value.toUpperCase())}
                  placeholder="Ex: CAR-01"
                  className="w-full mt-1 px-3 py-1.5 border border-border rounded-lg bg-background text-xs uppercase font-mono text-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Nome do Tema</label>
                <input
                  type="text"
                  required
                  value={temaName}
                  onChange={(e) => setTemaName(e.target.value)}
                  placeholder="Ex: Insuficiência Cardíaca"
                  className="w-full mt-1 px-3 py-1.5 border border-border rounded-lg bg-background text-xs text-foreground"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTemaModalOpen(false)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: NOVA / EDITAR COMPETÊNCIA */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {compModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await saveTaxCompetencia({
                id: editingComp?.id,
                code: compCode,
                name: compName,
                description: compDesc,
              });
              setCompModalOpen(false);
              router.refresh();
            }}
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-lg space-y-4"
          >
            <h3 className="font-semibold text-foreground text-base">
              {editingComp ? "Editar Competência" : "Nova Competência"}
            </h3>
            <div>
              <label className="text-xs font-medium text-foreground">Código</label>
              <input
                type="text"
                required
                value={compCode}
                onChange={(e) => setCompCode(e.target.value.toUpperCase())}
                placeholder="Ex: COMP-DIAG-01"
                className="w-full mt-1 px-3 py-1.5 border border-border rounded-lg bg-background text-xs uppercase font-mono text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Nome da Competência</label>
              <input
                type="text"
                required
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
                placeholder="Ex: Raciocínio Diagnóstico e Hipóteses Clínicas"
                className="w-full mt-1 px-3 py-1.5 border border-border rounded-lg bg-background text-xs text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Descrição</label>
              <textarea
                rows={2}
                value={compDesc}
                onChange={(e) => setCompDesc(e.target.value)}
                placeholder="Ex: Capacidade de correlacionar achados anamnésticos e propedêuticos."
                className="w-full mt-1 p-2 border border-border rounded-lg bg-background text-xs text-foreground resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCompModalOpen(false)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: IMPORTAR CSV DE TAXONOMIA */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleImportCSVSubmit}
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-lg space-y-4"
          >
            <h3 className="font-semibold text-foreground text-base">Importação em Lote via CSV</h3>
            <div>
              <label className="text-xs font-medium text-foreground">Lista de Destino</label>
              <select
                value={importType}
                onChange={(e) => setImportType(e.target.value as any)}
                className="w-full mt-1 px-3 py-1.5 border border-border rounded-lg bg-background text-xs text-foreground capitalize"
              >
                <option value="areas">1. Áreas</option>
                <option value="cenarios">2. Cenários</option>
                <option value="temas">3. Temas</option>
                <option value="competencias">4. Competências</option>
              </select>
            </div>

            <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
              <input
                type="file"
                accept=".csv,text/csv"
                required
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                id="tax-csv-input"
                className="hidden"
              />
              <label htmlFor="tax-csv-input" className="cursor-pointer block space-y-1">
                <div className="text-xs font-medium text-foreground">
                  {importFile ? importFile.name : "Clique para selecionar o arquivo CSV"}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Cabeçalhos aceitos: Codigo, Nome, Descricao ou Area_Codigo.
                </p>
              </label>
            </div>

            {importStatus && (
              <div
                className={`p-2.5 rounded-lg text-xs font-medium ${
                  importStatus.startsWith("Sucesso")
                    ? "bg-emerald-500/10 text-emerald-600"
                    : importStatus.startsWith("Erro")
                    ? "bg-rose-500/10 text-rose-600"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {importStatus}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending || !importFile}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? "Processando..." : "Importar Dados"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: MAPEAMENTO RÁPIDO DE TEXTO ÓRFÃO */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {mappingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleQuickMapLegacy}
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-lg space-y-4"
          >
            <h3 className="font-semibold text-foreground text-base">Mapear Texto Legado</h3>
            <div>
              <label className="text-xs font-medium text-foreground">Texto Antigo Encontrado</label>
              <input
                type="text"
                disabled
                value={mappingLegacyText}
                className="w-full mt-1 px-3 py-1.5 border border-border rounded-lg bg-muted text-xs font-bold text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Área Canônica de Destino</label>
              <select
                value={mappingTargetAreaId}
                onChange={(e) => setMappingTargetAreaId(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 border border-border rounded-lg bg-background text-xs text-foreground"
              >
                {initialAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code})
                  </option>
                ))}
              </select>
            </div>

            {mappingFeedback && (
              <div
                className={`p-2.5 rounded-lg text-xs font-medium ${
                  mappingFeedback.startsWith("Sucesso")
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {mappingFeedback}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMappingModalOpen(false)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90"
              >
                {isPending ? "Gravando..." : "Confirmar Mapeamento"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
