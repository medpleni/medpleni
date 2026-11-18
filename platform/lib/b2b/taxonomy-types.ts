/**
 * MEDPLENI B2B — taxonomy-types.ts
 * Interfaces e tipos da taxonomia de 4 eixos (Área, Cenário, Tema, Competência).
 */

export interface TaxArea {
  id: string;
  code: string;
  name: string;
  color_hex?: string | null;
  order_index: number;
  enamed_stage: "etapa_1_ciclo_basico" | "etapa_2_3" | "todas";
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface TaxCenario {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface TaxTema {
  id: string;
  area_id: string;
  parent_id?: string | null;
  code: string;
  name: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  areaName?: string;
  parentName?: string;
}

export interface TaxCompetencia {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface TaxonomyBundle {
  areas: TaxArea[];
  cenarios: TaxCenario[];
  temas: TaxTema[];
  competencias: TaxCompetencia[];
}

export interface TaxonomyMigrationReport {
  totalQuestions: number;
  classifiedQuestions: number;
  unmappedQuestions: number;
  coveragePercent: number;
  orphanAreas: { legacy_area: string; count: number }[];
}

export interface ParsedTaxRow {
  code: string;
  name: string;
  description?: string;
  color_hex?: string;
  order_index?: number;
  enamed_stage?: string;
  area_code?: string;
  parent_code?: string;
}
