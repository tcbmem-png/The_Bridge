import { useEffect, useState } from "react";
import { cashTieout } from "../../../harness/runtime/queries";
import { Panel } from "./SegmentMonthly";

export function CashTieout() {
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    cashTieout()
      .then((r) => setRows(r))
      .catch((e) => setErr(String(e?.message ?? e)));
  }, []);

  return (
    <Panel
      letter="B"
      title="Cash tie-out"
      query="SELECT * FROM recon.cash_tieout"
      pill={
        rows === null
          ? { state: "pending", label: "Running…" }
          : rows.length === 0
            ? { state: "pass", label: "0 rows · 835 = bank" }
            : { state: "fail", label: `${rows.length} variance row(s)` }
      }
      error={err}
    >
      {rows && rows.length === 0 ? (
        <p className="text-sm text-ink/70">
          Every 835 EFT trace ties to its bank deposit. The view returns only
          variance rows; an empty result is the pass condition.
        </p>
      ) : rows ? (
        <table className="w-full font-mono text-[12px] tabular-nums">
          <thead className="text-ink/60">
            <tr className="border-b border-ink/10">
              {Object.keys(rows[0]).map((k) => (
                <th key={k} className="py-1.5 text-left font-medium">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-ink/5">
                {Object.values(r).map((v, j) => (
                  <td key={j} className="py-1.5">
                    {String(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </Panel>
  );
}
