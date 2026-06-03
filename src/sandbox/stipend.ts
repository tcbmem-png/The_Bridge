// ============================================================================
// PROPOSED — NOT YET WIRED. THE STIPEND BLOCK — the deficit method, sized.
// Drafted by the math audit (AUDIT-math.md). Pure, deterministic; matches the
// curve/site module style (import pins, r2 cents rounding, no AI in the math path).
// This is the math currently living ONLY as an untested second copy inside
// the-instrument.html's <script>. Porting it here makes the instrument RENDER one
// source of truth instead of re-deriving it. NOTHING imports this yet — review first.
//
// THE METHOD (FMV adjusted-P&L deficit form; see the-bridge-negotiation-output-framework.md §1):
//   ER yield      = ER collections ÷ ER wRVU          (the revealed number only the group has)
//   fair cost     = comp/wRVU + overhead/wRVU          (valuator's binding benchmarks — pins)
//   deficit       = fair cost − ER yield               (per-unit coverage shortfall)
//   stipend       = deficit × ER wRVU                  (the annual ask)
//
// THE HONESTY RULE (this module's reason to exist): comp/overhead are the VALUATOR's
// pins, not ours — they are inputs, never authored here. ER yield is measured from the
// group's own books. The module computes the arithmetic between them and nothing else;
// it never sets a benchmark or a rate. A negative deficit (yield above fair cost) returns
// a NEGATIVE stipend — NO floor — so a site that doesn't actually need a subsidy can't be
// made to look like it does.
// ============================================================================

import { DEFAULT_PINS, type Pins } from "../config/pins.ts";

export interface StipendInputs {
  er_wrvu: number;        // annual ER-originated wRVU — MEASURED (group billing → CMS wRVU, POS 23)
  er_collections: number; // annual net professional collections on that ER work — MEASURED (group RCM)
  comp_per_wrvu: number;  // FMV radiologist comp / wRVU — VALUATOR PIN (MGMA / SullivanCotter median)
  overhead_per_wrvu: number; // FMV practice overhead / wRVU — VALUATOR PIN (practice-expense benchmark)
}

export interface StipendResult {
  er_yield: number;      // er_collections / er_wrvu  (degenerate er_wrvu=0 → 0, no divide-by-zero)
  fair_cost: number;     // comp_per_wrvu + overhead_per_wrvu
  deficit: number;       // fair_cost − er_yield  (signed; NO floor — surplus returns negative)
  stipend: number;       // deficit × er_wrvu  (signed; the FMV-defensible annual ask)
}

function r2(n: number): number { return Math.round((n + Number.EPSILON) * 100) / 100; }

// Pure, deterministic — the deficit method, verbatim. Never mutates inputs; reads no globals.
export function computeStipend(i: StipendInputs): StipendResult {
  const er_yield = i.er_wrvu > 0 ? i.er_collections / i.er_wrvu : 0;
  const fair_cost = i.comp_per_wrvu + i.overhead_per_wrvu;
  const deficit = fair_cost - er_yield;          // signed — NO max(0, ·); a surplus must go negative
  const stipend = deficit * i.er_wrvu;           // signed
  return {
    er_yield: r2(er_yield),
    fair_cost: r2(fair_cost),
    deficit: r2(deficit),
    stipend: r2(stipend),
  };
}

// ============================================================================
// THE VOLUME LEVER — what cutting avoidable ER wRVU is worth, on a real-dollar basis.
// The contract-facing twin of computeFallWhatIf (site.ts Module A), in deficit-method terms.
// Two yield models for the avoidable slice are exposed EXPLICITLY (the audit's open question);
// the caller must choose one — neither is silently assumed. See AUDIT-math.md §2.
//
//   "blended"  — avoidable work carries the same blended ER yield; collections track volume so
//                yield holds. Stipend given up per removed wRVU = deficit. (the-instrument.html's
//                current assumption — the most CONSERVATIVE ask, understates the hospital's saving.)
//   "zero"     — avoidable work yields ≈ 0 (er-wrvu-volume-lever.md §1/§4). Removing it drops no
//                collections, so blended yield RISES and the stipend given up per removed wRVU =
//                fair cost. (Larger hospital saving; the doc's framing is "we shed zero-margin work.")
// ============================================================================
export type AvoidableYieldModel = "blended" | "zero";

