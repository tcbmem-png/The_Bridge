import type { Answers, Spec } from "../../lib/engine/types";

type Props = {
  answers: Answers;
  spec: Spec;
};

function foundationCount(a: Answers): { have: number; of: number; items: string[] } {
  const items: string[] = [];
  if (a.mpower === "used" || a.mpower === "unused") items.push("mPower");
  if (a.warehouse === "yes") items.push("warehouse");
  if (a.bi_tool && a.bi_tool !== "none")
    items.push(a.bi_tool === "power_bi" ? "Power BI" : "Tableau");
  if (a.analyst === "yes") items.push("analyst");
  return { have: items.length, of: 4, items };
}

const STATUS_DOT: Record<string, string> = {
  live: "bg-[var(--teal)]",
  pending_source: "bg-[var(--gold-2)]",
  pending_compliance: "bg-[var(--red-clinical)]",
};

const STATUS_LABEL: Record<string, string> = {
  live: "live",
  pending_source: "pending — source",
  pending_compliance: "pending — compliance",
};

export function BuildPlan({ answers, spec }: Props) {
  const liveCount = spec.panels.filter((p) => p.status === "live").length;
  const foundation = foundationCount(answers);
  const pct = (foundation.have / foundation.of) * 100;

  return (
    <div className="rounded-xl border border-ink/15 bg-paper p-5 md:p-6">
      <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
        Live build plan
      </div>

      {/* Foundation meter */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <div className="text-sm text-ink/80">Foundation already in place</div>
          <div className="font-mono-tab text-sm text-ink">
            {foundation.have} / {foundation.of}
          </div>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full bg-[var(--teal)] transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="font-mono-tab mt-2 text-[10.5px] uppercase tracking-[0.12em] text-ink/45">
          {foundation.items.length ? foundation.items.join(" · ") : "Confirm tools to credit"}
        </div>
      </div>

      {/* Sources */}
      <div className="mt-6">
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
          Sources
        </div>
        <ul className="mt-3 space-y-3">
          {spec.sources.map((s) => (
            <li key={s.key} className="rounded-md border border-ink/15 bg-paper p-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-sm font-medium text-ink">{s.name}</div>
                <div
                  className={[
                    "font-mono-tab text-[10px] uppercase tracking-[0.12em]",
                    s.ready ? "text-[var(--teal)]" : "text-[var(--red-clinical)]",
                  ].join(" ")}
                >
                  {s.ready ? "ready" : "blocked"} · lead {s.lead.replace(/_/g, " ")}
                </div>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink/70">{s.route}</p>
              <p className="mt-1 font-mono-tab text-[10.5px] text-ink/55">
                access: {s.accessNeeded}
              </p>
              {s.note ? (
                <p className="mt-1 text-[11px] italic text-ink/55">{s.note}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {/* Tier */}
      <div className="mt-6">
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
          Build tier
        </div>
        <div className="mt-2 rounded-md border border-ink/15 bg-paper p-3">
          <div className="font-display text-lg">{spec.storageTier.tier}</div>
          <p className="mt-1 text-xs leading-relaxed text-ink/75">
            {spec.storageTier.description}
          </p>
          <p className="mt-1 text-[11px] italic text-ink/55">
            {spec.storageTier.effortNote}
          </p>
        </div>
      </div>

      {/* Compliance */}
      <div className="mt-6">
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
          Compliance
        </div>
        <div
          className={[
            "mt-2 rounded-md border p-3",
            spec.compliance.cleared
              ? "border-[var(--teal)]/40 bg-paper"
              : "border-[var(--red-clinical)]/40 bg-paper",
          ].join(" ")}
        >
          <div className="font-mono-tab text-xs uppercase tracking-[0.12em]">
            {spec.compliance.cleared
              ? "Cleared — real data permitted."
              : "Not cleared — illustrative only until gates close."}
          </div>
          {spec.compliance.gates.length ? (
            <ul className="mt-2 space-y-1 text-xs text-ink/75">
              {spec.compliance.gates.map((g) => (
                <li key={g}>· {g}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {/* Panel count */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
            Panels live
          </div>
          <div className="font-mono-tab text-2xl text-ink">
            {liveCount} <span className="text-ink/45 text-lg">/ 8</span>
          </div>
        </div>
        <ul className="mt-3 space-y-1.5 text-xs">
          {spec.panels.map((p) => (
            <li key={p.key} className="flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[p.status]}`} />
              <span className="text-ink/80">{p.name}</span>
              <span className="font-mono-tab ml-auto text-[10px] uppercase tracking-[0.1em] text-ink/50">
                {STATUS_LABEL[p.status]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Flags */}
      {spec.flags.length ? (
        <div className="mt-6">
          <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
            Flags
          </div>
          <ul className="mt-2 space-y-1 text-xs text-ink/75">
            {spec.flags.map((f) => (
              <li key={f}>· {f}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Timeline */}
      <div className="mt-6">
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
          Timeline
        </div>
        <p className="mt-1 text-sm text-ink/80">{spec.timelineBand}</p>
      </div>
    </div>
  );
}
