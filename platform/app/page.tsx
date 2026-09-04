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

export default function LandingPage() {
  const router = useRouter();
  const { user } = useUser();
  const [billing, setBilling] = useState<"anual" | "mensal">("anual");

  return (
    <div style={{
      background: "#1A1F2E",
      color: V.nb,
      fontFamily: V.db,
      minHeight: "100vh",
      overflowX: "hidden",
    }}>
      {/* ── NAVBAR ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: 64, background: "rgba(26,31,46,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,194,168,0.15)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div onClick={() => router.push("/")} style={{
            fontFamily: V.df, fontSize: 22, fontWeight: 700, color: "#fff", cursor: "pointer",
          }}>
            Med<span style={{ color: V.pu }}>Pleni</span>
          </div>
          <span style={{
            fontFamily: V.dm, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
            padding: "3px 8px", borderRadius: 9999,
            background: "rgba(0,194,168,0.12)", color: V.pu, border: "1px solid rgba(0,194,168,0.3)",
          }}>
            ENAMED 2027
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="#metodo" style={{ color: V.ch, textDecoration: "none", fontSize: 13, fontWeight: 500 }}>
            Metodologia
          </a>
          <a href="#areas" style={{ color: V.ch, textDecoration: "none", fontSize: 13, fontWeight: 500 }}>
            Matriz DCN
          </a>
          <a href="#planos" style={{ color: V.ch, textDecoration: "none", fontSize: 13, fontWeight: 500 }}>
            Planos
          </a>
          <a href="#faq" style={{ color: V.ch, textDecoration: "none", fontSize: 13, fontWeight: 500 }}>
            FAQ
          </a>

          {user ? (
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                padding: "8px 18px", borderRadius: 8,
                background: V.pu, border: "none", color: "#0A1A18",
                fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
                boxShadow: "0 2px 10px rgba(0,194,168,0.3)",
              }}
            >
              Meu Dashboard →
            </button>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => router.push("/login")}
                style={{
                  padding: "8px 16px", borderRadius: 8,
                  background: "transparent", border: "1px solid rgba(61,90,128,0.4)",
                  color: V.nb, fontFamily: V.db, fontSize: 13, fontWeight: 500, cursor: "pointer",
                }}
              >
                Entrar
              </button>
              <button
                onClick={() => router.push("/diagnostico")}
                style={{
                  padding: "8px 18px", borderRadius: 8,
                  background: V.pu, border: "none", color: "#0A1A18",
                  fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(0,194,168,0.3)",
                }}
              >
                Diagnóstico Grátis →
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <section style={{
        padding: "150px 24px 80px",
        textAlign: "center",
        position: "relative",
        background: "radial-gradient(ellipse 80% 50% at 50% 20%, rgba(0,194,168,0.09) 0%, transparent 70%)",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", borderRadius: 9999,
            background: "rgba(0,194,168,0.1)", border: "1px solid rgba(0,194,168,0.3)",
            fontFamily: V.dm, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
            color: V.pu, marginBottom: 24,
          }}>
            <span>●</span> Ciclo de Preparação Estruturado · ENAMED 2027
          </div>

          <h1 style={{
            fontFamily: V.df, fontSize: "clamp(36px, 6vw, 68px)", fontWeight: 700,
            color: "#fff", lineHeight: 1.05, letterSpacing: "-0.02em", marginBottom: 20,
          }}>
            Antes de estudar mais,<br />
            descubra <span style={{ color: V.pu }}>o que você não sabe</span>.
          </h1>

          <p style={{
            fontSize: "clamp(16px, 2vw, 19px)", color: V.ch, maxWidth: 680, margin: "0 auto 36px",
            lineHeight: 1.6,
          }}>
            O ENAMED exige precisão na Matriz de Competências das DCNs. Em 40 minutos, nosso diagnóstico identifica exatamente onde você está perdendo pontos.
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 36 }}>
            <button
              onClick={() => router.push("/diagnostico")}
              style={{
                padding: "16px 32px", borderRadius: 10,
                background: V.pu, border: "none", color: "#0A1A18",
                fontFamily: V.db, fontSize: 15, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 6px 24px rgba(0,194,168,0.35)", transition: "all 0.2s",
              }}
            >
              Fazer o Diagnóstico Grátis (Sem Cartão) →
            </button>
            <a
              href="#planos"
              style={{
                padding: "16px 28px", borderRadius: 10,
                background: "rgba(43,58,82,0.4)", border: "1px solid rgba(61,90,128,0.4)",
                color: "#fff", fontFamily: V.db, fontSize: 15, fontWeight: 600, textDecoration: "none",
                display: "inline-flex", alignItems: "center",
              }}
            >
              Ver Planos e Garantias
            </a>
          </div>

          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap", fontSize: 12, color: V.ch, fontFamily: V.dm }}>
            <span>✓ 100% Gratuito no diagnóstico</span>
            <span>✓ Sem necessidade de cartão</span>
            <span>✓ 30 dias de reembolso incondicional</span>
          </div>
        </div>
      </section>

      {/* ── METODOLOGIA (4 PILARES) ── */}
      <section id="metodo" style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: V.pu, marginBottom: 8 }}>
            // Metodologia Ativa
          </div>
          <h2 style={{ fontFamily: V.df, fontSize: 36, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
            A camada de treino que transforma estudo em aprovação
          </h2>
          <p style={{ fontSize: 15, color: V.ch, maxWidth: 620, margin: "10px auto 0", lineHeight: 1.6 }}>
            Não somos um cursinho teórico de videoaulas intermináveis. Somos a ferramenta de alto rendimento que calibra seu acerto no estilo da prova.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 18 }}>
          {[
            {
              type: "diag",
              title: "Diagnóstico Raio-X",
              desc: "Mapeamento minucioso de 50 a 80 questões por eixo temático, identificando suas lacunas críticas.",
            },
            {
              type: "quest",
              title: "Questões Comentadas",
              desc: "Banco com resolução comentada questão por questão, justificativas oficiais e classificação de complexidade.",
            },
            {
              type: "srs",
              title: "Spaced Repetition (SM-2)",
              desc: "Flashcards com algoritmo de repetição espaçada para blindar sua retenção contra a curva de esquecimento.",
            },
            {
              type: "timer",
              title: "Simulados Cronometrados",
              desc: "Simulações oficiais com timer regressivo, calibração de confiança (1-5) e comparativo com a nota de corte.",
            },
          ].map((item) => (
            <div key={item.title} style={{
              background: V.pe, border: "1px solid rgba(61,90,128,0.3)",
              borderRadius: 14, padding: "26px 22px",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: "rgba(0,194,168,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
                color: V.pu,
              }}>
                {item.type === "diag" && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 18h8" />
                    <path d="M3 22h18" />
                    <path d="M14 22a7 7 0 1 0 0-14h-1" />
                    <path d="M9 14h2" />
                    <path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" />
                    <path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" />
                  </svg>
                )}
                {item.type === "quest" && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                )}
                {item.type === "srs" && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                )}
                {item.type === "timer" && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                )}
              </div>
              <div style={{ fontFamily: V.df, fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 13, color: V.ch, lineHeight: 1.6 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── MATRIZ DE COMPETÊNCIAS ENAMED ── */}
      <section id="areas" style={{
        padding: "80px 24px",
        background: "rgba(43,58,82,0.25)",
        borderTop: "1px solid rgba(61,90,128,0.2)",
        borderBottom: "1px solid rgba(61,90,128,0.2)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: V.pu, marginBottom: 8 }}>
              // Matriz de Competências DCN
            </div>
            <h2 style={{ fontFamily: V.df, fontSize: 34, fontWeight: 700, color: "#fff" }}>
              As 5 Grandes Áreas do ENAMED
            </h2>
            <p style={{ fontSize: 15, color: V.ch, maxWidth: 640, margin: "8px auto 0" }}>
              Destaque especial para <strong>Saúde Coletiva e SUS</strong>, que cai em ~90% das provas e representa 20% da nota final.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            {[
              { name: "Clínica Médica", peso: "25%", color: V.pu, desc: "Emergências clínicas, cardiologia, pneumologia e infecto." },
              { name: "Cirurgia Geral", peso: "20%", color: V.re, desc: "Trauma, abdome agudo, pré e pós-operatório." },
              { name: "Saúde Coletiva & SUS", peso: "20%", color: V.ind, desc: "Atenção Primária, PNAB, vigilância em saúde e bioética." },
              { name: "Pediatria", peso: "17.5%", color: V.wn, desc: "Puericultura, urgências pediátricas e neonatologia." },
              { name: "Ginecologia e Obstetrícia", peso: "17.5%", color: V.dg, desc: "Pré-natal, sangramentos, parto e oncologia ginecológica." },
            ].map((a) => (
              <div key={a.name} style={{
                background: V.pe, border: "1px solid rgba(61,90,128,0.3)",
                borderTop: `3px solid ${a.color}`, borderRadius: 12, padding: "20px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{a.name}</span>
                  <span style={{ fontFamily: V.dm, fontSize: 11, color: a.color, fontWeight: 700 }}>{a.peso}</span>
                </div>
                <div style={{ fontSize: 12, color: V.ch, lineHeight: 1.5 }}>
                  {a.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANOS & OFERTA v2.1 ── */}
      <section id="planos" style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: V.pu, marginBottom: 8 }}>
            // Transparência Total
          </div>
          <h2 style={{ fontFamily: V.df, fontSize: 36, fontWeight: 700, color: "#fff" }}>
            Arquitetura de Planos MedPleni
          </h2>
          <p style={{ fontSize: 15, color: V.ch, maxWidth: 600, margin: "8px auto 0" }}>
            O mercado tradicional cobra de R$ 3.000 a R$ 15.000. Aqui você tem o ciclo completo por um quinto do preço.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
          marginBottom: 30,
        }}>
          {/* Card Gratuito */}
          <div style={{ background: V.pe, border: "1px solid rgba(61,90,128,0.35)", borderRadius: 16, padding: "30px 24px" }}>
            <div style={{ fontFamily: V.dm, fontSize: 10, color: V.ch, textTransform: "uppercase", marginBottom: 8 }}>Gratuito · Sem Cartão</div>
            <div style={{ fontFamily: V.df, fontSize: 24, fontWeight: 700, color: "#fff" }}>MedPleni Diagnóstico</div>
            <div style={{ fontFamily: V.df, fontSize: 36, fontWeight: 700, color: "#fff", margin: "14px 0 6px" }}>R$ 0</div>
            <div style={{ fontSize: 12, color: V.ch, marginBottom: 20 }}>para sempre</div>
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: V.nb, marginBottom: 24 }}>
              <li>✓ Diagnóstico de prontidão completo</li>
              <li>✓ Plano de ação personalizado</li>
              <li>✓ 50 questões comentadas / mês</li>
              <li>✓ 30 flashcards SRS / mês</li>
              <li>✓ 1 simulado cronometrado / mês</li>
            </ul>
            <button
              onClick={() => router.push("/diagnostico")}
              style={{
                width: "100%", padding: "12px 0", borderRadius: 8,
                background: "transparent", border: "1.5px solid rgba(61,90,128,0.5)",
                color: "#fff", fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              Começar Grátis →
            </button>
          </div>

          {/* Card Anual (Destaque) */}
          <div style={{
            background: "linear-gradient(165deg, rgba(0,194,168,0.08) 0%, #2B3A52 50%)",
            border: "2px solid rgba(0,194,168,0.5)", borderRadius: 16, padding: "30px 24px",
            boxShadow: "0 8px 30px rgba(0,194,168,0.15)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontFamily: V.dm, fontSize: 10, color: V.pu, textTransform: "uppercase" }}>Recomendado · Anual</span>
              <span style={{ fontFamily: V.dm, fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "rgba(0,194,168,0.2)", color: V.pu }}>TURMA FUNDADORA</span>
            </div>
            <div style={{ fontFamily: V.df, fontSize: 24, fontWeight: 700, color: "#fff" }}>MedPleni Pleno (Anual)</div>
            <div style={{ fontFamily: V.df, fontSize: 36, fontWeight: 700, color: "#fff", margin: "14px 0 6px" }}>
              R$ 1.497 <span style={{ fontSize: 14, color: V.ch, fontWeight: 400 }}>/ano à vista</span>
            </div>
            <div style={{ fontFamily: V.dm, fontSize: 11, color: V.pu, marginBottom: 20 }}>
              equivale a R$ 124,75/mês ou 12× de R$ 149
            </div>
            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: V.nb, marginBottom: 24 }}>
              <li><strong>✓ Banco de questões e flashcards ilimitados</strong></li>
              <li><strong>✓ Preço travado para sempre em todas as renovações</strong></li>
              <li><strong>✓ Garantia de Ciclo (renovação grátis se não aprovar)</strong></li>
              <li><strong>✓ 30 dias de reembolso incondicional</strong></li>
              <li><strong>✓ Pausa de até 2 meses sem perder acesso</strong></li>
            </ul>
            <button
              onClick={() => router.push("/planos")}
              style={{
                width: "100%", padding: "12px 0", borderRadius: 8,
                background: V.pu, border: "none", color: "#0A1A18",
                fontFamily: V.db, fontSize: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 14px rgba(0,194,168,0.3)",
              }}
            >
              Garantir Minha Vaga no Ciclo 2027 →
            </button>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ padding: "60px 24px 100px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h2 style={{ fontFamily: V.df, fontSize: 30, fontWeight: 700, color: "#fff" }}>
            Perguntas Frequentes
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            {
              q: "Por que o MedPleni custa uma fração dos cursinhos tradicionais?",
              a: "Nosso foco é tecnologia, diagnóstico e treino ativo. Não temos custos com gravações de estúdio nem equipes comerciais comissionadas.",
            },
            {
              q: "Como funciona a Garantia de 30 dias?",
              a: "Você assina com risco zero. Se em 30 dias você não estiver plenamente satisfeito, devolvemos 100% do valor integralmente, sem burocracia.",
            },
            {
              q: "O que é a Garantia de Ciclo?",
              a: "Se você cumprir seu plano de estudos semanal e não for aprovado no ciclo de 2027, o ano seguinte de acesso é por nossa conta.",
            },
          ].map((f) => (
            <div key={f.q} style={{ background: V.pe, border: "1px solid rgba(61,90,128,0.25)", borderRadius: 10, padding: "18px 20px" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{f.q}</div>
              <div style={{ fontSize: 13, color: V.ch, lineHeight: 1.6 }}>{f.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: "1px solid rgba(61,90,128,0.2)",
        padding: "36px 24px", textAlign: "center",
        background: "#0D111C",
      }}>
        <div style={{ fontFamily: V.df, fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
          Med<span style={{ color: V.pu }}>Pleni</span>
        </div>
        <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 8 }}>
          Uma marca da Plenitude Educação · Ciclo ENAMED 2027
        </div>
        <div style={{ fontSize: 11, color: "rgba(138,154,181,0.4)" }}>
          © {new Date().getFullYear()} MedPleni. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
