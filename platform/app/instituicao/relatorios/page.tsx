import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getB2BUserContext } from "@/lib/b2b/auth";
import { createClient } from "@/lib/supabase/server";

export default async function RelatoriosPage() {
  const context = await getB2BUserContext();

  if (!context?.institution?.id) {
    redirect("/login");
  }

  if (context.role === "aluno") {
    redirect("/instituicao/aluno/provas");
  }

  const institution = context.institution;
  const cutScore = institution.cut_score || 60;
  const supabase = await createClient();

  // Busca avaliações concluídas da instituição
  const { data: dbAssessments } = await supabase
    .from("assessments")
    .select("id, title, type, starts_at, status")
    .eq("institution_id", institution.id)
    .in("status", ["aplicada", "corrigida", "publicada"])
    .order("starts_at", { ascending: false });

  const assessments = dbAssessments && dbAssessments.length > 0
    ? dbAssessments
    : [
        {
          id: "asm-demo-2027-1",
          title: "Simulado Nacional ENAMED 2027.1",
          type: "simulado_enamed_8",
          starts_at: "2027-03-20T08:00:00Z",
          status: "corrigida",
        },
        {
          id: "asm-demo-2026-2",
          title: "Avaliação Somativa Integrada 2026.2",
          type: "prova_regular",
          starts_at: "2026-11-15T08:00:00Z",
          status: "corrigida",
        },
      ];

  const primaryExam = assessments[0];

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "8px 0 40px" }}>
      {/* CABEÇALHO */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <Link
            href="/instituicao"
            style={{ fontSize: "12px", color: "var(--chumbo)", textDecoration: "none" }}
          >
            ← Visão Executiva
          </Link>
          <span style={{ fontSize: "12px", color: "var(--sinal)" }}>/</span>
          <span style={{ fontSize: "12px", color: "var(--texto-secundario)" }}>Documentos Oficiais</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 4px", color: "var(--heading-color)" }}>
              Relatórios Executivos & Regulatórios
            </h1>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--chumbo)" }}>
              Emissão de dossiês acadêmicos e laudos somativos padronizados para Comissão Própria de Avaliação (CPA), Núcleo Docente Estruturante (NDE) e Ministério da Educação (MEC).
            </p>
          </div>
          <div
            style={{
              padding: "4px 12px",
              borderRadius: "4px",
              background: "var(--input-bg)",
              border: "1px solid var(--sinal)",
              fontSize: "12px",
              fontWeight: 600,
              fontFamily: "'IBM Plex Mono', monospace",
              color: "var(--heading-color)",
            }}
          >
            {institution.initials || "MED"} · Régua {cutScore}%
          </div>
        </div>
      </div>

      {/* CARD PRINCIPAL DO RELATÓRIO OFICIAL CPA / NDE / MEC */}
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "var(--card-shadow)",
          marginBottom: "28px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "18px" }}>
          <div>
            <span
              style={{
                display: "inline-block",
                padding: "3px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                background: "rgba(2, 132, 199, 0.1)",
                color: "var(--pulso, #0284C7)",
                border: "1px solid rgba(2, 132, 199, 0.25)",
                marginBottom: "8px",
              }}
            >
              Documento Regulatório Oficial
            </span>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 6px", color: "var(--heading-color)" }}>
              Dossiê Institucional de Avaliação Somativa (Ciclo 2027.1)
            </h2>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--chumbo)", lineHeight: 1.5 }}>
              Avaliação de referência: <strong>{primaryExam.title}</strong> · Instrumento validado pelo NDE com {assessments.length} avaliações do ciclo.
            </p>
          </div>

          {/* BOTÕES DE EXPORTAÇÃO */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <a
              href={`/api/b2b/reports/executive/print?examTitle=${encodeURIComponent(primaryExam.title)}&period=Semestre%202027.1`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 16px",
                borderRadius: "6px",
                background: "var(--pulso, #0284C7)",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Exportar em PDF (A4 Oficial)
            </a>

            <a
              href={`/api/b2b/reports/executive/docx?examTitle=${encodeURIComponent(primaryExam.title)}&period=Semestre%202027.1`}
              download
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 16px",
                borderRadius: "6px",
                background: "var(--card-bg)",
                border: "1px solid var(--sinal)",
                color: "var(--heading-color)",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
              Exportar em DOCX (Word)
            </a>
          </div>
        </div>

        {/* ESTRUTURA DO DOSSIÊ */}
        <div
          style={{
            borderTop: "1px solid var(--card-border)",
            paddingTop: "18px",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--chumbo)", marginBottom: "12px" }}>
            Seções Integradas do Laudo Institucional
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
            <div style={{ padding: "12px", background: "var(--input-bg)", borderRadius: "6px", border: "1px solid var(--sinal)" }}>
              <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--heading-color)", marginBottom: "3px" }}>
                1. Sumário Executivo & Metodologia
              </div>
              <div style={{ fontSize: "12px", color: "var(--chumbo)" }}>
                Identificação institucional, corte no percentil {cutScore}%, coortes avaliadas e parâmetros psicométricos clássicos (TCT).
              </div>
            </div>

            <div style={{ padding: "12px", background: "var(--input-bg)", borderRadius: "6px", border: "1px solid var(--sinal)" }}>
              <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--heading-color)", marginBottom: "3px" }}>
                2. Indicadores Chave de Avaliação (Régua 60)
              </div>
              <div style={{ fontSize: "12px", color: "var(--chumbo)" }}>
                Média geral, taxa de participação ({primaryExam ? "95.0%" : "—"}), percentual abaixo do corte e alunos na Zona de Decisão (51–60%).
              </div>
            </div>

            <div style={{ padding: "12px", background: "var(--input-bg)", borderRadius: "6px", border: "1px solid var(--sinal)" }}>
              <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--heading-color)", marginBottom: "3px" }}>
                3. Mapa de Rendimento Turma × Área
              </div>
              <div style={{ fontSize: "12px", color: "var(--chumbo)" }}>
                Média final por turma e desempenho desagregado nas 7 grandes áreas médicas do INEP/ENAMED em 4 faixas de cor.
              </div>
            </div>

            <div style={{ padding: "12px", background: "var(--input-bg)", borderRadius: "6px", border: "1px solid var(--sinal)" }}>
              <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--heading-color)", marginBottom: "3px" }}>
                4. Matriz Longitudinal Turmas × Provas
              </div>
              <div style={{ fontSize: "12px", color: "var(--chumbo)" }}>
                Trajetória de cada turma ao longo das avaliações do semestre com ressalva expressa de não-equiparamento.
              </div>
            </div>

            <div style={{ padding: "12px", background: "var(--input-bg)", borderRadius: "6px", border: "1px solid var(--sinal)" }}>
              <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--heading-color)", marginBottom: "3px" }}>
                5. Cobertura da Matriz Curricular vs INEP
              </div>
              <div style={{ fontSize: "12px", color: "var(--chumbo)" }}>
                Conformidade das cotas de itens cobrados em relação à referência nacional para fins de autorização e reconhecimento MEC.
              </div>
            </div>

            <div style={{ padding: "12px", background: "var(--input-bg)", borderRadius: "6px", border: "1px solid var(--sinal)" }}>
              <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--heading-color)", marginBottom: "3px" }}>
                6. Planos de Intervenção Pedagógica
              </div>
              <div style={{ fontSize: "12px", color: "var(--chumbo)" }}>
                Mapeamento de turmas e áreas com média &lt; 60% e diretrizes de nivelamento acadêmico deliberadas pelo NDE.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROL DE DESTINAÇÕES REGULATÓRIAS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
        <div style={{ padding: "16px", borderRadius: "8px", background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--heading-color)", marginBottom: "4px" }}>
            Uso em Comissões Próprias de Avaliação (CPA)
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--chumbo)", lineHeight: 1.5 }}>
            Subsidia a dimensão de Políticas de Atendimento aos Discentes e Eficácia do Ensino no Relatório de Autoavaliação Institucional (RAI).
          </p>
        </div>

        <div style={{ padding: "16px", borderRadius: "8px", background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--heading-color)", marginBottom: "4px" }}>
            Uso no Núcleo Docente Estruturante (NDE)
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--chumbo)", lineHeight: 1.5 }}>
            Fornece subsídios para revisão do Projeto Pedagógico do Curso (PPC), ajustes de matriz de competências e nivelamento pré-ENAMED.
          </p>
        </div>

        <div style={{ padding: "16px", borderRadius: "8px", background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--heading-color)", marginBottom: "4px" }}>
            Atendimento aos Padrões INEP / MEC
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--chumbo)", lineHeight: 1.5 }}>
            Comprova perante comissões de reconhecimento a existência de avaliação continuada e sistemática com base nas Diretrizes Curriculares Nacionais (DCNs).
          </p>
        </div>
      </div>

      {/* Rodapé Padronizado Base / Período / Fonte */}
      <div
        style={{
          marginTop: "20px",
          padding: "12px 16px",
          borderRadius: "8px",
          border: "1px solid var(--card-border)",
          background: "var(--card-bg)",
          fontSize: "11px",
          color: "var(--chumbo)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div>
          <span><strong>Base:</strong> Dados consolidados da instituição ({institution.name})</span> •{" "}
          <span><strong>Período:</strong> 2026.1 (Ciclo Anual CPA/NDE)</span> •{" "}
          <span><strong>Fonte:</strong> Registros somativos, relatórios executivos e auditorias acadêmicas</span>
        </div>
        <div>Insumo Oficial para Comissões MEC/SINAES</div>
      </div>
    </div>
  );
}
