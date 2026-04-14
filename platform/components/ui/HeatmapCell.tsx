import React from "react";

interface HeatmapCellProps {
  intensity: 0 | 1 | 2 | 3 | 4 | 5;
  tooltip?: string;
  style?: React.CSSProperties;
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
}: HeatmapCellProps) {
  const base: React.CSSProperties = {
    aspectRatio: "1",
    borderRadius: "3px",
    minWidth: "24px",
    cursor: "pointer",
    transition: "transform 0.1s",
    ...intensityColors[intensity] ?? intensityColors[0],
    ...style,
  };

  return <div style={base} title={tooltip} />;
}
