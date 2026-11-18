/**
 * MEDPLENI B2B — text-parsers.ts
 * Motores de extração e segmentação de questões para DOCX, XLSX, CSV e Texto.
 */

import zlib from "zlib";
import type { ParsedQuestionItem, StagingOptionItem } from "./importer-types";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ZIP UNPACKER PURO (DOCX & XLSX)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrai uma entrada de arquivo de um buffer ZIP sem dependências externas
 */
export function extractZipEntry(buffer: Buffer, targetPath: string): Buffer | null {
  let offset = 0;
  while (offset < buffer.length - 4) {
    // Local File Header Signature: PK\x03\x04 (0x04034b50)
    if (buffer.readUInt32LE(offset) === 0x04034b50) {
      const compression = buffer.readUInt16LE(offset + 8);
      const compressedSize = buffer.readUInt32LE(offset + 18);
      const fileNameLen = buffer.readUInt16LE(offset + 26);
      const extraLen = buffer.readUInt16LE(offset + 28);
      const fileName = buffer.toString("utf8", offset + 30, offset + 30 + fileNameLen);
      const dataStart = offset + 30 + fileNameLen + extraLen;

      if (fileName === targetPath) {
        const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);
        if (compression === 0) {
          return compressedData;
        }
        if (compression === 8) {
          return zlib.inflateRawSync(compressedData);
        }
      }
      offset = dataStart + compressedSize;
    } else {
      offset++;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PARSER DE DOCX
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converte o arquivo document.xml do DOCX em array de parágrafos limpos
 */
export function extractParagraphsFromDocx(buffer: Buffer): string[] {
  const docXmlBuffer = extractZipEntry(buffer, "word/document.xml");
  if (!docXmlBuffer) {
    // Tenta fallback direto se já for XML
    const asStr = buffer.toString("utf8");
    if (asStr.includes("<w:document")) {
      return parseWordXmlParagraphs(asStr);
    }
    return [];
  }
  return parseWordXmlParagraphs(docXmlBuffer.toString("utf8"));
}

function parseWordXmlParagraphs(xmlText: string): string[] {
  const paragraphs: string[] = [];
  const pRegex = /<w:p(?:\s+[^>]*)?>([\s\S]*?)<\/w:p>/g;
  let pMatch: RegExpExecArray | null;

  while ((pMatch = pRegex.exec(xmlText)) !== null) {
    const pBody = pMatch[1];
    const tRegex = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let tMatch: RegExpExecArray | null;
    let pText = "";

    while ((tMatch = tRegex.exec(pBody)) !== null) {
      pText += tMatch[1];
    }

    const clean = pText
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim();

    if (clean) {
      paragraphs.push(clean);
    }
  }

  return paragraphs;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SEGMENTADOR DE QUESTÕES (MEDICINA / ENAMED / REVALIDA / BANCA)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Segmenta um texto contínuo ou array de parágrafos em questões estruturadas
 */
export function parseQuestionsFromParagraphs(paragraphs: string[]): ParsedQuestionItem[] {
  const rawJoined = paragraphs.join("\n");
  const questions: ParsedQuestionItem[] = [];

  // Padrão que delimita o início de uma questão: "QUESTÃO 1", "Questão 002", "QUESTÃO - 1", "1. ", etc.
  const questionSplitter = /(?:^|\n)(?:QUESTÃO\s*(?:[Nn][º°])?\s*\d+|Questão\s*(?:[Nn][º°])?\s*\d+|\b\d{1,3}\s*[\.\-]\s+(?=[A-ZÀ-Ú]))/g;

  // Se houver cabeçalho pré-questões, encontramos os índices de corte
  const matches: { index: number; text: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = questionSplitter.exec(rawJoined)) !== null) {
    matches.push({ index: m.index, text: m[0] });
  }

  if (matches.length === 0) {
    // Tenta tratar o texto inteiro como 1 única questão caso não haja separadores de questão
    const singleQ = parseSingleQuestionBlock(rawJoined, 1);
    if (singleQ) questions.push(singleQ);
    return questions;
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : rawJoined.length;
    const blockText = rawJoined.substring(start, end).trim();

    const parsed = parseSingleQuestionBlock(blockText, i + 1);
    if (parsed) {
      questions.push(parsed);
    }
  }

  return questions;
}

/**
 * Extrai os componentes de um bloco individual de questão
 */
export function parseSingleQuestionBlock(rawBlock: string, order: number): ParsedQuestionItem | null {
  if (!rawBlock || rawBlock.length < 20) return null;

  const lines = rawBlock.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  let areaName: string | null = null;
  let cenarioName: string | null = null;

  // Busca metadados INEP nas primeiras linhas
  for (const line of lines.slice(0, 8)) {
    const areaMatch = line.match(/^Área:\s*(.+)$/i);
    if (areaMatch) areaName = areaMatch[1].trim();

    const cenarioMatch = line.match(/^Cenário:\s*(.+)$/i);
    if (cenarioMatch) cenarioName = cenarioMatch[1].trim();
  }

  // Detecta Gabarito
  let correctLetter: "A" | "B" | "C" | "D" | "E" | null = null;
  const gabMatch = rawBlock.match(/(?:Gabarito|Resposta\s*correta|Resposta)\s*[:=]\s*([A-E])\b/i);
  if (gabMatch) {
    correctLetter = gabMatch[1].toUpperCase() as "A" | "B" | "C" | "D" | "E";
  }

  // Detecta Comentário / Resposta Comentada
  let explanation: string | null = null;
  const explanationIndex = rawBlock.search(/(?:Resposta\s*comentada|Comentário|Justificativa)\s*[:\n]/i);
  if (explanationIndex !== -1) {
    const explSlice = rawBlock.substring(explanationIndex);
    const cleanExpl = explSlice
      .replace(/^(?:Resposta\s*comentada|Comentário|Justificativa)\s*[:\n]*/i, "")
      .trim();
    if (cleanExpl) explanation = cleanExpl;
  }

  // Segmenta alternativas A-E
  // Padrão: "A) ...", "A. ...", "(A) ...", ou "A - ..."
  const optionRegex = /(?:^|\n)\s*([A-E])\s*[\)\.\-]\s*([\s\S]*?)(?=(?:^|\n)\s*[A-E]\s*[\)\.\-]|(?:Gabarito|Resposta|Comentário|Resposta\s*comentada)|$)/gi;
  const options: StagingOptionItem[] = [];
  let optMatch: RegExpExecArray | null;

  while ((optMatch = optionRegex.exec(rawBlock)) !== null) {
    const letter = optMatch[1].toUpperCase() as "A" | "B" | "C" | "D" | "E";
    const optText = optMatch[2].trim();
    if (optText) {
      options.push({
        letter,
        text: optText,
        is_correct: letter === correctLetter,
      });
    }
  }

  // Extração do enunciado: da linha posterior ao cabeçalho até a primeira alternativa
  let statement = "";
  const firstOptIndex = rawBlock.search(/(?:^|\n)\s*[A-E]\s*[\)\.\-]/i);

  if (firstOptIndex !== -1) {
    let rawStatement = rawBlock.substring(0, firstOptIndex);
    // Remove cabeçalhos de metadados do início do enunciado
    rawStatement = rawStatement
      .replace(/^QUESTÃO\s*(?:[Nn][º°])?\s*\d+.*$/im, "")
      .replace(/^Questão\s*(?:[Nn][º°])?\s*\d+.*$/im, "")
      .replace(/^Classificação\s*pelo\s*INEP.*$/im, "")
      .replace(/^Área:.*$/im, "")
      .replace(/^Cenário:.*$/im, "")
      .replace(/^Múltipla\s*escolha.*$/im, "")
      .replace(/^Enunciado\s*$/im, "")
      .trim();

    statement = rawStatement;
  } else {
    // Sem alternativas identificadas
    statement = rawBlock.trim();
  }

  // Se não foi possível encontrar alternativas, marca
  if (options.length === 0) {
    // Cria 5 alternativas vazias
    ["A", "B", "C", "D", "E"].forEach((l) => {
      options.push({
        letter: l as "A" | "B" | "C" | "D" | "E",
        text: "",
        is_correct: false,
      });
    });
  }

  // Se gabarito foi encontrado, garante que a alternativa correspondente tem is_correct = true
  if (correctLetter) {
    for (const opt of options) {
      opt.is_correct = opt.letter === correctLetter;
    }
  }

  return {
    order,
    originalRawText: rawBlock,
    statement: statement || "Enunciado a conferir",
    clinicalContext: null,
    options,
    correctLetter,
    explanation,
    parsedAreaName: areaName,
    parsedCenarioName: cenarioName,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PARSER DE CSV E XLSX
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lê CSV delimitado por vírgula ou ponto-e-vírgula
 */
export function parseCSVToQuestions(csvText: string): ParsedQuestionItem[] {
  const clean = csvText.replace(/^\uFEFF/, "");
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (current.trim()) lines.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current.trim());
  if (lines.length <= 1) return [];

  const sep = lines[0].includes(";") ? ";" : ",";
  const header = parseCSVLine(lines[0], sep).map((h) => h.toLowerCase());

  const questions: ParsedQuestionItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i], sep);
    if (cols.length < 3) continue;

    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = cols[idx] || "";
    });

    const statement = row["enunciado"] || row["texto"] || row["questao"] || cols[3] || "";
    if (!statement) continue;

    const correctLetter = (row["gabarito"] || row["resposta"] || "A").trim().toUpperCase() as "A" | "B" | "C" | "D" | "E";

    const options: StagingOptionItem[] = [
      { letter: "A" as const, text: row["alternativaa"] || row["a"] || "", is_correct: correctLetter === "A" },
      { letter: "B" as const, text: row["alternativab"] || row["b"] || "", is_correct: correctLetter === "B" },
      { letter: "C" as const, text: row["alternativac"] || row["c"] || "", is_correct: correctLetter === "C" },
      { letter: "D" as const, text: row["alternativad"] || row["d"] || "", is_correct: correctLetter === "D" },
      { letter: "E" as const, text: row["alternativae"] || row["e"] || "", is_correct: correctLetter === "E" },
    ].filter((o) => Boolean(o.text));

    questions.push({
      order: i,
      originalRawText: lines[i],
      statement,
      options,
      correctLetter: ["A", "B", "C", "D", "E"].includes(correctLetter) ? correctLetter : null,
      explanation: row["comentario"] || row["justificativa"] || null,
      parsedAreaName: row["area"] || null,
      parsedCenarioName: row["cenario"] || null,
    });
  }

  return questions;
}

function parseCSVLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === sep && !inQ) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}
