"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => router.push("/onboarding"), 800);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 30%, rgba(0,194,168,0.06) 0%, var(--abismo) 60%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 12, opacity: loading ? 0.5 : 1, transition: "opacity 0.3s" }}>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" stroke="#00C2A8" strokeWidth="1.5" />
          <path d="M5 12h3l2-4 3 8 2-4h4" stroke="#00C2A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{
        fontFamily: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
        fontWeight: 700, fontSize: 32, color: "#fff", letterSpacing: "-0.02em",
        marginBottom: 6,
      }}>
        Med<span style={{ color: "#00C2A8" }}>Pleni</span>
      </div>
      <div style={{
        fontFamily: "var(--font-serif), 'Source Serif 4', serif",
        fontStyle: "italic", fontSize: 15, color: "var(--chumbo)",
        marginBottom: 40, textAlign: "center", lineHeight: 1.5,
      }}>
        Medicina com propósito. Tecnologia com precisão.
      </div>

      {/* Form card */}
      <form onSubmit={handleSubmit} style={{
        width: "100%", maxWidth: 380,
        background: "var(--petroleo)",
        border: "1px solid rgba(61,90,128,0.25)",
        borderRadius: 16, padding: "32px 28px",
      }}>
        {/* Email */}
        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: "block", fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
            color: "var(--chumbo)", marginBottom: 6,
          }}>
            E-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            style={{
              width: "100%", padding: "12px 14px",
              background: "rgba(43,58,82,0.6)", border: "1.5px solid rgba(61,90,128,0.5)",
              borderRadius: 8, color: "var(--neblina)",
              fontFamily: "'Inter', sans-serif", fontSize: 14, outline: "none",
              transition: "border-color 0.18s",
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = "#00C2A8"}
            onBlur={(e) => e.currentTarget.style.borderColor = "rgba(61,90,128,0.5)"}
          />
        </div>

        {/* Senha */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: "block", fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
            color: "var(--chumbo)", marginBottom: 6,
          }}>
            Senha
          </label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            style={{
              width: "100%", padding: "12px 14px",
              background: "rgba(43,58,82,0.6)", border: "1.5px solid rgba(61,90,128,0.5)",
              borderRadius: 8, color: "var(--neblina)",
              fontFamily: "'Inter', sans-serif", fontSize: 14, outline: "none",
              transition: "border-color 0.18s",
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = "#00C2A8"}
            onBlur={(e) => e.currentTarget.style.borderColor = "rgba(61,90,128,0.5)"}
          />
        </div>

        {/* Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%", padding: "13px 0",
            background: loading ? "rgba(0,194,168,0.5)" : "#00C2A8",
            border: "none", borderRadius: 10,
            fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600,
            color: "#0A1A18", cursor: loading ? "wait" : "pointer",
            transition: "all 0.2s",
            boxShadow: loading ? "none" : "0 4px 20px rgba(0,194,168,0.3)",
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {/* Links */}
        <div style={{
          display: "flex", justifyContent: "center", gap: 20,
          marginTop: 20, fontSize: 13,
        }}>
          <span
            style={{ color: "var(--chumbo)", cursor: "pointer", transition: "color 0.15s" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#00C2A8"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--chumbo)"}
          >
            Primeiro acesso
          </span>
          <span style={{ color: "rgba(61,90,128,0.4)" }}>·</span>
          <span
            style={{ color: "var(--chumbo)", cursor: "pointer", transition: "color 0.15s" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#00C2A8"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--chumbo)"}
          >
            Esqueci a senha
          </span>
        </div>
      </form>

      {/* Footer */}
      <div style={{
        marginTop: 48, fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
        color: "rgba(138,154,181,0.35)",
      }}>
        Grupo Plenitude © 2026 · LGPD Compliant
      </div>
    </div>
  );
}
