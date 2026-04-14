# MedPleni — Frontend Build Prompt (Google Antigravity)

> **Para usar:** Cole este prompt inteiro no Google Antigravity. Certifique-se de que os arquivos HTML de referência (brand-book-medpleni.html, design-system-medpleni.html, medpleni-part3-dashboard.html, avatar-medpleni.html, dossie-medpleni.md) estão no Explorer do projeto.

---

## ROLE & OBJECTIVE

You are a Senior Frontend Engineer and UI/UX Design Specialist with deep expertise in building dark-themed, data-dense medical SaaS dashboards. 

**Objective:** Build the pixel-perfect, fully functional (mocked data), production-quality frontend for **MedPleni** — a medical residency prep platform. This build is for an **investor demo** — every screen must be populated with realistic mock data, fully interactive, and visually polished.

---

## INPUT CONTEXT — READ THESE FILES FIRST

Before writing ANY code, you MUST read and analyze every file in the project Explorer:

1. **`brand-book-medpleni.html`** — Complete brand identity: logo, colors, typography, tone of voice, sub-brands, architecture. This is the AUTHORITATIVE source for all visual decisions.
2. **`design-system-medpleni.html`** — Full UI kit: buttons, inputs, badges, cards, progress bars, score rings, heatmap cells, dashboard mockup, social templates. This is the AUTHORITATIVE source for all component styling.
3. **`medpleni-part3-dashboard.html`** — Pixel-perfect product screens: Dashboard do Aluno and Tela de Simulado. These are the EXACT visual targets to replicate.
4. **`avatar-medpleni.html`** — Brand avatar/icon in multiple sizes.
5. **`dossie-medpleni.md`** — Complete project dossier: product description, personas, features, business model, flows, competitive analysis.
6. **`MedPleni-PRD-v1.0.docx`** — Product Requirements Document with all functional specs, MoSCoW prioritization, onboarding flow, algorithm specs, and tech stack.

**CRITICAL:** Cross-reference all files before starting. The HTML files contain the EXACT CSS values, component patterns, and visual targets you must replicate. Do NOT deviate from them.

---

## DESIGN SYSTEM — MANDATORY TOKENS (DO NOT DEVIATE)

### Color Tokens (CSS Custom Properties)
```css
:root {
  /* Structural — Backgrounds & Surfaces */
  --abismo:    #1A1F2E;   /* Primary background (dark mode native) */
  --petroleo:  #2B3A52;   /* Surface: cards, panels */
  --sinal:     #3D5A80;   /* Borders, dividers */
  --neblina:   #E0E6F0;   /* Body text */
  --chumbo:    #8A9AB5;   /* Secondary text, labels */
  --lab:       #F0F4FA;   /* Light alternative background */

  /* Brand — Accent & Identity */
  --pulso:     #00C2A8;   /* PRIMARY brand color, CTAs, highlights, positive actions */
  --resid:     #0077B6;   /* Sub-brand RESID, progress elements */
  --resid-light: #64B5E8; /* Light variation for text on dark */
  --indigo:    #6B5CE7;   /* Sub-brand REVALIDA, special elements */
  --indigo-light: #A99EF5;/* Light indigo variation */
  --ambar:     #C98A0A;   /* Sub-brand ESPECIALISTA */

  /* System — States */
  --danger:    #FF6B6B;   /* Errors, critical alerts, incorrect answers */
  --warn:      #F5A623;   /* Warnings, skipped items, pending */
  --success:   #22C55E;   /* Success, correct answers */
  --white:     #FFFFFF;

  /* Radius */
  --r-sm: 3px;    /* Small tags */
  --r-md: 8px;    /* Buttons, inputs */
  --r-lg: 10px;   /* Intermediate cards */
  --r-xl: 12px;   /* Main cards */
  --r-full: 9999px; /* Pills, round badges */
}
```

### Typography — 4 Families with Semantic Roles
```
IBM Plex Sans Condensed (700)     → Display, titles, logo, large KPIs — "efficiency"
Inter (300–700)                    → Body text, UI, buttons, labels — "clarity"
IBM Plex Mono (400, 500)           → Data, technical labels, badges, metrics — "data"
Source Serif 4 (400, 400i)         → Editorial, quotes, testimonials — "humanity"
```

**Google Fonts import:**
```
https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Condensed:wght@400;600;700&family=Inter:wght@300;400;500;600;700&family=Source+Serif+4:ital,wght@0,400;1,400&display=swap
```

### Component Specifications

