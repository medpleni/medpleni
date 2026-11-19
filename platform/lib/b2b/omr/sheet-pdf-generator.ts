/**
 * MedPleni B2B — sheet-pdf-generator.ts
 * Gerador de Cadernos de Prova e Folhas de Respostas Vetoriais para Impressão A4
 * Conforme PR-07: caderno fixo versionado por forma e folha de respostas com QR único.
 */

import { generateQRCodeSVG } from "./qr-codec";
import type { OptionLetter } from "../assessments";

export interface BookletQuestion {
  orderNumber: number;
  statement: string;
  clinicalContext?: string | null;
  options: Array<{
    letter: OptionLetter;
    text: string;
  }>;
}

export interface PrintableBookletData {
  institutionName: string;
  institutionInitials: string;
  logoUrl?: string | null;
  examTitle: string;
  formCode: string; // Ex: 'A', 'B', 'C', 'D'
  courseName: string;
  periodLabel: string;
  dateStr: string;
  durationMinutes: number;
  instructions?: string[];
  questions: BookletQuestion[];
}

export interface PrintableAnswerSheetData {
  assessmentId: string;
  examTitle: string;
  institutionName: string;
  logoUrl?: string | null;
  formCode: string;
  studentName: string;
  studentRegistration: string; // RA
  studentUserId?: string;
  totalQuestions: number;
}

/**
 * 1. Gera HTML vetorial imprimível do Caderno de Questões por Forma
 * Formatado para papel A4 com paginação, sem quebra de questão no meio e logo institucional.
 */
