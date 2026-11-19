import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
}

/**
 * Cabeçalho padrão para páginas do módulo B2B.
 * Design sóbrio, limpo e direto, sem emojis.
 */
export default function PageHeader({
  title,
  subtitle,
  badge,
  actions,
}: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "16px",
        marginBottom: "20px",
        paddingBottom: "14px",
        borderBottom: "1px solid var(--sinal)",
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: "240px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h1
            style={{
              fontFamily: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
              fontSize: "22px",
              fontWeight: 700,
              color: "var(--heading-color)",
              letterSpacing: "-0.01em",
              margin: 0,
            }}
          >
            {title}
          </h1>
          {badge && (
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "2px 8px",
                borderRadius: "9999px",
                background: "var(--pulso-dim)",
                color: "var(--pulso)",
                border: "1px solid var(--pulso)",
                fontWeight: 600,
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p
            style={{
              fontSize: "13px",
              color: "var(--chumbo)",
              marginTop: "4px",
              marginBottom: 0,
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexShrink: 0,
          }}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
