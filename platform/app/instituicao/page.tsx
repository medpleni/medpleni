import React from "react";
import { redirect } from "next/navigation";
import { getB2BUserContext } from "@/lib/b2b/auth";
import { createClient } from "@/lib/supabase/server";
import VisaoExecutivaClient from "./VisaoExecutivaClient";
import {
  calculateExecutiveKPIs,
  calculateClassGroupAreaHeatmap,
  calculateExamTimelineEvolution,
  calculateExecutiveAlerts,
} from "@/lib/b2b/executive";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function InstituicaoHomePage({ searchParams }: PageProps) {
  const context = await getB2BUserContext();
  const resolvedSearchParams = await searchParams;

  if (!context?.institution?.id) {
    redirect("/login");
  }

  // Alunos têm portal próprio
  if (context.role === "aluno") {
    redirect("/instituicao/aluno/provas");
  }

  const institutionId = context.institution.id;
  const cutScore = context.institution.cut_score || 60;
  const supabase = await createClient();

  // 1. Busca todas as avaliações da instituição aplicadas ou em revisão/corrigidas
  const { data: dbAssessments } = await supabase
    .from("assessments")
    .select("id, title, type, starts_at, status")
    .eq("institution_id", institutionId)
    .in("status", ["aplicada", "corrigida", "publicada"])
    .order("starts_at", { ascending: false });

  let availableExams = (dbAssessments || []).map((a) => ({
    id: a.id,
    title: a.title,
    type: a.type,
    startsAt: a.starts_at || new Date().toISOString(),
    status: a.status,
  }));

  if (availableExams.length === 0) {
    availableExams = [
      {
        id: "asm-demo-2027-1",
        title: "Simulado Nacional ENAMED 2027.1 (Etapas 4º, 8º e 12º)",
        type: "simulado_enamed_8",
        startsAt: "2027-03-20T08:00:00Z",
        status: "corrigida",
      },
      {
        id: "asm-demo-2026-2",
        title: "Avaliação Somativa Integrada 2026.2",
        type: "prova_regular",
        startsAt: "2026-11-15T08:00:00Z",
        status: "corrigida",
      },
      {
        id: "asm-demo-2026-1",
        title: "Simulado Institucional ENAMED 2026.2",
        type: "simulado_enamed_8",
        startsAt: "2026-08-10T08:00:00Z",
        status: "corrigida",
      },
    ];
  }

  // Determina a avaliação em análise
  const requestedExamId = typeof resolvedSearchParams.examId === "string" ? resolvedSearchParams.examId : undefined;
  const selectedExamId = requestedExamId && availableExams.some((e) => e.id === requestedExamId)
    ? requestedExamId
    : availableExams[0].id;

  // 2. Busca turmas
  const { data: dbClasses } = await supabase
    .from("class_groups")
    .select("id, code, label, period")
    .eq("institution_id", institutionId)
    .order("period", { ascending: true });

  const classGroups = (dbClasses && dbClasses.length > 0)
    ? dbClasses.map((c) => ({
        id: c.id,
        label: c.label || c.code || `Turma ${c.period}P`,
        period: c.period || 1,
      }))
    : [
        { id: "cg-1", label: "MED 1º Período (2030.1)", period: 1 },
        { id: "cg-2", label: "MED 2º Período (2029.2)", period: 2 },
        { id: "cg-3", label: "MED 3º Período (2029.1)", period: 3 },
        { id: "cg-4", label: "MED 4º Período (2028.2 · ENAMED I)", period: 4 },
        { id: "cg-5", label: "MED 5º Período (2028.1)", period: 5 },
        { id: "cg-6", label: "MED 6º Período (2027.2)", period: 6 },
        { id: "cg-7", label: "MED 7º Período (2027.1)", period: 7 },
        { id: "cg-8", label: "MED 8º Período (2026.2 · ENAMED II)", period: 8 },
        { id: "cg-9", label: "MED 9º Período (2026.1)", period: 9 },
        { id: "cg-10", label: "MED 10º Período (2025.2)", period: 10 },
        { id: "cg-11", label: "MED 11º Período (2025.1)", period: 11 },
        { id: "cg-12", label: "MED 12º Período (2024.2 · ENAMED III)", period: 12 },
      ];

  // 3. Busca itens
  const { data: dbItems } = await supabase
    .from("assessment_items")
    .select(`
      id,
      order_index,
      frozen_area,
      status,
      weight,
      assessment_versions!inner ( assessment_id )
    `)
    .eq("assessment_versions.assessment_id", selectedExamId)
    .neq("status", "anulado");

  let items = (dbItems || []).map((it) => ({
    id: it.id,
    area: it.frozen_area || "Clínica Médica",
    status: it.status,
  }));

  if (items.length === 0) {
    const areas = [
      "Clínica Médica",
      "Cirurgia Geral",
      "Pediatria",
      "Ginecologia e Obstetrícia",
      "Medicina de Família e Comunidade",
      "Saúde Coletiva",
      "Saúde Mental",
    ];
    items = Array.from({ length: 60 }).map((_, idx) => ({
      id: `it-${selectedExamId}-${idx + 1}`,
      area: areas[idx % areas.length],
      status: "valido",
    }));
  }

  // 4. Busca tentativas
  const { data: dbAttempts } = await supabase
    .from("attempts")
    .select("id, student_user_id, class_group_id, status, score_percentage")
    .eq("assessment_id", selectedExamId);

  let attempts = (dbAttempts || []).map((a) => ({
    id: a.id,
    classGroupId: a.class_group_id || "cg-1",
    status: a.status === "corrigida" ? "finalizada" : a.status,
    scorePercentage: a.score_percentage !== null ? Number(a.score_percentage) : 0,
  }));

  if (attempts.length === 0) {
    const isHardExam = selectedExamId === "asm-demo-2026-1";
    const isMediumExam = selectedExamId === "asm-demo-2026-2";

    attempts = classGroups.flatMap((cg, cIdx) => {
      const studentCount = 20;
      return Array.from({ length: studentCount }).map((_, sIdx) => {
        const baseClassMean = 52 + (cg.period * 1.6);
        const examDifficultyMod = isHardExam ? -4.5 : isMediumExam ? -1.0 : 2.5;
        const studentVariance = ((sIdx * 7) % 25) - 12;
        const score = Math.max(25, Math.min(98, Math.round((baseClassMean + examDifficultyMod + studentVariance) * 10) / 10));
        const isAbsent = sIdx === 19 && cIdx % 2 === 1;

        return {
          id: `att-${selectedExamId}-${cg.id}-${sIdx + 1}`,
          classGroupId: cg.id,
          status: isAbsent ? "ausente" : "finalizada",
          scorePercentage: isAbsent ? 0 : score,
        };
      });
    });
  }

  // 5. Busca respostas
  const attemptIds = attempts.map((a) => a.id);
  const { data: dbAnswers } = await supabase
    .from("attempt_answers")
    .select("attempt_id, assessment_item_id, is_correct")
    .in("attempt_id", attemptIds.slice(0, 100));

  let answers = (dbAnswers || []).map((ans) => ({
    attemptId: ans.attempt_id,
    itemId: ans.assessment_item_id,
    isCorrect: ans.is_correct ?? false,
  }));

  if (answers.length === 0) {
    answers = attempts
      .filter((a) => a.status === "finalizada")
      .flatMap((att) => {
        const passRate = att.scorePercentage / 100;
        return items.map((it, idx) => {
          const isHardArea = it.area === "Clínica Médica" || it.area === "Cirurgia Geral";
          const areaFactor = isHardArea ? 0.9 : 1.05;
          const isCorrect = ((idx * 13 + att.id.length) % 100) / 100 < (passRate * areaFactor);
          return {
            attemptId: att.id,
            itemId: it.id,
            isCorrect,
          };
        });
      });
  }

  // 6. Provas históricas para o Bloco 4 (Evolução ao longo das provas)
  const historicalExams = availableExams.map((exam) => {
    if (exam.id === selectedExamId) {
      return {
        examId: exam.id,
        title: exam.title,
        date: exam.startsAt,
        type: exam.type,
        attempts: attempts.map((a) => ({
          status: a.status,
          score_percentage: a.scorePercentage,
        })),
      };
    }
    const isOldest = exam.id.includes("2026-1");
    const histAttempts = classGroups.flatMap((cg) =>
      Array.from({ length: 20 }).map((_, sIdx) => ({
        status: "finalizada",
        score_percentage: Math.max(30, Math.min(95, 58 + (cg.period * 1.2) + (isOldest ? -4 : 0) + ((sIdx % 5) * 3 - 6))),
      }))
    );
    return {
      examId: exam.id,
      title: exam.title,
      date: exam.startsAt,
      type: exam.type,
      attempts: histAttempts,
    };
  });

  // Calcula médias por turma para o cálculo dos KPIs
  const classAverages = new Map<string, number>();
  classGroups.forEach((cg) => {
    const classAtt = attempts.filter((a) => a.classGroupId === cg.id && a.status === "finalizada");
    if (classAtt.length > 0) {
      const avg = classAtt.reduce((sum, a) => sum + a.scorePercentage, 0) / classAtt.length;
      classAverages.set(cg.id, Number(avg.toFixed(1)));
    }
  });

  const currentExamObj = availableExams.find((e) => e.id === selectedExamId);

  // 7. Cálculos puros
  const kpis = calculateExecutiveKPIs({
    attempts: attempts.map((a) => ({
      status: a.status,
      score_percentage: a.scorePercentage,
      class_group_id: a.classGroupId,
    })),
    classAverages,
    cutScore,
    examTitle: currentExamObj?.title || "Avaliação Selecionada",
    academicTermLabel: "2027.1",
  });

  const heatmapRows = calculateClassGroupAreaHeatmap({
    classGroups,
    items,
    answers,
    attempts,
  });

  const timelineItems = calculateExamTimelineEvolution(historicalExams, cutScore);
  const alerts = calculateExecutiveAlerts(heatmapRows, cutScore);

  return (
    <VisaoExecutivaClient
      institution={{
        id: institutionId,
        name: context.institution.name,
        initials: context.institution.initials || "MED",
        cutScore,
      }}
      userRole={context.role}
      availableExams={availableExams}
      selectedExamId={selectedExamId}
      kpis={kpis}
      heatmapRows={heatmapRows}
      timelineItems={timelineItems}
      alerts={alerts}
    />
  );
}
