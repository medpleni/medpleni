import { type ClassValue, clsx } from "clsx";

/**
 * MedPleni — Utilities
 */

// ── cn: merge Tailwind classes ───────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// ── Formatar percentual ─────────────────────────────────────────────
export function formatarPercentual(valor: number, casas = 1): string {
  return `${valor.toFixed(casas)}%`;
}

// ── Formatar número grande ───────────────────────────────────────────
export function formatarNumero(valor: number): string {
  if (valor >= 1000) {
    return `${(valor / 1000).toFixed(1)}k`;
  }
  return valor.toString();
}

// ── Status de performance → cor CSS var ─────────────────────────────
export function statusParaCor(status: string): string {
  const mapa: Record<string, string> = {
    excelente: "var(--pulso)",
    bom: "var(--resid-light)",
    atencao: "var(--warn)",
    critico: "var(--danger)",
  };
  return mapa[status] ?? "var(--chumbo)";
}

// ── Percentual → status ──────────────────────────────────────────────
export function percentualParaStatus(pct: number): string {
  if (pct >= 80) return "excelente";
  if (pct >= 65) return "bom";
  if (pct >= 50) return "atencao";
  return "critico";
}

// ── Intensidade heatmap → classe CSS ────────────────────────────────
export function intensidadeParaClasse(nivel: number): string {
  const classes = ["hm-0", "hm-1", "hm-2", "hm-3", "hm-4", "hm-5"];
  return classes[Math.min(nivel, 5)] ?? "hm-0";
}

// ── Formatar data relativa ───────────────────────────────────────────
export function formatarDataRelativa(dataISO: string): string {
  const data = new Date(dataISO);
  const agora = new Date();
  const diffMs = agora.getTime() - data.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias === 0) return "Hoje";
  if (diffDias === 1) return "Ontem";
  if (diffDias < 7) return `${diffDias} dias atrás`;
  if (diffDias < 30) return `${Math.floor(diffDias / 7)} semanas atrás`;
  return data.toLocaleDateString("pt-BR");
}

// ── Calcular dias até uma data ───────────────────────────────────────
export function diasAte(dataISO: string): number {
  const data = new Date(dataISO);
  const agora = new Date();
  const diffMs = data.getTime() - agora.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

// ── Circunferência do SVG ring ───────────────────────────────────────
export function calcularDashOffset(percentual: number, raio = 58): number {
  const circunferencia = 2 * Math.PI * raio;
  return circunferencia * (1 - percentual / 100);
}