export function generateBookletPrintHTML(data: PrintableBookletData): string {
  const instructionsList = data.instructions || [
    "Verifique se o seu caderno corresponde ao Tipo informado na folha de respostas.",
    "Cada questão possui uma única alternativa correta.",
    "O tempo total de duração desta avaliação é de " + data.durationMinutes + " minutos.",
    "Ao concluir a resolução, transfira com atenção suas respostas para a folha óptica oficial.",
  ];

  const questionsHtml = data.questions
    .map(
      (q) => `
      <div class="question-block">
        <div class="question-header">
          <span class="question-num">QUESTÃO ${q.orderNumber}</span>
        </div>
        ${q.clinicalContext ? `<div class="clinical-context">${q.clinicalContext}</div>` : ""}
        <div class="statement">${q.statement}</div>
        <div class="options-list">
          ${q.options
            .map(
              (opt) => `
            <div class="option-item">
              <span class="option-badge">${opt.letter}</span>
              <span class="option-text">${opt.text}</span>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${data.examTitle} — Caderno ${data.formCode}</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 15mm 20mm 15mm;
      @bottom-right {
        content: "Página " counter(page) " de " counter(pages);
        font-size: 8pt;
        font-family: sans-serif;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.45;
      color: #111827;
      margin: 0;
      padding: 0;
    }
    .header-box {
      border: 1.5pt solid #1e293b;
      padding: 12px 16px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #f8fafc;
    }
    .inst-title {
      font-size: 13pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
    }
    .exam-title {
      font-size: 11pt;
      font-weight: 700;
      color: #334155;
      margin-top: 2px;
    }
    .exam-meta {
      font-size: 8pt;
      color: #64748b;
      margin-top: 4px;
    }
    .caderno-badge {
      border: 2pt solid #0f172a;
      padding: 6px 14px;
      text-align: center;
      background: #ffffff;
    }
    .caderno-badge-sub {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
    }
    .caderno-badge-code {
      font-size: 18pt;
      font-weight: 900;
      color: #0f172a;
      line-height: 1;
    }
    .instructions-box {
      border-left: 3pt solid #3b82f6;
      background: #eff6ff;
      padding: 10px 14px;
      font-size: 8.5pt;
      margin-bottom: 22px;
    }
    .instructions-box h4 {
      margin: 0 0 4px 0;
      font-size: 8.5pt;
      text-transform: uppercase;
      color: #1e40af;
    }
    .instructions-box ul {
      margin: 0;
      padding-left: 16px;
    }
    .instructions-box li {
      margin-bottom: 2px;
    }
    .question-block {
      page-break-inside: avoid;
      margin-bottom: 18px;
      padding-bottom: 14px;
      border-bottom: 0.5pt solid #e2e8f0;
    }
    .question-header {
      margin-bottom: 5px;
    }
    .question-num {
      background: #0f172a;
      color: #ffffff;
      font-size: 7.5pt;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 3px;
      letter-spacing: 0.5px;
    }
    .clinical-context {
      font-style: italic;
      color: #334155;
      background: #f8fafc;
      padding: 6px 10px;
      border-left: 2pt solid #94a3b8;
      margin: 6px 0;
      font-size: 9pt;
    }
    .statement {
      font-weight: 600;
      margin: 6px 0 10px 0;
      text-align: justify;
    }
    .options-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .option-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .option-badge {
      width: 16px;
      height: 16px;
      border: 1pt solid #475569;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      font-weight: 700;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .option-text {
      font-size: 9pt;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header-box">
    <div>
      <div class="inst-title">${data.institutionName}</div>
      <div class="exam-title">${data.examTitle}</div>
      <div class="exam-meta">${data.courseName} • ${data.periodLabel} • Data: ${data.dateStr}</div>
    </div>
    <div class="caderno-badge">
      <div class="caderno-badge-sub">Caderno</div>
      <div class="caderno-badge-code">${data.formCode}</div>
    </div>
  </div>

  <div class="instructions-box">
    <h4>Instruções aos Alunos</h4>
    <ul>
      ${instructionsList.map((ins) => `<li>${ins}</li>`).join("")}
    </ul>
  </div>

  <div class="questions-container">
    ${questionsHtml}
  </div>
</body>
</html>`;
}

/**
 * 2. Gera HTML da Folha de Respostas Óptica A4 Personalizada por Aluno
 * Contém os 4 cantos fiduciais pretos (8x8mm), QR code único e bolhas A-E.
 */
export function generateAnswerSheetPrintHTML(data: PrintableAnswerSheetData): string {
  const qrSvg = generateQRCodeSVG(
    {
      assessmentId: data.assessmentId,
      formCode: data.formCode,
      studentUserId: data.studentUserId,
      studentRegistration: data.studentRegistration,
    },
    90
  );

  const letters: OptionLetter[] = ["A", "B", "C", "D", "E"];
  const QUESTIONS_PER_COL = 25;
  const numCols = Math.ceil(data.totalQuestions / QUESTIONS_PER_COL);

  // Gera colunas de questões
  const columnsHtml = Array.from({ length: numCols }, (_, colIdx) => {
    const startQ = colIdx * QUESTIONS_PER_COL + 1;
    const endQ = Math.min(data.totalQuestions, (colIdx + 1) * QUESTIONS_PER_COL);

    const rowsHtml = [];
    for (let q = startQ; q <= endQ; q++) {
      rowsHtml.push(`
        <div class="omr-row">
          <span class="omr-q-num">${q < 10 ? `0${q}` : q}</span>
          <div class="omr-bubbles">
            ${letters
              .map(
                (l) => `
              <div class="omr-bubble-cell">
                <div class="omr-bubble">${l}</div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `);
    }

    return `<div class="omr-col">${rowsHtml.join("")}</div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Folha de Respostas — ${data.studentName}</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #000000;
      background: #ffffff;
      width: 210mm;
      height: 297mm;
      box-sizing: border-box;
      position: relative;
    }
    /* 4 Marcas de Registro Fiduciais nos Cantos (8x8mm sólidos pretos) */
    .fiducial-mark {
      position: absolute;
      width: 8mm;
      height: 8mm;
      background-color: #000000;
    }
    .mark-tl { top: 15mm; left: 15mm; }
    .mark-tr { top: 15mm; right: 15mm; }
    .mark-bl { bottom: 15mm; left: 15mm; }
    .mark-br { bottom: 15mm; right: 15mm; }

    /* Área Útil da Folha */
    .sheet-content {
      position: absolute;
      top: 15mm;
      left: 27mm;
      right: 27mm;
      bottom: 15mm;
      box-sizing: border-box;
      padding-top: 2mm;
    }

    /* Cabeçalho */
    .sheet-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1.5pt solid #000000;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .inst-name {
      font-size: 11pt;
      font-weight: 800;
      text-transform: uppercase;
    }
    .exam-name {
      font-size: 9.5pt;
      font-weight: 700;
      color: #27272a;
    }
    .student-info {
      margin-top: 6px;
      font-size: 8pt;
      line-height: 1.35;
    }
    .qr-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
    }
    .caderno-code {
      font-size: 11pt;
      font-weight: 900;
      border: 1.5pt solid #000000;
      padding: 1px 8px;
      text-transform: uppercase;
    }

    /* Grade OMR */
    .omr-grid-container {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 8px;
    }
    .omr-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3.5px;
    }
    .omr-row {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 6.8mm;
    }
    .omr-q-num {
      font-size: 7.5pt;
      font-weight: 800;
      width: 14px;
      text-align: right;
      color: #3f3f46;
    }
    .omr-bubbles {
      display: flex;
      gap: 4px;
    }
    .omr-bubble-cell {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .omr-bubble {
      width: 4.4mm;
      height: 4.4mm;
      border: 0.9pt solid #000000;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 6pt;
      font-weight: 800;
      line-height: 1;
    }

    /* Instruções na base */
    .sheet-footer {
      position: absolute;
      bottom: 2mm;
      left: 0;
      right: 0;
      border-top: 1pt solid #a1a1aa;
      padding-top: 6px;
      font-size: 7pt;
      color: #52525b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <!-- 4 Marcas de Registro Fiduciais nos Cantos -->
  <div class="fiducial-mark mark-tl"></div>
  <div class="fiducial-mark mark-tr"></div>
  <div class="fiducial-mark mark-bl"></div>
  <div class="fiducial-mark mark-br"></div>

  <!-- Conteúdo Centralizado -->
  <div class="sheet-content">
    <div class="sheet-header">
      <div>
        <div class="inst-name">${data.institutionName}</div>
        <div class="exam-name">${data.examTitle}</div>
        <div class="student-info">
          <div><strong>Aluno:</strong> ${data.studentName}</div>
          <div><strong>Matrícula (RA):</strong> ${data.studentRegistration || "N/A"}</div>
        </div>
      </div>
      <div class="qr-container">
        ${qrSvg}
        <div class="caderno-code">Caderno ${data.formCode}</div>
      </div>
    </div>

    <!-- Grade com as Questões e Bolhas -->
    <div class="omr-grid-container">
      ${columnsHtml}
    </div>

    <div class="sheet-footer">
      <span>Instruções: preencha completamente a bolha com caneta preta ou azul escura. Não dobre esta folha.</span>
      <span>MedPleni OMR • Folha Homologada</span>
    </div>
  </div>
</body>
</html>`;
}
