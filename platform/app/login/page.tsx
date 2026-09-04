"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("error") === "auth_callback_failed") {
      setErro("Falha na autenticação via link. Por favor, tente novamente.");
    }
    if (searchParams.get("msg") === "registered") {
      setMensagemSucesso("Conta criada com sucesso! Você já pode entrar.");
    }
    if (searchParams.get("msg") === "reset_done") {
      setMensagemSucesso("Senha redefinida com sucesso! Faça login com a nova senha.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setMensagemSucesso(null);

    if (!email || !senha) {
      setErro("Por favor, preencha seu e-mail e senha.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (error) {
        if (
          error.message.includes("Invalid login credentials") ||
          error.message.includes("invalid_grant")
        ) {
          setErro("E-mail ou senha incorretos. Verifique suas credenciais.");
        } else if (error.message.includes("Email not confirmed")) {
          setErro("Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.");
        } else {
          setErro(error.message || "Ocorreu um erro ao tentar entrar.");
        }
        setLoading(false);
        return;
      }

      if (data?.session) {
        router.push(redirectPath);
        router.refresh();
      }
    } catch (err: any) {
      setErro(err?.message || "Erro inesperado ao conectar ao servidor.");
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
      <div style={{ marginBottom: 12, opacity: loading ? 0.6 : 1, transition: "opacity 0.3s" }}>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
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
          fontSize: 34,
          color: "var(--heading-color)",
          letterSpacing: "-0.02em",
          marginBottom: 6,
        }}
      >
        Med<span style={{ color: "var(--pulso)" }}>Pleni</span>
      </div>

      <div
        style={{
          fontFamily: "var(--font-serif), 'Source Serif 4', serif",
          fontStyle: "italic",
          fontSize: 15,
          color: "var(--chumbo)",
          marginBottom: 36,
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        Medicina com propósito. Tecnologia com precisão.
      </div>

      {/* Form card */}
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: 16,
          padding: "32px 28px",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--heading-color)",
              marginBottom: 4,
            }}
          >
            Acesso à Plataforma
          </h2>
          <p style={{ fontSize: 13, color: "var(--chumbo)" }}>
            Informe seus dados para continuar sua preparação
          </p>
        </div>

        {/* Feedback Messages */}
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

        {mensagemSucesso && (
          <div
            style={{
              background: "rgba(0, 194, 168, 0.12)",
              border: "1px solid rgba(0, 194, 168, 0.4)",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 18,
              color: "var(--pulso)",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>✓</span>
            <span>{mensagemSucesso}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: 16 }}>
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
                padding: "12px 14px",
                background: "var(--input-bg)",
                border: "1.5px solid var(--card-border)",
                borderRadius: 8,
                color: "var(--neblina)",
                fontFamily: "var(--font-body), 'Inter', sans-serif",
                fontSize: 14,
                outline: "none",
                transition: "border-color 0.18s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--pulso)")}
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--card-border)")
              }
            />
          </div>

          {/* Senha */}
          <div style={{ marginBottom: 22 }}>
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
                Senha
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
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "var(--input-bg)",
                border: "1.5px solid var(--card-border)",
                borderRadius: 8,
                color: "var(--neblina)",
                fontFamily: "var(--font-body), 'Inter', sans-serif",
                fontSize: 14,
                outline: "none",
                transition: "border-color 0.18s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--pulso)")}
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--card-border)")
              }
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px 0",
              background: loading ? "rgba(0,194,168,0.5)" : "var(--pulso)",
              border: "none",
              borderRadius: 10,
              fontFamily: "var(--font-body), 'Inter', sans-serif",
              fontSize: 15,
              fontWeight: 600,
              color: "#0A1A18",
              cursor: loading ? "wait" : "pointer",
              transition: "all 0.2s",
              boxShadow: loading ? "none" : "0 4px 20px rgba(0,194,168,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <svg
                  style={{
                    animation: "spin 1s linear infinite",
                    width: 16,
                    height: 16,
                  }}
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#0A1A18"
                    strokeWidth="3"
                    strokeDasharray="31.4 31.4"
                  />
                </svg>
                <span>Entrando...</span>
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </form>

        {/* Links: Cadastro & Recuperar Senha */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 22,
            fontSize: 13,
            paddingTop: 16,
            borderTop: "1px solid var(--card-border)",
          }}
        >
          <Link
            href="/cadastro"
            style={{
              color: "var(--pulso)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Criar conta
          </Link>
          <span style={{ color: "rgba(61,90,128,0.4)" }}>·</span>
          <Link
            href="/recuperar-senha"
            style={{
              color: "var(--chumbo)",
              textDecoration: "none",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--pulso)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--chumbo)")}
          >
            Esqueci a senha
          </Link>
        </div>
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "var(--abismo)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--pulso)",
          }}
        >
          Carregando...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
