"use client";

import React from "react";

export interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  isSpecial?: boolean;
}

interface BottomNavProps {
  items?: BottomNavItem[];
  activeId?: string;
  onNavigate?: (id: string) => void;
  onOpenMenu?: () => void;
}

/* ── 5 Ações Principais de Alta Frequência no Mobile ── */
const defaultItems: BottomNavItem[] = [
  {
    id: "dashboard",
    label: "Início",
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    id: "aulas",
    label: "Aulas",
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
        <path d="M2 4l6-2 6 2v6l-6 3-6-3V4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M8 2v11M2 4l6 3 6-3" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
  },
  {
    id: "ia-medica",
    label: "Dr. Pleni",
    isSpecial: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "simulados",
    label: "Simulados",
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "menu",
    label: "Mais",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </svg>
    ),
  },
];

export default function BottomNav({
  items = defaultItems,
  activeId = "dashboard",
  onNavigate,
  onOpenMenu,
}: BottomNavProps) {
  const navStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: "calc(62px + env(safe-area-inset-bottom, 0px))",
    background: "var(--card-bg)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderTop: "1px solid var(--card-border)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-around",
    paddingTop: "6px",
    paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)",
    boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.08)",
  };

  const handleItemClick = (id: string) => {
    if (id === "menu") {
      if (onOpenMenu) {
        onOpenMenu();
      } else {
        onNavigate?.(id);
      }
    } else {
      onNavigate?.(id);
    }
  };

  return (
    <nav style={navStyle} className="mobile-bottom-nav">
      {items.map((item) => {
        const isActive = item.id === activeId;

        // Botão Destaque Central: Dr. Pleni IA
        if (item.isSpecial) {
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              aria-label="Preceptor Dr. Pleni IA"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "0 6px",
                position: "relative",
                top: "-8px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "14px",
                  background: isActive
                    ? "linear-gradient(135deg, var(--pulso), #00897B)"
                    : "linear-gradient(135deg, var(--pulso-dim), rgba(0,194,168,0.25))",
                  border: isActive ? "2px solid #FFFFFF" : "1.5px solid var(--pulso)",
                  color: isActive ? "#FFFFFF" : "var(--pulso)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: isActive
                    ? "0 6px 16px rgba(0,194,168,0.4)"
                    : "0 4px 10px rgba(0,194,168,0.18)",
                  transition: "all 0.2s ease",
                }}
              >
                {item.icon}
              </div>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  marginTop: "2px",
                  color: isActive ? "var(--pulso)" : "var(--chumbo)",
                  letterSpacing: "0.02em",
                }}
              >
                {item.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => handleItemClick(item.id)}
            aria-label={item.label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              minWidth: "56px",
              minHeight: "44px",
              padding: "4px 8px",
              borderRadius: "8px",
              cursor: "pointer",
              color: isActive ? "var(--pulso)" : "var(--chumbo)",
              background: isActive ? "var(--pulso-dim)" : "transparent",
              transition: "all 0.15s ease",
              border: "none",
              fontFamily: "inherit",
              fontSize: "10px",
              fontWeight: isActive ? 700 : 500,
              letterSpacing: "0.02em",
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
