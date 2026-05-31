import { CONFIG } from "../../config";
import { SectionTag } from "./SectionTag";
import { useReveal } from "../../lib/useReveal";

const pillars = [
  {
    name: "Collaborate",
    line: "Put the three parties in the same view. The same report. The same definitions.",
  },
  {
    name: "Quantify",
    line: "Count the reads. Count the claims. Count the gap. Use the systems you already pay for.",
  },
  {
    name: "Structure",
    line: "Move the work from the line item nobody owns to a line item somebody does.",
  },
];

// Illustrative sample numbers — clearly not measured.
const wins = [
  {
    value: "+$3.20",
    unit: "/ exam",
    label: "Revenue recovered per read.",
    tone: "gold" as const,
  },
  {
    value: "−18%",
    unit: "unpaid reads",
    label: "Reads that were absorbed silently.",
    tone: "teal" as const,
  },
  {
    value: `$${((CONFIG.examsPerYear * 3.2) / 1_000_000).toFixed(1)}M`,
    unit: "/ year",
    label: `At ${CONFIG.examsPerYear.toLocaleString()} exams. Illustrative.`,
    tone: "gold" as const,
  },
];

const toneText: Record<"gold" | "teal", string> = {
  gold: "text-[var(--gold-2)]",
  teal: "text-[var(--teal)]",
};

export function ActSolution() {
  const ref = useReveal<HTMLDivElement>();

  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
        <div ref={ref} className="reveal">
          <SectionTag tone="gold">The Solution · The fall, removed</SectionTag>
          <h2 className="font-display mt-5 max-w-3xl text-[2rem] leading-[1.1] md:text-[3rem]">
            Everyone earns more by removing waste.
          </h2>
        </div>

        {/* Pillars */}
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {pillars.map((p, i) => (
            <article
              key={p.name}
              className="rounded-lg border border-ink/20 bg-paper p-6"
            >
              <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
                0{i + 1}
              </div>
              <h3 className="font-display mt-3 text-2xl leading-snug">{p.name}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/75">{p.line}</p>
            </article>
          ))}
        </div>

        {/* Win-row */}
        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3">
          {wins.map((w) => (
            <div
              key={w.label}
              className="rounded-lg border border-ink bg-ink p-6 text-paper"
            >
              <div className="flex items-baseline gap-2">
                <div className={`font-mono-tab text-4xl leading-none ${toneText[w.tone]}`}>
                  {w.value}
                </div>
                <div className="font-mono-tab text-[11px] uppercase tracking-[0.12em] text-paper/65">
                  {w.unit}
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-paper/80">{w.label}</p>
            </div>
          ))}
        </div>

        <p className="font-mono-tab mt-6 text-[10.5px] uppercase tracking-[0.12em] text-ink/45">
          All figures illustrative. Sample data.
        </p>
      </div>
    </section>
  );
}
