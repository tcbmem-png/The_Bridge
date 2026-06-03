import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Bridge — for the radiology group" },
      {
        name: "description",
        content:
          "The work isn't the problem — the yield on it is. The Bridge joins billing, reports, and worklist into one picture you can question, and check, down to the record.",
      },
      { property: "og:title", content: "The Bridge — for the radiology group" },
      {
        property: "og:description",
        content:
          "The structure of the loss has an address. Every number opens to its source. No CTA, no funnel.",
      },
    ],
  }),
  component: LandingPage,
});

function Section({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-[1.5rem] leading-[1.2] text-ink md:text-[1.875rem]">
        {heading}
      </h2>
      <div className="mt-3 space-y-4 text-[15.5px] leading-relaxed text-ink/80">
        {children}
      </div>
    </section>
  );
}

function GoldLink({
  to,
  children,
}: {
  to: "/stipend" | "/harness" | "/for-it" | "/for-counsel" | "/faq";
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="text-[var(--gold)] underline decoration-[color-mix(in_oklab,var(--gold)_45%,transparent)] underline-offset-[3px] hover:decoration-[var(--gold)]"
    >
      {children}
    </Link>
  );
}

function LandingPage() {
  // Tiny lever to keep the chassis pattern of "depth one click away" — the
  // four doors render as a quiet list, not buttons, and stay below the read.
  const [, setHover] = useState<string | null>(null);

  return (
    <main className="bg-paper">
      <article className="mx-auto max-w-3xl px-4 py-16 md:py-24">
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
          For the radiology group working as hard as it ever has.
        </div>
        <h1 className="font-display mt-4 text-[2.25rem] leading-[1.05] text-ink md:text-[3.25rem]">
          The work isn't the problem. The yield on it is.
        </h1>
        <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-ink/80">
          When the same reads bring in less, effort isn't the fix — and you can't
          see why from inside any one system you run. The Bridge joins the three
          you already have — your billing, your reports, your worklist — into
          one picture you can question, and check, down to the record.
        </p>

        <Section heading="You can't work your way out of a margin problem.">
          <p>
            More reads at a lower yield is just more low-yield reads. Throughput
            is the wrong knob — it lowers your cost per read and does nothing to
            the yield per read, and yield is what moved. The fix has to be aimed
            at the structure, not at yourselves.
          </p>
        </Section>

        <Section heading="The loss has an address.">
          <p>
            Not <em>yield fell</em> — <em>yield fell on these reads, on this
            shift, at this site, for this payer.</em> An average is a complaint.
            A located number is something you can put on a table. And locating
            it is the one thing your billing and your reports can't do alone:
            they know what and how much, never where and when.
          </p>
        </Section>

        <Section heading="Two numbers you already own.">
          <p>
            What the ER costs you comes down to two figures — the work your
            group does covering it, and what that work actually collects. Most
            groups hold both already; sometimes a report is a setting away,
            sometimes the number sits in the seam between systems. The Bridge
            finds them and ties them out.
          </p>
        </Section>

        <Section heading="Nothing here is a number you take on faith.">
          <p>
            Every figure on the screen opens to the records it came from. If a
            number looks wrong, you open it and see why. It's flat,
            deterministic code — no model reasoning about a patient, no black
            box — checked by an independent test that has to match to the dollar
            before anything ships.
          </p>
        </Section>

        <Section heading="A shared picture, not a weapon.">
          <p>
            The coverage you're absorbing isn't yours to govern — it's the
            hospital's, and it moves only when the hospital sees the same
            numbers and decides to act on its own floor. So the point was never
            leverage. It's a picture both sides trust, which is far stronger
            footing than a complaint at year-end.
          </p>
        </Section>

        <Section heading="Bring the people who have to say yes.">
          <p>
            A coverage conversation needs four people to agree — you, your
            finance side, whoever runs your data, and counsel — and each has a
            different question. These answer them, in the same plain voice, off
            the same numbers underneath:
          </p>
          <ul className="mt-2 space-y-2 text-[15.5px] leading-relaxed text-ink/80">
            <li
              onMouseEnter={() => setHover("stipend")}
              onMouseLeave={() => setHover(null)}
            >
              <em>See it move</em> → <GoldLink to="/stipend">the demo</GoldLink>
            </li>
            <li>
              <em>Run it yourself</em> →{" "}
              <GoldLink to="/harness">the harness</GoldLink>
            </li>
            <li>
              <em>The technical + security detail</em> →{" "}
              <GoldLink to="/for-it">For IT / your CIO</GoldLink>
            </li>
            <li>
              <em>The legal structure</em> →{" "}
              <GoldLink to="/for-counsel">For counsel</GoldLink>
            </li>
          </ul>
        </Section>

        <p className="mt-12 border-t border-ink/15 pt-6 text-[12px] leading-relaxed text-ink/55">
          Quiet links, not buttons. No CTA, no "book a demo," no urgency — the
          landing recognizes the problem and points the way down, full stop.
          The full set of plain answers lives in the{" "}
          <GoldLink to="/faq">FAQ</GoldLink>.
        </p>
      </article>
    </main>
  );
}
