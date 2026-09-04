"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import BottomNav from "./BottomNav";
import MobileDrawer from "./MobileDrawer";
import { useUser } from "@/lib/supabase/use-user";
import { mockUser } from "@/lib/mock-data";

interface PageShellProps {
  children: React.ReactNode;
  title?: string;
  badgeText?: string;
  activeNavId?: string;
  onNavigate?: (id: string) => void;
}

/* ── Route map for nav IDs ── */
const routeMap: Record<string, string> = {
  dashboard: "/dashboard",
  aulas: "/aulas",
  "ia-medica": "/ia-medica",
  simulados: "/simulados",
  questoes: "/questoes",
  predicao: "/predicao",
  flashcards: "/flashcards",
  cronograma: "/cronograma",
  perfil: "/perfil",
  planos: "/planos",
  resid: "/dashboard",
  enamed: "/dashboard",
  revalida: "/dashboard",
};

/* ── Default nav sections ── */
const defaultSections = [
  {
    label: "Principal",
    items: [
      { id: "dashboard", label: "Dashboard", icon: <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" /><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" /><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" /><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" /></svg> },
      { id: "aulas", label: "Sala de Aula", icon: <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><path d="M2 4l6-2 6 2v6l-6 3-6-3V4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M8 2v11M2 4l6 3 6-3" stroke="currentColor" strokeWidth="1.2" /></svg> },
      { id: "ia-medica", label: "Preceptor IA", icon: <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" /><path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> },
      { id: "simulados", label: "Simulados", icon: <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> },
      { id: "questoes", label: "Questões", icon: <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><path d="M3 4h10M3 8h10M3 12h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> },
      { id: "predicao", label: "Predição", icon: <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><path d="M3 12V5l5-3 5 3v7H3z" stroke="currentColor" strokeWidth="1.3" /><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" /></svg> },
      { id: "flashcards", label: "Flashcards", icon: <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><rect x="3" y="4" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M5 2h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> },
      { id: "cronograma", label: "Cronograma", icon: <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M2 7h12" stroke="currentColor" strokeWidth="1.2" /><path d="M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg> },
    ],
  },
  {
    label: "Conta",
    items: [
      { id: "perfil", label: "Meu Perfil", icon: <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" /><path d="M3 13c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> },
    ],
  },
];

export default function PageShell({
  children,
  title = "Meu Dashboard",
  badgeText = "ENAMED · 2027",
  activeNavId = "dashboard",
  onNavigate,
}: PageShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const displayNome = user?.user_metadata?.full_name || mockUser.nome;
  const displayIniciais = displayNome
    ? displayNome
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "MP";

  const handleNavigate = (id: string) => {
    if (id === "menu") {
      setDrawerOpen(true);
      return;
    }
    onNavigate?.(id);
    const route = routeMap[id];
    if (route && route !== pathname) {
      router.push(route);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--abismo)", color: "var(--neblina)" }}>
      <style>{`
        @keyframes pageFadeIn { from { opacity:0; } to { opacity:1; } }
        @media (max-width: 768px) {
          .desktop-sidebar {
            display: none !important;
          }
          .mobile-content-area {
            padding: 12px !important;
            padding-bottom: calc(76px + env(safe-area-inset-bottom, 0px)) !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-bottom-nav {
            display: none !important;
          }
        }
      `}</style>

      {/* Drawer Móvel de Navegação Completa */}
      <MobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeId={activeNavId}
        userName={displayNome}
        userRole="ENAMED · 2027"
        userInitials={displayIniciais}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar Desktop (Oculta via CSS no mobile) */}
        <Sidebar
          sections={defaultSections}
          activeId={activeNavId}
          onNavigate={handleNavigate}
          userName={displayNome}
          userRole="ENAMED · 2027"
          userInitials={displayIniciais}
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <Topbar
            title={title}
            badgeText={badgeText}
            onOpenMenu={() => setDrawerOpen(true)}
          />

          <main
            className="mobile-content-area"
            style={{
              flex: 1,
              padding: "20px 24px",
              overflowY: "auto",
              background: "var(--abismo)",
              animation: "pageFadeIn 0.3s ease",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {children}
          </main>
        </div>
      </div>

      {/* Bottom Nav Fixa (Oculta via CSS no desktop) */}
      <BottomNav
        activeId={activeNavId}
        onNavigate={handleNavigate}
        onOpenMenu={() => setDrawerOpen(true)}
      />
    </div>
  );
}
