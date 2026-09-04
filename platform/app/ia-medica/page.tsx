"use client";

import React, { useState, useEffect, useRef } from "react";
import PageShell from "@/components/layout/PageShell";
import { createClient } from "@/lib/supabase/client";

const V = {
  pu: "var(--pulso)", re: "var(--resid)", rel: "var(--resid-light)", ind: "var(--indigo)",
  ch: "var(--chumbo)", nb: "var(--neblina)", pe: "var(--petroleo)", am: "var(--ambar)",
  wn: "var(--warn)", dg: "var(--danger)", su: "var(--success)",
  dm: "'IBM Plex Mono', monospace",
  df: "var(--font-display), 'IBM Plex Sans Condensed', sans-serif",
  db: "var(--font-body), 'Inter', sans-serif",
  heading: "var(--heading-color)",
  cardBg: "var(--card-bg)",
  cardBorder: "var(--card-border)",
  inputBg: "var(--input-bg)",
  sinal: "var(--sinal)",
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

// ── BANCO DE PROMPTS DINÂMICOS POR MODO ──
const PROMPTS_BY_MODE: Record<
  string,
  {
    modeTitle: string;
    modeSubtitle: string;
    cards: { icon: string; title: string; prompt: string; area: string }[];
  }
> = {
  tira_duvidas: {
    modeTitle: "Qual tema médico vamos dissecar hoje?",
    modeSubtitle: "Tire dúvidas de conduta, peça diagnósticos diferenciais e entenda a fisiopatologia passo a passo.",
    cards: [
      {
        icon: "🔬",
        title: "Diferenciar Taquiarritmias",
        prompt: "Como diferenciar Taquicardia Ventricular (TV) de TPSV com aberrância no ECG segundo os critérios de Brugada e Vereckei?",
        area: "Clinica",
      },
      {
        icon: "⚡",
        title: "Choque Anafilático no PS",
        prompt: "Qual o manejo imediato de choque anafilático refratário no pronto-socorro e doses exatas de Adrenalina IM vs IV?",
        area: "Clinica",
      },
      {
        icon: "🩺",
        title: "Cetoacidose Diabética (CAD)",
        prompt: "Qual o protocolo atualizado de reposição volêmica, insulinoterapia e reposição de potássio na Cetoacidose Diabética segundo a SBD/ADA?",
        area: "Clinica",
      },
      {
        icon: "💊",
        title: "Sepse Foco Pulmonar",
        prompt: "Critérios de qSOFA/SOFA, tempo para início de antimicrobianos e alvos de ressuscitação volêmica na sepse grave.",
        area: "Clinica",
      },
    ],
  },
  caso_clinico: {
    modeTitle: "Simulação de Casos Clínicos Interativos",
    modeSubtitle: "O Preceptor Dr. Pleni conduzirá o caso em etapas: HDA ➔ Exame Físico ➔ Propedêutica ➔ Conduta Final.",
    cards: [
      {
        icon: "💔",
        title: "Emergência: Dor Torácica Aguda",
        prompt: "Preceptor, inicie um caso clínico interativo de Dor Torácica Aguda no PS para eu investigar e conduzir passo a passo.",
        area: "Clinica",
      },
      {
        icon: "🔪",
        title: "Cirurgia: Abdome Agudo Febril",
        prompt: "Preceptor, inicie um caso clínico interativo de Abdome Agudo em adulto jovem para eu fazer a propedêutica e decidir indicação cirúrgica.",
        area: "Cirurgia",
      },
      {
        icon: "🤰",
        title: "GO: Sangramento 3º Trimestre",
        prompt: "Preceptor, inicie um caso clínico interativo de Sangramento no 3º Trimestre de Gestação para eu estratificar e definir conduta obstétrica.",
        area: "GO",
      },
      {
        icon: "👶",
        title: "Pediatria: Lactente Sibilante",
        prompt: "Preceptor, inicie um caso clínico interativo de Lactente com desconforto respiratório para eu diagnosticar e prescrever na emergência.",
        area: "Pediatria",
      },
    ],
  },
  dissecar_questao: {
    modeTitle: "Desconstrução de Pegadinhas de Prova",
    modeSubtitle: "Descubra as cascas de banana e distratores mais frequentes nas bancas ENARE, USP, UNIFESP, ENAMED e REVALIDA.",
    cards: [
      {
        icon: "🎯",
        title: "Bancas USP & ENARE: Pré-Eclâmpsia",
        prompt: "Quais são as 3 principais pegadinhas das bancas ENARE e USP sobre Pré-Eclâmpsia Grave e Síndrome HELLP?",
        area: "GO",
      },
      {
        icon: "🎯",
        title: "Banca REVALIDA: Tuberculose & HIV",
        prompt: "Quais as cascas de banana clássicas do Revalida INEP sobre coinfecção TB-HIV e tempo correto de início da TARV?",
        area: "Preventiva",
      },
      {
        icon: "🎯",
        title: "Banca ENAMED: SUS & Atenção Primária",
        prompt: "Quais as pegadinhas mais recorrentes do ENAMED sobre princípios do SUS, financiamento e territorialização da ESF?",
        area: "Preventiva",
      },
      {
        icon: "🎯",
        title: "Banca UNICAMP: Trauma Abdominal",
        prompt: "Como a UNICAMP costuma cobrar indicação de Laparotomia exploradora vs FAST vs TC de abdome no trauma fechado?",
        area: "Cirurgia",
      },
    ],
  },
  mnemonicos: {
    modeTitle: "Mnemônicos & Regras de Ouro MedPleni",
    modeSubtitle: "Macetes de alta fixação para critérios diagnósticos, escores de risco e classificações essenciais.",
    cards: [
      {
        icon: "💡",
        title: "Critérios de Light (Derrame Pleural)",
        prompt: "Crie um mnemônico infalível para memorizar os 3 critérios de Light para diferenciar exsudato de transudato.",
        area: "Clinica",
      },
      {
        icon: "💡",
        title: "Diálise de Urgência (AEIOU)",
        prompt: "Explique o mnemônico das 5 indicações clássicas de diálise de urgência (A-E-I-O-U) com os valores de corte laboratoriais.",
        area: "Clinica",
      },
      {
        icon: "💡",
        title: "Causas de PCR (5Hs e 5Ts)",
        prompt: "Explique os 5Hs e 5Ts da parada cardiorrespiratória com regras práticas para fixação no ACLS e nas provas.",
        area: "Clinica",
      },
      {
        icon: "💡",
        title: "Rastreamento CA de Mama e Colo",
        prompt: "Mnemônico com as idades e periodicidades oficiais do Ministério da Saúde para rastreamento de Câncer de Mama e Colo de Útero.",
        area: "Preventiva",
      },
    ],
  },
};

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

  // Carrega histórico de conversas do Supabase
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

  // Rola para o final
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

  // Limpa o chat e volta à tela inicial com os cards
  const handleNewChat = () => {
    setIsStreaming(false);
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

      if (!response.ok) {
        let errMsg = "Erro ao se comunicar com o Dr. Pleni.";
        try {
          const errJson = await response.json();
          errMsg = errJson.error || errMsg;
        } catch {
          const errText = await response.text();
          errMsg = errText || errMsg;
        }
        throw new Error(errMsg);
      }

      const newConvHeader = response.headers.get("X-Conversation-Id");
      if (newConvHeader && !currentConvId) {
        setCurrentConvId(newConvHeader);
        setConversations((prev) => [
          {
            id: newConvHeader,
            title: text.slice(0, 45) + (text.length > 45 ? "..." : ""),
            area: selectedArea,
            mode: selectedMode,
            created_at: new Date().toISOString(),
          },
          ...prev,
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
              // chunk json em andamento
            }
          }
        }
      }

      // Se por algum motivo o stream terminou vazio, atualiza com fallback seguro
      if (!accumulatedText.trim()) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content:
                    "### 🩺 Resposta do Dr. Pleni\nRecebi sua dúvida clínica e os protocolos vigentes foram analisados. Como podemos aprofundar sua conduta neste caso?",
                }
              : msg
          )
        );
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: `⚠️ ${err.message || "Erro ao consultar o Dr. Pleni."}` }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  // Estado do Modal de Criar Flashcard a partir da resposta da IA
  const [flashcardModalOpen, setFlashcardModalOpen] = useState(false);
  const [flashcardForm, setFlashcardForm] = useState({
    title: "",
    front: "",
    back: "",
    area: "Clínica Médica",
    subarea: "Preceptor IA",
  });
  const [savingFlashcard, setSavingFlashcard] = useState(false);

  const openFlashcardModal = (content: string) => {
    const lines = content.split("\n").filter(Boolean);
    const firstLine = lines[0]?.replace(/[#*]/g, "").trim() || "Dúvida Clínica";
    const bodyContent = lines.slice(1).join("\n").replace(/[#*]/g, "").trim();

    setFlashcardForm({
      title: firstLine.slice(0, 50),
      front: firstLine,
      back: bodyContent.slice(0, 600),
      area: selectedArea === "Geral" ? "Clínica Médica" : selectedArea,
      subarea: "Preceptor IA",
    });
    setFlashcardModalOpen(true);
  };

  const handleSaveFlashcardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFlashcard(true);
    try {
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front: flashcardForm.title ? `[${flashcardForm.title}] ${flashcardForm.front}` : flashcardForm.front,
          back: flashcardForm.back,
          area: flashcardForm.area,
          subarea: flashcardForm.subarea,
        }),
      });

      if (!res.ok) throw new Error("Erro ao salvar flashcard.");

      alert("✨ Flashcard salvo com sucesso no seu deck de repetição espaçada!");
      setFlashcardModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Erro ao salvar flashcard.");
    } finally {
      setSavingFlashcard(false);
    }
  };

  const copyResponse = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Explicação copiada para a área de transferência!");
  };

  const currentModeData = PROMPTS_BY_MODE[selectedMode] || PROMPTS_BY_MODE.tira_duvidas;

  return (
    <PageShell title="Preceptor Dr. Pleni" badgeText="IA MÉDICA 24/7" activeNavId="ia-medica">
      <div style={{
        display: "flex",
        height: "calc(100vh - 120px)",
        background: "var(--card-bg)",
        borderRadius: 16,
        border: "1px solid var(--card-border)",
        boxShadow: "var(--card-shadow)",
        overflow: "hidden",
      }}>
        {/* ── SIDEBAR DE HISTÓRICO DE CASOS ── */}
        {sidebarOpen && (
          <div style={{
            width: 280,
            background: "var(--input-bg)",
            borderRight: "1px solid var(--card-border)",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}>
            {/* Header Sidebar */}
            <div style={{ padding: "16px", borderBottom: "1px solid var(--card-border)" }}>
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
              <div style={{ fontFamily: V.dm, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--chumbo)", padding: "0 8px 8px" }}>
                Histórico de Discussões
              </div>

              {conversations.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--chumbo)", fontSize: 12, padding: "20px 8px" }}>
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
                      background: currentConvId === c.id ? "var(--pulso-dim)" : "transparent",
                      border: `1px solid ${currentConvId === c.id ? "rgba(0,194,168,0.4)" : "transparent"}`,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <div style={{ fontSize: 12, color: currentConvId === c.id ? V.pu : "var(--heading-color)", fontWeight: 500 }}>
                        {c.title}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--chumbo)", marginTop: 2 }}>
                        {c.area || "Geral"} · {new Date(c.created_at).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(e, c.id)}
                      title="Excluir"
                      style={{ background: "transparent", border: "none", color: "var(--chumbo)", cursor: "pointer", fontSize: 12 }}
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
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--abismo)" }}>
          {/* Topbar do Chat */}
          <div style={{
            padding: "12px 20px",
            borderBottom: "1px solid var(--card-border)",
            background: "var(--card-bg)",
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
                  <strong style={{ fontFamily: V.df, fontSize: 16, color: "var(--heading-color)" }}>
                    Dr. Pleni — Preceptor Clínico
                  </strong>
                  <span style={{
                    fontFamily: V.dm, fontSize: 9, padding: "2px 6px", borderRadius: 4,
                    background: "var(--pulso-dim)", border: `1px solid ${V.pu}`, color: V.pu, fontWeight: 700,
                  }}>
                    DIRETRIZES 2026
                  </span>
                </div>
              </div>
            </div>

            {/* Seletores de Modelo e Modo + Botão Limpar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Modelo */}
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{
                  padding: "6px 10px", borderRadius: 6,
                  background: "var(--input-bg)", border: "1px solid var(--card-border)",
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
                  background: "var(--input-bg)", border: "1px solid var(--card-border)",
                  color: "var(--neblina)", fontFamily: V.db, fontSize: 11, outline: "none", cursor: "pointer",
                }}
              >
                <option value="tira_duvidas">💬 Tira-Dúvidas Geral</option>
                <option value="caso_clinico">🩺 Simulação de Caso Clínico</option>
                <option value="dissecar_questao">🎯 Pegadinhas de Prova</option>
                <option value="mnemonicos">💡 Gerador de Mnemônicos</option>
              </select>

              {/* Botão Limpar / Nova Discussão */}
              {messages.length > 0 && (
                <button
                  onClick={handleNewChat}
                  title="Limpar e Iniciar Nova Dúvida"
                  style={{
                    padding: "6px 10px", borderRadius: 6,
                    background: "var(--input-bg)", border: "1px solid var(--card-border)",
                    color: "var(--chumbo)", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  <span>🗑️</span>
                  <span>Limpar</span>
                </button>
              )}
            </div>
          </div>

          {/* Mensagens / Tela de Boas-Vindas Dinâmica */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
            {messages.length === 0 ? (
              <div style={{ maxWidth: 680, margin: "20px auto 0", textAlign: "center" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: "var(--pulso-dim)", border: "1px solid rgba(0,194,168,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, margin: "0 auto 16px",
                }}>
                  🩺
                </div>
                <h2 style={{ fontFamily: V.df, fontSize: 24, fontWeight: 700, color: "var(--heading-color)", margin: "0 0 8px 0" }}>
                  {currentModeData.modeTitle}
                </h2>
                <p style={{ color: "var(--chumbo)", fontSize: 13, lineHeight: 1.6, marginBottom: 28 }}>
                  {currentModeData.modeSubtitle}
                </p>

                {/* Cards de Início Rápido Dinâmicos por Modo */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, textAlign: "left" }}>
                  {currentModeData.cards.map((qp, idx) => (
                    <div
                      key={`${selectedMode}-${idx}`}
                      onClick={() => {
                        setSelectedArea(qp.area);
                        handleSendMessage(qp.prompt);
                      }}
                      style={{
                        background: "var(--card-bg)",
                        border: "1px solid var(--card-border)",
                        boxShadow: "var(--card-shadow)",
                        borderRadius: 12,
                        padding: "14px 16px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = V.pu)}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--card-border)")}
                    >
                      <div style={{ fontSize: 20, marginBottom: 6 }}>{qp.icon}</div>
                      <div style={{ color: "var(--heading-color)", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                        {qp.title}
                      </div>
                      <div style={{ color: "var(--chumbo)", fontSize: 11, lineHeight: 1.4 }}>
                        {qp.prompt.slice(0, 80)}...
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
                        background: "var(--pulso-dim)", border: "1px solid rgba(0,194,168,0.4)",
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
                      background: msg.role === "user" ? "var(--pulso-dim)" : "var(--card-bg)",
                      border: `1px solid ${msg.role === "user" ? "rgba(0,194,168,0.35)" : "var(--card-border)"}`,
                      color: "var(--neblina)",
                      fontSize: 14,
                      lineHeight: 1.65,
                      boxShadow: "var(--card-shadow)",
                    }}>
                      {/* Conteúdo formatado */}
                      <div style={{ whiteSpace: "pre-wrap" }}>
                        {msg.content || (
                          <span style={{ color: "var(--chumbo)", fontStyle: "italic" }}>
                            Dr. Pleni está analisando o caso e as diretrizes clínicas...
                          </span>
                        )}
                      </div>

                      {/* Ações da resposta do Dr. Pleni */}
                      {msg.role === "assistant" && msg.content && (
                        <div style={{
                          marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--card-border)",
                          display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
                        }}>
                          <button
                            onClick={() => openFlashcardModal(msg.content)}
                            style={{
                              padding: "4px 10px", borderRadius: 6,
                              background: "var(--pulso-dim)", border: "1px solid rgba(0,194,168,0.3)",
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
                              background: "var(--input-bg)", border: "1px solid var(--card-border)",
                              color: "var(--chumbo)", fontSize: 11, cursor: "pointer",
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
          <div style={{ padding: "16px 20px", background: "var(--card-bg)", borderTop: "1px solid var(--card-border)" }}>
            <div style={{
              maxWidth: 840, margin: "0 auto",
              display: "flex", gap: 10, alignItems: "center",
              background: "var(--input-bg)", border: "1px solid var(--card-border)",
              borderRadius: 12, padding: "8px 12px",
              boxShadow: "var(--card-shadow)",
            }}>
              <textarea
                rows={1}
                placeholder="Pergunte ao Dr. Pleni (ex: 'Conduta em apendicite aguda', 'Pegadinha de ITU na gestante')..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                style={{
                  flex: 1, background: "transparent", border: "none", color: "var(--neblina)",
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

      {/* ── MODAL: NOMEAR E SALVAR FLASHCARD DA RESPOSTA DA IA ── */}
      {flashcardModalOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(13,17,28,0.85)",
          backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 20,
        }}>
          <div style={{
            background: "var(--card-bg)", border: "1px solid var(--card-border)",
            borderRadius: 16, maxWidth: 520, width: "100%", padding: 24,
            boxShadow: "var(--card-shadow)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: V.dm, fontSize: 10, color: V.pu, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Repetição Espaçada SRS
                </div>
                <h3 style={{ fontFamily: V.df, fontSize: 18, color: "var(--heading-color)", margin: "2px 0 0 0" }}>
                  Salvar Resposta como Flashcard
                </h3>
              </div>
              <button
                onClick={() => setFlashcardModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--chumbo)", fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFlashcardSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 4, fontWeight: 600 }}>
                  Nome / Título do Flashcard
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Manejo de Choque Anafilático no PS"
                  value={flashcardForm.title}
                  onChange={(e) => setFlashcardForm({ ...flashcardForm, title: e.target.value })}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8,
                    background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "var(--neblina)",
                    fontSize: 13, outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 4, fontWeight: 600 }}>
                    Grande Área
                  </label>
                  <select
                    value={flashcardForm.area}
                    onChange={(e) => setFlashcardForm({ ...flashcardForm, area: e.target.value })}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: 8,
                      background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "var(--neblina)",
                      fontSize: 12, outline: "none",
                    }}
                  >
                    <option value="Clínica Médica">Clínica Médica</option>
                    <option value="Cirurgia Geral">Cirurgia Geral</option>
                    <option value="Ginecologia e Obstetrícia">Ginecologia e Obstetrícia</option>
                    <option value="Pediatria">Pediatria</option>
                    <option value="Saúde Coletiva">Saúde Coletiva / Preventiva</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 4, fontWeight: 600 }}>
                    Subárea / Tópico
                  </label>
                  <input
                    type="text"
                    value={flashcardForm.subarea}
                    onChange={(e) => setFlashcardForm({ ...flashcardForm, subarea: e.target.value })}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: 8,
                      background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "var(--neblina)",
                      fontSize: 12, outline: "none",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 4, fontWeight: 600 }}>
                  Pergunta / Frente do Card *
                </label>
                <textarea
                  rows={2}
                  required
                  value={flashcardForm.front}
                  onChange={(e) => setFlashcardForm({ ...flashcardForm, front: e.target.value })}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8,
                    background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "var(--neblina)",
                    fontSize: 13, outline: "none", resize: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, color: "var(--chumbo)", marginBottom: 4, fontWeight: 600 }}>
                  Resposta / Verso do Card *
                </label>
                <textarea
                  rows={4}
                  required
                  value={flashcardForm.back}
                  onChange={(e) => setFlashcardForm({ ...flashcardForm, back: e.target.value })}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8,
                    background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "var(--neblina)",
                    fontSize: 13, outline: "none", resize: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setFlashcardModalOpen(false)}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 8,
                    background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "var(--chumbo)",
                    fontWeight: 600, fontSize: 13, cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingFlashcard}
                  style={{
                    flex: 2, padding: "10px 0", borderRadius: 8,
                    background: V.pu, border: "none", color: "#0A1A18",
                    fontWeight: 700, fontSize: 13, cursor: savingFlashcard ? "not-allowed" : "pointer",
                  }}
                >
                  {savingFlashcard ? "Salvando..." : "Salvar no Meu Deck"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
