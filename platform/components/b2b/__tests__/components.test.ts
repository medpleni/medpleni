import { describe, it, expect } from "vitest";
import { getScoreBand } from "../ScoreBand";

describe("components/b2b/ScoreBand — Classificação nas 4 Faixas Médicas", () => {
  it("deve classificar nota ≤ 50% como faixa 'critico'", () => {
    const res = getScoreBand(48.5, 60);
    expect(res.band).toBe("critico");
    expect(res.rangeLabel).toBe("≤ 50%");
  });

  it("deve classificar nota exatamente em 50% como 'critico'", () => {
    const res = getScoreBand(50, 60);
    expect(res.band).toBe("critico");
  });

  it("deve classificar nota entre 51% e o corte como 'zona_decisao' (Dr. Filipe)", () => {
    const res1 = getScoreBand(51, 60);
    expect(res1.band).toBe("zona_decisao");
    expect(res1.label).toContain("Zona de Decisão");

    const res2 = getScoreBand(60, 60);
    expect(res2.band).toBe("zona_decisao");
  });

  it("deve respeitar cutScore customizado para a Zona de Decisão (ex: corte 65%)", () => {
    const res = getScoreBand(63, 65);
    expect(res.band).toBe("zona_decisao");
    expect(res.rangeLabel).toBe("51–65%");
  });

  it("deve classificar nota entre corte + 1 e 70% como 'proficiente'", () => {
    const res = getScoreBand(68.4, 60);
    expect(res.band).toBe("proficiente");
    expect(res.rangeLabel).toBe("61–70%");
  });

  it("deve classificar nota ≥ 71% como 'excelente'", () => {
    const res1 = getScoreBand(71, 60);
    expect(res1.band).toBe("excelente");
    expect(res1.rangeLabel).toBe("≥ 71%");

    const res2 = getScoreBand(95.0, 60);
    expect(res2.band).toBe("excelente");
  });
});
