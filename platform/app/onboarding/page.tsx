"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

/* ═══════════════════════════════════════════════════
   ONBOARDING — 5 Steps Single-Page Flow
═══════════════════════════════════════════════════ */

const V = {
  pu: "#00C2A8", re: "#0077B6", ind: "#6B5CE7",
  ch: "#8A9AB5", nb: "#E0E6F0", wn: "#F5A623",
  pe: "#2B3A52", si: "#3D5A80",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
  ds: "var(--font-serif), 'Source Serif 4', serif",
};

const chipStyle = (selected: boolean, disabled?: boolean): React.CSSProperties => ({
  padding: "8px 16px", borderRadius: 9999,
  background: disabled ? "rgba(61,90,128,0.08)" : selected ? "rgba(0,194,168,0.12)" : "rgba(43,58,82,0.5)",
  border: `1.5px solid ${disabled ? "rgba(61,90,128,0.15)" : selected ? "rgba(0,194,168,0.4)" : "rgba(61,90,128,0.3)"}`,
  color: disabled ? "rgba(138,154,181,0.4)" : selected ? V.pu : V.nb,
  fontFamily: V.db, fontSize: 13, fontWeight: selected ? 600 : 400,
  cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.15s",
  display: "inline-flex", alignItems: "center", gap: 6,
  opacity: disabled ? 0.5 : 1,
});

const focusCards = [
  { id: "residencia", label: "Residência Médica", desc: "ENARE, USP, Sírio, Einstein, UNIFESP...", color: V.re, icon: "🏥" },
  { id: "enamed", label: "ENAMED", desc: "Exame Nacional de Medicina", color: V.pu, icon: "📋" },
  { id: "revalida", label: "Revalida", desc: "Revalidação de diploma estrangeiro", color: V.ind, icon: "🌎", disabled: true, badge: "Em breve" },
  { id: "especializacao", label: "Especialização", desc: "Título de especialista", color: V.wn, icon: "🎓", disabled: true },
];

