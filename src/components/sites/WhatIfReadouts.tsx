// What-if readouts — three numbers and one plain status line.
// Coverage need (need'), Group collections (with +/- delta colored),
// Unnecessary scans cut. Honest about the sign of the delta.

import type { WhatIfOutputs } from "../../lib/sites/whatif";
import { fmtMoneyK } from "../../lib/sites/display";
import { fmtWRVU } from "../../lib/money/format";

export function WhatIfReadouts({ wi }: { wi: WhatIfOutputs }) {
  const delta = wi.group_coll_delta;
  const deltaPositive = delta >= 0;
  const status = statusLine(wi);

  return (
    <section className="rounded-md border border-dashed border-ink/35 bg-paper p-4">
      <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
        What-if · readouts
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card
          k="Coverage need · need'"
          v={fmtMoneyK(wi.need_prime)}
          tone={wi.need_prime > 0 ? "deficit" : "neutral"}
          note={`baseline ${fmtMoneyK(wi.baseline_need)} → now ${fmtMoneyK(wi.need_prime)}`}
        />
        <Card
          k="Group collections · Δ vs baseline"
          v={(deltaPositive ? "+" : "−") + fmtMoneyK(Math.abs(delta)).replace(/^−/, "")}
          tone={delta > 0 ? "surplus" : delta < 0 ? "deficit" : "neutral"}
          note={`redeploy ${Math.round(wi.redeployed_w_total).toLocaleString()} wRVU at y_redeploy`}
        />
        <Card
          k="Unnecessary scans cut"
          v={fmtWRVU(wi.scans_cut)}
          tone="neutral"
          note="patient-side win — avoided fall work"
        />
      </div>

      <p className="mt-4 text-[12.5px] leading-relaxed text-ink">{status}</p>

      <p className="mt-2 text-[10.5px] text-ink/55">
        Reference line is the baseline blend y_bar₀ ·{" "}
        {`$${wi.y_bar0.toFixed(2)}/wRVU`} · held fixed. need' is signed — an
        aggressive cut can push a site past the line; the sign is shown.
        Break-even redeploy {Math.round(wi.break_even_redeploy * 100)}% =
        y_fall ÷ y_redeploy.
      </p>
    </section>
  );
}

function statusLine(wi: WhatIfOutputs): string {
  if (wi.scans_cut < 1) {
    return "No reduction yet — baseline. Move the reduce slider to see the catch site climb toward the line.";
  }
  if (wi.group_coll_delta >= 0) {
    return "Need down, group earns more — demand found the work. Hospital pays less stipend, group earns more, patient avoids an unnecessary scan.";
  }
  return `Need down, but group earns less — redeploy is below ~${Math.round(wi.break_even_redeploy * 100)}%. Below break-even the group loses volume. State it, don't hide it.`;
}

function Card({
  k,
  v,
  tone,
  note,
}: {
  k: string;
  v: string;
  tone: "deficit" | "surplus" | "neutral";
  note: string;
}) {
  const color =
    tone === "deficit"
      ? "var(--red-clinical)"
      : tone === "surplus"
        ? "var(--teal)"
        : "var(--ink)";
  return (
    <div className="rounded border border-ink/15 bg-paper p-3">
      <div className="font-mono-tab text-[10px] uppercase tracking-[0.12em] text-ink/55">
        {k}
      </div>
      <div className="font-mono-tab mt-1 text-2xl" style={{ color }}>
        {v}
      </div>
      <div className="mt-1 text-[10.5px] text-ink/55">{note}</div>
    </div>
  );
}
