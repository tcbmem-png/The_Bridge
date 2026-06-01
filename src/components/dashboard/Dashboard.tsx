// Dashboard — faithful renderer of engine truth + the shared money module.
// Builds the 8 canonical panels from docs/dashboard-panel-spec.md (verbatim).
// PANEL-LEVEL flips. RENDER ENGINE TRUTH, DON'T AUTHOR. SINGLE SOURCE OF TRUTH.
// "ACTUAL" is a visual state, not a claim of real data — PHI wall holds.

import { useMemo } from "react";
import type { Spec, DomainState, DomainStatus } from "../../lib/engine/types";
import { useMoney } from "../../lib/money/store";
import { useLens } from "../../lib/lens/store";
import {
  fmtCount,
  fmtDollarsPerWRVU,
  fmtMoney,
  fmtPct,
  fmtWRVU,
} from "../../lib/money/format";
import { FallToken } from "../FallToken";
import { LensToggle } from "./LensToggle";
import { FeedsGlyph, FeedsLegend, type Feeds } from "../provenance/FeedsGlyph";
import {
  HOSPITAL_PANEL,
  HOSPITAL_LOST_STUDY,
  DUA_GATED_CUTS,
} from "./hospitalNarration";

// Per-panel feeds binding. HARD rule: each glyph reads the feeds of the
// EXACT number it sits on. Panels not in the spec's enumerated list get no
// glyph rather than be hand-set or inflated.
const PANEL_FEEDS: Record<number, { feeds: Feeds; sources: string[]; note: string } | undefined> = {
  1: { feeds: { billing: true, production: false, workflow: false }, sources: ["p1 — 837/835 claim & remittance"], note: "Net collections — billing-only." },
  2: { feeds: { billing: true, production: true, workflow: false }, sources: ["p1 — 837/835", "p5 — CMS RVU file (CPT → wRVU)"], note: "Blended $/wRVU joins payments to work RVU output." },
  3: { feeds: { billing: true, production: false, workflow: false }, sources: ["p1 — 837/835"], note: "Payer mix — billing-only." },
  4: { feeds: { billing: true, production: true, workflow: false }, sources: ["p1 — 837/835", "p5 — CMS RVU file"], note: "Coverage gap = no-pay + Medicaid shortfall, at the Medicare conversion factor — joins billing to wRVU output." },
  5: { feeds: { billing: true, production: false, workflow: false }, sources: ["p2 — CARC/RARC denial codes from 835"], note: "Denials by CARC (Claim Adjustment Reason Code) — billing-only." },
  6: { feeds: { billing: true, production: false, workflow: false }, sources: ["p1 — 837/835"], note: "Days in A/R / procedure-to-cash — billing-only." },
  // 7 (negative-read rate · fall) and 8 (TAT) are not enumerated in the
  // provenance spec; omit the mark rather than overclaim.
};

// ---------- panel registry (verbatim from spec §2) ----------

// Dashboard panel domains map to engine domains:
//   billing → billing · reporting → reporting · worklist → tat (PACS timestamps).
type PanelDomain = "billing" | "reporting" | "worklist";

type PanelDef = {
  id: number;
  title: string;
  unit: string;
  domain: PanelDomain;
  cite: string; // e.g. "[p1]" / "[p1][p5]"
};

const PANELS: PanelDef[] = [
  { id: 1, title: "Net collection rate", unit: "%", domain: "billing", cite: "[p1]" },
  { id: 2, title: "Net revenue per wRVU", unit: "$/wRVU", domain: "billing", cite: "[p1][p5]" },
  { id: 3, title: "Payer mix", unit: "% shares", domain: "billing", cite: "[p1]" },
  { id: 4, title: "Coverage gap vs Medicare", unit: "wRVU + $", domain: "billing", cite: "[p1][p5]" },
  { id: 5, title: "Denials", unit: "% by CARC", domain: "billing", cite: "[p2]" },
  { id: 6, title: "Days in A/R", unit: "days", domain: "billing", cite: "[p1]" },
  { id: 7, title: "Negative-read rate · fall", unit: "%", domain: "reporting", cite: "[p6]" },
  { id: 8, title: "Turnaround time", unit: "minutes", domain: "worklist", cite: "[p7]" },
];

