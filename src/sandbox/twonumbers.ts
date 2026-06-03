// ============================================================================
// A TALE OF TWO NUMBERS — the ER-coverage stipend instrument. ILLUSTRATIVE.
// Pure, deterministic. The negotiation centerpiece: two numbers only the group owns
// (ER collections, ER wRVU) → ER yield → deficit vs fair cost → stipend. A bounded
// lever (cut only the avoidable slice) runs it backward. Implemented VERBATIM from
// the canonical the-instrument.html; this is the single source so the render
// transcribes it (no third hand-coded copy of the math).
//
// HONESTY (build in): yield is a CONSTANT — when the lever cuts volume, collections
// and wRVU scale TOGETHER so yield holds (a stated contrivance, not a drift). The
// lever is BOUNDED to the avoidable share (~30%) — coverage, and its stipend, never
// reach zero. Both contrivances (collections-tracks-volume, the avoidable cap) are
// explicit inputs, labeled in plain sight. Does NOT read/write the curve, §2A, site, or fall.
// ============================================================================

const AVOIDABLE_CAP_DEFAULT = 0.30; // the avoidable (medically-unnecessary) slice — a clinical PIN, not a guess

export interface TwoNumbersInputs {
  // the two numbers the group owns (green)
  coll: number;            // ER collections — professional dollars collected on ER studies
  wrvu: number;            // ER wRVU — ER CPTs through the CMS PFS (gray/fixed)
  // valuator pins (blue) — the fair cost of producing a wRVU
  comp: number;            // fair pay per wRVU
  ovh: number;             // overhead per wRVU
  // the lever + hospital (the what-if)
  cut: number;             // [0, avoidable_cap] fraction of ER volume to cut (clamped)
  util: number;            // [0,1] fraction of freed time the group actually uses (redeploys)
  redep: number;           // reclaimed time value per wRVU (the group's non-ER yield)
  avoidable_cap?: number;  // the bound on `cut` — default 0.30 (clinical pin)
}

export interface TwoNumbers {
  yield: number;           // ER yield = collections / wRVU — the constant
  fair: number;            // fair cost = comp + ovh
  deficit: number;         // deficit = fair − yield
  stipend: number;         // stipend = deficit × ER wRVU (at the current cut)
  wrvu_cut: number;        // ER wRVU after the cut (never below (1 − cap) × base)
  coll_cut: number;        // ER collections after the cut (tracks volume → yield holds)
  yield_cut: number;       // yield after the cut — MUST equal `yield` (the honesty invariant)
  removed_wrvu: number;    // wRVU shed by the cut
  hosp_save: number;       // hospital saves = removed × deficit (less stipend owed)
  group_gain: number;      // group gain from redeploying freed time = max(0, util × removed × (redep − fair))
  avoidable_cap: number;   // the bound in effect
  cut_applied: number;     // the cut after clamping to [0, cap]
}

function r2(n: number): number { return Math.round((n + Number.EPSILON) * 100) / 100; }
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

// Pure (verbatim from the-instrument.html). `coll`/`wrvu` are the BASE (pre-cut) two numbers.
export function computeTwoNumbers(i: TwoNumbersInputs): TwoNumbers {
  const cap = i.avoidable_cap ?? AVOIDABLE_CAP_DEFAULT;
  const cut = clamp(i.cut, 0, cap);             // bounded — coverage never goes to zero
  const yld = i.wrvu > 0 ? i.coll / i.wrvu : 0; // the constant
  const fair = i.comp + i.ovh;
  const deficit = fair - yld;
  // collections-tracks-volume (the stated contrivance): scale both together so yield HOLDS
  const wrvu_cut = i.wrvu * (1 - cut);
  const coll_cut = i.coll * (1 - cut);
  const yield_cut = wrvu_cut > 0 ? coll_cut / wrvu_cut : 0; // === yld, by construction
  const stipend = wrvu_cut * deficit;           // the math, run backward by the lever
  const removed = i.wrvu * cut;
  const hosp_save = removed * deficit;
  const group_gain = Math.max(0, i.util * removed * (i.redep - fair)); // floored: you don't redeploy at a loss
  return {
    yield: r2(yld), fair: r2(fair), deficit: r2(deficit), stipend: r2(stipend),
    wrvu_cut: r2(wrvu_cut), coll_cut: r2(coll_cut), yield_cut: r2(yield_cut),
    removed_wrvu: r2(removed), hosp_save: r2(hosp_save), group_gain: r2(group_gain),
    avoidable_cap: cap, cut_applied: cut,
  };
}

