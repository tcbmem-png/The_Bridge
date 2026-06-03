// PGlite runtime for the ER stipend harness.
// Real Postgres (compiled to WASM) running entirely in the browser tab.
// The uploaded SQL file is shipped verbatim. The only manipulation at load
// time is excising the documentation-only :p_month example statement
// (lines 277-289 of the file) — it is a bind-parameter illustration meant
// to be run as a prepared statement, not as part of the bulk load. The
// file on disk is untouched; the lineage drill re-issues the same query
// parameterized.

import { PGlite } from "@electric-sql/pglite";
import rawSql from "../sql/radiology_stipend_harness.sql?raw";

let dbPromise: Promise<PGlite> | null = null;

const LINEAGE_DRILL_PATTERN =
  /-- :p_month example[\s\S]*?ORDER BY f\.dos, f\.claim_id, f\.line_number;\s*/m;

function prepareBulkScript(): string {
  // Strip the docs-only :p_month example. Leave a clear marker so the
  // canonical file remains the source of truth.
  return rawSql.replace(
    LINEAGE_DRILL_PATTERN,
    "-- [lineage drill statement re-issued as prepared statement; see harness/runtime/queries.ts]\n",
  );
}

export function getDb(): Promise<PGlite> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("PGlite is browser-only."));
  }
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = new PGlite();
      await db.exec(prepareBulkScript());
      return db;
    })();
  }
  return dbPromise;
}

export function rawScript(): string {
  return rawSql;
}
