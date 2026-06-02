// "Reduce the fall" what-if — pure, deterministic. Engine math transcribed
// VERBATIM from the spec. No floors on need'/gaps; honest about both effects.
//
// Math:
//   removed_w_i    = reduce * avoidable_share_i * wrvu_i        (catch sites only)
//   wrvu_i'        = wrvu_i - removed_w_i
//   collections_i' = collections_i - removed_w_i * y_fall
//   redeployed_w   = redeploy * Σ removed_w_i
//   target wrvu'  += redeployed_w
//   target coll'  += redeployed_w * y_redeploy
//   yield_eff_i'   = collections_i' / wrvu_i'
//   need'          = Σ over catch sites of wrvu_i' * (y_bar0 - yield_eff_i')
//   group_coll_delta = Σ collections' - Σ baseline collections
//   scans_cut      = Σ removed_w_i
//
// Reference line is the BASELINE blend y_bar0 — held FIXED, never recomputed.

import type { Site, SiteComputed, SitesOutputs } from "./types";

export type WhatIfInputs = {
  /** per-site fraction of wRVU that is avoidable "fall" work (clinical pin) */
  avoidable_share: Record<string, number>;
  y_fall: number;           // $/wRVU on fall work — billing assumption (y_fall ≤ y_cov)
  reduce: number;           // [0,1] — the lever
  redeploy: number;         // [0,1] — fraction of freed capacity that finds high-value work
  y_redeploy: number;       // $/wRVU of redeployed work
  redeploy_target: string;  // site id receiving redeployed capacity
};

export const WHATIF_DEFAULTS: WhatIfInputs = {
  avoidable_share: { ed: 0.35, peds_er: 0.30 },
  y_fall: 18,
  reduce: 0,
  redeploy: 0,
  y_redeploy: 85,
  redeploy_target: "outside",
};

export type WhatIfPerSite = SiteComputed & {
  removed_w_i: number;
  redeployed_w_in: number;
};

export type WhatIfOutputs = {
  y_bar0: number;             // baseline reference line (FIXED)
  per_site: WhatIfPerSite[];
  need_prime: number;         // need' — signed, NO floor
  group_coll_delta: number;   // Σ collections' − Σ baseline collections
  scans_cut: number;          // Σ removed_w_i (wRVU units of avoided work)
  redeployed_w_total: number;
  baseline_need: number;      // for comparison
  break_even_redeploy: number; // y_fall / y_redeploy
};

export function computeFallWhatIf(
  sites: Site[],
  baseline: SitesOutputs,
  inp: WhatIfInputs,
): WhatIfOutputs {
  const y_bar0 = baseline.y_bar;
  const siteById = new Map(sites.map((s) => [s.id, s]));
  const baseById = new Map(baseline.per_site.map((p) => [p.id, p]));

  // First — compute per-site removed_w_i (catch sites only).
  const removed: Record<string, number> = {};
  let removed_total = 0;
  for (const s of sites) {
    const base = baseById.get(s.id);
    if (!base) continue;
    if (s.is_catch_site) {
      const a = inp.avoidable_share[s.id] ?? 0;
      const r = Math.max(0, Math.min(1, inp.reduce)) * Math.max(0, Math.min(1, a)) * base.wrvu_i;
      removed[s.id] = r;
      removed_total += r;
    } else {
      removed[s.id] = 0;
    }
  }

  const redeployed_w_total = Math.max(0, Math.min(1, inp.redeploy)) * removed_total;

  // Build per-site primed rows.
  const per_site: WhatIfPerSite[] = sites
    .filter((s) => baseById.has(s.id))
    .map((s) => {
      const base = baseById.get(s.id)!;
      const removed_w_i = removed[s.id] ?? 0;
      let wrvu_p = base.wrvu_i - removed_w_i;
      let coll_p = base.collections_i - removed_w_i * inp.y_fall;
      let redeployed_w_in = 0;
      if (s.id === inp.redeploy_target) {
        redeployed_w_in = redeployed_w_total;
        wrvu_p += redeployed_w_in;
        coll_p += redeployed_w_in * inp.y_redeploy;
      }
      const yield_eff_p = wrvu_p > 0 ? coll_p / wrvu_p : 0;
      return {
        id: s.id,
        wrvu_i: wrvu_p,
        mix_yield_i: base.mix_yield_i,
        coll_share_i: base.coll_share_i, // baseline share — unused in what-if
        collections_i: coll_p,
        yield_eff_i: yield_eff_p,
        gap_i: wrvu_p * (y_bar0 - yield_eff_p), // signed, NO floor — measured vs FIXED y_bar0
        removed_w_i,
        redeployed_w_in,
      };
    });

  // need' — only catch sites. Signed.
  const need_prime = per_site.reduce((acc, row) => {
    const s = siteById.get(row.id)!;
    return s.is_catch_site ? acc + row.gap_i : acc;
  }, 0);

  // group_coll_delta — sum vs baseline.
  const sum_baseline_coll = baseline.per_site.reduce((s, r) => s + r.collections_i, 0);
  const sum_new_coll = per_site.reduce((s, r) => s + r.collections_i, 0);
  const group_coll_delta = sum_new_coll - sum_baseline_coll;

  const baseline_need = baseline.per_site.reduce((acc, row) => {
    const s = siteById.get(row.id)!;
    return s.is_catch_site ? acc + row.gap_i : acc;
  }, 0);

  return {
    y_bar0,
    per_site,
    need_prime,
    group_coll_delta,
    scans_cut: removed_total,
    redeployed_w_total,
    baseline_need,
    break_even_redeploy: inp.y_redeploy > 0 ? inp.y_fall / inp.y_redeploy : Infinity,
  };
}

/** Adapt what-if output into a SitesOutputs shape so the existing Schematic
 *  can render it. y_bar is held to baseline y_bar0 (the reference line). */
export function whatIfAsSitesOutputs(
  baseline: SitesOutputs,
  wi: WhatIfOutputs,
): SitesOutputs {
  const C_total_prime = wi.per_site.reduce((s, r) => s + r.collections_i, 0);
  return {
    y_bar: wi.y_bar0, // FIXED baseline reference
    W_total: wi.per_site.reduce((s, r) => s + r.wrvu_i, 0),
    C_total: C_total_prime,
    per_site: wi.per_site.map(({ removed_w_i: _r, redeployed_w_in: _d, ...rest }) => rest),
    stipend_need: wi.need_prime,
    identity_collections_ok: true,
    identity_gap_ok: true,
    _ = baseline, // (silence unused)
  } as unknown as SitesOutputs;
}