// ============================================================================
// THE VOLUME SWEEP — the gross-margin proof (math, not law). Scale ER volume from
// 0 to ~4× today and watch what ER contributes to the bottom line:
//   • WITHOUT a stipend: ER margin = (yield − fair) × ER wRVU = −deficit × ER wRVU.
//     Negative, and it scales straight down with volume — more ER = bigger loss.
//   • WITH the stipend: the stipend (= deficit × ER wRVU) exactly cancels that margin,
//     so ER contributes EXACTLY ZERO at every volume — a flat line. Break-even work
//     adds nothing to profit no matter how much you pile on. It "moves but stops at zero."
// The gap between the two lines at any volume IS the stipend. No floor on the negative.
// This is the load-bearing economic point (the one people miss): the flat line is
// arithmetic of a negative gross margin brought to break-even — not a legal device.
// ============================================================================
export interface VolumePoint {
  m: number;                       // volume multiplier (1 = today)
  er_wrvu: number;                 // ER wRVU at this volume
  stipend: number;                 // deficit × er_wrvu — the gap, funded
  er_margin_no_stipend: number;    // (yield − fair) × er_wrvu = −deficit × er_wrvu (the loss; scales down, NO floor)
  er_margin_with_stipend: number;  // === 0 at every m (break-even; flat; profit-neutral)
}
export function stipendVolumeSweep(i: TwoNumbersInputs, m_min = 0, m_max = 4, step = 0.25): VolumePoint[] {
  const yld = i.wrvu > 0 ? i.coll / i.wrvu : 0;
  const fair = i.comp + i.ovh;
  const deficit = fair - yld;
  const out: VolumePoint[] = [];
  for (let m = m_min; m <= m_max + 1e-9; m += step) {
    const er_wrvu = i.wrvu * m;
    const stipend = deficit * er_wrvu;
    const er_margin_no_stipend = (yld - fair) * er_wrvu;     // = −deficit × er_wrvu
    out.push({
      m: r2(m), er_wrvu: r2(er_wrvu), stipend: r2(stipend),
      er_margin_no_stipend: r2(er_margin_no_stipend),
      er_margin_with_stipend: r2(er_margin_no_stipend + stipend), // exact 0
    });
  }
  return out;
}

// ============================================================================
// THE PRACTICE P&L — profit is CALCULATED (collections − cost), never plugged.
// Margin (profit %) = (revenue − cost) / revenue. The practice is two wRVU streams:
//   • non-ER — positive margin (collects ~$85.5 against a $70 cost → +18%): the profit engine.
//   • ER     — DEEPLY negative margin ($28 collected, $70 cost → (28−70)/28 = −150%): a loss.
//     The stipend lifts ER revenue to the cost ($28 + $42 = $70), so margin = (70−70)/70 = 0%
//     — break-even — at EVERY volume. (Margin is a rate: −150%/0% at any volume; the $ loss scales.)
// Partner profit = (Σ collections + stipend − Σ cost) / N. Slide ER volume and
// EVERYTHING moves (ER wRVU, collections, stipend, total production) — but the
// with-stipend partner profit doesn't, because a fraction of exactly 1 drops nothing
// to the bottom line. That FLATNESS IS COMPUTED, not asserted (the whole point).
// ============================================================================
export interface PracticeInputs {
  er_wrvu: number;       // base ER wRVU (today)
  er_yield: number;      // ER collections ÷ ER wRVU  (≈ $28)
  nonER_wrvu: number;    // non-ER wRVU
  nonER_yield: number;   // non-ER collections ÷ non-ER wRVU (> fair_cost → positive margin)
  fair_cost: number;     // comp + overhead per wRVU (≈ $70) — the cost (denominator) rate
  N: number;             // partners
}
export interface PracticePoint {
  m: number;                  // ER volume multiplier (1 = today); only ER production scales
  er_wrvu: number;
  er_collections: number;     // er_yield × er_wrvu(m)           — numerator (no stipend)
  er_cost: number;            // fair_cost × er_wrvu(m)          — denominator
  stipend: number;            // (fair_cost − er_yield) × er_wrvu(m) — lifts numerator to the denominator
  er_margin_no_stipend: number;   // (collections − cost)/collections = (yield−fair)/yield  (e.g. −1.50 = −150%: a loss)
  er_margin_with_stipend: number; // (collections + stipend − cost)/(collections + stipend) == 0 (break-even, 0%)
  nonER_margin: number;           // (nonER collections − cost)/nonER collections (> 0: the profit engine)
  partner_profit_no_stipend: number;   // (Σ collections − Σ cost) / N           — DECLINES with ER volume
  partner_profit_with_stipend: number; // (Σ collections + stipend − Σ cost) / N — FLAT (computed, not plugged)
}
export function practiceProfitSweep(i: PracticeInputs, m_min = 0, m_max = 4, step = 0.25): PracticePoint[] {
  // non-ER is fixed (the profit engine) — computed as collections − cost, not assumed
  const nonER_collections = i.nonER_yield * i.nonER_wrvu;
  const nonER_cost = i.fair_cost * i.nonER_wrvu;
  const nonER_profit = nonER_collections - nonER_cost; // > 0
  const out: PracticePoint[] = [];
  for (let m = m_min; m <= m_max + 1e-9; m += step) {
    const er_wrvu = i.er_wrvu * m;
    const er_collections = i.er_yield * er_wrvu;
    const er_cost = i.fair_cost * er_wrvu;
    const stipend = (i.fair_cost - i.er_yield) * er_wrvu; // = er_cost − er_collections (closes the gap exactly)
    const profit_no = (nonER_collections + er_collections - (nonER_cost + er_cost)) / i.N;
    const profit_with = (nonER_collections + er_collections + stipend - (nonER_cost + er_cost)) / i.N; // = nonER_profit / N
    out.push({
      m: r2(m), er_wrvu: r2(er_wrvu), er_collections: r2(er_collections), er_cost: r2(er_cost), stipend: r2(stipend),
      er_margin_no_stipend: i.er_yield > 0 ? Math.round((i.er_yield - i.fair_cost) / i.er_yield * 1e4) / 1e4 : 0, // (rev−cost)/rev; e.g. −1.50
      er_margin_with_stipend: 0,                                                                                  // revenue (incl stipend) == cost → 0%
      nonER_margin: i.nonER_yield > 0 ? Math.round((i.nonER_yield - i.fair_cost) / i.nonER_yield * 1e4) / 1e4 : 0,
      partner_profit_no_stipend: r2(profit_no),
      partner_profit_with_stipend: r2(profit_with),
    });
  }
  return out;
}

