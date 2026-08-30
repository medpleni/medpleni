import { createClient } from "./client";
import type { Questao, Alternativa, Area, Dificuldade, ProvAlvo } from "../types";
import { mockQuestions } from "../mock-data";

export interface QuestionFilter {
  institution?: string;
  area?: string;
  difficulty?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Busca questões no Supabase com filtros opcionais
 * Faz fallback suave para mockQuestions se a tabela ainda não tiver dados suficientes
 */
export async function fetchQuestions(filter?: QuestionFilter): Promise<Questao[]> {
  try {
    const supabase = createClient();
    let query = supabase
      .from("questions")
      .select(`
        id,
        code,
        statement,
        clinical_context,
        institution,
        year,
        area,
        subarea,
        difficulty,
        explanation,
        tags,
        question_options (
          letter,
          text,
          is_correct
        )
      `)
      .order("created_at", { ascending: true });

    if (filter?.institution && filter.institution !== "Todas") {
      query = query.eq("institution", filter.institution);
    }
    if (filter?.area && filter.area !== "Todas") {
      if (filter.area === "GO") {
        query = query.eq("area", "Ginecologia e Obstetrícia");
      } else {
        query = query.eq("area", filter.area);
      }
    }
    if (filter?.difficulty && filter.difficulty !== "Todas") {
      const difMap: Record<string, string> = {
        Fácil: "facil",
        Média: "media",
        Alta: "alta",
        "Muito Alta": "muito-alta",
      };
      const dbDif = difMap[filter.difficulty] || filter.difficulty.toLowerCase();
      query = query.eq("difficulty", dbDif);
    }
    if (filter?.search) {
      query = query.ilike("statement", `%${filter.search}%`);
    }
    if (filter?.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      // Fallback para mock
      return filterMockQuestions(filter);
    }

    return data.map((q: any, idx: number) => {
      const options: Alternativa[] = (q.question_options || [])
        .sort((a: any, b: any) => a.letter.localeCompare(b.letter))
        .map((opt: any) => ({
          letra: opt.letter as "A" | "B" | "C" | "D" | "E",
          texto: opt.text,
        }));

      const correctOpt = (q.question_options || []).find((o: any) => o.is_correct);

      return {
        id: q.id,
        numero: idx + 1,
        enunciado: q.statement,
        contextoClinico: q.clinical_context || undefined,
        alternativas: options.length > 0 ? options : mockQuestions[0].alternativas,
        gabarito: (correctOpt?.letter || "A") as "A" | "B" | "C" | "D" | "E",
        area: q.area as Area,
        subarea: q.subarea,
        dificuldade: q.difficulty as Dificuldade,
        instituicao: q.institution as ProvAlvo,
        ano: q.year,
        explicacao: q.explanation,
        tags: q.tags || [],
      };
    });
  } catch (err) {
    console.warn("Aviso ao buscar questões no Supabase, usando dados locais:", err);
    return filterMockQuestions(filter);
  }
}

function filterMockQuestions(filter?: QuestionFilter): Questao[] {
  let list = [...mockQuestions];
  if (filter?.institution && filter.institution !== "Todas") {
    list = list.filter((q) => q.instituicao === filter.institution);
  }
  if (filter?.area && filter.area !== "Todas") {
    if (filter.area === "GO") {
      list = list.filter((q) => q.area === "Ginecologia e Obstetrícia");
    } else {
      list = list.filter((q) => q.area === filter.area);
    }
  }
  if (filter?.difficulty && filter.difficulty !== "Todas") {
    const difMap: Record<string, string> = {
      Fácil: "facil",
      Média: "media",
      Alta: "alta",
      "Muito Alta": "muito-alta",
    };
    const mapped = difMap[filter.difficulty];
    if (mapped) {
      list = list.filter((q) => q.dificuldade === mapped);
    }
  }
  if (filter?.search) {
    list = list.filter((q) =>
      q.enunciado.toLowerCase().includes(filter.search!.toLowerCase())
    );
  }
  if (filter?.limit) {
    list = list.slice(0, filter.limit);
  }
  return list;
}

/**
 * Salva a resposta de uma questão no Supabase
 */
export async function submitUserAnswer(params: {
  userId: string;
  questionId: string;
  selectedLetter: string;
  isCorrect: boolean;
  confidence?: number;
  timeSpentSeconds?: number;
  contextType?: "standalone" | "simulation" | "diagnostic";
  simulationId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("user_answers").insert({
      user_id: params.userId,
      question_id: params.questionId,
      selected_letter: params.selectedLetter,
      is_correct: params.isCorrect,
      confidence: params.confidence || 3,
      time_spent_seconds: params.timeSpentSeconds || 0,
      context_type: params.contextType || "standalone",
      simulation_id: params.simulationId || null,
    });

    if (error) {
      console.warn("Aviso ao registrar resposta no Supabase:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Busca respostas prévias do usuário
 */
export async function fetchUserAnswers(userId: string): Promise<Record<string, { selected: string; isCorrect: boolean }>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_answers")
      .select("question_id, selected_letter, is_correct")
      .eq("user_id", userId);

    if (error || !data) return {};

    const map: Record<string, { selected: string; isCorrect: boolean }> = {};
    data.forEach((row: any) => {
      map[row.question_id] = {
        selected: row.selected_letter,
        isCorrect: row.is_correct,
      };
    });
    return map;
  } catch {
    return {};
  }
}
