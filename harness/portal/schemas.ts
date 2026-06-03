// Shape contract per export type. Required columns are the ones the portal
// uses to populate the underlying staging/reference table. Aliases handle
// common source-system column-name variants so a user can drop the file
// their billing system actually emits. Extra columns are dropped silently.
//
// This file is the single source of truth — docs/upload-portal-contract.md
// documents the same shape in prose for users generating their own exports.

import type { ExportType } from "./types";

export interface ColumnSpec {
  /** Canonical column name written into PGlite. */
  name: string;
  /** Accepted source-export column names (case-insensitive). */
  aliases?: string[];
  /** Parsed JS type — drives the type-check and the value coercion. */
  kind: "text" | "int" | "numeric" | "date" | "timestamp" | "bool";
  /** Required columns block on miss; optional columns are nulled when absent. */
  required: boolean;
}

export interface ExportSpec {
  type: ExportType;
  label: string;
  /** Schema-qualified table the rows land in. */
  table: string;
  /** Filename patterns used as a tiebreaker after header sniffing. */
  filenameHints: string[];
  /** Columns. Order is the canonical column order for the target table. */
  columns: ColumnSpec[];
  /** Provenance file_type written to raw.source_file ('837','835', etc.). */
  rawFileType?: "837" | "835" | "ris_exam" | "bank_stmt";
}

