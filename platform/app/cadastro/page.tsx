"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function CadastroPage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!nome.trim()) {
      setErro("Por favor, informe seu nome completo.");
      return;
    }

    if (!email.trim()) {
      setErro("Por favor, informe seu endereço de e-mail.");
      return;
    }

    if (senha.length < 6) {
      setErro("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    if (senha !== confirmarSenha) {
      setErro("As senhas informadas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const origin = window.location.origin;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: {
          data: {
            full_name: nome.trim(),
          },
          emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
        },
      });

      if (error) {
        if (error.message.includes("already registered") || error.message.includes("unique constraint")) {
          setErro("Este e-mail já está cadastrado. Tente fazer login.");
        } else {
          setErro(error.message || "Erro ao criar conta.");
        }
        setLoading(false);
        return;
      }

      // Envia e-mail de boas-vindas transacional via Resend
      try {
        await fetch("/api/auth/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "welcome",
            email: email.trim(),
            name: nome.trim(),
            loginUrl: `${origin}/login`,
          }),
        });
      } catch (emailErr) {
        console.warn("Aviso ao disparar e-mail de boas-vindas:", emailErr);
      }

      // Se a sessão foi criada imediatamente (sem email confirmation obrigatório)
      if (data?.session) {
        router.push("/onboarding");
        router.refresh();
      } else {
        // Exige confirmação por e-mail
        setSucesso(true);
      }
    } catch (err: any) {
      setErro(err?.message || "Erro inesperado ao cadastrar.");
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
      {/* Logo MedPleni */}
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
        Primeiro Acesso & Criação de Conta
      </div>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
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
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(0,194,168,0.15)",
                color: "#00C2A8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                margin: "0 auto 16px auto",
              }}
            >
              ✓
            </div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#FFFFFF",
                marginBottom: 10,
              }}
            >
              Conta criada com sucesso!
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "var(--neblina)",
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              Enviamos uma mensagem de confirmação para <strong>{email}</strong>.
              Verifique sua caixa de entrada e spam para ativar seu acesso.
            </p>
            <Link
              href="/login"
              style={{
                display: "inline-block",
                width: "100%",
                padding: "13px 0",
                background: "#00C2A8",
                color: "#0A1A18",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 15,
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              Ir para o Login
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
                Cadastre-se na Plataforma
              </h2>
              <p style={{ fontSize: 13, color: "var(--chumbo)" }}>
                Inicie sua preparação personalizada para residência
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
                <span>⚠️</span>
                <span>{erro}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Nome */}
              <div style={{ marginBottom: 14 }}>
                <label
                  htmlFor="nome"
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
                  Nome Completo
                </label>
                <input
                  id="nome"
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Dra. Mariana Silva"
                  autoComplete="name"
                  style={{
                    width: "100%",
                    padding: "11px 14px",
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

              {/* Email */}
              <div style={{ marginBottom: 14 }}>
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
                  E-mail
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
                    padding: "11px 14px",
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

              {/* Senha */}
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <label
                    htmlFor="senha"
                    style={{
                      fontFamily: "var(--font-mono), 'IBM Plex Mono', monospace",
                      fontSize: 10,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--chumbo)",
                    }}
                  >
                    Senha (mínimo 6 dígitos)
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
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  style={{
                    width: "100%",
                    padding: "11px 14px",
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
                  Confirmar Senha
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
                    padding: "11px 14px",
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

              {/* Submit */}
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
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {loading ? "Criando conta..." : "Criar Minha Conta"}
              </button>
            </form>

            <div
              style={{
                textAlign: "center",
                marginTop: 20,
                fontSize: 13,
                color: "var(--chumbo)",
                paddingTop: 16,
                borderTop: "1px solid rgba(61,90,128,0.25)",
              }}
            >
              Já possui uma conta?{" "}
              <Link
                href="/login"
                style={{
                  color: "#00C2A8",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                Fazer login
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Footer LGPD */}
      <div
        style={{
          marginTop: 36,
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
