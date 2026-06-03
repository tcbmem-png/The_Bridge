// §2A workflow-layer verification. Run: `node test/workflow.harness.ts`
// Asserts: the sum identity (avoidable_gap + structural_gap === coverage_shortfall); NOT-RIGGED for BOTH
// gaps (zero the share or set the bad yield = the good one → that gap collapses); below-w_core all-zero;
// two-lens independence (the metrics never bleed into each other); determinism; and the load-bearing
// guardrail — the workflow layer NEVER feeds back into the base curve (computeCurve is untouched by it).

import { computeCurve, computeWorkflowLayer, defaultCurveInputs, type WorkflowLayerInputs } from "../src/sandbox/curve.ts";

let pass = 0, fail = 0;
const eq = (a: number, b: number) => Math.abs(a - b) < 0.005;
function check(label: string, cond: boolean, got?: unknown) {
  if (cond) { pass++; console.log("  PASS  " + label); }
  else { fail++; console.log("  FAIL  " + label + (got !== undefined ? `  (got: ${JSON.stringify(got)})` : "")); }
}

// a base coverage slice with marginal < core and a worse-than-coverage night rate
const base: WorkflowLayerInputs = { cov_w: 4000, y_core: 55, y_cov: 25, night_share: 0.5, y_night: 15, avoidable_share: 0.4 };
const b = computeWorkflowLayer(base);

console.log("\n— ARITHMETIC (implemented verbatim) —");
check("night_w = cov_w × night_share (2000)", eq(b.night_w, 2000), b.night_w);
check("afterhours_gap = night_w × (y_core − y_night) = 2000 × 40 = 80,000", eq(b.afterhours_gap, 80000), b.afterhours_gap);
check("avoidable_w = cov_w × avoidable_share (1600)", eq(b.avoidable_w, 1600), b.avoidable_w);
check("structural_w = cov_w × (1 − avoidable_share) (2400)", eq(b.structural_w, 2400), b.structural_w);
check("coverage_shortfall = cov_w × (y_core − y_cov) = 4000 × 30 = 120,000", eq(b.coverage_shortfall, 120000), b.coverage_shortfall);
check("avoidable_gap = 1600 × 30 = 48,000", eq(b.avoidable_gap, 48000), b.avoidable_gap);
check("structural_gap = 2400 × 30 = 72,000", eq(b.structural_gap, 72000), b.structural_gap);

console.log("\n— THE SUM IDENTITY (the split is exhaustive — the two pieces ARE the whole shortfall) —");
check("avoidable_gap + structural_gap === coverage_shortfall", eq(b.avoidable_gap + b.structural_gap, b.coverage_shortfall), { sum: b.avoidable_gap + b.structural_gap, shortfall: b.coverage_shortfall });
// across a sweep of shares, the identity must hold exactly
{
  let ok = true;
  for (const s of [0, 0.15, 0.37, 0.5, 0.83, 1]) {
    const w = computeWorkflowLayer({ ...base, avoidable_share: s });
    if (!eq(w.avoidable_gap + w.structural_gap, w.coverage_shortfall)) ok = false;
  }
  check("identity holds across the full avoidable_share range [0..1]", ok);
}

console.log("\n— NOT-RIGGED · after-hours gap (the drag appears only when the inputs say it's there) —");
check("night_share = 0 → afterhours_gap = 0 (no night work, no gap)", eq(computeWorkflowLayer({ ...base, night_share: 0 }).afterhours_gap, 0));
check("y_night = y_core → afterhours_gap = 0 (night pays fairly, no gap)", eq(computeWorkflowLayer({ ...base, y_night: base.y_core }).afterhours_gap, 0));
check("afterhours_gap rises monotonically with night_share", computeWorkflowLayer({ ...base, night_share: 0.8 }).afterhours_gap > computeWorkflowLayer({ ...base, night_share: 0.3 }).afterhours_gap);

console.log("\n— NOT-RIGGED · avoidable split (collapses to structural when nothing is avoidable) —");
{
  const none = computeWorkflowLayer({ ...base, avoidable_share: 0 });
  check("avoidable_share = 0 → avoidable_gap = 0 AND structural_gap === coverage_shortfall", eq(none.avoidable_gap, 0) && eq(none.structural_gap, none.coverage_shortfall), none);
  const allv = computeWorkflowLayer({ ...base, avoidable_share: 1 });
  check("avoidable_share = 1 → structural_gap = 0 AND avoidable_gap === coverage_shortfall", eq(allv.structural_gap, 0) && eq(allv.avoidable_gap, allv.coverage_shortfall), allv);
  check("y_cov = y_core → coverage pays fairly → BOTH gaps = 0", (() => { const z = computeWorkflowLayer({ ...base, y_cov: base.y_core }); return eq(z.avoidable_gap, 0) && eq(z.structural_gap, 0) && eq(z.coverage_shortfall, 0); })());
}

console.log("\n— BELOW w_core (no coverage work → never a fabricated gap) —");
{
  const zero = computeWorkflowLayer({ ...base, cov_w: 0 });
  check("cov_w = 0 → every output is 0", [zero.night_w, zero.afterhours_gap, zero.avoidable_w, zero.structural_w, zero.coverage_shortfall, zero.avoidable_gap, zero.structural_gap].every((v) => v === 0), zero);
}