**Buttons:**
- `btn-primary`: background var(--pulso) #00C2A8, text #0A1A18, hover: #00D4BE + translateY(-1px) + box-shadow 0 4px 20px rgba(0,194,168,0.35)
- `btn-secondary`: transparent, 1.5px solid var(--pulso), text var(--pulso), hover: rgba(0,194,168,0.08) background
- `btn-ghost`: transparent, 1.5px solid rgba(61,90,128,0.6), text var(--neblina), hover: border-color var(--neblina)
- `btn-danger`: rgba(255,107,107,0.12) background, 1.5px solid rgba(255,107,107,0.3), text var(--danger)
- Sizes: sm (6px/14px padding, 12px font, 6px radius), md (10px/22px, 13px font, 8px radius), lg (13px/28px, 15px font, 10px radius)
- Font: Inter, weight 500–600, letter-spacing 0.02em

**Inputs:**
- Background: rgba(43,58,82,0.6)
- Border: 1.5px solid rgba(61,90,128,0.5)
- Focus: border-color var(--pulso), background rgba(43,58,82,0.9), box-shadow optional rgba(0,194,168,0.12)
- Error: border-color var(--danger)
- Placeholder: rgba(138,154,181,0.5)
- Label: IBM Plex Mono, 10px, uppercase, letter-spacing 0.12em, color var(--chumbo)
- Radius: 8px
- Padding: 10px 14px
- Font: Inter, 14px

**Badges/Pills:**
- Font: IBM Plex Mono, 10px (or 9px for small), uppercase, letter-spacing 0.1em
- Border-radius: var(--r-full) 9999px
- Include a 5px dot (::before pseudo) matching text color
- Variants:
  - green: rgba(0,194,168,0.15) bg, var(--pulso) text, optional 1px solid rgba(0,194,168,0.2)
  - blue: rgba(0,119,182,0.15) bg, #64B5E8 text
  - purple: rgba(107,92,231,0.15) bg, #A99EF5 text
  - warn: rgba(245,166,35,0.12) bg, var(--warn) text
  - danger: rgba(255,107,107,0.12) bg, var(--danger) text
  - neutral: rgba(138,154,181,0.12) bg, var(--chumbo) text

**Cards:**
- Background: var(--petroleo) #2B3A52
- Border: 1px solid rgba(61,90,128,0.25)
- Border-radius: var(--r-xl) 12px
- Hover: border-color rgba(0,194,168,0.3), transform translateY(-2px)
- Padding: 18px (dashboard cards) to 28px (content cards)

**Progress Bars:**
- Track: height 5px, background rgba(61,90,128,0.2–0.5), border-radius var(--r-full)
- Fill variants: green (var(--pulso)), blue (var(--resid-light)), warn, danger
- Gradient option: linear-gradient(90deg, base, lighter)

**Score Rings (SVG):**
- Circle stroke-based with rounded linecap
- Background track: rgba(61,90,128,0.2)
- Score text: IBM Plex Sans Condensed, 700 weight, white
- Sub text: IBM Plex Mono, 9px, var(--chumbo)

**Heatmap Cells:**
- 6 density levels:
  - h0: rgba(61,90,128,0.12)
  - h1: rgba(0,194,168,0.12)
  - h2: rgba(0,194,168,0.25)
  - h3: rgba(0,194,168,0.45)
  - h4: rgba(0,194,168,0.70)
  - h5: #00C2A8 (solid)
- Cell: aspect-ratio 1, border-radius 3px, min-width 24px
- Labels: IBM Plex Mono, 8–9px, var(--chumbo)

**Navigation (Sidebar — Web):**
- Width: 220px
- Background: #0D111C
- Border-right: 1px solid rgba(61,90,128,0.2)
- Nav items: 13px font, color var(--chumbo), padding 9px 10px, radius var(--r-md)
- Active: background rgba(0,194,168,0.07), color white, icon color var(--pulso)
- Section labels: IBM Plex Mono, 9px, uppercase, letter-spacing 0.15em, rgba(138,154,181,0.5)

**Topbar:**
- Height: 52px
- Background: #0D111C
- Border-bottom: 1px solid rgba(61,90,128,0.2)
- Title: IBM Plex Sans Condensed, 18px, 700, white
- Badge: IBM Plex Mono, 9px, var(--pulso), with border rgba(0,194,168,0.2)

---

## CONSTRAINTS & STANDARDS

