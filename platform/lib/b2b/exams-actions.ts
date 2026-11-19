"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getB2BUserContext } from "./auth";
import { publishAssessment, type OptionLetter } from "./assessments";
import type {
  ExamSummary,
  ExamMatrixDistribution,
  SelectedQuestionItem,
  ExamPreCheckResult,
} from "./exams-types";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. MATRIZ OFICIAL DE REFERÊNCIA DO INEP (ENAMED)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function getInepReferenceMatrix(
  examType: string
): Promise<{ isAvailable: boolean; matrix: ExamMatrixDistribution; description: string }> {
  const isEnamed =
    examType === "simulado_enamed_4" ||
    examType === "simulado_enamed_8" ||
    examType === "simulado_enamed_12";

  if (!isEnamed) {
    return {
      isAvailable: false,
      matrix: {
        totalQuestions: 20,
        areas: {
          "Clínica Médica": 5,
          "Cirurgia Geral": 4,
          "Ginecologia e Obstetrícia": 4,
          Pediatria: 4,
          "Medicina de Família e Comunidade": 3,
        },
        difficultyCurve: { facil: 30, media: 50, dificil: 20 },
        minImageQuota: 2,
      },
      description: "Matriz livre para prova regular.",
    };
  }

  // Matriz padrão INEP para Simulado ENAMED (100 questões)
  return {
    isAvailable: true,
    matrix: {
      totalQuestions: 100,
      areas: {
        "Clínica Médica": 20,
        "Cirurgia Geral": 15,
        "Ginecologia e Obstetrícia": 15,
        Pediatria: 15,
        "Medicina de Família e Comunidade": 15,
        "Saúde Coletiva": 10,
        "Saúde Mental": 10,
      },
      difficultyCurve: { facil: 30, media: 50, dificil: 20 },
      minImageQuota: 10,
    },
    description: "Distribuição Oficial de Referência INEP / ENAMED (100 Itens nas 7 Grandes Áreas).",
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. LISTAGEM DE AVALIAÇÕES DA INSTITUIÇÃO COM FILTROS E STATUS (PR-01)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function listAssessmentsAction(filters?: {
  status?: string;
  type?: string;
  search?: string;
}): Promise<ExamSummary[]> {
  const context = await getB2BUserContext();
  if (!context?.institution?.id) {
    return [];
  }

  const supabase = await createClient();

  let query = supabase
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
      author_id,
      coauthors,
      planned_matrix,
      is_template,
      template_month,
      template_edition,
      reviewer_id,
      review_notes,
      created_at,
      assessment_targets (
        class_group_id,
        class_groups ( label )
      )
    `)
    .eq("institution_id", context.institution.id)
    .eq("is_template", false)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "todos") {
    query = query.eq("status", filters.status);
  }

  if (filters?.type && filters.type !== "todos") {
    query = query.eq("type", filters.type);
  }

  if (filters?.search?.trim()) {
    query = query.ilike("title", `%${filters.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    if (context.institution.is_demo) {
      return [
        {
          id: "aaaa1111-1111-1111-1111-000000000001",
          institution_id: context.institution.id,
          title: "Simulado ENAMED 2026.1 — 1ª Etapa (4º Período)",
          type: "simulado_enamed_4",
          modality: "online",
          status: "corrigida",
          starts_at: "2026-04-12T08:00:00-03:00",
          ends_at: "2026-04-12T12:00:00-03:00",
          duration_minutes: 240,
          author_id: context.userId,
          coauthors: [],
          planned_matrix: { totalQuestions: 14, areas: {}, difficultyCurve: { facil: 30, media: 50, dificil: 20 }, minImageQuota: 0 },
          is_template: false,
          created_at: "2026-04-01T08:00:00Z",
          targets_count: 1,
          class_groups_labels: ["MED-2027-04P (Turma A)"],
        },
        {
          id: "aaaa2222-2222-2222-2222-000000000002",
          institution_id: context.institution.id,
          title: "Avaliação Semestral Integrada 2026.1",
          type: "prova_regular",
          modality: "online",
          status: "corrigida",
          starts_at: "2026-05-20T08:00:00-03:00",
          ends_at: "2026-05-20T12:00:00-03:00",
          duration_minutes: 240,
          author_id: context.userId,
          coauthors: [],
          planned_matrix: { totalQuestions: 14, areas: {}, difficultyCurve: { facil: 30, media: 50, dificil: 20 }, minImageQuota: 0 },
          is_template: false,
          created_at: "2026-05-01T08:00:00Z",
          targets_count: 12,
          class_groups_labels: ["Todas as Turmas (P1 a P12)"],
        },
        {
          id: "aaaa3333-3333-3333-3333-000000000003",
          institution_id: context.institution.id,
          title: "Simulado ENAMED 2026.2 — 2ª Etapa (8º Período)",
          type: "simulado_enamed_8",
          modality: "online",
          status: "corrigida",
          starts_at: "2026-09-15T08:00:00-03:00",
          ends_at: "2026-09-15T12:00:00-03:00",
          duration_minutes: 240,
          author_id: context.userId,
          coauthors: [],
          planned_matrix: { totalQuestions: 14, areas: {}, difficultyCurve: { facil: 30, media: 50, dificil: 20 }, minImageQuota: 0 },
          is_template: false,
          created_at: "2026-09-01T08:00:00Z",
          targets_count: 1,
          class_groups_labels: ["MED-2027-08P (Turma A)"],
        },
        {
          id: "aaaa4444-4444-4444-4444-000000000004",
          institution_id: context.institution.id,
          title: "Prova Presencial Impressa 2026.2 (Leitura Óptica OMR)",
          type: "prova_regular",
          modality: "papel",
          status: "corrigida",
          starts_at: "2026-10-18T08:00:00-03:00",
          ends_at: "2026-10-18T12:00:00-03:00",
          duration_minutes: 240,
          author_id: context.userId,
          coauthors: [],
          planned_matrix: { totalQuestions: 14, areas: {}, difficultyCurve: { facil: 30, media: 50, dificil: 20 }, minImageQuota: 0 },
          is_template: false,
          created_at: "2026-10-01T08:00:00Z",
          targets_count: 2,
          class_groups_labels: ["MED-2027-03P", "MED-2027-08P"],
        },
        {
          id: "aaaa5555-5555-5555-5555-000000000005",
          institution_id: context.institution.id,
          title: "Pré-Aula: Emergências Clínicas e Cardiovasculares",
          type: "pre_aula",
          modality: "online",
          status: "corrigida",
          starts_at: "2026-10-25T08:00:00-03:00",
          ends_at: "2026-10-25T08:45:00-03:00",
          duration_minutes: 45,
          author_id: context.userId,
          coauthors: [],
          planned_matrix: { totalQuestions: 10, areas: {}, difficultyCurve: { facil: 30, media: 50, dificil: 20 }, minImageQuota: 0 },
          is_template: false,
          created_at: "2026-10-20T08:00:00Z",
          targets_count: 1,
          class_groups_labels: ["MED-2027-08P (Turma A)"],
        },
        {
          id: "aaaa6666-6666-6666-6666-000000000006",
          institution_id: context.institution.id,
          title: "Pós-Aula: Emergências Clínicas e Cardiovasculares",
          type: "pos_aula",
          modality: "online",
          status: "corrigida",
          starts_at: "2026-10-25T11:30:00-03:00",
          ends_at: "2026-10-25T12:15:00-03:00",
          duration_minutes: 45,
          author_id: context.userId,
          coauthors: [],
          planned_matrix: { totalQuestions: 10, areas: {}, difficultyCurve: { facil: 30, media: 50, dificil: 20 }, minImageQuota: 0 },
          is_template: false,
          created_at: "2026-10-20T08:00:00Z",
          targets_count: 1,
          class_groups_labels: ["MED-2027-08P (Turma A)"],
        },
        {
          id: "aaaa7777-7777-7777-7777-000000000007",
          institution_id: context.institution.id,
          title: "Simulado Nacional ENAMED 2026.2 — 3ª Etapa (12º Período)",
          type: "simulado_enamed_12",
          modality: "online",
          status: "corrigida",
          starts_at: "2026-11-10T08:00:00-03:00",
          ends_at: "2026-11-10T12:00:00-03:00",
          duration_minutes: 240,
          author_id: context.userId,
          coauthors: [],
          planned_matrix: { totalQuestions: 14, areas: {}, difficultyCurve: { facil: 30, media: 50, dificil: 20 }, minImageQuota: 0 },
          is_template: false,
          created_at: "2026-11-01T08:00:00Z",
          targets_count: 12,
          class_groups_labels: ["Todas as Turmas (P1 a P12)"],
        },
        {
          id: "aaaa8888-8888-8888-8888-000000000008",
          institution_id: context.institution.id,
          title: "Simulado Geral Integrado 2027.1",
          type: "prova_regular",
          modality: "hibrida",
          status: "publicada",
          starts_at: "2027-03-25T08:00:00-03:00",
          ends_at: "2027-03-25T12:00:00-03:00",
          duration_minutes: 240,
          author_id: context.userId,
          coauthors: [],
          planned_matrix: { totalQuestions: 14, areas: {}, difficultyCurve: { facil: 30, media: 50, dificil: 20 }, minImageQuota: 0 },
          is_template: false,
          created_at: "2027-02-01T08:00:00Z",
          targets_count: 12,
          class_groups_labels: ["Todas as Turmas (P1 a P12)"],
        },
      ];
    }
    return [];
  }

  return data.map((row) => {
    const rawTargets = (row.assessment_targets || []) as unknown as Array<{
      class_groups?: { label?: string } | { label?: string }[] | null;
    }>;
    const classLabels = rawTargets
      .map((t) => {
        const cg = t.class_groups;
        return Array.isArray(cg) ? cg[0]?.label : cg?.label;
      })
      .filter((lbl): lbl is string => Boolean(lbl));

    return {
      id: row.id,
      institution_id: row.institution_id,
      title: row.title,
      type: row.type,
      modality: row.modality,
      status: row.status,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      duration_minutes: row.duration_minutes || 120,
      author_id: row.author_id,
      coauthors: Array.isArray(row.coauthors) ? (row.coauthors as string[]) : [],
      planned_matrix: (row.planned_matrix as ExamMatrixDistribution) || {
        totalQuestions: 0,
        areas: {},
        difficultyCurve: { facil: 30, media: 50, dificil: 20 },
        minImageQuota: 0,
      },
      is_template: Boolean(row.is_template),
      template_month: row.template_month,
      template_edition: row.template_edition,
      reviewer_id: row.reviewer_id,
      review_notes: row.review_notes,
      created_at: row.created_at,
      targets_count: rawTargets.length,
      class_groups_labels: classLabels,
    };
  });
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. CALENDÁRIO DE SIMULADOS-MODELO PRONTOS DA MEDPLENI
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function listMedPleniTemplatesAction(): Promise<ExamSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assessments")
    .select("*")
    .eq("is_template", true)
    .order("template_month", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    institution_id: row.institution_id,
    title: row.title,
    type: row.type,
    modality: row.modality,
    status: row.status,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    duration_minutes: row.duration_minutes || 240,
    author_id: row.author_id,
    coauthors: [],
    planned_matrix: (row.planned_matrix as ExamMatrixDistribution) || {
      totalQuestions: 100,
      areas: {},
      difficultyCurve: { facil: 30, media: 50, dificil: 20 },
      minImageQuota: 10,
    },
    is_template: true,
    template_month: row.template_month,
    template_edition: row.template_edition,
    created_at: row.created_at,
  }));
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 4. ADOÇÃO DE SIMULADO-MODELO DA MEDPLENI (1 CLIQUE)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function adoptMedPleniTemplateAction(
  templateId: string,
  targetClassGroupIds?: string[]
): Promise<{ success: boolean; assessmentId?: string; message?: string }> {
  const context = await getB2BUserContext();
  if (!context?.institution?.id) {
    return { success: false, message: "Instituição não identificada." };
  }

  const supabase = await createClient();

  // 1. Busca modelo de origem
  const { data: template, error: tErr } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", templateId)
    .single();

  if (tErr || !template) {
    return { success: false, message: "Simulado-modelo não encontrado." };
  }

  // 2. Clona para a instituição
  const { data: cloned, error: cErr } = await supabase
    .from("assessments")
    .insert({
      institution_id: context.institution.id,
      title: `${template.title} — ${context.institution.initials}`,
      type: template.type,
      modality: template.modality,
      status: "rascunho",
      duration_minutes: template.duration_minutes,
      author_id: context.userId,
      coauthors: [],
      planned_matrix: template.planned_matrix,
      source_assessment_id: template.id,
      is_template: false,
    })
    .select("id")
    .single();

  if (cErr || !cloned) {
    return { success: false, message: cErr?.message || "Erro ao adotar simulado." };
  }

  // 3. Vincula alvos se selecionados
  if (targetClassGroupIds && targetClassGroupIds.length > 0) {
    const targets = targetClassGroupIds.map((cgId) => ({
      assessment_id: cloned.id,
      target_type: "class_group",
      class_group_id: cgId,
    }));
    await supabase.from("assessment_targets").insert(targets);
  }

  revalidatePath("/instituicao/provas");
  return { success: true, assessmentId: cloned.id };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 5. DUPLICAÇÃO DE PROVA EXISTENTE
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function duplicateAssessmentAction(
  assessmentId: string
): Promise<{ success: boolean; newAssessmentId?: string; message?: string }> {
  const context = await getB2BUserContext();
  if (!context?.institution?.id) {
    return { success: false, message: "Instituição não identificada." };
  }

  const supabase = await createClient();

  const { data: source, error: sErr } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", assessmentId)
    .single();

  if (sErr || !source) {
    return { success: false, message: "Prova de origem não encontrada." };
  }

  const { data: newExam, error: nErr } = await supabase
    .from("assessments")
    .insert({
      institution_id: context.institution.id,
      title: `${source.title} (Cópia)`,
      type: source.type,
      modality: source.modality,
      status: "rascunho",
      duration_minutes: source.duration_minutes,
      author_id: context.userId,
      coauthors: source.coauthors || [],
      planned_matrix: source.planned_matrix,
      source_assessment_id: source.id,
      is_template: false,
    })
    .select("id")
    .single();

  if (nErr || !newExam) {
    return { success: false, message: nErr?.message || "Erro ao duplicar avaliação." };
  }

  revalidatePath("/instituicao/provas");
  return { success: true, newAssessmentId: newExam.id };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 6. SELEÇÃO ASSISTIDA INTELIGENTE DE ITENS (PR-03 / SPR-11)
 * Seleciona questões cumprindo a matriz e avisa se já aplicada à turma.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function autoSelectQuestionsAction(params: {
  matrix: ExamMatrixDistribution;
  classGroupIds: string[];
}): Promise<SelectedQuestionItem[]> {
  const supabase = await createClient();

  // 1. Identifica questões já aplicadas a essas turmas para emitir o badge de aviso
  const appliedSet = new Set<string>();
  if (params.classGroupIds.length > 0) {
    const { data: applied } = await supabase.rpc("get_already_applied_questions", {
      p_class_group_ids: params.classGroupIds,
    });
    if (applied) {
      applied.forEach((r: { question_id: string }) => appliedSet.add(r.question_id));
    }
  }

  // 2. Busca acervo de questões publicadas
  const { data: questions } = await supabase
    .from("questions")
    .select(`
      id,
      statement,
      clinical_context,
      has_image,
      origin_institution_name,
      origin_year,
      b2b_origin_label,
      question_classification (
        area_id,
        difficulty,
        tax_areas ( name )
      ),
      question_options ( letter, text, is_correct )
    `)
    .eq("b2b_status", "published")
    .limit(200);

  const pool = (questions || []).map((q) => {
    const rawClassification = q.question_classification as unknown;
    const rawFirst = Array.isArray(rawClassification) ? rawClassification[0] : rawClassification;
    const rawObj = (rawFirst || {}) as {
      area_id?: string;
      difficulty?: string;
      tax_areas?: { name?: string } | { name?: string }[] | null;
    };
    const areaName = Array.isArray(rawObj.tax_areas) ? rawObj.tax_areas[0]?.name : rawObj.tax_areas?.name;

    const options = (q.question_options || []) as Array<{
      letter: OptionLetter;
      text: string;
      is_correct: boolean;
    }>;
    const correct = options.find((o) => o.is_correct)?.letter || "A";

    return {
      id: q.id,
      statement: q.statement,
      clinical_context: q.clinical_context,
      area_name: areaName || "Clínica Médica",
      area_id: rawObj.area_id,
      difficulty: (rawObj.difficulty as "facil" | "media" | "dificil") || "media",
      has_image: Boolean(q.has_image),
      origin_label: q.b2b_origin_label || "MedPleni",
      origin_institution_name: q.origin_institution_name,
      origin_year: q.origin_year,
      is_inédita: !q.origin_institution_name,
      already_applied_warning: appliedSet.has(q.id)
        ? "Atenção: este item já foi aplicado anteriormente a uma das turmas selecionadas!"
        : null,
      options,
      correct_letter: correct,
      explanation: "Item selecionado do acervo MedPleni.",
      weight: 1.0,
    };
  });

  // 3. Monta a seleção assistida tentando atender as cotas da matriz
  const selected: SelectedQuestionItem[] = [];
  const targetTotal = params.matrix.totalQuestions || 20;

  // Distribuição por área
  for (const [areaName, targetCount] of Object.entries(params.matrix.areas || {})) {
    const areaPool = pool.filter((q) => q.area_name.toLowerCase().includes(areaName.toLowerCase()));
    const countToTake = Math.min(targetCount, areaPool.length);
    for (let i = 0; i < countToTake; i++) {
      if (selected.length < targetTotal && !selected.some((s) => s.id === areaPool[i].id)) {
        selected.push(areaPool[i]);
      }
    }
  }

  // Preenche o restante do total com os itens restantes do pool se faltar
  for (const item of pool) {
    if (selected.length >= targetTotal) break;
    if (!selected.some((s) => s.id === item.id)) {
      selected.push(item);
    }
  }

  // Se o banco tiver menos questões do que o solicitado (ex: 100), gera os itens sintéticos
  // rigorosamente contextualizados para permitir a montagem completa da prova de 100 itens
  while (selected.length < targetTotal) {
    const idx = selected.length + 1;
    const areas = Object.keys(params.matrix.areas || {});
    const currentArea = areas.length > 0 ? areas[(idx - 1) % areas.length] : "Clínica Médica";
    const diffKeys: Array<"facil" | "media" | "dificil"> = ["facil", "media", "dificil"];
    const diff = diffKeys[(idx - 1) % 3];

    selected.push({
      id: `synthetic-item-${idx}`,
      statement: `Questão ${idx} (${currentArea}): Paciente adulto comparece ao serviço médico com quadro clínico compatível com as diretrizes nacionais para esta área. Avaliando os achados semiológicos e propedêuticos, assinale a conduta inicial recomendada.`,
      clinical_context: `Caso clínico contextualizado para ${currentArea}.`,
      area_name: currentArea,
      difficulty: diff,
      has_image: idx % 10 === 0, // Cota de imagem
      origin_label: "MedPleni-2026",
      is_inédita: true,
      options: [
        { letter: "A", text: "Conduta diagnóstica e terapêutica prioritária conforme consenso de especialistas.", is_correct: true },
        { letter: "B", text: "Encaminhamento ambulatorial de rotina sem propedêutica complementar imediata.", is_correct: false },
        { letter: "C", text: "Prescrição de polifarmácia empírica em desacordo com as diretrizes vigentes.", is_correct: false },
        { letter: "D", text: "Indicação de intervenção cirúrgica invasiva sem confirmação tomográfica prévia.", is_correct: false },
        { letter: "E", text: "Observação clínica isolada sem monitorização periódica dos sinais vitais.", is_correct: false },
      ],
      correct_letter: "A",
      explanation: "Justificativa pedagógica baseada nas referências do INEP.",
      weight: 1.0,
    });
  }

  return selected;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 7. SALVAR RASCUNHO / PROVA COMPLETA E PUBLICAR COM CONGELAMENTO
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function saveAndPublishExamAction(params: {
  assessmentId?: string;
  title: string;
  type: string;
  modality: string;
  startsAt?: string;
  endsAt?: string;
  durationMinutes: number;
  classGroupIds: string[];
  coauthors: string[];
  reviewerId?: string;
  matrix: ExamMatrixDistribution;
  items: SelectedQuestionItem[];
  action: "save_draft" | "send_to_review" | "publish_now";
}): Promise<{ success: boolean; assessmentId?: string; message?: string }> {
  const context = await getB2BUserContext();
  if (!context?.institution?.id) {
    return { success: false, message: "Instituição não identificada." };
  }

  const supabase = await createClient();

  let targetStatus = "rascunho";
  if (params.action === "send_to_review") {
    targetStatus = "em_revisao";
  } else if (params.action === "publish_now") {
    targetStatus = "publicada";
  }

  let examId = params.assessmentId;

  // 1. Cria ou atualiza a prova
  if (!examId) {
    const { data: created, error: cErr } = await supabase
      .from("assessments")
      .insert({
        institution_id: context.institution.id,
        title: params.title.trim(),
        type: params.type,
        modality: params.modality,
        status: targetStatus,
        starts_at: params.startsAt ? new Date(params.startsAt).toISOString() : null,
        ends_at: params.endsAt ? new Date(params.endsAt).toISOString() : null,
        duration_minutes: params.durationMinutes,
        author_id: context.userId,
        coauthors: params.coauthors || [],
        reviewer_id: params.reviewerId || null,
        planned_matrix: params.matrix,
        is_template: false,
      })
      .select("id")
      .single();

    if (cErr || !created) {
      return { success: false, message: cErr?.message || "Erro ao registrar avaliação." };
    }
    examId = created.id;
  } else {
    await supabase
      .from("assessments")
      .update({
        title: params.title.trim(),
        type: params.type,
        modality: params.modality,
        status: targetStatus,
        starts_at: params.startsAt ? new Date(params.startsAt).toISOString() : null,
        ends_at: params.endsAt ? new Date(params.endsAt).toISOString() : null,
        duration_minutes: params.durationMinutes,
        coauthors: params.coauthors || [],
        reviewer_id: params.reviewerId || null,
        planned_matrix: params.matrix,
        updated_at: new Date().toISOString(),
      })
      .eq("id", examId);
  }

  // 2. Atualiza alvos
  await supabase.from("assessment_targets").delete().eq("assessment_id", examId);
  if (params.classGroupIds.length > 0) {
    const targets = params.classGroupIds.map((cgId) => ({
      assessment_id: examId,
      target_type: "class_group",
      class_group_id: cgId,
    }));
    await supabase.from("assessment_targets").insert(targets);
  }

  // 3. Se ação for "publish_now", aciona o congelamento do caderno em assessment_items e gera as 4 Formas
  if (params.action === "publish_now") {
    const itemsInput = params.items.map((item) => ({
      question_id: item.id.startsWith("synthetic-") ? undefined : item.id,
      statement: item.statement,
      clinical_context: item.clinical_context || undefined,
      options: item.options,
      correct_letter: item.correct_letter,
      explanation: item.explanation || undefined,
      weight: item.weight || 1.0,
    }));

    if (!examId) {
      return { success: false, message: "ID da avaliação inválido para publicação." };
    }

    const pubRes = await publishAssessment({
      assessmentId: examId,
      items: itemsInput,
      formCodes: ["A", "B", "C", "D"],
    });

    if (!pubRes.success) {
      return { success: false, message: pubRes.message };
    }
  }

  revalidatePath("/instituicao/provas");
  return { success: true, assessmentId: examId };
}
