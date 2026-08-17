// The next-source recommendation engine.
//
// Deterministic: the same loaded sources and the same practice configuration
// always yield the same ordered list, with the same reasons. No scoring
// heuristics, no model. The rule is the ladder itself —
//
//   the lowest incomplete rung is asked for first, because a source from a
//   higher rung cannot be read honestly while a lower rung is still tangled.
//
// Each recommendation names the figure it would unlock and who holds the
// document, so the ask can be made in writing.

import { STAGES, STAGE_ORDER, availability, type StageId } from "../provenance/stages";
import type { PracticeConfig, PracticeConfigKey } from "./config";
import { configGaps } from "./config";

export type Obtainability =
  | "self_serve"
  | "vendor_request"
  | "contested"
  | "unavailable"
  | "unknown";

export interface SourceRequest {
  sourceKey: string;
  label: string;
  stage: StageId;
  stageLabel: string;
  required: boolean;
  /** What loading it would establish that cannot be established now. */
  unlocks: string[];
  /** Who is asked. */
  heldBy: string;
  obtainability: Obtainability;
  /** Plain-language reason, deterministic for a given state. */
  reason: string;
}

const HELD_BY: Record<string, string> = {
  encounter: "The group's own clinical system",
  claims: "The billing vendor or clearinghouse",
  remit: "The billing vendor, clearinghouse or payer portal",
  bank: "The group's bank",
  mpfs: "Public — CMS",
  physician: "The group",
  payer: "The group or its vendor",
  facility: "The group",
  pos: "Public — CMS",
  service_family: "The group",
  denial: "Public — X12 / the vendor",
  rate_card: "The payer contract file",
  rcm_ledger: "The billing vendor",
  rcm_ar_aging: "The billing vendor",
  rcm_denial_worklist: "The billing vendor",
  processed_report: "The billing vendor",
};

/** Which technical question governs a source's obtainability. */
const GOVERNED_BY: Record<string, PracticeConfigKey> = {
  encounter: "clinical_export",
  claims: "claim_export",
  remit: "remit_export",
  bank: "bank_export",
  rcm_ledger: "vendor_ledger",
  rcm_ar_aging: "vendor_ledger",
  rcm_denial_worklist: "vendor_ledger",
  processed_report: "processed_report",
};

function obtainability(sourceKey: string, cfg: PracticeConfig): Obtainability {
  const q = GOVERNED_BY[sourceKey];
  if (!q) return "self_serve"; // public or group-held reference data
  const v = cfg[q]?.values[0];
  if (v === "self_serve" || v === "vendor_request" || v === "contested" || v === "unavailable")
    return v;
  return "unknown";
}

/**
 * The ordered ask list. Lowest incomplete rung first; within a rung, required
 * sources before optional ones; within that, contract order.
 */
export function nextSources(
  loadedKeys: Set<string>,
  cfg: PracticeConfig = {},
): SourceRequest[] {
  const rows = availability(loadedKeys);
  const out: SourceRequest[] = [];

  for (const id of STAGE_ORDER) {
    const stage = STAGES.find((s) => s.id === id)!;
    const row = rows.find((r) => r.stage.id === id)!;
    const missing = stage.sources.filter((s) => !loadedKeys.has(s.key));
    if (missing.length === 0) continue;

    const lowerTangled = STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(id)).some(
      (lower) => rows.find((r) => r.stage.id === lower)!.missingRequired.length > 0,
    );

    for (const s of [...missing].sort((a, b) => Number(b.required) - Number(a.required))) {
      out.push({
        sourceKey: s.key,
        label: s.label,
        stage: id,
        stageLabel: `Stage ${stage.n} · ${stage.label}`,
        required: s.required,
        unlocks: s.required ? stage.establishes : [`Resolution within ${stage.label.toLowerCase()}`],
        heldBy: HELD_BY[s.key] ?? "Unknown holder",
        obtainability: obtainability(s.key, cfg),
        reason: lowerTangled
          ? `A lower rung is still incomplete (${row.stage.label} sits above it). This source can be loaded, but figures built on it would rest on an untied base.`
          : s.required
            ? `Required to complete ${stage.label}. Until it loads: ${stage.cannotEstablish.slice(0, 2).join("; ")}.`
            : `Optional. It resolves coverage inside ${stage.label} rather than opening a new rung.`,
      });
    }
  }

  return out;
}

export interface Recommendation {
  /** The single next ask, or null when every rung is complete. */
  primary: SourceRequest | null;
  queue: SourceRequest[];
  /** Config questions that block reading, independent of any file. */
  blockedByConfig: { id: PracticeConfigKey; prompt: string; gates: string[] }[];
  statement: string;
}

export function recommend(loadedKeys: Set<string>, cfg: PracticeConfig = {}): Recommendation {
  const queue = nextSources(loadedKeys, cfg);
  const askable = queue.filter(
    (r) => r.obtainability !== "unavailable" && r.required,
  );
  const primary = askable[0] ?? queue.find((r) => r.obtainability !== "unavailable") ?? null;
  const blockedByConfig = configGaps(cfg);

  const statement = primary
    ? `Next source: ${primary.label} — ${primary.stageLabel}. ${primary.reason}`
    : "Every rung of the ladder has its required sources. What remains unexplained after this point is a question for the parties, not for another file.";

  return { primary, queue, blockedByConfig, statement };
}
