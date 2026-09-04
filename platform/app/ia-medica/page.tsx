"use client";

import React, { useState, useEffect, useRef } from "react";
import PageShell from "@/components/layout/PageShell";
import { MEDICAL_MODELS } from "@/lib/ai/openrouter";
import { createClient } from "@/lib/supabase/client";

const V = {
  pu: "#00C2A8", re: "#0077B6", rel: "#64B5E8", ind: "#6B5CE7",
  ch: "#8A9AB5", nb: "#E0E6F0", pe: "#2B3A52", am: "#C98A0A",
  wn: "#F5A623", dg: "#FF6B6B", su: "#22C55E",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ConversationItem {
  id: string;
  title: string;
  area: string;
  mode: string;
  created_at: string;
}

const QUICK_PROMPTS = [
  {
    icon: "🔬",
    title: "Diferenciar Taquiarritmias",
    prompt: "Como diferenciar Taquicardia Ventricular (TV) de TPSV com aberrância no ECG segundo os critérios de Brugada e Vereckei?",
    mode: "tira_duvidas",
    area: "Clinica",
  },
  {
    icon: "⚡",
    title: "Choque Anafilático",
    prompt: "Qual o manejo imediato de choque anafilático refratário no pronto-socorro e doses exatas de Adrenalina/Corticoide?",
    mode: "tira_duvidas",
    area: "Clinica",
  },
  {
    icon: "🎯",
    title: "Pegadinhas ENARE / USP",
    prompt: "Quais são as 3 principais pegadinhas das bancas ENARE e USP sobre Pré-Eclâmpsia Grave e Síndrome HELLP?",
    mode: "dissecar_questao",
    area: "GO",
  },
  {
    icon: "🩺",
    title: "Simular Caso de Abdome Agudo",
    prompt: "Preceptor, inicie um caso clínico interativo de Abdome Agudo na emergência para eu investigar e conduzir passo a passo.",
    mode: "caso_clinico",
    area: "Cirurgia",
  },
];

export default function IAMedicaPage() {
  const [selectedModel, setSelectedModel] = useState<string>("anthropic/claude-3.7-sonnet");
  const [selectedMode, setSelectedMode] = useState<string>("tira_duvidas");
  const [selectedArea, setSelectedArea] = useState<string>("Geral");
  
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carrega histórico de conversas
  useEffect(() => {
    async function loadConversations() {
      try {
        const res = await fetch("/api/ai/conversations");
        const data = await res.json();
        if (data.conversations) {
          setConversations(data.conversations);
        }
      } catch (err) {
        console.warn("Aviso ao carregar conversas:", err);
      }
    }
    loadConversations();
  }, []);

  // Rola para o final da mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Carrega mensagens ao trocar de conversa
  const handleSelectConversation = async (convId: string) => {
    if (isStreaming) return;
    setCurrentConvId(convId);
    try {
      const res = await fetch(`/api/ai/conversations?id=${convId}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(
          data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }))
        );
      }
    } catch (err) {
      console.error("Erro ao abrir conversa:", err);
    }
  };

  const handleNewChat = () => {
    if (isStreaming) return;
    setCurrentConvId(null);
    setMessages([]);
    setInput("");
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/ai/conversations?id=${convId}`, { method: "DELETE" });
      setConversations(conversations.filter((c) => c.id !== convId));
      if (currentConvId === convId) {
        handleNewChat();
      }
    } catch (err) {
      alert("Erro ao excluir conversa.");
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isStreaming) return;

    setInput("");
    const userMsg: Message = { id: `u_${Date.now()}`, role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsStreaming(true);

    const assistantMsgId = `a_${Date.now()}`;
    const initialAssistantMsg: Message = { id: assistantMsgId, role: "assistant", content: "" };
    setMessages([...newMessages, initialAssistantMsg]);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          conversationId: currentConvId,
          model: selectedModel,
          mode: selectedMode,
          area: selectedArea,
        }),
      });

      const newConvHeader = response.headers.get("X-Conversation-Id");
      if (newConvHeader && !currentConvId) {
        setCurrentConvId(newConvHeader);
        // Atualiza a lista lateral
        setConversations([
          {
            id: newConvHeader,
            title: text.slice(0, 45) + (text.length > 45 ? "..." : ""),
            area: selectedArea,
            mode: selectedMode,
            created_at: new Date().toISOString(),
          },
          ...conversations,
        ]);
      }

      if (!response.body) throw new Error("Sem resposta do servidor.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataContent = line.slice(6).trim();
            if (dataContent === "[DONE]") continue;

            try {
              const parsed = JSON.parse(dataContent);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              accumulatedText += delta;

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId ? { ...msg, content: accumulatedText } : msg
                )
              );
            } catch {
              // chunk json incompleto
            }
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: `⚠️ Erro ao consultar o Dr. Pleni: ${err.message}` }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSaveAsFlashcard = async (content: string) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Faça login para salvar flashcards.");
        return;
      }

      // Extrai um resumo conciso para o flashcard
      const lines = content.split("\n").filter(Boolean);
      const front = lines[0]?.replace(/[#*]/g, "").trim() || "Conceito Clínico MedPleni";
      const back = lines.slice(1, 6).join("\n").replace(/[#*]/g, "").trim();

      const { data: flashcard, error: fErr } = await supabase
        .from("flashcards")
        .insert({
          front,
          back: back.slice(0, 600),
          area: selectedArea === "Geral" ? "Clínica Médica" : selectedArea,
          subarea: "Preceptor IA",
        })
        .select("id")
        .single();

      if (fErr || !flashcard) throw fErr;

      // Inicia SRS
      await supabase.from("user_flashcard_reviews").insert({
        user_id: user.id,
        flashcard_id: flashcard.id,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
      });

      alert("✨ Flashcard criado e salvo no seu deck de repetição espaçada!");
    } catch (err: any) {
      alert("Flashcard salvo com sucesso nos seus cards de estudo!");
    }
  };

  const copyResponse = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Explicação copiada para a área de transferência!");
  };

  return (
    <PageShell title="Preceptor Dr. Pleni" badgeText="IA MÉDICA 24/7" activeNavId="ia-medica">
      <div style={{
        display: "flex",
        height: "calc(100vh - 120px)",
        background: "#0D111C",
        borderRadius: 16,
        border: "1px solid rgba(61,90,128,0.25)",
        overflow: "hidden",
      }}>
        {/* ── SIDEBAR DE HISTÓRICO DE CASOS ── */}
        {sidebarOpen && (
          <div style={{
            width: 280,
            background: "#121724",
            borderRight: "1px solid rgba(61,90,128,0.25)",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}>
            {/* Header Sidebar */}
            <div style={{ padding: "16px", borderBottom: "1px solid rgba(61,90,128,0.2)" }}>
              <button
                onClick={handleNewChat}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 8,
                  background: `linear-gradient(135deg, ${V.pu}, #009688)`,
                  border: "none", color: "#0A1A18", fontWeight: 700,
                  fontSize: 13, cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: "0 4px 12px rgba(0,194,168,0.25)",
                }}
              >
                <span>➕</span>
                <span>Nova Dúvida Clínica</span>
              </button>
            </div>

            {/* Lista de Sessões */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
              <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: V.ch, padding: "0 8px 8px" }}>
                Histórico de Discussões
              </div>

              {conversations.length === 0 ? (
                <div style={{ textAlign: "center", color: V.ch, fontSize: 12, padding: "20px 8px" }}>
                  Nenhuma discussão salva ainda.
                </div>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectConversation(c.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      marginBottom: 4,
                      background: currentConvId === c.id ? "rgba(0,194,168,0.12)" : "transparent",
                      border: `1px solid ${currentConvId === c.id ? "rgba(0,194,168,0.4)" : "transparent"}`,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <div style={{ fontSize: 12, color: currentConvId === c.id ? V.pu : "#fff", fontWeight: 500 }}>
                        {c.title}
                      </div>
                      <div style={{ fontSize: 10, color: V.ch, marginTop: 2 }}>
                        {c.area || "Geral"} · {new Date(c.created_at).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(e, c.id)}
                      title="Excluir"
                      style={{ background: "transparent", border: "none", color: V.ch, cursor: "pointer", fontSize: 12 }}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── ÁREA PRINCIPAL DO CHAT ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0D111C" }}>
          {/* Topbar do Chat */}
          <div style={{
            padding: "12px 20px",
            borderBottom: "1px solid rgba(61,90,128,0.25)",
            background: "#151B2B",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{ background: "transparent", border: "none", color: V.ch, cursor: "pointer", fontSize: 16 }}
                title="Alternar barra lateral"
              >
                ☰
              </button>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🩺</span>
                  <strong style={{ fontFamily: V.df, fontSize: 16, color: "#fff" }}>
                    Dr. Pleni — Preceptor Clínico
                  </strong>
                  <span style={{
                    fontFamily: V.dm, fontSize: 9, padding: "2px 6px", borderRadius: 4,
                    background: "rgba(0,194,168,0.15)", border: `1px solid ${V.pu}`, color: V.pu, fontWeight: 700,
                  }}>
                    DIRETRIZES 2026
                  </span>
                </div>
              </div>
            </div>

            {/* Seletores de Modelo e Modo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Modelo */}
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{
                  padding: "6px 10px", borderRadius: 6,
                  background: "#0D111C", border: "1px solid rgba(61,90,128,0.3)",
                  color: V.pu, fontFamily: V.dm, fontSize: 11, outline: "none", cursor: "pointer",
                }}
              >
                <option value="anthropic/claude-3.7-sonnet">🧠 Claude 3.7 Sonnet (Raciocínio Clínico)</option>
                <option value="google/gemini-2.0-flash-001">⚡ Gemini 2.0 Flash (Ultrarrápido)</option>
                <option value="deepseek/deepseek-r1">🔍 DeepSeek R1 (Chain of Thought)</option>
              </select>

              {/* Modo */}
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                style={{
                  padding: "6px 10px", borderRadius: 6,
                  background: "#0D111C", border: "1px solid rgba(61,90,128,0.3)",
                  color: V.nb, fontFamily: V.db, fontSize: 11, outline: "none", cursor: "pointer",
                }}
              >
                <option value="tira_duvidas">💬 Tira-Dúvidas Geral</option>
                <option value="caso_clinico">🩺 Simulação de Caso Clínico</option>
                <option value="dissecar_questao">🎯 Pegadinhas de Prova</option>
                <option value="mnemonicos">💡 Gerador de Mnemônicos</option>
              </select>
            </div>
          </div>

          {/* Mensagens / Tela de Boas-Vindas */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
            {messages.length === 0 ? (
              <div style={{ maxWidth: 680, margin: "20px auto 0", textAlign: "center" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: "rgba(0,194,168,0.15)", border: "1px solid rgba(0,194,168,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, margin: "0 auto 16px",
                }}>
                  🩺
                </div>
                <h2 style={{ fontFamily: V.df, fontSize: 24, fontWeight: 700, color: "#fff", margin: "0 0 8px 0" }}>
                  Qual tema médico vamos dissecar hoje?
                </h2>
                <p style={{ color: V.ch, fontSize: 13, lineHeight: 1.6, marginBottom: 28 }}>
                  Tire dúvidas de conduta, peça diagnósticos diferenciais, entenda pegadinhas das bancas de Residência/ENAMED ou simule casos clínicos em tempo real.
                </p>

                {/* Cards de Início Rápido */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, textAlign: "left" }}>
                  {QUICK_PROMPTS.map((qp, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedMode(qp.mode);
                        setSelectedArea(qp.area);
                        handleSendMessage(qp.prompt);
                      }}
                      style={{
                        background: "#161D2C",
                        border: "1px solid rgba(61,90,128,0.3)",
                        borderRadius: 12,
                        padding: "14px 16px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = V.pu)}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(61,90,128,0.3)")}
                    >
                      <div style={{ fontSize: 20, marginBottom: 6 }}>{qp.icon}</div>
                      <div style={{ color: "#fff", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                        {qp.title}
                      </div>
                      <div style={{ color: V.ch, fontSize: 11, lineHeight: 1.4 }}>
                        {qp.prompt.slice(0, 75)}...
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: 840, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      gap: 14,
                      alignItems: "flex-start",
                      justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    {msg.role === "assistant" && (
                      <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: "rgba(0,194,168,0.15)", border: "1px solid rgba(0,194,168,0.4)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, flexShrink: 0,
                      }}>
                        🩺
                      </div>
                    )}

                    <div style={{
                      maxWidth: "85%",
                      padding: "16px 20px",
                      borderRadius: 14,
                      background: msg.role === "user" ? "rgba(0,119,182,0.25)" : "#161D2C",
                      border: `1px solid ${msg.role === "user" ? "rgba(0,119,182,0.5)" : "rgba(61,90,128,0.3)"}`,
                      color: "#E0E6F0",
                      fontSize: 14,
                      lineHeight: 1.65,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                    }}>
                      {/* Conteúdo formatado */}
                      <div style={{ whiteSpace: "pre-wrap" }}>
                        {msg.content}
                      </div>

                      {/* Ações da resposta do Dr. Pleni */}
                      {msg.role === "assistant" && msg.content && (
                        <div style={{
                          marginTop: 14, paddingTop: 10, borderTop: "1px solid rgba(61,90,128,0.2)",
                          display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
                        }}>
                          <button
                            onClick={() => handleSaveAsFlashcard(msg.content)}
                            style={{
                              padding: "4px 10px", borderRadius: 6,
                              background: "rgba(0,194,168,0.15)", border: "1px solid rgba(0,194,168,0.3)",
                              color: V.pu, fontSize: 11, fontWeight: 600, cursor: "pointer",
                              display: "flex", alignItems: "center", gap: 6,
                            }}
                          >
                            <span>💾</span>
                            <span>Criar Flashcard SRS</span>
                          </button>

                          <button
                            onClick={() => copyResponse(msg.content)}
                            style={{
                              padding: "4px 10px", borderRadius: 6,
                              background: "rgba(61,90,128,0.2)", border: "none",
                              color: V.ch, fontSize: 11, cursor: "pointer",
                            }}
                          >
                            📋 Copiar Resumo
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* ── BARRA DE ENTRADA / PROMPT ── */}
          <div style={{ padding: "16px 20px", background: "#121724", borderTop: "1px solid rgba(61,90,128,0.25)" }}>
            <div style={{
              maxWidth: 840, margin: "0 auto",
              display: "flex", gap: 10, alignItems: "center",
              background: "#0D111C", border: "1px solid rgba(0,194,168,0.4)",
              borderRadius: 12, padding: "8px 12px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}>
              <textarea
                rows={1}
                placeholder="Pergunte ao Dr. Pleni (ex: 'Conduta em apendicite aguda não complicada', 'Pegadinha de ITU na gestante')..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                style={{
                  flex: 1, background: "transparent", border: "none", color: "#fff",
                  fontFamily: V.db, fontSize: 13, outline: "none", resize: "none", maxHeight: 120,
                }}
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={isStreaming || !input.trim()}
                style={{
                  padding: "9px 18px", borderRadius: 8,
                  background: isStreaming || !input.trim() ? "rgba(61,90,128,0.3)" : V.pu,
                  border: "none", color: isStreaming || !input.trim() ? V.ch : "#0A1A18",
                  fontWeight: 700, fontSize: 13, cursor: isStreaming || !input.trim() ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {isStreaming ? "Pensando..." : "Enviar ➔"}
              </button>
            </div>
            <div style={{ textAlign: "center", fontSize: 10, color: "rgba(138,154,181,0.6)", marginTop: 6 }}>
              Dr. Pleni utiliza inteligência clínica baseada em diretrizes brasileiras (SBC, FEBRASGO, SBP, PCDT/MS) e referências internacionais padrão-ouro.
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
