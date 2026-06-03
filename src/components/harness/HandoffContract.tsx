import { useEffect, useState } from "react";
import { erYieldPeriod } from "../../../harness/runtime/queries";
import { Panel, toIsoDate } from "./SegmentMonthly";

type Row = {
  service_month: string;
  er_wrvu: number | string | null;
  er_collections: number | string | null;
  er_yield: number | string | null;
  non_er_wrvu: number | string | null;
  non_er_collections: number | string | null;
  non_er_yield: number | string | null;
  days_since_period_end: number | string | null;
  is_mature: boolean;
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

export function HandoffContract() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    erYieldPeriod()
      .then((r) => setRows(r as unknown as Row[]))
      .catch((e) => setErr(String(e?.message ?? e)));
  }, []);

  const mature = rows?.filter((r) => r.is_mature) ?? [];
  const pass =
    rows !== null &&
    mature.length > 0 &&
    mature.every((r) => {
      const y_er = Number(r.er_yield);
      const y_ne = Number(r.non_er_yield);
      return Math.abs(y_er - 28) < 0.005 && Math.abs(y_ne - 86) < 0.005;
    });

  return (
    <Panel
      title="Handoff contract — core.er_yield_period"
      query="SELECT er_yield, non_er_yield, er_wrvu, non_er_wrvu, is_mature FROM core.er_yield_period"
      pill={
        rows === null
          ? { state: "pending", label: "Running…" }
          : pass
            ? { state: "pass", label: "ER $28.00 · non-ER $86.00 · mature" }
            : { state: "fail", label: "Contract mismatch" }
      }
      error={err}
    >
      <p className="mb-3 text-sm text-ink/80">
        The only columns that will ever cross to the partner calculator's audited
        path. The calculator reads one mature row.{" "}
        <span className="font-mono text-[11px]">is_mature</span> is driven by{" "}
        <span className="font-mono text-[11px]">ref.harness_config.runout_days</span>{" "}
        (default 120). Wiring is deferred — see{" "}
        <span className="font-mono text-[11px]">docs/calculator-handoff.md</span>.
      </p>
      {rows && (
        <table className="w-full font-mono text-[12px] tabular-nums">
          <thead className="text-ink/60">
            <tr className="border-b border-ink/10">
              <th className="py-1.5 text-left font-medium">Month</th>
              <th className="py-1.5 text-right font-medium">ER wRVU</th>
              <th className="py-1.5 text-right font-medium">ER coll.</th>
              <th className="py-1.5 text-right font-medium">ER $/wRVU</th>
              <th className="py-1.5 text-right font-medium">Non-ER wRVU</th>
              <th className="py-1.5 text-right font-medium">Non-ER coll.</th>
              <th className="py-1.5 text-right font-medium">Non-ER $/wRVU</th>
              <th className="py-1.5 text-right font-medium">Days out</th>
              <th className="py-1.5 text-right font-medium">Mature</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className={`border-b border-ink/5 ${r.is_mature ? "" : "text-ink/45"}`}
              >
                <td className="py-1.5">{toIsoDate(r.service_month)}</td>
                <td className="py-1.5 text-right">{fmt(r.er_wrvu, 4)}</td>
                <td className="py-1.5 text-right">{fmt(r.er_collections)}</td>
                <td className="py-1.5 text-right">{fmt(r.er_yield)}</td>
                <td className="py-1.5 text-right">{fmt(r.non_er_wrvu, 4)}</td>
                <td className="py-1.5 text-right">{fmt(r.non_er_collections)}</td>
                <td className="py-1.5 text-right">{fmt(r.non_er_yield)}</td>
                <td className="py-1.5 text-right">{r.days_since_period_end}</td>
                <td className="py-1.5 text-right">
                  {r.is_mature ? (
                    <span className="text-teal">✓</span>
                  ) : (
                    <span className="text-ink/40">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
