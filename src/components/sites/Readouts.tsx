// Net-zero identity readout: surplus stack mirrors deficit stack.
// + prominent stipend_need figure.

import type { Site, SitesOutputs } from "../../lib/sites/types";
import { fmtMoney, fmtDollarsPerWRVU } from "../../lib/money/format";

export function Readouts({
  sites,
  out,
}: {
  sites: Site[];
  out: SitesOutputs;
}) {
  const siteById = new Map(sites.map((s) => [s.id, s]));
  const rows = out.per_site.map((p) => ({
    ...p,
    site: siteById.get(p.id)!,
  }));

  const deficits = rows.filter((r) => r.gap_i > 0.005).sort((a, b) => b.gap_i - a.gap_i);
  const surpluses = rows.filter((r) => r.gap_i < -0.005).sort((a, b) => a.gap_i - b.gap_i);
  const sumDef = deficits.reduce((s, r) => s + r.gap_i, 0);
  const sumSur = surpluses.reduce((s, r) => s + r.gap_i, 0); // negative

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
            style={{ color: out.stipend_need > 0 ? "var(--red-clinical)" : "var(--ink)" }}
          >
            {fmtMoney(out.stipend_need)}
          </div>
          <div className="text-[12px] leading-snug text-ink/65">
            The coverage the group's own book is carrying, sized. Signed sum
            across catch-sites — equal payer mixes everywhere would zero this
            out.
          </div>
        </div>
      </div>

      <div className="rounded-md border border-ink/15 bg-paper p-4">
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
          Net-zero identity
        </div>
        <div className="mt-1 text-[12.5px] leading-relaxed text-ink/70">
          C_total is pinned. A smaller deficit one place shows as a smaller
          surplus another. Transfer made visible — never a recovery.
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
          <span>y_bar · {fmtDollarsPerWRVU(out.y_bar)}</span>
          <span>Σ collections · {fmtMoney(out.C_total)}</span>
          <span>Σ deficit · {fmtMoney(sumDef)}</span>
          <span>Σ surplus · {fmtMoney(sumSur)}</span>
        </div>
        <div className="mt-1 text-[10.5px] text-ink/45">
          Σ collections checks identity to C_total ·{" "}
          {out.identity_collections_ok ? "ok" : "drift"}. Σ gap checks to 0 ·{" "}
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
  rows: Array<{ id: string; gap_i: number; site: Site }>;
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
            const pct = Math.min(100, (Math.abs(r.gap_i) / maxAbs) * 100);
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
                  className="font-mono-tab w-20 text-right text-[11.5px]"
                  style={{ color }}
                >
                  {tone === "deficit" ? "−" : "+"}
                  {fmtMoney(Math.abs(r.gap_i))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
