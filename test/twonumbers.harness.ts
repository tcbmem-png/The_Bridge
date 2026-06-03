// A Tale of Two Numbers — verification. Run: `node test/twonumbers.harness.ts`
// Asserts the deficit method + the two honesty invariants: yield is a CONSTANT under the lever
// (collections and wRVU scale together), and the lever is BOUNDED to the avoidable slice (coverage
// never reaches zero). Plus the suggestion/audit derivations, the redeploy gain, and determinism.

import { computeTwoNumbers, suggestTwoNumbers, auditPerWrvu, stipendVolumeSweep, practiceProfitSweep, defaultPracticeInputs, defaultTwoNumbersInputs, type TwoNumbersInputs } from "../src/sandbox/twonumbers.ts";
import { computeCurve, defaultCurveInputs } from "../src/sandbox/curve.ts";

let pass = 0, fail = 0;
const eq = (a: number, b: number, t = 0.5) => Math.abs(a - b) < t;
function check(label: string, cond: boolean, got?: unknown) {
  if (cond) { pass++; console.log("  PASS  " + label); }
  else { fail++; console.log("  FAIL  " + label + (got !== undefined ? `  (got: ${JSON.stringify(got)})` : "")); }
}
const d = defaultTwoNumbersInputs();
const b = computeTwoNumbers(d);

console.log("\n— THE DEFICIT METHOD (sanity numbers: $28 / $70 / $42 / ~$12.5M) —");
check("ER yield = collections ÷ wRVU = $28.00", eq(b.yield, 28, 0.01), b.yield);
check("fair cost = comp + overhead = $70.00", eq(b.fair, 70, 0.01), b.fair);
check("deficit = fair − yield = $42.00", eq(b.deficit, 42, 0.01), b.deficit);
check("stipend = deficit × ER wRVU = 297,000 × $42 = $12,474,000", eq(b.stipend, 12474000, 1), b.stipend);

console.log("\n— HONESTY 1: yield is a CONSTANT under the lever (collections & wRVU scale together) —");
{
  let held = true;
  for (const c of [0, 0.05, 0.1, 0.2, 0.3]) {
    const r = computeTwoNumbers({ ...d, cut: c });
    if (!eq(r.yield_cut, r.yield, 0.001)) held = false;
  }
  check("yield_cut == yield across the whole lever range (no manufactured drift)", held);
  const half = computeTwoNumbers({ ...d, cut: 0.15 });
  check("stipend tracks volume: stipend@cut = (1 − cut) × base stipend", eq(half.stipend, (1 - 0.15) * b.stipend, 1), { at_cut: half.stipend, expected: (1 - 0.15) * b.stipend });
}

console.log("\n— HONESTY 2: the lever is BOUNDED to the avoidable slice (coverage never zero) —");
{
  const over = computeTwoNumbers({ ...d, cut: 0.9 }); // ask for 90% — must clamp to the 30% cap
  check("cut clamps to the avoidable cap (0.9 → 0.30)", eq(over.cut_applied, 0.30, 0.001), over.cut_applied);
  check("wRVU after max cut stays at (1 − cap) × base > 0 — you never stop covering the ER", eq(over.wrvu_cut, 297000 * 0.70, 1) && over.wrvu_cut > 0, over.wrvu_cut);
  check("a stipend always remains on the necessary coverage (stipend@maxcut > 0)", over.stipend > 0, over.stipend);
}

console.log("\n— THE LEVER MECHANICS (removed, hospital saves, group redeploy gain) —");
{
  const r = computeTwoNumbers({ ...d, cut: 0.30, util: 1, redep: 90 });
  check("removed wRVU = cut × base = 89,100", eq(r.removed_wrvu, 297000 * 0.30, 1), r.removed_wrvu);
  check("hospital saves = removed × deficit", eq(r.hosp_save, r.removed_wrvu * b.deficit, 1), r.hosp_save);
  check("group gain (redep $90 > fair $70) is positive: util × removed × (redep − fair)", eq(r.group_gain, 1 * r.removed_wrvu * (90 - b.fair), 1), r.group_gain);
  const loss = computeTwoNumbers({ ...d, cut: 0.30, util: 1, redep: 60 }); // redeploy below fair cost
  check("group gain FLOORS at 0 when redeploy value < fair cost (you don't redeploy at a loss)", loss.group_gain === 0, loss.group_gain);
}

