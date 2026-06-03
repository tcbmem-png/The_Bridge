// Upload portal panel — drop CSVs, validate shape, load into a fresh
// PGlite instance, surface what was dropped and what was missing.
// Session-only. No IndexedDB. No persistence across reload. By design.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Panel } from "./SegmentMonthly";
import { stageFile } from "../../../harness/portal/stage";
import { loadStagedFile } from "../../../harness/portal/load";
import { exportCurrentDataset } from "../../../harness/portal/export";
import { ALL_SPECS, SPECS } from "../../../harness/portal/schemas";
import { getDb, resetDb } from "../../../harness/runtime/db";
import {
  clearPreset,
  derivePresetFromDb,
  publishPreset,
  readPreset,
  type DerivedPreset,
} from "../../../harness/runtime/derivePreset";
import type { LoadProgress, StagedFile } from "../../../harness/portal/types";

interface PortalProps {
  /** Bumped after each successful load/reset so sibling panels re-query. */
  onDatasetChange: () => void;
  datasetName: string;
  setDatasetName: (name: string) => void;
}

type Status =
  | { kind: "idle" }
  | { kind: "staging"; files: number }
  | { kind: "blocked"; staged: StagedFile[] }
  | { kind: "loading"; progress: LoadProgress | null; totalRows: number; loadedRows: number }
  | { kind: "loaded"; rowsLoaded: number; files: number }
  | { kind: "error"; message: string };

