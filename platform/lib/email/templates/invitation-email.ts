import { renderEmailLayout } from "./base-layout";

export interface InvitationEmailProps {
  name: string;
  roleLabel: string;
  planLabel: string;
  accessPeriodLabel: string;
  subBrandLabel?: string;
  inviteUrl: string;
  notes?: string;
}

export function renderInvitationEmail({
  name,
  roleLabel,
  planLabel,
  accessPeriodLabel,
  subBrandLabel = "Residência Médica & Provas",
  inviteUrl,
  notes,
}: InvitationEmailProps): string {
  const contentHtml = `
    <p>Olá, <strong>${name || "Colega Médico(a)"}</strong>,</p>
    <p>
      Você recebeu um convite oficial de acesso exclusivo à plataforma <strong>MedPleni</strong> — o ecossistema de inteligência adaptativa e preparação médica de alta performance.
    </p>

    <!-- Card de Benefícios e Permissões -->
    <div style="background: rgba(13, 17, 28, 0.7); border: 1px solid rgba(0, 194, 168, 0.3); border-radius: 12px; padding: 20px; margin: 24px 0;">
      <div style="font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #00C2A8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; font-weight: 700;">
        Detalhes da Concessão de Acesso
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #E0E6F0;">
        <tr>
          <td style="padding: 6px 0; color: #8A9AB5; width: 40%;">Perfil / Cargo:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #FFFFFF;">${roleLabel}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #8A9AB5;">Plano de Acesso:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #00C2A8;">${planLabel}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #8A9AB5;">Período de Validade:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #F5A623;">${accessPeriodLabel}</td>
        </tr>
        ${
          subBrandLabel
            ? `
        <tr>
          <td style="padding: 6px 0; color: #8A9AB5;">Foco / Submarca:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #FFFFFF;">${subBrandLabel}</td>
        </tr>
        `
            : ""
        }
      </table>

      ${
        notes
          ? `
      <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed rgba(61,90,128,0.3); font-size: 12px; color: #8A9AB5;">
        <em>Nota de Acesso:</em> ${notes}
      </div>
      `
          : ""
      }
    </div>

    <p style="margin-top: 20px;">
      Clique no botão abaixo para definir sua senha de acesso e ativar sua conta imediatamente:
    </p>
  `;

  return renderEmailLayout({
    title: "Seu Acesso MedPleni Está Liberado",
    previewText: `Convite oficial MedPleni: ${roleLabel} — ${planLabel} (${accessPeriodLabel})`,
    eyebrow: "CONVITE OFICIAL MEDPLENI",
    contentHtml,
    ctaText: "Ativar Meu Acesso Agora",
    ctaUrl: inviteUrl,
    secondaryNote:
      "Este link de convite é de uso exclusivo e intransferível. Caso já possua uma conta com este e-mail, seu plano e permissões serão atualizados automaticamente ao acessar.",
  });
}
