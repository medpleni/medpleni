"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/supabase/use-user";
import {
  MODULOS,
  RAW_FEATURES,
  B2BModulo,
  B2BFeatureRaw,
} from "./features-data";
import {
  DECISOES_EXPLICITAS,
  PONTOS_EXIGEM_DECISAO,
  OBSERVACOES_LEITURA,
} from "./meeting-analysis-data";
import {
  getFeatureAIExplanation,
  AIExplanation,
} from "./ai-explainer";

// ── Metadados dos 13 Módulos B2B ──────────────────────────────────────
export const MODULOS_META: Record<
  string,
  { icon: string; tag: string; color: string; order: number }
> = {
  exec: { icon: "👔", tag: "Diretoria & Reitoria", color: "#00C2A8", order: 1 },
  regua: { icon: "📏", tag: "Ciclos ENAMED (3 Fases)", color: "#0077B6", order: 2 },
  acad: { icon: "🎓", tag: "Coordenação & Turmas", color: "#6B5CE7", order: 3 },
  prog: { icon: "🗺️", tag: "Avaliação Programática", color: "#3B82F6", order: 4 },
  interv: { icon: "🩺", tag: "Intervenções & Reteste", color: "#10B981", order: 5 },
  tutor: { icon: "👨‍⚕️", tag: "Acompanhamento & Tutoria", color: "#F59E0B", order: 6 },
  prova: { icon: "📝", tag: "Montagem & Correção QR", color: "#EC4899", order: 7 },
  qbank: { icon: "🏦", tag: "30k Questões & IA INEP", color: "#8B5CF6", order: 8 },
  docente: { icon: "👨‍🏫", tag: "Portal do Professor", color: "#06B6D4", order: 9 },
  aluno: { icon: "🎒", tag: "Experiência do Aluno", color: "#14B8A6", order: 10 },
  admin: { icon: "🛡️", tag: "Governança & LGPD TI", color: "#94A3B8", order: 11 },
  trans: { icon: "🌐", tag: "White-Label & Usabilidade", color: "#6366F1", order: 12 },
  comercial: { icon: "💼", tag: "Acordo Societário 20%", color: "#EAB308", order: 13 },
};

// ── Tipos Principais ──────────────────────────────────────────────────
type UserProfile = {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
  color: string;
};

type Task = {
  id: string;
  title: string;
  responsible: "Dr. Bruno & Dr. Filipe" | "Mario Lopes" | "Renato & Jurídico";
  priority: "Crítica" | "Alta" | "Média";
  status: "Pendente" | "Em andamento" | "Concluída";
  deadline: string;
  notes: string;
};

type ScreenApproval = {
  id: string;
  title: string;
  category: string;
  tag?: string;
  desc: string;
  image: string;
  html?: string | null;
  status: "pendente" | "aprovado" | "reprovado" | "ressalvas";
  votes: Record<string, "aprovado" | "reprovado" | "ressalvas">;
  comments: { id: string; author: string; role: string; text: string; date: string }[];
};

export type FeatureDecisionType = "aprovar" | "ajustar" | "reprovar" | "discutir";
export type FeaturePriorityType = "alta" | "media" | "baixa";

export type FeatureValidationItem = B2BFeatureRaw & {
  decision?: FeatureDecisionType;
  priority: FeaturePriorityType;
  responsible: string;
  notes: string;
  votes: Record<
    string,
    {
      decision: FeatureDecisionType;
      priority: FeaturePriorityType;
      responsible: string;
      notes: string;
      timestamp: string;
      partnerName: string;
    }
  >;
  history: {
    partnerId: string;
    partnerName: string;
    decision: FeatureDecisionType;
    priority: FeaturePriorityType;
    notes?: string;
    timestamp: string;
  }[];
};

type InvitedEmail = {
  id: string;
  email: string;
  name: string;
  role: string;
  priority: "Alta" | "Média" | "Baixa";
  status: "Ativo" | "Convite Enviado" | "Pendente";
  addedAt: string;
};

// ── Perfis dos Sócios ──────────────────────────────────────────────────
const PARTNERS: UserProfile[] = [
  {
    id: "mario",
    name: "Mario Lopes",
    role: "Líder de Tecnologia & Produto",
    email: "mario.nascimentolopes@gmail.com",
    avatar: "ML",
    color: "#00C2A8",
  },
  {
    id: "bruno",
    name: "Dr. Bruno Farnetano",
    role: "Sócio Médico · Conteúdo & Questões",
    email: "bruno.farnetano@medpleni.com.br",
    avatar: "BF",
    color: "#0077B6",
  },
  {
    id: "filipe",
    name: "Dr. Filipe Moreira de Andrade",
    role: "Sócio Médico · Pedagógico & ENAMED",
    email: "filipe.andrade@medpleni.com.br",
    avatar: "FA",
    color: "#6B5CE7",
  },
  {
    id: "renato",
    name: "Renato",
    role: "Sócio & Investidor",
    email: "renato@medpleni.com.br",
    avatar: "RE",
    color: "#C98A0A",
  },
];

// ── Tarefas Iniciais da Reunião ────────────────────────────────────────
const INITIAL_TASKS: Task[] = [
  {
    id: "t-01",
    title: "Enviar manual/treinamento oficial do MEC/INEP de padronização de itens",
    responsible: "Dr. Bruno & Dr. Filipe",
    priority: "Alta",
    status: "Pendente",
    deadline: "12/11/2026",
    notes: "Material de referência para calibrar a IA na elaboração de questões no padrão internacional do ENAMED.",
  },
  {
    id: "t-02",
    title: "Subir no Google Drive a base de 30k+ questões com devolutivas separadas",
    responsible: "Dr. Bruno & Dr. Filipe",
    priority: "Alta",
    status: "Pendente",
    deadline: "15/11/2026",
    notes: "Separar questões próprias de questões de professores terceiros para alimentar a IA na geração reversa via devolutivas.",
  },
  {
    id: "t-03",
    title: "Validar e votar nas 96 funcionalidades do módulo B2B na Central",
    responsible: "Dr. Bruno & Dr. Filipe",
    priority: "Alta",
    status: "Em andamento",
    deadline: "14/11/2026",
    notes: "Definir função a função: aprovar, ajustar, reprovar ou discutir.",
  },
  {
    id: "t-04",
    title: "Votar e aprovar a direção visual das 10 telas do Swiss Executive Dashboard",
    responsible: "Dr. Bruno & Dr. Filipe",
    priority: "Alta",
    status: "Em andamento",
    deadline: "11/11/2026",
    notes: "Escolher o estilo visual que melhor dialoga com dirigentes e coordenadores de faculdades de medicina.",
  },
  {
    id: "t-05",
    title: "Construir a Central de Aprovações no domínio principal",
    responsible: "Mario Lopes",
    priority: "Crítica",
    status: "Concluída",
    deadline: "09/11/2026",
    notes: "Central unificada com whitelist de e-mails, embed do protótipo, telas e features.",
  },
  {
    id: "t-06",
    title: "Importar as 96 funcionalidades com o log da reunião e perguntas médicas",
    responsible: "Mario Lopes",
    priority: "Alta",
    status: "Concluída",
    deadline: "09/11/2026",
    notes: "Importação das 96 features com filtros por módulo, decisões e exportação JSON/CSV.",
  },
  {
    id: "t-07",
    title: "Configurar motor de IA com o manual do MEC para geração via devolutivas",
    responsible: "Mario Lopes",
    priority: "Alta",
    status: "Pendente",
    deadline: "20/11/2026",
    notes: "Pipeline de engenharia reversa para criar questões inéditas sem infringir direitos autorais.",
  },
  {
    id: "t-08",
    title: "Desenvolver leitor de gabarito por QR Code para provas impressas",
    responsible: "Mario Lopes",
    priority: "Alta",
    status: "Pendente",
    deadline: "30/11/2026",
    notes: "Correção rápida via foto ou scanner com identificador único do aluno no cartão-resposta.",
  },
  {
    id: "t-09",
    title: "Formalizar a minuta do contrato societário de 20% com Bruno e Filipe",
    responsible: "Renato & Jurídico",
    priority: "Alta",
    status: "Em andamento",
    deadline: "18/11/2026",
    notes: "Mario faz a ponte ágil com o jurídico para redigir o contrato conforme acordado com Renato.",
  },
];

// ── Lista Inicial de E-mails Autorizados ──────────────────────────────
const INITIAL_INVITED_EMAILS: InvitedEmail[] = [
  {
    id: "inv-1",
    email: "mario.nascimentolopes@gmail.com",
    name: "Mario Lopes",
    role: "Líder de Tecnologia & Produto",
    priority: "Alta",
    status: "Ativo",
    addedAt: "05/11/2026",
  },
  {
    id: "inv-2",
    email: "bruno.farnetano@medpleni.com.br",
    name: "Dr. Bruno Farnetano",
    role: "Sócio Médico · Conteúdo",
    priority: "Alta",
    status: "Ativo",
    addedAt: "05/11/2026",
  },
  {
    id: "inv-3",
    email: "filipe.andrade@medpleni.com.br",
    name: "Dr. Filipe Moreira de Andrade",
    role: "Sócio Médico · Pedagógico",
    priority: "Alta",
    status: "Ativo",
    addedAt: "05/11/2026",
  },
  {
    id: "inv-4",
    email: "renato@medpleni.com.br",
    name: "Renato",
    role: "Sócio & Investidor",
    priority: "Alta",
    status: "Ativo",
    addedAt: "05/11/2026",
  },
];