console.log("\n— DATA DRAWER: build the two numbers from aggregates —");
{
  const sug = suggestTwoNumbers(d.suggestion);
  check("suggested ER wRVU = total wRVU × ER share = 1,100,000 × 0.27 = 297,000", eq(sug.sugW, 297000, 1), sug.sugW);
  check("suggested ER collections = sugW × ER yield est = 297,000 × $28 = $8,316,000", eq(sug.sugC, 8316000, 1), sug.sugC);
}

console.log("\n— AUDIT DRAWER: the group's own all-in cost vs the pins —");
{
  const a = auditPerWrvu({ ...d.audit_aggregates, wrvu: d.wrvu, fair: b.fair });
  check("comp/wRVU = net ÷ total wRVU = 63.8M / 1.1M = $58.00", eq(a.aComp, 58, 0.05), a.aComp);
  check("overhead/wRVU = (total − net) ÷ total wRVU = 13.2M / 1.1M = $12.00", eq(a.aOvh, 12, 0.05), a.aOvh);
  check("all-in/wRVU = total ÷ total wRVU = $70.00 (reconciles to the fair-cost pin)", eq(a.aAll, 70, 0.05) && eq(a.aAll, b.fair, 0.05), a.aAll);
}

console.log("\n— NO-FEEDBACK + DETERMINISM —");
{
  const dc = defaultCurveInputs();
  const before = JSON.stringify(computeCurve({ ...dc, w: 11000 }));
  computeTwoNumbers(d);
  const after = JSON.stringify(computeCurve({ ...dc, w: 11000 }));
  check("computeCurve byte-identical with and without a computeTwoNumbers call (independent module)", before === after);
  check("same inputs → identical output", JSON.stringify(computeTwoNumbers({ ...d, cut: 0.2 })) === JSON.stringify(computeTwoNumbers({ ...d, cut: 0.2 })));
}

console.log("\n— THE VOLUME SWEEP (math, not law): with-stipend flat at 0, without-stipend plunges —");
{
  const sweep = stipendVolumeSweep(d, 0, 4, 0.5);
  const deficit = b.deficit; // 42
  check("WITH stipend: ER margin == 0 at EVERY volume (break-even; flat; adds no profit)", sweep.every(p => p.er_margin_with_stipend === 0), sweep.map(p => p.er_margin_with_stipend).slice(0, 5));
  check("WITHOUT stipend: ER margin = −deficit × ER wRVU (at today, −$12,474,000)", eq(sweep.find(p => p.m === 1)!.er_margin_no_stipend, -deficit * d.wrvu, 1), sweep.find(p => p.m === 1)!.er_margin_no_stipend);
  check("WITHOUT stipend plunges with volume — NO floor (at 4×, ≈ −$49.9M)", eq(sweep.find(p => p.m === 4)!.er_margin_no_stipend, -deficit * d.wrvu * 4, 1) && sweep.find(p => p.m === 4)!.er_margin_no_stipend < -40000000, sweep.find(p => p.m === 4)!.er_margin_no_stipend);
  check("WITHOUT stipend is strictly DECREASING in volume (more ER = more loss)", sweep.every((p, k) => k === 0 || p.er_margin_no_stipend < sweep[k - 1].er_margin_no_stipend));
  check("the GAP between the lines at any volume == the stipend (deficit × ER wRVU)", sweep.every(p => eq(p.er_margin_with_stipend - p.er_margin_no_stipend, p.stipend, 1)));
  check("the without-stipend slope per +1× volume is constant −deficit × wRVU", eq((sweep.find(p => p.m === 3)!.er_margin_no_stipend - sweep.find(p => p.m === 2)!.er_margin_no_stipend), -deficit * d.wrvu, 1));
  check("at 0× ER volume both lines meet at $0 (no ER → no loss, no contribution)", sweep[0].m === 0 && sweep[0].er_margin_no_stipend === 0 && sweep[0].er_margin_with_stipend === 0);
  check("with-stipend NEVER rises above 0 — you cannot earn your way up by adding ER volume", sweep.every(p => p.er_margin_with_stipend <= 0.0001));
}

