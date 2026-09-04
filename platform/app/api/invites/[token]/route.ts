import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: "Token não fornecido." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: invite, error } = await supabase
      .from("admin_invitations")
      .select("id, email, full_name, role, plan, sub_brand, access_duration, access_expires_at, status, notes")
      .eq("token", token)
      .single();

    if (error || !invite) {
      return NextResponse.json(
        { error: "Convite não encontrado ou inválido." },
        { status: 404 }
      );
    }

    if (invite.status === "revoked") {
      return NextResponse.json(
        { error: "Este convite foi revogado pela administração." },
        { status: 410 }
      );
    }

    return NextResponse.json({ invite });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Erro ao consultar convite." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    // 1. Busca convite
    const { data: invite, error: inviteErr } = await supabase
      .from("admin_invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (inviteErr || !invite) {
      return NextResponse.json(
        { error: "Convite inválido ou já utilizado." },
        { status: 400 }
      );
    }

    // 2. Busca usuário atual autenticado
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Atualiza o perfil do usuário logado
      await supabase
        .from("profiles")
        .update({
          full_name: invite.full_name || undefined,
          role: invite.role,
          plan: invite.plan,
          sub_brand: invite.sub_brand,
          access_expires_at: invite.access_expires_at,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      // Marca o convite como aceito
      await supabase
        .from("admin_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invite.id);

      return NextResponse.json({ success: true, userRole: invite.role });
    }

    return NextResponse.json({ success: true, pendingAuth: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Erro ao processar ativação do convite." },
      { status: 500 }
    );
  }
}
