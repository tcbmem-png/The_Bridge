// PGlite runtime for the economic record.
//
// Real Postgres compiled to WebAssembly, running entirely in the browser tab.
// Session-only: nothing is persisted, nothing leaves the machine, and a reload
// starts from an empty database.
//
// The canonical schema file (harness/sql/economic_record.sql) is executed
// verbatim. Sample data is loaded on top of it from CSV, the same way a
// group's own exports would be.

import "./process-shim";
import { PGlite } from "@electric-sql/pglite";
import Papa from "papaparse";
import schemaSql from "../sql/economic_record.sql?raw";

export type LoadPhase = "idle" | "booting" | "loading" | "ready" | "error";

export interface LoadProgress {
  phase: LoadPhase;
  message: string;
  /** 0..1 */
  fraction: number;
}

export interface SourceSpec {
  /** Logical source key used by the status strip. */
  key: string;
  label: string;
  file: string;
  table: string;
  columns: string[];
  required: boolean;
  /** Columns that must be non-empty; rows failing this are reported, not dropped silently. */
  notNull?: string[];
  numeric?: string[];
}

export const SAMPLE_BASE = "/sample-data/mock-heart-group";

export const SOURCES: SourceSpec[] = [
  {
    key: "encounter",
    label: "EHR / encounters",
    file: "encounters.csv",
    table: "stg.encounter",
    columns: [
      "encounter_id",
      "patient_token",
      "physician_npi",
      "dos",
      "facility_id",
      "pos_code",
      "encounter_class",
      "procedure_cpt",
      "units",
      "finalized_at",
    ],
    required: true,
    notNull: ["encounter_id", "dos"],
    numeric: ["units"],
  },
  {
    key: "claims",
    label: "837 / claims",
    file: "claims_837.csv",
    table: "stg.claim_line",
    columns: [
      "claim_id",
      "line_number",
      "encounter_id",
      "patient_token",
      "dos",
      "cpt_code",
      "modifier_1",
      "modifier_2",
      "pos_code",
      "facility_id",
      "rendering_npi",
      "payer_id",
      "units",
      "charge_amount",
      "submit_date",
    ],
    required: true,
    notNull: ["claim_id", "line_number", "dos", "cpt_code", "charge_amount"],
    numeric: ["line_number", "units", "charge_amount"],
  },
  {
    key: "remit",
    label: "835 / remittance",
    file: "remits_835.csv",
    table: "stg.remit_line",
    columns: [
      "remittance_id",
      "claim_id",
      "line_number",
      "payer_id",
      "cpt_code",
      "charge_amount",
      "allowed_amount",
      "paid_amount",
      "patient_resp",
      "adjustment_amount",
      "denial_code",
      "adjudication_status",
      "payment_date",
      "eft_trace",
    ],
    required: true,
    notNull: ["claim_id", "line_number"],
    numeric: [
      "line_number",
      "charge_amount",
      "allowed_amount",
      "paid_amount",
      "patient_resp",
      "adjustment_amount",
    ],
  },
  {
    key: "mpfs",
    label: "CMS MPFS reference",
    file: "ref_mpfs.csv",
    table: "ref.mpfs_wrvu",
    columns: ["cpt_code", "service_year", "work_rvu", "conversion_factor"],
    required: true,
    notNull: ["cpt_code", "service_year", "work_rvu"],
    numeric: ["service_year", "work_rvu", "conversion_factor"],
  },
  {
    key: "bank",
    label: "Bank / deposits",
    file: "deposits.csv",
    table: "stg.deposit",
    columns: ["deposit_date", "eft_trace", "amount", "description"],
    required: false,
    notNull: ["deposit_date", "amount"],
    numeric: ["amount"],
  },
  {
    key: "physician",
    label: "Physician roster",
    file: "ref_physician.csv",
    table: "ref.physician",
    columns: ["physician_npi", "physician_name", "specialty", "subspecialty", "class"],
    required: false,
    notNull: ["physician_npi"],
  },
  {
    key: "payer",
    label: "Payer reference",
    file: "ref_payer.csv",
    table: "ref.payer",
    columns: ["payer_id", "payer_name", "financial_class"],
    required: false,
    notNull: ["payer_id"],
  },
  {
    key: "facility",
    label: "Facility reference",
    file: "ref_facility.csv",
    table: "ref.facility",
    columns: ["facility_id", "facility_name", "facility_type"],
    required: false,
    notNull: ["facility_id"],
  },
  {
    key: "service_family",
    label: "Service family map",
    file: "ref_service_family.csv",
    table: "ref.service_family",
    columns: ["cpt_code", "service_family", "description"],
    required: false,
    notNull: ["cpt_code", "service_family"],
  },
  {
    key: "pos",
    label: "Place-of-service reference",
    file: "ref_pos_code.csv",
    table: "ref.pos_code",
    columns: ["pos_code", "description", "site"],
    required: false,
    notNull: ["pos_code"],
  },
  {
    key: "denial",
    label: "Denial-code reference",
    file: "ref_denial_code.csv",
    table: "ref.denial_code",
    columns: ["denial_code", "description", "category"],
    required: false,
    notNull: ["denial_code"],
  },
];

