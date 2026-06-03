// Site-block verification (spec §8). Run: `node test/site.harness.ts`
// Asserts: aggregation invariant (Σ = W_total / C_total to the cent); net-zero identity on an ODD-dividing
// fixture (Σ gap === 0 post-rounding); NOT-RIGGED (equal mixes → every gap 0); NO-CLAMP (richer-than-blend
// → negative gap, not floored); single-source CF; NO-FEEDBACK (curve/§2A byte-identical); determinism.

import { computeSiteBlock, defaultSiteInputs, validateSiteInputs, type SiteBlockInputs, type PayerMix } from "../src/sandbox/site.ts";
import { computeCurve, computeWorkflowLayer, defaultCurveInputs } from "../src/sandbox/curve.ts";
import { DEFAULT_PINS } from "../src/config/pins.ts";

let pass = 0, fail = 0;
const eq = (a: number, b: number) => Math.abs(a - b) < 0.005;
function check(label: string, cond: boolean, got?: unknown) {
  if (cond) { pass++; console.log("  PASS  " + label); }
  else { fail++; console.log("  FAIL  " + label + (got !== undefined ? `  (got: ${JSON.stringify(got)})` : "")); }
}
const CF = DEFAULT_PINS.conversion_factor;
const d = defaultSiteInputs();
const b = computeSiteBlock(d);

console.log("\n— ANCHORS + SHAPE —");
check("y_bar = C_total / W_total (the reference line, derived)", eq(b.y_bar, d.C_total / d.W_total), b.y_bar);
check("inputs validate (shares sum to 1; each mix sums to 1)", validateSiteInputs(d).length === 0, validateSiteInputs(d));
check("the outside specialty is the largest surplus (residual)", b.sites.find(s => s.is_residual)?.name === "Outside Specialty", b.sites.find(s => s.is_residual)?.name);
check("ER + Pediatric ER are deficits (gap > 0); Outside is surplus (gap < 0)",
  (b.sites.find(s => s.name === "Emergency Dept")!.gap > 0) && (b.sites.find(s => s.name === "Pediatric ER")!.gap > 0) && (b.sites.find(s => s.name === "Outside Specialty")!.gap < 0));

console.log("\n— §8.1 AGGREGATION INVARIANT (headline numbers never drift) —");
check("Σ collections == C_total, to the cent (residual-by-subtraction)", eq(b.sites.reduce((a, s) => a + s.collections, 0), d.C_total), b.sites.reduce((a, s) => a + s.collections, 0));
check("Σ wrvu == W_total, to the cent", eq(b.sites.reduce((a, s) => a + s.wrvu, 0), d.W_total), b.sites.reduce((a, s) => a + s.wrvu, 0));

console.log("\n— §8.2 NET-ZERO IDENTITY on an ODD-dividing fixture (Σ gap === 0 post-rounding) —");
{
  const odd: SiteBlockInputs = {
    W_total: 137, C_total: 10000, // odd anchors
    sites: [
      { name: "A", kind: "hospital", is_catch_site: true,  wrvu_share: 0.31, payer_mix: { medicare: 0.18, medicaid: 0.47, commercial: 0.11, self_pay: 0.24 } },
      { name: "B", kind: "hospital", is_catch_site: true,  wrvu_share: 0.13, payer_mix: { medicare: 0.13, medicaid: 0.52, commercial: 0.12, self_pay: 0.23 } },
      { name: "C", kind: "hospital", is_catch_site: false, wrvu_share: 0.19, payer_mix: { medicare: 0.27, medicaid: 0.14, commercial: 0.54, self_pay: 0.05 } },
      { name: "D", kind: "hospital", is_catch_site: false, wrvu_share: 0.21, payer_mix: { medicare: 0.41, medicaid: 0.19, commercial: 0.36, self_pay: 0.04 } },
      { name: "E", kind: "group_outside", is_catch_site: false, wrvu_share: 0.16, payer_mix: { medicare: 0.19, medicaid: 0.06, commercial: 0.73, self_pay: 0.02 } },
    ],
  };
  const ob = computeSiteBlock(odd);
  const sumGap = ob.sites.reduce((a, s) => a + s.gap, 0);
  check("Σ round2(gap_i) === 0 exactly on the odd-dividing fixture", eq(sumGap, 0), sumGap);
  check("Σ collections == C_total on the odd fixture", eq(ob.sites.reduce((a, s) => a + s.collections, 0), odd.C_total), ob.sites.reduce((a, s) => a + s.collections, 0));
  // sweep odd anchors/shares — zero net-zero breaks
  let breaks = 0, n = 0;
  for (let W = 101; W <= 151; W += 7) for (const C of [9999, 12345, 7777]) {
    n++;
    const r = computeSiteBlock({ ...odd, W_total: W, C_total: C });
    if (!eq(r.sites.reduce((a, s) => a + s.gap, 0), 0)) breaks++;
  }
  check(`odd-dividing sweep (${24} cases): 0 net-zero breaks`, breaks === 0, { breaks, of: n });
}

