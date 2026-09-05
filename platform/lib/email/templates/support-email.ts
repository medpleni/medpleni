import { renderEmailLayout } from "./base-layout";

export interface SupportEmailProps {
  name: string;
  subject: string;
  message: string;
}

export function renderSupportEmail({ name, subject, message }: SupportEmailProps): string {
  const firstName = name ? name.split(" ")[0] : "Doutor(a)";

  const contentHtml = `
    <p>Olá, <strong>${firstName}</strong>,</p>
    <div style="background: rgba(13, 17, 28, 0.75); border: 1px solid rgba(0, 194, 168, 0.3); border-radius: 12px; padding: 22px; margin: 20px 0; font-size: 15px; line-height: 1.65; color: #E0E6F0; white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    <p style="font-size: 13px; color: #8A9AB5; line-height: 1.5;">
      Caso tenha qualquer dúvida pedagógica ou precise de suporte técnico adicional, basta responder a este e-mail para falar diretamente com nossa equipe acadêmica.
    </p>
  `;

  return renderEmailLayout({
    title: subject,
    previewText: message.length > 100 ? `${message.substring(0, 100)}...` : message,
    eyebrow: "COMUNICAÇÃO OFICIAL · COORDENAÇÃO MEDPLENI",
    contentHtml,
    ctaText: "Acessar Plataforma MedPleni",
    ctaUrl: "https://medpleni.com/login",
    secondaryNote: "Mensagem enviada diretamente através do canal de atendimento exclusivo da MedPleni Educação Médica.",
  });
}
