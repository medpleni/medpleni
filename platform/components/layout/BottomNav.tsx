"use client";

import React from "react";

interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface BottomNavProps {
  items?: BottomNavItem[];
  activeId?: string;
  onNavigate?: (id: string) => void;
}

/* ── Default nav items ── */
const defaultItems: BottomNavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
        <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
  },
  {
    id: "questoes",
    label: "Questões",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <path d="M3 4h10M3 8h10M3 12h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "simulados",
    label: "Simulados",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "predicao",
    label: "Predição",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <path d="M2 12V7l3-2 3 2 3-3 3 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "perfil",
    label: "Perfil",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M3 13c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function BottomNav({
  items = defaultItems,
  activeId = "dashboard",
  onNavigate,
}: BottomNavProps) {
  const navStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    height: "60px",
    background: "rgba(13,17,28,0.96)",
    backdropFilter: "blur(12px)",
    borderTop: "1px solid rgba(61,90,128,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
    padding: "0 8px",
    paddingBottom: "env(safe-area-inset-bottom, 0)",
  };

  const getItemStyle = (isActive: boolean): React.CSSProperties => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "3px",
    padding: "6px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    color: isActive ? "var(--pulso)" : "var(--chumbo)",
    background: isActive ? "rgba(0,194,168,0.07)" : "transparent",
    transition: "all 0.15s",
    border: "none",
    fontFamily: "inherit",
    fontSize: "9px",
    fontWeight: isActive ? 600 : 400,
    letterSpacing: "0.04em",
  });

  return (
    <nav style={navStyle}>
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            style={getItemStyle(isActive)}
            onClick={() => onNavigate?.(item.id)}
            aria-label={item.label}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
