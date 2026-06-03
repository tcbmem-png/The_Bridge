// ============================================================================
// THE SITE BLOCK — yield by site → the coverage need, sized. ILLUSTRATIVE teaching model.
// Pure, deterministic. Sibling to the §2 curve / §2A workflow layer; shares ONLY config constants
// (CF + payer multiples, via deriveYieldForMix — single source). It MUST NOT read from or write to
// computeCurve / computeWorkflowLayer. Implemented verbatim from the site-block spec §2.
//
// THE HONESTY RULE (this module's reason to exist): the reference line is the group's OWN blended
// yield (y_bar = C_total / W_total), so surpluses and deficits net to exactly zero. A site under-yields
// only because ITS OWN payer mix is genuinely worse than the blend; equal mixes ⇒ every gap 0. Surplus
// sites return NEGATIVE gaps — NO floor. Improving one site's mix (shares fixed) doesn't create money:
// C_total is pinned, so a smaller deficit shows as a smaller surplus elsewhere — transfer, not recovery.
// ============================================================================

import { deriveYieldForMix, type PayerMix } from "./curve.ts"; // single-source CF + payer multiples
import { DEFAULT_PINS, type Pins } from "../config/pins.ts";

export type SiteKind = "hospital" | "group_outside";

export interface SiteInput {
  name: string;
  kind: SiteKind;
  is_catch_site: boolean;   // rolls into the coverage-need total (ER, ped ER) — PIN (Jonathan/Taylor)
  wrvu_share: number;       // [0,1], Σ over sites = 1 (validate). WORKFLOW assumption (dashed tick)
  payer_mix: PayerMix;      // {medicare, medicaid, commercial, self_pay}, sums to 1. BILLING assumption
  anchor?: string;          // schematic position/cluster — RENDER ONLY, never math
}

export interface SiteResult {
  name: string; kind: SiteKind; is_catch_site: boolean;
  wrvu: number;
  mix_yield: number;        // payer-mix yield (ranks the sites)
  collections_share: number;
  collections: number;      // anchored to the KNOWN C_total
  yield_eff: number;        // the REVEALED site yield = collections / wrvu
  gap: number;              // wrvu * (y_bar - yield_eff): >0 deficit (carried), <0 surplus. NO FLOOR.
  is_residual: boolean;     // the largest-surplus site that absorbs the rounding residual
}

export interface SiteBlockInputs { W_total: number; C_total: number; sites: SiteInput[]; }

export interface SiteBlock {
  W_total: number; C_total: number;
  y_bar: number;            // the reference line — DERIVED, never an input (displayed rounded; full-precision internally)
  sites: SiteResult[];
  stipend_need: number;     // signed Σ gap over catch-sites = the coverage-need floor (matches on-screen)
}

function r2(n: number): number { return Math.round((n + Number.EPSILON) * 100) / 100; }

