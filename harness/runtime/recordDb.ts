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

// ---------------------------------------------------------------------------
// Coercion with recorded repairs.
//
// A deterministic normalization is allowed. It is never silent: every repair
// is written to raw.repair with the original text, the normalized text, and
// the rule that did it. A row that cannot be staged is parked in
// raw.rejected_row — never dropped.
// ---------------------------------------------------------------------------

interface Coerced {
  value: string | number | null;
  rule?: string;
  original?: string;
}

function coerceField(raw: string | undefined, numeric: boolean): Coerced {
  if (raw === undefined) return { value: null };
  const trimmed = raw.trim();
  if (trimmed === "") return { value: null };

  if (numeric) {
    const stripped = trimmed.replace(/[$,\s]/g, "");
    const parenNegative = /^\(.*\)$/.test(stripped);
    const cleaned = parenNegative ? `-${stripped.slice(1, -1)}` : stripped;
    const n = Number(cleaned);
    if (!Number.isFinite(n)) {
      return { value: null, rule: "numeric_unparseable", original: raw };
    }
    if (cleaned !== trimmed) {
      return {
        value: n,
        rule: parenNegative ? "paren_negative_to_signed" : "strip_currency_formatting",
        original: raw,
      };
    }
    return { value: n };
  }

  if (trimmed !== raw) return { value: trimmed, rule: "trim_whitespace", original: raw };
  return { value: trimmed };
}

/** SHA-256 over the raw bytes as received, before any parsing. */
async function sha256Hex(text: string): Promise<string | null> {
  try {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

export interface LoadReport {
  key: string;
  file: string;
  rows: number;
  rejected: number;
  repairs: number;
  sha256: string | null;
  present: boolean;
}

interface RepairRecord {
  rowIndex: number;
  rowKey: string | null;
  field: string;
  rule: string;
  original: string | null;
  normalized: string | null;
}

interface RejectRecord {
  rowIndex: number;
  reason: string;
  payload: string;
}

function rowKeyFor(table: string, row: Record<string, string>): string | null {
  if (table === "stg.claim_line" || table === "stg.remit_line") {
    return `${(row["claim_id"] ?? "").trim()}:${(row["line_number"] ?? "").trim()}`;
  }
  if (table === "stg.encounter") return (row["encounter_id"] ?? "").trim() || null;
  return null;
}

async function insertRows(
  db: PGlite,
  spec: SourceSpec,
  fileId: number | null,
  rows: Record<string, string>[],
): Promise<{ inserted: number; rejected: number; repairs: number }> {
  const numeric = new Set(spec.numeric ?? []);
  const notNull = spec.notNull ?? [];
  const cols = fileId === null ? spec.columns : ["source_file_id", ...spec.columns];
  const CHUNK = 400;
  let inserted = 0;
  const repairs: RepairRecord[] = [];
  const rejects: RejectRecord[] = [];

  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const values: unknown[] = [];
    const tuples: string[] = [];
    for (let j = 0; j < slice.length; j++) {
      const row = slice[j];
      const rowIndex = i + j + 1;
      const missing = notNull.filter((c) => !row[c] || row[c].trim() === "");
      if (missing.length) {
        rejects.push({
          rowIndex,
          reason: `required field absent: ${missing.join(", ")}`,
          payload: JSON.stringify(row).slice(0, 800),
        });
        continue;
      }
      const rowKey = rowKeyFor(spec.table, row);
      const tuple: string[] = [];
      if (fileId !== null) {
        values.push(fileId);
        tuple.push(`$${values.length}`);
      }
      for (const c of spec.columns) {
        const { value, rule, original } = coerceField(row[c], numeric.has(c));
        if (rule) {
          repairs.push({
            rowIndex,
            rowKey,
            field: c,
            rule,
            original: original ?? null,
            normalized: value === null ? null : String(value),
          });
        }
        values.push(value);
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

  await writeRepairs(db, spec, fileId, repairs);
  await writeRejects(db, spec, fileId, rejects);
  return { inserted, rejected: rejects.length, repairs: repairs.length };
}

async function writeRepairs(
  db: PGlite,
  spec: SourceSpec,
  fileId: number | null,
  repairs: RepairRecord[],
) {
  const CHUNK = 300;
  for (let i = 0; i < repairs.length; i += CHUNK) {
    const slice = repairs.slice(i, i + CHUNK);
    const values: unknown[] = [];
    const tuples = slice.map((r) => {
      values.push(fileId, spec.key, r.rowIndex, spec.table, r.rowKey, r.field, r.rule, r.original, r.normalized);
      const n = values.length;
      return `($${n - 8},$${n - 7},$${n - 6},$${n - 5},$${n - 4},$${n - 3},$${n - 2},$${n - 1},$${n})`;
    });
    await db.query(
      `INSERT INTO raw.repair
         (source_file_id, source_key, row_index, target_table, row_key, field, rule, original, normalized)
       VALUES ${tuples.join(",")};`,
      values,
    );
  }
}

async function writeRejects(
  db: PGlite,
  spec: SourceSpec,
  fileId: number | null,
  rejects: RejectRecord[],
) {
  const CHUNK = 200;
  for (let i = 0; i < rejects.length; i += CHUNK) {
    const slice = rejects.slice(i, i + CHUNK);
    const values: unknown[] = [];
    const tuples = slice.map((r) => {
      values.push(fileId, spec.key, r.rowIndex, r.reason, r.payload);
      const n = values.length;
      return `($${n - 4},$${n - 3},$${n - 2},$${n - 1},$${n})`;
    });
    await db.query(
      `INSERT INTO raw.rejected_row (source_file_id, source_key, row_index, reason, payload)
       VALUES ${tuples.join(",")};`,
      values,
    );
  }
}

const HAS_SOURCE_FILE = new Set(["stg.encounter", "stg.claim_line", "stg.remit_line", "stg.deposit"]);

function fileTypeFor(key: string): string {
  if (key === "encounter") return "encounter";
  if (key === "claims") return "837";
  if (key === "remit") return "835";
  if (key === "bank") return "bank";
  return "reference";
}

/** Which rung of the intake ladder a source arrives on. */
export const STAGE_FOR_SOURCE: Record<string, string> = {
  encounter: "own_books",
  claims: "own_books",
  remit: "the_wire",
  bank: "the_wire",
  rcm_ledger: "their_ledger",
  processed_report: "their_story",
};

function stageFor(key: string): string {
  return STAGE_FOR_SOURCE[key] ?? "reference";
}

export const PARSER_VERSION = "record-loader/2";
export const CONTRACT_VERSION = "economic-record/1";

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
  const sha256 = await sha256Hex(text);
  const res = await db.query<{ file_id: number }>(
    `INSERT INTO raw.source_file
       (file_type, file_name, byte_size, row_count, sha256, stage, source_key,
        detection_status, parser_version, contract_version)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING file_id;`,
    [
      fileTypeFor(spec.key),
      fileName,
      text.length,
      rows.length,
      sha256,
      stageFor(spec.key),
      spec.key,
      "detected",
      PARSER_VERSION,
      CONTRACT_VERSION,
    ],
  );
  const custodyId = res.rows[0].file_id;
  const fileId = HAS_SOURCE_FILE.has(spec.table) ? custodyId : null;
  const { inserted, rejected, repairs } = await insertRows(db, spec, fileId, rows);
  return {
    key: spec.key,
    file: fileName,
    rows: inserted,
    rejected,
    repairs,
    sha256,
    present: true,
  };
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
