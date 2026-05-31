import { CONFIG } from "../../config";
import { FallToken } from "../FallToken";
import { Placeholder } from "../Placeholder";
import { SectionTag } from "./SectionTag";
import { useReveal } from "../../lib/useReveal";

type Player = {
  role: string;
  name: string;
  line: string;
};

const players: Player[] = [
  {
    role: "Reads the scans",
    name: CONFIG.groupName,
    line: "Radiologists on call. They produce the report.",
  },
  {
    role: "Owns the floor",
    name: CONFIG.hospitalName,
    line: "Operates the imaging suite. Bills the technical fee.",
  },
  {
    role: "Orders the scans",
    name: CONFIG.edName,
    line: "Emergency physicians under acuity pressure. They decide what gets imaged.",
  },
];

export function ActProblem() {
  const headRef = useReveal<HTMLDivElement>();

  return (
    <section id="act-problem" className="relative border-b border-ink/15">
      <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
        <div ref={headRef} className="reveal">
          <SectionTag tone="red">The Problem · Follow the fall</SectionTag>
          <h2 className="font-display mt-5 max-w-3xl text-[2rem] leading-[1.1] md:text-[3rem]">
            Reading scans nobody pays for — everywhere.
          </h2>
        </div>

        {/* Players row */}
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {players.map((p) => (
            <article
              key={p.name}
              className="flex flex-col gap-3 rounded-lg border border-ink/20 bg-paper p-5"
            >
              <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
                {p.role}
              </div>
              <h3 className="font-display text-2xl leading-snug">{p.name}</h3>
              <p className="text-sm leading-relaxed text-ink/75">{p.line}</p>
            </article>
          ))}
        </div>

        {/* Industry reality */}
        <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="text-lg leading-relaxed text-ink/85">
              Emergency volume runs through imaging. Scans are ordered, acquired,
              and read. The read produces a report, a claim, and a set of
              timestamps. The work happens. The economics of the work go
              unobserved.
            </p>
            <p className="mt-5 text-base leading-relaxed text-ink/70">
              A read without a payer is still a read. The radiologist still
              clears the queue. The hospital still owns the technical fee. The
              ED still moves the patient. The cost of the unpaid read sits on a
              line item nobody owns.
            </p>
          </div>

          <aside className="md:col-span-5">
            <div className="rounded-lg border border-ink/20 bg-paper p-5">
              <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
                Volume, at a glance
              </div>
              <div className="font-mono-tab mt-3 text-3xl text-ink">
                {CONFIG.examsPerYear.toLocaleString()}
              </div>
              <div className="mt-1 text-sm text-ink/70">
                exams read per year across {CONFIG.partnerCount.toLocaleString()} partner sites.
              </div>
              <div className="mt-5 border-t border-ink/15 pt-4">
                <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
                  Sample, not measured
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink/60">
                  All figures shown anywhere in this view are illustrative.
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* AI-reframe placeholder */}
        <div className="mt-12">
          <Placeholder label="AI-reframe copy" />
        </div>

        {/* AUC placeholder */}
        <div className="mt-6">
          <Placeholder label="AUC callout" />
        </div>

        {/* Fall vignette */}
        <div className="relative mt-14 overflow-hidden rounded-xl border border-ink bg-ink p-8 text-paper md:p-12">
          <div className="dot-grid-on-ink absolute inset-0 opacity-50" aria-hidden="true" />
          <div className="relative grid grid-cols-1 gap-8 md:grid-cols-12">
            <div className="md:col-span-9">
              <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.16em] text-paper/55">
                A small vignette
              </div>
              <p className="font-display mt-4 text-[1.75rem] leading-[1.15] text-paper md:text-[2.5rem]">
                The read happens. The dollar falls.
              </p>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-paper/75">
                Nobody catches it because nobody is standing in that part of the
                hallway. The systems each see their own slice. The slice that
                matters sits between them.
              </p>
            </div>
            <div className="relative md:col-span-3">
              <div className="absolute right-2 top-0 flex h-full items-start justify-end pt-1 md:pt-3">
                <FallToken size={18} tone="gold" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
