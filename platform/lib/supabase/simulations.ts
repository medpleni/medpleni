import { createClient } from "./client";
import type { Simulado, Questao, Area, SimuladoStatus } from "../types";
import { mockSimulados, mockQuestions } from "../mock-data";
import { fetchQuestions } from "./questions";

export interface SimulationResultSummary {
  simulationId: string;
  title: string;
  institution: string;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  scorePercent: number;
  timeSpentSeconds: number;
  cutoffScore: number;
  passedCutoff: boolean;
  areaBreakdown: {
    area: string;
    total: number;
    correct: number;
    pct: number;
  }[];
  confidenceAnalysis: {
    highConfidenceAccuracy: number; // % acertadas quando confiança 4-5
    lowConfidenceAccuracy: number;  // % acertadas quando confiança 1-2
  };
}

/**
 * Busca todos os simulados disponíveis com o status do usuário logado
 */
export async function fetchSimulations(userId?: string): Promise<Simulado[]> {
  try {
    const supabase = createClient();
    const { data: sims, error } = await supabase
      .from("simulations")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !sims || sims.length === 0) {
      return mockSimulados;
    }

    let userSimMap: Record<string, { status: SimuladoStatus; score?: number }> = {};
    if (userId) {
      const { data: userSims } = await supabase
        .from("user_simulations")
        .select("simulation_id, status, score_percent")
        .eq("user_id", userId);

      if (userSims) {
        userSims.forEach((us: any) => {
          userSimMap[us.simulation_id] = {
            status: us.status as SimuladoStatus,
            score: us.score_percent ? Number(us.score_percent) : undefined,
          };
        });
      }
    }

    return sims.map((s: any) => {
      const userProgress = userSimMap[s.id];
      return {
        id: s.id,
        titulo: s.title,
        instituicao: s.institution,
        area: s.area as Area,
        totalQuestoes: s.total_questions,
        duracaoMinutos: s.duration_minutes,
        status: userProgress?.status || "nao_iniciado",
        percentualAcerto: userProgress?.score,
        descricao: s.description || undefined,
      };
    });
  } catch (err) {
    console.warn("Aviso ao buscar simulados no Supabase, usando dados locais:", err);
    return mockSimulados;
  }
}

/**
 * Busca detalhes de um simulado específico e suas questões reais do banco
 */
export async function fetchSimulationDetails(
  simulationId: string,
  userId?: string
): Promise<{ simulation: Simulado; questions: Questao[] }> {
  try {
    const sims = await fetchSimulations(userId);
    const sim = sims.find((s) => s.id === simulationId) || sims[0] || mockSimulados[0];

    let filterInst: string | undefined = undefined;
    let filterArea: string | undefined = undefined;

    if (sim.instituicao === "ENAMED") {
      filterInst = "ENAMED";
    } else if (sim.instituicao === "REVALIDA") {
      filterInst = "REVALIDA";
    } else if (sim.instituicao === "ENARE") {
      filterInst = "ENARE";
    } else if (sim.instituicao === "TEMÁTICO") {
      filterArea = sim.area as string;
    }

    // Busca as questões reais no Supabase
    let qs = await fetchQuestions({
      institution: filterInst,
      area: filterArea,
      limit: sim.totalQuestoes || 50,
    });

    if (qs.length === 0) {
      // Fallback para qualquer questão do banco
      qs = await fetchQuestions({ limit: sim.totalQuestoes || 50 });
    }

    if (qs.length === 0) {
      qs = mockQuestions;
    }

    return { simulation: sim, questions: qs };
  } catch {
    return { simulation: mockSimulados[0], questions: mockQuestions };
  }
}

/**
 * Conclui um simulado, calcula métricas de calibração e persiste no Supabase
 */
export async function finishSimulation(params: {
  userId?: string;
  simulation: Simulado;
  questions: Questao[];
  answers: Record<number, { letter: string; confidence: number }>;
  timeSpentSeconds: number;
}): Promise<SimulationResultSummary> {
  const { simulation, questions, answers, timeSpentSeconds, userId } = params;

  let correctCount = 0;
  let answeredCount = 0;

  const areaStats: Record<string, { total: number; correct: number }> = {};
  let highConfTotal = 0;
  let highConfCorrect = 0;
  let lowConfTotal = 0;
  let lowConfCorrect = 0;

  const cutoffScores: Record<string, number> = {
    ENAMED: 78,
    REVALIDA: 75,
    ENARE: 80,
    TEMÁTICO: 78,
    USP: 82,
    UNIFESP: 80,
    UERJ: 76,
    FMABC: 76,
  };
  const cutoff = cutoffScores[simulation.instituicao] || 78;

  questions.forEach((q, idx) => {
    if (!areaStats[q.area]) {
      areaStats[q.area] = { total: 0, correct: 0 };
    }
    areaStats[q.area].total += 1;

    const ans = answers[idx];
    if (ans) {
      answeredCount += 1;
      const isCorrect = ans.letter === q.gabarito;
      if (isCorrect) {
        correctCount += 1;
        areaStats[q.area].correct += 1;
      }

      if (ans.confidence >= 4) {
        highConfTotal += 1;
        if (isCorrect) highConfCorrect += 1;
      } else if (ans.confidence <= 2) {
        lowConfTotal += 1;
        if (isCorrect) lowConfCorrect += 1;
      }
    }
  });

  const totalQ = questions.length;
  const scorePercent = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;

  const areaBreakdown = Object.entries(areaStats).map(([area, { total, correct }]) => ({
    area,
    total,
    correct,
    pct: total > 0 ? Math.round((correct / total) * 100) : 0,
  }));

  const summary: SimulationResultSummary = {
    simulationId: simulation.id,
    title: simulation.titulo,
    institution: simulation.instituicao,
    totalQuestions: totalQ,
    answeredQuestions: answeredCount,
    correctAnswers: correctCount,
    scorePercent,
    timeSpentSeconds,
    cutoffScore: cutoff,
    passedCutoff: scorePercent >= cutoff,
    areaBreakdown,
    confidenceAnalysis: {
      highConfidenceAccuracy: highConfTotal > 0 ? Math.round((highConfCorrect / highConfTotal) * 100) : 0,
      lowConfidenceAccuracy: lowConfTotal > 0 ? Math.round((lowConfCorrect / lowConfTotal) * 100) : 0,
    },
  };

  // Persistência no Supabase se usuário estiver logado
  if (userId) {
    try {
      const supabase = createClient();

      // Atualiza ou insere na tabela user_simulations
      await supabase.from("user_simulations").upsert({
        user_id: userId,
        simulation_id: simulation.id.includes("-") ? simulation.id : undefined,
        status: "concluido",
        score_percent: scorePercent,
        completed_at: new Date().toISOString(),
        time_spent_seconds: timeSpentSeconds,
      });

      // Salva as respostas das questões
      const answerRows = Object.entries(answers).map(([qIndexStr, ans]) => {
        const q = questions[Number(qIndexStr)];
        return {
          user_id: userId,
          question_id: q?.id,
          selected_letter: ans.letter,
          is_correct: ans.letter === q?.gabarito,
          confidence: ans.confidence,
          context_type: "simulation",
          simulation_id: simulation.id.includes("-") ? simulation.id : null,
        };
      }).filter((r) => r.question_id);

      if (answerRows.length > 0) {
        await supabase.from("user_answers").insert(answerRows);
      }
    } catch (err) {
      console.warn("Aviso ao salvar resultado do simulado no Supabase:", err);
    }
  }

  return summary;
}
