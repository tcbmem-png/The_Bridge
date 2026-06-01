// Dashboard — faithful renderer of engine truth + the shared money module.
// Builds the 8 canonical panels from docs/dashboard-panel-spec.md (verbatim).
// PANEL-LEVEL flips. RENDER ENGINE TRUTH, DON'T AUTHOR. SINGLE SOURCE OF TRUTH.
// "ACTUAL" is a visual state, not a claim of real data — PHI wall holds.

import { useMemo } from "react";
import type { Spec, DomainState, DomainStatus } from "../../lib/engine/types";
import { useMoney } from "../../lib/money/store";
import {
  fmtDollarsPerWRVU,
  fmtMoney,
  fmtPct,
  fmtWRVU,
} from "../../lib/money/format";
import { FallToken } from "../FallToken";

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
  const domains = spec.domainReadiness;

  // Map dashboard panel domain → engine domain ("worklist" → "tat").
  const domainFor = (d: PanelDomain): DomainState => {
    if (d === "worklist") return domains.tat;
    return domains[d];
  };

  const liveCount = useMemo(() => {
    return PANELS.filter((p) => domainFor(p.domain).status === "live").length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domains]);

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
              <span className="font-mono-tab">{PANELS.length}</span> panels wired from
              data you already own
            </div>
          </div>
        </div>
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
          Illustrative · sample data
        </div>
      </div>

      {/* Foundation bar */}
      <div className="px-5 pt-4 md:px-6">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full bg-[var(--teal)] transition-[width] duration-500"
            style={{ width: `${(liveCount / PANELS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Panel grid */}
      <div
        className={[
          "grid grid-cols-1 gap-3 p-5 md:p-6",
          compact ? "md:grid-cols-3 lg:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-4",
        ].join(" ")}
      >
        {PANELS.map((p) => {
          const ds = domainFor(p.domain as DomainKey | "worklist");
          return (
            <PanelCard key={p.id} def={p} state={ds}>
              {renderPanelBody(p, ds.status, inputs, derived)}
            </PanelCard>
          );
        })}
      </div>

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
  children,
}: {
  def: PanelDef;
  state: DomainState;
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
          <h3 className="font-display mt-1 text-base leading-snug">{def.title}</h3>
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
