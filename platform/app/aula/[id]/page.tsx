"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import {
  ALL_CLASSES_CATALOG,
  ClassItem,
  getClassById,
  getAdjacentClasses,
} from "@/lib/data/classes_catalog";
import {
  StudentClassProgress,
  fetchClassProgress,
  saveClassProgress,
} from "@/lib/supabase/classes";

export default function AulaPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const classId = (params?.id as string) || "1";

  const classItem = useMemo(() => getClassById(classId), [classId]);
  const adjacent = useMemo(() => getAdjacentClasses(classId), [classId]);

  // Tab selection
  const [activeTab, setActiveTab] = useState<
    "slides" | "mapa" | "infografico" | "quiz" | "questoes"
  >("slides");

  // Progress state
  const [progress, setProgress] = useState<StudentClassProgress>({
    classId: classId,
    completed: false,
    videoWatchPercent: 0,
    audioListenedPercent: 0,
    quizScore: null,
    notes: "",
    lastAccessedAt: new Date().toISOString(),
  });

  const [savingProgress, setSavingProgress] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Audio Player State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioSpeed, setAudioSpeed] = useState<number>(1);

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submittedQuiz, setSubmittedQuiz] = useState(false);

  // Load progress
  useEffect(() => {
    async function load() {
      const p = await fetchClassProgress(classId);
      if (p) {
        setProgress(p);
        if (p.quizScore !== null) {
          setSubmittedQuiz(true);
        }
      }
    }
    load();
    setActiveSlideIndex(0);
    setSelectedAnswers({});
    setSubmittedQuiz(false);
  }, [classId]);

  // Handle Mark Completed toggle
  const handleToggleComplete = async () => {
    const newCompleted = !progress.completed;
    const updated: StudentClassProgress = {
      ...progress,
      completed: newCompleted,
      videoWatchPercent: newCompleted ? 100 : progress.videoWatchPercent,
      audioListenedPercent: newCompleted ? 100 : progress.audioListenedPercent,
      lastAccessedAt: new Date().toISOString(),
    };
    setProgress(updated);
    setSavingProgress(true);
    await saveClassProgress(updated);
    setSavingProgress(false);
  };

  // Handle Notes change
  const handleNotesChange = async (newNotes: string) => {
    const updated: StudentClassProgress = {
      ...progress,
      notes: newNotes,
      lastAccessedAt: new Date().toISOString(),
    };
    setProgress(updated);
    await saveClassProgress(updated);
  };

  // Simulated Audio Playback ticker
  useEffect(() => {
    let timer: any;
    if (isPlayingAudio) {
      timer = setInterval(() => {
        setAudioProgress((prev) => {
          if (prev >= 100) {
            setIsPlayingAudio(false);
            return 100;
          }
          const next = prev + 1 * audioSpeed;
          return next > 100 ? 100 : next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlayingAudio, audioSpeed]);

  if (!classItem) {
    return (
      <PageShell title="Aula Não Encontrada" activeNavId="aulas">
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <h2 style={{ color: "var(--heading-color)" }}>Aula não encontrada</h2>
          <p style={{ color: "var(--neblina)", marginBottom: "20px" }}>
            O identificador solicitado não corresponde a nenhum dos 378 temas clínicos.
          </p>
          <Link
            href="/aulas"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              background: "var(--pulso)",
              color: "#0D111C",
              borderRadius: "8px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            ← Voltar para o Catálogo de Aulas
          </Link>
        </div>
      </PageShell>
    );
  }

  // Quiz questions generation based on current theme
  const mockQuizQuestions = [
    {
      id: 1,
      question: `Em relação ao manejo clínico e critérios diagnósticos de "${classItem.title}", qual é a conduta inicial recomendada segundo as diretrizes de referência para provas de Residência Médica?`,
      options: [
        `Estratificação de risco com base em escores validados e início imediato de terapia direcionada com monitorização contínua.`,
        `Aguarda confirmação por biópsia tecidual antes de qualquer abordagem farmacológica em ambiente de pronto-socorro.`,
        `Prescrição empírica isolada de antibioticoterapia de amplo espectro sem solicitação prévia de exames laboratoriais básicos.`,
        `Alta hospitalar com acompanhamento ambulatorial eletivo em 90 dias sem necessidade de alerta para sinais de alarme.`,
      ],
      correctIndex: 0,
      rationale: `A resposta correta é a primeira alternativa. Para ${classItem.title}, o pilar essencial é a estratificação precoce de gravidade, identificação de red flags e intervenção proporcional ao escore de risco do paciente.`,
    },
    {
      id: 2,
      question: `Qual das seguintes opções representa uma "Pegadinha Clássica de Prova" (High-Yield Board Trap) frequentemente cobrada sobre "${classItem.subspecialty}"?`,
      options: [
        `Confundir manifestações atípicas em extremos de idade (idosos e neonatos) com quadros infecciosos inespecíficos ou demenciais.`,
        `Ignorar que exames de imagem sempre têm 100% de sensibilidade em fases hiperagudas.`,
        `Superdosagem sistemática sem checar função renal (clearance de creatinina) em todos os casos.`,
        `Indicação cirúrgica imediata em todos os estágios sem contraprova clínica.`,
      ],
      correctIndex: 0,
      rationale: `Bancas examinadoras como USP, ENARE e UNICAMP exploram com frequência apresentações atípicas e oligossintomáticas, principalmente em idosos, diabéticos e crianças, onde sinais clássicos podem estar ausentes.`,
    },
    {
      id: 3,
      question: `No que tange aos critérios de internação hospitalar e vigilância intensiva para pacientes com "${classItem.title}", o fator determinante é:`,
      options: [
        `Instabilidade hemodinâmica, refratariedade à terapia de primeira linha ou presença de falência orgânica secundária.`,
        `Preferência subjetiva do acompanhante, independentemente dos parâmetros hemodinâmicos.`,
        `Idade estritamente cronológica acima de 40 anos, sem outras comorbidades.`,
        `Apenas o valor isolado da contagem de leucócitos no hemograma.`,
      ],
      correctIndex: 0,
      rationale: `Critérios objetivos de internação e UTI fundamentam-se em instabilidade fisiológica, comprometimento respiratório/circulatório e marcadores de disfunção orgânica aguda.`,
    },
  ];

  const handleSelectAnswer = (qIndex: number, optIndex: number) => {
    if (submittedQuiz) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [qIndex]: optIndex,
    }));
  };

  const handleFinishQuiz = async () => {
    let correctCount = 0;
    mockQuizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        correctCount++;
      }
    });
    const score = Math.round((correctCount / mockQuizQuestions.length) * 100);
    setSubmittedQuiz(true);

    const updated: StudentClassProgress = {
      ...progress,
      quizScore: score,
      lastAccessedAt: new Date().toISOString(),
    };
    setProgress(updated);
    await saveClassProgress(updated);
  };

  // 4 Condensed Slides content
  const slidesContent = [
    {
      title: "1. Síntese Conceitual & Fisiopatologia",
      bullets: [
        `Definição padrão e impacto epidemiológico nos concursos de Residência Médica (DCN / R1).`,
        `Mecanismo fisiopatológico central e principais vias de descompensação clínica.`,
        `Fatores predisponentes, comorbidades associadas e gatilhos de agudização.`,
      ],
      keyTakeaway: `Ponto-chave: Reconhecer a fisiopatologia base é a melhor forma de responder questões conceituais com rapidez e assertividade.`,
    },
    {
      title: "2. Diagnóstico & Sinais de Alarme (Red Flags)",
      bullets: [
        `Quadro clínico típico vs. apresentações atípicas (extremos de idade e imunossuprimidos).`,
        `Exames complementares padrão-ouro vs. exames de triagem no Pronto Atendimento.`,
        `Sinais de alarme imediatos que exigem internação em leito monitorizado ou UTI.`,
      ],
      keyTakeaway: `Ponto-chave: Bancas adoram cobrar qual exame pedir primeiro e qual é o exame padrão-ouro para confirmação diagnóstica.`,
    },
    {
      title: "3. Conduta Terapêutica Escalonada",
      bullets: [
        `Abordagem não farmacológica e suporte hemodinâmico / respiratório inicial.`,
        `Terapia de primeira linha: drogas de escolha, posologia de ataque e manutenção.`,
        `Alternativas em caso de alergia, falência terapêutica ou insuficiência orgânica prévia.`,
      ],
      keyTakeaway: `Ponto-chave: Priorize sempre a sequência ABCDE e a droga de primeira escolha antes de considerar tratamentos de resgate.`,
    },
    {
      title: "4. Pegadinhas de Prova & Critérios de Alta",
      bullets: [
        `Distratores frequentes: drogas contraindicadas que parecem intuitivas mas pioram o prognóstico.`,
        `Diferencial crítico com patologias de apresentação mimetizadora.`,
        `Metas de estabilidade para liberação ambulatorial segura com contrarreferência.`,
      ],
      keyTakeaway: `Ponto-chave: Memorize as contraindicações absolutas e relativas das medicações de referência deste tema.`,
    },
  ];

  return (
    <PageShell title="Sala de Aula" badgeText={`Tema #${classItem.id}`} activeNavId="aulas">
      <div style={{ maxWidth: "1320px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* Breadcrumb & Navigation Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            borderBottom: "1px solid var(--sinal)",
            paddingBottom: "14px",
          }}
        >
          {/* Breadcrumb links */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--chumbo)" }}>
            <Link href="/aulas" style={{ color: "var(--pulso)", textDecoration: "none", fontWeight: 600 }}>
              Sala de Aula
            </Link>
            <span>›</span>
            <span>{classItem.coreArea}</span>
            <span>›</span>
            <span>{classItem.subspecialty}</span>
            <span>›</span>
            <span style={{ color: "var(--heading-color)", fontWeight: 600 }}>Tema #{classItem.id}</span>
          </div>

          {/* Adjacent Theme Navigation Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {adjacent.prev && (
              <Link
                href={`/aula/${adjacent.prev.id}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: "var(--card-bg)",
                  border: "1px solid var(--sinal)",
                  color: "var(--neblina)",
                  fontSize: "12px",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Tema #{adjacent.prev.id}
              </Link>
            )}

            {adjacent.next && (
              <Link
                href={`/aula/${adjacent.next.id}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: "var(--card-bg)",
                  border: "1px solid var(--sinal)",
                  color: "var(--neblina)",
                  fontSize: "12px",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                Tema #{adjacent.next.id}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            )}
          </div>
        </div>

        {/* Top Header: Title, Badges & Action CTAs */}
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: "16px",
            padding: "24px 28px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div style={{ flex: 1, minWidth: "300px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: "6px",
                  background: "rgba(0, 194, 168, 0.15)",
                  color: "var(--pulso)",
                  border: "1px solid rgba(0, 194, 168, 0.3)",
                }}
              >
                {classItem.coreArea}
              </span>
              <span style={{ fontSize: "12px", color: "var(--chumbo)", fontWeight: 500 }}>
                {classItem.subspecialty}
              </span>
              <span style={{ fontSize: "12px", color: "var(--chumbo)" }}>•</span>
              <span style={{ fontSize: "12px", color: "var(--chumbo)" }}>
                Estimativa: {classItem.estimatedMinutes} min
              </span>
            </div>

            <h1
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: "var(--heading-color)",
                lineHeight: "1.3",
                margin: "0 0 10px 0",
              }}
            >
              {classItem.title}
            </h1>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {classItem.subtopics.map((st, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: "11px",
                    background: "var(--subtle-bg, rgba(255,255,255,0.04))",
                    border: "1px solid var(--sinal)",
                    color: "var(--neblina)",
                    padding: "3px 8px",
                    borderRadius: "4px",
                  }}
                >
                  {st}
                </span>
              ))}
            </div>
          </div>

          {/* Action CTAs: Complete Button + Dr. Pleni Button */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={handleToggleComplete}
              disabled={savingProgress}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                background: progress.completed ? "#10B981" : "var(--card-bg)",
                border: progress.completed ? "1px solid #10B981" : "1px solid var(--sinal)",
                color: progress.completed ? "#0D111C" : "var(--heading-color)",
                transition: "all 0.2s ease",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                {progress.completed ? (
                  <polyline points="20 6 9 17 4 12" />
                ) : (
                  <circle cx="12" cy="12" r="9" />
                )}
              </svg>
              {progress.completed ? "Aula Concluída" : "Marcar como Concluída"}
            </button>

            <Link
              href={`/ia-medica?context=${encodeURIComponent(`Dúvida sobre a aula: ${classItem.title} (${classItem.coreArea} - ${classItem.subspecialty}). Subtópicos: ${classItem.subtopics.join(", ")}`)}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 700,
                background: "rgba(0, 194, 168, 0.12)",
                border: "1px solid var(--pulso)",
                color: "var(--pulso)",
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Tirar Dúvida com Dr. Pleni IA
            </Link>
          </div>
        </div>

        {/* Main Content Layout: 2 Columns */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px" }}>
          
          {/* LEFT COLUMN: Players & Tabbed Materials */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* 1. Video Masterclass Player */}
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "16px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 20px",
                  background: "var(--subtle-bg, rgba(255,255,255,0.02))",
                  borderBottom: "1px solid var(--sinal)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--pulso)" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--heading-color)" }}>
                    Vídeo-Masterclass de Alto Rendimento
                  </span>
                </div>
                <span style={{ fontSize: "12px", color: "var(--chumbo)", fontWeight: 500 }}>
                  Resolução 1080p • 25 min
                </span>
              </div>

              {/* 16:9 Video Canvas / Embed Container */}
              <div
                style={{
                  width: "100%",
                  aspectRatio: "16 / 9",
                  background: "#080B11",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Visual Medical Backdrop with Play Button */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "30px",
                    maxWidth: "500px",
                  }}
                >
                  <button
                    onClick={() => {
                      const newWatch = progress.videoWatchPercent > 0 ? 100 : 50;
                      setProgress({ ...progress, videoWatchPercent: newWatch });
                    }}
                    style={{
                      width: "68px",
                      height: "68px",
                      borderRadius: "34px",
                      background: "var(--pulso)",
                      border: "none",
                      color: "#0D111C",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      boxShadow: "0 0 30px rgba(0, 194, 168, 0.4)",
                      marginBottom: "16px",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="6 3 20 12 6 21 6 3" />
                    </svg>
                  </button>

                  <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#FFFFFF", margin: "0 0 6px 0" }}>
                    {classItem.title}
                  </h3>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", margin: 0 }}>
                    Foco total nos padrões de cobrança da USP, ENARE, UNICAMP e SUS-SP.
                  </p>
                </div>

                {/* Bottom Video Progress Bar Overlay */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "10px 16px",
                    background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <span style={{ fontSize: "11px", color: "#FFFFFF", fontFamily: "monospace" }}>00:00</span>
                  <div
                    style={{
                      flex: 1,
                      height: "4px",
                      background: "rgba(255,255,255,0.2)",
                      borderRadius: "2px",
                      position: "relative",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: `${progress.videoWatchPercent}%`,
                        height: "100%",
                        background: "var(--pulso)",
                        borderRadius: "2px",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "11px", color: "#FFFFFF", fontFamily: "monospace" }}>25:00</span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--pulso)",
                      fontWeight: 600,
                      background: "rgba(0, 194, 168, 0.2)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    {progress.videoWatchPercent}% visto
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Audio Podcast Player */}
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "16px",
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "rgba(59, 130, 246, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#3B82F6",
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--heading-color)" }}>
                      Áudio-Revisão Express (Podcast Clínico)
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--chumbo)" }}>
                      Ideal para fixação rápida durante deslocamentos e plantões
                    </div>
                  </div>
                </div>

                {/* Speed Toggle */}
                <div style={{ display: "flex", gap: "4px", background: "var(--subtle-bg, rgba(255,255,255,0.03))", padding: "2px", borderRadius: "8px", border: "1px solid var(--sinal)" }}>
                  {[1, 1.25, 1.5, 2].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setAudioSpeed(spd)}
                      style={{
                        padding: "4px 8px",
                        fontSize: "11px",
                        fontWeight: 600,
                        borderRadius: "6px",
                        border: "none",
                        background: audioSpeed === spd ? "var(--pulso)" : "transparent",
                        color: audioSpeed === spd ? "#0D111C" : "var(--neblina)",
                        cursor: "pointer",
                      }}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio Controls & Scrubber */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <button
                  onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "21px",
                    background: isPlayingAudio ? "#3B82F6" : "var(--subtle-bg, rgba(255,255,255,0.08))",
                    border: "1px solid var(--sinal)",
                    color: isPlayingAudio ? "#FFFFFF" : "var(--heading-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  {isPlayingAudio ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  )}
                </button>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const percent = Math.round((clickX / rect.width) * 100);
                      setAudioProgress(percent);
                    }}
                    style={{
                      width: "100%",
                      height: "6px",
                      background: "var(--sinal)",
                      borderRadius: "3px",
                      cursor: "pointer",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: `${audioProgress}%`,
                        height: "100%",
                        background: "#3B82F6",
                        borderRadius: "3px",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--chumbo)" }}>
                    <span>{Math.floor((audioProgress * 12) / 100)}:00</span>
                    <span>12:00 min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Study Materials Tab Bar */}
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "16px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  borderBottom: "1px solid var(--sinal)",
                  background: "var(--subtle-bg, rgba(255,255,255,0.02))",
                  overflowX: "auto",
                }}
              >
                {[
                  { id: "slides", label: "Slide Resumo", icon: "📑" },
                  { id: "mapa", label: "Mapa Mental Clínico", icon: "🧠" },
                  { id: "infografico", label: "Lâmina de Infográfico", icon: "📊" },
                  { id: "quiz", label: "Quiz de Fixação (3)", icon: "⚡" },
                  { id: "questoes", label: "Questões de Residência", icon: "📝" },
                ].map((t) => {
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as any)}
                      style={{
                        padding: "14px 18px",
                        fontSize: "13px",
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? "var(--pulso)" : "var(--neblina)",
                        background: isActive ? "rgba(0, 194, 168, 0.08)" : "transparent",
                        border: "none",
                        borderBottom: isActive ? "2px solid var(--pulso)" : "2px solid transparent",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Body */}
              <div style={{ padding: "24px" }}>
                
                {/* TAB 1: SLIDE RESUMO */}
                {activeTab === "slides" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <span style={{ fontSize: "12px", color: "var(--chumbo)", fontWeight: 600 }}>
                        Lâmina {activeSlideIndex + 1} de {slidesContent.length}
                      </span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          disabled={activeSlideIndex === 0}
                          onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "1px solid var(--sinal)",
                            background: "transparent",
                            color: activeSlideIndex === 0 ? "var(--chumbo)" : "var(--heading-color)",
                            cursor: activeSlideIndex === 0 ? "not-allowed" : "pointer",
                            fontSize: "12px",
                          }}
                        >
                          ← Anterior
                        </button>
                        <button
                          disabled={activeSlideIndex === slidesContent.length - 1}
                          onClick={() => setActiveSlideIndex((prev) => Math.min(slidesContent.length - 1, prev + 1))}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "1px solid var(--sinal)",
                            background: "transparent",
                            color: activeSlideIndex === slidesContent.length - 1 ? "var(--chumbo)" : "var(--heading-color)",
                            cursor: activeSlideIndex === slidesContent.length - 1 ? "not-allowed" : "pointer",
                            fontSize: "12px",
                          }}
                        >
                          Próximo →
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        background: "linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(0, 194, 168, 0.04) 100%)",
                        border: "1px solid var(--sinal)",
                        borderRadius: "14px",
                        padding: "24px",
                      }}
                    >
                      <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--heading-color)", margin: "0 0 16px 0" }}>
                        {slidesContent[activeSlideIndex].title}
                      </h3>

                      <ul style={{ paddingLeft: "20px", margin: "0 0 20px 0", display: "flex", flexDirection: "column", gap: "10px" }}>
                        {slidesContent[activeSlideIndex].bullets.map((b, idx) => (
                          <li key={idx} style={{ fontSize: "14px", color: "var(--neblina)", lineHeight: "1.5" }}>
                            {b}
                          </li>
                        ))}
                      </ul>

                      <div
                        style={{
                          background: "rgba(0, 194, 168, 0.1)",
                          borderLeft: "3px solid var(--pulso)",
                          padding: "12px 16px",
                          borderRadius: "0 8px 8px 0",
                          fontSize: "13px",
                          color: "var(--pulso)",
                          fontWeight: 600,
                        }}
                      >
                        {slidesContent[activeSlideIndex].keyTakeaway}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: MAPA MENTAL CLÍNICO */}
                {activeTab === "mapa" && (
                  <div>
                    <div style={{ marginBottom: "16px" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--heading-color)", margin: "0 0 4px 0" }}>
                        Fluxograma de Decisão Clínica & Conduta
                      </h3>
                      <p style={{ fontSize: "12px", color: "var(--chumbo)", margin: 0 }}>
                        Estrutura lógica ramificada para resolução de casos clínicos em tempo recorde.
                      </p>
                    </div>

                    <div
                      style={{
                        background: "var(--subtle-bg, rgba(255,255,255,0.02))",
                        border: "1px solid var(--sinal)",
                        borderRadius: "12px",
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "14px",
                      }}
                    >
                      {/* Flow Node 1 */}
                      <div
                        style={{
                          background: "rgba(0, 194, 168, 0.12)",
                          border: "1px solid var(--pulso)",
                          borderRadius: "10px",
                          padding: "12px 16px",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--pulso)", textTransform: "uppercase" }}>Etapa 1: Triagem & Suspeita</div>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--heading-color)", marginTop: "2px" }}>
                          Quadro Clínico Compatível + Identificação de Fatores de Risco
                        </div>
                      </div>

                      <div style={{ textAlign: "center", color: "var(--chumbo)" }}>↓</div>

                      {/* Flow Node 2: Decision Split */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div
                          style={{
                            background: "rgba(239, 68, 68, 0.08)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            borderRadius: "10px",
                            padding: "12px",
                          }}
                        >
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#EF4444" }}>RED FLAGS PRESENTES</div>
                          <div style={{ fontSize: "12px", color: "var(--neblina)", marginTop: "4px" }}>
                            Instabilidade, refratariedade ou falência orgânica ➔ <strong>Internação / UTI Imediata + Terapia Venosa</strong>
                          </div>
                        </div>

                        <div
                          style={{
                            background: "rgba(16, 185, 129, 0.08)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            borderRadius: "10px",
                            padding: "12px",
                          }}
                        >
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#10B981" }}>CASO ESTÁVEL / LEVE</div>
                          <div style={{ fontSize: "12px", color: "var(--neblina)", marginTop: "4px" }}>
                            Estratificação de baixo risco ➔ <strong>Tratamento Ambulatorial / VO + Orientações de Alarme</strong>
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: "center", color: "var(--chumbo)" }}>↓</div>

                      {/* Flow Node 3 */}
                      <div
                        style={{
                          background: "var(--card-bg)",
                          border: "1px solid var(--sinal)",
                          borderRadius: "10px",
                          padding: "12px 16px",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--chumbo)", textTransform: "uppercase" }}>Etapa 3: Reavaliação & Alta Segura</div>
                        <div style={{ fontSize: "13px", color: "var(--neblina)", marginTop: "2px" }}>
                          Controle de marcadores evolutivos e plano terapêutico de manutenção preventiva.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: INFOGRÁFICO & TABELAS */}
                {activeTab === "infografico" && (
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--heading-color)", margin: "0 0 14px 0" }}>
                      Tabela Rápida de Doses, Critérios e Condutas
                    </h3>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <div style={{ background: "var(--subtle-bg, rgba(255,255,255,0.02))", border: "1px solid var(--sinal)", borderRadius: "10px", padding: "16px" }}>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--pulso)", marginBottom: "8px" }}>
                          Critérios de Gravidade
                        </div>
                        <p style={{ fontSize: "13px", color: "var(--neblina)", lineHeight: "1.5", margin: 0 }}>
                          Avalie escore CURB-65 / Glasgow / Child-Pugh conforme aplicável a esta patologia. Sempre checar perfusão periférica, lactato sérico e débito urinário (&gt; 0.5 mL/kg/h).
                        </p>
                      </div>

                      <div style={{ background: "var(--subtle-bg, rgba(255,255,255,0.02))", border: "1px solid var(--sinal)", borderRadius: "10px", padding: "16px" }}>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#3B82F6", marginBottom: "8px" }}>
                          Drogas de Primeira Linha
                        </div>
                        <p style={{ fontSize: "13px", color: "var(--neblina)", lineHeight: "1.5", margin: 0 }}>
                          Administrar dose de ataque conforme peso corpóreo. Ajustar posologia estritamente pelo clearance de creatinina se TFG &lt; 50 mL/min.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: QUIZ DE FIXAÇÃO */}
                {activeTab === "quiz" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--heading-color)", margin: "0 0 4px 0" }}>
                          Quiz de Fixação Imediata
                        </h3>
                        <p style={{ fontSize: "12px", color: "var(--chumbo)", margin: 0 }}>
                          Responda às 3 questões para fixar os conceitos mais quentes cobrados nas provas.
                        </p>
                      </div>

                      {submittedQuiz && (
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 700,
                            padding: "6px 14px",
                            borderRadius: "8px",
                            background: "rgba(0, 194, 168, 0.15)",
                            color: "var(--pulso)",
                            border: "1px solid var(--pulso)",
                          }}
                        >
                          Nota: {progress.quizScore}%
                        </div>
                      )}
                    </div>

                    {mockQuizQuestions.map((q, qIdx) => {
                      const selectedOpt = selectedAnswers[qIdx];
                      const isAnswered = selectedOpt !== undefined;

                      return (
                        <div
                          key={q.id}
                          style={{
                            background: "var(--subtle-bg, rgba(255,255,255,0.02))",
                            border: "1px solid var(--sinal)",
                            borderRadius: "12px",
                            padding: "18px",
                          }}
                        >
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--heading-color)", lineHeight: "1.4", marginBottom: "14px" }}>
                            <strong style={{ color: "var(--pulso)", marginRight: "6px" }}>Q{qIdx + 1}.</strong>
                            {q.question}
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {q.options.map((opt, optIdx) => {
                              const isSelected = selectedOpt === optIdx;
                              let optBg = "var(--input-bg, rgba(255,255,255,0.03))";
                              let optBorder = "1px solid var(--sinal)";
                              let optColor = "var(--neblina)";

                              if (submittedQuiz) {
                                if (optIdx === q.correctIndex) {
                                  optBg = "rgba(16, 185, 129, 0.15)";
                                  optBorder = "1px solid #10B981";
                                  optColor = "#10B981";
                                } else if (isSelected) {
                                  optBg = "rgba(239, 68, 68, 0.15)";
                                  optBorder = "1px solid #EF4444";
                                  optColor = "#EF4444";
                                }
                              } else if (isSelected) {
                                optBg = "rgba(0, 194, 168, 0.12)";
                                optBorder = "1px solid var(--pulso)";
                                optColor = "var(--pulso)";
                              }

                              return (
                                <button
                                  key={optIdx}
                                  onClick={() => handleSelectAnswer(qIdx, optIdx)}
                                  disabled={submittedQuiz}
                                  style={{
                                    textAlign: "left",
                                    padding: "12px 14px",
                                    borderRadius: "8px",
                                    background: optBg,
                                    border: optBorder,
                                    color: optColor,
                                    fontSize: "13px",
                                    cursor: submittedQuiz ? "default" : "pointer",
                                    transition: "all 0.15s ease",
                                    lineHeight: "1.4",
                                  }}
                                >
                                  <strong>{String.fromCharCode(65 + optIdx)})</strong> {opt}
                                </button>
                              );
                            })}
                          </div>

                          {submittedQuiz && (
                            <div
                              style={{
                                marginTop: "12px",
                                padding: "12px",
                                borderRadius: "8px",
                                background: "rgba(0, 194, 168, 0.06)",
                                border: "1px solid rgba(0, 194, 168, 0.2)",
                                fontSize: "12px",
                                color: "var(--neblina)",
                                lineHeight: "1.5",
                              }}
                            >
                              <strong style={{ color: "var(--pulso)" }}>Comentário do Preceptor: </strong>
                              {q.rationale}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {!submittedQuiz && (
                      <button
                        onClick={handleFinishQuiz}
                        disabled={Object.keys(selectedAnswers).length < mockQuizQuestions.length}
                        style={{
                          padding: "12px",
                          borderRadius: "10px",
                          background: Object.keys(selectedAnswers).length < mockQuizQuestions.length ? "var(--sinal)" : "var(--pulso)",
                          color: "#0D111C",
                          fontWeight: 700,
                          fontSize: "14px",
                          border: "none",
                          cursor: Object.keys(selectedAnswers).length < mockQuizQuestions.length ? "not-allowed" : "pointer",
                        }}
                      >
                        Enviar Respostas e Ver Gabarito Comentado
                      </button>
                    )}
                  </div>
                )}

                {/* TAB 5: QUESTÕES DE RESIDÊNCIA */}
                {activeTab === "questoes" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--heading-color)", margin: "0 0 4px 0" }}>
                          Bateria de Questões Oficiais Relacionadas
                        </h3>
                        <p style={{ fontSize: "12px", color: "var(--chumbo)", margin: 0 }}>
                          Questões reais de provas anteriores mapeadas para este tema específico.
                        </p>
                      </div>

                      <Link
                        href={`/simulado/quick?tema=${encodeURIComponent(classItem.title)}`}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "8px",
                          background: "var(--pulso)",
                          color: "#0D111C",
                          fontSize: "12px",
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        Treinar em Simulado ➔
                      </Link>
                    </div>

                    {[
                      { banca: "USP-SP 2024", enunciado: `Paciente com diagnóstico confirmado de ${classItem.title} evolui no 3º DPO com febre e taquicardia. A conduta mandatória é...` },
                      { banca: "ENARE 2024", enunciado: `Em relação à prevenção secundária e rastreio de complicações em ${classItem.subspecialty}, assinale a alternativa correta.` },
                      { banca: "UNICAMP 2023", enunciado: `Lactente / adulto jovem admitido no pronto socorro com quadro de ${classItem.title}. Indique o exame com maior sensibilidade inicial.` },
                    ].map((q, i) => (
                      <div
                        key={i}
                        style={{
                          background: "var(--subtle-bg, rgba(255,255,255,0.02))",
                          border: "1px solid var(--sinal)",
                          borderRadius: "10px",
                          padding: "14px 16px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "14px",
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "var(--pulso)",
                              background: "rgba(0, 194, 168, 0.1)",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              marginRight: "8px",
                            }}
                          >
                            {q.banca}
                          </span>
                          <span style={{ fontSize: "13px", color: "var(--neblina)" }}>
                            {q.enunciado}
                          </span>
                        </div>

                        <Link
                          href="/questoes"
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "1px solid var(--sinal)",
                            color: "var(--neblina)",
                            fontSize: "12px",
                            textDecoration: "none",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Resolver
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sidebar (Aulas da Disciplina + Anotações) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* 1. Checklist de Domínio */}
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "14px",
                padding: "18px 20px",
              }}
            >
              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--heading-color)", margin: "0 0 12px 0" }}>
                Checklist do Tema
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--neblina)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={progress.videoWatchPercent > 0}
                    onChange={(e) => setProgress({ ...progress, videoWatchPercent: e.target.checked ? 100 : 0 })}
                  />
                  <span>Vídeo assistido ({progress.videoWatchPercent}%)</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--neblina)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={audioProgress > 0}
                    onChange={(e) => setAudioProgress(e.target.checked ? 100 : 0)}
                  />
                  <span>Áudio-Revisão ouvida</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--neblina)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={submittedQuiz}
                    readOnly
                  />
                  <span>Quiz de fixação respondido</span>
                </label>
              </div>
            </div>

            {/* 2. Anotações Pessoais do Aluno */}
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "14px",
                padding: "18px 20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--heading-color)", margin: 0 }}>
                  Anotações da Aula
                </h4>
                <span style={{ fontSize: "10px", color: "var(--chumbo)" }}>Salvo automaticamente</span>
              </div>
              <textarea
                value={progress.notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Escreva seus mnemônicos, dúvidas e pontos de revisão para este tema..."
                rows={5}
                style={{
                  width: "100%",
                  background: "var(--input-bg, rgba(255,255,255,0.03))",
                  border: "1px solid var(--sinal)",
                  borderRadius: "8px",
                  padding: "10px",
                  color: "var(--heading-color)",
                  fontSize: "12px",
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* 3. Próximas Aulas da Mesma Especialidade */}
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "14px",
                padding: "18px 20px",
              }}
            >
              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--heading-color)", margin: "0 0 12px 0" }}>
                Mais em {classItem.subspecialty}
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {ALL_CLASSES_CATALOG.filter((c) => c.subspecialty === classItem.subspecialty && c.id !== classItem.id)
                  .slice(0, 6)
                  .map((relClass) => (
                    <Link
                      key={relClass.id}
                      href={`/aula/${relClass.id}`}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: "var(--subtle-bg, rgba(255,255,255,0.02))",
                        border: "1px solid var(--sinal)",
                        textDecoration: "none",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--heading-color)" }}>
                        #{relClass.id} {relClass.title}
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--chumbo)" }}>
                        {relClass.estimatedMinutes} min
                      </span>
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
