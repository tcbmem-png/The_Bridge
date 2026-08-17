// Provenance algebra.
//
// Doctrine encoded as code:
//   RECORD + RECORD            -> RECORD-DERIVED
//   RECORD + MODEL             -> COUNTERFACTUAL
//   MODEL  + MODEL             -> MODEL-DERIVED
//   any required input missing -> GAP
//   any unresolved conflict    -> CONTRADICTION
//
//   A model assumption may fill a gap. It may never overwrite a record fact.
//   Unknown is not zero.
//   Every "if" points at the act that would make it an "is."

export type ProvenanceType =
  | "record"
  | "record_derived"
  | "counterfactual"
  | "model_derived"
  | "gap"
  | "contradiction";

/**
 * WHOSE account a figure comes from. A separate dimension from provenance:
 * provenance says what kind of statement it is, authorship says who asserted
 * it. A payer's number, the vendor's number, the bank's number and a computed
 * number are different evidence classes even when they agree.
 */
export type AuthoredBy =
  | "group"
  | "clinical_system"
  | "payer"
  | "rcm"
  | "bank"
  | "cms"
  | "external_reference"
  | "computed"
  | "model";

export const AUTHORED_BY_LABEL: Record<AuthoredBy, string> = {
  group: "GROUP",
  clinical_system: "CLINICAL SYSTEM",
  payer: "PAYER",
  rcm: "RCM VENDOR",
  bank: "BANK",
  cms: "CMS",
  external_reference: "EXTERNAL REFERENCE",
  computed: "COMPUTED",
  model: "MODEL",
};

/**
 * GAP is not one thing. Each reason is a different honest way of saying
 * "I cannot know this" — and none of them is zero.
 */
export type GapReason =
  | "uncovered" // reference needed to price/measure the row is absent
  | "unmeasurable" // required source fields are not available
  | "unmappable" // the record has no reliable counterpart
  | "unresolved" // the record exists, its lifecycle is incomplete
  | "refused"; // a non-record input was refused entry to a governed total

export const GAP_REASON_LABEL: Record<GapReason, string> = {
  uncovered: "UNCOVERED",
  unmeasurable: "UNMEASURABLE",
  unmappable: "UNMAPPABLE",
  unresolved: "UNRESOLVED",
  refused: "REFUSED",
};

export type MatchState =
  | "matched"
  | "unmatched"
  | "ambiguous"
  | "contradictory"
  | "not_applicable";

/**
 * The no-swallow partition vocabulary. Every row entering a reconciliation
 * universe lands in exactly one of these, and the classes sum to the total.
 */
export type Disposition =
  | "resolved_clean"
  | "resolved_repaired"
  | "unmatched"
  | "ambiguous"
  | "contradictory"
  | "uncovered"
  | "unresolved"
  | "not_applicable";

export const DISPOSITION_LABEL: Record<Disposition, string> = {
  resolved_clean: "RESOLVED — CLEAN",
  resolved_repaired: "RESOLVED — REPAIRED",
  unmatched: "UNMATCHED",
  ambiguous: "AMBIGUOUS",
  contradictory: "CONTRADICTORY",
  uncovered: "UNCOVERED",
  unresolved: "UNRESOLVED",
  not_applicable: "NOT APPLICABLE",
};

/** A deterministic repair. Allowed. Never silent. */
export interface Repair {
  rule: string;
  field: string;
  original: string | null;
  normalized: string | null;
  source: string;
}

export interface Figure {
  /** null means the record does not establish a value. Never coerce to 0. */
  value: number | null;
  type: ProvenanceType;
  label: string;
  unit?: "usd" | "count" | "wrvu" | "usd_per_wrvu" | "percent" | "days";
  /** Whose account this is. Multiple accounts for a derived figure. */
  authoredBy?: AuthoredBy[];
  /** Which of the four source stages this figure is admissible at. */
  stage?: "own_books" | "the_wire" | "their_ledger" | "their_story";
  /** Source artefacts / tables that established the inputs. */
  sources?: string[];
  /** Human-readable derivation. */
  formula?: string;
  /** Declared assumption behind a counterfactual or model figure. */
  assumption?: string;
  /** The document or act that would turn an "if" into an "is". */
  closesOn?: string;
  /** Why this is a gap, when it is one. */
  gapReason?: GapReason;
  /** Inputs this figure requires, with whether each is satisfied. */
  requires?: { name: string; satisfied: boolean }[];
  /** Conflicting readings, when type is "contradiction". */
  conflict?: { source: string; reading: string }[];
  /** Deterministic repairs standing behind the value. */
  repairs?: Repair[];
  /** Basis note when a denominator excludes uncovered rows. */
  coveredBasis?: { covered: number; uncovered: number };
  note?: string;
}

export const PROVENANCE_LABEL: Record<ProvenanceType, string> = {
  record: "RECORD",
  record_derived: "RECORD-DERIVED",
  counterfactual: "COUNTERFACTUAL",
  model_derived: "MODEL-DERIVED",
  gap: "GAP",
  contradiction: "CONTRADICTION",
};


/** A figure that may legitimately enter a governed rollup. */
export function isGoverned(f: Figure): boolean {
  return f.type === "record" || f.type === "record_derived";
}

export function isKnown(f: Figure): boolean {
  return f.value !== null && f.type !== "gap" && f.type !== "contradiction";
}

