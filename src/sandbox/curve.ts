// ============================================================================
// THE SANDBOX CURVE — productivity → bonus, the illustrative teaching model.
// Pure, deterministic. Lives in the shared tested package; Lovable RENDERS it (never hand-codes it).
// Reads the conversion factor from the money config (single source — no second copy of CF).
//
// THE HONESTY RULE (this module's reason to exist): the flattening must be EARNED by the inputs,
// never baked in. If y_cov ≈ y_core, the curve stays steep and grinding HELPS — and we show that.
// It flattens for a target group only because THEIR marginal read is the uncompensated one.
// No text in this module ever states the conclusion; the shape carries it. ILLUSTRATIVE — not the
// reconciled engine truth path; it neither feeds nor is fed by it.
// ============================================================================

import { DEFAULT_PINS, type Pins } from "../config/pins.ts";

export interface CurveInputs {
  w: number;             // THE SLIDER — avg wRVU per radiologist per year
  w_core: number;        // productivity up to which work is core/well-paid (PLACEHOLDER — clinical lead)
  y_core: number;        // $/wRVU on core work (derived from money mix + CF)
  y_cov: number;         // $/wRVU on marginal coverage work, y_cov < y_core (derived from structural mix + CF)
  F: number;             // overhead allocated per partner / yr (PLACEHOLDER — finance)
  B: number;             // base comp per partner / yr (PLACEHOLDER — finance)
  w_sustainable: number; // sustainable annual wRVU ceiling — greyed beyond (PLACEHOLDER — clinical lead)
  N: number;             // partner count (NUMERIC FINGERPRINT — genericize; PLACEHOLDER — finance)
  y_cov_fair?: number;   // phase-2 fair coverage rate for the optional overlay (illustrative; counsel owns FMV/AKS)
}

export interface CurvePoint {
  w: number;
  core_w: number;
  cov_w: number;
  collections: number;
  avg_yield: number;
  bonus_per_partner: number;
  next_1k_bonus: number;
  underwater: boolean;
  bonus_fair?: number; // phase-2 P_fair, if y_cov_fair provided
}

// Deterministic, pure (§2 — implemented verbatim).
export function computeCurve(i: CurveInputs): CurvePoint {
  const core_w = Math.min(i.w, i.w_core);
  const cov_w = Math.max(0, i.w - i.w_core);
  const collections = core_w * i.y_core + cov_w * i.y_cov;
  const avg_yield = i.w > 0 ? collections / i.w : 0;
  const bonus_per_partner = collections - i.F - i.B;
  const next_1k_bonus = (i.w < i.w_core ? i.y_core : i.y_cov) * 1000;
  const point: CurvePoint = {
    w: i.w, core_w, cov_w,
    collections: r2(collections), avg_yield: r2(avg_yield),
    bonus_per_partner: r2(bonus_per_partner), next_1k_bonus: r2(next_1k_bonus),
    underwater: bonus_per_partner < 0,
  };
  if (i.y_cov_fair != null) {
    const C_fair = core_w * i.y_core + cov_w * i.y_cov_fair;
    point.bonus_fair = r2(C_fair - i.F - i.B);
  }
  return point;
}

// The plot series: bonus (and avg_yield) across the productivity range. Deterministic.
export function curveSeries(base: Omit<CurveInputs, "w">, w_min: number, w_max: number, step = 250): CurvePoint[] {
  const out: CurvePoint[] = [];
  for (let w = w_min; w <= w_max + 1e-9; w += step) out.push(computeCurve({ ...base, w: r2(w) }));
  return out;
}

// ---- yields derived from a payer mix + the money-module CF (single source for CF) ----
// Net $/wRVU multiples vs Medicare mirror the money model's benchmark pins (illustrative, replaceable).
export const PAYER_MULTIPLE = { medicare: 1.0, medicaid: 0.68, commercial: 2.25, self_pay: 0 } as const;
export type PayerMix = { medicare: number; medicaid: number; commercial: number; self_pay: number };

export function deriveYieldForMix(mix: PayerMix, pins: Pins = DEFAULT_PINS): number {
  const CF = pins.conversion_factor; // SINGLE SOURCE — read CF from the money config, never a second copy
  return r2(CF * (mix.medicare * PAYER_MULTIPLE.medicare + mix.medicaid * PAYER_MULTIPLE.medicaid
    + mix.commercial * PAYER_MULTIPLE.commercial + mix.self_pay * PAYER_MULTIPLE.self_pay));
}

// ILLUSTRATIVE PLACEHOLDER pins — labeled, genericized; the assumptions panel absorbs the real values
// (clinical lead: w_core/w_sustainable/ranges; finance: F/B/N) with NO rebuild. Do NOT treat as authored.
export const ILLUSTRATIVE_CORE_MIX: PayerMix = { medicare: 0.25, medicaid: 0.10, commercial: 0.55, self_pay: 0.10 };
export const ILLUSTRATIVE_COVERAGE_MIX: PayerMix = { medicare: 0.20, medicaid: 0.45, commercial: 0.10, self_pay: 0.25 };
// even worse than the coverage lane — the after-hours mix (more self-pay/Medicaid) → y_night <= y_cov (illustrative)
export const ILLUSTRATIVE_NIGHT_MIX: PayerMix = { medicare: 0.15, medicaid: 0.45, commercial: 0.05, self_pay: 0.35 };