console.log("\n— TWO LENSES, NOT ONE (independent decompositions — they must not bleed) —");
check("changing night_share leaves the avoidable split unchanged", (() => { const a = computeWorkflowLayer({ ...base, night_share: 0.1 }), c = computeWorkflowLayer({ ...base, night_share: 0.9 }); return eq(a.avoidable_gap, c.avoidable_gap) && eq(a.structural_gap, c.structural_gap); })());
check("changing avoidable_share leaves the after-hours gap unchanged", (() => { const a = computeWorkflowLayer({ ...base, avoidable_share: 0.1 }), c = computeWorkflowLayer({ ...base, avoidable_share: 0.9 }); return eq(a.afterhours_gap, c.afterhours_gap); })());

console.log("\n— ROUNDING: the displayed split ALWAYS sums (derive structural by subtraction) —");
{
  // odd-dividing fixture that breaks INDEPENDENT rounding: cov_w=61, avoidable_share=0.5, (y_core−y_cov)=23.67.
  // §15's blind spot was its clean evenly-dividing fixtures; this lands on a case that broke pre-fix.
  const odd = computeWorkflowLayer({ cov_w: 61, y_core: 23.67, y_cov: 0, night_share: 0, y_night: 0, avoidable_share: 0.5 });
  check("odd fixture: coverage_shortfall = $1443.87", eq(odd.coverage_shortfall, 1443.87), odd.coverage_shortfall);
  check("odd fixture: avoidable_gap = $721.94", eq(odd.avoidable_gap, 721.94), odd.avoidable_gap);
  check("odd fixture: structural_gap = $721.93 (derived by subtraction, NOT an independent 721.94)", eq(odd.structural_gap, 721.93), odd.structural_gap);
  // "sum exactly" means the displayed CENT values reconcile — compared at cent precision, not raw float
  // (721.94 + 721.93 can land at 1443.8700000000001 in IEEE-754 though the cents are exact).
  check("displayed (cent) values reconcile: avoidable_gap + structural_gap = coverage_shortfall", eq(odd.avoidable_gap + odd.structural_gap, odd.coverage_shortfall), { sum: odd.avoidable_gap + odd.structural_gap, shortfall: odd.coverage_shortfall });
  // sweep odd dividers — there must be ZERO penny-breaks in the displayed split (pre-fix this broke ~9%)
  let breaks = 0, n = 0;
  for (let cw = 1; cw <= 200; cw++) for (const sh of [0.5, 0.333, 0.667, 0.123, 0.876]) {
    n++;
    const r = computeWorkflowLayer({ cov_w: cw, y_core: 23.67, y_cov: 0, night_share: 0, y_night: 0, avoidable_share: sh });
    if (Math.abs((r.avoidable_gap + r.structural_gap) - r.coverage_shortfall) >= 0.005) breaks++;
  }
  check(`odd-dividing sweep (${1000} cases): 0 penny-breaks in the displayed split`, breaks === 0, { breaks, of: n });
}

console.log("\n— NO-CLAMP: out-of-bound yields go NEGATIVE, never floored (the no-floor honesty rule) —");
{
  // §15 tests only the exact bound (y=y_core → 0); it can't catch a forbidden max(0, …) floor. This can.
  const ahNeg = computeWorkflowLayer({ ...base, y_night: 70 }); // y_night > y_core
  check("y_night > y_core → afterhours_gap < 0 (NOT floored to 0)", ahNeg.afterhours_gap < 0, ahNeg.afterhours_gap);
  check("concrete: base with y_night=$70 → afterhours_gap = −$30,000 (2000 night_w × −15)", eq(ahNeg.afterhours_gap, -30000), ahNeg.afterhours_gap);
  const sfNeg = computeWorkflowLayer({ ...base, y_cov: 70 }); // y_cov > y_core
  check("y_cov > y_core → coverage_shortfall < 0 (NOT floored to 0)", sfNeg.coverage_shortfall < 0, sfNeg.coverage_shortfall);
}

console.log("\n— THE BASE CURVE STAYS TWO-FEED (the layer never feeds back) —");
{
  const d = defaultCurveInputs();
  const curveAt = computeCurve({ ...d, w: 11000 });
  const cov_w = curveAt.cov_w;
  // computeWorkflowLayer consumes cov_w but cannot change the curve point — recompute and compare
  computeWorkflowLayer({ cov_w, y_core: d.y_core, y_cov: d.y_cov, night_share: 0.9, y_night: 5, avoidable_share: 0.9 });
  const curveAgain = computeCurve({ ...d, w: 11000 });
  check("computeCurve output is identical regardless of any workflow-layer call", JSON.stringify(curveAt) === JSON.stringify(curveAgain));
  check("layer reads cov_w from the curve (cov_w = max(0, w − w_core) = 3000 at w=11000)", eq(cov_w, 3000), cov_w);
}

console.log("\n— DEFAULTS + DETERMINISM —");
{
  const d = defaultCurveInputs();
  check("y_night <= y_cov (the after-hours mix is worse than the coverage lane)", d.y_night <= d.y_cov, { y_night: d.y_night, y_cov: d.y_cov });
  check("workflow pins surfaced as labeled placeholders", d.placeholders.includes("night_share") && d.placeholders.includes("y_night") && d.placeholders.includes("avoidable_share"));
  check("same inputs → identical layer", JSON.stringify(computeWorkflowLayer(base)) === JSON.stringify(computeWorkflowLayer(base)));
}

console.log(`\n[workflow self-check] ${pass} passed, ${fail} failed.`);
if (fail > 0) process.exit(1);
