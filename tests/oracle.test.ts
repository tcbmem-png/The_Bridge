// The answer key must be independently reproducible from the fixture bytes,
// and it must not move without a fixture-version bump.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
// @ts-expect-error — plain-JS oracle author, deliberately outside the app graph
import { recount } from "../scripts/oracle/recount.mjs";

const oracle = JSON.parse(
  readFileSync("fixtures/physician_group_v1/expected/oracle.json", "utf8"),
);

describe("fixture oracle", () => {
  it("is explicitly versioned", () => {
    expect(oracle.fixture_id).toBe("synthetic_physician_group");
    expect(oracle.fixture_version).toMatch(/^\d+\.\d+$/);
  });

  it("reproduces from the raw fixture bytes", () => {
    const r = recount(oracle.source_dir);
    expect(r.custody).toEqual(oracle.custody);
    expect(r.source_counts).toEqual(oracle.source_counts);
    expect(r.chain).toEqual(oracle.chain);
    expect(r.money_cents).toEqual(oracle.money_cents);
    expect(r.partition).toEqual(oracle.partition);
    expect(r.trace).toEqual(oracle.trace);
    expect(r.cash_carve).toEqual(oracle.cash_carve);
  });

  it("still declares the known specimen truths", () => {
    expect(oracle.chain.encounters).toBe(6400);
    expect(oracle.chain.unbilled).toBe(120);
    expect(oracle.chain.claim_lines_without_remittance).toBe(186);
    expect(oracle.chain.payer_contradictions).toBe(10);
    expect(oracle.cash_carve.starting_gap_cents).toBe(907807);
  });
});
