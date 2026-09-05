import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail as dispatchResendEmail } from "@/lib/email/resend";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID do aluno é obrigatório" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let adminSupabase = supabase;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      const { createClient: createAdminSupabase } = await import("@supabase/supabase-js");
      adminSupabase = createAdminSupabase(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
    }

    // 1. Busca perfil do aluno ou convite pelo ID
    let profile: any = null;

    const { data: pData } = await adminSupabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (pData) {
      profile = pData;
    } else {
      // Se não encontrou pelo ID em profiles, busca em admin_invitations
      const { data: invData } = await adminSupabase
        .from("admin_invitations")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (invData) {
        // Verifica se há perfil com esse e-mail
        const { data: pByEmail } = await adminSupabase
          .from("profiles")
          .select("*")
          .eq("email", invData.email)
          .maybeSingle();

        if (pByEmail) {
          profile = pByEmail;
        } else {
          profile = {
            id: invData.id,
            full_name: invData.full_name,
            email: invData.email,
            role: invData.role || "student",
            plan: invData.plan || "pleno_anual",
            sub_brand: invData.sub_brand || "RESID",
            access_expires_at: invData.access_expires_at,
            status: invData.status === "revoked" ? "blocked" : "active",
            blocked_reason: invData.status === "revoked" ? "Convite revogado" : null,
            created_at: invData.created_at,
            updated_at: invData.created_at,
            target_exams: ["ENAMED"],
            weekly_study_hours: 20,
            streak_days: 0,
          };
        }
      }
    }

    if (!profile) {
      return NextResponse.json({ error: "Aluno ou convite não encontrado." }, { status: 404 });
    }

    // 2. Busca métricas de questões respondidas (se houver perfil real)
    const { data: answersData, count: totalAnswers } = await adminSupabase
      .from("user_answers")
      .select("is_correct", { count: "exact" })
      .eq("user_id", profile.id);

    const totalQuestionsAnswered = totalAnswers || 0;
    const correctAnswers = answersData ? answersData.filter((a) => a.is_correct).length : 0;
    const accuracyPercentage = totalQuestionsAnswered > 0
      ? Math.round((correctAnswers / totalQuestionsAnswered) * 100)
      : 0;

    // 3. Busca simulados do aluno
    const { data: userSimulations } = await adminSupabase
      .from("user_simulations")
      .select(`
        id,
        status,
        score_percent,
        started_at,
        completed_at,
        time_spent_seconds,
        simulations (
          id,
          title,
          institution,
          total_questions
        )
      `)
      .eq("user_id", profile.id)
      .order("started_at", { ascending: false });

    const simulationsCompleted = userSimulations
      ? userSimulations.filter((s) => s.status === "concluido").length
      : 0;

    // 4. Busca diagnósticos (Raio-X)
    const { data: diagnostics } = await adminSupabase
      .from("user_diagnostics")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const latestDiagnostic = diagnostics && diagnostics.length > 0 ? diagnostics[0] : null;

    // 5. Busca histórico de e-mails enviados para o aluno (user_id ou email)
    const { data: emailsLog, error: emailErr } = await adminSupabase
      .from("user_emails_log")
      .select("*")
      .or(`user_id.eq.${profile.id},recipient_email.eq.${profile.email}`)
      .order("created_at", { ascending: false });

    if (emailErr) {
      console.warn("Aviso ao buscar logs de e-mails do aluno:", emailErr.message);
    }

    // 6. Busca logs de auditoria relacionados a este usuário
    const { data: auditLogs } = await supabase
      .from("admin_audit_logs")
      .select("*")
      .eq("target_id", id)
      .order("created_at", { ascending: false })
      .limit(15);

    return NextResponse.json({
      success: true,
      student: {
        profile: {
          id: profile.id,
          fullName: profile.full_name || "Médico(a) Aluno(a)",
          email: profile.email,
          crm: profile.crm || null,
          role: profile.role || "student",
          plan: profile.plan || profile.plano || "diagnostico",
          targetExams: profile.target_exams || ["ENAMED"],
          targetSpecialty: profile.target_specialty || profile.specialty || "Clínica Médica",
          weeklyStudyHours: profile.weekly_study_hours || 20,
          streakDays: profile.streak_days || 0,
          status: profile.status || "active",
          blockedReason: profile.blocked_reason || null,
          accessExpiresAt: profile.access_expires_at || null,
          subBrand: profile.sub_brand || "RESID",
          lastActiveAt: profile.last_active_at || null,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
        },
        metrics: {
          totalQuestionsAnswered,
          correctAnswers,
          accuracyPercentage,
          simulationsCompleted,
          diagnosticScore: latestDiagnostic ? Number(latestDiagnostic.overall_score) : null,
          diagnosticPriorityAreas: latestDiagnostic ? latestDiagnostic.priority_areas : [],
          studyStreak: profile.streak_days || 0,
          weeklyHours: profile.weekly_study_hours || 20,
        },
        simulations: userSimulations || [],
        latestDiagnostic,
        emails: emailsLog || [],
        auditLogs: auditLogs || [],
      },
    });
  } catch (err: any) {
    console.error("Erro ao carregar perfil 360 do aluno:", err);
    return NextResponse.json({ error: err?.message || "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID do aluno é obrigatório" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (!adminUser) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let adminSupabase = supabase;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      const { createClient: createAdminSupabase } = await import("@supabase/supabase-js");
      adminSupabase = createAdminSupabase(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
    }

    // Busca perfil atual do aluno ou convite
    let currentProfile: any = null;
    let isInviteTarget = false;

    const { data: pData } = await adminSupabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (pData) {
      currentProfile = pData;
    } else {
      const { data: invData } = await adminSupabase
        .from("admin_invitations")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (invData) {
        isInviteTarget = true;
        currentProfile = {
          id: invData.id,
          email: invData.email,
          full_name: invData.full_name,
          role: invData.role,
          plan: invData.plan,
          status: invData.status === "revoked" ? "blocked" : "active",
        };
      }
    }

    if (!currentProfile) {
      return NextResponse.json({ error: "Aluno ou convite não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const { action = "update_profile" } = body;

    // AÇÃO 1: Atualização de Dados (Papel, Plano, Status, Bloqueio, Expiração)
    if (action === "update_profile") {
      if (isInviteTarget) {
        const invUpdate: Record<string, any> = {};
        if (body.role !== undefined) invUpdate.role = body.role;
        if (body.plan !== undefined) invUpdate.plan = body.plan;
        if (body.status === "blocked") invUpdate.status = "revoked";
        if (body.status === "active") invUpdate.status = "accepted";
        if (body.access_expires_at !== undefined) invUpdate.access_expires_at = body.access_expires_at;

        await adminSupabase.from("admin_invitations").update(invUpdate).eq("id", id);
      }

      // Se houver registro em profiles (pelo ID ou pelo email do convite)
      const { data: existingProfile } = await adminSupabase
        .from("profiles")
        .select("id")
        .or(`id.eq.${id},email.eq.${currentProfile.email}`)
        .maybeSingle();

      if (existingProfile) {
        const updateData: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        if (body.role !== undefined) updateData.role = body.role;
        if (body.plan !== undefined) {
          updateData.plan = body.plan;
          updateData.plano = body.plan; // retrocompatibilidade
        }
        if (body.status !== undefined) updateData.status = body.status;
        if (body.blocked_reason !== undefined) updateData.blocked_reason = body.blocked_reason;
        if (body.access_expires_at !== undefined) updateData.access_expires_at = body.access_expires_at;
        if (body.sub_brand !== undefined) updateData.sub_brand = body.sub_brand;

        const { error: updateErr } = await adminSupabase
          .from("profiles")
          .update(updateData)
          .eq("id", existingProfile.id);

        if (updateErr) {
          console.warn("Aviso ao atualizar perfil vinculado:", updateErr.message);
        }
      }

      // Registro de Auditoria
      const auditDetails: Record<string, any> = {};
      if (body.status && body.status !== currentProfile.status) {
        auditDetails.status_change = { from: currentProfile.status, to: body.status, reason: body.blocked_reason };
      }
      if (body.role && body.role !== currentProfile.role) {
        auditDetails.role_change = { from: currentProfile.role, to: body.role };
      }
      if (body.plan && body.plan !== (currentProfile.plan || currentProfile.plano)) {
        auditDetails.plan_change = { from: currentProfile.plan || currentProfile.plano, to: body.plan };
      }
      if (body.access_expires_at !== undefined) {
        auditDetails.access_expires_at = body.access_expires_at;
      }

      await supabase.from("admin_audit_logs").insert({
        admin_id: adminUser.id,
        action: body.status === "blocked" ? "student_blocked" : "student_profile_updated",
        target_id: id,
        details: {
          student_email: currentProfile.email,
          ...auditDetails,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Perfil do aluno atualizado com sucesso.",
      });
    }

    // AÇÃO 2: Reenvio de Link de Acesso / Reset de Senha
    if (action === "resend_access") {
      const studentEmail = currentProfile.email;
      const studentName = currentProfile.full_name || "Médico(a) Aluno(a)";
      const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://medpleni.com";

      let recoveryLink = `${origin}/login`;

      // Se houver service role key, gera link direto de recuperação
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        try {
          const { createClient: createAdminSupabase } = await import("@supabase/supabase-js");
          const adminSupabase = createAdminSupabase(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            { auth: { autoRefreshToken: false, persistSession: false } }
          );

          const { data: linkData, error: linkErr } = await adminSupabase.auth.admin.generateLink({
            type: "recovery",
            email: studentEmail,
            options: {
              redirectTo: `${origin}/redefinir-senha`,
            },
          });

          if (!linkErr && linkData?.properties?.action_link) {
            recoveryLink = linkData.properties.action_link;
          }
        } catch (linkGenErr) {
          console.warn("Aviso ao gerar link recovery do Supabase:", linkGenErr);
        }
      }

      const emailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Acesso à Plataforma MedPleni</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1117; color: #e6edf3; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #161b22; border-radius: 12px; border: 1px solid #30363d; padding: 32px; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 1px solid #21262d; padding-bottom: 20px; }
    .logo-badge { display: inline-block; background: #00e599; color: #0d1117; font-weight: 800; font-size: 14px; padding: 4px 12px; border-radius: 6px; letter-spacing: 0.5px; }
    h1 { color: #f0f6fc; font-size: 22px; margin-top: 16px; margin-bottom: 8px; }
    p { color: #8b949e; line-height: 1.6; font-size: 15px; }
    .highlight-box { background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .btn { display: inline-block; background: #00e599; color: #0d1117 !important; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; margin: 20px 0; text-align: center; }
    .footer { font-size: 12px; color: #484f58; text-align: center; margin-top: 32px; border-top: 1px solid #21262d; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="logo-badge">MEDPLENI</span>
      <h1>Seu Acesso à Plataforma</h1>
    </div>
    <p>Olá, <strong>${studentName}</strong>!</p>
    <p>Nossa equipe administrativa reenviou seu link de acesso à plataforma preparatória para Residência Médica <strong>MedPleni</strong>.</p>
    <div class="highlight-box">
      <p style="margin: 0; color: #c9d1d9;"><strong>E-mail cadastrado:</strong> ${studentEmail}</p>
      <p style="margin: 6px 0 0 0; color: #c9d1d9;"><strong>Status da conta:</strong> Ativa e Liberada</p>
    </div>
    <div style="text-align: center;">
      <a href="${recoveryLink}" class="btn">Entrar na Plataforma</a>
    </div>
    <p style="font-size: 13px; color: #6e7681; text-align: center;">Ou copie o link no navegador:<br><span style="word-break: break-all; color: #58a6ff;">${recoveryLink}</span></p>
    <div class="footer">
      <p>MedPleni Educação Médica de Alta Performance &bull; Suporte: suporte@medpleni.com</p>
    </div>
  </div>
</body>
</html>
      `;

      const emailResult = await dispatchResendEmail({
        to: studentEmail,
        subject: "Acesso à Plataforma MedPleni — Link Direto de Acesso",
        html: emailHtml,
        userId: id,
        emailType: "password_reset",
      });

      await supabase.from("admin_audit_logs").insert({
        admin_id: adminUser.id,
        action: "access_link_resent",
        target_id: id,
        details: {
          recipient: studentEmail,
          resend_id: emailResult.data?.id || null,
          success: emailResult.success,
        },
      });

      if (!emailResult.success) {
        return NextResponse.json({
          success: false,
          error: `E-mail não pôde ser enviado: ${emailResult.error}`,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Link de acesso enviado com sucesso para ${studentEmail}.`,
      });
    }

    // AÇÃO 3: Envio de E-mail Direto / Mensagem de Suporte Personalizada
    if (action === "send_direct_email") {
      const { subject, message } = body;
      if (!subject?.trim() || !message?.trim()) {
        return NextResponse.json({ error: "Assunto e mensagem são obrigatórios" }, { status: 400 });
      }

      const studentEmail = currentProfile.email;
      const studentName = currentProfile.full_name || "Médico(a) Aluno(a)";

      const emailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1117; color: #e6edf3; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #161b22; border-radius: 12px; border: 1px solid #30363d; padding: 32px; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 1px solid #21262d; padding-bottom: 20px; }
    .logo-badge { display: inline-block; background: #00e599; color: #0d1117; font-weight: 800; font-size: 14px; padding: 4px 12px; border-radius: 6px; }
    h1 { color: #f0f6fc; font-size: 20px; margin-top: 16px; margin-bottom: 8px; }
    p { color: #8b949e; line-height: 1.6; font-size: 15px; }
    .content-box { background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 20px; margin: 20px 0; color: #e6edf3; white-space: pre-wrap; line-height: 1.6; }
    .footer { font-size: 12px; color: #484f58; text-align: center; margin-top: 32px; border-top: 1px solid #21262d; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="logo-badge">MEDPLENI</span>
      <h1>${subject}</h1>
    </div>
    <p>Olá, <strong>${studentName}</strong>,</p>
    <div class="content-box">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    <p>Qualquer dúvida adicional, basta responder a este e-mail.</p>
    <div class="footer">
      <p>Equipe de Atendimento e Coordenação Acadêmica &bull; MedPleni</p>
    </div>
  </div>
</body>
</html>
      `;

      const emailResult = await dispatchResendEmail({
        to: studentEmail,
        subject: subject.trim(),
        html: emailHtml,
        userId: id,
        emailType: "custom_support",
      });

      await supabase.from("admin_audit_logs").insert({
        admin_id: adminUser.id,
        action: "direct_email_sent",
        target_id: id,
        details: {
          recipient: studentEmail,
          subject: subject.trim(),
          resend_id: emailResult.data?.id || null,
          success: emailResult.success,
        },
      });

      if (!emailResult.success) {
        return NextResponse.json({
          success: false,
          error: `Falha ao enviar e-mail: ${emailResult.error}`,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `E-mail enviado com sucesso para ${studentEmail}.`,
      });
    }

    return NextResponse.json({ error: "Ação não reconhecida" }, { status: 400 });
  } catch (err: any) {
    console.error("Erro ao processar alteração no aluno:", err);
    return NextResponse.json({ error: err?.message || "Erro interno do servidor" }, { status: 500 });
  }
}
