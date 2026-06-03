// Practice-impact engine for /stipend. One pure function, signed (no floors),
// deterministic, no network. Single source of truth: (compPool, erShare).
// The volume lever moves exactly ONE primitive: erWrvu = today × (1 + lever).
// Every downstream figure (collections, stipend, partner dist) is re-derived
// from that one number — no hand-patched outputs, no overlay.
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
  volumeLever: number; // signed, [-0.30, +0.30]. 0 = today.
  redeployUtil: number; // 0..1 — applies only when volumeLever < 0

  // benchmark pins
  fmvComp: number; // FMV clinical comp /wRVU ($50 median)
  compActualPerWrvu: number; // pool→wRVU realised rate ($58)
  compToCollections: number; // MGMA ratio (0.83)
  overheadPerWrvu: number; // optional override; otherwise residual
  erYield: number; // demo default $28 (audit replaces)
  reclaimValue?: number; // $/wRVU value when freed ER time is redeployed ($90)
  nonErYieldBench?: number; // unused in top-down; kept for bottom-up callers
};

export type Scenario = {
  distributionTotal: number;
  distributionPerPartner: number;
};

export type PracticeImpactOutputs = {
  // structural — today (lever = 0) baseline
  totalWrvuToday: number;
  collectionsToday: number;
  erWrvuToday: number;
  nonErWrvu: number;
  nonErColl: number;
  nonErYield: number;
  overheadPerWrvu: number;
  fairCost: number;
  distributionPerWrvu: number;
  erDeficitPerWrvu: number;

  // lever-driven (current state at volumeLever)
  totalWrvu: number;
  collections: number;
  erWrvu: number;
  erColl: number;
  erYield: number;

  // stipend (lever-driven)
  stipend: number;
  stipendToday: number;

  // distribution (current scenario per inputs, lever-driven)
  distributionTotal: number;
  distributionPerPartner: number;

  // cut+redeploy (only nonzero when volumeLever < 0)
  freedWrvu: number;
  redeployGain: number;
  hospitalSaves: number;

  // scenarios at CURRENT lever
  scenarios: {
    A_noStipend: Scenario;
    B_withStipend: Scenario;
    C_optimized: Scenario;
  };

  // volume sweep for the SVG chart (independent of current lever)
  volumeSweep: Array<{ erWrvu: number; distWith: number; distWithout: number }>;
};

export const PRACTICE_IMPACT_DEFAULTS = {
  fmvComp: 50,
  compActualPerWrvu: 58,
  compToCollections: 0.83,
  overheadPerWrvu: 12,
  erYield: 28,
  reclaimValue: 90,
} as const;

// Asymmetric on purpose: the avoidable/clinical limit is ~30% on the cut
// side; the add side is uncapped in reality, and we plot out to +300% to
// make the negative-gross-margin economics visible.
export const VOLUME_LEVER_CUT_CAP = 0.3;
export const VOLUME_LEVER_ADD_CAP = 3.0;
// Back-compat alias (== cut cap, the smaller of the two).
export const VOLUME_LEVER_CAP = VOLUME_LEVER_CUT_CAP;

