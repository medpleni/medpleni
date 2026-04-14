"use client";

import React from "react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  sections: NavSection[];
  activeId?: string;
  onNavigate?: (id: string) => void;
  userName?: string;
  userRole?: string;
  userInitials?: string;
}

/* ── Logo SVG exato do medpleni-part3-dashboard.html ────── */
function LogoSvg() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" stroke="#00C2A8" strokeWidth="1.5" />
      <path
        d="M5 12h3l2-4 3 8 2-4h4"
        stroke="#00C2A8"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Sidebar({
  sections,
  activeId = "dashboard",
  onNavigate,
  userName = "Dra. Camila S.",
  userRole = "RESID · R1",
  userInitials = "CS",
}: SidebarProps) {
  /* ── Estilos extraídos de .sidebar no medpleni-part3-dashboard.html ── */
  const sidebarStyle: React.CSSProperties = {
    width: "220px",
    flexShrink: 0,
    background: "#0D111C",
    borderRight: "1px solid rgba(61,90,128,0.2)",
    display: "flex",
    flexDirection: "column",
    padding: "20px 0",
    height: "100%",
    overflowY: "auto",
  };

  const logoWrapStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "0 20px 20px",
    borderBottom: "1px solid rgba(61,90,128,0.15)",
    marginBottom: "16px",
  };

  const logoTextStyle: React.CSSProperties = {
    fontFamily: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
    fontWeight: 700,
    fontSize: "18px",
    color: "#fff",
    letterSpacing: "-0.01em",
  };

  const sectionStyle: React.CSSProperties = {
    padding: "0 12px",
    marginBottom: "8px",
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "9px",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "rgba(138,154,181,0.5)",
    padding: "0 8px",
    marginBottom: "6px",
  };

  const getNavItemStyle = (isActive: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "9px 10px",
    borderRadius: "var(--r-md)",
    cursor: "pointer",
    transition: "all 0.15s",
    fontSize: "13px",
    color: isActive ? "#fff" : "var(--chumbo)",
    background: isActive ? "rgba(0,194,168,0.07)" : "transparent",
    marginBottom: "2px",
    border: "none",
    width: "100%",
    textAlign: "left",
    fontFamily: "inherit",
  });

  const iconStyle = (isActive: boolean): React.CSSProperties => ({
    width: "16px",
    height: "16px",
    flexShrink: 0,
    opacity: isActive ? 1 : 0.7,
    color: isActive ? "var(--pulso)" : "currentColor",
  });

  const footerStyle: React.CSSProperties = {
    marginTop: "auto",
    padding: "16px 12px 0",
    borderTop: "1px solid rgba(61,90,128,0.15)",
  };

  const userRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 10px",
    borderRadius: "var(--r-md)",
  };

  const avatarStyle: React.CSSProperties = {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    flexShrink: 0,
    background: "linear-gradient(135deg, #0077B6, #00C2A8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
    fontWeight: 700,
    fontSize: "13px",
    color: "#fff",
  };

  return (
    <aside style={sidebarStyle}>
      {/* Logo */}
      <div style={logoWrapStyle}>
        <LogoSvg />
        <span style={logoTextStyle}>
          Med<span style={{ color: "var(--pulso)" }}>Pleni</span>
        </span>
      </div>

      {/* Nav sections */}
      {sections.map((section) => (
        <div key={section.label} style={sectionStyle}>
          <div style={sectionLabelStyle}>{section.label}</div>
          {section.items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <button
                key={item.id}
                style={getNavItemStyle(isActive)}
                onClick={() => onNavigate?.(item.id)}
              >
                <span style={iconStyle(isActive)}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>
      ))}

      {/* Footer / user */}
      <div style={footerStyle}>
        <div style={userRowStyle}>
          <div style={avatarStyle}>{userInitials}</div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#fff" }}>
              {userName}
            </div>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.08em",
                color: "var(--chumbo)",
              }}
            >
              {userRole}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
