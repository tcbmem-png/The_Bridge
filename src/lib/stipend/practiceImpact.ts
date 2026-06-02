// Practice-impact engine for /stipend. One pure function, signed (no floors),
// deterministic, no network. Does NOT duplicate or alter the left
// `computeTwoNumbers` engine in src/routes/stipend.tsx — the bridge layer
// reads/writes both states; the view renders this function's output.
//
// All defaults are illustrative; the demo reconciles at erYield = 28 (NOT 26):
// at compPool $63.8M, erShare 0.27, N=100 → totalWrvu 1.1M, collections $77M,
// overhead $12/wRVU, distribution $8/wRVU, stipend $10.10M, distribution
// per partner $88k (without stipend) / $189k (with stipend).

export type PracticeImpactInputs = {
  compPool: number; // R1 · physician compensation pool ($)
  erShare: number; // R2 · ER share of work (fraction 0..1)
  partnerCount: number; // N · per-partner divisor

  // levers
  stipendOn: boolean;
  cutFrac: number; // 0..1 of avoidable cap (UI clamps to 0..0.30)
  redeployUtil: number; // 0..1

  // benchmark pins (all editable in principle; defaults in DEFAULTS below)
  fmvComp: number; // FMV clinical comp /wRVU ($50 median)
  compActualPerWrvu: number; // pool→wRVU realised rate ($58, NOT fmvComp)
  compToCollections: number; // MGMA ratio (0.83)
  overheadPerWrvu: number; // optional override; otherwise residual
  erYield: number; // demo default $28 (audit replaces)
  // nonErYieldBench unused in top-down (residual); kept for bottom-up callers
  nonErYieldBench?: number;
};

export type Scenario = {
  distributionTotal: number;
  distributionPerPartner: number;
};

export type PracticeImpactOutputs = {
  // structural
  totalWrvu: number;
  collections: number;
  overheadPerWrvu: number;
  erWrvu: number;
  erColl: number;
  erYield: number;
  nonErYield: number;
  fairCost: number;
  distributionPerWrvu: number;

  // stipend
  stipend: number;

  // distribution (current scenario per inputs)
  distributionTotal: number;
  distributionPerPartner: number;

  // cut+redeploy
  hospitalSaves: number;
  freedWrvu: number;
  redeployGain: number;

  // scenarios at today's ER volume
  scenarios: {
    A_noStipend: Scenario;
    B_withStipend: Scenario;
    C_optimized: Scenario;
  };

  // volume sweep for the SVG chart
  volumeSweep: Array<{ erWrvu: number; distWith: number; distWithout: number }>;
};

export const PRACTICE_IMPACT_DEFAULTS = {
  fmvComp: 50,
  compActualPerWrvu: 58,
  compToCollections: 0.83,
  overheadPerWrvu: 12, // residual; only used as fallback display
  erYield: 28, // demo default — reconciles to $10.10M stipend
} as const;

export const AVOIDABLE_CAP = 0.3;

