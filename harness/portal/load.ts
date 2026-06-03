// Chunked load of staged rows into a fresh PGlite instance. The instance
// is recreated from the canonical SQL before each load — guaranteed no
// residue from prior datasets, no ad-hoc TRUNCATE sequencing.

import type { PGlite } from "@electric-sql/pglite";
import { SPECS } from "./schemas";
import type { LoadProgress, LoadResult, StagedFile } from "./types";

const CHUNK_ROWS = 1000;

/**
 * Insert a synthetic raw.source_file row for an uploaded file so the
 * lineage drill still has a file name and a hash to display.
 */
async function registerSourceFile(
  db: PGlite,
  staged: StagedFile,
): Promise<number | null> {
  const spec = SPECS[staged.type];
  if (!spec.rawFileType) return null;
  const sha = await sha256Hex(`${staged.fileName}:${staged.byteSize}:${staged.rows.length}`);
  const res = await db.query<{ file_id: number | string }>(
    `INSERT INTO raw.source_file
       (file_type, file_name, storage_uri, sha256, byte_size, received_at, ingested_by)
     VALUES ($1, $2, $3, $4, $5, now(), $6)
     RETURNING file_id;`,
    [spec.rawFileType, staged.fileName, `upload://${staged.fileName}`, sha, staged.byteSize, "portal"],
  );
  const id = res.rows[0]?.file_id;
  return id === undefined ? null : Number(id);
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Insert staged rows into the spec's target table in chunks. Emits a
 * progress callback after each chunk. The target table's column order is
 * defined by the spec — source_file_id (when applicable) is injected as
 * column 0.
 */
export async function loadStagedFile(
  db: PGlite,
  staged: StagedFile,
  onProgress?: (p: LoadProgress) => void,
): Promise<LoadResult> {
  const spec = SPECS[staged.type];
  const sourceFileId = await registerSourceFile(db, staged);
  const includeSourceFile = sourceFileId !== null && spec.table.startsWith("stg.");
  // recon.bank_deposit also has source_file_id NOT NULL.
  const reconNeedsSource = sourceFileId !== null && spec.table === "recon.bank_deposit";

  const cols = spec.columns.map((c) => c.name);
  const insertCols =
    includeSourceFile || reconNeedsSource ? ["source_file_id", ...cols] : cols;

  let total = staged.rows.length;
  let loaded = 0;

  for (let i = 0; i < staged.rows.length; i += CHUNK_ROWS) {
    const chunk = staged.rows.slice(i, i + CHUNK_ROWS);
    if (!chunk.length) break;
    const params: unknown[] = [];
    const tuples: string[] = [];
    for (const row of chunk) {
      const rowParams: unknown[] = [];
      if (includeSourceFile || reconNeedsSource) rowParams.push(sourceFileId);
      for (const c of cols) rowParams.push(row[c] ?? null);
      const tuple = rowParams.map((_, idx) => `$${params.length + idx + 1}`).join(",");
      tuples.push(`(${tuple})`);
      params.push(...rowParams);
    }
    const sql = `INSERT INTO ${spec.table} (${insertCols.join(",")}) VALUES ${tuples.join(",")}
      ${spec.table.startsWith("ref.") ? "ON CONFLICT DO NOTHING" : ""};`;
    await db.query(sql, params);
    loaded += chunk.length;
    onProgress?.({ fileName: staged.fileName, table: spec.table, rowsLoaded: loaded, rowsTotal: total });
    // Yield to the UI thread between chunks.
    await new Promise((r) => setTimeout(r, 0));
  }

  return { fileName: staged.fileName, table: spec.table, rowsLoaded: loaded };
}
