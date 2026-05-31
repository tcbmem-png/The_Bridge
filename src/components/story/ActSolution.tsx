import { CONFIG } from "../../config";
import { SectionTag } from "./SectionTag";
import { useReveal } from "../../lib/useReveal";

const pillars = [
  {
    name: "Collaborate",
    line: "Ordering-side support in the ED and radiologist-led appropriateness. Accurate indication capture — so the fall that shouldn't be scanned, isn't. Voluntary decision-support, which CMS now encourages, future-proofs the group if AUC returns.",
  },
  {
    name: "Quantify",
    line: "A shared fact base both sides trust. The dashboard, jointly owned, so nobody argues about whose numbers are right.",
  },
  {
    name: "Structure",
    line: "Any coverage arrangement built fair-market-value and anti-kickback clean from day one. Compliance is the foundation, not an afterthought.",
  },
];

// Illustrative sample numbers — clearly not measured.
// TODO: wire these tiles to the Sandbox shared state in a later pass.
const wins = [
  {
    value: "$2.6M",
    unit: "",
    label: "TO THE GROUP / YR",
    tone: "gold" as const,
  },
  {
    value: "$1.4M",
    unit: "",
    label: "TO THE HOSPITAL / YR",
    tone: "gold" as const,
  },
  {
    value: "144,000",
    unit: "",
    label: "FEWER NEEDLESS SCANS / YR",
    tone: "teal" as const,
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
