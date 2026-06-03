import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { erTotals, erAllLines } from "../../harness/runtime/queries";
import { getDb } from "../../harness/runtime/db";

export const Route = createFileRoute("/extractor")({
  head: () => ({
    meta: [
      { title: "Extractor — The Bridge" },
      {
        name: "description",
        content:
          "Two numbers your valuator or auditor needs — ER wRVU and ER collections — drillable down to the source 837/835/RIS line.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ExtractorPage,
  ssr: false,
});

const REPO_URL = "https://github.com/tcbmem-png/The_Bridge";

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

type Drill = null | "wrvu" | "collections";

function ExtractorPage() {
  const [mounted, setMounted] = useState(false);
  const [totals, setTotals] = useState<{ wrvu: number; collections: number; lines: number } | null>(null);
  const [lines, setLines] = useState<Line[] | null>(null);
  const [drill, setDrill] = useState<Drill>(null);
  const [selected, setSelected] = useState<Line | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    getDb()
      .then(() => Promise.all([erTotals(), erAllLines()]))
      .then(([t, ls]) => {
        const row = t[0];
        setTotals({
          wrvu: Number(row?.wrvu ?? 0),
          collections: Number(row?.collections ?? 0),
          lines: Number(row?.line_count ?? 0),
        });
        setLines(ls as unknown as Line[]);
      })
      .catch((e) => setErr(String(e?.message ?? e)));
  }, []);

  const drillTitle =
    drill === "wrvu"
      ? "ER wRVU · contributing billed lines"
      : drill === "collections"
        ? "ER collections · contributing remittance lines"
        : null;

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
            onClick={() => {
              /* file not wired yet */
            }}
          >
            Download for your machine →
          </button>
        </div>
      </header>

      {!mounted ? (
        <p className="mt-10 font-mono text-[12px] text-ink/55">Booting…</p>
      ) : err ? (
        <p className="mt-10 font-mono text-[12px] text-red-clinical">{err}</p>
      ) : (
        <>
          <section className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            <BigNumber
              label="ER wRVU"
              value={totals ? fmt(totals.wrvu, 2) : "—"}
              sub={totals ? `${totals.lines.toLocaleString()} billed lines` : ""}
              active={drill === "wrvu"}
              onClick={() => {
                setSelected(null);
                setDrill(drill === "wrvu" ? null : "wrvu");
              }}
            />
            <BigNumber
              label="ER collections"
              value={totals ? `$${fmt(totals.collections, 2)}` : "—"}
              sub={totals ? `${totals.lines.toLocaleString()} billed lines` : ""}
              active={drill === "collections"}
              onClick={() => {
                setSelected(null);
                setDrill(drill === "collections" ? null : "collections");
              }}
            />
          </section>

          {drill && lines && (
            <section className="mt-10">
              <Breadcrumb
                items={
                  selected
                    ? [
                        { label: drill === "wrvu" ? "ER wRVU" : "ER collections", onClick: () => setSelected(null) },
                        { label: `${selected.claim_id} · line ${selected.line_number}` },
                      ]
                    : [{ label: drill === "wrvu" ? "ER wRVU" : "ER collections" }]
                }
                onRoot={() => {
                  setDrill(null);
                  setSelected(null);
                }}
              />
              {!selected ? (
                <ContributingLines
                  title={drillTitle ?? ""}
                  rows={lines}
                  variant={drill}
                  onPick={(l) => setSelected(l)}
                />
              ) : (
                <LineDetail line={selected} variant={drill} onBack={() => setSelected(null)} />
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

function Breadcrumb({
  items,
  onRoot,
}: {
  items: { label: string; onClick?: () => void }[];
  onRoot: () => void;
}) {
  return (
    <nav
      aria-label="Drill path"
      className="mb-4 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55"
    >
      <button onClick={onRoot} className="hover:text-ink">
        ← Back to numbers
      </button>
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-2">
          <span className="text-ink/25">/</span>
          {it.onClick ? (
            <button onClick={it.onClick} className="hover:text-ink">
              {it.label}
            </button>
          ) : (
            <span className="text-ink">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function ContributingLines({
  title,
  rows,
  variant,
  onPick,
}: {
  title: string;
  rows: Line[];
  variant: "wrvu" | "collections";
  onPick: (l: Line) => void;
}) {
  const filtered = useMemo(
    () =>
      variant === "collections"
        ? rows.filter((r) => Number(r.paid_amount) !== 0)
        : rows.filter((r) => Number(r.work_rvu) > 0),
    [rows, variant],
  );
  return (
    <div className="rounded-md border border-ink/15 bg-paper p-5">
      <h2 className="font-display text-base text-ink">{title}</h2>
      <p className="mt-1 font-mono text-[11px] text-ink/55">
        {filtered.length.toLocaleString()} lines · click a row to see the source it came from.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full font-mono text-[12px] tabular-nums">
          <thead className="text-ink/60">
            <tr className="border-b border-ink/10">
              <th className="py-1.5 text-left font-medium">Claim</th>
              <th className="py-1.5 text-left font-medium">Line</th>
              <th className="py-1.5 text-left font-medium">DOS</th>
              <th className="py-1.5 text-left font-medium">CPT</th>
              <th className="py-1.5 text-left font-medium">Payer</th>
              <th className="py-1.5 text-right font-medium">wRVU</th>
              <th className="py-1.5 text-right font-medium">Charge</th>
              <th className="py-1.5 text-right font-medium">Paid</th>
              <th className="py-1.5 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr
                key={i}
                onClick={() => onPick(r)}
                className="cursor-pointer border-b border-ink/5 hover:bg-ink/[0.03]"
              >
                <td className="py-1.5">{r.claim_id}</td>
                <td className="py-1.5">{r.line_number}</td>
                <td className="py-1.5">{toIso(r.dos)}</td>
                <td className="py-1.5">{r.cpt_code}</td>
                <td className="py-1.5">{r.payer_id ?? "—"}</td>
                <td className="py-1.5 text-right">{fmt(r.work_rvu, 4)}</td>
                <td className="py-1.5 text-right">{fmt(r.charge_amount)}</td>
                <td className="py-1.5 text-right">{fmt(r.paid_amount)}</td>
                <td className="py-1.5 text-right text-ink/40">→</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LineDetail({
  line,
  variant,
  onBack,
}: {
  line: Line;
  variant: "wrvu" | "collections";
  onBack: () => void;
}) {
  return (
    <div className="rounded-md border border-ink/15 bg-paper p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base text-ink">
          {line.claim_id} · line {line.line_number} · {toIso(line.dos)} · CPT {line.cpt_code}
        </h2>
        <button
          onClick={onBack}
          className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55 hover:text-ink"
        >
          ← All contributing lines
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        {variant === "collections" ? (
          <>
            <SourceCard
              kind="837 — billed claim line"
              file={line.src_837_file}
              hash={line.src_837_hash}
              rows={[
                ["claim_id", line.claim_id],
                ["line_number", line.line_number],
                ["dos", toIso(line.dos)],
                ["cpt_code", line.cpt_code],
                ["units", line.units],
                ["payer_id", line.payer_id ?? "—"],
                ["charge_amount", fmt(line.charge_amount)],
              ]}
            />
            <SourceCard
              kind="835 — remittance"
              file={line.src_835_file}
              hash={line.src_835_hash}
              rows={[
                ["paid_amount", fmt(line.paid_amount)],
                ["check_eft_trace", line.check_eft_trace ?? "—"],
                ["financial_class", line.financial_class ?? "—"],
              ]}
            />
          </>
        ) : (
          <>
            <SourceCard
              kind="RIS exam"
              file={line.src_ris_file}
              hash={line.src_ris_hash}
              rows={[
                ["accession", line.accession ?? "—"],
                ["exam_cpt", line.exam_cpt ?? "—"],
                ["modality", line.modality ?? "—"],
                ["ordering_location", line.ordering_location ?? "—"],
                ["finalized_at", toIso(line.finalized_at)],
                ["rendering_npi", line.ris_npi ?? "—"],
              ]}
            />
            <SourceCard
              kind="MPFS rate"
              file={`ref.mpfs_wrvu · ${line.mpfs_year ?? "—"}`}
              hash={null}
              rows={[
                ["cpt_code", line.cpt_code],
                ["per-unit work_rvu", fmt(line.mpfs_work_rvu, 4)],
                ["units", line.units],
                ["line work_rvu", fmt(line.work_rvu, 4)],
                ["conversion_factor", fmt(line.mpfs_cf, 4)],
              ]}
            />
          </>
        )}
      </div>
    </div>
  );
}

function SourceCard({
  kind,
  file,
  hash,
  rows,
}: {
  kind: string;
  file: string | null;
  hash: string | null;
  rows: Array<[string, unknown]>;
}) {
  return (
    <div className="rounded-md border border-ink/15 bg-paper p-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55">
        {kind}
      </div>
      <div className="mt-2 font-mono text-[12px] text-ink/80">
        {file ?? "—"}
      </div>
      {hash && (
        <div className="font-mono text-[10.5px] text-ink/45" title={hash}>
          sha256 · {hash.slice(0, 16)}…
        </div>
      )}
      <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 font-mono text-[12px] tabular-nums">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink/55">{k}</dt>
            <dd className="text-ink">{String(v ?? "—")}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