// Pure (§2 — verbatim). Never reads/writes the curve or workflow layer.
export function computeSiteBlock(i: SiteBlockInputs, pins: Pins = DEFAULT_PINS): SiteBlock {
  const { W_total, C_total, sites } = i;
  const y_bar = W_total !== 0 ? C_total / W_total : 0; // full precision internally

  // raw per-site
  const raw = sites.map((s) => {
    const wrvu = s.wrvu_share * W_total;
    const mix_yield = deriveYieldForMix(s.payer_mix, pins); // reuse curve module — single-source CF
    return { s, wrvu, mix_yield, weighted: wrvu * mix_yield };
  });
  const denom = raw.reduce((a, r) => a + r.weighted, 0);

  const pre = raw.map((r) => {
    const collections_share = denom !== 0 ? r.weighted / denom : 0; // EMERGES; Σ = 1
    const collections = collections_share * C_total;                // anchored to the KNOWN total
    const yield_eff = r.wrvu > 0 ? collections / r.wrvu : 0;         // degenerate share=0 → 0, no divide-by-zero
    const gap = r.wrvu * (y_bar - yield_eff);                        // NO max(0, ·) — surplus MUST go negative
    return { ...r, collections_share, collections, yield_eff, gap };
  });

  // residual site = largest surplus = most-negative gap (the outside group by construction)
  let residualIdx = 0;
  for (let k = 1; k < pre.length; k++) if (pre[k].gap < pre[residualIdx].gap) residualIdx = k;

  // round all but the residual to cents; derive the residual's collections + gap BY SUBTRACTION,
  // so Σ collections == C_total and Σ gap == 0 on screen, exactly (same discipline as §2A).
  const collR: number[] = pre.map((p, k) => (k === residualIdx ? 0 : r2(p.collections)));
  const gapR: number[] = pre.map((p, k) => (k === residualIdx ? 0 : r2(p.gap)));
  let sumColl = 0, sumGap = 0;
  pre.forEach((_, k) => { if (k !== residualIdx) { sumColl += collR[k]; sumGap += gapR[k]; } });
  collR[residualIdx] = r2(C_total - sumColl);
  gapR[residualIdx] = r2(0 - sumGap);

  const results: SiteResult[] = pre.map((p, k) => ({
    name: p.s.name, kind: p.s.kind, is_catch_site: p.s.is_catch_site,
    wrvu: r2(p.wrvu), mix_yield: r2(p.mix_yield),
    collections_share: r2(p.collections_share),
    collections: collR[k], yield_eff: r2(p.yield_eff), gap: gapR[k],
    is_residual: k === residualIdx,
  }));

  // signed sum of the ROUNDED catch-site gaps (catch sites are never the residual surplus) — matches screen
  const stipend_need = r2(results.filter((s) => s.is_catch_site).reduce((a, s) => a + s.gap, 0));

  return { W_total: r2(W_total), C_total: r2(C_total), y_bar: r2(y_bar), sites: results, stipend_need };
}

// Validation surfaced for the render (computeSiteBlock stays pure; the panel shows these, never silently fixes).
export function validateSiteInputs(i: SiteBlockInputs): string[] {
  const msgs: string[] = [];
  const shareSum = i.sites.reduce((a, s) => a + s.wrvu_share, 0);
  if (Math.abs(shareSum - 1) > 1e-6) msgs.push(`wrvu_share must sum to 1 (got ${r2(shareSum)})`);
  i.sites.forEach((s) => {
    const m = s.payer_mix;
    const mixSum = m.medicare + m.medicaid + m.commercial + m.self_pay;
    if (Math.abs(mixSum - 1) > 1e-6) msgs.push(`${s.name}: payer_mix must sum to 1 (got ${r2(mixSum)})`);
  });
  return msgs;
}

// ILLUSTRATIVE DEFAULTS (labeled placeholders). The site list + is_catch_site are pins (Taylor/Jonathan);
// wrvu_share is the worklist (dashed); payer_mix is illustrative-by-site-type until billing-by-site is joined.
// W_total / C_total are wired from the money module in the render — here, labeled illustrative anchors.
export const ILLUSTRATIVE_SITES: SiteInput[] = [
  { name: "Emergency Dept",     kind: "hospital",      is_catch_site: true,  wrvu_share: 0.30, payer_mix: { medicare: 0.20, medicaid: 0.45, commercial: 0.10, self_pay: 0.25 }, anchor: "campus" },
  { name: "Pediatric ER",       kind: "hospital",      is_catch_site: true,  wrvu_share: 0.12, payer_mix: { medicare: 0.15, medicaid: 0.50, commercial: 0.10, self_pay: 0.25 }, anchor: "campus" },
  { name: "Surgery",            kind: "hospital",      is_catch_site: false, wrvu_share: 0.20, payer_mix: { medicare: 0.25, medicaid: 0.15, commercial: 0.55, self_pay: 0.05 }, anchor: "campus" },
  { name: "Inpatient",          kind: "hospital",      is_catch_site: false, wrvu_share: 0.18, payer_mix: { medicare: 0.35, medicaid: 0.20, commercial: 0.40, self_pay: 0.05 }, anchor: "campus" },
  { name: "Outside Specialty",  kind: "group_outside", is_catch_site: false, wrvu_share: 0.20, payer_mix: { medicare: 0.20, medicaid: 0.05, commercial: 0.73, self_pay: 0.02 }, anchor: "outside" },
];

