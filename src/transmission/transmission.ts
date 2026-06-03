// THE TRANSMISSION — findings → dollars, routed. Deterministic classify + size + route. Authors NO new math:
// every dollar comes from the money module. The spine: RECOVERABLE vs STRUCTURAL, never blurred.
//   recoverable  -> the pool, now (group fixes with its own data)        [pool dashboard]
//   structural   -> the coverage conversation (only the contract fixes)  [stipend evidence pack, counsel-gated]
//   prevention   -> appropriateness, shared, mixed incentives            [hospital lens]

import type { Fact } from "../schemas/canonical.ts";
import type { Pins } from "../config/pins.ts";
import { type MoneyOutput, sumCoverageGap, type CoverageGap } from "../money/index.ts";
import { PLACEHOLDER_LOW_YIELD } from "../config/pins.ts";

export type Lane = "recoverable" | "structural" | "prevention";

// Fixed lane per finding TYPE (Transmission §2). A finding's nature sets its lane — never case-by-case.
export const LANE_BY_FINDING: Record<string, Lane | null> = {
  lost_work: "recoverable",
  underpayment: "recoverable",
  denial: "recoverable",
  capture_gap: "recoverable", // capture integrity — verify the read, not new pool $
  matched: null,
};

export interface Transmission {
  recoverable: {
    lost_work_dollars: number;
    underpayment_dollars: number;
    denial_dollars: number;
    total: number;
    residual_delta: number; // ≈ recovered (near-pure margin; fixed cost base). OPPORTUNITY the data tests.
    capture_gap_count: number; // reported, not summed into pool $
  };
  structural: {
    // SPLIT — never fused. No standalone total field: no-pay (charity / uncollectible) and the Medicaid
    // rate shortfall are DIFFERENT arguments to the hospital. Any subtotal is a render-time sum shown
    // ONLY beside both components, never a field that can be displayed alone.
    no_pay_dollars: number; no_pay_wrvu: number;        // self-pay / charity — genuinely uncompensated
    underpay_shortfall_dollars: number; underpay_shortfall_wrvu: number; // Medicaid vs Medicare — a rate gap
    night_block: NightBlock;
  };
  prevention: {
    low_yield_count: number;
    using_placeholder_definition: boolean; // true until the group authors the clinical pin
    note: string;
  };
  surfaces: {
    pool_dashboard: string;        // recoverable, in-hand
    stipend_evidence_pack: string; // structural, counsel-gated
    hospital_lens: string;         // prevention, shared scoreboard
  };
  pockets: Record<string, { in: string; out: string }>;
  integrity: { disjoint: boolean; note: string };
}

export function classifyAndRoute(facts: Fact[], money: MoneyOutput, pins: Pins): Transmission {
  const recoverable = {
    lost_work_dollars: money.lost_work_dollars.total,
    underpayment_dollars: money.underpayment_dollars.total,
    denial_dollars: money.denial_dollars.total,
    total: round2(money.lost_work_dollars.total + money.underpayment_dollars.total + money.denial_dollars.total),
    residual_delta: 0,
    capture_gap_count: facts.filter((f) => f.finding === "capture_gap").length,
  };
  recoverable.residual_delta = recoverable.total; // near-pure margin → straight to the pool

  const night = nightERBlock(facts, pins);
  const structural = {
    no_pay_dollars: money.no_pay_dollars.total,
    no_pay_wrvu: money.no_pay_wrvu.total,
    underpay_shortfall_dollars: money.underpay_shortfall_dollars.total,
    underpay_shortfall_wrvu: money.underpay_shortfall_wrvu.total,
    night_block: night,
  };

  // prevention — counts against the low-yield definition (placeholder until the group authors it)
  let lyCount = 0;
  for (const f of facts) if (isLowYield(f, pins).match) lyCount++;
  const usingPlaceholder = pins.low_yield_definition == null;

  // INTEGRITY: recoverable $ draws only from {lost_work, underpayment, denial}; structural only from
  // {no_pay, underpay_shortfall}. Disjoint money fields by construction — the structural shortfall is
  // NEVER routed into "we'll recover it." Verify the field sets don't intersect.
  const recoverableSources = new Set(["lost_work_dollars", "underpayment_dollars", "denial_dollars"]);
  const structuralSources = new Set(["no_pay_dollars", "underpay_shortfall_dollars"]);
  const disjoint = [...recoverableSources].every((s) => !structuralSources.has(s));

  return {
    recoverable, structural,
    prevention: {
      low_yield_count: lyCount,
      using_placeholder_definition: usingPlaceholder,
      note: usingPlaceholder
        ? "PLACEHOLDER low-yield definition — not a clinical judgment; awaiting the group's pin. Mixed incentives: fewer low-yield reads = less group volume; real value is load relief + hospital throughput."
        : "Mixed incentives: fewer low-yield reads = less group volume; real value is load relief + hospital throughput.",
    },
    surfaces: {
      pool_dashboard: "recoverable — in-hand; bill lost studies, reconcile underpayments, fix denial patterns",
      stipend_evidence_pack: pins.stipend_evidence_scope == null
        ? "structural — SEAM: stipend evidence scope is counsel-gated; transmission stops at the sized number"
        : "structural — sized evidence for the coverage conversation",
      hospital_lens: "prevention — shared appropriateness scoreboard the hospital uses; never the group telling the ED to order less",
    },
    pockets: {
      group: { in: "recoveries → pool (now); a right-sized stipend (structural)", out: "the cost of staffing uncompensated coverage" },
      hospital: { in: "fewer low-yield scans, faster throughput, stable coverage", out: "a fair coverage stipend for a service it depends on" },
      patient_system: { in: "(not a P&L line)", out: "the uninsured ER patient — the human fact under the model" },
    },
    integrity: { disjoint, note: "recoverable and structural draw from disjoint money fields; the structural shortfall is never recovered, only contracted." },
  };
}

