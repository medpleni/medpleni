"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  success?: boolean;
}

export default function Input({
  label,
  hint,
  error,
  success,
  disabled,
  onFocus,
  onBlur,
  style,
  ...rest
}: InputProps) {
  const [focused, setFocused] = React.useState(false);

  const groupStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "10px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--chumbo)",
  };

  const getBorderColor = () => {
    if (error) return "var(--danger)";
    if (success) return "var(--pulso)";
    if (focused) return "var(--pulso)";
    return "rgba(61,90,128,0.5)";
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: focused ? "rgba(43,58,82,0.9)" : "rgba(43,58,82,0.6)",
    border: `1.5px solid ${getBorderColor()}`,
    borderRadius: "8px",
    padding: "10px 14px",
    color: disabled ? "var(--chumbo)" : "var(--neblina)",
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.18s, background 0.18s",
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "not-allowed" : "text",
    ...style,
  };

  const hintStyle: React.CSSProperties = {
    fontSize: "11px",
    color: error ? "var(--danger)" : "var(--chumbo)",
    marginTop: "2px",
  };

  return (
    <div style={groupStyle}>
      {label && <label style={labelStyle}>{label}</label>}
      <input
        style={inputStyle}
        disabled={disabled}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {(error || hint) && (
        <span style={hintStyle}>{error || hint}</span>
      )}
    </div>
  );
}
