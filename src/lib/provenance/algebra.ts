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

export type MatchState =
  | "matched"
  | "unmatched"
  | "ambiguous"
  | "contradictory"
  | "not_applicable";

export interface Figure {
  /** null means the record does not establish a value. Never coerce to 0. */
  value: number | null;
  type: ProvenanceType;
  label: string;
  unit?: "usd" | "count" | "wrvu" | "usd_per_wrvu" | "percent" | "days";
  /** Source artefacts / tables that established the inputs. */
  sources?: string[];
  /** Human-readable derivation. */
  formula?: string;
  /** Declared assumption behind a counterfactual or model figure. */
  assumption?: string;
  /** The document or act that would turn an "if" into an "is". */
  closesOn?: string;
  /** Inputs this figure requires, with whether each is satisfied. */
  requires?: { name: string; satisfied: boolean }[];
  /** Conflicting readings, when type is "contradiction". */
  conflict?: { source: string; reading: string }[];
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
    return { label, value: null, type: "gap", ...opts };
  }
  return { label, value, type: "record", ...opts };
}

/** A declared model input. Never a record fact. */
export function model(label: string, value: number, opts: Partial<Figure> = {}): Figure {
  return { label, value, type: "model_derived", ...opts };
}

/** An explicit gap. Carries what would close it. */
export function gap(label: string, opts: Partial<Figure> = {}): Figure {
  return { label, value: null, type: "gap", ...opts };
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

/**
 * Derive a figure from inputs. The resulting provenance type is decided by the
 * algebra, never by the caller — that is the point.
 */
export function derive(
  label: string,
  inputs: Figure[],
  compute: (values: number[]) => number | null,
  opts: Partial<Figure> = {},
): Figure {
  const type = combineType(inputs);
  const base: Figure = {
    label,
    value: null,
    type,
    sources: opts.sources ?? [...new Set(inputs.flatMap((i) => i.sources ?? []))],
    requires:
      opts.requires ??
      inputs.map((i) => ({ name: i.label, satisfied: i.value !== null && i.type !== "gap" })),
    ...opts,
  };
  if (type === "gap" || type === "contradiction") {
    return { ...base, value: null, type };
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
