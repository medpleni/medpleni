"use client";

import React, { useEffect, useState } from "react";

interface HeatmapCellProps {
  intensity: 0 | 1 | 2 | 3 | 4 | 5;
  tooltip?: string;
  style?: React.CSSProperties;
  /** Stagger delay index for entrance animation */
  delay?: number;
}

/**
 * Heatmap cell with 6 density levels (h0-h5).
 * rgba values extracted EXACTLY from design-system-medpleni.html and
 * medpleni-part3-dashboard.html.
 */

const intensityColors: Record<number, React.CSSProperties> = {
  0: { background: "rgba(61,90,128,0.12)" },
  1: { background: "rgba(0,194,168,0.12)" },
  2: { background: "rgba(0,194,168,0.25)" },
  3: { background: "rgba(0,194,168,0.45)" },
  4: { background: "rgba(0,194,168,0.70)" },
  5: { background: "#00C2A8" },
};

export default function HeatmapCell({
  intensity,
  tooltip,
  style,
  delay = 0,
}: HeatmapCellProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay * 30);
    return () => clearTimeout(timer);
  }, [delay]);

  const base: React.CSSProperties = {
    aspectRatio: "1",
    borderRadius: "3px",
    minWidth: "24px",
    cursor: "pointer",
    transition: "transform 0.15s, opacity 0.3s",
    opacity: visible ? 1 : 0,
    transform: visible ? "scale(1)" : "scale(0.6)",
    ...intensityColors[intensity] ?? intensityColors[0],
    ...style,
  };

  return <div style={base} title={tooltip} />;
}
