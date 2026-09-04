"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/supabase/use-user";
import { createAdminQuestion } from "@/lib/supabase/admin";
import type { Area, Dificuldade, ProvAlvo } from "@/lib/types";

const V = {
  pu: "#00C2A8", re: "#0077B6", rel: "#64B5E8", ind: "#6B5CE7",
  ch: "#8A9AB5", nb: "#E0E6F0", pe: "#2B3A52", am: "#C98A0A",
  wn: "#F5A623", dg: "#FF6B6B", su: "#22C55E",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
};

export default function NovaQuestaoPage() {
  const router = useRouter();
  const { user } = useUser();

  const [area, setArea] = useState<Area>("Clínica Médica");
  const [subarea, setSubarea] = useState("");
  const [instituicao, setInstituicao] = useState<ProvAlvo>("ENAMED");
  const [ano, setAno] = useState(2026);
  const [dificuldade, setDificuldade] = useState<Dificuldade>("media");
  const [gabarito, setGabarito] = useState<"A" | "B" | "C" | "D" | "E">("A");
  const [enunciado, setEnunciado] = useState("");
  const [contextoClinico, setContextoClinico] = useState("");
  const [explicacao, setExplicacao] = useState("");
  const [tags, setTags] = useState("ENAMED, DCNs, Atenção Básica");

  const [altA, setAltA] = useState("");
  const [altB, setAltB] = useState("");
  const [altC, setAltC] = useState("");
  const [altD, setAltD] = useState("");
  const [altE, setAltE] = useState("");

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enunciado || !altA || !altB || !altC || !altD || !subarea || !explicacao) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setSaving(true);

    const result = await createAdminQuestion(
      {
        enunciado,
        contextoClinico: contextoClinico || undefined,
        area,
        subarea,
        instituicao,
        ano: Number(ano),
        dificuldade,
        gabarito,
        explicacao,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        alternativas: [
          { letra: "A", texto: altA },
          { letra: "B", texto: altB },
          { letra: "C", texto: altC },
          { letra: "D", texto: altD },
          ...(altE ? [{ letra: "E" as const, texto: altE }] : []),
        ],
      },
      user ? { id: user.id, email: user.email || "" } : undefined
    );

    setSaving(false);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push("/admin/conteudo");
      }, 1500);
    } else {
      alert(result.error || "Erro ao salvar questão.");
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--pulso)" }}>
            Docência & Cadastro
          </div>
          <h1 style={{ fontFamily: V.df, fontSize: 26, fontWeight: 700, color: "var(--heading-color)" }}>
            Cadastrar Nova Questão Comentada
          </h1>
        </div>
        <button
          onClick={() => router.push("/admin/conteudo")}
          style={{
            padding: "8px 16px", borderRadius: 6, background: "var(--card-bg)",
            border: "1px solid var(--card-border)", color: "var(--chumbo)", fontSize: 12, cursor: "pointer",
          }}
        >
          ← Cancelar e Voltar
        </button>
      </div>

      {success ? (
        <div style={{ background: "var(--card-bg)", border: `1px solid var(--pulso)`, borderRadius: 12, padding: 32, textAlign: "center", boxShadow: "var(--card-shadow)" }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%", background: "rgba(0,194,168,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px auto",
            color: "var(--pulso)",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div style={{ fontFamily: V.df, fontSize: 20, fontWeight: 700, color: "var(--heading-color)", marginBottom: 4 }}>
            Questão cadastrada com sucesso!
          </div>
          <div style={{ fontSize: 13, color: "var(--chumbo)" }}>Redirecionando para o catálogo docente...</div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{
          background: "var(--card-bg)", border: "1px solid var(--card-border)",
          borderRadius: 14, padding: "clamp(16px, 3vw, 28px)", display: "flex", flexDirection: "column", gap: 20,
          boxShadow: "var(--card-shadow)",
        }}>
          {/* Metadados DCN */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 6 }}>Grande Área DCN *</label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value as Area)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 6, background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "var(--heading-color)" }}
              >
                <option value="Clínica Médica">Clínica Médica</option>
                <option value="Cirurgia Geral">Cirurgia Geral</option>
                <option value="Saúde Coletiva">Saúde Coletiva & SUS</option>
                <option value="Pediatria">Pediatria</option>
                <option value="Ginecologia e Obstetrícia">Ginecologia e Obstetrícia</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 6 }}>Subárea / Tema Clínico *</label>
              <input
                type="text"
                placeholder="Ex: HAS — Tratamento e Metas"
                value={subarea}
                onChange={(e) => setSubarea(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 6, background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "var(--heading-color)" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 6 }}>Banca / Prova *</label>
              <select
                value={instituicao}
                onChange={(e) => setInstituicao(e.target.value as ProvAlvo)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 6, background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "var(--heading-color)" }}
              >
                <option value="ENAMED">ENAMED</option>
                <option value="ENARE">ENARE</option>
                <option value="USP">USP</option>
                <option value="UNIFESP">UNIFESP</option>
                <option value="UERJ">UERJ</option>
                <option value="FMABC">FMABC</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 6 }}>Ano da Prova</label>
              <input
                type="number"
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 6, background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "var(--heading-color)" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 6 }}>Dificuldade Estimada</label>
              <select
                value={dificuldade}
                onChange={(e) => setDificuldade(e.target.value as Dificuldade)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 6, background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "var(--heading-color)" }}
              >
                <option value="facil">Fácil</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="muito-alta">Muito Alta</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 6 }}>Gabarito Oficial *</label>
              <select
                value={gabarito}
                onChange={(e) => setGabarito(e.target.value as any)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 6, background: "var(--input-bg)", border: `1.5px solid var(--pulso)`, color: "var(--pulso)", fontWeight: 700 }}
              >
                <option value="A">Alternativa A</option>
                <option value="B">Alternativa B</option>
                <option value="C">Alternativa C</option>
                <option value="D">Alternativa D</option>
                <option value="E">Alternativa E</option>
              </select>
            </div>
          </div>

          {/* Enunciado e Contexto Clínico */}
          <div>
            <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 6 }}>Enunciado da Questão *</label>
            <textarea
              rows={4}
              placeholder="Digite o enunciado completo da questão..."
              value={enunciado}
              onChange={(e) => setEnunciado(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 6, background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "var(--heading-color)", fontSize: 13, lineHeight: 1.6 }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 6 }}>Contexto Clínico / Caso (Opcional)</label>
            <textarea
              rows={2}
              placeholder="Ex: Homem de 58 anos, hipertenso e tabagista..."
              value={contextoClinico}
              onChange={(e) => setContextoClinico(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 6, background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "var(--heading-color)", fontSize: 13 }}
            />
          </div>

          {/* Alternativas */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--heading-color)" }}>Alternativas</div>
            {[
              { l: "A", val: altA, set: setAltA },
              { l: "B", val: altB, set: setAltB },
              { l: "C", val: altC, set: setAltC },
              { l: "D", val: altD, set: setAltD },
              { l: "E", val: altE, set: setAltE },
            ].map((alt) => (
              <div key={alt.l} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{
                  width: 24, height: 24, borderRadius: 4, background: gabarito === alt.l ? "var(--pulso)" : "var(--input-bg)",
                  color: gabarito === alt.l ? "#FFFFFF" : "var(--heading-color)", display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: V.dm, fontSize: 11, fontWeight: 700, flexShrink: 0,
                  border: gabarito === alt.l ? "none" : "1px solid var(--card-border)",
                }}>
                  {alt.l}
                </span>
                <input
                  type="text"
                  placeholder={`Texto da alternativa ${alt.l}${alt.l === "E" ? " (opcional)" : " *"}`}
                  value={alt.val}
                  onChange={(e) => alt.set(e.target.value)}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 6, background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "var(--heading-color)" }}
                />
              </div>
            ))}
          </div>

          {/* Explicação Comentada */}
          <div>
            <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 6 }}>
              Justificativa Comentada / Comentário da Banca *
            </label>
            <textarea
              rows={4}
              placeholder="Explique detalhadamente por que a alternativa correta é o gabarito e justifique o erro dos distratores..."
              value={explicacao}
              onChange={(e) => setExplicacao(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 6, background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "var(--heading-color)", fontSize: 13, lineHeight: 1.6 }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <button
              type="button"
              onClick={() => router.push("/admin/conteudo")}
              style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1px solid var(--card-border)", color: "var(--chumbo)", cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "10px 24px", borderRadius: 8, background: "var(--pulso)", border: "none", color: "#FFFFFF",
                fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 2px 10px rgba(0,194,168,0.3)",
              }}
            >
              {saving ? "Salvando..." : "Salvar Questão no Banco"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
