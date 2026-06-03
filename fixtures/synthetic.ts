// Phase 0 — synthetic, PHI-free fixtures, shaped as RAW CSV rows (all strings; ";"-joined arrays),
// so the adapters do real normalization. Deliberately includes the hard cases the findings logic must catch:
//   A1 matched commercial paid           A2 matched MEDICARE, billing has NO accession  -> composite BRIDGE
//   A3 self-pay, collected $0 (no-pay)    A4 medicaid, paid < allowed AND below Medicare -> underpayment + shortfall
//   A5 production, NO charge -> LOST WORK  A6 charge, NO production -> CAPTURE GAP
//   A7 recent, unpaid, inside window N -> PENDING (must NOT be a denial)   A8 explicit denial (CARC)
//   A9 billing, no accession, nothing to bridge to -> UNMATCHED (capture gap)
// reference_date is 2026-05-31; N=90d. patient keys are synthetic tokens, never real identifiers.

type Raw = Record<string, string>;

export const billingRaw: Raw[] = [
  { accession: "A1", claim_id: "C1", patient_key: "P1", date_of_service: "2026-01-10", claim_submission_date: "2026-01-12", payment_posting_date: "2026-02-10", site: "main", payer: "commercial", cpt: "70450", modifiers: "26", icd10: "R51", provider: "PROV1", charge: "200", allowed: "150", paid: "150", patient_responsibility: "0", adjustment: "50", carc: "", claim_status: "paid" },
  // A2 — billing carries NO accession; must bridge to production A2 via (DOS+patient+CPT+provider)
  { accession: "", claim_id: "C2", patient_key: "P2", date_of_service: "2026-01-15", claim_submission_date: "2026-01-18", payment_posting_date: "2026-02-20", site: "main", payer: "medicare", cpt: "72125", modifiers: "26", icd10: "M54.2", provider: "PROV2", charge: "300", allowed: "120", paid: "120", patient_responsibility: "0", adjustment: "180", carc: "", claim_status: "paid" },
  // A3 — self-pay, adjudicated, collected $0 (no-pay coverage gap; NOT a denial)
  { accession: "A3", claim_id: "C3", patient_key: "P3", date_of_service: "2026-02-05", claim_submission_date: "2026-02-07", payment_posting_date: "", site: "main", payer: "self_pay", cpt: "70450", modifiers: "26", icd10: "W19.XXXA", provider: "PROV3", charge: "200", allowed: "", paid: "0", patient_responsibility: "200", adjustment: "0", carc: "", claim_status: "paid" },
  // A4 — medicaid, paid below allowed (underpayment) and below Medicare-equiv (structural shortfall)
  { accession: "A4", claim_id: "C4", patient_key: "P4", date_of_service: "2026-02-12", claim_submission_date: "2026-02-14", payment_posting_date: "2026-03-20", site: "main", payer: "medicaid", cpt: "74177", modifiers: "26", icd10: "R10.9", provider: "PROV4", charge: "500", allowed: "60", paid: "30", patient_responsibility: "0", adjustment: "440", carc: "", claim_status: "partial" },
  // A6 — charge with NO production (capture gap); has accession
  { accession: "A6", claim_id: "C6", patient_key: "P6", date_of_service: "2026-03-10", claim_submission_date: "2026-03-12", payment_posting_date: "2026-04-10", site: "main", payer: "commercial", cpt: "71046", modifiers: "26", icd10: "R07.9", provider: "PROV6", charge: "100", allowed: "80", paid: "80", patient_responsibility: "0", adjustment: "20", carc: "", claim_status: "paid" },
  // A7 — recent, unpaid, INSIDE window N -> pending, not denied
  { accession: "A7", claim_id: "C7", patient_key: "P7", date_of_service: "2026-05-10", claim_submission_date: "2026-05-12", payment_posting_date: "", site: "main", payer: "commercial", cpt: "70450", modifiers: "26", icd10: "S06.0", provider: "PROV7", charge: "200", allowed: "", paid: "0", patient_responsibility: "0", adjustment: "0", carc: "", claim_status: "pending" },
  // A8 — explicit denial (CARC CO-50)
  { accession: "A8", claim_id: "C8", patient_key: "P8", date_of_service: "2026-01-20", claim_submission_date: "2026-01-22", payment_posting_date: "", site: "main", payer: "commercial", cpt: "74177", modifiers: "26", icd10: "R10.9", provider: "PROV8", charge: "500", allowed: "", paid: "0", patient_responsibility: "0", adjustment: "0", carc: "CO-50", claim_status: "denied" },
  // A9 — billing, no accession, nothing to bridge to -> unmatched (capture gap)
  { accession: "", claim_id: "C9", patient_key: "P9", date_of_service: "2026-03-25", claim_submission_date: "2026-03-27", payment_posting_date: "2026-04-25", site: "main", payer: "commercial", cpt: "71046", modifiers: "26", icd10: "R07.9", provider: "PROVX", charge: "100", allowed: "80", paid: "80", patient_responsibility: "0", adjustment: "20", carc: "", claim_status: "paid" },
];

