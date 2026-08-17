// Exact-cent money. The carve closes to the cent, and the remainder is
// derived — never absorbed into a miscellaneous bucket.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { carve, toCents, sumCents, ratioFromCents } from "../src/lib/provenance/cents";
// @ts-expect-error — node-side fixture pipeline, plain JS
import { bootFixtureDb, oracle, one } from "../scripts/oracle/pipeline.mjs";

describe("cent arithmetic", () => {
  it("rounds half away from zero, both signs", () => {
    expect(toCents(10.005)).toBe(1001);
    expect(toCents(-10.005)).toBe(-1001);
    expect(toCents("$1,234.56")).toBe(123456);
    expect(toCents("")).toBeNull();
  });

  it("refuses to treat an unknown as zero", () => {
    expect(sumCents([100, null, 250])).toEqual({ total: 350, unknown: 1 });
  });

  it("returns null rather than zero when the basis is absent", () => {
    expect(ratioFromCents(10000, null)).toBeNull();
    expect(ratioFromCents(10000, 0)).toBeNull();
    expect(ratioFromCents(10000, 2)).toBe(50);
  });

  it("closes the identity exactly and leaves the remainder stated", () => {
    const r = carve(
      "test",
      1_000_000,
      [
        { key: "a", label: "A", amount_cents: 400_000 },
        { key: "b", label: "B", amount_cents: 250_001 },
      ],
      "the next source",
    );
    expect(r.explained_cents).toBe(650_001);
    expect(r.unexplained_after_cents).toBe(349_999);
    expect(r.starting_gap_cents).toBe(r.explained_cents + r.unexplained_after_cents);
    expect(r.closes).toBe(true);
    expect(r.explained.some((i) => /other|misc/i.test(i.key))).toBe(false);
  });

  it("permits a negative remainder rather than forcing zero", () => {
    const r = carve("over", 100, [{ key: "x", label: "X", amount_cents: 250 }], "src");
    expect(r.unexplained_after_cents).toBe(-150);
    expect(r.closes).toBe(true);
  });
});

describe("the fixture cash carve", () => {
  let db: { close: () => Promise<void> };
  beforeAll(async () => {
    db = await bootFixtureDb();
  });
  afterAll(async () => {
    await db.close();
  });

  it("closes payer remittance against bank cash to the cent", async () => {
    const ci = await one(db, `SELECT * FROM recon.carve_inputs`);
    const bankOnly = await one(db, `
      SELECT COALESCE(SUM(deposit_cents),0)::bigint c
      FROM recon.trace_reconciliation WHERE trace_state = 'bank_only'`);

    const startingGap = Number(ci.bank_cash_cents) - Number(ci.payer_paid_cents);
    const r = carve(
      "Payer remittance vs bank cash",
      startingGap,
      [
        { key: "bank_only", label: "Bank cash with no payer trace", amount_cents: Number(bankOnly.c) },
        {
          key: "remit_only",
          label: "Payer payment with no bank trace",
          amount_cents: -Number(ci.paid_without_bank_trace_cents),
        },
      ],
      "Raw RCM posting ledger",
    );

    expect(r.starting_gap_cents).toBe(oracle.cash_carve.starting_gap_cents);
    expect(r.explained_cents).toBe(oracle.cash_carve.explained_cents);
    expect(r.unexplained_after_cents).toBe(oracle.cash_carve.unexplained_after_cents);
    expect(r.starting_gap_cents).toBe(r.explained_cents + r.unexplained_after_cents);
  });
});
