import React from "react";

interface IndicatorFootnoteProps {
  base: string; // Ex: "184 alunos que finalizaram a prova" ou "N = 42"
  periodo: string; // Ex: "2027.1" ou "Últimos 30 dias"
  fonte: string; // Ex: "Simulado Oficial ENAMED 8P" ou "Folhas de Resposta Digitalizadas"
  style?: React.CSSProperties;
}

/**
 * Rodapé obrigatório em todo indicador institucional do MedPleni B2B (Regra 6 e 8 da ESPEC).
 * Garante rastreabilidade acadêmica e rigor estatístico para CPA, NDE e MEC.
 */
export default function IndicatorFootnote({
  base,
  periodo,
  fonte,
  style,
}: IndicatorFootnoteProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontFamily: "var(--font-body), 'Inter', sans-serif",
        fontSize: "11px",
        color: "var(--chumbo)",
        marginTop: "12px",
        paddingTop: "8px",
        borderTop: "1px solid var(--border-subtle, rgba(78, 110, 155, 0.15))",
        flexWrap: "wrap",
        lineHeight: 1.4,
        ...style,
      }}
    >
      <span>
        <strong style={{ color: "var(--neblina)", fontWeight: 500 }}>Base:</strong> {base}
      </span>
      <span style={{ opacity: 0.5 }}>·</span>
      <span>
        <strong style={{ color: "var(--neblina)", fontWeight: 500 }}>Período:</strong> {periodo}
      </span>
      <span style={{ opacity: 0.5 }}>·</span>
      <span>
        <strong style={{ color: "var(--neblina)", fontWeight: 500 }}>Fonte:</strong> {fonte}
      </span>
    </div>
  );
}
