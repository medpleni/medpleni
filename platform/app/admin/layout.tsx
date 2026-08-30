"use client";

import React, { useEffect } from "react";
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
  const { user, profile, loading } = useUser();

  const userEmail = user?.email || "";
  const rawRole = (profile?.role || "").toLowerCase();
  const isSuperAdminEmail = SUPER_ADMIN_EMAILS.includes(userEmail);
  const isAuthorizedRole = ADMIN_ALLOWED_ROLES.includes(rawRole);
  const isAuthorized = isSuperAdminEmail || isAuthorizedRole;

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
            padding: "20px 22px",
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

          {/* Nav list */}
          <nav style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
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

        {/* Bottom profile / return to app */}
        <div style={{
          padding: "16px",
          borderTop: "1px solid rgba(61,90,128,0.2)",
          background: "rgba(13,17,28,0.4)",
        }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 6,
              background: "transparent", border: "1px solid rgba(61,90,128,0.35)",
              color: V.ch, fontFamily: V.db, fontSize: 12, fontWeight: 500,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              marginBottom: 12, transition: "all 0.15s",
            }}
          >
            ← Voltar ao App do Aluno
          </button>
          <div style={{ fontSize: 11, color: V.ch, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Conectado como:
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {userEmail}
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <main style={{ flex: 1, overflowY: "auto", padding: "32px 36px" }}>
        {children}
      </main>
    </div>
  );
}
