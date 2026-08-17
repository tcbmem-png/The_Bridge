// Boots the PRODUCTION schema over the frozen fixture bytes, in node.
//
// This is the pipeline under test: harness/sql/economic_record.sql, verbatim,
// the same file the browser tab executes. The loader below only stages bytes;
// every disposition, tie-out, carve and trace state comes from the views.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

export const SCHEMA_PATH = "harness/sql/economic_record.sql";
export const ORACLE_PATH = "fixtures/physician_group_v1/expected/oracle.json";

export const oracle = JSON.parse(readFileSync(ORACLE_PATH, "utf8"));

const TABLES = [
  ["encounters.csv", "stg.encounter", ["encounter_id","patient_token","physician_npi","dos","facility_id","pos_code","encounter_class","procedure_cpt","units","finalized_at"], ["units"]],
  ["claims_837.csv", "stg.claim_line", ["claim_id","line_number","encounter_id","patient_token","dos","cpt_code","modifier_1","modifier_2","pos_code","facility_id","rendering_npi","payer_id","units","charge_amount","submit_date"], ["line_number","units","charge_amount"]],
  ["remits_835.csv", "stg.remit_line", ["remittance_id","claim_id","line_number","payer_id","cpt_code","charge_amount","allowed_amount","paid_amount","patient_resp","adjustment_amount","denial_code","adjudication_status","payment_date","eft_trace"], ["line_number","charge_amount","allowed_amount","paid_amount","patient_resp","adjustment_amount"]],
  ["deposits.csv", "stg.deposit", ["deposit_date","eft_trace","amount","description"], ["amount"]],
  ["ref_mpfs.csv", "ref.mpfs_wrvu", ["cpt_code","service_year","work_rvu","conversion_factor"], ["service_year","work_rvu","conversion_factor"]],
  ["ref_physician.csv", "ref.physician", ["physician_npi","physician_name","specialty","subspecialty","class"], []],
  ["ref_payer.csv", "ref.payer", ["payer_id","payer_name","financial_class"], []],
  ["ref_facility.csv", "ref.facility", ["facility_id","facility_name","facility_type"], []],
  ["ref_service_family.csv", "ref.service_family", ["cpt_code","service_family","description"], []],
  ["ref_pos_code.csv", "ref.pos_code", ["pos_code","description","site"], []],
  ["ref_denial_code.csv", "ref.denial_code", ["denial_code","description","category"], []],
];

function parse(dir, file) {
  const text = readFileSync(join(dir, file), "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  const head = lines[0].split(",");
  return lines.slice(1).map((l) => {
    const cells = l.split(",");
    const o = {};
    head.forEach((h, i) => (o[h] = cells[i] ?? ""));
    return o;
  });
}

export async function bootFixtureDb(sourceDir = oracle.source_dir) {
  const db = new PGlite();
  await db.exec(readFileSync(SCHEMA_PATH, "utf8"));

  for (const [file, table, cols, numeric] of TABLES) {
    const rows = parse(sourceDir, file);
    const num = new Set(numeric);
    for (let i = 0; i < rows.length; i += 400) {
      const slice = rows.slice(i, i + 400);
      const values = [];
      const tuples = slice.map((row) => {
        const t = cols.map((c) => {
          const raw = (row[c] ?? "").trim();
          values.push(raw === "" ? null : num.has(c) ? Number(raw) : raw);
          return `$${values.length}`;
        });
        return `(${t.join(",")})`;
      });
      await db.query(`INSERT INTO ${table} (${cols.join(",")}) VALUES ${tuples.join(",")};`, values);
    }
  }

  await db.query(`
    UPDATE stg.deposit d SET classification = CASE
      WHEN d.eft_trace IS NULL THEN 'unclassified'
      WHEN EXISTS (SELECT 1 FROM stg.remit_line r WHERE r.eft_trace = d.eft_trace)
        THEN 'professional_collection' ELSE 'unclassified' END;`);

  return db;
}

export const one = async (db, sql) => (await db.query(sql)).rows[0];
export const all = async (db, sql) => (await db.query(sql)).rows;
