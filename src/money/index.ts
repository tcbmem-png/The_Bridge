// ============================================================================
// THE SHARED MONEY / METRIC MODULE — the single source of truth.
// Pure functions over the canonical fact table. Computes once; every view reads
// this and re-derives nothing. Designed to be the small shared package that BOTH
// the engine repo and the public demo import, so their numbers cannot drift.
// No AI. No I/O. Deterministic. All $ trace to blocks defined here.
// ============================================================================

import type { Fact, Payer } from "../schemas/canonical.ts";
import type { Pins } from "../config/pins.ts";

export type MaturityClass = "production" | "charge_capture" | "payment_realized";

export interface MetricTrend {
  cls: MaturityClass;
  byMonth: Record<string, number>;
  total: number;
  provisionalMonths: string[]; // months at the immature edge — shade, never hide
}

export interface MoneyOutput {
  months: string[];                       // sorted service months present
  blended_dollars_per_wrvu: number;       // HEADLINE: paid ÷ wRVU over the MATCHED, matured set (distinct from collections_per_wrvu)
  // OWNER / PARTNER panel
  production_volume_wrvu: MetricTrend;     // stable
  net_collections: MetricTrend;           // payment_realized
  collections_per_wrvu: MetricTrend;      // ALL-IN: net collections ÷ production wRVU (every payer). NOT the matched-matured headline.
  lost_work_count: MetricTrend;           // charge_capture
  lost_work_dollars: MetricTrend;         // charge_capture (valued at blended $/wRVU)
  denial_count: MetricTrend;              // payment_realized
  denial_dollars: MetricTrend;            // payment_realized
  underpayment_dollars: MetricTrend;      // payment_realized (recoverable: paid < allowed)
  // COVERAGE GAP — the no-pay / underpay split. NEVER fused into one number.
  no_pay_wrvu: MetricTrend;               // structural: self-pay work
  no_pay_dollars: MetricTrend;            // self-pay wRVU × CF
  underpay_shortfall_wrvu: MetricTrend;   // structural: Medicaid below Medicare
  underpay_shortfall_dollars: MetricTrend; // (wRVU × CF) − Medicaid paid
  // KPI, not the axis
  procedure_to_cash_days: number;
}

// ---- month helpers (deterministic) ----
const sm = (dos: string) => dos.slice(0, 7); // "YYYY-MM"
function trailingMonths(refMonth: string, k: number): string[] {
  const [y, m] = refMonth.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < k; i++) {
    let mm = m - i, yy = y;
    while (mm <= 0) { mm += 12; yy -= 1; }
    out.push(`${yy}-${String(mm).padStart(2, "0")}`);
  }
  return out;
}
function round2(n: number): number { return Math.round((n + Number.EPSILON) * 100) / 100; }

function emptyTrend(cls: MaturityClass): MetricTrend {
  return { cls, byMonth: {}, total: 0, provisionalMonths: [] };
}
function add(t: MetricTrend, month: string, v: number) {
  t.byMonth[month] = round2((t.byMonth[month] ?? 0) + v);
  t.total = round2(t.total + v);
}
// shade the immature edge by class: production none, charge_capture trailing 1, payment_realized trailing M
function shade(t: MetricTrend, months: string[], refMonth: string, M: number) {
  const present = new Set(months);
  let band: string[] = [];
  if (t.cls === "payment_realized") band = trailingMonths(refMonth, M);
  else if (t.cls === "charge_capture") band = trailingMonths(refMonth, 1);
  t.provisionalMonths = band.filter((m) => present.has(m));
}

