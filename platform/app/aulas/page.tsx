"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import {
  ALL_CLASSES_CATALOG,
  ClassItem,
  CORE_AREAS,
  SUBSPECIALTIES_BY_AREA,
} from "@/lib/data/classes_catalog";
import {
  StudentClassProgress,
  fetchUserClassesProgress,
  calculateClassroomMetrics,
  ClassroomMetrics,
} from "@/lib/supabase/classes";

export default function AulasHubPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState<string>("TODAS");
  const [selectedSubspecialty, setSelectedSubspecialty] = useState<string>("TODAS");
  const [selectedStatus, setSelectedStatus] = useState<"TODOS" | "CONCLUIDAS" | "PENDENTES" | "EM_PROGRESSO">("TODOS");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  const [progressMap, setProgressMap] = useState<Record<string, StudentClassProgress>>({});
  const [metrics, setMetrics] = useState<ClassroomMetrics>({
    totalClasses: 378,
    completedCount: 0,
    inProgressCount: 0,
    totalMinutesWatched: 0,
    totalMinutesAudioListened: 0,
    averageQuizScore: 0,
    quizzesCompletedCount: 0,
  });

  useEffect(() => {
    async function loadProgress() {
      const pMap = await fetchUserClassesProgress();
      setProgressMap(pMap);
      const m = calculateClassroomMetrics(pMap, ALL_CLASSES_CATALOG.length);
      setMetrics(m);
    }
    loadProgress();
  }, []);

  // Filter subspecialties based on chosen area
  const availableSubspecialties = useMemo(() => {
    if (selectedArea === "TODAS") {
      const subs = new Set<string>();
      ALL_CLASSES_CATALOG.forEach((c) => subs.add(c.subspecialty));
      return Array.from(subs).sort();
    }
    return SUBSPECIALTIES_BY_AREA[selectedArea] || [];
  }, [selectedArea]);

  // Filter classes
  const filteredClasses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return ALL_CLASSES_CATALOG.filter((item) => {
      // Area filter
      if (selectedArea !== "TODAS" && item.coreArea !== selectedArea) {
        return false;
      }
      // Subspecialty filter
      if (selectedSubspecialty !== "TODAS" && item.subspecialty !== selectedSubspecialty) {
        return false;
      }
      // Status filter
      const p = progressMap[item.id];
      if (selectedStatus === "CONCLUIDAS" && !p?.completed) {
        return false;
      }
      if (selectedStatus === "PENDENTES" && (p?.completed || (p && (p.videoWatchPercent > 0 || p.audioListenedPercent > 0)))) {
        return false;
      }
      if (selectedStatus === "EM_PROGRESSO" && (!p || p.completed || (p.videoWatchPercent === 0 && p.audioListenedPercent === 0))) {
        return false;
      }
      // Search query
      if (q) {
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesArea = item.coreArea.toLowerCase().includes(q);
        const matchesSub = item.subspecialty.toLowerCase().includes(q);
        const matchesSubtopics = item.subtopics.some((st) => st.toLowerCase().includes(q));
        if (!matchesTitle && !matchesArea && !matchesSub && !matchesSubtopics) {
          return false;
        }
      }
      return true;
    });
  }, [searchQuery, selectedArea, selectedSubspecialty, selectedStatus, progressMap]);

  const totalHours = Math.round((metrics.totalMinutesWatched + metrics.totalMinutesAudioListened) / 60);

  const getAreaColor = (area: string) => {
    switch (area) {
      case "Clínica Médica":
        return "#00C2A8";
      case "Cirurgia Geral":
        return "#3B82F6";
      case "Pediatria":
        return "#F59E0B";
      case "Ginecologia e Obstetrícia":
        return "#EC4899";
      case "Saúde Coletiva":
        return "#10B981";
      default:
        return "var(--pulso)";
    }
  };

  return (
    <PageShell title="Sala de Aula & Revisão" badgeText="378 Temas Clínicos" activeNavId="aulas">
      <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Top Header Banner */}
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: "16px",
            padding: "24px 28px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "20px",
            boxShadow: "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.04))",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(0, 194, 168, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--pulso)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </div>
              <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--heading-color)", margin: 0 }}>
                Sala de Aula & Revisão Médica
              </h1>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  background: "rgba(0, 194, 168, 0.12)",
                  color: "var(--pulso)",
                  border: "1px solid rgba(0, 194, 168, 0.3)",
                  padding: "3px 8px",
                  borderRadius: "20px",
                }}
              >
                378 Temas Oficiais DCN
              </span>
            </div>
            <p style={{ color: "var(--neblina)", fontSize: "14px", margin: 0, maxWidth: "720px", lineHeight: "1.5" }}>
              Aulas teóricas de alto rendimento, áudio-podcasts clínicos, slides condensados, mapas mentais de conduta e quizzes interativos de fixação integrados ao Preceptor Dr. Pleni IA.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <Link
              href="/ia-medica"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "var(--pulso)",
                color: "#FFFFFF",
                border: "none",
                padding: "10px 18px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 2px 10px rgba(0, 194, 168, 0.25)",
                transition: "all 0.2s ease",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Dúvidas com Dr. Pleni IA
            </Link>
          </div>
        </div>

        {/* KPI Metrics Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          {/* Card 1: Total Temas */}
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "14px",
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(0, 194, 168, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--pulso)",
                flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "var(--chumbo)", fontWeight: 500 }}>Total de Temas</div>
              <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--heading-color)", marginTop: "2px" }}>
                378 <span style={{ fontSize: "12px", fontWeight: 400, color: "var(--chumbo)" }}>aulas</span>
              </div>
            </div>
          </div>

          {/* Card 2: Concluídas */}
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "14px",
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(16, 185, 129, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10B981",
                flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "var(--chumbo)", fontWeight: 500 }}>Aulas Concluídas</div>
              <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--heading-color)", marginTop: "2px" }}>
                {metrics.completedCount}{" "}
                <span style={{ fontSize: "12px", fontWeight: 400, color: "var(--chumbo)" }}>
                  ({Math.round((metrics.completedCount / 378) * 100)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Horas de Estudo */}
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "14px",
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(59, 130, 246, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#3B82F6",
                flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "var(--chumbo)", fontWeight: 500 }}>Horas Acumuladas</div>
              <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--heading-color)", marginTop: "2px" }}>
                {totalHours}h{" "}
                <span style={{ fontSize: "12px", fontWeight: 400, color: "var(--chumbo)" }}>
                  ({Math.round(metrics.totalMinutesWatched + metrics.totalMinutesAudioListened)} min)
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Quizzes */}
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "14px",
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(245, 158, 11, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#F59E0B",
                flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "var(--chumbo)", fontWeight: 500 }}>Desempenho em Quiz</div>
              <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--heading-color)", marginTop: "2px" }}>
                {metrics.averageQuizScore > 0 ? `${metrics.averageQuizScore}%` : "—"}{" "}
                <span style={{ fontSize: "12px", fontWeight: 400, color: "var(--chumbo)" }}>
                  ({metrics.quizzesCompletedCount} feitos)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: "14px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Top Filter Row: Search & View Toggle */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            {/* Search Input */}
            <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--chumbo)"
                strokeWidth="2"
                style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por tema, patologia, droga, conduta ou subespecialidade..."
                style={{
                  width: "100%",
                  background: "var(--input-bg, rgba(255,255,255,0.04))",
                  border: "1px solid var(--sinal)",
                  borderRadius: "10px",
                  padding: "10px 14px 10px 38px",
                  color: "var(--heading-color)",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--chumbo)",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Subspecialty select */}
            <div style={{ minWidth: "200px" }}>
              <select
                value={selectedSubspecialty}
                onChange={(e) => setSelectedSubspecialty(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--input-bg, rgba(255,255,255,0.04))",
                  border: "1px solid var(--sinal)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  color: "var(--heading-color)",
                  fontSize: "13px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="TODAS" style={{ background: "var(--card-bg)" }}>
                  Todas as Especialidades ({availableSubspecialties.length})
                </option>
                {availableSubspecialties.map((sub) => (
                  <option key={sub} value={sub} style={{ background: "var(--card-bg)" }}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {/* Status select */}
            <div style={{ minWidth: "160px" }}>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                style={{
                  width: "100%",
                  background: "var(--input-bg, rgba(255,255,255,0.04))",
                  border: "1px solid var(--sinal)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  color: "var(--heading-color)",
                  fontSize: "13px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="TODOS" style={{ background: "var(--card-bg)" }}>Todos os Status</option>
                <option value="CONCLUIDAS" style={{ background: "var(--card-bg)" }}>Concluídas</option>
                <option value="EM_PROGRESSO" style={{ background: "var(--card-bg)" }}>Em Progresso</option>
                <option value="PENDENTES" style={{ background: "var(--card-bg)" }}>Não Iniciadas</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div style={{ display: "flex", border: "1px solid var(--sinal)", borderRadius: "8px", overflow: "hidden" }}>
              <button
                onClick={() => setViewMode("grid")}
                style={{
                  background: viewMode === "grid" ? "var(--pulso)" : "transparent",
                  color: viewMode === "grid" ? "#0D111C" : "var(--neblina)",
                  border: "none",
                  padding: "8px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Modo Grade"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                style={{
                  background: viewMode === "list" ? "var(--pulso)" : "transparent",
                  color: viewMode === "list" ? "#0D111C" : "var(--neblina)",
                  border: "none",
                  padding: "8px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Modo Lista"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Core Areas Pills */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={() => {
                setSelectedArea("TODAS");
                setSelectedSubspecialty("TODAS");
              }}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 600,
                border: selectedArea === "TODAS" ? "1px solid var(--pulso)" : "1px solid var(--sinal)",
                background: selectedArea === "TODAS" ? "rgba(0, 194, 168, 0.15)" : "transparent",
                color: selectedArea === "TODAS" ? "var(--pulso)" : "var(--neblina)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Todas as Áreas (378)
            </button>
            {CORE_AREAS.map((area) => {
              const isSelected = selectedArea === area.name;
              const count = ALL_CLASSES_CATALOG.filter((c) => c.coreArea === area.name).length;
              const areaColor = getAreaColor(area.name);
              return (
                <button
                  key={area.id}
                  onClick={() => {
                    setSelectedArea(area.name);
                    setSelectedSubspecialty("TODAS");
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 600,
                    border: isSelected ? `1px solid ${areaColor}` : "1px solid var(--sinal)",
                    background: isSelected ? `${areaColor}20` : "transparent",
                    color: isSelected ? areaColor : "var(--neblina)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {area.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Counter */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "13px", color: "var(--chumbo)" }}>
            Exibindo <strong style={{ color: "var(--heading-color)" }}>{filteredClasses.length}</strong> de{" "}
            <strong>378</strong> temas disponíveis
          </div>
          {(searchQuery || selectedArea !== "TODAS" || selectedSubspecialty !== "TODAS" || selectedStatus !== "TODOS") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedArea("TODAS");
                setSelectedSubspecialty("TODAS");
                setSelectedStatus("TODOS");
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--pulso)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* Grid View */}
        {viewMode === "grid" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "18px",
            }}
          >
            {filteredClasses.map((item) => {
              const prog = progressMap[item.id];
              const isCompleted = prog?.completed || false;
              const areaColor = getAreaColor(item.coreArea);

              return (
                <div
                  key={item.id}
                  style={{
                    background: "var(--card-bg)",
                    border: isCompleted ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid var(--card-border)",
                    borderRadius: "14px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "14px",
                    transition: "transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
                    position: "relative",
                  }}
                >
                  {/* Top Line: Area Pill, Subspecialty & Status */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "6px",
                            background: `${areaColor}18`,
                            color: areaColor,
                            border: `1px solid ${areaColor}35`,
                          }}
                        >
                          {item.coreArea}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--chumbo)" }}>
                          • {item.subspecialty}
                        </span>
                      </div>

                      {isCompleted ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#10B981",
                            background: "rgba(16, 185, 129, 0.12)",
                            padding: "2px 8px",
                            borderRadius: "12px",
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Concluída
                        </span>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--chumbo)" }}>
                          {item.estimatedMinutes} min
                        </span>
                      )}
                    </div>

                    {/* Class Title */}
                    <h3
                      style={{
                        fontSize: "15px",
                        fontWeight: 700,
                        color: "var(--heading-color)",
                        lineHeight: "1.4",
                        margin: "0 0 8px 0",
                      }}
                    >
                      {item.title}
                    </h3>

                    {/* Subtopics snippet */}
                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--neblina)",
                        lineHeight: "1.4",
                        margin: 0,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {item.subtopics.join(" • ")}
                    </p>
                  </div>

                  {/* Bottom Area: Asset Badges & Action Button */}
                  <div>
                    {/* Media Assets Badges */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 0",
                        borderTop: "1px solid var(--sinal)",
                        borderBottom: "1px solid var(--sinal)",
                        marginBottom: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Video */}
                      <span
                        title="Vídeo-Masterclass"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "var(--neblina)",
                          background: "var(--subtle-bg, rgba(255,255,255,0.04))",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        Vídeo
                      </span>

                      {/* Audio */}
                      <span
                        title="Áudio-Revisão / Podcast"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "var(--neblina)",
                          background: "var(--subtle-bg, rgba(255,255,255,0.04))",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" y1="19" x2="12" y2="23" />
                        </svg>
                        Áudio
                      </span>

                      {/* Slides */}
                      <span
                        title="Slide Resumo"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "var(--neblina)",
                          background: "var(--subtle-bg, rgba(255,255,255,0.04))",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="3" width="20" height="14" rx="2" />
                          <line x1="8" y1="21" x2="16" y2="21" />
                          <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                        Slides
                      </span>

                      {/* Mindmap */}
                      <span
                        title="Mapa Mental Clínico"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "var(--neblina)",
                          background: "var(--subtle-bg, rgba(255,255,255,0.04))",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="6" height="6" rx="1" />
                          <rect x="15" y="15" width="6" height="6" rx="1" />
                          <path d="M9 6h6v9" />
                        </svg>
                        Mapa Mental
                      </span>

                      {/* Quiz */}
                      <span
                        title="Quiz de Fixação"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "var(--pulso)",
                          background: "rgba(0, 194, 168, 0.08)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        Quiz
                      </span>
                    </div>

                    {/* Card Action Button */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Link
                        href={`/aula/${item.id}`}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          background: isCompleted ? "rgba(16, 185, 129, 0.15)" : "var(--pulso)",
                          color: isCompleted ? "#10B981" : "#FFFFFF",
                          padding: "9px 14px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          fontWeight: 700,
                          textDecoration: "none",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span>{isCompleted ? "Revisar Aula" : "Acessar Aula"}</span>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </Link>

                      <Link
                        href={`/ia-medica?context=${encodeURIComponent(item.title)}`}
                        title="Tirar dúvida rápida com Dr. Pleni IA sobre este tema"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "9px 12px",
                          background: "var(--input-bg, rgba(255,255,255,0.04))",
                          border: "1px solid var(--sinal)",
                          borderRadius: "8px",
                          color: "var(--neblina)",
                          textDecoration: "none",
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "14px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "60px 1fr 140px 140px 100px 130px",
                padding: "12px 20px",
                background: "var(--subtle-bg, rgba(255,255,255,0.02))",
                borderBottom: "1px solid var(--sinal)",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--chumbo)",
              }}
            >
              <div>ID</div>
              <div>Tema / Subtópicos</div>
              <div>Área</div>
              <div>Especialidade</div>
              <div>Duração</div>
              <div style={{ textAlign: "right" }}>Ação</div>
            </div>

            {filteredClasses.map((item, idx) => {
              const prog = progressMap[item.id];
              const isCompleted = prog?.completed || false;
              const areaColor = getAreaColor(item.coreArea);

              return (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 1fr 140px 140px 100px 130px",
                    alignItems: "center",
                    padding: "14px 20px",
                    borderBottom: idx < filteredClasses.length - 1 ? "1px solid var(--sinal)" : "none",
                    background: isCompleted ? "rgba(16, 185, 129, 0.03)" : "transparent",
                    transition: "background 0.15s ease",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "var(--chumbo)", fontFamily: "monospace" }}>
                    #{item.id.padStart(3, "0")}
                  </div>

                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--heading-color)", marginBottom: "3px" }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--neblina)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "450px" }}>
                      {item.subtopics.join(" • ")}
                    </div>
                  </div>

                  <div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "6px",
                        background: `${areaColor}15`,
                        color: areaColor,
                      }}
                    >
                      {item.coreArea}
                    </span>
                  </div>

                  <div style={{ fontSize: "12px", color: "var(--neblina)" }}>
                    {item.subspecialty}
                  </div>

                  <div style={{ fontSize: "12px", color: "var(--chumbo)" }}>
                    {item.estimatedMinutes} min
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                    <Link
                      href={`/aula/${item.id}`}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 700,
                        background: isCompleted ? "rgba(16, 185, 129, 0.15)" : "var(--pulso)",
                        color: isCompleted ? "#10B981" : "#FFFFFF",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {isCompleted ? "Revisar" : "Estudar"}
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state if no results */}
        {filteredClasses.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "14px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "24px",
                background: "rgba(255,255,255,0.05)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--chumbo)",
                marginBottom: "14px",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--heading-color)", margin: "0 0 6px 0" }}>
              Nenhum tema encontrado
            </h3>
            <p style={{ fontSize: "13px", color: "var(--chumbo)", margin: 0 }}>
              Tente ajustar sua busca ou limpar os filtros de área e especialidade.
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
