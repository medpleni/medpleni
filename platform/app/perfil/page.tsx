"use client";

import React, { useState, useEffect } from "react";
import { PageShell } from "@/components/layout";
import { Card, Badge } from "@/components/ui";
import { mockUser } from "@/lib/mock-data";
import { useUser } from "@/lib/supabase/use-user";
import { updateProfile } from "@/lib/supabase/profile";

const V = {
  pu: "var(--pulso)", re: "var(--resgate)", ind: "#6B5CE7",
  ch: "var(--chumbo)", nb: "var(--neblina)", pe: "var(--petroleo)",
  wn: "#F5A623", dg: "#FF6B6B", su: "var(--sucesso)",
  ab: "var(--abismo)", cardBg: "var(--card-bg)", cardBorder: "var(--card-border)", heading: "var(--heading-color)",
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
  const { user, profile, signOut, refreshProfile } = useUser();
  const [activeNav, setActiveNav] = useState("perfil");
  const [provasSel, setProvasSel] = useState<Set<string>>(new Set(mockUser.provaAlvo));
  const [diasSel, setDiasSel] = useState<Set<string>>(new Set(["Seg", "Ter", "Qua", "Qui", "Sex"]));
  const [horas, setHoras] = useState(20);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [notifs, setNotifs] = useState({ estudos: true, simulados: true, streak: true, ranking: false, promos: false });
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (profile) {
      if (profile.target_exams && profile.target_exams.length > 0) {
        setProvasSel(new Set(profile.target_exams));
      }
      if (profile.study_days && profile.study_days.length > 0) {
        setDiasSel(new Set(profile.study_days));
      }
      if (profile.weekly_study_hours) {
        setHoras(profile.weekly_study_hours);
      }
    }
  }, [profile]);

  const displayNome = profile?.full_name || user?.user_metadata?.full_name || mockUser.nome;
  const displayEmail = profile?.email || user?.email || mockUser.email;
  const displayPlano = (profile?.plan || mockUser.plano) as "diagnostico" | "residente" | "aprovacao";
  const displaySubBrand = profile?.sub_brand || mockUser.subBrand;
  const displayStreak = profile?.streak_days ?? mockUser.streakDias;

  const displayIniciais = displayNome
    ? displayNome
        .split(" ")
        .filter(Boolean)
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "MP";

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
    diagnostico: "MedPleni Diagnóstico",
    pleno_mensal: "MedPleni Pleno (Mensal)",
    pleno_anual: "MedPleni Pleno (Anual)",
    residente: "MedPleni Pleno",
    aprovacao: "MedPleni Pleno (Anual)",
  };

  const planoColor: Record<string, string> = {
    diagnostico: V.ch,
    pleno_mensal: V.re,
    pleno_anual: V.pu,
    residente: V.re,
    aprovacao: V.pu,
  };

  const handleSavePreferences = async () => {
    if (!user?.id) return;
    setSaving(true);
    setSavedSuccess(false);

    await updateProfile(user.id, {
      target_exams: Array.from(provasSel),
      study_days: Array.from(diasSel),
      weekly_study_hours: horas,
    });

    await refreshProfile();
    setSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut();
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
            {displayIniciais}
          </div>
          <div>
            <div style={{ fontFamily: V.df, fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
              {displayNome}
            </div>
            <div style={{ fontSize: 13, color: V.ch, marginBottom: 6 }}>{displayEmail}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <Badge variant={displayPlano === "aprovacao" ? "green" : "blue"}>
                {planoLabel[displayPlano] || "Diagnóstico"}
              </Badge>
              {profile?.crm && (
                <span style={{
                  fontFamily: V.dm, fontSize: 9, letterSpacing: "0.08em",
                  padding: "2px 8px", borderRadius: 9999,
                  background: "rgba(61,90,128,0.15)", color: V.ch,
                }}>
                  CRM {profile.crm}
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
              { label: "Nome", value: displayNome },
              { label: "E-mail", value: displayEmail },
              { label: "CRM", value: profile?.crm || "—" },
              { label: "Sub-brand", value: displaySubBrand },
              { label: "Streak atual", value: `${displayStreak} dias 🔥` },
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
            {profile?.exam_date && (
              <div style={{ marginTop: 12, fontFamily: V.dm, fontSize: 10, color: V.ch }}>
                Prova em: {new Date(profile.exam_date).toLocaleDateString("pt-BR")}
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
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {dias.map((d) => (
                <span key={d} style={chipStyle(diasSel.has(d))} onClick={() => setDiasSel(toggle(diasSel, d))}>
                  {d}
                </span>
              ))}
            </div>

            <button
              onClick={handleSavePreferences}
              disabled={saving}
              style={{
                width: "100%", padding: "10px 0",
                background: savedSuccess ? "rgba(34,197,94,0.2)" : V.pu,
                border: savedSuccess ? "1.5px solid #22C55E" : "none",
                borderRadius: 8,
                color: savedSuccess ? "#22C55E" : "#0A1A18",
                fontWeight: 600,
                fontSize: 13,
                cursor: saving ? "wait" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {saving ? "Salvando..." : savedSuccess ? "Preferências salvas! ✓" : "Salvar Alterações"}
            </button>
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
            background: `linear-gradient(135deg, ${planoColor[displayPlano]}10, ${V.pe})`,
            borderColor: `${planoColor[displayPlano]}40`,
          }}>
            <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: planoColor[displayPlano], marginBottom: 8 }}>
              Plano {planoLabel[displayPlano] || "Diagnóstico"}
            </div>
            <div style={{ fontSize: 12, color: V.ch, lineHeight: 1.5, marginBottom: 12 }}>
              Acesso a todas as funcionalidades do seu nível.
            </div>
            <a href="/planos" style={{
              display: "block", textAlign: "center", textDecoration: "none",
              width: "100%", padding: "9px", borderRadius: 8,
              background: "transparent", border: `1.5px solid ${planoColor[displayPlano]}40`,
              color: planoColor[displayPlano], fontFamily: V.db, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
              Gerenciar assinatura
            </a>
          </Card>

          {/* ── Conta ── */}
          <Card hoverable={false}>
            <div style={{ fontFamily: V.df, fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 14 }}>
              Conta
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                style={{
                  width: "100%", padding: "10px", borderRadius: 8,
                  background: "rgba(255,107,107,0.08)", border: "1.5px solid rgba(255,107,107,0.25)",
                  color: V.dg, fontFamily: V.db, fontSize: 12, fontWeight: 600, cursor: loggingOut ? "wait" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                {loggingOut ? "Encerrando sessão..." : "Sair da conta"}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
