"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme-context";
import { switchActiveInstitution } from "@/lib/b2b/actions";
import type { B2BRole, B2BUserContext } from "@/lib/b2b/types";

interface NavItemDef {
  id: string;
  label: string;
  href: string;
  status: "ready" | "in_progress";
  icon: React.ReactNode;
}

interface B2BShellProps {
  context: B2BUserContext;
  children: React.ReactNode;
}

export default function B2BShell({ context, children }: B2BShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isPendingSwitch, startTransition] = useTransition();

  const { role, institution, isMedPleniAdmin, availableInstitutions, userName } = context;

  // 1. Definição completa dos itens de menu por papel conforme a ESPEC
  const getNavItemsForRole = (userRole: B2BRole): NavItemDef[] => {
    // ── Dirigente e Coordenador ──
    if (userRole === "dirigente" || userRole === "coordenador") {
      return [
        {
          id: "visao-geral",
          label: "Visão geral",
          href: "/instituicao",
          status: "ready",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          ),
        },
        {
          id: "turmas",
          label: "Turmas",
          href: "/instituicao/turmas",
          status: "ready",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          ),
        },
        {
          id: "acompanhamento",
          label: "Acompanhamento",
          href: "/instituicao/acompanhamento",
          status: "ready",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          ),
        },
        {
          id: "provas",
          label: "Provas",
          href: "/instituicao/provas",
          status: "ready",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          ),
        },
        {
          id: "banco-questoes",
          label: "Banco de questões",
          href: "/instituicao/banco",
          status: "ready",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ),
        },
        {
          id: "longitudinal",
          label: "Avaliação longitudinal",
          href: "/instituicao/longitudinal",
          status: "ready",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          ),
        },
        {
          id: "intervencoes",
          label: "Intervenções",
          href: "/instituicao/intervencoes",
          status: "in_progress",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          ),
        },
        {
          id: "professores",
          label: "Professores",
          href: "/instituicao/professores",
          status: "in_progress",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          ),
        },
        {
          id: "turmas-provas",
          label: "Turmas × Provas",
          href: "/instituicao/turmas-provas",
          status: "ready",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          ),
        },
        {
          id: "cobertura-matriz",
          label: "Cobertura da matriz",
          href: "/instituicao/cobertura-matriz",
          status: "ready",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
              <path d="M22 12A10 10 0 0 0 12 2v10z" />
            </svg>
          ),
        },
        {
          id: "relatorios",
          label: "Relatórios",
          href: "/instituicao/relatorios",
          status: "ready",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          ),
        },
        {
          id: "configuracoes",
          label: "Configurações",
          href: "/instituicao/configuracoes",
          status: "ready",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          ),
        },
        ...(isMedPleniAdmin
          ? [
              {
                id: "admin-global",
                label: "Admin MedPleni",
                href: "/instituicao/admin",
                status: "ready" as const,
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                ),
              },
            ]
          : []),
      ];
    }

    // ── Docente ──
    if (userRole === "docente") {
      return [
        {
          id: "inicio",
          label: "Início",
          href: "/instituicao",
          status: "ready",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          ),
        },
        {
          id: "turmas",
          label: "Minhas turmas",
          href: "/instituicao/turmas",
          status: "ready",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          ),
        },
        {
          id: "provas",
          label: "Provas",
          href: "/instituicao/provas",
          status: "ready",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          ),
        },
        {
          id: "banco-questoes",
          label: "Banco de questões",
          href: "/instituicao/banco",
          status: "ready",
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ),
        },
      ];
    }

    // ── Aluno ──
    return [
      {
        id: "inicio",
        label: "Início",
        href: "/instituicao",
        status: "ready",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        ),
      },
      {
        id: "avaliacoes",
        label: "Minhas avaliações",
        href: "/instituicao/avaliacoes",
        status: "in_progress",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        ),
      },
      {
        id: "praticar",
        label: "Praticar",
        href: "/instituicao/praticar",
        status: "in_progress",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        ),
      },
      {
        id: "evolucao",
        label: "Minha evolução",
        href: "/instituicao/evolucao",
        status: "in_progress",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        ),
      },
    ];
  };

  // 2. Filtra os itens: Itens em construção aparecem SOMENTE para admin MedPleni
  const allRoleItems = getNavItemsForRole(role);
  const visibleNavItems = allRoleItems.filter((item) => {
    if (item.status === "ready") return true;
    return isMedPleniAdmin;
  });

  const roleLabels: Record<B2BRole, string> = {
    dirigente: "Direção Geral",
    coordenador: "Coordenação de Curso",
    docente: "Corpo Docente",
    aluno: "Estudante",
  };

  const handleInstitutionChange = (slug: string) => {
    if (slug === institution.slug) return;
    startTransition(async () => {
      await switchActiveInstitution(slug);
    });
  };

  const renderNavList = () => (
    <nav style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "0 12px" }}>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "9px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "var(--chumbo)",
          padding: "8px 10px 6px",
        }}
      >
        Menu Institucional
      </div>

      {visibleNavItems.map((item) => {
        const isActive =
          item.href === "/instituicao"
            ? pathname === "/instituicao"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={() => setMobileDrawerOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              padding: "9px 12px",
              borderRadius: "var(--r-md, 8px)",
              fontSize: "13px",
              fontWeight: isActive ? 600 : 500,
              color: isActive ? "var(--pulso)" : "var(--neblina)",
              background: isActive ? "var(--pulso-dim)" : "transparent",
              border: `1px solid ${isActive ? "var(--pulso)" : "transparent"}`,
              textDecoration: "none",
              transition: "all 0.12s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ color: isActive ? "var(--pulso)" : "currentColor", opacity: isActive ? 1 : 0.75 }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </div>

            {item.status === "in_progress" && isMedPleniAdmin && (
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "8px",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "1px 5px",
                  borderRadius: "4px",
                  background: "rgba(245, 166, 35, 0.15)",
                  color: "var(--warn)",
                  border: "1px solid rgba(245, 166, 35, 0.3)",
                }}
              >
                Em breve
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--abismo)",
        color: "var(--neblina)",
        fontFamily: "var(--font-body), 'Inter', sans-serif",
      }}
    >
      {/* ── SIDEBAR DESKTOP ── */}
      <aside
        className="desktop-sidebar"
        style={{
          width: "240px",
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sinal)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flexShrink: 0,
          height: "100vh",
          position: "sticky",
          top: 0,
          overflowY: "auto",
        }}
      >
        <div>
          {/* Logo e Nome da Faculdade */}
          <div
            style={{
              padding: "18px 20px 14px",
              borderBottom: "1px solid var(--sinal)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #0077B6, #00C2A8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                color: "#fff",
                fontSize: "14px",
                flexShrink: 0,
              }}
            >
              {institution.initials.slice(0, 2)}
            </div>

            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--heading-color)",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  lineHeight: 1.2,
                }}
              >
                {institution.name}
              </div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "9px",
                  color: "var(--pulso)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginTop: "2px",
                }}
              >
                {institution.initials} · {roleLabels[role]}
              </div>
            </div>
          </div>

          {/* Links do Menu */}
          <div style={{ paddingTop: "12px" }}>{renderNavList()}</div>
        </div>

        {/* Rodapé da Sidebar: Usuário + Voltar ao B2C */}
        <div
          style={{
            padding: "14px",
            borderTop: "1px solid var(--sinal)",
            background: "var(--input-bg)",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--heading-color)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {userName}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", color: "var(--chumbo)", marginBottom: "8px" }}>
            {roleLabels[role]}
          </div>

          <Link
            href="/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "7px 10px",
              borderRadius: "6px",
              background: "var(--card-bg)",
              border: "1px solid var(--sinal)",
              color: "var(--chumbo)",
              fontSize: "11px",
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
          >
            <span>Ir para Área do Aluno</span>
            <span>→</span>
          </Link>
        </div>
      </aside>

      {/* ── DRAWER MOBILE (Telas menores) ── */}
      {mobileDrawerOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex" }}>
          <div
            onClick={() => setMobileDrawerOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.65)",
              backdropFilter: "blur(3px)",
            }}
          />
          <aside
            style={{
              position: "relative",
              width: "80%",
              maxWidth: "280px",
              height: "100%",
              background: "var(--sidebar-bg)",
              borderRight: "1px solid var(--sinal)",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "4px 0 24px rgba(0,0,0,0.5)",
              overflowY: "auto",
            }}
          >
            <div>
              <div
                style={{
                  padding: "16px",
                  borderBottom: "1px solid var(--sinal)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--heading-color)" }}>
                  {institution.name}
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  style={{ background: "transparent", border: "none", color: "var(--chumbo)", cursor: "pointer", padding: "4px" }}
                  aria-label="Fechar menu"
                >
                  ✕
                </button>
              </div>
              <div style={{ paddingTop: "12px" }}>{renderNavList()}</div>
            </div>

            <div style={{ padding: "14px", borderTop: "1px solid var(--sinal)" }}>
              <Link
                href="/dashboard"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "8px",
                  borderRadius: "6px",
                  background: "var(--input-bg)",
                  border: "1px solid var(--sinal)",
                  color: "var(--chumbo)",
                  fontSize: "12px",
                  textDecoration: "none",
                }}
              >
                Voltar à Área do Aluno
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* ── CONTEÚDO PRINCIPAL ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {/* Topbar Institucional */}
        <header
          style={{
            height: "54px",
            background: "var(--topbar-bg)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--sinal)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 clamp(12px, 3vw, 24px)",
            position: "sticky",
            top: 0,
            zIndex: 40,
            flexShrink: 0,
          }}
        >
          {/* Lado Esquerdo: Hambúrguer mobile + Seletor de Instituição */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="mobile-hamburger-btn"
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "6px",
                background: "var(--input-bg)",
                border: "1px solid var(--sinal)",
                display: "none", // Exibido via CSS em telas < 768px
                alignItems: "center",
                justifyContent: "center",
                color: "var(--heading-color)",
                cursor: "pointer",
              }}
              aria-label="Abrir menu lateral"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Seletor de Instituição (caso o usuário tenha mais de uma) */}
            {availableInstitutions.length > 1 ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "var(--chumbo)", fontFamily: "'IBM Plex Mono', monospace" }}>
                  Faculdade:
                </span>
                <select
                  value={institution.slug}
                  disabled={isPendingSwitch}
                  onChange={(e) => handleInstitutionChange(e.target.value)}
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--sinal)",
                    color: "var(--heading-color)",
                    fontSize: "12px",
                    fontWeight: 600,
                    borderRadius: "6px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  {availableInstitutions.map((inst) => (
                    <option key={inst.id} value={inst.slug}>
                      {inst.name} ({inst.initials})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--pulso)",
                    background: "var(--pulso-dim)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    border: "1px solid var(--pulso)",
                  }}
                >
                  {institution.initials}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--heading-color)" }}>
                  {institution.name}
                </span>
              </div>
            )}
          </div>

          {/* Lado Direito: Alternância de Tema + Badge de Corte 60 */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              title="Régua institucional de corte para alertas e proficiência"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "10px",
                color: "var(--chumbo)",
                display: "none",
              }}
              className="desktop-only-badge"
            >
              Régua: <strong style={{ color: "var(--pulso)" }}>{institution.cut_score}%</strong>
            </span>

            {/* Botão de Alternância de Tema */}
            <button
              onClick={toggleTheme}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "var(--r-md, 8px)",
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
              aria-label="Alternar tema claro/escuro"
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
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Estilos responsivos inline */}
        <style>{`
          @media (max-width: 768px) {
            .desktop-sidebar {
              display: none !important;
            }
            .mobile-hamburger-btn {
              display: flex !important;
            }
          }
          @media (min-width: 900px) {
            .desktop-only-badge {
              display: inline-block !important;
            }
          }
        `}</style>

        {/* Área de Visualização da Página */}
        <main
          style={{
            flex: 1,
            padding: "clamp(16px, 3vw, 28px)",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