- **NO Material Design.** This is a proprietary design system. Do NOT use MUI, Material Web, or Material tokens. Everything follows the MedPleni design system above.
- **NO hardcoded hex values** — always use CSS custom properties (--abismo, --pulso, etc.)
- **Dark mode is NATIVE and ONLY.** There is no light mode toggle. Background is always var(--abismo) #1A1F2E.
- **Tech Stack:** Next.js (App Router) + TypeScript + Tailwind CSS (configured with custom tokens above) OR plain CSS modules using the exact tokens. No MUI. No Chakra. No Shadcn. Pure custom components matching the HTML references.
- **Responsiveness:** All layouts must be fully responsive — Desktop (sidebar layout), Tablet (collapsible sidebar), Mobile (bottom navigation bar with 5 items).
- **Language:** ALL UI text in Brazilian Portuguese (pt-BR). Use the MedPleni tone of voice: precise, encouraging, data-driven. Never generic motivational phrases.
- **Font loading:** Always import the 4 Google Font families listed above.
- **Icons:** Use Lucide React icons (line style, 1.5px stroke) — matching the geometric, thin-line iconography from the brand book.

---

## SCOPE — FRONTEND ONLY, FULLY MOCKED

This is a **frontend-only build with mocked data** for investor demonstration. 

- **ALL data is mock data** — realistic, medically accurate, and consistent across screens.
- **ALL interactions are functional** — navigation works, buttons have states, forms accept input, simulados are clickable, timers count down, charts animate.
- **NO backend logic.** No API calls. No Supabase. No auth. Mock everything client-side.
- **DO create a mock data layer** (e.g., `/lib/mock-data.ts`) with typed data for: user profile, KPIs, questions, flashcards, simulados, heatmap, recommendations, schedule.

---

## PAGES TO BUILD — COMPLETE ROUTES

### 1. `/login` — Login / Splash Screen
- Logo MedPleni centralizado (SVG: cruz médica + ECG pulse + dot, conforme brand-book-medpleni.html)
- Tagline in Source Serif 4 italic: "Medicina com propósito. Tecnologia com precisão."
- Email + Senha inputs (styled per design system)
- Botão "Entrar" (btn-primary, full width)
- Links secundários: "Primeiro acesso" · "Esqueci a senha"
- Background: var(--abismo) with subtle radial gradient glow (rgba(61,90,128,0.25))
- **Mock behavior:** Any email/password → redirects to /onboarding

### 2. `/onboarding` — 5-Step Intelligent Onboarding
Progressive flow with progress bar at top (20% per step). Each step is a full-screen card.

**Step 1/5 — Foco de Preparação:**
- 4 option cards (icon + title + subtitle): "Residência Médica", "ENAMED", "Revalida" (disabled/coming soon badge), "Especialização Direta" (disabled)
- Only "Residência Médica" and "ENAMED" are selectable in MVP

**Step 2/5 — Prova-Alvo e Especialidade:**
- Prova selection: chip-style selectable buttons for ENAMED, ENARE, USP, Sírio-Libanês, Einstein, UNIFESP, FMABC (allow multiple)
- Especialidade: chips for Clínica Médica, Cirurgia Geral, Pediatria, Ginecologia/Obstetrícia, Saúde Coletiva, etc.
- Date picker: "Data estimada da prova"

**Step 3/5 — Disponibilidade:**
- Slider: "Horas por semana" (5h–40h+)
- Day chips (seg–dom): selectable
- Period chips: Manhã, Tarde, Noite, Madrugada

**Step 4/5 — Contexto Pessoal (Opcional):**
- Welcoming tone, explanation text in Source Serif 4 italic
- 3 textarea fields: "Quem te apoia nessa jornada?", "Algum desafio pessoal a gerenciar?", "Algo mais que a IA deveria saber?"
- Visible "Pular — configurar depois" ghost button

**Step 5/5 — Confirmação:**
- Visual summary of all choices in card format
- Animated "Gerando seu plano personalizado..." state with pulsing teal dot
- btn-primary "Iniciar minha jornada" → redirects to /dashboard

### 3. `/diagnostico` — Raio-X Inicial (Diagnóstico de Prontidão)
- Introduction screen: explains the diagnostic, estimated time (15min), what will be measured
- Question-by-question flow (reuse sim-opt component pattern from simulado)
- Progress bar at top
- After completion: animated score reveal → results screen with:
  - Score Ring (SVG) per axis (CM, SC, CG, Pediatria, GO)
  - Color-coded badges (green/amber/red) per area
  - Personalized action plan card
  - "Compartilhar resultado" button (shareable card mock)
  - CTA: "Começar trial de 7 dias" (btn-primary)

