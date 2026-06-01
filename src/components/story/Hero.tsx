import { Link } from "@tanstack/react-router";
import { FallToken } from "../FallToken";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-ink/15">
      <div className="dot-grid absolute inset-0 opacity-70" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 md:pb-28 md:pt-24">
        <div className="font-mono-tab mb-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-ink/65">
          <FallToken size={12} tone="teal" />
          <span>Problem → Dashboard → Solution</span>
        </div>

        <h1 className="font-display max-w-4xl text-[2.25rem] leading-[1.05] tracking-tight text-ink md:text-[4rem]">
          You're generating the data. You just can't{" "}
          <em className="italic text-[var(--teal)]">see</em> it yet.
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink/75 md:text-lg">
          Every read writes a claim, a report, and a set of timestamps to systems
          you already pay for. The economics feel invisible not because data is
          missing, but because nobody has joined it. See what happens when
          you do.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            to="/sandbox"
            className="inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-paper transition-colors hover:bg-ink/90"
          >
            Open the sandbox →
          </Link>
          <a
            href="#act-problem"
            className="inline-flex h-11 items-center justify-center rounded-full border border-ink/30 bg-paper px-5 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.06]"
          >
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}
