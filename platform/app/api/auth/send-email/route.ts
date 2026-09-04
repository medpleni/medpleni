import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/resend";
import { renderWelcomeEmail } from "@/lib/email/templates/welcome-email";
import { renderResetPasswordEmail } from "@/lib/email/templates/reset-password-email";
import { renderConfirmEmail } from "@/lib/email/templates/confirm-email";
import { renderSecurityAlertEmail } from "@/lib/email/templates/security-alert-email";

import { renderInvitationEmail } from "@/lib/email/templates/invitation-email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type,
      email,
      name,
      resetUrl,
      confirmUrl,
      loginUrl,
      actionText,
      roleLabel,
      planLabel,
      accessPeriodLabel,
      subBrandLabel,
      inviteUrl,
      notes,
    } = body;

    if (!email || !type) {
      return NextResponse.json(
        { error: "E-mail e tipo de template são obrigatórios" },
        { status: 400 }
      );
    }

    let subject = "";
    let html = "";

    switch (type) {
      case "invitation":
        subject = `Convite de Acesso MedPleni: ${roleLabel || "Novo Acesso"} (${planLabel || "Pleno"})`;
        html = renderInvitationEmail({
          name: name || "",
          roleLabel: roleLabel || "Membro",
          planLabel: planLabel || "MedPleni Pleno",
          accessPeriodLabel: accessPeriodLabel || "1 Ano",
          subBrandLabel: subBrandLabel || "Residência Médica",
          inviteUrl: inviteUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`,
          notes: notes || undefined,
        });
        break;

      case "welcome":
        subject = `Bem-vindo(a) ao MedPleni!`;
        html = renderWelcomeEmail({
          name: name || "",
          loginUrl:
            loginUrl ||
            `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`,
        });
        break;

      case "reset-password":
        subject = `Redefinição de senha — MedPleni`;
        html = renderResetPasswordEmail({
          name: name || "",
          resetUrl: resetUrl || "#",
        });
        break;

      case "confirm":
        subject = `Confirme seu e-mail — MedPleni`;
        html = renderConfirmEmail({
          name: name || "",
          confirmUrl: confirmUrl || "#",
        });
        break;

      case "security-alert":
        subject = `Alerta de segurança — MedPleni`;
        html = renderSecurityAlertEmail({
          name: name || "",
          actionText: actionText || "Alteração de credenciais",
        });
        break;

      default:
        return NextResponse.json(
          { error: `Tipo de template '${type}' desconhecido.` },
          { status: 400 }
        );
    }

    const result = await sendEmail({
      to: email,
      subject,
      html,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    console.error("[API send-email error]:", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno ao processar disparo de e-mail" },
      { status: 500 }
    );
  }
}