### 4. `/dashboard` — Main Dashboard (REPLICATE EXACTLY from medpleni-part3-dashboard.html)
This is the MOST IMPORTANT screen. Replicate it pixel-perfectly from the HTML reference.

**Layout:**
- Sidebar (220px): Logo, nav items (Dashboard active, Simulados, Questões, Desempenho, Lacunas, Predição, sub-brands with colored dots), user footer with avatar
- Topbar: "Dashboard" title, badge "RESID · USP 2026", notification + settings icon buttons
- Content area (scrollable, background var(--abismo)):

**KPI Row (4 columns):**
- Predição de Aprovação: 94.7% (icon teal bg, delta +2.3pp up)
- Simulados Realizados: 63 (icon blue bg, delta +4 this week)
- Taxa de Acerto: 78.2% (icon green bg, delta +1.8pp)
- Streak: 14 dias (icon amber bg)

**Main Grid (2 columns):**

Left column:
- **Score de Prontidão card:** Score Ring SVG (94.7%), area tags (CM green, CG green, SC amber, Pediatria warn, GO danger)
- **Progresso por Área card:** 5 progress bars (Clínica Médica 87% green, Cirurgia Geral 72% blue, Saúde Coletiva 58% warn, Pediatria 45% warn, GO 38% danger)
- **Heatmap de Atividade card:** 7-day × 6-area grid with density cells (h0–h5), day labels, area labels, legend bar
- **Evolução do Score card:** SVG line chart showing score progression over last 8 simulados (with teal line, dot markers, grid lines, axis labels)

Right column:
- **Recomendações Priorizadas card:** 3 ranked items (each with rank number, title, description, area badge, difficulty badge, impact metric)
- **Próximos Simulados card:** 2 upcoming simulado cards with date, type, estimated impact
- **Progresso do Plano card:** progress bar "74% do plano de estudos concluído"

### 5. `/simulados` — Simulados List
- Grid of simulado cards: each with institution badge (USP, UNIFESP, ENARE...), number of questions, estimated time, status (não iniciado / em andamento / concluído), acerto percentage if done
- Filter bar: by institution, by area, by status
- CTA "Iniciar Simulado" on each card

### 6. `/simulado/[id]` — Simulado Screen (REPLICATE EXACTLY from medpleni-part3-dashboard.html section 2)

**Topbar:** Logo "MedPleni", divider, "RESID · Simulado Intensivo 2026 · Clínica Médica", question counter "Q 23 / 120", progress bar, timer "01:47:22" (amber span for minutes), "Encerrar" danger button

**Layout (3 columns):**

Left sidebar (200px):
- "Questões" title
- 5-column grid of numbered question dots: sq-done (teal), sq-curr (solid teal), sq-skip (amber), sq-todo (gray)
- Stats section: Respondidas (22), Puladas (2), Restantes (96), Tempo médio (1:23)

Main content:
- Question header: "QUESTÃO 23", area badge, difficulty badge
- Question text with clinical context (sim-context: left border teal, italic, bg rgba(43,58,82,0.4))
- 5 answer options (A–E) as sim-opt cards: letter badge + text, selected state with teal highlight
- Tags at bottom: topic tags

Right panel (200px):
- Mini score ring (SVG) with current simulado progress
- "Referência Bibliográfica" card with source text

**Footer:** "Anterior" ghost btn, "Pular questão" warn btn, confidence dots (5 dots, clickable), "Confirmar resposta" primary btn

**Mock behavior:** Clicking options selects them, clicking Confirmar advances to next question, timer counts down, question dots update.

### 7. `/questoes` — Banco de Questões
- Filterable list of questions
- Filters: institution (chips), area (chips), difficulty (1–5), search text
- Each question card: area icon, title/preview, institution badge, difficulty dots, status (respondida/nova)
- Click → opens question in full view with answer + explanation

### 8. `/flashcards` — Spaced Repetition
- Card flip animation: front (question) → back (answer)
- 3 feedback buttons: "Difícil" (danger), "Ok" (warn), "Fácil" (success)
- Next review interval indicator
- Progress: "12 de 30 cards hoje"
- Queue visualization: upcoming cards by area

### 9. `/predicao` — Predição de Aprovação
- Large Score Ring central (94.7%)
- Breakdown by prova-alvo: table with each prova, score, trend arrow, status badge
- Projection chart: SVG showing projected score over next 8 weeks at current pace
- "Alertas de Risco" section: cards for areas below threshold

