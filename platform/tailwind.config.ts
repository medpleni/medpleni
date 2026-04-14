import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /* ── MedPleni Color Tokens ── */
      colors: {
        abismo:       "#1A1F2E",
        petroleo:     "#2B3A52",
        sinal:        "#3D5A80",
        neblina:      "#E0E6F0",
        chumbo:       "#8A9AB5",
        lab:          "#F0F4FA",
        pulso:        "#00C2A8",
        resid:        "#0077B6",
        "resid-light":"#64B5E8",
        indigo:       "#6B5CE7",
        "indigo-light":"#A99EF5",
        ambar:        "#C98A0A",
        danger:       "#FF6B6B",
        warn:         "#F5A623",
        success:      "#22C55E",
      },

      /* ── Border Radius Tokens ── */
      borderRadius: {
        sm:   "3px",
        md:   "8px",
        lg:   "10px",
        xl:   "12px",
        full: "9999px",
      },

      /* ── Font Families ── */
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body:    ["var(--font-body)", "sans-serif"],
        mono:    ["var(--font-mono)", "monospace"],
        serif:   ["var(--font-serif)", "serif"],
      },

      /* ── Background Images ── */
      backgroundImage: {
        "pulso-glow":
          "radial-gradient(circle, rgba(0,194,168,0.15) 0%, transparent 70%)",
        "sinal-glow":
          "radial-gradient(circle, rgba(61,90,128,0.3) 0%, transparent 70%)",
      },

      /* ── Box Shadows ── */
      boxShadow: {
        "pulso":   "0 4px 20px rgba(0,194,168,0.35)",
        "card":    "0 2px 16px rgba(0,0,0,0.4)",
        "deep":    "0 24px 64px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
