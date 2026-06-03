// The engine orchestrator: adapters -> canonical -> three-tier join -> enrich -> maturity -> money.
// Deterministic. No AI in any path. Indication is read from ICD-10 (in billing), never parsed from prose.
// 36-month loads come in as tagged monthly extracts; dedup keeps the MOST-MATURE version (restatement).

import { billingCsvAdapter, productionCsvAdapter, workflowCsvAdapter } from "./adapters/synthetic.ts";
import { join } from "./join/join.ts";
import { wrvuFor, WRVU_TABLE_CY2026 } from "./enrich/wrvu.ts";
import { classifyMaturity, reconcilePendingVsDenied, reconcileChargeLag } from "./maturity/maturity.ts";
import { computeMoney, type MoneyOutput } from "./money/index.ts";
import type { Fact } from "./schemas/canonical.ts";
import type { Pins } from "./config/pins.ts";

type Raw = Record<string, string>;

export interface EngineResult { facts: Fact[]; money: MoneyOutput; }

export function runEngine(billingRaw: Raw[], productionRaw: Raw[], workflowRaw: Raw[], pins: Pins): EngineResult {
  // edges adapt; downstream sees only canonical records
  const billing = billingCsvAdapter.normalize(billingRaw);
  const production = productionCsvAdapter.normalize(productionRaw);
  const workflow = workflowCsvAdapter.normalize(workflowRaw);

  // invariant middle
  const facts = join(billing, production, workflow, pins);
  for (const f of facts) f.wrvu = wrvuFor(f.production?.cpt ?? f.billing?.cpt ?? "", WRVU_TABLE_CY2026);
  classifyMaturity(facts, pins);
  reconcilePendingVsDenied(facts, pins); // pending != denied; flags denial/underpayment
  reconcileChargeLag(facts, pins);       // pending-capture != lost_work inside the charge-lag window
  classifyMaturity(facts, pins);         // re-class so maturity matches the final finding (idempotent)

  // compute once — single source
  const money = computeMoney(facts, pins);
  return { facts, money };
}

// Loader: idempotent monthly loads, keyed by claim/exam, keep the MOST-MATURE (latest extract_date) version.
// A point that moves is visibly matured, never silently edited. Demonstrated in the restatement test.
export function dedupMostMature<T extends Raw>(rows: Array<{ row: T; key: string; extract_date: string }>): T[] {
  const best = new Map<string, { row: T; extract_date: string }>();
  for (const r of rows) {
    const cur = best.get(r.key);
    if (!cur || r.extract_date > cur.extract_date) best.set(r.key, { row: r.row, extract_date: r.extract_date });
  }
  return [...best.values()].map((v) => v.row);
}
