// HIDDEN page. Not in nav (also linked in header as "Site"), not in any
// sitemap, noindex/nofollow. Reachable by direct URL only — no auth.
// Everything ILLUSTRATIVE. Engine is pure & deterministic.

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMoney } from "../lib/money/store";
import {
  DEFAULT_SITES,
  W_TOTAL_DEFAULT,
  C_TOTAL_DEFAULT,
} from "../lib/sites/sites";
import { computeSites, renormalizeShares } from "../lib/sites/compute";
import {
  computeFallWhatIf,
  whatIfAsSitesOutputs,
  WHATIF_DEFAULTS,
  type WhatIfInputs,
} from "../lib/sites/whatif";
import type { Site, SiteMix } from "../lib/sites/types";
import { Schematic } from "../components/sites/Schematic";
import { AssumptionsPanel } from "../components/sites/AssumptionsPanel";
import { Readouts } from "../components/sites/Readouts";
import { WhatIfPanel } from "../components/sites/WhatIfPanel";
import { WhatIfReadouts } from "../components/sites/WhatIfReadouts";
import { JourneyScrubber } from "../components/sites/JourneyScrubber";
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

type Mode = "reveal" | "whatif";

function SitePage() {
  const { inputs } = useMoney();
  const [sites, setSites] = useState<Site[]>(DEFAULT_SITES);
  const [mode, setMode] = useState<Mode>("reveal");
  const [whatIfInp, setWhatIfInp] = useState<WhatIfInputs>(WHATIF_DEFAULTS);

  const baseline = useMemo(
    () => computeSites(sites, inputs, W_TOTAL_DEFAULT, C_TOTAL_DEFAULT),
    [sites, inputs],
  );
  const whatIf = useMemo(
    () => computeFallWhatIf(sites, baseline, whatIfInp),
    [sites, baseline, whatIfInp],
  );
  const whatIfOut = useMemo(
    () => whatIfAsSitesOutputs(baseline, whatIf),
    [baseline, whatIf],
  );

  const onShareChange = (id: string, newShare: number) =>
    setSites((prev) => renormalizeShares(prev, id, newShare));
  const onMixChange = (id: string, mix: SiteMix) =>
    setSites((prev) => prev.map((s) => (s.id === id ? { ...s, payer_mix: mix } : s)));
  const onReset = () => setSites(DEFAULT_SITES);

  const shownOut = mode === "whatif" ? whatIfOut : baseline;

  // Pick the largest catch-site source of redeployment for the arc.
  const arcSource = sites
    .filter((s) => s.is_catch_site)
    .map((s) => ({ id: s.id, w: whatIf.per_site.find((p) => p.id === s.id)?.removed_w_i ?? 0 }))
    .sort((a, b) => b.w - a.w)[0];
  const redeployArc =
    mode === "whatif" && whatIf.redeployed_w_total > 0 && arcSource && arcSource.w > 0
      ? {
          fromId: arcSource.id,
          toId: whatIfInp.redeploy_target,
          w: whatIf.redeployed_w_total,
          wMax: Math.max(...baseline.per_site.map((p) => p.wrvu_i), 1),
        }
      : null;

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
        <Anchor k="W_total" v={fmtWRVU(baseline.W_total)} note="illustrative anchor" />
        <Anchor k="C_total" v={fmtMoney(baseline.C_total)} note="illustrative anchor" />
        <Anchor k="y_bar₀" v={`$${baseline.y_bar.toFixed(2)}/wRVU`} note="baseline reference · FIXED" />
        <Anchor
          k="conversion_factor"
          v={`$${inputs.conversion_factor.toFixed(2)}/wRVU`}
          note="from the money config"
        />
      </div>

      {/* Mode toggle */}
      <div className="mt-5 inline-flex items-center gap-1 rounded-full border border-ink/20 bg-paper p-1">
        <ModeBtn active={mode === "reveal"} onClick={() => setMode("reveal")}>
          Current state · reveal
        </ModeBtn>
        <ModeBtn active={mode === "whatif"} onClick={() => setMode("whatif")}>
          What-if · reduce the fall
        </ModeBtn>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Schematic
            sites={sites}
            out={shownOut}
            mode={mode}
            redeployArc={redeployArc}
          />
          {mode === "reveal" ? (
            <Readouts sites={sites} out={baseline} />
          ) : (
            <WhatIfReadouts wi={whatIf} />
          )}
        </div>
        <div className="space-y-6">
          {mode === "reveal" ? (
            <AssumptionsPanel
              sites={sites}
              onShareChange={onShareChange}
              onMixChange={onMixChange}
              onReset={onReset}
            />
          ) : (
            <WhatIfPanel
              sites={sites}
              inp={whatIfInp}
              onChange={setWhatIfInp}
              breakEven={whatIf.break_even_redeploy}
            />
          )}
        </div>
      </div>

      {/* Module B — the scan journey */}
      <div className="mt-10">
        <JourneyScrubber />
      </div>
    </main>
  );
}

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-mono-tab rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.12em] transition-colors ${
        active
          ? "bg-ink text-paper"
          : "text-ink/60 hover:text-ink"
      }`}
    >
      {children}
    </button>
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
