"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import BottomNav from "./BottomNav";

interface PageShellProps {
  children: React.ReactNode;
  title?: string;
  badgeText?: string;
  activeNavId?: string;
  onNavigate?: (id: string) => void;
}

/* ── Default nav sections with SVG icons from the dashboard HTML ── */
const defaultSections = [
  {
    label: "Principal",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: (
          <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
            <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        ),
      },
      {
        id: "simulados",
        label: "Simulados",
        icon: (
          <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
            <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        id: "questoes",
        label: "Questões",
        icon: (
          <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
            <path d="M3 4h10M3 8h10M3 12h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        id: "predicao",
        label: "Predição",
        icon: (
          <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
            <path d="M3 12V5l5-3 5 3v7H3z" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        ),
      },
      {
        id: "flashcards",
        label: "Flashcards",
        icon: (
          <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
            <rect x="3" y="4" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M5 2h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        id: "cronograma",
        label: "Cronograma",
        icon: (
          <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
            <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M2 7h12" stroke="currentColor" strokeWidth="1.2" />
            <path d="M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Sub-brands",
    items: [
      {
        id: "resid",
        label: "RESID",
        icon: (
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#0077B6",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
        ),
      },
      {
        id: "enamed",
        label: "ENAMED",
        icon: (
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#00C2A8",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
        ),
      },
      {
        id: "revalida",
        label: "REVALIDA",
        icon: (
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#6B5CE7",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
        ),
      },
    ],
  },
];

export default function PageShell({
  children,
  title = "Meu Dashboard",
  badgeText = "RESID · HSP 2026",
  activeNavId = "dashboard",
  onNavigate,
}: PageShellProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ── Dashboard shell from medpleni-part3-dashboard.html ── */
  const shellStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    background: "#0D111C",
  };

  const layoutStyle: React.CSSProperties = {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  };

  const mainAreaStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    padding: isMobile ? "16px" : "20px 24px",
    paddingBottom: isMobile ? "76px" : "20px",
    overflowY: "auto",
    background: "var(--abismo)",
  };

  return (
    <div style={shellStyle}>
      <div style={layoutStyle}>
        {/* Sidebar — desktop only */}
        {!isMobile && (
          <Sidebar
            sections={defaultSections}
            activeId={activeNavId}
            onNavigate={onNavigate}
          />
        )}

        {/* Main area */}
        <div style={mainAreaStyle}>
          <Topbar title={title} badgeText={badgeText} />
          <div style={contentStyle}>{children}</div>
        </div>
      </div>

      {/* BottomNav — mobile only */}
      {isMobile && (
        <BottomNav activeId={activeNavId} onNavigate={onNavigate} />
      )}
    </div>
  );
}
