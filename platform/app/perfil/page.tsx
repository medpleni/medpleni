"use client";

import React, { useState } from "react";
import { PageShell } from "@/components/layout";
import { Card, Badge, Button } from "@/components/ui";
import { mockUser } from "@/lib/mock-data";

const V = {
  pu: "#00C2A8", re: "#0077B6", ind: "#6B5CE7",
  ch: "#8A9AB5", nb: "#E0E6F0", pe: "#2B3A52",
  wn: "#F5A623", dg: "#FF6B6B", su: "#22C55E",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
};

const provas = ["ENAMED", "ENARE", "USP", "Sírio-Libanês", "Einstein", "UNIFESP", "FMABC"];
const dias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const chipStyle = (selected: boolean): React.CSSProperties => ({
  padding: "6px 14px", borderRadius: 9999,
  background: selected ? "rgba(0,194,168,0.12)" : "rgba(43,58,82,0.5)",
  border: `1.5px solid ${selected ? "rgba(0,194,168,0.35)" : "rgba(61,90,128,0.25)"}`,
  color: selected ? V.pu : V.ch,
  fontFamily: V.db, fontSize: 12, cursor: "pointer", transition: "all 0.15s",
});

export default function PerfilPage() {
  const [activeNav, setActiveNav] = useState("perfil");
  const [provasSel, setProvasSel] = useState<Set<string>>(new Set(mockUser.provaAlvo));
  const [diasSel, setDiasSel] = useState<Set<string>>(new Set(["Seg", "Ter", "Qua", "Qui", "Sex"]));
  const [horas, setHoras] = useState(20);
  const [notifs, setNotifs] = useState({ estudos: true, simulados: true, streak: true, ranking: false, promos: false });

  const toggle = (set: Set<string>, item: string) => {
    const n = new Set(set);
    n.has(item) ? n.delete(item) : n.add(item);
    return n;
  };

  const toggleStyle = (on: boolean): React.CSSProperties => ({
    width: 40, height: 22, borderRadius: 11,
    background: on ? V.pu : "rgba(61,90,128,0.3)",
    position: "relative", cursor: "pointer", transition: "all 0.2s",
    display: "inline-block", flexShrink: 0,
  });

  const toggleDot = (on: boolean): React.CSSProperties => ({
    width: 16, height: 16, borderRadius: "50%",
    background: "#fff", position: "absolute", top: 3,
    left: on ? 21 : 3, transition: "left 0.2s",
  });

  const planoLabel: Record<string, string> = {
    diagnostico: "Diagnóstico", residente: "Residente", aprovacao: "Aprovação",
  };

  const planoColor: Record<string, string> = {
    diagnostico: V.ch, residente: V.re, aprovacao: V.pu,
  };

  return (
    <PageShell title="Meu Perfil" badgeText="Configurações" activeNavId={activeNav} onNavigate={setActiveNav}>
      {/* ── Avatar + Info ── */}
      <Card hoverable={false} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: `linear-gradient(135deg, ${V.pu}30, ${V.re}30)`,
            border: `2px solid ${V.pu}50`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: V.df, fontSize: 24, fontWeight: 700, color: V.pu,
          }}>
            {mockUser.iniciais}
          </div>
          <div>
            <div style={{ fontFamily: V.df, fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
              {mockUser.nome}
            </div>
            <div style={{ fontSize: 13, color: V.ch, marginBottom: 6 }}>{mockUser.email}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <Badge variant={mockUser.plano === "aprovacao" ? "green" : "blue"}>
                {planoLabel[mockUser.plano]}
              </Badge>
              {mockUser.crm && (
                <span style={{
                  fontFamily: V.dm, fontSize: 9, letterSpacing: "0.08em",
                  padding: "2px 8px", borderRadius: 9999,
                  background: "rgba(61,90,128,0.15)", color: V.ch,
                }}>
                  CRM {mockUser.crm}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="main-grid">
        <div className="col-left">
          {/* ── Dados Pessoais ── */}
          <Card hoverable={false}>
            <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 14 }}>
              Dados Pessoais
            </div>
            {[
              { label: "Nome", value: mockUser.nome },
              { label: "E-mail", value: mockUser.email },
              { label: "CRM", value: mockUser.crm || "—" },
              { label: "Sub-brand", value: mockUser.subBrand },
              { label: "Streak atual", value: `${mockUser.streakDias} dias 🔥` },
            ].map((f) => (
              <div key={f.label} style={{
                display: "flex", justifyContent: "space-between", padding: "8px 0",
                borderBottom: "1px solid rgba(61,90,128,0.1)",
              }}>
                <span style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: V.ch }}>{f.label}</span>
                <span style={{ fontSize: 13, color: V.nb }}>{f.value}</span>
              </div>
            ))}
          </Card>

          {/* ── Prova-Alvo (editável) ── */}
          <Card hoverable={false}>
            <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 14 }}>
              Prova-Alvo
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {provas.map((p) => (
                <span key={p} style={chipStyle(provasSel.has(p))} onClick={() => setProvasSel(toggle(provasSel, p))}>
                  {p}
                </span>
              ))}
            </div>
            {mockUser.dataProva && (
              <div style={{ marginTop: 12, fontFamily: V.dm, fontSize: 10, color: V.ch }}>
                Prova em: {new Date(mockUser.dataProva).toLocaleDateString("pt-BR")}
              </div>
            )}
          </Card>

          {/* ── Disponibilidade (editável) ── */}
          <Card hoverable={false}>
            <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 14 }}>
              Disponibilidade
            </div>
            <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 8 }}>
              Horas por semana: <span style={{ color: V.pu, fontSize: 12 }}>{horas}h</span>
            </div>
            <input type="range" min={5} max={40} value={horas} onChange={(e) => setHoras(+e.target.value)}
              style={{ width: "100%", accentColor: V.pu, marginBottom: 16 }} />
            <div style={{ fontFamily: V.dm, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: V.ch, marginBottom: 8 }}>
              Dias disponíveis
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {dias.map((d) => (
                <span key={d} style={chipStyle(diasSel.has(d))} onClick={() => setDiasSel(toggle(diasSel, d))}>
                  {d}
                </span>
              ))}
            </div>
          </Card>
        </div>

        <div className="col-right">
          {/* ── Notificações ── */}
          <Card hoverable={false}>
            <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 14 }}>
              Notificações
            </div>
            {[
              { key: "estudos", label: "Lembretes de estudo", desc: "Notificações no horário do seu cronograma" },
              { key: "simulados", label: "Novos simulados", desc: "Quando novos simulados estiverem disponíveis" },
              { key: "streak", label: "Alerta de streak", desc: "Aviso quando seu streak está em risco" },
              { key: "ranking", label: "Atualização de ranking", desc: "Mudanças na sua posição nacional" },
              { key: "promos", label: "Promoções e novidades", desc: "E-mails sobre features e ofertas" },
            ].map((n) => (
              <div key={n.key} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: "1px solid rgba(61,90,128,0.1)",
              }}>
                <div>
                  <div style={{ fontSize: 13, color: V.nb }}>{n.label}</div>
                  <div style={{ fontSize: 11, color: V.ch }}>{n.desc}</div>
                </div>
                <div
                  style={toggleStyle((notifs as any)[n.key])}
                  onClick={() => setNotifs({ ...notifs, [n.key]: !(notifs as any)[n.key] })}
                >
                  <div style={toggleDot((notifs as any)[n.key])} />
                </div>
              </div>
            ))}
          </Card>

          {/* ── Plano ── */}
          <Card hoverable={false} style={{
            background: `linear-gradient(135deg, ${planoColor[mockUser.plano]}10, ${V.pe})`,
            borderColor: `${planoColor[mockUser.plano]}40`,
          }}>
            <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: planoColor[mockUser.plano], marginBottom: 8 }}>
              Plano {planoLabel[mockUser.plano]}
            </div>
            <div style={{ fontSize: 12, color: V.ch, lineHeight: 1.5, marginBottom: 12 }}>
              Acesso completo a todas as funcionalidades. Renova em 15/05/2026.
            </div>
            <button onClick={() => {}} style={{
              width: "100%", padding: "9px", borderRadius: 8,
              background: "transparent", border: `1.5px solid ${planoColor[mockUser.plano]}40`,
              color: planoColor[mockUser.plano], fontFamily: V.db, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
              Gerenciar assinatura
            </button>
          </Card>

          {/* ── Conta ── */}
          <Card hoverable={false}>
            <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 14 }}>
              Conta
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button style={{
                width: "100%", padding: "10px", borderRadius: 8,
                background: "transparent", border: "1.5px solid rgba(61,90,128,0.3)",
                color: V.ch, fontFamily: V.db, fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
                Exportar meus dados
              </button>
              <button style={{
                width: "100%", padding: "10px", borderRadius: 8,
                background: "rgba(255,107,107,0.08)", border: "1.5px solid rgba(255,107,107,0.25)",
                color: V.dg, fontFamily: V.db, fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
                Sair da conta
              </button>
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
