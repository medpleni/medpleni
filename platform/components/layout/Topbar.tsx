"use client";

import React from "react";
import Link from "next/link";
import { useTheme } from "@/lib/theme-context";

interface TopbarProps {
  title?: string;
  badgeText?: string;
  actions?: React.ReactNode;
  onOpenMenu?: () => void;
}

export default function Topbar({
  title = "Meu Dashboard",
  badgeText = "ENAMED · 2027",
  actions,
  onOpenMenu,
}: TopbarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      style={{
        minHeight: "54px",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        paddingTop: "max(env(safe-area-inset-top, 0px), 4px)",
        borderBottom: "1px solid var(--sinal)",
        background: "var(--topbar-bg)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        transition: "background 0.2s ease, border-color 0.2s ease",
        zIndex: 50,
      }}
      className="mobile-topbar"
    >
      <style>{`
        .mobile-hamburger-btn {
          display: none;
        }
        @media (max-width: 768px) {
          .mobile-hamburger-btn {
            display: flex !important;
          }
          .mobile-topbar {
            padding: 0 12px !important;
          }
          .mobile-topbar-title {
            font-size: 15px !important;
          }
          .mobile-topbar-badge {
            display: none !important;
          }
        }
      `}</style>

      {/* Lado Esquerdo: Hambúrguer Mobile + Título */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
        {onOpenMenu && (
          <button
            onClick={onOpenMenu}
            className="mobile-hamburger-btn"
            aria-label="Abrir menu de navegação"
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "8px",
              background: "var(--input-bg)",
              border: "1px solid var(--sinal)",
              color: "var(--heading-color)",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        )}

        <h1
          className="mobile-topbar-title"
          style={{
            fontFamily: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
            fontSize: "18px",
            fontWeight: 700,
            color: "var(--heading-color)",
            letterSpacing: "-0.01em",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </h1>
      </div>

      {/* Lado Direito: Badge + Ações / Tema */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        {badgeText && (
          <span
            className="mobile-topbar-badge"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "3px 9px",
              borderRadius: "9999px",
              background: "var(--pulso-dim)",
              color: "var(--pulso)",
              border: "1px solid var(--pulso)",
            }}
          >
            {badgeText}
          </span>
        )}

        {/* Botão de Alternância de Tema (Claro / Escuro) */}
        <button
          onClick={toggleTheme}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "var(--r-md)",
            background: "var(--input-bg)",
            border: "1px solid var(--sinal)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: theme === "dark" ? "#F5A623" : "#6B5CE7",
            transition: "all 0.15s ease",
          }}
          title={theme === "dark" ? "Mudar para Tema Claro" : "Mudar para Tema Escuro"}
          aria-label="Alternar tema claro/escuro"
        >
          {theme === "dark" ? (
            /* Ícone Sol */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {actions || (
          <>
            {/* User icon */}
            <Link
              href="/perfil"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--r-md)",
                background: "var(--input-bg)",
                border: "1px solid var(--sinal)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--chumbo)",
                textDecoration: "none",
              }}
              aria-label="Perfil"
              title="Meu Perfil"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M3 13c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