export function UploadPortal({ onDatasetChange, datasetName, setDatasetName }: PortalProps) {
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const [preset, setPreset] = useState<DerivedPreset | null>(() =>
    typeof window !== "undefined" ? readPreset() : null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Make sure the DB is booted so the initial panels can query it.
  useEffect(() => {
    getDb().catch(() => {});
  }, []);

  // Derive Sandbox/Story preset from whatever's now in the DB, publish it,
  // and update local state for the confirmation card. Best-effort — preset
  // derivation failure should never block the upload itself.
  const refreshPreset = useCallback(async (label: string) => {
    try {
      const p = await derivePresetFromDb(label);
      publishPreset(p);
      setPreset(p);
    } catch (e) {
      console.warn("[harness] preset derive failed:", e);
    }
  }, []);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.name.toLowerCase().endsWith(".csv"));
    if (!arr.length) {
      setStatus({ kind: "error", message: "Drop one or more .csv files." });
      return;
    }
    setStatus({ kind: "staging", files: arr.length });
    try {
      const next: StagedFile[] = [];
      for (const f of arr) {
        next.push(await stageFile(f));
      }
      setStaged(next);
      const hasShapeError = next.some((s) => s.missingColumns.length > 0);
      setStatus(hasShapeError ? { kind: "blocked", staged: next } : { kind: "idle" });
      // Default the dataset name to the first file's stem if user hasn't set one.
      if (!datasetName && arr[0]) {
        const stem = arr[0].name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
        setDatasetName(stem);
      }
    } catch (e) {
      setStatus({ kind: "error", message: String((e as Error)?.message ?? e) });
    }
  }, [datasetName, setDatasetName]);

  const handleReplace = useCallback(async () => {
    if (!staged.length) return;
    const hasShapeError = staged.some((s) => s.missingColumns.length > 0);
    if (hasShapeError) {
      setStatus({ kind: "blocked", staged });
      return;
    }
    const totalRows = staged.reduce((acc, s) => acc + s.rows.length, 0);
    setStatus({ kind: "loading", progress: null, totalRows, loadedRows: 0 });
    try {
      const db = await resetDb("empty");
      let cumulative = 0;
      for (const s of staged) {
        await loadStagedFile(db, s, (p) => {
          setStatus({
            kind: "loading",
            progress: p,
            totalRows,
            loadedRows: cumulative + p.rowsLoaded,
          });
        });
        cumulative += s.rows.length;
      }
      setStatus({ kind: "loaded", rowsLoaded: cumulative, files: staged.length });
      onDatasetChange();
      await refreshPreset(datasetName || "Uploaded dataset");
    } catch (e) {
      setStatus({ kind: "error", message: String((e as Error)?.message ?? e) });
    }
  }, [staged, datasetName, onDatasetChange, refreshPreset]);

  const handleReset = useCallback(async () => {
    setStatus({ kind: "loading", progress: null, totalRows: 0, loadedRows: 0 });
    try {
      await resetDb("seeded");
      setStaged([]);
      setDatasetName("MOCK RAD GROUP — baseline");
      setStatus({ kind: "idle" });
      onDatasetChange();
      // Seed is the in-memory fabricated set — clear any preset derived from
      // a previous upload so Sandbox/Story snap back to authored defaults.
      clearPreset();
      setPreset(null);
    } catch (e) {
      setStatus({ kind: "error", message: String((e as Error)?.message ?? e) });
    }
  }, [onDatasetChange, setDatasetName]);

  const handleExport = useCallback(async () => {
    try {
      const blob = await exportCurrentDataset();
      const a = document.createElement("a");
      const safe = (datasetName || "harness-dataset").replace(/[^a-z0-9-]+/gi, "_");
      a.href = URL.createObjectURL(blob);
      a.download = `${safe}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setStatus({ kind: "error", message: String((e as Error)?.message ?? e) });
    }
  }, [datasetName]);

  // Fetch the 8 demo CSVs from /public/sample-data and run the full
  // stage → reset → load chain in one click. Same pipeline as a manual
  // drag-and-drop; nothing special-cased in the engine.
  const handleLoadDemo = useCallback(async () => {
    const demoFiles = [
      "MOCK_RAD_GROUP_837_billing_export.csv",
      "MOCK_RAD_GROUP_835_remittance_export.csv",
      "MOCK_RAD_GROUP_RIS_exam_export.csv",
      "MOCK_RAD_GROUP_bank_statement.csv",
      "MOCK_PUBLIC_MPFS_reference.csv",
      "MOCK_RAD_GROUP_ref_payer.csv",
      "MOCK_RAD_GROUP_ref_facility.csv",
      "MOCK_RAD_GROUP_ref_provider.csv",
    ];
    setStatus({ kind: "staging", files: demoFiles.length });
    try {
      const fileObjects: File[] = [];
      for (const name of demoFiles) {
        const res = await fetch(`/sample-data/${name}`);
        if (!res.ok) throw new Error(`Failed to fetch ${name}: ${res.status}`);
        const blob = await res.blob();
        fileObjects.push(new File([blob], name, { type: "text/csv" }));
      }
      const stagedAll: StagedFile[] = [];
      for (const f of fileObjects) stagedAll.push(await stageFile(f));
      const blocked = stagedAll.filter((s) => s.missingColumns.length > 0);
      if (blocked.length) {
        setStaged(stagedAll);
        setStatus({ kind: "blocked", staged: stagedAll });
        return;
      }
      setStaged(stagedAll);
      setDatasetName("MOCK RAD GROUP — demo dataset");
      const totalRows = stagedAll.reduce((a, s) => a + s.rows.length, 0);
      setStatus({ kind: "loading", progress: null, totalRows, loadedRows: 0 });
      const db = await resetDb("empty");
      let cumulative = 0;
      for (const s of stagedAll) {
        await loadStagedFile(db, s, (p) => {
          setStatus({
            kind: "loading",
            progress: p,
            totalRows,
            loadedRows: cumulative + p.rowsLoaded,
          });
        });
        cumulative += s.rows.length;
      }
      setStatus({ kind: "loaded", rowsLoaded: cumulative, files: stagedAll.length });
      onDatasetChange();
      await refreshPreset("MOCK_RAD_GROUP demo");
    } catch (e) {
      setStatus({ kind: "error", message: String((e as Error)?.message ?? e) });
    }
  }, [onDatasetChange, setDatasetName, refreshPreset]);

  const handleDownloadDemoZip = useCallback(() => {
    const a = document.createElement("a");
    a.href = "/sample-data/MOCK_RAD_GROUP_dataset.zip";
    a.download = "MOCK_RAD_GROUP_dataset.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  return (
    <Panel
      title="Upload portal"
      query="drop CSV exports → schema-validate → recreate PGlite → load"
      pill={pillFor(status)}
    >
      <p className="mb-3 text-sm text-ink/80">
        Drop the source-system exports your billing platform actually emits — the
        portal selects the columns it needs and drops the rest. Session-only.
        Reload clears every upload. Real data belongs in a fork, on hardware you
        control, after the BAA conversation.
      </p>

      <div className="mb-4 rounded-md border border-teal/40 bg-teal/[0.04] p-3">
        <p className="font-display text-sm text-ink">
          Just want to see it work? Load the demo dataset.
        </p>
        <p className="mt-1 font-mono text-[11px] text-ink/65">
          MOCK_RAD_GROUP · 22k rows across 8 files · ~3s to ingest · fully
          fabricated, no PHI · panels below will populate
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleLoadDemo}
            disabled={status.kind === "loading" || status.kind === "staging"}
            className="rounded-md border border-teal/50 bg-teal/15 px-3 py-1.5 font-mono text-[12px] text-teal hover:bg-teal/25 disabled:opacity-40"
          >
            Load MOCK_RAD_GROUP demo
          </button>
          <button
            type="button"
            onClick={handleDownloadDemoZip}
            className="rounded-md border border-ink/25 bg-paper px-3 py-1.5 font-mono text-[12px] text-ink hover:bg-ink/5"
          >
            Download dataset (.zip · 670 KB)
          </button>
          <a
            href="/sample-data/README_MOCK_RAD_GROUP.md"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-ink/25 bg-paper px-3 py-1.5 font-mono text-[12px] text-ink hover:bg-ink/5"
          >
            README
          </a>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink/55">
          Active set
        </span>
        <input
          value={datasetName}
          onChange={(e) => setDatasetName(e.target.value)}
          className="min-w-[260px] flex-1 rounded-md border border-ink/20 bg-paper px-2 py-1 font-mono text-[12px] text-ink"
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-md border border-dashed p-6 text-center transition-colors ${
          dragOver ? "border-teal bg-teal/5" : "border-ink/25 bg-ink/[0.02]"
        }`}
      >
        <p className="font-display text-base text-ink">Drop CSV files here.</p>
        <p className="mt-1 font-mono text-[11px] text-ink/55">
          Accepted: {ALL_SPECS.map((s) => s.label).join(" · ")}
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 rounded-md border border-ink/25 bg-paper px-3 py-1 font-mono text-[11px] text-ink hover:bg-ink/5"
        >
          Or browse…
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {staged.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full font-mono text-[12px]">
            <thead className="text-ink/60">
              <tr className="border-b border-ink/10">
                <th className="py-1.5 text-left font-medium">File</th>
                <th className="py-1.5 text-left font-medium">Detected type</th>
                <th className="py-1.5 text-left font-medium">Target table</th>
                <th className="py-1.5 text-right font-medium">Rows</th>
                <th className="py-1.5 text-left font-medium">Shape</th>
              </tr>
            </thead>
            <tbody>
              {staged.map((s) => {
                const spec = SPECS[s.type];
                const ok = s.missingColumns.length === 0;
                return (
                  <tr key={s.fileName} className="border-b border-ink/5 align-top">
                    <td className="py-1.5">{s.fileName}</td>
                    <td className="py-1.5">{spec.label}</td>
                    <td className="py-1.5">{spec.table}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {s.rows.length.toLocaleString()}
                    </td>
                    <td className="py-1.5">
                      {ok ? (
                        <span className="text-teal">✓ ready</span>
                      ) : (
                        <span className="text-red-clinical">
                          missing: {s.missingColumns.join(", ")}
                        </span>
                      )}
                      {ok && s.droppedColumns.length > 0 && (
                        <div className="text-ink/45">
                          dropped: {s.droppedColumns.join(", ")}
                        </div>
                      )}
                      {s.parseErrors.length > 0 && (
                        <div className="text-gold">
                          {s.parseErrors.length} row(s) skipped on type-parse
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {status.kind === "loading" && (
        <div className="mt-4">
          <div className="h-1 w-full overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full bg-teal transition-[width] duration-150"
              style={{
                width: `${
                  status.totalRows > 0
                    ? Math.min(100, (status.loadedRows / status.totalRows) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="mt-2 font-mono text-[11px] text-ink/60">
            {status.progress
              ? `Loading ${status.progress.fileName} → ${status.progress.table} · ${status.loadedRows.toLocaleString()} / ${status.totalRows.toLocaleString()} rows`
              : "Recreating PGlite instance…"}
          </p>
        </div>
      )}

      {status.kind === "blocked" && (
        <div className="mt-4 rounded-md border border-red-clinical/40 bg-red-clinical/[0.04] p-3 text-sm text-ink">
          <p className="font-display text-base">Shape failure — load blocked.</p>
          <p className="mt-1 text-ink/75">
            One or more files are missing required columns. Fix the export and
            drop again. The full column contract lives in{" "}
            <span className="font-mono text-[11px]">
              docs/upload-portal-contract.md
            </span>
            .
          </p>
        </div>
      )}

      {status.kind === "loaded" && (
        <p className="mt-4 font-mono text-[12px] text-teal">
          Loaded {status.rowsLoaded.toLocaleString()} rows across {status.files} file(s). Panels below re-queried.
        </p>
      )}

      {preset && (
        <div className="mt-4 rounded-md border border-gold/40 bg-gold/[0.06] p-3">
          <p className="font-display text-sm text-ink">
            Pushed to Sandbox + Story.
          </p>
          <p className="mt-1 font-mono text-[11px] text-ink/70">
            From <span className="text-ink">{preset.source.label}</span>:{" "}
            coverage_volume ={" "}
            <span className="text-ink">
              {preset.coverage_volume.toLocaleString()}
            </span>{" "}
            · avg wRVU/read ={" "}
            <span className="text-ink">{preset.avg_wRVU_per_read.toFixed(2)}</span>{" "}
            · mix M/Mc/C/SP ={" "}
            <span className="text-ink">
              {preset.payer_mix.medicare}/{preset.payer_mix.medicaid}/
              {preset.payer_mix.commercial}/{preset.payer_mix.self_pay}
            </span>
          </p>
          <p className="mt-1 font-mono text-[10px] text-ink/45">
            CFs, payer multiples, fall pattern, technical cost, denial write-off,
            and lost-study rate stay at authored defaults — the dataset
            doesn't speak to those.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              to="/sandbox"
              className="rounded-md border border-teal/40 bg-teal/10 px-2.5 py-1 font-mono text-[11px] text-teal hover:bg-teal/15"
            >
              Open Sandbox →
            </Link>
            <Link
              to="/story"
              className="rounded-md border border-ink/25 bg-paper px-2.5 py-1 font-mono text-[11px] text-ink hover:bg-ink/5"
            >
              Open Story →
            </Link>
            <button
              type="button"
              onClick={() => {
                clearPreset();
                setPreset(null);
              }}
              className="rounded-md border border-ink/25 bg-paper px-2.5 py-1 font-mono text-[11px] text-ink hover:bg-ink/5"
            >
              Clear preset
            </button>
          </div>
        </div>
      )}

      {status.kind === "error" && (
        <p className="mt-4 font-mono text-[12px] text-red-clinical">{status.message}</p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleReplace}
          disabled={
            staged.length === 0 ||
            staged.some((s) => s.missingColumns.length > 0) ||
            status.kind === "loading"
          }
          className="rounded-md border border-teal/40 bg-teal/10 px-3 py-1.5 font-mono text-[12px] text-teal hover:bg-teal/15 disabled:opacity-40 disabled:hover:bg-teal/10"
        >
          Replace with upload
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={status.kind === "loading"}
          className="rounded-md border border-ink/25 bg-paper px-3 py-1.5 font-mono text-[12px] text-ink hover:bg-ink/5 disabled:opacity-40"
        >
          Reset to seed
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={status.kind === "loading"}
          className="rounded-md border border-gold/40 bg-gold/10 px-3 py-1.5 font-mono text-[12px] text-ink hover:bg-gold/15 disabled:opacity-40"
        >
          Download current set
        </button>
      </div>
    </Panel>
  );
}

function pillFor(status: Status): { state: "pass" | "fail" | "pending"; label: string } | undefined {
  switch (status.kind) {
    case "idle":
      return undefined;
    case "staging":
      return { state: "pending", label: `Staging ${status.files} file(s)…` };
    case "loading":
      return { state: "pending", label: "Loading…" };
    case "blocked":
      return { state: "fail", label: "Shape failure" };
    case "loaded":
      return { state: "pass", label: `Loaded ${status.rowsLoaded.toLocaleString()} rows` };
    case "error":
      return { state: "fail", label: "Error" };
  }
}
