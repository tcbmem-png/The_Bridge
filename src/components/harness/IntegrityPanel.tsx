import { useEffect, useState } from "react";
import { Panel } from "./SegmentMonthly";
import { runIntegrityChecks, type IntegrityFinding } from "../../../harness/portal/integrity";

export function IntegrityPanel({ version }: { version: number }) {
  const [findings, setFindings] = useState<IntegrityFinding[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setFindings(null);
    setErr(null);
    runIntegrityChecks()
      .then(setFindings)
      .catch((e) => setErr(String(e?.message ?? e)));
  }, [version]);

  const fails = findings?.filter((f) => f.severity === "fail").length ?? 0;
  const warns = findings?.filter((f) => f.severity === "warn").length ?? 0;
  const pill =
    findings === null
      ? { state: "pending" as const, label: "Running…" }
      : fails > 0
        ? { state: "fail" as const, label: `${fails} failure · ${warns} warning` }
        : warns > 0
          ? { state: "fail" as const, label: `${warns} content gap(s)` }
          : { state: "pass" as const, label: "Content checks pass" };

  return (
    <Panel
      title="Ingestion integrity"
      query="content-level checks against the loaded dataset"
      pill={pill}
      error={err}
    >
      <p className="mb-3 text-sm text-ink/75">
        Shape failures block at the portal. Content gaps load and surface here.
        Real 835/837 ingestion behaves the same way — name what is missing,
        do not refuse the data.
      </p>
      {findings && (
        <ul className="space-y-2">
          {findings.map((f) => (
            <li
              key={f.id}
              className="rounded-md border border-ink/10 bg-paper p-3"
            >
              <div className="flex items-baseline gap-2">
                <span
                  className={
                    f.severity === "ok"
                      ? "text-teal"
                      : f.severity === "warn"
                        ? "text-gold"
                        : "text-red-clinical"
                  }
                >
                  {f.severity === "ok" ? "✓" : f.severity === "warn" ? "!" : "×"}
                </span>
                <span className="font-display text-sm text-ink">{f.label}</span>
              </div>
              <p className="mt-1 font-mono text-[12px] text-ink/70">{f.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
