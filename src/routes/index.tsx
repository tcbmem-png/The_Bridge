// The Bridge — landing scroll. One continuous read that merges the doctor
// and executive doors: problem → a located number → the two numbers →
// bidirectional slider → quiet close. /for-it, /for-counsel, /stipend stay
// separate; this page only links to them at the bottom.
//
// Decisions (mine, called out so the next pass knows):
//  1. /stipend survives as the deeper exec page (linked from the close as
//     "the demo").
//  2. The slider uses illustrative hardcoded sample numbers ported verbatim
//     from the prototype's vanilla-JS model — what holds is the relationship
//     shape (with flat, without craters, stipend = gap, freed-capacity upside
//     on the left). The real engine still backs /stipend and the harness;
//     wiring it through here without changing those surfaces is a follow-up.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { VolumeSlider } from "../components/landing/VolumeSlider";
import { REPO_URL } from "../lib/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Bridge — for the radiology group" },
      {
        name: "description",
        content:
          "The work isn't the problem — the yield on it is. One picture you can question, and check, down to the record.",
      },
      { property: "og:title", content: "The Bridge — for the radiology group" },
      {
        property: "og:description",
        content: "The loss has an address. The Bridge locates it and ties it out.",
      },
    ],
  }),
  component: LandingScroll,
});

