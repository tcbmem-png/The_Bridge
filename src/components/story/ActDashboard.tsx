import { useMemo } from "react";
import { SectionTag } from "./SectionTag";
import { useReveal } from "../../lib/useReveal";
import { Dashboard } from "../dashboard/Dashboard";
import { generateSpec } from "../../lib/engine/generateSpec";
import type { Answers } from "../../lib/engine/types";

// Representative state for the embedded Story view — same component as Under
// the Hood, fixed to a configuration where every domain is wired. Frames the
// narrative beat: "you're already generating all of this."
const REPRESENTATIVE_ANSWERS: Answers = {
  rcm_owner: "vendor",
  rcm_history: "24_36mo",
  reporting: "ps_one",
  mpower: "used",
  read_loc: "both",
  pacs_ts: "yes",
  bi_tool: "power_bi",
  warehouse: "yes",
  analyst: "yes",
  baa: "yes",
  deid_ok: "yes",
};

export function ActDashboard() {
  const ref = useReveal<HTMLDivElement>();
  const spec = useMemo(() => generateSpec(REPRESENTATIVE_ANSWERS), []);

  return (
    <section className="relative border-b border-ink/15">
      <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
        <div ref={ref} className="reveal">
          <SectionTag tone="teal">The Dashboard · The fall, in numbers</SectionTag>
          <h2 className="font-display mt-5 max-w-3xl text-[2rem] leading-[1.1] md:text-[3rem]">
            You're already generating all of this.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink/75">
            One view. Joined across the systems that already record what
            happened. The number is not new. The seeing is.
          </p>
        </div>

        <div className="mt-12">
          <Dashboard spec={spec} compact />
        </div>

        <p className="font-mono-tab mt-4 text-[10.5px] uppercase tracking-[0.12em] text-ink/45">
          Same component as Under the Hood — here in a representative,
          fully-wired state. Tune the questionnaire there to watch panels flip.
        </p>
      </div>
    </section>
  );
}