export interface LeverInputs {
  base: StipendInputs;       // the baseline (pre-cut) numbers
  cut_fraction: number;      // [0,1] fraction of TOTAL ER wRVU removed — caps at the avoidable share
  avoidable_yield: AvoidableYieldModel; // EXPLICIT choice — no default; the audit's open decision
  redeploy_yield: number;    // $/wRVU the freed capacity earns elsewhere — GROSS yield (assumption)
  utilization: number;       // [0,1] fraction of freed capacity that finds high-value work
}

export interface LeverResult {
  removed_wrvu: number;      // base.er_wrvu × cut_fraction
  er_wrvu_after: number;
  er_collections_after: number;
  er_yield_after: number;    // RISES under "zero", holds under "blended"
  stipend_before: number;
  stipend_after: number;
  hospital_saves: number;    // stipend_before − stipend_after  (the per-period reduction)
  group_gain: number;        // util × removed × (redeploy_yield − fair_cost); signed, see audit §3
  breakeven_redeploy: number;// fair_cost — redeploy must clear this for the group to come out ahead
}

// Pure, deterministic. Recomputes the after-cut P&L exactly; no floor on hospital_saves or group_gain.
export function computeLever(i: LeverInputs): LeverResult {
  const b = computeStipend(i.base);
  const removed = i.base.er_wrvu * i.cut_fraction;
  const wrvu_after = i.base.er_wrvu - removed;

  // collections after the cut, per the chosen avoidable-yield model
  const coll_after = i.avoidable_yield === "zero"
    ? i.base.er_collections - removed * 0                  // avoidable carried ~$0 — no collections lost
    : i.base.er_collections * (wrvu_after / i.base.er_wrvu); // blended — collections track volume

  const after = computeStipend({ ...i.base, er_wrvu: wrvu_after, er_collections: coll_after });
  const group_gain = i.utilization * removed * (i.redeploy_yield - b.fair_cost); // signed — NO floor

  return {
    removed_wrvu: r2(removed),
    er_wrvu_after: r2(wrvu_after),
    er_collections_after: r2(coll_after),
    er_yield_after: after.er_yield,
    stipend_before: b.stipend,
    stipend_after: after.stipend,
    hospital_saves: r2(b.stipend - after.stipend),
    group_gain: r2(group_gain),
    breakeven_redeploy: b.fair_cost,
  };
}

// ILLUSTRATIVE DEFAULTS (labeled placeholders — every one a pin). comp/overhead are the VALUATOR's
// binding figures; er_wrvu / er_collections are the GROUP's measured numbers. Shown to demonstrate the
// structure and to reconcile with the-instrument.html's defaults, NOT to assert the number.
export function defaultStipendInputs(_pins: Pins = DEFAULT_PINS): StipendInputs & { placeholders: string[] } {
  return {
    er_wrvu: 297000,            // PLACEHOLDER · group billing (POS 23 → CMS wRVU)
    er_collections: 8316000,    // PLACEHOLDER · group RCM (yields $28/wRVU)
    comp_per_wrvu: 58,          // PLACEHOLDER · VALUATOR — MGMA / SullivanCotter median
    overhead_per_wrvu: 12,      // PLACEHOLDER · VALUATOR — practice-expense benchmark
    placeholders: ["er_wrvu", "er_collections", "comp_per_wrvu (valuator)", "overhead_per_wrvu (valuator)"],
  };
}

// ----------------------------------------------------------------------------
// HOW THE HTML WOULD RENDER THIS (instead of re-deriving the math in its <script>):
//
//   import { computeStipend, computeLever } from "bridge-engine/src/sandbox/stipend.ts";
//   const s = computeStipend({ er_wrvu, er_collections, comp_per_wrvu: comp, overhead_per_wrvu: ovh });
//   $('o-yield').textContent  = '$' + s.er_yield.toFixed(2) + ' /wRVU';
//   $('o-fair').textContent   = '$' + s.fair_cost.toFixed(2) + ' /wRVU';
//   $('o-def').textContent    = '$' + s.deficit.toFixed(2) + ' /wRVU';
//   $('o-stip').textContent   = M(s.stipend);
//   const lv = computeLever({ base, cut_fraction: cut, avoidable_yield: 'blended', redeploy_yield: redep, utilization: util });
//   $('o-hosp').textContent   = '+' + M(lv.hospital_saves);
//   $('o-gain').textContent   = M(lv.group_gain);
//
// The page becomes a thin renderer over one tested source — no second copy of the formula,
// no chance of the HTML and the engine drifting apart. The Data-drawer suggestion math
// (sugW = twrvu × ershare; sugC = sugW × eryield) and the Audit reconciliation rows
// (aComp/aOvh/aAll) are simple enough to keep inline OR fold into a sibling helper here.
// ----------------------------------------------------------------------------