export function computeMoney(facts: Fact[], pins: Pins): MoneyOutput {
  const CF = pins.conversion_factor;
  const refMonth = sm(pins.reference_date);
  const monthsSet = new Set<string>();
  for (const f of facts) monthsSet.add(f.service_month);
  const months = [...monthsSet].sort();

  // --- blended $/wRVU --- DEFINITION (a pin; confirm): paid-per-wRVU over the MATCHED, matured set —
  // exams we both read AND billed AND that have matured. Excludes unbilled lost-work and chargeless
  // capture-gaps so the yield has no cross-terms. This is what values recoverable lost-work.
  let paidMatured = 0, prodWrvuMatured = 0;
  for (const f of facts) {
    if (f.matured && f.production && f.billing) { prodWrvuMatured += f.wrvu; paidMatured += f.billing.paid; }
  }
  const blended = prodWrvuMatured > 0 ? round2(paidMatured / prodWrvuMatured) : 0;

  // --- trends ---
  const production_volume_wrvu = emptyTrend("production");
  const net_collections = emptyTrend("payment_realized");
  const lost_work_count = emptyTrend("charge_capture");
  const lost_work_dollars = emptyTrend("charge_capture");
  const denial_count = emptyTrend("payment_realized");
  const denial_dollars = emptyTrend("payment_realized");
  const underpayment_dollars = emptyTrend("payment_realized");
  const no_pay_wrvu = emptyTrend("payment_realized");
  const no_pay_dollars = emptyTrend("payment_realized");
  const underpay_shortfall_wrvu = emptyTrend("payment_realized");
  const underpay_shortfall_dollars = emptyTrend("payment_realized");

  let cashSumDays = 0, cashN = 0;

  for (const f of facts) {
    const mth = f.service_month;
    if (f.production) add(production_volume_wrvu, mth, f.wrvu);
    if (f.billing) {
      const b = f.billing;
      add(net_collections, mth, b.paid);
      if (f.finding === "lost_work") { /* handled below (no billing) */ }
      if (f.finding === "denial") {
        add(denial_count, mth, 1);
        add(denial_dollars, mth, b.allowed ?? b.charge);
      }
      if (f.finding === "underpayment" && b.allowed != null) {
        add(underpayment_dollars, mth, Math.max(0, b.allowed - b.paid));
      }
      // coverage gap — SPLIT by payer, never fused
      if (b.payer === "self_pay") {
        add(no_pay_wrvu, mth, f.wrvu);
        add(no_pay_dollars, mth, f.wrvu * CF);
      }
      if (b.payer === "medicaid") {
        const shortfall = Math.max(0, f.wrvu * CF - b.paid);
        add(underpay_shortfall_dollars, mth, shortfall);
        add(underpay_shortfall_wrvu, mth, shortfall / CF);
      }
      // procedure-to-cash (KPI) — paid facts only
      if (b.paid > 0 && b.payment_posting_date) {
        cashSumDays += daysBetween(b.date_of_service, b.payment_posting_date);
        cashN += 1;
      }
    }
    if (f.finding === "lost_work") {
      add(lost_work_count, mth, 1);
      add(lost_work_dollars, mth, f.wrvu * blended); // recoverable: valued at blended $/wRVU
    }
  }

  // ALL-IN collections per production wRVU — per month = collections / production volume.
  // total is DERIVED on its OWN basis (Σcollections / Σproduction wRVU) — never force-set to `blended`.
  // (blended is the distinct matched-matured headline above.) Provenance matches this exactly.
  const collections_per_wrvu = emptyTrend("payment_realized");
  for (const m of months) {
    const vol = production_volume_wrvu.byMonth[m] ?? 0;
    const col = net_collections.byMonth[m] ?? 0;
    collections_per_wrvu.byMonth[m] = vol > 0 ? round2(col / vol) : 0;
  }
  collections_per_wrvu.total = production_volume_wrvu.total > 0
    ? round2(net_collections.total / production_volume_wrvu.total) : 0;

  // shade immature edges
  const M = pins.provisional_band_months_M;
  for (const t of [production_volume_wrvu, net_collections, collections_per_wrvu, lost_work_count,
    lost_work_dollars, denial_count, denial_dollars, underpayment_dollars,
    no_pay_wrvu, no_pay_dollars, underpay_shortfall_wrvu, underpay_shortfall_dollars]) {
    shade(t, months, refMonth, M);
  }

  return {
    months, blended_dollars_per_wrvu: blended,
    production_volume_wrvu, net_collections, collections_per_wrvu,
    lost_work_count, lost_work_dollars, denial_count, denial_dollars, underpayment_dollars,
    no_pay_wrvu, no_pay_dollars, underpay_shortfall_wrvu, underpay_shortfall_dollars,
    procedure_to_cash_days: cashN > 0 ? round2(cashSumDays / cashN) : 0,
  };
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

// Coverage-gap totals over an ARBITRARY subset of facts — the single source the night-ER block also uses,
// so a slice of the fact table is valued by the same math as the whole. no-pay / underpay kept SEPARATE.
export interface CoverageGap {
  no_pay_dollars: number; no_pay_wrvu: number;
  underpay_shortfall_dollars: number; underpay_shortfall_wrvu: number;
}
export function sumCoverageGap(facts: Fact[], pins: Pins): CoverageGap {
  const CF = pins.conversion_factor;
  let npD = 0, npW = 0, usD = 0, usW = 0;
  for (const f of facts) {
    if (!f.billing) continue;
    if (f.billing.payer === "self_pay") { npD += f.wrvu * CF; npW += f.wrvu; }
    if (f.billing.payer === "medicaid") {
      const s = Math.max(0, f.wrvu * CF - f.billing.paid);
      usD += s; usW += s / CF;
    }
  }
  return { no_pay_dollars: round2(npD), no_pay_wrvu: round2(npW), underpay_shortfall_dollars: round2(usD), underpay_shortfall_wrvu: round2(usW) };
}