const PROVENANCE: Array<{ id: string; text: string }> = [
  { id: "p1", text: "p1 — 837/835 claim and remittance feeds (billing-domain truth)." },
  { id: "p2", text: "p2 — CARC/RARC denial codes from 835." },
  { id: "p5", text: "p5 — CMS public RVU file (CPT → wRVU)." },
  { id: "p6", text: "p6 — Reporting platform (mPower export or NLP over PowerScribe text)." },
  { id: "p7", text: "p7 — PACS timestamps (exam_complete → report_signed)." },
];

// ---------- state → visual ----------

const STATE_TAG: Record<DomainStatus, string> = {
  live: "ACTUAL · illustrative",
  assumed: "ASSUMED · benchmark",
  pending_source: "PENDING — needs source",
  pending_compliance: "PENDING — needs BAA / review",
};

function shellClasses(status: DomainStatus): string {
  switch (status) {
    case "live":
      return "border-[var(--teal)] bg-paper";
    case "assumed":
      return "border-ink/30 bg-paper border-dashed";
    case "pending_source":
    case "pending_compliance":
      return "border-[var(--red-clinical)]/40 bg-[color-mix(in_oklab,var(--red-clinical)_5%,var(--paper))]";
  }
}

function tagClasses(status: DomainStatus): string {
  switch (status) {
    case "live":
      return "bg-[var(--teal)] text-paper";
    case "assumed":
      return "border border-ink/30 text-ink/65";
    case "pending_source":
    case "pending_compliance":
      return "bg-[var(--red-clinical)]/15 text-[var(--red-clinical)]";
  }
}

function valueToneClasses(status: DomainStatus): string {
  switch (status) {
    case "live":
      return "text-ink";
    case "assumed":
      return "text-ink/55";
    case "pending_source":
    case "pending_compliance":
      return "text-ink/30";
  }
}

// ---------- panel renderers (illustrative numbers; money panels use shared module) ----------

type PanelBodyProps = {
  status: DomainStatus;
  // money-derived values surface via the parent and are passed in for panels 2/3/4
};

function ValueRow({
  primary,
  secondary,
  status,
}: {
  primary: string;
  secondary?: string;
  status: DomainStatus;
}) {
  return (
    <div className="mt-4">
      <div className={`font-mono-tab text-3xl leading-none ${valueToneClasses(status)}`}>
        {primary}
      </div>
      {secondary ? (
        <div className={`font-mono-tab mt-2 text-[11px] uppercase tracking-[0.12em] ${valueToneClasses(status)}`}>
          {secondary}
        </div>
      ) : null}
    </div>
  );
}

// ---------- main component ----------

type Props = {
  spec: Spec;
  // Compact mode for embedding in narrative sections.
  compact?: boolean;
};

