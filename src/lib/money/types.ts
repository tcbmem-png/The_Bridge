// Money model types. Pure data. See docs/native-numbers-spec.md.

export type PayerKey = "medicare" | "medicaid" | "commercial" | "self_pay";

export type PayerMix = Record<PayerKey, number>; // percent points (e.g. 22 means 22%)

export type PayerMultipliers = {
  // Multiples of Medicare CF that each payer effectively collects per wRVU.
  // Medicare is fixed at 1.0 by definition. Self-pay defaults to ~0.
  medicaid: number; // f_md
  commercial: number; // f_comm
  self_pay: number; // typically 0
};

export type MoneyInputs = {
  // Group / radiologist-side
  coverage_volume: number; // ED/trauma/overnight reads per year (count)
  avg_wRVU_per_read: number; // blended wRVU per coverage read
  conversion_factor: number; // $ per wRVU (Medicare CF)
  payer_mix: PayerMix; // shares in percent points, ideally summing to 100
  payer_multipliers: PayerMultipliers;

  // Fall / waste
  fall_share_of_ED: number; // percent of ED coded "fall" (0-100)
  fall_negative_rate: number; // percent of those reads that come back clean (0-100)
  waste_reduction: number; // achievable reduction in needless "fall" reads (0-100)

  // Hospital / CFO-side — entered, not multiplied.
  technical_cost_per_CT: number; // $ per CT, hospital technical-component cost
  denial_writeoff_pct: number; // percent of technical revenue lost to denials/write-offs (0-100)
};

export type MoneyDerived = {
  total_wRVU: number;
  blended_$_per_wRVU: number;
  net_$_per_wRVU_by_payer: Record<PayerKey, number>;

  uncompensated_wRVU: number;
  uncompensated_$: number;

  needless_fall_count: number;
  needless_fall_wRVU: number;
  recoverable_wRVU: number;
  recoverable_$: number;

  // Hospital-side, from CFO-entered values (no multiplier).
  avoided_technical_cost_$: number;
  reduced_denial_writeoffs_$: number;
  hospital_gain_$: number;

  // Headline win-row figures.
  group_gain_per_year_$: number;
  hospital_gain_per_year_$: number;
  fewer_needless_scans_per_year: number;
};
