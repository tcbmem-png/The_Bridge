// Timing pins for the scan-journey explainer (Module B). Illustrative.
// Read by JourneyScrubber — never hardcoded in components.
// charge_lag_days: typical lag between date_of_service and claim_submission_date.
// maturity_window_days_N: window after submission within which a charge is
// considered "not yet a denial" — a paid signal can still land.

export const TIMING_PINS = {
  charge_lag_days: 21,
  maturity_window_days_N: 90,
} as const;

// Canonical record (the engine's Fact). Keyed on accession + date_of_service.
// Field order here mirrors the order in which each system lane emits the field.
export type MaturityClass = "production" | "charge_capture" | "payment_realized";

export type CanonicalFieldSpec = {
  key: string;
  lane: "workflow" | "production" | "billing";
  emit_day: number; // illustrative day offset from date_of_service
  maturity_class: MaturityClass;
  label: string;
};

// Illustrative emit days are derived from TIMING_PINS, not hardcoded.
export const CANONICAL_FIELDS: CanonicalFieldSpec[] = [
  { key: "accession",             lane: "workflow",   emit_day: 0,                                  maturity_class: "production",        label: "accession" },
  { key: "date_of_service",       lane: "workflow",   emit_day: 0,                                  maturity_class: "production",        label: "date_of_service" },
  { key: "ordered_ts",            lane: "workflow",   emit_day: 0,                                  maturity_class: "production",        label: "ordered_ts" },
  { key: "site",                  lane: "workflow",   emit_day: 0,                                  maturity_class: "production",        label: "site" },
  { key: "modality",              lane: "workflow",   emit_day: 0,                                  maturity_class: "production",        label: "modality" },
  { key: "read_assigned_ts",      lane: "workflow",   emit_day: 0,                                  maturity_class: "production",        label: "read_assigned_ts" },
  { key: "cpt",                   lane: "production", emit_day: 1,                                  maturity_class: "production",        label: "cpt" },
  { key: "reading_radiologist",   lane: "production", emit_day: 1,                                  maturity_class: "production",        label: "reading_radiologist" },
  { key: "report_finalized_ts",   lane: "production", emit_day: 1,                                  maturity_class: "production",        label: "report_finalized_ts → wRVU" },
  { key: "payer",                 lane: "billing",    emit_day: TIMING_PINS.charge_lag_days,        maturity_class: "charge_capture",    label: "payer" },
  { key: "charge",                lane: "billing",    emit_day: TIMING_PINS.charge_lag_days,        maturity_class: "charge_capture",    label: "charge" },
  { key: "icd10",                 lane: "billing",    emit_day: TIMING_PINS.charge_lag_days,        maturity_class: "charge_capture",    label: "icd10 (the fall lives here)" },
  { key: "claim_submission_date", lane: "billing",    emit_day: TIMING_PINS.charge_lag_days,        maturity_class: "charge_capture",    label: "claim_submission_date" },
  { key: "paid",                  lane: "billing",    emit_day: TIMING_PINS.maturity_window_days_N, maturity_class: "payment_realized",  label: "paid" },
  { key: "payment_posting_date",  lane: "billing",    emit_day: TIMING_PINS.maturity_window_days_N, maturity_class: "payment_realized",  label: "payment_posting_date" },
];
