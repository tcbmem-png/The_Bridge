// Node assertion harness — turnkey re-verification. Run: `node test/harness.ts`
// Asserts the REAL pipeline output: join tiers + finding buckets, maturity (pending != denied),
// money to the dollar (with the no-pay / underpay split NEVER fused), determinism, and restatement.

import { runEngine, dedupMostMature } from "../src/engine.ts";
import { DEFAULT_PINS } from "../src/config/pins.ts";
import { billingRaw, productionRaw, workflowRaw, billingRaw_laterA7 } from "../fixtures/synthetic.ts";

let pass = 0, fail = 0;
const eq = (a: number, b: number) => Math.abs(a - b) < 0.005;
function check(label: string, cond: boolean, got?: unknown) {
  if (cond) { pass++; console.log("  PASS  " + label); }
  else { fail++; console.log("  FAIL  " + label + (got !== undefined ? `  (got: ${JSON.stringify(got)})` : "")); }
}

const { facts, money } = runEngine(billingRaw, productionRaw, workflowRaw, DEFAULT_PINS);
const byFinding = (k: string) => facts.filter((f) => f.finding === k).length;
const byTier = (k: string) => facts.filter((f) => f.join_tier === k).length;
const A = (acc: string) => facts.find((f) => f.key === acc || f.billing?.claim_id === acc || f.production?.accession === acc);

console.log("\n— JOIN + FINDINGS —");
check("9 facts total", facts.length === 9, facts.length);
check("lost_work = 1 (A5: read, never billed)", byFinding("lost_work") === 1, byFinding("lost_work"));
check("capture_gap = 2 (A6 + unmatched A9)", byFinding("capture_gap") === 2, byFinding("capture_gap"));
check("denial = 1 (A8: CARC CO-50)", byFinding("denial") === 1, byFinding("denial"));
check("underpayment = 1 (A4: paid < allowed)", byFinding("underpayment") === 1, byFinding("underpayment"));
check("matched = 4 (A1,A2,A3,A7)", byFinding("matched") === 4, byFinding("matched"));
check("join_tier exact = 7", byTier("exact") === 7, byTier("exact"));
check("join_tier bridged = 1 (A2: billing had no accession)", byTier("bridged") === 1, byTier("bridged"));
check("join_tier unmatched = 1 (A9: nothing to bridge to)", byTier("unmatched") === 1, byTier("unmatched"));

console.log("\n— MATURITY (pending != denied) —");
const a7 = facts.find((f) => f.key === "A7")!;
check("A7 is PENDING, not a denial (inside window N)", a7.finding === "matched", a7.finding);
check("A7 is NOT matured (recent edge)", a7.matured === false, a7.matured);
const a8 = facts.find((f) => f.key === "A8")!;
check("A8 is a denial (explicit CARC)", a8.finding === "denial", a8.finding);

console.log("\n— MONEY (to the dollar) —");
check("production volume = 8.67 wRVU", eq(money.production_volume_wrvu.total, 8.67), money.production_volume_wrvu.total);
check("net collections = $460", eq(money.net_collections.total, 460), money.net_collections.total);
check("blended = $47.32 / wRVU", eq(money.blended_dollars_per_wrvu, 47.32), money.blended_dollars_per_wrvu);
check("lost-work count = 1", eq(money.lost_work_count.total, 1), money.lost_work_count.total);
check("lost-work $ = $70.03 (1.48 wRVU x blended)", eq(money.lost_work_dollars.total, 70.03), money.lost_work_dollars.total);
check("denial count = 1", eq(money.denial_count.total, 1), money.denial_count.total);
check("denial $ = $500", eq(money.denial_dollars.total, 500), money.denial_dollars.total);
check("underpayment $ = $30 (recoverable: allowed-paid)", eq(money.underpayment_dollars.total, 30), money.underpayment_dollars.total);
check("procedure-to-cash = 33.0 days (KPI)", eq(money.procedure_to_cash_days, 33), money.procedure_to_cash_days);