export function Dashboard({ spec, compact = false }: Props) {
  const { inputs, derived } = useMoney();
  const { lens } = useLens();
  const domains = spec.domainReadiness;

  // Map dashboard panel domain → engine domain ("worklist" → "tat").
  const domainFor = (d: PanelDomain): DomainState => {
    if (d === "worklist") return domains.tat;
    return domains[d];
  };

  // ★ Lost-study reconciliation — two-domain gate.
  // Live ONLY when BOTH billing AND worklist (engine: tat) are live, plus compliance.
  // If exactly one is live → distinctive half-gated state (names the missing source).
  // If compliance fails on either → pending_compliance.
  const billingDs = domains.billing;
  const tatDs = domains.tat;
  const starStatus: "live" | "half" | "pending_source" | "pending_compliance" =
    billingDs.status === "pending_compliance" || tatDs.status === "pending_compliance"
      ? "pending_compliance"
      : billingDs.status === "live" && tatDs.status === "live"
      ? "live"
      : billingDs.status === "live" || tatDs.status === "live"
      ? "half"
      : "pending_source";
  const starMissing =
    starStatus === "half"
      ? billingDs.status === "live"
        ? "worklist"
        : "billing"
      : null;

  const TOTAL_PANELS = 9;
  const liveCount = useMemo(() => {
    const baseLive = PANELS.filter((p) => domainFor(p.domain).status === "live").length;
    return baseLive + (starStatus === "live" ? 1 : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domains, starStatus]);

  return (
    <div className="rounded-xl border border-ink/15 bg-paper">
      {/* Foundation meter — credit-forward, never a deficit count */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 px-5 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <FallToken size={12} tone="teal" />
          <div>
            <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
              Foundation meter
            </div>
            <div className="font-display mt-1 text-lg leading-snug md:text-xl">
              <span className="font-mono-tab">{liveCount}</span> of{" "}
              <span className="font-mono-tab">{TOTAL_PANELS}</span> panels wired from
              data {lens === "hospital" ? "the group already owns" : "you already own"}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <LensToggle />
          <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
            Illustrative · sample data
          </div>
        </div>
      </div>

      {/* Hospital-lens framing strip — same numbers, hospital chair. */}
      {lens === "hospital" ? (
        <div className="border-b border-ink/15 bg-[color-mix(in_oklab,var(--teal)_6%,var(--paper))] px-5 py-3 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="max-w-3xl text-[12.5px] leading-relaxed text-ink/75">
              Same numbers, hospital chair. A shared scoreboard, not leverage.
              The group owns its professional billing, reports, and worklist.
              The hospital owns the technical billing and the full operational
              record in its electronic health record (EHR). Cuts that need
              hospital-owned data are gated behind a data-use agreement (DUA).
            </p>
            <span className="font-mono-tab shrink-0 rounded-full border border-ink/25 px-2 py-0.5 text-[9.5px] uppercase tracking-[0.12em] text-ink/60">
              Provisional copy · tone pass pending
            </span>
          </div>
        </div>
      ) : null}

      {/* Foundation bar */}
      <div className="px-5 pt-4 md:px-6">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full bg-[var(--teal)] transition-[width] duration-500"
            style={{ width: `${(liveCount / TOTAL_PANELS) * 100}%` }}
          />
        </div>
      </div>

      {/* ★ Lost-study reconciliation — featured 9th panel, two-domain gate */}
      <div className="px-5 pt-4 md:px-6">
        <LostStudyShowcase
          status={starStatus}
          missing={starMissing}
          billingName={billingDs.sourceName}
          tatName={tatDs.sourceName}
          lostCount={derived.lost_study_count}
          lostDollars={derived.lost_study_$}
          coverageVolume={inputs.coverage_volume}
          ratePct={inputs.lost_study_rate_pct}
          blended={derived.blended_$_per_wRVU}
          titleOverride={lens === "hospital" ? HOSPITAL_LOST_STUDY.title : undefined}
          captionOverride={lens === "hospital" ? HOSPITAL_LOST_STUDY.caption : undefined}
        />
      </div>

      {/* Panel grid */}
      <div
        className={[
          "grid grid-cols-1 gap-3 p-5 md:p-6",
          compact ? "md:grid-cols-3 lg:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-4",
        ].join(" ")}
      >
        {PANELS.map((p) => {
          const ds = domainFor(p.domain);
          const hosp = lens === "hospital" ? HOSPITAL_PANEL[p.id] : undefined;
          return (
            <PanelCard
              key={p.id}
              def={p}
              state={ds}
              titleOverride={hosp?.title}
              captionOverride={hosp?.caption}
            >
              {renderPanelBody(p, ds.status, inputs, derived)}
            </PanelCard>
          );
        })}
      </div>

      {/* Hospital lens · DUA-gated joint cuts. Labeled placeholders only —
          never a made-up hospital number. */}
      {lens === "hospital" ? (
        <div className="border-t border-ink/15 px-5 py-5 md:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="font-display text-lg leading-snug md:text-xl">
              Unlocks with a data-use agreement (DUA)
            </h3>
            <span className="font-mono-tab text-[10px] uppercase tracking-[0.14em] text-ink/55">
              Hospital-owned data · joint picture
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-[12.5px] leading-relaxed text-ink/70">
            Prove value on group-owned data first. A DUA opens the joint view —
            without bluffed numbers. Each row below is a labeled, replaceable
            placeholder until the hospital-side join exists.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {DUA_GATED_CUTS.map((c) => (
              <article
                key={c.label}
                className="rounded-lg border border-dashed border-ink/30 bg-paper p-4"
              >
                <div className="font-mono-tab text-[10px] uppercase tracking-[0.14em] text-ink/55">
                  {c.unit} <span className="text-ink/35">· DUA-gated</span>
                </div>
                <h4 className="font-display mt-1 text-base leading-snug">
                  {c.label}
                </h4>
                <div className="mt-3 font-mono-tab text-3xl leading-none text-ink/25">
                  —
                </div>
                <p className="mt-3 text-[11.5px] leading-relaxed text-ink/65">
                  {c.note}
                </p>
                <footer className="font-mono-tab mt-3 text-[10px] uppercase tracking-[0.12em] text-ink/45">
                  Needs · {c.needs}
                </footer>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {/* Provenance endnotes — same style as Under the Hood */}
      <div className="border-t border-ink/15 px-5 py-4 md:px-6">
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
          Provenance · endnotes
        </div>
        <ul className="mt-2 grid grid-cols-1 gap-1 text-[11px] leading-relaxed text-ink/65 md:grid-cols-2">
          {PROVENANCE.map((n) => (
            <li key={n.id} className="font-mono-tab">
              {n.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------- panel shell ----------

function PanelCard({
  def,
  state,
  titleOverride,
  captionOverride,
  children,
}: {
  def: PanelDef;
  state: DomainState;
  titleOverride?: string;
  captionOverride?: string;
  children: React.ReactNode;
}) {
  return (
    <article
      className={[
        "relative flex flex-col rounded-lg border p-4 transition-colors",
        shellClasses(state.status),
      ].join(" ")}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono-tab text-[10px] uppercase tracking-[0.14em] text-ink/55">
            {def.unit} <span className="text-ink/35">· {def.cite}</span>
          </div>
          <h3 className="font-display mt-1 flex items-center gap-2 text-base leading-snug">
            <span>{titleOverride ?? def.title}</span>
            {PANEL_FEEDS[def.id] && (state.status === "live" || state.status === "assumed") ? (
              <FeedsGlyph
                feeds={PANEL_FEEDS[def.id]!.feeds}
                sources={PANEL_FEEDS[def.id]!.sources}
                note={PANEL_FEEDS[def.id]!.note}
              />
            ) : null}
          </h3>
        </div>
        <span
          className={[
            "font-mono-tab shrink-0 rounded-full px-2 py-0.5 text-[9.5px] uppercase tracking-[0.12em]",
            tagClasses(state.status),
          ].join(" ")}
        >
          {STATE_TAG[state.status]}
        </span>
      </header>

      <div className="flex-1">{children}</div>

      {captionOverride ? (
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink/65">
          {captionOverride}
        </p>
      ) : null}

      <footer className="font-mono-tab mt-4 text-[10px] uppercase tracking-[0.12em] text-ink/45">
        {state.status === "live" || state.status === "assumed"
          ? `Source · ${state.sourceName}`
          : state.needs[0] ?? `Source · ${state.sourceName}`}
      </footer>
    </article>
  );
}

// ---------- per-panel body ----------

function renderPanelBody(
  def: PanelDef,
  status: DomainStatus,
  inputs: ReturnType<typeof useMoney>["inputs"],
  derived: ReturnType<typeof useMoney>["derived"],
): React.ReactNode {
  // Pending states show placeholder dashes — no number until the gate clears.
  if (status === "pending_source" || status === "pending_compliance") {
    return <ValueRow primary="—" secondary="awaiting source" status={status} />;
  }

  switch (def.id) {
    case 1:
      // Net collection rate — illustrative.
      return <ValueRow primary={fmtPct(92.4, 1)} secondary="collections ÷ allowed" status={status} />;
    case 2:
      return (
        <ValueRow
          primary={fmtDollarsPerWRVU(derived.blended_$_per_wRVU)}
          secondary="blended · across payers"
          status={status}
        />
      );
    case 3:
      return <PayerMixBars mix={inputs.payer_mix} status={status} />;
    case 4:
      return (
        <div className="mt-4">
          <div className={`font-mono-tab text-3xl leading-none ${valueToneClasses(status)}`}>
            {fmtMoney(derived.coverageGapVsMedicare_$)}
          </div>
          <div className={`font-mono-tab mt-2 text-[11px] uppercase tracking-[0.12em] ${valueToneClasses(status)}`}>
            {fmtWRVU(derived.noPay_wRVU + derived.medicaidShortfall_wRVU)} · no-pay +
            shortfall
          </div>
        </div>
      );
    case 5:
      return (
        <div className="mt-4">
          <div className={`font-mono-tab text-3xl leading-none ${valueToneClasses(status)}`}>
            {fmtPct(7.2, 1)}
          </div>
          <ul className={`font-mono-tab mt-2 space-y-0.5 text-[11px] uppercase tracking-[0.10em] ${valueToneClasses(status)}`}>
            <li>CO-50 · not medically necessary · 38%</li>
            <li>CO-97 · bundled / inclusive · 22%</li>
            <li>CO-16 · missing info · 14%</li>
          </ul>
        </div>
      );
    case 6:
      return <ValueRow primary="38 days" secondary="AR ÷ avg daily charges" status={status} />;
    case 7:
      return (
        <div className="mt-4">
          <div className={`font-mono-tab text-3xl leading-none ${valueToneClasses(status)}`}>
            {fmtPct(inputs.fall_negative_rate, 0)}
          </div>
          <div className={`font-mono-tab mt-2 text-[11px] uppercase tracking-[0.12em] ${valueToneClasses(status)}`}>
            fall · clean reads ÷ reads
          </div>
        </div>
      );
    case 8:
      return <ValueRow primary="28 min" secondary="STAT · signed − complete" status={status} />;
    default:
      return null;
  }
}

// ---------- payer mix bars ----------

function PayerMixBars({
  mix,
  status,
}: {
  mix: { medicare: number; medicaid: number; commercial: number; self_pay: number };
  status: DomainStatus;
}) {
  const rows: Array<[string, number, string]> = [
    ["Commercial", mix.commercial, "bg-[var(--teal)]"],
    ["Medicare", mix.medicare, "bg-ink"],
    ["Medicaid", mix.medicaid, "bg-[var(--gold)]"],
    ["Self-pay", mix.self_pay, "bg-[var(--red-clinical)]"],
  ];
  const opacity = status === "assumed" ? "opacity-60" : "";
  return (
    <div className={`mt-4 space-y-2 ${opacity}`}>
      {rows.map(([label, v, color]) => (
        <div key={label}>
          <div className="flex items-center justify-between">
            <span className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/65">
              {label}
            </span>
            <span className="font-mono-tab text-[11px] text-ink/80">{fmtPct(v, 0)}</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
            <div className={`h-full ${color}`} style={{ width: `${v}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Suppress unused-prop warning on the typing helper.
export type _PanelBodyProps = PanelBodyProps;

// ---------- ★ Lost-study reconciliation showcase ----------
// Two-domain gate: visible only when billing AND worklist (engine: tat) are
// both live. The half-gated state is the demo — names the missing source.
// Reads useMoney(); single source of truth with the Sandbox/dashboard.
function LostStudyShowcase({
  status,
  missing,
  billingName,
  tatName,
  lostCount,
  lostDollars,
  coverageVolume,
  ratePct,
  blended,
  titleOverride,
  captionOverride,
}: {
  status: "live" | "half" | "pending_source" | "pending_compliance";
  missing: "billing" | "worklist" | null;
  billingName: string;
  tatName: string;
  lostCount: number;
  lostDollars: number;
  coverageVolume: number;
  ratePct: number;
  blended: number;
  titleOverride?: string;
  captionOverride?: string;
}) {
  const shell =
    status === "live"
      ? "border-[var(--teal)] bg-paper"
      : status === "half"
      ? "border-[var(--teal)]/55 bg-paper border-dashed"
      : status === "pending_compliance"
      ? "border-[var(--red-clinical)]/40 bg-[color-mix(in_oklab,var(--red-clinical)_5%,var(--paper))]"
      : "border-ink/30 bg-paper border-dashed";

  const tag =
    status === "live"
      ? "ACTUAL · illustrative"
      : status === "half"
      ? `HALF-GATED · ${missing === "worklist" ? "needs worklist" : "needs billing"}`
      : status === "pending_compliance"
      ? "PENDING — needs BAA / review"
      : "PENDING — needs source";

  const tagClasses =
    status === "live"
      ? "bg-[var(--teal)] text-paper"
      : status === "half"
      ? "border border-[var(--teal)]/60 text-[var(--teal)]"
      : status === "pending_compliance"
      ? "bg-[var(--red-clinical)]/15 text-[var(--red-clinical)]"
      : "border border-ink/30 text-ink/65";

  const showNumber = status === "live";
  const valueTone = showNumber ? "text-ink" : "text-ink/35";

  return (
    <article className={`relative rounded-lg border p-5 transition-colors ${shell}`}>
      <header className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono-tab text-[10px] uppercase tracking-[0.14em] text-ink/55">
            ★ count + $ <span className="text-ink/35">· [p1][p7] · two-domain join</span>
          </div>
          <h3 className="font-display mt-1 text-lg leading-snug md:text-xl">
            {titleOverride ?? "Lost-study reconciliation · found money"}
          </h3>
          {captionOverride ? (
            <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-ink/70">
              {captionOverride}
            </p>
          ) : null}
        </div>
        <span
          className={`font-mono-tab shrink-0 rounded-full px-2 py-0.5 text-[9.5px] uppercase tracking-[0.12em] ${tagClasses}`}
        >
          {tag}
        </span>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <div className={`font-mono-tab text-3xl leading-none md:text-4xl ${valueTone}`}>
            {showNumber ? fmtCount(lostCount) : "—"}
          </div>
          <div className={`font-mono-tab mt-2 text-[11px] uppercase tracking-[0.12em] ${valueTone}`}>
            unbilled reads / yr
          </div>
        </div>
        <div>
          <div className={`font-mono-tab text-3xl leading-none md:text-4xl ${valueTone}`}>
            {showNumber ? fmtMoney(lostDollars) : "—"}
          </div>
          <div className={`font-mono-tab mt-2 text-[11px] uppercase tracking-[0.12em] ${valueTone}`}>
            at {fmtDollarsPerWRVU(blended)} · blended
          </div>
        </div>
        <div className="text-xs leading-relaxed text-ink/70">
          Completed reads (worklist) − billed reads (billing). Work already done,
          charge never dropped. ~100% margin. Default ≈ {ratePct.toFixed(1)}% of{" "}
          {fmtCount(coverageVolume)} reads — illustrative; 0.5–1.5% typically slips
          until the join reveals it.
        </div>
      </div>

      {status === "half" ? (
        <p className="font-mono-tab mt-4 rounded-md border border-[var(--teal)]/40 bg-[var(--teal)]/8 p-3 text-[11px] leading-relaxed text-ink/75">
          One source live ({missing === "worklist" ? billingName : tatName}). Add{" "}
          {missing === "worklist" ? tatName : billingName} to light this panel — no
          single vendor can produce this number on its own.
        </p>
      ) : null}

      <footer className="font-mono-tab mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.12em] text-ink/45">
        <span>Source · {billingName} + {tatName}</span>
        <span>Illustrative · sample data</span>
      </footer>
    </article>
  );
}

