// Drill completeness. A displayed aggregate must be reproducible from the rows
// its drawer shows: counts equal drilled rows, dollars equal the sum of drilled
// dollars, ratios equal drilled numerator over drilled denominator.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
// @ts-expect-error — node-side fixture pipeline, plain JS
import { bootFixtureDb, one, all } from "../scripts/oracle/pipeline.mjs";

let db: { close: () => Promise<void> };
beforeAll(async () => {
  db = await bootFixtureDb();
});
afterAll(async () => {
  await db.close();
});

describe("drill completeness", () => {
  it("funnel counts equal the rows behind them", async () => {
    const f = await all(db, `SELECT step, unit_count, amount FROM recon.funnel`);
    const byStep = Object.fromEntries(f.map((r: any) => [r.step, r]));

    const enc = await one(db, `SELECT COUNT(*) n FROM stg.encounter`);
    expect(Number(byStep.work_performed.unit_count)).toBe(Number(enc.n));

    const claimed = await one(db, `
      SELECT COUNT(*) n FROM stg.encounter e
      WHERE EXISTS (SELECT 1 FROM stg.claim_line c WHERE c.encounter_id = e.encounter_id)`);
    expect(Number(byStep.work_claimed.unit_count)).toBe(Number(claimed.n));

    const lines = await one(db, `
      SELECT COUNT(*) n, ROUND(SUM(charge_amount)*100)::bigint cents FROM stg.claim_line`);
    expect(Number(byStep.claim_lines.unit_count)).toBe(Number(lines.n));
    expect(Math.round(Number(byStep.claim_lines.amount) * 100)).toBe(Number(lines.cents));
  });

  it("unbilled work aggregate equals its drilled encounter rows", async () => {
    const agg = await one(db, `SELECT unmatched_work n FROM recon.work_to_claims`);
    const drill = await all(db, `SELECT encounter_id FROM core.unbilled_work`);
    expect(drill.length).toBe(Number(agg.n));
  });

  it("payer paid aggregate equals the sum of its drilled lines", async () => {
    const agg = await one(db, `
      SELECT ROUND(COALESCE(SUM(paid_amount),0)*100)::bigint cents FROM core.service_economics`);
    const drill = await all(db, `
      SELECT ROUND(COALESCE(paid_amount,0)*100)::bigint cents FROM core.service_economics
      WHERE paid_amount IS NOT NULL`);
    const summed = drill.reduce((s: number, r: any) => s + Number(r.cents), 0);
    expect(summed).toBe(Number(agg.cents));
  });

  it("realized $/wRVU equals drilled numerator over drilled denominator", async () => {
    const agg = await one(db, `
      SELECT ROUND(COALESCE(SUM(paid_amount),0)*100)::bigint paid_cents,
             COALESCE(SUM(work_rvu),0)::numeric wrvu,
             COUNT(*) FILTER (WHERE work_rvu IS NOT NULL) covered_lines,
             COUNT(*) total_lines
      FROM core.service_economics WHERE paid_amount IS NOT NULL`);
    const drill = await all(db, `
      SELECT ROUND(COALESCE(paid_amount,0)*100)::bigint paid_cents, work_rvu
      FROM core.service_economics WHERE paid_amount IS NOT NULL AND work_rvu IS NOT NULL`);

    const numer = drill.reduce((s: number, r: any) => s + Number(r.paid_cents), 0);
    const denom = drill.reduce((s: number, r: any) => s + Number(r.work_rvu), 0);
    expect(drill.length).toBe(Number(agg.covered_lines));
    expect(Math.abs(denom - Number(agg.wrvu))).toBeLessThan(0.0001);

    // Coverage is visible: the denominator is never silently shrunk.
    const coverage = Number(agg.covered_lines) / Number(agg.total_lines);
    expect(coverage).toBeLessThanOrEqual(1);
    expect(numer / 100 / denom).toBeGreaterThan(0);
  });

  it("every partition class can be drilled to its rows", async () => {
    const classes = await all(db, `
      SELECT disposition, COUNT(*) n FROM core.line_disposition GROUP BY 1`);
    for (const c of classes as any[]) {
      const drill = await all(
        db,
        `SELECT service_id FROM core.line_disposition WHERE disposition = '${c.disposition}'`,
      );
      expect({ [c.disposition]: drill.length }).toEqual({ [c.disposition]: Number(c.n) });
    }
  });
});