### 10. `/planos` — Pricing Page
- 3-column pricing cards: Diagnóstico (Free), Residente (R$ 117/mês), Aprovação (R$ 237/mês)
- Toggle mensal/anual with -35% discount badge
- Feature comparison list with checkmarks/crosses
- "Mais popular" badge on Residente
- CTA "Começar 7 dias grátis" on each paid plan
- ROI calculator card at bottom: "Custo de 1 ciclo perdido: R$ 24.600 | MedPleni 12 meses: R$ 1.404 | ROI: 16.5×"

### 11. `/perfil` — Profile & Settings
- User info card: avatar, name, email, plano ativo badge, prova-alvo
- Settings sections: Notificações (toggles), Prova-alvo (editable), Disponibilidade (editable), Dados pessoais
- "Sair" danger button

### 12. `/cronograma` — Cronograma de Estudos (IA)
- Weekly calendar view with study blocks color-coded by area
- Each block: time, area, topic, duration
- "Ajustado pela IA" badge with last update timestamp
- Distribution visualization: donut chart showing 70% lacunas / 30% manutenção
- "Reajustar cronograma" secondary button

---

## MOCK DATA REQUIREMENTS

Create a comprehensive mock data file (`/lib/mock-data.ts`) with TypeScript types for:

```typescript
// User
const mockUser = {
  name: "Dra. Camila Santos",
  email: "camila.santos@med.br",
  avatar: "CS", // initials for gradient avatar
  plano: "Aprovação",
  provaAlvo: ["ENARE", "USP"],
  especialidade: "Clínica Médica",
  horasSemanais: 25,
  dataProva: "2026-11-15",
  streak: 14,
  trialDaysLeft: null, // null = paid user
};

// KPIs
const mockKPIs = {
  predicaoAprovacao: { value: 94.7, delta: 2.3, trend: "up" },
  simuladosRealizados: { value: 63, delta: 4, trend: "up" },
  taxaAcerto: { value: 78.2, delta: 1.8, trend: "up" },
  streak: { value: 14, delta: 0, trend: "stable" },
};

// Progress by Area
const mockProgress = [
  { area: "Clínica Médica", value: 87, variant: "green" },
  { area: "Cirurgia Geral", value: 72, variant: "blue" },
  { area: "Saúde Coletiva", value: 58, variant: "warn" },
  { area: "Pediatria", value: 45, variant: "warn" },
  { area: "Ginecologia/Obstetrícia", value: 38, variant: "danger" },
];

// 50+ mock questions with realistic medical content
// 10+ mock simulados
// Heatmap data (7 days × 6 areas)
// Score evolution data (8 data points)
// Recommendations (5 items with area, difficulty, impact)
// Flashcard deck (20+ cards)
// Schedule (7-day weekly plan)
```

**All mock data must be medically realistic.** Use real medical terms, real institution names, realistic question patterns. This is for investors who may include medical professionals.

---

## TECHNICAL IMPLEMENTATION NOTES

### File Structure
```
/app
  /login/page.tsx
  /onboarding/page.tsx
  /diagnostico/page.tsx
  /dashboard/page.tsx
  /simulados/page.tsx
  /simulado/[id]/page.tsx
  /questoes/page.tsx
  /flashcards/page.tsx
  /predicao/page.tsx
  /planos/page.tsx
  /perfil/page.tsx
  /cronograma/page.tsx
  layout.tsx (global font loading, CSS vars, dark background)

/components
  /ui (Button, Input, Badge, Card, ProgressBar, ScoreRing, HeatmapCell, Tooltip)
  /layout (Sidebar, Topbar, BottomNav, PageShell)
  /dashboard (KPICard, ProgressChart, HeatmapGrid, RecommendationList, EvolutionChart)
  /simulado (QuestionCard, OptionCard, QuestionGrid, TimerDisplay, ConfidenceDots)
  /onboarding (StepCard, OptionSelector, ProgressIndicator)
  /diagnostico (DiagnosticQuestion, ScoreReveal, ResultCard)

/lib
  mock-data.ts
  types.ts
  utils.ts (formatters, color helpers)
```