// ============================================================================
// §2A — THE WORKFLOW LAYER (two honest segmentations of the coverage work).
// Decomposes ONLY cov_w (from §2) along two workflow axes. It MUST NOT feed back
// into the base curve — collections, bonus_per_partner, avg_yield, next_1k stay
// two-feed. The math is exact; the INPUTS (night_share, avoidable_share) are
// labeled worklist assumptions → the front end marks these outputs with a DASHED
// workflow tick (provenance spec). Two lenses on the same cov_w — NEVER summed.
// ============================================================================
export interface WorkflowLayerInputs {
  cov_w: number;           // coverage wRVU from the base curve (§2). cov_w = 0 below w_core → every gap 0.
  y_core: number;          // the illustrative "fair" anchor (the rate good work earns)
  y_cov: number;           // marginal coverage yield (y_cov <= y_core)
  night_share: number;     // [0,1] fraction of cov_w that is after-hours — WORKFLOW assumption (dashed)
  y_night: number;         // $/wRVU on after-hours coverage, y_night <= y_cov — BILLING assumption (worse night mix)
  avoidable_share: number; // [0,1] low-yield/avoidable-by-better-ordering fraction — WORKFLOW + CLINICAL assumption (dashed)
}
export interface WorkflowLayer {
  // by WHEN — after-hours coverage gap (the coverage you carry; the stipend ask, sized)
  night_w: number;
  afterhours_gap: number;
  // by APPROPRIATENESS — structural vs avoidable split (the waste only the hospital can cut)
  avoidable_w: number;
  structural_w: number;
  coverage_shortfall: number;
  avoidable_gap: number;   // the hospital's lever — SHARED WASTE, never group recovery
  structural_gap: number;  // you carry this → the stipend conversation
}

// Deterministic, pure (§2A — implemented verbatim). Never mutates / reads the base-curve outputs.
export function computeWorkflowLayer(i: WorkflowLayerInputs): WorkflowLayer {
  const night_w = i.cov_w * i.night_share;
  const afterhours_gap = night_w * (i.y_core - i.y_night);
  const avoidable_w = i.cov_w * i.avoidable_share;
  const structural_w = i.cov_w * (1 - i.avoidable_share);
  // §2A ROUNDING RULE: round coverage_shortfall and avoidable_gap to cents, then DERIVE structural_gap
  // by subtraction from the ROUNDED values — so the two displayed parts ALWAYS sum to the shortfall.
  // Rounding all three independently misses by a penny on ~9% of inputs; on a reconcile-to-the-dollar
  // site that's a credibility wound. Structural absorbs the residual (it's the carried part either way).
  // No floor anywhere: out-of-bound yields (y_cov > y_core, y_night > y_core) return NEGATIVE, not 0.
  const coverage_shortfall = r2(i.cov_w * (i.y_core - i.y_cov));
  const avoidable_gap = r2(avoidable_w * (i.y_core - i.y_cov));
  const structural_gap = r2(coverage_shortfall - avoidable_gap);
  return {
    night_w: r2(night_w), afterhours_gap: r2(afterhours_gap),
    avoidable_w: r2(avoidable_w), structural_w: r2(structural_w),
    coverage_shortfall, avoidable_gap, structural_gap,
  };
}

export function defaultCurveInputs(pins: Pins = DEFAULT_PINS): Omit<CurveInputs, "w"> & { w_min: number; w_max: number; w_default: number; night_share: number; y_night: number; avoidable_share: number; placeholders: string[] } {
  return {
    w_core: 8000,            // PLACEHOLDER · clinical lead
    w_sustainable: 12000,    // PLACEHOLDER · clinical lead
    y_core: deriveYieldForMix(ILLUSTRATIVE_CORE_MIX, pins),     // illustrative, from CF + core mix
    y_cov: deriveYieldForMix(ILLUSTRATIVE_COVERAGE_MIX, pins),  // illustrative, from CF + coverage mix
    F: 100000,               // PLACEHOLDER · finance (overhead/partner)
    B: 350000,               // PLACEHOLDER · finance (base comp/partner)
    N: 100,                  // PLACEHOLDER · GENERICIZED (numeric fingerprint)
    w_min: 4000, w_max: 16000, w_default: 9000, // PLACEHOLDER · genericized ranges
    // §2A workflow-layer pins — non-computable until the worklist is wired (dashed tick); labeled placeholders
    night_share: 0.5,        // PLACEHOLDER · clinical lead + worklist
    y_night: deriveYieldForMix(ILLUSTRATIVE_NIGHT_MIX, pins),   // illustrative, from CF + after-hours mix (<= y_cov)
    avoidable_share: 0.4,    // PLACEHOLDER · clinical lead (clinical low-yield definition) + worklist
    placeholders: ["w_core", "w_sustainable", "F", "B", "N", "w_min/w_max/w_default", "night_share", "y_night", "avoidable_share"],
  };
}

function r2(n: number): number { return Math.round((n + Number.EPSILON) * 100) / 100; }
