import { renderEmailLayout } from "./base-layout";

export interface SecurityAlertEmailProps {
  name?: string;
  actionText: string;
  dateTime?: string;
  ipAddress?: string;
}

export function renderSecurityAlertEmail({
  name,
  actionText,
  dateTime = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
  ipAddress,
}: SecurityAlertEmailProps) {
  const firstName = name ? name.split(" ")[0] : "Doutor(a)";

  const contentHtml = `
    <p>Olá, <strong>${firstName}</strong>,</p>
    <p>Informamos que uma ação importante de segurança foi realizada na sua conta <strong>MedPleni</strong>:</p>
    <div style="background: rgba(0, 194, 168, 0.08); border-left: 3px solid #00C2A8; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
      <p style="margin: 0; font-weight: 600; color: #FFFFFF;">${actionText}</p>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #8A9AB5;">Data/Hora: ${dateTime}${ipAddress ? ` · IP: ${ipAddress}` : ""}</p>
    </div>
    <p>Se foi você quem realizou essa alteração, nenhuma ação adicional é necessária.</p>
  `;

  const secondaryNote = `
    ⚠️ <strong>Não reconhece esta atividade?</strong> Se você não realizou essa alteração, entre em contato imediatamente com o nosso time de suporte ou altere sua senha de acesso.
  `;

  return renderEmailLayout({
    title: "Alerta de Segurança da Conta",
    previewText: `Notificação de segurança: ${actionText}`,
    eyebrow: "NOTIFICAÇÃO DE SEGURANÇA",
    contentHtml,
    ctaText: "Acessar Central de Segurança",
    ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://medpleni.com"}/perfil`,
    secondaryNote,
  });
}
