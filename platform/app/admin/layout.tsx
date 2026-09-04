"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/lib/supabase/use-user";
import { useTheme } from "@/lib/theme-context";

const V = {
  pu: "var(--pulso)", re: "#0077B6", rel: "#64B5E8", ind: "#6B5CE7",
  ch: "var(--chumbo)", nb: "var(--neblina)", pe: "var(--petroleo)", am: "#C98A0A",
  wn: "var(--warn)", dg: "var(--danger)", su: "var(--success)",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
  ab: "var(--abismo)", deeper: "var(--deeper)",
};

const navItems = [
  { id: "dashboard", label: "Dashboard Executivo", icon: "chart", path: "/admin" },
  { id: "conteudo", label: "Docência & Questões", icon: "doc", path: "/admin/conteudo" },
  { id: "financeiro", label: "Financeiro & Iugu", icon: "card", path: "/admin/financeiro" },
  { id: "alunos", label: "Alunos & CS", icon: "users", path: "/admin/alunos" },
  { id: "sistema", label: "Sistema & Logs", icon: "settings", path: "/admin/sistema" },
];

const ADMIN_ALLOWED_ROLES = ["superadmin", "docente", "financeiro", "suporte", "desenvolvedor"];
const SUPER_ADMIN_EMAILS = ["mario.nascimentolopes@gmail.com"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading, signOut } = useUser();
  const { theme, toggleTheme } = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fecha o drawer em navegação
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const userEmail = user?.email || "";
  const rawRole = (profile?.role || "").toLowerCase();
  const isSuperAdminEmail = SUPER_ADMIN_EMAILS.includes(userEmail);
  const isAuthorizedRole = ADMIN_ALLOWED_ROLES.includes(rawRole);
  const isAuthorized = isSuperAdminEmail || isAuthorizedRole;

  const handleSignOut = async () => {
    try {
      setLoggingOut(true);
      await signOut();
    } catch (e) {
      console.error("Erro ao deslogar:", e);
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login?redirect=/admin");
      } else if (!isAuthorized) {
        // Bloqueio rigoroso de alunos
        router.push("/dashboard");
      }
    }
  }, [user, isAuthorized, loading, router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--abismo)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--chumbo)" }}>
        Validando credenciais administrativas...
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--abismo)", display: "flex", alignItems: "center", justifyContent: "center", color: V.dg }}>
        Acesso restrito a administradores. Redirecionando...
      </div>
    );
  }

  const displayRole = (isSuperAdminEmail ? "SUPERADMIN" : (profile?.role || "ADMIN")).toUpperCase();

  const renderSidebarContent = (isDrawer = false) => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
      <div>
        {/* Logo & Badge */}
        <div style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid var(--sinal)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontFamily: V.df, fontSize: 19, fontWeight: 700, color: "var(--heading-color)" }}>
              Med<span style={{ color: V.pu }}>Pleni</span>
            </div>
            <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.15em", color: "var(--chumbo)", textTransform: "uppercase" }}>
              Backoffice Admin
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontFamily: V.dm, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase",
              padding: "2px 6px", borderRadius: 4,
              background: "var(--pulso-dim)", color: V.pu, border: "1px solid var(--pulso)",
              fontWeight: 700,
            }}>
              {displayRole}
            </span>
            {isDrawer && (
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  background: "transparent", border: "none", color: "var(--chumbo)",
                  cursor: "pointer", padding: 4, display: "flex", alignItems: "center",
                }}
                aria-label="Fechar menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── BOTÃO DESTAQUE: ALTERNAR PARA DASHBOARD DO ALUNO ── */}
        <div style={{ padding: "14px 12px 6px" }}>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              router.push("/dashboard");
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderRadius: 8,
              background: "linear-gradient(135deg, var(--pulso-dim) 0%, rgba(0,119,182,0.1) 100%)",
              border: "1px solid var(--pulso)",
              color: "var(--heading-color)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6, background: "var(--pulso-dim)",
                display: "flex", alignItems: "center", justifyContent: "center", color: V.pu,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--heading-color)", lineHeight: 1.2 }}>
                  Área do Aluno
                </div>
                <div style={{ fontFamily: V.dm, fontSize: 9, color: V.pu, letterSpacing: "0.02em" }}>
                  Alternar para Dashboard
                </div>
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: V.pu }}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        </div>

        {/* Nav list */}
        <nav style={{ padding: "8px 12px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path));
            return (
              <button
                key={item.id}
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push(item.path);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px", borderRadius: 8,
                  background: isActive ? "var(--pulso-dim)" : "transparent",
                  border: `1px solid ${isActive ? "var(--pulso)" : "transparent"}`,
                  color: isActive ? "var(--pulso)" : "var(--neblina)",
                  fontFamily: V.db, fontSize: 13, fontWeight: isActive ? 600 : 500,
                  cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  {item.icon === "chart" && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  )}
                  {item.icon === "doc" && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  )}
                  {item.icon === "card" && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                      <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                  )}
                  {item.icon === "users" && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  )}
                  {item.icon === "settings" && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  )}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom profile / return to app & logout */}
      <div style={{
        padding: "16px",
        borderTop: "1px solid var(--sinal)",
        background: "var(--input-bg)",
      }}>
        <div style={{ fontSize: 10, color: "var(--chumbo)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "uppercase", fontFamily: V.dm, letterSpacing: "0.08em" }}>
          Administrador
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--heading-color)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2, marginBottom: 10 }}>
          {userEmail}
        </div>

        <button
          onClick={handleSignOut}
          disabled={loggingOut}
          style={{
            width: "100%", padding: "7px 10px", borderRadius: 6,
            background: "rgba(255,107,107,0.06)", border: "1px solid rgba(255,107,107,0.2)",
            color: "#FF8E8E", fontFamily: V.dm, fontSize: 11, fontWeight: 500,
            cursor: loggingOut ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "all 0.15s",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>{loggingOut ? "Saindo..." : "Sair da conta"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      background: "var(--abismo)",
      color: "var(--neblina)",
      fontFamily: V.db,
    }}>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className="admin-desktop-sidebar"
        style={{
          width: 250,
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sinal)",
          flexDirection: "column",
          justifyContent: "space-between",
          flexShrink: 0,
          transition: "background 0.2s ease, border-color 0.2s ease",
        }}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* ── MOBILE DRAWER MODAL ── */}
      {mobileMenuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex" }}>
          {/* Backdrop escuro */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.65)",
              backdropFilter: "blur(3px)",
            }}
          />
          {/* Drawer Lateral */}
          <aside style={{
            position: "relative",
            width: "82%",
            maxWidth: 300,
            height: "100%",
            background: "var(--sidebar-bg)",
            borderRight: "1px solid var(--sinal)",
            zIndex: 10,
            boxShadow: "4px 0 24px rgba(0,0,0,0.5)",
            overflowY: "auto",
          }}>
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {/* Top bar de navegação rápida */}
        <header style={{
          height: 54,
          background: "var(--topbar-bg)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--sinal)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 clamp(14px, 3vw, 32px)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--chumbo)" }}>
            {/* Botão Hambúrguer Mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="admin-topbar-hamburger"
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: "var(--input-bg)",
                border: "1px solid var(--sinal)",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--heading-color)",
                padding: 0,
              }}
              aria-label="Abrir Menu Administrativo"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <span style={{ color: V.pu, fontWeight: 600 }}>Backoffice</span>
            <span>/</span>
            <span style={{ color: "var(--heading-color)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
              {navItems.find((n) => pathname === n.path || (n.path !== "/admin" && pathname.startsWith(n.path)))?.label || "Painel"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Theme Toggle Button in Admin */}
            <button
              onClick={toggleTheme}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                background: "var(--input-bg)",
                border: "1px solid var(--sinal)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: theme === "dark" ? "#F5A623" : "#6B5CE7",
                transition: "all 0.15s ease",
              }}
              title={theme === "dark" ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
            >
              {theme === "dark" ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => router.push("/dashboard")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 6,
                background: "var(--pulso-dim)",
                border: "1px solid var(--pulso)",
                color: V.pu,
                fontFamily: V.db,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
              <span className="admin-topbar-desktop-label">Ir para o Dashboard</span>
              <span>→</span>
            </button>
          </div>
        </header>

        <main className="admin-main-content" style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
