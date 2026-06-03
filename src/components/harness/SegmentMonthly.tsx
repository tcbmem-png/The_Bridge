import { useEffect, useState } from "react";
import { segmentMonthly } from "../../../harness/runtime/queries";

type Row = {
  service_month: string;
  segment: string;
  line_count: number | string;
  wrvu: number | string;
  charges: number | string;
  collections: number | string;
  yield_per_wrvu: number | string | null;
};

const TARGET = { ER: 28, NON_ER: 86 } as const;

function fmt(n: number | string | null | undefined, digits = 2) {
  if (n === null || n === undefined) return "—";
  const v = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function toIsoDate(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string") return v.slice(0, 10);
  return String(v);
}

export function SegmentMonthly() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    segmentMonthly()
      .then((r) => setRows(r as unknown as Row[]))
      .catch((e) => setErr(String(e?.message ?? e)));
  }, []);

  const pass =
    rows !== null &&
    rows.every((r) => {
      const target = TARGET[r.segment as "ER" | "NON_ER"];
      if (target === undefined) return true;
      const y = Number(r.yield_per_wrvu);
      return Math.abs(y - target) < 0.005;
    });

  return (
    <Panel
      letter="A"
      title="Segment monthly"
      query="SELECT segment, wrvu, collections, yield_per_wrvu FROM core.segment_monthly"
      pill={
        rows === null
          ? { state: "pending", label: "Running…" }
          : pass
            ? { state: "pass", label: "ER $28.00 · non-ER $86.00" }
            : { state: "fail", label: "Yield mismatch" }
      }
      error={err}
    >
      {rows && (
        <table className="w-full font-mono text-[12px] tabular-nums">
          <thead className="text-ink/60">
            <tr className="border-b border-ink/10">
              <th className="py-1.5 text-left font-medium">Month</th>
              <th className="py-1.5 text-left font-medium">Segment</th>
              <th className="py-1.5 text-right font-medium">Lines</th>
              <th className="py-1.5 text-right font-medium">wRVU</th>
              <th className="py-1.5 text-right font-medium">Charges</th>
              <th className="py-1.5 text-right font-medium">Collections</th>
              <th className="py-1.5 text-right font-medium">$/wRVU</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-ink/5">
                <td className="py-1.5">{toIsoDate(r.service_month)}</td>
                <td className="py-1.5">{r.segment}</td>
                <td className="py-1.5 text-right">{r.line_count}</td>
                <td className="py-1.5 text-right">{fmt(r.wrvu, 4)}</td>
                <td className="py-1.5 text-right">{fmt(r.charges)}</td>
                <td className="py-1.5 text-right">{fmt(r.collections)}</td>
                <td className="py-1.5 text-right">{fmt(r.yield_per_wrvu)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

// Shared panel chrome used across the harness views.
export function Panel({
  letter,
  title,
  query,
  pill,
  error,
  children,
}: {
  letter?: string;
  title: string;
  query?: string;
  pill?: { state: "pass" | "fail" | "pending"; label: string };
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-ink/15 bg-paper p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-ink/10 pb-3">
        <div>
          <div className="flex items-baseline gap-2">
            {letter && (
              <span className="font-display text-sm text-ink/50">{letter}.</span>
            )}
            <h3 className="font-display text-base text-ink">{title}</h3>
          </div>
          {query && (
            <p className="mt-1 font-mono text-[11px] text-ink/55">{query}</p>
          )}
        </div>
        {pill && <Pill {...pill} />}
      </header>
      <div className="pt-3">
        {error ? (
          <p className="font-mono text-[12px] text-red-clinical">{error}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function Pill({ state, label }: { state: "pass" | "fail" | "pending"; label: string }) {
  const styles =
    state === "pass"
      ? "border-teal/40 bg-teal/10 text-teal"
      : state === "fail"
        ? "border-red-clinical/40 bg-red-clinical/10 text-red-clinical"
        : "border-ink/20 bg-ink/[0.04] text-ink/60";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${styles}`}
    >
      {label}
    </span>
  );
}