export function defaultSiteInputs(): SiteBlockInputs & { placeholders: string[] } {
  return {
    W_total: 1000000,   // PLACEHOLDER · illustrative anchor — wired from the money module (production aggregate)
    C_total: 60000000,  // PLACEHOLDER · illustrative anchor — wired from the money module (billing aggregate); y_bar = $60/wRVU
    sites: ILLUSTRATIVE_SITES,
    placeholders: ["W_total", "C_total", "site list", "is_catch_site", "wrvu_share (worklist)", "payer_mix (billing-by-site)"],
  };
}

// ============================================================================
// MODULE A — "REDUCE THE FALL" WHAT-IF (addendum). A what-if PROJECTION mode on the
// same site set: cut a fraction of the avoidable "fall" work at the catch-sites and
// (optionally) redeploy the freed capacity to high-value work. Pure, deterministic.
// Implemented verbatim from the addendum. Reuses computeSiteBlock's baseline.
//
// TWO EFFECTS, KEPT SEPARATE (the honesty):
//   • `reduce` shrinks the coverage NEED regardless of redeploy — the worst work leaves
//     the catch-site, so it climbs toward the FIXED baseline blend. need' depends ONLY on reduce.
//   • `redeploy` decides the GROUP's P&L. group_coll_delta > 0 only above break-even
//     redeploy = y_fall / y_redeploy. Below it the group LOSES volume — never default
//     to the optimistic case. Cutting waste is a group win only if freed time finds high-value work.
// Reference line = the BASELINE blend y_bar0, held FIXED (a rising blend would make untouched
// catch-sites look worse for no reason). need' is signed — NO floor.
// ============================================================================
export interface FallInputs {
  reduce: number;          // [0,1] how much of the fall to cut — THE lever
  redeploy: number;        // [0,1] fraction of freed wRVU-capacity that finds high-value work (dashed assumption)
  y_redeploy: number;      // $/wRVU of redeployed work (~y_core) — assumption
  y_fall: number;          // $/wRVU on the fall work, y_fall <= y_cov — billing assumption
  redeploy_target: string; // the high-value receiver site (e.g. the outside specialty)
  avoidable_share: Record<string, number>; // per catch-site fraction of wRVU that is avoidable "fall" work — CLINICAL pin (dashed)
}
export interface FallSiteResult {
  name: string; is_catch_site: boolean; is_target: boolean;
  wrvu0: number; wrvu1: number;
  collections0: number; collections1: number;
  yield_eff0: number; yield_eff1: number;
  removed_w: number; gap1: number;
}
export interface FallProjection {
  y_bar0: number;            // baseline blend — the FIXED reference line
  need_baseline: number;     // baseline coverage need (signed Σ catch-site gaps)
  need: number;              // need' — depends ONLY on reduce; signed, NO floor
  group_coll_delta: number;  // Σ collections' − Σ baseline collections (the group's P&L swing)
  scans_cut: number;         // Σ removed wRVU — illustrative reads avoided (the patient win)
  redeployed_w: number;      // freed capacity that found high-value work
  breakeven_redeploy: number;// y_fall / y_redeploy — above it the group gains, below it loses
  group_gains: boolean;      // group_coll_delta >= 0
  sites: FallSiteResult[];
}

