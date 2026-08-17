// The readiness report.
//
//   GIVE US WHAT YOU ALREADY HAVE
//        → HERE IS WHAT WE CAN ESTABLISH
//        → HERE IS WHAT REMAINS TANGLED
//        → HERE IS THE EXACT SOURCE THAT CLOSES IT
//        → NOW THE QUESTION GETS NARROWER
//
// Every line carries a provenance type, so a reader can tell a record fact
// from a derivation from a declared gap without reading the code. Nothing here
// estimates: a figure the loaded sources cannot support is reported as a gap,
// never as a number with a caveat.

import {
  STAGES,
  STAGE_ORDER,
  availability,
  highestAvailableStage,
  type StageAvailability,
  type StageId,
} from "../provenance/stages";
import type { ProvenanceType } from "../provenance/algebra";
import type { PracticeConfig } from "./config";
import { configProgress, gatedFigures } from "./config";
import { recommend, type Recommendation } from "./recommend";
import type { CustodyEntry } from "./custody";

export interface ReadinessLine {
  text: string;
  provenance: ProvenanceType;
  /** The source keys or elections the line rests on. */
  restsOn: string[];
}

export interface ReadinessReport {
  /** Files received, including the ones not loaded. */
  custody: CustodyEntry[];
  stages: StageAvailability[];
  highestStage: StageId | null;
  established: ReadinessLine[];
  tangled: ReadinessLine[];
  recommendation: Recommendation;
  /** Credit-forward: rungs standing, not rungs missing. */
  foundation: { standing: number; total: number; caption: string };
  configProgress: ReturnType<typeof configProgress>;
  narrowerQuestion: string;
}

export function buildReadiness(
  custody: CustodyEntry[],
  cfg: PracticeConfig,
): ReadinessReport {
  const loadedKeys = new Set(
    custody.filter((c) => c.status === "loaded" && c.sourceKey).map((c) => c.sourceKey!),
  );
  const stages = availability(loadedKeys);
  const highest = highestAvailableStage(stages);

  const established: ReadinessLine[] = [];
  const tangled: ReadinessLine[] = [];

  for (const row of stages) {
    const { stage } = row;
    if (row.status === "available") {
      for (const e of stage.establishes)
        established.push({
          text: e,
          provenance: "record_derived",
          restsOn: row.present,
        });
      for (const c of stage.cannotEstablish)
        tangled.push({
          text: `${c} — outside what Stage ${stage.n} evidence can carry`,
          provenance: "gap",
          restsOn: [stage.closesOn],
        });
    } else if (row.status === "partial") {
      tangled.push({
        text: `Stage ${stage.n} · ${stage.label} is partial: ${row.present.join(", ")} loaded, ${row.missingRequired.join(", ")} missing`,
        provenance: "gap",
        restsOn: row.missingRequired,
      });
    } else {
      tangled.push({
        text: `Stage ${stage.n} · ${stage.label} has no sources loaded`,
        provenance: "gap",
        restsOn: stage.sources.filter((s) => s.required).map((s) => s.key),
      });
    }
  }

  for (const g of gatedFigures(cfg))
    tangled.push({
      text: `${g.figure} — withheld until the practice configuration is elected`,
      provenance: "gap",
      restsOn: g.by,
    });

  for (const c of custody)
    if (c.status !== "loaded")
      tangled.push({
        text: `${c.fileName} — ${c.status === "ambiguous" ? "header signature fits two sources; election required" : "not claimed by any source in the contract; received, not loaded"}`,
        provenance: c.status === "ambiguous" ? "contradiction" : "gap",
        restsOn: [c.sha256 ?? "unhashed"],
      });

  const standing = STAGE_ORDER.filter(
    (id) => stages.find((s) => s.stage.id === id)!.status === "available",
  ).length;

  const rec = recommend(loadedKeys, cfg);

  return {
    custody,
    stages,
    highestStage: highest,
    established,
    tangled,
    recommendation: rec,
    foundation: {
      standing,
      total: STAGES.length,
      caption:
        standing === 0
          ? "No rung stands yet. One clinical work export, one work-unit reference and one bank export put the first one up."
          : `${standing} of ${STAGES.length} rungs standing on sources the group already holds.`,
    },
    configProgress: configProgress(cfg),
    narrowerQuestion: rec.primary
      ? `The question is no longer "where did the money go". It is: can we have ${rec.primary.label.toLowerCase()} for the same period? Held by ${rec.primary.heldBy}.`
      : "The data question is closed. What remains is a question for the parties, asked with the record in hand.",
  };
}
