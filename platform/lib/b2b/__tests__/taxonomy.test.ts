import { describe, it, expect } from "vitest";
import { parseTaxonomyCSV, exportTaxonomyToCSV } from "../taxonomy";

describe("Taxonomy Parser and Exporter", () => {
  it("parses CSV lines for areas correctly", () => {
    const csv = `Codigo,Nome,Cor,Ordem,Etapa
CM,Clínica Médica,#00C2A8,1,etapa_2_3
CG,Cirurgia Geral,#0077B6,2,etapa_2_3
CB01,Biologia Celular,#AAAAAA,1,etapa_1_ciclo_basico`;

    const rows = parseTaxonomyCSV(csv);
    expect(rows.length).toBe(3);
    expect(rows[0].code).toBe("CM");
    expect(rows[0].name).toBe("Clínica Médica");
    expect(rows[0].order_index).toBe(1);
    expect(rows[0].enamed_stage).toBe("etapa_2_3");
    expect(rows[2].enamed_stage).toBe("etapa_1_ciclo_basico");
  });

  it("parses CSV lines for cenários and competências with descriptions", () => {
    const csv = `Codigo;Nome;Descricao
APS;Atenção Primária à Saúde;Unidades Básicas e ESF
HOSP;Atenção Terciária e Hospitalar;Enfermarias e UTI`;

    const rows = parseTaxonomyCSV(csv);
    expect(rows.length).toBe(2);
    expect(rows[0].code).toBe("APS");
    expect(rows[0].description).toBe("Unidades Básicas e ESF");
  });

  it("exports areas to CSV with BOM UTF-8", () => {
    const areas = [
      { code: "CM", name: "Clínica Médica", color_hex: "#00C2A8", order_index: 1, enamed_stage: "etapa_2_3" },
      { code: "CG", name: "Cirurgia Geral", color_hex: "#0077B6", order_index: 2, enamed_stage: "etapa_2_3" },
    ];

    const exported = exportTaxonomyToCSV("areas", areas);
    expect(exported.startsWith("\uFEFFCodigo,Nome,Cor,Ordem,Etapa")).toBe(true);
    expect(exported).toContain('"CM"');
    expect(exported).toContain('"Cirurgia Geral"');
  });

  it("handles empty or single header line safely", () => {
    expect(parseTaxonomyCSV("")).toEqual([]);
    expect(parseTaxonomyCSV("Codigo,Nome")).toEqual([]);
  });
});
