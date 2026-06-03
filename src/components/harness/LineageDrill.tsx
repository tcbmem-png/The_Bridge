import { useEffect, useMemo, useState } from "react";
import {
  erMonths,
  lineageForMonth,
  erCollectionsForMonth,
} from "../../../harness/runtime/queries";
import { Panel } from "./SegmentMonthly";

type Row = {
  claim_id: string;
  line_number: number | string;
  dos: string;
  pos_code: string;
  cpt_code: string;
  rendering_npi: string;
  payer_id: string;
  financial_class: string | null;
  work_rvu: number | string | null;
  charge_amount: number | string;
  paid_amount: number | string;
  carc_codes: string | null;
  check_eft_trace: string | null;
  src_837_file: string | null;
  src_837_hash: string | null;
  src_835_file: string | null;
  src_835_hash: string | null;
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

export function LineageDrill() {
  const [months, setMonths] = useState<string[]>([]);
  const [month, setMonth] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [expected, setExpected] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    erMonths()
      .then((r) => {
        const ms = r.map((x) => String(x.service_month).slice(0, 10));
        setMonths(ms);
        if (ms.length && !month) setMonth(ms[0]);
      })
      .catch((e) => setErr(String(e?.message ?? e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!month) return;
    setRows(null);
    setExpected(null);
    Promise.all([lineageForMonth(month), erCollectionsForMonth(month)])
      .then(([lines, expRows]) => {
        setRows(lines as unknown as Row[]);
        const v = expRows[0]?.collections;
        setExpected(v === null || v === undefined ? null : Number(v));
      })
      .catch((e) => setErr(String(e?.message ?? e)));
  }, [month]);

  const actual = useMemo(
    () => (rows ? rows.reduce((acc, r) => acc + Number(r.paid_amount), 0) : null),
    [rows],
  );

  const tieOk =
    actual !== null && expected !== null && Math.abs(actual - expected) < 0.005;

  return (
    <Panel
      title="Lineage drill"
      query="SELECT … FROM core.fact_service_line WHERE segment='ER' AND date_trunc('month', dos) = :p_month"
      pill={
        rows === null
          ? { state: "pending", label: "Running…" }
          : tieOk
            ? { state: "pass", label: "Σ paid = segment_monthly.collections" }
            : { state: "fail", label: "Drill does not tie" }
      }
      error={err}
    >
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="text-sm text-ink/70">ER month</label>
        <select
          className="rounded-md border border-ink/20 bg-paper px-2 py-1 font-mono text-[12px]"
          value={month ?? ""}
          onChange={(e) => setMonth(e.target.value)}
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <span className="font-mono text-[11px] text-ink/55">
          parameterized as $1; canonical SQL untouched on disk.
        </span>
      </div>

      {rows && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-[11px] tabular-nums">
              <thead className="text-ink/60">
                <tr className="border-b border-ink/10">
                  <th className="py-1.5 text-left font-medium">Claim</th>
                  <th className="py-1.5 text-left font-medium">Line</th>
                  <th className="py-1.5 text-left font-medium">DOS</th>
                  <th className="py-1.5 text-left font-medium">POS</th>
                  <th className="py-1.5 text-left font-medium">CPT</th>
                  <th className="py-1.5 text-left font-medium">Payer</th>
                  <th className="py-1.5 text-right font-medium">wRVU</th>
                  <th className="py-1.5 text-right font-medium">Charge</th>
                  <th className="py-1.5 text-right font-medium">Paid</th>
                  <th className="py-1.5 text-left font-medium">EFT</th>
                  <th className="py-1.5 text-left font-medium">837 file</th>
                  <th className="py-1.5 text-left font-medium">835 file</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-ink/5">
                    <td className="py-1.5">{r.claim_id}</td>
                    <td className="py-1.5">{r.line_number}</td>
                    <td className="py-1.5">{String(r.dos).slice(0, 10)}</td>
                    <td className="py-1.5">{r.pos_code}</td>
                    <td className="py-1.5">{r.cpt_code}</td>
                    <td className="py-1.5">{r.payer_id}</td>
                    <td className="py-1.5 text-right">{fmt(r.work_rvu, 4)}</td>
                    <td className="py-1.5 text-right">{fmt(r.charge_amount)}</td>
                    <td className="py-1.5 text-right">{fmt(r.paid_amount)}</td>
                    <td className="py-1.5">{r.check_eft_trace ?? "—"}</td>
                    <td className="py-1.5" title={r.src_837_hash ?? ""}>
                      {r.src_837_file ?? "—"}
                    </td>
                    <td className="py-1.5" title={r.src_835_hash ?? ""}>
                      {r.src_835_file ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 border-t border-ink/10 pt-3 font-mono text-[12px] tabular-nums">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-ink/70">Σ paid_amount (drilled rows)</span>
              <span>{fmt(actual)}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-ink/70">
                core.segment_monthly.collections ('ER', {month})
              </span>
              <span>{fmt(expected)}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <span className="text-ink/70">Variance</span>
              <span className={tieOk ? "text-teal" : "text-red-clinical"}>
                {actual !== null && expected !== null
                  ? fmt(actual - expected, 4)
                  : "—"}
              </span>
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}