// ---- the night-ER coverage block: a CUT of the fact table; valued by the SAME coverage-gap fn as money ----
export interface NightBlock {
  after_hours_reads: number;
  after_hours_wrvu: number;
  by_site: Record<string, number>;
  by_payer: Record<string, number>;
  structural_after_hours: CoverageGap; // no-pay + shortfall, after-hours only — single source
  low_yield_after_hours: number;
  using_placeholder_low_yield: boolean;
  reader_cut: Record<string, number>; // by reading radiologist
  cross_coverage_note: string;        // SEAM until the credentialing pin is authored
}

export function nightERBlock(facts: Fact[], pins: Pins): NightBlock {
  const ah = facts.filter((f) => isAfterHours(f, pins));
  const by_site: Record<string, number> = {};
  const by_payer: Record<string, number> = {};
  const reader_cut: Record<string, number> = {};
  let wrvu = 0, lowYield = 0;
  for (const f of ah) {
    wrvu += f.wrvu;
    const site = siteGroup(f.workflow?.site ?? f.billing?.site ?? "unknown", pins);
    by_site[site] = (by_site[site] ?? 0) + 1;
    if (f.billing) by_payer[f.billing.payer] = (by_payer[f.billing.payer] ?? 0) + 1;
    const rad = f.production?.reading_radiologist ?? "unknown";
    reader_cut[rad] = (reader_cut[rad] ?? 0) + 1;
    if (isLowYield(f, pins).match) lowYield++;
  }
  return {
    after_hours_reads: ah.length,
    after_hours_wrvu: round2(wrvu),
    by_site, by_payer,
    structural_after_hours: sumCoverageGap(ah, pins), // SAME math as the global money module, on the night slice
    low_yield_after_hours: lowYield,
    using_placeholder_low_yield: pins.low_yield_definition == null,
    reader_cut,
    cross_coverage_note: pins.cross_coverage == null
      ? "SEAM — 'reading outside subspecialty' (peds fellow reading adult emergent CT at 3am) needs the credentialing pin before the reader cut is meaningful."
      : "cross-coverage flagged per authored credentialing rule",
  };
}

// ---- helpers ----
function isAfterHours(f: Fact, pins: Pins): boolean {
  const ts = f.workflow?.performed_ts ?? f.workflow?.read_assigned_ts ?? f.workflow?.report_finalized_ts;
  if (!ts) return false;
  const d = new Date(ts);
  const hour = d.getHours();
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const { night_start_hour, night_end_hour, weekends_after_hours } = pins.shift_definition;
  const isNight = hour >= night_start_hour || hour < night_end_hour;
  const isWeekend = weekends_after_hours && (day === 0 || day === 6);
  return isNight || isWeekend;
}

function siteGroup(site: string, pins: Pins): string {
  return pins.site_grouping.childrens_sites.includes(site) ? "childrens" : "system";
}

function isLowYield(f: Fact, pins: Pins): { match: boolean; usingPlaceholder: boolean } {
  const def = pins.low_yield_definition ?? PLACEHOLDER_LOW_YIELD;
  const cpt = f.production?.cpt ?? f.billing?.cpt ?? "";
  const icds = f.billing?.icd10 ?? [];
  const match = def.pairs.some((p) => p.cpt === cpt && icds.some((c) => c.startsWith(p.icd10_prefix)));
  return { match, usingPlaceholder: pins.low_yield_definition == null };
}

function round2(n: number): number { return Math.round((n + Number.EPSILON) * 100) / 100; }
