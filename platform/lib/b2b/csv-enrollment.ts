/**
 * MEDPLENI B2B — csv-enrollment.ts
 * Parser, validador linha a linha e gerador de relatório de erros para importação de matrículas.
 * Projetado para alta performance: valida 200+ linhas em poucos milissegundos.
 */

export interface RawEnrollmentRow {
  nome?: string;
  email?: string;
  ra?: string;
  turma?: string;
  [key: string]: string | undefined;
}

export interface ValidEnrollmentRow {
  rowNumber: number;
  name: string;
  email: string;
  ra: string;
  classGroupId: string;
  classGroupLabel: string;
}

export interface EnrollmentRowError {
  rowNumber: number;
  name: string;
  email: string;
  ra: string;
  turma: string;
  reason: string;
}

export interface ClassGroupReference {
  id: string;
  label: string;
  period?: number;
}

export interface CSVParseValidationResult {
  totalRows: number;
  validRows: ValidEnrollmentRow[];
  invalidRows: EnrollmentRowError[];
}

/**
 * Validação de formato de e-mail RFC simplificado
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Divide uma linha CSV respeitando aspas
 */
function splitCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ""));
  return result;
}

/**
 * Normaliza rótulo de turma para matching flexível
 */
function normalizeClassKey(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Faz parse e validação linha a linha de arquivo CSV de matrículas
 */
export function parseAndValidateEnrollmentCSV(
  csvContent: string,
  availableClasses: ClassGroupReference[]
): CSVParseValidationResult {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { totalRows: 0, validRows: [], invalidRows: [] };
  }

  // Detecta delimitador (, ou ;)
  const headerLine = lines[0];
  const delimiter = (headerLine.match(/;/g) || []).length > (headerLine.match(/,/g) || []).length ? ";" : ",";

  const rawHeaders = splitCSVLine(headerLine, delimiter).map((h) =>
    h
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
  );

  // Mapeia colunas esperadas
  const nameIdx = rawHeaders.findIndex((h) => h.includes("nome") || h.includes("name") || h.includes("aluno"));
  const emailIdx = rawHeaders.findIndex((h) => h.includes("email") || h.includes("e-mail") || h.includes("mail"));
  const raIdx = rawHeaders.findIndex((h) => h.includes("ra") || h.includes("matricula") || h.includes("registro"));
  const turmaIdx = rawHeaders.findIndex((h) => h.includes("turma") || h.includes("class") || h.includes("grupo"));

  // Mapa rápido de busca de turmas da instituição
  const classMap = new Map<string, ClassGroupReference>();
  for (const cg of availableClasses) {
    classMap.set(cg.id.toLowerCase(), cg);
    classMap.set(normalizeClassKey(cg.label), cg);
    if (cg.period) {
      classMap.set(`${cg.period}`, cg);
      classMap.set(`${cg.period}p`, cg);
      classMap.set(`${cg.period}periodo`, cg);
    }
  }

  const validRows: ValidEnrollmentRow[] = [];
  const invalidRows: EnrollmentRowError[] = [];

  const seenEmails = new Set<string>();
  const seenRAs = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1; // número da linha com base no arquivo real (1-based)
    const cols = splitCSVLine(lines[i], delimiter);

    const rawName = nameIdx >= 0 ? cols[nameIdx] || "" : cols[0] || "";
    const rawEmail = emailIdx >= 0 ? cols[emailIdx] || "" : cols[1] || "";
    const rawRA = raIdx >= 0 ? cols[raIdx] || "" : cols[2] || "";
    const rawTurma = turmaIdx >= 0 ? cols[turmaIdx] || "" : cols[3] || "";

    const name = rawName.trim();
    const email = rawEmail.trim().toLowerCase();
    const ra = rawRA.trim();
    const turma = rawTurma.trim();

    // Validações
    if (!name || name.length < 2) {
      invalidRows.push({ rowNumber: rowNum, name, email, ra, turma, reason: "Nome do aluno ausente ou muito curto." });
      continue;
    }

    if (!email || !isValidEmail(email)) {
      invalidRows.push({ rowNumber: rowNum, name, email, ra, turma, reason: "E-mail inválido ou ausente." });
      continue;
    }

    if (!ra) {
      invalidRows.push({ rowNumber: rowNum, name, email, ra, turma, reason: "RA / Matrícula acadêmica ausente." });
      continue;
    }

    if (!turma) {
      invalidRows.push({ rowNumber: rowNum, name, email, ra, turma, reason: "Turma não informada." });
      continue;
    }

    // Matching da turma
    const matchedClass = classMap.get(normalizeClassKey(turma)) || classMap.get(turma.toLowerCase());
    if (!matchedClass) {
      invalidRows.push({
        rowNumber: rowNum,
        name,
        email,
        ra,
        turma,
        reason: `Turma "${turma}" não encontrada na instituição ativa.`,
      });
      continue;
    }

    // Duplicidade no mesmo arquivo
    if (seenEmails.has(email)) {
      invalidRows.push({ rowNumber: rowNum, name, email, ra, turma, reason: `E-mail "${email}" duplicado neste arquivo.` });
      continue;
    }

    if (seenRAs.has(ra)) {
      invalidRows.push({ rowNumber: rowNum, name, email, ra, turma, reason: `RA "${ra}" duplicado neste arquivo.` });
      continue;
    }

    seenEmails.add(email);
    seenRAs.add(ra);

    validRows.push({
      rowNumber: rowNum,
      name,
      email,
      ra,
      classGroupId: matchedClass.id,
      classGroupLabel: matchedClass.label,
    });
  }

  return {
    totalRows: lines.length - 1,
    validRows,
    invalidRows,
  };
}

/**
 * Gera string CSV com relatório de erros para download
 */
export function generateErrorReportCSV(invalidRows: EnrollmentRowError[]): string {
  const header = "Linha,Nome,Email,RA,Turma,Motivo do Erro\n";
  const rows = invalidRows
    .map((r) => {
      const escapedName = `"${(r.name || "").replace(/"/g, '""')}"`;
      const escapedEmail = `"${(r.email || "").replace(/"/g, '""')}"`;
      const escapedRA = `"${(r.ra || "").replace(/"/g, '""')}"`;
      const escapedTurma = `"${(r.turma || "").replace(/"/g, '""')}"`;
      const escapedReason = `"${(r.reason || "").replace(/"/g, '""')}"`;
      return `${r.rowNumber},${escapedName},${escapedEmail},${escapedRA},${escapedTurma},${escapedReason}`;
    })
    .join("\n");

  // Adiciona BOM UTF-8 para compatibilidade perfeita com Excel
  return `\uFEFF${header}${rows}`;
}
