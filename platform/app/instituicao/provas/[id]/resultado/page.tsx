import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getB2BUserContext } from "@/lib/b2b/auth";
import { createClient } from "@/lib/supabase/server";
import ResultadoClient from "./ResultadoClient";
import { syncExamPsychometricsToBankAction } from "@/lib/b2b/psychometrics-actions";
import {
  calculateExamSummaryStats,
  calculateScoreDistribution,
  calculateAllAxesPerformance,
  calculateClassGroupsPerformance,
  buildStudentResultRows,
  type RawItemPerformanceInput,
  type ExportStudentItemDetail,
} from "@/lib/b2b/results";

export const metadata: Metadata = {
  title: "Resultado da Avaliação | MedPleni",
  description: "Análise psicométrica, curvas de distribuição e resultados por eixos da prova institucional",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

interface AssessmentItemRow {
  id: string;
  order_index: number;
  question_id?: string | null;
  frozen_statement: string;
  frozen_clinical_context?: string | null;
  frozen_options: Array<{ letter: string; text: string; is_correct: boolean }>;
  frozen_correct_letter: string;
  frozen_explanation?: string | null;
  frozen_area?: string | null;
  frozen_cenario?: string | null;
  frozen_tema?: string | null;
  frozen_competencia?: string | null;
  status: string;
  weight: number;
}

interface AttemptDbRow {
  id: string;
  student_user_id: string;
  class_group_id?: string | null;
  status: string;
  score_raw?: number | null;
  score_percentage?: number | null;
  assessment_forms?: { form_code?: string | null } | Array<{ form_code?: string | null }> | null;
  class_groups?: { id: string; label?: string | null; period?: number | null } | Array<{ id: string; label?: string | null; period?: number | null }> | null;
  profiles?: { full_name?: string | null; email?: string | null } | Array<{ full_name?: string | null; email?: string | null }> | null;
}

interface AttemptAnswerDbRow {
  attempt_id: string;
  assessment_item_id: string;
  marked_form_letter?: string | null;
  marked_base_letter?: string | null;
  is_correct?: boolean | null;
  time_spent_seconds?: number | null;
}

interface EnrollmentDbRow {
  member_id: string;
  student_registration: string;
  institution_members?: { user_id?: string | null } | null;
}

interface AdjustmentDbRow {
  id: string;
  assessment_item_id: string;
  action_type: string;
  previous_letter?: string | null;
  new_letter?: string | null;
  reason: string;
  created_at: string;
  performed_by: string;
  profiles?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
}

export default async function ResultadoPage({ params }: PageProps) {
  const { id } = await params;
  const context = await getB2BUserContext();

  if (!context?.institution?.id) {
    redirect("/instituicao");
  }

  // Apenas docentes, coordenadores e dirigentes podem acessar a visão geral
  if (!["dirigente", "coordenador", "docente"].includes(context.role)) {
    redirect("/instituicao");
  }

  const supabase = await createClient();

  // 1. Busca avaliação atual
  const { data: assessment, error: aErr } = await supabase
    .from("assessments")
    .select(`
      id,
      institution_id,
      title,
      type,
      modality,
      status,
      starts_at,
      ends_at,
      duration_minutes,
      answers_released_at,
      planned_matrix,
      institutions ( id, name, cut_score )
    `)
    .eq("id", id)
    .single();

  if (aErr || !assessment) {
    redirect("/instituicao/provas");
  }

  // 2. Busca versão congelada atual
  const { data: version } = await supabase
    .from("assessment_versions")
    .select("id, version_number, published_at")
    .eq("assessment_id", id)
    .eq("is_current", true)
    .single();

  // 3. Busca itens congelados com taxonomia
  const { data: rawItems } = await supabase
    .from("assessment_items")
    .select(`
      id,
      order_index,
      question_id,
      frozen_statement,
      frozen_clinical_context,
      frozen_options,
      frozen_correct_letter,
      frozen_explanation,
      frozen_area,
      frozen_cenario,
      frozen_tema,
      frozen_competencia,
      status,
      weight
    `)
    .eq("version_id", version?.id || "")
    .order("order_index", { ascending: true });

  const items: AssessmentItemRow[] = (rawItems || []) as unknown as AssessmentItemRow[];

  // 4. Busca tentativas e dados dos alunos convocados
  const { data: rawAttempts } = await supabase
    .from("attempts")
    .select(`
      id,
      student_user_id,
      class_group_id,
      status,
      score_raw,
      score_percentage,
      assessment_forms ( form_code ),
      class_groups ( id, label, period ),
      profiles ( full_name, email )
    `)
    .eq("assessment_id", id);

  const attempts: AttemptDbRow[] = (rawAttempts || []) as unknown as AttemptDbRow[];

  // 5. Busca matrículas para obter RAs
  const studentUserIds = attempts.map((a) => a.student_user_id);
  const { data: rawEnrollments } = await supabase
    .from("enrollments")
    .select("member_id, student_registration, institution_members!inner(user_id)")
    .in("institution_members.user_id", studentUserIds.length > 0 ? studentUserIds : ["00000000-0000-0000-0000-000000000000"]);

  const enrollments: EnrollmentDbRow[] = (rawEnrollments || []) as unknown as EnrollmentDbRow[];

  const raMap = new Map<string, string>();
  enrollments.forEach((e) => {
    if (e.institution_members?.user_id) {
      raMap.set(e.institution_members.user_id, e.student_registration);
    }
  });

  // 6. Busca respostas dos alunos para estatísticas por item e eixos
  const attemptIds = attempts.filter((a) => a.status === "finalizada").map((a) => a.id);
  const { data: rawAnswers } = await supabase
    .from("attempt_answers")
    .select("attempt_id, assessment_item_id, marked_form_letter, marked_base_letter, is_correct, time_spent_seconds")
    .in("attempt_id", attemptIds.length > 0 ? attemptIds : ["00000000-0000-0000-0000-000000000000"]);

  const answers: AttemptAnswerDbRow[] = (rawAnswers || []) as unknown as AttemptAnswerDbRow[];

  // Mapeia respostas para cálculo de eixos
  const answersByItem = new Map<string, Array<{ studentUserId: string; isCorrect: boolean }>>();
  const attemptToStudentMap = new Map<string, string>();
  attempts.forEach((a) => {
    attemptToStudentMap.set(a.id, a.student_user_id);
  });

  answers.forEach((ans) => {
    const list = answersByItem.get(ans.assessment_item_id) || [];
    list.push({
      studentUserId: attemptToStudentMap.get(ans.attempt_id) || "",
      isCorrect: Boolean(ans.is_correct),
    });
    answersByItem.set(ans.assessment_item_id, list);
  });

  // 7. Busca prova anterior do mesmo tipo para cálculo de variação histórica nominal
  const { data: previousExam } = await supabase
    .from("assessments")
    .select("id, title, starts_at")
    .eq("institution_id", assessment.institution_id)
    .eq("type", assessment.type)
    .neq("id", id)
    .in("status", ["aplicada", "corrigida"])
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Se houver prova anterior, busca as notas anteriores dos mesmos alunos
  const previousScoresMap = new Map<string, number>();
  if (previousExam?.id) {
    const { data: prevAttempts } = await supabase
      .from("attempts")
      .select("student_user_id, score_percentage")
      .eq("assessment_id", previousExam.id)
      .eq("status", "finalizada");

    interface PrevAttemptRow {
      student_user_id: string;
      score_percentage?: number | null;
    }

    ((prevAttempts || []) as unknown as PrevAttemptRow[]).forEach((pa) => {
      previousScoresMap.set(pa.student_user_id, Number(pa.score_percentage || 0));
    });
  }

  // 8. Busca histórico de auditoria de anulações/trocas de gabarito
  const { data: rawAdjustments } = await supabase
    .from("assessment_item_adjustments")
    .select(`
      id,
      assessment_item_id,
      action_type,
      previous_letter,
      new_letter,
      reason,
      created_at,
      performed_by,
      profiles ( full_name )
    `)
    .eq("assessment_id", id)
    .order("created_at", { ascending: false });

  const adjustments: AdjustmentDbRow[] = (rawAdjustments || []) as unknown as AdjustmentDbRow[];

  // ─── CÁLCULOS ESTATÍSTICOS NO SERVIDOR ──────────────────────────────────────
  const cutScore = (assessment.institutions as { cut_score?: number } | null)?.cut_score || 60;
  const presentAttempts = attempts.filter((a) => a.status === "finalizada");
  const absentAttempts = attempts.filter((a) => a.status === "ausente");
  const presentScores = presentAttempts.map((a) => Number(a.score_percentage || 0));

  // Resumo
  const summaryStats = calculateExamSummaryStats({
    presentScores,
    totalEnrolled: attempts.length,
    totalAbsent: absentAttempts.length,
    cutScore,
    academicTermLabel: "2027.1",
    assessmentTitle: assessment.title,
  });

  // Curva de Distribuição
  const scoreDistribution = calculateScoreDistribution(
    presentScores,
    cutScore,
    summaryStats.medianScore
  );

  // Eixos (Área, Cenário, Tema, Competência)
  const rawItemPerfInputs: RawItemPerformanceInput[] = items.map((it) => ({
    itemId: it.id,
    area: it.frozen_area || "Clínica Médica",
    cenario: it.frozen_cenario || null,
    tema: it.frozen_tema || null,
    competencia: it.frozen_competencia || null,
    weight: Number(it.weight || 1),
    status: it.status as "valido" | "anulado",
    answers: answersByItem.get(it.id) || [],
  }));

  const axesPerformance = calculateAllAxesPerformance(
    rawItemPerfInputs,
    summaryStats.meanScore
  );

  // Turmas Convocadas
  const classGroupMap = new Map<string, { id: string; name: string; period: number }>();
  attempts.forEach((a) => {
    const cg = Array.isArray(a.class_groups) ? a.class_groups[0] : a.class_groups;
    if (cg) {
      classGroupMap.set(cg.id, {
        id: cg.id,
        name: cg.label || `Turma ${cg.period}ºP`,
        period: cg.period || 1,
      });
    }
  });
  const classGroupsList = Array.from(classGroupMap.values());

  const classGroupsPerformance = calculateClassGroupsPerformance(
    classGroupsList,
    attempts.map((a) => ({
      classGroupId: a.class_group_id || "",
      status: a.status === "finalizada" ? "presente" : "ausente",
      scorePercentage: Number(a.score_percentage || 0),
    })),
    summaryStats.meanScore,
    cutScore
  );

  // Alunos Convocados com Variação Histórica
  const studentRows = buildStudentResultRows({
    students: attempts.map((a) => {
      const prof = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
      const af = Array.isArray(a.assessment_forms) ? a.assessment_forms[0] : a.assessment_forms;
      const cg = Array.isArray(a.class_groups) ? a.class_groups[0] : a.class_groups;

      const formCode = af?.form_code || "A";
      const studentName = prof?.full_name || prof?.email || "Estudante";
      const studentRa = raMap.get(a.student_user_id) || `RA-${a.student_user_id.slice(0, 6).toUpperCase()}`;
      const classGroupName = cg?.label || "Turma Geral";

      return {
        studentUserId: a.student_user_id,
        studentName,
        studentRa,
        classGroupId: a.class_group_id || "",
        classGroupName,
        formCode,
        status: a.status === "finalizada" ? "presente" : "ausente",
        scoreRaw: Number(a.score_raw || 0),
        scorePercentage: Number(a.score_percentage || 0),
        previousScorePercentage: previousScoresMap.get(a.student_user_id) ?? null,
      };
    }),
    previousExamTitle: previousExam?.title || null,
  });

  // Sincroniza métricas psicométricas com o Banco de Questões se a prova já foi aplicada ou corrigida
  if (["aplicada", "corrigida"].includes(assessment.status)) {
    try {
      await syncExamPsychometricsToBankAction(assessment.id);
    } catch {
      // Falha não-bloqueante de sincronização
    }
  }

  return (
    <ResultadoClient
      assessment={{
        id: assessment.id,
        title: assessment.title,
        type: assessment.type,
        modality: assessment.modality,
        status: assessment.status,
        answersReleasedAt: assessment.answers_released_at,
        cutScore,
      }}
      items={items.map((it) => ({
        id: it.id,
        orderIndex: it.order_index,
        questionId: it.question_id || null,
        statement: it.frozen_statement,
        clinicalContext: it.frozen_clinical_context,
        correctLetter: it.frozen_correct_letter,
        explanation: it.frozen_explanation || null,
        status: it.status,
        weight: Number(it.weight || 1),
        area: it.frozen_area || "Clínica Médica",
        cenario: it.frozen_cenario || null,
        tema: it.frozen_tema || null,
        competencia: it.frozen_competencia || null,
        options: it.frozen_options || [],
      }))}
      rawAttempts={attempts.map((a) => ({
        id: a.id,
        studentUserId: a.student_user_id,
        status: a.status,
      }))}
      rawAnswers={answers.map((ans) => ({
        attemptId: ans.attempt_id,
        assessmentItemId: ans.assessment_item_id,
        markedBaseLetter: ans.marked_base_letter || null,
        isCorrect: Boolean(ans.is_correct),
      }))}
      summaryStats={summaryStats}
      scoreDistribution={scoreDistribution}
      axesPerformance={axesPerformance}
      classGroups={classGroupsList}
      classGroupsPerformance={classGroupsPerformance}
      studentRows={studentRows}
      adjustments={adjustments.map((adj) => {
        const prof = Array.isArray(adj.profiles) ? adj.profiles[0] : adj.profiles;
        return {
          id: adj.id,
          itemId: adj.assessment_item_id,
          actionType: adj.action_type,
          previousLetter: adj.previous_letter,
          newLetter: adj.new_letter,
          reason: adj.reason,
          createdAt: adj.created_at,
          performedByName: prof?.full_name || "Docente / Dirigente",
        };
      })}
      exportRecords={buildExportRecords({
        items,
        attempts,
        answers,
        raMap,
      })}
    />
  );
}

/**
 * Monta o dataset plano completo para exportação CSV/XLSX (PR-10)
 */
function buildExportRecords(params: {
  items: AssessmentItemRow[];
  attempts: AttemptDbRow[];
  answers: AttemptAnswerDbRow[];
  raMap: Map<string, string>;
}): ExportStudentItemDetail[] {
  const { items, attempts, answers, raMap } = params;

  // Index de respostas por attemptId_itemId
  const answerLookup = new Map<string, AttemptAnswerDbRow>();
  answers.forEach((ans) => {
    answerLookup.set(`${ans.attempt_id}_${ans.assessment_item_id}`, ans);
  });

  const exportRows: ExportStudentItemDetail[] = [];

  attempts.forEach((att) => {
    const prof = Array.isArray(att.profiles) ? att.profiles[0] : att.profiles;
    const af = Array.isArray(att.assessment_forms) ? att.assessment_forms[0] : att.assessment_forms;
    const cg = Array.isArray(att.class_groups) ? att.class_groups[0] : att.class_groups;

    const studentName = prof?.full_name || prof?.email || "Estudante";
    const studentRa = raMap.get(att.student_user_id) || `RA-${att.student_user_id.slice(0, 6).toUpperCase()}`;
    const classGroupName = cg?.label || "Turma Geral";
    const formCode = af?.form_code || "A";

    items.forEach((it) => {
      const ans = answerLookup.get(`${att.id}_${it.id}`);

      exportRows.push({
        studentName,
        studentRa,
        classGroupName,
        formCode,
        itemOrderBase: it.order_index,
        itemOrderForm: it.order_index, // Conforme mapa da forma
        questionStatementShort: it.frozen_statement.slice(0, 100),
        markedFormLetter: ans?.marked_form_letter || "",
        markedBaseLetter: ans?.marked_base_letter || "",
        correctBaseLetter: it.frozen_correct_letter,
        isCorrect: Boolean(ans?.is_correct),
        weight: Number(it.weight || 1),
        area: it.frozen_area || "Clínica Médica",
        cenario: it.frozen_cenario || "",
        tema: it.frozen_tema || "",
        competencia: it.frozen_competencia || "",
        timeSpentSeconds: ans?.time_spent_seconds || 0,
      });
    });
  });

  return exportRows;
}