/** Top-down from (compPool, erShare). Signed; no floors. */
export function computePracticeImpact(i: PracticeImpactInputs): PracticeImpactOutputs {
  const P = i.compPool;
  const s = i.erShare;
  const N = Math.max(1, i.partnerCount);

  const totalWrvu = i.compActualPerWrvu > 0 ? P / i.compActualPerWrvu : 0;
  const collections = i.compToCollections > 0 ? P / i.compToCollections : 0;
  const overheadPerWrvu = totalWrvu > 0 ? (collections - P) / totalWrvu : 0;

  const erWrvu = totalWrvu * s;
  const erYield = i.erYield;
  const erColl = erWrvu * erYield;

  const nonErWrvu = totalWrvu - erWrvu;
  const nonErColl = collections - erColl;
  const nonErYield = nonErWrvu > 0 ? nonErColl / nonErWrvu : 0;

  const fairCost = i.fmvComp + overheadPerWrvu; // ≈ $62
  const distributionPerWrvu = i.compActualPerWrvu - i.fmvComp; // ≈ $8

  // Per-wRVU ER deficit (signed). At demo: 62 − 28 = $34.
  const erDeficitPerWrvu = fairCost - erYield;

  // Stipend funds the deficit at TODAY's ER volume.
  const stipend = erWrvu * erDeficitPerWrvu;

  // Baseline distribution (today, no stipend) = (compActual − fmv) × totalWrvu.
  // This is the comp-pool slice above the FMV clinical wage — what already
  // absorbs the ER drag in the realised state.
  const distTotalBase = distributionPerWrvu * totalWrvu;

  // Distribution as a function of marginal ER volume relative to today:
  //   without stipend: dist(x) = base + erDeficitPerWrvu × (today − x)
  //                            = base − erDeficitPerWrvu × (x − today)
  //   with stipend:    dist(x) = base + erDeficitPerWrvu × today   (constant)
  const distWithoutAt = (x: number) =>
    distTotalBase - erDeficitPerWrvu * (x - erWrvu);
  const distWithAt = (_x: number) => distTotalBase + erDeficitPerWrvu * erWrvu;

  // Cut + redeploy (only operates on TODAY's ER wRVU).
  const cut = Math.min(Math.max(i.cutFrac, 0), AVOIDABLE_CAP);
  const freedWrvu = erWrvu * cut;
  const hospitalSaves = freedWrvu * erDeficitPerWrvu;
  // signed: redeploy below fair cost is a loss, not a wash
  const redeployGain = i.redeployUtil * freedWrvu * (nonErYield - fairCost);

  // Current scenario distribution (what the headline shows)
  const distTotal = i.stipendOn ? distWithAt(erWrvu) : distWithoutAt(erWrvu);
  const distributionTotal = distTotal + (i.stipendOn ? redeployGain : 0);
  const distributionPerPartner = distributionTotal / N;

  const scenarios = {
    A_noStipend: {
      distributionTotal: distWithoutAt(erWrvu),
      distributionPerPartner: distWithoutAt(erWrvu) / N,
    },
    B_withStipend: {
      distributionTotal: distWithAt(erWrvu),
      distributionPerPartner: distWithAt(erWrvu) / N,
    },
    C_optimized: {
      distributionTotal: distWithAt(erWrvu) + redeployGain,
      distributionPerPartner: (distWithAt(erWrvu) + redeployGain) / N,
    },
  };

  // Volume sweep 0.5× … 4× today's ER wRVU (60 samples)
  const samples = 60;
  const xMin = erWrvu * 0.5;
  const xMax = erWrvu * 4;
  const volumeSweep: Array<{ erWrvu: number; distWith: number; distWithout: number }> = [];
  for (let k = 0; k <= samples; k++) {
    const x = xMin + ((xMax - xMin) * k) / samples;
    volumeSweep.push({
      erWrvu: x,
      distWith: distWithAt(x) / N,
      distWithout: distWithoutAt(x) / N,
    });
  }

  return {
    totalWrvu,
    collections,
    overheadPerWrvu,
    erWrvu,
    erColl,
    erYield,
    nonErYield,
    fairCost,
    distributionPerWrvu,
    stipend,
    distributionTotal,
    distributionPerPartner,
    hospitalSaves,
    freedWrvu,
    redeployGain,
    scenarios,
    volumeSweep,
  };
}

/**
 * Bottom-up: given audited ER coll + ER wRVU + ER share, back-fill the
 * practice (totalWrvu, collections, compPool). Labeled "derived from left
 * audit" in the UI.
 */
export function backfillFromLeft(args: {
  erColl: number;
  erWrvu: number;
  erShare: number;
  compToCollections: number;
  nonErYieldBench: number; // typically residual yield ≈ $85
}): { totalWrvu: number; collections: number; compPool: number } {
  const { erColl, erWrvu, erShare, compToCollections, nonErYieldBench } = args;
  if (erShare <= 0 || erShare >= 1) return { totalWrvu: 0, collections: 0, compPool: 0 };
  const totalWrvu = erWrvu / erShare;
  const nonErColl = (totalWrvu - erWrvu) * nonErYieldBench;
  const collections = erColl + nonErColl;
  const compPool = collections * compToCollections;
  return { totalWrvu, collections, compPool };
}
