import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

export const Route = createFileRoute("/for-counsel")({
  head: () => ({
    meta: [
      { title: "For counsel — The Bridge" },
      {
        name: "description",
        content:
          "How the instrument fits the anti-kickback, Stark, and fair-market-value framework — what it does, and the lines it deliberately does not cross. Not legal advice.",
      },
      { property: "og:title", content: "For counsel — The Bridge" },
      {
        property: "og:description",
        content:
          "A measurement instrument that sizes the uncompensated cost of ER coverage as an input to a fair-market-value analysis. Not the arrangement; not the opinion.",
      },
    ],
  }),
  component: ForCounselPage,
});

type Item = { q: string; a: ReactNode };

const ITEMS: Item[] = [
  {
    q: "In one sentence, what is this — legally?",
    a: (
      <>
        A measurement instrument. It sizes the uncompensated cost of ER
        coverage — the work the group does, valued at the public CMS rate,
        against what that work actually collected — as one input to a
        fair-market-value analysis. It is not the arrangement, and it does not
        set the fair-market figure. It's the evidence that sits under the
        opinion.
      </>
    ),
  },
  {
    q: "Does paying a radiology group to cover the emergency department raise anti-kickback concern?",
    a: (
      <>
        Coverage stipends between hospitals and physician groups are common and
        permissible — when the payment is for a service the hospital genuinely
        needs, set out in writing, consistent with fair market value (FMV), and
        not varying with the volume or value of referrals between the parties.
        The Anti-Kickback Statute (AKS — the federal criminal law, 42 U.S.C.
        § 1320a-7b(b)) is the frame; the personal services and management
        contracts safe harbor (42 C.F.R. § 1001.952(d)) is the usual shelter.
        The tool's job is narrow and on the right side of that line: it supplies
        the documented, fair-market cost basis. Your counsel structures the
        arrangement; the valuator sets the number.
      </>
    ),
  },
  {
    q: "The stipend changes as ER volume changes. Isn't that \u201Ctaking into account volume\u201D?",
    a: (
      <>
        <p>
          This is the distinction that carries the weight, so it's worth stating
          precisely. Paying <em>more for more referrals</em> is the prohibited
          thing. Truing a coverage payment to the <em>actual, documented cost
          of providing the coverage</em> is not — it's a reconciliation (a
          collections-guarantee structure): the methodology is set in advance,
          and the payment self-corrects to what coverage actually cost over the
          period. The 2020 federal safe-harbor reforms moved the
          personal-services shelter toward a <em>methodology</em> set in
          advance rather than a fixed aggregate, which is what accommodates a
          true-up like this — but mapping that to your facts is counsel's call,
          not ours.
        </p>
        <p className="mt-3">
          And there's an arithmetic point beneath the legal one. When the
          stipend is sized to bring ER to break-even, the group's marginal
          income from one more ER read is <em>zero</em> — the demo shows that
          line staying flat as volume rises. Covering more ER doesn't make the
          group money, so the economics themselves don't reward referrals.
          That's math, not a covenant, and it's the feature that keeps the
          structure clean.
        </p>
      </>
    ),
  },
  {
    q: "Who sets the fair-market-value number?",
    a: (
      <>
        An independent valuator. The engine sizes the gap honestly — work times
        the CMS rate versus what actually collected — as one input. The binding
        figures (compensation per wRVU, overhead, the FMV opinion, the
        commercial-reasonableness support) are the valuator's. The tool is
        built to <em>feed</em> a valuation, never to replace one. It measures;
        it does not opine.
      </>
    ),
  },
  {
    q: "What about Stark?",
    a: (
      <>
        Where the federal physician self-referral law (Stark, 42 U.S.C.
        § 1395nn) applies, the same discipline governs the relevant exception
        — in writing, methodology set in advance, consistent with FMV,
        commercially reasonable, and not determined in a way that takes into
        account the volume or value of referrals. The tool's role is identical
        to its role under AKS: defensible measurement, not the legal structure.
        Counsel selects and satisfies the specific exception.
      </>
    ),
  },
  {
    q: "If this is ever reviewed, what makes it defensible?",
    a: (
      <>
        Contemporaneous, reconcilable, re-performable documentation. Every
        figure drills to the source rows it came from; total collections tie to
        the financial statements for the same period and segment; the wRVU map
        cites the CMS schedule version it used; and a period is re-runnable, so
        the same inputs reproduce the same numbers. An FMV opinion is only as
        good as the data beneath it — this is built so a valuator, or a
        reviewer, can re-perform the measurement rather than take it on faith.
        (The drill-to-source runs inside the controlled, BAA-covered
        environment against the source rows; the shippable result is an
        aggregate that carries no patient data — two artifacts, two places.)
      </>
    ),
  },
  {
    q: "Does evaluating the tool create any compliance exposure?",
    a: (
      <>
        No. The demonstration contains no patient data, so it needs no Business
        Associate Agreement (BAA — the HIPAA contract that puts an outside
        party legally on the hook to protect patient data) to evaluate. Real
        records move only behind a signed BAA, into a controlled environment,
        with patient identifiers scrambled before they leave the building — and
        the output is aggregate, so protected health information never lives in
        the deliverable. Looking at the tool, and even running it on the
        synthetic set, touches nothing protected.
      </>
    ),
  },
  {
    q: "Who owns the analysis — and is it discoverable or privileged?",
    a: (
      <>
        You own your data and your output. Whether a given analysis is
        privileged or protected work product turns on how, and at whose
        direction, it's prepared — that's a call for your own counsel, and one
        worth making before the work starts rather than after. We raise it
        because it's cheap to get right early and expensive to fix late; we
        don't advise on it.
      </>
    ),
  },
  {
    q: "Is any of this legal advice?",
    a: (
      <>
        No. It's a measurement instrument and a plain explanation of how it
        fits the regulatory landscape. The binding determinations — the FMV
        opinion, the safe-harbor or exception analysis, the
        commercial-reasonableness support, privilege — belong to your
        independent valuator and your own counsel. Nothing here substitutes for
        either.
      </>
    ),
  },
];

function AccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: Item;
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
        <span className="font-display text-base leading-snug text-ink md:text-lg">
          {item.q}
        </span>
        <span className="font-mono-tab shrink-0 text-xs text-ink/50" aria-hidden="true">
          {isOpen ? "−" : "+"}
        </span>
      </button>
      {isOpen ? (
        <div className="pb-5">
          <div className="max-w-3xl text-[14.5px] leading-relaxed text-ink/80">
            {item.a}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ForCounselPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <main className="bg-paper">
      <article className="mx-auto max-w-3xl px-4 py-16 md:py-24">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="font-mono-tab inline-block rounded-full border border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-[var(--gold)]">
            Illustrative · sample data
          </span>
          <span className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
            For counsel
          </span>
        </div>

        <h1 className="font-display text-[2rem] leading-[1.1] text-ink md:text-[2.75rem]">
          For counsel — The Bridge
        </h1>

        <div className="mt-5 rounded-md border-l-[3px] border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_6%,transparent)] px-4 py-3 text-[13px] leading-relaxed text-ink/80">
          <strong className="text-ink">Not legal advice and not a valuation.</strong>{" "}
          Your own counsel and an independent valuator make the binding
          determinations; nothing here substitutes for either.
        </div>

        <p className="mt-6 text-[15.5px] leading-relaxed text-ink/80">
          For the reviewer who has to be satisfied the structure is sound
          before anyone signs. Plain-English first, the provision in your
          pocket for when you map it. This explains how the instrument fits the
          anti-kickback, Stark, and fair-market-value framework — what it does,
          and the lines it deliberately does not cross.
        </p>

        <div className="mt-10">
          {ITEMS.map((item, i) => (
            <AccordionItem
              key={item.q}
              item={item}
              isOpen={openIdx === i}
              onToggle={() => setOpenIdx((prev) => (prev === i ? null : i))}
            />
          ))}
        </div>

        <div className="mt-10 rounded-md border border-ink/15 bg-ink/[0.03] px-4 py-3 text-[13.5px] leading-relaxed text-ink/80">
          <strong className="text-ink">One honest flag.</strong> The machinery
          is stable. What moves is the law around it and the numbers under it:
          regulatory guidance evolves, the CMS file (the conversion factor and
          the per-code work values) is re-issued annually and the two can move
          in opposite directions, and valuation method is the valuator's to
          keep current. A coverage arrangement should be papered and re-blessed
          on the cadence your counsel sets, against the file in effect — not
          set once and forgotten. The instrument doesn't change; the binding
          inputs around it do.
        </div>

        <p className="mt-8 text-[13px] leading-relaxed text-ink/65">
          Companion: the technical + security detail for IT lives at{" "}
          <Link
            to="/for-it"
            className="text-[var(--gold)] underline decoration-[color-mix(in_oklab,var(--gold)_45%,transparent)] underline-offset-[3px] hover:decoration-[var(--gold)]"
          >
            For IT / your CIO →
          </Link>{" "}
          ; the live model is at{" "}
          <Link
            to="/record"
            className="text-[var(--gold)] underline decoration-[color-mix(in_oklab,var(--gold)_45%,transparent)] underline-offset-[3px] hover:decoration-[var(--gold)]"
          >
            the record →
          </Link>
          .
        </p>
      </article>
    </main>
  );
}
