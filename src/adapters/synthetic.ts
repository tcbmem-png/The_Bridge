// Synthetic CSV-shaped adapters (one per box). They take raw rows AS THEY'D COME FROM A CSV EXPORT
// (all strings; arrays as ";"-joined) and normalize to canonical typed records. This is real normalization
// work — it just stands in for the real-source adapters until Phase 5. Downstream never sees these raw shapes.

import type { BoxAdapter } from "./types.ts";
import type { BillingRecord, ProductionRecord, WorkflowRecord, Payer, ClaimStatus } from "../schemas/canonical.ts";

type Raw = Record<string, string>;
const num = (s: string | undefined) => (s == null || s === "" ? 0 : Number(s));
const numOrNull = (s: string | undefined) => (s == null || s === "" ? null : Number(s));
const strOrNull = (s: string | undefined) => (s == null || s === "" ? null : s);
const arr = (s: string | undefined) => (s == null || s === "" ? [] : s.split(";").map((x) => x.trim()).filter(Boolean));

export const billingCsvAdapter: BoxAdapter<Raw, BillingRecord> = {
  form: "csv", box: "billing",
  normalize(rows) {
    return rows.map((r) => ({
      box: "billing",
      accession: strOrNull(r.accession),
      claim_id: r.claim_id,
      patient_key: r.patient_key,
      date_of_service: r.date_of_service,
      claim_submission_date: strOrNull(r.claim_submission_date),
      payment_posting_date: strOrNull(r.payment_posting_date),
      site: r.site,
      payer: r.payer as Payer,
      cpt: r.cpt,
      modifiers: arr(r.modifiers),
      icd10: arr(r.icd10),
      provider: r.provider,
      charge: num(r.charge),
      allowed: numOrNull(r.allowed),
      paid: num(r.paid),
      patient_responsibility: num(r.patient_responsibility),
      adjustment: num(r.adjustment),
      carc: arr(r.carc),
      claim_status: r.claim_status as ClaimStatus,
    }));
  },
};

export const productionCsvAdapter: BoxAdapter<Raw, ProductionRecord> = {
  form: "csv", box: "production",
  normalize(rows) {
    return rows.map((r) => ({
      box: "production",
      accession: r.accession,
      patient_key: r.patient_key,
      date_of_service: r.date_of_service,
      report_finalized_ts: r.report_finalized_ts,
      cpt: r.cpt,
      modality: strOrNull(r.modality),
      reading_radiologist: r.reading_radiologist,
      ordering_provider: strOrNull(r.ordering_provider),
    }));
  },
};

export const workflowCsvAdapter: BoxAdapter<Raw, WorkflowRecord> = {
  form: "csv", box: "workflow",
  normalize(rows) {
    return rows.map((r) => ({
      box: "workflow",
      accession: r.accession,
      patient_key: r.patient_key,
      date_of_service: r.date_of_service,
      modality: r.modality,
      site: r.site,
      ordered_ts: strOrNull(r.ordered_ts),
      performed_ts: strOrNull(r.performed_ts),
      report_finalized_ts: strOrNull(r.report_finalized_ts),
      read_assigned_ts: strOrNull(r.read_assigned_ts),
    }));
  },
};
