"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/supabase/use-user";
import { useTheme } from "@/lib/theme-context";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeId?: string;
  userName?: string;
  userRole?: string;
  userInitials?: string;
}

export default function MobileDrawer({
  isOpen,
  onClose,
  activeId = "dashboard",
  userName = "Dra. Camila S.",
  userRole = "ENAMED · 2027",
  userInitials = "CS",
}: MobileDrawerProps) {
  const router = useRouter();
  const { signOut } = useUser();
  const { theme, toggleTheme } = useTheme();

  // Fecha no Esc e trava scroll do body quando aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose]);

  const handleNavigate = (path: string) => {
    onClose();
    router.push(path);
  };

  const navItems = [
    {
      label: "Principal",
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          href: "/dashboard",
          icon: (
            <svg viewBox="0 0 16 16" fill="none" width="18" height="18">
              <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          ),
        },
        {
          id: "aulas",
          label: "Sala de Aula & Revisão",
          badge: "378 temas",
          href: "/aulas",
          icon: (
            <svg viewBox="0 0 16 16" fill="none" width="18" height="18">
              <path d="M2 4l6-2 6 2v6l-6 3-6-3V4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M8 2v11M2 4l6 3 6-3" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          ),
        },
        {
          id: "ia-medica",
          label: "Preceptor Dr. Pleni",
          badge: "IA 24/7",
          href: "/ia-medica",
          icon: (
            <svg viewBox="0 0 16 16" fill="none" width="18" height="18">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
              <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          ),
        },
        {
          id: "simulados",
          label: "Hub de Simulados",
          href: "/simulados",
          icon: (
            <svg viewBox="0 0 16 16" fill="none" width="18" height="18">
              <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          ),
        },
        {
          id: "questoes",
          label: "Banco de Questões",
          href: "/questoes",
          icon: (
            <svg viewBox="0 0 16 16" fill="none" width="18" height="18">
              <path d="M3 4h10M3 8h10M3 12h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          ),
        },
        {
          id: "predicao",
          label: "Predição ENAMED",
          href: "/predicao",
          icon: (
            <svg viewBox="0 0 16 16" fill="none" width="18" height="18">
              <path d="M3 12V5l5-3 5 3v7H3z" stroke="currentColor" strokeWidth="1.3" />
              <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          ),
        },
        {
          id: "flashcards",
          label: "Flashcards & Decks",
          href: "/flashcards",
          icon: (
            <svg viewBox="0 0 16 16" fill="none" width="18" height="18">
              <rect x="3" y="4" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M5 2h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          ),
        },
        {
          id: "cronograma",
          label: "Cronograma de Estudos",
          href: "/cronograma",
          icon: (
            <svg viewBox="0 0 16 16" fill="none" width="18" height="18">
              <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M2 7h12" stroke="currentColor" strokeWidth="1.2" />
              <path d="M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          ),
        },
      ],
    },
    {
      label: "Conta & Ajustes",
      items: [
        {
          id: "perfil",
          label: "Meu Perfil",
          href: "/perfil",
          icon: (
            <svg viewBox="0 0 16 16" fill="none" width="18" height="18">
              <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M3 13c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          ),
        },
        {
          id: "planos",
          label: "Planos & Assinatura",
          href: "/planos",
          icon: (
            <svg viewBox="0 0 16 16" fill="none" width="18" height="18">
              <rect x="2" y="4" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M2 7h12" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          ),
        },
      ],
    },
  ];

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
      }}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(6px)",
          animation: "fadeIn 0.2s ease-out",
        }}
      />

      {/* Drawer Panel */}
      <div
        style={{
          position: "relative",
          width: "min(320px, 86vw)",
          height: "100%",
          background: "var(--card-bg)",
          borderRight: "1px solid var(--card-border)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          zIndex: 10000,
          animation: "slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)",
        }}
      >
        <style>{`
          @keyframes slideInLeft {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>

        {/* Header do Drawer */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--card-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "max(env(safe-area-inset-top, 0px), 16px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="11" stroke="#00C2A8" strokeWidth="1.5" />
              <path d="M5 12h3l2-4 3 8 2-4h4" stroke="#00C2A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{
              fontFamily: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--heading-color)",
              letterSpacing: "-0.02em",
            }}>
              MedPleni
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Fechar menu"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "var(--input-bg)",
              border: "1px solid var(--card-border)",
              color: "var(--chumbo)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Card do Aluno */}
        <div
          style={{
            padding: "14px 18px",
            background: "var(--input-bg)",
            borderBottom: "1px solid var(--card-border)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--pulso), #0077B6)",
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {userInitials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 700,
              fontSize: "13px",
              color: "var(--heading-color)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {userName}
            </div>
            <div style={{
              fontSize: "11px",
              color: "var(--pulso)",
              fontWeight: 600,
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              {userRole}
            </div>
          </div>
        </div>

        {/* Lista de Navegação Scrollável */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
          {navItems.map((sec) => (
            <div key={sec.label} style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--chumbo)",
                  padding: "6px 12px",
                  fontWeight: 600,
                }}
              >
                {sec.label}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {sec.items.map((item) => {
                  const isActive = item.id === activeId;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.href)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "none",
                        background: isActive ? "var(--pulso-dim)" : "transparent",
                        color: isActive ? "var(--pulso)" : "var(--neblina)",
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ color: isActive ? "var(--pulso)" : "var(--chumbo)", display: "flex" }}>
                          {item.icon}
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: isActive ? 700 : 500 }}>
                          {item.label}
                        </span>
                      </div>

                      {item.badge && (
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: "9px",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "var(--input-bg)",
                            border: "1px solid var(--card-border)",
                            color: "var(--pulso)",
                            fontWeight: 600,
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé com Alternância de Tema e Logout */}
        <div
          style={{
            padding: "14px 16px",
            borderTop: "1px solid var(--card-border)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            background: "var(--input-bg)",
          }}
        >
          {/* Botão de Tema */}
          <button
            onClick={toggleTheme}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid var(--card-border)",
              background: "var(--card-bg)",
              color: "var(--heading-color)",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {theme === "dark" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2">
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B5CE7" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
              <span>Tema: {theme === "dark" ? "Escuro" : "Claro"}</span>
            </div>
            <span style={{ fontSize: "11px", color: "var(--chumbo)" }}>Alternar</span>
          </button>

          {/* Botão de Logout */}
          <button
            onClick={async () => {
              onClose();
              await signOut();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              background: "rgba(239, 68, 68, 0.08)",
              color: "#EF4444",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sair da conta</span>
          </button>
        </div>
      </div>
    </div>
  );
}