export default function CentralAprovacoesPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, signOut } = useUser();

  const [activeTab, setActiveTab] = useState<
    "features" | "screens" | "overview" | "todo" | "prototype" | "access"
  >("features");

  // Perfil ativo para simulação de voto/comentário
  const [activePartnerId, setActivePartnerId] = useState<string>("mario");
  const currentPartner = PARTNERS.find((p) => p.id === activePartnerId) || PARTNERS[0];

  // Estados com persistência local
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [screens, setScreens] = useState<ScreenApproval[]>([]);
  const [invitedEmails, setInvitedEmails] = useState<InvitedEmail[]>(INITIAL_INVITED_EMAILS);

  // ── Autorização e Validação de E-mails ─────────────────────────────────
  const userEmail = (user?.email || "").toLowerCase().trim();

  // Sócios Fundadores e Whitelist Principal
  const INITIAL_AUTHORIZED_EMAILS = useMemo(
    () => [
      "mario.nascimentolopes@gmail.com",
      "bruno.farnetano@medpleni.com.br",
      "filipe.andrade@medpleni.com.br",
      "renato@medpleni.com.br",
    ],
    []
  );

  const isUserAuthorized = useMemo(() => {
    if (!userEmail) return false;

    // 1. Sócios fundadores da ata 05/11
    if (INITIAL_AUTHORIZED_EMAILS.includes(userEmail)) return true;

    // 2. Reconhecimento automático dos sócios por nome/sobrenome (mesmo com e-mail pessoal/gmail)
    if (
      userEmail.includes("filipe") ||
      userEmail.includes("andrade") ||
      userEmail.includes("bruno") ||
      userEmail.includes("farnetano") ||
      userEmail.includes("mario") ||
      userEmail.includes("renato")
    ) {
      return true;
    }

    // 3. E-mails convidados e salvos no banco / lista
    if (invitedEmails.some((inv) => inv.email.toLowerCase().trim() === userEmail)) {
      return true;
    }

    // 4. Qualquer e-mail institucional corporativo da MedPleni
    if (userEmail.endsWith("@medpleni.com") || userEmail.endsWith("@medpleni.com.br")) {
      return true;
    }

    // 5. Role administrativa no perfil do Supabase
    const userRole = (profile as any)?.role;
    if (
      userRole === "admin" ||
      userRole === "superadmin" ||
      userRole === "desenvolvedor"
    ) {
      return true;
    }

    return false;
  }, [userEmail, invitedEmails, profile, INITIAL_AUTHORIZED_EMAILS]);

  // Alinhamento automático do perfil do sócio com base no e-mail conectado
  useEffect(() => {
    if (!userEmail) return;
    if (userEmail.includes("bruno") || userEmail.includes("farnetano")) {
      setActivePartnerId("bruno");
    } else if (userEmail.includes("filipe") || userEmail.includes("andrade")) {
      setActivePartnerId("filipe");
    } else if (userEmail.includes("renato")) {
      setActivePartnerId("renato");
    } else if (userEmail.includes("mario")) {
      setActivePartnerId("mario");
    }
  }, [userEmail]);

  // ── 96 Features B2B ──────────────────────────────────────────────────
  const [featuresList, setFeaturesList] = useState<FeatureValidationItem[]>(() => {
    return RAW_FEATURES.map((rf) => ({
      ...rf,
      priority: rf.sugestao === "remover" ? "baixa" : "alta",
      responsible: "Dr. Bruno & Dr. Filipe",
      notes: "",
      votes: {},
      history: [],
    }));
  });

  // Filtros da Matriz de 96 Features
  const [featFilterMod, setFeatFilterMod] = useState<string>("todos");
  const [featFilterDecision, setFeatFilterDecision] = useState<string>("todos");
  const [featFilterEstado, setFeatFilterEstado] = useState<string>("todos");
  const [featFilterOrigem, setFeatFilterOrigem] = useState<string>("todos");
  const [featSearchQuery, setFeatSearchQuery] = useState<string>("");

  // Navegação Inteligente por Módulos (Sem Scroll Infinito)
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [featuresViewMode, setFeaturesViewMode] = useState<"modules" | "accordion">("modules");
  const [expandedAIs, setExpandedAIs] = useState<Record<string, boolean>>({});
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});

  const toggleAIExplainer = (featureId: string) => {
    setExpandedAIs((prev) => ({ ...prev, [featureId]: !prev[featureId] }));
  };

  const toggleAccordion = (modId: string) => {
    setExpandedAccordions((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  // Filtros de Telas
  const [screenFilterCat, setScreenFilterCat] = useState<string>("todas");
  const [activeImmersiveIndex, setActiveImmersiveIndex] = useState<number | null>(null);
  const [immersiveViewMode, setImmersiveViewMode] = useState<"live" | "width" | "fit">("live");
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [isCommentsDrawerOpen, setIsCommentsDrawerOpen] = useState<boolean>(false);
  const [commentInput, setCommentInput] = useState<string>("");

  // Filtro de Tarefas
  const [taskFilterResp, setTaskFilterResp] = useState<string>("todos");

  // Novo e-mail para whitelist
  const [newEmail, setNewEmail] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [newRole, setNewRole] = useState<string>("Consultor / Sócio");
  const [newPriority, setNewPriority] = useState<"Alta" | "Média" | "Baixa">("Alta");

  // Feedback Toast e Status de Banco de Dados
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dbSynced, setDbSynced] = useState<boolean>(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carregar dados de telas e recuperar do Banco de Dados Compartilhado (com fallback localStorage)
  useEffect(() => {
    Promise.all([
      fetch("/b2b-screens/screens.json").then((res) => res.json()).catch(() => []),
      fetch("/api/central-aprovacoes").then((res) => res.json()).catch(() => null),
    ]).then(([screensData, apiResponse]) => {
      const mapped: ScreenApproval[] = (screensData || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        category: s.category,
        tag: s.tag,
        desc: s.desc,
        image: s.image,
        html: s.html,
        status: "pendente",
        votes: {},
        comments: [],
      }));

      // 1. Tentar dados do Banco de Dados Central
      let savedData = apiResponse?.data;

      // 2. Fallback: ler do localStorage se API ainda vazia
      if (!savedData && typeof window !== "undefined") {
        try {
          const local = localStorage.getItem("medpleni_b2b_approvals_v3");
          if (local) savedData = JSON.parse(local);
        } catch (e) {}
      }

      if (savedData) {
        if (savedData.screens && savedData.screens.length > 0) {
          const mergedScreens = mapped.map((item) => {
            const found = savedData.screens.find((x: any) => x.id === item.id);
            return found ? { ...item, ...found } : item;
          });
          setScreens(mergedScreens);
        } else {
          setScreens(mapped);
        }
        if (savedData.tasks && savedData.tasks.length > 0) setTasks(savedData.tasks);
        if (savedData.invitedEmails && savedData.invitedEmails.length > 0) setInvitedEmails(savedData.invitedEmails);
        if (savedData.featuresList && savedData.featuresList.length > 0) {
          const mergedFeatures = RAW_FEATURES.map((rf) => {
            const found = savedData.featuresList.find((x: any) => x.id === rf.id);
            return found
              ? { ...rf, ...found }
              : {
                  ...rf,
                  priority: rf.sugestao === "remover" ? "baixa" : "alta",
                  responsible: "Dr. Bruno & Dr. Filipe",
                  notes: "",
                  votes: {},
                  history: [],
                };
          });
          setFeaturesList(mergedFeatures);
        }
      } else {
        setScreens(mapped);
      }
    });
  }, []);

  // Atalhos de teclado no modo imersivo de telas (Seta Direita / Seta Esquerda / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeImmersiveIndex === null) return;
      if (e.key === "Escape") {
        setActiveImmersiveIndex(null);
      } else if (e.key === "ArrowRight") {
        setActiveImmersiveIndex((prev) =>
          prev !== null ? (prev + 1) % screens.length : null
        );
      } else if (e.key === "ArrowLeft") {
        setActiveImmersiveIndex((prev) =>
          prev !== null ? (prev - 1 + screens.length) % screens.length : null
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImmersiveIndex, screens.length]);

  // Salvar no Banco de Dados Central (Supabase / Servidor) e no cache local
  const saveData = (
    newScreens = screens,
    newTasks = tasks,
    newFeatures = featuresList,
    newEmails = invitedEmails,
    actionDesc?: string
  ) => {
    // 1. Cache local no navegador
    try {
      localStorage.setItem(
        "medpleni_b2b_approvals_v3",
        JSON.stringify({
          screens: newScreens,
          tasks: newTasks,
          featuresList: newFeatures,
          invitedEmails: newEmails,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.error("Erro ao salvar no localStorage", e);
    }

    // 2. Persistência no Banco de Dados Central para que Dr. Bruno, Dr. Filipe, Mario e Renato sincronizem
    setDbSynced(false);
    fetch("/api/central-aprovacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        screens: newScreens,
        tasks: newTasks,
        featuresList: newFeatures,
        invitedEmails: newEmails,
        lastAction: actionDesc || `Voto registrado por ${currentPartner.name}`,
      }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result?.persisted) {
          setDbSynced(true);
        }
      })
      .catch((err) => {
        console.warn("Aviso ao persistir no banco central:", err);
      });
  };

  // ── Ações de Validação das 96 Features ───────────────────────────────
  const handleVoteFeature = (
    featureId: string,
    decision: FeatureDecisionType,
    customPriority?: FeaturePriorityType,
    customResponsible?: string,
    customNotes?: string
  ) => {
    const nowStr = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const updated = featuresList.map((f) => {
      if (f.id === featureId) {
        const p = customPriority || f.priority || "alta";
        const resp = customResponsible !== undefined ? customResponsible : f.responsible;
        const notes = customNotes !== undefined ? customNotes : f.notes;

        const nextVotes = {
          ...f.votes,
          [activePartnerId]: {
            decision,
            priority: p,
            responsible: resp,
            notes: notes,
            timestamp: nowStr,
            partnerName: currentPartner.name,
          },
        };

        const newHistoryItem = {
          partnerId: activePartnerId,
          partnerName: currentPartner.name,
          decision,
          priority: p,
          notes,
          timestamp: nowStr,
        };

        return {
          ...f,
          decision,
          priority: p,
          responsible: resp,
          notes,
          votes: nextVotes,
          history: [newHistoryItem, ...(f.history || [])],
        };
      }
      return f;
    });

    setFeaturesList(updated);
    saveData(screens, tasks, updated, invitedEmails);

    const labels: Record<FeatureDecisionType, string> = {
      aprovar: "Aprovada",
      ajustar: "Marcada para Ajuste",
      discutir: "Marcada para Discussão",
      reprovar: "Reprovada / Remover",
    };

    showToast(`${featureId} ${labels[decision]} por ${currentPartner.name}!`);
  };

  const handleUpdateFeatureField = (
    featureId: string,
    field: "priority" | "responsible" | "notes",
    value: string
  ) => {
    const updated = featuresList.map((f) => {
      if (f.id === featureId) {
        return { ...f, [field]: value };
      }
      return f;
    });
    setFeaturesList(updated);
    saveData(screens, tasks, updated, invitedEmails);
  };

  // Exportar Matriz de Features em JSON
  const handleExportJSON = () => {
    const exportData = {
      projeto: "MedPleni B2B — Validação Funcional",
      exportadoEm: new Date().toISOString(),
      exportadoPor: currentPartner.name,
      totalFeatures: featuresList.length,
      validadas: featuresList.filter((f) => f.decision).length,
      features: featuresList,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medpleni-b2b-validacao-funcional-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Arquivo JSON gerado e baixado com sucesso!");
  };

  // Exportar Matriz de Features em CSV (para Excel / Google Sheets)
  const handleExportCSV = () => {
    const header = [
      "ID",
      "Módulo",
      "Nome",
      "Origem",
      "Estado",
      "Decisão",
      "Prioridade",
      "Responsável",
      "Notas",
      "Votos dos Sócios",
      "Pergunta Médica",
      "Citação Reunião 05/11",
    ];

    const rows = featuresList.map((f) => {
      const votesStr = Object.entries(f.votes || {})
        .map(([k, v]) => `${v.partnerName}: ${v.decision} (${v.timestamp})`)
        .join(" | ");

      return [
        `"${f.id}"`,
        `"${f.mod}"`,
        `"${f.nome.replace(/"/g, '""')}"`,
        `"${f.origem}"`,
        `"${f.estado}"`,
        `"${f.decision || "Pendente"}"`,
        `"${f.priority}"`,
        `"${f.responsible || ""}"`,
        `"${(f.notes || "").replace(/"/g, '""')}"`,
        `"${votesStr.replace(/"/g, '""')}"`,
        `"${(f.pergunta || "").replace(/"/g, '""')}"`,
        `"${(f.reuniao || "").replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [header.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medpleni-b2b-features-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Planilha CSV gerada com sucesso!");
  };

  // ── Ações de Telas ──────────────────────────────────────────────────
  const handleVoteScreen = (
    screenId: string,
    vote: "aprovado" | "reprovado" | "ressalvas"
  ) => {
    const updated = screens.map((s) => {
      if (s.id === screenId) {
        const nextVotes = { ...s.votes, [activePartnerId]: vote };
        const voteVals = Object.values(nextVotes);
        let nextStatus: "pendente" | "aprovado" | "reprovado" | "ressalvas" = "pendente";
        if (voteVals.includes("reprovado")) nextStatus = "reprovado";
        else if (voteVals.includes("ressalvas")) nextStatus = "ressalvas";
        else if (voteVals.length >= 2 && voteVals.every((v) => v === "aprovado"))
          nextStatus = "aprovado";
        else nextStatus = "aprovado";

        return { ...s, votes: nextVotes, status: nextStatus };
      }
      return s;
    });

    setScreens(updated);
    saveData(updated, tasks, featuresList, invitedEmails);
    showToast(`Voto registrado com sucesso como ${currentPartner.name}!`);
  };

  const handleAddComment = (screenId: string) => {
    if (!commentInput.trim()) return;
    const newComment = {
      id: "c-" + Date.now(),
      author: currentPartner.name,
      role: currentPartner.role,
      text: commentInput.trim(),
      date: new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const updated = screens.map((s) => {
      if (s.id === screenId) {
        return { ...s, comments: [...s.comments, newComment] };
      }
      return s;
    });

    setScreens(updated);
    saveData(updated, tasks, featuresList, invitedEmails);
    setCommentInput("");
    showToast("Comentário adicionado com sucesso!");
  };

  // Alternar status de tarefa
  const handleToggleTaskStatus = (taskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const nextStatus =
          t.status === "Pendente"
            ? "Em andamento"
            : t.status === "Em andamento"
            ? "Concluída"
            : "Pendente";
        return { ...t, status: nextStatus as any };
      }
      return t;
    });
    setTasks(updated);
    saveData(screens, updated, featuresList, invitedEmails);
    showToast("Status da tarefa atualizado!");
  };

  // Adicionar e-mail convidado
  const handleAddInvitedEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    const item: InvitedEmail = {
      id: "inv-" + Date.now(),
      email: newEmail.trim().toLowerCase(),
      name: newName.trim() || newEmail.split("@")[0],
      role: newRole,
      priority: newPriority,
      status: "Convite Enviado",
      addedAt: new Date().toLocaleDateString("pt-BR"),
    };

    const updated = [...invitedEmails, item];
    setInvitedEmails(updated);
    saveData(screens, tasks, featuresList, updated);
    setNewEmail("");
    setNewName("");
    showToast(`E-mail ${item.email} autorizado com prioridade ${item.priority}!`);
  };

  // Copiar link de convite WhatsApp
  const handleCopyWhatsAppLink = () => {
    const url = typeof window !== "undefined" ? window.location.href : "https://medpleni.com.br/central-aprovacoes";
    const text = `Olá, Dr. Bruno e Dr. Filipe! A Central de Aprovações B2B da MedPleni está no ar com a validação das 96 funções e as 10 telas do Swiss Executive Dashboard:\n\n${url}\n\nFavor acessar para registrar os seus votos nas 96 funcionalidades e no layout visual!`;
    navigator.clipboard.writeText(text);
    showToast("Texto e link para WhatsApp copiados para a área de transferência!");
  };

  // ── Estatísticas de Features ─────────────────────────────────────────
  const totalFeaturesCount = featuresList.length;
  const validatedFeaturesCount = featuresList.filter((f) => f.decision).length;
  const countAprovadas = featuresList.filter((f) => f.decision === "aprovar").length;
  const countAjustar = featuresList.filter((f) => f.decision === "ajustar").length;
  const countDiscutir = featuresList.filter((f) => f.decision === "discutir").length;
  const countReprovar = featuresList.filter((f) => f.decision === "reprovar").length;
  const countPendentes = totalFeaturesCount - validatedFeaturesCount;

  // Filtragem de Features
  const filteredFeatures = useMemo(() => {
    return featuresList.filter((f) => {
      if (featFilterMod !== "todos" && f.mod !== featFilterMod) return false;
      if (featFilterDecision !== "todos") {
        if (featFilterDecision === "pendente" && f.decision) return false;
        if (featFilterDecision !== "pendente" && f.decision !== featFilterDecision) return false;
      }
      if (featFilterEstado !== "todos" && f.estado !== featFilterEstado) return false;
      if (featFilterOrigem !== "todos" && f.origem !== featFilterOrigem) return false;
      if (featSearchQuery.trim()) {
        const q = featSearchQuery.toLowerCase();
        const str = `${f.id} ${f.nome} ${f.desc} ${f.reuniao || ""} ${f.pergunta || ""}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });
  }, [
    featuresList,
    featFilterMod,
    featFilterDecision,
    featFilterEstado,
    featFilterOrigem,
    featSearchQuery,
  ]);

  // Estatísticas de Telas
  const totalScreens = screens.length;
  const approvedScreens = screens.filter((s) => s.status === "aprovado").length;
  const categories = Array.from(new Set(screens.map((s) => s.category)));
  const filteredScreens = screens.filter((s) => {
    if (screenFilterCat !== "todas" && s.category !== screenFilterCat) return false;
    return true;
  });

  // Filtragem de tarefas
  const filteredTasks = tasks.filter((t) => {
    if (taskFilterResp !== "todos" && t.responsible !== taskFilterResp) return false;
    return true;
  });

  const activeImmersiveScreen =
    activeImmersiveIndex !== null ? screens[activeImmersiveIndex] : null;

  // ── 1. Carregamento de Sessão e Credenciais ───────────────────────────
  if (authLoading) {
    return (
      <div
        data-theme="light"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F8FAFC",
          fontFamily: "var(--font-body), sans-serif",
          color: "#0F172A",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            border: "3px solid #E2E8F0",
            borderTopColor: "#008F7C",
            animation: "b2bSpin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes b2bSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
            MedPleni B2B · Verificando Credenciais
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748B" }}>
            Validando sessão e permissões de acesso aos módulos executivos...
          </p>
        </div>
      </div>
    );
  }

  // ── 2. Não Autenticado -> Redirecionamento Imediato para Login ─────────
  if (!user) {
    if (typeof window !== "undefined") {
      router.push("/login?redirect=/central-aprovacoes");
    }
    return (
      <div
        data-theme="light"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F8FAFC",
          color: "#0F172A",
          fontFamily: "var(--font-body), sans-serif",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "12px",
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#DC2626",
            display: "grid",
            placeItems: "center",
            fontSize: "24px",
            margin: "0 auto 16px",
          }}
        >
          🔒
        </div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px", color: "#0F172A" }}>
          Autenticação Obrigatória
        </h2>
        <p style={{ fontSize: "13.5px", color: "#64748B", margin: "0 0 20px", maxWidth: "420px" }}>
          Esta página é restrita a membros autorizados. Redirecionando para a tela de login...
        </p>
        <Link
          href="/login?redirect=/central-aprovacoes"
          style={{
            background: "#008F7C",
            color: "#FFFFFF",
            padding: "10px 22px",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "13.5px",
            boxShadow: "0 2px 8px rgba(0, 143, 124, 0.25)",
          }}
        >
          Fazer Login no MedPleni
        </Link>
      </div>
    );
  }

  // ── 3. Usuário Conectado mas NÃO Autorizado na Central B2B ────────────
  if (!isUserAuthorized) {
    return (
      <div
        data-theme="light"
        style={{
          minHeight: "100vh",
          background: "#F8FAFC",
          color: "#0F172A",
          fontFamily: "var(--font-body), sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: "520px",
            width: "100%",
            background: "#FFFFFF",
            borderRadius: "16px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
            padding: "36px 32px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#DC2626",
              display: "grid",
              placeItems: "center",
              fontSize: "28px",
              margin: "0 auto 18px",
            }}
          >
            🔒
          </div>

          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#DC2626",
              background: "#FEF2F2",
              padding: "4px 12px",
              borderRadius: "20px",
              border: "1px solid #FECACA",
              display: "inline-block",
              marginBottom: "12px",
            }}
          >
            Acesso Restrito · Diretoria & Sócios
          </span>

          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#0F172A",
              margin: "0 0 10px",
            }}
          >
            Central Executiva de Aprovações B2B
          </h2>

          <p
            style={{
              fontSize: "13.5px",
              color: "#475569",
              lineHeight: 1.5,
              margin: "0 0 20px",
            }}
          >
            Esta central contém minutas societárias, atas e a validação funcional
            de 96 funcionalidades do módulo institucional. O acesso é exclusivo
            para os sócios do projeto e e-mails convidados pela diretoria.
          </p>

          <div
            style={{
              background: "#F1F5F9",
              border: "1px solid #CBD5E1",
              borderRadius: "8px",
              padding: "12px 14px",
              marginBottom: "24px",
              textAlign: "left",
              fontSize: "12.5px",
            }}
          >
            <div style={{ color: "#64748B", fontSize: "11px", marginBottom: "3px" }}>
              Conta atualmente conectada:
            </div>
            <strong style={{ color: "#0F172A", wordBreak: "break-all" }}>
              {user.email}
            </strong>
            <div style={{ color: "#DC2626", fontSize: "11px", marginTop: "4px" }}>
              ✕ Este e-mail não consta na lista de sócios ou convidados autorizados.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              onClick={() => signOut()}
              style={{
                width: "100%",
                background: "#008F7C",
                color: "#FFFFFF",
                border: 0,
                borderRadius: "8px",
                padding: "11px",
                fontSize: "13.5px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Conectar com Outra Conta Autorizada
            </button>

            <Link
              href="/dashboard"
              style={{
                width: "100%",
                display: "inline-block",
                background: "#F8FAFC",
                color: "#475569",
                border: "1px solid #CBD5E1",
                borderRadius: "8px",
                padding: "10px",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              Voltar ao Portal MedPleni
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-theme="light"
      style={{
        minHeight: "100vh",
        background: "#F8FAFC",
        color: "#0F172A",
        fontFamily: "var(--font-body), sans-serif",
        // Variáveis em Tema Claro Executivo Médico (Alto Contraste)
        ["--heading-color" as any]: "#0F172A",
        ["--neblina" as any]: "#1E293B",
        ["--chumbo" as any]: "#475569",
        ["--card-bg" as any]: "#FFFFFF",
        ["--card-border" as any]: "#E2E8F0",
        ["--abismo-surface" as any]: "#F1F5F9",
        ["--border-subtle" as any]: "#CBD5E1",
        ["--input-bg" as any]: "#FFFFFF",
        ["--input-border" as any]: "#CBD5E1",
        ["--pill-bg" as any]: "#F1F5F9",
      }}
    >
      {/* ── Toast de Feedback ────────────────────────────────────────── */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 999999,
            background: "#FFFFFF",
            border: "1px solid #008F7C",
            color: "#0F172A",
            padding: "12px 20px",
            borderRadius: "8px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <span style={{ color: "#008F7C", fontSize: "18px" }}>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Top Header / Branding & Context Bar (Tema Claro Executivo) ── */}
      <header
        style={{
          borderBottom: "1px solid #E2E8F0",
          background: "#FFFFFF",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: "14px 24px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
        }}
      >
        <div
          style={{
            maxWidth: "1440px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          {/* Logo & Título com Tipografia Escura Nítida */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #008F7C, #0284C7)",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                color: "#FFFFFF",
                fontSize: "22px",
                fontFamily: "var(--font-display)",
                boxShadow: "0 2px 8px rgba(0, 143, 124, 0.25)",
                flexShrink: 0,
              }}
            >
              M
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h1
                  style={{
                    fontSize: "19px",
                    fontWeight: 700,
                    color: "#0F172A",
                    fontFamily: "var(--font-display)",
                    margin: 0,
                    letterSpacing: "-0.01em",
                  }}
                >
                  MedPleni B2B · Central Executiva de Aprovações
                </h1>
                <span
                  style={{
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    background: "rgba(0, 143, 124, 0.08)",
                    color: "#008F7C",
                    border: "1px solid rgba(0, 143, 124, 0.25)",
                    fontWeight: 600,
                  }}
                >
                  96 Features & 10 Telas Swiss
                </span>
              </div>
              <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#64748B" }}>
                Governança executiva · Módulo Institucional MedPleni (Faculdades de Medicina & Mantenedoras)
              </p>
            </div>
          </div>

          {/* Seletor de Perfil do Sócio Ativo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "#F8FAFC",
              padding: "8px 14px",
              borderRadius: "10px",
              border: "1px solid #E2E8F0",
            }}
          >
            <div style={{ fontSize: "11px", color: "#64748B", textAlign: "right" }}>
              <div style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "9.5px", color: "#94A3B8" }}>
                Conta Ativa:
              </div>
              <strong style={{ color: currentPartner.color, fontSize: "13px" }}>{currentPartner.name}</strong>
            </div>

            <select
              value={activePartnerId}
              onChange={(e) => {
                setActivePartnerId(e.target.value);
                const p = PARTNERS.find((x) => x.id === e.target.value);
                if (p) showToast(`Identidade alterada para: ${p.name}`);
              }}
              style={{
                background: "#FFFFFF",
                border: "1px solid #CBD5E1",
                color: "#0F172A",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "12.5px",
                fontWeight: 500,
                outline: 0,
                cursor: "pointer",
              }}
            >
              {PARTNERS.map((p) => (
                <option key={p.id} value={p.id} style={{ background: "#FFFFFF", color: "#0F172A" }}>
                  {p.name} ({p.role.split("·")[0].trim()})
                </option>
              ))}
            </select>

            <button
              onClick={handleCopyWhatsAppLink}
              title="Copiar texto formatado com link para o WhatsApp dos sócios"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(22, 163, 74, 0.1)",
                border: "1px solid rgba(22, 163, 74, 0.3)",
                color: "#16A34A",
                fontSize: "12px",
                fontWeight: 700,
                padding: "7px 12px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              <span>📲</span> Copiar Link WhatsApp
            </button>

            {/* Sessão Conectada & Sair */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#FFFFFF",
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                fontSize: "12px",
              }}
            >
              <span style={{ color: "#16A34A", fontSize: "10px" }}>●</span>
              <span style={{ color: "#64748B" }}>Sessão:</span>
              <strong
                style={{
                  color: "#0F172A",
                  maxWidth: "180px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={user.email}
              >
                {user.email}
              </strong>
              <button
                onClick={() => signOut()}
                title="Desconectar desta conta"
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: "#DC2626",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  marginLeft: "4px",
                }}
              >
                Sair
              </button>
            </div>
          </div>
        </div>

        {/* ── Barra de Indicadores Executivos ───────────────────────────── */}
        <div
          style={{
            maxWidth: "1440px",
            margin: "12px auto 0",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "10px",
            paddingTop: "12px",
            borderTop: "1px solid #F1F5F9",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#16A34A" }} />
            <div style={{ fontSize: "12px" }}>
              <span style={{ color: "#64748B", display: "block", fontSize: "10.5px" }}>
                Validação Funcional
              </span>
              <strong style={{ color: "#0F172A" }}>
                {validatedFeaturesCount} de {totalFeaturesCount} analisadas
              </strong>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#6366F1" }} />
            <div style={{ fontSize: "12px" }}>
              <span style={{ color: "#64748B", display: "block", fontSize: "10.5px" }}>
                Telas Swiss Executive
              </span>
              <strong style={{ color: "#0F172A" }}>
                {approvedScreens} de {totalScreens} aprovadas
              </strong>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#D97706" }} />
            <div style={{ fontSize: "12px" }}>
              <span style={{ color: "#64748B", display: "block", fontSize: "10.5px" }}>
                Banco de Questões
              </span>
              <strong style={{ color: "#0F172A" }}>30k+ Devolutivas</strong>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#008F7C" }} />
            <div style={{ fontSize: "12px" }}>
              <span style={{ color: "#64748B", display: "block", fontSize: "10.5px" }}>
                Sociedade Alinhada
              </span>
              <strong style={{ color: "#0F172A" }}>20% Bruno & Filipe</strong>
            </div>
          </div>
        </div>
      </header>

      {/* ── Navegação das Abas Principais (Tema Claro) ─────────────────── */}
      <div
        style={{
          borderBottom: "1px solid #E2E8F0",
          background: "#FFFFFF",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1440px",
            margin: "0 auto",
            display: "flex",
            gap: "4px",
            overflowX: "auto",
          }}
        >
          {[
            {
              id: "features",
              label: "🚀 Validação Funcional (96 Features)",
              badge: `${validatedFeaturesCount}/${totalFeaturesCount}`,
            },
            {
              id: "screens",
              label: "🎨 Aprovação Visual (10 Telas Swiss)",
              badge: `${approvedScreens}/${totalScreens}`,
            },
            { id: "overview", label: "📋 Visão Geral & Ata 05/11", badge: null },
            {
              id: "todo",
              label: "✅ To-Do List & Pendências",
              badge: tasks.filter((t) => t.status !== "Concluída").length,
            },
            { id: "prototype", label: "💻 Protótipo B2B Live", badge: "8 Papéis" },
            { id: "access", label: "🔐 Convites & Acesso", badge: invitedEmails.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: "transparent",
                border: 0,
                borderBottom:
                  activeTab === tab.id
                    ? "2px solid #008F7C"
                    : "2px solid transparent",
                color: activeTab === tab.id ? "#008F7C" : "#64748B",
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: "13.5px",
                padding: "14px 16px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.15s ease",
              }}
            >
              <span>{tab.label}</span>
              {tab.badge !== null && (
                <span
                  style={{
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    background:
                      activeTab === tab.id
                        ? "rgba(0, 143, 124, 0.12)"
                        : "#F1F5F9",
                    color: activeTab === tab.id ? "#008F7C" : "#64748B",
                    fontWeight: 600,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Conteúdo Central ─────────────────────────────────────────── */}
      <main style={{ maxWidth: "1440px", margin: "0 auto", padding: "28px 24px 80px" }}>
        {/* ═══════════════════════════════════════════════════════════════
            ABA 1: VALIDAÇÃO FUNCIONAL (MINI-DASHBOARD & MÓDULOS B2B)
            ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "features" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            {/* ── Mini-Dashboard Executivo (Topo) ─────────────────────────── */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "14px",
                padding: "22px 26px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "18px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        color: "#008F7C",
                        fontWeight: 700,
                      }}
                    >
                      Painel Executivo de Validação B2B
                    </span>
                    <span
                      style={{
                        fontSize: "10.5px",
                        padding: "1px 8px",
                        borderRadius: "12px",
                        background: "rgba(0, 143, 124, 0.08)",
                        color: "#008F7C",
                        border: "1px solid rgba(0, 143, 124, 0.25)",
                        fontWeight: 600,
                      }}
                    >
                      13 Módulos · 96 Features
                    </span>
                  </div>
                  <h2 style={{ fontSize: "22px", fontWeight: 700, margin: "2px 0 6px", color: "#0F172A" }}>
                    Matriz Oficial de Decisões: Aprovar, Ajustar, Reprovar ou Discutir
                  </h2>
                  <p style={{ fontSize: "13px", color: "#475569", margin: 0, maxWidth: "860px", lineHeight: 1.5 }}>
                    Desenvolvido para alinhamento rápido entre os sócios (<strong>Dr. Bruno</strong>, <strong>Dr. Filipe</strong>, <strong>Mario Lopes</strong> e <strong>Renato</strong>).
                    Navegue por módulo para aprovação inteligente sem rolagem infinita, ou use a <strong>Quest de IA</strong> para entender o impacto clínico e pedagógico de cada função.
                  </p>
                </div>

                {/* Ações Rápidas: Alternador de Visualização + Status do Banco de Dados */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  {/* Selo de Sincronização em Tempo Real com o Banco */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: dbSynced ? "rgba(22, 163, 74, 0.08)" : "rgba(217, 119, 6, 0.08)",
                      border: `1px solid ${dbSynced ? "rgba(22, 163, 74, 0.25)" : "rgba(217, 119, 6, 0.25)"}`,
                      color: dbSynced ? "#16A34A" : "#D97706",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                    title="Votos, comentários e decisões são salvos no banco central e sincronizados entre todos os sócios."
                  >
                    <span>{dbSynced ? "🟢" : "🟡"}</span>
                    <span>{dbSynced ? "Sincronizado no Banco de Dados" : "Gravando no Banco..."}</span>
                  </div>

                  {/* Seletor de Modo: Por Módulo vs Acordeão */}
                  <div
                    style={{
                      display: "flex",
                      background: "#F1F5F9",
                      padding: "3px",
                      borderRadius: "8px",
                      border: "1px solid #E2E8F0",
                    }}
                  >
                    <button
                      onClick={() => setFeaturesViewMode("modules")}
                      style={{
                        background: featuresViewMode === "modules" ? "#FFFFFF" : "transparent",
                        color: featuresViewMode === "modules" ? "#0F172A" : "#64748B",
                        border: featuresViewMode === "modules" ? "1px solid #CBD5E1" : "1px solid transparent",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: featuresViewMode === "modules" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>📂</span> Por Módulo
                    </button>
                    <button
                      onClick={() => setFeaturesViewMode("accordion")}
                      style={{
                        background: featuresViewMode === "accordion" ? "#FFFFFF" : "transparent",
                        color: featuresViewMode === "accordion" ? "#0F172A" : "#64748B",
                        border: featuresViewMode === "accordion" ? "1px solid #CBD5E1" : "1px solid transparent",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: featuresViewMode === "accordion" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>📑</span> Acordeão Geral
                    </button>
                  </div>
                </div>
              </div>

              {/* Placar e Barra de Progresso Global */}
              <div
                style={{
                  padding: "16px 20px",
                  background: "#F8FAFC",
                  borderRadius: "10px",
                  border: "1px solid #E2E8F0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "13px", color: "#64748B" }}>
                      Progresso Global da Análise:
                    </span>
                    <strong style={{ fontSize: "14px", color: "#0F172A" }}>
                      {validatedFeaturesCount} de {totalFeaturesCount} funções validadas
                    </strong>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "14px", color: "#008F7C", fontWeight: 700 }}>
                    {Math.round((validatedFeaturesCount / totalFeaturesCount) * 100)}% Concluído
                  </span>
                </div>

                <div style={{ height: "7px", background: "#E2E8F0", borderRadius: "4px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${(validatedFeaturesCount / totalFeaturesCount) * 100}%`,
                      background: "linear-gradient(90deg, #008F7C, #0284C7)",
                      borderRadius: "4px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>

                {/* Filtros de Decisão em Pílulas Clicáveis */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", fontSize: "12px", marginTop: "4px" }}>
                  <span
                    onClick={() => setFeatFilterDecision("aprovar")}
                    style={{
                      cursor: "pointer",
                      background: featFilterDecision === "aprovar" ? "#16A34A" : "rgba(22, 163, 74, 0.08)",
                      color: featFilterDecision === "aprovar" ? "#FFFFFF" : "#16A34A",
                      padding: "4px 12px",
                      borderRadius: "14px",
                      border: "1px solid rgba(22, 163, 74, 0.3)",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    ✓ {countAprovadas} Aprovadas
                  </span>

                  <span
                    onClick={() => setFeatFilterDecision("ajustar")}
                    style={{
                      cursor: "pointer",
                      background: featFilterDecision === "ajustar" ? "#D97706" : "rgba(217, 119, 6, 0.08)",
                      color: featFilterDecision === "ajustar" ? "#FFFFFF" : "#D97706",
                      padding: "4px 12px",
                      borderRadius: "14px",
                      border: "1px solid rgba(217, 119, 6, 0.3)",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    ⚠ {countAjustar} Ajustar
                  </span>

                  <span
                    onClick={() => setFeatFilterDecision("discutir")}
                    style={{
                      cursor: "pointer",
                      background: featFilterDecision === "discutir" ? "#0284C7" : "rgba(2, 132, 199, 0.08)",
                      color: featFilterDecision === "discutir" ? "#FFFFFF" : "#0284C7",
                      padding: "4px 12px",
                      borderRadius: "14px",
                      border: "1px solid rgba(2, 132, 199, 0.3)",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    💬 {countDiscutir} Discutir
                  </span>

                  <span
                    onClick={() => setFeatFilterDecision("reprovar")}
                    style={{
                      cursor: "pointer",
                      background: featFilterDecision === "reprovar" ? "#DC2626" : "rgba(220, 38, 38, 0.08)",
                      color: featFilterDecision === "reprovar" ? "#FFFFFF" : "#DC2626",
                      padding: "4px 12px",
                      borderRadius: "14px",
                      border: "1px solid rgba(220, 38, 38, 0.3)",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    ✕ {countReprovar} Reprovar
                  </span>

                  <span
                    onClick={() => setFeatFilterDecision("pendente")}
                    style={{
                      cursor: "pointer",
                      background: featFilterDecision === "pendente" ? "#0F172A" : "#F1F5F9",
                      color: featFilterDecision === "pendente" ? "#FFFFFF" : "#64748B",
                      padding: "4px 12px",
                      borderRadius: "14px",
                      border: "1px solid #CBD5E1",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    ⏳ {countPendentes} Pendentes
                  </span>

                  {featFilterDecision !== "todos" && (
                    <button
                      onClick={() => setFeatFilterDecision("todos")}
                      style={{
                        background: "transparent",
                        border: 0,
                        color: "#008F7C",
                        cursor: "pointer",
                        textDecoration: "underline",
                        fontSize: "12px",
                        marginLeft: "6px",
                        fontWeight: 600,
                      }}
                    >
                      Limpar filtro de status
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                MODO 1: NAVEGAÇÃO INTELIGENTE POR MÓDULOS (SEM SCROLL INFINITO)
                ═══════════════════════════════════════════════════════════════ */}
            {featuresViewMode === "modules" && (
              <div>
                {/* ── CASO A: NENHUM MÓDULO SELECIONADO (GRADE DOS 13 MÓDULOS) ── */}
                {selectedModule === null ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <h3 style={{ fontSize: "17px", fontWeight: 700, margin: 0, color: "#0F172A" }}>
                          Selecione um Módulo para Validar
                        </h3>
                        <p style={{ fontSize: "12.5px", color: "#64748B", margin: "2px 0 0" }}>
                          Cada módulo reúne de 3 a 16 funções específicas com perguntas clínicas e pareceres de IA.
                        </p>
                      </div>

                      {/* Busca Rápida de Funcionalidades */}
                      <div style={{ minWidth: "280px" }}>
                        <input
                          type="text"
                          placeholder="Buscar função por palavra, código ou termo..."
                          value={featSearchQuery}
                          onChange={(e) => setFeatSearchQuery(e.target.value)}
                          style={{
                            width: "100%",
                            background: "#FFFFFF",
                            border: "1px solid #CBD5E1",
                            color: "#0F172A",
                            borderRadius: "8px",
                            padding: "8px 14px",
                            fontSize: "12.5px",
                            outline: 0,
                          }}
                        />
                      </div>
                    </div>

                    {/* Grade dos 13 Cards de Módulos (Design Suíço Limpo · Sem Faixa Superior) */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                        gap: "16px",
                      }}
                    >
                      {MODULOS.map((m) => {
                        const meta = MODULOS_META[m.id] || {
                          icon: "📦",
                          tag: "MÓDULO B2B",
                          color: "#008F7C",
                          order: 99,
                        };
                        const modFeatures = featuresList.filter((f) => f.mod === m.id);
                        const valCount = modFeatures.filter((f) => f.decision).length;
                        const pct = Math.round((valCount / modFeatures.length) * 100);
                        const aprovadasMod = modFeatures.filter((f) => f.decision === "aprovar").length;
                        const ajustarMod = modFeatures.filter((f) => f.decision === "ajustar").length;
                        const pendentesMod = modFeatures.length - valCount;

                        // Se estiver buscando, verifica se o módulo tem match
                        if (featSearchQuery.trim()) {
                          const q = featSearchQuery.toLowerCase();
                          const matchesMod = modFeatures.some(
                            (f) =>
                              f.id.toLowerCase().includes(q) ||
                              f.nome.toLowerCase().includes(q) ||
                              f.desc.toLowerCase().includes(q) ||
                              (f.reuniao && f.reuniao.toLowerCase().includes(q))
                          );
                          if (!matchesMod && !m.nome.toLowerCase().includes(q)) {
                            return null;
                          }
                        }

                        return (
                          <div
                            key={m.id}
                            onClick={() => setSelectedModule(m.id)}
                            style={{
                              background: "#FFFFFF",
                              border: "1px solid #E2E8F0",
                              borderRadius: "10px",
                              padding: "20px",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              gap: "14px",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
                              position: "relative",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "#94A3B8";
                              e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.06)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "#E2E8F0";
                              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)";
                            }}
                          >
                            <div>
                              {/* Header do Módulo: Ícone + Tag Clean + Código */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <span style={{ fontSize: "22px" }}>{meta.icon}</span>
                                  <span
                                    style={{
                                      fontSize: "10.5px",
                                      fontFamily: "var(--font-mono)",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.05em",
                                      padding: "2px 8px",
                                      borderRadius: "6px",
                                      background: "#F1F5F9",
                                      color: "#334155",
                                      border: "1px solid #E2E8F0",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {meta.tag}
                                  </span>
                                </div>
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontFamily: "var(--font-mono)",
                                    color: "#94A3B8",
                                    fontWeight: 700,
                                  }}
                                >
                                  {m.id.toUpperCase()}
                                </span>
                              </div>

                              <h4 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                                {m.nome}
                              </h4>
                              <p style={{ margin: 0, fontSize: "12.5px", color: "#475569", lineHeight: 1.45, minHeight: "36px" }}>
                                {m.desc}
                              </p>
                            </div>

                            {/* Progresso e Pílulas de Status */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px" }}>
                                <span style={{ color: "#64748B" }}>
                                  {valCount} de {modFeatures.length} validadas
                                </span>
                                <strong style={{ color: pct === 100 ? "#16A34A" : "#0F172A", fontFamily: "var(--font-mono)" }}>
                                  {pct}%
                                </strong>
                              </div>

                              <div style={{ height: "5px", background: "#F1F5F9", borderRadius: "3px", overflow: "hidden" }}>
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${pct}%`,
                                    background: pct === 100 ? "#16A34A" : "#008F7C",
                                    borderRadius: "3px",
                                  }}
                                />
                              </div>

                              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "11px", marginTop: "2px" }}>
                                {aprovadasMod > 0 && (
                                  <span style={{ color: "#16A34A", background: "rgba(22, 163, 74, 0.08)", border: "1px solid rgba(22, 163, 74, 0.2)", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>
                                    ✓ {aprovadasMod}
                                  </span>
                                )}
                                {ajustarMod > 0 && (
                                  <span style={{ color: "#D97706", background: "rgba(217, 119, 6, 0.08)", border: "1px solid rgba(217, 119, 6, 0.2)", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>
                                    ⚠ {ajustarMod}
                                  </span>
                                )}
                                {pendentesMod > 0 && (
                                  <span style={{ color: "#64748B", background: "#F1F5F9", border: "1px solid #E2E8F0", padding: "1px 6px", borderRadius: "4px" }}>
                                    ⏳ {pendentesMod} pendentes
                                  </span>
                                )}
                              </div>

                              {/* Botão de Ação para Abrir */}
                              <button
                                style={{
                                  marginTop: "6px",
                                  width: "100%",
                                  background: "#F8FAFC",
                                  border: "1px solid #CBD5E1",
                                  color: "#0F172A",
                                  padding: "8px 12px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "6px",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                Avaliar Módulo ({modFeatures.length} Features) →
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* ── CASO B: MÓDULO SELECIONADO (VISUALIZAÇÃO FOCADA - SEM SCROLL INFINITO) ── */
                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    {/* Header do Módulo Selecionado + Breadcrumb */}
                    {(() => {
                      const currentMod = MODULOS.find((m) => m.id === selectedModule) || MODULOS[0];
                      const meta = MODULOS_META[currentMod.id] || {
                        icon: "📦",
                        tag: "MÓDULO B2B",
                        color: "#008F7C",
                        order: 1,
                      };
                      const modFeatures = featuresList.filter((f) => f.mod === currentMod.id);
                      const valCount = modFeatures.filter((f) => f.decision).length;
                      const pct = Math.round((valCount / modFeatures.length) * 100);

                      return (
                        <div
                          style={{
                            background: "#FFFFFF",
                            border: "1px solid #E2E8F0",
                            borderRadius: "12px",
                            padding: "18px 24px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "14px",
                            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                            <button
                              onClick={() => setSelectedModule(null)}
                              style={{
                                background: "#F8FAFC",
                                border: "1px solid #CBD5E1",
                                color: "#0F172A",
                                padding: "8px 14px",
                                borderRadius: "8px",
                                fontSize: "12.5px",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              ← Todos os Módulos
                            </button>

                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "22px" }}>{meta.icon}</span>
                                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0F172A" }}>
                                  {currentMod.nome}
                                </h3>
                                <span
                                  style={{
                                    fontSize: "10.5px",
                                    fontFamily: "var(--font-mono)",
                                    padding: "2px 8px",
                                    borderRadius: "10px",
                                    background: "#F1F5F9",
                                    color: "#334155",
                                    fontWeight: 600,
                                    border: "1px solid #E2E8F0",
                                  }}
                                >
                                  {meta.tag}
                                </span>
                              </div>
                              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748B" }}>
                                {currentMod.desc} · <strong>{modFeatures.length} funcionalidades</strong> neste módulo.
                              </p>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                            <div style={{ textAlign: "right", fontSize: "12px" }}>
                              <span style={{ color: "#64748B", display: "block" }}>Concluídas neste módulo</span>
                              <strong style={{ color: "#0F172A", fontSize: "14px" }}>
                                {valCount} de {modFeatures.length} ({pct}%)
                              </strong>
                            </div>
                            <div
                              style={{
                                width: "48px",
                                height: "48px",
                                borderRadius: "50%",
                                border: "3px solid #008F7C",
                                display: "grid",
                                placeItems: "center",
                                fontFamily: "var(--font-mono)",
                                fontSize: "13px",
                                fontWeight: 800,
                                color: "#0F172A",
                                background: "#F8FAFC",
                              }}
                            >
                              {pct}%
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Barra de Troca Rápida de Módulo (Pílulas Horizontais em Tema Claro) */}
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        overflowX: "auto",
                        padding: "6px 2px",
                      }}
                    >
                      <button
                        onClick={() => setSelectedModule(null)}
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid #CBD5E1",
                          color: "#475569",
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        📂 Ver Grade Completa
                      </button>

                      {MODULOS.map((m) => {
                        const meta = MODULOS_META[m.id] || { icon: "📦", color: "#008F7C" };
                        const cnt = featuresList.filter((f) => f.mod === m.id).length;
                        const isSelected = selectedModule === m.id;

                        return (
                          <button
                            key={m.id}
                            onClick={() => setSelectedModule(m.id)}
                            style={{
                              background: isSelected ? "#008F7C" : "#FFFFFF",
                              color: isSelected ? "#FFFFFF" : "#334155",
                              border: isSelected ? "1px solid #008F7C" : "1px solid #E2E8F0",
                              padding: "6px 12px",
                              borderRadius: "20px",
                              fontSize: "12px",
                              fontWeight: isSelected ? 700 : 500,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              boxShadow: isSelected ? "0 2px 6px rgba(0, 143, 124, 0.25)" : "none",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <span>{meta.icon}</span>
                            <span>{m.nome.split("(")[0].trim()}</span>
                            <span
                              style={{
                                fontSize: "10.5px",
                                fontFamily: "var(--font-mono)",
                                opacity: 0.85,
                              }}
                            >
                              ({cnt})
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Filtros Internos do Módulo */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "10px",
                        background: "#FFFFFF",
                        padding: "10px 16px",
                        borderRadius: "8px",
                        border: "1px solid #E2E8F0",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "12px", color: "#64748B" }}>Filtrar status:</span>
                        {[
                          { id: "todos", label: "Todas" },
                          { id: "pendente", label: "⏳ Pendentes" },
                          { id: "aprovar", label: "✓ Aprovadas" },
                          { id: "ajustar", label: "⚠ Ajustar" },
                          { id: "discutir", label: "💬 Discutir" },
                          { id: "reprovar", label: "✕ Reprovar" },
                        ].map((btn) => (
                          <button
                            key={btn.id}
                            onClick={() => setFeatFilterDecision(btn.id)}
                            style={{
                              background: featFilterDecision === btn.id ? "#008F7C" : "#F1F5F9",
                              color: featFilterDecision === btn.id ? "#FFFFFF" : "#475569",
                              border: featFilterDecision === btn.id ? "1px solid #008F7C" : "1px solid #E2E8F0",
                              borderRadius: "6px",
                              padding: "4px 8px",
                              fontSize: "11.5px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>

                      {/* Busca dentro do módulo */}
                      <div style={{ minWidth: "220px" }}>
                        <input
                          type="text"
                          placeholder="Buscar neste módulo..."
                          value={featSearchQuery}
                          onChange={(e) => setFeatSearchQuery(e.target.value)}
                          style={{
                            width: "100%",
                            background: "#F8FAFC",
                            border: "1px solid #CBD5E1",
                            color: "#0F172A",
                            borderRadius: "6px",
                            padding: "5px 10px",
                            fontSize: "12px",
                            outline: 0,
                          }}
                        />
                      </div>
                    </div>

                    {/* Lista das Funcionalidades do Módulo Selecionado (Tema Claro · Sem Scroll Infinito!) */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      {featuresList
                        .filter((f) => f.mod === selectedModule)
                        .filter((f) => {
                          if (featFilterDecision !== "todos") {
                            if (featFilterDecision === "pendente" && f.decision) return false;
                            if (featFilterDecision !== "pendente" && f.decision !== featFilterDecision) return false;
                          }
                          if (featSearchQuery.trim()) {
                            const q = featSearchQuery.toLowerCase();
                            const str = `${f.id} ${f.nome} ${f.desc} ${f.reuniao || ""} ${f.pergunta || ""}`.toLowerCase();
                            if (!str.includes(q)) return false;
                          }
                          return true;
                        })
                        .map((feat) => {
                          const partnerVote = feat.votes?.[activePartnerId];
                          const isAIExpanded = !!expandedAIs[feat.id];
                          const aiData = getFeatureAIExplanation(feat);

                          return (
                            <div
                              key={feat.id}
                              style={{
                                background: "#FFFFFF",
                                border:
                                  feat.decision === "aprovar"
                                    ? "1px solid rgba(22, 163, 74, 0.45)"
                                    : feat.decision === "ajustar"
                                    ? "1px solid rgba(217, 119, 6, 0.45)"
                                    : feat.decision === "discutir"
                                    ? "1px solid rgba(2, 132, 199, 0.45)"
                                    : feat.decision === "reprovar"
                                    ? "1px solid rgba(220, 38, 38, 0.45)"
                                    : "1px solid #E2E8F0",
                                borderRadius: "10px",
                                padding: "20px 22px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "12px",
                                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                              }}
                            >
                              {/* Header do Card */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                                  <span
                                    style={{
                                      fontFamily: "var(--font-mono)",
                                      fontSize: "12px",
                                      fontWeight: 800,
                                      padding: "3px 9px",
                                      borderRadius: "6px",
                                      background: "rgba(0, 143, 124, 0.08)",
                                      color: "#008F7C",
                                      border: "1px solid rgba(0, 143, 124, 0.25)",
                                    }}
                                  >
                                    {feat.id}
                                  </span>

                                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>
                                    {feat.nome}
                                  </h3>

                                  {/* Badges de Origem e Estado */}
                                  <span
                                    style={{
                                      fontSize: "10.5px",
                                      fontFamily: "var(--font-mono)",
                                      padding: "2px 7px",
                                      borderRadius: "4px",
                                      background: "#F1F5F9",
                                      color: "#64748B",
                                      border: "1px solid #E2E8F0",
                                    }}
                                  >
                                    Origem: {feat.origem}
                                  </span>

                                  {feat.estado === "novo" && (
                                    <span
                                      style={{
                                        fontSize: "10px",
                                        fontFamily: "var(--font-mono)",
                                        padding: "2px 7px",
                                        borderRadius: "4px",
                                        background: "rgba(0, 143, 124, 0.12)",
                                        color: "#008F7C",
                                        fontWeight: 800,
                                      }}
                                    >
                                      NOVO (05/11)
                                    </span>
                                  )}
                                </div>

                                {/* Status Atual da Decisão */}
                                <div>
                                  {feat.decision ? (
                                    <span
                                      style={{
                                        fontSize: "11.5px",
                                        fontWeight: 700,
                                        padding: "4px 12px",
                                        borderRadius: "14px",
                                        background:
                                          feat.decision === "aprovar"
                                            ? "rgba(22, 163, 74, 0.1)"
                                            : feat.decision === "ajustar"
                                            ? "rgba(217, 119, 6, 0.1)"
                                            : feat.decision === "discutir"
                                            ? "rgba(2, 132, 199, 0.1)"
                                            : "rgba(220, 38, 38, 0.1)",
                                        color:
                                          feat.decision === "aprovar"
                                            ? "#16A34A"
                                            : feat.decision === "ajustar"
                                            ? "#D97706"
                                            : feat.decision === "discutir"
                                            ? "#0284C7"
                                            : "#DC2626",
                                        border: "1px solid currentColor",
                                        textTransform: "uppercase",
                                        fontFamily: "var(--font-mono)",
                                      }}
                                    >
                                      {feat.decision === "aprovar" && "✓ Aprovada"}
                                      {feat.decision === "ajustar" && "⚠ Ajustar"}
                                      {feat.decision === "discutir" && "💬 Discutir"}
                                      {feat.decision === "reprovar" && "✕ Reprovar"}
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        fontSize: "11px",
                                        padding: "3px 9px",
                                        borderRadius: "10px",
                                        background: "#F1F5F9",
                                        color: "#64748B",
                                        fontWeight: 500,
                                        border: "1px solid #E2E8F0",
                                      }}
                                    >
                                      ⏳ Pendente de Voto
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Descrição Funcional */}
                              <p style={{ margin: 0, fontSize: "13.5px", color: "#334155", lineHeight: 1.55 }}>
                                {feat.desc}
                              </p>

                              {/* Destaque: Citação da Reunião de 05/11 */}
                              {feat.reuniao && (
                                <div
                                  style={{
                                    background: "#F0F9FF",
                                    borderLeft: "3px solid #0284C7",
                                    borderRadius: "4px 8px 8px 4px",
                                    padding: "9px 14px",
                                    fontSize: "12px",
                                    color: "#1E293B",
                                  }}
                                >
                                  <strong style={{ color: "#0284C7", display: "inline-block", marginRight: "6px" }}>
                                    🎙️ Na Reunião:
                                  </strong>
                                  {feat.reuniao}
                                </div>
                              )}

                              {/* Destaque: Pergunta Médica para Decisão */}
                              {feat.pergunta && (
                                <div
                                  style={{
                                    background: "#FFFBEB",
                                    borderLeft: "3px solid #D97706",
                                    borderRadius: "4px 8px 8px 4px",
                                    padding: "9px 14px",
                                    fontSize: "12.5px",
                                    color: "#92400E",
                                  }}
                                >
                                  <strong style={{ color: "#B45309", display: "inline-block", marginRight: "6px" }}>
                                    ❓ Pergunta para Dr. Bruno & Dr. Filipe:
                                  </strong>
                                  {feat.pergunta}
                                </div>
                              )}

                              {/* ── BOTÃO QUEST DE IA / EXPLICAR COM IA ── */}
                              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "2px" }}>
                                <button
                                  onClick={() => toggleAIExplainer(feat.id)}
                                  style={{
                                    background: isAIExpanded ? "#EDE9FE" : "#F5F3FF",
                                    border: "1px solid #DDD6FE",
                                    color: "#6D28D9",
                                    padding: "5px 12px",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  <span>✨</span> {isAIExpanded ? "Ocultar Quest de IA" : "Quest de IA: Explicar Impacto B2B & Clínico"}
                                </button>

                                <span style={{ fontSize: "11px", color: "#64748B" }}>
                                  Sugestão prévia: <strong style={{ color: feat.sugestao === "manter" ? "#16A34A" : feat.sugestao === "ajustar" ? "#D97706" : "#DC2626" }}>{feat.sugestao.toUpperCase()}</strong>
                                </span>
                              </div>

                              {/* Painel Expansível da Quest de IA */}
                              {isAIExpanded && (
                                <div
                                  style={{
                                    background: "#F8FAFC",
                                    border: "1px solid #E2E8F0",
                                    borderRadius: "10px",
                                    padding: "16px 18px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "10px",
                                    animation: "fadeIn 0.2s ease",
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#6D28D9", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                      🤖 Parecer de Inteligência Artificial · Avaliação Estratégica
                                    </span>
                                    <span
                                      style={{
                                        fontSize: "11px",
                                        fontFamily: "var(--font-mono)",
                                        padding: "2px 8px",
                                        borderRadius: "12px",
                                        background:
                                          aiData.recomendacaoIA === "Aprovar no Piloto"
                                            ? "rgba(22, 163, 74, 0.12)"
                                            : aiData.recomendacaoIA === "Ajustar Escopo"
                                            ? "rgba(217, 119, 6, 0.12)"
                                            : "rgba(2, 132, 199, 0.12)",
                                        color:
                                          aiData.recomendacaoIA === "Aprovar no Piloto"
                                            ? "#16A34A"
                                            : aiData.recomendacaoIA === "Ajustar Escopo"
                                            ? "#D97706"
                                            : "#0284C7",
                                        fontWeight: 700,
                                      }}
                                    >
                                      Recomendação: {aiData.recomendacaoIA}
                                    </span>
                                  </div>

                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "10px" }}>
                                    <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", padding: "10px 12px", borderRadius: "6px" }}>
                                      <strong style={{ color: "#008F7C", fontSize: "11.5px", display: "block", marginBottom: "4px" }}>
                                        🎯 Por que a Faculdade de Medicina Paga por Isso (Valor B2B):
                                      </strong>
                                      <p style={{ margin: 0, fontSize: "12px", color: "#334155", lineHeight: 1.45 }}>
                                        {aiData.valorB2B}
                                      </p>
                                    </div>

                                    <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", padding: "10px 12px", borderRadius: "6px" }}>
                                      <strong style={{ color: "#0284C7", fontSize: "11.5px", display: "block", marginBottom: "4px" }}>
                                        🩺 Impacto Clínico & Pedagógico (DCNs / ENAMED):
                                      </strong>
                                      <p style={{ margin: 0, fontSize: "12px", color: "#334155", lineHeight: 1.45 }}>
                                        {aiData.impactoPedagogico}
                                      </p>
                                    </div>
                                  </div>

                                  <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", padding: "10px 12px", borderRadius: "6px" }}>
                                    <strong style={{ color: "#B45309", fontSize: "11.5px", display: "block", marginBottom: "4px" }}>
                                      ⚖️ Parecer e Justificativa de Voto para Dr. Bruno e Dr. Filipe:
                                    </strong>
                                    <p style={{ margin: 0, fontSize: "12px", color: "#334155", lineHeight: 1.45 }}>
                                      {aiData.justificativaRecomendacao}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Barra de Ação: Decisão + Prioridade + Responsável + Notas */}
                              <div
                                style={{
                                  paddingTop: "14px",
                                  borderTop: "1px solid #F1F5F9",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  flexWrap: "wrap",
                                  gap: "12px",
                                }}
                              >
                                {/* 4 Botões de Decisão */}
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                  <span style={{ fontSize: "11.5px", color: "#64748B", marginRight: "4px" }}>
                                    Voto de <strong style={{ color: currentPartner.color }}>{currentPartner.name.split(" ")[0]}</strong>:
                                  </span>

                                  <button
                                    onClick={() => handleVoteFeature(feat.id, "aprovar")}
                                    style={{
                                      background: partnerVote?.decision === "aprovar" ? "#16A34A" : "rgba(22, 163, 74, 0.08)",
                                      color: partnerVote?.decision === "aprovar" ? "#FFFFFF" : "#16A34A",
                                      border: "1px solid rgba(22, 163, 74, 0.35)",
                                      borderRadius: "6px",
                                      padding: "6px 12px",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                    }}
                                  >
                                    ✓ Aprovar
                                  </button>

                                  <button
                                    onClick={() => handleVoteFeature(feat.id, "ajustar")}
                                    style={{
                                      background: partnerVote?.decision === "ajustar" ? "#D97706" : "rgba(217, 119, 6, 0.08)",
                                      color: partnerVote?.decision === "ajustar" ? "#FFFFFF" : "#D97706",
                                      border: "1px solid rgba(217, 119, 6, 0.35)",
                                      borderRadius: "6px",
                                      padding: "6px 12px",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                    }}
                                  >
                                    ⚠ Ajustar
                                  </button>

                                  <button
                                    onClick={() => handleVoteFeature(feat.id, "discutir")}
                                    style={{
                                      background: partnerVote?.decision === "discutir" ? "#0284C7" : "rgba(2, 132, 199, 0.08)",
                                      color: partnerVote?.decision === "discutir" ? "#FFFFFF" : "#0284C7",
                                      border: "1px solid rgba(2, 132, 199, 0.35)",
                                      borderRadius: "6px",
                                      padding: "6px 12px",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                    }}
                                  >
                                    💬 Discutir
                                  </button>

                                  <button
                                    onClick={() => handleVoteFeature(feat.id, "reprovar")}
                                    style={{
                                      background: partnerVote?.decision === "reprovar" ? "#DC2626" : "rgba(220, 38, 38, 0.08)",
                                      color: partnerVote?.decision === "reprovar" ? "#FFFFFF" : "#DC2626",
                                      border: "1px solid rgba(220, 38, 38, 0.35)",
                                      borderRadius: "6px",
                                      padding: "6px 12px",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                    }}
                                  >
                                    ✕ Reprovar
                                  </button>
                                </div>

                                {/* Prioridade & Responsável */}
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                  <select
                                    value={feat.priority || "alta"}
                                    onChange={(e) => handleUpdateFeatureField(feat.id, "priority", e.target.value)}
                                    style={{
                                      background: "#FFFFFF",
                                      border: "1px solid #CBD5E1",
                                      color: "#0F172A",
                                      borderRadius: "6px",
                                      padding: "6px 9px",
                                      fontSize: "12px",
                                      outline: 0,
                                    }}
                                  >
                                    <option value="alta">P1 · Piloto (Alta)</option>
                                    <option value="media">P2 · Pós-piloto (Média)</option>
                                    <option value="baixa">P3 · Futuro (Baixa)</option>
                                  </select>

                                  <select
                                    value={feat.responsible || "Dr. Bruno & Dr. Filipe"}
                                    onChange={(e) => handleUpdateFeatureField(feat.id, "responsible", e.target.value)}
                                    style={{
                                      background: "#FFFFFF",
                                      border: "1px solid #CBD5E1",
                                      color: "#0F172A",
                                      borderRadius: "6px",
                                      padding: "6px 9px",
                                      fontSize: "12px",
                                      outline: 0,
                                    }}
                                  >
                                    <option value="Dr. Bruno & Dr. Filipe">Resp: Dr. Bruno & Dr. Filipe</option>
                                    <option value="Mario Lopes">Resp: Mario Lopes</option>
                                    <option value="Renato & Jurídico">Resp: Renato & Jurídico</option>
                                  </select>
                                </div>
                              </div>

                              {/* Campo de Notas e Registro de Auditoria */}
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <input
                                  type="text"
                                  placeholder="Observações, ressalvas ou escopo acordado..."
                                  value={feat.notes || ""}
                                  onChange={(e) => handleUpdateFeatureField(feat.id, "notes", e.target.value)}
                                  style={{
                                    width: "100%",
                                    background: "#F8FAFC",
                                    border: "1px solid #CBD5E1",
                                    color: "#0F172A",
                                    borderRadius: "6px",
                                    padding: "7px 12px",
                                    fontSize: "12px",
                                    outline: 0,
                                  }}
                                />

                                {/* Log de Auditoria / Quem votou */}
                                {feat.votes && Object.keys(feat.votes).length > 0 && (
                                  <div
                                    style={{
                                      fontSize: "11px",
                                      color: "#64748B",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      flexWrap: "wrap",
                                      marginTop: "2px",
                                    }}
                                  >
                                    <span style={{ textTransform: "uppercase", letterSpacing: "0.06em", color: "#94A3B8" }}>
                                      Votos Registrados:
                                    </span>
                                    {Object.entries(feat.votes).map(([pid, v]) => (
                                      <span
                                        key={pid}
                                        style={{
                                          background: "#F1F5F9",
                                          color: "#334155",
                                          padding: "2px 8px",
                                          borderRadius: "4px",
                                          border: "1px solid #E2E8F0",
                                        }}
                                      >
                                        <strong style={{ color: "#008F7C" }}>{v.partnerName}</strong>: {v.decision.toUpperCase()} ({v.timestamp})
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                MODO 2: VISUALIZAÇÃO EM ACORDEÃO GERAL DOS 13 MÓDULOS
                ═══════════════════════════════════════════════════════════════ */}
            {featuresViewMode === "accordion" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {MODULOS.map((m) => {
                  const meta = MODULOS_META[m.id] || { icon: "📦", tag: "MÓDULO B2B", color: "#008F7C", order: 99 };
                  const modFeatures = featuresList.filter((f) => f.mod === m.id);
                  const isExpanded = !!expandedAccordions[m.id];
                  const valCount = modFeatures.filter((f) => f.decision).length;
                  const pct = Math.round((valCount / modFeatures.length) * 100);

                  return (
                    <div
                      key={m.id}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        borderRadius: "10px",
                        overflow: "hidden",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                      }}
                    >
                      {/* Accordion Header */}
                      <div
                        onClick={() => toggleAccordion(m.id)}
                        style={{
                          padding: "16px 20px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          background: isExpanded ? "#F8FAFC" : "#FFFFFF",
                          borderBottom: isExpanded ? "1px solid #E2E8F0" : "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span style={{ fontSize: "20px" }}>{meta.icon}</span>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
                                {m.nome}
                              </h4>
                              <span
                                style={{
                                  fontSize: "10px",
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                  background: "#F1F5F9",
                                  color: "#475569",
                                  border: "1px solid #E2E8F0",
                                  fontWeight: 600,
                                }}
                              >
                                {modFeatures.length} Features
                              </span>
                            </div>
                            <span style={{ fontSize: "11.5px", color: "#64748B" }}>
                              {m.desc}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                          <span style={{ fontSize: "12px", color: pct === 100 ? "#16A34A" : "#008F7C", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                            {valCount}/{modFeatures.length} ({pct}%)
                          </span>
                          <span style={{ fontSize: "14px", color: "#64748B", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
                            ▼
                          </span>
                        </div>
                      </div>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px", background: "#0A0F1D" }}>
                          {modFeatures.map((feat) => {
                            const partnerVote = feat.votes?.[activePartnerId];
                            const isAIExpanded = !!expandedAIs[feat.id];
                            const aiData = getFeatureAIExplanation(feat);

                            return (
                              <div
                                key={feat.id}
                                style={{
                                  background: "#FFFFFF",
                                  border: "1px solid #E2E8F0",
                                  borderRadius: "8px",
                                  padding: "14px 16px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "10px",
                                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, color: "#008F7C" }}>
                                      {feat.id}
                                    </span>
                                    <strong style={{ color: "#0F172A", fontSize: "14px" }}>{feat.nome}</strong>
                                  </div>
                                  <span style={{ fontSize: "11px", fontWeight: 600, color: feat.decision === "aprovar" ? "#16A34A" : "#64748B" }}>
                                    {feat.decision ? feat.decision.toUpperCase() : "PENDENTE"}
                                  </span>
                                </div>

                                <p style={{ margin: 0, fontSize: "12.5px", color: "#334155" }}>{feat.desc}</p>

                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button
                                    onClick={() => handleVoteFeature(feat.id, "aprovar")}
                                    style={{
                                      background: partnerVote?.decision === "aprovar" ? "#16A34A" : "rgba(22, 163, 74, 0.08)",
                                      color: partnerVote?.decision === "aprovar" ? "#FFFFFF" : "#16A34A",
                                      border: "1px solid rgba(22, 163, 74, 0.3)",
                                      padding: "4px 8px",
                                      borderRadius: "4px",
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    ✓ Aprovar
                                  </button>
                                  <button
                                    onClick={() => handleVoteFeature(feat.id, "ajustar")}
                                    style={{
                                      background: partnerVote?.decision === "ajustar" ? "#D97706" : "rgba(217, 119, 6, 0.08)",
                                      color: partnerVote?.decision === "ajustar" ? "#FFFFFF" : "#D97706",
                                      border: "1px solid rgba(217, 119, 6, 0.3)",
                                      padding: "4px 8px",
                                      borderRadius: "4px",
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    ⚠ Ajustar
                                  </button>
                                  <button
                                    onClick={() => handleVoteFeature(feat.id, "discutir")}
                                    style={{
                                      background: partnerVote?.decision === "discutir" ? "#0284C7" : "rgba(2, 132, 199, 0.08)",
                                      color: partnerVote?.decision === "discutir" ? "#FFFFFF" : "#0284C7",
                                      border: "1px solid rgba(2, 132, 199, 0.3)",
                                      padding: "4px 8px",
                                      borderRadius: "4px",
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    💬 Discutir
                                  </button>
                                  <button
                                    onClick={() => handleVoteFeature(feat.id, "reprovar")}
                                    style={{
                                      background: partnerVote?.decision === "reprovar" ? "#DC2626" : "rgba(220, 38, 38, 0.08)",
                                      color: partnerVote?.decision === "reprovar" ? "#FFFFFF" : "#DC2626",
                                      border: "1px solid rgba(220, 38, 38, 0.3)",
                                      padding: "4px 8px",
                                      borderRadius: "4px",
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    ✕ Reprovar
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ABA 2: APROVAÇÃO VISUAL (10 TELAS SWISS EXECUTIVE)
            ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "screens" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
                background: "linear-gradient(135deg, rgba(0, 194, 168, 0.08), rgba(0, 119, 182, 0.08))",
                border: "1px solid rgba(0, 194, 168, 0.25)",
                borderRadius: "12px",
                padding: "18px 22px",
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "var(--pulso)",
                  }}
                >
                  Coleção Oficial · Swiss Executive Dashboard (10 Telas)
                </span>
                <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "4px 0 6px", color: "var(--heading-color)" }}>
                  Avaliação Visual em Alta Resolução (HTML Vetorial 4K)
                </h2>
                <p style={{ fontSize: "13px", color: "var(--chumbo)", margin: 0, maxWidth: "800px", lineHeight: 1.5 }}>
                  Clique em <strong>“⚡ Abrir em Alta Resolução”</strong> para inspecionar os componentes em vetor puro, com zoom suave e alternador de captura estática.
                </p>
              </div>

              {/* Filtro por Categoria */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <button
                  onClick={() => setScreenFilterCat("todas")}
                  style={{
                    background: screenFilterCat === "todas" ? "var(--pulso)" : "var(--card-bg)",
                    color: screenFilterCat === "todas" ? "#06111A" : "var(--chumbo)",
                    border: "1px solid var(--card-border)",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Todas ({screens.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setScreenFilterCat(cat)}
                    style={{
                      background: screenFilterCat === cat ? "var(--pulso)" : "var(--card-bg)",
                      color: screenFilterCat === cat ? "#06111A" : "var(--chumbo)",
                      border: "1px solid var(--card-border)",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid dos Cards de Telas */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
                gap: "24px",
              }}
            >
              {filteredScreens.map((screen, idx) => {
                const partnerVote = screen.votes[activePartnerId];
                return (
                  <div
                    key={screen.id}
                    style={{
                      background: "var(--card-bg)",
                      border:
                        screen.status === "aprovado"
                          ? "1px solid rgba(34, 197, 94, 0.45)"
                          : screen.status === "ressalvas"
                          ? "1px solid rgba(245, 166, 35, 0.45)"
                          : screen.status === "reprovado"
                          ? "1px solid rgba(255, 107, 107, 0.45)"
                          : "1px solid var(--card-border)",
                      borderRadius: "14px",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 16px",
                        background: "var(--abismo-surface)",
                        borderBottom: "1px solid var(--border-subtle)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, color: "var(--pulso)" }}>
                          #{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--chumbo)", fontWeight: 500 }}>
                          {screen.category}
                        </span>
                      </div>
                      {screen.tag && (
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontFamily: "var(--font-mono)",
                            background: "rgba(0, 119, 182, 0.15)",
                            color: "#64B5E8",
                            border: "1px solid rgba(0, 119, 182, 0.3)",
                            padding: "2px 8px",
                            borderRadius: "12px",
                          }}
                        >
                          {screen.tag}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        position: "relative",
                        height: "250px",
                        background: "#F1F5F9",
                        cursor: "pointer",
                        overflow: "hidden",
                      }}
                      onClick={() => setActiveImmersiveIndex(idx)}
                    >
                      <img
                        src={screen.image}
                        alt={screen.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "top center",
                          transition: "transform 0.2s ease",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(to top, rgba(15, 23, 42, 0.75) 0%, transparent 60%)",
                          display: "flex",
                          alignItems: "flex-end",
                          padding: "16px",
                        }}
                      >
                        <button
                          style={{
                            width: "100%",
                            background: "linear-gradient(135deg, var(--pulso), #0077B6)",
                            color: "#06111A",
                            border: "none",
                            fontWeight: 700,
                            fontSize: "13px",
                            padding: "10px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            backdropFilter: "blur(4px)",
                            boxShadow: "0 4px 15px rgba(0, 194, 168, 0.3)",
                          }}
                        >
                          <span>⚡</span> Abrir em Alta Resolução (HTML Vetorial 4K)
                        </button>
                      </div>
                    </div>

                    <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "6px" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0, color: "var(--heading-color)" }}>
                          {screen.title}
                        </h3>
                        {screen.html && (
                          <a
                            href={screen.html}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: "11px",
                              color: "var(--pulso)",
                              textDecoration: "none",
                              background: "rgba(0, 194, 168, 0.1)",
                              padding: "3px 8px",
                              borderRadius: "6px",
                            }}
                          >
                            ↗ HTML Live
                          </a>
                        )}
                      </div>

                      <p style={{ fontSize: "12.5px", color: "var(--chumbo)", lineHeight: 1.45, margin: "0 0 14px", flex: 1 }}>
                        {screen.desc}
                      </p>

                      <div
                        style={{
                          padding: "10px 12px",
                          background: "var(--abismo-surface)",
                          borderRadius: "8px",
                          marginBottom: "14px",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div style={{ fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--chumbo)", marginBottom: "6px" }}>
                          Votos dos Sócios:
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          {PARTNERS.map((p) => {
                            const v = screen.votes[p.id];
                            return (
                              <div
                                key={p.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  fontSize: "11px",
                                  background: "var(--card-bg)",
                                  padding: "3px 8px",
                                  borderRadius: "12px",
                                  border: "1px solid var(--card-border)",
                                }}
                              >
                                <span style={{ color: p.color, fontWeight: 700 }}>{p.avatar}:</span>
                                {v === "aprovado" && <span style={{ color: "#22C55E" }}>Aprovado</span>}
                                {v === "reprovado" && <span style={{ color: "#FF6B6B" }}>Reprovado</span>}
                                {v === "ressalvas" && <span style={{ color: "#F5A623" }}>Ressalvas</span>}
                                {!v && <span style={{ color: "var(--chumbo)" }}>Pendente</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingTop: "10px",
                          borderTop: "1px solid var(--border-subtle)",
                        }}
                      >
                        <span style={{ fontSize: "11.5px", color: "var(--chumbo)" }}>
                          Seu voto ({currentPartner.avatar}):
                        </span>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => handleVoteScreen(screen.id, "aprovado")}
                            style={{
                              background: partnerVote === "aprovado" ? "#22C55E" : "rgba(34, 197, 94, 0.1)",
                              color: partnerVote === "aprovado" ? "#FFF" : "#22C55E",
                              border: "1px solid rgba(34, 197, 94, 0.4)",
                              borderRadius: "6px",
                              padding: "5px 10px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            ✓ Aprovar
                          </button>
                          <button
                            onClick={() => handleVoteScreen(screen.id, "ressalvas")}
                            style={{
                              background: partnerVote === "ressalvas" ? "#F5A623" : "rgba(245, 166, 35, 0.1)",
                              color: partnerVote === "ressalvas" ? "#06111A" : "#F5A623",
                              border: "1px solid rgba(245, 166, 35, 0.4)",
                              borderRadius: "6px",
                              padding: "5px 10px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            ⚠ Ressalvas
                          </button>
                          <button
                            onClick={() => handleVoteScreen(screen.id, "reprovado")}
                            style={{
                              background: partnerVote === "reprovado" ? "#FF6B6B" : "rgba(255, 107, 107, 0.1)",
                              color: partnerVote === "reprovado" ? "#FFF" : "#FF6B6B",
                              border: "1px solid rgba(255, 107, 107, 0.4)",
                              borderRadius: "6px",
                              padding: "5px 10px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            ✕ Reprovar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            VISUALIZADOR IMERSIVO EM TELA CHEIA (FULL-VIEWPORT 100%)
            ═══════════════════════════════════════════════════════════════ */}
        {activeImmersiveScreen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              background: "#F1F5F9",
              color: "#0F172A",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Top Toolbar Imersivo (Tema Claro Executivo) */}
            <div
              style={{
                background: "#FFFFFF",
                borderBottom: "1px solid #E2E8F0",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                padding: "10px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() =>
                      setActiveImmersiveIndex((prev) =>
                        prev !== null ? (prev - 1 + screens.length) % screens.length : 0
                      )
                    }
                    title="Tela Anterior (Seta Esquerda)"
                    style={{
                      background: "#F8FAFC",
                      border: "1px solid #CBD5E1",
                      color: "#1E293B",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() =>
                      setActiveImmersiveIndex((prev) =>
                        prev !== null ? (prev + 1) % screens.length : 0
                      )
                    }
                    title="Próxima Tela (Seta Direita)"
                    style={{
                      background: "#F8FAFC",
                      border: "1px solid #CBD5E1",
                      color: "#1E293B",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    Próxima →
                  </button>
                </div>

                <div style={{ borderLeft: "1px solid #CBD5E1", paddingLeft: "14px" }}>
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#008F7C", fontWeight: 600 }}>
                    Tela {(activeImmersiveIndex ?? 0) + 1} de {screens.length} · {activeImmersiveScreen.category}
                  </span>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0F172A" }}>
                    {activeImmersiveScreen.title}
                  </h3>
                </div>
              </div>

              {/* Centro: Alternador de Modo e Controles de Zoom Vetorial */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <div
                  style={{
                    display: "flex",
                    background: "#F1F5F9",
                    borderRadius: "8px",
                    padding: "3px",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  {activeImmersiveScreen.html && (
                    <button
                      onClick={() => setImmersiveViewMode("live")}
                      style={{
                        background: immersiveViewMode === "live" ? "#008F7C" : "transparent",
                        color: immersiveViewMode === "live" ? "#FFFFFF" : "#64748B",
                        border: 0,
                        padding: "6px 14px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                      title="Renderiza o código HTML puro em altíssima resolução vetorial (4K / Retina)"
                    >
                      <span>⚡</span> HTML Vetorial 4K
                    </button>
                  )}
                  <button
                    onClick={() => setImmersiveViewMode("width")}
                    style={{
                      background: immersiveViewMode === "width" ? "#008F7C" : "transparent",
                      color: immersiveViewMode === "width" ? "#FFFFFF" : "#64748B",
                      border: 0,
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    🖼️ Captura PNG
                  </button>
                  <button
                    onClick={() => setImmersiveViewMode("fit")}
                    style={{
                      background: immersiveViewMode === "fit" ? "#008F7C" : "transparent",
                      color: immersiveViewMode === "fit" ? "#FFFFFF" : "#64748B",
                      border: 0,
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    📐 Fit
                  </button>
                </div>

                {immersiveViewMode === "live" && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "#F1F5F9",
                      padding: "3px 8px",
                      borderRadius: "8px",
                      border: "1px solid #E2E8F0",
                    }}
                  >
                    <span style={{ fontSize: "11px", color: "#64748B", textTransform: "uppercase", fontWeight: 600 }}>
                      Zoom Vetorial:
                    </span>
                    <button
                      onClick={() => setZoomPercent((prev) => Math.max(70, prev - 15))}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #CBD5E1",
                        color: "#0F172A",
                        width: "24px",
                        height: "24px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      −
                    </button>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#008F7C", minWidth: "42px", textAlign: "center", fontWeight: 700 }}>
                      {zoomPercent}%
                    </span>
                    <button
                      onClick={() => setZoomPercent((prev) => Math.min(220, prev + 15))}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #CBD5E1",
                        color: "#0F172A",
                        width: "24px",
                        height: "24px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      +
                    </button>
                    <button
                      onClick={() => setZoomPercent(100)}
                      style={{
                        background: zoomPercent === 100 ? "#E2E8F0" : "transparent",
                        border: "1px solid #CBD5E1",
                        color: "#475569",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "10.5px",
                        cursor: "pointer",
                        fontWeight: zoomPercent === 100 ? 700 : 500,
                      }}
                    >
                      100%
                    </button>
                    <button
                      onClick={() => setZoomPercent(125)}
                      style={{
                        background: zoomPercent === 125 ? "#CCFBF1" : "transparent",
                        border: "1px solid #CBD5E1",
                        color: zoomPercent === 125 ? "#0F766E" : "#475569",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "10.5px",
                        cursor: "pointer",
                        fontWeight: zoomPercent === 125 ? 700 : 500,
                      }}
                    >
                      125%
                    </button>
                  </div>
                )}
              </div>

              {/* Direita: Ações e Fechar */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {activeImmersiveScreen.html && (
                  <a
                    href={activeImmersiveScreen.html}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: "#F0FDFA",
                      border: "1px solid #99F6E4",
                      color: "#0F766E",
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>↗</span> Abrir HTML em Nova Aba
                  </a>
                )}
                <button
                  onClick={() => setIsCommentsDrawerOpen(!isCommentsDrawerOpen)}
                  style={{
                    background: isCommentsDrawerOpen ? "#008F7C" : "#F8FAFC",
                    color: isCommentsDrawerOpen ? "#FFFFFF" : "#1E293B",
                    border: "1px solid #CBD5E1",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  💬 Comentários ({activeImmersiveScreen.comments.length})
                </button>
                <button
                  onClick={() => setActiveImmersiveIndex(null)}
                  title="Fechar modo tela cheia (Esc)"
                  style={{
                    background: "#FEF2F2",
                    border: "1px solid #FECACA",
                    color: "#DC2626",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ✕ Sair (Esc)
                </button>
              </div>
            </div>

            {/* Canvas Principal com Visualização Vetorial 100% */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "auto",
                background: "#E2E8F0",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                padding: immersiveViewMode === "fit" ? "20px" : "15px 20px 100px",
                position: "relative",
              }}
            >
              {immersiveViewMode === "live" && activeImmersiveScreen.html && (
                <div
                  style={{
                    width: "100%",
                    maxWidth: zoomPercent > 100 ? `${zoomPercent * 16}px` : "1600px",
                    height: "calc(100vh - 120px)",
                    transition: "max-width 0.15s ease",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <iframe
                    src={activeImmersiveScreen.html}
                    title={activeImmersiveScreen.title}
                    style={{
                      width: zoomPercent !== 100 ? `${100 / (zoomPercent / 100)}%` : "100%",
                      height: "100%",
                      border: "1px solid #CBD5E1",
                      borderRadius: "8px",
                      background: "#FFFFFF",
                      boxShadow: "0 10px 40px rgba(0, 0, 0, 0.12)",
                      zoom: zoomPercent !== 100 ? zoomPercent / 100 : undefined,
                    }}
                  />
                </div>
              )}

              {immersiveViewMode === "width" && (
                <div style={{ maxWidth: "1600px", width: "100%", textAlign: "center" }}>
                  <img
                    src={activeImmersiveScreen.image}
                    alt={activeImmersiveScreen.title}
                    style={{
                      width: "100%",
                      height: "auto",
                      borderRadius: "8px",
                      boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
                      display: "block",
                      margin: "0 auto",
                    }}
                  />
                </div>
              )}

              {immersiveViewMode === "fit" && (
                <div style={{ maxHeight: "calc(100vh - 160px)", display: "flex", justifyContent: "center" }}>
                  <img
                    src={activeImmersiveScreen.image}
                    alt={activeImmersiveScreen.title}
                    style={{
                      maxHeight: "calc(100vh - 160px)",
                      maxWidth: "96vw",
                      objectFit: "contain",
                      borderRadius: "8px",
                      boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Floating Dock de Voto Rápido no Rodapé */}
            <div
              style={{
                position: "fixed",
                bottom: "20px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(255, 255, 255, 0.98)",
                backdropFilter: "blur(14px)",
                border: "1px solid #CBD5E1",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.12)",
                borderRadius: "30px",
                padding: "8px 24px",
                display: "flex",
                alignItems: "center",
                gap: "18px",
                zIndex: 100000,
              }}
            >
              <div style={{ fontSize: "12px", color: "#475569", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>Votando como:</span>
                <strong style={{ color: currentPartner.color }}>{currentPartner.name}</strong>
              </div>

              <div style={{ width: "1px", height: "20px", background: "#E2E8F0" }} />

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => handleVoteScreen(activeImmersiveScreen.id, "aprovado")}
                  style={{
                    background:
                      activeImmersiveScreen.votes[activePartnerId] === "aprovado"
                        ? "#16A34A"
                        : "#F0FDF4",
                    color:
                      activeImmersiveScreen.votes[activePartnerId] === "aprovado"
                        ? "#FFFFFF"
                        : "#166534",
                    border: "1px solid #86EFAC",
                    borderRadius: "20px",
                    padding: "7px 16px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ✓ Aprovar Estilo
                </button>

                <button
                  onClick={() => handleVoteScreen(activeImmersiveScreen.id, "ressalvas")}
                  style={{
                    background:
                      activeImmersiveScreen.votes[activePartnerId] === "ressalvas"
                        ? "#D97706"
                        : "#FFFBEB",
                    color:
                      activeImmersiveScreen.votes[activePartnerId] === "ressalvas"
                        ? "#FFFFFF"
                        : "#92400E",
                    border: "1px solid #FDE68A",
                    borderRadius: "20px",
                    padding: "7px 16px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ⚠ Com Ressalvas
                </button>

                <button
                  onClick={() => handleVoteScreen(activeImmersiveScreen.id, "reprovado")}
                  style={{
                    background:
                      activeImmersiveScreen.votes[activePartnerId] === "reprovado"
                        ? "#DC2626"
                        : "#FEF2F2",
                    color:
                      activeImmersiveScreen.votes[activePartnerId] === "reprovado"
                        ? "#FFFFFF"
                        : "#991B1B",
                    border: "1px solid #FECACA",
                    borderRadius: "20px",
                    padding: "7px 16px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ✕ Reprovar
                </button>
              </div>

              <div style={{ width: "1px", height: "20px", background: "#E2E8F0" }} />

              <button
                onClick={() => setIsCommentsDrawerOpen(!isCommentsDrawerOpen)}
                style={{
                  background: "transparent",
                  border: 0,
                  color: isCommentsDrawerOpen ? "#008F7C" : "#64748B",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                💬 Justificativas ({activeImmersiveScreen.comments.length})
              </button>
            </div>

            {/* Gaveta Lateral de Comentários */}
            {isCommentsDrawerOpen && (
              <div
                style={{
                  position: "fixed",
                  top: "60px",
                  right: 0,
                  bottom: 0,
                  width: "380px",
                  background: "#FFFFFF",
                  borderLeft: "1px solid #E2E8F0",
                  boxShadow: "-10px 0 40px rgba(0,0,0,0.12)",
                  zIndex: 100001,
                  display: "flex",
                  flexDirection: "column",
                  padding: "20px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h4 style={{ margin: 0, fontSize: "15px", color: "#0F172A", fontWeight: 700 }}>
                    Notas Médicas & Justificativas
                  </h4>
                  <button
                    onClick={() => setIsCommentsDrawerOpen(false)}
                    style={{ background: "transparent", border: 0, color: "#64748B", cursor: "pointer", fontSize: "18px" }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                  {activeImmersiveScreen.comments.length === 0 ? (
                    <div style={{ fontSize: "12.5px", color: "#64748B", textAlign: "center", padding: "40px 10px" }}>
                      Nenhum comentário nesta tela ainda. Registre abaixo o que achou da estética para as faculdades.
                    </div>
                  ) : (
                    activeImmersiveScreen.comments.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          background: "#F8FAFC",
                          border: "1px solid #E2E8F0",
                          borderRadius: "8px",
                          padding: "10px 12px",
                          fontSize: "12.5px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <strong style={{ color: "#008F7C" }}>{c.author}</strong>
                          <span style={{ fontSize: "10px", color: "#64748B" }}>{c.date}</span>
                        </div>
                        <p style={{ margin: 0, color: "#1E293B", lineHeight: 1.4 }}>{c.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddComment(activeImmersiveScreen.id);
                    }}
                    placeholder="Adicionar nota clínica/estética..."
                    style={{
                      flex: 1,
                      background: "#FFFFFF",
                      border: "1px solid #CBD5E1",
                      color: "#0F172A",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      fontSize: "12.5px",
                      outline: 0,
                    }}
                  />
                  <button
                    onClick={() => handleAddComment(activeImmersiveScreen.id)}
                    style={{
                      background: "#008F7C",
                      color: "#FFFFFF",
                      border: 0,
                      borderRadius: "6px",
                      padding: "8px 14px",
                      fontWeight: 600,
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    Enviar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ABA 3: VISÃO GERAL & ATA COMPLETA DA REUNIÃO DE 05/11
            ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
            {/* Header da Ata */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(0, 194, 168, 0.12), rgba(0, 119, 182, 0.12))",
                border: "1px solid rgba(0, 194, 168, 0.3)",
                borderRadius: "14px",
                padding: "24px 28px",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  color: "var(--pulso)",
                }}
              >
                Documento de Referência · Reunião de 05/11/2026
              </span>
              <h2 style={{ fontSize: "24px", fontWeight: 700, color: "var(--heading-color)", margin: "6px 0 10px" }}>
                O que a Reunião Decidiu — e o que isso Muda no Protótipo
              </h2>
              <p style={{ maxWidth: "900px", fontSize: "14px", color: "var(--neblina)", lineHeight: 1.6, margin: 0 }}>
                Síntese consolidada das deliberações entre <strong>Mario Lopes</strong>,{" "}
                <strong>Dr. Bruno Farnetano</strong>, <strong>Dr. Filipe Andrade</strong> e <strong>Renato</strong>.
                Esta ata conecta as falas gravadas diretamente às 96 funcionalidades em votação.
              </p>
            </div>

            {/* SEÇÃO 1: DECISÕES TOMADAS (EXPLÍCITAS) */}
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "14px",
                padding: "22px 26px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                <span style={{ fontSize: "20px" }}>⚖️</span>
                <h3 style={{ fontSize: "18px", margin: 0, color: "var(--heading-color)" }}>
                  1. Decisões Tomadas (Explícitas na Reunião)
                </h3>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "var(--abismo-surface)", borderBottom: "1px solid var(--sinal)" }}>
                      <th style={{ textAlign: "left", padding: "10px 14px", color: "var(--chumbo)", fontSize: "11px", textTransform: "uppercase" }}>
                        Decisão
                      </th>
                      <th style={{ textAlign: "left", padding: "10px 14px", color: "var(--chumbo)", fontSize: "11px", textTransform: "uppercase", width: "240px" }}>
                        Quem / Minuto
                      </th>
                      <th style={{ textAlign: "left", padding: "10px 14px", color: "var(--chumbo)", fontSize: "11px", textTransform: "uppercase", width: "320px" }}>
                        Impacto no Protótipo / Central
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {DECISOES_EXPLICITAS.map((d, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "14px", color: "var(--heading-color)", fontWeight: 500, lineHeight: 1.5 }}>
                          {d.decisao}
                        </td>
                        <td style={{ padding: "14px", color: "var(--chumbo)", fontSize: "12px", lineHeight: 1.4 }}>
                          {d.quemQuando}
                        </td>
                        <td style={{ padding: "14px", color: "var(--pulso)", fontSize: "12px", lineHeight: 1.4 }}>
                          {d.impacto}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SEÇÃO 2: PONTOS LEVANTADOS QUE EXIGEM DECISÃO DOS MÉDICOS */}
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "14px",
                padding: "22px 26px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                <span style={{ fontSize: "20px" }}>❓</span>
                <h3 style={{ fontSize: "18px", margin: 0, color: "var(--heading-color)" }}>
                  2. Pontos Levantados que Exigem Decisão dos Médicos
                </h3>
              </div>

              <p style={{ fontSize: "13px", color: "var(--chumbo)", margin: "0 0 14px" }}>
                Clique nos códigos das funções para localizá-las e votar diretamente na aba de Validação Funcional:
              </p>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "var(--abismo-surface)", borderBottom: "1px solid var(--sinal)" }}>
                      <th style={{ textAlign: "left", padding: "10px 14px", color: "var(--chumbo)", fontSize: "11px", textTransform: "uppercase" }}>
                        Ponto em Aberto
                      </th>
                      <th style={{ textAlign: "left", padding: "10px 14px", color: "var(--chumbo)", fontSize: "11px", textTransform: "uppercase", width: "120px" }}>
                        Minuto
                      </th>
                      <th style={{ textAlign: "left", padding: "10px 14px", color: "var(--chumbo)", fontSize: "11px", textTransform: "uppercase", width: "220px" }}>
                        Onde Validar
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {PONTOS_EXIGEM_DECISAO.map((p, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "12px 14px", color: "var(--neblina)", lineHeight: 1.45 }}>
                          {p.ponto}
                        </td>
                        <td style={{ padding: "12px 14px", color: "var(--chumbo)", fontFamily: "var(--font-mono)", fontSize: "11.5px" }}>
                          {p.fala}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span
                            onClick={() => {
                              setActiveTab("features");
                              setFeatSearchQuery(p.ondeValidar.split(",")[0].trim().split("…")[0]);
                            }}
                            style={{
                              cursor: "pointer",
                              background: "rgba(245, 166, 35, 0.15)",
                              color: "#F5A623",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontFamily: "var(--font-mono)",
                              fontSize: "11px",
                              fontWeight: 600,
                              border: "1px solid rgba(245, 166, 35, 0.3)",
                            }}
                            title="Clique para filtrar esta função na aba de Validação"
                          >
                            {p.ondeValidar} →
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SEÇÃO 3: OBSERVAÇÕES DE LEITURA & INTERPRETAÇÕES ESTRATÉGICAS */}
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "14px",
                padding: "22px 26px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                <span style={{ fontSize: "20px" }}>💡</span>
                <h3 style={{ fontSize: "18px", margin: 0, color: "var(--heading-color)" }}>
                  3. Observações Estratégicas de Produto (Interpretações da Equipe)
                </h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {OBSERVACOES_LEITURA.map((obs, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "var(--abismo-surface)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                    }}
                  >
                    <span style={{ color: "var(--pulso)", fontWeight: 700, fontSize: "15px" }}>•</span>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--neblina)", lineHeight: 1.55 }}>
                      {obs}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ABA 4: TO-DO LIST & PENDÊNCIAS
            ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "todo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "var(--heading-color)" }}>
                  Matriz de Responsabilidades & Pendências
                </h2>
                <p style={{ fontSize: "13px", color: "var(--chumbo)", margin: "4px 0 0" }}>
                  Acompanhamento das tarefas acordadas no alinhamento executivo.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--chumbo)" }}>Filtrar responsável:</span>
                <select
                  value={taskFilterResp}
                  onChange={(e) => setTaskFilterResp(e.target.value)}
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    color: "var(--neblina)",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    fontSize: "13px",
                  }}
                >
                  <option value="todos">Todos os responsáveis</option>
                  <option value="Dr. Bruno & Dr. Filipe">Dr. Bruno & Dr. Filipe</option>
                  <option value="Mario Lopes">Mario Lopes</option>
                  <option value="Renato & Jurídico">Renato & Jurídico</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--card-border)",
                    borderRadius: "10px",
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", flex: 1 }}>
                    <button
                      onClick={() => handleToggleTaskStatus(task.id)}
                      style={{
                        background:
                          task.status === "Concluída"
                            ? "#22C55E"
                            : task.status === "Em andamento"
                            ? "#F5A623"
                            : "transparent",
                        border:
                          task.status === "Concluída" || task.status === "Em andamento"
                            ? "none"
                            : "2px solid var(--chumbo)",
                        color: "#FFF",
                        width: "24px",
                        height: "24px",
                        borderRadius: "6px",
                        display: "grid",
                        placeItems: "center",
                        fontSize: "12px",
                        cursor: "pointer",
                        marginTop: "2px",
                        flexShrink: 0,
                      }}
                      title="Clique para alternar o status da tarefa"
                    >
                      {task.status === "Concluída" && "✓"}
                      {task.status === "Em andamento" && "●"}
                    </button>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <h4
                          style={{
                            fontSize: "14.5px",
                            fontWeight: 600,
                            margin: 0,
                            color:
                              task.status === "Concluída"
                                ? "var(--chumbo)"
                                : "var(--heading-color)",
                            textDecoration:
                              task.status === "Concluída" ? "line-through" : "none",
                          }}
                        >
                          {task.title}
                        </h4>
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontFamily: "var(--font-mono)",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            background:
                              task.priority === "Crítica"
                                ? "rgba(255, 107, 107, 0.15)"
                                : task.priority === "Alta"
                                ? "rgba(245, 166, 35, 0.15)"
                                : "rgba(100, 181, 232, 0.15)",
                            color:
                              task.priority === "Crítica"
                                ? "#FF6B6B"
                                : task.priority === "Alta"
                                ? "#F5A623"
                                : "#64B5E8",
                          }}
                        >
                          {task.priority}
                        </span>
                      </div>
                      <p style={{ fontSize: "12.5px", color: "var(--chumbo)", margin: "4px 0 0" }}>
                        {task.notes}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color:
                          task.responsible.includes("Bruno")
                            ? "#64B5E8"
                            : task.responsible.includes("Mario")
                            ? "var(--pulso)"
                            : "#C98A0A",
                      }}
                    >
                      {task.responsible}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--chumbo)", marginTop: "2px" }}>
                      Prazo: <strong>{task.deadline}</strong>
                    </div>
                    <span
                      onClick={() => handleToggleTaskStatus(task.id)}
                      style={{
                        display: "inline-block",
                        marginTop: "6px",
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        background:
                          task.status === "Concluída"
                            ? "rgba(34, 197, 94, 0.15)"
                            : task.status === "Em andamento"
                            ? "rgba(245, 166, 35, 0.15)"
                            : "var(--pill-bg)",
                        color:
                          task.status === "Concluída"
                            ? "#22C55E"
                            : task.status === "Em andamento"
                            ? "#F5A623"
                            : "var(--chumbo)",
                      }}
                    >
                      {task.status} ↺
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ABA 5: PROTÓTIPO B2B INTERATIVO (LIVE)
            ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "prototype" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                background: "var(--card-bg)",
                padding: "14px 20px",
                borderRadius: "10px",
                border: "1px solid var(--card-border)",
              }}
            >
              <div>
                <h3 style={{ fontSize: "16px", margin: 0, color: "var(--heading-color)" }}>
                  Protótipo B2B Institucional Navegável
                </h3>
                <p style={{ fontSize: "12.5px", color: "var(--chumbo)", margin: "2px 0 0" }}>
                  Acesse os 8 papéis no menu superior do protótipo: <em>Dirigente, Coordenação, NDE/Avaliação, Docente, Tutor, Aluno, Admin TI e Editor do Banco</em>.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <a
                  href="/b2b-prototype/index.html"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "var(--pulso)",
                    color: "#06111A",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    padding: "8px 14px",
                    borderRadius: "6px",
                    textDecoration: "none",
                  }}
                >
                  ↗ Abrir em Nova Aba (Tela Cheia)
                </a>
              </div>
            </div>

            <div
              style={{
                width: "100%",
                height: "820px",
                borderRadius: "12px",
                overflow: "hidden",
                border: "1px solid var(--card-border)",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
                background: "#0A0E18",
              }}
            >
              <iframe
                src="/b2b-prototype/index.html"
                title="Protótipo B2B MedPleni"
                style={{
                  width: "100%",
                  height: "100%",
                  border: 0,
                }}
              />
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ABA 6: CONVITES & GESTÃO DE ACESSO
            ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "access" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "var(--heading-color)" }}>
                Gestão de E-mails Autorizados & Convites
              </h2>
              <p style={{ fontSize: "13px", color: "var(--chumbo)", margin: "4px 0 0" }}>
                Controle de acesso restrito aos sócios e envolvidos prioritários no módulo B2B.
              </p>
            </div>

            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "12px",
                padding: "20px 24px",
              }}
            >
              <h3 style={{ fontSize: "15px", color: "var(--heading-color)", marginBottom: "14px" }}>
                Autorizar Novo E-mail de Sócio ou Consultor
              </h3>

              <form onSubmit={handleAddInvitedEmail} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 140px 120px", gap: "12px", alignItems: "flex-end" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--chumbo)", display: "block", marginBottom: "4px" }}>
                    E-mail do Convidado:
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="medico@faculdade.edu.br"
                    style={{
                      width: "100%",
                      background: "var(--input-bg)",
                      border: "1px solid var(--input-border)",
                      color: "var(--neblina)",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      fontSize: "13px",
                      outline: 0,
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "var(--chumbo)", display: "block", marginBottom: "4px" }}>
                    Nome Completo:
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Dr. Nome Sobrenome"
                    style={{
                      width: "100%",
                      background: "var(--input-bg)",
                      border: "1px solid var(--input-border)",
                      color: "var(--neblina)",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      fontSize: "13px",
                      outline: 0,
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "var(--chumbo)", display: "block", marginBottom: "4px" }}>
                    Papel / Função:
                  </label>
                  <input
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    placeholder="Sócio Médico / Consultor"
                    style={{
                      width: "100%",
                      background: "var(--input-bg)",
                      border: "1px solid var(--input-border)",
                      color: "var(--neblina)",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      fontSize: "13px",
                      outline: 0,
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "var(--chumbo)", display: "block", marginBottom: "4px" }}>
                    Prioridade:
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    style={{
                      width: "100%",
                      background: "var(--input-bg)",
                      border: "1px solid var(--input-border)",
                      color: "var(--neblina)",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      fontSize: "13px",
                      outline: 0,
                    }}
                  >
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                  </select>
                </div>

                <button
                  type="submit"
                  style={{
                    background: "var(--pulso)",
                    color: "#06111A",
                    border: 0,
                    borderRadius: "6px",
                    padding: "9px 14px",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                    height: "38px",
                  }}
                >
                  + Convidar
                </button>
              </form>
            </div>

            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "var(--abismo-surface)", borderBottom: "1px solid var(--sinal)" }}>
                    <th style={{ textAlign: "left", padding: "12px 18px", color: "var(--chumbo)", fontSize: "11px", textTransform: "uppercase" }}>
                      Sócio / Convidado
                    </th>
                    <th style={{ textAlign: "left", padding: "12px 18px", color: "var(--chumbo)", fontSize: "11px", textTransform: "uppercase" }}>
                      E-mail Autorizado
                    </th>
                    <th style={{ textAlign: "left", padding: "12px 18px", color: "var(--chumbo)", fontSize: "11px", textTransform: "uppercase" }}>
                      Papel
                    </th>
                    <th style={{ textAlign: "left", padding: "12px 18px", color: "var(--chumbo)", fontSize: "11px", textTransform: "uppercase" }}>
                      Prioridade
                    </th>
                    <th style={{ textAlign: "left", padding: "12px 18px", color: "var(--chumbo)", fontSize: "11px", textTransform: "uppercase" }}>
                      Status
                    </th>
                    <th style={{ textAlign: "right", padding: "12px 18px", color: "var(--chumbo)", fontSize: "11px", textTransform: "uppercase" }}>
                      Desde
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invitedEmails.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "14px 18px", fontWeight: 600, color: "var(--heading-color)" }}>
                        {item.name}
                      </td>
                      <td style={{ padding: "14px 18px", fontFamily: "var(--font-mono)", color: "var(--neblina)" }}>
                        {item.email}
                      </td>
                      <td style={{ padding: "14px 18px", color: "var(--chumbo)" }}>
                        {item.role}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontFamily: "var(--font-mono)",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            background:
                              item.priority === "Alta"
                                ? "rgba(245, 166, 35, 0.15)"
                                : "rgba(100, 181, 232, 0.15)",
                            color: item.priority === "Alta" ? "#F5A623" : "#64B5E8",
                          }}
                        >
                          {item.priority}
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            background: "rgba(34, 197, 94, 0.15)",
                            color: "#22C55E",
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px", textAlign: "right", color: "var(--chumbo)", fontSize: "12px" }}>
                        {item.addedAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