// Pure (addendum Module A — verbatim). Recomputes the baseline raw (unrounded) so the projection is exact.
export function computeFallWhatIf(base: SiteBlockInputs, fall: FallInputs, pins: Pins = DEFAULT_PINS): FallProjection {
  const { W_total, C_total, sites } = base;
  const y_bar0 = W_total !== 0 ? C_total / W_total : 0; // FIXED reference (full precision)

  // baseline raw per-site (unrounded — consistent with computeSiteBlock's pre-rounding values)
  const wrvu0 = sites.map((s) => s.wrvu_share * W_total);
  const myv = sites.map((s) => deriveYieldForMix(s.payer_mix, pins)); // single-source CF (rounds to cents, like the site block)
  const denom = sites.reduce((a, _, k) => a + wrvu0[k] * myv[k], 0);
  const coll0 = sites.map((_, k) => (denom !== 0 ? (wrvu0[k] * myv[k]) / denom : 0) * C_total);
  const yeff0 = sites.map((_, k) => (wrvu0[k] > 0 ? coll0[k] / wrvu0[k] : 0));

  // apply the lever: cut avoidable fall work at the catch-sites
  const removed = sites.map((s, k) => (s.is_catch_site ? fall.reduce * (fall.avoidable_share[s.name] ?? 0) * wrvu0[k] : 0));
  const redeployed_w = fall.redeploy * removed.reduce((a, r) => a + r, 0);
  const targetIdx = sites.findIndex((s) => s.name === fall.redeploy_target);

  const wrvu1 = wrvu0.map((w, k) => w - removed[k] + (k === targetIdx ? redeployed_w : 0));
  const coll1 = coll0.map((c, k) => c - removed[k] * fall.y_fall + (k === targetIdx ? redeployed_w * fall.y_redeploy : 0));
  const yeff1 = sites.map((_, k) => (wrvu1[k] > 0 ? coll1[k] / wrvu1[k] : 0));

  // need' = signed Σ over catch-sites of wrvu_i' * (y_bar0 - yield_eff_i') — NO floor; depends only on `reduce`
  const need = sites.reduce((a, s, k) => a + (s.is_catch_site ? wrvu1[k] * (y_bar0 - yeff1[k]) : 0), 0);
  const need_baseline = sites.reduce((a, s, k) => a + (s.is_catch_site ? wrvu0[k] * (y_bar0 - yeff0[k]) : 0), 0);
  const group_coll_delta = coll1.reduce((a, c) => a + c, 0) - coll0.reduce((a, c) => a + c, 0);
  const scans_cut = removed.reduce((a, r) => a + r, 0);

  const siteResults: FallSiteResult[] = sites.map((s, k) => ({
    name: s.name, is_catch_site: s.is_catch_site, is_target: k === targetIdx,
    wrvu0: r2(wrvu0[k]), wrvu1: r2(wrvu1[k]),
    collections0: r2(coll0[k]), collections1: r2(coll1[k]),
    yield_eff0: r2(yeff0[k]), yield_eff1: r2(yeff1[k]),
    removed_w: r2(removed[k]), gap1: r2(wrvu1[k] * (y_bar0 - yeff1[k])),
  }));

  return {
    y_bar0: r2(y_bar0), need_baseline: r2(need_baseline), need: r2(need),
    group_coll_delta: r2(group_coll_delta), scans_cut: r2(scans_cut), redeployed_w: r2(redeployed_w),
    breakeven_redeploy: fall.y_redeploy !== 0 ? r2(fall.y_fall / fall.y_redeploy) : 0,
    group_gains: group_coll_delta >= 0, sites: siteResults,
  };
}

// ILLUSTRATIVE fall defaults — conservative (reduce 0, redeploy 0): start at baseline, do NOT assume the optimistic case.
export function defaultFallInputs(): FallInputs & { placeholders: string[] } {
  return {
    reduce: 0,            // THE lever — default 0 (baseline)
    redeploy: 0,          // default 0 — conservative; volume is lost until demand is shown to absorb it
    y_redeploy: 85,       // PLACEHOLDER · ~y_core (high-value work) — assumption
    y_fall: 18,           // PLACEHOLDER · fall-work yield, <= y_cov — billing assumption
    redeploy_target: "Outside Specialty",
    avoidable_share: { "Emergency Dept": 0.35, "Pediatric ER": 0.30 }, // PLACEHOLDER · Jonathan's clinical low-yield definition (dashed)
    placeholders: ["reduce", "redeploy", "y_redeploy", "y_fall", "avoidable_share (clinical low-yield def)"],
  };
}
