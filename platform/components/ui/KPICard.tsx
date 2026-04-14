import React from "react";

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  delta?: string;
  deltaDirection?: "up" | "down" | "neutral";
  iconBg?: string;
  valueColor?: string;
  style?: React.CSSProperties;
}

export default function KPICard({
  icon,
  label,
  value,
  delta,
  deltaDirection = "up",
  iconBg = "rgba(0,194,168,0.1)",
  valueColor = "#fff",
  style,
}: KPICardProps) {
  const cardStyle: React.CSSProperties = {
    background: "var(--petroleo)",
    border: "1px solid rgba(61,90,128,0.25)",
    borderRadius: "var(--r-xl)",
    padding: "16px",
    ...style,
  };

  const topStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
  };

  const iconStyle: React.CSSProperties = {
    width: "32px",
    height: "32px",
    borderRadius: "var(--r-md)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: iconBg,
  };

  const deltaColors: Record<string, string> = {
    up: "var(--pulso)",
    down: "var(--danger)",
    neutral: "var(--chumbo)",
  };

  const deltaStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "10px",
    letterSpacing: "0.06em",
    color: deltaColors[deltaDirection],
  };

  const numStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Sans Condensed', sans-serif",
    fontSize: "28px",
    fontWeight: 700,
    color: valueColor,
    letterSpacing: "-0.02em",
    lineHeight: 1,
  };

  const lblStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "var(--chumbo)",
    marginTop: "4px",
  };

  return (
    <div style={cardStyle}>
      <div style={topStyle}>
        <div style={iconStyle}>{icon}</div>
        {delta && <span style={deltaStyle}>{delta}</span>}
      </div>
      <div style={numStyle}>{value}</div>
      <div style={lblStyle}>{label}</div>
    </div>
  );
}
