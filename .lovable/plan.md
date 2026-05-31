
## The Bridge — build plan

A client-side-only TanStack Start + Tailwind app. No backend, no AI, no real names. This plan covers the initial scaffold and the **Story view** only. Under the Hood and Sandbox are left as empty stub routes for the next pass. AI-reframe and AUC copy, plus the dashboard component, are left as clearly marked placeholders pending your wording.

### 1. Standing rules (pinned to project memory)

Save these as `mem://` rules so they survive every future change:

- **Constraints**: client-side only, PHI-free, no backend/DB/auth/uploads, no AI/LLM/chatbot, no "connect your data".
- **CONFIG**: single source of entity names — `groupName = "the Physician Group"`, `hospitalName = "the Hospital"`, `examsPerYear = 800000`, `partnerCount = 200`. No real names anywhere.
- **Voice**: editorial-clinical. Short declarative sentences. Periods, not commas. No marketing register (no "trusted by", badge rows, urgency, hype adjectives, emoji, exclamation points, transformation arcs).
- **Design tokens**: Fraunces (display), IBM Plex Sans (body), IBM Plex Mono (all numbers, tabular). Palette: ink `#0E1B2C`, paper `#F6F2E9`, teal `#0E8C8C`, gold `#C2902B → #E0A93D`, red `#BB4332`. Faint dot-grid on paper bg.
- **Header pill**: persistent "Illustrative · sample data".

### 2. Design system wiring

- Add Google Fonts links (Fraunces, IBM Plex Sans, IBM Plex Mono) in `__root.tsx` head.
- Extend `src/styles.css` with the palette as oklch tokens (`--ink`, `--paper`, `--teal`, `--gold`, `--gold-2`, `--red`) and register them in `@theme inline` so utilities like `bg-paper text-ink` work. Override `--background`/`--foreground` to paper/ink.
- Body font → Plex Sans. Add font utility classes: `font-display` (Fraunces), `font-mono-tab` (Plex Mono with `font-variant-numeric: tabular-nums`).
- Add a `.dot-grid` background utility (subtle radial-gradient dot pattern on paper).

### 3. App shell

- `src/config.ts` — exports the `CONFIG` object. All copy that references entity names or numbers reads from here.
- `src/routes/__root.tsx` — add the sticky header: small circular brand mark (SVG circle with a teal inner dot, the recurring "fall token" motif), wordmark "The Bridge" in Fraunces, 3-tab nav using `<Link>` to `/`, `/under-the-hood`, `/sandbox` with `activeProps` for the active tab, and the right-aligned "Illustrative · sample data" pill (paper-on-ink small rounded pill). Update meta title/description to "The Bridge — Illustrative".
- `src/components/FallToken.tsx` — the small dot/tag motif, reused in all three views (sized prop).

### 4. Routes

- `/` → Story view (full build below).
- `/under-the-hood` → stub: just the section frame, H1 "Under the Hood", and a muted "Coming next." line.
- `/sandbox` → stub: same treatment, H1 "The Sandbox".

Each route sets its own `head()` with distinct title/description per route-architecture rules.

### 5. Story view (`src/routes/index.tsx`)

Single scroll. Components broken out into `src/components/story/`:

**Hero** (`Hero.tsx`)
- Kicker (mono, uppercase, tracked): "Problem → Dashboard → Solution"
- H1 (Fraunces, large, ink): "You're already generating the data. You're just not *seeing* it." — `seeing` wrapped in `<em>`.
- Sub (Plex Sans, muted ink): the exact paragraph from the brief.
- Two buttons: primary "Open the sandbox →" (ink bg, paper text) linking `/sandbox`; ghost "See how it works" (ink border) scrolling to Act 1.
- Subtle FallToken in the corner.

**Act 1 — The Problem** (`ActProblem.tsx`)
- Tag row: FallToken + "The Problem · Follow the fall" (mono, small).
- H2 (Fraunces): "Reading scans nobody pays for — everywhere."
- **Players row**: 3 cards driven by CONFIG — `the Physician Group`, `the Hospital`, `the ED`. Each card: role label (mono), name (Fraunces), one-line plain description (Plex Sans). Equal-height, paper cards with a thin ink border, stack on mobile.
- **Industry-reality** paragraph (body copy, plain and declarative, no hype). Draft: "Emergency volume runs through imaging. Scans are ordered, acquired, and read. The read produces a report, a claim, and a set of timestamps. The work happens. The economics of the work go unobserved."
- **AI-reframe placeholder**: a clearly marked block — dashed ink border, mono label `PLACEHOLDER · AI-reframe copy`, body "Awaiting wording." Easy to find and replace.
- **AUC callout placeholder**: same treatment, label `PLACEHOLDER · AUC callout`.
- **Fall vignette card**: dark card (ink bg, paper text), oversized Fraunces pull-quote treatment, a single FallToken falling on the right, mono caption underneath. Body kept minimal until you supply final wording — use a placeholder line "The read happens. The dollar falls."

**Act 2 — The Dashboard** (`ActDashboard.tsx`)
- Tag: FallToken + "The Dashboard · The fall, in numbers".
- H2 (Fraunces): "Data becomes information."
- **Dashboard placeholder box**: large paper card with dashed ink border, mono label `PLACEHOLDER · Dashboard component`, sized to roughly the final footprint so layout reads correctly. No fake charts.

**Act 3 — The Solution** (`ActSolution.tsx`)
- Tag: FallToken + "The Solution · The fall, removed".
- H2 (Fraunces): "Everyone earns more by removing waste."
- **Three pillars**: Collaborate / Quantify / Structure. Each: pillar name (Fraunces), one short declarative sentence (Plex Sans). Drafted plainly, no marketing verbs; easy to revise.
- **Win-row**: 3 tiles. Each tile shows a mono number (illustrative, from CONFIG-derived math or simple sample like `+$X / exam`) in gold/teal, with a short ink label below. Numbers clearly illustrative; tabular-nums.

### 6. Motion

- Motion is restrained. Use CSS-only transitions plus one `IntersectionObserver`-driven fade/translate on Act headers and the fall-vignette token. No library needed for this pass. Respect `prefers-reduced-motion`.

### 7. Mobile

- Single column at `<768px`. Header collapses to brand + pill; nav becomes a row beneath. Type scale steps down for H1/H2. Players row, pillars, and win-row all stack. Tap targets ≥44px.

### 8. What is explicitly NOT in this pass

- AI-reframe wording, AUC callout wording, fall-vignette final copy — placeholders only.
- Dashboard component internals — placeholder box only.
- Under the Hood and Sandbox content — empty stub routes.
- Any persistence, data fetching, uploads, or external calls.

### Technical notes

- Stack stays TanStack Start + Tailwind v4 (template default). Tokens added via `@theme inline` in `src/styles.css`; no `tailwind.config.js` changes needed.
- Fonts loaded via `<link>` tags in `__root.tsx` `head()` (preconnect to `fonts.googleapis.com` + `fonts.gstatic.com`).
- All copy strings that reference entities or numbers go through `CONFIG` — never hardcoded.
- File layout: `src/config.ts`, `src/components/FallToken.tsx`, `src/components/Header.tsx`, `src/components/story/{Hero,ActProblem,ActDashboard,ActSolution,Placeholder}.tsx`, routes `index.tsx`, `under-the-hood.tsx`, `sandbox.tsx`.
- Memory: write `mem://index.md` Core rules covering constraints/voice/tokens/CONFIG so every future edit honors them without re-prompting.

Ready to build on approval.