let dbPromise: Promise<PGlite> | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      /* ignore subscriber errors */
    }
  });
}

export function subscribeRecord(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function isLoaded() {
  return loaded;
}

async function boot(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(schemaSql);
  return db;
}

export function getRecordDb(): Promise<PGlite> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("PGlite is browser-only."));
  }
  if (!dbPromise) dbPromise = boot();
  return dbPromise;
}

export async function resetRecordDb(): Promise<PGlite> {
  if (dbPromise) {
    try {
      (await dbPromise).close();
    } catch {
      /* fall through */
    }
  }
  loaded = false;
  dbPromise = boot();
  const db = await dbPromise;
  notify();
  return db;
}

function coerce(value: string | undefined, numeric: boolean): string | number | null {
  if (value === undefined) return null;
  const v = value.trim();
  if (v === "") return null;
  if (numeric) {
    const n = Number(v.replace(/[$,]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return v;
}

export interface LoadReport {
  key: string;
  file: string;
  rows: number;
  rejected: number;
  present: boolean;
}

async function insertRows(
  db: PGlite,
  spec: SourceSpec,
  fileId: number | null,
  rows: Record<string, string>[],
): Promise<{ inserted: number; rejected: number }> {
  const numeric = new Set(spec.numeric ?? []);
  const notNull = spec.notNull ?? [];
  const cols = fileId === null ? spec.columns : ["source_file_id", ...spec.columns];
  const CHUNK = 400;
  let inserted = 0;
  let rejected = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const values: unknown[] = [];
    const tuples: string[] = [];
    for (const row of slice) {
      if (notNull.some((c) => !row[c] || row[c].trim() === "")) {
        rejected++;
        continue;
      }
      const tuple: string[] = [];
      if (fileId !== null) {
        values.push(fileId);
        tuple.push(`$${values.length}`);
      }
      for (const c of spec.columns) {
        values.push(coerce(row[c], numeric.has(c)));
        tuple.push(`$${values.length}`);
      }
      tuples.push(`(${tuple.join(",")})`);
    }
    if (!tuples.length) continue;
    await db.query(
      `INSERT INTO ${spec.table} (${cols.join(",")}) VALUES ${tuples.join(",")} ON CONFLICT DO NOTHING;`,
      values,
    );
    inserted += tuples.length;
  }
  return { inserted, rejected };
}

const HAS_SOURCE_FILE = new Set(["stg.encounter", "stg.claim_line", "stg.remit_line", "stg.deposit"]);

function fileTypeFor(key: string): string {
  if (key === "encounter") return "encounter";
  if (key === "claims") return "837";
  if (key === "remit") return "835";
  if (key === "bank") return "bank";
  return "reference";
}

/** Parse a CSV string into plain string rows. */
export function parseCsv(text: string): Record<string, string>[] {
  const out = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return out.data.filter(Boolean);
}

export async function loadCsvIntoRecord(
  spec: SourceSpec,
  text: string,
  fileName: string,
): Promise<LoadReport> {
  const db = await getRecordDb();
  const rows = parseCsv(text);
  let fileId: number | null = null;
  if (HAS_SOURCE_FILE.has(spec.table)) {
    const res = await db.query<{ file_id: number }>(
      `INSERT INTO raw.source_file (file_type, file_name, byte_size, row_count)
       VALUES ($1,$2,$3,$4) RETURNING file_id;`,
      [fileTypeFor(spec.key), fileName, text.length, rows.length],
    );
    fileId = res.rows[0].file_id;
  }
  const { inserted, rejected } = await insertRows(db, spec, fileId, rows);
  return { key: spec.key, file: fileName, rows: inserted, rejected, present: true };
}

/**
 * Load the bundled synthetic sample package. Fetches each CSV from /public,
 * parses it, and inserts it in chunks so the UI can show real progress.
 */
export async function loadSamplePackage(
  onProgress?: (p: LoadProgress) => void,
): Promise<LoadReport[]> {
  const report = (phase: LoadPhase, message: string, fraction: number) =>
    onProgress?.({ phase, message, fraction });

  report("booting", "Starting Postgres in this tab", 0.02);
  await resetRecordDb();

  const reports: LoadReport[] = [];
  for (let i = 0; i < SOURCES.length; i++) {
    const spec = SOURCES[i];
    report("loading", `Loading ${spec.label}`, 0.05 + (i / SOURCES.length) * 0.9);
    try {
      const res = await fetch(`${SAMPLE_BASE}/${spec.file}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const text = await res.text();
      reports.push(await loadCsvIntoRecord(spec, text, spec.file));
    } catch {
      reports.push({ key: spec.key, file: spec.file, rows: 0, rejected: 0, present: false });
    }
  }

  loaded = true;
  report("ready", "Record loaded", 1);
  notify();
  return reports;
}

export async function q<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const db = await getRecordDb();
  const res = await db.query<T>(sql, params);
  return res.rows;
}
