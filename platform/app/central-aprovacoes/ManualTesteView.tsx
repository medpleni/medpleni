"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  MANUAL_TESTE_MODULES,
  TEST_OPTIONS,
  ManualTestModule,
  ManualTestItem,
} from "./manual-teste-data";

interface PartnerInfo {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
  color: string;
}

interface ItemAnswer {
  v?: string; // option value (e.g., "ok", "aj", "mv", "rm", "nf", "ne")
  c?: string; // comment
}

interface ManualTesteViewProps {
  currentPartner: PartnerInfo;
  onSyncAnswers?: (answers: Record<string, ItemAnswer>) => void;
  initialAnswers?: Record<string, ItemAnswer>;
}

export default function ManualTesteView({
  currentPartner,
  onSyncAnswers,
  initialAnswers,
}: ManualTesteViewProps) {
  const storageKey = `medpleni_manual_teste_v1_${currentPartner.id}`;

  const [answers, setAnswers] = useState<Record<string, ItemAnswer>>(() => {
    if (initialAnswers && Object.keys(initialAnswers).length > 0) {
      return initialAnswers;
    }
    if (typeof window !== "undefined") {
      try {
        const local = localStorage.getItem(storageKey) || localStorage.getItem("medpleni_manual_teste_v1");
        if (local) return JSON.parse(local);
      } catch {
        // fallback
      }
    }
    return {};
  });

  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Total de itens
  const totalItems = useMemo(
    () => MANUAL_TESTE_MODULES.reduce((acc, m) => acc + m.items.length, 0),
    []
  );

  // Total avaliado pelo sócio logado
  const evaluatedCount = useMemo(
    () => Object.values(answers).filter((a) => a && (a.v || (a.c && a.c.trim()))).length,
    [answers]
  );

  const progressPercent = totalItems > 0 ? Math.round((evaluatedCount / totalItems) * 100) : 0;

  // Persistência local e sincronização
  const saveAnswers = useCallback(
    (newAnswers: Record<string, ItemAnswer>) => {
      setAnswers(newAnswers);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(storageKey, JSON.stringify(newAnswers));
          localStorage.setItem("medpleni_manual_teste_v1", JSON.stringify(newAnswers));
        } catch {
          // ignore
        }
      }
      if (onSyncAnswers) {
        onSyncAnswers(newAnswers);
      }
    },
    [storageKey, onSyncAnswers]
  );

  // Ao trocar de sócio ou receber novos initialAnswers
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const local = localStorage.getItem(storageKey) || localStorage.getItem("medpleni_manual_teste_v1");
        if (local) {
          setAnswers(JSON.parse(local));
        }
      } catch {
        // ignore
      }
    }
  }, [storageKey]);

  // Alternar opção de voto
  const handleSelectOption = (itemId: string, optValue: string) => {
    const prev = answers[itemId] || {};
    const newV = prev.v === optValue ? "" : optValue;
    const updated = {
      ...answers,
      [itemId]: {
        ...prev,
        v: newV,
      },
    };
    saveAnswers(updated);
  };

  // Atualizar comentário
  const handleCommentChange = (itemId: string, text: string) => {
    const prev = answers[itemId] || {};
    const updated = {
      ...answers,
      [itemId]: {
        ...prev,
        c: text,
      },
    };
    saveAnswers(updated);
  };

  // Alternar abrir/fechar um item
  const toggleItemOpen = (itemId: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  // Abrir ou fechar todos
  const toggleAllItems = () => {
    const anyOpen = Object.values(openItems).some((v) => v);
    const newState: Record<string, boolean> = {};
    if (!anyOpen) {
      MANUAL_TESTE_MODULES.forEach((m) => {
        m.items.forEach((it) => {
          newState[it.id] = true;
        });
      });
    }
    setOpenItems(newState);
  };

  // Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Copiar respostas no formato WhatsApp
  const handleCopyAnswers = async () => {
    let out = `*Teste MedPleni Institucional — ${currentPartner.name}*\n`;
    out += `_Avaliado em: ${new Date().toLocaleDateString("pt-BR")}_\n`;

    MANUAL_TESTE_MODULES.forEach((m) => {
      const answeredInModule = m.items.filter((it) => {
        const st = answers[it.id];
        return st && (st.v || (st.c && st.c.trim()));
      });

      if (!answeredInModule.length) return;

      out += `\n*${m.name}*\n`;
      answeredInModule.forEach((it) => {
        const st = answers[it.id];
        const opt = TEST_OPTIONS.find((o) => o.value === st?.v);
        const optLabel = opt ? opt.label : "Sem opção marcada";
        const comment = st?.c && st.c.trim() ? ` — ${st.c.trim()}` : "";
        out += `• ${it.id} ${it.name}: *${optLabel}*${comment}\n`;
      });
    });

    out += `\n*Progresso:* ${evaluatedCount} de ${totalItems} itens avaliados (${progressPercent}%).`;

    try {
      await navigator.clipboard.writeText(out);
      showToast("Copiado com sucesso! Cole no grupo do WhatsApp dos sócios.");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = out;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showToast("Copiado com sucesso! Cole no grupo do WhatsApp dos sócios.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ── BARRA SUPERIOR FIXA / STICKY DE CONTROLE ── */}
      <div
        style={{
          position: "sticky",
          top: "60px",
          zIndex: 20,
          background: "var(--card-bg, #FFFFFF)",
          border: "1px solid var(--card-border, #E2E8F0)",
          borderRadius: "12px",
          padding: "14px 20px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        {/* Identificação Automática por Login (sem o select manual de quem está testando) */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: currentPartner.color || "#008F7C",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "13px",
              flexShrink: 0,
            }}
          >
            {currentPartner.avatar}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--pulso, #008F7C)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Avaliador Ativo (por Login):
              </span>
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--heading-color, #090D16)" }}>
              {currentPartner.name}
              <span style={{ fontSize: "11px", fontWeight: 400, color: "var(--chumbo, #64748B)", marginLeft: "6px" }}>
                ({currentPartner.email})
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "220px", maxWidth: "420px" }}>
          <div
            style={{
              flex: 1,
              height: "8px",
              background: "var(--input-bg, #F1F5F9)",
              borderRadius: "9999px",
              overflow: "hidden",
              border: "1px solid var(--card-border, #E2E8F0)",
            }}
          >
            <div
              style={{
                height: "100%",
                background: "var(--pulso, #008F7C)",
                width: `${progressPercent}%`,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 700, color: "var(--heading-color, #090D16)", whiteSpace: "nowrap" }}>
            {evaluatedCount} de {totalItems} ({progressPercent}%)
          </span>
        </div>

        {/* Ações */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={toggleAllItems}
            style={{
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: 600,
              borderRadius: "8px",
              border: "1px solid var(--card-border, #E2E8F0)",
              background: "var(--card-bg, #FFFFFF)",
              color: "var(--heading-color, #090D16)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {Object.values(openItems).some((v) => v) ? "Fechar tudo" : "Abrir tudo"}
          </button>
          <button
            onClick={handleCopyAnswers}
            style={{
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 700,
              borderRadius: "8px",
              border: "none",
              background: "var(--pulso, #008F7C)",
              color: "#FFFFFF",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 6px rgba(0, 143, 124, 0.25)",
              transition: "all 0.15s ease",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copiar minhas respostas
          </button>
        </div>
      </div>

      {/* ── CARD: ANTES DE COMEÇAR (INSTRUÇÕES DA DIRETORIA) ── */}
      <div
        style={{
          background: "var(--card-bg, #FFFFFF)",
          border: "1px solid var(--card-border, #E2E8F0)",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "var(--card-shadow, 0 1px 3px rgba(0,0,0,0.05))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{ fontSize: "18px" }}>📋</span>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--heading-color, #090D16)" }}>
            Antes de começar — Roteiro Prático de Homologação dos Sócios
          </h2>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--chumbo, #64748B)", lineHeight: 1.5 }}>
          Desta vez não é votação de &quot;entra ou não entra&quot;. Todas as funções já foram implantadas na plataforma em tempo real. O objetivo é dizer, tela a tela, o que está bom, o que precisa de ajuste, o que deve mudar de lugar e o que deve sair.
        </p>

        <ol style={{ paddingLeft: "20px", margin: "0 0 16px", fontSize: "13px", color: "var(--heading-color, #090D16)", lineHeight: 1.7 }}>
          <li>
            <strong>Acesso direto à plataforma:</strong> Acesse com o seu login em <strong style={{ color: "var(--pulso, #008F7C)" }}>medpleni.com</strong> e abra <strong style={{ color: "var(--pulso, #008F7C)" }}>medpleni.com/instituicao</strong>. Você pode navegar em uma aba e marcar aqui na outra.
          </li>
          <li>
            <strong>Faculdade Ativa:</strong> Você estará na <strong>&quot;Faculdade Demonstração de Medicina (FADEP)&quot;</strong> no papel de dirigente/coordenador, com turmas do 1º ao 12º período e simulações completas.
          </li>
          <li>
            <strong>Como responder:</strong> Abra cada módulo e item abaixo, siga o roteiro de <em>&quot;Como testar&quot;</em> e marque uma das 6 opções. O comentário é o mais valioso: diga o que esperava ver.
          </li>
          <li>
            <strong>Ao terminar ou pausar:</strong> Clique em <strong>&quot;Copiar minhas respostas&quot;</strong> e cole no grupo do WhatsApp dos sócios. Suas respostas ficam salvas automaticamente na sua conta e navegador.
          </li>
          <li>
            <strong>Gráfico ou visual confuso?</strong> Mande um print no grupo com a tela e a sugestão de melhoria.
          </li>
        </ol>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "12px" }}>
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              fontSize: "12px",
              color: "#92400E",
              lineHeight: 1.5,
            }}
          >
            <strong>O que olhar em cada tela:</strong> Os números fazem sentido para quem coordena um curso de Medicina? A tela está limpa ou poluída? A informação está no lugar onde você procuraria? O que falta para apresentar comercialmente a uma faculdade parceira?
          </div>
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              background: "rgba(2, 132, 199, 0.08)",
              border: "1px solid rgba(2, 132, 199, 0.25)",
              fontSize: "12px",
              color: "#0369A1",
              lineHeight: 1.5,
            }}
          >
            <strong>Alinhamento e status:</strong> O visual foi completamente padronizado para o design system moderno em todas as 11 telas. As 1.255 questões do drive foram importadas com classificação das 7 grandes áreas e banco privativo da instituição ativo.
          </div>
        </div>
      </div>

      {/* ── LISTA DOS 18 MÓDULOS E 65 ITENS DE TESTE ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        {MANUAL_TESTE_MODULES.map((module) => {
          const moduleEvaluatedCount = module.items.filter((it) => {
            const st = answers[it.id];
            return st && (st.v || (st.c && st.c.trim()));
          }).length;

          return (
            <section key={module.key} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Topo do Módulo */}
              <div style={{ borderBottom: "1px solid var(--card-border, #E2E8F0)", paddingBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                    <h3 style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "var(--heading-color, #090D16)" }}>
                      {module.name}
                    </h3>
                    <span style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--chumbo, #64748B)" }}>
                      {module.path}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "9999px",
                      background: moduleEvaluatedCount === module.items.length ? "rgba(34, 197, 94, 0.12)" : "var(--input-bg, #F1F5F9)",
                      color: moduleEvaluatedCount === module.items.length ? "#16A34A" : "var(--chumbo, #64748B)",
                    }}
                  >
                    {moduleEvaluatedCount} de {module.items.length} avaliados
                  </span>
                </div>
                {module.note && (
                  <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#D97706", fontWeight: 500, lineHeight: 1.5 }}>
                    ⚠️ {module.note}
                  </p>
                )}
              </div>

              {/* Itens do Módulo */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {module.items.map((item) => {
                  const currentAnswer = answers[item.id] || {};
                  const isOpen = !!openItems[item.id];
                  const chosenOpt = TEST_OPTIONS.find((o) => o.value === currentAnswer.v);
                  const isDone = !!currentAnswer.v || (currentAnswer.c && currentAnswer.c.trim());

                  return (
                    <div
                      key={item.id}
                      style={{
                        background: "var(--card-bg, #FFFFFF)",
                        border: isDone ? "1px solid #9CD5CF" : "1px solid var(--card-border, #E2E8F0)",
                        borderRadius: "12px",
                        overflow: "hidden",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                        transition: "border-color 0.15s ease",
                      }}
                    >
                      {/* Cabeçalho do Item (Clicável para expandir) */}
                      <div
                        onClick={() => toggleItemOpen(item.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                          padding: "14px 18px",
                          cursor: "pointer",
                          userSelect: "none",
                          background: isDone ? "rgba(0, 194, 168, 0.02)" : "transparent",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "var(--pulso, #008F7C)",
                              minWidth: "52px",
                            }}
                          >
                            {item.id}
                          </span>
                          <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--heading-color, #090D16)" }}>
                            {item.name}
                          </span>
                          {item.inRevision && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "6px",
                                background: "#FBF1DC",
                                color: "#A06D00",
                                textTransform: "uppercase",
                              }}
                            >
                              Em revisão após reunião 19/11
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "3px 10px",
                              borderRadius: "9999px",
                              background: chosenOpt ? chosenOpt.bg : "#F1F5F9",
                              color: chosenOpt ? chosenOpt.color : "#64748B",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {chosenOpt ? chosenOpt.label : "A testar"}
                          </span>
                          <span style={{ fontSize: "12px", color: "var(--chumbo, #64748B)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }}>
                            ▼
                          </span>
                        </div>
                      </div>

                      {/* Corpo do Item (Expandido) */}
                      {isOpen && (
                        <div
                          style={{
                            padding: "16px 20px 20px",
                            borderTop: "1px solid var(--card-border, #E2E8F0)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "14px",
                          }}
                        >
                          {/* O que é */}
                          <div>
                            <span style={{ fontFamily: "monospace", fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--chumbo, #64748B)", display: "block", marginBottom: "4px" }}>
                              O que é
                            </span>
                            <p style={{ margin: 0, fontSize: "13px", color: "var(--heading-color, #090D16)", lineHeight: 1.5 }}>
                              {item.description}
                            </p>
                          </div>

                          {/* Como testar */}
                          <div>
                            <span style={{ fontFamily: "monospace", fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--chumbo, #64748B)", display: "block", marginBottom: "4px" }}>
                              Como testar
                            </span>
                            <ol style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "var(--heading-color, #090D16)", lineHeight: 1.6 }}>
                              {item.steps.map((st, sIdx) => (
                                <li key={sIdx}>{st}</li>
                              ))}
                            </ol>
                          </div>

                          {/* O que avaliar */}
                          <div style={{ background: "var(--input-bg, #F8FAFC)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--card-border, #E2E8F0)" }}>
                            <span style={{ fontFamily: "monospace", fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--pulso, #008F7C)", display: "block", marginBottom: "2px" }}>
                              O que avaliar
                            </span>
                            <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--heading-color, #090D16)", lineHeight: 1.5 }}>
                              {item.evaluationQuestion}
                            </p>
                          </div>

                          {/* Opções de Avaliação (6 botões) */}
                          <div>
                            <span style={{ fontFamily: "monospace", fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--chumbo, #64748B)", display: "block", marginBottom: "8px" }}>
                              Sua avaliação ({currentPartner.name})
                            </span>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              {TEST_OPTIONS.map((opt) => {
                                const isSelected = currentAnswer.v === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    onClick={() => handleSelectOption(item.id, opt.value)}
                                    style={{
                                      padding: "7px 14px",
                                      fontSize: "12px",
                                      fontWeight: isSelected ? 700 : 500,
                                      borderRadius: "8px",
                                      border: isSelected ? `2px solid ${opt.color}` : "1px solid var(--card-border, #E2E8F0)",
                                      background: isSelected ? opt.bg : "var(--card-bg, #FFFFFF)",
                                      color: isSelected ? opt.color : "var(--heading-color, #090D16)",
                                      cursor: "pointer",
                                      transition: "all 0.15s ease",
                                      boxShadow: isSelected ? `0 2px 6px ${opt.color}25` : "none",
                                    }}
                                  >
                                    {isSelected ? `✓ ${opt.label}` : opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Comentário */}
                          <div>
                            <textarea
                              value={currentAnswer.c || ""}
                              onChange={(e) => handleCommentChange(item.id, e.target.value)}
                              placeholder="Comentário: o que esperava ver, o que mudaria, para onde levaria..."
                              style={{
                                width: "100%",
                                minHeight: "72px",
                                padding: "10px 12px",
                                fontSize: "13px",
                                borderRadius: "8px",
                                border: "1px solid var(--card-border, #E2E8F0)",
                                background: "var(--card-bg, #FFFFFF)",
                                color: "var(--heading-color, #090D16)",
                                outline: "none",
                                resize: "vertical",
                                fontFamily: "inherit",
                                lineHeight: 1.5,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* ── TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1A1F2E",
            color: "#FFFFFF",
            padding: "12px 24px",
            borderRadius: "9999px",
            fontSize: "13px",
            fontWeight: 600,
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            zIndex: 100,
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
