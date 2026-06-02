// Illustrative defaults — labeled placeholders awaiting the group's clinical leadership.
// The site list, is_catch_site, shares, and mixes are all pins.
//
// Group anchors (W_total, C_total) are NOT exposed by the money config today;
// surfaced here as labeled illustrative anchors per the §/site spec.
import type { Site } from "./types";

export const W_TOTAL_DEFAULT = 1_000_000; // wRVU/yr · illustrative anchor
export const C_TOTAL_DEFAULT = 60_000_000; // $/yr collections · illustrative anchor

export const DEFAULT_SITES: Site[] = [
  {
    id: "ed",
    label: "Emergency Dept",
    kind: "hospital",
    is_catch_site: true,
    wrvu_share: 0.30,
    payer_mix: { medicare: 0.20, medicaid: 0.45, commercial: 0.10, self_pay: 0.25 },
    pin: "illustrative",
  },
  {
    id: "peds_er",
    label: "Pediatric ER",
    kind: "hospital",
    is_catch_site: true,
    wrvu_share: 0.12,
    payer_mix: { medicare: 0.15, medicaid: 0.50, commercial: 0.10, self_pay: 0.25 },
    pin: "illustrative",
  },
  {
    id: "surgery",
    label: "Surgery",
    kind: "hospital",
    is_catch_site: false,
    wrvu_share: 0.20,
    payer_mix: { medicare: 0.25, medicaid: 0.15, commercial: 0.55, self_pay: 0.05 },
    pin: "illustrative",
  },
  {
    id: "inpatient",
    label: "Inpatient",
    kind: "hospital",
    is_catch_site: false,
    wrvu_share: 0.18,
    payer_mix: { medicare: 0.35, medicaid: 0.20, commercial: 0.40, self_pay: 0.05 },
    pin: "illustrative",
  },
  {
    id: "outside",
    label: "Outside Specialty",
    kind: "group_outside",
    is_catch_site: false,
    wrvu_share: 0.20,
    payer_mix: { medicare: 0.20, medicaid: 0.05, commercial: 0.73, self_pay: 0.02 },
    pin: "illustrative",
  },
];

/** Coarse per-site payer-mix presets — illustrative until billing-by-site is joined. */
export type MixPresetKey = "er_medicaid_heavy" | "specialty_commercial_heavy" | "inpatient_mixed";

export const MIX_PRESETS: Record<MixPresetKey, { label: string; mix: Site["payer_mix"] }> = {
  er_medicaid_heavy: {
    label: "ER / Medicaid-heavy",
    mix: { medicare: 0.20, medicaid: 0.45, commercial: 0.10, self_pay: 0.25 },
  },
  specialty_commercial_heavy: {
    label: "Specialty / commercial-heavy",
    mix: { medicare: 0.22, medicaid: 0.05, commercial: 0.71, self_pay: 0.02 },
  },
  inpatient_mixed: {
    label: "Inpatient / mixed",
    mix: { medicare: 0.35, medicaid: 0.20, commercial: 0.40, self_pay: 0.05 },
  },
};
