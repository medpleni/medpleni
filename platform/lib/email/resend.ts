import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

export const resend = new Resend(apiKey);

export const DEFAULT_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "MedPleni <noreply@medpleni.com>";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = DEFAULT_FROM_EMAIL,
}: SendEmailOptions) {
  try {
    // 1. Tenta envio pelo remetente padrão configurado
    let result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
    });

    if (result.error) {
      console.warn("[Resend Warning with default sender]:", result.error);
      // 2. Se o domínio personalizado ainda não estiver verificado no Resend, tenta com o domínio de testes
      if (
        result.error.message?.includes("domain") ||
        result.error.message?.includes("verify") ||
        result.error.message?.includes("forbidden")
      ) {
        result = await resend.emails.send({
          from: "MedPleni <onboarding@resend.dev>",
          to,
          subject,
          html,
          text,
        });
      }
    }

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error("[Resend Exception]:", error);
    return { success: false, error: error?.message || "Erro ao enviar e-mail" };
  }
}
