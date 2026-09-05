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
  userId?: string | null;
  emailType?: "invitation" | "welcome" | "password_reset" | "custom_support" | "security_alert" | "notification";
  sentBy?: string | null;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = DEFAULT_FROM_EMAIL,
  userId = null,
  emailType = "notification",
  sentBy = null,
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

    const recipient = Array.isArray(to) ? to.join(", ") : to;

    // Registra cópia do e-mail na tabela user_emails_log
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, key, { auth: { persistSession: false } });

      await supabase.from("user_emails_log").insert({
        user_id: userId,
        recipient_email: recipient.toLowerCase().trim(),
        subject,
        email_type: emailType,
        body_html: html,
        body_text: text || null,
        resend_id: result.data?.id || null,
        status: result.error ? "failed" : "delivered",
        error_message: result.error?.message || null,
        sent_by: sentBy,
      });
    } catch (logErr) {
      console.warn("[Aviso ao registrar log de e-mail]:", logErr);
    }

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
