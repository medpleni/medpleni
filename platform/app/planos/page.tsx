"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/supabase/use-user";

const V = {
  pu: "#00C2A8", re: "#0077B6", rel: "#64B5E8", ind: "#6B5CE7",
  ch: "#8A9AB5", nb: "#E0E6F0", pe: "#2B3A52", am: "#C98A0A",
  wn: "#F5A623", dg: "#FF6B6B", su: "#22C55E",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
  ds: "var(--font-serif), 'Source Serif 4', serif",
  ab: "#1A1F2E", deeper: "#0D111C",
};

export default function PlanosPage() {
  const router = useRouter();
  const { user } = useUser();
  const [billing, setBilling] = useState<"anual" | "mensal">("anual");
  const [selectedPlan, setSelectedPlan] = useState<"pleno_anual" | "pleno_mensal" | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "pix">("credit_card");
  const [installments, setInstallments] = useState(12);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const handleCheckout = async (planId: "pleno_anual" | "pleno_mensal") => {
    if (!user) {
      router.push(`/cadastro?redirect=/planos`);
      return;
    }
    setSelectedPlan(planId);
  };

  const submitPayment = async () => {
    if (!user || !selectedPlan) return;
    setLoadingCheckout(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          planId: selectedPlan,
          customer: {
            name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Doutor(a)",
            email: user.email,
          },
          paymentMethod,
          installments: selectedPlan === "pleno_anual" ? installments : 1,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCheckoutSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        alert(data.error || "Erro ao processar checkout.");
      }
    } catch {
      alert("Erro na conexão com o gateway.");
    } finally {
      setLoadingCheckout(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 15%, rgba(0,194,168,0.06) 0%, #1A1F2E 65%)",
      padding: "48px 20px 80px",
      color: V.nb,
      fontFamily: V.db,
    }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>

        {/* ── HEADER ── */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div onClick={() => router.push("/dashboard")} style={{
            fontFamily: V.df, fontWeight: 700, fontSize: 24, color: "#fff",
            marginBottom: 8, cursor: "pointer", display: "inline-block",
          }}>
            Med<span style={{ color: V.pu }}>Pleni</span>
          </div>
          <div style={{
            fontFamily: V.dm, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
            color: V.pu, marginBottom: 8,
          }}>
            Arquitetura de Planos v2.1
          </div>
          <h1 style={{ fontFamily: V.df, fontSize: 36, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", marginBottom: 10 }}>
            Um plano. Acesso total. Risco zero.
          </h1>
          <p style={{ fontSize: 15, color: V.ch, maxWidth: 640, margin: "0 auto", lineHeight: 1.6 }}>
            Sem áreas bloqueadas, sem letras miúdas. Treinamento de alto rendimento para o ciclo do ENAMED 2027.
          </p>
        </div>

        {/* ── TOGGLE ── */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <div style={{
            display: "flex", background: "rgba(43,58,82,0.6)",
            borderRadius: 12, padding: 4, border: "1px solid rgba(61,90,128,0.3)",
          }}>
            <button
              onClick={() => setBilling("anual")}
              style={{
                padding: "9px 22px", borderRadius: 8, border: "none",
                background: billing === "anual" ? V.pu : "transparent",
                color: billing === "anual" ? "#0A1A18" : V.ch,
                fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8,
              }}
            >
              Plano Anual
              <span style={{
                fontSize: 10, padding: "2px 7px", borderRadius: 9999,
                background: billing === "anual" ? "#0A1A18" : "rgba(0,194,168,0.15)",
                color: billing === "anual" ? V.pu : V.pu,
                fontFamily: V.dm, fontWeight: 700,
              }}>
                50% OFF
              </span>
            </button>
            <button
              onClick={() => setBilling("mensal")}
              style={{
                padding: "9px 22px", borderRadius: 8, border: "none",
                background: billing === "mensal" ? V.pe : "transparent",
                color: billing === "mensal" ? "#fff" : V.ch,
                fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Plano Mensal
            </button>
          </div>
        </div>

        {/* ── PLAN GRID ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
          marginBottom: 32,
        }}>

          {/* CARD 1: DIAGNÓSTICO (GRATUITO) */}
          <div style={{
            background: V.pe, border: "1px solid rgba(61,90,128,0.35)",
            borderRadius: 16, padding: "30px 26px", display: "flex", flexDirection: "column",
          }}>
            <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: V.ch, marginBottom: 10 }}>
              Gratuito · Sem Cartão
            </div>
            <div style={{ fontFamily: V.df, fontSize: 26, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
              Diagnóstico
            </div>
            <div style={{ fontSize: 13, color: V.ch, lineHeight: 1.5, marginBottom: 20, minHeight: 40 }}>
              O raio-x da sua prova-alvo. Para saber exatamente onde você está antes de decidir.
            </div>

            <div style={{ fontFamily: V.df, fontSize: 38, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
              <span style={{ fontSize: 20, color: V.ch, marginRight: 2 }}>R$</span>0
            </div>
            <div style={{ fontFamily: V.dm, fontSize: 11, color: V.ch, marginTop: 8 }}>
              gratuito para sempre
            </div>

            <hr style={{ border: "none", borderTop: "1px solid rgba(61,90,128,0.25)", margin: "20px 0 18px" }} />

            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, flex: 1, padding: 0 }}>
              {[
                "Diagnóstico de prontidão completo",
                "Plano de ação personalizado",
                "Card de resultado compartilhável",
                "50 questões comentadas / mês",
                "30 flashcards / mês",
                "1 simulado cronometrado / mês",
              ].map((item) => (
                <li key={item} style={{ fontSize: 13, color: V.nb, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: V.pu, fontWeight: 700 }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
              <li style={{ fontSize: 13, color: "rgba(138,154,181,0.5)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span>✕</span>
                <span>Sem analytics detalhado de subtópicos</span>
              </li>
              <li style={{ fontSize: 13, color: "rgba(138,154,181,0.5)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span>✕</span>
                <span>Sem banco de questões completo</span>
              </li>
            </ul>

            <button
              onClick={() => router.push("/diagnostico")}
              style={{
                marginTop: 24, width: "100%", padding: "12px 0", borderRadius: 8,
                background: "transparent", border: "1.5px solid rgba(61,90,128,0.5)",
                color: V.nb, fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              Fazer o Diagnóstico Grátis →
            </button>
          </div>

          {/* CARD 2: PLENO MENSAL */}
          <div style={{
            background: V.pe, border: "1px solid rgba(61,90,128,0.35)",
            borderRadius: 16, padding: "30px 26px", display: "flex", flexDirection: "column",
          }}>
            <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: V.ch, marginBottom: 10 }}>
              Pago · Mensal
            </div>
            <div style={{ fontFamily: V.df, fontSize: 26, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
              Pleno Mensal
            </div>
            <div style={{ fontSize: 13, color: V.ch, lineHeight: 1.5, marginBottom: 20, minHeight: 40 }}>
              Acesso total sem compromisso de prazo. Para quem quer testar o ritmo antes de fechar o ciclo.
            </div>

            <div style={{ fontFamily: V.df, fontSize: 38, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
              <span style={{ fontSize: 20, color: V.ch, marginRight: 2 }}>R$</span>247
              <span style={{ fontSize: 14, color: V.ch, fontWeight: 500 }}> /mês</span>
            </div>
            <div style={{ fontFamily: V.dm, fontSize: 11, color: V.ch, marginTop: 8 }}>
              cancele quando quiser
            </div>

            <hr style={{ border: "none", borderTop: "1px solid rgba(61,90,128,0.25)", margin: "20px 0 18px" }} />

            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, flex: 1, padding: 0 }}>
              {[
                "Banco completo de questões sem limites",
                "Flashcards ilimitados (Spaced Repetition SM-2)",
                "Simulados ilimitados (Formato ENAMED)",
                "Analytics de desempenho por subtópico",
                "Todas as áreas médicas sem bloqueio",
                "Ranking nacional e predição",
                "Suporte via chat",
              ].map((item) => (
                <li key={item} style={{ fontSize: 13, color: V.nb, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: V.pu, fontWeight: 700 }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
              <li style={{ fontSize: 13, color: "rgba(138,154,181,0.5)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span>✕</span>
                <span>Sem Garantia de Ciclo</span>
              </li>
              <li style={{ fontSize: 13, color: "rgba(138,154,181,0.5)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span>✕</span>
                <span>Sem preço travado</span>
              </li>
            </ul>

            <button
              onClick={() => handleCheckout("pleno_mensal")}
              style={{
                marginTop: 24, width: "100%", padding: "12px 0", borderRadius: 8,
                background: "transparent", border: "1.5px solid rgba(0,194,168,0.4)",
                color: V.pu, fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              Assinar Mensal
            </button>
          </div>

          {/* CARD 3: PLENO ANUAL (DESTAQUE / RECOMENDADO) */}
          <div style={{
            background: "linear-gradient(165deg, rgba(0,194,168,0.08) 0%, #2B3A52 50%)",
            border: "2px solid rgba(0,194,168,0.5)",
            borderRadius: 16, padding: "30px 26px", display: "flex", flexDirection: "column",
            position: "relative", overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0,194,168,0.12)",
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 4,
              background: `linear-gradient(90deg, ${V.pu}, rgba(0,194,168,0.3))`,
            }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: V.pu }}>
                Pago · Anual — Recomendado
              </span>
              <span style={{
                fontFamily: V.dm, fontSize: 9, padding: "2px 7px", borderRadius: 4,
                background: "rgba(0,194,168,0.2)", color: V.pu, fontWeight: 700,
              }}>
                TURMA FUNDADORA
              </span>
            </div>

            <div style={{ fontFamily: V.df, fontSize: 26, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
              Pleno Anual
            </div>
            <div style={{ fontSize: 13, color: V.ch, lineHeight: 1.5, marginBottom: 20, minHeight: 40 }}>
              O ciclo inteiro de preparação, do diagnóstico ao resultado. Tudo do Mensal mais 5 condições exclusivas.
            </div>

            <div style={{ fontFamily: V.df, fontSize: 38, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
              <span style={{ fontSize: 20, color: V.ch, marginRight: 2 }}>R$</span>1.497
              <span style={{ fontSize: 14, color: V.ch, fontWeight: 500 }}> /ano</span>
            </div>
            <div style={{ fontFamily: V.dm, fontSize: 11, color: V.pu, marginTop: 8, lineHeight: 1.5 }}>
              à vista · equivale a R$ 124,75/mês<br />ou 12× de R$ 149 no cartão
            </div>

            <hr style={{ border: "none", borderTop: "1px solid rgba(0,194,168,0.25)", margin: "20px 0 18px" }} />

            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, flex: 1, padding: 0 }}>
              <li style={{ fontSize: 13, color: "#fff", fontWeight: 600, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: V.pu, fontWeight: 700 }}>✓</span>
                <span>Tudo do Pleno Mensal</span>
              </li>
              {[
                "Preço travado em todas as renovações",
                "Garantia de Ciclo — renovação gratuita se não aprovar",
                "30 dias de reembolso incondicional",
                "Direito a pausar por até 2 meses",
                "Selo permanente de Turma Fundadora (200 primeiros)",
              ].map((item) => (
                <li key={item} style={{ fontSize: 13, color: V.nb, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: V.pu, fontWeight: 700 }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout("pleno_anual")}
              style={{
                marginTop: 24, width: "100%", padding: "13px 0", borderRadius: 8,
                background: V.pu, border: "none", color: "#0A1A18",
                fontFamily: V.db, fontSize: 14, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 18px rgba(0,194,168,0.3)",
              }}
            >
              Começar o Ciclo Anual →
            </button>
          </div>
        </div>

        {/* ── CALLOUT MATEMÁTICO ── */}
        <div style={{
          background: "linear-gradient(135deg, rgba(0,119,182,0.12) 0%, rgba(43,58,82,0.5) 100%)",
          border: "1px solid rgba(0,119,182,0.35)", borderRadius: 14,
          padding: "20px 24px", marginBottom: 36,
        }}>
          <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#64B5E8", marginBottom: 6 }}>
            A conta que sustenta o plano anual
          </div>
          <div style={{ fontSize: 14, color: V.nb, lineHeight: 1.6 }}>
            Doze meses no Mensal custam <strong>R$ 2.964</strong>. O Anual à vista custa <strong>R$ 1.497</strong> — economia de <strong>R$ 1.467, praticamente metade do preço (49,5% de desconto)</strong>. Mesmo parcelado em 12× de R$ 149, você economiza <strong>R$ 1.176 no ano</strong>.
          </div>
        </div>

        {/* ── 5 CONDIÇÕES EXCLUSIVAS DO ANUAL ── */}
        <div style={{ marginBottom: 44 }}>
          <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: V.pu, marginBottom: 8 }}>
            // O Pacote Anual
          </div>
          <h2 style={{ fontFamily: V.df, fontSize: 26, fontWeight: 700, color: "#fff", marginBottom: 18 }}>
            Cinco condições exclusivas do ciclo anual
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14,
          }}>
            {[
              {
                title: "Preço travado para sempre",
                desc: "Quem assina agora mantém R$ 1.497 em todas as renovações, mesmo quando o preço subir.",
                sub: "Custo zero hoje · Urgência real",
              },
              {
                title: "Garantia de Ciclo",
                desc: "Se não aprovar no ciclo, a renovação por mais 12 meses é gratuita. Sujeita a regulamento de uso mínimo.",
                sub: "Dividimos o risco com você",
              },
              {
                title: "30 dias de reembolso incondicional",
                desc: "Integral, sem perguntas, sem burocracia. Contrapeso obrigatório para seu desembolso com risco zero.",
                sub: "Risco zero de experimentação",
              },
              {
                title: "Pausa de até 2 meses",
                desc: "Plantão, prova adiada, imprevisto. Pause sua assinatura e retome depois sem perder nenhum dia de acesso.",
                sub: "Flexibilidade para sua rotina",
              },
              {
                title: "Turma Fundadora (200 primeiros)",
                desc: "Primeiros 200 assinantes anuais recebem selo permanente no perfil e canal direto com os fundadores.",
                sub: "Comunidade VIP de pioneiros",
              },
            ].map((b) => (
              <div key={b.title} style={{
                background: V.pe, border: "1px solid rgba(61,90,128,0.3)",
                borderRadius: 12, padding: "20px",
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                  {b.title}
                </div>
                <div style={{ fontSize: 13, color: V.ch, lineHeight: 1.5, marginBottom: 12 }}>
                  {b.desc}
                </div>
                <div style={{ fontFamily: V.dm, fontSize: 9, color: V.pu, textTransform: "uppercase" }}>
                  {b.sub}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: V.pu, marginBottom: 8 }}>
            // Perguntas Frequentes
          </div>
          <h2 style={{ fontFamily: V.df, fontSize: 26, fontWeight: 700, color: "#fff", marginBottom: 18 }}>
            Tudo o que você precisa saber
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              {
                q: "Por que é tão mais barato que os cursinhos tradicionais?",
                a: "Nosso custo é software e inteligência de dados, não estúdio de gravação, elenco de professores e equipes comissionadas de vendas. Não temos videoaulas porque o gargalo médico está em saber ONDE estudar e treinar por questões com repetição espaçada.",
              },
              {
                q: "Vocês cobrem a prova do ENAMED?",
                a: "Sim! Nosso motor é 100% calibrado sobre a Matriz de Competências das 5 grandes áreas das DCNs do ENAMED (Clínica Médica, Cirurgia, Saúde Coletiva/SUS, Pediatria e GO).",
              },
              {
                q: "Como funciona a Garantia de 30 dias?",
                a: "Você tem 30 dias corridos a partir da assinatura para usar a plataforma sem restrições. Se achar que não é para você, basta solicitar o cancelamento e devolvemos 100% do valor pago.",
              },
              {
                q: "O que é a Garantia de Ciclo?",
                a: "Se você cumprir ao menos 70% das metas semanais ao longo de 40 semanas e não for aprovado no ciclo de 2027, renovamos sua assinatura por mais 12 meses gratuitamente.",
              },
            ].map((faq) => (
              <div key={faq.q} style={{
                background: V.pe, border: "1px solid rgba(61,90,128,0.25)",
                borderRadius: 10, padding: "18px 20px",
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 6 }}>
                  {faq.q}
                </div>
                <div style={{ fontSize: 13, color: V.ch, lineHeight: 1.6 }}>
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── MODAL CHECKOUT (IUGU) ── */}
      {selectedPlan && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(13,17,28,0.85)",
          backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 20,
        }}>
          <div style={{
            background: "#1A1F2E", border: "1px solid rgba(0,194,168,0.4)",
            borderRadius: 16, maxWidth: 460, width: "100%", padding: 28,
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          }}>
            {checkoutSuccess ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <div style={{ fontFamily: V.df, fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                  Assinatura Confirmada!
                </div>
                <div style={{ fontSize: 13, color: V.ch, marginBottom: 16 }}>
                  Seu plano <strong>MedPleni Pleno</strong> já está ativo no Supabase. Redirecionando para o seu dashboard...
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: V.df, fontSize: 20, fontWeight: 700, color: "#fff" }}>
                      Finalizar Assinatura
                    </div>
                    <div style={{ fontFamily: V.dm, fontSize: 10, color: V.pu, textTransform: "uppercase" }}>
                      {selectedPlan === "pleno_anual" ? "MedPleni Pleno Anual (R$ 1.497)" : "MedPleni Pleno Mensal (R$ 247/mês)"}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPlan(null)}
                    style={{ background: "transparent", border: "none", color: V.ch, fontSize: 20, cursor: "pointer" }}
                  >
                    ✕
                  </button>
                </div>

                {/* Método de Pagamento */}
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <button
                    onClick={() => setPaymentMethod("credit_card")}
                    style={{
                      flex: 1, padding: "10px", borderRadius: 8,
                      background: paymentMethod === "credit_card" ? "rgba(0,194,168,0.15)" : "rgba(43,58,82,0.4)",
                      border: `1.5px solid ${paymentMethod === "credit_card" ? V.pu : "rgba(61,90,128,0.3)"}`,
                      color: paymentMethod === "credit_card" ? V.pu : V.ch,
                      fontFamily: V.db, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    💳 Cartão de Crédito
                  </button>
                  <button
                    onClick={() => setPaymentMethod("pix")}
                    style={{
                      flex: 1, padding: "10px", borderRadius: 8,
                      background: paymentMethod === "pix" ? "rgba(0,194,168,0.15)" : "rgba(43,58,82,0.4)",
                      border: `1.5px solid ${paymentMethod === "pix" ? V.pu : "rgba(61,90,128,0.3)"}`,
                      color: paymentMethod === "pix" ? V.pu : V.ch,
                      fontFamily: V.db, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    ⚡ PIX à Vista
                  </button>
                </div>

                {paymentMethod === "credit_card" && selectedPlan === "pleno_anual" && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 11, color: V.ch, marginBottom: 6 }}>
                      Parcelamento
                    </label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      style={{
                        width: "100%", padding: "10px 12px", borderRadius: 8,
                        background: V.pe, border: "1px solid rgba(61,90,128,0.3)",
                        color: "#fff", fontFamily: V.db, fontSize: 13,
                      }}
                    >
                      <option value={1}>1× de R$ 1.497,00 (à vista)</option>
                      <option value={6}>6× de R$ 268,50</option>
                      <option value={12}>12× de R$ 149,00 (recomendado)</option>
                    </select>
                  </div>
                )}

                <div style={{
                  padding: "12px", background: "rgba(0,194,168,0.06)",
                  border: "1px solid rgba(0,194,168,0.2)", borderRadius: 8, marginBottom: 20,
                  fontSize: 11, color: V.ch, lineHeight: 1.5,
                }}>
                  🔒 Pagamento processado com segurança via <strong>Iugu Gateway</strong>. Garantia incondicional de 30 dias inclusa.
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setSelectedPlan(null)}
                    style={{
                      flex: 1, padding: "12px 0", borderRadius: 8,
                      background: "transparent", border: "1px solid rgba(61,90,128,0.3)",
                      color: V.ch, fontFamily: V.db, fontSize: 13, cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={submitPayment}
                    disabled={loadingCheckout}
                    style={{
                      flex: 2, padding: "12px 0", borderRadius: 8,
                      background: V.pu, border: "none", color: "#0A1A18",
                      fontFamily: V.db, fontSize: 13, fontWeight: 700, cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(0,194,168,0.3)",
                    }}
                  >
                    {loadingCheckout ? "Processando..." : "Confirmar e Assinar →"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
