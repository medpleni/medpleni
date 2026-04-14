/**
 * MedPleni — Types
 * Interfaces TypeScript para todos os dados do sistema
 */

// ══════════════════════════════════════════════════════════
// ENUMS & UNIONS
// ══════════════════════════════════════════════════════════

export type SubBrand = "RESID" | "ENAMED" | "REVALIDA" | "ESPECIALISTA";

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
  | "ENAMED";

export type Area =
  | "Clínica Médica"
  | "Cirurgia Geral"
  | "Saúde Coletiva"
  | "Pediatria"
  | "Ginecologia e Obstetrícia"
  | "Psiquiatria"
  | "Urgência e Emergência"
  | "Cardiologia"
  | "Neurologia"
  | "Pneumologia"
  | "Infectologia"
  | "Endocrinologia"
  | "Reumatologia"
  | "Gastroenterologia";

export type Plano = "diagnostico" | "residente" | "aprovacao";

export type PerformanceStatus = "excelente" | "bom" | "atencao" | "critico";

export type Dificuldade = "facil" | "media" | "alta" | "muito-alta";

export type QuestaoStatus = "pendente" | "respondida" | "pulada" | "atual";

export type NivelConfianca = 1 | 2 | 3 | 4 | 5;

export type SimuladoStatus = "nao_iniciado" | "em_andamento" | "concluido";

export type HeatmapIntensidade = 0 | 1 | 2 | 3 | 4 | 5;

// ══════════════════════════════════════════════════════════
// ENTITIES
// ══════════════════════════════════════════════════════════

/** Usuário logado */
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  crm?: string;
  plano: Plano;
  provaAlvo: ProvAlvo[];
  subBrand: SubBrand;
  avatarUrl?: string;
  iniciais: string;
  streakDias: number;
  dataProva?: string;
}

/** KPIs do Dashboard */
export interface DashboardKPIs {
  predicaoAprovacao: number;
  simuladosRealizados: number;
  taxaAcerto: number;
  streakDias: number;
  rankingNacional: number;
}

/** Desempenho por área */
export interface DesempenhoArea {
  area: Area;
  percentualAcerto: number;
  status: PerformanceStatus;
  totalQuestoes: number;
}

/** Alternativa de questão */
export interface Alternativa {
  letra: "A" | "B" | "C" | "D" | "E";
  texto: string;
}

/** Questão completa */
export interface Questao {
  id: string;
  numero?: number;
  enunciado: string;
  contextoClinico?: string;
  alternativas: Alternativa[];
  gabarito: "A" | "B" | "C" | "D" | "E";
  area: Area;
  subarea: string;
  dificuldade: Dificuldade;
  instituicao: ProvAlvo;
  ano: number;
  explicacao: string;
  tags?: string[];
}

/** Simulado */
export interface Simulado {
  id: string;
  titulo: string;
  instituicao: ProvAlvo;
  area: Area;
  totalQuestoes: number;
  duracaoMinutos: number;
  status: SimuladoStatus;
  percentualAcerto?: number;
  dataRealizacao?: string;
  descricao?: string;
}

/** Flashcard */
export interface Flashcard {
  id: string;
  frente: string;
  verso: string;
  area: Area;
  subarea: string;
  proximaRevisao: string;
  intervaloDias: number;
  facilidade: number;
}

/** Recomendação da IA */
export interface Recomendacao {
  rank: number;
  titulo: string;
  descricao: string;
  area: Area;
  status: PerformanceStatus;
  totalQuestoes: number;
  impactoEstimado: number;
  dificuldade: Dificuldade;
}

/** Célula do heatmap */
export interface HeatmapCell {
  area: Area;
  dia: string; // "SEG" | "TER" etc.
  intensidade: HeatmapIntensidade;
}

/** Linha do heatmap (área + 7 dias) */
export interface HeatmapRow {
  area: string;
  dias: HeatmapIntensidade[];
}

/** Ponto de evolução de score */
export interface ScorePoint {
  simulado: string;
  score: number;
}

/** Bloco de cronograma */
export interface BlocoEstudo {
  horario: string;
  area: Area;
  tipo: "simulado" | "questoes" | "revisao" | "flashcards" | "descanso";
  duracao: string;
  descricao: string;
}

/** Dia do cronograma */
export interface DiaEstudo {
  dia: string;
  diaSemana: string;
  blocos: BlocoEstudo[];
}
