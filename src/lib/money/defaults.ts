// Benchmark defaults. Every value carries its source label.
// Defaults are anchors, not assertions — the group replaces with actuals.

import type { MoneyInputs } from "./types";

export type BenchmarkNote = {
  value: number | string;
  unit: string;
  source: string;
  note?: string;
};

// Public benchmark anchors — visible in UI next to each input.
export const BENCHMARKS = {
  conversion_factor_2026_nonQP: {
    value: 33.4,
    unit: "$/wRVU",
    source: "CMS CY2026 MPFS final rule — non-QP",
  },
  conversion_factor_2026_QP: {
    value: 33.57,
    unit: "$/wRVU",
    source: "CMS CY2026 MPFS final rule — QP",
  },
  work_rvu_efficiency_cut_2026: {
    value: -2.5,
    unit: "%",
    source: "CMS CY2026 — efficiency cut on non-time-based codes",
    note: "Shrinks imaging wRVUs.",
  },
  commercial_vs_medicare_range: {
    value: "150–300%",
    unit: "% of Medicare",
    source: "Industry range — replace with the group's contracts",
  },
  medicaid_vs_medicare_note: {
    value: "varies by state",
    unit: "% of Medicare",
    source: "State-specific; commonly well below Medicare — replace with actual",
  },
  self_pay_collection: {
    value: "~0",
    unit: "% of charge",
    source: "Pro-fee self-pay collection is near zero — replace with actual",
  },
  ed_payer_mix: {
    value: "site-specific",
    unit: "%",
    source: "Replace with the group's actual ED mix",
  },
  avg_wRVU_per_ED_read: {
    value: 0.9,
    unit: "wRVU/read",
    source: "Derive from modality mix or CPT→RVU (CMS public RVU file)",
    note: "ED skews CT.",
  },
  radiologist_comp_per_wRVU: {
    value: "MGMA / RBMA range",
    unit: "$/wRVU",
    source: "MGMA / RBMA benchmark range — verify; replace with effective rate",
  },
} as const;

// Midpoint defaults for the model — labeled as replaceable.
// Commercial: midpoint of 150–300% range = 2.25.
// Medicaid: no quantified range in spec; use 0.65 as a credible commonly-cited
//   midpoint placeholder. The UI must show "varies widely — replace".
// Self-pay: ~0.
export const DEFAULT_INPUTS: MoneyInputs = {
  coverage_volume: 150_000,
  avg_wRVU_per_read: 0.9,
  conversion_factor: 33.4,
  payer_mix: {
    medicare: 22,
    medicaid: 30,
    commercial: 33,
    self_pay: 15,
  },
  payer_multipliers: {
    medicaid: 0.65, // midpoint placeholder — replace
    commercial: 2.25, // midpoint of 150–300%
    self_pay: 0,
  },
  fall_share_of_ED: 12,
  fall_negative_rate: 55,
  waste_reduction: 20,

  // Hospital-side — CFO enters; defaults are illustrative anchors only.
  technical_cost_per_CT: 220, // illustrative; CFO replaces with actual
  denial_writeoff_pct: 8, // illustrative; CFO replaces with actual
};

// Per-input source labels for the UI.
export const INPUT_SOURCES: Record<keyof MoneyInputs | "payer_mix.medicare" | "payer_mix.medicaid" | "payer_mix.commercial" | "payer_mix.self_pay" | "f_md" | "f_comm", string> = {
  coverage_volume: "ED/trauma/overnight reads per year — replace with actual.",
  avg_wRVU_per_read: "CMS public RVU file via CPT→RVU. ED skews CT.",
  conversion_factor: "CMS CY2026 MPFS — $33.40 non-QP / $33.57 QP.",
  payer_mix: "Site-specific — replace with the group's actual ED mix.",
  payer_multipliers: "Multiples of Medicare — replace with contracted rates.",
  fall_share_of_ED: "Illustrative — replace with measured share.",
  fall_negative_rate: "Illustrative — replace with measured negative-read rate.",
  waste_reduction: "Achievable reduction in needless reads — your assumption.",
  technical_cost_per_CT: "Hospital-entered technical cost per CT.",
  denial_writeoff_pct: "Hospital-entered denial/write-off percent on technical revenue.",
  "payer_mix.medicare": "Site-specific.",
  "payer_mix.medicaid": "Site-specific.",
  "payer_mix.commercial": "Site-specific.",
  "payer_mix.self_pay": "Site-specific.",
  f_md: "Medicaid varies widely by state; often well below Medicare — replace.",
  f_comm: "Commercial range ~150–300% of Medicare — replace with contracts.",
};
