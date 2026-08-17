// Which source is this file? Decided by header signature against the source
// contract — never by sampling the values, which would let a shape bug pass as
// a match. Three outcomes are all visible: detected, ambiguous, unrecognized.
// A file is never silently ignored because its name looked wrong.

import { SOURCES, type SourceSpec } from "../../../harness/runtime/recordDb";

export type DetectionStatus = "detected" | "ambiguous" | "unrecognized";

export interface Detection {
  status: DetectionStatus;
  /** The chosen spec, when status is "detected". */
  spec: SourceSpec | null;
  /** Every spec that scored above the floor, best first. */
  candidates: { key: string; label: string; score: number; missing: string[] }[];
  /** Header columns the source contract does not consume. */
  extraColumns: string[];
  reason: string;
}

export function normalizeHeader(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Columns a file must carry before a spec will claim it: the identity columns. */
function identityColumns(spec: SourceSpec): string[] {
  return spec.notNull && spec.notNull.length > 0 ? spec.notNull : spec.columns.slice(0, 1);
}

const FLOOR = 0.6;
const TIE = 0.05;

export function detectSource(headers: string[], specs: SourceSpec[] = SOURCES): Detection {
  const norm = new Set(headers.map(normalizeHeader));

  const scored = specs
    .map((spec) => {
      const wanted = spec.columns.map(normalizeHeader);
      const missing = spec.columns.filter((c) => !norm.has(normalizeHeader(c)));
      const identityMissing = identityColumns(spec).some((c) => !norm.has(normalizeHeader(c)));
      const score = identityMissing ? 0 : (wanted.length - missing.length) / wanted.length;
      return { spec, key: spec.key, label: spec.label, score, missing };
    })
    .filter((c) => c.score >= FLOOR)
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

  if (scored.length === 0) {
    return {
      status: "unrecognized",
      spec: null,
      candidates: [],
      extraColumns: [...norm],
      reason:
        "No source in the contract claims this header set. The file is listed as received and not loaded — it is not discarded.",
    };
  }

  const candidates = scored.map(({ key, label, score, missing }) => ({
    key,
    label,
    score,
    missing,
  }));

  if (scored.length > 1 && scored[0].score - scored[1].score <= TIE) {
    return {
      status: "ambiguous",
      spec: null,
      candidates,
      extraColumns: [],
      reason: `Header signature fits ${scored[0].label} and ${scored[1].label} equally. Election is yours; the record will carry which one you chose.`,
    };
  }

  const chosen = scored[0].spec;
  const consumed = new Set(chosen.columns.map(normalizeHeader));
  return {
    status: "detected",
    spec: chosen,
    candidates,
    extraColumns: [...norm].filter((h) => !consumed.has(h)),
    reason:
      scored[0].missing.length === 0
        ? "Every column in the contract is present."
        : `Loaded without ${scored[0].missing.join(", ")}. Anything those columns would have established stays a gap.`,
  };
}
