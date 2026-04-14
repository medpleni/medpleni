import React from "react";

type ProgressVariant = "green" | "blue" | "warn" | "danger";

interface ProgressBarProps {
  value: number; // 0-100
  variant?: ProgressVariant;
  height?: number;
  style?: React.CSSProperties;
}

const fillGradients: Record<ProgressVariant, string> = {
  green: "linear-gradient(90deg, #00C2A8, #00e6ce)",
  blue: "linear-gradient(90deg, #0077B6, #3399d6)",
  warn: "linear-gradient(90deg, #F5A623, #f9c06a)",
  danger: "linear-gradient(90deg, #FF6B6B, #ff9090)",
};

export default function ProgressBar({
  value,
  variant = "green",
  height = 5,
  style,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  const trackStyle: React.CSSProperties = {
    height: `${height}px`,
    background: "rgba(61,90,128,0.2)",
    borderRadius: "9999px",
    overflow: "hidden",
    ...style,
  };

  const fillStyle: React.CSSProperties = {
    height: "100%",
    borderRadius: "9999px",
    width: `${clamped}%`,
    background: fillGradients[variant],
    transition: "width 1s ease",
  };

  return (
    <div style={trackStyle}>
      <div style={fillStyle} />
    </div>
  );
}
