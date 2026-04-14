/**
 * MedPleni — Mock Data
 * Dados de demonstração para o MVP
 */

import type {
  Usuario,
  DashboardKPIs,
  DesempenhoArea,
  Simulado,
  Recomendacao,
  Questao,
  Flashcard,
} from "./types";

// ── Usuário mock ──────────────────────────────────────────────────────
export const mockUsuario: Usuario = {
  id: "usr_001",
  nome: "Dra. Ana Beatriz",
  email: "ana.beatriz@medpleni.com",
  crm: "SP-123456",
  plano: "aprovacao",
  provaAlvo: "USP",
  subBrand: "RESID",
  streakDias: 14,
  dataProva: "2026-03-23",
};

// ── KPIs mock ─────────────────────────────────────────────────────────
export const mockKPIs: DashboardKPIs = {
  predicaoAprovacao: 94.7,
  simuladosRealizados: 63,
  taxaAcerto: 81.4,
  streakDias: 14,
  rankingNacional: 147,
};

// ── Desempenho por área mock ──────────────────────────────────────────
export const mockDesempenhoAreas: DesempenhoArea[] = [
  {
    area: "Psiquiatria",
    percentualAcerto: 87,
    status: "excelente",
    totalQuestoes: 234,
  },
  {
    area: "Clínica Médica",
    percentualAcerto: 83,
    status: "excelente",
    totalQuestoes: 1240,
  },
  {
    area: "Cirurgia Geral",
    percentualAcerto: 79,
    status: "bom",
    totalQuestoes: 680,
  },
  {
    area: "Pediatria",
    percentualAcerto: 71,
    status: "atencao",
    totalQuestoes: 420,
  },
  {
    area: "Ginecologia e Obstetrícia",
    percentualAcerto: 58,
    status: "critico",
    totalQuestoes: 380,
  },
];

// ── Simulados mock ────────────────────────────────────────────────────
export const mockSimulados: Simulado[] = [
  {
    id: "sim_001",
    titulo: "Clínica Médica — Bloco 4",
    instituicao: "USP",
    area: "Clínica Médica",
    totalQuestoes: 60,
    duracaoMinutos: 90,
    status: "concluido",
    percentualAcerto: 87,
    dataRealizacao: "2026-04-13",
  },
  {
    id: "sim_002",
    titulo: "Cardiologia — Foco em Lacunas",
    instituicao: "UNIFESP",
    area: "Cardiologia",
    totalQuestoes: 40,
    duracaoMinutos: 60,
    status: "em_andamento",
    dataRealizacao: "2026-04-14",
  },
  {
    id: "sim_003",
    titulo: "Ginecologia e Obstetrícia — G.O. Completo",
    instituicao: "USP",
    area: "Ginecologia e Obstetrícia",
    totalQuestoes: 80,
    duracaoMinutos: 120,
    status: "nao_iniciado",
  },
  {
    id: "sim_004",
    titulo: "Pediatria — Urgências",
    instituicao: "UERJ",
    area: "Pediatria",
    totalQuestoes: 50,
    duracaoMinutos: 75,
    status: "nao_iniciado",
  },
];

// ── Recomendações IA mock ─────────────────────────────────────────────
export const mockRecomendacoes: Recomendacao[] = [
  {
    rank: 1,
    titulo: "Pré-eclâmpsia — GO",
    descricao:
      "Lacuna crítica detectada. 68% de erro nos últimos 3 simulados. HSP cobra este tema em 2 questões/prova.",
    area: "Ginecologia e Obstetrícia",
    status: "critico",
    totalQuestoes: 12,
    impactoEstimado: 2.3,
  },
  {
    rank: 2,
    titulo: "Bronquiolite viral — Pediatria",
    descricao:
      "Você acerta diagnóstico mas erra conduta. Revise critérios de internação.",
    area: "Pediatria",
    status: "atencao",
    totalQuestoes: 8,
    impactoEstimado: 1.4,
  },
  {
    rank: 3,
    titulo: "Síndrome do intestino curto — Cirurgia",
    descricao:
      "Tema novo no currículo HSP 2025. Ainda não foi cobrado nos seus simulados.",
    area: "Cirurgia Geral",
    status: "bom",
    totalQuestoes: 6,
    impactoEstimado: 0.8,
  },
];

// ── Questão mock (simulado) ───────────────────────────────────────────
export const mockQuestao: Questao = {
  id: "q_001",
  enunciado:
    "Paciente feminina, 28 anos, primigesta, 36 semanas de gestação, apresenta-se ao pronto-socorro com cefaleia intensa, visão turva e edema de membros inferiores há 2 dias. PA: 158/102 mmHg. Proteinúria de 24h: 2,8g. Qual é a conduta mais adequada?",
  contextoClinico:
    "Gestante de alto risco. Sem antecedentes de hipertensão prévia. Movimentos fetais preservados. CTG categoria I.",
  alternativas: [
    {
      letra: "A",
      texto: "Internação hospitalar, sulfato de magnésio e avaliação para resolução da gestação",
    },
    {
      letra: "B",
      texto: "Tratamento ambulatorial com anti-hipertensivo oral e retorno em 48h",
    },
    {
      letra: "C",
      texto: "Internação e monitorização aguardando 38 semanas para resolução",
    },
    {
      letra: "D",
      texto: "Sulfato de magnésio e resolução imediata independente da vitalidade fetal",
    },
    {
      letra: "E",
      texto: "Alta com orientações e consulta pré-natal em 7 dias",
    },
  ],
  gabarito: "A",
  area: "Ginecologia e Obstetrícia",
  subarea: "Pré-eclâmpsia grave",
  dificuldade: "alta",
  instituicao: "USP",
  ano: 2024,
  explicacao:
    "Pré-eclâmpsia grave (PA ≥150/100 + proteinúria ≥2g/24h com sintomas). Indicação de sulfato de magnésio para profilaxia de eclâmpsia e avaliação para resolução após estabilização.",
};

// ── Flashcard mock ────────────────────────────────────────────────────
export const mockFlashcards: Flashcard[] = [
  {
    id: "fc_001",
    frente: "Critérios diagnósticos de Pré-eclâmpsia GRAVE",
    verso:
      "PA ≥ 160/110 mmHg em 2 aferições com 4h de intervalo OU PA ≥ 150/100 com sintomas graves (cefaleia, escotomas, epigastralgia) + proteinúria ≥ 300mg/24h ou relação P/Cr ≥ 0,3",
    area: "Ginecologia e Obstetrícia",
    proximaRevisao: "2026-04-15",
    intervaloDias: 1,
    facilidade: 2.1,
  },
  {
    id: "fc_002",
    frente: "Sulfato de Magnésio — Esquema de Zuspan",
    verso:
      "Ataque: 4-6g IV em 15-20 min. Manutenção: 1-2g/h IV contínuo. Nível terapêutico: 4-7 mEq/L. Antídoto: Gluconato de Cálcio 10% 10mL IV.",
    area: "Ginecologia e Obstetrícia",
    proximaRevisao: "2026-04-16",
    intervaloDias: 2,
    facilidade: 2.5,
  },
];

// ── Evolução do score (para gráfico) ─────────────────────────────────
export const mockEvolucaoScore = [
  { simulado: "S01", score: 72 },
  { simulado: "S08", score: 75 },
  { simulado: "S15", score: 74 },
  { simulado: "S23", score: 78 },
  { simulado: "S31", score: 80 },
  { simulado: "S40", score: 82 },
  { simulado: "S51", score: 88 },
  { simulado: "S63", score: 94.7 },
];
