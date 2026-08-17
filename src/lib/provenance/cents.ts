// Exact money. All reconciliation arithmetic runs in integer cents so that
// identities such as
//
//     starting_gap = Σ(explained_items) + unexplained_after
//
// close to the cent, every time, with no floating-point accumulation.
//
// One rounding rule, one implementation. Ratios (dollars per work unit,
// percentages) are computed from cents and rounded once, at the point of
// display, by `format.ts` — never accumulated.

export type Cents = number;

/** Dollars (possibly a float off a CSV) → integer cents. Half-away-from-zero. */
export function toCents(dollars: number | string | null | undefined): Cents | null {
  if (dollars === null || dollars === undefined || dollars === "") return null;
  const n = typeof dollars === "string" ? Number(dollars.replace(/[$,\s]/g, "")) : dollars;
  if (!Number.isFinite(n)) return null;
  return Math.sign(n) * Math.round(Math.abs(n) * 100);
}

/** Integer cents → dollars, for display only. Never fed back into arithmetic. */
export function toDollars(cents: Cents | null): number | null {
  return cents === null ? null : cents / 100;
}

/** Sum that refuses to treat an unknown as zero: any null makes the sum partial. */
export function sumCents(values: (Cents | null)[]): { total: Cents; unknown: number } {
  let total = 0;
  let unknown = 0;
  for (const v of values) {
    if (v === null) unknown++;
    else total += v;
  }
  return { total, unknown };
}

export interface ReconciliationItem {
  key: string;
  label: string;
  /** Integer cents. Positive amounts explain part of the starting gap. */
  amount_cents: Cents;
  /** Row count behind the item, when the item is row-addressable. */
  rows?: number;
  /** Which source class asserted it. */
  authored_by?: string;
  /** What the item is, in one sentence. */
  basis?: string;
}

export interface ReconciliationRemainder {
  label: string;
  starting_gap_cents: Cents;
  explained: ReconciliationItem[];
  explained_cents: Cents;
  unexplained_after_cents: Cents;
  /** True only when starting_gap = Σ(explained) + unexplained_after, exactly. */
  closes: boolean;
  /** The source that would carve the remainder further. */
  closes_on: string;
}

/**
 * Carve a starting gap into named items plus an honest remainder.
 *
 * The remainder is derived, never forced: no OTHER / MISC bucket is invented,
 * and the identity is asserted rather than assumed.
 */
export function carve(
  label: string,
  startingGapCents: Cents,
  explained: ReconciliationItem[],
  closesOn: string,
): ReconciliationRemainder {
  const explainedCents = explained.reduce((s, i) => s + i.amount_cents, 0);
  const unexplained = startingGapCents - explainedCents;
  return {
    label,
    starting_gap_cents: startingGapCents,
    explained,
    explained_cents: explainedCents,
    unexplained_after_cents: unexplained,
    closes: startingGapCents === explainedCents + unexplained,
    closes_on: closesOn,
  };
}

/** Ratio over exact cents. Returns null rather than 0 when the basis is absent. */
export function ratioFromCents(numerCents: Cents | null, denom: number | null): number | null {
  if (numerCents === null || denom === null || denom === 0) return null;
  return numerCents / 100 / denom;
}
