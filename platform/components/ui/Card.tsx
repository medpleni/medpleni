"use client";

import React from "react";

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  hoverable?: boolean;
}

export default function Card({
  children,
  style,
  className,
  hoverable = true,
}: CardProps) {
  const [hovered, setHovered] = React.useState(false);

  const base: React.CSSProperties = {
    background: "var(--card-bg)",
    border: "1px solid var(--card-border)",
    boxShadow: "var(--card-shadow)",
    borderRadius: "12px",
    padding: "18px",
    color: "var(--neblina)",
    transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s, background 0.2s",
    ...(hoverable && hovered
      ? {
          borderColor: "var(--pulso)",
          transform: "translateY(-2px)",
        }
      : {}),
    ...style,
  };

  return (
    <div
      style={base}
      className={className}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </div>
  );
}
