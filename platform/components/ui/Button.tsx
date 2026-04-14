"use client";

import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: "var(--pulso)",
    color: "#0a1a18",
    border: "none",
  },
  secondary: {
    background: "transparent",
    color: "var(--pulso)",
    border: "1.5px solid var(--pulso)",
  },
  ghost: {
    background: "transparent",
    color: "var(--neblina)",
    border: "1.5px solid rgba(61,90,128,0.6)",
  },
  danger: {
    background: "rgba(255,107,107,0.12)",
    color: "var(--danger)",
    border: "1.5px solid rgba(255,107,107,0.3)",
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    padding: "6px 14px",
    fontSize: "12px",
    borderRadius: "6px",
  },
  md: {
    padding: "10px 22px",
    fontSize: "13px",
    borderRadius: "8px",
  },
  lg: {
    padding: "13px 28px",
    fontSize: "15px",
    borderRadius: "10px",
  },
};

export default function Button({
  variant = "primary",
  size = "md",
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: ButtonProps) {
  const [hovered, setHovered] = React.useState(false);

  const hoverStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: "#00d4b8",
      transform: "translateY(-1px)",
      boxShadow: "0 4px 20px rgba(0,194,168,0.35)",
    },
    secondary: {
      background: "rgba(0,194,168,0.08)",
    },
    ghost: {
      borderColor: "var(--neblina)",
    },
    danger: {
      background: "rgba(255,107,107,0.2)",
    },
  };

  const base: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
    letterSpacing: "0.02em",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.18s",
    outline: "none",
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...(hovered ? hoverStyles[variant] : {}),
    ...style,
  };

  return (
    <button
      style={base}
      onMouseEnter={(e) => {
        setHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        onMouseLeave?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
