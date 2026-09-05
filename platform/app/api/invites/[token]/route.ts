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

    const body = await request.json().catch(() => ({}));
    const password = body?.password;

    // 2. Busca usuário atual autenticado
    const { data: { user } } = await supabase.auth.getUser();

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let activatedUserId = user?.id;

    // Se temos a Service Role Key e uma senha foi enviada pelo formulário de ativação
    if (serviceRoleKey && password && !user) {
      try {
        const { createClient: createAdminSupabase } = await import("@supabase/supabase-js");
        const adminSupabase = createAdminSupabase(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // Busca o usuário pelo e-mail
        const { data: userList } = await adminSupabase.auth.admin.listUsers();
        const existingAuthUser = userList?.users?.find(
          (u) => u.email?.toLowerCase() === invite.email.toLowerCase()
        );

        if (existingAuthUser) {
          await adminSupabase.auth.admin.updateUserById(existingAuthUser.id, {
            password,
            email_confirm: true,
            user_metadata: {
              full_name: invite.full_name,
              role: invite.role,
              plan: invite.plan,
              sub_brand: invite.sub_brand,
            },
          });
          activatedUserId = existingAuthUser.id;
        } else {
          const { data: createdUser } = await adminSupabase.auth.admin.createUser({
            email: invite.email,
            password,
            email_confirm: true,
            user_metadata: {
              full_name: invite.full_name,
              role: invite.role,
              plan: invite.plan,
              sub_brand: invite.sub_brand,
            },
          });
          if (createdUser?.user) {
            activatedUserId = createdUser.user.id;
          }
        }
      } catch (adminErr) {
        console.warn("[Aviso ao provisionar via service role no convite]:", adminErr);
      }
    }

    if (activatedUserId || user) {
      const targetUserId = activatedUserId || user?.id;

      // Atualiza o perfil do usuário
      if (targetUserId) {
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
          .eq("id", targetUserId);
      }

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

    // Caso anônimo sem service role key
    await supabase
      .from("admin_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    return NextResponse.json({ success: true, pendingAuth: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Erro ao processar ativação do convite." },
      { status: 500 }
    );
  }
}
