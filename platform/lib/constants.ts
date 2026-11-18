/**
 * MedPleni — Constantes Globais do Sistema
 * Fonte única de verdade para áreas e taxonomias compartilhadas.
 */

/**
 * As 7 grandes áreas padrão INEP (Portaria 478/2025).
 * Mantida a nomenclatura "Cirurgia Geral" para compatibilidade com o banco e acervo existente.
 */
export const AREAS_INEP = [
  "Clínica Médica",
  "Cirurgia Geral",
  "Ginecologia e Obstetrícia",
  "Pediatria",
  "Medicina de Família e Comunidade",
  "Saúde Coletiva",
  "Saúde Mental",
] as const;

export type AreaInep = (typeof AREAS_INEP)[number];

export const AREA_ABBR: Record<AreaInep, string> = {
  "Clínica Médica": "CM",
  "Cirurgia Geral": "CG",
  "Ginecologia e Obstetrícia": "GO",
  "Pediatria": "Ped",
  "Medicina de Família e Comunidade": "MFC",
  "Saúde Coletiva": "SC",
  "Saúde Mental": "SM",
};

/**
 * Cores temáticas padronizadas por grande área (usadas em heatmaps, badges e gráficos)
 */
export const AREA_COLORS: Record<AreaInep, string> = {
  "Clínica Médica": "var(--pulso, #00C2A8)",
  "Cirurgia Geral": "#0077B6",
  "Ginecologia e Obstetrícia": "#FF6B6B",
  "Pediatria": "#F5A623",
  "Medicina de Família e Comunidade": "#00B4D8",
  "Saúde Coletiva": "#6B5CE7",
  "Saúde Mental": "#A99EF5",
};
