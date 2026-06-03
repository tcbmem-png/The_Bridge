// Phase 3a verification — the 36-month series + operator snapshot. Run: `node test/series.harness.ts`
// Asserts the series produces a real SLOPE/INFLECTION, lanes stay disjoint at scale, the immature edge
// shades only payment metrics, the snapshot carries provenance + drill-able facts, and it's deterministic.

import { runEngine } from "../src/engine.ts";
import { classifyAndRoute, nightERBlock } from "../src/transmission/transmission.ts";
import { sumCoverageGap } from "../src/money/index.ts";
import { DEFAULT_PINS } from "../src/config/pins.ts";
import { generateSeries } from "../fixtures/series.ts";
import { buildSnapshot, PROVENANCE } from "../src/snapshot.ts";

let pass = 0, fail = 0;
const eq = (a: number, b: number) => Math.abs(a - b) < 0.005;
function check(label: string, cond: boolean, got?: unknown) {
  if (cond) { pass++; console.log("  PASS  " + label); }
  else { fail++; console.log("  FAIL  " + label + (got !== undefined ? `  (got: ${JSON.stringify(got)})` : "")); }
}

const series = generateSeries("2026-05");
const { facts, money } = runEngine(series.billingRaw, series.productionRaw, series.workflowRaw, DEFAULT_PINS);
const tx = classifyAndRoute(facts, money, DEFAULT_PINS);

console.log("\n— THE SERIES (36 months) —");
check("36 service months present", money.months.length === 36, money.months.length);
check("inflection month is the midpoint", series.inflectionMonth === money.months[18], series.inflectionMonth);

console.log("\n— THE SLOPE (self-pay rises in the back half) —");
const selfInMonths = (ms: string[]) => facts.filter((f) => f.billing?.payer === "self_pay" && ms.includes(f.service_month)).length;
const firstSix = money.months.slice(0, 6), lastSix = money.months.slice(-6);
const earlySelf = selfInMonths(firstSix), lateSelf = selfInMonths(lastSix);
check("self-pay count higher in last 6 months than first 6 (real inflection)", lateSelf > earlySelf, { earlySelf, lateSelf });
const earlyNoPay = firstSix.reduce((s, m) => s + (money.no_pay_dollars.byMonth[m] ?? 0), 0);
const lateNoPay = lastSix.reduce((s, m) => s + (money.no_pay_dollars.byMonth[m] ?? 0), 0);
check("no-pay $ higher in last 6 months than first 6", lateNoPay > earlyNoPay, { earlyNoPay, lateNoPay });

console.log("\n— LANES still hold at scale —");
check("recoverable total > 0", tx.recoverable.total > 0, tx.recoverable.total);
check("structural components > 0 (no-pay AND shortfall, kept separate — no fused total)", tx.structural.no_pay_dollars > 0 && tx.structural.underpay_shortfall_dollars > 0 && !("total" in tx.structural), { no_pay: tx.structural.no_pay_dollars, shortfall: tx.structural.underpay_shortfall_dollars });
check("recoverable & structural disjoint", tx.integrity.disjoint === true);
const cg = sumCoverageGap(facts, DEFAULT_PINS);
check("single source: helper no-pay == money no-pay", eq(cg.no_pay_dollars, money.no_pay_dollars.total));
check("single source: helper shortfall == money shortfall", eq(cg.underpay_shortfall_dollars, money.underpay_shortfall_dollars.total));

console.log("\n— MATURITY EDGE (shade payment only) —");
check("net collections shades the trailing 4 months", money.net_collections.provisionalMonths.length === 4, money.net_collections.provisionalMonths);
check("production volume never shaded", money.production_volume_wrvu.provisionalMonths.length === 0);
check("newest month is in the shaded band", money.net_collections.provisionalMonths.includes(money.months[35]));
check("oldest month is NOT shaded", !money.net_collections.provisionalMonths.includes(money.months[0]));

console.log("\n— NIGHT-ER block at scale —");
const night = nightERBlock(facts, DEFAULT_PINS);
check("after-hours reads > 0", night.after_hours_reads > 0, night.after_hours_reads);
check("after-hours structural no-pay $ > 0 (worst mix concentrates at night)", night.structural_after_hours.no_pay_dollars > 0, night.structural_after_hours.no_pay_dollars);
check("Children's appears in the site cut", "childrens" in night.by_site, night.by_site);

console.log("\n— SNAPSHOT (what the front end reads) —");
const snap = buildSnapshot(DEFAULT_PINS);
check("snapshot has 36 months", snap.months.length === 36);
check("snapshot carries provenance for every panel metric", Object.keys(PROVENANCE).length >= 9 && "no_pay_dollars" in snap.provenance && "night_block" in snap.provenance);
check("every sample fact is drill-able (join_tier + finding present)", snap.sampleFacts.length > 0 && snap.sampleFacts.every((f) => !!f.join_tier && !!f.finding));
check("snapshot stamped illustrative / not-a-PHI-claim", /ILLUSTRATIVE/.test(snap.note));

console.log("\n— DETERMINISM —");
const a = JSON.stringify(buildSnapshot(DEFAULT_PINS).trends);
const b = JSON.stringify(buildSnapshot(DEFAULT_PINS).trends);
check("same series -> byte-identical money output", a === b);

console.log(`\n[series self-check] ${pass} passed, ${fail} failed.`);
if (fail > 0) process.exit(1);
