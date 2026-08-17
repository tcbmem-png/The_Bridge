// Every record lands somewhere visible. No row may disappear because a join
// failed, a reference was missing, a payer was unknown or an amount was absent.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
// @ts-expect-error — node-side fixture pipeline, plain JS
import { bootFixtureDb, oracle, one, all } from "../scripts/oracle/pipeline.mjs";

let db: { close: () => Promise<void> };

beforeAll(async () => {
  db = await bootFixtureDb();
});
afterAll(async () => {
  await db.close();
});

describe("no-swallow partition", () => {
  it("closes on every universe", async () => {
    const rows = await all(db, `SELECT universe, population, classified, unaccounted, closes FROM recon.partition_check`);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(`${r.universe}:${r.closes}`).toBe(`${r.universe}:true`);
      expect(Number(r.unaccounted)).toBe(0);
    }
  });

  it("assigns each claim line exactly one disposition", async () => {
    const r = await one(db, `
      SELECT COUNT(*) total, COUNT(DISTINCT service_id) distinct_rows
      FROM core.line_disposition`);
    expect(Number(r.total)).toBe(Number(r.distinct_rows));
    expect(Number(r.total)).toBe(oracle.partition.claim_lines.population);
  });

  it("matches the oracle disposition counts", async () => {
    const rows = await all(db, `SELECT disposition, COUNT(*) n FROM core.line_disposition GROUP BY 1`);
    const got = Object.fromEntries(rows.map((r: any) => [r.disposition, Number(r.n)]));
    for (const [k, v] of Object.entries(oracle.partition.claim_lines)) {
      if (k === "population") continue;
      expect({ [k]: got[k] ?? 0 }).toEqual({ [k]: v });
    }
  });

  it("keeps unknown identities visible rather than defaulting them", async () => {
    const r = await one(db, `
      SELECT COUNT(*) FILTER (WHERE payer_resolution = 'unresolved_identity') unresolved_payer,
             COUNT(*) FILTER (WHERE wrvu_coverage = 'uncovered') uncovered
      FROM core.line_disposition`);
    expect(Number(r.unresolved_payer)).toBe(oracle.reference_integrity.unknown_payer_lines);
    expect(Number(r.uncovered)).toBe(oracle.reference_integrity.unmapped_cpt_lines);
  });
});
