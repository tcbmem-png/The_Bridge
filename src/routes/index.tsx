// The Bridge — landing scroll.
//
// The thesis is specialty-agnostic: a physician group should be able to hold
// an independent record of what it did and what happened to the money, without
// asking the entity that benefits from the ambiguity for permission. The scroll
// runs: the problem → the four handoffs → what a label means → the record itself.
//
// Radiology-specific material is archived under /legacy/*; this
// page no longer leads with it.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { REPO_URL } from "../lib/brand";
import { SITE, siteUrl } from "../lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: SITE.title },
      { name: "description", content: SITE.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: siteUrl("/") },
      { property: "og:title", content: SITE.title },
      { property: "og:description", content: SITE.description },
      { property: "og:image", content: SITE.ogImage },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SITE.title },
      { name: "twitter:description", content: SITE.description },
      { name: "twitter:image", content: SITE.ogImage },
    ],
    links: [{ rel: "canonical", href: siteUrl("/") }],
  }),
  component: LandingScroll,
});

function LandingScroll() {
  const root = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const scope = root.current;
    if (!scope) return;
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      scope.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.18 },
    );
    scope.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <main
      ref={root}
      className="font-hanken bg-paper text-[var(--bridge-body)]"
      style={{ fontSize: "clamp(1.02rem, 1.15vw, 1.18rem)", lineHeight: 1.66 }}
    >
      <div className="mx-auto max-w-[760px] px-8">
        {/* 1 · Hero */}
        <Section>
          <Kicker>For the independent physician group</Kicker>
          <H1 className="reveal d1">
            You did the work.
            <br />
            You should be able to see what happened to the money.
          </H1>
          <Lede className="reveal d2">
            Most groups learn how they did from a report written by someone
            else. The Bridge builds the other copy: your own record, from your own
            files, reconstructed on your own machine.
          </Lede>
          <div className="reveal d3 mt-16 flex items-center gap-3 font-mono-tab text-[11.5px] tracking-[0.18em] text-[var(--bridge-muted)]">
            <span className="h-px w-[38px] bg-[var(--bridge-hair)]" />
            <span className="motion-safe:animate-[bridge-bob_2.4s_ease-in-out_infinite]">↓</span>
            <span>keep scrolling</span>
          </div>
        </Section>

        {/* 2 · The four handoffs */}
        <Section>
          <Kicker>Where the chain can break</Kicker>
          <H2 className="reveal d1">
            Four handoffs sit between a service and a dollar.
          </H2>
          <Lede className="reveal d1">
            Each one is a place where a link can fail without anyone being told.
            Not fraud. Just a join that nobody owns.
          </Lede>
          <ol className="reveal d2 mt-9 border-t border-[var(--bridge-hair)]">
            {HANDOFFS.map((h) => (
              <li
                key={h.step}
                className="grid grid-cols-[auto_1fr] gap-x-5 border-b border-[var(--bridge-hair)] py-5"
              >
                <span className="font-mono-tab pt-1 text-[11px] uppercase tracking-[0.13em] text-[var(--bridge-muted)]">
                  {h.step}
                </span>
                <span>
                  <b className="font-medium text-ink">{h.title}</b>
                  <span className="mt-1 block text-[0.95em] text-[var(--bridge-body)]">
                    {h.failure}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </Section>

        {/* 3 · Unknown is not zero */}
        <Section>
          <Kicker>The rule that makes it usable</Kicker>
          <H2 className="reveal d1">Unknown is not zero.</H2>
          <Lede className="reveal d1">
            A claim with no remittance is not a claim paid nothing. It is a claim
            with no remittance in the record. Treating those as the same turns an
            open question into a settled loss — and quietly makes the report look
            complete.
          </Lede>
          <div className="reveal d2 mt-9 max-w-[560px] rounded-[3px] border border-[var(--bridge-hair)] bg-[var(--bridge-cream-2)] px-9 py-[34px]">
            <div className="mb-[22px] font-mono-tab text-[11px] uppercase tracking-[0.13em] text-[var(--bridge-muted)]">
              Every figure carries its provenance
            </div>
            <ul className="space-y-3">
              {LABELS.map((l) => (
                <li key={l.k} className="flex gap-4">
                  <span className="font-mono-tab w-[124px] shrink-0 text-[11px] uppercase tracking-[0.1em] text-ink">
                    {l.k}
                  </span>
                  <span className="text-[0.95em]">{l.v}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7 border-t border-[var(--bridge-hair)] pt-[18px]">
              <Link
                to="/method"
                className="font-mono-tab text-[12px] tracking-[0.04em] text-[var(--gold)] underline decoration-[color-mix(in_oklab,var(--gold)_45%,transparent)] underline-offset-[3px] hover:decoration-[var(--gold)]"
              >
                The full method →
              </Link>
            </div>
          </div>
        </Section>

        {/* 4 · Your machine */}
        <Section>
          <Kicker>Where it runs</Kicker>
          <H2 className="reveal d1">On your machine. Nowhere else.</H2>
          <Lede className="reveal d1">
            Postgres runs inside the browser tab. In this demonstration, files
            are parsed and queried on the computer in front of you and disappear
            on reload — no account, no server upload, no vendor holding the copy.
            The demonstration data is fully synthetic. For real practice data, the
            same engine can run in an environment the practice controls.
          </Lede>
          <div className="reveal d2 mt-9 flex flex-wrap gap-3">
            <Link
              to="/record"
              className="rounded-full bg-ink px-5 py-2.5 text-[15px] font-medium text-paper no-underline transition-colors hover:bg-ink/90"
            >
              Open the record
            </Link>
            <Link
              to="/economics"
              className="rounded-full border border-ink/30 px-5 py-2.5 text-[15px] font-medium text-ink no-underline transition-colors hover:bg-ink/[0.06]"
            >
              See realized yield
            </Link>
          </div>
        </Section>

        {/* 5 · Live demo card */}
        <Section>
          <Kicker>Try it yourself</Kicker>
          <div className="reveal d1 mt-2 rounded-[3px] border border-[var(--bridge-hair)] bg-[var(--bridge-cream-2)] px-9 py-[34px]">
            <div className="mb-3 font-mono-tab text-[11px] uppercase tracking-[0.13em] text-teal">
              Interactive demo · fully synthetic data
            </div>
            <h2 className="mb-4 font-display text-[1.9rem] font-medium leading-[1.15] tracking-[-0.01em] text-ink">
              Follow the record.
            </h2>
            <p className="mb-6 max-w-[52ch]">
              Trace a synthetic physician group's money from work performed to
              claim, adjudication, payment and bank cash. Open every figure to the
              rows behind it and see where the billing company's report agrees with
              the underlying record — and where the record remains open.
              <br />
              <span className="mt-3 block">
                No signup. Runs entirely in your browser.
              </span>
            </p>
            <a
              href="/extractordemo/"
              className="inline-block font-mono-tab text-[13px] tracking-[0.04em] text-[var(--gold)] underline decoration-[color-mix(in_oklab,var(--gold)_45%,transparent)] underline-offset-[3px] hover:decoration-[var(--gold)]"
            >
              Open the live record →
            </a>
          </div>
        </Section>

        {/* 6 · Close */}
        <section className="py-[7vh]">
          <Kicker>Where it belongs</Kicker>
          <H2 className="reveal d1">A number both sides can check.</H2>
          <p className="reveal d1 mb-9 max-w-[42ch]">
            An independent record does not win an argument by asserting a bigger
            number. It wins by being inspectable — every figure traceable to the
            rows that produced it, every gap named with the source that would
            close it.
          </p>
          <div className="reveal d2">
            <QuietLink to="/record" it="The chain, handoff by handoff" go="The record" />
            <QuietLink to="/economics" it="What the work actually yielded" go="Economics" />
            <QuietLink to="/method" it="How a figure earns its label" go="Method" />
            <QuietLink to="/for-it" it="How it runs + where the data stays" go="For IT / your CIO" />
            <QuietLink to="/for-counsel" it="The legal structure" go="For counsel" />
          </div>
          <footer className="reveal pb-20 pt-12 font-mono-tab text-[12px] leading-[1.8] tracking-[0.04em] text-[var(--bridge-muted)]">
            Illustrative — synthetic data, no patient records.
            <br />
            Flat, deterministic code; every figure drills to its source. Read the
            engine →{" "}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--gold)] underline decoration-[color-mix(in_oklab,var(--gold)_45%,transparent)] underline-offset-[3px] hover:decoration-[var(--gold)]"
            >
              github.com/tcbmem-png/The_Bridge
            </a>
          </footer>
        </section>
      </div>

      <style>{`@keyframes bridge-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}`}</style>
    </main>
  );
}

const HANDOFFS = [
  {
    step: "01",
    title: "Work becomes a claim.",
    failure:
      "Work with no matching claim line in the record. The service happened; the billing handoff has not been established.",
  },
  {
    step: "02",
    title: "A claim becomes an adjudication.",
    failure:
      "Submitted claim lines with no matching remittance in the record. Not zero. Not necessarily denied. The adjudication handoff remains open.",
  },
  {
    step: "03",
    title: "An adjudication becomes a payment.",
    failure:
      "An adjudication that does not become a payer payment. The reason may be established by adjustment and denial codes — or remain unresolved.",
  },
  {
    step: "04",
    title: "A payment becomes cash.",
    failure:
      "Remittances with no matching deposit, and deposits with no matching remittance.",
  },
];

const LABELS = [
  { k: "Record", v: "Read directly from a source file." },
  { k: "Record-derived", v: "Arithmetic or logic over record facts only." },
  { k: "Counterfactual", v: "Record facts plus a stated assumption, with the source or act that would close it." },
  { k: "Model-derived", v: "A result calculated entirely inside a declared model." },
  { k: "Gap", v: "Required input the record does not establish. Never shown as zero." },
  { k: "Contradiction", v: "Two governed sources disagree. Displayed, not resolved by preference." },
];

function Section({ children }: { children: ReactNode }) {
  return (
    <section className="flex min-h-[88vh] flex-col justify-center py-[9vh]">
      {children}
    </section>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <div className="reveal mb-[26px] font-mono-tab text-[11.5px] uppercase tracking-[0.2em] text-[var(--bridge-muted)]">
      {children}
    </div>
  );
}

function H1({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h1
      className={
        "mb-[34px] font-display font-medium leading-[1.04] tracking-[-0.012em] text-ink " + className
      }
      style={{ fontSize: "clamp(2.4rem, 5.2vw, 3.9rem)" }}
    >
      {children}
    </h1>
  );
}

function H2({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={"mb-5 font-display font-medium leading-[1.1] tracking-[-0.01em] text-ink " + className}
      style={{ fontSize: "clamp(1.8rem, 3.6vw, 2.7rem)" }}
    >
      {children}
    </h2>
  );
}

function Lede({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={"max-w-[42ch] " + className}>{children}</p>;
}

function QuietLink({
  to,
  it,
  go,
}: {
  to: "/record" | "/economics" | "/method" | "/for-it" | "/for-counsel";
  it: string;
  go: string;
}) {
  return (
    <Link
      to={to}
      className="block border-t border-[var(--bridge-hair)] py-[15px] font-hanken text-[17px] text-[var(--bridge-body)] no-underline last:border-b last:border-[var(--bridge-hair)]"
    >
      <span className="italic text-[var(--bridge-muted)]">{it}</span>
      &nbsp;→ &nbsp;
      <span className="font-medium text-ink">{go}</span>
    </Link>
  );
}
