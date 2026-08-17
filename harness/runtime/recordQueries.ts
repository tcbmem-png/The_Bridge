// Named queries against the economic record. Everything the /record and
// /economics surfaces display comes from here — no constants, no assertions.

import { q } from "./recordDb";

export interface FunnelRow {
  step: string;
  ord: number;
  unit_count: number | null;
  amount: number | null;
}

export const funnel = () =>
  q<FunnelRow>(`SELECT step, ord, unit_count, amount FROM recon.funnel;`);

export const sourceStatus = () =>
  q<{ source: string; row_count: number }>(`SELECT source, row_count FROM recon.source_status;`);

export const workToClaims = () => q(`SELECT * FROM recon.work_to_claims;`);
export const claimsToAdjudication = () => q(`SELECT * FROM recon.claims_to_adjudication;`);
export const adjudicationToPayment = () => q(`SELECT * FROM recon.adjudication_to_payment;`);
export const paymentToCash = () => q(`SELECT * FROM recon.payment_to_cash;`);
export const referenceIntegrity = () => q(`SELECT * FROM recon.reference_integrity;`);

export type SegmentKey =
  | "physician"
  | "payer"
  | "facility"
  | "site_of_service"
  | "service_family"
  | "cpt_code"
  | "service_month"
  | "financial_class";

const SEGMENT_SQL: Record<SegmentKey, { expr: string; join: string }> = {
  physician: {
    expr: "COALESCE(ph.physician_name, 'Unknown physician (' || COALESCE(s.physician_id,'no NPI') || ')')",
    join: "LEFT JOIN ref.physician ph ON ph.physician_npi = s.physician_id",
  },
  payer: {
    expr: "COALESCE(p.payer_name, 'Unknown payer (' || COALESCE(s.payer_id,'blank') || ')')",
    join: "LEFT JOIN ref.payer p ON p.payer_id = s.payer_id",
  },
  financial_class: {
    expr: "COALESCE(s.financial_class, 'unknown')",
    join: "",
  },
  facility: {
    expr: "COALESCE(f.facility_name, 'Unknown facility (' || COALESCE(s.facility_id,'blank') || ')')",
    join: "LEFT JOIN ref.facility f ON f.facility_id = s.facility_id",
  },
  site_of_service: { expr: "COALESCE(s.site_of_service, 'unknown')", join: "" },
  service_family: { expr: "s.service_family", join: "" },
  cpt_code: { expr: "s.cpt_code", join: "" },
  service_month: { expr: "to_char(s.service_month, 'YYYY-MM')", join: "" },
};

export interface SegmentRow {
  segment: string;
  lines: number;
  work_rvu: number | null;
  unmapped_lines: number;
  charges: number | null;
  allowed: number | null;
  paid: number | null;
  denied_lines: number;
  unadjudicated_lines: number;
  avg_days_to_pay: number | null;
}

export function segments(key: SegmentKey, where = "TRUE", params: unknown[] = []) {
  const { expr, join } = SEGMENT_SQL[key];
  return q<SegmentRow>(
    `
    SELECT
      ${expr}                                                  AS segment,
      COUNT(*)                                                 AS lines,
      SUM(s.work_rvu)                                          AS work_rvu,
      COUNT(*) FILTER (WHERE NOT s.wrvu_mapped)                AS unmapped_lines,
      SUM(s.charge_amount)                                     AS charges,
      SUM(s.allowed_amount)                                    AS allowed,
      SUM(s.paid_amount)                                       AS paid,
      COUNT(*) FILTER (WHERE s.adjudication_status = 'denied') AS denied_lines,
      COUNT(*) FILTER (WHERE s.remittance_match_status = 'unmatched') AS unadjudicated_lines,
      AVG(s.days_to_pay)                                       AS avg_days_to_pay
    FROM core.service_economics s
    ${join}
    WHERE ${where}
    GROUP BY 1
    ORDER BY 7 DESC NULLS LAST;
  `,
    params,
  );
}

export const totals = () =>
  q<{
    lines: number;
    work_rvu: number | null;
    unmapped_lines: number;
    charges: number | null;
    allowed: number | null;
    paid: number | null;
    patient_resp: number | null;
    adjustments: number | null;
  }>(`
    SELECT
      COUNT(*) AS lines,
      SUM(work_rvu) AS work_rvu,
      COUNT(*) FILTER (WHERE NOT wrvu_mapped) AS unmapped_lines,
      SUM(charge_amount) AS charges,
      SUM(allowed_amount) AS allowed,
      SUM(paid_amount) AS paid,
      SUM(patient_resp) AS patient_resp,
      SUM(adjustment_amount) AS adjustments
    FROM core.service_economics;
  `);

/** Denial / adjustment / unresolved leakage, by reason then payer. */
export const leakage = () =>
  q<{
    reason: string;
    category: string | null;
    lines: number;
    charges: number | null;
    unpaid: number | null;
  }>(`
    SELECT
      CASE
        WHEN s.remittance_match_status = 'unmatched' THEN 'No remittance on record'
        WHEN s.adjudication_status = 'denied' AND (s.denial_code IS NULL OR s.denial_code = '')
          THEN 'Denied — reason code absent'
        WHEN s.adjudication_status = 'denied' THEN s.denial_code
        WHEN s.adjudication_status = 'zero_pay' THEN 'Adjudicated, zero payer payment'
        ELSE 'Paid'
      END                                        AS reason,
      MAX(dc.category)                           AS category,
      COUNT(*)                                   AS lines,
      SUM(s.charge_amount)                       AS charges,
      SUM(s.allowed_amount - s.paid_amount) FILTER (
        WHERE s.allowed_amount IS NOT NULL AND s.paid_amount IS NOT NULL
      ) AS unpaid
    FROM core.service_economics s
    LEFT JOIN ref.denial_code dc ON dc.denial_code = s.denial_code
    GROUP BY 1
    ORDER BY 3 DESC;
  `);

