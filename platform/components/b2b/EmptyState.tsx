import React from "react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

/**
 * Estado vazio padrão institucional.
 * NUNCA exibe números falsos ou gráficos zerados sem aviso (Regra 6 da ESPEC).
 */
export default function EmptyState({
  title = "Sem dados disponíveis",
  description = "Nenhum registro encontrado para os filtros selecionados ou nenhuma atividade foi realizada neste período.",
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: compact ? "24px 16px" : "48px 24px",
        background: "var(--card-bg)",
        border: "1px dashed var(--sinal)",
        borderRadius: "var(--r-xl, 12px)",
        color: "var(--chumbo)",
      }}
    >
      <div
        style={{
          width: compact ? "36px" : "48px",
          height: compact ? "36px" : "48px",
          borderRadius: "50%",
          background: "var(--input-bg)",
          border: "1px solid var(--sinal)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: compact ? "8px" : "14px",
          color: "var(--chumbo)",
        }}
      >
        <svg
          width={compact ? "18" : "24"}
          height={compact ? "18" : "24"}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      </div>

      <h3
        style={{
          fontFamily: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
          fontSize: compact ? "14px" : "16px",
          fontWeight: 600,
          color: "var(--heading-color)",
          margin: 0,
          marginBottom: "6px",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: "12px",
          color: "var(--chumbo)",
          maxWidth: "380px",
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>

      {action && <div style={{ marginTop: "16px" }}>{action}</div>}
    </div>
  );
}
