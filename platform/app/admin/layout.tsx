"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/lib/supabase/use-user";

const V = {
  pu: "#00C2A8", re: "#0077B6", rel: "#64B5E8", ind: "#6B5CE7",
  ch: "#8A9AB5", nb: "#E0E6F0", pe: "#2B3A52", am: "#C98A0A",
  wn: "#F5A623", dg: "#FF6B6B", su: "#22C55E",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
  ab: "#1A1F2E", deeper: "#0D111C",
};

const navItems = [
  { id: "dashboard", label: "Dashboard Executivo", icon: "📊", path: "/admin" },
  { id: "conteudo", label: "Docência & Questões", icon: "🩺", path: "/admin/conteudo" },
  { id: "financeiro", label: "Financeiro & Iugu", icon: "💳", path: "/admin/financeiro" },
  { id: "alunos", label: "Alunos & CS", icon: "👥", path: "/admin/alunos" },
  { id: "sistema", label: "Sistema & Logs", icon: "🛠️", path: "/admin/sistema" },
];

const ADMIN_ALLOWED_ROLES = ["superadmin", "docente", "financeiro", "suporte", "desenvolvedor"];
const SUPER_ADMIN_EMAILS = ["mario.nascimentolopes@gmail.com"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading, signOut } = useUser();
  const [loggingOut, setLoggingOut] = useState(false);

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
      <div style={{ minHeight: "100vh", background: "#0D111C", display: "flex", alignItems: "center", justifyContent: "center", color: V.ch }}>
        Validando credenciais administrativas...
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return (
      <div style={{ minHeight: "100vh", background: "#0D111C", display: "flex", alignItems: "center", justifyContent: "center", color: V.dg }}>
        Acesso restrito a administradores. Redirecionando...
      </div>
    );
  }

  const displayRole = (isSuperAdminEmail ? "SUPERADMIN" : (profile?.role || "ADMIN")).toUpperCase();

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      background: "#0D111C",
      color: V.nb,
      fontFamily: V.db,
    }}>
      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 250,
        background: "#1A1F2E",
        borderRight: "1px solid rgba(61,90,128,0.25)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div>
          {/* Logo & Badge */}
          <div style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid rgba(61,90,128,0.2)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontFamily: V.df, fontSize: 19, fontWeight: 700, color: "#fff" }}>
                Med<span style={{ color: V.pu }}>Pleni</span>
              </div>
              <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.15em", color: V.ch, textTransform: "uppercase" }}>
                Backoffice Admin
              </div>
            </div>
            <span style={{
              fontFamily: V.dm, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase",
              padding: "2px 6px", borderRadius: 4,
              background: "rgba(0,194,168,0.15)", color: V.pu, border: "1px solid rgba(0,194,168,0.3)",
              fontWeight: 700,
            }}>
              {displayRole}
            </span>
          </div>

          {/* ── BOTÃO DESTAQUE: ALTERNAR PARA DASHBOARD DO ALUNO ── */}
          <div style={{ padding: "14px 12px 6px" }}>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: 8,
                background: "linear-gradient(135deg, rgba(0,194,168,0.18) 0%, rgba(0,119,182,0.15) 100%)",
                border: "1px solid rgba(0,194,168,0.4)",
                color: "#fff",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,194,168,0.28) 0%, rgba(0,119,182,0.22) 100%)";
                e.currentTarget.style.borderColor = "rgba(0,194,168,0.7)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,194,168,0.18) 0%, rgba(0,119,182,0.15) 100%)";
                e.currentTarget.style.borderColor = "rgba(0,194,168,0.4)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 16 }}>🎓</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
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
                  onClick={() => router.push(item.path)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: 8,
                    background: isActive ? "rgba(0,194,168,0.12)" : "transparent",
                    border: `1px solid ${isActive ? "rgba(0,194,168,0.3)" : "transparent"}`,
                    color: isActive ? "#fff" : V.ch,
                    fontFamily: V.db, fontSize: 13, fontWeight: isActive ? 600 : 500,
                    cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom profile / return to app & logout */}
        <div style={{
          padding: "16px",
          borderTop: "1px solid rgba(61,90,128,0.2)",
          background: "rgba(13,17,28,0.4)",
        }}>
          <div style={{ fontSize: 10, color: V.ch, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "uppercase", fontFamily: V.dm, letterSpacing: "0.08em" }}>
            Administrador
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2, marginBottom: 10 }}>
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
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {/* Top bar de navegação rápida */}
        <header style={{
          height: 54,
          background: "rgba(26,31,46,0.8)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(61,90,128,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: V.ch }}>
            <span style={{ color: V.pu, fontWeight: 600 }}>Backoffice</span>
            <span>/</span>
            <span style={{ color: "#fff" }}>
              {navItems.find((n) => pathname === n.path || (n.path !== "/admin" && pathname.startsWith(n.path)))?.label || "Painel"}
            </span>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 6,
              background: "rgba(0,194,168,0.08)",
              border: "1px solid rgba(0,194,168,0.3)",
              color: V.pu,
              fontFamily: V.db,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0,194,168,0.16)";
              e.currentTarget.style.borderColor = "rgba(0,194,168,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0,194,168,0.08)";
              e.currentTarget.style.borderColor = "rgba(0,194,168,0.3)";
            }}
          >
            <span>🎓</span>
            <span>Ir para o Dashboard do Aluno</span>
            <span>→</span>
          </button>
        </header>

        <main style={{ flex: 1, overflowY: "auto", padding: "32px 36px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