### Logo SVG (use this exact SVG everywhere)
```svg
<svg viewBox="0 0 220 52" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="14" width="8" height="24" rx="2" fill="#00C2A8" opacity=".9"/>
  <rect x="-4" y="20" width="20" height="8" rx="2" fill="#00C2A8" opacity=".9"/>
  <polyline points="24,26 28,26 31,18 34,34 37,22 40,30 43,26 50,26" stroke="#00C2A8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="50" cy="26" r="3" fill="#00C2A8"/>
  <circle cx="50" cy="26" r="6" fill="none" stroke="#00C2A8" stroke-width="1" opacity=".4"/>
  <text x="64" y="36" font-family="'IBM Plex Sans Condensed',sans-serif" font-weight="700" font-size="32" fill="#FFFFFF" letter-spacing="-0.5">Med</text>
  <text x="121" y="36" font-family="'IBM Plex Sans Condensed',sans-serif" font-weight="700" font-size="32" fill="#00C2A8" letter-spacing="-0.5">Pleni</text>
</svg>
```

### Avatar Component Pattern
```
Background: linear-gradient(135deg, #0077B6, #00C2A8)
Shape: circle, initials in IBM Plex Sans Condensed 700, white text
Sizes: 32px (nav), 40px (profile), 64px (settings)
```

### Chart Implementation
- Use **Recharts** for line charts (score evolution, projections)
- Use **raw SVG** for score rings, heatmaps, and donut charts
- All chart colors must use the design system tokens
- Animate on mount (smooth entry)

### Transitions & Animations
- Page transitions: fade-in 200ms ease
- Card hover: transform translateY(-2px) + border-color change, 150ms
- Button hover: as specified per variant, 180ms
- Score ring on mount: stroke-dashoffset animation 1.5s ease-out
- Progress bars on mount: width animation 1s ease
- Heatmap cells: opacity stagger animation on scroll-in

### Responsive Breakpoints
- Desktop: ≥1024px — sidebar + topbar + content (as shown in HTML references)
- Tablet: 768–1023px — collapsible sidebar (hamburger), topbar stays
- Mobile: <768px — no sidebar, bottom navigation bar with 5 items (Dashboard, Questões, Simulados, Predição, Perfil)

---

## TONE OF VOICE IN UI COPY

Follow the MedPleni brand voice matrix:

| Context | ✅ YES | ❌ NO |
|---------|--------|-------|
| About data | "Você errou 67% das questões de HAS — isso representa 8% da sua prova-alvo" | "Você precisa melhorar muito em Clínica Médica" |
| About difficulty | "SC é difícil para 87% dos candidatos. Aqui está o plano." | "SC é fácil, você só precisa se esforçar mais" |
| About approval | "Com base na sua curva atual, você atinge 75% de prontidão em 6 semanas" | "Com o MedPleni você VAI passar!" |
| About time | "30 minutos hoje cobre os 3 tópicos mais críticos antes da prova" | "Você tem que estudar mais!" |

**Empty states:** Always informative and actionable. "Nenhum simulado realizado ainda. Comece pelo diagnóstico para mapear suas lacunas."

**Loading states:** Use pulsing skeleton components with petroleo/sinal colors. Never a plain spinner.

---

## QUALITY CHECKLIST (VERIFY BEFORE DONE)

- [ ] Every screen uses var(--abismo) as background, never any other color
- [ ] Every text element uses one of the 4 specified font families
- [ ] Every interactive element has hover/focus/active states
- [ ] Every button follows the exact variant specs from the design system
- [ ] The dashboard matches medpleni-part3-dashboard.html pixel-by-pixel
- [ ] The simulado screen matches the HTML reference pixel-by-pixel
- [ ] Score rings are SVG-based with stroke animations
- [ ] Heatmap uses the exact 6-level density scale
- [ ] All badges use IBM Plex Mono, uppercase, with colored dot
- [ ] Navigation sidebar matches the exact pattern from the HTML reference
- [ ] Mobile bottom nav works correctly on small screens
- [ ] All mock data is medically realistic and in Portuguese
- [ ] Timer in simulado counts down functionally
- [ ] Question selection in simulado updates the question grid dots
- [ ] Onboarding flow works end-to-end with progress bar
- [ ] Pricing page has functional mensal/anual toggle
- [ ] Logo SVG is consistent everywhere (cross + ECG + dot pattern)
- [ ] No Material Design, MUI, or external UI library components used
- [ ] No hardcoded hex values — all through CSS custom properties

---

## DEPLOY TARGET

- **Domain:** medpleni.com (Vercel)
- **GitHub:** Connected to Antigravity project
- **Supabase:** Connected (but NOT used in this build — mock only)

---

**START by reading ALL reference files in the Explorer, then build the component library first, then assemble pages. Prioritize the /dashboard and /simulado/[id] pages as they are the hero screens for the investor demo.**
