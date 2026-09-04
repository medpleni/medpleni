import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ conversations: [] });
    }

    const { searchParams } = new URL(request.url);
    const convId = searchParams.get("id");

    if (convId) {
      // Retorna as mensagens de uma conversa específica
      const { data: messages } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      return NextResponse.json({ messages: messages || [] });
    }

    // Lista todas as conversas do usuário
    const { data: conversations, error } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("Aviso ao buscar conversas:", error.message);
      return NextResponse.json({ conversations: [] });
    }

    return NextResponse.json({ conversations: conversations || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
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
      return NextResponse.json({ error: "ID da conversa obrigatório" }, { status: 400 });
    }

    await supabase
      .from("ai_conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, role = "assistant", content, metadata } = body;

    if (!conversationId || !content) {
      return NextResponse.json({ error: "conversationId e content são obrigatórios" }, { status: 400 });
    }

    // Insere a mensagem da IA
    const { data: msg, error: msgErr } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role,
        content,
        metadata: metadata || {},
      })
      .select("*")
      .single();

    if (msgErr) {
      console.error("Erro ao salvar mensagem no Supabase:", msgErr);
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }

    // Atualiza a data de última modificação da conversa
    await supabase
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return NextResponse.json({ success: true, message: msg });
  } catch (err: any) {
    console.error("Erro no POST de ai_messages:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

