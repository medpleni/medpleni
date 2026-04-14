"use client";

import React, { useEffect, useState } from "react";

interface ScoreRingProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}

export default function ScoreRing({
  score,
  size = 130,
  strokeWidth = 14,
  label,
  sublabel,
  color = "#00C2A8",
}: ScoreRingProps) {
  const [animatedOffset, setAnimatedOffset] = useState<number | null>(null);

  const viewBox = 140;
  const center = viewBox / 2;
  const radius = 58;
  const circumference = 2 * Math.PI * radius; // ~364.4
  const targetOffset = circumference * (1 - score / 100);

  useEffect(() => {
    // Animate from full offset to target
    const timer = setTimeout(() => {
      setAnimatedOffset(targetOffset);
    }, 100);
    return () => clearTimeout(timer);
  }, [targetOffset]);

  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: `${size}px`,
    height: `${size}px`,
  };

  const textWrapStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
  };

  const numStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: `${Math.round(size * 0.2)}px`,
    fontWeight: 400,
    color: "#ffffff",
    lineHeight: 1,
  };

  const pctStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: `${Math.round(size * 0.085)}px`,
    color,
  };

  const sublabelStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: `${Math.round(size * 0.065)}px`,
    color: "#8A9AB5",
    marginTop: "2px",
  };

  return (
    <div style={containerStyle}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${viewBox} ${viewBox}`}
        fill="none"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(61,90,128,0.2)"
          strokeWidth={strokeWidth}
        />
        {/* Score fill */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset ?? circumference}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
        />
      </svg>
      <div style={textWrapStyle}>
        <span style={numStyle}>{score.toFixed(1)}</span>
        <span style={pctStyle}>%</span>
        {sublabel && <span style={sublabelStyle}>{sublabel}</span>}
      </div>
    </div>
  );
}
