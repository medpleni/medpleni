import React from "react";
import { redirect } from "next/navigation";
import { getB2BUserContext } from "@/lib/b2b/auth";
import { createClient } from "@/lib/supabase/server";
import ProntidaoClient from "./ProntidaoClient";
import {
  DEFAULT_READINESS_CONFIG,
  calculateClassReadinessDistribution,
  type ReadinessConfig,
  type StudentReadinessInput,
} from "@/lib/b2b/readiness";

export default async function ProntidaoPage() {
  const context = await getB2BUserContext();

  if (!context?.institution?.id) {
    redirect("/login");
  }

  const institution = context.institution;
  const instSettings = institution.settings || {};
  const readinessRaw = (instSettings as any)?.readiness;

  const config: ReadinessConfig = {
    volumeRuleEnabled: readinessRaw?.volumeRuleEnabled ?? DEFAULT_READINESS_CONFIG.volumeRuleEnabled,
    minQuestionsYear: readinessRaw?.minQuestionsYear ?? DEFAULT_READINESS_CONFIG.minQuestionsYear,
    consistencyRuleEnabled: readinessRaw?.consistencyRuleEnabled ?? DEFAULT_READINESS_CONFIG.consistencyRuleEnabled,
    minScorePercent: readinessRaw?.minScorePercent ?? DEFAULT_READINESS_CONFIG.minScorePercent,
    minExamsCount: readinessRaw?.minExamsCount ?? DEFAULT_READINESS_CONFIG.minExamsCount,
    levelLabels: {
      high: readinessRaw?.levelLabels?.high || DEFAULT_READINESS_CONFIG.levelLabels.high,
      medium: readinessRaw?.levelLabels?.medium || DEFAULT_READINESS_CONFIG.levelLabels.medium,
      low: readinessRaw?.levelLabels?.low || DEFAULT_READINESS_CONFIG.levelLabels.low,
    },
    showToStudents: readinessRaw?.showToStudents ?? DEFAULT_READINESS_CONFIG.showToStudents,
  };

  // Se for aluno e a opção de mostrar estiver desmarcada, redireciona para seu portal
  if (context.role === "aluno" && !config.showToStudents) {
    redirect("/instituicao/aluno");
  }

  const supabase = await createClient();

  // 1. Busca turmas ativas da instituição
  let classQuery = supabase
    .from("class_groups")
    .select("id, code, label, period")
    .eq("institution_id", institution.id)
    .order("period", { ascending: true });

  if (context.role === "docente" && context.scopedClassGroupIds.length > 0) {
    classQuery = classQuery.in("id", context.scopedClassGroupIds);
  }

  const { data: dbClasses } = await classQuery;

  const classes =
    dbClasses && dbClasses.length > 0
      ? dbClasses.map((c) => ({
          id: c.id,
          label: c.label || c.code || `Turma ${c.period}P`,
          period: c.period || 1,
        }))
      : [
          { id: "cg-1", label: "MED 1º Período (2030.1)", period: 1 },
          { id: "cg-4", label: "MED 4º Período (2028.2 · ENAMED I)", period: 4 },
          { id: "cg-8", label: "MED 8º Período (2026.2 · ENAMED II)", period: 8 },
          { id: "cg-12", label: "MED 12º Período (2024.2 · ENAMED III)", period: 12 },
        ];

  // 2. Busca estudantes matriculados
  const classIds = classes.map((c) => c.id);
  const { data: dbEnrollments } = await supabase
    .from("enrollments")
    .select(`
      id,
      student_registration,
      class_group_id,
      institution_members!inner (
        user_id,
        profiles (
          full_name
        )
      )
    `)
    .in("class_group_id", classIds);

  // 3. Monta lista de estudantes para prontidão (com fallback demo rico para FADEP)
  let rawStudents: StudentReadinessInput[] = [];

  if (dbEnrollments && dbEnrollments.length > 0) {
    rawStudents = dbEnrollments.map((e: any, idx) => {
      const studentUserId = e.institution_members?.user_id || `usr-st-${idx}`;
      const studentName = e.institution_members?.profiles?.full_name || `Estudante ${idx + 1}`;
      const classId = e.class_group_id;
      const classObj = classes.find((c) => c.id === classId);

      // Simulação sintética baseada no índice para demonstração rica da FADEP
      const questionsCount = 3500 + ((idx * 850) % 9000);
      const examHistory = [
        { examId: "asm-1", examTitle: "Simulado 1", date: "2026-03-20", scorePercentage: 52 + ((idx * 7) % 30) },
        { examId: "asm-2", examTitle: "Simulado 2", date: "2026-06-15", scorePercentage: 54 + ((idx * 5) % 28) },
        { examId: "asm-3", examTitle: "Simulado 3", date: "2026-09-10", scorePercentage: 58 + ((idx * 9) % 25) },
      ];

      return {
        studentUserId,
        studentName,
        registration: e.student_registration || `2026${String(idx + 1).padStart(4, "0")}`,
        classGroupId: classId,
        classGroupLabel: classObj?.label || "Turma MED",
        questionsAnsweredCount: questionsCount,
        examHistory,
      };
    });
  }

  if (rawStudents.length === 0) {
    const demoNames = [
      "Ana Beatriz Lourenço", "Lucas Mendes Vilela", "Juliana Duarte Sampaio",
      "Carlos Eduardo Guimarães", "Mariana Vasconcelos", "Pedro Henrique Rocha",
      "Camila Figueira", "Rafael Nogueira", "Gabriela Bastos",
      "Felipe Albuquerque", "Larissa Peixoto", "Bruno Carvalho",
      "Beatriz Ramos", "Thiago Siqueira", "Fernanda Paiva", "Rodrigo Diniz",
    ];

    rawStudents = demoNames.map((name, idx) => {
      const classObj = classes[idx % classes.length];
      const isHighVolume = idx % 3 === 0;
      const questions = isHighVolume ? 10400 + idx * 200 : 4200 + idx * 450;
      const scores = [
        55 + (idx % 25),
        60 + ((idx * 3) % 22),
        62 + ((idx * 2) % 20),
      ];

      return {
        studentUserId: `st-demo-${idx + 1}`,
        studentName: name,
        registration: `2026${String(idx + 101).padStart(4, "0")}`,
        classGroupId: classObj.id,
        classGroupLabel: classObj.label,
        questionsAnsweredCount: questions,
        examHistory: scores.map((s, exIdx) => ({
          examId: `asm-${exIdx + 1}`,
          examTitle: `Simulado Nacional ${exIdx + 1}`,
          date: `2026-0${3 + exIdx * 3}-15`,
          scorePercentage: s,
        })),
      };
    });
  }

  // 4. Calcula distribuições por turma e geral
  const distributions = classes.map((c) => {
    const classStudents = rawStudents.filter((s) => s.classGroupId === c.id);
    return calculateClassReadinessDistribution(c.id, c.label, classStudents, config);
  });

  const overallDistribution = calculateClassReadinessDistribution(
    "todas",
    "Todas as Turmas",
    rawStudents,
    config
  );

  return (
    <ProntidaoClient
      institutionName={institution.name}
      config={config}
      classes={classes}
      distributions={distributions}
      allStudents={overallDistribution.students}
      userRole={context.role}
    />
  );
}
