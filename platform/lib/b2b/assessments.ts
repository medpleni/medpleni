/**
-- ==============================================================================
-- MEDPLENI B2B — lib/b2b/assessments.ts
-- Motor de Avaliações Institucionais:
-- - Criação de Avaliação e Alvos Convocados
-- - Publicação com Congelamento Integral do Caderno (Snapshot Imutável)
-- - Geração de Formas Embaralhadas (A, B, C...) com Mapeamento Biunívoco
-- - Conversão Precisa de Alternativas Marcadas na Forma para o Caderno-Base
-- - Anulação de Itens com Recálculo Imediato de Todas as Notas
-- - Cálculo Puro e Ponderado de Notas (Itens Anulados Excluídos, Em Branco = Erro)
-- ==============================================================================
*/

import { createClient } from "@/lib/supabase/server";
import { getB2BUserContext } from "./auth";

export type AssessmentType =
  | "prova_regular"
  | "simulado_enamed_4"
  | "simulado_enamed_8"
  | "simulado_enamed_12"
  | "pre_aula"
  | "pos_aula";

export type AssessmentModality = "papel" | "hibrida" | "online";

export type AssessmentStatus =
  | "rascunho"
  | "em_revisao"
  | "aprovada"
  | "publicada"
  | "aplicada"
  | "corrigida";

export type ItemStatus = "valido" | "anulado";
export type OptionLetter = "A" | "B" | "C" | "D" | "E";

export interface FrozenOption {
  letter: OptionLetter;
  text: string;
  is_correct: boolean;
}

export interface AssessmentItemInput {
  question_id?: string;
  statement: string;
  clinical_context?: string;
  options: FrozenOption[];
  correct_letter: OptionLetter;
  explanation?: string;
  weight?: number;
}

export interface ShuffledItemMap {
  formOrder: number;
  assessmentItemId: string;
  baseOrder: number;
  optionsMap: Record<OptionLetter, OptionLetter>; // Letra na forma -> Letra no caderno base
  reverseOptionsMap: Record<OptionLetter, OptionLetter>; // Letra no caderno base -> Letra na forma
}

export interface AttemptScoreResult {
  scoreRaw: number;
  scorePercentage: number;
  totalValidItems: number;
  correctValidItems: number;
  annulledItems: number;
  totalValidWeight: number;
}

export interface CalculationItem {
  id: string;
  weight: number;
  status: ItemStatus;
  correctLetter: OptionLetter;
}

