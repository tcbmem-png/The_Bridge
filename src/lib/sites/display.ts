// Display-precision reconciliation for /site readouts.
// Engine values stay cent-exact. Here we round per-site collections and gaps
// to a coarser display precision ($1K), then derive the RESIDUAL site by
// subtraction so the visible lines sum exactly to the visible totals.
// Result: Σ displayed collections == C_total, Σ displayed gaps == 0,
// surplus stack == deficit stack == stipend_need on screen.

import type { SiteComputed } from "./types";

export type DisplayRow = {
  id: string;
  collections_display: number; // dollars, rounded to nearest $1K
  gap_display: number; // dollars, rounded to nearest $1K
};

const roundK = (n: number) => Math.round(n / 1000) * 1000;

export function buildDisplay(
  per_site: SiteComputed[],
  C_total: number,
): { rows: DisplayRow[]; residualId: string | null } {
  if (per_site.length === 0) return { rows: [], residualId: null };

  // Mirror the engine residual rule: most negative gap (largest surplus).
  let residualIdx = 0;
  let minGap = per_site[0].gap_i;
  for (let i = 1; i < per_site.length; i++) {
    if (per_site[i].gap_i < minGap) {
      minGap = per_site[i].gap_i;
      residualIdx = i;
    }
  }

  const rows: DisplayRow[] = per_site.map((r) => ({
    id: r.id,
    collections_display: roundK(r.collections_i),
    gap_display: roundK(r.gap_i),
  }));

  let sumColl = 0;
  let sumGap = 0;
  rows.forEach((row, i) => {
    if (i === residualIdx) return;
    sumColl += row.collections_display;
    sumGap += row.gap_display;
  });
  rows[residualIdx] = {
    id: rows[residualIdx].id,
    collections_display: C_total - sumColl, // C_total assumed already a round dollar anchor
    gap_display: 0 - sumGap,
  };

  return { rows, residualId: per_site[residualIdx].id };
}

/** Formatter — thousands, integer, tabular. e.g. $7,453K · −$3,070K · $60,000K. */
export function fmtMoneyK(n: number): string {
  if (!isFinite(n)) return "—";
  const k = Math.round(n / 1000);
  const sign = k < 0 ? "−" : "";
  return `${sign}$${Math.abs(k).toLocaleString("en-US")}K`;
}
