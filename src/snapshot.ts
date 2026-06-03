// Operator snapshot — the serialized engine output the FRONT END reads (Phases 3-4). Numbers come from
// computeMoney + the transmission (single source); the view renders, it never re-derives. Every metric
// carries a provenance entry (formula + source feeds + maturity class) so every number opens to its source
// (chassis §2.1). A drill-able sample of facts (join_status + finding) backs "show me why."
// Run: `node src/snapshot.ts` -> writes dist/operator-snapshot.json

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runEngine } from "./engine.ts";
import { classifyAndRoute } from "./transmission/transmission.ts";
import { DEFAULT_PINS, type Pins } from "./config/pins.ts";
import { generateSeries } from "../fixtures/series.ts";
import type { Fact } from "./schemas/canonical.ts";

// `feeds` = which of the three source domains a metric actually draws on. Drives the three-segment
// provenance glyph (1 filled = recede, 3 = the deepest/most-actionable numbers). Metadata, not math.
export type Feed = "billing" | "production" | "workflow";
export interface ProvenanceEntry { formula: string; sources: string[]; maturity_class: string; feeds: Feed[] }

// Static provenance map — the "open to its source" key for each panel metric.
export const PROVENANCE: Record<string, ProvenanceEntry> = {
  production_volume_wrvu: { formula: "Σ wRVU of finalized reads, by service month", sources: ["Production (report finalized)", "CMS RVU file"], maturity_class: "production (stable)", feeds: ["production"] },
  net_collections: { formula: "Σ paid (835 remittance) by service month", sources: ["835 remittance"], maturity_class: "payment_realized (shaded edge)", feeds: ["billing"] },
  collections_per_wrvu: { formula: "net collections ÷ production wRVU (all-in, every payer); total = Σcollections ÷ Σproduction wRVU", sources: ["835 remittance", "Production", "CMS RVU file"], maturity_class: "payment_realized", feeds: ["billing", "production"] },
  blended_dollars_per_wrvu: { formula: "paid ÷ wRVU over the MATCHED, matured set (reads both read and billed, matured)", sources: ["835 remittance", "Production", "CMS RVU file"], maturity_class: "payment_realized (matched, matured)", feeds: ["billing", "production"] },
  lost_work_dollars: { formula: "production with no matched charge, valued at blended $/wRVU", sources: ["Production", "Billing join (join_status)", "CMS RVU file"], maturity_class: "charge_capture", feeds: ["billing", "production"] },
  denial_dollars: { formula: "denied charges by CARC reason", sources: ["835 CARC/RARC"], maturity_class: "payment_realized", feeds: ["billing"] },
  underpayment_dollars: { formula: "allowed − paid where paid < allowed", sources: ["835 (allowed vs paid)"], maturity_class: "payment_realized", feeds: ["billing"] },
  no_pay_dollars: { formula: "self-pay wRVU × conversion factor", sources: ["837 payer", "CMS RVU file", "conversion factor"], maturity_class: "structural (self-pay)", feeds: ["billing", "production"] },
  underpay_shortfall_dollars: { formula: "(wRVU × CF) − Medicaid paid", sources: ["835", "CMS RVU file", "conversion factor"], maturity_class: "structural (Medicaid vs Medicare)", feeds: ["billing", "production"] },
  procedure_to_cash_days: { formula: "avg(payment posting date − date of service)", sources: ["835 posting date", "date of service"], maturity_class: "KPI (not the axis)", feeds: ["billing"] },
  // the deepest / most-actionable numbers — all three feeds. The glyph shows itself fullest here.
  night_block: { formula: "fact table cut by shift × site × payer × yield × reader", sources: ["Workflow timestamps", "835 payer", "low-yield pin (placeholder)", "Production radiologist"], maturity_class: "mixed", feeds: ["billing", "production", "workflow"] },
  yield_by_site_shift: { formula: "collections ÷ wRVU, cut by site and shift (the all-three join)", sources: ["835 remittance", "Production", "Workflow timestamps", "CMS RVU file"], maturity_class: "payment_realized × workflow", feeds: ["billing", "production", "workflow"] },
};

export function buildSnapshot(pins: Pins = DEFAULT_PINS) {
  const series = generateSeries(pins.reference_date.slice(0, 7));
  const { facts, money } = runEngine(series.billingRaw, series.productionRaw, series.workflowRaw, pins);
  const tx = classifyAndRoute(facts, money, pins);

  // a bounded, drill-able sample of facts (the "show me why" backing) — never real data
  const sampleFacts = facts.slice(0, 40).map((f: Fact) => ({
    key: f.key, service_month: f.service_month, join_tier: f.join_tier, finding: f.finding,
    payer: f.billing?.payer ?? null, wrvu: f.wrvu, paid: f.billing?.paid ?? null, matured: f.matured,
  }));

  return {
    generatedAt: new Date().toISOString(),
    note: "ILLUSTRATIVE · synthetic. No real data. 'ACTUAL' is a visual state, not a PHI claim.",
    reference_date: pins.reference_date,
    months: money.months,
    inflectionMonth: series.inflectionMonth,
    inflectionNote: "Self-pay / Medicaid share rises after this month (the 2025 subsidy-cliff amplifier). Foreground the slope, not the level.",
    pins: { N_days: pins.maturity_window_days_N, M_months: pins.provisional_band_months_M, lens: pins.default_lens, conversion_factor: pins.conversion_factor },
    trends: money,
    transmission: tx,
    provenance: PROVENANCE,
    sampleFacts,
  };
}

// Write the artifact ONLY when this module is the entry point (`node src/snapshot.ts`).
// Guarded so that merely IMPORTING buildSnapshot (e.g., from a harness) never regenerates the file.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const snap = buildSnapshot();
  mkdirSync(new URL("../dist/", import.meta.url), { recursive: true });
  writeFileSync(new URL("../dist/operator-snapshot.json", import.meta.url), JSON.stringify(snap, null, 2));
  console.log(`[snapshot] wrote dist/operator-snapshot.json — ${snap.months.length} months, inflection ${snap.inflectionMonth}, ${snap.sampleFacts.length} drill-able facts`);
}
