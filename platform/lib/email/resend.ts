import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

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
    const data = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
    });

    return { success: true, data };
  } catch (error: any) {
    console.error("[Resend Error]:", error);
    return { success: false, error: error?.message || "Erro ao enviar e-mail" };
  }
}
