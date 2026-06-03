// Canonical records — the one shape each box normalizes to.
// Downstream (join, enrich, maturity, money) sees ONLY these. New input form = new adapter, zero downstream change.
// Two keys only: entity (accession) and time (date_of_service). Everything hangs off them.

export type Payer = "medicare" | "medicaid" | "commercial" | "self_pay";
export type ClaimStatus = "paid" | "partial" | "pending" | "denied";

// ISO date string, "YYYY-MM-DD". date_of_service is the anchor for every metric.
export type ISODate = string;

// BOX 1 — Billing: the money + the codes. One canonical record per claim service line.
export interface BillingRecord {
  box: "billing";
  accession: string | null;       // entity key; may be absent → composite bridge closes it
  claim_id: string;
  patient_key: string;            // hashed at ingestion; consistent across boxes
  date_of_service: ISODate;       // THE anchor
  claim_submission_date: ISODate | null;
  payment_posting_date: ISODate | null; // money arrival; NEVER sets the month
  site: string;
  payer: Payer;
  cpt: string;                    // what was done
  modifiers: string[];
  icd10: string[];                // why — the indication ("fall" lives here, box 1, from the code)
  provider: string;
  charge: number;
  allowed: number | null;
  paid: number;                   // realized cash to date (0 if pending/denied)
  patient_responsibility: number;
  adjustment: number;
  carc: string[];                 // denial reason codes (empty if none)
  claim_status: ClaimStatus;
}

// BOX 2 — Production: the billable work + its result. One canonical record per finalized report.
export interface ProductionRecord {
  box: "production";
  accession: string;
  patient_key: string;
  date_of_service: ISODate;       // exam date = anchor
  report_finalized_ts: string;
  cpt: string;
  modality: string | null;
  reading_radiologist: string;
  ordering_provider: string | null;
  // NOTE: indication is read from billing ICD-10, not parsed here. No report prose enters the engine.
}

// BOX 3 — Workflow: the operational clock. One canonical record per exam.
export interface WorkflowRecord {
  box: "workflow";
  accession: string;
  patient_key: string;
  date_of_service: ISODate;       // anchor
  modality: string;
  site: string;
  ordered_ts: string | null;
  performed_ts: string | null;    // exam-complete
  report_finalized_ts: string | null;
  read_assigned_ts: string | null;
}

export type JoinTier = "exact" | "bridged" | "unmatched";

// Why an unmatched record is interesting — the finding bucket it falls into.
export type FindingKind =
  | "matched"          // fully reconciled, no finding
  | "lost_work"        // production with no charge — read, never billed
  | "capture_gap"      // charge with no production — billed without a recorded read
  | "denial"           // charge denied, or no payment past the maturity window
  | "underpayment";    // paid, but below allowed/contract

// A FACT = one exam's reconciled view across the three boxes.
export interface Fact {
  key: string;                    // accession if present, else the composite bridge key
  join_tier: JoinTier;            // an OUTPUT, not an error
  finding: FindingKind;
  date_of_service: ISODate;
  service_month: string;          // "YYYY-MM" — the only bucketing axis
  billing: BillingRecord | null;
  production: ProductionRecord | null;
  workflow: WorkflowRecord | null;
  // enrichment (filled by enrich step)
  wrvu: number;                   // value-units for this exam's CPT (0 if unknown)
  // maturity (filled by maturity step)
  maturity_class: "production" | "charge_capture" | "payment_realized";
  matured: boolean;               // false = inside the immature edge for its class
}