export const productionRaw: Raw[] = [
  { accession: "A1", patient_key: "P1", date_of_service: "2026-01-10", report_finalized_ts: "2026-01-10T12:00:00", cpt: "70450", modality: "CT", reading_radiologist: "RAD1", ordering_provider: "PROV1" },
  { accession: "A2", patient_key: "P2", date_of_service: "2026-01-15", report_finalized_ts: "2026-01-15T09:00:00", cpt: "72125", modality: "CT", reading_radiologist: "RAD2", ordering_provider: "PROV2" },
  { accession: "A3", patient_key: "P3", date_of_service: "2026-02-05", report_finalized_ts: "2026-02-05T10:00:00", cpt: "70450", modality: "CT", reading_radiologist: "RAD3", ordering_provider: "PROV3" },
  { accession: "A4", patient_key: "P4", date_of_service: "2026-02-12", report_finalized_ts: "2026-02-12T15:00:00", cpt: "74177", modality: "CT", reading_radiologist: "RAD4", ordering_provider: "PROV4" },
  // A5 — read, never billed -> LOST WORK
  { accession: "A5", patient_key: "P5", date_of_service: "2026-03-03", report_finalized_ts: "2026-03-03T22:30:00", cpt: "70551", modality: "MR", reading_radiologist: "RAD5", ordering_provider: "PROV5" },
  { accession: "A7", patient_key: "P7", date_of_service: "2026-05-10", report_finalized_ts: "2026-05-10T03:15:00", cpt: "70450", modality: "CT", reading_radiologist: "RAD7", ordering_provider: "PROV7" },
  { accession: "A8", patient_key: "P8", date_of_service: "2026-01-20", report_finalized_ts: "2026-01-20T11:00:00", cpt: "74177", modality: "CT", reading_radiologist: "RAD8", ordering_provider: "PROV8" },
];

export const workflowRaw: Raw[] = [
  { accession: "A1", patient_key: "P1", date_of_service: "2026-01-10", modality: "CT", site: "main", ordered_ts: "2026-01-10T10:00:00", performed_ts: "2026-01-10T11:00:00", report_finalized_ts: "2026-01-10T12:00:00", read_assigned_ts: "2026-01-10T11:30:00" },
  { accession: "A2", patient_key: "P2", date_of_service: "2026-01-15", modality: "CT", site: "main", ordered_ts: "2026-01-15T07:00:00", performed_ts: "2026-01-15T08:00:00", report_finalized_ts: "2026-01-15T09:00:00", read_assigned_ts: "2026-01-15T08:30:00" },
  { accession: "A3", patient_key: "P3", date_of_service: "2026-02-05", modality: "CT", site: "main", ordered_ts: "2026-02-05T08:00:00", performed_ts: "2026-02-05T09:00:00", report_finalized_ts: "2026-02-05T10:00:00", read_assigned_ts: "2026-02-05T09:30:00" },
  { accession: "A4", patient_key: "P4", date_of_service: "2026-02-12", modality: "CT", site: "main", ordered_ts: "2026-02-12T13:00:00", performed_ts: "2026-02-12T14:00:00", report_finalized_ts: "2026-02-12T15:00:00", read_assigned_ts: "2026-02-12T14:30:00" },
  { accession: "A5", patient_key: "P5", date_of_service: "2026-03-03", modality: "MR", site: "childrens", ordered_ts: "2026-03-03T21:00:00", performed_ts: "2026-03-03T22:00:00", report_finalized_ts: "2026-03-03T22:30:00", read_assigned_ts: "2026-03-03T22:10:00" },
  { accession: "A7", patient_key: "P7", date_of_service: "2026-05-10", modality: "CT", site: "childrens", ordered_ts: "2026-05-10T02:00:00", performed_ts: "2026-05-10T03:00:00", report_finalized_ts: "2026-05-10T03:15:00", read_assigned_ts: "2026-05-10T03:05:00" },
  { accession: "A8", patient_key: "P8", date_of_service: "2026-01-20", modality: "CT", site: "main", ordered_ts: "2026-01-20T10:00:00", performed_ts: "2026-01-20T10:30:00", report_finalized_ts: "2026-01-20T11:00:00", read_assigned_ts: "2026-01-20T10:45:00" },
];

