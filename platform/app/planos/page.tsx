"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

const V = {
  pu: "#00C2A8", re: "#0077B6", rel: "#64B5E8", ind: "#6B5CE7",
  ch: "#8A9AB5", nb: "#E0E6F0", pe: "#2B3A52", am: "#C98A0A",
  wn: "#F5A623", dg: "#FF6B6B", su: "#22C55E",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
  ds: "var(--font-serif), 'Source Serif 4', serif",
};

const features = [
  { name: "Banco de questões comentadas", diag: true, resid: true, aprov: true },
  { name: "Diagnóstico Raio-X Inicial", diag: true, resid: true, aprov: true },
  { name: "Simulados por área", diag: "3", resid: "Ilimitado", aprov: "Ilimitado" },
  { name: "Flashcards Spaced Repetition", diag: false, resid: true, aprov: true },
  { name: "Cronograma IA personalizado", diag: false, resid: true, aprov: true },
  { name: "Predição de aprovação", diag: false, resid: "Básica", aprov: "Avançada" },
  { name: "Simulados com timer cronometrado", diag: false, resid: true, aprov: true },
  { name: "Ranking nacional", diag: false, resid: true, aprov: true },
  { name: "Recomendações IA priorizadas", diag: false, resid: false, aprov: true },
  { name: "Relatórios por prova-alvo", diag: false, resid: false, aprov: true },
  { name: "Ajuste adaptativo de cronograma", diag: false, resid: false, aprov: true },
  { name: "Mentoria IA 24/7", diag: false, resid: false, aprov: true },
  { name: "Acesso prioritário a provas novas", diag: false, resid: false, aprov: true },
];

type Plan = {
  id: string; name: string; subtitle: string;
  priceMonthly: number; priceAnnual: number;
  color: string; popular?: boolean; free?: boolean;
};

const plans: Plan[] = [
  { id: "diag", name: "Diagnóstico", subtitle: "Conheça suas lacunas", priceMonthly: 0, priceAnnual: 0, color: V.ch, free: true },
  { id: "resid", name: "Residente", subtitle: "Para quem quer evoluir", priceMonthly: 117, priceAnnual: 76, color: V.re, popular: true },
  { id: "aprov", name: "Aprovação", subtitle: "Máxima performance", priceMonthly: 237, priceAnnual: 154, color: V.pu },
];