/** Record fact straight from a source line. */
export function record(
  label: string,
  value: number | null,
  opts: Partial<Figure> = {},
): Figure {
  if (value === null) {
    return { label, value: null, type: "gap", gapReason: "unmeasurable", ...opts };
  }
  return { label, value, type: "record", ...opts };
}

/** A declared model input. Never a record fact. */
export function model(label: string, value: number, opts: Partial<Figure> = {}): Figure {
  return { label, value, type: "model_derived", authoredBy: ["model"], ...opts };
}

/** An explicit gap. Carries why, and what would close it. */
export function gap(label: string, opts: Partial<Figure> = {}): Figure {
  return { label, value: null, type: "gap", gapReason: "unmeasurable", ...opts };
}

export function contradiction(
  label: string,
  conflict: { source: string; reading: string }[],
  opts: Partial<Figure> = {},
): Figure {
  return { label, value: null, type: "contradiction", conflict, ...opts };
}

function combineType(inputs: Figure[]): ProvenanceType {
  if (inputs.some((i) => i.type === "contradiction")) return "contradiction";
  if (inputs.some((i) => i.type === "gap" || i.value === null)) return "gap";
  if (inputs.some((i) => i.type === "counterfactual")) return "counterfactual";
  const hasRecord = inputs.some((i) => i.type === "record" || i.type === "record_derived");
  const hasModel = inputs.some((i) => i.type === "model_derived");
  if (hasRecord && hasModel) return "counterfactual";
  if (hasModel) return "model_derived";
  return "record_derived";
}

/** Union of the accounts standing behind a set of inputs. */
export function mergeAuthors(inputs: Figure[]): AuthoredBy[] {
  return [...new Set(inputs.flatMap((i) => i.authoredBy ?? []))];
}

/**
 * Derive a figure from inputs. The resulting provenance type is decided by the
 * algebra, never by the caller — that is the point. Authorship is carried
 * through: a computed figure names the accounts it drew on.
 */
export function derive(
  label: string,
  inputs: Figure[],
  compute: (values: number[]) => number | null,
  opts: Partial<Figure> = {},
): Figure {
  const type = combineType(inputs);
  const inputAuthors = mergeAuthors(inputs);
  const base: Figure = {
    label,
    value: null,
    type,
    authoredBy: opts.authoredBy ?? ["computed", ...inputAuthors],
    sources: opts.sources ?? [...new Set(inputs.flatMap((i) => i.sources ?? []))],
    requires:
      opts.requires ??
      inputs.map((i) => ({ name: i.label, satisfied: i.value !== null && i.type !== "gap" })),
    repairs: opts.repairs ?? inputs.flatMap((i) => i.repairs ?? []),
    ...opts,
  };
  if (type === "gap" || type === "contradiction") {
    const missing = inputs.find((i) => i.value === null || i.type === "gap");
    return {
      ...base,
      value: null,
      type,
      gapReason: opts.gapReason ?? missing?.gapReason ?? "unmeasurable",
      closesOn: opts.closesOn ?? missing?.closesOn,
    };
  }
  const values = inputs.map((i) => i.value as number);
  const value = compute(values);
  return { ...base, value, type: value === null ? "gap" : type };
}


/**
 * Counterfactual: a declared assumption stands in for a missing fact.
 * The gap it sits beside is never replaced — callers render both.
 */
export function counterfactual(
  label: string,
  inputs: Figure[],
  compute: (values: number[]) => number | null,
  meta: { assumption: string; closesOn: string; formula?: string; unit?: Figure["unit"] },
): Figure {
  const usable = inputs.filter((i) => i.value !== null);
  if (usable.length !== inputs.length) {
    return {
      label,
      value: null,
      type: "gap",
      closesOn: meta.closesOn,
      requires: inputs.map((i) => ({ name: i.label, satisfied: i.value !== null })),
    };
  }
  return {
    label,
    value: compute(inputs.map((i) => i.value as number)),
    type: "counterfactual",
    assumption: meta.assumption,
    closesOn: meta.closesOn,
    formula: meta.formula,
    unit: meta.unit,
    sources: [...new Set(inputs.flatMap((i) => i.sources ?? []))],
  };
}

/**
 * Governed sum. Counterfactual and model figures are refused, not silently
 * folded in. Unknowns are reported as a bounded partial sum.
 */
export function sumGoverned(
  label: string,
  inputs: Figure[],
  opts: Partial<Figure> = {},
): Figure {
  const ungoverned = inputs.filter((i) => !isGoverned(i) && i.type !== "gap");
  if (ungoverned.length) {
    return {
      label,
      value: null,
      type: "gap",
      note: `Refused: ${ungoverned.length} non-record input(s) cannot enter a governed total.`,
      ...opts,
    };
  }
  const known = inputs.filter((i) => i.value !== null);
  const missing = inputs.length - known.length;
  const value = known.reduce((s, i) => s + (i.value as number), 0);
  if (missing > 0) {
    return {
      label,
      value,
      type: "record_derived",
      note: `Partial: ${missing} of ${inputs.length} inputs are unknown and are excluded, not counted as zero.`,
      ...opts,
    };
  }
  return { label, value, type: "record_derived", ...opts };
}

/** Realized professional yield — the product's first general-purpose metric. */
export function realizedYield(paid: Figure, wrvu: Figure): Figure {
  return derive(
    "Realized $ / wRVU",
    [paid, wrvu],
    ([p, w]) => (w === 0 ? null : p / w),
    {
      unit: "usd_per_wrvu",
      formula: "professional dollars received / physician work units",
    },
  );
}
