import React from "react";
import { getB2BUserContext } from "@/lib/b2b/auth";
import {
  PageHeader,
  FiltersBar,
  IndicatorFootnote,
  EmptyState,
  ScoreBand,
  ScoreBandLegend,
  DataTable,
  type Column,
} from "@/components/b2b";

interface TurmaDemoRow {
  id: string;
  periodo: number;
  rotulo: string;
  alunosAtivos: number;
  mediaGeral: number;
  provasAplicadas: number;
}

export default async function InstituicaoHomePage() {
  const context = await getB2BUserContext();
  const cutScore = context?.institution.cut_score || 60;
  const role = context?.role || "dirigente";

  // Amostra inicial de turmas cadastradas para exibição no DataTable
  const sampleClassGroups: TurmaDemoRow[] = [
    {
      id: "cg-1",
      periodo: 4,
      rotulo: "MED-2027-04P (Ciclo Básico)",
      alunosAtivos: 20,
      mediaGeral: 64.5,
      provasAplicadas: 3,
    },
    {
      id: "cg-2",
      periodo: 8,
      rotulo: "MED-2027-08P (Ciclo Clínico · ENAMED)",
      alunosAtivos: 20,
      mediaGeral: 58.2, // Zona de Decisão (51–60)
      provasAplicadas: 4,
    },
    {
      id: "cg-3",
      periodo: 12,
      rotulo: "MED-2027-12P (Internato · ENAMED)",
      alunosAtivos: 20,
      mediaGeral: 72.8, // Excelente
      provasAplicadas: 5,
    },
  ];

  const columns: Column<TurmaDemoRow>[] = [
    {
      key: "periodo",
      header: "Etapa",
      width: "90px",
      render: (r) => (
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "11px",
            fontWeight: 600,
            padding: "2px 6px",
            borderRadius: "4px",
            background: "var(--input-bg)",
            border: "1px solid var(--sinal)",
          }}
        >
          {r.periodo}º Per.
        </span>
      ),
    },
    {
      key: "rotulo",
      header: "Turma / Grupo Acadêmico",
      render: (r) => <strong>{r.rotulo}</strong>,
    },
    {
      key: "alunosAtivos",
      header: "Estudantes",
      align: "center",
      render: (r) => `${r.alunosAtivos} ativos`,
    },
    {
      key: "provasAplicadas",
      header: "Avaliações",
      align: "center",
    },
    {
      key: "mediaGeral",
      header: "Média Atual",
      align: "right",
      render: (r) => <ScoreBand score={r.mediaGeral} cutScore={cutScore} showRange />,
    },
  ];

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* ── BLOCO 1 DE 5: CABEÇALHO DA PÁGINA ── */}
      <section style={{ marginBottom: "16px" }}>
        <PageHeader
          title={
            role === "aluno"
              ? "Espaço do Estudante"
              : role === "docente"
              ? "Portal do Docente"
              : "Visão Geral Institucional"
          }
          subtitle={`Acompanhamento acadêmico e desempenho preparatório para o ENAMED · ${context?.institution.name}`}
          badge={`Régua ${cutScore}%`}
        />
      </section>

      {/* ── BLOCO 2 DE 5: BARRA DE FILTROS INSTITUCIONAIS PERSISTIDOS NA URL ── */}
      <section style={{ marginBottom: "20px" }}>
        <FiltersBar
          classGroups={[
            { label: "MED-2027-04P (4º Período)", value: "4p" },
            { label: "MED-2027-08P (8º Período)", value: "8p" },
            { label: "MED-2027-12P (12º Período)", value: "12p" },
          ]}
        />
      </section>

      {/* ── BLOCO 3 DE 5: INDICADORES EXECUTIVOS (KPIS COM BASE, PERÍODO E FONTE) ── */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: "var(--r-xl, 12px)",
            padding: "16px",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--chumbo)", textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace" }}>
            Média Geral da Instituição
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", margin: "8px 0 4px" }}>
            <span style={{ fontSize: "28px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--heading-color)" }}>
              65.1%
            </span>
            <ScoreBand score={65.1} cutScore={cutScore} size="sm" />
          </div>
          <IndicatorFootnote
            base="240 estudantes matriculados"
            periodo="2027.1"
            fonte="Simulados Institucionais e Provas Regulares"
          />
        </div>

        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: "var(--r-xl, 12px)",
            padding: "16px",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--chumbo)", textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace" }}>
            Estudantes em Zona de Decisão
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", margin: "8px 0 4px" }}>
            <span style={{ fontSize: "28px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--warn, #D97706)" }}>
              28
            </span>
            <span style={{ fontSize: "12px", color: "var(--chumbo)" }}>alunos entre 51% e {cutScore}%</span>
          </div>
          <IndicatorFootnote
            base="População da 2ª etapa ENAMED (8º Período)"
            periodo="2027.1"
            fonte="Última Avaliação Somativa"
          />
        </div>

        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: "var(--r-xl, 12px)",
            padding: "16px",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--chumbo)", textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace" }}>
            Índice de Confiabilidade (KR-20)
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", margin: "8px 0 4px" }}>
            <span style={{ fontSize: "28px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--pulso)" }}>
              0.84
            </span>
            <span style={{ fontSize: "11px", color: "var(--success, #16A34A)", fontWeight: 600 }}>Alta consistência</span>
          </div>
          <IndicatorFootnote
            base="k = 90 questões válidas · n = 184 finalizadas"
            periodo="Simulado 2027.1"
            fonte="Fórmula KR-20 (Seção 6 da ESPEC)"
          />
        </div>

        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: "var(--r-xl, 12px)",
            padding: "16px",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--chumbo)", textTransform: "uppercase", fontFamily: "'IBM Plex Mono', monospace" }}>
            Adesão Docente & Turmas
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", margin: "8px 0 4px" }}>
            <span style={{ fontSize: "28px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--heading-color)" }}>
              100%
            </span>
            <span style={{ fontSize: "12px", color: "var(--chumbo)" }}>12 turmas acompanhadas</span>
          </div>
          <IndicatorFootnote
            base="8 docentes ativos com escopo definido"
            periodo="Semestre Vigente"
            fonte="Controle de Escopos Acadêmicos"
          />
        </div>
      </section>

      {/* ── BLOCO 4 DE 5: SINALIZAÇÃO DAS 4 FAIXAS E RÉGUA 60 ── */}
      <section
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: "var(--r-xl, 12px)",
          padding: "14px 18px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: "12px", color: "var(--neblina)" }}>
          <strong>Parâmetro de Corte Institucional:</strong> Os alertas pedagógicos e planos de intervenção são disparados para rendimentos inferiores a{" "}
          <strong style={{ color: "var(--pulso)" }}>{cutScore}%</strong>.
        </div>
        <ScoreBandLegend cutScore={cutScore} />
      </section>

      {/* ── BLOCO 5 DE 5: TABELA DE TURMAS E GRUPOS ACADÊMICOS ── */}
      <section>
        <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "17px",
              fontWeight: 700,
              color: "var(--heading-color)",
              margin: 0,
            }}
          >
            Turmas em Acompanhamento Ativo
          </h2>
          <span style={{ fontSize: "12px", color: "var(--chumbo)", fontFamily: "'IBM Plex Mono', monospace" }}>
            Total: {sampleClassGroups.length} turmas
          </span>
        </div>

        <DataTable
          columns={columns}
          data={sampleClassGroups}
          keyExtractor={(r) => r.id}
          searchPlaceholder="Buscar por turma ou período..."
          exportFileName={`fadep-turmas-${context?.institution.slug || "demo"}`}
        />
      </section>
    </div>
  );
}