function LandingScroll() {
  // Page-scoped reveal observer — fade-up on scroll-enter. Respects
  // prefers-reduced-motion via the .reveal styles in styles.css.
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
      style={{
        fontSize: "clamp(1.02rem, 1.15vw, 1.18rem)",
        lineHeight: 1.66,
      }}
    >
      <div className="mx-auto max-w-[760px] px-8">

        {/* 1 · Hero */}
        <Section>
          <Kicker>For the radiology group working as hard as it ever has</Kicker>
          <H1 className="reveal d1">The work isn't the problem. The yield on it is.</H1>
          <Lede className="reveal d2">
            When the same reads bring in less, effort isn't the fix. The Bridge joins your billing,
            your reports, and your worklist into one picture you can question — and check, down to the record.
          </Lede>
          <div className="reveal d3 mt-16 flex items-center gap-3 font-mono-tab text-[11.5px] tracking-[0.18em] text-[var(--bridge-muted)]">
            <span className="h-px w-[38px] bg-[var(--bridge-hair)]" />
            <span className="motion-safe:animate-[bridge-bob_2.4s_ease-in-out_infinite]">↓</span>
            <span>keep scrolling</span>
          </div>
        </Section>

        {/* 2 · The loss has an address */}
        <Section>
          <Kicker>The loss has an address</Kicker>
          <H2 className="reveal d1">
            Not <em className="text-[#3f3a33] italic">yield fell.</em> Yield fell here.
          </H2>
          <Lede className="reveal d1">
            On these reads, on this shift, at this site, for this payer. An average is a complaint.
            A located number is something you can put on a table.
          </Lede>
          <div className="reveal d2 mt-9 max-w-[520px] rounded-[3px] border border-[var(--bridge-hair)] bg-[var(--bridge-cream-2)] px-9 py-[34px]">
            <div className="mb-[22px] font-mono-tab text-[11px] uppercase tracking-[0.13em] text-[var(--bridge-muted)]">
              ER · Night shift · Site B · Aetna
            </div>
            <div className="font-display text-[3.4rem] font-medium leading-none tracking-[-0.02em] text-ink">
              $26.87
              <span className="ml-2 font-hanken text-[1.15rem] font-normal text-[var(--bridge-muted)]">per read</span>
            </div>
            <div className="mt-3.5">
              vs <b className="font-medium text-ink">$59.83</b> on the same group's reads elsewhere.
            </div>
            <div className="mt-6 flex items-center gap-2.5 border-t border-[var(--bridge-hair)] pt-[18px] font-mono-tab text-[12px] tracking-[0.04em] text-[var(--bridge-muted)]">
              1,204 reads · Mar–Aug
              <span className="ml-auto text-teal">open →</span>
            </div>
          </div>
        </Section>

        {/* 3 · Two numbers you already own */}
        <Section>
          <Kicker>Two numbers you already own</Kicker>
          <H2 className="reveal d1">What the ER costs you is two figures.</H2>
          <Lede className="reveal d1">
            The work your group does covering it, and what that work actually collects. You hold both already —
            sometimes they just sit in the seam between systems.
          </Lede>
          <div className="reveal d2 mt-9 flex flex-col border-y border-[var(--bridge-hair)] md:flex-row">
            <div className="flex-1 py-[30px] pr-[30px]">
              <div className="mb-4 font-mono-tab text-[11.5px] uppercase tracking-[0.13em] text-[var(--bridge-muted)]">
                Your ER read
              </div>
              <div className="font-display text-[2.7rem] font-medium leading-none tracking-[-0.02em] text-ink">
                $26.87
                <span className="ml-1.5 font-hanken text-[1rem] font-normal text-[var(--bridge-muted)]">/ read</span>
              </div>
            </div>
            <div className="flex-1 border-t border-[var(--bridge-hair)] py-[30px] pl-0 md:border-l md:border-t-0 md:pl-9">
              <div className="mb-4 font-mono-tab text-[11.5px] uppercase tracking-[0.13em] text-[var(--bridge-muted)]">
                Every other read
              </div>
              <div className="font-display text-[2.7rem] font-medium leading-none tracking-[-0.02em] text-ink">
                $59.83
                <span className="ml-1.5 font-hanken text-[1rem] font-normal text-[var(--bridge-muted)]">/ read</span>
              </div>
            </div>
          </div>
          <p className="reveal d2 mt-6">
            <b className="font-medium text-ink">$32.96 of yield, gone</b> — on every ER read. That's not effort. That's structure.
          </p>
        </Section>

        {/* 4 · The bidirectional slider */}
        <Section>
          <Kicker>The volume is the problem — and you don't control it</Kicker>
          <H2 className="reveal d1">One slider. Both sides on it.</H2>
          <Lede className="reveal d1">
            Protocol scans off miscoded falls, the ER used as primary care — that volume isn't yours to set.
            So move it, and watch who it costs.
          </Lede>
          <div className="reveal d1">
            <VolumeSlider />
          </div>
        </Section>

        {/* 5 · Close */}
        <section className="py-[7vh]">
          <Kicker>Where it belongs</Kicker>
          <H2 className="reveal d1">A number both sides can check.</H2>
          <p className="reveal d1 mb-9 max-w-[40ch]">
            The coverage isn't yours to govern — it's the hospital's, and it moves when they see the same
            figure and decide to act. The structure just puts the risk where the control already is.
          </p>
          <div className="reveal d2">
            <QuietLink to="/stipend" it="See the whole table" go="the demo" />
            <QuietLink to="/for-it" it="The technical + security detail" go="For IT / your CIO" />
            <QuietLink to="/for-counsel" it="The legal structure" go="For counsel" />
          </div>
          <footer className="reveal pb-20 pt-12 font-mono-tab text-[12px] leading-[1.8] tracking-[0.04em] text-[var(--bridge-muted)]">
            Illustrative — sample data, no patient records.<br />
            Flat, deterministic code; every figure drills to its source. Read the engine →{" "}
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

      {/* Subtle bob keyframe for the scroll cue arrow. */}
      <style>{`@keyframes bridge-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}`}</style>
    </main>
  );
}

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
      className={"mb-[34px] font-display font-medium leading-[1.04] tracking-[-0.012em] text-ink " + className}
      style={{ fontSize: "clamp(2.7rem, 6.2vw, 4.5rem)" }}
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
  return <p className={"max-w-[38ch] " + className}>{children}</p>;
}

function QuietLink({
  to, it, go,
}: { to: "/stipend" | "/for-it" | "/for-counsel"; it: string; go: string }) {
  return (
    <Link
      to={to}
      className="block border-t border-[var(--bridge-hair)] py-[15px] text-[17px] text-[var(--bridge-body)] no-underline last:border-b last:border-[var(--bridge-hair)] font-hanken"
    >
      <span className="italic text-[var(--bridge-muted)]">{it}</span>
      &nbsp;→ &nbsp;
      <span className="text-[var(--gold)] underline decoration-[color-mix(in_oklab,var(--gold)_45%,transparent)] underline-offset-[3px] hover:decoration-[var(--gold)]">
        {go}
      </span>
    </Link>
  );
}
