// HIDDEN page. Not in nav, not in any sitemap, noindex/nofollow.
// Reachable by direct URL only — no auth, no password.
// Everything ILLUSTRATIVE. The engine is pure & deterministic; the page reads
// money config (CF + multipliers) and renders live recompute.

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMoney } from "../lib/money/store";
import {
  DEFAULT_SITES,
  W_TOTAL_DEFAULT,
  C_TOTAL_DEFAULT,
} from "../lib/sites/sites";
import { computeSites, renormalizeShares } from "../lib/sites/compute";
import type { Site, SiteMix } from "../lib/sites/types";
import { Schematic } from "../components/sites/Schematic";
import { AssumptionsPanel } from "../components/sites/AssumptionsPanel";
import { Readouts } from "../components/sites/Readouts";
import { fmtMoney, fmtWRVU } from "../lib/money/format";

export const Route = createFileRoute("/site")({
  head: () => ({
    meta: [
      { title: "Sites — schematic (hidden)" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "googlebot", content: "noindex,nofollow" },
    ],
  }),
  component: SitePage,
});

function SitePage() {
  const { inputs } = useMoney();
  const [sites, setSites] = useState<Site[]>(DEFAULT_SITES);

  const out = useMemo(
    () => computeSites(sites, inputs, W_TOTAL_DEFAULT, C_TOTAL_DEFAULT),
    [sites, inputs],
  );

  const onShareChange = (id: string, newShare: number) =>
    setSites((prev) => renormalizeShares(prev, id, newShare));
  const onMixChange = (id: string, mix: SiteMix) =>
    setSites((prev) => prev.map((s) => (s.id === id ? { ...s, payer_mix: mix } : s)));
  const onReset = () => setSites(DEFAULT_SITES);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <header className="max-w-3xl">
        <div className="font-mono-tab flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-ink/65">
          <span className="inline-flex items-center rounded-full border border-ink/25 bg-paper px-2.5 py-1 tracking-[0.08em] text-ink/75">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
            Illustrative · sample data
          </span>
          <span>Sites · schematic</span>
        </div>
        <h1 className="font-display mt-5 text-[2rem] leading-[1.1] md:text-[2.75rem]">
          The same coverage, by site.
        </h1>
        <p className="mt-4 text-[14px] leading-relaxed text-ink/70">
          Anchored to a fixed group total. Yield-by-site is structural —
          payer mix and where the work lands. Not a per-physician scoreboard.
        </p>
      </header>

      {/* Anchors strip */}
      <div className="font-mono-tab mt-6 grid grid-cols-2 gap-3 rounded-md border border-ink/15 bg-paper p-3 text-[11.5px] text-ink/70 md:grid-cols-4">
        <Anchor k="W_total" v={fmtWRVU(out.W_total)} note="illustrative anchor" />
        <Anchor k="C_total" v={fmtMoney(out.C_total)} note="illustrative anchor" />
        <Anchor k="y_bar" v={`$${out.y_bar.toFixed(2)}/wRVU`} note="derived" />
        <Anchor
          k="conversion_factor"
          v={`$${inputs.conversion_factor.toFixed(2)}/wRVU`}
          note="from the money config"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Schematic sites={sites} out={out} />
          <Readouts sites={sites} out={out} />
        </div>
        <div>
          <AssumptionsPanel
            sites={sites}
            onShareChange={onShareChange}
            onMixChange={onMixChange}
            onReset={onReset}
          />
        </div>
      </div>
    </main>
  );
}

function Anchor({ k, v, note }: { k: string; v: string; note: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9.5px] uppercase tracking-[0.14em] text-ink/45">{k}</span>
      <span className="text-ink">{v}</span>
      <span className="text-[10px] text-ink/45">{note}</span>
    </div>
  );
}
