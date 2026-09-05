import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

export const resend = new Resend(apiKey);

function cleanFromEmail(raw?: string): string {
  if (!raw) return "MedPleni <noreply@medpleni.com>";
  // Extrai o endereço de e-mail limpo ignorando aspas, barras invertidas e caracteres de escape
  const match = raw.match(/<([^>]+)>/);
  if (match && match[1]) {
    const cleanAddress = match[1].replace(/[^a-zA-Z0-9@._+-]/g, "").trim();
    if (cleanAddress.includes("@")) {
      return `MedPleni <${cleanAddress}>`;
    }
  }
  const emailOnly = raw.replace(/[^a-zA-Z0-9@._+-]/g, "").trim();
  if (emailOnly.includes("@")) {
    return `MedPleni <${emailOnly}>`;
  }
  return "MedPleni <noreply@medpleni.com>";
}

export const DEFAULT_FROM_EMAIL = "MedPleni <noreply@medpleni.com>";

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
    const sanitizedFrom = cleanFromEmail(from);
    const result = await resend.emails.send({
      from: sanitizedFrom,
      to,
      subject,
      html,
      text,
    });

    if (result.error) {
      console.error("[Resend Error]:", result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error("[Resend Exception]:", error);
    return { success: false, error: error?.message || "Erro ao enviar e-mail" };
  }
}