const provas = ["ENAMED", "ENARE", "USP", "Sírio-Libanês", "Einstein", "UNIFESP", "FMABC", "UERJ", "UNICAMP", "FAMERP"];
const especialidades = ["Clínica Médica", "Cirurgia Geral", "Pediatria", "Ginecologia e Obstetrícia", "Psiquiatria", "Ortopedia", "Dermatologia", "Oftalmologia"];
const diasSemana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const periodos = ["Manhã", "Tarde", "Noite", "Madrugada"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  // Step 1
  const [foco, setFoco] = useState<string | null>(null);
  // Step 2
  const [provasSel, setProvasSel] = useState<Set<string>>(new Set());
  const [espSel, setEspSel] = useState<Set<string>>(new Set());
  const [dataProva, setDataProva] = useState("");
  // Step 3
  const [horas, setHoras] = useState(20);
  const [diasSel, setDiasSel] = useState<Set<string>>(new Set(["Seg", "Ter", "Qua", "Qui", "Sex"]));
  const [perSel, setPerSel] = useState<Set<string>>(new Set(["Manhã", "Tarde"]));
  // Step 4
  const [contexto, setContexto] = useState({ motivacao: "", dificuldade: "", rotina: "" });
  // Step 5
  const [generating, setGenerating] = useState(false);

  const canNext = (): boolean => {
    if (step === 1) return !!foco;
    if (step === 2) return provasSel.size > 0;
    if (step === 3) return diasSel.size > 0;
    return true;
  };

  const goTo = (s: number) => {
    setDirection(s > step ? 1 : -1);
    setStep(s);
  };

  const handleFinish = () => {
    setGenerating(true);
    setTimeout(() => router.push("/dashboard"), 2800);
  };

  const toggle = (set: Set<string>, item: string) => {
    const n = new Set(set);
    n.has(item) ? n.delete(item) : n.add(item);
    return n;
  };

  /* ── Container styles ── */
  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at 50% 20%, rgba(0,194,168,0.04) 0%, var(--abismo) 60%)",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "40px 20px",
  };

  const cardStyle: React.CSSProperties = {
    width: "100%", maxWidth: 600,
    background: "var(--petroleo)",
    border: "1px solid rgba(61,90,128,0.25)",
    borderRadius: 16, padding: "32px",
    animation: direction > 0 ? "slideIn 0.35s ease" : "slideOut 0.35s ease",
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: V.df, fontWeight: 700, fontSize: 22, color: "#fff",
    letterSpacing: "-0.02em", marginBottom: 4,
  };

  const subStyle: React.CSSProperties = {
    fontSize: 13, color: V.ch, lineHeight: 1.6, marginBottom: 24,
  };

  const textareaStyle: React.CSSProperties = {
    width: "100%", minHeight: 80, padding: "12px 14px",
    background: "rgba(43,58,82,0.6)", border: "1.5px solid rgba(61,90,128,0.5)",
    borderRadius: 8, color: V.nb, fontFamily: V.db, fontSize: 14,
    outline: "none", resize: "vertical", transition: "border-color 0.18s",
  };

  return (
    <div style={pageStyle}>
      {/* CSS animation */}
      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(30px); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideOut { from { opacity:0; transform:translateX(-30px); } to { opacity:1; transform:translateX(0); } }
        @keyframes pulseDot { 0%,100% { box-shadow: 0 0 0 0 rgba(0,194,168,0.4); } 50% { box-shadow: 0 0 0 12px rgba(0,194,168,0); } }
      `}</style>

      {/* Progress */}
      <div style={{ width: "100%", maxWidth: 600, marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch }}>
            Etapa {step} de 5
          </span>
          <span style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.08em", color: "rgba(138,154,181,0.4)" }}>
            {step * 20}%
          </span>
        </div>
        <div style={{ height: 4, background: "rgba(61,90,128,0.2)", borderRadius: 9999, overflow: "hidden" }}>
          <div style={{ width: `${step * 20}%`, height: "100%", background: V.pu, borderRadius: 9999, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* ── STEP 1: Foco ── */}
      {step === 1 && (
        <div key="s1" style={cardStyle}>
          <div style={titleStyle}>Qual seu foco?</div>
          <div style={subStyle}>Escolha o tipo de preparação para personalizar sua experiência.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {focusCards.map((c) => {
              const sel = foco === c.id;
              const dis = (c as any).disabled;
              return (
                <div
                  key={c.id}
                  onClick={() => !dis && setFoco(c.id)}
                  style={{
                    padding: 20, borderRadius: 12, cursor: dis ? "not-allowed" : "pointer",
                    background: sel ? "rgba(0,194,168,0.06)" : "rgba(26,31,46,0.6)",
                    border: `1.5px solid ${sel ? "rgba(0,194,168,0.4)" : "rgba(61,90,128,0.2)"}`,
                    opacity: dis ? 0.4 : 1, transition: "all 0.15s",
                    position: "relative",
                  }}
                >
                  {(c as any).badge && (
                    <span style={{
                      position: "absolute", top: 10, right: 10,
                      fontFamily: V.dm, fontSize: 8, letterSpacing: "0.1em",
                      textTransform: "uppercase", padding: "2px 6px", borderRadius: 9999,
                      background: "rgba(107,92,231,0.15)", color: "#A99EF5",
                    }}>
                      {(c as any).badge}
                    </span>
                  )}
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{c.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: sel ? "#fff" : V.nb, marginBottom: 4 }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: 11, color: V.ch, lineHeight: 1.4 }}>{c.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STEP 2: Prova-Alvo ── */}
      {step === 2 && (
        <div key="s2" style={cardStyle}>
          <div style={titleStyle}>Prova-alvo</div>
          <div style={subStyle}>Selecione as provas que você quer prestar. Pode marcar mais de uma.</div>

          <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 8 }}>
            Provas
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {provas.map((p) => (
              <span key={p} style={chipStyle(provasSel.has(p))} onClick={() => setProvasSel(toggle(provasSel, p))}>
                {p}
              </span>
            ))}
          </div>

          <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 8 }}>
            Especialidade desejada
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {especialidades.map((e) => (
              <span key={e} style={chipStyle(espSel.has(e))} onClick={() => setEspSel(toggle(espSel, e))}>
                {e}
              </span>
            ))}
          </div>

          <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 8 }}>
            Data da prova (opcional)
          </div>
          <input
            type="date" value={dataProva}
            onChange={(e) => setDataProva(e.target.value)}
            style={{
              padding: "10px 14px", background: "rgba(43,58,82,0.6)",
              border: "1.5px solid rgba(61,90,128,0.5)", borderRadius: 8,
              color: V.nb, fontFamily: V.db, fontSize: 14, outline: "none",
              colorScheme: "dark",
            }}
          />
        </div>
      )}

      {/* ── STEP 3: Disponibilidade ── */}
      {step === 3 && (
        <div key="s3" style={cardStyle}>
          <div style={titleStyle}>Disponibilidade</div>
          <div style={subStyle}>Nos conte sua rotina para montar um cronograma personalizado.</div>

          <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 8 }}>
            Horas de estudo por semana: <span style={{ color: V.pu, fontSize: 12 }}>{horas}h</span>
          </div>
          <input
            type="range" min={5} max={40} value={horas}
            onChange={(e) => setHoras(+e.target.value)}
            style={{ width: "100%", accentColor: V.pu, marginBottom: 24 }}
          />

          <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 8 }}>
            Dias disponíveis
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {diasSemana.map((d) => (
              <span key={d} style={chipStyle(diasSel.has(d))} onClick={() => setDiasSel(toggle(diasSel, d))}>
                {d}
              </span>
            ))}
          </div>

          <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 8 }}>
            Períodos preferenciais
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {periodos.map((p) => (
              <span key={p} style={chipStyle(perSel.has(p))} onClick={() => setPerSel(toggle(perSel, p))}>
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 4: Contexto Pessoal ── */}
      {step === 4 && (
        <div key="s4" style={cardStyle}>
          <div style={titleStyle}>Conte-nos sobre você</div>
          <div style={subStyle}>Opcional — mas ajuda nossa IA a personalizar ainda mais seu plano.</div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontFamily: V.dm, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 6 }}>
              O que te motiva a escolher essa especialidade?
            </label>
            <textarea
              style={textareaStyle}
              value={contexto.motivacao}
              onChange={(e) => setContexto({ ...contexto, motivacao: e.target.value })}
              placeholder="Conte sua história..."
              onFocus={(e) => e.currentTarget.style.borderColor = V.pu}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(61,90,128,0.5)"}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontFamily: V.dm, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 6 }}>
              Qual sua maior dificuldade nos estudos?
            </label>
            <textarea
              style={textareaStyle}
              value={contexto.dificuldade}
              onChange={(e) => setContexto({ ...contexto, dificuldade: e.target.value })}
              placeholder="Ex.: falta de tempo, ansiedade, dificuldade em GO..."
              onFocus={(e) => e.currentTarget.style.borderColor = V.pu}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(61,90,128,0.5)"}
            />
          </div>
          <div>
            <label style={{ display: "block", fontFamily: V.dm, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 6 }}>
              Algo mais sobre sua rotina?
            </label>
            <textarea
              style={textareaStyle}
              value={contexto.rotina}
              onChange={(e) => setContexto({ ...contexto, rotina: e.target.value })}
              placeholder="Ex.: trabalho 12h, tenho plantões nos finais de semana..."
              onFocus={(e) => e.currentTarget.style.borderColor = V.pu}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(61,90,128,0.5)"}
            />
          </div>
        </div>
      )}

      {/* ── STEP 5: Confirmação ── */}
      {step === 5 && (
        <div key="s5" style={cardStyle}>
          {!generating ? (
            <>
              <div style={titleStyle}>Resumo do seu perfil</div>
              <div style={subStyle}>Confira suas escolhas antes de começar.</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "Foco", value: focusCards.find(f => f.id === foco)?.label || "—" },
                  { label: "Provas", value: [...provasSel].join(", ") || "—" },
                  { label: "Especialidades", value: [...espSel].join(", ") || "—" },
                  { label: "Horas/semana", value: `${horas}h` },
                  { label: "Dias", value: [...diasSel].join(", ") },
                  { label: "Períodos", value: [...perSel].join(", ") },
                ].map((r) => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(26,31,46,0.6)", borderRadius: 10, border: "1px solid rgba(61,90,128,0.15)" }}>
                    <span style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: V.ch }}>{r.label}</span>
                    <span style={{ fontSize: 13, color: V.nb, textAlign: "right", maxWidth: "60%" }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%", background: V.pu,
                margin: "0 auto 20px",
                animation: "pulseDot 1.4s ease infinite",
              }} />
              <div style={{ fontFamily: V.df, fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                Gerando seu plano...
              </div>
              <div style={{ fontSize: 13, color: V.ch }}>
                Nossa IA está criando um cronograma personalizado baseado no seu perfil.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Navigation ── */}
      <div style={{ width: "100%", maxWidth: 600, display: "flex", justifyContent: "space-between", marginTop: 20 }}>
        {step > 1 && !generating ? (
          <button onClick={() => goTo(step - 1)} style={{
            padding: "10px 22px", borderRadius: 8,
            background: "transparent", border: "1.5px solid rgba(61,90,128,0.3)",
            color: V.ch, fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            ← Voltar
          </button>
        ) : <div />}

        {step < 5 && (
          <button onClick={() => canNext() && goTo(step + 1)} style={{
            padding: "10px 22px", borderRadius: 8,
            background: canNext() ? V.pu : "rgba(0,194,168,0.3)",
            border: "none", color: "#0A1A18",
            fontFamily: V.db, fontSize: 13, fontWeight: 600,
            cursor: canNext() ? "pointer" : "not-allowed",
            boxShadow: canNext() ? "0 4px 16px rgba(0,194,168,0.3)" : "none",
          }}>
            {step === 4 ? "Revisar →" : "Próximo →"}
          </button>
        )}

        {step === 4 && (
          <button onClick={() => goTo(5)} style={{
            padding: "10px 22px", borderRadius: 8,
            background: "transparent", border: "1.5px solid rgba(61,90,128,0.3)",
            color: V.ch, fontFamily: V.db, fontSize: 13, fontWeight: 600, cursor: "pointer",
            marginLeft: 8,
          }}>
            Pular
          </button>
        )}

        {step === 5 && !generating && (
          <button onClick={handleFinish} style={{
            padding: "13px 28px", borderRadius: 10,
            background: V.pu, border: "none", color: "#0A1A18",
            fontFamily: V.db, fontSize: 15, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,194,168,0.35)",
          }}>
            Iniciar minha jornada →
          </button>
        )}
      </div>
    </div>
  );
}
