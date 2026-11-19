/**
 * MEDPLENI B2B — psychometrics-actions.ts
 * Server Actions para cálculo e sincronização dos índices psicométricos com o Banco de Questões
 * (PR-09 / QB-12)
 */

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getB2BUserContext } from "./auth";
import {
  calculateExamPsychometrics,
  type ExamItemInput,
  type StudentExamAttemptInput,
} from "./psychometrics";

interface SyncResult {
  success: boolean;
  syncedCount?: number;
  error?: string;
}

/**
 * Sincroniza os índices psicométricos calculados de uma avaliação para a ficha
 * das questões originais correspondentes no Banco de Questões.
 */
export async function syncExamPsychometricsToBankAction(
  assessmentId: string
): Promise<SyncResult> {
  try {
    const context = await getB2BUserContext();
    if (!context?.institution?.id) {
      return { success: false, error: "Usuário não autenticado no contexto B2B." };
    }

    const supabase = await createClient();

    // 1. Busca dados da avaliação
    const { data: assessment, error: aErr } = await supabase
      .from("assessments")
      .select("id, title, starts_at, status")
      .eq("id", assessmentId)
      .single();

    if (aErr || !assessment) {
      return { success: false, error: "Avaliação não encontrada." };
    }

    // 2. Busca versão congelada atual
    const { data: version } = await supabase
      .from("assessment_versions")
      .select("id")
      .eq("assessment_id", assessmentId)
      .eq("is_current", true)
      .single();

    if (!version) {
      return { success: false, error: "Versão congelada não encontrada." };
    }

    // 3. Busca itens da avaliação com question_id
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
        status
      `)
      .eq("version_id", version.id)
      .order("order_index", { ascending: true });

    if (!rawItems || rawItems.length === 0) {
      return { success: false, error: "Nenhum item na avaliação." };
    }

    // 4. Busca tentativas finalizadas e respostas
    const { data: rawAttempts } = await supabase
      .from("attempts")
      .select("id, student_user_id, status")
      .eq("assessment_id", assessmentId)
      .eq("status", "finalizada");

    if (!rawAttempts || rawAttempts.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    const attemptIds = rawAttempts.map((a) => a.id);
    const { data: rawAnswers } = await supabase
      .from("attempt_answers")
      .select("attempt_id, assessment_item_id, marked_base_letter")
      .in("attempt_id", attemptIds);

    // Mapeia respostas: attemptId -> Map<itemId, markedLetter>
    const answersByAttempt = new Map<string, Map<string, string | null>>();
    (rawAnswers || []).forEach((ans) => {
      const map = answersByAttempt.get(ans.attempt_id) || new Map<string, string | null>();
      map.set(ans.assessment_item_id, ans.marked_base_letter);
      answersByAttempt.set(ans.attempt_id, map);
    });

    const attemptsInput: StudentExamAttemptInput[] = rawAttempts.map((att) => ({
      studentUserId: att.student_user_id,
      status: "finalizada",
      answers: answersByAttempt.get(att.id) || new Map(),
    }));

    interface DbItemRow {
      id: string;
      order_index: number;
      question_id: string | null;
      frozen_statement: string;
      frozen_clinical_context: string | null;
      frozen_options: Array<{ letter: string; text: string; is_correct: boolean }>;
      frozen_correct_letter: string;
      frozen_explanation: string | null;
      frozen_area: string | null;
      frozen_cenario: string | null;
      frozen_tema: string | null;
      frozen_competencia: string | null;
      status: string;
    }

    const itemsInput: ExamItemInput[] = (rawItems as unknown as DbItemRow[]).map((it) => ({
      id: it.id,
      orderIndex: it.order_index,
      questionId: it.question_id,
      statement: it.frozen_statement,
      clinicalContext: it.frozen_clinical_context,
      correctLetter: it.frozen_correct_letter,
      explanation: it.frozen_explanation,
      status: it.status,
      area: it.frozen_area,
      cenario: it.frozen_cenario,
      tema: it.frozen_tema,
      competencia: it.frozen_competencia,
      options: it.frozen_options || [],
    }));

    // 5. Executa análise psicométrica pura
    const psychoSummary = calculateExamPsychometrics({
      items: itemsInput,
      attempts: attemptsInput,
    });

    let syncedCount = 0;

    // 6. Persiste desempenhos para os itens vinculados a questions
    for (const analyzedItem of psychoSummary.items) {
      if (!analyzedItem.questionId || analyzedItem.isAnulado) continue;

      const distractorCounts: Record<string, number> = {};
      analyzedItem.optionFrequencies.forEach((opt) => {
        distractorCounts[opt.letter] = opt.count;
      });

      const flagsList = analyzedItem.flags.map((f) => f.type);

      // Upsert na tabela question_exam_performances
      await supabase
        .from("question_exam_performances")
        .upsert(
          {
            question_id: analyzedItem.questionId,
            assessment_id: assessmentId,
            assessment_item_id: analyzedItem.itemId,
            exam_title: assessment.title,
            sample_size: analyzedItem.sampleSize,
            facility_p: analyzedItem.facilityIndex,
            discrimination_d: analyzedItem.discriminationIndex,
            point_biserial_r: analyzedItem.correctedPointBiserial,
            distractor_counts: distractorCounts,
            flags: flagsList,
            applied_at: assessment.starts_at || new Date().toISOString(),
          },
          { onConflict: "question_id,assessment_id" }
        );

      // 7. Atualiza médias históricas na tabela questions
      const { data: allPerfs } = await supabase
        .from("question_exam_performances")
        .select("facility_p, point_biserial_r, sample_size")
        .eq("question_id", analyzedItem.questionId);

      interface PerfRow {
        facility_p?: number | null;
        point_biserial_r?: number | null;
        sample_size: number;
      }

      const validPerfs = (allPerfs || []) as unknown as PerfRow[];
      if (validPerfs.length > 0) {
        let totalPWeight = 0;
        let sumP = 0;
        let totalRWeight = 0;
        let sumR = 0;

        for (const p of validPerfs) {
          const sz = Number(p.sample_size || 1);
          if (p.facility_p !== null && p.facility_p !== undefined) {
            sumP += Number(p.facility_p) * sz;
            totalPWeight += sz;
          }
          if (p.point_biserial_r !== null && p.point_biserial_r !== undefined) {
            sumR += Number(p.point_biserial_r) * sz;
            totalRWeight += sz;
          }
        }

        const avgP = totalPWeight > 0 ? Number((sumP / totalPWeight).toFixed(3)) : null;
        const avgR = totalRWeight > 0 ? Number((sumR / totalRWeight).toFixed(3)) : null;

        await supabase
          .from("questions")
          .update({
            historical_facility_p: avgP,
            historical_point_biserial_r: avgR,
            times_used_in_exams: validPerfs.length,
          })
          .eq("id", analyzedItem.questionId);
      }

      syncedCount++;
    }

    revalidatePath(`/instituicao/provas/${assessmentId}/resultado`);
    revalidatePath("/instituicao/banco");

    return { success: true, syncedCount };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}
