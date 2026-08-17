import { createFileRoute, Link } from "@tanstack/react-router";
import { routeMeta } from "../lib/site";
import { useState } from "react";
import { RecordLoader } from "../components/record/RecordLoader";
import { FigureTile } from "../components/record/FigureTile";
import { ProvenanceStamp } from "../components/record/ProvenanceStamp";
import { useRecord, useRecordQuery } from "../lib/provenance/useRecord";
import { record, gap, realizedYield, derive } from "../lib/provenance/algebra";
import { formatValue } from "../lib/provenance/format";
import {
  segments,
  totals,
  linesFor,
  lineage,
  leakage,
  type SegmentKey,
  type SegmentRow,
} from "../../harness/runtime/recordQueries";

export const Route = createFileRoute("/economics")({
  head: () => ({
    meta: [
      { title: "Economics — realized yield on the work you did" },
      {
        name: "description",
        content:
          "Dollars received per unit of physician work, sliced by payer, physician, site, and service family — computed from the record, drillable to the source line.",
      },
      { property: "og:title", content: "Economics — realized yield on the work you did" },
      {
        property: "og:description",
        content:
          "Realized dollars per work unit, by any cut of the record, drillable to the 837 and 835 rows behind it.",
      },
      { property: "og:type", content: "website" },
      ...routeMeta("/economics").meta,
    ],
    links: routeMeta("/economics").links,
  }),
  component: EconomicsPage,
  ssr: false,
});

const CUTS: { key: SegmentKey; label: string }[] = [
  { key: "payer", label: "Payer" },
  { key: "financial_class", label: "Financial class" },
  { key: "physician", label: "Physician" },
  { key: "site_of_service", label: "Site of service" },
  { key: "facility", label: "Facility" },
  { key: "service_family", label: "Service family" },
  { key: "cpt_code", label: "CPT" },
  { key: "service_month", label: "Month" },
];