// ---- COVERAGE / NIGHT scenario (separate from the core set, so the core 35 assertions don't move) ----
// Exercises the night-ER block: after-hours reads (N1-N3) concentrating the worst payer mix at Children's,
// vs a daytime control (N4). N1 self-pay "fall" head CT (no-pay + low-yield); N2 medicaid "fall" C-spine
// (shortfall); N3 commercial after-hours (no structural gap); N4 daytime commercial (NOT after-hours).
export const coverageBillingRaw: Raw[] = [
  { accession: "N1", claim_id: "CN1", patient_key: "Q1", date_of_service: "2026-02-03", claim_submission_date: "2026-02-04", payment_posting_date: "", site: "childrens", payer: "self_pay", cpt: "70450", modifiers: "26", icd10: "W19.XXXA", provider: "PROVN1", charge: "200", allowed: "", paid: "0", patient_responsibility: "200", adjustment: "0", carc: "", claim_status: "paid" },
  { accession: "N2", claim_id: "CN2", patient_key: "Q2", date_of_service: "2026-02-04", claim_submission_date: "2026-02-05", payment_posting_date: "2026-03-01", site: "childrens", payer: "medicaid", cpt: "72125", modifiers: "26", icd10: "W19.XXXA", provider: "PROVN2", charge: "300", allowed: "40", paid: "20", patient_responsibility: "0", adjustment: "260", carc: "", claim_status: "partial" },
  { accession: "N3", claim_id: "CN3", patient_key: "Q3", date_of_service: "2026-02-05", claim_submission_date: "2026-02-06", payment_posting_date: "2026-03-05", site: "main", payer: "commercial", cpt: "74177", modifiers: "26", icd10: "R10.9", provider: "PROVN3", charge: "500", allowed: "150", paid: "150", patient_responsibility: "0", adjustment: "350", carc: "", claim_status: "paid" },
  { accession: "N4", claim_id: "CN4", patient_key: "Q4", date_of_service: "2026-02-06", claim_submission_date: "2026-02-07", payment_posting_date: "2026-03-06", site: "main", payer: "commercial", cpt: "70450", modifiers: "26", icd10: "R51", provider: "PROVN4", charge: "200", allowed: "120", paid: "120", patient_responsibility: "0", adjustment: "80", carc: "", claim_status: "paid" },
];
export const coverageProductionRaw: Raw[] = [
  { accession: "N1", patient_key: "Q1", date_of_service: "2026-02-03", report_finalized_ts: "2026-02-03T03:20:00", cpt: "70450", modality: "CT", reading_radiologist: "RAD_PEDS", ordering_provider: "PROVN1" },
  { accession: "N2", patient_key: "Q2", date_of_service: "2026-02-04", report_finalized_ts: "2026-02-04T23:20:00", cpt: "72125", modality: "CT", reading_radiologist: "RAD_PEDS", ordering_provider: "PROVN2" },
  { accession: "N3", patient_key: "Q3", date_of_service: "2026-02-05", report_finalized_ts: "2026-02-05T02:20:00", cpt: "74177", modality: "CT", reading_radiologist: "RAD_BODY", ordering_provider: "PROVN3" },
  { accession: "N4", patient_key: "Q4", date_of_service: "2026-02-06", report_finalized_ts: "2026-02-06T10:20:00", cpt: "70450", modality: "CT", reading_radiologist: "RAD_NEURO", ordering_provider: "PROVN4" },
];
export const coverageWorkflowRaw: Raw[] = [
  { accession: "N1", patient_key: "Q1", date_of_service: "2026-02-03", modality: "CT", site: "childrens", ordered_ts: "2026-02-03T02:40:00", performed_ts: "2026-02-03T03:00:00", report_finalized_ts: "2026-02-03T03:20:00", read_assigned_ts: "2026-02-03T03:05:00" },
  { accession: "N2", patient_key: "Q2", date_of_service: "2026-02-04", modality: "CT", site: "childrens", ordered_ts: "2026-02-04T22:40:00", performed_ts: "2026-02-04T23:00:00", report_finalized_ts: "2026-02-04T23:20:00", read_assigned_ts: "2026-02-04T23:05:00" },
  { accession: "N3", patient_key: "Q3", date_of_service: "2026-02-05", modality: "CT", site: "main", ordered_ts: "2026-02-05T01:40:00", performed_ts: "2026-02-05T02:00:00", report_finalized_ts: "2026-02-05T02:20:00", read_assigned_ts: "2026-02-05T02:05:00" },
  { accession: "N4", patient_key: "Q4", date_of_service: "2026-02-06", modality: "CT", site: "main", ordered_ts: "2026-02-06T09:40:00", performed_ts: "2026-02-06T10:00:00", report_finalized_ts: "2026-02-06T10:20:00", read_assigned_ts: "2026-02-06T10:05:00" },
];

// A LATER extract of A7 — now adjudicated and paid. Used to prove RESTATEMENT: the provisional 2026-05
// point firms (collections move from $0 to $100) and de-shades once it matures. Same record, more-mature load.
export const billingRaw_laterA7: Raw = {
  accession: "A7", claim_id: "C7", patient_key: "P7", date_of_service: "2026-05-10", claim_submission_date: "2026-05-12", payment_posting_date: "2026-06-15", site: "main", payer: "commercial", cpt: "70450", modifiers: "26", icd10: "S06.0", provider: "PROV7", charge: "200", allowed: "150", paid: "100", patient_responsibility: "50", adjustment: "50", carc: "", claim_status: "paid",
};
