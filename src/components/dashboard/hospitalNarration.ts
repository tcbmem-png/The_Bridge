// Hospital-lens narration. RE-NARRATION ONLY — the underlying values
// (panel ids, sources, money figures) are unchanged. Group and Hospital views
// of the same panel reconcile to the dollar because both read useMoney() and
// the engine spec.
//
// Copy is PROVISIONAL — pending human tone pass. Posture: shared scoreboard,
// opportunity not accusation, win-win. Acronyms expanded on first use:
//   TAT = turnaround time · ED = emergency department · DUA = data-use agreement
//   CARC = claim adjustment reason code · EHR = electronic health record
//   FMV = fair market value · AKS = Anti-Kickback Statute (deal terms live with counsel)

export type HospitalNarration = {
  title: string;
  caption: string;
  theme: 1 | 2 | 3 | 4 | 5; // matches the five themes in the spec
};

// Panel id (from Dashboard PANELS registry) → hospital re-narration.
// Only panels with a hospital re-narration appear here; others fall through
// to their group-lens title.
export const HOSPITAL_PANEL: Record<number, HospitalNarration> = {
  // 1) ED throughput / turnaround
  8: {
    title: "ED throughput · turnaround time (TAT)",
    caption:
      "Every minute off the read is a minute off the boarding clock.",
    theme: 1,
  },
  // 2) Appropriate utilization (the fall)
  7: {
    title: "Appropriate utilization · the fall",
    caption:
      "The low-yield scan costs everyone — start by seeing it. Dollars, radiation, ED crowding.",
    theme: 2,
  },
  // 3) Shared leakage — same CARC pattern, both sides
  5: {
    title: "Shared leakage · denials by CARC",
    caption:
      "The denial that hurts the read often hurts the room too. One pattern, two beneficiaries.",
    theme: 3,
  },
  // 4) Coverage value & stability
  2: {
    title: "Coverage value · blended $/wRVU",
    caption:
      "What dependable coverage is worth, in the unit hospital finance already uses.",
    theme: 4,
  },
  4: {
    title: "Coverage value · uncompensated work",
    caption:
      "What reliable, measurable coverage absorbs — fair value for mandated service.",
    theme: 4,
  },
  // 5) Quality & defensibility — measurable service levels, useful regardless of any negotiation
  1: {
    title: "Quality & defensibility · net collection rate",
    caption: "Measurable, auditable — useful to both sides independent of any negotiation.",
    theme: 5,
  },
};

// Lost-study (★) re-narration. Same number ($, count) — different chair.
export const HOSPITAL_LOST_STUDY = {
  title: "Shared leakage · lost-study reconciliation",
  caption:
    "Work already done, charge never dropped. The same join surfaces unbilled technical charges once a DUA is in place.",
};

// Hospital-owned cuts that REQUIRE a DUA (data-use agreement) to render.
// We never bluff a number here. Each row is a labeled, replaceable
// placeholder — sourced — until the join exists. Turning the access wrinkle
// into the reason to collaborate: prove value on group-owned data first; a
// DUA unlocks the joint picture.
export const DUA_GATED_CUTS: Array<{
  label: string;
  unit: string;
  needs: string;
  note: string;
}> = [
  {
    label: "Technical billing · denials & underpayments",
    unit: "$",
    needs: "hospital 837/835 (technical side)",
    note:
      "Same CARC patterns, hospital-side. Replaceable placeholder until the DUA-joined view exists.",
  },
  {
    label: "ED boarding · time saved by faster reads",
    unit: "minutes / $",
    needs: "EHR ED timestamps + hospital operations finance",
    note:
      "No bluffed benchmark. A hospital-supplied minute-cost would replace this — sourced, not invented.",
  },
  {
    label: "Order appropriateness by ordering provider",
    unit: "% / $",
    needs: "EHR orders + indication text",
    note:
      "Joint view of the fall by referrer. Hospital ordering reform is a shared lever.",
  },
];
