// Net-zero identity readout: surplus stack mirrors deficit stack EXACTLY on
// screen — visible per-site lines hand-sum to the visible totals (display
// precision $1K, residual derived by subtraction). Engine values stay cent-
// exact underneath; only the rendered numbers are reconciled here.

import type { Site, SitesOutputs } from "../../lib/sites/types";
import { fmtDollarsPerWRVU } from "../../lib/money/format";
import { buildDisplay, fmtMoneyK } from "../../lib/sites/display";
import { FeedsGlyph } from "../provenance/FeedsGlyph";

export function Readouts({
  sites,
  out,
}: {
  sites: Site[];
  out: SitesOutputs;
}) {
  const siteById = new Map(sites.map((s) => [s.id, s]));
  const { rows: display } = buildDisplay(out.per_site, out.C_total);
  const displayById = new Map(display.map((d) => [d.id, d]));

  const rows = out.per_site.map((p) => {
    const d = displayById.get(p.id)!;
    return {
      id: p.id,
      site: siteById.get(p.id)!,
      collections_display: d.collections_display,
      gap_display: d.gap_display,
    };
  });

  // Display-precision sums (these tile exactly).
  const deficits = rows.filter((r) => r.gap_display > 0).sort((a, b) => b.gap_display - a.gap_display);
  const surpluses = rows.filter((r) => r.gap_display < 0).sort((a, b) => a.gap_display - b.gap_display);
  const sumDef = deficits.reduce((s, r) => s + r.gap_display, 0);
  const sumSur = surpluses.reduce((s, r) => s + r.gap_display, 0); // negative
  const sumCollDisplay = rows.reduce((s, r) => s + r.collections_display, 0);

  // stipend_need at display precision = sum of catch-site displayed gaps.
  const stipendDisplay = rows.reduce(
    (s, r) => (r.site.is_catch_site ? s + r.gap_display : s),
    0,
  );

  const maxAbs = Math.max(sumDef, Math.abs(sumSur), 1);

  return (
    <section className="space-y-5">
      <div className="rounded-md border border-ink/15 bg-paper p-4">
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
          Stipend need · catch-site coverage
        </div>
        <div className="mt-2 flex items-baseline gap-3">
          <div
            className="font-mono-tab text-3xl text-ink md:text-4xl"
            style={{ color: stipendDisplay > 0 ? "var(--red-clinical)" : "var(--ink)" }}
          >
            {fmtMoneyK(stipendDisplay)}
          </div>
          <div className="text-[12px] leading-snug text-ink/65">
            The coverage the group's own book is carrying, sized. Sum of the
            catch-site lines below — equal payer mixes everywhere would zero
            this out.
          </div>
        </div>
      </div>

      <div className="rounded-md border border-ink/15 bg-paper p-4">
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
          Net-zero identity
        </div>
        <div className="mt-1 text-[12.5px] leading-relaxed text-ink/70">
          C_total is pinned. A smaller deficit one place shows as a smaller
          surplus another. Transfer made visible — never a recovery. Lines
          shown to the nearest $1K; they hand-sum to the totals below.
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Stack
            label="Deficit · below y_bar"
            tone="deficit"
            rows={deficits}
            maxAbs={maxAbs}
          />
          <Stack
            label="Surplus · at or above y_bar"
            tone="surplus"
            rows={surpluses}
            maxAbs={maxAbs}
          />
        </div>

        <div className="font-mono-tab mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-ink/70 md:grid-cols-4">
          <span className="inline-flex items-center gap-1.5">
            y_bar · {fmtDollarsPerWRVU(out.y_bar)}
            <FeedsGlyph
              feeds={{ billing: true, production: true, workflow: false }}
              note="Group blended yield — collections ÷ wRVU at the group total. Not sliced by site, so the workflow feed is not consumed here."
              sources={["billing 837/835 · group total", "production · group wRVU output"]}
            />
          </span>
          <span>Σ collections · {fmtMoneyK(sumCollDisplay)}</span>
          <span>Σ deficit · {fmtMoneyK(sumDef)}</span>
          <span>Σ surplus · {fmtMoneyK(sumSur)}</span>
        </div>
        <div className="mt-1 text-[10.5px] text-ink/45">
          Engine identities (cent-exact) · Σ collections to C_total ·{" "}
          {out.identity_collections_ok ? "ok" : "drift"}. Σ gap to 0 ·{" "}
          {out.identity_gap_ok ? "ok" : "drift"}.
        </div>
      </div>
    </section>
  );
}

function Stack({
  label,
  tone,
  rows,
  maxAbs,
}: {
  label: string;
  tone: "deficit" | "surplus";
  rows: Array<{ id: string; gap_display: number; site: Site }>;
  maxAbs: number;
}) {
  const color = tone === "deficit" ? "var(--red-clinical)" : "var(--teal)";
  return (
    <div>
      <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
        {label}
      </div>
      <div className="mt-2 space-y-1.5">
        {rows.length === 0 ? (
          <div className="text-[11.5px] text-ink/45">none</div>
        ) : (
          rows.map((r) => {
            const pct = Math.min(100, (Math.abs(r.gap_display) / maxAbs) * 100);
            return (
              <div key={r.id} className="flex items-center gap-2">
                <div className="w-32 truncate text-[12px] text-ink">
                  {r.site.label}
                </div>
                <div className="relative h-4 flex-1 rounded-sm bg-ink/[0.04]">
                  <div
                    className="absolute left-0 top-0 h-full rounded-sm"
                    style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.55 }}
                  />
                </div>
                <div
                  className="font-mono-tab w-24 text-right text-[11.5px]"
                  style={{ color }}
                >
                  {tone === "deficit" ? "−" : "+"}
                  {fmtMoneyK(Math.abs(r.gap_display))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
