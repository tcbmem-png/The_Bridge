// Round-trip export: dump the currently loaded raw + stg + ref + recon
// tables back to CSV files and zip them. Makes the realism loop work —
// download the mock, edit, re-upload — and gives compliance a synthetic
// set to review before any BAA conversation.

import JSZip from "jszip";
import { getDb } from "../runtime/db";

const EXPORT_TABLES: { table: string; out: string; columns: string[] }[] = [
  {
    table: "stg.claim_837",
    out: "billing_export.csv",
    columns: [
      "claim_id", "line_number", "accession", "patient_token", "dos",
      "pos_code", "facility_id", "rendering_npi", "cpt_code", "modifiers",
      "units", "charge_amount", "payer_id",
    ],
  },
  {
    table: "stg.remit_835",
    out: "era.csv",
    columns: [
      "claim_id", "line_number", "cpt_code", "charge_amount", "allowed_amount",
      "paid_amount", "patient_resp", "adj_group_code", "carc_codes", "rarc_codes",
      "check_eft_trace", "payment_date", "payer_id", "posted_at",
    ],
  },
  {
    table: "stg.ris_exam",
    out: "ris.csv",
    columns: [
      "accession", "dos", "exam_cpt", "modality", "ordering_location",
      "pos_code", "facility_id", "rendering_npi", "finalized_at",
    ],
  },
  {
    table: "recon.bank_deposit",
    out: "bank.csv",
    columns: ["deposit_date", "eft_trace", "amount"],
  },
  {
    table: "ref.mpfs_wrvu",
    out: "ref_mpfs.csv",
    columns: ["cpt_code", "service_year", "work_rvu", "conversion_factor"],
  },
  {
    table: "ref.payer",
    out: "ref_payer.csv",
    columns: ["payer_id", "payer_name", "financial_class"],
  },
  {
    table: "ref.facility",
    out: "ref_facility.csv",
    columns: ["facility_id", "facility_name", "is_er_site"],
  },
  {
    table: "ref.provider",
    out: "ref_provider.csv",
    columns: ["rendering_npi", "provider_name", "subspecialty"],
  },
];

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const out: string[] = [columns.join(",")];
  for (const row of rows) {
    out.push(columns.map((c) => csvCell(row[c])).join(","));
  }
  return out.join("\n") + "\n";
}

export async function exportCurrentDataset(): Promise<Blob> {
  const db = await getDb();
  const zip = new JSZip();
  for (const t of EXPORT_TABLES) {
    const res = await db.query<Record<string, unknown>>(
      `SELECT ${t.columns.join(", ")} FROM ${t.table};`,
    );
    zip.file(t.out, toCsv(res.rows, t.columns));
  }
  zip.file(
    "README.txt",
    [
      "Harness dataset export.",
      "Synthetic. No PHI.",
      "",
      "Re-upload these CSVs to the portal to reproduce the same numbers.",
      "Schema contract: docs/upload-portal-contract.md",
      "",
      `Exported ${new Date().toISOString()}`,
    ].join("\n"),
  );
  return zip.generateAsync({ type: "blob" });
}
