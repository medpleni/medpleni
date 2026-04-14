import type { Metadata } from "next";
import {
  IBM_Plex_Sans_Condensed,
  Inter,
  IBM_Plex_Mono,
  Source_Serif_4,
} from "next/font/google";
import "./globals.css";

/* ── Google Fonts ── */
const ibmPlexSansCondensed = IBM_Plex_Sans_Condensed({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MedPleni — O Algoritmo da Aprovação",
  description:
    "Plataforma de preparação para residência médica com IA adaptativa, spaced repetition e analytics clínico. Medicina com propósito. Tecnologia com precisão.",
  keywords: [
    "residência médica",
    "preparatório médico",
    "ENARE",
    "simulados medicina",
    "spaced repetition",
    "IA médica",
  ],
  authors: [{ name: "Grupo Plenitude" }],
  metadataBase: new URL("https://medpleni.com"),
  openGraph: {
    title: "MedPleni — O Algoritmo da Aprovação",
    description:
      "Medicina com propósito. Tecnologia com precisão.",
    siteName: "MedPleni",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${ibmPlexSansCondensed.variable} ${inter.variable} ${ibmPlexMono.variable} ${sourceSerif4.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
