// Derive a money-model preset from whatever data is currently loaded in the
// in-browser PGlite harness. Pure read — no writes, no AI, no persistence
// inside the DB. Writes the resulting preset to sessionStorage so the
// Sandbox/Story can hydrate from it on the next render.
//
// Scope is deliberately narrow per product decision:
//   - coverage_volume      ← annualized ER 837 line count (from segment_monthly)
//   - avg_wRVU_per_read    ← SUM(work_rvu)/COUNT(*) on ER lines
//   - payer_mix            ← ER line share by financial_class, normalized to 100
//
// Everything else (CFs, payer multiples, fall pattern, technical cost, denial
// write-off, lost-study rate) stays at the authored defaults — the dataset
// doesn't speak to those, and pretending it does would be a lie.

import { getDb } from "./db";
import type { PayerMix } from "../../src/lib/money/types";

export type DerivedPreset = {
  coverage_volume: number;
  avg_wRVU_per_read: number;
  payer_mix: PayerMix;
  source: {
    label: string;
    months_observed: number;
    er_line_count: number;
    er_wrvu_total: number;
    derived_at: string; // ISO
  };
};

export const PRESET_STORAGE_KEY = "bridge.moneyPreset.v1";
export const PRESET_EVENT = "bridge:money-preset-changed";

/** Map raw financial_class strings to the 4 canonical payer buckets. */
function bucketFor(fc: string | null | undefined): keyof PayerMix | null {
  if (!fc) return null;
  const s = String(fc).trim().toUpperCase();
  if (s.includes("MEDICARE")) return "medicare";
  if (s.includes("MEDICAID") || s.includes("TENNCARE")) return "medicaid";
  if (s === "SELF" || s.includes("SELF-PAY") || s.includes("SELF_PAY") || s === "SP")
    return "self_pay";
  // Everything else (BCBS, UHC, Aetna, Cigna, Commercial, MCO PPO, etc.)
  return "commercial";
}

export async function derivePresetFromDb(label: string): Promise<DerivedPreset> {
  const db = await getDb();

  // ER aggregates — line count, wRVU sum, months observed.
  const er = await db.query<{
    line_count: number | string;
    wrvu_total: number | string;
    months_observed: number | string;
  }>(`
    SELECT
      COUNT(*)::bigint                     AS line_count,
      COALESCE(SUM(work_rvu), 0)::numeric  AS wrvu_total,
      GREATEST(
        1,
        (
          EXTRACT(YEAR  FROM AGE(MAX(dos), MIN(dos))) * 12
        + EXTRACT(MONTH FROM AGE(MAX(dos), MIN(dos)))
        + 1
        )
      )::int                               AS months_observed
    FROM core.fact_service_line
    WHERE segment = 'ER';
  `);
  const erRow = er.rows[0];
  const er_line_count = Number(erRow?.line_count ?? 0);
  const er_wrvu_total = Number(erRow?.wrvu_total ?? 0);
  const months_observed = Math.max(1, Number(erRow?.months_observed ?? 12));

  if (er_line_count === 0) {
    throw new Error(
      "No ER lines found in core.fact_service_line — load a dataset first.",
    );
  }

  // Annualize line count → coverage_volume. Round to nearest 100.
  const annualized = (er_line_count * 12) / months_observed;
  const coverage_volume = Math.round(annualized / 100) * 100;

  // Average wRVU per ER read. 2 decimals.
  const avg_wRVU_per_read = Math.round((er_wrvu_total / er_line_count) * 100) / 100;

  // Payer mix from ER financial_class shares.
  const mixRows = await db.query<{ financial_class: string; n: number | string }>(`
    SELECT financial_class, COUNT(*)::bigint AS n
    FROM core.fact_service_line
    WHERE segment = 'ER'
    GROUP BY financial_class;
  `);
  const raw: PayerMix = { medicare: 0, medicaid: 0, commercial: 0, self_pay: 0 };
  for (const r of mixRows.rows) {
    const bucket = bucketFor(r.financial_class);
    if (!bucket) continue;
    raw[bucket] += Number(r.n ?? 0);
  }
  const total = raw.medicare + raw.medicaid + raw.commercial + raw.self_pay;
  // Normalize to percent points summing to exactly 100 — fix residual on
  // commercial so the math identities hold without rounding drift.
  const pct = (n: number) => Math.round((n / total) * 1000) / 10; // 1 decimal
  const m: PayerMix = {
    medicare: total > 0 ? pct(raw.medicare) : 0,
    medicaid: total > 0 ? pct(raw.medicaid) : 0,
    commercial: total > 0 ? pct(raw.commercial) : 0,
    self_pay: total > 0 ? pct(raw.self_pay) : 0,
  };
  const drift = 100 - (m.medicare + m.medicaid + m.commercial + m.self_pay);
  m.commercial = Math.round((m.commercial + drift) * 10) / 10;

  return {
    coverage_volume,
    avg_wRVU_per_read,
    payer_mix: m,
    source: {
      label,
      months_observed,
      er_line_count,
      er_wrvu_total: Math.round(er_wrvu_total * 100) / 100,
      derived_at: new Date().toISOString(),
    },
  };
}

/** Persist + notify. Call from the harness after a successful load. */
export function publishPreset(preset: DerivedPreset) {
  try {
    sessionStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(preset));
    window.dispatchEvent(new CustomEvent(PRESET_EVENT, { detail: preset }));
  } catch {
    // sessionStorage can throw in private mode — non-fatal.
  }
}

export function readPreset(): DerivedPreset | null {
  try {
    const raw = sessionStorage.getItem(PRESET_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DerivedPreset;
  } catch {
    return null;
  }
}

export function clearPreset() {
  try {
    sessionStorage.removeItem(PRESET_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(PRESET_EVENT, { detail: null }));
  } catch {
    // ignore
  }
}
