import { useCallback, useRef, useState } from "react";
import { detectSource } from "../../lib/intake/detect";
import { hashBytes, type CustodyEntry } from "../../lib/intake/custody";
import {
  SOURCES,
  STAGE_FOR_SOURCE,
  loadCsvIntoRecord,
  parseCsv,
  resetRecordDb,
  SAMPLE_BASE,
} from "../../../harness/runtime/recordDb";

/**
 * The front door. Files are hashed on arrival, matched to the source contract
 * by header signature, and loaded into the in-tab record. Nothing leaves the
 * browser; nothing is stored beyond this tab.
 */
export function IntakeDrop({
  entries,
  onEntries,
}: {
  entries: CustodyEntry[];
  onEntries: (next: CustodyEntry[]) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const booted = useRef(false);

  const ingestText = useCallback(
    async (fileName: string, bytes: Uint8Array, text: string): Promise<CustodyEntry> => {
      const sha256 = await hashBytes(bytes);
      const base: CustodyEntry = {
        fileName,
        byteSize: bytes.byteLength,
        sha256,
        receivedAt: new Date().toISOString(),
        status: "unrecognized",
        sourceKey: null,
        stage: null,
        rows: 0,
        rejectedRows: 0,
        repairs: 0,
        note: "",
      };

      let headers: string[] = [];
      try {
        headers = Object.keys(parseCsv(text)[0] ?? {});
      } catch {
        return { ...base, status: "rejected", note: "The file could not be parsed as CSV." };
      }

      const d = detectSource(headers);
      if (d.status !== "detected" || !d.spec) {
        return { ...base, status: d.status === "ambiguous" ? "ambiguous" : "unrecognized", note: d.reason };
      }


      if (!booted.current) {
        await resetRecordDb();
        booted.current = true;
      }

      try {
        const report = await loadCsvIntoRecord(d.spec, text, fileName);
        return {
          ...base,
          status: "loaded",
          sourceKey: d.spec.key,
          stage: STAGE_FOR_SOURCE[d.spec.key] ?? "reference",
          rows: report.rows,
          rejectedRows: report.rejected,
          repairs: report.repairs,
          note:
            d.extraColumns.length > 0
              ? `${d.reason} Columns the contract does not consume: ${d.extraColumns.join(", ")}.`
              : d.reason,
        };
      } catch (e) {
        return {
          ...base,
          status: "rejected",
          sourceKey: d.spec.key,
          note: `Load failed: ${e instanceof Error ? e.message : String(e)}. Nothing partial was kept.`,
        };
      }
    },
    [],
  );

  const takeFiles = useCallback(
    async (files: FileList | File[]) => {
      const next = [...entries];
      for (const f of Array.from(files)) {
        setBusy(f.name);
        const buf = new Uint8Array(await f.arrayBuffer());
        const text = new TextDecoder().decode(buf);
        next.push(await ingestText(f.name, buf, text));
        onEntries([...next]);
      }
      setBusy(null);
    },
    [entries, ingestText, onEntries],
  );

  const loadSynthetic = useCallback(async () => {
    const next = [...entries];
    for (const spec of SOURCES) {
      setBusy(spec.file);
      try {
        const res = await fetch(`${SAMPLE_BASE}/${spec.file}`);
        if (!res.ok) throw new Error(String(res.status));
        const buf = new Uint8Array(await res.arrayBuffer());
        next.push(await ingestText(spec.file, buf, new TextDecoder().decode(buf)));
      } catch {
        /* a missing optional sample file simply does not appear */
      }
      onEntries([...next]);
    }
    setBusy(null);
  }, [entries, ingestText, onEntries]);

  return (
    <section>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void takeFiles(e.dataTransfer.files);
        }}
        className={`rounded-lg border border-dashed p-6 transition-colors ${
          over ? "border-[var(--teal)] bg-[color-mix(in_oklab,var(--teal)_6%,transparent)]" : "border-ink/25"
        }`}
      >
        <p className="font-display text-lg">Give us what you already have.</p>
        <p className="mt-2 max-w-[62ch] text-sm text-ink/70">
          Drop CSV exports here — a clinical work export, a bank export, a work-unit
          reference, whatever exists today. The record reads what arrives and says
          plainly what it can and cannot establish from it. Files are hashed and
          parsed in this tab. Nothing is uploaded anywhere.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-ink/25 bg-paper px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink hover:bg-ink/5"
          >
            Choose files
          </button>
          <button
            type="button"
            onClick={() => void loadSynthetic()}
            className="rounded-md border border-ink/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink/70 hover:text-ink"
          >
            Load the synthetic package instead
          </button>
          {busy && (
            <span className="font-mono-tab text-[11px] text-ink/60">Hashing and reading {busy}…</span>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void takeFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </section>
  );
}
