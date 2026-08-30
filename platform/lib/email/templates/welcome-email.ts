import { renderEmailLayout } from "./base-layout";

export interface WelcomeEmailProps {
  name: string;
  loginUrl: string;
}

export function renderWelcomeEmail({ name, loginUrl }: WelcomeEmailProps) {
  const firstName = name ? name.split(" ")[0] : "Doutor(a)";

  const contentHtml = `
    <p>Olá, <strong>${firstName}</strong>,</p>
    <p>Seja muito bem-vindo(a) ao <strong>MedPleni</strong> — o ecossistema definitivo para a sua aprovação na residência médica.</p>
    <p>Sua conta foi criada com sucesso. A partir de agora, você tem acesso ao nosso algoritmo adaptativo de estudos, simulados inteligentes com métricas TRI, repetição espaçada de flashcards e predição de nota personalizada.</p>
    <p style="margin-top: 20px;">Para iniciar sua jornada e realizar o seu <strong>Setup Diagnóstico</strong>, clique no botão abaixo:</p>
  `;

  const secondaryNote = `
    💡 <strong>Dica clínica:</strong> Recomendamos realizar o teste diagnóstico logo no primeiro acesso para calibrar o algoritmo de recomendação de questões para sua especialidade e instituição-alvo.
  `;

  return renderEmailLayout({
    title: `Bem-vindo(a) ao MedPleni, ${firstName}!`,
    previewText: "Sua jornada rumo à aprovação na residência médica começa agora.",
    eyebrow: "PRIMEIRO ACESSO · ATIVAÇÃO DE CONTA",
    contentHtml,
    ctaText: "Acessar Plataforma & Iniciar Setup",
    ctaUrl: loginUrl,
    secondaryNote,
  });
}
