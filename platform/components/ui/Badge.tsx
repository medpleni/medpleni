import React from "react";

type BadgeVariant = "green" | "blue" | "purple" | "warn" | "danger" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  green: {
    background: "rgba(0,194,168,0.15)",
    color: "var(--pulso)",
  },
  blue: {
    background: "rgba(0,119,182,0.15)",
    color: "#64B5E8",
  },
  purple: {
    background: "rgba(107,92,231,0.15)",
    color: "#A99EF5",
  },
  warn: {
    background: "rgba(245,166,35,0.12)",
    color: "var(--warn)",
  },
  danger: {
    background: "rgba(255,107,107,0.12)",
    color: "var(--danger)",
  },
  neutral: {
    background: "rgba(138,154,181,0.12)",
    color: "var(--chumbo)",
  },
};

export default function Badge({
  variant = "green",
  children,
  style,
}: BadgeProps) {
  const base: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "10px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "3px 10px",
    borderRadius: "20px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    ...variantStyles[variant],
    ...style,
  };

  const dotStyle: React.CSSProperties = {
    width: "5px",
    height: "5px",
    borderRadius: "50%",
    background: "currentColor",
    flexShrink: 0,
  };

  return (
    <span style={base}>
      <span style={dotStyle} />
      {children}
    </span>
  );
}
