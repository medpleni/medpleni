/**
 * MEDPLENI B2B — taxonomy-csv.ts
 * Funções puras de parse e exportação de CSV para as 4 listas taxonômicas.
 * Seguro para uso em Client Components (zero dependências de servidor).
 */

import type { ParsedTaxRow } from "./taxonomy-types";

/**
 * Faz parse de CSV para qualquer uma das 4 listas taxonômicas
 */
export function parseTaxonomyCSV(csvContent: string): ParsedTaxRow[] {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) return [];

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0]
    .split(delimiter)
    .map((h) => h.toLowerCase().trim().replace(/^["']|["']$/g, ""));

  const codeIdx = headers.findIndex((h) => h.includes("cod") || h.includes("sigla") || h === "id");
  const nameIdx = headers.findIndex((h) => h.includes("nome") || h.includes("name") || h.includes("titulo"));
  const descIdx = headers.findIndex((h) => h.includes("desc") || h.includes("detalhe"));
  const colorIdx = headers.findIndex((h) => h.includes("cor") || h.includes("hex"));
  const orderIdx = headers.findIndex((h) => h.includes("ordem") || h.includes("order"));
  const stageIdx = headers.findIndex((h) => h.includes("etapa") || h.includes("stage"));
  const areaCodeIdx = headers.findIndex((h) => h.includes("area"));
  const parentCodeIdx = headers.findIndex((h) => h.includes("pai") || h.includes("parent"));

  const rows: ParsedTaxRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const code = codeIdx >= 0 ? cols[codeIdx] : cols[0];
    const name = nameIdx >= 0 ? cols[nameIdx] : cols[1];

    if (!code || !name) continue;

    rows.push({
      code: code.trim(),
      name: name.trim(),
      description: descIdx >= 0 ? cols[descIdx]?.trim() : undefined,
      color_hex: colorIdx >= 0 ? cols[colorIdx]?.trim() : undefined,
      order_index: orderIdx >= 0 && cols[orderIdx] ? parseInt(cols[orderIdx], 10) : undefined,
      enamed_stage: stageIdx >= 0 ? cols[stageIdx]?.trim() : undefined,
      area_code: areaCodeIdx >= 0 ? cols[areaCodeIdx]?.trim() : undefined,
      parent_code: parentCodeIdx >= 0 ? cols[parentCodeIdx]?.trim() : undefined,
    });
  }

  return rows;
}

/**
 * Gera string CSV formatada para exportação
 */
export function exportTaxonomyToCSV(
  type: "areas" | "cenarios" | "temas" | "competencias",
  items: any[]
): string {
  let header = "";
  let rows: string[] = [];

  if (type === "areas") {
    header = "Codigo,Nome,Cor,Ordem,Etapa\n";
    rows = items.map(
      (a) => `"${a.code}","${a.name}","${a.color_hex || ""}","${a.order_index}","${a.enamed_stage}"`
    );
  } else if (type === "cenarios" || type === "competencias") {
    header = "Codigo,Nome,Descricao\n";
    rows = items.map((i) => `"${i.code}","${i.name}","${(i.description || "").replace(/"/g, '""')}"`);
  } else if (type === "temas") {
    header = "Area_Codigo,Codigo,Nome,Tema_Pai_Codigo\n";
    rows = items.map(
      (t) => `"${t.area_id}","${t.code}","${t.name}","${t.parent_id || ""}"`
    );
  }

  return `\uFEFF${header}${rows.join("\n")}`;
}
