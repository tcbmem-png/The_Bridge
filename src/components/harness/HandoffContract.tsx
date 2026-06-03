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

  // Observed yields across mature months — wRVU-weighted, not row mean.
  // This is what the calculator handoff would actually read.
  let erY: number | null = null;
  let neY: number | null = null;
  if (mature.length) {
    let erW = 0, erC = 0, neW = 0, neC = 0;
    for (const r of mature) {
      erW += Number(r.er_wrvu) || 0;
      erC += Number(r.er_collections) || 0;
      neW += Number(r.non_er_wrvu) || 0;
      neC += Number(r.non_er_collections) || 0;
    }
    erY = erW > 0 ? erC / erW : null;
    neY = neW > 0 ? neC / neW : null;
  }
  const fmtY = (n: number | null) => (n === null ? "—" : `$${n.toFixed(2)}`);
  const haveMature = mature.length > 0 && erY !== null && neY !== null;

  return (
    <Panel
      title="Handoff contract — core.er_yield_period"
      query="SELECT er_yield, non_er_yield, er_wrvu, non_er_wrvu, is_mature FROM core.er_yield_period"
      pill={
        rows === null
          ? { state: "pending", label: "Running…" }
          : haveMature
            ? { state: "pass", label: `Observed · ER ${fmtY(erY)} · non-ER ${fmtY(neY)} · ${mature.length} mature mo.` }
            : rows.length > 0
              ? { state: "fail", label: "No mature months yet" }
              : { state: "fail", label: "No period rows loaded" }
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
