// Module A — fall what-if verification (addendum). Run: `node test/fall.harness.ts`
// Asserts the two-effects separation (need' depends ONLY on reduce; redeploy decides the group P&L),
// the break-even (y_fall/y_redeploy), the conservative defaults (no optimistic baseline), no-floor on
// need'/gaps, the closed form for group_coll_delta, and determinism.

import { computeFallWhatIf, defaultSiteInputs, defaultFallInputs, type FallInputs } from "../src/sandbox/site.ts";

let pass = 0, fail = 0;
const eq = (a: number, b: number, t = 0.5) => Math.abs(a - b) < t;
function check(label: string, cond: boolean, got?: unknown) {
  if (cond) { pass++; console.log("  PASS  " + label); }
  else { fail++; console.log("  FAIL  " + label + (got !== undefined ? `  (got: ${JSON.stringify(got)})` : "")); }
}
const base = defaultSiteInputs();
const f = defaultFallInputs();

console.log("\n— CONSERVATIVE DEFAULTS (no optimistic baseline) —");
check("default reduce = 0 and redeploy = 0", f.reduce === 0 && f.redeploy === 0);
{
  const b0 = computeFallWhatIf(base, f);
  check("reduce = 0 → baseline: need' == need_baseline, group_coll_delta == 0, scans_cut == 0", eq(b0.need, b0.need_baseline) && b0.group_coll_delta === 0 && b0.scans_cut === 0, { need: b0.need, base: b0.need_baseline, delta: b0.group_coll_delta });
  check("break-even redeploy = y_fall / y_redeploy ≈ 0.21 (18/85)", eq(b0.breakeven_redeploy, 18 / 85, 0.005), b0.breakeven_redeploy);
}

console.log("\n— EFFECT 1: `reduce` shrinks the NEED, independent of redeploy —");
{
  const half0 = computeFallWhatIf(base, { ...f, reduce: 0.5, redeploy: 0 });
  const half1 = computeFallWhatIf(base, { ...f, reduce: 0.5, redeploy: 1 });
  const full = computeFallWhatIf(base, { ...f, reduce: 1, redeploy: 0 });
  check("need' DROPS as reduce rises (need@0.5 < need_baseline)", half0.need < half0.need_baseline, { at_half: half0.need, base: half0.need_baseline });
  check("need' is MONOTONE in reduce (need@1.0 < need@0.5)", full.need < half0.need, { at_full: full.need, at_half: half0.need });
  check("need' is INDEPENDENT of redeploy (same reduce, redeploy 0 vs 1 → identical need')", eq(half0.need, half1.need, 0.01), { r0: half0.need, r1: half1.need });
  check("reads avoided (scans_cut) > 0 once reduce > 0 — the patient win", half0.scans_cut > 0, half0.scans_cut);
}

console.log("\n— EFFECT 2: `redeploy` decides the GROUP P&L (break-even flip) —");
{
  const be = 18 / 85;
  const below = computeFallWhatIf(base, { ...f, reduce: 1, redeploy: be - 0.1 });
  const at = computeFallWhatIf(base, { ...f, reduce: 1, redeploy: be });
  const above = computeFallWhatIf(base, { ...f, reduce: 1, redeploy: be + 0.3 });
  check("below break-even → group LOSES volume (group_coll_delta < 0)", below.group_coll_delta < 0 && below.group_gains === false, below.group_coll_delta);
  check("at break-even → group_coll_delta ≈ 0", eq(at.group_coll_delta, 0, 1), at.group_coll_delta);
  check("above break-even → group GAINS (group_coll_delta > 0)", above.group_coll_delta > 0 && above.group_gains === true, above.group_coll_delta);
  check("redeploy = 0 with reduce > 0 → group loses (conservative, not optimistic)", computeFallWhatIf(base, { ...f, reduce: 1, redeploy: 0 }).group_coll_delta < 0);
  // closed form: group_coll_delta == scans_cut * (redeploy*y_redeploy - y_fall)
  const r = computeFallWhatIf(base, { ...f, reduce: 0.7, redeploy: 0.4 });
  check("closed form: group_coll_delta = scans_cut × (redeploy·y_redeploy − y_fall)", eq(r.group_coll_delta, r.scans_cut * (0.4 * f.y_redeploy - f.y_fall), 1), { delta: r.group_coll_delta, closed: r.scans_cut * (0.4 * f.y_redeploy - f.y_fall) });
}

console.log("\n— NO FLOOR (need'/gaps signed; an aggressive low-yield cut can over-correct a site past the line) —");
{
  const aggressive: FallInputs = { ...f, reduce: 1, y_fall: 5, avoidable_share: { "Emergency Dept": 0.5, "Pediatric ER": 0.5 } };
  const a = computeFallWhatIf(base, aggressive);
  const er = a.sites.find(s => s.name === "Emergency Dept")!;
  check("removing low-yield work raises a catch-site ABOVE the line → its gap1 < 0 (no floor)", er.gap1 < 0, er.gap1);
}

console.log("\n— DETERMINISM —");
check("same inputs → identical projection", JSON.stringify(computeFallWhatIf(base, { ...f, reduce: 0.5, redeploy: 0.3 })) === JSON.stringify(computeFallWhatIf(base, { ...f, reduce: 0.5, redeploy: 0.3 })));

console.log("\n— REDEPLOY ROUTING —");
{
  const r = computeFallWhatIf(base, { ...f, reduce: 1, redeploy: 1 });
  const tgt = r.sites.find(s => s.is_target)!;
  check("the redeploy target is the Outside Specialty and it GROWS (wrvu1 > wrvu0)", tgt.name === "Outside Specialty" && tgt.wrvu1 > tgt.wrvu0, { name: tgt.name, w0: tgt.wrvu0, w1: tgt.wrvu1 });
  check("redeployed_w = redeploy × Σ removed (full redeploy → equals scans_cut)", eq(r.redeployed_w, r.scans_cut, 1), { redeployed: r.redeployed_w, cut: r.scans_cut });
}

console.log(`\n[fall self-check] ${pass} passed, ${fail} failed.`);
if (fail > 0) process.exit(1);
