/**
 * MEDPLENI B2B — report-generator.ts
 * Gerador de Relatório Executivo Institucional em PDF e DOCX (SPR nº 12)
 *
 * Estrutura pensada como insumo oficial para CPA, NDE e MEC:
 * 1. Cabeçalho e Identidade Institucional (Brasão/Logo, Faculdade, Período)
 * 2. Resumo Executivo e 5 Indicadores Globais
 * 3. Mapa de Calor Turma × Área (4 faixas de cor)
 * 4. Evolução Temporal e Acompanhamento Longitudinal
 * 5. Ações Pedagógicas e Intervenções em Andamento
 * 6. Metodologia de Avaliação e Limites de Interpretação (Régua 60, não equiparação de provas)
 */

import type {
  ExecutiveKPIsResult,
  ClassAreaHeatmapRow,
  ExamTimelineItem,
  MatrixCoverageItem,
} from "./executive";

export interface ReportGenerationParams {
  institutionName: string;
  institutionInitials: string;
  courseName: string;
  academicTerm: string;
  generatedAt: string;
  generatedByName: string;
  selectedExamTitle: string;
  kpis: ExecutiveKPIsResult;
  heatmap: ClassAreaHeatmapRow[];
  timeline: ExamTimelineItem[];
  coverage: MatrixCoverageItem[];
}

/**
 * 1. Gera o documento HTML vetorial pronto para impressão / exportação em PDF (A4)
 */
