// Pure money-model math. No side effects. No randomness. No LLM.
// Transcribed from docs/native-numbers-spec.md.

import type { MoneyDerived, MoneyInputs, PayerKey } from "./types";

function pct(n: number): number {
  return n / 100;
}

export function netDollarsPerWRVU(inputs: MoneyInputs): Record<PayerKey, number> {
  const cf = inputs.conversion_factor;
  return {
    medicare: cf,
    medicaid: inputs.payer_multipliers.medicaid * cf,
    commercial: inputs.payer_multipliers.commercial * cf,
    self_pay: inputs.payer_multipliers.self_pay * cf,
  };
}

export function blendedDollarsPerWRVU(inputs: MoneyInputs): number {
  const net = netDollarsPerWRVU(inputs);
  const m = inputs.payer_mix;
  return (
    pct(m.medicare) * net.medicare +
    pct(m.medicaid) * net.medicaid +
    pct(m.commercial) * net.commercial +
    pct(m.self_pay) * net.self_pay
  );
}

export function derive(inputs: MoneyInputs): MoneyDerived {
  const total_wRVU = inputs.coverage_volume * inputs.avg_wRVU_per_read;
  const net_$_per_wRVU_by_payer = netDollarsPerWRVU(inputs);
  const blended = blendedDollarsPerWRVU(inputs);

  // Uncompensated work = self-pay wRVUs in full + Medicaid wRVUs net of what
  // Medicaid actually collects (the "uncollected Medicaid portion").
  // uncollected_md_share_of_total = medicaid_share × (1 − f_md)
  const self_pay_share = pct(inputs.payer_mix.self_pay);
  const medicaid_share = pct(inputs.payer_mix.medicaid);
  const uncollected_md_portion = medicaid_share * (1 - inputs.payer_multipliers.medicaid);
  const uncompensated_wRVU =
    total_wRVU * (self_pay_share + Math.max(0, uncollected_md_portion));

  // Effective rate on that work = Medicare CF (what they would have collected
  // had the work been paid at Medicare). Labeled explicitly in the math drawer.
  const uncompensated_$ = uncompensated_wRVU * inputs.conversion_factor;

  // Needless "fall" reads.
  const needless_fall_count =
    inputs.coverage_volume * pct(inputs.fall_share_of_ED) * pct(inputs.fall_negative_rate);
  const needless_fall_wRVU = needless_fall_count * inputs.avg_wRVU_per_read;
  const recoverable_wRVU = needless_fall_wRVU * pct(inputs.waste_reduction);

  // Capacity freed gets refilled at the blended rate → group $ gain.
  const recoverable_$ = recoverable_wRVU * blended;

  // Hospital-side: CFO-entered values, no multiplier.
  const avoided_scans = needless_fall_count * pct(inputs.waste_reduction);
  const avoided_technical_cost_$ = avoided_scans * inputs.technical_cost_per_CT;
  const reduced_denial_writeoffs_$ =
    avoided_technical_cost_$ * pct(inputs.denial_writeoff_pct);
  const hospital_gain_$ = avoided_technical_cost_$ + reduced_denial_writeoffs_$;

  return {
    total_wRVU,
    blended_$_per_wRVU: blended,
    net_$_per_wRVU_by_payer,
    uncompensated_wRVU,
    uncompensated_$,
    needless_fall_count,
    needless_fall_wRVU,
    recoverable_wRVU,
    recoverable_$,
    avoided_technical_cost_$,
    reduced_denial_writeoffs_$,
    hospital_gain_$,
    group_gain_per_year_$: recoverable_$,
    hospital_gain_per_year_$: hospital_gain_$,
    fewer_needless_scans_per_year: avoided_scans,
  };
}

export function payerMixSum(inputs: MoneyInputs): number {
  const m = inputs.payer_mix;
  return m.medicare + m.medicaid + m.commercial + m.self_pay;
}
