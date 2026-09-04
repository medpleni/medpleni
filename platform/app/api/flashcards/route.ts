import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const area = searchParams.get("area");
    const search = searchParams.get("search");

    let query = supabase.from("flashcards").select("*").order("created_at", { ascending: false });

    if (area && area !== "Todas") {
      query = query.eq("area", area);
    }

    const { data: flashcards, error } = await query;
    if (error) throw error;

    let filtered = flashcards || [];
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.front?.toLowerCase().includes(s) ||
          f.back?.toLowerCase().includes(s) ||
          f.subarea?.toLowerCase().includes(s)
      );
    }

    return NextResponse.json({ flashcards: filtered });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Faça login para criar flashcards." }, { status: 401 });
    }

    const body = await request.json();
    const { front, back, area = "Clínica Médica", subarea = "Preceptor IA" } = body;

    if (!front?.trim() || !back?.trim()) {
      return NextResponse.json(
        { error: "Frente (pergunta) e Verso (resposta) são obrigatórios." },
        { status: 400 }
      );
    }

    // 1. Cria o flashcard no banco
    const { data: flashcard, error: fErr } = await supabase
      .from("flashcards")
      .insert({
        front: front.trim(),
        back: back.trim(),
        area,
        subarea: subarea.trim(),
      })
      .select("*")
      .single();

    if (fErr || !flashcard) {
      console.error("Erro ao inserir flashcard:", fErr);
      return NextResponse.json(
        { error: fErr?.message || "Erro ao criar flashcard." },
        { status: 500 }
      );
    }

    // 2. Inicia o agendamento de repetição espaçada (SRS) para o usuário
    await supabase.from("user_flashcard_reviews").upsert({
      user_id: user.id,
      flashcard_id: flashcard.id,
      ease_factor: 2.5,
      interval_days: 1,
      repetitions: 0,
      next_review_at: new Date().toISOString(),
      last_reviewed_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, flashcard });
  } catch (err: any) {
    console.error("[API Flashcards Error]:", err);
    return NextResponse.json(
      { error: err?.message || "Erro interno ao salvar flashcard." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    }

    await supabase.from("flashcards").delete().eq("id", id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Faça login para editar flashcards." }, { status: 401 });
    }

    const body = await request.json();
    const { id, front, back, area, subarea } = body;

    if (!id || !front?.trim() || !back?.trim()) {
      return NextResponse.json({ error: "ID, frente e verso são obrigatórios." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("flashcards")
      .update({
        front: front.trim(),
        back: back.trim(),
        ...(area ? { area } : {}),
        ...(subarea ? { subarea: subarea.trim() } : {}),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, flashcard: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erro ao atualizar flashcard." }, { status: 500 });
  }
}

