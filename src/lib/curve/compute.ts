// Sandbox curve — productivity → bonus.
// Implements the model in `the-bridge-sandbox-curve-spec.md` §2 verbatim.
// Pure functions. No randomness. No side effects.
//
// Shared constants (conversion factor, payer multiples) are READ from the
// money module — never re-hardcoded here. Single source of truth.

import type { MoneyInputs } from "../money/types";

/** Two illustrative mixes: where the core read sits, and what the marginal
 *  coverage read actually looks like. Both editable in the assumptions panel;
 *  these are PLACEHOLDER defaults. */
export type Mix = {
  medicare: number; // %
  medicaid: number; // %
  commercial: number; // %
  self_pay: number; // %
};

export const DEFAULT_CORE_MIX: Mix = {
  // PLACEHOLDER — daytime / scheduled work, commercial-heavy.
  medicare: 25,
  medicaid: 10,
  commercial: 60,
  self_pay: 5,
};

export const DEFAULT_COVERAGE_MIX: Mix = {
  // PLACEHOLDER — ED / overnight / coverage work, the unpaid marginal read.
  medicare: 22,
  medicaid: 30,
  commercial: 33,
  self_pay: 15,
};

/** Derive $/wRVU from a payer mix, using the money module's CF + multipliers
 *  as the single source. Medicare multiplier is 1.0 by definition. */
export function deriveYieldForMix(mix: Mix, money: MoneyInputs): number {
  const cf = money.conversion_factor;
  const f_md = money.payer_multipliers.medicaid;
  const f_co = money.payer_multipliers.commercial;
  const f_sp = money.payer_multipliers.self_pay;
  const w =
    (mix.medicare / 100) * 1.0 +
    (mix.medicaid / 100) * f_md +
    (mix.commercial / 100) * f_co +
    (mix.self_pay / 100) * f_sp;
  return cf * w;
}

/** §2 inputs — illustrative defaults, all marked PLACEHOLDER (pinned by humans). */
export type CurveInputs = {
  w_core: number; // wRVU threshold; above = marginal coverage
  y_core: number; // $/wRVU on core work (derived from CORE mix + money CF)
  y_cov: number; // $/wRVU on marginal coverage work
  F: number; // overhead allocated per partner per year
  B: number; // base comp per partner per year
  w_sustainable: number; // sustainable annual ceiling (greyed band beyond)
  N: number; // partner count (group-total toggle)
  w_min: number;
  w_max: number;
  w_default: number;
};

export const DEFAULT_CURVE_INPUTS: CurveInputs = {
  w_core: 8000,
  // y_core / y_cov are derived at runtime from the money module when the user
  // has not overridden them. These literals are only the seed defaults.
  y_core: 50, // placeholder — replaced by derived value at provider init
  y_cov: 22, // placeholder — replaced by derived value at provider init
  F: 100_000,
  B: 350_000,
  w_sustainable: 12_000,
  N: 100,
  w_min: 4000,
  w_max: 16_000,
  w_default: 9000,
};

export type CurveOutputs = {
  core_w: number;
  cov_w: number;
  collections: number;
  avg_yield: number;
  bonus_per_partner: number;
  next_1k_bonus: number;
};

/** Deterministic outputs — pure function of `w` and inputs. §2 verbatim. */
export function computeAt(w: number, c: CurveInputs): CurveOutputs {
  const core_w = Math.min(w, c.w_core);
  const cov_w = Math.max(0, w - c.w_core);
  const collections = core_w * c.y_core + cov_w * c.y_cov;
  const avg_yield = w > 0 ? collections / w : 0;
  const bonus_per_partner = collections - c.F - c.B;
  const next_1k_bonus = (w < c.w_core ? c.y_core : c.y_cov) * 1000;
  return { core_w, cov_w, collections, avg_yield, bonus_per_partner, next_1k_bonus };
}

/* ----------------------------------------------------------------------
 * §2A — workflow layer (decomposes cov_w; does NOT feed back into the
 * core curve). Each output stays as a separate lens on the SAME cov_w.
 * Inputs are estimates from the worklist (and the group's clinical low-yield
 * definition for avoidable_share) — UI marks them dashed.
 * -------------------------------------------------------------------- */

export type WorkflowLayerInputs = {
  night_share: number; // 0..1 — share of cov_w worked after-hours
  y_night: number; // $/wRVU on after-hours coverage (typically < y_cov)
  avoidable_share: number; // 0..1 — share of cov_w deemed avoidable (low-yield, hospital lever)
};

export const DEFAULT_WORKFLOW_LAYER: WorkflowLayerInputs = {
  night_share: 0.5,
  // y_night is seeded below y_cov at provider init; literal here is placeholder.
  y_night: 18,
  avoidable_share: 0.4,
};

export type WorkflowLayerOutputs = {
  cov_w: number;
  night_w: number;
  afterhours_gap: number;
  avoidable_w: number;
  structural_w: number;
  coverage_shortfall: number;
  avoidable_gap: number;
  structural_gap: number;
};

/** §2A verbatim. Pure function. */
export function computeWorkflowLayer(
  w: number,
  c: CurveInputs,
  wf: WorkflowLayerInputs,
): WorkflowLayerOutputs {
  const cov_w = Math.max(0, w - c.w_core);
  const night_w = cov_w * wf.night_share;
  const afterhours_gap = night_w * (c.y_core - wf.y_night);
  const avoidable_w = cov_w * wf.avoidable_share;
  const structural_w = cov_w * (1 - wf.avoidable_share);
  const coverage_shortfall = cov_w * (c.y_core - c.y_cov);
  const avoidable_gap = avoidable_w * (c.y_core - c.y_cov);
  const structural_gap = structural_w * (c.y_core - c.y_cov);
  // assert per spec — not enforced at runtime to avoid floating-point fragility,
  // but holds by algebra: avoidable_gap + structural_gap
  //   = cov_w*(c.y_core - c.y_cov)*(avoidable_share + (1-avoidable_share))
  //   = coverage_shortfall.
  return {
    cov_w,
    night_w,
    afterhours_gap,
    avoidable_w,
    structural_w,
    coverage_shortfall,
    avoidable_gap,
    structural_gap,
  };
}

/** Sample the bonus curve over [w_min, w_max] for plotting. */
export function sampleBonusCurve(c: CurveInputs, samples = 200): Array<{ w: number; p: number }> {
  const out: Array<{ w: number; p: number }> = [];
  const span = c.w_max - c.w_min;
  for (let i = 0; i <= samples; i++) {
    const w = c.w_min + (span * i) / samples;
    out.push({ w, p: computeAt(w, c).bonus_per_partner });
  }
  return out;
}
