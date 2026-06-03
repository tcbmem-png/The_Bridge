// Sandbox curve verification. Run: `node test/curve.harness.ts`
// Asserts: CF reconciles to the money config (single source); the piecewise shape; next_1k collapse;
// determinism; and — the one that matters — the NOT-RIGGED assertion: set marginal yield ≈ core yield
// and the curve MUST stay steep / grinding helps. If it can only ever bend our way, it's broken.

import { computeCurve, curveSeries, deriveYieldForMix, defaultCurveInputs, ILLUSTRATIVE_CORE_MIX, ILLUSTRATIVE_COVERAGE_MIX } from "../src/sandbox/curve.ts";
import { DEFAULT_PINS } from "../src/config/pins.ts";

let pass = 0, fail = 0;
const eq = (a: number, b: number) => Math.abs(a - b) < 0.005;
function check(label: string, cond: boolean, got?: unknown) {
  if (cond) { pass++; console.log("  PASS  " + label); }
  else { fail++; console.log("  FAIL  " + label + (got !== undefined ? `  (got: ${JSON.stringify(got)})` : "")); }
}

const CF = DEFAULT_PINS.conversion_factor; // 33.40
const d = defaultCurveInputs();

console.log("\n— SINGLE SOURCE (yields read the money-module conversion factor) —");
check("a 100% Medicare mix yields exactly the CF ($33.40) — reconciles to the money config", eq(deriveYieldForMix({ medicare: 1, medicaid: 0, commercial: 0, self_pay: 0 }), CF), deriveYieldForMix({ medicare: 1, medicaid: 0, commercial: 0, self_pay: 0 }));
check("y_core ($51.95) derived from CF + core mix", eq(d.y_core, 51.95), d.y_core);
check("y_cov ($24.42) derived from CF + coverage mix", eq(d.y_cov, 24.42), d.y_cov);
check("y_cov < y_core (the structural truth — marginal coverage pays less)", d.y_cov < d.y_core);

console.log("\n— THE SHAPE (steep core slope, shallow coverage tail) —");
const lo = computeCurve({ ...d, w: 4000 });   // below w_core
const hi = computeCurve({ ...d, w: 10000 });  // above w_core
check("below w_core: collections = w × y_core", eq(lo.collections, 4000 * d.y_core), lo.collections);
check("avg_yield declines past w_core (46.44 < 51.95)", hi.avg_yield < lo.avg_yield && eq(lo.avg_yield, 51.95), { lo: lo.avg_yield, hi: hi.avg_yield });
check("next_1k collapses past w_core: $24,420 < $51,950 (diminishing returns to effort)", hi.next_1k_bonus < lo.next_1k_bonus && eq(hi.next_1k_bonus, 24420) && eq(lo.next_1k_bonus, 51950), { lo: lo.next_1k_bonus, hi: hi.next_1k_bonus });
check("underwater at low w, positive at high w (bonus = collections − F − B)", lo.underwater === true && computeCurve({ ...d, w: 16000 }).underwater === false);

console.log("\n— THE NOT-RIGGED ASSERTION (set marginal yield ≈ core yield → grinding HELPS) —");
const rigged = { ...d, y_cov: d.y_core }; // operator sets marginal coverage yield = core yield
const rs = curveSeries(rigged, d.w_min, d.w_max);
const strictlyIncreasing = rs.every((p, k) => k === 0 || p.bonus_per_partner > rs[k - 1].bonus_per_partner);
check("with y_cov ≈ y_core, bonus is STRICTLY INCREASING — grinding helps the whole way", strictlyIncreasing);
check("with y_cov ≈ y_core, avg_yield stays FLAT (no manufactured drift)", eq(rs[0].avg_yield, rs[rs.length - 1].avg_yield) && eq(rs[0].avg_yield, d.y_core), { first: rs[0].avg_yield, last: rs[rs.length - 1].avg_yield });
const rHi = computeCurve({ ...rigged, w: 10000 }), rLo = computeCurve({ ...rigged, w: 4000 });
check("with y_cov ≈ y_core, next_1k does NOT collapse (same below and above w_core)", eq(rHi.next_1k_bonus, rLo.next_1k_bonus), { lo: rLo.next_1k_bonus, hi: rHi.next_1k_bonus });

const ds = curveSeries(d, d.w_min, d.w_max);
check("CONTRAST — at default (y_cov<y_core), avg_yield DOES decline (flattening is earned, not baked)", ds[ds.length - 1].avg_yield < ds[Math.floor((d.w_core - d.w_min) / 250)].avg_yield);

console.log("\n— PHASE-2 OVERLAY (a fair coverage rate shifts the curve up) —");
const withFair = computeCurve({ ...d, w: 10000, y_cov_fair: d.y_core });
check("P_fair sits ABOVE P past w_core (the shift, not the slide)", (withFair.bonus_fair ?? -Infinity) > withFair.bonus_per_partner);

console.log("\n— DETERMINISM + PINS —");
check("same inputs → identical point", JSON.stringify(computeCurve({ ...d, w: 9000 })) === JSON.stringify(computeCurve({ ...d, w: 9000 })));
check("human-gated pins surfaced as placeholders (not guessed)", d.placeholders.includes("w_core") && d.placeholders.includes("F") && d.placeholders.includes("N"));

console.log(`\n[curve self-check] ${pass} passed, ${fail} failed.`);
if (fail > 0) process.exit(1);
