"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RedefinirSenhaPage() {
  const router = useRouter();

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (novaSenha.length < 6) {
      setErro("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro("As senhas digitadas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.updateUser({
        password: novaSenha,
      });

      if (error) {
        setErro(error.message || "Erro ao redefinir a senha.");
        setLoading(false);
        return;
      }

      // Envia notificação de alerta de segurança via Resend se tiver e-mail do usuário
      if (data?.user?.email) {
        try {
          await fetch("/api/auth/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "security-alert",
              email: data.user.email,
              actionText: "A sua senha de acesso foi alterada com sucesso.",
            }),
          });
        } catch (alertErr) {
          console.warn("Aviso ao disparar alerta de segurança:", alertErr);
        }
      }

      setSucesso(true);
      setTimeout(() => {
        router.push("/login?msg=reset_done");
      }, 2500);
    } catch (err: any) {
      setErro(err?.message || "Erro inesperado ao atualizar a senha.");
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
        Redefinição de Senha
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
        {sucesso ? (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
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
                fontSize: 24,
                margin: "0 auto 16px auto",
              }}
            >
              ✓
            </div>
            <h2
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: "#FFFFFF",
                marginBottom: 8,
              }}
            >
              Senha redefinida com sucesso!
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "var(--neblina)",
                lineHeight: 1.6,
                marginBottom: 20,
              }}
            >
              Você será redirecionado para a tela de login em instantes...
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
              Ir para o Login Agora
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
                Crie uma nova senha
              </h2>
              <p style={{ fontSize: 13, color: "var(--chumbo)" }}>
                Escolha uma senha forte para proteger sua conta
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
              {/* Nova Senha */}
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <label
                    htmlFor="novaSenha"
                    style={{
                      fontFamily: "var(--font-mono), 'IBM Plex Mono', monospace",
                      fontSize: 10,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--chumbo)",
                    }}
                  >
                    Nova Senha (mínimo 6 dígitos)
                  </label>
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--chumbo)",
                      fontSize: 11,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {mostrarSenha ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <input
                  id="novaSenha"
                  type={mostrarSenha ? "text" : "password"}
                  required
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
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

              {/* Confirmar Senha */}
              <div style={{ marginBottom: 22 }}>
                <label
                  htmlFor="confirmarSenha"
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
                  Confirmar Nova Senha
                </label>
                <input
                  id="confirmarSenha"
                  type={mostrarSenha ? "text" : "password"}
                  required
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
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
                {loading ? "Salvando nova senha..." : "Salvar Nova Senha"}
              </button>
            </form>
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