export const SPECS: Record<ExportType, ExportSpec> = {
  billing_export: {
    type: "billing_export",
    label: "Billing export (837 lines)",
    table: "stg.claim_837",
    filenameHints: ["billing", "837", "claim"],
    rawFileType: "837",
    columns: [
      { name: "claim_id",      kind: "text",    required: true },
      { name: "line_number",   kind: "int",     required: true, aliases: ["line", "line_no", "svc_line", "claim_line"] },
      { name: "accession",     kind: "text",    required: false, aliases: ["accession_number", "ris_accession"] },
      { name: "patient_token", kind: "text",    required: false, aliases: ["patient_id_token", "deid_patient_id"] },
      { name: "dos",           kind: "date",    required: true,  aliases: ["date_of_service", "service_date"] },
      { name: "pos_code",      kind: "text",    required: true,  aliases: ["place_of_service", "pos"] },
      { name: "facility_id",   kind: "text",    required: false, aliases: ["facility", "service_facility", "facility_code", "site_code"] },
      { name: "rendering_npi", kind: "text",    required: false, aliases: ["npi", "rendering_provider_npi"] },
      { name: "cpt_code",      kind: "text",    required: true,  aliases: ["cpt", "procedure_code", "hcpcs"] },
      { name: "modifiers",     kind: "text",    required: false, aliases: ["modifier", "mods", "modifier1"] },
      { name: "units",         kind: "numeric", required: false },
      { name: "charge_amount", kind: "numeric", required: true,  aliases: ["charge", "billed_amount"] },
      { name: "payer_id",      kind: "text",    required: false, aliases: ["payer", "insurance_id"] },
    ],
  },
  era: {
    type: "era",
    label: "ERA (835 remittance lines)",
    table: "stg.remit_835",
    filenameHints: ["era", "835", "remit"],
    rawFileType: "835",
    columns: [
      { name: "claim_id",        kind: "text",      required: true },
      { name: "line_number",     kind: "int",       required: true, aliases: ["line", "svc_line", "claim_line"] },
      { name: "cpt_code",        kind: "text",      required: false, aliases: ["cpt", "procedure_code"] },
      { name: "charge_amount",   kind: "numeric",   required: false, aliases: ["charge", "billed_amount"] },
      { name: "allowed_amount",  kind: "numeric",   required: false, aliases: ["allowed"] },
      { name: "paid_amount",     kind: "numeric",   required: true,  aliases: ["paid"] },
      { name: "patient_resp",    kind: "numeric",   required: false, aliases: ["patient_responsibility"] },
      { name: "adj_group_code",  kind: "text",      required: false, aliases: ["group_code"] },
      { name: "carc_codes",      kind: "text",      required: false, aliases: ["carc", "adjustment_codes"] },
      { name: "rarc_codes",      kind: "text",      required: false, aliases: ["rarc", "remark_codes"] },
      { name: "check_eft_trace", kind: "text",      required: true,  aliases: ["eft_trace", "trace_number", "check_number"] },
      { name: "payment_date",    kind: "date",      required: false, aliases: ["paid_date"] },
      { name: "payer_id",        kind: "text",      required: false, aliases: ["payer"] },
      { name: "posted_at",       kind: "timestamp", required: false, aliases: ["posted", "post_date"] },
    ],
  },
  ris: {
    type: "ris",
    label: "RIS exam export",
    table: "stg.ris_exam",
    filenameHints: ["ris", "exam", "productivity"],
    rawFileType: "ris_exam",
    columns: [
      { name: "accession",         kind: "text",      required: true,  aliases: ["accession_number"] },
      { name: "dos",               kind: "date",      required: true,  aliases: ["date_of_service", "exam_date"] },
      { name: "exam_cpt",          kind: "text",      required: false, aliases: ["cpt", "cpt_code", "procedure_code"] },
      { name: "modality",          kind: "text",      required: false },
      { name: "ordering_location", kind: "text",      required: false, aliases: ["order_location"] },
      { name: "pos_code",          kind: "text",      required: false, aliases: ["place_of_service", "pos"] },
      { name: "facility_id",       kind: "text",      required: false, aliases: ["facility", "site_code", "facility_code"] },
      { name: "rendering_npi",     kind: "text",      required: false, aliases: ["npi", "reading_radiologist_npi"] },
      { name: "finalized_at",      kind: "timestamp", required: false, aliases: ["finalized", "final_date", "finalized_dt"] },
    ],
  },
  bank: {
    type: "bank",
    label: "Bank statement (deposits)",
    table: "recon.bank_deposit",
    filenameHints: ["bank", "deposit", "stmt", "statement"],
    rawFileType: "bank_stmt",
    columns: [
      { name: "deposit_date", kind: "date",    required: true,  aliases: ["date", "posted_date", "post_date"] },
      { name: "eft_trace",    kind: "text",    required: true,  aliases: ["trace", "trace_number", "check_number"] },
      { name: "amount",       kind: "numeric", required: true,  aliases: ["deposit_amount"] },
    ],
  },
  ref_mpfs: {
    type: "ref_mpfs",
    label: "MPFS work-RVU reference",
    table: "ref.mpfs_wrvu",
    filenameHints: ["mpfs", "wrvu", "rvu"],
    columns: [
      { name: "cpt_code",          kind: "text",    required: true, aliases: ["cpt"] },
      { name: "service_year",      kind: "int",     required: true, aliases: ["year"] },
      { name: "work_rvu",          kind: "numeric", required: true, aliases: ["wrvu"] },
      { name: "conversion_factor", kind: "numeric", required: false, aliases: ["cf"] },
    ],
  },
  ref_payer: {
    type: "ref_payer",
    label: "Payer reference",
    table: "ref.payer",
    filenameHints: ["payer"],
    columns: [
      { name: "payer_id",        kind: "text", required: true,  aliases: ["payer"] },
      { name: "payer_name",      kind: "text", required: false, aliases: ["name"] },
      { name: "financial_class", kind: "text", required: false, aliases: ["fin_class", "class"] },
    ],
  },
  ref_facility: {
    type: "ref_facility",
    label: "Facility reference",
    table: "ref.facility",
    filenameHints: ["facility", "facilities"],
    columns: [
      { name: "facility_id",   kind: "text", required: true,  aliases: ["facility"] },
      { name: "facility_name", kind: "text", required: false, aliases: ["name"] },
      { name: "is_er_site",    kind: "bool", required: false, aliases: ["er_site"] },
    ],
  },
  ref_provider: {
    type: "ref_provider",
    label: "Provider reference",
    table: "ref.provider",
    filenameHints: ["provider", "providers", "npi"],
    columns: [
      { name: "rendering_npi", kind: "text", required: true,  aliases: ["npi"] },
      { name: "provider_name", kind: "text", required: false, aliases: ["name"] },
      { name: "subspecialty",  kind: "text", required: false },
    ],
  },
};

export const ALL_SPECS: ExportSpec[] = Object.values(SPECS);
