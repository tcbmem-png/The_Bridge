// CSV → typed rows. Streaming parse via papaparse, validation against the
// export spec. Extra columns are dropped silently; missing required columns
// are reported as a block-on-load shape failure.

import Papa from "papaparse";
import { detectExportType } from "./detect";
import { ALL_SPECS, type ColumnSpec, type ExportSpec, SPECS } from "./schemas";
import type { ExportType, StagedFile } from "./types";

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/** Build a normalized-source-name -> canonical-column lookup for a spec. */
function buildColumnLookup(spec: ExportSpec): Map<string, ColumnSpec> {
  const map = new Map<string, ColumnSpec>();
  for (const col of spec.columns) {
    map.set(normalizeKey(col.name), col);
    for (const alias of col.aliases ?? []) map.set(normalizeKey(alias), col);
  }
  return map;
}

function coerce(
  value: unknown,
  kind: ColumnSpec["kind"],
): { ok: true; value: unknown } | { ok: false; reason: string } {
  if (value === null || value === undefined || value === "") {
    return { ok: true, value: null };
  }
  const s = String(value).trim();
  if (s === "") return { ok: true, value: null };

  switch (kind) {
    case "text":
      return { ok: true, value: s };
    case "int": {
      const n = Number(s);
      if (!Number.isFinite(n) || !Number.isInteger(n))
        return { ok: false, reason: `expected integer, got "${s}"` };
      return { ok: true, value: n };
    }
    case "numeric": {
      const cleaned = s.replace(/[$,]/g, "");
      const n = Number(cleaned);
      if (!Number.isFinite(n)) return { ok: false, reason: `expected number, got "${s}"` };
      return { ok: true, value: n };
    }
    case "date": {
      const iso = parseDate(s);
      if (!iso) return { ok: false, reason: `expected date (YYYY-MM-DD or MM/DD/YYYY), got "${s}"` };
      return { ok: true, value: iso };
    }
    case "timestamp": {
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return { ok: false, reason: `expected timestamp, got "${s}"` };
      return { ok: true, value: d.toISOString() };
    }
    case "bool": {
      const lower = s.toLowerCase();
      if (["true", "t", "1", "yes", "y"].includes(lower)) return { ok: true, value: true };
      if (["false", "f", "0", "no", "n"].includes(lower)) return { ok: true, value: false };
      return { ok: false, reason: `expected boolean, got "${s}"` };
    }
  }
}

function parseDate(s: string): string | null {
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // MM/DD/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const mm = m[1].padStart(2, "0");
    const dd = m[2].padStart(2, "0");
    return `${m[3]}-${mm}-${dd}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

export async function readCsv(file: File): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, unknown>[] = [];
    let headers: string[] = [];
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      worker: false,
      step: (result) => {
        if (!headers.length && result.meta.fields) headers = result.meta.fields;
        rows.push(result.data);
      },
      complete: () => resolve({ headers, rows }),
      error: (e) => reject(e),
    });
  });
}

export async function stageFile(file: File, forcedType?: ExportType): Promise<StagedFile> {
  const { headers, rows } = await readCsv(file);
  const spec = forcedType
    ? SPECS[forcedType]
    : detectExportType(file.name, headers)?.spec ?? null;

  if (!spec) {
    const knownLabels = ALL_SPECS.map((s) => s.label).join(", ");
    return {
      type: "billing_export",
      fileName: file.name,
      byteSize: file.size,
      rows: [],
      droppedColumns: headers,
      missingColumns: [`Could not detect export type. Expected one of: ${knownLabels}`],
      parseErrors: [],
    };
  }

  const lookup = buildColumnLookup(spec);
  const normHeaders = headers.map((h) => ({ raw: h, norm: normalizeKey(h) }));
  const used = new Set<string>();
  const headerToCol = new Map<string, ColumnSpec>();
  for (const h of normHeaders) {
    const col = lookup.get(h.norm);
    if (col && !used.has(col.name)) {
      headerToCol.set(h.raw, col);
      used.add(col.name);
    }
  }
  const droppedColumns = normHeaders
    .filter((h) => !headerToCol.has(h.raw))
    .map((h) => h.raw);
  const missingColumns = spec.columns
    .filter((c) => c.required && !used.has(c.name))
    .map((c) => c.name);

  const outRows: Record<string, unknown>[] = [];
  const parseErrors: StagedFile["parseErrors"] = [];

  if (!missingColumns.length) {
    for (let i = 0; i < rows.length; i++) {
      const src = rows[i];
      const out: Record<string, unknown> = {};
      let rowOk = true;
      for (const col of spec.columns) {
        let rawVal: unknown = null;
        for (const [hdr, c] of headerToCol) {
          if (c.name === col.name) {
            rawVal = src[hdr];
            break;
          }
        }
        const res = coerce(rawVal, col.kind);
        if (!res.ok) {
          if (parseErrors.length < 50) {
            parseErrors.push({ row: i + 2, column: col.name, value: rawVal, reason: res.reason });
          }
          if (col.required) rowOk = false;
          out[col.name] = null;
        } else {
          out[col.name] = res.value;
        }
      }
      if (rowOk) outRows.push(out);
    }
  }

  return {
    type: spec.type,
    fileName: file.name,
    byteSize: file.size,
    rows: outRows,
    droppedColumns,
    missingColumns,
    parseErrors,
  };
}