/** Top-down from (compPool, erShare). Signed; no floors. */
export function computePracticeImpact(i: PracticeImpactInputs): PracticeImpactOutputs {
  const P = i.compPool;
  const s = i.erShare;
  const N = Math.max(1, i.partnerCount);
  const reclaimValue = i.reclaimValue ?? PRACTICE_IMPACT_DEFAULTS.reclaimValue;

  // ── Today's (lever = 0) practice structure ────────────────────────────
  const totalWrvuToday = i.compActualPerWrvu > 0 ? P / i.compActualPerWrvu : 0;
  // Honor the overhead PIN ($12). The legacy residual path falls back only
  // when no pin is supplied.
  const overheadPerWrvu =
    i.overheadPerWrvu > 0
      ? i.overheadPerWrvu
      : totalWrvuToday > 0 && i.compToCollections > 0
        ? (P / i.compToCollections - P) / totalWrvuToday
        : 0;
  // Collections derived from the model's own identity:
  // blended /wRVU = comp $58 + overhead $12 = $70. The old comp-to-collections
  // ratio (0.83) was ~$0.12/wRVU off this identity, leaking ~$1k/partner on
  // the round-trip ($88k input read back as $87k). Using the identity closes
  // the loop to the penny: $88k → $88k, blended exactly $70, overhead exactly
  // $12, stipend $10.10M, partner $189k / $88k.
  const collectionsToday =
    totalWrvuToday > 0
      ? totalWrvuToday * (i.compActualPerWrvu + overheadPerWrvu)
      : i.compToCollections > 0
        ? P / i.compToCollections
        : 0;

  const erWrvuToday = totalWrvuToday * s;
  const erYield = i.erYield;
  const erCollToday = erWrvuToday * erYield;

  // Non-ER book — HELD CONSTANT as the lever moves.
  const nonErWrvu = totalWrvuToday - erWrvuToday;
  const nonErColl = collectionsToday - erCollToday;
  const nonErYield = nonErWrvu > 0 ? nonErColl / nonErWrvu : 0;

  const fairCost = i.fmvComp + overheadPerWrvu; // ≈ $62
  const distributionPerWrvu = i.compActualPerWrvu - i.fmvComp; // ≈ $8
  const erDeficitPerWrvu = fairCost - erYield; // ≈ $34

  // ── Lever — moves ONE primitive: erWrvu. Everything else cascades. ────
  const lever = Math.max(-VOLUME_LEVER_CUT_CAP, Math.min(VOLUME_LEVER_ADD_CAP, i.volumeLever));
  const erWrvu = erWrvuToday * (1 + lever);
  const erColl = erWrvu * erYield; // erYield held — payer mix, not volume
  const totalWrvu = nonErWrvu + erWrvu;
  const collections = nonErColl + erColl;

  const stipend = erWrvu * erDeficitPerWrvu;
  const stipendToday = erWrvuToday * erDeficitPerWrvu;

  // Cut-side redeploy — only when lever < 0.
  const freedWrvu = lever < 0 ? -lever * erWrvuToday : 0;
  const hospitalSaves = freedWrvu * erDeficitPerWrvu;
  const redeployGain =
    freedWrvu > 0
      ? i.redeployUtil * freedWrvu * (reclaimValue - fairCost) // signed; below fair → loss
      : 0;

  // ── Per-spec partner formulas (re-derive from the new volume state) ───
  // Without stipend: partners absorb the ER deficit themselves.
  const partnerWithoutTotal = collections - fairCost * totalWrvu;
  // With stipend: ER is neutralized → flat in lever. Cut-side redeploy rolls in.
  const partnerWithTotalNoRedeploy = (nonErYield - fairCost) * nonErWrvu;
  const partnerWithTotal = partnerWithTotalNoRedeploy + redeployGain;

  const scenarios = {
    A_noStipend: {
      distributionTotal: partnerWithoutTotal,
      distributionPerPartner: partnerWithoutTotal / N,
    },
    B_withStipend: {
      distributionTotal: partnerWithTotalNoRedeploy,
      distributionPerPartner: partnerWithTotalNoRedeploy / N,
    },
    C_optimized: {
      distributionTotal: partnerWithTotal,
      distributionPerPartner: partnerWithTotal / N,
    },
  };

  // Current scenario headline.
  const distributionTotal = i.stipendOn ? partnerWithTotal : partnerWithoutTotal;
  const distributionPerPartner = distributionTotal / N;

  // ── Sweep 0× … 4× today's ER wRVU (80 samples) ────────────────────────
  // Same cascade applied at each x — no separate formula.
  const samples = 80;
  const xMin = 0;
  const xMax = erWrvuToday * 4;
  const volumeSweep: Array<{ erWrvu: number; distWith: number; distWithout: number }> = [];
  for (let k = 0; k <= samples; k++) {
    const x = xMin + ((xMax - xMin) * k) / samples;
    const erCollX = x * erYield;
    const totalWrvuX = nonErWrvu + x;
    const collX = nonErColl + erCollX;
    const withoutX = collX - fairCost * totalWrvuX;
    const withX = partnerWithTotalNoRedeploy; // flat — FMV proof
    volumeSweep.push({
      erWrvu: x,
      distWith: withX / N,
      distWithout: withoutX / N,
    });
  }

  return {
    totalWrvuToday,
    collectionsToday,
    erWrvuToday,
    nonErWrvu,
    nonErColl,
    nonErYield,
    overheadPerWrvu,
    fairCost,
    distributionPerWrvu,
    erDeficitPerWrvu,

    totalWrvu,
    collections,
    erWrvu,
    erColl,
    erYield,

    stipend,
    stipendToday,

    distributionTotal,
    distributionPerPartner,

    freedWrvu,
    redeployGain,
    hospitalSaves,

    scenarios,
    volumeSweep,
  };
}

/**
 * Bottom-up: given audited ER coll + ER wRVU + ER share, back-fill the
 * practice (totalWrvu, collections, compPool) so that feeding compPool
 * back into computePracticeImpact reproduces the audited erWrvu EXACTLY
 * (no round-trip drift). The engine derives totalWrvu = compPool/comp$58
 * and erWrvu = totalWrvu × erShare, so we invert that path directly
 * instead of routing through collections × comp-to-collections.
 */
export function backfillFromLeft(args: {
  erColl: number;
  erWrvu: number;
  erShare: number;
  compActualPerWrvu?: number;
  overheadPerWrvu?: number;
  // legacy — accepted but no longer used in the closed-loop path
  compToCollections?: number;
  nonErYieldBench?: number;
}): { totalWrvu: number; collections: number; compPool: number } {
  const { erWrvu, erShare } = args;
  const compActual = args.compActualPerWrvu ?? PRACTICE_IMPACT_DEFAULTS.compActualPerWrvu;
  const overhead = args.overheadPerWrvu ?? PRACTICE_IMPACT_DEFAULTS.overheadPerWrvu;
  if (erShare <= 0 || erShare >= 1) return { totalWrvu: 0, collections: 0, compPool: 0 };
  const totalWrvu = erWrvu / erShare;
  const compPool = totalWrvu * compActual;
  // Collections via the model's own identity ($58 + $12 = $70/wRVU).
  const collections = totalWrvu * (compActual + overhead);
  return { totalWrvu, collections, compPool };
}

// Back-compat re-export (old name).
export const AVOIDABLE_CAP = VOLUME_LEVER_CAP;
