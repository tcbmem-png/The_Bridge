// /site — schematic visualizer. NOT a map. Hospital campus cluster (4 sites)
// + outside group set apart. Paper bg, faint dot-grid, editorial-clinical.
// Nodes: size ∝ wrvu_i, color = yield_eff_i vs y_bar on the existing token ramp.
// Saturation ∝ |gap_i|, y_bar = neutral midpoint. $gap cuff on deficit nodes.

import { useState, useId } from "react";
import { FeedsGlyph } from "../provenance/FeedsGlyph";
import type { Site, SiteComputed, SitesOutputs } from "../../lib/sites/types";
import { fmtMoney, fmtWRVU, fmtPct, fmtDollarsPerWRVU } from "../../lib/money/format";
import { buildDisplay, fmtMoneyK } from "../../lib/sites/display";

type NodeLayout = { id: string; cx: number; cy: number };

// Stylized layout — campus cluster on the left, outside group offset right.
// viewBox 880x460. The big rounded rect groups the hospital sites.
const LAYOUT: Record<string, { cx: number; cy: number }> = {
  ed:        { cx: 180, cy: 170 },
  peds_er:   { cx: 320, cy: 280 },
  surgery:   { cx: 470, cy: 160 },
  inpatient: { cx: 360, cy: 90 },
  outside:   { cx: 760, cy: 230 },
};

// Map gap → color. y_bar is neutral midpoint (no tint); >0 deficit → red,
// <0 surplus → teal. Saturation scales with |gap|/scale.
function nodeFill(gap: number, scale: number): string {
  if (scale <= 0) return "rgba(14,27,44,0.10)";
  const t = Math.min(1, Math.abs(gap) / scale);
  // Mix paper toward the brand color.
  if (Math.abs(gap) < 0.01) return "rgba(14,27,44,0.08)";
  if (gap > 0) {
    // deficit → red-clinical
    return `color-mix(in oklab, var(--red-clinical) ${Math.round(20 + 65 * t)}%, var(--paper))`;
  }
  return `color-mix(in oklab, var(--teal) ${Math.round(20 + 65 * t)}%, var(--paper))`;
}

function nodeStroke(gap: number): string {
  if (Math.abs(gap) < 0.01) return "rgba(14,27,44,0.40)";
  return gap > 0 ? "var(--red-clinical)" : "var(--teal)";
}

