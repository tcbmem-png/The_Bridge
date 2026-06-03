// Named queries against the harness. Each is exactly what the file's
// acceptance footer (lines 416-422) instructs an auditor to run.

import { getDb } from "./db";

export type Row = Record<string, unknown>;

async function q<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  const res = await db.query<T>(sql, params);
  return res.rows;
}

// A. core.segment_monthly — headline yields by month and segment.
export function segmentMonthly() {
  return q(`
    SELECT service_month, segment, line_count, wrvu, charges, collections, yield_per_wrvu
    FROM core.segment_monthly
    ORDER BY service_month, segment;
  `);
}

// B. recon.cash_tieout — 0 rows means 835 paid equals bank deposits.
export function cashTieout() {
  return q(`SELECT * FROM recon.cash_tieout;`);
}

// C. recon.volume_tieout — unbilled_gap = 0 every month.
export function volumeTieout() {
  return q(`SELECT * FROM recon.volume_tieout ORDER BY service_month;`);
}

// Handoff contract — the only columns the calculator's audited path reads.
export function erYieldPeriod() {
  return q(`
    SELECT
      service_month,
      er_wrvu, er_collections, er_yield,
      non_er_wrvu, non_er_collections, non_er_yield,
      days_since_period_end, is_mature
    FROM core.er_yield_period
    ORDER BY service_month;
  `);
}

// Lineage drill — the file's SELECT at lines 277-289, parameterized.
// :p_month becomes $1; the query is otherwise identical to the canonical
// SQL. SUM(paid_amount) of returned rows MUST equal
// core.segment_monthly.collections for ('ER', month).
export function lineageForMonth(monthIso: string) {
  return q(
    `
    SELECT
      f.claim_id, f.line_number, f.dos, f.pos_code, f.cpt_code,
      f.rendering_npi, f.payer_id, f.financial_class,
      f.work_rvu, f.charge_amount, f.paid_amount,
      f.carc_codes, f.check_eft_trace,
      s837.file_name AS src_837_file, s837.sha256 AS src_837_hash,
      s835.file_name AS src_835_file, s835.sha256 AS src_835_hash
    FROM core.fact_service_line f
    LEFT JOIN raw.source_file s837 ON s837.file_id = f.src_file_837
    LEFT JOIN raw.source_file s835 ON s835.file_id = f.src_file_835
    WHERE f.segment = 'ER'
      AND date_trunc('month', f.dos) = $1::date
    ORDER BY f.dos, f.claim_id, f.line_number;
  `,
    [monthIso],
  );
}

// Months with ER activity, for the lineage month picker.
export function erMonths() {
  return q<{ service_month: string }>(`
    SELECT DISTINCT date_trunc('month', dos)::date AS service_month
    FROM core.fact_service_line
    WHERE segment = 'ER'
    ORDER BY service_month;
  `);
}

// Independent check: collections for (ER, month) from segment_monthly.
export function erCollectionsForMonth(monthIso: string) {
  return q<{ collections: number | string | null }>(
    `
    SELECT collections FROM core.segment_monthly
    WHERE segment = 'ER' AND service_month = $1::date;
  `,
    [monthIso],
  );
}

// Totals across all ER lines — the two numbers the valuator wants.
export function erTotals() {
  return q<{ wrvu: number | string | null; collections: number | string | null; line_count: number | string }>(
    `
    SELECT
      COALESCE(SUM(work_rvu), 0)    AS wrvu,
      COALESCE(SUM(paid_amount), 0) AS collections,
      COUNT(*)                      AS line_count
    FROM core.fact_service_line
    WHERE segment = 'ER';
  `,
  );
}

// Every ER line with full lineage to 837/835/RIS/MPFS — the drill source.
export function erAllLines() {
  return q(
    `
    SELECT
      f.claim_id, f.line_number, f.dos, f.cpt_code, f.accession,
      f.units, f.work_rvu, f.charge_amount, f.paid_amount,
      f.payer_id, f.financial_class, f.check_eft_trace,
      s837.file_name AS src_837_file, s837.sha256 AS src_837_hash,
      s835.file_name AS src_835_file, s835.sha256 AS src_835_hash,
      e.exam_cpt, e.modality, e.ordering_location, e.finalized_at,
      e.pos_code AS ris_pos, e.rendering_npi AS ris_npi,
      sris.file_name AS src_ris_file, sris.sha256 AS src_ris_hash,
      m.work_rvu AS mpfs_work_rvu, m.conversion_factor AS mpfs_cf,
      m.service_year AS mpfs_year
    FROM core.fact_service_line f
    LEFT JOIN raw.source_file s837 ON s837.file_id = f.src_file_837
    LEFT JOIN raw.source_file s835 ON s835.file_id = f.src_file_835
    LEFT JOIN stg.ris_exam     e    ON e.accession = f.accession
    LEFT JOIN raw.source_file sris ON sris.file_id = e.source_file_id
    LEFT JOIN ref.mpfs_wrvu    m    ON m.cpt_code = f.cpt_code
                                     AND m.service_year = EXTRACT(YEAR FROM f.dos)::INT
    WHERE f.segment = 'ER'
    ORDER BY f.dos, f.claim_id, f.line_number;
  `,
  );
}

