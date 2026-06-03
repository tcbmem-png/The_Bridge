// Export-type detection. Header signature first, filename second. Never by
// content sampling — that hides shape bugs.

import { ALL_SPECS, type ExportSpec } from "./schemas";
import type { ExportType } from "./types";

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/** Score a spec against a set of normalized header names. Higher = better.
 *  Hits divided by total possible (required counted double). Specs missing
 *  any required column are hard-rejected so a richer-optional spec cannot
 *  out-rank the actual match (e.g. RIS scoring above 837 on a billing CSV). */
function scoreHeaderMatch(spec: ExportSpec, normHeaders: Set<string>): number {
  let hits = 0;
  let possible = 0;
  for (const col of spec.columns) {
    const candidates = [col.name, ...(col.aliases ?? [])].map(normalize);
    const present = candidates.some((c) => normHeaders.has(c));
    const weight = col.required ? 2 : 1;
    possible += weight;
    if (present) hits += weight;
    else if (col.required) return 0;
  }
  return hits / Math.max(possible, 1);
}

export function detectExportType(
  fileName: string,
  headers: string[],
): { type: ExportType; spec: ExportSpec; confidence: number } | null {
  const normHeaders = new Set(headers.map(normalize));
  const fname = fileName.toLowerCase();

  let best: { spec: ExportSpec; score: number } | null = null;
  for (const spec of ALL_SPECS) {
    let score = scoreHeaderMatch(spec, normHeaders);
    // Filename tiebreaker, small bump only.
    if (spec.filenameHints.some((h) => fname.includes(h))) score += 0.05;
    if (!best || score > best.score) best = { spec, score };
  }

  if (!best || best.score < 0.5) return null;
  return { type: best.spec.type, spec: best.spec, confidence: best.score };
}
