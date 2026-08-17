// The pilot-preparation artifact, on screen and on paper.
//
// Same engine as the readiness report; this view only renders it. Print and
// Markdown download are the two exports — no PDF dependency.

import { useMemo, useState } from "react";
import {
  buildPilotPlan,
  renderPilotPlanMarkdown,
  UNPRICED,
  type PilotPlan,
} from "../../lib/intake/pilotPlan";
import type { CustodyEntry } from "../../lib/intake/custody";
import type { PracticeConfig } from "../../lib/intake/config";

const NAME_KEY = "bridge.practice-name.v1";

function loadName(): string {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(NAME_KEY) ?? "";
}

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #pilot-plan, #pilot-plan * { visibility: visible !important; }
  #pilot-plan { position: absolute; inset: 0; margin: 0; padding: 0; }
  .no-print { display: none !important; }
}
`;

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink/50">{label}</p>
      <div className="mt-1 max-w-[70ch] text-[13.5px] leading-snug text-ink/80">{children}</div>
    </div>
  );
}

export function PilotPlanExport({
  entries,
  cfg,
}: {
  entries: CustodyEntry[];
  cfg: PracticeConfig;
}) {
  const [name, setName] = useState<string>(() => loadName());
  const [showCustody, setShowCustody] = useState(false);

  const plan: PilotPlan = useMemo(
    () => buildPilotPlan({ custody: entries, cfg, practiceName: name }),
    [entries, cfg, name],
  );

  const updateName = (v: string) => {
    setName(v);
    try {
      sessionStorage.setItem(NAME_KEY, v);
    } catch {
      /* session storage unavailable — the name stays in memory */
    }
  };

  const download = () => {
    const md = renderPilotPlanMarkdown(plan);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bridge-review-prep-${plan.generatedAt.slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mt-12 border-t border-ink/15 pt-6">
      <style>{PRINT_CSS}</style>

      <div className="no-print flex flex-wrap items-end gap-3">
        <label className="text-[12px] text-ink/65">
          <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-ink/50">
            Practice name (optional)
          </span>
          <input
            value={name}
            onChange={(e) => updateName(e.target.value)}
            placeholder="Leave blank until it is known"
            className="mt-1 w-[28ch] rounded-md border border-ink/20 bg-transparent px-2 py-1 text-[13px]"
          />
        </label>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border border-ink/20 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink/70 hover:text-ink"
        >
          Print
        </button>
        <button
          type="button"
          onClick={download}
          className="rounded-md border border-ink/20 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink/70 hover:text-ink"
        >
          Download markdown
        </button>
      </div>

      <article id="pilot-plan" className="mt-6">
        <h2 className="font-display text-[26px] leading-tight">{plan.title}</h2>
        <p className="mt-1 font-mono-tab text-[11px] text-ink/55">
          Generated {plan.generatedAt} · {plan.stageLabel}
        </p>

        <h3 className="mt-7 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55">
          Bring what you already have
        </h3>
        <ul className="mt-2 max-w-[64ch] text-[13.5px] leading-relaxed text-ink/80">
          {plan.bring.map((b) => (
            <li key={b} className="flex gap-2 py-[3px]">
              <span className="font-mono text-ink/40">□</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 max-w-[64ch] text-[14px] font-medium">{plan.bringNote}</p>
        <p className="mt-2 max-w-[64ch] text-[13px] leading-relaxed text-ink/70">
          {plan.bringSupport}
        </p>

        <h3 className="mt-7 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55">
          Questions we will ask
        </h3>
        <ol className="mt-2 max-w-[64ch] list-decimal pl-5 text-[13.5px] leading-relaxed text-ink/80">
          {plan.questions.map((q) => (
            <li key={q} className="py-[2px]">
              {q}
            </li>
          ))}
        </ol>

        {!plan.generic && (
          <>
            <h3 className="mt-7 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55">
              What you already provided
            </h3>
            <ul className="mt-2 font-mono-tab text-[12px] text-ink/75">
              {plan.provided.map((p) => (
                <li key={p.fileName} className="py-[2px]">
                  {p.fileName} — {p.sourceClass}
                </li>
              ))}
            </ul>

            <h3 className="mt-7 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55">
              What the Bridge can establish
            </h3>
            <ul className="mt-2 max-w-[68ch] text-[13px] leading-snug text-ink/80">
              {plan.establishes.length === 0 ? (
                <li>Nothing yet from the sources loaded.</li>
              ) : (
                plan.establishes.map((e, i) => (
                  <li key={i} className="py-[2px]">
                    · {e}
                  </li>
                ))
              )}
            </ul>

            <h3 className="mt-7 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55">
              What remains a gap
            </h3>
            <ul className="mt-2 max-w-[68ch] text-[13px] leading-snug text-ink/70">
              {plan.gaps.length === 0 ? (
                <li>No open gap.</li>
              ) : (
                plan.gaps.map((g, i) => (
                  <li key={i} className="py-[2px]">
                    · {g}
                  </li>
                ))
              )}
            </ul>
          </>
        )}

        <h3 className="mt-7 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55">
          What source would close the next gap
        </h3>
        {plan.nextSource ? (
          <div className="mt-2 rounded-lg border border-ink/15 p-4">
            <p className="font-display text-[18px]">{plan.nextSource.source}</p>
            <Block label="Why we need it">{plan.nextSource.why}</Block>
            <Block label="What question it would answer">{plan.nextSource.answers}</Block>
            <Block label="Current amount at issue">
              <span className="font-mono-tab">{plan.nextSource.amountAtIssue ?? UNPRICED}</span>
            </Block>
            <Block label="How to ask for it">{plan.nextSource.howToAsk}</Block>
            <p className="mt-3 font-mono-tab text-[11px] text-ink/55">
              Held by {plan.nextSource.heldBy} · {plan.nextSource.stageLabel}
            </p>
          </div>
        ) : (
          <p className="mt-2 max-w-[64ch] text-[13.5px] text-ink/80">
            Every rung has its required sources. No further source is needed.
          </p>
        )}

        {plan.notYetRequired.length > 0 && (
          <>
            <h3 className="mt-7 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55">
              Not yet required
            </h3>
            <ul className="mt-2 text-[13px] text-ink/65">
              {plan.notYetRequired.map((s) => (
                <li key={s} className="py-[2px]">
                  • {s}
                </li>
              ))}
            </ul>
          </>
        )}

        <h3 className="mt-7 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55">
          For the next meeting
        </h3>
        <p className="mt-2 max-w-[64ch] text-[14px] leading-relaxed">{plan.forNextMeeting}</p>

        {plan.custody.length > 0 && (
          <div className="mt-8 border-t border-ink/12 pt-4">
            <button
              type="button"
              onClick={() => setShowCustody((v) => !v)}
              className="no-print font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink/55 hover:text-ink"
            >
              {showCustody ? "Hide" : "Show"} appendix — source custody
            </button>
            <div className={showCustody ? "" : "hidden print:block"}>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/50">
                Appendix — source custody
              </p>
              <table className="mt-2 w-full font-mono-tab text-[11px] text-ink/70">
                <thead className="text-ink/45">
                  <tr>
                    <th className="py-1 text-left">File</th>
                    <th className="py-1 text-left">Source class</th>
                    <th className="py-1 text-left">SHA-256</th>
                    <th className="py-1 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.custody.map((c) => (
                    <tr key={c.fileName + c.sha256} className="border-t border-ink/10">
                      <td className="py-1 pr-3">{c.fileName}</td>
                      <td className="py-1 pr-3">{c.sourceClass}</td>
                      <td className="py-1 pr-3" title={c.sha256}>
                        {c.shortSha}
                      </td>
                      <td className="py-1">{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}