function EconomicsPage() {
  const { loaded, progress, reports, error, load } = useRecord();
  const [cut, setCut] = useState<SegmentKey>("payer");
  const [drill, setDrill] = useState<string | null>(null);

  const { data: tot } = useRecordQuery(() => totals(), [loaded], loaded);
  const { data: rows } = useRecordQuery(() => segments(cut), [loaded, cut], loaded);

  const t = tot?.[0];
  const paidF = record("Payer dollars received", t ? Number(t.paid) : null, {
    unit: "usd",
    sources: ["stg.remit_line"],
  });
  const wrvuF = record("Work units on mapped lines", t ? Number(t.work_rvu) : null, {
    unit: "wrvu",
    sources: ["stg.claim_line", "ref.mpfs_wrvu"],
    note:
      t && Number(t.unmapped_lines) > 0
        ? `${formatValue(Number(t.unmapped_lines), "count")} lines carry no fee-schedule work value and are excluded from this denominator, not counted as zero work.`
        : undefined,
  });
  const yieldF = realizedYield(paidF, wrvuF);
  const chargesF = record("Charges submitted", t ? Number(t.charges) : null, { unit: "usd" });
  const collectionF = derive(
    "Collected share of charges",
    [paidF, chargesF],
    ([p, c]) => (c === 0 ? null : p / c),
    { unit: "percent", formula: "payer dollars received / charges submitted" },
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <header className="max-w-3xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55">
          Economics
        </p>
        <h1 className="font-display mt-2 text-3xl leading-tight text-ink sm:text-4xl">
          What a unit of your work is actually worth.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink/75">
          Realized yield is dollars that arrived, divided by the work units that
          earned them. It is specialty-agnostic: the same arithmetic holds for
          cardiology, radiology, anesthesia, or a primary-care panel, because both
          sides come from the record rather than from a benchmark. Cut it any way
          the data supports, then open any row down to the source line.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-ink/60">
          Every figure is stamped.{" "}
          <Link
            to="/method"
            className="text-[var(--gold)] underline decoration-[color-mix(in_oklab,var(--gold)_45%,transparent)] underline-offset-[3px] hover:decoration-[var(--gold)]"
          >
            What the stamps mean →
          </Link>
        </p>
      </header>

      <div className="mt-8">
        <RecordLoader
          loaded={loaded}
          progress={progress}
          reports={reports}
          error={error}
          onLoad={load}
        />
      </div>

      {!loaded ? (
        <p className="mt-10 font-mono text-[12px] text-ink/50">
          Load the record to compute yield. No figures are shown before there is a
          record to compute them from.
        </p>
      ) : (
        <>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FigureTile figure={yieldF} size="lg" />
            <FigureTile figure={paidF} />
            <FigureTile figure={wrvuF} />
            <FigureTile figure={collectionF} />
          </div>

          <section className="mt-12 border-t border-ink/12 pt-6">
            <h2 className="font-display text-2xl text-ink">Cut the record</h2>
            <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-ink/70">
              Same numerator, same denominator, different grouping. A segment with
              unmapped lines shows the count, because its yield is computed over a
              partial denominator and you should see that before you act on it.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {CUTS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => {
                    setCut(c.key);
                    setDrill(null);
                  }}
                  className={`rounded-full border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.11em] transition-colors ${
                    cut === c.key
                      ? "border-ink bg-ink text-paper"
                      : "border-ink/25 text-ink/65 hover:border-ink/50"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-ink/12">
              {!rows ? (
                <p className="px-4 py-6 font-mono text-[11.5px] text-ink/50">Querying…</p>
              ) : (
                <SegmentTable rows={rows} onDrill={setDrill} active={drill} />
              )}
            </div>
          </section>

          {drill && <LineDrill cut={cut} value={drill} onClose={() => setDrill(null)} />}

          <LeakagePanel />
        </>
      )}
    </main>
  );
}

function SegmentTable({
  rows,
  onDrill,
  active,
}: {
  rows: SegmentRow[];
  onDrill: (s: string) => void;
  active: string | null;
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-ink/[0.03]">
        <tr className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink/55">
          <th className="px-3 py-2 font-normal">Segment</th>
          <th className="px-3 py-2 text-right font-normal">Lines</th>
          <th className="px-3 py-2 text-right font-normal">Work units</th>
          <th className="px-3 py-2 text-right font-normal">Charges</th>
          <th className="px-3 py-2 text-right font-normal">Paid</th>
          <th className="px-3 py-2 text-right font-normal">$ / work unit</th>
          <th className="px-3 py-2 text-right font-normal">Denied</th>
          <th className="px-3 py-2 text-right font-normal">No remit</th>
          <th className="px-3 py-2 text-right font-normal">Days to pay</th>
          <th className="px-3 py-2 font-normal" />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const w = r.work_rvu === null ? null : Number(r.work_rvu);
          const p = r.paid === null ? null : Number(r.paid);
          const y = w && p !== null && w > 0 ? p / w : null;
          return (
            <tr
              key={r.segment}
              className={`border-t border-ink/8 ${active === r.segment ? "bg-ink/[0.04]" : ""}`}
            >
              <td className="px-3 py-2 text-ink/85">{r.segment}</td>
              <Num v={Number(r.lines)} unit="count" />
              <Num v={w} unit="wrvu" />
              <Num v={r.charges === null ? null : Number(r.charges)} unit="usd" />
              <Num v={p} unit="usd" />
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {y === null ? (
                  <span className="text-ink/35" title="No mapped work units in this segment">
                    GAP
                  </span>
                ) : (
                  <span className="text-ink">{formatValue(y, "usd_per_wrvu")}</span>
                )}
                {Number(r.unmapped_lines) > 0 && (
                  <span className="ml-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-[var(--gold)]">
                    partial
                  </span>
                )}
              </td>
              <Num v={Number(r.denied_lines)} unit="count" />
              <Num v={Number(r.unadjudicated_lines)} unit="count" />
              <Num
                v={r.avg_days_to_pay === null ? null : Number(r.avg_days_to_pay)}
                unit="days"
              />
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => onDrill(r.segment)}
                  className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink/50 underline decoration-ink/20 underline-offset-[3px] hover:text-ink"
                >
                  Open
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Num({ v, unit }: { v: number | null; unit: "usd" | "count" | "wrvu" | "days" }) {
  return (
    <td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums text-ink/85">
      {v === null ? <span className="text-ink/30">—</span> : formatValue(v, unit)}
    </td>
  );
}

function LineDrill({
  cut,
  value,
  onClose,
}: {
  cut: SegmentKey;
  value: string;
  onClose: () => void;
}) {
  const { data } = useRecordQuery(() => linesFor(cut, value, 100), [cut, value], true);
  const [open, setOpen] = useState<{ claim: string; line: number } | null>(null);

  return (
    <section className="mt-8 border-t border-ink/12 pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl text-ink">
          Lines under <span className="font-mono text-lg">{value}</span>
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-[10.5px] uppercase tracking-[0.11em] text-ink/50 hover:text-ink"
        >
          Close
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-ink/12">
        {!data ? (
          <p className="px-4 py-6 font-mono text-[11.5px] text-ink/50">Querying…</p>
        ) : (
          <table className="w-full text-left text-[12.5px]">
            <thead className="bg-ink/[0.03]">
              <tr className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink/55">
                {["claim", "line", "dos", "cpt", "wrvu", "charge", "paid", "status", "cash", ""].map(
                  (h, i) => (
                    <th key={i} className="px-3 py-2 font-normal">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {(data as Record<string, unknown>[]).map((r, i) => (
                <tr key={i} className="border-t border-ink/8 font-mono tabular-nums text-ink/80">
                  <td className="px-3 py-1.5">{String(r.claim_id)}</td>
                  <td className="px-3 py-1.5">{String(r.claim_line_id)}</td>
                  <td className="px-3 py-1.5">{String(r.dos).slice(0, 10)}</td>
                  <td className="px-3 py-1.5">{String(r.cpt_code)}</td>
                  <td className="px-3 py-1.5">{r.work_rvu === null ? "—" : String(r.work_rvu)}</td>
                  <td className="px-3 py-1.5">
                    {formatValue(Number(r.charge_amount), "usd")}
                  </td>
                  <td className="px-3 py-1.5">
                    {r.paid_amount === null ? "—" : formatValue(Number(r.paid_amount), "usd")}
                  </td>
                  <td className="px-3 py-1.5">{String(r.adjudication_status ?? "none")}</td>
                  <td className="px-3 py-1.5">{String(r.cash_match_status)}</td>
                  <td className="px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setOpen({
                          claim: String(r.claim_id),
                          line: Number(r.claim_line_id),
                        })
                      }
                      className="text-[10px] uppercase tracking-[0.1em] text-ink/50 underline decoration-ink/20 underline-offset-[3px] hover:text-ink"
                    >
                      Source
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && <Lineage claimId={open.claim} lineNumber={open.line} />}
    </section>
  );
}

function Lineage({ claimId, lineNumber }: { claimId: string; lineNumber: number }) {
  const { data } = useRecordQuery(
    () => lineage(claimId, lineNumber),
    [claimId, lineNumber],
    true,
  );
  if (!data) {
    return <p className="mt-4 font-mono text-[11.5px] text-ink/50">Reading source rows…</p>;
  }
  const blocks: [string, Record<string, unknown>[]][] = [
    ["Encounter (EHR)", data.encounter as Record<string, unknown>[]],
    ["Claim line (837)", data.claim as Record<string, unknown>[]],
    ["Remittance line (835)", data.remit as Record<string, unknown>[]],
    ["Deposit (bank)", data.deposit as Record<string, unknown>[]],
    ["Fee schedule (MPFS)", data.mpfs as Record<string, unknown>[]],
  ];

  return (
    <div className="mt-5 rounded-lg border border-ink/15 bg-[var(--bridge-cream-2)] p-4">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.11em] text-ink/55">
        Source rows behind claim {claimId} line {lineNumber}
      </p>
      <div className="mt-3 space-y-4">
        {blocks.map(([label, rows]) => (
          <div key={label}>
            <div className="flex items-center gap-2">
              <h4 className="font-display text-base text-ink">{label}</h4>
              {rows.length === 0 ? (
                <ProvenanceStamp type="gap" />
              ) : (
                <span className="font-mono text-[10px] text-ink/45">
                  {String(rows[0].file_name ?? "reference table")}
                </span>
              )}
            </div>
            {rows.length === 0 ? (
              <p className="mt-1 text-[12.5px] text-ink/60">
                No row on the record at this step.
              </p>
            ) : (
              <dl className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-0.5 sm:grid-cols-3">
                {Object.entries(rows[0]).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-ink/8 py-0.5">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink/45">
                      {k.replace(/_/g, " ")}
                    </dt>
                    <dd className="font-mono text-[11px] tabular-nums text-ink/85">
                      {v === null ? <span className="text-ink/30">null</span> : String(v)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LeakagePanel() {
  const { data } = useRecordQuery(() => leakage(), [], true);
  return (
    <section className="mt-12 border-t border-ink/12 pt-6">
      <h2 className="font-display text-2xl text-ink">Why the rest did not arrive</h2>
      <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-ink/70">
        The difference between allowed and paid, grouped by the reason the record
        gives. Lines with no remittance at all sit at the top as a gap, because no
        reason has been given for them yet.
      </p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-ink/12">
        {!data ? (
          <p className="px-4 py-6 font-mono text-[11.5px] text-ink/50">Querying…</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-ink/[0.03]">
              <tr className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink/55">
                <th className="px-3 py-2 font-normal">Reason</th>
                <th className="px-3 py-2 font-normal">Category</th>
                <th className="px-3 py-2 text-right font-normal">Lines</th>
                <th className="px-3 py-2 text-right font-normal">Charges</th>
                <th className="px-3 py-2 text-right font-normal">Allowed not paid</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.reason} className="border-t border-ink/8">
                  <td className="px-3 py-2 text-ink/85">
                    {r.reason}
                    {r.reason === "No remittance on record" && (
                      <ProvenanceStamp type="gap" className="ml-2" />
                    )}
                  </td>
                  <td className="px-3 py-2 text-ink/60">{r.category ?? "—"}</td>
                  <Num v={Number(r.lines)} unit="count" />
                  <Num v={r.charges === null ? null : Number(r.charges)} unit="usd" />
                  <Num v={r.unpaid === null ? null : Number(r.unpaid)} unit="usd" />
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="mt-4">
        <FigureTile
          figure={gap("Recoverable amount", {
            unit: "usd",
            note:
              "Not stated. Recoverability depends on timely-filing windows, appeal rights, and contract terms that are not in these files.",
            closesOn:
              "The payer contract and the timely-filing calendar for each affected line.",
          })}
        />
      </div>
    </section>
  );
}
