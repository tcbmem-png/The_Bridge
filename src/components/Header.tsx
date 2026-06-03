import { Link } from "@tanstack/react-router";

function BrandMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="13" cy="13" r="12" fill="none" stroke="var(--ink)" strokeWidth="1.25" />
      <circle cx="13" cy="13" r="4" fill="var(--teal)" />
    </svg>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/15 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="font-display text-lg leading-none">The Bridge</span>
        </Link>

        <span
          className="font-mono-tab inline-flex items-center rounded-full border border-ink/25 bg-paper px-2.5 py-1 text-[10.5px] uppercase tracking-[0.08em] text-ink/75"
          aria-label="Illustrative sample data"
        >
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
          Illustrative · sample data
        </span>
      </div>
    </header>
  );
}
