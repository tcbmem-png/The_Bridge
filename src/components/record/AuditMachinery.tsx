// The ported audit machinery, rendered.
//
// Four panels, in the order an auditor would ask for them:
//   1. Chain of custody + the intake ladder — what arrived, on which rung.
//   2. The no-swallow partition — every row in exactly one visible class.
//   3. Payer remittance vs bank cash — two evidence classes, joined only by trace.
//   4. Repairs, rejects and declared elections — every judgement call, visible.

import { useState } from "react";
import { useRecordQuery } from "../../lib/provenance/useRecord";
import { STAGES, type StageId } from "../../lib/provenance/stages";
import { DISPOSITION_LABEL, type Disposition } from "../../lib/provenance/algebra";
import { compactUsd, formatValue } from "../../lib/provenance/format";
import {
  custody,
  partitionClasses,
  partitionCheck,
  traceSummary,
  repairSummary,
  rejectedRows,
  methodConfig,
  carveInputs,
  type CustodyRow,
  type PartitionClassRow,
  type PartitionCheckRow,
  type TraceSummaryRow,
  type CarveInputs,
} from "../../../harness/runtime/recordQueries";

interface Machinery {
  custody: CustodyRow[];
  classes: PartitionClassRow[];
  checks: PartitionCheckRow[];
  traces: TraceSummaryRow[];
  repairs: { rule: string; field: string; row_count: number }[];
  rejects: Record<string, unknown>[];
  config: { key: string; value: string; definition: string; status: string; source: string }[];
  carve: CarveInputs[];
}

const CARD =
  "rounded-lg border border-ink/12 bg-[color-mix(in_oklab,var(--paper)_92%,white)] p-5";
const LABEL = "font-mono text-[10.5px] uppercase tracking-[0.13em] text-ink/55";

const DISPOSITION_TONE: Record<string, string> = {
  resolved_clean: "text-[var(--teal)] border-[var(--teal)]/40",
  resolved_repaired: "text-[var(--teal)]/80 border-[var(--teal)]/25",
  unmatched: "text-[var(--red-clinical)] border-[var(--red-clinical)]/40",
  contradictory: "text-[var(--red-clinical)] border-[var(--red-clinical)]/50",
  ambiguous: "text-[var(--gold)] border-[var(--gold)]/45",
  uncovered: "text-ink/60 border-ink/25 border-dashed",
  unresolved: "text-ink/60 border-ink/25 border-dashed",
  unmappable: "text-[var(--red-clinical)] border-[var(--red-clinical)]/35",
  not_applicable: "text-ink/45 border-ink/15",
  unclassified: "text-ink/55 border-ink/20 border-dashed",
};

function dispositionLabel(d: string): string {
  return DISPOSITION_LABEL[d as Disposition] ?? d.replace(/_/g, " ").toUpperCase();
}

function cents(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return compactUsd(v / 100);
}

