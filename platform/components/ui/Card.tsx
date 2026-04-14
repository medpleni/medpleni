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
    background: "var(--petroleo)",
    border: "1px solid rgba(61,90,128,0.25)",
    borderRadius: "12px",
    padding: "18px",
    transition: "border-color 0.2s, transform 0.2s",
    ...(hoverable && hovered
      ? {
          borderColor: "rgba(0,194,168,0.3)",
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
