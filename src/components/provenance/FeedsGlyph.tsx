// Provenance mark — a single three-segment "feeds used" glyph.
// ONE consistent glyph everywhere. No zoo of icons. No "PREMIUM" badge.
// Interaction opens to source rows OR — when a feed is an assumption — to
// the assumption + the pin behind it.
//
// THREE tick states (see the-bridge-headlines-and-provenance-spec.md Part 2):
//   true        → FILLED      · from your data (measured)
//   "assumption"→ DASHED      · from an assumption you set, not yet your data
//   false       → EMPTY/RING  · not used
//
// HARD RULE: never a FILLED three-tick where the third feed is an assumption.
// Filled-three is reserved for measured data (still pending the extract).

import { useEffect, useRef, useState } from "react";

export type FeedState = boolean | "assumption";
export type Feeds = {
  billing: FeedState;
  production: FeedState;
  workflow: FeedState;
};

type Props = {
  feeds: Feeds;
  /** Source rows the FILLED feeds draw on. */
  sources?: string[];
  /** Assumptions (+ the pin behind each) backing any DASHED feed. */
  assumptions?: string[];
  /** One-line note about what this number joins. */
  note?: string;
  className?: string;
};

function counts(f: Feeds): { filled: number; dashed: number; depth: number } {
  const arr: FeedState[] = [f.billing, f.production, f.workflow];
  const filled = arr.filter((v) => v === true).length;
  const dashed = arr.filter((v) => v === "assumption").length;
  return { filled, dashed, depth: filled + dashed };
}

export function feedDepth(f: Feeds): 0 | 1 | 2 | 3 {
  return counts(f).depth as 0 | 1 | 2 | 3;
}

