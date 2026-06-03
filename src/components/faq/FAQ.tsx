import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";

type FAQItem = { q: string; a: ReactNode };
type FAQGroup = { title: string; items: FAQItem[] };

const groups: FAQGroup[] = [

  {
    title: "THE APPROACH",
    items: [
      {
        q: "Is this just another dashboard?",
        a: "No. A dashboard reports what one system already knows. This joins three systems that have never been connected — your billing, your reports, your worklist — into one live picture you can question. Not another report to read; a standing view that answers.",
      },
      {
        q: "How is it different from the BI we already run?",
        a: "Your tools are good, and the more of them you run, the faster this is to build. But each one lives in a single domain — one knows the reads, one knows the money, one knows the timing. None joins all three by site of service, because no vendor owns all three. The value is the join — the one thing nobody sells you.",
      },
      {
        q: "Is this AI?",
        a: "No. It's flat, deterministic code joining data you already generate. No model reasons about a patient, and there's no black box. The logic is checked by an independent test that has to match to the dollar before anything ships.",
      },
      {
        q: "Can we check the numbers ourselves?",
        a: "Yes — that's the point. Every figure opens to the records it came from. If a number looks wrong, you open it and see why. Nothing on the screen is a number you have to take on faith.",
      },
    ],
  },
  {
    title: "THE REAL PROBLEM",
    items: [
      {
        q: "We're working as hard as we ever have, and the numbers are still down. What's going on?",
        a: "The work isn't the problem — the yield on it is. When the same volume of reads brings in less, the cause isn't effort; it's the mix of who's paying and the coverage you're absorbing that nobody's paying for. That's a structural shift, and it has a consequence worth saying plainly: you can't work your way out of it. More reads at a lower yield is just more low-yield reads. The tool exists to show you the structure, so the fix can be aimed at the structure instead of at yourselves.",
      },
      {
        q: "Can't we just get more efficient — clear the low-value scans faster, put AI on the read?",
        a: "Speed is worth having, but it doesn't touch this. A study that won't pay doesn't pay any better for being read faster — you've just reached the same shortfall sooner. Efficiency lowers your cost per read; it does nothing to the yield per read, and yield is what moved. Throughput is the wrong knob for a margin problem. (It's worth knowing where the effort does pay off, though — that's the next answer.)",
      },
      {
        q: "Then isn't the answer to get the emergency department (ED) to stop ordering them, or to code them right?",
        a: "That instinct is closer to the truth than reading faster is — the low-yield, mis-coded order really is where much of this starts. But it isn't a lever you hold. Leaning on the emergency department from the radiology side earns friction, not change, because the ordering isn't yours to govern — it's the hospital's. It moves only when the hospital sees the same picture and decides to act on its own floor. That's not a reason to let it go; it's the reason the numbers have to be shared rather than aimed.",
      },
      {
        q: "We run a tight ship — we reconcile charges and work our denials already. What's left for this to find?",
        a: "If you're genuinely tight, then honestly: not much in the recover-it-now column. We won't pretend to find missed charges that aren't there — and if a tool promises a big recovery number to a clean shop, distrust it. For a tight group that number comes back small, and the small number is the point: it's proof the engine reports what's actually there, not what sells. That's what makes the other number — the one that isn't small — believable. The value here was never finding your mistakes; it's the picture no system you run produces, because they were never built to ask the question.",
      },
      {
        q: "We already get a payer-mix report. Why isn't that enough?",
        a: 'Because "the mix got worse" is true and you still can\'t do anything with it. It turns into a shrug and a thinner bonus nobody can quite explain. What\'s missing isn\'t precision — it\'s an address. Not yield fell, but yield fell on these reads, on this shift, at this site, for this payer. An average is a complaint; a located number is something you can put on a table. And locating it is the one thing your billing and your reports can\'t do by themselves — they know what and how much, never where and when.',
      },
      {
        q: "Which numbers actually need all three feeds, not just two?",
        a: "The ones you can't act on until you know where and when: the after-hours coverage you carry, in dollars, by site, shift, payer, and reading radiologist; the yield gap by location — what a work relative value unit (wRVU) collects on the night and whole-system coverage versus the daytime home base, which is where the loss concentrates; and the ordering signal — low-yield studies tied to who ordered them, where, and for which payer. Each needs billing for the dollars, your reports for the work, and the worklist for the where-and-when. One honest caveat: you can approximate the when from a report timestamp with two feeds. You can't fake the where — site is the piece only the worklist carries, and site is the whole point when one group reads a children's hospital by day and the entire system at night.",
      },
      {
        q: "At year-end our doctors are frustrated and the hospital shrugs. What actually changes that?",
        a: "That standoff is the disease itself. The doctors feel the loss and can't name it; the hospital hears a complaint it can't fix — so the year ends with resentment on one side, indifference on the other, and nothing moves. The numbers that need all three feeds break it on both ends at once. They give the doctors a fixable address instead of a vague decline — here is the specific uncompensated coverage, by shift and site — and they hand the hospital something inside its own house: coverage it directs, ordering it governs. That's the difference between 'not our department' and 'let's talk.' It's the same data the practice already half-keeps to pay its own doctors, pointed for the first time at the one question that gives both sides a reason to sit down.",
      },
    ],
  },
  {
    title: "WHY NOW",
    items: [
      {
        q: "Why does this matter now?",
        a: "The mix of who pays is shifting, and quickly — the 2025 coverage changes are pushing more visits toward self-pay and uninsured. A practice sees that in its own numbers months before it surfaces in national data. The tool puts that change in front of you early enough to act on it.",
      },
      {
        q: "Is this only for radiology?",
        a: "No. It's built for radiology first, but the structure is general — the inputs adapt to a given specialty while the logic and the outputs stay the same. What changes from one practice to the next is the edges, not the engine.",
      },
    ],
  },
  {
    title: "DATA & SAFETY",
    items: [
      {
        q: "What data do you need?",
        a: "To start, only what the group already owns — your billing, your reports, your worklist timestamps. Read-only. Nothing leaves a controlled environment.",
      },
      {
        q: "Is it safe? Where does patient data go?",
        a: "This demonstration contains no patient data at all. Real data moves only behind a signed agreement, into a controlled environment, with patient identifiers scrambled before they ever leave your building. We don't need images, and we don't need report text — only the structured fields.",
      },
      {
        q: "Who owns the output?",
        a: "You do. Your data, your numbers, your view. The join uses what you already have; it doesn't take anything out the door.",
      },
    ],
  },
  {
    title: "BUILD & EFFORT",
    items: [
      {
        q: "How long, and how disruptive?",
        a: "Weeks, not months. The engine is already built and tested — connecting your data is wiring, not invention. The feeds are read-only; nothing gets ripped out or replaced.",
      },
      {
        q: "Do we have to replace our existing tools?",
        a: "No. This sits on top of them and completes them. Keep everything you run.",
      },
    ],
  },
  {
    title: "WHAT YOU GET",
    items: [
      {
        q: "What do we actually get?",
        a: "Two things. First, the money you can recover now — studies that were read but never billed, underpayments, denial patterns you can fix. Second, a shared, defensible picture of what your coverage is actually worth. It won't bill you out of a coverage problem — that's a conversation, not a collection — but it tells you exactly which is which.",
      },
      {
        q: "What if our data is messy?",
        a: "It will be, somewhat — everyone's is. The join itself surfaces the mess: a read with no charge, a charge with no read. That surfacing is often where the first recovered dollar is.",
      },
    ],
  },
  {
    title: "THE HOSPITAL",
    items: [
      {
        q: "What does the hospital get out of this?",
        a: "A shared scoreboard. Faster reads mean faster ED dispositions and less boarding; clearer utilization means fewer low-yield scans; the same denials that cost the group often cost the hospital too. When both sides read one set of numbers, the conversation stops being a contest of impressions and becomes a joint effort to cut waste.",
      },
      {
        q: "Does this pit us against the hospital?",
        a: "The opposite. The point isn't leverage; it's a common picture that makes both sides better. Proving the worth of coverage in numbers everyone trusts is far stronger footing than complaint.",
      },
      {
        q: "What about the data the hospital owns?",
        a: "Some of what matters lives in the hospital's systems. We start with what the group owns, prove the value there, and the hospital-owned join becomes a natural next step once both sides see what it's worth.",
      },
    ],
  },
];

function AccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-ink/15">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-baseline justify-between gap-4 py-4 text-left transition-colors hover:text-ink"
      >
        <span className="font-display text-base leading-snug md:text-lg">
          {question}
        </span>
        <span
          className="font-mono-tab shrink-0 text-xs text-ink/50 transition-transform duration-200"
          aria-hidden="true"
        >
          {isOpen ? "−" : "+"}
        </span>
      </button>
      {isOpen ? (
        <div className="pb-5">
          <p className="max-w-3xl text-sm leading-relaxed text-ink/75">
            {answer}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function FAQ() {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <section className="border-b border-ink/15">
      <div className="mx-auto max-w-4xl px-4 py-20 md:py-28">
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
          FAQ
        </div>
        <h1 className="font-display mt-3 max-w-2xl text-[2rem] leading-[1.1] md:text-[3rem]">
          Questions you're probably asking
        </h1>

        <div className="mt-12 space-y-10">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="font-mono-tab mb-3 text-[10.5px] uppercase tracking-[0.14em] text-ink/45">
                {g.title}
              </div>
              <div className="divide-y divide-ink/10">
                {g.items.map((item) => {
                  const key = `${g.title}::${item.q}`;
                  return (
                    <AccordionItem
                      key={key}
                      question={item.q}
                      answer={item.a}
                      isOpen={openKey === key}
                      onToggle={() =>
                        setOpenKey((prev) => (prev === key ? null : key))
                      }
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="font-mono-tab mt-12 text-[10.5px] uppercase tracking-[0.12em] text-ink/45">
          Illustrative sample data. All figures are replaceable with your own.
        </p>
      </div>
    </section>
  );
}
