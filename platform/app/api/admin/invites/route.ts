import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

function calculateExpirationDate(duration: string, customDate?: string): string | null {
  if (duration === "vitalicio") return null;
  if (duration === "custom" && customDate) {
    return new Date(customDate).toISOString();
  }

  const now = new Date();
  switch (duration) {
    case "30_dias":
      now.setDate(now.getDate() + 30);
      break;
    case "90_dias":
      now.setDate(now.getDate() + 90);
      break;
    case "6_meses":
      now.setMonth(now.getMonth() + 6);
      break;
    case "1_ano":
      now.setFullYear(now.getFullYear() + 1);
      break;
    case "2_anos":
      now.setFullYear(now.getFullYear() + 2);
      break;
    default:
      now.setFullYear(now.getFullYear() + 1);
  }
  return now.toISOString();
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "student":
      return "Aluno / Médico Residente";
    case "docente":
      return "Docente & Especialista";
    case "financeiro":
      return "Financeiro & Faturamento";
    case "suporte":
      return "Suporte & Customer Success";
    case "desenvolvedor":
      return "Desenvolvedor & Engenharia";
    case "superadmin":
      return "Administrador Geral (Superadmin)";
    default:
      return role;
  }
}

function getPlanLabel(plan: string): string {
  switch (plan) {
    case "pleno_anual":
      return "MedPleni Pleno (Anual)";
    case "pleno_mensal":
      return "MedPleni Pleno (Mensal)";
    case "cortesia_vip":
      return "Cortesia VIP / Bolsista";
    case "vitalicio":
      return "Acesso Vitalício Completo";
    case "diagnostico":
      return "MedPleni Diagnóstico (Gratuito)";
    default:
      return plan;
  }
}

function getDurationLabel(duration: string, expiresAt?: string | null): string {
  if (duration === "vitalicio" || !expiresAt) return "Vitalício (Sem expiração)";
  if (duration === "30_dias") return "30 dias";
  if (duration === "90_dias") return "90 dias (3 meses)";
  if (duration === "6_meses") return "6 meses";
  if (duration === "1_ano") return "1 ano (12 meses)";
  if (duration === "2_anos") return "2 anos (24 meses)";
  return `Até ${new Date(expiresAt).toLocaleDateString("pt-BR")}`;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: invitations, error } = await supabase
      .from("admin_invitations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      // Se a tabela ainda não existir no ambiente, retorna lista vazia
      console.warn("Aviso ao buscar convites:", error.message);
      return NextResponse.json({ invitations: [] });
    }

    return NextResponse.json({ invitations: invitations || [] });
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
    const {
      fullName,
      email,
      role = "student",
      plan = "pleno_anual",
      subBrand = "RESID",
      accessDuration = "1_ano",
      customExpireDate,
      sendEmail = true,
      notes,
    } = body;

    if (!fullName?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Nome completo e e-mail são obrigatórios." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const expiresAt = calculateExpirationDate(accessDuration, customExpireDate);
    const token = crypto.randomBytes(24).toString("hex");

    // 1. Cria ou atualiza o registro na tabela admin_invitations
    const { data: invitation, error: insertError } = await supabase
      .from("admin_invitations")
      .insert({
        email: cleanEmail,
        full_name: fullName.trim(),
        role,
        plan,
        sub_brand: subBrand,
        access_duration: accessDuration,
        access_expires_at: expiresAt,
        token,
        status: "pending",
        notes: notes || null,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Erro ao salvar convite:", insertError);
      return NextResponse.json(
        { error: `Erro ao criar convite: ${insertError.message}` },
        { status: 500 }
      );
    }

    // 2. Se o perfil já existe na base, atualiza permissões imediatamente
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", cleanEmail)
      .single();

    if (existingProfile) {
      await supabase
        .from("profiles")
        .update({
          role,
          plan,
          sub_brand: subBrand,
          access_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProfile.id);
    }

    // 3. Monta o link do convite
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/convite?token=${token}`;

    // 4. Dispara e-mail via Resend se solicitado
    let emailSent = false;
    if (sendEmail) {
      try {
        const emailRes = await fetch(`${appUrl}/api/auth/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "invitation",
            email: cleanEmail,
            name: fullName.trim(),
            roleLabel: getRoleLabel(role),
            planLabel: getPlanLabel(plan),
            accessPeriodLabel: getDurationLabel(accessDuration, expiresAt),
            subBrandLabel: subBrand === "RESID" ? "Residência Médica" : subBrand,
            inviteUrl,
            notes,
          }),
        });
        emailSent = emailRes.ok;
      } catch (emailErr) {
        console.warn("Aviso ao disparar e-mail de convite:", emailErr);
      }
    }

    // 5. Log de Auditoria
    await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      admin_email: user.email,
      action: "create_invitation",
      target_entity: "invitation",
      target_id: invitation.id,
      details: {
        email: cleanEmail,
        role,
        plan,
        accessDuration,
        expiresAt,
        emailSent,
      },
    });

    return NextResponse.json({
      success: true,
      invitation,
      inviteUrl,
      emailSent,
    });
  } catch (err: any) {
    console.error("Erro interno no POST de convite:", err);
    return NextResponse.json(
      { error: err?.message || "Erro interno ao processar convite." },
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

    const { error } = await supabase
      .from("admin_invitations")
      .update({ status: "revoked" })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