console.log("\n— §8.3 NOT-RIGGED: equal mixes → zero gaps (deficit must be EARNED) —");
{
  const flatMix: PayerMix = { medicare: 0.25, medicaid: 0.25, commercial: 0.25, self_pay: 0.25 };
  const eqInputs: SiteBlockInputs = { W_total: d.W_total, C_total: d.C_total, sites: d.sites.map(s => ({ ...s, payer_mix: { ...flatMix } })) };
  const eb = computeSiteBlock(eqInputs);
  check("every gap == 0 when all site mixes are equal", eb.sites.every(s => s.gap === 0), eb.sites.map(s => s.gap));
  check("stipend_need == 0 when all mixes are equal", eb.stipend_need === 0, eb.stipend_need);
  check("every yield_eff == y_bar when mixes are equal", eb.sites.every(s => eq(s.yield_eff, eb.y_bar)));
}

console.log("\n— §8.4 NO-CLAMP: a richer-than-blend site returns a NEGATIVE gap (never floored) —");
check("Outside Specialty (richest mix) gap < 0", b.sites.find(s => s.name === "Outside Specialty")!.gap < 0, b.sites.find(s => s.name === "Outside Specialty")!.gap);
check("Surgery + Inpatient (above-blend) also < 0", b.sites.find(s => s.name === "Surgery")!.gap < 0 && b.sites.find(s => s.name === "Inpatient")!.gap < 0);

console.log("\n— §8.5 SINGLE-SOURCE CF (no second copy) —");
{
  const oneMedicare: SiteBlockInputs = { W_total: 1000, C_total: 50000, sites: [
    { name: "M", kind: "hospital", is_catch_site: false, wrvu_share: 1, payer_mix: { medicare: 1, medicaid: 0, commercial: 0, self_pay: 0 } },
  ] };
  check(`a 100% Medicare site → mix_yield == CF ($${CF})`, eq(computeSiteBlock(oneMedicare).sites[0].mix_yield, CF), computeSiteBlock(oneMedicare).sites[0].mix_yield);
}

console.log("\n— §8.6 NO-FEEDBACK: curve / §2A byte-identical with and without a site-block call —");
{
  const dc = defaultCurveInputs();
  const curveBefore = JSON.stringify(computeCurve({ ...dc, w: 11000 }));
  const wfBefore = JSON.stringify(computeWorkflowLayer({ cov_w: 3000, y_core: dc.y_core, y_cov: dc.y_cov, night_share: 0.5, y_night: 20, avoidable_share: 0.4 }));
  computeSiteBlock(d); // call the site block
  const curveAfter = JSON.stringify(computeCurve({ ...dc, w: 11000 }));
  const wfAfter = JSON.stringify(computeWorkflowLayer({ cov_w: 3000, y_core: dc.y_core, y_cov: dc.y_cov, night_share: 0.5, y_night: 20, avoidable_share: 0.4 }));
  check("computeCurve unchanged by a computeSiteBlock call", curveBefore === curveAfter);
  check("computeWorkflowLayer unchanged by a computeSiteBlock call", wfBefore === wfAfter);
}

console.log("\n— §8.7 DETERMINISM + degenerate share —");
check("same inputs → identical SiteBlock", JSON.stringify(computeSiteBlock(d)) === JSON.stringify(computeSiteBlock(d)));
{
  const z: SiteBlockInputs = { W_total: d.W_total, C_total: d.C_total, sites: [
    { name: "Zero", kind: "hospital", is_catch_site: false, wrvu_share: 0, payer_mix: { medicare: 0.25, medicaid: 0.25, commercial: 0.25, self_pay: 0.25 } },
    { name: "Rest", kind: "group_outside", is_catch_site: false, wrvu_share: 1, payer_mix: { medicare: 0.25, medicaid: 0.25, commercial: 0.25, self_pay: 0.25 } },
  ] };
  check("a site with wrvu_share = 0 → wrvu 0 and yield_eff 0 (no divide-by-zero, no fabricated yield)", (() => { const r = computeSiteBlock(z).sites[0]; return r.wrvu === 0 && r.yield_eff === 0; })());
}

console.log("\n— THE NEED (illustrative) —");
check("stipend_need = signed Σ of the catch-site (ER + ped ER) gaps, > 0 here", b.stipend_need > 0 && eq(b.stipend_need, b.sites.filter(s => s.is_catch_site).reduce((a, s) => a + s.gap, 0)), { need: b.stipend_need });

console.log("\n— SANITY NUMBERS (the builder-prompt reference: confirm the defaults reconcile) —");
{
  const er = b.sites.find(s => s.name === "Emergency Dept")!;
  const ped = b.sites.find(s => s.name === "Pediatric ER")!;
  const near = (a: number, target: number, tol: number) => Math.abs(a - target) <= tol;
  check("y_bar = $60/wRVU", eq(b.y_bar, 60), b.y_bar);
  check("ER deficit ≈ $7.5M", near(er.gap, 7_500_000, 120_000), er.gap);
  check("Pediatric ER deficit ≈ $3.1M", near(ped.gap, 3_100_000, 120_000), ped.gap);
  check("stipend_need ≈ $10.5M", near(b.stipend_need, 10_500_000, 120_000), b.stipend_need);
}

console.log(`\n[site self-check] ${pass} passed, ${fail} failed.`);
if (fail > 0) process.exit(1);