export interface CalculationAnswer {
  itemId: string;
  markedBaseLetter: OptionLetter | null; // null se em branco
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FUNÇÕES PURAS (Testáveis isoladamente sem dependência de banco)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * 1. Converte a alternativa assinalada na forma embaralhada para a ordem do caderno-base.
 * Se o aluno deixou em branco (null ou undefined), retorna null.
 */
export function convertFormAnswerToBase(
  markedFormLetter: OptionLetter | null | undefined,
  optionsMap: Record<OptionLetter, OptionLetter>
): OptionLetter | null {
  if (!markedFormLetter) {
    return null;
  }
  return optionsMap[markedFormLetter] || null;
}

/**
 * 2. Converte uma alternativa do caderno-base para a letra exibida na forma do aluno.
 */
export function convertBaseAnswerToForm(
  baseLetter: OptionLetter,
  reverseOptionsMap: Record<OptionLetter, OptionLetter>
): OptionLetter {
  return reverseOptionsMap[baseLetter] || baseLetter;
}

/**
 * 3. Gera uma forma embaralhada a partir dos itens do caderno-base.
 * Embaralha tanto a ordem das questões quanto as alternativas A-E de cada questão.
 * Implementa RNG determinístico se seed for passada, ou pseudo-aleatório seguro.
 */
export function generateFormShuffleMap(
  baseItems: Array<{ id: string; orderIndex: number }>,
  formCode: string,
  shuffleOptions: boolean = true
): ShuffledItemMap[] {
  const letters: OptionLetter[] = ["A", "B", "C", "D", "E"];

  // Copia dos itens base
  const shuffledItems = [...baseItems];

  // Algoritmo Fisher-Yates com seed pseudo-determinística baseada no formCode
  const seedNum = formCode.charCodeAt(0) * 31;
  for (let i = shuffledItems.length - 1; i > 0; i--) {
    const j = Math.floor((Math.sin(seedNum + i) * 10000) % 1 * (i + 1) + (i + 1)) % (i + 1);
    const temp = shuffledItems[i];
    shuffledItems[i] = shuffledItems[j];
    shuffledItems[j] = temp;
  }

  return shuffledItems.map((item, index) => {
    const formOrder = index + 1;
    const optionsMap: Partial<Record<OptionLetter, OptionLetter>> = {};
    const reverseOptionsMap: Partial<Record<OptionLetter, OptionLetter>> = {};

    if (shuffleOptions) {
      // Embaralhamento das 5 letras A-E para esta questão na forma
      const shuffledLetters = [...letters];
      for (let i = shuffledLetters.length - 1; i > 0; i--) {
        const j = Math.floor((Math.sin(seedNum + formOrder * 7 + i) * 10000) % 1 * (i + 1) + (i + 1)) % (i + 1);
        const temp = shuffledLetters[i];
        shuffledLetters[i] = shuffledLetters[j];
        shuffledLetters[j] = temp;
      }

      letters.forEach((formLetter, idx) => {
        const baseLetter = shuffledLetters[idx];
        optionsMap[formLetter] = baseLetter;
        reverseOptionsMap[baseLetter] = formLetter;
      });
    } else {
      letters.forEach((l) => {
        optionsMap[l] = l;
        reverseOptionsMap[l] = l;
      });
    }

    return {
      formOrder,
      assessmentItemId: item.id,
      baseOrder: item.orderIndex,
      optionsMap: optionsMap as Record<OptionLetter, OptionLetter>,
      reverseOptionsMap: reverseOptionsMap as Record<OptionLetter, OptionLetter>,
    };
  });
}

/**
 * 4. Cálculo puro de nota da tentativa com respeito estrito às regras da ESPEC:
 *  - Itens com status = 'anulado' são EXCLUÍDOS do numerador e do denominador.
 *  - Respostas em branco (markedBaseLetter = null) contam como erro (0 pontos).
 *  - Peso ponderado por item (padrão 1.0).
 *  - Divisão por zero prevenida (se não houver itens válidos, retorna 0).
 */
export function calculateAttemptScore(
  items: CalculationItem[],
  answers: CalculationAnswer[]
): AttemptScoreResult {
  const answerMap = new Map<string, OptionLetter | null>();
  answers.forEach((ans) => {
    answerMap.set(ans.itemId, ans.markedBaseLetter);
  });

  let totalValidWeight = 0;
  let scoreRaw = 0;
  let totalValidItems = 0;
  let correctValidItems = 0;
  let annulledItems = 0;

  for (const item of items) {
    if (item.status === "anulado") {
      annulledItems++;
      continue; // Excluído do numerador e denominador
    }

    const itemWeight = item.weight > 0 ? item.weight : 1.0;
    totalValidItems++;
    totalValidWeight += itemWeight;

    const markedLetter = answerMap.get(item.id);
    // Em branco conta como erro (markedLetter === null ou undefined)
    if (markedLetter && markedLetter === item.correctLetter) {
      scoreRaw += itemWeight;
      correctValidItems++;
    }
  }

  const scorePercentage =
    totalValidWeight > 0 ? Number(((scoreRaw / totalValidWeight) * 100).toFixed(2)) : 0;

  return {
    scoreRaw: Number(scoreRaw.toFixed(2)),
    scorePercentage,
    totalValidItems,
    correctValidItems,
    annulledItems,
    totalValidWeight: Number(totalValidWeight.toFixed(2)),
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * OPERAÇÕES ASSÍNCRONAS COM O BANCO DE DADOS
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Criação de uma nova avaliação com metas de matriz planejada
 */
export async function createAssessment(params: {
  institutionId?: string;
  title: string;
  type: AssessmentType;
  modality: AssessmentModality;
  startsAt?: string;
  endsAt?: string;
  durationMinutes?: number;
  plannedMatrix?: Record<string, unknown>;
  pairedAssessmentId?: string;
  targetClassGroupIds?: string[];
  targetStudentUserIds?: string[];
}): Promise<{ success: boolean; assessmentId?: string; message?: string }> {
  const context = await getB2BUserContext();
  if (!context) {
    return { success: false, message: "Usuário não autenticado no MedPleni B2B." };
  }
  const instId = params.institutionId || context.institution?.id;

  if (!instId) {
    return { success: false, message: "Instituição não identificada no contexto." };
  }

  const supabase = await createClient();

  // 1. Insere o registro principal da avaliação
  const { data: assessment, error: aErr } = await supabase
    .from("assessments")
    .insert({
      institution_id: instId,
      title: params.title.trim(),
      type: params.type,
      modality: params.modality,
      status: "rascunho",
      starts_at: params.startsAt ? new Date(params.startsAt).toISOString() : null,
      ends_at: params.endsAt ? new Date(params.endsAt).toISOString() : null,
      duration_minutes: params.durationMinutes || 120,
      author_id: context.userId,
      coauthors: [],
      planned_matrix: params.plannedMatrix || {},
      paired_assessment_id: params.pairedAssessmentId || null,
      is_active: true,
    })
    .select("id")
    .single();

  if (aErr || !assessment) {
    return { success: false, message: aErr?.message || "Erro ao criar avaliação." };
  }

  const assessmentId = assessment.id;

  // 2. Convocação de alvos (turmas e/ou alunos)
  const targets = [];
  if (params.targetClassGroupIds && params.targetClassGroupIds.length > 0) {
    for (const classGroupId of params.targetClassGroupIds) {
      targets.push({
        assessment_id: assessmentId,
        target_type: "class_group",
        class_group_id: classGroupId,
        student_user_id: null,
      });
    }
  }

  if (params.targetStudentUserIds && params.targetStudentUserIds.length > 0) {
    for (const studentUserId of params.targetStudentUserIds) {
      targets.push({
        assessment_id: assessmentId,
        target_type: "student",
        class_group_id: null,
        student_user_id: studentUserId,
      });
    }
  }

  if (targets.length > 0) {
    await supabase.from("assessment_targets").insert(targets);
  }

  return { success: true, assessmentId };
}

/**
 * Publicação de avaliação com congelamento integral do caderno.
 * Copia o enunciado, as alternativas e o gabarito no momento exato da publicação.
 * Após a publicação, o caderno é imutável: qualquer alteração na questão original não o afeta.
 */
export async function publishAssessment(params: {
  assessmentId: string;
  items: AssessmentItemInput[];
  formCodes?: string[]; // Ex: ['A', 'B', 'C', 'D']
}): Promise<{ success: boolean; versionId?: string; message?: string }> {
  const context = await getB2BUserContext();
  if (!context) {
    return { success: false, message: "Usuário não autenticado no MedPleni B2B." };
  }
  const supabase = await createClient();

  if (!params.items || params.items.length === 0) {
    return { success: false, message: "A avaliação precisa de pelo menos uma questão para ser publicada." };
  }

  // 1. Identifica a próxima versão
  const { data: currentVersions } = await supabase
    .from("assessment_versions")
    .select("version_number")
    .eq("assessment_id", params.assessmentId)
    .order("version_number", { ascending: false })
    .limit(1);

  const nextVersionNumber = currentVersions && currentVersions.length > 0
    ? currentVersions[0].version_number + 1
    : 1;

  // Marca versões anteriores como não correntes
  await supabase
    .from("assessment_versions")
    .update({ is_current: false })
    .eq("assessment_id", params.assessmentId);

  // 2. Cria a nova versão imutável do caderno
  const { data: newVersion, error: vErr } = await supabase
    .from("assessment_versions")
    .insert({
      assessment_id: params.assessmentId,
      version_number: nextVersionNumber,
      published_by: context.userId,
      is_current: true,
      changelog: `Publicação oficial do caderno - Versão ${nextVersionNumber}`,
    })
    .select("id")
    .single();

  if (vErr || !newVersion) {
    return { success: false, message: vErr?.message || "Erro ao versionar caderno." };
  }

  const versionId = newVersion.id;

  // 3. Congela integralmente cada questão e suas alternativas
  const itemsToInsert = params.items.map((item, idx) => ({
    version_id: versionId,
    order_index: idx + 1,
    question_id: item.question_id || null,
    frozen_statement: item.statement,
    frozen_clinical_context: item.clinical_context || null,
    frozen_options: item.options,
    frozen_correct_letter: item.correct_letter,
    frozen_explanation: item.explanation || null,
    status: "valido" as ItemStatus,
    weight: item.weight || 1.0,
  }));

  const { data: insertedItems, error: itemsErr } = await supabase
    .from("assessment_items")
    .insert(itemsToInsert)
    .select("id, order_index");

  if (itemsErr || !insertedItems) {
    return { success: false, message: itemsErr?.message || "Erro ao congelar itens do caderno." };
  }

  // 4. Gera automaticamente as Formas Embaralhadas (A, B, C...)
  const formsToGenerate = params.formCodes && params.formCodes.length > 0
    ? params.formCodes
    : ["A", "B", "C", "D"];

  const baseItems = insertedItems.map((i) => ({ id: i.id, orderIndex: i.order_index }));

  for (const code of formsToGenerate) {
    // Para a Forma A, mantemos a ordem original das questões se desejado, ou embaralhamos
    const shuffleOptions = code !== "A";
    const shuffleMap = generateFormShuffleMap(baseItems, code, shuffleOptions);

    await supabase.from("assessment_forms").insert({
      version_id: versionId,
      form_code: code,
      items_shuffle_map: shuffleMap,
    });
  }

  // 5. Atualiza o status da avaliação para 'publicada'
  await supabase
    .from("assessments")
    .update({
      status: "publicada",
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.assessmentId);

  return { success: true, versionId };
}

/**
 * Anulação de um item da avaliação.
 * Marca o item como 'anulado' e dispara o recálculo imediato de todas as tentativas.
 */
export async function annulAssessmentItem(params: {
  assessmentItemId: string;
  reason?: string;
}): Promise<{ success: boolean; affectedAttempts?: number; message?: string }> {
  const supabase = await createClient();

  // 1. Busca o item para identificar a versão correspondente
  const { data: item, error: itemErr } = await supabase
    .from("assessment_items")
    .select("id, version_id, status")
    .eq("id", params.assessmentItemId)
    .single();

  if (itemErr || !item) {
    return { success: false, message: "Item da avaliação não encontrado." };
  }

  if (item.status === "anulado") {
    return { success: true, affectedAttempts: 0, message: "O item já estava anulado." };
  }

  // 2. Anula o item
  const { error: updErr } = await supabase
    .from("assessment_items")
    .update({ status: "anulado" })
    .eq("id", params.assessmentItemId);

  if (updErr) {
    return { success: false, message: updErr.message };
  }

  // 3. Executa a função SQL de recálculo em lote para todas as tentativas desta versão
  const { data: count, error: rpcErr } = await supabase.rpc("recalculate_version_attempts", {
    p_version_id: item.version_id,
  });

  return {
    success: true,
    affectedAttempts: rpcErr ? 0 : Number(count || 0),
  };
}

/**
 * Registra ou atualiza a resposta de uma questão para uma tentativa.
 * Converte automaticamente a alternativa assinalada na forma para a do caderno-base.
 */
export async function recordAttemptAnswer(params: {
  attemptId: string;
  assessmentItemId: string;
  markedFormLetter: OptionLetter | null;
  timeSpentSeconds?: number;
  origin?: "online" | "folha_lida" | "digitacao";
}): Promise<{ success: boolean; isCorrect?: boolean; message?: string }> {
  const supabase = await createClient();

  // 1. Busca tentativa e forma associada
  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, form_id, version_id")
    .eq("id", params.attemptId)
    .single();

  if (!attempt) {
    return { success: false, message: "Tentativa não encontrada." };
  }

  // 2. Busca item congelado
  const { data: item } = await supabase
    .from("assessment_items")
    .select("id, frozen_correct_letter, status")
    .eq("id", params.assessmentItemId)
    .single();

  if (!item) {
    return { success: false, message: "Item não encontrado." };
  }

  // 3. Se houver forma embaralhada, recupera o mapa de conversão
  let markedBaseLetter = params.markedFormLetter;
  if (attempt.form_id && params.markedFormLetter) {
    const { data: form } = await supabase
      .from("assessment_forms")
      .select("items_shuffle_map")
      .eq("id", attempt.form_id)
      .single();

    if (form && Array.isArray(form.items_shuffle_map)) {
      const itemMap = (form.items_shuffle_map as ShuffledItemMap[]).find(
        (m) => m.assessmentItemId === params.assessmentItemId
      );
      if (itemMap && itemMap.optionsMap) {
        markedBaseLetter = convertFormAnswerToBase(params.markedFormLetter, itemMap.optionsMap);
      }
    }
  }

  // Se o item estiver anulado ou resposta em branco, isCorrect = false
  const isCorrect =
    item.status === "valido" &&
    markedBaseLetter !== null &&
    markedBaseLetter === item.frozen_correct_letter;

  // 4. Salva ou atualiza a resposta
  const { error: ansErr } = await supabase.from("attempt_answers").upsert(
    {
      attempt_id: params.attemptId,
      assessment_item_id: params.assessmentItemId,
      marked_form_letter: params.markedFormLetter,
      marked_base_letter: markedBaseLetter,
      is_correct: isCorrect,
      time_spent_seconds: params.timeSpentSeconds || 0,
      origin: params.origin || "online",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "attempt_id,assessment_item_id" }
  );

  if (ansErr) {
    return { success: false, message: ansErr.message };
  }

  return { success: true, isCorrect };
}

/**
 * Finaliza a tentativa do aluno e calcula/persiste a nota final.
 */
export async function submitAttempt(
  attemptId: string
): Promise<{ success: boolean; score?: AttemptScoreResult; message?: string }> {
  const supabase = await createClient();

  // Executa o recálculo formal via função security definer no banco
  const { data: res, error: rpcErr } = await supabase.rpc("recalculate_attempt_score", {
    p_attempt_id: attemptId,
  });

  if (rpcErr || !res || res.length === 0) {
    return { success: false, message: rpcErr?.message || "Erro ao calcular nota da tentativa." };
  }

  // Atualiza status para finalizada e hora de entrega
  await supabase
    .from("attempts")
    .update({
      status: "finalizada",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", attemptId);

  const row = res[0];
  return {
    success: true,
    score: {
      scoreRaw: Number(row.new_score_raw),
      scorePercentage: Number(row.new_score_percentage),
      totalValidItems: Number(row.total_valid_items),
      correctValidItems: Number(row.correct_valid_items),
      annulledItems: Number(row.annulled_items),
      totalValidWeight: 0,
    },
  };
}
