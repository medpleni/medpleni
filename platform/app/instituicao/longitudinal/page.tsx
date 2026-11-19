import React from "react";
import { redirect } from "next/navigation";
import { getB2BUserContext } from "@/lib/b2b/auth";
import { createClient } from "@/lib/supabase/server";
import { LongitudinalClient } from "./LongitudinalClient";
import {
  calculateCurriculumAxisMatrix,
  ActionPlanItem,
} from "@/lib/b2b/longitudinal";

export const dynamic = "force-dynamic";

export default async function LongitudinalPage() {
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

  // 1. Busca turmas da instituição
  let classQuery = supabase
    .from("class_groups")
    .select("id, name, code, period")
    .eq("institution_id", institution.id)
    .order("period", { ascending: true });

  if (context.role === "docente" && context.scopedClassGroupIds.length > 0) {
    classQuery = classQuery.in("id", context.scopedClassGroupIds);
  }

  const { data: dbClasses } = await classQuery;

  // Garante os 12 períodos para a matriz longitudinal
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

  // 2. Busca tentativas de avaliações da instituição
  const { data: dbAttempts } = await supabase
    .from("attempts")
    .select("id, assessment_id, class_group_id, score_percentage, status")
    .eq("status", "finalizada");

  const attempts = (dbAttempts || []).map((a) => ({
    assessmentId: a.assessment_id,
    classGroupId: a.class_group_id,
    scorePercentage: Number(a.score_percentage) || 0,
  }));

  // 3. Busca itens avaliativos para vincular aos eixos (Áreas, Cenários)
  const { data: dbItems } = await supabase
    .from("assessment_items")
    .select("id, frozen_area, status");

  const items = (dbItems || []).map((item, idx) => ({
    id: item.id,
    assessmentId: attempts[idx % (attempts.length || 1)]?.assessmentId || "exam-1",
    area: item.frozen_area || "Clínica Médica",
    classGroupId: attempts[idx % (attempts.length || 1)]?.classGroupId || classGroups[0].id,
    isCorrect: idx % 3 !== 0,
  }));

  // 4. Busca avaliações cadastradas
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

  // 5. Busca planos de acompanhamento (AP-04)
  const { data: dbPlans } = await supabase
    .from("longitudinal_action_plans")
    .select(`
      id, target_type, class_group_id, student_user_id, axis_type, axis_value,
      action_description, responsible_name, agreed_date, deadline_date,
      verification_assessment_id, initial_score, verified_score, status, notes,
      class_groups (name)
    `)
    .eq("institution_id", institution.id)
    .order("agreed_date", { ascending: false });

  const initialPlans: ActionPlanItem[] = (dbPlans || []).map((p: any) => ({
    id: p.id,
    targetType: p.target_type,
    classGroupId: p.class_group_id,
    classGroupLabel: p.class_groups?.name || (p.class_group_id ? `Turma` : undefined),
    studentUserId: p.student_user_id,
    axisType: p.axis_type,
    axisValue: p.axis_value,
    actionDescription: p.action_description,
    responsibleName: p.responsible_name,
    agreedDate: p.agreed_date,
    deadlineDate: p.deadline_date,
    verificationAssessmentId: p.verification_assessment_id,
    verificationAssessmentTitle: assessments.find((a) => a.id === p.verification_assessment_id)?.title,
    initialScore: Number(p.initial_score) || 0,
    verifiedScore: p.verified_score !== null && p.verified_score !== undefined ? Number(p.verified_score) : null,
    status: p.status,
    notes: p.notes,
  }));

  // 6. Calcula a matriz curricular inicial (Eixo = Área)
  const initialMatrix = calculateCurriculumAxisMatrix({
    attempts,
    items,
    classGroups,
    axisType: "area",
    cutScore,
  });

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <LongitudinalClient
        initialMatrix={initialMatrix}
        classGroups={classGroups}
        assessments={assessments}
        initialPlans={initialPlans}
        userRole={context.role}
      />
    </div>
  );
}
