import { useEffect, useState } from "react";
import { volumeTieout } from "../../../harness/runtime/queries";
import { Panel } from "./SegmentMonthly";

type Row = {
  service_month: string;
  ris_exams: number | string;
  billed_accessions: number | string;
  unbilled_gap: number | string;
};

export function VolumeTieout() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    volumeTieout()
      .then((r) => setRows(r as unknown as Row[]))
      .catch((e) => setErr(String(e?.message ?? e)));
  }, []);

  const pass = rows !== null && rows.every((r) => Number(r.unbilled_gap) === 0);

  return (
    <Panel
      letter="C"
      title="Volume tie-out"
      query="SELECT * FROM recon.volume_tieout"
      pill={
        rows === null
          ? { state: "pending", label: "Running…" }
          : pass
            ? { state: "pass", label: "unbilled_gap = 0 every month" }
            : { state: "fail", label: "Unbilled volume detected" }
      }
      error={err}
    >
      {rows && (
        <table className="w-full font-mono text-[12px] tabular-nums">
          <thead className="text-ink/60">
            <tr className="border-b border-ink/10">
              <th className="py-1.5 text-left font-medium">Month</th>
              <th className="py-1.5 text-right font-medium">RIS exams</th>
              <th className="py-1.5 text-right font-medium">Billed accessions</th>
              <th className="py-1.5 text-right font-medium">Unbilled gap</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-ink/5">
                <td className="py-1.5">{toIsoDate(r.service_month)}</td>
                <td className="py-1.5 text-right">{r.ris_exams}</td>
                <td className="py-1.5 text-right">{r.billed_accessions}</td>
                <td className="py-1.5 text-right">{r.unbilled_gap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
