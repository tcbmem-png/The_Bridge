// Content-level integrity checks. These do NOT block a load — they surface
// in the IntegrityPanel so the recon failures stay visible. Mirrors how
// real 835/837 ingestion behaves: load what you got, name what is missing.

import { getDb } from "../runtime/db";

export interface IntegrityFinding {
  id: string;
  label: string;
  detail: string;
  severity: "ok" | "warn" | "fail";
}

export async function runIntegrityChecks(): Promise<IntegrityFinding[]> {
  const db = await getDb();
  const findings: IntegrityFinding[] = [];

  // 1. Month coverage — need >= 36 distinct service months for is_mature to populate.
  const monthRes = await db.query<{ n: number | string }>(
    `SELECT COUNT(DISTINCT date_trunc('month', dos))::int AS n FROM stg.claim_837;`,
  );
  const months = Number(monthRes.rows[0]?.n ?? 0);
  findings.push({
    id: "month_coverage",
    label: "Month coverage",
    detail:
      months >= 36
        ? `${months} distinct service months — sufficient for maturity (≥36).`
        : `${months} distinct service months — below 36. Recent months will report is_mature = FALSE.`,
    severity: months >= 36 ? "ok" : months > 0 ? "warn" : "fail",
  });

  // 2. MPFS rate coverage — every (cpt, service_year) in billed lines should have a work_rvu.
  const mpfsRes = await db.query<{ missing: number | string }>(`
    SELECT COUNT(*)::int AS missing FROM (
      SELECT DISTINCT c.cpt_code, EXTRACT(YEAR FROM c.dos)::int AS yr
      FROM stg.claim_837 c
      LEFT JOIN ref.mpfs_wrvu m
        ON m.cpt_code = c.cpt_code
       AND m.service_year = EXTRACT(YEAR FROM c.dos)::int
      WHERE m.work_rvu IS NULL
    ) gaps;
  `);
  const mpfsMissing = Number(mpfsRes.rows[0]?.missing ?? 0);
  findings.push({
    id: "mpfs_coverage",
    label: "MPFS rate coverage",
    detail:
      mpfsMissing === 0
        ? "Every (cpt, service_year) on a billed line has a work_rvu."
        : `${mpfsMissing} (cpt, service_year) combinations on billed lines have no MPFS rate. Those lines contribute 0 wRVU.`,
    severity: mpfsMissing === 0 ? "ok" : "warn",
  });

  // 3. FK closure — billed lines without a matching ERA line.
  const remitRes = await db.query<{ unpaid: number | string; total: number | string }>(`
    SELECT
      COUNT(*) FILTER (WHERE r.remit_line_id IS NULL)::int AS unpaid,
      COUNT(*)::int AS total
    FROM stg.claim_837 c
    LEFT JOIN stg.remit_835 r
      ON r.claim_id = c.claim_id AND r.line_number = c.line_number;
  `);
  const unpaid = Number(remitRes.rows[0]?.unpaid ?? 0);
  const totalBilled = Number(remitRes.rows[0]?.total ?? 0);
  findings.push({
    id: "remit_closure",
    label: "Remit closure (837 ↔ 835)",
    detail:
      totalBilled === 0
        ? "No billed lines loaded."
        : unpaid === 0
          ? `All ${totalBilled} billed lines have a matching ERA line.`
          : `${unpaid} of ${totalBilled} billed lines have no matching ERA line. Counted as unpaid in collections.`,
    severity: totalBilled === 0 ? "fail" : unpaid === 0 ? "ok" : "warn",
  });

  // 4. Bank closure — ERA EFT traces without a matching bank deposit.
  const bankRes = await db.query<{ orphans: number | string }>(`
    SELECT COUNT(*)::int AS orphans FROM (
      SELECT DISTINCT r.check_eft_trace
      FROM stg.remit_835 r
      LEFT JOIN recon.bank_deposit b ON b.eft_trace = r.check_eft_trace
      WHERE r.check_eft_trace IS NOT NULL AND b.eft_trace IS NULL
    ) o;
  `);
  const orphans = Number(bankRes.rows[0]?.orphans ?? 0);
  findings.push({
    id: "bank_closure",
    label: "Bank closure (835 ↔ deposits)",
    detail:
      orphans === 0
        ? "Every ERA EFT trace has a matching bank deposit."
        : `${orphans} EFT trace(s) on ERA lines have no matching bank deposit. Cash tie-out will show variance rows.`,
    severity: orphans === 0 ? "ok" : "fail",
  });

  return findings;
}
