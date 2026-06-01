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

        {/* §3 — "What becomes possible" beat.
            POSTURE: opportunity, not accusation. The join lets you do this.
            Buyer is the hero completing the picture; harness made it visible.
            Moves are theirs — hypotheses the data tests, not instructions.
            COPY BELOW IS PROVISIONAL — final wording is a later tone pass. */}
        <div className="mt-16 border-t border-ink/15 pt-12">
          <SectionTag tone="teal">What becomes possible</SectionTag>
          {/* PROVISIONAL */}
          <h3 className="font-display mt-5 max-w-3xl text-[1.75rem] leading-[1.15] md:text-[2.5rem]">
            Once you can see it, here's what opens up.
          </h3>
          {/* PROVISIONAL */}
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink/75">
            None of this needs new systems or AI. It needs the join — and the join is cheap.
          </p>

          {/* Three move cards — possibility-framed. PROVISIONAL copy. */}
          <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              {
                name: "Found studies",
                line: "Reads completed but never billed, surfaced by joining worklist and billing — recovered dollars into the pool.",
              },
              {
                name: "Underpayments caught",
                line: "Commercial claims paid below contracted rate, flagged against the contract — recovered dollars into the pool.",
              },
              {
                name: "The denial pattern, fixed",
                line: "One CARC, one workflow tweak, one report — recovered dollars into the pool.",
              },
            ].map((m) => (
              <article
                key={m.name}
                className="rounded-lg border border-ink/20 bg-paper p-5"
              >
                <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-[var(--teal)]">
                  possibility
                </div>
                <h4 className="font-display mt-3 text-xl leading-snug">{m.name}</h4>
                <p className="mt-2 text-sm leading-relaxed text-ink/75">{m.line}</p>
              </article>
            ))}
          </div>

          {/* Close into the structural lever. PROVISIONAL copy. */}
          <div className="mt-6 rounded-lg border border-ink bg-ink p-6 text-paper md:p-8">
            <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-paper/55">
              The structural lever
            </div>
            <p className="font-display mt-3 max-w-3xl text-xl leading-snug md:text-2xl">
              And the biggest one isn't a leak — it's getting paid for the coverage you're already required to provide.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-paper/70">
              Because recovered dollars are near-pure margin, they land in the bonus pool — the number a partner feels. The do-first moves build the credibility and the cash to win the structural one.
            </p>
          </div>

          <p className="font-mono-tab mt-4 text-[10.5px] uppercase tracking-[0.12em] text-ink/45">
            Illustrative. The moves are hypotheses the data tests — yours to choose.
          </p>
        </div>
      </div>
    </section>
  );
}
