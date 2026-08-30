import { renderEmailLayout } from "./base-layout";

export interface ConfirmEmailProps {
  name?: string;
  confirmUrl: string;
}

export function renderConfirmEmail({ name, confirmUrl }: ConfirmEmailProps) {
  const firstName = name ? name.split(" ")[0] : "Doutor(a)";

  const contentHtml = `
    <p>Olá, <strong>${firstName}</strong>,</p>
    <p>Obrigado por se registrar no <strong>MedPleni</strong>.</p>
    <p>Para confirmar a autenticidade do seu endereço de e-mail e ativar todas as funcionalidades da sua conta de estudante/médico residente, confirme pelo botão abaixo:</p>
  `;

  const secondaryNote = `
    🛡️ <strong>Privacidade & Segurança:</strong> Se você não criou esta conta, por favor desconsidere esta mensagem. Seus dados estão protegidos conforme as normas da LGPD.
  `;

  return renderEmailLayout({
    title: "Confirme seu E-mail",
    previewText: "Confirme seu e-mail para ativar sua conta no MedPleni.",
    eyebrow: "VERIFICAÇÃO DE IDENTIDADE",
    contentHtml,
    ctaText: "Confirmar Meu E-mail",
    ctaUrl: confirmUrl,
    secondaryNote,
  });
}
