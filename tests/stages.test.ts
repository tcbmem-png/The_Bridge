// The four-stage source ladder. More evidence resolves uncertainty; it never
// rewrites the stage below it, and no figure may cite a source above its stage.

import { describe, it, expect } from "vitest";
import {
  STAGES,
  STAGE_ORDER,
  availability,
  highestAvailableStage,
  isolationViolations,
  sourcesForStage,
  stageOfSource,
} from "../src/lib/provenance/stages";

describe("stage ladder", () => {
  it("keeps the four stages in order", () => {
    expect(STAGE_ORDER).toEqual(["own_books", "the_wire", "their_ledger", "their_story"]);
    expect(STAGES.map((s) => s.n)).toEqual([1, 2, 3, 4]);
  });

  it("admits only sources at or below the stage", () => {
    expect(sourcesForStage("own_books")).toContain("encounter");
    expect(sourcesForStage("own_books")).not.toContain("remit");
    expect(sourcesForStage("the_wire")).toContain("encounter");
    expect(sourcesForStage("the_wire")).toContain("remit");
  });

  it("reports isolation violations rather than silently allowing them", () => {
    expect(isolationViolations("own_books", ["encounter", "bank", "remit"])).toEqual(["remit"]);
    expect(isolationViolations("the_wire", ["encounter", "remit", "rcm_ledger"])).toEqual([
      "rcm_ledger",
    ]);
    expect(isolationViolations("their_story", ["encounter", "remit", "processed_report"])).toEqual(
      [],
    );
  });

  it("places every declared source on exactly one stage", () => {
    const seen = new Map<string, number>();
    for (const s of STAGES) for (const src of s.sources) seen.set(src.key, (seen.get(src.key) ?? 0) + 1);
    for (const [key, n] of seen) expect({ [key]: n }).toEqual({ [key]: 1 });
    expect(stageOfSource("remit")).toBe("the_wire");
    expect(stageOfSource("not_a_source")).toBeNull();
  });

  it("computes availability without promoting a partial stage", () => {
    const rows = availability(new Set(["encounter", "mpfs", "bank"]));
    const s1 = rows.find((r) => r.stage.id === "own_books")!;
    expect(s1.status).toBe("available");
    const s2 = rows.find((r) => r.stage.id === "the_wire")!;
    expect(s2.status).toBe("not_loaded");
    expect(highestAvailableStage(rows)).toBe("own_books");
  });

  it("still yields a highest stage when a later stage is only partial", () => {
    const rows = availability(new Set(["encounter", "mpfs", "bank", "claims"]));
    expect(highestAvailableStage(rows)).toBe("own_books");
    const s2 = rows.find((r) => r.stage.id === "the_wire")!;
    expect(s2.status).toBe("partial");
    expect(s2.missingRequired).toContain("remit");
  });

  it("names what each stage cannot establish", () => {
    for (const s of STAGES) {
      expect(s.closesOn.length).toBeGreaterThan(10);
      if (s.id !== "their_story") expect(s.cannotEstablish.length).toBeGreaterThan(0);
    }
  });
});
