// Payer remittance and bank cash are separate evidence classes. A trace is the
// only join, and its cardinality is stated, never assumed 1:1.

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

describe("trace reconciliation", () => {
  it("classifies every trace into one visible state", async () => {
    const rows = await all(db, `SELECT trace_state, COUNT(*) n FROM recon.trace_reconciliation GROUP BY 1`);
    const got = Object.fromEntries(rows.map((r: any) => [r.trace_state, Number(r.n)]));
    for (const [state, n] of Object.entries(oracle.trace.states)) {
      expect({ [state]: got[state] ?? 0 }).toEqual({ [state]: n });
    }
    const total = Object.values(got).reduce((s: number, n) => s + Number(n), 0);
    const universe = await one(db, `
      SELECT COUNT(*) n FROM (
        SELECT eft_trace FROM stg.remit_line WHERE eft_trace IS NOT NULL
        UNION SELECT eft_trace FROM stg.deposit WHERE eft_trace IS NOT NULL) u`);
    expect(total).toBe(Number(universe.n));
  });

  it("never lets payer payment stand in for bank cash", async () => {
    const r = await one(db, `
      SELECT ROUND(COALESCE(SUM(paid_amount),0)*100)::bigint paid FROM core.service_economics`);
    const b = await one(db, `SELECT ROUND(COALESCE(SUM(amount),0)*100)::bigint cash FROM stg.deposit`);
    expect(Number(r.paid)).toBe(oracle.money_cents.payer_paid);
    expect(Number(b.cash)).toBe(oracle.money_cents.bank_cash);
    expect(Number(r.paid)).not.toBe(Number(b.cash));
  });

  it("surfaces one-sided traces on both sides", async () => {
    const r = await one(db, `
      SELECT COUNT(*) FILTER (WHERE trace_state = 'bank_only')  bank_only,
             COUNT(*) FILTER (WHERE trace_state = 'remit_only') remit_only
      FROM recon.trace_reconciliation`);
    expect(Number(r.bank_only)).toBe(oracle.trace.states.bank_only);
    expect(Number(r.remit_only)).toBe(oracle.trace.states.remit_only);
  });

  it("variance on every trace is the exact cent difference", async () => {
    const bad = await one(db, `
      SELECT COUNT(*) n FROM recon.trace_reconciliation
      WHERE variance_cents <> COALESCE(deposit_cents,0) - COALESCE(remit_paid_cents,0)`);
    expect(Number(bad.n)).toBe(0);
  });
});
