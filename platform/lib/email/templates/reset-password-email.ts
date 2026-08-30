import { renderEmailLayout } from "./base-layout";

export interface ResetPasswordEmailProps {
  name?: string;
  resetUrl: string;
  expiresIn?: string;
}

export function renderResetPasswordEmail({
  name,
  resetUrl,
  expiresIn = "60 minutos",
}: ResetPasswordEmailProps) {
  const firstName = name ? name.split(" ")[0] : "Doutor(a)";

  const contentHtml = `
    <p>Olá, <strong>${firstName}</strong>,</p>
    <p>Recebemos uma solicitação para redefinir a senha da sua conta na plataforma <strong>MedPleni</strong>.</p>
    <p>Para escolher uma nova senha e restabelecer seu acesso, clique no botão de ação abaixo:</p>
  `;

  const secondaryNote = `
    🔒 <strong>Aviso de Segurança:</strong> Este link é de uso único e expira em <strong>${expiresIn}</strong>. Se você não solicitou a redefinição de senha, nenhuma ação é necessária e sua senha atual permanecerá segura.
  `;

  return renderEmailLayout({
    title: "Redefinição de Senha de Acesso",
    previewText: "Instruções para redefinição de senha da sua conta MedPleni.",
    eyebrow: "SEGURANÇA DA CONTA · REDEFINIÇÃO",
    contentHtml,
    ctaText: "Redefinir Minha Senha",
    ctaUrl: resetUrl,
    secondaryNote,
  });
}
