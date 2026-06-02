// Per-site engine — pure, deterministic, no randomness, no AI.
// Reuses deriveYieldForMix from the curve module (single-source CF + payer multiples).
// Reads no state from the §2 curve or the §2A workflow layer. Writes nothing.
//
// Math (spec verbatim):
//   y_bar         = C_total / W_total                                  (derived)
//   wrvu_i        = wrvu_share_i * W_total
//   mix_yield_i   = deriveYieldForMix(payer_mix_i)                     (curve module)
//   coll_share_i  = (wrvu_i * mix_yield_i) / Σ_j(wrvu_j * mix_yield_j)
//   collections_i = coll_share_i * C_total                             (anchored)
//   yield_eff_i   = collections_i / wrvu_i
//   gap_i         = wrvu_i * (y_bar - yield_eff_i)                     (signed, NO floor)
//   stipend_need  = Σ over is_catch_site of gap_i                      (signed sum)
//
// Rounding: round every site's collections and gap to cents EXCEPT the residual
// (largest surplus = most negative gap = the outside group). Derive residual
// by subtraction so Σ collections == C_total and Σ gap == 0 exactly on screen.

import { deriveYieldForMix } from "../curve/compute";
import type { MoneyInputs } from "../money/types";
import type { Site, SiteComputed, SitesOutputs } from "./types";

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Convert a 0..1 site mix to the 0..100 Mix shape the curve module expects. */
function siteMixToPercent(m: Site["payer_mix"]) {
  return {
    medicare: m.medicare * 100,
    medicaid: m.medicaid * 100,
    commercial: m.commercial * 100,
    self_pay: m.self_pay * 100,
  };
}

export function computeSites(
  sites: Site[],
  money: MoneyInputs,
  W_total: number,
  C_total: number,
): SitesOutputs {
  const y_bar = W_total > 0 ? C_total / W_total : 0;

  // Raw per-site working values.
  type Row = {
    site: Site;
    wrvu_i: number;
    mix_yield_i: number;
    weighted: number; // wrvu_i * mix_yield_i
  };
  const rows: Row[] = sites.map((site) => {
    const wrvu_i = site.wrvu_share * W_total;
    const mix_yield_i = deriveYieldForMix(siteMixToPercent(site.payer_mix), money);
    return { site, wrvu_i, mix_yield_i, weighted: wrvu_i * mix_yield_i };
  });
  const sum_weighted = rows.reduce((s, r) => s + r.weighted, 0);

  // First pass — full-precision computed values.
  type Full = SiteComputed & { _residualEligible: boolean };
  const full: Full[] = rows.map((r) => {
    const coll_share_i = sum_weighted > 0 ? r.weighted / sum_weighted : 0;
    const collections_i = coll_share_i * C_total;
    const wrvu_i = r.wrvu_i;
    const yield_eff_i = wrvu_i > 0 ? collections_i / wrvu_i : 0;
    const gap_i = wrvu_i * (y_bar - yield_eff_i);
    return {
      id: r.site.id,
      wrvu_i,
      mix_yield_i: r.mix_yield_i,
      coll_share_i,
      collections_i,
      yield_eff_i,
      gap_i,
      _residualEligible: wrvu_i > 0,
    };
  });

  // Pick the residual: largest surplus (most negative gap). Falls back to the
  // largest-collections row if every gap is exactly 0 (equal-mix honesty test).
  let residualIdx = -1;
  let minGap = Infinity;
  for (let i = 0; i < full.length; i++) {
    if (!full[i]._residualEligible) continue;
    if (full[i].gap_i < minGap) {
      minGap = full[i].gap_i;
      residualIdx = i;
    }
  }
  if (residualIdx === -1 && full.length > 0) {
    // All zero-work edge — pick the first to avoid divide issues; identities still hold.
    residualIdx = 0;
  }

  // Round all non-residual rows to cents; derive residual by subtraction.
  const per_site: SiteComputed[] = full.map((row, i) => {
    if (i === residualIdx) return { ...row }; // patched below
    return { ...row, collections_i: r2(row.collections_i), gap_i: r2(row.gap_i) };
  });

  if (residualIdx >= 0) {
    let sumOthersColl = 0;
    let sumOthersGap = 0;
    per_site.forEach((row, i) => {
      if (i === residualIdx) return;
      sumOthersColl += row.collections_i;
      sumOthersGap += row.gap_i;
    });
    const collections_residual = r2(C_total - sumOthersColl);
    const gap_residual = r2(0 - sumOthersGap);
    const residWrvu = per_site[residualIdx].wrvu_i;
    const yield_eff_residual = residWrvu > 0 ? collections_residual / residWrvu : 0;
    per_site[residualIdx] = {
      ...per_site[residualIdx],
      collections_i: collections_residual,
      gap_i: gap_residual,
      yield_eff_i: yield_eff_residual,
    };
  }

  const stipend_need = per_site.reduce((s, row) => {
    const site = sites.find((x) => x.id === row.id)!;
    return site.is_catch_site ? s + row.gap_i : s;
  }, 0);

  const sumColl = per_site.reduce((s, r) => s + r.collections_i, 0);
  const sumGap = per_site.reduce((s, r) => s + r.gap_i, 0);
  const identity_collections_ok = Math.abs(sumColl - C_total) < 0.011;
  const identity_gap_ok = Math.abs(sumGap) < 0.011;

  return {
    y_bar,
    W_total,
    C_total,
    per_site,
    stipend_need,
    identity_collections_ok,
    identity_gap_ok,
  };
}

/** Renormalize wRVU shares so Σ = 1 after the user drags one slider.
 *  The dragged share is held; remaining sites rescale proportionally. */
export function renormalizeShares(
  sites: Site[],
  draggedId: string,
  newShare: number,
): Site[] {
  const clamped = Math.max(0, Math.min(1, newShare));
  const others = sites.filter((s) => s.id !== draggedId);
  const otherSum = others.reduce((s, x) => s + x.wrvu_share, 0);
  const remaining = 1 - clamped;
  return sites.map((s) => {
    if (s.id === draggedId) return { ...s, wrvu_share: clamped };
    if (otherSum <= 0) {
      // Edge case — distribute remaining evenly.
      return { ...s, wrvu_share: others.length > 0 ? remaining / others.length : 0 };
    }
    return { ...s, wrvu_share: (s.wrvu_share / otherSum) * remaining };
  });
}
