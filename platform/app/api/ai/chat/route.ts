import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callOpenRouterStream, ChatMessage } from "@/lib/ai/openrouter";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json();
    const {
      messages,
      conversationId,
      model = "anthropic/claude-3.7-sonnet",
      mode = "tira_duvidas",
      area = "Geral",
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Mensagens são obrigatórias." },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1];

    let currentConvId = conversationId;

    // Se o usuário estiver autenticado e não tiver conversationId, cria uma conversa no Supabase
    if (user && !currentConvId) {
      const title = lastMessage.content.slice(0, 45) + (lastMessage.content.length > 45 ? "..." : "");
      const { data: newConv } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: user.id,
          title,
          area,
          mode,
          model_used: model,
        })
        .select("id")
        .single();

      if (newConv) {
        currentConvId = newConv.id;
      }
    }

    // Salva a mensagem do usuário no Supabase se houver convId
    if (user && currentConvId) {
      await supabase.from("ai_messages").insert({
        conversation_id: currentConvId,
        user_id: user.id,
        role: "user",
        content: lastMessage.content,
        metadata: { mode, model },
      });
    }

    // Chama o OpenRouter em streaming
    const stream = await callOpenRouterStream({
      messages: messages as ChatMessage[],
      model,
      mode,
      area,
      temperature: 0.3,
    });

    if (!stream) {
      return NextResponse.json({ error: "Falha ao gerar stream." }, { status: 500 });
    }

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Conversation-Id": currentConvId || "",
      },
    });
  } catch (err: any) {
    console.error("[API AI Chat Error]:", err);
    return NextResponse.json(
      { error: err?.message || "Erro interno ao processar resposta do Dr. Pleni." },
      { status: 500 }
    );
  }
}
