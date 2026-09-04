"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout";
import { Badge } from "@/components/ui";
import { useUser } from "@/lib/supabase/use-user";
import {
  generateAdaptiveWeeklySchedule,
  fetchUserSchedule,
  saveUserSchedule,
  toggleBlockCompletion,
  postponeBlockToNextDay,
  deleteBlockFromSchedule,
  addBlockToSchedule,
  toggleDayPlantao,
} from "@/lib/supabase/schedule";
import type { DiaEstudo, BlocoEstudo, Area } from "@/lib/types";

const areaColors: Record<string, string> = {
  "Clínica Médica": "#00C2A8",
  "Cirurgia Geral": "#3B82F6",
  "Pediatria": "#F59E0B",
  "Ginecologia e Obstetrícia": "#EC4899",
  "Saúde Coletiva": "#10B981",
  "Urgência e Emergência": "#EF4444",
  "Psiquiatria": "#8B5CF6",
};

const tipoColors: Record<string, string> = {
  simulado: "#F59E0B",
  questoes: "#00C2A8",
  revisao: "#3B82F6",
  flashcards: "#8B5CF6",
  descanso: "#6B7280",
};

const tipoLabels: Record<string, string> = {
  simulado: "Simulado",
  questoes: "Questões",
  revisao: "Revisão",
  flashcards: "Flashcards",
  descanso: "Descanso",
};

