// PGlite runtime for the ER stipend harness.
// Real Postgres (compiled to WASM) running entirely in the browser tab.
//
// Two boot modes:
//   - `seeded`  (default) — runs the canonical SQL byte-for-byte, including
//     the synthetic MOCK RAD GROUP seed at the bottom. This is the
//     bootstrap on every page load.
//   - `empty`   — runs schema + reference dimensions + views, but skips the
//     synthetic seed. Used by the upload portal before loading a user file.
//
// The only manipulation at load time is:
//   1. excising the documentation-only :p_month example statement (it is
//      a bind-parameter illustration meant to be run as a prepared
//      statement, not as part of the bulk load),
//   2. optionally excising the synthetic seed for `empty` mode.
//
// The file on disk is never edited. The lineage drill re-issues the
// :p_month query parameterized.

import { PGlite } from "@electric-sql/pglite";
import rawSql from "../sql/radiology_stipend_harness.sql?raw";

export type BootMode = "seeded" | "empty";

let dbPromise: Promise<PGlite> | null = null;
let currentMode: BootMode = "seeded";
const listeners = new Set<() => void>();

const LINEAGE_DRILL_PATTERN =
  /-- :p_month example[\s\S]*?ORDER BY f\.dos, f\.claim_id, f\.line_number;\s*/m;

const SEED_PATTERN = /-- \(3\) SYNTHETIC SEED[\s\S]*$/m;

function prepareScript(mode: BootMode): string {
  let sql = rawSql.replace(
    LINEAGE_DRILL_PATTERN,
    "-- [lineage drill statement re-issued as prepared statement; see harness/runtime/queries.ts]\n",
  );
  if (mode === "empty") {
    sql = sql.replace(SEED_PATTERN, "-- [synthetic seed skipped — portal will load uploaded data]\n");
  }
  return sql;
}

async function boot(mode: BootMode): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(prepareScript(mode));
  return db;
}

export function getDb(): Promise<PGlite> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("PGlite is browser-only."));
  }
  if (!dbPromise) {
    dbPromise = boot(currentMode);
  }
  return dbPromise;
}

/**
 * Tear down the current PGlite instance and create a fresh one. Notifies
 * subscribers so panels re-query against the new database.
 */
export async function resetDb(mode: BootMode = "seeded"): Promise<PGlite> {
  if (typeof window === "undefined") {
    throw new Error("PGlite is browser-only.");
  }
  // Best-effort close the old instance.
  if (dbPromise) {
    try {
      const old = await dbPromise;
      await old.close();
    } catch {
      /* fall through */
    }
  }
  currentMode = mode;
  dbPromise = boot(mode);
  const db = await dbPromise;
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      /* ignore subscriber errors */
    }
  });
  return db;
}

export function subscribeDb(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getCurrentMode(): BootMode {
  return currentMode;
}

export function rawScript(): string {
  return rawSql;
}
