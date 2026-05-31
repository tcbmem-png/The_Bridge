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
              This is the shape of the modern radiology partnership. A physician group reads for a hospital system under contract. The hospital mandates emergency, trauma, and overnight coverage. Payer mix means a large share of that volume never collects — and the group eats the labor on every read regardless. <strong>If the hospital isn't paid, neither is the group.</strong>
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

        <div className="mt-12">
          <p className="text-base leading-relaxed text-ink/85">
            The old fear was that AI would replace radiologists. The opposite happened. AI made reading faster but concentrated the radiologist's real value in diagnosis, communication, and procedures — while imaging demand exploded and radiology became the bottleneck. Groups are more valuable now, not less. Yet they're still structurally underpaid for the mandated coverage that doesn't collect.
          </p>
        </div>

        <div className="mt-6 rounded-lg border-l-2 border-[var(--teal)] bg-paper p-5 md:p-6">
          <p className="text-base leading-relaxed text-ink/85">
            There was one federal lever that could have curbed unnecessary ordering — Medicare's Appropriate Use Criteria program, which required ordering clinicians to consult decision-support before advanced imaging. Effective January 2024, CMS paused it and rescinded the regulations, with no restart date. It's statutorily mandated, so it could return — but for now there's no regulatory brake on over-ordering. The fix can't wait for Washington; it has to be operational.
          </p>
          <p className="mt-3 text-sm text-ink/55">
            <a
              href="https://www.cms.gov/medicare/quality/appropriate-use-criteria-program"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 decoration-ink/25 hover:decoration-ink/60 transition-colors"
            >
              Source: CMS Appropriate Use Criteria Program
            </a>
          </p>
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
                A patient arrives, coded '<strong>fall</strong>.' That one word reflexively unlocks a head and C-spine CT — often low-yield, frequently uncollectible. Watch that single scan travel through all three stages. It's the whole story in miniature.
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
