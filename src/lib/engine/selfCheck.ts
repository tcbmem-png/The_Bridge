// Dev-only self-check. Runs the §8 test cases through generateSpec and
// asserts the documented outputs. If anything diverges in dev, the
// implementation is wrong — fix the code, not the spec.

import { generateSpec } from "./generateSpec";
import type { Answers, PanelKey, PanelStatus } from "./types";

type Expect = {
  label: string;
  answers: Answers;
  tier: string;
  cleared: boolean;
  gated: boolean;
  panelStatus: Record<PanelKey, PanelStatus>;
  hasFlag?: string[];
  noFlag?: string[];
};

const CASES: Expect[] = [
  {
    label: "Case A — ready group",
    answers: {
      rcm_owner: "in_house",
      rcm_history: "24_36mo",
      reporting: "ps_one",
      mpower: "used",
      read_loc: "both",
      pacs_ts: "yes",
      bi_tool: "power_bi",
      warehouse: "yes",
      analyst: "yes",
      baa: "yes",
      deid_ok: "yes",
    },
    tier: "Thinnest",
    cleared: true,
    gated: false,
    panelStatus: {
      collection_rate: "live",
      payer_mix: "live",
      uncompensated_cost: "live",
      rev_per_wRVU: "live",
      denials: "live",
      negative_read_by_indication: "live",
      turnaround: "live",
      trend: "live",
    },
  },
  {
    label: "Case B — hospital-billed, no mPower, compliance pending",
    answers: {
      rcm_owner: "hospital_billed",
      rcm_history: "12mo",
      reporting: "ps_360",
      mpower: "no",
      read_loc: "hospital_epic",
      pacs_ts: "no",
      bi_tool: "none",
      warehouse: "no",
      analyst: "no",
      baa: "no",
      deid_ok: "needs_review",
    },
    tier: "Standard",
    cleared: false,
    gated: true,
    panelStatus: {
      collection_rate: "pending_source",
      payer_mix: "pending_source",
      uncompensated_cost: "pending_source",
      rev_per_wRVU: "pending_source",
      denials: "pending_source",
      negative_read_by_indication: "pending_compliance",
      turnaround: "pending_source",
      trend: "pending_source",
    },
    hasFlag: ["hospital_billed", "Turnaround", "Implementation", "shallow"],
  },
  {
    label: "Case C — vendor RCM, mPower licensed-unused, BI but no warehouse",
    answers: {
      rcm_owner: "vendor",
      rcm_history: "24_36mo",
      reporting: "ps_one",
      mpower: "unused",
      read_loc: "own_ris",
      pacs_ts: "yes",
      bi_tool: "tableau",
      warehouse: "no",
      analyst: "yes",
      baa: "yes",
      deid_ok: "yes",
    },
    tier: "Light",
    cleared: true,
    gated: false,
    panelStatus: {
      collection_rate: "live",
      payer_mix: "live",
      uncompensated_cost: "live",
      rev_per_wRVU: "live",
      denials: "live",
      negative_read_by_indication: "live",
      turnaround: "live",
      trend: "live",
    },
    hasFlag: ["mPower licensed but unused"],
  },
];

function assert(cond: boolean, msg: string, label: string) {
  if (!cond) {
    // eslint-disable-next-line no-console
    console.error(`[engine self-check] ${label}: ${msg}`);
  }
}

let ran = false;
export function runEngineSelfCheck() {
  if (ran) return;
  ran = true;
  for (const c of CASES) {
    const s = generateSpec(c.answers);
    assert(
      s.storageTier.tier === c.tier,
      `expected tier ${c.tier}, got ${s.storageTier.tier}`,
      c.label,
    );
    assert(
      s.compliance.cleared === c.cleared,
      `expected cleared=${c.cleared}, got ${s.compliance.cleared}`,
      c.label,
    );
    const isGated =
      s.timelineBand.toLowerCase().includes("gate-dependent");
    assert(isGated === c.gated, `expected gated=${c.gated}, got ${isGated}`, c.label);
    for (const p of s.panels) {
      const expected = c.panelStatus[p.key];
      assert(
        p.status === expected,
        `panel ${p.key}: expected ${expected}, got ${p.status}`,
        c.label,
      );
    }
    if (c.hasFlag) {
      for (const needle of c.hasFlag) {
        assert(
          s.flags.some((f) => f.toLowerCase().includes(needle.toLowerCase())),
          `expected a flag containing "${needle}"`,
          c.label,
        );
      }
    }
  }
  // eslint-disable-next-line no-console
  console.info("[engine self-check] complete");
}