/** Drill: every line under a segment value, newest first. */
export function linesFor(key: SegmentKey, value: string, limit = 200) {
  const { expr, join } = SEGMENT_SQL[key];
  return q(
    `
    SELECT
      s.service_id, s.claim_id, s.claim_line_id, s.encounter_id, s.dos,
      s.cpt_code, s.service_family, s.pos_code, s.payer_id, s.physician_id,
      s.units, s.work_rvu, s.charge_amount, s.allowed_amount, s.paid_amount,
      s.adjudication_status, s.denial_code, s.days_to_pay,
      s.encounter_match_status, s.remittance_match_status, s.cash_match_status
    FROM core.service_economics s
    ${join}
    WHERE ${expr} = $1
    ORDER BY s.paid_amount DESC NULLS LAST, s.dos
    LIMIT ${limit};
  `,
    [value],
  );
}

/** Deepest drill: the source rows behind one claim line. */
export async function lineage(claimId: string, lineNumber: number) {
  const [claim, remit, encounter, deposit, mpfs] = await Promise.all([
    q(
      `SELECT c.*, sf.file_name FROM stg.claim_line c
       LEFT JOIN raw.source_file sf ON sf.file_id = c.source_file_id
       WHERE c.claim_id = $1 AND c.line_number = $2;`,
      [claimId, lineNumber],
    ),
    q(
      `SELECT r.*, sf.file_name FROM stg.remit_line r
       LEFT JOIN raw.source_file sf ON sf.file_id = r.source_file_id
       WHERE r.claim_id = $1 AND r.line_number = $2;`,
      [claimId, lineNumber],
    ),
    q(
      `SELECT e.*, sf.file_name FROM stg.encounter e
       LEFT JOIN raw.source_file sf ON sf.file_id = e.source_file_id
       WHERE e.encounter_id = (
         SELECT encounter_id FROM stg.claim_line WHERE claim_id = $1 AND line_number = $2
       );`,
      [claimId, lineNumber],
    ),
    q(
      `SELECT d.*, sf.file_name FROM stg.deposit d
       LEFT JOIN raw.source_file sf ON sf.file_id = d.source_file_id
       WHERE d.eft_trace IN (
         SELECT eft_trace FROM stg.remit_line WHERE claim_id = $1 AND line_number = $2
       );`,
      [claimId, lineNumber],
    ),
    q(
      `SELECT m.* FROM ref.mpfs_wrvu m
       WHERE m.cpt_code = (SELECT cpt_code FROM stg.claim_line WHERE claim_id = $1 AND line_number = $2)
         AND m.service_year = (SELECT EXTRACT(YEAR FROM dos)::int FROM stg.claim_line WHERE claim_id = $1 AND line_number = $2);`,
      [claimId, lineNumber],
    ),
  ]);
  return { claim, remit, encounter, deposit, mpfs };
}

export const unbilledWork = (limit = 200) =>
  q(
    `SELECT encounter_id, dos, physician_npi, facility_id, pos_code, encounter_class, procedure_cpt
     FROM core.unbilled_work ORDER BY dos LIMIT ${limit};`,
  );

export const unresolvedClaims = (limit = 200) =>
  q(
    `SELECT claim_id, claim_line_id, dos, cpt_code, payer_id, charge_amount,
            claim_submit_date, remittance_match_status
     FROM core.service_economics
     WHERE remittance_match_status IN ('unmatched','ambiguous','contradictory')
     ORDER BY charge_amount DESC LIMIT ${limit};`,
  );

export const contradictions = () =>
  q(`
    SELECT c.claim_id, c.line_number, c.payer_id AS claim_payer, r.remit_payer_id AS remit_payer,
           r.remit_row_count
    FROM stg.claim_line c
    JOIN core.remit_rollup r ON r.claim_id = c.claim_id AND r.line_number = c.line_number
    WHERE (c.payer_id IS NOT NULL AND r.remit_payer_id IS NOT NULL AND c.payer_id <> r.remit_payer_id)
       OR r.distinct_remit_payers > 1
    ORDER BY c.claim_id;
  `);

/** Median allowed-to-paid ratio on the record — a record input for counterfactuals. */
export const medianPaidRatio = () =>
  q<{ ratio: number | null }>(`
    SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (
      ORDER BY paid_amount / NULLIF(allowed_amount, 0)
    ) AS ratio
    FROM core.service_economics
    WHERE allowed_amount > 0 AND paid_amount IS NOT NULL;
  `);

export const unresolvedAllowed = () =>
  q<{ unresolved_charges: number | null; unresolved_lines: number }>(`
    SELECT SUM(charge_amount) AS unresolved_charges, COUNT(*) AS unresolved_lines
    FROM core.service_economics
    WHERE remittance_match_status = 'unmatched';
  `);

export const payerMedicareComparison = () =>
  q<{ payer_id: string; payer_name: string | null; paid: number | null; work_rvu: number | null }>(`
    SELECT s.payer_id, MAX(p.payer_name) AS payer_name,
           SUM(s.paid_amount) AS paid, SUM(s.work_rvu) AS work_rvu
    FROM core.service_economics s
    LEFT JOIN ref.payer p ON p.payer_id = s.payer_id
    WHERE s.work_rvu IS NOT NULL
    GROUP BY s.payer_id
    ORDER BY 3 DESC NULLS LAST;
  `);
