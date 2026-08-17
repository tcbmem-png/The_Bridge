// The four-stage source ladder.
//
//   YOUR OWN BOOKS  →  THE WIRE  →  THEIR RAW LEDGER  →  THEIR STORY
//
// The ladder answers one question: what can be known with the sources the
// group has right now? Each stage adds an evidence class. It never rewrites
// the stage below it.
//
//   MORE EVIDENCE → MORE RESOLUTION
//   NOT
//   MORE EVIDENCE → REWRITE PRIOR EVIDENCE
//
// Stage isolation is enforced in code (see `sourcesForStage` / `assertIsolated`)
// and tested, not merely described.

export type StageId = "own_books" | "the_wire" | "their_ledger" | "their_story";

export const STAGE_ORDER: StageId[] = [
  "own_books",
  "the_wire",
  "their_ledger",
  "their_story",
];

export interface StageSource {
  /** Logical source key, matching the loader's SourceSpec.key. */
  key: string;
  label: string;
  required: boolean;
}

export interface StageDef {
  id: StageId;
  n: number;
  label: string;
  /** What this stage's evidence can establish on its own. */
  establishes: string[];
  /** What it structurally cannot, no matter how clean the files are. */
  cannotEstablish: string[];
  sources: StageSource[];
  /** The next data request this stage implies. */
  closesOn: string;
}

export const STAGES: StageDef[] = [
  {
    id: "own_books",
    n: 1,
    label: "Your own books",
    establishes: [
      "work performed, at the grain the clinical export carries",
      "work units where a reference schedule covers the code",
      "cash that arrived, under a declared deposit-classification rule",
      "a single, honestly tangled difference between the two",
    ],
    cannotEstablish: [
      "claim lifecycle",
      "payer adjudication",
      "denial cause",
      "contracted rate",
      "which specific step lost the money",
    ],
    sources: [
      { key: "encounter", label: "Clinical work export", required: true },
      { key: "mpfs", label: "Work-unit reference (e.g. MPFS)", required: true },
      { key: "bank", label: "Bank / treasury activity", required: true },
      { key: "physician", label: "Physician roster", required: false },
      { key: "facility", label: "Facility / site reference", required: false },
      { key: "pos", label: "Place-of-service reference", required: false },
      { key: "service_family", label: "Service-family map", required: false },
    ],
    closesOn:
      "A claim-level export (837) and remittance advice (835). Until those load, the difference between work and cash stays a single tangled gap — it is not carved, priced, or attributed.",
  },
  {
    id: "the_wire",
    n: 2,
    label: "The wire",
    establishes: [
      "which work became a claim, and which did not",
      "what the payer adjudicated: allowed, denied, adjusted, patient responsibility",
      "payer payment by remittance, separate from cash",
      "a carve of the tangled gap into named slices, plus an explicit remainder",
    ],
    cannotEstablish: [
      "what the billing vendor posted, wrote off, or worked",
      "contractual entitlement without the governing agreement",
      "why cash and remittance differ, when no trace matches",
    ],
    sources: [
      { key: "claims", label: "Claim-line export (837)", required: true },
      { key: "remit", label: "Remittance advice (835 / ERA)", required: true },
      { key: "payer", label: "Payer reference", required: false },
      { key: "denial", label: "Denial-code reference", required: false },
      { key: "rate_card", label: "Rate card / contracted schedule", required: false },
    ],
    closesOn:
      "The vendor's raw ledger, posting detail, AR aging and denial worklist. Only what remains unexplained after the carve is worth asking for.",
  },
  {
    id: "their_ledger",
    n: 3,
    label: "Their raw ledger",
    establishes: [
      "what the vendor posted against each payer payment",
      "what was written off, and under which reason",
      "which denials were worked and which went stale",
      "named fees or deductions sitting between remittance and cash",
    ],
    cannotEstablish: [
      "whether a disagreement is error, methodology, or misconduct — that is surfaced, not adjudicated",
    ],
    sources: [
      { key: "rcm_ledger", label: "RCM raw ledger / posting export", required: true },
      { key: "rcm_ar_aging", label: "AR aging", required: false },
      { key: "rcm_denial_worklist", label: "Denial worklist", required: false },
    ],
    closesOn:
      "The processed monthly report the group is actually shown, so the story can be tested against both the payer's account and the vendor's own raw account.",
  },
  {
    id: "their_story",
    n: 4,
    label: "Their story",
    establishes: [
      "whether each reported figure matches the payer record",
      "whether it matches the vendor's own raw ledger",
      "whether a difference is methodology rather than error",
      "which reported figures are not independently testable at all",
    ],
    cannotEstablish: [
      "intent",
      "any conclusion the underlying records do not carry",
    ],
    sources: [
      { key: "processed_report", label: "Processed report / dashboard export", required: true },
    ],
    closesOn:
      "Nothing further in the data. What remains after Stage 4 is a question for the parties, asked with the record in hand.",
  },
];

export type StageStatus = "available" | "partial" | "not_loaded";

export interface StageAvailability {
  stage: StageDef;
  status: StageStatus;
  present: string[];
  missingRequired: string[];
  missingOptional: string[];
}

/** Which stage a given source key belongs to. Unknown keys belong to no stage. */
export function stageOfSource(key: string): StageId | null {
  for (const s of STAGES) if (s.sources.some((x) => x.key === key)) return s.id;
  return null;
}

/** Every source key admissible at or below a stage. */
export function sourcesForStage(stage: StageId): string[] {
  const cut = STAGE_ORDER.indexOf(stage);
  return STAGES.filter((s) => STAGE_ORDER.indexOf(s.id) <= cut).flatMap((s) =>
    s.sources.map((x) => x.key),
  );
}

/**
 * Stage isolation, as a testable function: a figure computed at `stage` may
 * only cite sources belonging to that stage or below. Returns the offenders.
 */
export function isolationViolations(stage: StageId, usedSourceKeys: string[]): string[] {
  const allowed = new Set(sourcesForStage(stage));
  return usedSourceKeys.filter((k) => !allowed.has(k));
}

/** Compute stage availability from the set of source keys that actually loaded. */
export function availability(loadedKeys: Set<string>): StageAvailability[] {
  return STAGES.map((stage) => {
    const present = stage.sources.filter((s) => loadedKeys.has(s.key)).map((s) => s.key);
    const missingRequired = stage.sources
      .filter((s) => s.required && !loadedKeys.has(s.key))
      .map((s) => s.key);
    const missingOptional = stage.sources
      .filter((s) => !s.required && !loadedKeys.has(s.key))
      .map((s) => s.key);
    const status: StageStatus =
      missingRequired.length === 0 && present.length > 0
        ? "available"
        : present.length > 0
          ? "partial"
          : "not_loaded";
    return { stage, status, present, missingRequired, missingOptional };
  });
}

/** The highest stage whose required sources are all present. */
export function highestAvailableStage(rows: StageAvailability[]): StageId | null {
  let best: StageId | null = null;
  for (const id of STAGE_ORDER) {
    const r = rows.find((x) => x.stage.id === id);
    if (r && r.status === "available") best = id;
    else break;
  }
  return best;
}
