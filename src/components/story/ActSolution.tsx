import { SectionTag } from "./SectionTag";
import { useReveal } from "../../lib/useReveal";
import { useMoney } from "../../lib/money/store";
import { fmtCount, fmtMoney } from "../../lib/money/format";
import { CountUp } from "../sandbox/CountUp";

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

// Win-row reads from the shared money-model store. One model, one set of numbers,
// consumed here and in the Sandbox.
export function ActSolution() {
  const ref = useReveal<HTMLDivElement>();
  const { derived } = useMoney();

  const wins: Array<{
    value: number;
    format: (n: number) => string;
    label: string;
    tone: "gold" | "teal";
  }> = [
    {
      value: derived.group_gain_per_year_$,
      format: fmtMoney,
      label: "TO THE GROUP / YR",
      tone: "gold",
    },
    {
      value: derived.hospital_gain_per_year_$,
      format: fmtMoney,
      label: "TO THE HOSPITAL / YR",
      tone: "gold",
    },
    {
      value: derived.fewer_needless_scans_per_year,
      format: fmtCount,
      label: "FEWER NEEDLESS SCANS / YR",
      tone: "teal",
    },
  ];

  const toneText: Record<"gold" | "teal", string> = {
    gold: "text-[var(--gold-2)]",
    teal: "text-[var(--teal)]",
  };

  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
        <div ref={ref} className="reveal">
          <SectionTag tone="gold">The Solution · The fall, removed</SectionTag>
          <h2 className="font-display mt-5 max-w-3xl text-[2rem] leading-[1.1] md:text-[3rem]">
            Everyone earns more by removing waste.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink/75">
            Not a negotiation. Not 'we have better numbers, so renegotiate.' It's the hospital and the group both adapting to the new reality — where all parties earn more by cutting waste, in full legal compliance. Fewer unnecessary unpaid scans, faster throughput, and capturing the reads that are payable.
          </p>
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

        {/* Win-row — wired to the shared money-model store. */}
        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3">
          {wins.map((w) => (
            <div
              key={w.label}
              className="rounded-lg border border-ink bg-ink p-6 text-paper"
            >
              <div className={`font-mono-tab text-4xl leading-none ${toneText[w.tone]}`}>
                <CountUp value={w.value} format={w.format} />
              </div>
              <p className="font-mono-tab mt-3 text-[11px] uppercase tracking-[0.12em] text-paper/65">
                {w.label}
              </p>
            </div>
          ))}
        </div>

        <p className="font-mono-tab mt-6 text-[10.5px] uppercase tracking-[0.12em] text-ink/45">
          Illustrative sample data. Tune the inputs in The Sandbox.
        </p>
      </div>
    </section>
  );
}
