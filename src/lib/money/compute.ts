// Pure money-model math. No side effects. No randomness. No LLM.
// Transcribed from docs/native-numbers-spec.md, with authored refinements:
// - Split "uncompensated" into no-pay + Medicaid shortfall (subtotal = coverage gap vs Medicare).
// - Hospital pocket = avoided_scans × technical_cost_per_CT only (no compounding).
// - Denial write-off is a SEPARATE permanent-leakage scenario (never compounded).

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

  // --- Two honest lines (split from the old "uncompensated" headline) ---
  // No-pay (self-pay): work that collected nothing, valued at Medicare CF.
  const noPay_wRVU = total_wRVU * pct(inputs.payer_mix.self_pay);
  const noPay_$ = noPay_wRVU * inputs.conversion_factor;

  // Underpayment shortfall: gap vs Medicare on Medicaid volume.
  const medicaidShortfall_wRVU =
    total_wRVU * pct(inputs.payer_mix.medicaid) * (1 - inputs.payer_multipliers.medicaid);
  const medicaidShortfall_$ = medicaidShortfall_wRVU * inputs.conversion_factor;

  // Subtotal — explicitly relabeled. Never call this "uncompensated".
  const coverageGapVsMedicare_$ = noPay_$ + medicaidShortfall_$;

  // --- Needless "fall" reads ---
  const needless_fall_count =
    inputs.coverage_volume * pct(inputs.fall_share_of_ED) * pct(inputs.fall_negative_rate);
  const needless_fall_wRVU = needless_fall_count * inputs.avg_wRVU_per_read;
  const recoverable_wRVU = needless_fall_wRVU * pct(inputs.waste_reduction);

  // Capacity freed gets refilled at the blended rate → group $ gain.
  const recoverable_$ = recoverable_wRVU * blended;

  // --- Hospital-side: clean "cost the hospital didn't incur" ---
  const avoided_scans = needless_fall_count * pct(inputs.waste_reduction);
  const avoided_technical_cost_$ = avoided_scans * inputs.technical_cost_per_CT;
  const hospital_gain_$ = avoided_technical_cost_$; // no compounding, no denial add

  // Separate, optional scenario — permanent write-off recovery.
  const denial_recovery_scenario_$ =
    avoided_technical_cost_$ * pct(inputs.denial_writeoff_pct);

  return {
    total_wRVU,
    blended_$_per_wRVU: blended,
    net_$_per_wRVU_by_payer,

    noPay_wRVU,
    noPay_$,
    medicaidShortfall_wRVU,
    medicaidShortfall_$,
    coverageGapVsMedicare_$,

    needless_fall_count,
    needless_fall_wRVU,
    recoverable_wRVU,
    recoverable_$,

    avoided_scans,
    avoided_technical_cost_$,
    hospital_gain_$,
    denial_recovery_scenario_$,

    group_gain_per_year_$: recoverable_$,
    hospital_gain_per_year_$: hospital_gain_$,
    fewer_needless_scans_per_year: avoided_scans,
  };
}

export function payerMixSum(inputs: MoneyInputs): number {
  const m = inputs.payer_mix;
  return m.medicare + m.medicaid + m.commercial + m.self_pay;
}
