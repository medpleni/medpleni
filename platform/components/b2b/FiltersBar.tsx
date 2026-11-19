"use client";

import React, { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface FilterOption {
  label: string;
  value: string;
}

interface FiltersBarProps {
  classGroups?: FilterOption[];
  periods?: number[];
  exams?: FilterOption[];
  showDateRange?: boolean;
}

/**
 * Barra de filtros institucionais padronizada com persistência em query params na URL.
 */
export default function FiltersBar({
  classGroups = [],
  periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  exams = [],
  showDateRange = true,
}: FiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectedClass = searchParams.get("turma") || "";
  const selectedPeriod = searchParams.get("periodo") || "";
  const selectedExam = searchParams.get("prova") || "";
  const startDate = searchParams.get("inicio") || "";
  const endDate = searchParams.get("fim") || "";

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const clearAllFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters = Boolean(
    selectedClass || selectedPeriod || selectedExam || startDate || endDate
  );

  const selectStyle: React.CSSProperties = {
    background: "var(--input-bg)",
    border: "1px solid var(--sinal)",
    color: "var(--neblina)",
    fontSize: "12px",
    padding: "6px 10px",
    borderRadius: "var(--r-md, 8px)",
    outline: "none",
    cursor: "pointer",
    minWidth: "120px",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "10px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--chumbo)",
    marginBottom: "4px",
    display: "block",
  };

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "var(--r-xl, 12px)",
        padding: "12px 16px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "flex-end",
        gap: "12px",
        flexWrap: "wrap",
        opacity: isPending ? 0.7 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {/* Filtro: Período do Curso */}
      <div>
        <label style={labelStyle}>Etapa / Período</label>
        <select
          style={selectStyle}
          value={selectedPeriod}
          onChange={(e) => updateParam("periodo", e.target.value)}
        >
          <option value="">Todos os Períodos</option>
          {periods.map((p) => (
            <option key={p} value={p.toString()}>
              {p}º Período {p === 4 || p === 8 || p === 12 ? "· ENAMED" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Filtro: Turma */}
      {classGroups.length > 0 && (
        <div>
          <label style={labelStyle}>Turma</label>
          <select
            style={selectStyle}
            value={selectedClass}
            onChange={(e) => updateParam("turma", e.target.value)}
          >
            <option value="">Todas as Turmas</option>
            {classGroups.map((cg) => (
              <option key={cg.value} value={cg.value}>
                {cg.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Filtro: Prova / Simulado */}
      {exams.length > 0 && (
        <div>
          <label style={labelStyle}>Avaliação</label>
          <select
            style={selectStyle}
            value={selectedExam}
            onChange={(e) => updateParam("prova", e.target.value)}
          >
            <option value="">Todas as Provas</option>
            {exams.map((ex) => (
              <option key={ex.value} value={ex.value}>
                {ex.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Intervalo de Datas */}
      {showDateRange && (
        <>
          <div>
            <label style={labelStyle}>Data Início</label>
            <input
              type="date"
              style={{ ...selectStyle, minWidth: "130px" }}
              value={startDate}
              onChange={(e) => updateParam("inicio", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Data Fim</label>
            <input
              type="date"
              style={{ ...selectStyle, minWidth: "130px" }}
              value={endDate}
              onChange={(e) => updateParam("fim", e.target.value)}
            />
          </div>
        </>
      )}

      {/* Botão Limpar Filtros */}
      {hasActiveFilters && (
        <button
          onClick={clearAllFilters}
          style={{
            background: "transparent",
            border: "1px dashed var(--chumbo)",
            color: "var(--chumbo)",
            fontSize: "11px",
            padding: "6px 12px",
            borderRadius: "var(--r-md, 8px)",
            cursor: "pointer",
            fontFamily: "'IBM Plex Mono', monospace",
            height: "32px",
            alignSelf: "flex-end",
            transition: "all 0.15s ease",
          }}
        >
          Limpar Filtros
        </button>
      )}
    </div>
  );
}
