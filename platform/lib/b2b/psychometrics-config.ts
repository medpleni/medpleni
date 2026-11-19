/**
 * MEDPLENI B2B — psychometrics-config.ts
 * Configurações e limites psicométricos conforme ESPEC-B2B.md (Seção 6)
 * Todos os limites e tamanhos mínimos de amostra são centralizados aqui.
 */

export interface PsychometricsConfig {
  /**
   * Tamanho mínimo de amostra para exibir o aviso de amostra pequena.
   * Se n < sampleSizeWarningThreshold, exibe aviso: "amostra pequena: índices sujeitos a oscilação".
   * Padrão ESPEC-B2B: 30
   */
  sampleSizeWarningThreshold: number;

  /**
   * Tamanho mínimo de amostra para permitir o cálculo de D, r e KR-20.
   * Se n < sampleSizeMinThreshold, D, r e KR-20 retornam null.
   * Padrão ESPEC-B2B: 10
   */
  sampleSizeMinThreshold: number;

  /**
   * Proporção dos grupos extremos para o cálculo do Índice de Discriminação (D).
   * Padrão clássico (Kelley, 1939; ESPEC-B2B): 0.27 (27% superior e 27% inferior)
   */
  upperLowerGroupRatio: number;

  /**
   * Limite de facilidade (p) para sinalizar item "muito fácil".
   * Padrão ESPEC-B2B: p > 0.90
   */
  flagVeryEasyThreshold: number;

  /**
   * Limite de facilidade (p) para sinalizar item "muito difícil".
   * Padrão ESPEC-B2B: p < 0.20
   */
  flagVeryHardThreshold: number;

  /**
   * Limite de correlação ponto-bisserial corrigida (r) para discriminação baixa.
   * Padrão ESPEC-B2B: r < 0.20 (quando r >= 0)
   */
  flagLowDiscriminationThreshold: number;

  /**
   * Limite de correlação ponto-bisserial corrigida (r) para discriminação negativa.
   * Padrão ESPEC-B2B: r < 0.00
   */
  flagNegativeDiscriminationThreshold: number;
}

export const DEFAULT_PSYCHOMETRICS_CONFIG: PsychometricsConfig = {
  sampleSizeWarningThreshold: 30,
  sampleSizeMinThreshold: 10,
  upperLowerGroupRatio: 0.27,
  flagVeryEasyThreshold: 0.90,
  flagVeryHardThreshold: 0.20,
  flagLowDiscriminationThreshold: 0.20,
  flagNegativeDiscriminationThreshold: 0.00,
};

export type PsychometricItemFlagType =
  | "muito_facil"
  | "muito_dificil"
  | "discriminacao_baixa"
  | "discriminacao_negativa"
  | "distrator_dominante";

export interface ItemFlagMeta {
  type: PsychometricItemFlagType;
  label: string;
  shortLabel: string;
  description: string;
  severity: "info" | "warning" | "danger" | "purple";
  badgeClass: string;
}

export const ITEM_FLAGS_META: Record<PsychometricItemFlagType, ItemFlagMeta> = {
  muito_facil: {
    type: "muito_facil",
    label: "Muito fácil (p > 0,90)",
    shortLabel: "Muito fácil",
    description: "Índice de facilidade superior a 90%. Quase todos os alunos acertaram; o item pouco contribui para diferenciar níveis de proficiência.",
    severity: "info",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
  },
  muito_dificil: {
    type: "muito_dificil",
    label: "Muito difícil (p < 0,20)",
    shortLabel: "Muito difícil",
    description: "Índice de facilidade inferior a 20%. Menos de 1 em cada 5 alunos acertou; verificar clareza do enunciado ou pertinência pedagógica.",
    severity: "warning",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  },
  discriminacao_baixa: {
    type: "discriminacao_baixa",
    label: "Discriminação baixa (0 ≤ r < 0,20)",
    shortLabel: "Discriminação baixa",
    description: "Correlação ponto-bisserial corrigida menor que 0,20. O item não diferencia adequadamente alunos de alto e baixo desempenho geral.",
    severity: "warning",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
  },
  discriminacao_negativa: {
    type: "discriminacao_negativa",
    label: "Discriminação negativa (r < 0)",
    shortLabel: "Discriminação negativa",
    description: "Correlação ponto-bisserial corrigida negativa. Alunos de menor desempenho acertaram mais que os de alto desempenho; possível erro de gabarito ou ambiguidade severa.",
    severity: "danger",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  },
  distrator_dominante: {
    type: "distrator_dominante",
    label: "Distrator dominante",
    shortLabel: "Distrator dominante",
    description: "Uma alternativa incorreta foi mais assinalada que a alternativa correta. Indica concepção errônea generalizada ou distrator excessivamente atrativo/confuso.",
    severity: "purple",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  },
};