console.log("\n— THE PRACTICE P&L (margin is a fraction; the flat line is COMPUTED, not plugged) —");
{
  const p = defaultPracticeInputs();
  const sweep = practiceProfitSweep(p, 0, 4, 0.5);
  const nonER_profit = (p.nonER_yield - p.fair_cost) * p.nonER_wrvu;
  check("non-ER is the profit engine: its yield > cost (positive margin)", p.nonER_yield > p.fair_cost, { yield: p.nonER_yield, cost: p.fair_cost });
  check("ER margin WITHOUT stipend = (revenue−cost)/revenue = (28−70)/28 = −150% (the loss RATE; doesn't improve with scale)", sweep.every(s => eq(s.er_margin_no_stipend, (28 - 70) / 28, 0.001)), sweep[2].er_margin_no_stipend);
  check("ER margin WITH stipend == 0% at every volume (revenue lifted to cost → break-even)", sweep.every(s => s.er_margin_with_stipend === 0));
  check("non-ER margin > 0 — the profit engine ((85.53−70)/85.53 ≈ +18%)", sweep[0].nonER_margin > 0 && eq(sweep[0].nonER_margin, (p.nonER_yield - p.fair_cost) / p.nonER_yield, 0.001), sweep[0].nonER_margin);
  check("partner profit WITH stipend is INVARIANT to ER volume — and equals (nonER collections − cost)/N, computed", sweep.every(s => eq(s.partner_profit_with_stipend, nonER_profit / p.N, 1)), sweep.map(s => s.partner_profit_with_stipend).slice(0, 5));
  check("partner profit WITHOUT stipend strictly DECLINES as ER volume rises", sweep.every((s, k) => k === 0 || s.partner_profit_no_stipend < sweep[k - 1].partner_profit_no_stipend));
  check("WITHOUT stipend goes NEGATIVE at high ER volume (no floor)", sweep.find(s => s.m === 4)!.partner_profit_no_stipend < 0, sweep.find(s => s.m === 4)!.partner_profit_no_stipend);
  check("at 0× ER volume the two lines MEET (ER contributes nothing either way)", eq(sweep[0].partner_profit_no_stipend, sweep[0].partner_profit_with_stipend, 0.01));
  check("the gap between the lines == stipend / N at every volume", sweep.every(s => eq(s.partner_profit_with_stipend - s.partner_profit_no_stipend, s.stipend / p.N, 1)));
  // it's CALCULATED, not a constant: raise the cost rate → with-stipend profit must drop (revenue − expense)
  const dearer = practiceProfitSweep({ ...p, fair_cost: p.fair_cost + 10 }, 0, 1, 1);
  check("the flat line is COMPUTED: raising the cost rate lowers with-stipend partner profit (not a pasted number)", dearer[0].partner_profit_with_stipend < sweep[0].partner_profit_with_stipend, { dearer: dearer[0].partner_profit_with_stipend, base: sweep[0].partner_profit_with_stipend });
  check("determinism", JSON.stringify(practiceProfitSweep(p, 0, 2, 0.5)) === JSON.stringify(practiceProfitSweep(p, 0, 2, 0.5)));
}

console.log(`\n[two-numbers self-check] ${pass} passed, ${fail} failed.`);
if (fail > 0) process.exit(1);
