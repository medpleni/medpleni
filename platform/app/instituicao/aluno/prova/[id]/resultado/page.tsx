import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getB2BUserContext } from "@/lib/b2b/auth";
import { createClient } from "@/lib/supabase/server";
import AlunoDevolutivaClient from "./AlunoDevolutivaClient";

export const metadata: Metadata = {
  title: "Devolutiva Pedagógica da Avaliação | MedPleni",
  description: "Revisão dos erros em modo leitura, desempenho por área e gabarito comentado",
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ studentId?: string }>;
}

interface RawAnswerRow {
  assessment_item_id: string;
  marked_form_letter?: string | null;
  marked_base_letter?: string | null;
  is_correct?: boolean | null;
  time_spent_seconds?: number | null;
}

interface RawItemRow {
  id: string;
  order_index: number;
  frozen_statement: string;
  frozen_clinical_context?: string | null;
  frozen_options: Array<{ letter: string; text: string; is_correct: boolean }>;
  frozen_correct_letter: string;
  frozen_explanation?: string | null;
  frozen_area?: string | null;
  frozen_tema?: string | null;
  status: string;
  weight: number;
}

interface DevolutivaItem {
  id: string;
  orderIndex: number;
  statement: string;
  clinicalContext?: string | null;
  options: Array<{ letter: string; text: string; is_correct: boolean }>;
  correctLetter: string;
  explanation?: string | null;
  area: string;
  tema?: string;
  status: string;
  weight: number;
  studentMarkedLetter: string | null;
  isCorrect: boolean;
  timeSpentSeconds: number;
}

export default async function AlunoDevolutivaPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { studentId: targetStudentId } = await searchParams;

  const context = await getB2BUserContext();
  if (!context?.userId) {
    redirect("/login");
  }

  const supabase = await createClient();

  // Define qual estudante está sendo visualizado
  // Se for aluno, só pode ver a si mesmo. Se for docente/coord/dirigente, pode ver targetStudentId
  let studentUserId = context.userId;
  const isTeacherViewing = ["dirigente", "coordenador", "docente"].includes(context.role);

  if (isTeacherViewing && targetStudentId) {
    studentUserId = targetStudentId;
  }

  // 1. Busca avaliação
  const { data: assessment, error: aErr } = await supabase
    .from("assessments")
    .select("id, title, type, modality, status, answers_released_at")
    .eq("id", id)
    .single();

  if (aErr || !assessment) {
    redirect("/instituicao");
  }

  // 2. Busca tentativa do estudante
  const { data: attempt } = await supabase
    .from("attempts")
    .select(`
      id,
      version_id,
      form_id,
      class_group_id,
      status,
      score_raw,
      score_percentage,
      assessment_forms ( form_code, items_shuffle_map ),
      class_groups ( id, label )
    `)
    .eq("assessment_id", id)
    .eq("student_user_id", studentUserId)
    .maybeSingle();

  // 3. Busca perfil do estudante
  const { data: studentProfile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", studentUserId)
    .single();

  // 4. Se a prova ainda não teve o gabarito liberado pelo professor e NÃO é docente visualizando
  const isReleased = Boolean(assessment.answers_released_at) || isTeacherViewing;

  // 5. Se liberado, busca respostas e caderno congelado
  let itemsData: DevolutivaItem[] = [];
  let classGroupAverage = 0;
  const areaBreakdown: Record<string, { total: number; correct: number }> = {};

  if (isReleased && attempt) {
    // Busca média da turma
    if (attempt.class_group_id) {
      const { data: turmaScores } = await supabase
        .from("attempts")
        .select("score_percentage")
        .eq("assessment_id", id)
        .eq("class_group_id", attempt.class_group_id)
        .eq("status", "finalizada");

      if (turmaScores && turmaScores.length > 0) {
        const sum = turmaScores.reduce((acc, t) => acc + Number(t.score_percentage || 0), 0);
        classGroupAverage = Number((sum / turmaScores.length).toFixed(1));
      }
    }

    // Busca itens congelados
    const { data: rawItems } = await supabase
      .from("assessment_items")
      .select(`
        id,
        order_index,
        frozen_statement,
        frozen_clinical_context,
        frozen_options,
        frozen_correct_letter,
        frozen_explanation,
        frozen_area,
        frozen_tema,
        status,
        weight
      `)
      .eq("version_id", attempt.version_id)
      .order("order_index", { ascending: true });

    // Busca respostas do aluno
    const { data: rawAnswers } = await supabase
      .from("attempt_answers")
      .select("assessment_item_id, marked_form_letter, marked_base_letter, is_correct, time_spent_seconds")
      .eq("attempt_id", attempt.id);

    const ansMap = new Map<string, RawAnswerRow>();
    ((rawAnswers || []) as unknown as RawAnswerRow[]).forEach((ans) => {
      ansMap.set(ans.assessment_item_id, ans);
    });

    itemsData = ((rawItems || []) as unknown as RawItemRow[]).map((it) => {
      const ans = ansMap.get(it.id);
      const isAnnulled = it.status === "anulado";
      const isCorrect = Boolean(ans?.is_correct);

      const areaName = it.frozen_area || "Clínica Médica";
      if (!areaBreakdown[areaName]) {
        areaBreakdown[areaName] = { total: 0, correct: 0 };
      }
      if (!isAnnulled) {
        areaBreakdown[areaName].total += 1;
        if (isCorrect) {
          areaBreakdown[areaName].correct += 1;
        }
      }

      return {
        id: it.id,
        orderIndex: it.order_index,
        statement: it.frozen_statement,
        clinicalContext: it.frozen_clinical_context,
        options: it.frozen_options || [],
        correctLetter: it.frozen_correct_letter,
        explanation: it.frozen_explanation,
        area: areaName,
        tema: it.frozen_tema || "",
        status: it.status,
        weight: Number(it.weight || 1),
        studentMarkedLetter: ans?.marked_base_letter || null,
        isCorrect,
        timeSpentSeconds: ans?.time_spent_seconds || 0,
      };
    });
  }

  return (
    <AlunoDevolutivaClient
      assessment={{
        id: assessment.id,
        title: assessment.title,
        type: assessment.type,
        answersReleasedAt: assessment.answers_released_at,
      }}
      isReleased={isReleased}
      isTeacherViewing={isTeacherViewing}
      student={{
        userId: studentUserId,
        name: studentProfile?.full_name || studentProfile?.email || "Estudante",
        classGroupName: (Array.isArray(attempt?.class_groups) ? attempt?.class_groups[0] : attempt?.class_groups)?.label || "Turma Geral",
      }}
      attempt={
        attempt
          ? {
              status: attempt.status,
              scorePercentage: Number(attempt.score_percentage || 0),
              scoreRaw: Number(attempt.score_raw || 0),
              formCode: (Array.isArray(attempt.assessment_forms) ? attempt.assessment_forms[0] : attempt.assessment_forms)?.form_code || "A",
            }
          : null
      }
      classGroupAverage={classGroupAverage}
      areaBreakdown={areaBreakdown}
      items={itemsData}
    />
  );
}
