import React from "react";

export type ScoreBandType = "critico" | "zona_decisao" | "proficiente" | "excelente";

export interface ScoreBandInfo {
  band: ScoreBandType;
  label: string;
  rangeLabel: string;
  color: string;
  bg: string;
  borderColor: string;
}

/**
 * Classifica uma nota nas 4 faixas aprovadas pelos médicos (seção 4.3 da ESPEC).
 * Régua 60 configurável por instituição (padrão cutScore = 60).
 */
export function getScoreBand(score: number, cutScore = 60): ScoreBandInfo {
  // Faixa 1: Até 50%
  if (score <= 50) {
    return {
      band: "critico",
      label: "Abaixo de 50",
      rangeLabel: "≤ 50%",
      color: "var(--danger, #DC2626)",
      bg: "var(--danger-bg, rgba(220, 38, 38, 0.1))",
      borderColor: "var(--danger, #DC2626)",
    };
  }

  // Faixa 2: Entre 51% e o corte (padrão 60%) — "Zona de Decisão" (Dr. Filipe)
  if (score <= cutScore) {
    return {
      band: "zona_decisao",
      label: `Zona de Decisão (51–${cutScore})`,
      rangeLabel: `51–${cutScore}%`,
      color: "var(--warn, #D97706)",
      bg: "var(--warn-bg, rgba(217, 119, 6, 0.1))",
      borderColor: "var(--warn, #D97706)",
    };
  }

  // Faixa 3: Entre corte + 1 e 70% (padrão 61–70%)
  if (score <= 70) {
    return {
      band: "proficiente",
      label: `${cutScore + 1}–70%`,
      rangeLabel: `${cutScore + 1}–70%`,
      color: "#0077B6",
      bg: "rgba(0, 119, 182, 0.1)",
      borderColor: "#0077B6",
    };
  }

  // Faixa 4: 71% ou mais (Excelente)
  return {
    band: "excelente",
    label: "≥ 71%",
    rangeLabel: "≥ 71%",
    color: "var(--success, #16A34A)",
    bg: "var(--success-bg, rgba(22, 163, 74, 0.1))",
    borderColor: "var(--success, #16A34A)",
  };
}

interface ScoreBandProps {
  score: number;
  cutScore?: number;
  showRange?: boolean;
  size?: "sm" | "md";
}

/**
 * Chip/Pill visual padronizado para representar as 4 faixas de notas.
 */
export default function ScoreBand({
  score,
  cutScore = 60,
  showRange = false,
  size = "md",
}: ScoreBandProps) {
  const info = getScoreBand(score, cutScore);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: size === "sm" ? "10px" : "11px",
        fontWeight: 600,
        color: info.color,
        background: info.bg,
        border: `1px solid ${info.borderColor}`,
        borderRadius: "9999px",
        padding: size === "sm" ? "2px 7px" : "3px 10px",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
      title={`${info.label} (Corte institucional: ${cutScore}%)`}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: info.color,
          flexShrink: 0,
        }}
      />
      <span>{score.toFixed(1)}%</span>
      {showRange && (
        <span style={{ opacity: 0.7, fontSize: "9px" }}>({info.rangeLabel})</span>
      )}
    </span>
  );
}

/**
 * Legenda explicativa das 4 faixas para rodapés de gráficos e heatmaps.
 */
export function ScoreBandLegend({ cutScore = 60 }: { cutScore?: number }) {
  const bands = [
    getScoreBand(40, cutScore),
    getScoreBand(55, cutScore),
    getScoreBand(65, cutScore),
    getScoreBand(85, cutScore),
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flexWrap: "wrap",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "10px",
        color: "var(--chumbo)",
      }}
    >
      <span style={{ fontWeight: 600, color: "var(--heading-color)" }}>Faixas:</span>
      {bands.map((b) => (
        <div key={b.band} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "2px",
              background: b.color,
            }}
          />
          <span>{b.rangeLabel}</span>
        </div>
      ))}
    </div>
  );
}