console.log("\n— COVERAGE GAP: no-pay / underpay SPLIT (never fused) —");
check("no-pay (self-pay) = 0.85 wRVU", eq(money.no_pay_wrvu.total, 0.85), money.no_pay_wrvu.total);
check("no-pay $ = $28.39 (wRVU x CF)", eq(money.no_pay_dollars.total, 28.39), money.no_pay_dollars.total);
check("Medicaid shortfall = $28.12 (vs Medicare)", eq(money.underpay_shortfall_dollars.total, 28.12), money.underpay_shortfall_dollars.total);
check("Medicaid shortfall = 0.84 wRVU", eq(money.underpay_shortfall_wrvu.total, 0.84), money.underpay_shortfall_wrvu.total);
check("the two are SEPARATE fields (structural split holds)",
  "no_pay_dollars" in money && "underpay_shortfall_dollars" in money &&
  money.no_pay_dollars !== money.underpay_shortfall_dollars);

console.log("\n— PROVISIONAL EDGE (shade payment, never production) —");
check("net collections shades 2026-05 (recent edge)", money.net_collections.provisionalMonths.includes("2026-05"));
check("net collections shades 2026-02 (within band M=4)", money.net_collections.provisionalMonths.includes("2026-02"));
check("net collections does NOT shade 2026-01 (matured)", !money.net_collections.provisionalMonths.includes("2026-01"));
check("production volume is NEVER shaded (stable)", money.production_volume_wrvu.provisionalMonths.length === 0);

console.log("\n— F1: all-in collections_per_wRVU is its OWN basis, distinct from the blended headline —");
// This core fixture has lost-work (A5) + capture-gaps (A6,A9) — the shape where the two bases DIVERGE.
check("collections_per_wRVU.total = Σcollections/Σproduction = $53.06", eq(money.collections_per_wrvu.total, 53.06), money.collections_per_wrvu.total);
check("its total is DERIVED, NOT force-set to blended ($47.32)", !eq(money.collections_per_wrvu.total, money.blended_dollars_per_wrvu), { coll: money.collections_per_wrvu.total, blended: money.blended_dollars_per_wrvu });
check("blended headline stays $47.32 (matched, matured) — the two are distinct metrics", eq(money.blended_dollars_per_wrvu, 47.32), money.blended_dollars_per_wrvu);

console.log("\n— CHARGE-LAG: pending-capture != lost_work (the twin of pending != denied) —");
const clProd = [
  { accession: "CLrecent", patient_key: "Z1", date_of_service: "2026-05-28", report_finalized_ts: "2026-05-28T10:00:00", cpt: "70450", modality: "CT", reading_radiologist: "RZ", ordering_provider: "OZ" },
  { accession: "CLold", patient_key: "Z2", date_of_service: "2026-02-01", report_finalized_ts: "2026-02-01T10:00:00", cpt: "70450", modality: "CT", reading_radiologist: "RZ", ordering_provider: "OZ" },
];
const cl = runEngine([], clProd, [], DEFAULT_PINS);
const clf = (acc: string) => cl.facts.find((f) => f.key === acc);
check("recent no-charge read (3 days old) -> pending-capture, NOT lost_work", clf("CLrecent")?.finding === "matched", clf("CLrecent")?.finding);
check("old no-charge read (past charge-lag window) -> lost_work", clf("CLold")?.finding === "lost_work", clf("CLold")?.finding);
check("lost_work count = 1 (only the matured one; recent months don't over-report)", cl.money.lost_work_count.total === 1, cl.money.lost_work_count.total);

console.log("\n— HARDENING: lost-work -> matched restatement (a later extract brings the charge) —");
const hwProd = [{ accession: "HW1", patient_key: "H1", date_of_service: "2026-02-10", report_finalized_ts: "2026-02-10T10:00:00", cpt: "70450", modality: "CT", reading_radiologist: "RH", ordering_provider: "OH" }];
const hwBill = [{ accession: "HW1", claim_id: "HC1", patient_key: "H1", date_of_service: "2026-02-10", claim_submission_date: "2026-02-12", payment_posting_date: "2026-03-12", site: "main", payer: "commercial", cpt: "70450", modifiers: "26", icd10: "R51", provider: "OH", charge: "200", allowed: "150", paid: "150", patient_responsibility: "0", adjustment: "50", carc: "", claim_status: "paid" }];
const before = runEngine([], hwProd, [], DEFAULT_PINS);
const after = runEngine(hwBill, hwProd, [], DEFAULT_PINS);
check("before the charge: HW1 is lost_work", before.facts.find((f) => f.key === "HW1")?.finding === "lost_work");
check("charge arrives on a later extract -> HW1 flips to matched (restatement)", after.facts.find((f) => f.key === "HW1")?.finding === "matched");
check("after: lost_work count = 0 (the 'lost' read was reclaimed)", after.money.lost_work_count.total === 0, after.money.lost_work_count.total);