export default function CronogramaPage() {
  const router = useRouter();
  const { user, profile } = useUser();
  const [activeNav, setActiveNav] = useState("cronograma");
  const [schedule, setSchedule] = useState<DiaEstudo[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"semana" | "hoje" | "lista">("semana");
  const [weekOffset, setWeekOffset] = useState(0); // 0 = esta semana, 1 = próxima

  // Modais
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [selectedDayForNew, setSelectedDayForNew] = useState("");

  // Form para nova atividade
  const [newActivity, setNewActivity] = useState({
    area: "Clínica Médica" as Area,
    tipo: "questoes" as BlocoEstudo["tipo"],
    horario: "08:00",
    duracao: "1h",
    descricao: "",
    acaoUrl: "/questoes",
  });

  // Configuração de IA
  const [aiDays, setAiDays] = useState<string[]>(["Seg", "Ter", "Qua", "Qui", "Sex"]);
  const [aiWeeklyHours, setAiWeeklyHours] = useState(profile?.weekly_study_hours || 20);
  const [aiStrategy, setAiStrategy] = useState<"lacunas" | "simulados" | "equilibrado">("lacunas");

  // Carrega cronograma
  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await fetchUserSchedule(user?.id);
      setSchedule(data);
      if (data.length > 0) {
        setSelectedDayForNew(data[0].dia);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  // Salva alterações
  const updateSchedule = async (newSchedule: DiaEstudo[]) => {
    setSchedule(newSchedule);
    await saveUserSchedule(newSchedule, user?.id);
  };

  // Toggle Conclusão
  const handleToggleBlock = (blockId?: string) => {
    if (!blockId) return;
    const updated = toggleBlockCompletion(schedule, blockId);
    updateSchedule(updated);
  };

  // Adiar Bloco
  const handlePostponeBlock = (blockId?: string) => {
    if (!blockId) return;
    const updated = postponeBlockToNextDay(schedule, blockId);
    updateSchedule(updated);
  };

  // Excluir Bloco
  const handleDeleteBlock = (blockId?: string) => {
    if (!blockId) return;
    const updated = deleteBlockFromSchedule(schedule, blockId);
    updateSchedule(updated);
  };

  // Toggle Plantão no Dia
  const handleTogglePlantao = (dayDate: string) => {
    const updated = toggleDayPlantao(schedule, dayDate);
    updateSchedule(updated);
  };

  // Salvar Nova Atividade Manual
  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDayForNew) return;

    let defaultUrl = "/questoes";
    if (newActivity.tipo === "simulado") defaultUrl = "/simulados";
    else if (newActivity.tipo === "revisao") defaultUrl = "/aulas";
    else if (newActivity.tipo === "flashcards") defaultUrl = "/flashcards";

    const updated = addBlockToSchedule(schedule, selectedDayForNew, {
      ...newActivity,
      descricao: newActivity.descricao || `${tipoLabels[newActivity.tipo]} de ${newActivity.area}`,
      acaoUrl: defaultUrl,
      concluido: false,
    });

    updateSchedule(updated);
    setShowAddModal(false);
    setNewActivity({
      area: "Clínica Médica",
      tipo: "questoes",
      horario: "08:00",
      duracao: "1h",
      descricao: "",
      acaoUrl: "/questoes",
    });
  };

  // Executar Reajuste pela IA
  const handleApplyAiSchedule = () => {
    const newSchedule = generateAdaptiveWeeklySchedule({
      profile,
      activeDays: aiDays,
      weeklyHours: aiWeeklyHours,
      strategy: aiStrategy,
    });
    updateSchedule(newSchedule);
    setShowAiModal(false);
  };

  // Cálculo de Métricas da Semana
  const stats = useMemo(() => {
    let totalMinutes = 0;
    let completedMinutes = 0;
    let totalBlocks = 0;
    let completedBlocks = 0;
    const typeMinutes: Record<string, number> = {
      simulado: 0,
      questoes: 0,
      revisao: 0,
      flashcards: 0,
    };

    schedule.forEach((dia) => {
      dia.blocos.forEach((b) => {
        if (b.tipo !== "descanso") {
          totalBlocks++;
          const mins = b.duracaoMinutos || 60;
          totalMinutes += mins;
          if (typeMinutes[b.tipo] !== undefined) {
            typeMinutes[b.tipo] += mins;
          }
          if (b.concluido) {
            completedBlocks++;
            completedMinutes += mins;
          }
        }
      });
    });

    const totalHours = Number((totalMinutes / 60).toFixed(1));
    const completedHours = Number((completedMinutes / 60).toFixed(1));
    const percentDone = totalMinutes > 0 ? Math.round((completedMinutes / totalMinutes) * 100) : 0;

    return {
      totalHours,
      completedHours,
      percentDone,
      totalBlocks,
      completedBlocks,
      typeMinutes,
    };
  }, [schedule]);

  const todayIso = new Date().toISOString().split("T")[0];
  const todaySchedule = schedule.find((d) => d.dia === todayIso) || schedule[0];

  return (
    <PageShell
      title="Cronograma de Estudos"
      badgeText={`Meta: ${stats.totalHours}h planejadas`}
      activeNavId={activeNav}
      onNavigate={setActiveNav}
    >
      <div style={{ maxWidth: "1360px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "18px" }}>
        
        {/* TOP BAR: Controls, Week Navigator & Action Buttons */}
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: "14px",
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
            boxShadow: "var(--card-shadow, none)",
          }}
        >
          {/* Left: View Mode Toggle & Offset */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", background: "var(--input-bg)", borderRadius: "8px", border: "1px solid var(--sinal)", overflow: "hidden" }}>
              <button
                onClick={() => setViewMode("semana")}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  background: viewMode === "semana" ? "var(--pulso)" : "transparent",
                  color: viewMode === "semana" ? "#FFFFFF" : "var(--neblina)",
                  cursor: "pointer",
                }}
              >
                Semana
              </button>
              <button
                onClick={() => setViewMode("hoje")}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  background: viewMode === "hoje" ? "var(--pulso)" : "transparent",
                  color: viewMode === "hoje" ? "#FFFFFF" : "var(--neblina)",
                  cursor: "pointer",
                }}
              >
                Hoje
              </button>
              <button
                onClick={() => setViewMode("lista")}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  background: viewMode === "lista" ? "var(--pulso)" : "transparent",
                  color: viewMode === "lista" ? "#FFFFFF" : "var(--neblina)",
                  cursor: "pointer",
                }}
              >
                Lista
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                onClick={() => setWeekOffset(weekOffset - 1)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--sinal)",
                  background: "transparent",
                  color: "var(--heading-color)",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
                title="Semana Anterior"
              >
                ←
              </button>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--heading-color)" }}>
                {weekOffset === 0 ? "Semana Atual" : weekOffset > 0 ? `+${weekOffset}ª Semana` : `${weekOffset}ª Semana`}
              </span>
              <button
                onClick={() => setWeekOffset(weekOffset + 1)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--sinal)",
                  background: "transparent",
                  color: "var(--heading-color)",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
                title="Próxima Semana"
              >
                →
              </button>
            </div>

            <Badge variant="green">Ajustado pela IA</Badge>
          </div>

          {/* Right: Actions Buttons */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                background: "transparent",
                border: "1px solid var(--sinal)",
                color: "var(--heading-color)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nova Atividade
            </button>

            <button
              onClick={() => setShowAiModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "8px",
                background: "var(--pulso)",
                border: "none",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0, 194, 168, 0.25)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Reajustar com IA
            </button>
          </div>
        </div>

        {/* PROGRESS METRIC BAR */}
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: "14px",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--heading-color)" }}>
                Progresso Semanal: {stats.completedHours}h de {stats.totalHours}h
              </span>
              <span style={{ fontSize: "12px", color: "var(--chumbo)" }}>
                ({stats.completedBlocks} de {stats.totalBlocks} tarefas concluídas)
              </span>
            </div>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--pulso)" }}>
              {stats.percentDone}% concluído
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{ width: "100%", height: "8px", background: "var(--sinal)", borderRadius: "4px", overflow: "hidden" }}>
            <div
              style={{
                width: `${stats.percentDone}%`,
                height: "100%",
                background: "var(--pulso)",
                borderRadius: "4px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>

        {/* MAIN LAYOUT: Resilient Grid & Side Summary */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 280px",
            gap: "18px",
            alignItems: "start",
            width: "100%",
            boxSizing: "border-box",
          }}
          className="cronograma-main-container"
        >
          <style>{`
            @media (max-width: 1180px) {
              .cronograma-main-container {
                grid-template-columns: minmax(0, 1fr) !important;
              }
            }
          `}</style>

          {/* LEFT: Schedule View (Semana / Hoje / Lista) */}
          <div style={{ minWidth: 0, width: "100%", overflow: "hidden" }}>
            
            {/* 1. VISÃO SEMANA (Horizontal Scroll Container) */}
            {viewMode === "semana" && (
              <div
                style={{
                  width: "100%",
                  overflowX: "auto",
                  paddingBottom: "8px",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, minmax(140px, 1fr))",
                    gap: "10px",
                    minWidth: "980px",
                  }}
                >
                  {schedule.map((dia) => {
                    const isToday = dia.dia === todayIso;
                    return (
                      <div
                        key={dia.dia}
                        style={{
                          background: isToday ? "var(--subtle-bg, rgba(0, 194, 168, 0.04))" : "var(--card-bg)",
                          border: isToday ? "1.5px solid var(--pulso)" : "1px solid var(--card-border)",
                          borderRadius: "12px",
                          padding: "12px 10px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                          minHeight: "420px",
                        }}
                      >
                        {/* Day Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--sinal)", paddingBottom: "8px" }}>
                          <div>
                            <span style={{ fontSize: "13px", fontWeight: 700, color: isToday ? "var(--pulso)" : "var(--heading-color)" }}>
                              {dia.diaSemana.slice(0, 3)}
                            </span>
                            <span style={{ fontSize: "10px", color: "var(--chumbo)", marginLeft: "4px" }}>
                              {dia.dia.slice(8)}
                            </span>
                          </div>

                          <button
                            onClick={() => handleTogglePlantao(dia.dia)}
                            title={dia.isPlantao ? "Desmarcar Plantão" : "Marcar como Plantão Médico"}
                            style={{
                              padding: "2px 5px",
                              fontSize: "9px",
                              fontWeight: 600,
                              borderRadius: "4px",
                              border: "1px solid var(--sinal)",
                              background: dia.isPlantao ? "#EF4444" : "transparent",
                              color: dia.isPlantao ? "#FFFFFF" : "var(--chumbo)",
                              cursor: "pointer",
                            }}
                          >
                            {dia.isPlantao ? "Plantão" : "+ Plantão"}
                          </button>
                        </div>

                        {/* Blocks */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {dia.blocos.map((bloco) => {
                            const bc = areaColors[bloco.area] || "var(--chumbo)";
                            const tc = tipoColors[bloco.tipo] || "var(--pulso)";
                            const isDone = bloco.concluido;

                            return (
                              <div
                                key={bloco.id}
                                style={{
                                  background: isDone ? "rgba(16, 185, 129, 0.06)" : "var(--input-bg, rgba(255,255,255,0.03))",
                                  border: isDone ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid var(--sinal)",
                                  borderRadius: "8px",
                                  padding: "8px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "6px",
                                  transition: "all 0.15s ease",
                                  opacity: isDone ? 0.75 : 1,
                                }}
                              >
                                {/* Top tag: Time + Type + Checkbox */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span
                                    style={{
                                      fontSize: "9px",
                                      fontWeight: 700,
                                      color: bc,
                                      background: `${bc}18`,
                                      padding: "1px 5px",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    {bloco.horario} • {bloco.duracao}
                                  </span>

                                  <input
                                    type="checkbox"
                                    checked={!!isDone}
                                    onChange={() => handleToggleBlock(bloco.id)}
                                    title="Marcar como concluído"
                                    style={{ cursor: "pointer", accentColor: "var(--pulso)" }}
                                  />
                                </div>

                                {/* Title / Desc with link */}
                                <Link
                                  href={bloco.acaoUrl || "/questoes"}
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: isDone ? "var(--chumbo)" : "var(--heading-color)",
                                    textDecoration: isDone ? "line-through" : "none",
                                    lineHeight: "1.3",
                                    display: "block",
                                  }}
                                  title="Clique para iniciar atividade"
                                >
                                  {bloco.descricao}
                                </Link>

                                {/* Bottom line: Type pill + Action triggers */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                                  <span style={{ fontSize: "9px", color: tc, fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }}>
                                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: tc }} />
                                    {tipoLabels[bloco.tipo]}
                                  </span>

                                  <div style={{ display: "flex", gap: "4px" }}>
                                    <button
                                      onClick={() => handlePostponeBlock(bloco.id)}
                                      title="Adiar para o dia seguinte"
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--chumbo)",
                                        cursor: "pointer",
                                        fontSize: "10px",
                                        padding: "1px 3px",
                                      }}
                                    >
                                      ➔
                                    </button>
                                    <button
                                      onClick={() => handleDeleteBlock(bloco.id)}
                                      title="Excluir tarefa"
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--chumbo)",
                                        cursor: "pointer",
                                        fontSize: "10px",
                                        padding: "1px 3px",
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. VISÃO HOJE (Foco no Dia Atual) */}
            {viewMode === "hoje" && (
              <div
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "14px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "18px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--heading-color)", margin: "0 0 4px 0" }}>
                      Metas de Hoje • {todaySchedule.diaSemana} ({todaySchedule.dia})
                    </h2>
                    <p style={{ fontSize: "13px", color: "var(--chumbo)", margin: 0 }}>
                      Concentre-se em executar um bloco por vez para atingir seu ritmo ideal de residência.
                    </p>
                  </div>
                  <button
                    onClick={() => handleTogglePlantao(todaySchedule.dia)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      border: "1px solid var(--sinal)",
                      background: todaySchedule.isPlantao ? "#EF4444" : "transparent",
                      color: todaySchedule.isPlantao ? "#FFFFFF" : "var(--heading-color)",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {todaySchedule.isPlantao ? "Desmarcar Plantão" : "Hoje estou de Plantão"}
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {todaySchedule.blocos.map((bloco) => {
                    const bc = areaColors[bloco.area] || "var(--chumbo)";
                    const tc = tipoColors[bloco.tipo] || "var(--pulso)";
                    const isDone = bloco.concluido;

                    return (
                      <div
                        key={bloco.id}
                        style={{
                          background: isDone ? "rgba(16, 185, 129, 0.08)" : "var(--input-bg, rgba(255,255,255,0.03))",
                          border: isDone ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid var(--sinal)",
                          borderRadius: "10px",
                          padding: "16px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "16px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                          <input
                            type="checkbox"
                            checked={!!isDone}
                            onChange={() => handleToggleBlock(bloco.id)}
                            style={{ width: "18px", height: "18px", accentColor: "var(--pulso)", cursor: "pointer" }}
                          />

                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: bc, background: `${bc}18`, padding: "2px 6px", borderRadius: "4px" }}>
                                {bloco.horario} • {bloco.duracao}
                              </span>
                              <span style={{ fontSize: "11px", color: tc, fontWeight: 600 }}>
                                {tipoLabels[bloco.tipo]}
                              </span>
                            </div>

                            <div style={{ fontSize: "14px", fontWeight: 700, color: isDone ? "var(--chumbo)" : "var(--heading-color)", textDecoration: isDone ? "line-through" : "none" }}>
                              {bloco.descricao}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Link
                            href={bloco.acaoUrl || "/questoes"}
                            style={{
                              padding: "8px 14px",
                              borderRadius: "8px",
                              background: isDone ? "rgba(16, 185, 129, 0.15)" : "var(--pulso)",
                              color: isDone ? "#10B981" : "#FFFFFF",
                              fontSize: "12px",
                              fontWeight: 700,
                              textDecoration: "none",
                            }}
                          >
                            {isDone ? "Revisar" : "Iniciar ➔"}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. VISÃO LISTA (Agenda Semanal) */}
            {viewMode === "lista" && (
              <div
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "14px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--heading-color)", margin: 0 }}>
                  Todas as Tarefas da Semana
                </h3>

                {schedule.map((dia) => (
                  <div key={dia.dia} style={{ borderBottom: "1px solid var(--sinal)", paddingBottom: "12px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--pulso)", marginBottom: "8px" }}>
                      {dia.diaSemana} ({dia.dia})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {dia.blocos.map((bloco) => (
                        <div
                          key={bloco.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 12px",
                            background: "var(--input-bg, rgba(255,255,255,0.02))",
                            borderRadius: "6px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <input
                              type="checkbox"
                              checked={!!bloco.concluido}
                              onChange={() => handleToggleBlock(bloco.id)}
                            />
                            <span style={{ fontSize: "11px", color: "var(--chumbo)", fontFamily: "monospace" }}>
                              {bloco.horario}
                            </span>
                            <span style={{ fontSize: "13px", color: bloco.concluido ? "var(--chumbo)" : "var(--heading-color)", textDecoration: bloco.concluido ? "line-through" : "none" }}>
                              {bloco.descricao}
                            </span>
                          </div>

                          <Link
                            href={bloco.acaoUrl || "/questoes"}
                            style={{ fontSize: "12px", color: "var(--pulso)", textDecoration: "none", fontWeight: 600 }}
                          >
                            Ir para atividade ➔
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Resumo da Semana & Dicas (Sem vazar da tela!) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>
            {/* Card 1: Distribuição */}
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "14px",
                padding: "18px 20px",
                boxShadow: "var(--card-shadow, none)",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--heading-color)", marginBottom: "12px" }}>
                Distribuição da Semana
              </div>

              {/* Progress bar multi-colored */}
              <div style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", height: "8px", borderRadius: "4px", overflow: "hidden", gap: "2px" }}>
                  <div style={{ width: "40%", background: "#F59E0B" }} title="Simulados" />
                  <div style={{ width: "30%", background: "#00C2A8" }} title="Questões" />
                  <div style={{ width: "20%", background: "#3B82F6" }} title="Revisão" />
                  <div style={{ width: "10%", background: "#8B5CF6" }} title="Flashcards" />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "10px", color: "var(--chumbo)" }}>
                  <span>70% Lacunas</span>
                  <span>30% Manutenção</span>
                </div>
              </div>

              {/* Breakdown rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid var(--sinal)", paddingTop: "12px" }}>
                {[
                  { tipo: "simulado", label: "Simulados cronometrados", mins: stats.typeMinutes.simulado },
                  { tipo: "questoes", label: "Blocos de questões", mins: stats.typeMinutes.questoes },
                  { tipo: "revisao", label: "Revisão ativa & aulas", mins: stats.typeMinutes.revisao },
                  { tipo: "flashcards", label: "Flashcards SRS", mins: stats.typeMinutes.flashcards },
                ].map((t) => (
                  <div key={t.tipo} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: tipoColors[t.tipo] }} />
                      <span style={{ color: "var(--neblina)" }}>{t.label}</span>
                    </div>
                    <span style={{ fontFamily: "monospace", color: "var(--chumbo)", fontWeight: 600 }}>
                      {Math.round(t.mins / 60)}h{t.mins % 60 > 0 ? `${t.mins % 60}m` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2: Recomendação da IA */}
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid rgba(0, 194, 168, 0.3)",
                borderRadius: "14px",
                padding: "16px",
                boxShadow: "var(--card-shadow, none)",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--pulso)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Recomendação Dr. Pleni IA
              </div>
              <p style={{ fontSize: "12px", color: "var(--neblina)", lineHeight: "1.5", margin: 0 }}>
                Concentre seu estudo de <strong>Saúde Coletiva</strong> e <strong>Pediatria</strong> nos blocos matinais e resolva o simulado focado no meio da semana para consolidar a nota de corte da sua banca.
              </p>
            </div>
          </div>
        </div>

        {/* MODAL 1: ADICIONAR ATIVIDADE */}
        {showAddModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 999,
              padding: "20px",
            }}
          >
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "16px",
                padding: "24px",
                maxWidth: "480px",
                width: "100%",
                boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--heading-color)", margin: 0 }}>
                  Nova Atividade no Cronograma
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{ background: "none", border: "none", color: "var(--chumbo)", cursor: "pointer", fontSize: "16px" }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateActivity} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--chumbo)", marginBottom: "4px" }}>
                    Dia da Atividade
                  </label>
                  <select
                    value={selectedDayForNew}
                    onChange={(e) => setSelectedDayForNew(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--input-bg)", border: "1px solid var(--sinal)", color: "var(--heading-color)" }}
                  >
                    {schedule.map((d) => (
                      <option key={d.dia} value={d.dia}>
                        {d.diaSemana} ({d.dia})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--chumbo)", marginBottom: "4px" }}>
                      Área Médica
                    </label>
                    <select
                      value={newActivity.area}
                      onChange={(e) => setNewActivity({ ...newActivity, area: e.target.value as Area })}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--input-bg)", border: "1px solid var(--sinal)", color: "var(--heading-color)" }}
                    >
                      {Object.keys(areaColors).map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--chumbo)", marginBottom: "4px" }}>
                      Tipo
                    </label>
                    <select
                      value={newActivity.tipo}
                      onChange={(e) => setNewActivity({ ...newActivity, tipo: e.target.value as any })}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--input-bg)", border: "1px solid var(--sinal)", color: "var(--heading-color)" }}
                    >
                      <option value="questoes">Questões</option>
                      <option value="simulado">Simulado</option>
                      <option value="revisao">Revisão / Aula</option>
                      <option value="flashcards">Flashcards</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--chumbo)", marginBottom: "4px" }}>
                      Horário
                    </label>
                    <input
                      type="time"
                      value={newActivity.horario}
                      onChange={(e) => setNewActivity({ ...newActivity, horario: e.target.value })}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--input-bg)", border: "1px solid var(--sinal)", color: "var(--heading-color)" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--chumbo)", marginBottom: "4px" }}>
                      Duração
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 1h, 1h30, 45min"
                      value={newActivity.duracao}
                      onChange={(e) => setNewActivity({ ...newActivity, duracao: e.target.value })}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--input-bg)", border: "1px solid var(--sinal)", color: "var(--heading-color)" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--chumbo)", marginBottom: "4px" }}>
                    Descrição / Título do Bloco
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Resolver 30 questões de Pediatria Neonatal"
                    value={newActivity.descricao}
                    onChange={(e) => setNewActivity({ ...newActivity, descricao: e.target.value })}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--input-bg)", border: "1px solid var(--sinal)", color: "var(--heading-color)" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid var(--sinal)", background: "transparent", color: "var(--neblina)", cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "var(--pulso)", color: "#FFFFFF", fontWeight: 700, cursor: "pointer" }}
                  >
                    Salvar Atividade
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: REAJUSTE COM IA */}
        {showAiModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 999,
              padding: "20px",
            }}
          >
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "16px",
                padding: "24px",
                maxWidth: "500px",
                width: "100%",
                boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--heading-color)", margin: 0 }}>
                  Recalibrar Cronograma com IA
                </h3>
                <button
                  onClick={() => setShowAiModal(false)}
                  style={{ background: "none", border: "none", color: "var(--chumbo)", cursor: "pointer", fontSize: "16px" }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--chumbo)", marginBottom: "8px" }}>
                    Dias da Semana que Você Estuda
                  </label>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => {
                      const isSel = aiDays.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            if (isSel) setAiDays(aiDays.filter((x) => x !== d));
                            else setAiDays([...aiDays, d]);
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: isSel ? "1px solid var(--pulso)" : "1px solid var(--sinal)",
                            background: isSel ? "rgba(0, 194, 168, 0.15)" : "transparent",
                            color: isSel ? "var(--pulso)" : "var(--neblina)",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--chumbo)", marginBottom: "4px" }}>
                    Carga Horária Semanal: {aiWeeklyHours} horas
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={50}
                    step={5}
                    value={aiWeeklyHours}
                    onChange={(e) => setAiWeeklyHours(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--pulso)" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--chumbo)" }}>
                    <span>10h (Leve)</span>
                    <span>25h (Ideal)</span>
                    <span>50h (Intensivo)</span>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--chumbo)", marginBottom: "6px" }}>
                    Estratégia do Algoritmo
                  </label>
                  <select
                    value={aiStrategy}
                    onChange={(e) => setAiStrategy(e.target.value as any)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "var(--input-bg)", border: "1px solid var(--sinal)", color: "var(--heading-color)" }}
                  >
                    <option value="lacunas">Foco em Lacunas (70% Lacunas / 30% Manutenção)</option>
                    <option value="simulados">Foco em Simulados & Provas Reais</option>
                    <option value="equilibrado">Equilíbrio DCN (Distribuição Homogênea)</option>
                  </select>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setShowAiModal(false)}
                    style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid var(--sinal)", background: "transparent", color: "var(--neblina)", cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyAiSchedule}
                    style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "var(--pulso)", color: "#FFFFFF", fontWeight: 700, cursor: "pointer" }}
                  >
                    Gerar Novo Cronograma
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </PageShell>
  );
}
