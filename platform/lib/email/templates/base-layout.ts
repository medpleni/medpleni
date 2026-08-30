export interface EmailLayoutProps {
  title: string;
  previewText: string;
  eyebrow?: string;
  contentHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryNote?: string;
}

export function renderEmailLayout({
  title,
  previewText,
  eyebrow = "MEDPLENI PLATFORM",
  contentHtml,
  ctaText,
  ctaUrl,
  secondaryNote,
}: EmailLayoutProps): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #1A1F2E;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E0E6F0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #1A1F2E;
      padding: 40px 16px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #2B3A52;
      border: 1px solid rgba(61, 90, 128, 0.4);
      border-radius: 16px;
      padding: 40px 32px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    }
    .logo-container {
      text-align: center;
      margin-bottom: 28px;
    }
    .logo-badge {
      display: inline-block;
      margin-bottom: 12px;
    }
    .logo-text {
      font-size: 26px;
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .logo-text span {
      color: #00C2A8;
    }
    .tagline {
      font-family: Georgia, serif;
      font-style: italic;
      font-size: 13px;
      color: #8A9AB5;
      margin-top: 4px;
      margin-bottom: 0;
    }
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(0, 194, 168, 0.3), transparent);
      margin: 24px 0 28px 0;
    }
    .eyebrow {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #00C2A8;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .heading {
      font-size: 22px;
      font-weight: 700;
      color: #FFFFFF;
      line-height: 1.3;
      margin: 0 0 16px 0;
    }
    .content {
      font-size: 15px;
      line-height: 1.65;
      color: #E0E6F0;
      margin-bottom: 28px;
    }
    .content p {
      margin: 0 0 14px 0;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #00C2A8;
      color: #0A1A18 !important;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 194, 168, 0.35);
    }
    .security-box {
      background: rgba(26, 31, 46, 0.7);
      border-left: 3px solid #00C2A8;
      padding: 14px 16px;
      border-radius: 4px;
      font-size: 13px;
      color: #8A9AB5;
      margin-top: 24px;
      line-height: 1.5;
    }
    .footer {
      text-align: center;
      margin-top: 36px;
      font-size: 11px;
      color: #8A9AB5;
      letter-spacing: 0.5px;
      line-height: 1.6;
    }
    .footer a {
      color: #00C2A8;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">
    ${previewText}
  </div>
  <div class="wrapper">
    <div class="container">
      <!-- Header / Logo -->
      <div class="logo-container">
        <div class="logo-badge">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="11" stroke="#00C2A8" stroke-width="1.8" />
            <path d="M5 12h3l2-4 3 8 2-4h4" stroke="#00C2A8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <h1 class="logo-text">Med<span>Pleni</span></h1>
        <p class="tagline">Medicina com propósito. Tecnologia com precisão.</p>
      </div>

      <div class="divider"></div>

      <!-- Content -->
      <div>
        <div class="eyebrow">${eyebrow}</div>
        <h2 class="heading">${title}</h2>
        <div class="content">
          ${contentHtml}
        </div>

        ${
          ctaText && ctaUrl
            ? `
        <div class="btn-container">
          <a href="${ctaUrl}" class="btn" target="_blank">${ctaText}</a>
        </div>
        `
            : ""
        }

        ${
          secondaryNote
            ? `
        <div class="security-box">
          ${secondaryNote}
        </div>
        `
            : ""
        }
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>Grupo Plenitude © ${new Date().getFullYear()} · MedPleni Residência Médica</p>
        <p>Plataforma de IA adaptativa e analytics clínico para aprovação médica.</p>
        <p style="font-size: 10px; color: #5F718D; margin-top: 8px;">
          Em conformidade com a LGPD. Se você não solicitou este e-mail, por favor ignore ou contate nosso suporte.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
