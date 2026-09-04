"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const V = {
  pu: "var(--pulso)",
  re: "var(--resgate)",
  rel: "#64B5E8",
  ind: "#6B5CE7",
  ch: "var(--chumbo)",
  nb: "var(--neblina)",
  pe: "var(--petroleo)",
  am: "#C98A0A",
  wn: "#F5A623",
  dg: "#FF6B6B",
  su: "var(--sucesso)",
  cardBg: "var(--card-bg)",
  cardBorder: "var(--card-border)",
  heading: "var(--heading-color)",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
};

function ConviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isExistingAccount, setIsExistingAccount] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Token de convite não informado.");
      setLoading(false);
      return;
    }

    async function loadInviteAndUser() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUser(user);

        const res = await fetch(`/api/invites/${token}`);
        const data = await res.json();

        if (!res.ok || data.error) {
          setError(data.error || "Convite inválido ou expirado.");
        } else {
          setInvite(data.invite);
        }
      } catch (err: any) {
        setError("Erro ao carregar dados do convite.");
      } finally {
        setLoading(false);
      }
    }

    loadInviteAndUser();
  }, [token]);

  const handleActivateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      alert("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      alert("As senhas digitadas não coincidem.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();

      // 1. Tenta criar conta para novo usuário
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: invite.email,
        password: password,
        options: {
          data: {
            full_name: invite.full_name,
            role: invite.role,
            plan: invite.plan,
            sub_brand: invite.sub_brand,
          },
        },
      });

      // Se já existe no Auth
      if (authErr && (authErr.message.includes("already registered") || authErr.message.includes("unique"))) {
        setIsExistingAccount(true);
        // Tenta fazer login com a senha que acabou de digitar
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: invite.email,
          password: password,
        });

        if (signInErr) {
          throw new Error(
            "Este e-mail já possui uma conta ativa no MedPleni. Por favor, digite a senha da sua conta existente para ativar o novo acesso, ou recupere sua senha."
          );
        }
      } else if (authErr) {
        throw authErr;
      }

      // 2. Confirma ativação do convite na API
      await fetch(`/api/invites/${token}`, { method: "POST" });

      setSuccess(true);
      setTimeout(() => {
        if (["superadmin", "docente", "financeiro", "suporte", "desenvolvedor"].includes(invite.role)) {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      }, 1500);
    } catch (err: any) {
      alert(err.message || "Erro ao ativar acesso.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivateExistingLoggedIn = async () => {
    setSubmitting(true);
    try {
      await fetch(`/api/invites/${token}`, { method: "POST" });
      setSuccess(true);
      setTimeout(() => {
        if (["superadmin", "docente", "financeiro", "suporte", "desenvolvedor"].includes(invite.role)) {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      }, 1500);
    } catch (err: any) {
      alert("Erro ao aplicar convite.");
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "docente":
        return { label: "Docente & Especialista", bg: "rgba(107,92,231,0.2)", border: V.ind, text: "#A29BFE" };
      case "superadmin":
        return { label: "Super Administrador", bg: "rgba(0,194,168,0.2)", border: V.pu, text: V.pu };
      case "financeiro":
        return { label: "Financeiro & Faturamento", bg: "rgba(245,166,35,0.2)", border: V.wn, text: V.wn };
      case "suporte":
        return { label: "Customer Success", bg: "rgba(0,119,182,0.2)", border: V.rel, text: V.rel };
      default:
        return { label: "Aluno / Médico Residente", bg: "rgba(0,194,168,0.15)", border: V.pu, text: V.pu };
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--abismo)", display: "flex", alignItems: "center", justifyContent: "center", color: V.ch }}>
        Validando credenciais do convite...
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--abismo)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ background: "var(--card-bg)", border: "1px solid rgba(255,107,107,0.4)", borderRadius: 16, padding: 32, maxWidth: 440, width: "100%", textAlign: "center", boxShadow: "var(--card-shadow)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontFamily: V.df, fontSize: 22, color: "var(--heading-color)", marginBottom: 8 }}>Convite Indisponível</h2>
          <p style={{ color: V.ch, fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
            {error || "Este link de convite expirou, foi cancelado ou já foi utilizado."}
          </p>
          <Link href="/login" style={{ display: "inline-block", background: V.pu, color: "#0A1A18", padding: "10px 24px", borderRadius: 8, fontWeight: 700, textDecoration: "none", fontSize: 13 }}>
            Ir para a Página de Login
          </Link>
        </div>
      </div>
    );
  }

  const roleStyle = getRoleBadge(invite.role);
  const isAlreadyLoggedInWithMatchingEmail =
    currentUser && currentUser.email?.toLowerCase() === invite.email?.toLowerCase();

  return (
    <div style={{ minHeight: "100vh", background: "var(--abismo)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: 20,
        padding: "36px 32px",
        maxWidth: 480,
        width: "100%",
        boxShadow: "var(--card-shadow)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: V.df, fontSize: 24, fontWeight: 800, color: "var(--heading-color)" }}>
              Med<span style={{ color: V.pu }}>Pleni</span>
            </span>
            <span style={{
              fontFamily: V.dm, fontSize: 9, padding: "2px 6px", borderRadius: 4,
              background: roleStyle.bg, border: `1px solid ${roleStyle.border}`, color: roleStyle.text, fontWeight: 700, textTransform: "uppercase",
            }}>
              {roleStyle.label}
            </span>
          </div>
          <p style={{ color: V.ch, fontSize: 12, margin: 0 }}>
            Convite oficial para ativação de acesso médico
          </p>
        </div>

        {/* Resumo do Convite */}
        <div style={{
          background: "var(--input-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: 12,
          padding: "16px 18px",
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 13, color: "var(--heading-color)", fontWeight: 600, marginBottom: 4 }}>
            {invite.full_name}
          </div>
          <div style={{ fontSize: 12, color: V.ch, marginBottom: 10 }}>
            {invite.email}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, paddingTop: 10, borderTop: "1px solid var(--card-border)", fontSize: 11 }}>
            <div>
              <span style={{ color: V.ch, display: "block" }}>Plano de Acesso:</span>
              <strong style={{ color: V.pu }}>{invite.plan === "pleno_anual" ? "Pleno Anual" : invite.plan}</strong>
            </div>
            <div>
              <span style={{ color: V.ch, display: "block" }}>Validade:</span>
              <strong style={{ color: V.wn }}>
                {invite.access_expires_at ? `Até ${new Date(invite.access_expires_at).toLocaleDateString("pt-BR")}` : "Vitalício"}
              </strong>
            </div>
          </div>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
            <h3 style={{ color: "var(--heading-color)", fontSize: 18, marginBottom: 6 }}>Acesso Ativado com Sucesso!</h3>
            <p style={{ color: V.ch, fontSize: 12 }}>Redirecionando para seu painel em instantes...</p>
          </div>
        ) : isAlreadyLoggedInWithMatchingEmail ? (
          /* Usuário já está logado com este e-mail */
          <div>
            <p style={{ color: V.nb, fontSize: 13, textAlign: "center", marginBottom: 20 }}>
              Você já está autenticado como <strong>{currentUser.email}</strong>. Clique no botão abaixo para aplicar este convite imediatamente ao seu perfil.
            </p>
            <button
              onClick={handleActivateExistingLoggedIn}
              disabled={submitting}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 8,
                background: V.pu,
                border: "none",
                color: "#0A1A18",
                fontWeight: 700,
                fontSize: 14,
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: "0 4px 20px rgba(0,194,168,0.3)",
              }}
            >
              {submitting ? "Aplicando..." : "Aceitar Convite & Acessar"}
            </button>
          </div>
        ) : (
          /* Formulário de Criação de Senha para Novo Usuário */
          <form onSubmit={handleActivateNewUser}>
            <div style={{ marginBottom: 6, fontSize: 12, color: V.pu, fontWeight: 600 }}>
              Crie sua senha de primeiro acesso:
            </div>
            <div style={{ fontSize: 11, color: V.ch, marginBottom: 16 }}>
              Defina a senha que você usará para fazer login na plataforma.
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, color: V.ch, marginBottom: 4, fontWeight: 600 }}>
                Nova Senha (Mínimo 6 dígitos)
              </label>
              <input
                type="password"
                placeholder="Digite sua senha segura"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: 8,
                  background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "var(--neblina)",
                  fontSize: 13, outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, color: V.ch, marginBottom: 4, fontWeight: 600 }}>
                Confirme sua Senha
              </label>
              <input
                type="password"
                placeholder="Repita a senha criada"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: 8,
                  background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "var(--neblina)",
                  fontSize: 13, outline: "none",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 8,
                background: V.pu,
                border: "none",
                color: "#0A1A18",
                fontWeight: 700,
                fontSize: 14,
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: "0 4px 20px rgba(0,194,168,0.3)",
              }}
            >
              {submitting ? "Criando conta e ativando..." : "Concluir Cadastro & Entrar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ConvitePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--abismo)" }} />}>
      <ConviteContent />
    </Suspense>
  );
}