export function Schematic({
  sites,
  out,
}: {
  sites: Site[];
  out: SitesOutputs;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const titleId = useId();

  // Node-radius scale from wrvu_i. Min 26, max 64.
  const maxWrvu = Math.max(...out.per_site.map((p) => p.wrvu_i), 1);
  const r = (wrvu: number) => 26 + (Math.sqrt(Math.max(0, wrvu) / maxWrvu)) * 38;

  const gapScale = Math.max(...out.per_site.map((p) => Math.abs(p.gap_i)), 1);

  const byId = new Map(out.per_site.map((p) => [p.id, p]));
  const siteById = new Map(sites.map((s) => [s.id, s]));

  // Display-precision per-site values so the on-screen gap cuff agrees with
  // the Readouts panel (residual derived by subtraction → lines hand-sum).
  const { rows: displayRows } = buildDisplay(out.per_site, out.C_total);
  const displayById = new Map(displayRows.map((d) => [d.id, d]));

  const hospitalIds = sites.filter((s) => s.kind === "hospital").map((s) => s.id);
  const outsideIds = sites.filter((s) => s.kind === "group_outside").map((s) => s.id);

  const nodes: NodeLayout[] = sites
    .filter((s) => LAYOUT[s.id])
    .map((s) => ({ id: s.id, ...LAYOUT[s.id] }));

  return (
    <div className="relative">
      <svg
        viewBox="0 0 880 460"
        role="img"
        aria-labelledby={titleId}
        className="dot-grid w-full rounded-md border border-ink/15 bg-paper"
        style={{ aspectRatio: "880 / 460" }}
      >
        <title id={titleId}>
          Schematic of sites — hospital campus and outside group. Node size by
          wRVU. Color by yield versus the group reference line.
        </title>

        {/* Hospital campus cluster outline */}
        <g>
          <rect
            x="70"
            y="40"
            width="500"
            height="380"
            rx="18"
            fill="rgba(14,27,44,0.025)"
            stroke="rgba(14,27,44,0.18)"
            strokeDasharray="2 4"
          />
          <text
            x="86"
            y="62"
            className="font-mono-tab"
            fontSize="10.5"
            letterSpacing="1.6"
            fill="rgba(14,27,44,0.55)"
          >
            HOSPITAL CAMPUS · illustrative
          </text>
        </g>

        {/* Outside-group container */}
        <g>
          <rect
            x="640"
            y="120"
            width="220"
            height="220"
            rx="14"
            fill="rgba(14,27,44,0.025)"
            stroke="rgba(14,27,44,0.18)"
            strokeDasharray="2 4"
          />
          <text
            x="656"
            y="140"
            className="font-mono-tab"
            fontSize="10.5"
            letterSpacing="1.6"
            fill="rgba(14,27,44,0.55)"
          >
            OUTSIDE GROUP · illustrative
          </text>
        </g>

        {/* Reference line label */}
        <g>
          <line
            x1="70"
            y1="430"
            x2="860"
            y2="430"
            stroke="rgba(14,27,44,0.28)"
            strokeDasharray="3 3"
          />
          <text
            x="70"
            y="448"
            className="font-mono-tab"
            fontSize="10.5"
            letterSpacing="1.4"
            fill="rgba(14,27,44,0.65)"
          >
            y_bar · group reference {fmtDollarsPerWRVU(out.y_bar)} ·
            collections ÷ wRVU
          </text>
          {/* Two-feed glyph for y_bar — not sliced by site, workflow not consumed */}
          <foreignObject x="320" y="436" width="40" height="20">
            <div xmlns="http://www.w3.org/1999/xhtml">
              <FeedsGlyph
                feeds={{ billing: true, production: true, workflow: false }}
                note="Group blended yield — collections ÷ wRVU at the group total. Not sliced by site, so the workflow feed is not consumed here."
                sources={[
                  "billing 837/835 · group total",
                  "production · group wRVU output",
                ]}
              />
            </div>
          </foreignObject>
        </g>

        {/* Nodes */}
        {nodes.map((n) => {
          const site = siteById.get(n.id)!;
          const c = byId.get(n.id)!;
          const d = displayById.get(n.id)!;
          const radius = r(c.wrvu_i);
          const fill = nodeFill(c.gap_i, gapScale);
          const stroke = nodeStroke(c.gap_i);
          const isCatch = site.is_catch_site;
          const isOpen = open === n.id;
          return (
            <g
              key={n.id}
              transform={`translate(${n.cx} ${n.cy})`}
              tabIndex={0}
              role="button"
              aria-label={`${site.label}: ${fmtMoneyK(d.collections_display)} collections, gap ${fmtMoneyK(d.gap_display)}`}
            >
              {/* deficit cuff */}
              {d.gap_display > 0 ? (
                <circle
                  r={radius + 7}
                  fill="none"
                  stroke="var(--red-clinical)"
                  strokeOpacity="0.45"
                  strokeWidth="1.25"
                  strokeDasharray="3 3"
                />
              ) : null}
              <circle
                r={radius}
                fill={fill}
                stroke={stroke}
                strokeWidth={isCatch ? 1.75 : 1.25}
                onClick={() => setOpen(isOpen ? null : n.id)}
                style={{ cursor: "pointer" }}
              />
              {/* label inside */}
              <text
                textAnchor="middle"
                y={-3}
                fontSize="11.5"
                fontFamily="Fraunces, serif"
                fill="var(--ink)"
                style={{ pointerEvents: "none" }}
              >
                {site.label}
              </text>
              <text
                textAnchor="middle"
                y={12}
                className="font-mono-tab"
                fontSize="10"
                fill="rgba(14,27,44,0.70)"
                style={{ pointerEvents: "none" }}
              >
                {fmtWRVU(c.wrvu_i)}
              </text>
              {/* gap cuff text below — display precision so it sums on screen */}
              {Math.abs(d.gap_display) >= 1 ? (
                <text
                  textAnchor="middle"
                  y={radius + 22}
                  className="font-mono-tab"
                  fontSize="10.5"
                  fill={d.gap_display > 0 ? "var(--red-clinical)" : "var(--teal)"}
                  style={{ fontWeight: 500, pointerEvents: "none" }}
                >
                  {d.gap_display > 0 ? "−" : "+"}
                  {fmtMoneyK(Math.abs(d.gap_display))}
                </text>
              ) : null}
              {/* Per-site provenance glyph — every by-site number is a modeled three */}
              <foreignObject x={-18} y={-(radius + 22)} width="40" height="20">
                <div xmlns="http://www.w3.org/1999/xhtml">
                  <FeedsGlyph
                    feeds={{ billing: true, production: true, workflow: "assumption" }}
                    note={`Per-site slice for ${site.label}: billing and production live in their feeds; the by-site cut is an assumption until the worklist is joined.`}
                    sources={[
                      "billing 837/835 · group total",
                      "production · group wRVU output",
                    ]}
                    assumptions={[
                      "per-site wRVU share · needs the worklist",
                      "per-site payer mix · needs billing-by-site",
                    ]}
                  />
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>

      {/* Open-node detail card (one at a time) */}
      {open ? (
        <NodeDetail
          site={siteById.get(open)!}
          row={byId.get(open)!}
          y_bar={out.y_bar}
          onClose={() => setOpen(null)}
        />
      ) : null}

      {/* Legend row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-ink/70">
        <span className="font-mono-tab uppercase tracking-[0.12em] text-ink/55">
          Legend
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: "color-mix(in oklab, var(--red-clinical) 60%, var(--paper))", border: "1px solid var(--red-clinical)" }}
          />
          below y_bar · deficit
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: "rgba(14,27,44,0.10)", border: "1px solid rgba(14,27,44,0.40)" }}
          />
          at y_bar · neutral
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: "color-mix(in oklab, var(--teal) 60%, var(--paper))", border: "1px solid var(--teal)" }}
          />
          above y_bar · surplus / holding
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FeedsGlyph
            feeds={{ billing: true, production: true, workflow: "assumption" }}
            note="Per-site slice: billing and production live in their feeds; the by-site cut is an assumption until the worklist is joined."
            sources={["billing 837/835 · group total", "production · group wRVU output"]}
            assumptions={["per-site wRVU share · needs the worklist"]}
          />
          modeled three · per-site provenance
        </span>
        {/* honesty: hospitalIds / outsideIds are surfaced visually above */}
        <span className="sr-only">
          {hospitalIds.length} hospital sites; {outsideIds.length} outside-group site
        </span>
      </div>
    </div>
  );
}

function NodeDetail({
  site,
  row,
  y_bar,
  onClose,
}: {
  site: Site;
  row: SiteComputed;
  y_bar: number;
  onClose: () => void;
}) {
  const zeroWork = row.wrvu_i <= 0;
  return (
    <div className="mt-3 rounded-md border border-ink/20 bg-paper p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
            {site.kind === "hospital" ? "HOSPITAL SITE" : "OUTSIDE GROUP"}
            {site.is_catch_site ? " · catch-site" : ""}
          </div>
          <h3 className="font-display mt-1 text-xl text-ink">{site.label}</h3>
        </div>
        <button
          onClick={onClose}
          className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55 hover:text-ink"
        >
          close
        </button>
      </div>
      {zeroWork ? (
        <p className="mt-3 text-sm text-ink/70">
          No work attributed to this site — no yield computed.
        </p>
      ) : (
        <dl className="font-mono-tab mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12.5px] text-ink/85 md:grid-cols-3">
          <Row k="wrvu_i" v={fmtWRVU(row.wrvu_i)} />
          <Row k="collections_i" v={fmtMoney(row.collections_i)} />
          <Row k="yield_eff_i" v={fmtDollarsPerWRVU(row.yield_eff_i)} />
          <Row k="y_bar" v={fmtDollarsPerWRVU(y_bar)} />
          <Row
            k="gap_i"
            v={
              <span style={{ color: row.gap_i > 0.005 ? "var(--red-clinical)" : row.gap_i < -0.005 ? "var(--teal)" : undefined }}>
                {row.gap_i > 0 ? "−" : row.gap_i < 0 ? "+" : ""}
                {fmtMoney(Math.abs(row.gap_i))}
              </span>
            }
          />
          <Row k="coll_share_i" v={fmtPct(row.coll_share_i * 100, 2)} />
          <div className="col-span-2 md:col-span-3 mt-2 grid grid-cols-4 gap-x-3 border-t border-ink/10 pt-2 text-[11px] text-ink/65">
            <span>medicare {fmtPct(site.payer_mix.medicare * 100, 0)}</span>
            <span>medicaid {fmtPct(site.payer_mix.medicaid * 100, 0)}</span>
            <span>commercial {fmtPct(site.payer_mix.commercial * 100, 0)}</span>
            <span>self-pay {fmtPct(site.payer_mix.self_pay * 100, 0)}</span>
          </div>
        </dl>
      )}
      <p className="mt-3 text-[11.5px] leading-relaxed text-ink/65">
        Pin behind this row: per-site wRVU share and payer mix are{" "}
        <em className="not-italic text-ink/80">illustrative until billing-by-site is joined</em>{" "}
        — needs the worklist. The math above is deterministic; only these
        inputs are assumptions.
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink/55">{k}</dt>
      <dd className="text-right text-ink">{v}</dd>
    </div>
  );
}
