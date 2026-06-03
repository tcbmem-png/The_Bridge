import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { erTotals, erAllLines } from "../../harness/runtime/queries";
import { getDb, resetDb } from "../../harness/runtime/db";
import { stageFile } from "../../harness/portal/stage";
import { loadStagedFile } from "../../harness/portal/load";
import type { StagedFile } from "../../harness/portal/types";

export const Route = createFileRoute("/extractor")({
  head: () => ({
    meta: [
      { title: "Extractor — The Bridge" },
      {
        name: "description",
        content:
          "Two numbers your valuator or auditor needs — ER wRVU and ER collections — drillable down to the exact source file and row.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ExtractorPage,
  ssr: false,
});

const REPO_URL = "https://github.com/tcbmem-png/The_Bridge";

const DEMO_FILES = [
  "MOCK_RAD_GROUP_837_billing_export.csv",
  "MOCK_RAD_GROUP_835_remittance_export.csv",
  "MOCK_RAD_GROUP_RIS_exam_export.csv",
  "MOCK_RAD_GROUP_bank_statement.csv",
  "MOCK_PUBLIC_MPFS_reference.csv",
  "MOCK_RAD_GROUP_ref_payer.csv",
  "MOCK_RAD_GROUP_ref_facility.csv",
  "MOCK_RAD_GROUP_ref_provider.csv",
];

type Line = {
  claim_id: string;
  line_number: number | string;
  dos: string;
  cpt_code: string;
  accession: string | null;
  units: number | string;
  work_rvu: number | string | null;
  charge_amount: number | string;
  paid_amount: number | string;
  payer_id: string | null;
  financial_class: string | null;
  check_eft_trace: string | null;
  src_837_file: string | null;
  src_837_hash: string | null;
  src_835_file: string | null;
  src_835_hash: string | null;
  exam_cpt: string | null;
  modality: string | null;
  ordering_location: string | null;
  finalized_at: string | null;
  ris_pos: string | null;
  ris_npi: string | null;
  src_ris_file: string | null;
  src_ris_hash: string | null;
  mpfs_work_rvu: number | string | null;
  mpfs_cf: number | string | null;
  mpfs_year: number | string | null;
};

function fmt(n: number | string | null | undefined, digits = 2) {
  if (n === null || n === undefined) return "—";
  const v = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function toIso(v: unknown) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string") return v.slice(0, 10);
  return String(v ?? "—");
}

type LoadState =
  | { kind: "idle" }
  | { kind: "loading"; msg: string }
  | { kind: "loaded" }
  | { kind: "error"; message: string };

type Variant = "wrvu" | "collections";
type DrillLevel = 0 | 1 | 2 | 3;

function ExtractorPage() {
  const [load, setLoad] = useState<LoadState>({ kind: "idle" });
  const [totals, setTotals] = useState<{ wrvu: number; collections: number; lines: number } | null>(null);
  const [lines, setLines] = useState<Line[] | null>(null);
  const [variant, setVariant] = useState<Variant | null>(null);
  const [level, setLevel] = useState<DrillLevel>(0);
  const [selected, setSelected] = useState<Line | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const [t, ls] = await Promise.all([erTotals(), erAllLines()]);
    const row = t[0];
    setTotals({
      wrvu: Number(row?.wrvu ?? 0),
      collections: Number(row?.collections ?? 0),
      lines: Number(row?.line_count ?? 0),
    });
    setLines(ls as unknown as Line[]);
  }, []);

  const ingest = useCallback(
    async (files: File[]) => {
      const csvs = files.filter((f) => f.name.toLowerCase().endsWith(".csv"));
      if (!csvs.length) {
        setLoad({ kind: "error", message: "Drop one or more .csv files." });
        return;
      }
      setLoad({ kind: "loading", msg: "Reading files…" });
      try {
        const stagedAll: StagedFile[] = [];
        for (const f of csvs) stagedAll.push(await stageFile(f));
        const blocked = stagedAll.filter((s) => s.missingColumns.length > 0);
        if (blocked.length) {
          setLoad({
            kind: "error",
            message: `Missing required columns in: ${blocked.map((b) => b.fileName).join(", ")}`,
          });
          return;
        }
        const db = await resetDb("empty");
        for (const s of stagedAll) {
          setLoad({ kind: "loading", msg: `Loading ${s.fileName}…` });
          await loadStagedFile(db, s, () => {});
        }
        await refresh();
        setLoad({ kind: "loaded" });
      } catch (e) {
        setLoad({ kind: "error", message: String((e as Error)?.message ?? e) });
      }
    },
    [refresh],
  );

  const loadDemo = useCallback(async () => {
    setLoad({ kind: "loading", msg: "Fetching demo dataset…" });
    try {
      const files: File[] = [];
      for (const name of DEMO_FILES) {
        const res = await fetch(`/sample-data/${name}`);
        if (!res.ok) throw new Error(`Failed to fetch ${name}: ${res.status}`);
        const blob = await res.blob();
        files.push(new File([blob], name, { type: "text/csv" }));
      }
      await ingest(files);
    } catch (e) {
      setLoad({ kind: "error", message: String((e as Error)?.message ?? e) });
    }
  }, [ingest]);

  useEffect(() => {
    getDb().catch(() => {});
  }, []);

  const openDrill = (v: Variant) => {
    setVariant(v);
    setSelected(null);
    setLevel(1);
  };
  const resetDrill = () => {
    setVariant(null);
    setSelected(null);
    setLevel(0);
  };

  const loaded = load.kind === "loaded" && totals && lines;

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <header className="max-w-3xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/55">
          Extractor · open source
        </p>
        <h1 className="font-display mt-3 text-3xl text-ink sm:text-[2.5rem] sm:leading-[1.1]">
          Built to help your valuator or auditor do their job faster.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-ink/75">
          It runs on your machine. Your data never leaves it. Nothing to upload,
          nothing for us to hold, no BAA to sign. You download it once; it
          builds itself on your hardware; the records stay where they already
          are.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[12px] uppercase tracking-[0.12em] text-[var(--gold)] underline decoration-[color-mix(in_oklab,var(--gold)_45%,transparent)] underline-offset-[3px] hover:decoration-[var(--gold)]"
          >
            Read the code → github.com/tcbmem-png/The_Bridge
          </a>
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-ink/25 bg-paper px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/75 transition-colors hover:border-ink/50 hover:text-ink"
            onClick={() => {}}
          >
            Download for your machine →
          </button>
        </div>
      </header>

      {/* LOAD FRONT DOOR */}
      <section className="mt-12">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            ingest(Array.from(e.dataTransfer.files));
          }}
          className={`rounded-md border border-dashed p-7 text-center transition-colors ${
            dragOver ? "border-teal bg-teal/5" : "border-ink/25 bg-ink/[0.02]"
          }`}
        >
          <p className="font-display text-lg text-ink">
            Drop your exports here — 837 · 835 · RIS · bank
          </p>
          <p className="mt-1 font-mono text-[11px] text-ink/55">
            Session-only · client-side · nothing written to disk
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-md border border-ink/25 bg-paper px-3 py-1.5 font-mono text-[12px] text-ink hover:bg-ink/5"
            >
              Or browse…
            </button>
            <button
              type="button"
              onClick={loadDemo}
              disabled={load.kind === "loading"}
              className="rounded-md border border-teal/50 bg-teal/15 px-3 py-1.5 font-mono text-[12px] text-teal hover:bg-teal/25 disabled:opacity-40"
            >
              Load demo dataset
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && ingest(Array.from(e.target.files))}
          />
        </div>

        {load.kind === "loading" && (
          <p className="mt-4 font-mono text-[12px] text-ink/65">{load.msg}</p>
        )}
        {load.kind === "error" && (
          <p className="mt-4 font-mono text-[12px] text-red-clinical">{load.message}</p>
        )}
        {load.kind === "loaded" && (
          <p className="mt-4 font-mono text-[12px] text-teal">
            Loaded locally · computed on this machine.
          </p>
        )}
      </section>

      {/* NUMBERS — only after load */}
      {loaded && (
        <>
          <section className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            <BigNumber
              label="ER wRVU"
              value={fmt(totals!.wrvu, 2)}
              sub={`${totals!.lines.toLocaleString()} billed lines`}
              active={variant === "wrvu"}
              onClick={() => (variant === "wrvu" ? resetDrill() : openDrill("wrvu"))}
            />
            <BigNumber
              label="ER collections"
              value={`$${fmt(totals!.collections, 2)}`}
              sub={`${totals!.lines.toLocaleString()} billed lines`}
              active={variant === "collections"}
              onClick={() =>
                variant === "collections" ? resetDrill() : openDrill("collections")
              }
            />
          </section>

          {variant && (
            <section className="mt-10">
              <Crumbs
                variant={variant}
                level={level}
                selected={selected}
                onJump={(lv) => {
                  if (lv === 0) resetDrill();
                  else setLevel(lv);
                }}
              />
              {variant === "collections" && (
                <CollectionsDrill
                  level={level}
                  setLevel={setLevel}
                  rows={lines!}
                  selected={selected}
                  setSelected={setSelected}
                />
              )}
              {variant === "wrvu" && (
                <WrvuDrill
                  level={level}
                  setLevel={setLevel}
                  rows={lines!}
                  selected={selected}
                  setSelected={setSelected}
                />
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}

function BigNumber({
  label,
  value,
  sub,
  active,
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-md border bg-paper p-7 text-left transition-colors ${
        active ? "border-ink/60" : "border-ink/15 hover:border-ink/40"
      }`}
    >
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/55">
        {label}
      </div>
      <div className="font-mono mt-3 text-[2.5rem] leading-none tabular-nums text-ink sm:text-[3.25rem]">
        {value}
      </div>
      <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-ink/55">
        <span>{sub}</span>
        <span className="text-ink/40 group-hover:text-ink/70">
          {active ? "↑ collapse" : "↓ drill to source"}
        </span>
      </div>
    </button>
  );
}

function Crumbs({
  variant,
  level,
  selected,
  onJump,
}: {
  variant: Variant;
  level: DrillLevel;
  selected: Line | null;
  onJump: (lv: DrillLevel) => void;
}) {
  const root = variant === "wrvu" ? "ER wRVU" : "ER collections";
  const l1 = variant === "wrvu" ? "837 billed lines" : "835 remittance lines";
  const l2 =
    variant === "wrvu" ? "CPT + MPFS match" : "837 claim line it pays";
  const sel = selected
    ? `${selected.claim_id} · line ${selected.line_number}`
    : "";

  const node = (label: string, lv: DrillLevel, current: boolean) =>
    current ? (
      <span className="text-ink">{label}</span>
    ) : (
      <button onClick={() => onJump(lv)} className="hover:text-ink">
        {label}
      </button>
    );

  return (
    <nav
      aria-label="Drill path"
      className="mb-4 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55"
    >
      <button onClick={() => onJump(0)} className="hover:text-ink">
        ← Back to numbers
      </button>
      <span className="text-ink/25">/</span>
      {node(root, 1, level === 1 && !selected)}
      {level >= 1 && (
        <>
          <span className="text-ink/25">/</span>
          {node(l1, 1, level === 1 && !selected)}
        </>
      )}
      {level >= 2 && selected && (
        <>
          <span className="text-ink/25">/</span>
          {node(`${sel} · ${l2}`, 2, level === 2)}
        </>
      )}
      {level >= 3 && (
        <>
          <span className="text-ink/25">/</span>
          <span className="text-ink">SOURCE</span>
        </>
      )}
    </nav>
  );
}

/* ---------- Collections drill: 835 → 837 → source file rows ---------- */

function CollectionsDrill({
  level,
  setLevel,
  rows,
  selected,
  setSelected,
}: {
  level: DrillLevel;
  setLevel: (lv: DrillLevel) => void;
  rows: Line[];
  selected: Line | null;
  setSelected: (l: Line | null) => void;
}) {
  const filtered = useMemo(
    () => rows.filter((r) => Number(r.paid_amount) !== 0),
    [rows],
  );

  if (level === 1) {
    return (
      <Card
        title="835 remittance lines that sum to ER collections"
        sub={`${filtered.length.toLocaleString()} lines · click a row to see the 837 claim line it pays.`}
      >
        <Table
          head={["Claim", "Line", "DOS", "CPT", "Payer", "EFT/Check", "Paid"]}
          rows={filtered.map((r) => ({
            key: `${r.claim_id}-${r.line_number}`,
            cells: [
              r.claim_id,
              r.line_number,
              toIso(r.dos),
              r.cpt_code,
              r.payer_id ?? "—",
              r.check_eft_trace ?? "—",
              { value: fmt(r.paid_amount), right: true },
            ],
            onClick: () => {
              setSelected(r);
              setLevel(2);
            },
          }))}
        />
      </Card>
    );
  }

  if (level === 2 && selected) {
    return (
      <Card
        title={`837 claim line paid by this 835 row · ${selected.claim_id} · line ${selected.line_number}`}
        sub="Click to see the literal source file and row this came from."
      >
        <RecordTable
          rows={[
            ["claim_id", selected.claim_id],
            ["line_number", selected.line_number],
            ["dos", toIso(selected.dos)],
            ["cpt_code", selected.cpt_code],
            ["units", selected.units],
            ["payer_id", selected.payer_id ?? "—"],
            ["financial_class", selected.financial_class ?? "—"],
            ["charge_amount", fmt(selected.charge_amount)],
            ["paid_amount (from 835)", fmt(selected.paid_amount)],
          ]}
        />
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setLevel(3)}
            className="rounded-md border border-ink/25 bg-paper px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink hover:bg-ink/5"
          >
            Show source files & rows →
          </button>
        </div>
      </Card>
    );
  }

  if (level === 3 && selected) {
    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SourceFileCard
          fileLabel="835 remittance · source file"
          fileName={selected.src_835_file}
          hash={selected.src_835_hash}
          rowRef={`claim_id=${selected.claim_id} · line_number=${selected.line_number}`}
          rows={[
            ["claim_id", selected.claim_id],
            ["line_number", selected.line_number],
            ["paid_amount", fmt(selected.paid_amount)],
            ["check_eft_trace", selected.check_eft_trace ?? "—"],
            ["payer_id", selected.payer_id ?? "—"],
            ["financial_class", selected.financial_class ?? "—"],
          ]}
        />
        <SourceFileCard
          fileLabel="837 billing · source file"
          fileName={selected.src_837_file}
          hash={selected.src_837_hash}
          rowRef={`claim_id=${selected.claim_id} · line_number=${selected.line_number}`}
          rows={[
            ["claim_id", selected.claim_id],
            ["line_number", selected.line_number],
            ["dos", toIso(selected.dos)],
            ["cpt_code", selected.cpt_code],
            ["units", selected.units],
            ["charge_amount", fmt(selected.charge_amount)],
            ["payer_id", selected.payer_id ?? "—"],
          ]}
        />
      </div>
    );
  }
  return null;
}

/* ---------- wRVU drill: 837 → CPT+MPFS → source file rows ---------- */

function WrvuDrill({
  level,
  setLevel,
  rows,
  selected,
  setSelected,
}: {
  level: DrillLevel;
  setLevel: (lv: DrillLevel) => void;
  rows: Line[];
  selected: Line | null;
  setSelected: (l: Line | null) => void;
}) {
  const filtered = useMemo(
    () => rows.filter((r) => Number(r.work_rvu) > 0),
    [rows],
  );

  if (level === 1) {
    return (
      <Card
        title="837 billed lines that sum to ER wRVU"
        sub={`${filtered.length.toLocaleString()} lines · click a row to see its CPT and matched MPFS rate.`}
      >
        <Table
          head={["Claim", "Line", "DOS", "CPT", "Units", "Per-unit wRVU", "Line wRVU"]}
          rows={filtered.map((r) => ({
            key: `${r.claim_id}-${r.line_number}`,
            cells: [
              r.claim_id,
              r.line_number,
              toIso(r.dos),
              r.cpt_code,
              { value: String(r.units), right: true },
              { value: fmt(r.mpfs_work_rvu, 4), right: true },
              { value: fmt(r.work_rvu, 4), right: true },
            ],
            onClick: () => {
              setSelected(r);
              setLevel(2);
            },
          }))}
        />
      </Card>
    );
  }

  if (level === 2 && selected) {
    return (
      <Card
        title={`CPT ${selected.cpt_code} · matched against MPFS ${selected.mpfs_year ?? "—"}`}
        sub="Click to see both source files and rows."
      >
        <RecordTable
          rows={[
            ["837 claim_id", selected.claim_id],
            ["837 line_number", selected.line_number],
            ["dos", toIso(selected.dos)],
            ["cpt_code", selected.cpt_code],
            ["units (from 837)", selected.units],
            ["per-unit work_rvu (from MPFS)", fmt(selected.mpfs_work_rvu, 4)],
            ["conversion_factor (from MPFS)", fmt(selected.mpfs_cf, 4)],
            ["line work_rvu = units × per-unit", fmt(selected.work_rvu, 4)],
          ]}
        />
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setLevel(3)}
            className="rounded-md border border-ink/25 bg-paper px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink hover:bg-ink/5"
          >
            Show source files & rows →
          </button>
        </div>
      </Card>
    );
  }

  if (level === 3 && selected) {
    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SourceFileCard
          fileLabel="837 billing · source file"
          fileName={selected.src_837_file}
          hash={selected.src_837_hash}
          rowRef={`claim_id=${selected.claim_id} · line_number=${selected.line_number}`}
          rows={[
            ["claim_id", selected.claim_id],
            ["line_number", selected.line_number],
            ["dos", toIso(selected.dos)],
            ["cpt_code", selected.cpt_code],
            ["units", selected.units],
            ["charge_amount", fmt(selected.charge_amount)],
          ]}
        />
        <SourceFileCard
          fileLabel={`MPFS reference · service year ${selected.mpfs_year ?? "—"}`}
          fileName={"MOCK_PUBLIC_MPFS_reference.csv"}
          hash={null}
          rowRef={`cpt_code=${selected.cpt_code} · service_year=${selected.mpfs_year ?? "—"}`}
          rows={[
            ["cpt_code", selected.cpt_code],
            ["service_year", selected.mpfs_year ?? "—"],
            ["work_rvu (per unit)", fmt(selected.mpfs_work_rvu, 4)],
            ["conversion_factor", fmt(selected.mpfs_cf, 4)],
          ]}
        />
      </div>
    );
  }
  return null;
}

/* ---------- Shared presentational ---------- */

function Card({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-ink/15 bg-paper p-5">
      <h2 className="font-display text-base text-ink">{title}</h2>
      {sub && <p className="mt-1 font-mono text-[11px] text-ink/55">{sub}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

type Cell = string | number | { value: string; right?: boolean };

function Table({
  head,
  rows,
}: {
  head: string[];
  rows: Array<{ key: string; cells: Cell[]; onClick: () => void }>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-[12px] tabular-nums">
        <thead className="text-ink/60">
          <tr className="border-b border-ink/10">
            {head.map((h, i) => (
              <th key={i} className="py-1.5 text-left font-medium">
                {h}
              </th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.key}
              onClick={r.onClick}
              className="cursor-pointer border-b border-ink/5 hover:bg-ink/[0.03]"
            >
              {r.cells.map((c, i) => {
                const right = typeof c === "object" && c.right;
                const v = typeof c === "object" ? c.value : c;
                return (
                  <td
                    key={i}
                    className={`py-1.5 ${right ? "text-right" : ""}`}
                  >
                    {v}
                  </td>
                );
              })}
              <td className="py-1.5 text-right text-ink/40">→</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecordTable({ rows }: { rows: Array<[string, unknown]> }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 font-mono text-[12px] tabular-nums">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink/55">{k}</dt>
          <dd className="text-ink">{String(v ?? "—")}</dd>
        </div>
      ))}
    </dl>
  );
}

function SourceFileCard({
  fileLabel,
  fileName,
  hash,
  rowRef,
  rows,
}: {
  fileLabel: string;
  fileName: string | null;
  hash: string | null;
  rowRef: string;
  rows: Array<[string, unknown]>;
}) {
  return (
    <div className="rounded-md border border-ink/15 bg-paper p-5">
      <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55">
        SOURCE · {fileLabel}
      </div>
      <div className="mt-2 font-mono text-[13px] text-ink">
        {fileName ?? "—"}
      </div>
      {hash && (
        <div className="font-mono text-[10.5px] text-ink/45" title={hash}>
          sha256 · {hash.slice(0, 16)}…
        </div>
      )}
      <div className="mt-1 font-mono text-[11px] text-ink/65">
        row · {rowRef}
      </div>
      <div className="mt-4 border-t border-ink/10 pt-3">
        <RecordTable rows={rows} />
      </div>
    </div>
  );
}
