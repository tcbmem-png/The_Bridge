// Authored pins. The DEFAULT group is shipped as labeled assumptions — visibly adjustable, never silent.
// The HUMAN-GATED group is NOT defaulted: it is surfaced for a human to author and does not block Phases 0-2.
// (Recipe §5 + Transmission §9. The engine reads pins from here; nothing is hardcoded in logic.)

export interface Pins {
  // ---- DEFAULTED (assumptions; adjust here) ----
  maturity_window_days_N: number;   // N: within this, a claim is PENDING, not denied
  charge_lag_days: number;          // within this, a read with no charge yet is PENDING-CAPTURE, not lost_work (the twin of N)
  provisional_band_months_M: number; // M: trailing months shaded on payment-realized metrics
  default_lens: "accrual" | "cash"; // accrual recommended; cash is a CFO toggle
  month_basis: "calendar" | "fiscal";
  bridge_requires_site: boolean;    // composite-bridge tier rule
  cms_rvu_file_version: string;     // versioned reference (config, never hardcoded in logic)
  conversion_factor: number;        // $/wRVU Medicare anchor (CY2026 non-QP)
  reference_date: ISO;              // "now" for maturity; set per load, not wall-clock, so runs are deterministic

  // ---- TRANSMISSION — DEFAULTED (assumptions; adjust here) ----
  shift_definition: { night_start_hour: number; night_end_hour: number; weekends_after_hours: boolean };
  site_grouping: { childrens_sites: string[] }; // which site labels roll up as "childrens" vs "system"

  // ---- HUMAN-GATED (surfaced, NOT guessed) ----
  low_yield_definition: LowYieldDefinition | null; // CLINICAL — Jonathan/the group. null = seam, placeholder used + flagged.
  patient_key_hashing: string | null;              // counsel; gates Phase 5 real-data ingestion
  stipend_evidence_scope: string | null;           // counsel; gates the structural output pack
  cross_coverage: CrossCoverageRule | null;        // SEAM — "reading outside subspecialty" (credentialing pin)
}

export interface CrossCoverageRule {
  // radiologist subspecialty vs the study's subspecialty; a mismatch = cross-coverage (e.g., peds fellow reading adult CT at 3am).
  radiologist_subspecialty: Record<string, string>;
  cpt_subspecialty: Record<string, string>;
}

type ISO = string;

export interface LowYieldDefinition {
  // e.g., a set of {indicationICD10, procedureCPT} pairs the group deems reflexively low-yield ("fall" pan-scan).
  // Until the group authors this, the night-block yield cut runs against PLACEHOLDER and is flagged not-meaningful.
  pairs: Array<{ icd10_prefix: string; cpt: string }>;
  authored_by: string;
}

export const DEFAULT_PINS: Pins = {
  // labeled assumptions — confirmed defaults from the kickoff
  maturity_window_days_N: 90,        // ASSUMPTION (default) — payment run-out ~60-120d; 90 is the midpoint
  charge_lag_days: 21,               // ASSUMPTION (default) — charge typically posts within ~3 weeks of the read
  provisional_band_months_M: 4,      // ASSUMPTION (default) — shade trailing 4 months on payment metrics
  default_lens: "accrual",           // CONFIRMED — accrual default, cash toggle available
  month_basis: "calendar",           // CONFIRMED
  bridge_requires_site: false,       // ASSUMPTION (default) — DOS+patient+CPT+provider; site not required
  cms_rvu_file_version: "CY2026",    // CONFIRMED — current CMS file
  conversion_factor: 33.40,          // CONFIRMED — CY2026 non-QP
  reference_date: "2026-05-31",      // deterministic "now" for maturity (set per load)

  // transmission — labeled assumptions
  shift_definition: { night_start_hour: 19, night_end_hour: 7, weekends_after_hours: true }, // ASSUMPTION (default) — 7pm-7am + weekends
  site_grouping: { childrens_sites: ["childrens"] }, // ASSUMPTION (default)

  // seams — human must author; do NOT guess
  low_yield_definition: null,        // SEAM — clinical pin, Jonathan/the group
  patient_key_hashing: null,         // SEAM — counsel; Phase 5 gate
  stipend_evidence_scope: null,      // SEAM — counsel
  cross_coverage: null,              // SEAM — credentialing/subspecialty pin
};

// A placeholder low-yield rule used ONLY to exercise the night-block seam while the real definition is pending.
// Flagged everywhere it is used so it is never mistaken for an authored clinical judgment.
export const PLACEHOLDER_LOW_YIELD: LowYieldDefinition = {
  pairs: [{ icd10_prefix: "W19", cpt: "70450" }], // "fall" (W19 unspecified fall) → head CT, illustrative only
  authored_by: "PLACEHOLDER — NOT a clinical judgment; awaiting the group's definition",
};