export function AuditMachinery({ enabled }: { enabled: boolean }) {
  const { data } = useRecordQuery<Machinery>(
    async () => {
      const [c, classes, checks, traces, repairs, rejects, config, carve] = await Promise.all([
        custody(),
        partitionClasses(),
        partitionCheck(),
        traceSummary(),
        repairSummary(),
        rejectedRows(25),
        methodConfig(),
        carveInputs(),
      ]);
      return { custody: c, classes, checks, traces, repairs, rejects, config, carve };
    },
    [enabled],
    enabled,
  );

  if (!enabled) return null;
  if (!data) {
    return (
      <p className="mt-10 font-mono text-[12px] text-ink/50">Reading the audit machinery…</p>
    );
  }

  return (
    <div className="mt-14 space-y-6">
      <Ladder custody={data.custody} />
      <Partition classes={data.classes} checks={data.checks} />
      <Carve carve={data.carve[0]} />
      <Traces traces={data.traces} />
      <Judgements repairs={data.repairs} rejects={data.rejects} config={data.config} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Chain of custody, arranged on the intake ladder.
// ---------------------------------------------------------------------------

function Ladder({ custody }: { custody: CustodyRow[] }) {
  const [open, setOpen] = useState<StageId | null>("own_books");

  return (
    <section className={CARD}>
      <p className={LABEL}>The intake ladder</p>
      <h2 className="font-display mt-2 text-xl text-ink">
        What arrived, and which rung it arrived on.
      </h2>
      <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink/70">
        More evidence buys more resolution. It never rewrites the rung below it.
        A later file can explain a difference the earlier stage found. It cannot
        make that difference disappear.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAGES.map((s) => {
          const files = custody.filter((f) => f.stage === s.id);
          const present = files.length > 0;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setOpen(open === s.id ? null : s.id)}
              className={`rounded-md border p-3 text-left transition-colors ${
                present
                  ? "border-[var(--teal)]/40 bg-[color-mix(in_oklab,var(--teal)_5%,transparent)]"
                  : "border-dashed border-ink/25"
              } ${open === s.id ? "ring-1 ring-ink/20" : ""}`}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.13em] text-ink/50">
                Stage {s.n}
              </span>
              <span className="mt-1 block text-[14px] text-ink">{s.label}</span>
              <span className="mt-1 block font-mono text-[11px] text-ink/60">
                {present
                  ? `${files.length} file${files.length === 1 ? "" : "s"} on record`
                  : "Not supplied"}
              </span>
            </button>
          );
        })}
      </div>

      {open && <StageDetail id={open} custody={custody} />}
    </section>
  );
}

