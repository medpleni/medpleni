import React from "react";

interface TopbarProps {
  title?: string;
  badgeText?: string;
  actions?: React.ReactNode;
}

export default function Topbar({
  title = "Meu Dashboard",
  badgeText = "RESID · HSP 2026",
  actions,
}: TopbarProps) {
  /* Estilos extraídos de .topbar no medpleni-part3-dashboard.html */
  const topbarStyle: React.CSSProperties = {
    height: "52px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    borderBottom: "1px solid rgba(61,90,128,0.2)",
    background: "#0D111C",
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
    fontSize: "18px",
    fontWeight: 700,
    color: "#fff",
    letterSpacing: "-0.01em",
  };

  const rightStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  };

  const badgeStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "9px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "3px 9px",
    borderRadius: "9999px",
    background: "rgba(0,194,168,0.1)",
    color: "var(--pulso)",
    border: "1px solid rgba(0,194,168,0.2)",
  };

  const iconBtnStyle: React.CSSProperties = {
    width: "32px",
    height: "32px",
    borderRadius: "var(--r-md)",
    background: "rgba(61,90,128,0.15)",
    border: "1px solid rgba(61,90,128,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "var(--chumbo)",
  };

  return (
    <div style={topbarStyle}>
      <div style={titleStyle}>{title}</div>
      <div style={rightStyle}>
        {badgeText && <span style={badgeStyle}>{badgeText}</span>}
        {actions || (
          <>
            {/* User icon */}
            <button style={iconBtnStyle} aria-label="Perfil">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle
                  cx="8"
                  cy="5"
                  r="2.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path
                  d="M3 13c0-2.8 2.2-5 5-5s5 2.2 5 5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            {/* Bell icon */}
            <button style={iconBtnStyle} aria-label="Notificações">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M13 11V6a5 5 0 00-10 0v5l-1.5 2h13L13 11z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path
                  d="M6.5 13a1.5 1.5 0 003 0"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
