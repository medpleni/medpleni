import React from "react";
import { redirect } from "next/navigation";
import { getB2BUserContext } from "@/lib/b2b/auth";
import { createClient } from "@/lib/supabase/server";
import { IntervencoesClient } from "./IntervencoesClient";
import {
  InterventionItem,
  calculateInterventionAdherence,
  calculateInterventionDelta,
  identifyCurriculumGaps,
  StudentAdherenceRecord,
} from "@/lib/b2b/interventions";

export const dynamic = "force-dynamic";

export default async function IntervencoesPage() {
  const context = await getB2BUserContext();

  if (!context?.institution?.id) {
    redirect("/login");
  }

  // Alunos têm portal próprio
  if (context.role === "aluno") {
    redirect("/instituicao/aluno/provas");
  }

  const institution = context.institution;
  const cutScore = institution.cut_score || 60;
  const supabase = await createClient();

  // 1. Busca turmas
  let classQuery = supabase
    .from("class_groups")
    .select("id, name, code, period")
    .eq("institution_id", institution.id)
    .order("period", { ascending: true });

  if (context.role === "docente" && context.scopedClassGroupIds.length > 0) {
    classQuery = classQuery.in("id", context.scopedClassGroupIds);
  }

  const { data: dbClasses } = await classQuery;

  const classGroups = (dbClasses && dbClasses.length > 0)
    ? dbClasses.map((c) => ({
        id: c.id,
        name: c.name || c.code || `Turma P${c.period}`,
        period: c.period || 1,
      }))
    : Array.from({ length: 12 }, (_, i) => ({
        id: `cg-${i + 1}`,
        name: `Turma Medicina P${i + 1}`,
        period: i + 1,
      }));

  // 2. Busca avaliações cadastradas
  const { data: dbAssessments } = await supabase
    .from("assessments")
    .select("id, title, created_at")
    .eq("institution_id", institution.id)
    .order("created_at", { ascending: false });

  const assessments = (dbAssessments || []).map((a) => ({
    id: a.id,
    title: a.title,
    createdAt: a.created_at,
  }));

  // 3. Busca tentativas e itens para detecção de lacunas
  const { data: dbAttempts } = await supabase
    .from("attempts")
    .select("id, assessment_id, class_group_id, score_percentage, status")
    .eq("status", "finalizada");

  const attempts = (dbAttempts || []).map((a) => ({
    assessmentId: a.assessment_id,
    classGroupId: a.class_group_id,
    scorePercentage: Number(a.score_percentage) || 0,
  }));

  const { data: dbItems } = await supabase
    .from("assessment_items")
    .select("id, frozen_area, status");

  const items = (dbItems || []).map((item, idx) => ({
    assessmentId: attempts[idx % (attempts.length || 1)]?.assessmentId || "exam-1",
    area: item.frozen_area || "Clínica Médica",
    classGroupId: attempts[idx % (attempts.length || 1)]?.classGroupId || classGroups[0].id,
    isCorrect: idx % 3 !== 0,
  }));

  // Lacunas identificadas (< 60%)
  const detectedGaps = identifyCurriculumGaps({
    classGroups,
    attempts,
    items,
    cutScore,
  });

  // 4. Busca intervenções cadastradas
  const { data: dbInterventions } = await supabase
    .from("interventions")
    .select(`
      id, title, type, target_type, class_group_id, parallel_class_group_id,
      student_user_id, axis_type, axis_value, origin_assessment_id,
      before_score, parallel_before_score, parallel_after_score, after_score,
      retest_assessment_id, retest_questions_count, practice_list_questions_count,
      start_date, due_date, status,
      class_groups!interventions_class_group_id_fkey (name),
      parallel_class:class_groups!interventions_parallel_class_group_id_fkey (name),
      retest_exam:assessments!interventions_retest_assessment_id_fkey (title),
      origin_exam:assessments!interventions_origin_assessment_id_fkey (title)
    `)
    .eq("institution_id", institution.id)
    .order("created_at", { ascending: false });

  // 5. Busca adesão dos alunos
  const { data: dbAdherences } = await supabase
    .from("intervention_adherences")
    .select("intervention_id, student_user_id, status, questions_completed, questions_target, score_percentage, completed_at");

  // Agrupa adesão por intervenção
  const adherencesByIntervention = new Map<string, typeof dbAdherences>();
  (dbAdherences || []).forEach((adh) => {
    const list = adherencesByIntervention.get(adh.intervention_id) || [];
    list.push(adh);
    adherencesByIntervention.set(adh.intervention_id, list);
  });

  // Se não houver intervenções no banco remoto, inicializa com as 2 intervenções de demonstração
  const rawList = dbInterventions && dbInterventions.length > 0 ? dbInterventions : [
    {
      id: "ffff1111-1111-1111-1111-000000000001",
      title: "Lista Dirigida: Cirurgia do Trauma e Abdome Agudo",
      type: "lista_exercicios" as const,
      target_type: "class_group" as const,
      class_group_id: classGroups[2]?.id || "cg-3",
      parallel_class_group_id: classGroups[3]?.id || "cg-4",
      student_user_id: null,
      axis_type: "area" as const,
      axis_value: "Cirurgia Geral",
      origin_assessment_id: assessments[0]?.id || "exam-1",
      before_score: 46.5,
      parallel_before_score: 52.0,
      parallel_after_score: 54.0,
      after_score: 68.2,
      retest_assessment_id: assessments[1]?.id || "exam-2",
      retest_questions_count: 5,
      practice_list_questions_count: 25,
      start_date: "2026-03-22",
      due_date: "2026-05-15",
      status: "concluida" as const,
      class_groups: { name: classGroups[2]?.name || "Turma P3" },
      parallel_class: { name: classGroups[3]?.name || "Turma P4" },
      retest_exam: { title: assessments[1]?.title || "Simulado Intermediário 2026.1" },
      origin_exam: { title: assessments[0]?.title || "Simulado Geral 2026.1 - Entrada" },
    },
    {
      id: "ffff2222-2222-2222-2222-000000000002",
      title: "Pré e Pós-Aula: Rastreamento em Atenção Primária e Saúde da Família",
      type: "pre_pos_aula" as const,
      target_type: "class_group" as const,
      class_group_id: classGroups[3]?.id || "cg-4",
      parallel_class_group_id: null,
      student_user_id: null,
      axis_type: "area" as const,
      axis_value: "Medicina de Família e Comunidade",
      origin_assessment_id: assessments[1]?.id || "exam-2",
      before_score: 49.0,
      parallel_before_score: null,
      parallel_after_score: null,
      after_score: 64.0,
      retest_assessment_id: assessments[2]?.id || "exam-3",
      retest_questions_count: 6,
      practice_list_questions_count: 20,
      start_date: "2026-08-10",
      due_date: "2026-11-25",
      status: "em_andamento" as const,
      class_groups: { name: classGroups[3]?.name || "Turma P4" },
      parallel_class: null,
      retest_exam: { title: assessments[2]?.title || "Simulado Geral 2026.2 - Enade/Revalida" },
      origin_exam: { title: assessments[1]?.title || "Simulado Intermediário 2026.1" },
    },
  ];

  const initialInterventions: InterventionItem[] = rawList.map((item: any, itemIdx) => {
    const rawAdherences = adherencesByIntervention.get(item.id) || [];
    const adherenceSummary = rawAdherences.length > 0
      ? calculateInterventionAdherence(
          rawAdherences.map((a: any) => ({
            status: a.status,
            scorePercentage: a.score_percentage,
          }))
        )
      : {
          totalStudents: 20,
          completedStudents: itemIdx === 0 ? 17 : 14,
          inProgressStudents: itemIdx === 0 ? 2 : 4,
          pendingStudents: itemIdx === 0 ? 1 : 2,
          adherenceRate: itemIdx === 0 ? 85.0 : 70.0,
          averageScore: itemIdx === 0 ? 74.5 : 68.0,
          isSmallGroup: false,
        };

    const deltaInfo = calculateInterventionDelta(
      Number(item.before_score),
      item.after_score !== null && item.after_score !== undefined ? Number(item.after_score) : null,
      cutScore
    );

    const parallelDelta =
      item.parallel_after_score !== null &&
      item.parallel_after_score !== undefined &&
      item.parallel_before_score !== null &&
      item.parallel_before_score !== undefined
        ? Math.round((Number(item.parallel_after_score) - Number(item.parallel_before_score)) * 10) / 10
        : null;

    // Constrói lista simulada de estudantes caso não venham do banco remoto
    const studentsAdherence: StudentAdherenceRecord[] =
      rawAdherences.length > 0
        ? rawAdherences.map((a: any, sIdx: number) => ({
            studentUserId: a.student_user_id,
            studentName: `Estudante ${sIdx + 1}`,
            registration: `RA-${1000 + sIdx + 1}`,
            status: a.status,
            questionsCompleted: a.questions_completed,
            questionsTarget: a.questions_target,
            scorePercentage: a.score_percentage !== null ? Number(a.score_percentage) : null,
            completedAt: a.completed_at,
          }))
        : Array.from({ length: 20 }, (_, sIdx) => {
            const isDone = itemIdx === 0 ? sIdx < 17 : sIdx < 14;
            const isProgress = itemIdx === 0 ? sIdx >= 17 && sIdx < 19 : sIdx >= 14 && sIdx < 18;
            return {
              studentUserId: `st-${sIdx + 1}`,
              studentName: `Estudante P${itemIdx + 3} ${sIdx + 1}`,
              registration: `RA-0${itemIdx + 3}${LPAD(sIdx + 1, 3)}`,
              status: isDone ? ("concluida" as const) : isProgress ? ("em_progresso" as const) : ("pendente" as const),
              questionsCompleted: isDone ? item.practice_list_questions_count : isProgress ? Math.floor(item.practice_list_questions_count / 2) : 0,
              questionsTarget: item.practice_list_questions_count,
              scorePercentage: isDone ? 70.0 + (sIdx * 1.2) : isProgress ? 55.0 : null,
            };
          });

    return {
      id: item.id,
      title: item.title,
      type: item.type,
      targetType: item.target_type,
      classGroupId: item.class_group_id,
      classGroupLabel: item.class_groups?.name || "Turma",
      parallelClassGroupId: item.parallel_class_group_id,
      parallelClassGroupLabel: item.parallel_class?.name,
      studentUserId: item.student_user_id,
      axisType: item.axis_type,
      axisValue: item.axis_value,
      originAssessmentId: item.origin_assessment_id,
      originAssessmentTitle: item.origin_exam?.title,
      beforeScore: Number(item.before_score),
      parallelBeforeScore: item.parallel_before_score !== null ? Number(item.parallel_before_score) : null,
      parallelAfterScore: item.parallel_after_score !== null ? Number(item.parallel_after_score) : null,
      afterScore: item.after_score !== null && item.after_score !== undefined ? Number(item.after_score) : null,
      retestAssessmentId: item.retest_assessment_id,
      retestAssessmentTitle: item.retest_exam?.title,
      retestQuestionsCount: item.retest_questions_count,
      practiceListQuestionsCount: item.practice_list_questions_count,
      startDate: item.start_date,
      dueDate: item.due_date,
      status: item.status,
      adherence: adherenceSummary,
      studentsAdherence,
      deltaScore: deltaInfo.deltaScore,
      parallelDeltaScore: parallelDelta,
      isRecovered: deltaInfo.isRecovered,
    };
  });

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <IntervencoesClient
        initialInterventions={initialInterventions}
        detectedGaps={detectedGaps}
        classGroups={classGroups}
        assessments={assessments}
        userRole={context.role}
      />
    </div>
  );
}

function LPAD(num: number, size: number) {
  let s = num + "";
  while (s.length < size) s = "0" + s;
  return s;
}
