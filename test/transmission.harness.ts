// Phase 2 verification — the transmission. Run: `node test/transmission.harness.ts`
// Asserts: fixed lane assignments; recoverable/structural DISJOINT and never blurred; sizing matches the
// money module to the dollar; the coverage-gap helper reconciles with computeMoney (single source);
// and the night-ER block cuts (count, wRVU, site, payer mix, structural $, low-yield) compute correctly.

import { runEngine } from "../src/engine.ts";
import { classifyAndRoute, nightERBlock, LANE_BY_FINDING } from "../src/transmission/transmission.ts";
import { sumCoverageGap } from "../src/money/index.ts";
import { DEFAULT_PINS } from "../src/config/pins.ts";
import {
  billingRaw, productionRaw, workflowRaw,
  coverageBillingRaw, coverageProductionRaw, coverageWorkflowRaw,
} from "../fixtures/synthetic.ts";

let pass = 0, fail = 0;
const eq = (a: number, b: number) => Math.abs(a - b) < 0.005;
function check(label: string, cond: boolean, got?: unknown) {
  if (cond) { pass++; console.log("  PASS  " + label); }
  else { fail++; console.log("  FAIL  " + label + (got !== undefined ? `  (got: ${JSON.stringify(got)})` : "")); }
}

const core = runEngine(billingRaw, productionRaw, workflowRaw, DEFAULT_PINS);
const tx = classifyAndRoute(core.facts, core.money, DEFAULT_PINS);

console.log("\n— LANES (fixed per finding type) —");
check("lost_work -> recoverable", LANE_BY_FINDING.lost_work === "recoverable");
check("underpayment -> recoverable", LANE_BY_FINDING.underpayment === "recoverable");
check("denial -> recoverable", LANE_BY_FINDING.denial === "recoverable");
check("matched -> no lane", LANE_BY_FINDING.matched === null);

console.log("\n— RECOVERABLE lane (sized from the money module) —");
check("lost-work $ = $70.03", eq(tx.recoverable.lost_work_dollars, 70.03), tx.recoverable.lost_work_dollars);
check("underpayment $ = $30", eq(tx.recoverable.underpayment_dollars, 30), tx.recoverable.underpayment_dollars);
check("denial $ = $500", eq(tx.recoverable.denial_dollars, 500), tx.recoverable.denial_dollars);
check("recoverable total = $600.03", eq(tx.recoverable.total, 600.03), tx.recoverable.total);
check("residual ≈ recovered (near-pure margin)", eq(tx.recoverable.residual_delta, 600.03), tx.recoverable.residual_delta);
check("capture-gap reported as count, not pool $ (2)", tx.recoverable.capture_gap_count === 2, tx.recoverable.capture_gap_count);

console.log("\n— STRUCTURAL lane (no-pay / underpay split, never fused) —");
check("no-pay $ = $28.39", eq(tx.structural.no_pay_dollars, 28.39), tx.structural.no_pay_dollars);
check("Medicaid shortfall $ = $28.12", eq(tx.structural.underpay_shortfall_dollars, 28.12), tx.structural.underpay_shortfall_dollars);
check("NO standalone fused structural.total field (components stay separate)", !("total" in tx.structural));

console.log("\n— INTEGRITY (recoverable & structural never blur) —");
check("disjoint sources flag is true", tx.integrity.disjoint === true);
check("structural shortfall is NOT inside recoverable total",
  eq(tx.recoverable.total, tx.recoverable.lost_work_dollars + tx.recoverable.underpayment_dollars + tx.recoverable.denial_dollars));
check("recoverable total excludes the $28.12 shortfall and the $28.39 no-pay",
  !eq(tx.recoverable.total, 600.03 + 28.12) && !eq(tx.recoverable.total, 600.03 + 28.39));

console.log("\n— SINGLE SOURCE (coverage-gap helper == computeMoney totals) —");
const cg = sumCoverageGap(core.facts, DEFAULT_PINS);
check("helper no-pay $ == money no-pay $", eq(cg.no_pay_dollars, core.money.no_pay_dollars.total), [cg.no_pay_dollars, core.money.no_pay_dollars.total]);
check("helper shortfall $ == money shortfall $", eq(cg.underpay_shortfall_dollars, core.money.underpay_shortfall_dollars.total), [cg.underpay_shortfall_dollars, core.money.underpay_shortfall_dollars.total]);

console.log("\n— PREVENTION (low-yield, placeholder until the group authors it) —");
check("low-yield count = 1 (A3: W19 + head CT, placeholder def)", tx.prevention.low_yield_count === 1, tx.prevention.low_yield_count);
check("flagged as using PLACEHOLDER definition", tx.prevention.using_placeholder_definition === true);

console.log("\n— NIGHT-ER COVERAGE BLOCK (the structural centerpiece) —");
const cov = runEngine(coverageBillingRaw, coverageProductionRaw, coverageWorkflowRaw, DEFAULT_PINS);
const night = nightERBlock(cov.facts, DEFAULT_PINS);
check("after-hours reads = 3 (N1,N2,N3; N4 is daytime)", night.after_hours_reads === 3, night.after_hours_reads);
check("after-hours wRVU = 3.75", eq(night.after_hours_wrvu, 3.75), night.after_hours_wrvu);
check("by site: Children's = 2", night.by_site["childrens"] === 2, night.by_site);
check("by site: system = 1", night.by_site["system"] === 1, night.by_site);
check("after-hours payer mix: self-pay 1 / medicaid 1 / commercial 1",
  night.by_payer["self_pay"] === 1 && night.by_payer["medicaid"] === 1 && night.by_payer["commercial"] === 1, night.by_payer);
check("after-hours structural no-pay $ = $28.39", eq(night.structural_after_hours.no_pay_dollars, 28.39), night.structural_after_hours.no_pay_dollars);
check("after-hours Medicaid shortfall $ = $18.74", eq(night.structural_after_hours.underpay_shortfall_dollars, 18.74), night.structural_after_hours.underpay_shortfall_dollars);
check("after-hours low-yield = 1 (placeholder)", night.low_yield_after_hours === 1, night.low_yield_after_hours);
check("reader cut: RAD_PEDS read 2 after-hours", night.reader_cut["RAD_PEDS"] === 2, night.reader_cut);
check("cross-coverage stays a SEAM (not guessed)", night.cross_coverage_note.startsWith("SEAM"));

const txCov = classifyAndRoute(cov.facts, cov.money, DEFAULT_PINS);
check("coverage scenario: no-pay $28.39 and Medicaid shortfall $18.74 shown SEPARATELY (no fused total)",
  eq(txCov.structural.no_pay_dollars, 28.39) && eq(txCov.structural.underpay_shortfall_dollars, 18.74) && !("total" in txCov.structural),
  { no_pay: txCov.structural.no_pay_dollars, shortfall: txCov.structural.underpay_shortfall_dollars });

console.log("\n— DETERMINISM —");
const r1 = JSON.stringify(classifyAndRoute(core.facts, core.money, DEFAULT_PINS));
const r2 = JSON.stringify(classifyAndRoute(core.facts, core.money, DEFAULT_PINS));
check("same inputs -> byte-identical transmission", r1 === r2);

console.log(`\n[transmission self-check] ${pass} passed, ${fail} failed.`);
if (fail > 0) process.exit(1);