export function FeedsGlyph({ feeds, sources, assumptions, note, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const { filled, dashed, depth } = counts(feeds);
  const used: string[] = [];
  if (feeds.billing) used.push(feeds.billing === "assumption" ? "billing (assumed)" : "billing");
  if (feeds.production) used.push(feeds.production === "assumption" ? "production (assumed)" : "production");
  if (feeds.workflow) used.push(feeds.workflow === "assumption" ? "workflow (assumed)" : "workflow");

  // Visual hierarchy by measured depth: filled-3 strongest; dashed recedes.
  const tone =
    filled === 3
      ? "text-ink"
      : depth === 3
      ? "text-ink/70"
      : depth === 2
      ? "text-ink/80"
      : "text-ink/55";

  const summary =
    dashed > 0
      ? `${filled} measured · ${dashed} assumed · of 3`
      : `${depth} of 3`;

  return (
    <span ref={ref} className={`relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        aria-label={`Feeds used: ${used.join(", ") || "none"} (${summary})`}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-[3px] rounded-sm px-1 py-[3px] transition-colors hover:bg-ink/5 ${tone}`}
      >
        <Tick state={feeds.billing} depth={filled} />
        <Tick state={feeds.production} depth={filled} />
        <Tick state={feeds.workflow} depth={filled} />
      </button>

      {open ? (
        <span
          role="dialog"
          className="absolute left-0 top-full z-30 mt-1 w-72 rounded-md border border-ink/20 bg-paper p-3 text-left shadow-[0_8px_24px_-8px_rgba(14,27,44,0.18)]"
        >
          <span className="font-mono-tab block text-[9.5px] uppercase tracking-[0.14em] text-ink/55">
            Feeds used · {summary}
          </span>
          <span className="mt-2 grid grid-cols-3 gap-2 text-[11px] leading-snug">
            <FeedRow state={feeds.billing} label="billing" />
            <FeedRow state={feeds.production} label="production" />
            <FeedRow state={feeds.workflow} label="workflow" />
          </span>
          {note ? (
            <span className="mt-2 block text-[11.5px] leading-relaxed text-ink/75">{note}</span>
          ) : null}
          {sources && sources.length > 0 ? (
            <span className="mt-2 block border-t border-ink/15 pt-2">
              <span className="font-mono-tab block text-[9.5px] uppercase tracking-[0.14em] text-ink/45">
                Source rows
              </span>
              <ul className="mt-1 space-y-0.5 text-[11px] text-ink/70">
                {sources.map((s) => (
                  <li key={s} className="font-mono-tab">{s}</li>
                ))}
              </ul>
            </span>
          ) : null}
          {assumptions && assumptions.length > 0 ? (
            <span className="mt-2 block border-t border-ink/15 pt-2">
              <span className="font-mono-tab block text-[9.5px] uppercase tracking-[0.14em] text-ink/45">
                Assumption · pin behind it
              </span>
              <ul className="mt-1 space-y-0.5 text-[11px] text-ink/70">
                {assumptions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

function Tick({ state, depth }: { state: FeedState; depth: number }) {
  // 3-filled gets a hair more presence; 1-filled recedes.
  const onClass =
    depth === 3 ? "bg-ink" : depth === 2 ? "bg-ink/85" : "bg-ink/70";
  if (state === true) {
    return (
      <span
        aria-hidden="true"
        className={`inline-block h-[8px] w-[2.5px] rounded-[1px] ${onClass}`}
      />
    );
  }
  if (state === "assumption") {
    // DASHED tick — same footprint as a filled tick, drawn with two stacked
    // segments so the gap reads as a dash from across the screen.
    return (
      <span
        aria-hidden="true"
        className="relative inline-block h-[8px] w-[2.5px]"
      >
        <span className="absolute left-0 top-0 h-[3px] w-full rounded-[1px] bg-ink/55" />
        <span className="absolute bottom-0 left-0 h-[3px] w-full rounded-[1px] bg-ink/55" />
      </span>
    );
  }
  // empty / not used — hollow ring (still occupies the slot)
  return (
    <span
      aria-hidden="true"
      className="inline-block h-[8px] w-[2.5px] rounded-[1px] border border-ink/25 bg-transparent"
    />
  );
}

function FeedRow({ state, label }: { state: FeedState; label: string }) {
  const dot =
    state === true
      ? "bg-ink"
      : state === "assumption"
      ? "bg-transparent border border-dashed border-ink/70"
      : "bg-transparent border border-ink/20";
  const text =
    state === true
      ? "text-ink"
      : state === "assumption"
      ? "text-ink/70"
      : "text-ink/35";
  return (
    <span className={`font-mono-tab text-[10px] uppercase tracking-[0.10em] ${text}`}>
      <span className={`mr-1 inline-block h-[7px] w-[7px] rounded-full align-middle ${dot}`} />
      {label}
      {state === "assumption" ? <span className="ml-0.5 normal-case tracking-normal text-ink/55">·assumed</span> : null}
    </span>
  );
}

/** Tucked legend, one per surface. Acronyms expanded on first use. */
export function FeedsLegend({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[11px] leading-relaxed text-ink/60 ${className}`}>
      <span className="font-mono-tab mr-2 inline-flex items-center gap-[3px] align-middle">
        <span className="inline-block h-[8px] w-[2.5px] rounded-[1px] bg-ink" />
        <span className="relative inline-block h-[8px] w-[2.5px]">
          <span className="absolute left-0 top-0 h-[3px] w-full rounded-[1px] bg-ink/55" />
          <span className="absolute bottom-0 left-0 h-[3px] w-full rounded-[1px] bg-ink/55" />
        </span>
        <span className="inline-block h-[8px] w-[2.5px] rounded-[1px] border border-ink/25" />
      </span>
      Tick states: <span className="text-ink">●&nbsp;filled</span> from your
      data · <span className="text-ink/75">◌&nbsp;dashed</span> from an
      assumption you set, not yet your data ·{" "}
      <span className="text-ink/45">○&nbsp;empty</span> not used. Feeds:
      billing / production / workflow. Billing = 837/835 claim &amp;
      remittance EDI (Electronic Data Interchange). Production = reads
      completed and work RVU (wRVU = work Relative Value Unit) output.
      Workflow = PACS (Picture Archiving and Communication System)
      timestamps, shift / site / orderer metadata. Acronyms: ED = emergency
      department, CARC = Claim Adjustment Reason Code.
    </p>
  );
}
