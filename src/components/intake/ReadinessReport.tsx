import type { ReadinessReport as Report } from "../../lib/intake/readiness";
import { ProvenanceStamp } from "../record/ProvenanceStamp";

const OBTAIN_LABEL: Record<string, string> = {
  self_serve: "self-serve",
  vendor_request: "by vendor request",
  contested: "asked before, not received",
  unavailable: "not available",
  unknown: "availability not yet stated",
};

export function ReadinessReport({ report }: { report: Report }) {
  const { foundation, established, tangled, recommendation, stages, configProgress } = report;

  return (
    <section className="mt-10">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55">
        Readiness
      </h3>

      <p className="mt-3 max-w-[62ch] font-display text-[19px] leading-snug">
        {foundation.caption}
      </p>
      <p className="mt-1 font-mono-tab text-[11px] text-ink/55">
        {configProgress.domain.answered}/{configProgress.domain.total} domain elections ·{" "}
        {configProgress.technical.answered}/{configProgress.technical.total} source
        availabilities stated
      </p>

      {/* The ladder */}
      <ol className="mt-5">
        {stages.map((row) => (
          <li key={row.stage.id} className="border-t border-ink/12 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono-tab text-[11px] text-ink/45">
                Stage {row.stage.n}
              </span>
              <span className="font-display text-[16px]">{row.stage.label}</span>
              <span
                className={`rounded-full border px-2 py-[2px] font-mono text-[9.5px] uppercase tracking-[0.11em] ${
                  row.status === "available"
                    ? "border-[var(--teal)]/45 text-[var(--teal)]"
                    : row.status === "partial"
                      ? "border-[var(--gold)]/50 text-[var(--gold)]"
                      : "border-ink/25 border-dashed text-ink/50"
                }`}
              >
                {row.status.replace("_", " ")}
              </span>
            </div>
            {row.missingRequired.length > 0 && (
              <p className="mt-1 font-mono-tab text-[11.5px] text-ink/60">
                missing required: {row.missingRequired.join(", ")}
              </p>
            )}
            <p className="mt-1 max-w-[64ch] text-[12.5px] leading-snug text-ink/65">
              {row.stage.closesOn}
            </p>
          </li>
        ))}
      </ol>

      {/* Established */}
      <h4 className="mt-8 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink/45">
        What these sources establish
      </h4>
      {established.length === 0 ? (
        <p className="mt-2 max-w-[62ch] text-sm text-ink/65">
          Nothing yet. No rung has its required sources, so the record asserts nothing.
        </p>
      ) : (
        <ul className="mt-2">
          {established.map((l, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-2 border-t border-ink/10 py-2">
              <ProvenanceStamp type={l.provenance} />
              <span className="max-w-[58ch] text-[13.5px] text-ink">{l.text}</span>
              <span className="font-mono-tab text-[11px] text-ink/45">
                rests on {l.restsOn.join(", ")}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Tangled */}
      <h4 className="mt-8 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink/45">
        What remains tangled
      </h4>
      <ul className="mt-2">
        {tangled.map((l, i) => (
          <li key={i} className="flex flex-wrap items-baseline gap-2 border-t border-ink/10 py-2">
            <ProvenanceStamp type={l.provenance} />
            <span className="max-w-[58ch] text-[13.5px] text-ink/80">{l.text}</span>
            <span className="font-mono-tab text-[11px] text-ink/45">
              closes on {l.restsOn.join(", ")}
            </span>
          </li>
        ))}
      </ul>

      {/* Next source */}
      <h4 className="mt-8 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink/45">
        The exact source that closes it
      </h4>
      <p className="mt-2 max-w-[62ch] font-display text-[17px] leading-snug">
        {recommendation.statement}
      </p>
      {recommendation.primary && (
        <p className="mt-1 font-mono-tab text-[11.5px] text-ink/60">
          held by {recommendation.primary.heldBy} ·{" "}
          {OBTAIN_LABEL[recommendation.primary.obtainability]}
        </p>
      )}

      {recommendation.queue.length > 1 && (
        <details className="mt-3">
          <summary className="cursor-pointer font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink/50">
            The rest of the queue, in order
          </summary>
          <ul className="mt-2">
            {recommendation.queue.slice(1).map((r) => (
              <li key={`${r.stage}-${r.sourceKey}`} className="border-t border-ink/10 py-2">
                <span className="font-mono-tab text-[11px] text-ink/45">{r.stageLabel}</span>
                <span className="ml-2 text-[13.5px] text-ink">{r.label}</span>
                <span className="ml-2 font-mono-tab text-[11px] text-ink/45">
                  {OBTAIN_LABEL[r.obtainability]}
                </span>
                <p className="mt-0.5 max-w-[64ch] text-[12.5px] leading-snug text-ink/60">
                  {r.reason}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="mt-8 max-w-[62ch] border-t border-ink/15 pt-4 text-[14px] leading-relaxed text-ink/80">
        {report.narrowerQuestion}
      </p>
    </section>
  );
}
