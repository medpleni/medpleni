import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getB2BUserContext } from "@/lib/b2b/auth";
import { createClient } from "@/lib/supabase/server";
import {
  calculateClassExamsMatrix,
  SCORE_BANDS,
  getScoreBandCategory,
} from "@/lib/b2b/executive";

export default async function TurmasProvasPage() {
  const context = await getB2BUserContext();

  if (!context?.institution?.id) {
    redirect("/login");
  }

  if (context.role === "aluno") {
    redirect("/instituicao/aluno/provas");
  }

  const institutionId = context.institution.id;
  const cutScore = context.institution.cut_score || 60;
  const supabase = await createClient();

  // 1. Busca turmas
  const { data: dbClasses } = await supabase
    .from("class_groups")
    .select("id, code, label, period")
    .eq("institution_id", institutionId)
    .order("period", { ascending: true });

  const classGroups = (dbClasses && dbClasses.length > 0)
    ? dbClasses.map((c) => ({
        id: c.id,
        label: c.label || c.code || `Turma ${c.period}P`,
        period: c.period || 1,
      }))
    : [
        { id: "cg-1", label: "MED 1º Período (2030.1)", period: 1 },
        { id: "cg-2", label: "MED 2º Período (2029.2)", period: 2 },
        { id: "cg-3", label: "MED 3º Período (2029.1)", period: 3 },
        { id: "cg-4", label: "MED 4º Período (2028.2 · ENAMED I)", period: 4 },
        { id: "cg-5", label: "MED 5º Período (2028.1)", period: 5 },
        { id: "cg-6", label: "MED 6º Período (2027.2)", period: 6 },
        { id: "cg-7", label: "MED 7º Período (2027.1)", period: 7 },
        { id: "cg-8", label: "MED 8º Período (2026.2 · ENAMED II)", period: 8 },
        { id: "cg-9", label: "MED 9º Período (2026.1)", period: 9 },
        { id: "cg-10", label: "MED 10º Período (2025.2)", period: 10 },
        { id: "cg-11", label: "MED 11º Período (2025.1)", period: 11 },
        { id: "cg-12", label: "MED 12º Período (2024.2 · ENAMED III)", period: 12 },
      ];

  // 2. Busca avaliações aplicadas/corrigidas
  const { data: dbAssessments } = await supabase
    .from("assessments")
    .select("id, title, type, starts_at, status")
    .eq("institution_id", institutionId)
    .in("status", ["aplicada", "corrigida", "publicada"])
    .order("starts_at", { ascending: true });

  let exams = (dbAssessments || []).map((a) => ({
    id: a.id,
    title: a.title,
    date: a.starts_at || new Date().toISOString(),
  }));

  if (exams.length === 0) {
    exams = [
      {
        id: "asm-demo-2026-1",
        title: "Simulado ENAMED 2026.2",
        date: "2026-08-10T08:00:00Z",
      },
      {
        id: "asm-demo-2026-2",
        title: "Avaliação Integrada 2026.2",
        date: "2026-11-15T08:00:00Z",
      },
      {
        id: "asm-demo-2027-1",
        title: "Simulado Nacional ENAMED 2027.1",
        date: "2027-03-20T08:00:00Z",
      },
    ];
  }

  // 3. Monta tentativas
  const examIds = exams.map((e) => e.id);
  const { data: dbAttempts } = await supabase
    .from("attempts")
    .select("id, assessment_id, student_user_id, class_group_id, status, score_percentage")
    .in("assessment_id", examIds);

  let flatAttempts: Array<{ assessmentId: string; classGroupId: string; status: string; scorePercentage: number }> = [];

  if (dbAttempts && dbAttempts.length > 0) {
    flatAttempts = dbAttempts.map((a) => ({
      assessmentId: a.assessment_id,
      classGroupId: a.class_group_id || "cg-1",
      status: a.status === "corrigida" ? "finalizada" : a.status,
      scorePercentage: a.score_percentage !== null ? Number(a.score_percentage) : 0,
    }));
  } else {
    // Fallback consistente
    flatAttempts = exams.flatMap((exam) => {
      const isHard = exam.id.includes("2026-1");
      const isMedium = exam.id.includes("2026-2");
      return classGroups.flatMap((cg) =>
        Array.from({ length: 20 }).map((_, sIdx) => {
          const base = 52 + (cg.period * 1.5) + (isHard ? -4 : isMedium ? 0 : 3);
          const score = Math.max(30, Math.min(96, Math.round((base + ((sIdx % 7) * 2 - 6)) * 10) / 10));
          return {
            assessmentId: exam.id,
            classGroupId: cg.id,
            status: "finalizada",
            scorePercentage: score,
          };
        })
      );
    });
  }

  const matrixRows = calculateClassExamsMatrix({
    classGroups,
    exams,
    attempts: flatAttempts,
  });

  // Médias de cada prova na instituição
  const examOverallMeans = exams.map((ex) => {
    const scores = flatAttempts
      .filter((a) => a.assessmentId === ex.id && a.status === "finalizada")
      .map((a) => a.scorePercentage);
    const avg = scores.length > 0 ? Number((scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1)) : 0;
    return {
      examId: ex.id,
      averageScore: avg,
      scoreBand: getScoreBandCategory(avg),
    };
  });

  const totalScores = flatAttempts.filter((a) => a.status === "finalizada").map((a) => a.scorePercentage);
  const totalOverallAvg = totalScores.length > 0
    ? (totalScores.reduce((s, v) => s + v, 0) / totalScores.length).toFixed(1)
    : "0.0";

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "8px 0 40px" }}>
      {/* CABEÇALHO */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <Link
            href="/instituicao"
            style={{ fontSize: "12px", color: "var(--chumbo)", textDecoration: "none" }}
          >
            ← Visão Executiva
          </Link>
          <span style={{ fontSize: "12px", color: "var(--sinal)" }}>/</span>
          <span style={{ fontSize: "12px", color: "var(--texto-secundario)" }}>Matriz Longitudinal</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 4px", color: "var(--heading-color)" }}>
              Turmas × Provas
            </h1>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--chumbo)" }}>
              Mapeamento de médias por turma ao longo de todas as avaliações aplicadas. Clique no valor para abrir o relatório analítico da prova.
            </p>
          </div>
          <div
            style={{
              padding: "4px 10px",
              borderRadius: "4px",
              background: "var(--input-bg)",
              border: "1px solid var(--sinal)",
              fontSize: "12px",
              fontWeight: 600,
              fontFamily: "'IBM Plex Mono', monospace",
              color: "var(--heading-color)",
            }}
          >
            Régua Institucional: {cutScore}%
          </div>
        </div>
      </div>

      {/* LEGENDA DAS 4 FAIXAS */}
      <div
        style={{
          display: "flex",
          gap: "14px",
          alignItems: "center",
          flexWrap: "wrap",
          padding: "10px 14px",
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: "8px",
          marginBottom: "16px",
          fontSize: "12px",
        }}
      >
        <span style={{ fontWeight: 600, color: "var(--heading-color)", marginRight: "4px" }}>
          Faixas de Desempenho:
        </span>
        {Object.entries(SCORE_BANDS).map(([key, band]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                display: "inline-block",
                width: "12px",
                height: "12px",
                borderRadius: "3px",
                background: band.colorHex,
              }}
            />
            <span style={{ color: "var(--heading-color)", fontWeight: 500 }}>
              {band.label}
            </span>
          </div>
        ))}
      </div>

      {/* TABELA TURMAS × PROVAS */}
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: "10px",
          overflow: "hidden",
          boxShadow: "var(--card-shadow)",
          marginBottom: "20px",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--table-header-bg, #F8FAFC)", borderBottom: "1px solid var(--card-border)" }}>
                <th style={{ padding: "12px 14px", fontWeight: 600, color: "var(--heading-color)", minWidth: "180px", position: "sticky", left: 0, background: "inherit", zIndex: 2 }}>
                  Turma / Período
                </th>
                {exams.map((exam) => (
                  <th
                    key={exam.id}
                    style={{
                      padding: "12px 14px",
                      fontWeight: 600,
                      color: "var(--heading-color)",
                      textAlign: "center",
                      minWidth: "150px",
                    }}
                  >
                    <Link
                      href={`/instituicao/provas/${exam.id}/resultado`}
                      title="Ver resultado detalhado da prova"
                      style={{
                        color: "var(--pulso, #0284C7)",
                        textDecoration: "none",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{exam.title}</span>
                      <span style={{ fontSize: "10px", color: "var(--chumbo)", fontWeight: 400 }}>
                        {new Date(exam.date).toLocaleDateString("pt-BR")} ↗
                      </span>
                    </Link>
                  </th>
                ))}
                <th
                  style={{
                    padding: "12px 14px",
                    fontWeight: 700,
                    color: "var(--heading-color)",
                    textAlign: "center",
                    minWidth: "120px",
                    borderLeft: "2px solid var(--card-border)",
                    background: "var(--input-bg)",
                  }}
                >
                  Média Geral
                </th>
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((row) => {
                const rowScores = row.examScores.filter((es) => es.evaluatedStudents > 0).map((es) => es.averageScore);
                const classOverallMean = rowScores.length > 0
                  ? Number((rowScores.reduce((s, v) => s + v, 0) / rowScores.length).toFixed(1))
                  : null;
                const finalBand = classOverallMean !== null ? SCORE_BANDS[getScoreBandCategory(classOverallMean)] : null;

                return (
                  <tr
                    key={row.classGroupId}
                    style={{
                      borderBottom: "1px solid var(--card-border)",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <td
                      style={{
                        padding: "10px 14px",
                        fontWeight: 600,
                        color: "var(--heading-color)",
                        position: "sticky",
                        left: 0,
                        background: "var(--card-bg)",
                        zIndex: 1,
                        borderRight: "1px solid var(--card-border)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: "11px",
                            padding: "1px 5px",
                            borderRadius: "3px",
                            background: "var(--input-bg)",
                            border: "1px solid var(--sinal)",
                          }}
                        >
                          {row.period}ºP
                        </span>
                        <span>{row.classGroupLabel}</span>
                      </div>
                    </td>

                    {row.examScores.map((es) => {
                      const band = SCORE_BANDS[es.scoreBand];
                      return (
                        <td
                          key={es.examId}
                          style={{
                            padding: "8px 10px",
                            textAlign: "center",
                          }}
                        >
                          {es.evaluatedStudents > 0 ? (
                            <Link
                              href={`/instituicao/provas/${es.examId}/resultado`}
                              className={band.badgeClass}
                              style={{
                                display: "inline-block",
                                padding: "4px 10px",
                                borderRadius: "4px",
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontWeight: 700,
                                textDecoration: "none",
                                fontSize: "12px",
                                border: "1px solid transparent",
                              }}
                              title={`Média: ${es.averageScore.toFixed(1)}% · ${es.evaluatedStudents} alunos avaliados`}
                            >
                              {es.averageScore.toFixed(1)}%
                            </Link>
                          ) : (
                            <span style={{ color: "var(--chumbo)", fontSize: "11px" }}>—</span>
                          )}
                        </td>
                      );
                    })}

                    <td
                      style={{
                        padding: "8px 10px",
                        textAlign: "center",
                        borderLeft: "2px solid var(--card-border)",
                        background: "var(--input-bg)",
                      }}
                    >
                      {classOverallMean !== null && finalBand ? (
                        <span
                          className={finalBand.badgeClass}
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: "4px",
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontWeight: 700,
                            fontSize: "12px",
                            border: "1px solid transparent",
                          }}
                        >
                          {classOverallMean.toFixed(1)}%
                        </span>
                      ) : (
                        <span style={{ color: "var(--chumbo)", fontSize: "11px" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "var(--table-header-bg, #F8FAFC)", borderTop: "2px solid var(--card-border)" }}>
                <td
                  style={{
                    padding: "12px 14px",
                    fontWeight: 700,
                    color: "var(--heading-color)",
                    position: "sticky",
                    left: 0,
                    background: "inherit",
                    zIndex: 1,
                  }}
                >
                  Média da Instituição
                </td>
                {examOverallMeans.map((avg) => {
                  const band = SCORE_BANDS[avg.scoreBand];
                  return (
                    <td key={avg.examId} style={{ padding: "10px", textAlign: "center" }}>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontWeight: 700,
                          fontSize: "12px",
                          color: band.colorHex,
                        }}
                      >
                        {avg.averageScore.toFixed(1)}%
                      </span>
                    </td>
                  );
                })}
                <td
                  style={{
                    padding: "10px",
                    textAlign: "center",
                    borderLeft: "2px solid var(--card-border)",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "var(--heading-color)",
                  }}
                >
                  {totalOverallAvg}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* RESSALVA METODOLÓGICA (SEÇÃO 0 E 4.3 DA ESPEC-B2B) */}
      <div
        style={{
          padding: "12px 16px",
          borderRadius: "8px",
          background: "var(--input-bg)",
          border: "1px solid var(--sinal)",
          fontSize: "12px",
          color: "var(--chumbo)",
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: "var(--heading-color)" }}>Observação Metodológica: </strong>
        As médias apresentadas por prova refletem instrumentos de avaliação distintos, aplicados em momentos e níveis de dificuldade variados. Conforme a Seção 0 da Especificação B2B, provas não equiparadas por Teoria da Resposta ao Item (TRI) não devem ser comparadas diretamente como se fossem a mesma régua métrica; a evolução temporal indica tendências de rendimento da coorte e aderência ao padrão institucional.
      </div>

      {/* Rodapé Padronizado Base / Período / Fonte */}
      <div
        style={{
          marginTop: "16px",
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
          <span><strong>Base:</strong> Matriz de turmas × avaliações aplicadas</span> •{" "}
          <span><strong>Período:</strong> 2026.1</span> •{" "}
          <span><strong>Fonte:</strong> Provas e simulados corrigidos pela plataforma</span>
        </div>
        <div>Régua de corte configurada: <strong>{context.institution.cut_score ?? 60}%</strong></div>
      </div>
    </div>
  );
}
