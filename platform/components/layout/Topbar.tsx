"use client";

import React from "react";
import Link from "next/link";
import { useTheme } from "@/lib/theme-context";

interface TopbarProps {
  title?: string;
  badgeText?: string;
  actions?: React.ReactNode;
}

export default function Topbar({
  title = "Meu Dashboard",
  badgeText = "ENAMED · 2027",
  actions,
}: TopbarProps) {
  const { theme, toggleTheme } = useTheme();

  const topbarStyle: React.CSSProperties = {
    height: "52px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    borderBottom: "1px solid var(--sinal)",
    background: "var(--topbar-bg)",
    backdropFilter: "blur(10px)",
    transition: "background 0.2s ease, border-color 0.2s ease",
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
    fontSize: "18px",
    fontWeight: 700,
    color: "var(--heading-color)",
    letterSpacing: "-0.01em",
  };

  const rightStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  };

  const badgeStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "9px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "3px 9px",
    borderRadius: "9999px",
    background: "var(--pulso-dim)",
    color: "var(--pulso)",
    border: "1px solid var(--pulso)",
  };

  const iconBtnStyle: React.CSSProperties = {
    width: "32px",
    height: "32px",
    borderRadius: "var(--r-md)",
    background: "var(--input-bg)",
    border: "1px solid var(--sinal)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "var(--chumbo)",
    textDecoration: "none",
    transition: "all 0.15s ease",
  };

  return (
    <div style={topbarStyle}>
      <div style={titleStyle}>{title}</div>
      <div style={rightStyle}>
        {badgeText && <span style={badgeStyle}>{badgeText}</span>}

        {/* Botão de Alternância de Tema (Claro / Escuro) */}
        <button
          onClick={toggleTheme}
          style={{
            ...iconBtnStyle,
            color: theme === "dark" ? "#F5A623" : "#6B5CE7",
          }}
          title={theme === "dark" ? "Mudar para Tema Claro" : "Mudar para Tema Escuro"}
          aria-label="Alternar tema claro/escuro"
        >
          {theme === "dark" ? (
            /* Ícone Sol */
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            /* Ícone Lua */
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {actions || (
          <>
            {/* User icon */}
            <Link href="/perfil" style={iconBtnStyle} aria-label="Perfil" title="Meu Perfil">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M3 13c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </Link>

            {/* Bell icon */}
            <button style={iconBtnStyle} aria-label="Notificações" title="Notificações">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M13 11V6a5 5 0 00-10 0v5l-1.5 2h13L13 11z" stroke="currentColor" strokeWidth="1.3" />
                <path d="M6.5 13a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
