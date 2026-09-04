"use client";

import React, { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!email.trim()) {
      setErro("Por favor, informe seu e-mail cadastrado.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const origin = window.location.origin;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/auth/callback?next=/redefinir-senha`,
      });

      if (error) {
        setErro(error.message || "Erro ao solicitar redefinição de senha.");
        setLoading(false);
        return;
      }

      // Também tentamos disparar o e-mail estilizado com o template MedPleni via Resend
      try {
        await fetch("/api/auth/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "reset-password",
            email: email.trim(),
            resetUrl: `${origin}/auth/callback?next=/redefinir-senha`,
          }),
        });
      } catch (errEmail) {
        console.warn("Disparo Resend complementar:", errEmail);
      }

      setEnviado(true);
    } catch (err: any) {
      setErro(err?.message || "Erro inesperado ao solicitar recuperação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% 25%, rgba(0,194,168,0.08) 0%, var(--abismo) 65%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: 12 }}>
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" stroke="#00C2A8" strokeWidth="1.5" />
          <path
            d="M5 12h3l2-4 3 8 2-4h4"
            stroke="#00C2A8"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div
        style={{
          fontFamily: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
          fontWeight: 700,
          fontSize: 32,
          color: "#fff",
          letterSpacing: "-0.02em",
          marginBottom: 4,
        }}
      >
        Med<span style={{ color: "#00C2A8" }}>Pleni</span>
      </div>

      <div
        style={{
          fontFamily: "var(--font-serif), 'Source Serif 4', serif",
          fontStyle: "italic",
          fontSize: 14,
          color: "var(--chumbo)",
          marginBottom: 32,
          textAlign: "center",
        }}
      >
        Segurança & Recuperação de Acesso
      </div>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--petroleo)",
          border: "1px solid rgba(61,90,128,0.3)",
          borderRadius: 16,
          padding: "32px 28px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
        }}
      >
        {enviado ? (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "rgba(0,194,168,0.15)",
                color: "#00C2A8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <h2
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: "#FFFFFF",
                marginBottom: 8,
              }}
            >
              Verifique seu e-mail
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "var(--neblina)",
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              Enviamos instruções de redefinição de senha para <strong>{email}</strong>.
              O link possui validade de 60 minutos.
            </p>
            <Link
              href="/login"
              style={{
                display: "inline-block",
                width: "100%",
                padding: "12px 0",
                background: "#00C2A8",
                color: "#0A1A18",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              Voltar ao Login
            </Link>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 22, textAlign: "center" }}>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  marginBottom: 4,
                }}
              >
                Esqueceu sua senha?
              </h2>
              <p style={{ fontSize: 13, color: "var(--chumbo)" }}>
                Digite seu e-mail para receber o link de recuperação
              </p>
            </div>

            {erro && (
              <div
                style={{
                  background: "rgba(255, 107, 107, 0.12)",
                  border: "1px solid rgba(255, 107, 107, 0.4)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  marginBottom: 18,
                  color: "#FF6B6B",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>{erro}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label
                  htmlFor="email"
                  style={{
                    display: "block",
                    fontFamily: "var(--font-mono), 'IBM Plex Mono', monospace",
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--chumbo)",
                    marginBottom: 6,
                  }}
                >
                  E-mail de Cadastro
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: "rgba(43,58,82,0.6)",
                    border: "1.5px solid rgba(61,90,128,0.5)",
                    borderRadius: 8,
                    color: "var(--neblina)",
                    fontFamily: "var(--font-body), 'Inter', sans-serif",
                    fontSize: 14,
                    outline: "none",
                    transition: "border-color 0.18s",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "#00C2A8")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "rgba(61,90,128,0.5)")
                  }
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "13px 0",
                  background: loading ? "rgba(0,194,168,0.5)" : "#00C2A8",
                  border: "none",
                  borderRadius: 10,
                  fontFamily: "var(--font-body), 'Inter', sans-serif",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#0A1A18",
                  cursor: loading ? "wait" : "pointer",
                  transition: "all 0.2s",
                  boxShadow: loading
                    ? "none"
                    : "0 4px 20px rgba(0,194,168,0.3)",
                }}
              >
                {loading ? "Enviando link..." : "Enviar Link de Recuperação"}
              </button>
            </form>

            <div
              style={{
                textAlign: "center",
                marginTop: 22,
                fontSize: 13,
                paddingTop: 16,
                borderTop: "1px solid rgba(61,90,128,0.25)",
              }}
            >
              <Link
                href="/login"
                style={{
                  color: "var(--chumbo)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#00C2A8")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--chumbo)")}
              >
                ← Voltar para o login
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Footer LGPD */}
      <div
        style={{
          marginTop: 40,
          fontFamily: "var(--font-mono), 'IBM Plex Mono', monospace",
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(138,154,181,0.4)",
        }}
      >
        Grupo Plenitude © 2026 · LGPD Compliant
      </div>
    </div>
  );
}
