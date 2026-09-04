import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      title,
      areas = [],
      difficulty = "misto",
      questionFilter = "todas",
      totalQuestions = 40,
      mode = "prova_real", // 'prova_real' | 'estudo_guiado'
    } = body;

    // 1. Busca questões disponíveis no banco
    let query = supabase.from("questions").select("id, area, difficulty");

    if (areas.length > 0) {
      query = query.in("area", areas);
    }

    if (difficulty && difficulty !== "misto") {
      query = query.eq("difficulty", difficulty);
    }

    const { data: availableQuestions, error: qErr } = await query;
    if (qErr || !availableQuestions || availableQuestions.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma questão encontrada com os filtros selecionados." },
        { status: 404 }
      );
    }

    // Embaralha e seleciona a quantidade solicitada
    const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
    const selectedCount = Math.min(totalQuestions, shuffled.length);

    const durationMinutes = Math.round(selectedCount * 2.4); // ~2.4 minutos por questão médica
    const customTitle = title?.trim() || `Simulado Personalizado: ${areas.join(", ") || "Geral"}`;

    // 2. Insere o simulado na tabela simulations
    const { data: newSim, error: simErr } = await supabase
      .from("simulations")
      .insert({
        title: customTitle,
        institution: "PERSONALIZADO",
        area: areas.length === 1 ? areas[0] : "Multidisciplinar",
        total_questions: selectedCount,
        duration_minutes: durationMinutes,
        description: `Simulado criado sob medida (${selectedCount} questões de ${areas.join(", ") || "Todas as áreas"}). Modo: ${mode === "prova_real" ? "Prova Real com Cronômetro" : "Estudo Guiado"}.`,
        sim_type: "personalizado",
        is_official: false,
      })
      .select("*")
      .single();

    if (simErr || !newSim) {
      console.error("Erro ao salvar simulado personalizado:", simErr);
      return NextResponse.json(
        { error: simErr?.message || "Erro ao criar simulado." },
        { status: 500 }
      );
    }

    // 3. Se o usuário estiver autenticado, cria o registro em user_simulations
    if (user) {
      await supabase.from("user_simulations").insert({
        user_id: user.id,
        simulation_id: newSim.id,
        status: "em_andamento",
        started_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      simulationId: newSim.id,
      simulation: newSim,
    });
  } catch (err: any) {
    console.error("[API Custom Simulation Error]:", err);
    return NextResponse.json(
      { error: err?.message || "Erro interno ao gerar simulado personalizado." },
      { status: 500 }
    );
  }
}