function StageDetail({ id, custody }: { id: StageId; custody: CustodyRow[] }) {
  const stage = STAGES.find((s) => s.id === id)!;
  const files = custody.filter((f) => f.stage === id);

  return (
    <div className="mt-5 border-t border-ink/10 pt-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className={LABEL}>This stage can establish</p>
          <ul className="mt-2 space-y-1 text-[13px] text-ink/75">
            {stage.establishes.map((e) => (
              <li key={e}>· {e}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className={LABEL}>It structurally cannot</p>
          <ul className="mt-2 space-y-1 text-[13px] text-ink/60">
            {stage.cannotEstablish.map((e) => (
              <li key={e}>· {e}</li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] leading-relaxed text-ink/60">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink/50">
              Closes on
            </span>{" "}
            {stage.closesOn}
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[12px]">
            <thead>
              <tr className="border-b border-ink/12 text-ink/55">
                <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.12em]">File</th>
                <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.12em]">Rows</th>
                <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.12em]">Rejected</th>
                <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.12em]">Repairs</th>
                <th className="py-2 font-mono text-[10px] uppercase tracking-[0.12em]">SHA-256 of bytes received</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.file_id} className="border-b border-ink/8">
                  <td className="py-2 pr-3 font-mono text-[11px] text-ink/80">{f.file_name}</td>
                  <td className="py-2 pr-3 font-mono text-[11px] text-ink/70">
                    {formatValue(f.row_count, "count")}
                  </td>
                  <td
                    className={`py-2 pr-3 font-mono text-[11px] ${
                      f.rejected_rows > 0 ? "text-[var(--red-clinical)]" : "text-ink/45"
                    }`}
                  >
                    {formatValue(f.rejected_rows, "count")}
                  </td>
                  <td
                    className={`py-2 pr-3 font-mono text-[11px] ${
                      f.repairs > 0 ? "text-[var(--gold)]" : "text-ink/45"
                    }`}
                  >
                    {formatValue(f.repairs, "count")}
                  </td>
                  <td className="py-2 font-mono text-[10px] break-all text-ink/50">
                    {f.sha256 ?? "not computed"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. The no-swallow partition.
// ---------------------------------------------------------------------------

const UNIVERSE_LABEL: Record<string, string> = {
  claim_lines: "Claim lines",
  encounters: "Encounters",
  deposits: "Bank deposits",
  remit_rows: "Remittance rows",
  rejected_rows: "Rows parked at intake",
};

function Partition({
  classes,
  checks,
}: {
  classes: PartitionClassRow[];
  checks: PartitionCheckRow[];
}) {
  return (
    <section className={CARD}>
      <p className={LABEL}>No-swallow partition</p>
      <h2 className="font-display mt-2 text-xl text-ink">Every row lands somewhere visible.</h2>
      <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink/70">
        A row is never allowed to vanish because a join failed, a payer was
        unrecognised, an amount was blank, or a classification was inconvenient.
        The classes below are mutually exclusive and they sum to the population
        that entered. When they do not, the failure is printed, not hidden.
      </p>

      <div className="mt-5 space-y-5">
        {checks.map((c) => {
          const rows = classes.filter((x) => x.universe === c.universe);
          if (!rows.length && c.population === 0) return null;
          return (
            <div key={c.universe}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[14px] text-ink">
                  {UNIVERSE_LABEL[c.universe] ?? c.universe}
                </span>
                <span
                  className={`font-mono text-[11px] ${
                    c.closes ? "text-[var(--teal)]" : "text-[var(--red-clinical)]"
                  }`}
                >
                  {c.closes
                    ? `${formatValue(c.classified, "count")} of ${formatValue(c.population, "count")} classified — partition closes`
                    : `${formatValue(c.unaccounted, "count")} rows unaccounted — partition does NOT close`}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {rows.map((r) => (
                  <span
                    key={r.disposition}
                    className={`inline-flex items-baseline gap-2 rounded-full border px-2.5 py-[3px] font-mono text-[10.5px] ${
                      DISPOSITION_TONE[r.disposition] ?? "text-ink/60 border-ink/20"
                    }`}
                  >
                    <span className="uppercase tracking-[0.1em]">
                      {dispositionLabel(r.disposition)}
                    </span>
                    <span>{formatValue(r.row_count, "count")}</span>
                    {r.amount_cents !== null && <span className="text-ink/50">{cents(r.amount_cents)}</span>}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 3. The carve — one honest difference, sliced into named parts.
// ---------------------------------------------------------------------------

function Carve({ carve }: { carve: CarveInputs | undefined }) {
  if (!carve) return null;
  const startingGap = carve.charges_cents - carve.bank_cash_cents;
  const explained = [
    {
      key: "contractual",
      label: "Contractual adjustments the payer declared",
      amount: carve.contractual_adjustments_cents,
      note: "Authored by the payer on the 835.",
    },
    {
      key: "patient",
      label: "Balance moved to the patient",
      amount: carve.patient_resp_cents,
      note: "Authored by the payer. Not yet cash, and not the payer's to pay.",
    },
    {
      key: "denied",
      label: "Charges denied or zero-paid",
      amount: carve.denied_charges_cents,
      note: `${formatValue(carve.denied_lines, "count")} lines with an adjudicated non-payment.`,
    },
    {
      key: "noremit",
      label: "Charges with no remittance on record",
      amount: carve.no_remittance_charges_cents,
      note: `${formatValue(carve.no_remittance_lines, "count")} lines. Unknown, not zero.`,
    },
    {
      key: "notrace",
      label: "Payer dollars with no bank trace",
      amount: carve.paid_without_bank_trace_cents,
      note: `${formatValue(carve.paid_without_bank_trace_lines, "count")} lines paid on the wire that the bank file does not confirm.`,
    },
  ];
  const explainedTotal = explained.reduce((s, e) => s + e.amount, 0);
  const remainder = startingGap - explainedTotal;

  return (
    <section className={CARD}>
      <p className={LABEL}>The carve</p>
      <h2 className="font-display mt-2 text-xl text-ink">
        One difference, carved into named parts.
      </h2>
      <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink/70">
        Charges billed minus cash received is a single tangled number. Each slice
        below is a claim the sources can actually support. What is left over is
        printed as a remainder — it is never absorbed into the slices, and the
        slices are not forced to add up.
      </p>

      <dl className="mt-5 divide-y divide-ink/8 border-y border-ink/10">
        <Row label="Charges submitted" value={cents(carve.charges_cents)} strong />
        <Row label="Cash received in the bank" value={cents(carve.bank_cash_cents)} strong />
        <Row label="Starting difference" value={cents(startingGap)} strong />
        {explained.map((e) => (
          <Row key={e.key} label={e.label} value={cents(e.amount)} note={e.note} indent />
        ))}
        <Row label="Named so far" value={cents(explainedTotal)} />
        <Row
          label="Unexplained after the carve"
          value={cents(remainder)}
          strong
          tone={Math.abs(remainder) > Math.abs(startingGap) * 0.05 ? "warn" : "ok"}
          note="This figure is a remainder, not an estimate. It is what the current rungs of the ladder cannot yet account for."
        />
      </dl>
      <p className="mt-3 text-[12px] leading-relaxed text-ink/55">
        Slices overlap by construction — a denied charge can also be a charge
        with no cash trace. They are named readings of the same difference, not
        a bill of materials. Read each one on its own terms.
      </p>
    </section>
  );
}

function Row({
  label,
  value,
  note,
  strong,
  indent,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  strong?: boolean;
  indent?: boolean;
  tone?: "ok" | "warn";
}) {
  return (
    <div className={`flex flex-wrap items-baseline justify-between gap-2 py-2 ${indent ? "pl-4" : ""}`}>
      <dt className={`text-[13px] ${strong ? "text-ink" : "text-ink/75"}`}>
        {label}
        {note && <span className="mt-0.5 block text-[11.5px] text-ink/50">{note}</span>}
      </dt>
      <dd
        className={`font-mono text-[13px] tabular-nums ${
          tone === "warn"
            ? "text-[var(--red-clinical)]"
            : tone === "ok"
              ? "text-[var(--teal)]"
              : strong
                ? "text-ink"
                : "text-ink/75"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Remittance vs cash — two evidence classes.
// ---------------------------------------------------------------------------

const TRACE_LABEL: Record<string, string> = {
  matched: "Trace on both sides, amounts agree",
  matched_amount_differs: "Trace on both sides, amounts differ",
  remit_only: "Payer says paid, no deposit carries the trace",
  bank_only: "Money arrived, no remittance explains it",
  ambiguous_duplicate_deposit: "Several deposits share one trace",
};

function Traces({ traces }: { traces: TraceSummaryRow[] }) {
  if (!traces.length) return null;
  return (
    <section className={CARD}>
      <p className={LABEL}>Remittance vs cash</p>
      <h2 className="font-display mt-2 text-xl text-ink">
        What the payer said, and what the bank shows.
      </h2>
      <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink/70">
        These are two separate classes of evidence. A remittance is the payer's
        account of itself. A deposit is money. Neither proves the other; the EFT
        trace is the only thing that joins them, and where it is absent the row
        stays visibly unjoined.
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-ink/12 text-ink/55">
              <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.12em]">State</th>
              <th className="py-2 pr-3 text-right font-mono text-[10px] uppercase tracking-[0.12em]">Traces</th>
              <th className="py-2 pr-3 text-right font-mono text-[10px] uppercase tracking-[0.12em]">On remittance</th>
              <th className="py-2 pr-3 text-right font-mono text-[10px] uppercase tracking-[0.12em]">In bank</th>
              <th className="py-2 text-right font-mono text-[10px] uppercase tracking-[0.12em]">Variance</th>
            </tr>
          </thead>
          <tbody>
            {traces.map((t) => (
              <tr key={t.trace_state} className="border-b border-ink/8">
                <td className="py-2 pr-3 text-ink/85">
                  {TRACE_LABEL[t.trace_state] ?? t.trace_state}
                </td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums text-ink/75">
                  {formatValue(t.traces, "count")}
                </td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums text-ink/75">
                  {cents(t.remit_paid_cents)}
                </td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums text-ink/75">
                  {cents(t.deposit_cents)}
                </td>
                <td
                  className={`py-2 text-right font-mono tabular-nums ${
                    t.variance_cents === 0 ? "text-ink/45" : "text-[var(--gold)]"
                  }`}
                >
                  {cents(t.variance_cents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 5. Repairs, rejects, elections.
// ---------------------------------------------------------------------------

function Judgements({
  repairs,
  rejects,
  config,
}: {
  repairs: { rule: string; field: string; row_count: number }[];
  rejects: Record<string, unknown>[];
  config: { key: string; value: string; definition: string; status: string; source: string }[];
}) {
  const [tab, setTab] = useState<"repairs" | "rejects" | "elections">("elections");
  const tabs: { id: typeof tab; label: string; count: number }[] = [
    { id: "elections", label: "Declared elections", count: config.length },
    { id: "repairs", label: "Repairs made", count: repairs.reduce((s, r) => s + r.row_count, 0) },
    { id: "rejects", label: "Rows parked", count: rejects.length },
  ];

  return (
    <section className={CARD}>
      <p className={LABEL}>Judgement calls</p>
      <h2 className="font-display mt-2 text-xl text-ink">
        Every decision the loader made, on the record.
      </h2>
      <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink/70">
        Normalising a currency string is allowed. Doing it silently is not. Each
        repair keeps the original text beside the normalised one; each parked row
        keeps its reason; each load-bearing choice is stated as an election with
        an author, not buried as a constant.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full border px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.11em] ${
              tab === t.id
                ? "border-ink/45 bg-ink/[0.05] text-ink"
                : "border-ink/18 text-ink/55 hover:text-ink/80"
            }`}
          >
            {t.label} · {formatValue(t.count, "count")}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "elections" && (
          <ul className="space-y-3">
            {config.map((c) => (
              <li key={c.key} className="border-l-2 border-[var(--gold)]/40 pl-3">
                <p className="font-mono text-[11px] text-ink/80">
                  {c.key} = {c.value}
                  <span className="ml-2 rounded-full border border-ink/20 px-1.5 py-[1px] text-[9.5px] uppercase tracking-[0.1em] text-ink/55">
                    {c.status}
                  </span>
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink/70">{c.definition}</p>
              </li>
            ))}
          </ul>
        )}

        {tab === "repairs" &&
          (repairs.length ? (
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-ink/12 text-ink/55">
                  <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.12em]">Rule</th>
                  <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.12em]">Field</th>
                  <th className="py-2 text-right font-mono text-[10px] uppercase tracking-[0.12em]">Rows</th>
                </tr>
              </thead>
              <tbody>
                {repairs.map((r) => (
                  <tr key={`${r.rule}-${r.field}`} className="border-b border-ink/8">
                    <td className="py-2 pr-3 font-mono text-[11px] text-ink/80">{r.rule}</td>
                    <td className="py-2 pr-3 font-mono text-[11px] text-ink/70">{r.field}</td>
                    <td className="py-2 text-right font-mono tabular-nums text-ink/75">
                      {formatValue(r.row_count, "count")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="font-mono text-[12px] text-ink/55">
              No repairs were needed. Every field arrived in the shape the contract expects.
            </p>
          ))}

        {tab === "rejects" &&
          (rejects.length ? (
            <ul className="space-y-2">
              {rejects.map((r, i) => (
                <li key={i} className="border-l-2 border-[var(--red-clinical)]/40 pl-3">
                  <p className="font-mono text-[11px] text-ink/80">
                    {String(r["source_key"])} · row {String(r["row_index"])} — {String(r["reason"])}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] break-all text-ink/45">
                    {String(r["payload"] ?? "")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-mono text-[12px] text-ink/55">
              No rows were parked. Every row in every file reached staging.
            </p>
          ))}
      </div>
    </section>
  );
}
