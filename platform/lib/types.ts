/**
 * MedPleni — Types
 * Tipagens globais do sistema
 */

// ── Sub-brands ──────────────────────────────────────────────────────
export type SubBrand = "RESID" | "ENAMED" | "REVALIDA" | "ESPECIALISTA";

// ── Provas-alvo ─────────────────────────────────────────────────────
export type ProvAlvo =
  | "USP"
  | "UNIFESP"
  | "UNICAMP"
  | "UERJ"
  | "FMABC"
  | "FAMERP"
  | "UNESP"
  | "HC-UFMG"
  | "ENARE"
  | "REVALIDA"
  | "ENADE";

// ── Especialidades / Áreas ──────────────────────────────────────────
export type Area =
  | "Clínica Médica"
  | "Saúde Coletiva"
  | "Cirurgia Geral"
  | "Pediatria"
  | "Ginecologia e Obstetrícia"
  | "Psiquiatria"
  | "Urgência e Emergência"
  | "Cardiologia"
  | "Neurologia"
  | "Pneumologia";

// ── Planos ──────────────────────────────────────────────────────────
export type Plano = "diagnostico" | "residente" | "aprovacao";

// ── Status de performance ────────────────────────────────────────────
export type PerformanceStatus = "excelente" | "bom" | "atencao" | "critico";

// ── Dificuldade ─────────────────────────────────────────────────────
export type Dificuldade = "facil" | "media" | "alta" | "muito-alta";

// ── Status da questão no simulado ────────────────────────────────────
export type QuestaoStatus = "pendente" | "respondida" | "pulada" | "atual";

// ── Confiança do candidato ───────────────────────────────────────────
export type NivelConfianca = 1 | 2 | 3;

// ── Usuário ──────────────────────────────────────────────────────────
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  crm?: string;
  plano: Plano;
  provaAlvo: ProvAlvo;
  subBrand: SubBrand;
  avatarUrl?: string;
  streakDias: number;
  dataProva?: string;
}

// ── KPIs do Dashboard ────────────────────────────────────────────────
export interface DashboardKPIs {
  predicaoAprovacao: number; // 0-100
  simuladosRealizados: number;
  taxaAcerto: number; // 0-100
  streakDias: number;
  rankingNacional?: number;
}

// ── Desempenho por área ──────────────────────────────────────────────
export interface DesempenhoArea {
  area: Area;
  percentualAcerto: number; // 0-100
  status: PerformanceStatus;
  totalQuestoes: number;
}

// ── Questão ──────────────────────────────────────────────────────────
export interface Questao {
  id: string;
  enunciado: string;
  contextoClinico?: string;
  alternativas: Alternativa[];
  gabarito: "A" | "B" | "C" | "D" | "E";
  area: Area;
  subarea: string;
  dificuldade: Dificuldade;
  instituicao: ProvAlvo;
  ano: number;
  explicacao?: string;
}

export interface Alternativa {
  letra: "A" | "B" | "C" | "D" | "E";
  texto: string;
}

// ── Simulado ─────────────────────────────────────────────────────────
export interface Simulado {
  id: string;
  titulo: string;
  instituicao: ProvAlvo;
  area: Area;
  totalQuestoes: number;
  duracaoMinutos: number;
  status: "nao_iniciado" | "em_andamento" | "concluido";
  percentualAcerto?: number;
  dataRealizacao?: string;
}

// ── Flashcard ────────────────────────────────────────────────────────
export interface Flashcard {
  id: string;
  frente: string;
  verso: string;
  area: Area;
  proximaRevisao: string;
  intervaloDias: number;
  facilidade: number;
}

// ── Recomendação IA ──────────────────────────────────────────────────
export interface Recomendacao {
  rank: number;
  titulo: string;
  descricao: string;
  area: Area;
  status: PerformanceStatus;
  totalQuestoes: number;
  impactoEstimado: number; // pp de ganho na predição
}

// ── Heatmap ─────────────────────────────────────────────────────────
export type HeatmapIntensidade = 0 | 1 | 2 | 3 | 4 | 5;

export interface HeatmapCell {
  dia: string;
  area: Area;
  intensidade: HeatmapIntensidade;
}
