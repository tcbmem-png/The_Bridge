// Maturity model. Different metrics mature at different speeds; mark the immature edge, never pretend it's final.
//   production      → matures immediately (true at read time) — STABLE, never shaded
//   charge_capture  → matures over charge lag (days–weeks) — mildly provisional
//   payment_realized→ matures over payment lag (run-out 60–120d) — strongly provisional
// Service date is the anchor. pending ≠ denied: a claim inside the maturity window N is PENDING, not lost.
// Restatement is expected: as months mature on later loads, provisional points firm up (idempotent loads,
// keep most-mature) — a point that moved is visibly matured, never silently edited.

import type { Fact } from "../schemas/canonical.ts";
import type { Pins } from "../config/pins.ts";

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

// Assigns maturity_class + matured flag on each fact (mutates in place; pure w.r.t. inputs otherwise).
export function classifyMaturity(facts: Fact[], pins: Pins): Fact[] {
  const ref = pins.reference_date;
  const N = pins.maturity_window_days_N;
  for (const f of facts) {
    const ageDays = daysBetween(f.date_of_service, ref);

    // class by what the fact is about
    if (f.finding === "lost_work" || f.finding === "capture_gap") {
      f.maturity_class = "charge_capture";
    } else if (f.billing) {
      f.maturity_class = "payment_realized";
    } else {
      f.maturity_class = "production";
    }

    // matured?
    if (f.maturity_class === "production") {
      f.matured = true; // true at read time
    } else if (f.maturity_class === "charge_capture") {
      f.matured = ageDays >= pins.charge_lag_days; // charge lag
    } else {
      f.matured = ageDays >= N;  // payment run-out window
    }
  }
  return facts;
}

// The TWIN of pending ≠ denied, on the capture side: a read with no charge yet, still inside the charge-lag
// window, is PENDING-CAPTURE — the charge simply hasn't posted. Only past the window is it true lost_work.
// Without this, recent months over-report lost work (the F1 class, one domain over).
export function reconcileChargeLag(facts: Fact[], pins: Pins): Fact[] {
  const ref = pins.reference_date;
  for (const f of facts) {
    if (f.finding !== "lost_work") continue;
    const ageDays = daysBetween(f.date_of_service, ref);
    if (ageDays < pins.charge_lag_days) {
      f.finding = "matched"; // pending-capture: not a loss, the charge just hasn't arrived
    }
  }
  return facts;
}

// pending ≠ denied: a not-yet-paid claim still inside window N is PENDING, not a denial.
// This runs BEFORE money so finding buckets respect maturity.
export function reconcilePendingVsDenied(facts: Fact[], pins: Pins): Fact[] {
  const ref = pins.reference_date;
  const N = pins.maturity_window_days_N;
  for (const f of facts) {
    if (!f.billing) continue;
    const b = f.billing;
    const ageDays = daysBetween(b.date_of_service, ref);
    // An explicit CARC/denied status is a denial regardless of age.
    if (b.claim_status === "denied" || b.carc.length > 0) { f.finding = "denial"; continue; }
    // Unpaid but still inside the window → pending (NOT a finding).
    if (b.paid === 0 && b.claim_status !== "paid") {
      f.finding = ageDays < N ? "matched" /* pending, not a loss */ : "denial";
      continue;
    }
    // Paid below allowed → underpayment (recoverable).
    if (b.allowed != null && b.paid > 0 && b.paid < b.allowed) { f.finding = "underpayment"; }
  }
  return facts;
}
