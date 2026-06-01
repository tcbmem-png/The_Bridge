// Provenance mark — a single three-segment "feeds used" glyph.
// ONE consistent glyph everywhere. No zoo of icons. No "PREMIUM" badge.
// Interaction opens to source rows (same affordance as
// "every number opens to where it came from").
//
// HARD binding rule: each glyph reads the feeds of the EXACT number it sits on.
// Never inherit a panel's 3 onto a 2-feed sub-number; never inflate a
// sub-number to match its panel. No mark is hand-set; feeds are passed in.

import { useEffect, useRef, useState } from "react";

export type Feeds = {
  billing: boolean;
  production: boolean;
  workflow: boolean;
};

type Props = {
  feeds: Feeds;
  /** Plain-text source rows the number actually draws on. */
  sources?: string[];
  /** Optional one-line note about what this number joins. */
  note?: string;
  /** Slight contrast bump for 3-tick numbers, recede for 1-tick. */
  className?: string;
};

function countFilled(f: Feeds): 1 | 2 | 3 | 0 {
  return ((f.billing ? 1 : 0) + (f.production ? 1 : 0) + (f.workflow ? 1 : 0)) as 0 | 1 | 2 | 3;
}

export function feedDepth(f: Feeds): 0 | 1 | 2 | 3 {
  return countFilled(f);
}

export function FeedsGlyph({ feeds, sources, note, className = "" }: Props) {
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

  const filled = countFilled(feeds);
  const names: string[] = [];
  if (feeds.billing) names.push("billing");
  if (feeds.production) names.push("production");
  if (feeds.workflow) names.push("workflow");

  // Subtle visual hierarchy by depth: 3 — strongest, 1 — recedes.
  const tone =
    filled === 3
      ? "text-ink"
      : filled === 2
      ? "text-ink/80"
      : "text-ink/55";

  return (
    <span ref={ref} className={`relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        aria-label={`Feeds used: ${names.join(", ") || "none"} (${filled} of 3)`}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-[3px] rounded-sm px-1 py-[3px] transition-colors hover:bg-ink/5 ${tone}`}
      >
        <Tick on={feeds.billing} depth={filled} />
        <Tick on={feeds.production} depth={filled} />
        <Tick on={feeds.workflow} depth={filled} />
      </button>

      {open ? (
        <span
          role="dialog"
          className="absolute left-0 top-full z-30 mt-1 w-72 rounded-md border border-ink/20 bg-paper p-3 text-left shadow-[0_8px_24px_-8px_rgba(14,27,44,0.18)]"
        >
          <span className="font-mono-tab block text-[9.5px] uppercase tracking-[0.14em] text-ink/55">
            Feeds used · {filled}/3
          </span>
          <span className="mt-2 grid grid-cols-3 gap-2 text-[11px] leading-snug">
            <FeedRow on={feeds.billing} label="billing" />
            <FeedRow on={feeds.production} label="production" />
            <FeedRow on={feeds.workflow} label="workflow" />
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
        </span>
      ) : null}
    </span>
  );
}

function Tick({ on, depth }: { on: boolean; depth: number }) {
  // 3-filled gets a hair more presence; 1-filled recedes.
  const onClass =
    depth === 3 ? "bg-ink" : depth === 2 ? "bg-ink/85" : "bg-ink/70";
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-[8px] w-[2.5px] rounded-[1px] ${on ? onClass : "bg-ink/15"}`}
    />
  );
}

function FeedRow({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`font-mono-tab text-[10px] uppercase tracking-[0.10em] ${on ? "text-ink" : "text-ink/35"}`}>
      <span className={`mr-1 inline-block h-[6px] w-[6px] rounded-full align-middle ${on ? "bg-ink" : "bg-ink/20"}`} />
      {label}
    </span>
  );
}

/** Tucked legend, one per surface. Acronyms expanded on first use. */
export function FeedsLegend({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[11px] leading-relaxed text-ink/60 ${className}`}>
      <span className="font-mono-tab mr-2 inline-flex items-center gap-[3px] align-middle">
        <span className="inline-block h-[8px] w-[2.5px] rounded-[1px] bg-ink" />
        <span className="inline-block h-[8px] w-[2.5px] rounded-[1px] bg-ink" />
        <span className="inline-block h-[8px] w-[2.5px] rounded-[1px] bg-ink/15" />
      </span>
      Feeds: billing / production / workflow — which of your three feeds this
      number draws on. Billing = 837/835 claim &amp; remittance EDI. Production
      = reads completed and work RVU (wRVU = work Relative Value Unit) output.
      Workflow = PACS (picture archiving and communication system) timestamps,
      shift / site / orderer metadata. Acronyms: ED = emergency department,
      CARC = Claim Adjustment Reason Code.
    </p>
  );
}