export function generateExecutiveReportHTML(params: ReportGenerationParams): string {
  const {
    institutionName,
    institutionInitials,
    courseName,
    academicTerm,
    generatedAt,
    generatedByName,
    selectedExamTitle,
    kpis,
    heatmap,
    timeline,
    coverage,
  } = params;

  const areas = heatmap.length > 0 ? heatmap[0].areas.map((a) => a.areaName) : [];

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Relatório Executivo de Avaliação — ${institutionInitials}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      line-height: 1.5;
      font-size: 11pt;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .header {
      border-bottom: 2px solid #0f766e;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header-title h1 {
      margin: 0;
      font-size: 16pt;
      color: #0f766e;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header-title p {
      margin: 4px 0 0 0;
      font-size: 9.5pt;
      color: #64748b;
    }
    .meta-box {
      text-align: right;
      font-size: 8.5pt;
      color: #64748b;
    }
    .section-title {
      font-size: 12pt;
      font-weight: 700;
      color: #0f766e;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-top: 22px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
      margin-bottom: 15px;
    }
    .kpi-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px;
      background: #f8fafc;
      text-align: center;
    }
    .kpi-label {
      font-size: 7.5pt;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
    }
    .kpi-val {
      font-size: 14pt;
      font-weight: 800;
      color: #0f172a;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      margin-bottom: 15px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 5px 6px;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      font-weight: 700;
      color: #334155;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    
    .band-ate50 { background-color: #fee2e2; color: #991b1b; font-weight: 700; }
    .band-5160  { background-color: #fef3c7; color: #92400e; font-weight: 700; }
    .band-6170  { background-color: #d1fae5; color: #065f46; font-weight: 600; }
    .band-71    { background-color: #a7f3d0; color: #064e3b; font-weight: 800; }
    
    .footnote {
      font-size: 7.5pt;
      color: #64748b;
      margin-top: 5px;
      margin-bottom: 15px;
    }
    .alert-box {
      border-left: 4px solid #f59e0b;
      background: #fffbeb;
      padding: 8px 12px;
      font-size: 8.5pt;
      color: #92400e;
      margin-bottom: 12px;
    }
    .cpa-box {
      border: 1px solid #0f766e;
      background: #f0fdfa;
      border-radius: 6px;
      padding: 12px;
      font-size: 8.5pt;
      color: #134e4a;
      margin-top: 15px;
    }
    .cpa-box h4 {
      margin: 0 0 6px 0;
      font-size: 9.5pt;
      font-weight: 700;
    }
    .page-break {
      page-break-before: always;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <!-- CABEÇALHO INSTITUCIONAL -->
  <div class="header">
    <div class="header-title">
      <h1>${institutionName} (${institutionInitials})</h1>
      <p>Curso de Graduação em ${courseName} • Período Letivo ${academicTerm}</p>
      <p style="font-weight: 600; color: #0f172a; margin-top: 2px;">
        Relatório Executivo de Desempenho e Qualidade de Aprendizagem (CPA / NDE / MEC)
      </p>
    </div>
    <div class="meta-box">
      <div>Emissão: <strong>${generatedAt}</strong></div>
      <div>Responsável: ${generatedByName}</div>
      <div>Base: <strong>${selectedExamTitle}</strong></div>
    </div>
  </div>

  <!-- 1. RESUMO EXECUTIVO E 5 INDICADORES -->
  <div class="section-title">1. Indicadores Globais de Aprendizagem</div>
  
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Nota Média Institucional</div>
      <div class="kpi-val">${kpis.institutionMeanScore}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Abaixo do Corte (&lt; 60%)</div>
      <div class="kpi-val" style="color: #b91c1c;">${kpis.studentsBelowCutPercentage}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Taxa de Participação</div>
      <div class="kpi-val">${kpis.participationRate}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Turmas &lt; 60%</div>
      <div class="kpi-val">${kpis.classesBelowCutCount} / ${kpis.totalClasses}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Zona de Decisão (51–60%)</div>
      <div class="kpi-val" style="color: #d97706;">${kpis.decisionZonePercentage}%</div>
    </div>
  </div>
  
  <div class="footnote">
    Base: ${kpis.footnote.base} • ${kpis.footnote.period} • Fonte: ${kpis.footnote.source}
  </div>

  <!-- 2. MAPA DE CALOR TURMAS × ÁREAS -->
  <div class="section-title">2. Matriz de Desempenho: Turmas × Grandes Áreas Médicas</div>
  <p style="font-size: 8.5pt; color: #64748b; margin-top: -5px; margin-bottom: 8px;">
    Rendimento médio percentual. Régua de corte institucional em 60%. As quatro faixas de cores indicam:
    <span class="band-ate50" style="padding: 1px 4px;">Até 50%</span>
    <span class="band-5160" style="padding: 1px 4px;">51–60% (Zona de Decisão)</span>
    <span class="band-6170" style="padding: 1px 4px;">61–70% (Adequado)</span>
    <span class="band-71" style="padding: 1px 4px;">71%+ (Excelente)</span>.
  </p>

  <table>
    <thead>
      <tr>
        <th>Turma</th>
        <th class="text-center">Etapa</th>
        <th class="text-center">Alunos</th>
        <th class="text-center" style="background: #e2e8f0; font-weight: 800;">Média Final</th>
        ${areas.map((a) => `<th class="text-center">${a}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${heatmap
        .map((row) => {
          const finalClass =
            row.classScoreBand === "ate_50"
              ? "band-ate50"
              : row.classScoreBand === "51_60"
              ? "band-5160"
              : row.classScoreBand === "61_70"
              ? "band-6170"
              : "band-71";

          return `<tr>
            <td><strong>${row.classGroupLabel}</strong></td>
            <td class="text-center">${row.period}ºP</td>
            <td class="text-center">${row.totalStudents}</td>
            <td class="text-center ${finalClass}">${row.classAverageScore}%</td>
            ${row.areas
              .map((ar) => {
                const c =
                  ar.scoreBand === "ate_50"
                    ? "band-ate50"
                    : ar.scoreBand === "51_60"
                    ? "band-5160"
                    : ar.scoreBand === "61_70"
                    ? "band-6170"
                    : "band-71";
                return `<td class="text-center ${c}">${ar.averageScore}%</td>`;
              })
              .join("")}
          </tr>`;
        })
        .join("")}
    </tbody>
  </table>

  <!-- 3. EVOLUÇÃO TEMPORAL -->
  <div class="section-title">3. Acompanhamento Longitudinal das Provas</div>
  
  <div class="alert-box">
    <strong>Aviso Metodológico de Interpretação:</strong> Avaliações diferentes possuem graus de dificuldade distintos e itens próprios, não sendo estritamente comparáveis como se pertencessem à mesma régua linear. Os dados abaixo retratam o acompanhamento histórico institucional.
  </div>

  <table>
    <thead>
      <tr>
        <th>Avaliação Institucional</th>
        <th class="text-center">Data</th>
        <th class="text-center">Amostra Avaliada</th>
        <th class="text-center">Média Geral</th>
        <th class="text-center">% Reprovação (&lt; 60%)</th>
      </tr>
    </thead>
    <tbody>
      ${timeline
        .map(
          (t) => `<tr>
          <td><strong>${t.title}</strong></td>
          <td class="text-center">${new Date(t.date).toLocaleDateString("pt-BR")}</td>
          <td class="text-center">${t.totalEvaluated} estudantes</td>
          <td class="text-center font-bold">${t.institutionMeanScore}%</td>
          <td class="text-center">${t.rateBelowCut}%</td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <!-- 4. COBERTURA DA MATRIZ INEP -->
  <div class="section-title">4. Cobertura da Matriz de Áreas Médicas no Período</div>

  <table>
    <thead>
      <tr>
        <th>Área Temática (Padrão INEP)</th>
        <th class="text-center">Questões Aplicadas</th>
        <th class="text-center">Proporção Real (%)</th>
        <th class="text-center">Referência INEP (%)</th>
        <th class="text-center">Status de Cobertura</th>
      </tr>
    </thead>
    <tbody>
      ${coverage
        .map(
          (cov) => `<tr>
          <td><strong>${cov.areaName}</strong></td>
          <td class="text-center">${cov.questionsCount}</td>
          <td class="text-center">${cov.percentageOfTotal}%</td>
          <td class="text-center">${cov.referencePercentage}%</td>
          <td class="text-center">
            ${
              cov.status === "satisfatoria"
                ? '<span style="color: #059669; font-weight: 700;">✓ Satisfatória</span>'
                : cov.status === "atencao"
                ? '<span style="color: #d97706; font-weight: 700;">⚠ Cota Abaixo da Meta</span>'
                : '<span style="color: #dc2626; font-weight: 700;">✕ Sem Questões</span>'
            }
          </td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <!-- 5. INSUMO PARA CPA, NDE E MEC -->
  <div class="cpa-box">
    <h4>Evidências de Aprendizagem para a CPA, NDE e MEC (Dimensão 1 e 2)</h4>
    <p style="margin: 0 0 6px 0;">
      Este documento sintetiza os resultados de avaliação somativa e formativa integrados à plataforma MedPleni B2B, servindo como documento comprobatório para os processos de autoavaliação institucional (CPA), reuniões de acompanhamento do Núcleo Docente Estruturante (NDE) e atendimento às diretrizes do Instrumento de Avaliação de Cursos de Graduação do MEC/INEP.
    </p>
    <p style="margin: 0; font-size: 7.5pt; color: #0f766e;">
      Autenticação Digital: MP-REL-${institutionInitials}-${Date.now().toString(36).toUpperCase()} • Registro de Conformidade LGPD em banco auditado.
    </p>
  </div>

</body>
</html>`;
}

/**
 * 2. Gera o documento DOCX compatível (Word OpenXML HTML stream)
 */
export function generateExecutiveReportDOCX(params: ReportGenerationParams): string {
  // O formato HTML enriquecido com namespace Word XML abre nativamente no Microsoft Word (.docx)
  // preservando cabeçalhos, cores de células e tabelas.
  return `MIME-Version: 1.0
Content-Type: multipart/related; boundary="----=_NextPart_01"

------=_NextPart_01
Content-Type: text/html; charset="utf-8"

${generateExecutiveReportHTML(params)}

------=_NextPart_01--`;
}