export default function PlanosPage() {
  const router = useRouter();
  const [billing, setBilling] = useState<"mensal" | "anual">("anual");

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 20%, rgba(0,194,168,0.05) 0%, var(--abismo) 60%)",
      padding: "48px 20px",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div onClick={() => router.push("/dashboard")} style={{
          fontFamily: V.df, fontWeight: 700, fontSize: 22, color: "#fff",
          marginBottom: 6, cursor: "pointer",
        }}>
          Med<span style={{ color: V.pu }}>Pleni</span>
        </div>
        <div style={{ fontFamily: V.df, fontSize: 32, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", marginBottom: 6 }}>
          Escolha seu plano
        </div>
        <div style={{ fontFamily: V.ds, fontStyle: "italic", fontSize: 15, color: V.ch }}>
          Invista no que importa: sua aprovação.
        </div>
      </div>

      {/* Toggle */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}>
        <div style={{
          display: "flex", background: "rgba(43,58,82,0.5)",
          borderRadius: 10, padding: 3, border: "1px solid rgba(61,90,128,0.25)",
        }}>
          <button
            onClick={() => setBilling("mensal")}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none",
              background: billing === "mensal" ? V.pe : "transparent",
              color: billing === "mensal" ? "#fff" : V.ch,
              fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            Mensal
          </button>
          <button
            onClick={() => setBilling("anual")}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none",
              background: billing === "anual" ? V.pe : "transparent",
              color: billing === "anual" ? "#fff" : V.ch,
              fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
              transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            Anual
            <span style={{
              fontFamily: V.dm, fontSize: 9, letterSpacing: "0.08em",
              padding: "2px 6px", borderRadius: 9999,
              background: "rgba(0,194,168,0.15)", color: V.pu,
            }}>
              -35%
            </span>
          </button>
        </div>
      </div>

      {/* Plans grid */}
      <div className="plans-grid" style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16, maxWidth: 960, margin: "0 auto",
      }}>
        <style>{`
          @media (max-width:900px) { .plans-grid { grid-template-columns: 1fr !important; max-width: 400px !important; } }
        `}</style>

        {plans.map((p) => {
          const price = billing === "anual" ? p.priceAnnual : p.priceMonthly;
          return (
            <div key={p.id} style={{
              background: V.pe, border: `1.5px solid ${p.popular ? "rgba(0,119,182,0.4)" : "rgba(61,90,128,0.25)"}`,
              borderRadius: 16, padding: "28px 24px", position: "relative",
              boxShadow: p.popular ? "0 8px 32px rgba(0,119,182,0.15)" : "none",
            }}>
              {p.popular && (
                <div style={{
                  position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                  fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
                  padding: "4px 14px", borderRadius: 9999,
                  background: V.re, color: "#fff",
                }}>
                  Mais popular
                </div>
              )}

              <div style={{ fontFamily: V.df, fontSize: 20, fontWeight: 700, color: p.color, marginBottom: 4 }}>
                {p.name}
              </div>
              <div style={{ fontSize: 12, color: V.ch, marginBottom: 16 }}>{p.subtitle}</div>

              <div style={{ marginBottom: 20 }}>
                {p.free ? (
                  <div style={{ fontFamily: V.df, fontSize: 36, fontWeight: 700, color: "#fff" }}>Grátis</div>
                ) : (
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontFamily: V.dm, fontSize: 14, color: V.ch }}>R$</span>
                    <span style={{ fontFamily: V.df, fontSize: 36, fontWeight: 700, color: "#fff" }}>{price}</span>
                    <span style={{ fontSize: 13, color: V.ch }}>/mês</span>
                  </div>
                )}
                {billing === "anual" && !p.free && (
                  <div style={{ fontFamily: V.dm, fontSize: 10, color: V.ch, marginTop: 2 }}>
                    cobrado anualmente · R$ {price * 12}/ano
                  </div>
                )}
              </div>

              {/* Features */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                {features.map((f) => {
                  const val = p.id === "diag" ? f.diag : p.id === "resid" ? f.resid : f.aprov;
                  return (
                    <div key={f.name} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: val ? V.nb : "rgba(138,154,181,0.3)" }}>
                      <span style={{ flexShrink: 0, width: 16, color: val ? V.pu : "rgba(138,154,181,0.2)" }}>
                        {val ? "✓" : "✗"}
                      </span>
                      <span>{f.name}{typeof val === "string" ? ` (${val})` : ""}</span>
                    </div>
                  );
                })}
              </div>

              {/* CTA */}
              <button onClick={() => router.push(p.free ? "/diagnostico" : "/dashboard")} style={{
                width: "100%", padding: "12px 0", borderRadius: 10,
                background: p.free ? "transparent" : p.popular ? V.re : V.pu,
                border: p.free ? `1.5px solid rgba(61,90,128,0.3)` : "none",
                color: p.free ? V.ch : p.popular ? "#fff" : "#0A1A18",
                fontFamily: V.db, fontSize: 14, fontWeight: 600, cursor: "pointer",
                boxShadow: p.free ? "none" : `0 4px 16px ${p.popular ? "rgba(0,119,182,0.3)" : "rgba(0,194,168,0.3)"}`,
              }}>
                {p.free ? "Começar grátis" : "Começar 7 dias grátis"}
              </button>
            </div>
          );
        })}
      </div>

      {/* ROI Card */}
      <div style={{
        maxWidth: 960, margin: "40px auto 0",
        background: "linear-gradient(135deg, rgba(0,194,168,0.06) 0%, rgba(0,119,182,0.06) 100%)",
        border: "1px solid rgba(0,194,168,0.2)", borderRadius: 16, padding: "24px 32px",
      }}>
        <div style={{ fontFamily: V.df, fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
          💰 Por que o MedPleni é o melhor investimento da sua carreira?
        </div>
        <div style={{
          display: "flex", gap: 32, flexWrap: "wrap", alignItems: "center",
          fontFamily: V.dm, fontSize: 12,
        }}>
          <div>
            <div style={{ color: V.dg, fontSize: 20, fontWeight: 700 }}>R$ 24.600</div>
            <div style={{ color: V.ch, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>1 ciclo perdido</div>
          </div>
          <div style={{ fontSize: 24, color: "rgba(61,90,128,0.3)" }}>vs</div>
          <div>
            <div style={{ color: V.pu, fontSize: 20, fontWeight: 700 }}>R$ 1.404</div>
            <div style={{ color: V.ch, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>MedPleni 12 meses</div>
          </div>
          <div style={{ fontSize: 24, color: "rgba(61,90,128,0.3)" }}>=</div>
          <div>
            <div style={{ color: V.su, fontSize: 20, fontWeight: 700 }}>ROI: 16.5×</div>
            <div style={{ color: V.ch, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>Retorno do investimento</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        textAlign: "center", marginTop: 40,
        fontFamily: V.dm, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
        color: "rgba(138,154,181,0.3)",
      }}>
        Grupo Plenitude © 2026 · Cancele quando quiser · Sem multa
      </div>
    </div>
  );
}