export function defaultPracticeInputs(): PracticeInputs & { placeholders: string[] } {
  // non-ER derived from the same aggregates as the Data/Audit drawers (total − ER) — single source, honest
  const total_wrvu = 1100000, total_coll = 77000000;
  const er_wrvu = 297000, er_coll = 8316000;
  const nonER_wrvu = total_wrvu - er_wrvu;            // 803,000
  const nonER_yield = (total_coll - er_coll) / nonER_wrvu; // ≈ $85.53/wRVU (> $70 cost → positive margin)
  return {
    er_wrvu, er_yield: er_coll / er_wrvu, // $28
    nonER_wrvu, nonER_yield,
    fair_cost: 70,   // comp + overhead (valuator-owned)
    N: 100,          // PLACEHOLDER · partner count (Jonathan's group)
    placeholders: ["nonER_yield (from total − ER)", "fair_cost (valuator)", "N (partners)"],
  };
}

// ---- Data drawer: build the two numbers from group aggregates (the "do it without IT" path) ----
export interface SuggestionInputs { twrvu: number; ershare: number; eryield: number; } // ershare as fraction [0,1]
export function suggestTwoNumbers(s: SuggestionInputs): { sugW: number; sugC: number } {
  const sugW = s.twrvu * s.ershare;
  return { sugW: r2(sugW), sugC: r2(sugW * s.eryield) };
}

// ---- Audit drawer: the group's own all-in cost per wRVU vs the valuator pins ----
export interface AuditInputs { net: number; totcoll: number; twrvu: number; wrvu: number; fair: number; }
export interface AuditResult { aComp: number; aOvh: number; aAll: number; aEr: number; perEr: number; }
export function auditPerWrvu(a: AuditInputs): AuditResult {
  const aComp = a.twrvu > 0 ? a.net / a.twrvu : 0;                 // comp/wRVU (net before distributions ÷ total wRVU)
  const aOvh = a.twrvu > 0 ? (a.totcoll - a.net) / a.twrvu : 0;    // overhead/wRVU
  const aAll = a.twrvu > 0 ? a.totcoll / a.twrvu : 0;              // all-in/wRVU
  return { aComp: r2(aComp), aOvh: r2(aOvh), aAll: r2(aAll), aEr: r2(aAll * a.wrvu), perEr: r2(a.fair * a.wrvu) };
}

// ILLUSTRATIVE DEFAULTS (labeled placeholders). coll/wrvu → $28 yield; comp+ovh → $70 fair; ~$12.5M stipend.
export function defaultTwoNumbersInputs(): TwoNumbersInputs & { suggestion: SuggestionInputs; audit_aggregates: { net: number; totcoll: number; twrvu: number }; placeholders: string[] } {
  return {
    coll: 8316000,   // PLACEHOLDER · the group's books (green) — ER professional collections
    wrvu: 297000,    // PLACEHOLDER · ER wRVU (CMS PFS lookup, gray/fixed)
    comp: 58,        // PLACEHOLDER · valuator (blue) — fair pay/wRVU
    ovh: 12,         // PLACEHOLDER · valuator (blue) — overhead/wRVU
    cut: 0, util: 1, redep: 90, // lever defaults: no cut, full utilization, redeploy value ~non-ER yield
    avoidable_cap: AVOIDABLE_CAP_DEFAULT, // clinical PIN — the avoidable slice
    suggestion: { twrvu: 1100000, ershare: 0.27, eryield: 28 },
    audit_aggregates: { net: 63800000, totcoll: 77000000, twrvu: 1100000 },
    placeholders: ["coll", "wrvu", "comp/ovh (valuator)", "avoidable_cap (clinical)", "redep"],
  };
}