console.log("\n— HARDENING: bridge-tier ambiguity (the fuzzy tier — no double-attach) —");
const baProd = [{ accession: "BA1", patient_key: "B1", date_of_service: "2026-02-15", report_finalized_ts: "2026-02-15T10:00:00", cpt: "74177", modality: "CT", reading_radiologist: "RB", ordering_provider: "OB" }];
const baBill = [
  { accession: "", claim_id: "BB1", patient_key: "B1", date_of_service: "2026-02-15", claim_submission_date: "", payment_posting_date: "2026-03-15", site: "main", payer: "commercial", cpt: "74177", modifiers: "", icd10: "R10.9", provider: "OB", charge: "500", allowed: "300", paid: "300", patient_responsibility: "0", adjustment: "200", carc: "", claim_status: "paid" },
  { accession: "", claim_id: "BB2", patient_key: "B1", date_of_service: "2026-02-15", claim_submission_date: "", payment_posting_date: "2026-03-16", site: "main", payer: "commercial", cpt: "74177", modifiers: "", icd10: "R10.9", provider: "OB", charge: "500", allowed: "300", paid: "300", patient_responsibility: "0", adjustment: "200", carc: "", claim_status: "paid" },
];
const ba = runEngine(baBill, baProd, [], DEFAULT_PINS);
check("exactly ONE billing row bridges to the read (no double-attach)", ba.facts.filter((f) => f.join_tier === "bridged").length === 1, ba.facts.filter((f) => f.join_tier === "bridged").length);
check("the second ambiguous row stays UNMATCHED (flagged, never silently merged)", ba.facts.filter((f) => f.join_tier === "unmatched").length === 1, ba.facts.filter((f) => f.join_tier === "unmatched").length);

console.log("\n— DETERMINISM —");
const r1 = JSON.stringify(runEngine(billingRaw, productionRaw, workflowRaw, DEFAULT_PINS).money);
const r2 = JSON.stringify(runEngine(billingRaw, productionRaw, workflowRaw, DEFAULT_PINS).money);
check("same inputs -> byte-identical money output", r1 === r2);

console.log("\n— RESTATEMENT (a provisional point firms, visibly) —");
// Most-mature load wins:
const deduped = dedupMostMature([
  { row: billingRaw.find((b) => b.claim_id === "C7")!, key: "C7", extract_date: "2026-06-01" },
  { row: billingRaw_laterA7, key: "C7", extract_date: "2026-07-01" },
]);
check("loader keeps the most-mature A7 (paid $100)", deduped[0].paid === "100", deduped[0].paid);
// Later extract + later reference date: 2026-05 collections move $0 -> $100 and de-shade.
const lateBilling = billingRaw.map((b) => (b.claim_id === "C7" ? billingRaw_laterA7 : b));
const latePins = { ...DEFAULT_PINS, reference_date: "2026-09-30" };
const late = runEngine(lateBilling, productionRaw, workflowRaw, latePins);
check("base run: 2026-05 collections = $0 (provisional)", eq(money.net_collections.byMonth["2026-05"] ?? 0, 0));
check("late run: 2026-05 collections firmed to $100", eq(late.money.net_collections.byMonth["2026-05"] ?? 0, 100), late.money.net_collections.byMonth["2026-05"]);
check("late run: 2026-05 no longer shaded (matured)", !late.money.net_collections.provisionalMonths.includes("2026-05"));

console.log(`\n[engine self-check] ${pass} passed, ${fail} failed.`);
if (fail > 0) process.exit(1);
