"use client";

import React, { useState, useRef } from "react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom";
}

export default function Tooltip({
  content,
  children,
  position = "top",
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const wrapperStyle: React.CSSProperties = {
    position: "relative",
    display: "inline-flex",
  };

  const tooltipStyle: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    ...(position === "top"
      ? { bottom: "calc(100% + 8px)" }
      : { top: "calc(100% + 8px)" }),
    background: "#0D111C",
    border: "1px solid rgba(61,90,128,0.4)",
    borderRadius: "6px",
    padding: "6px 10px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "10px",
    letterSpacing: "0.04em",
    color: "var(--neblina)",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    opacity: visible ? 1 : 0,
    transition: "opacity 0.15s",
    zIndex: 50,
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
  };

  return (
    <div
      ref={triggerRef}
      style={wrapperStyle}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <div style={tooltipStyle}>{content}</div>
    </div>
  );
}
