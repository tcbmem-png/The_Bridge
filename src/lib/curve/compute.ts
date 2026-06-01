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
