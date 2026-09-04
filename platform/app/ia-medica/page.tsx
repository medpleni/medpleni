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
    cards: { tag: string; title: string; prompt: string; area: string }[];
  }
> = {
  tira_duvidas: {
    modeTitle: "Qual tema médico vamos dissecar hoje?",
    modeSubtitle: "Tire dúvidas de conduta, peça diagnósticos diferenciais e entenda a fisiopatologia passo a passo.",
    cards: [
      {
        tag: "Arritmias",
        title: "Diferenciar Taquiarritmias",
        prompt: "Como diferenciar Taquicardia Ventricular (TV) de TPSV com aberrância no ECG segundo os critérios de Brugada e Vereckei?",
        area: "Clinica",
      },
      {
        tag: "Emergência",
        title: "Choque Anafilático no PS",
        prompt: "Qual o manejo imediato de choque anafilático refratário no pronto-socorro e doses exatas de Adrenalina IM vs IV?",
        area: "Clinica",
      },
      {
        tag: "Endocrino",
        title: "Cetoacidose Diabética (CAD)",
        prompt: "Qual o protocolo atualizado de reposição volêmica, insulinoterapia e reposição de potássio na Cetoacidose Diabética segundo a SBD/ADA?",
        area: "Clinica",
      },
      {
        tag: "Infecto",
        title: "Sepse Foco Pulmonar",
        prompt: "Critérios de qSOFA/SOFA, tempo para início de antimicrobianos e alvos de ressuscitação volêmica na sepse grave.",
        area: "Clinica",
      },
    ],
  },
  caso_clinico: {
    modeTitle: "Simulação de Casos Clínicos Interativos",
    modeSubtitle: "O Preceptor Dr. Pleni conduzirá o caso em etapas: HDA -> Exame Físico -> Propedêutica -> Conduta Final.",
    cards: [
      {
        tag: "Emergência",
        title: "Emergência: Dor Torácica Aguda",
        prompt: "Preceptor, inicie um caso clínico interativo de Dor Torácica Aguda no PS para eu investigar e conduzir passo a passo.",
        area: "Clinica",
      },
      {
        tag: "Cirurgia",
        title: "Cirurgia: Abdome Agudo Febril",
        prompt: "Preceptor, inicie um caso clínico interativo de Abdome Agudo em adulto jovem para eu fazer a propedêutica e decidir indicação cirúrgica.",
        area: "Cirurgia",
      },
      {
        tag: "Obstetrícia",
        title: "GO: Sangramento 3º Trimestre",
        prompt: "Preceptor, inicie um caso clínico interativo de Sangramento no 3º Trimestre de Gestação para eu estratificar e definir conduta obstétrica.",
        area: "GO",
      },
      {
        tag: "Pediatria",
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
        tag: "ENARE / USP",
        title: "Bancas USP & ENARE: Pré-Eclâmpsia",
        prompt: "Quais são as 3 principais pegadinhas das bancas ENARE e USP sobre Pré-Eclâmpsia Grave e Síndrome HELLP?",
        area: "GO",
      },
      {
        tag: "REVALIDA",
        title: "Banca REVALIDA: Tuberculose & HIV",
        prompt: "Quais as cascas de banana clássicas do Revalida INEP sobre coinfecção TB-HIV e tempo correto de início da TARV?",
        area: "Preventiva",
      },
      {
        tag: "ENAMED",
        title: "Banca ENAMED: SUS & Atenção Primária",
        prompt: "Quais as pegadinhas mais recorrentes do ENAMED sobre princípios do SUS, financiamento e territorialização da ESF?",
        area: "Preventiva",
      },
      {
        tag: "UNICAMP",
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
        tag: "Pneumologia",
        title: "Critérios de Light (Derrame Pleural)",
        prompt: "Crie um mnemônico infalível para memorizar os 3 critérios de Light para diferenciar exsudato de transudato.",
        area: "Clinica",
      },
      {
        tag: "Nefrologia",
        title: "Diálise de Urgência (AEIOU)",
        prompt: "Explique o mnemônico das 5 indicações clássicas de diálise de urgência (A-E-I-O-U) com os valores de corte laboratoriais.",
        area: "Clinica",
      },
      {
        tag: "Cardiologia",
        title: "Causas de PCR (5Hs e 5Ts)",
        prompt: "Explique os 5Hs e 5Ts da parada cardiorrespiratória com regras práticas para fixação no ACLS e nas provas.",
        area: "Clinica",
      },
      {
        tag: "Preventiva",
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

  // No mobile, fecha o histórico inicialmente para não espremer o chat
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  // Carrega mensagens ao trocar de conversa
  const handleSelectConversation = async (convId: string) => {
    if (isStreaming) return;
    setCurrentConvId(convId);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }

    // Tenta carregar do cache local para renderização instantânea
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`medpleni_conv_${convId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
      } catch {}
    }

    try {
      const res = await fetch(`/api/ai/conversations?id=${convId}`);
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        const mapped = data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        }));

        setMessages((prev) => {
          // Se o banco só tem 1 pergunta do usuário mas o cache já tem a resposta, preserva
          if (mapped.length === 1 && mapped[0].role === "user" && prev.length > 1) {
            return prev;
          }
          return mapped;
        });

        if (typeof window !== "undefined") {
          localStorage.setItem(`medpleni_conv_${convId}`, JSON.stringify(mapped));
        }
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
      if (typeof window !== "undefined") {
        localStorage.removeItem(`medpleni_conv_${convId}`);
      }
      if (currentConvId === convId) {
        handleNewChat();
      }
    } catch (err) {
      alert("Erro ao excluir conversa.");
    }
  };

  const handleSendMessage = async (textToSend?: string, regenerateForFirstMessage = false) => {
    const text = (textToSend || input).trim();
    if (!text || isStreaming) return;

    setInput("");
    let newMessages: Message[];
    if (regenerateForFirstMessage && messages.length === 1 && messages[0].role === "user") {
      newMessages = messages;
    } else {
      const userMsg: Message = { id: `u_${Date.now()}`, role: "user", content: text };
      newMessages = [...messages, userMsg];
    }
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

      let activeConvId = currentConvId;
      const newConvHeader = response.headers.get("X-Conversation-Id");
      if (newConvHeader) {
        activeConvId = newConvHeader;
        if (!currentConvId) {
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
        accumulatedText =
          "### Resposta do Dr. Pleni\nRecebi sua dúvida clínica e os protocolos vigentes foram analisados. Como podemos aprofundar sua conduta neste caso?";
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: accumulatedText } : msg
          )
        );
      }

      // Persiste a resposta da IA no Supabase e no cache local
      if (activeConvId && accumulatedText.trim()) {
        try {
          await fetch("/api/ai/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId: activeConvId,
              role: "assistant",
              content: accumulatedText.trim(),
              metadata: { mode: selectedMode, model: selectedModel },
            }),
          });
        } catch (saveErr) {
          console.warn("Aviso ao persistir resposta da IA no Supabase:", saveErr);
        }

        if (typeof window !== "undefined") {
          try {
            const finalChat = [
              ...newMessages,
              { id: assistantMsgId, role: "assistant", content: accumulatedText.trim() },
            ];
            localStorage.setItem(`medpleni_conv_${activeConvId}`, JSON.stringify(finalChat));
          } catch {}
        }
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: `Erro: ${err.message || "Erro ao consultar o Dr. Pleni."}` }
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

      alert("Flashcard salvo com sucesso no seu deck de repetição espaçada!");
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
      <style>{`
        @media (max-width: 768px) {
          .ia-shell-container {
            height: calc(100vh - 138px - env(safe-area-inset-bottom, 0px)) !important;
            border-radius: 12px !important;
          }
          .ia-history-sidebar {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            width: 300px !important;
            max-width: 86vw !important;
            z-index: 10001 !important;
            box-shadow: 4px 0 24px rgba(0,0,0,0.6) !important;
            background: var(--card-bg) !important;
          }
          .ia-history-backdrop {
            display: block !important;
          }
          .ia-sidebar-close-btn {
            display: flex !important;
          }
          .ia-modes-wrapper {
            width: 100% !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            padding-bottom: 2px !important;
          }
          .ia-welcome-grid {
            grid-template-columns: 1fr !important;
          }
          .ia-input-footer {
            padding: 8px 10px !important;
          }
        }
        @media (min-width: 769px) {
          .ia-history-backdrop {
            display: none !important;
          }
          .ia-sidebar-close-btn {
            display: none !important;
          }
        }
      `}</style>
      <div
        className="ia-shell-container"
        style={{
          display: "flex",
          height: "calc(100vh - 120px)",
          background: "var(--card-bg)",
          borderRadius: 16,
          border: "1px solid var(--card-border)",
          boxShadow: "var(--card-shadow)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* ── SIDEBAR DE HISTÓRICO DE CASOS ── */}
        {sidebarOpen && (
          <>
            <div
              className="ia-history-backdrop"
              onClick={() => setSidebarOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(4px)",
                zIndex: 10000,
                display: "none",
              }}
            />
            <div
              className="ia-history-sidebar"
              style={{
                width: 280,
                background: "var(--input-bg)",
                borderRight: "1px solid var(--card-border)",
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
              }}
            >
              {/* Header Sidebar */}
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => {
                    handleNewChat();
                    if (typeof window !== "undefined" && window.innerWidth < 768) setSidebarOpen(false);
                  }}
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: 8,
                    background: `linear-gradient(135deg, ${V.pu}, #009688)`,
                    border: "none", color: "#FFFFFF", fontWeight: 700,
                    fontSize: 13, cursor: "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: "0 4px 12px rgba(0,194,168,0.25)",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Nova Dúvida Clínica</span>
                </button>

                <button
                  onClick={() => setSidebarOpen(false)}
                  className="ia-sidebar-close-btn"
                  aria-label="Fechar histórico"
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: "var(--card-bg)", border: "1px solid var(--card-border)",
                    color: "var(--chumbo)", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
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
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--pulso)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
                    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
                    <circle cx="20" cy="10" r="2" />
                  </svg>
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

            {/* Seletores de Modo (Segmented Buttons) e Modelo + Botão Limpar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", width: "100%" }}>
              {/* Botões Segmentados de Modo com Rolagem Touch */}
              <div
                className="ia-modes-wrapper mobile-scroll-x"
                style={{
                  display: "flex", gap: 4, background: "var(--input-bg)", padding: 3,
                  borderRadius: 8, border: "1px solid var(--card-border)", flexShrink: 0,
                }}
              >
                {[
                  { id: "tira_duvidas", label: "Tira-Dúvidas" },
                  { id: "caso_clinico", label: "Caso Clínico" },
                  { id: "dissecar_questao", label: "Pegadinhas de Prova" },
                  { id: "mnemonicos", label: "Mnemônicos" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMode(m.id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "none",
                      fontSize: 11,
                      fontFamily: V.db,
                      fontWeight: selectedMode === m.id ? 700 : 500,
                      background: selectedMode === m.id ? V.pu : "transparent",
                      color: selectedMode === m.id ? "#FFFFFF" : "var(--chumbo)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

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
                <option value="anthropic/claude-3.7-sonnet">Claude 3.7 Sonnet (Raciocínio Clínico)</option>
                <option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash (Ultrarrápido)</option>
                <option value="deepseek/deepseek-r1">DeepSeek R1 (Chain of Thought)</option>
              </select>

              {/* Botão Limpar / Nova Discussão */}
              {messages.length > 0 && (
                <button
                  onClick={handleNewChat}
                  title="Limpar e Iniciar Nova Dúvida"
                  style={{
                    padding: "6px 10px", borderRadius: 6,
                    background: "var(--input-bg)", border: "1px solid var(--card-border)",
                    color: "var(--chumbo)", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
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
                  margin: "0 auto 16px",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--pulso)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
                    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
                    <circle cx="20" cy="10" r="2" />
                  </svg>
                </div>
                <h2 style={{ fontFamily: V.df, fontSize: 24, fontWeight: 700, color: "var(--heading-color)", margin: "0 0 8px 0" }}>
                  {currentModeData.modeTitle}
                </h2>
                <p style={{ color: "var(--chumbo)", fontSize: 13, lineHeight: 1.6, marginBottom: 28 }}>
                  {currentModeData.modeSubtitle}
                </p>

                {/* Cards de Início Rápido Dinâmicos por Modo */}
                <div className="ia-welcome-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, textAlign: "left" }}>
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
                      <div style={{ marginBottom: 8 }}>
                        <span style={{
                          fontFamily: V.dm,
                          fontSize: 9,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          padding: "2px 7px",
                          borderRadius: 4,
                          background: "var(--input-bg)",
                          border: "1px solid var(--card-border)",
                          color: V.pu,
                          fontWeight: 600,
                        }}>
                          {qp.tag}
                        </span>
                      </div>
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
                      gap: 12,
                      alignItems: "flex-start",
                      justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    {msg.role === "assistant" && (
                      <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: "var(--pulso-dim)", border: "1px solid rgba(0,194,168,0.4)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--pulso)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
                          <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
                          <circle cx="20" cy="10" r="2" />
                        </svg>
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
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                              <polyline points="17 21 17 13 7 13 7 21" />
                              <polyline points="7 3 7 8 15 8" />
                            </svg>
                            <span>Salvar como Flashcard</span>
                          </button>

                          <button
                            onClick={() => copyResponse(msg.content)}
                            style={{
                              padding: "4px 10px", borderRadius: 6,
                              background: "var(--input-bg)", border: "1px solid var(--card-border)",
                              color: "var(--chumbo)", fontSize: 11, cursor: "pointer",
                              display: "flex", alignItems: "center", gap: 6,
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            <span>Copiar Resumo</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {/* Caso de conversa legada com apenas a pergunta do usuário */}
                {messages.length === 1 && messages[0].role === "user" && !isStreaming && (
                  <div style={{
                    maxWidth: 720,
                    margin: "12px 0 0 0",
                    padding: "16px 20px",
                    borderRadius: 14,
                    background: "var(--card-bg)",
                    border: "1px dashed rgba(0, 194, 168, 0.4)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--pulso)", fontWeight: 600, fontSize: 13 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      <span>Discussão selecionada do histórico</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--chumbo)", lineHeight: 1.5 }}>
                      Esta discussão anterior foi iniciada com a pergunta acima. Clique no botão abaixo para o Dr. Pleni sintetizar a conduta e resposta clínica completa agora.
                    </div>
                    <div>
                      <button
                        onClick={() => handleSendMessage(messages[0].content, true)}
                        style={{
                          padding: "8px 18px",
                          borderRadius: 8,
                          background: `linear-gradient(135deg, ${V.pu}, #009688)`,
                          border: "none",
                          color: "#FFFFFF",
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          boxShadow: "0 2px 8px rgba(0,194,168,0.25)",
                        }}
                      >
                        <span>Gerar Resposta do Dr. Pleni Agora ➔</span>
                      </button>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* ── BARRA DE ENTRADA / PROMPT ── */}
          <div className="ia-input-footer" style={{ padding: "14px 20px", background: "var(--card-bg)", borderTop: "1px solid var(--card-border)" }}>
            <div style={{
              maxWidth: 840, margin: "0 auto",
              display: "flex", gap: 10, alignItems: "center",
              background: "var(--input-bg)", border: "1px solid var(--card-border)",
              borderRadius: 12, padding: "8px 12px",
              boxShadow: "var(--card-shadow)",
            }}>
              <textarea
                rows={1}
                placeholder={
                  selectedMode === "caso_clinico"
                    ? "Digite o tema para o caso (ex: 'Dor torácica aguda', 'Lactente sibilante') ou responda à pergunta..."
                    : selectedMode === "dissecar_questao"
                    ? "Digite o tema ou banca para dissecar pegadinhas (ex: 'Pegadinha de ITU na gestante na ENARE')..."
                    : selectedMode === "mnemonicos"
                    ? "Digite o escore ou critérios para criar mnemônico (ex: 'Critérios de Light', 'Critérios de Jones')..."
                    : "Pergunte ao Dr. Pleni (ex: 'Conduta na sepse foco pulmonar', 'Diferenciar TV de TPSV com aberrância')..."
                }
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
                  border: "none", color: isStreaming || !input.trim() ? V.ch : "#FFFFFF",
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
                    background: V.pu, border: "none", color: "#FFFFFF",
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
