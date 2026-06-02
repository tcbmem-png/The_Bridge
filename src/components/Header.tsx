import { Link } from "@tanstack/react-router";

function BrandMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="13" cy="13" r="12" fill="none" stroke="var(--ink)" strokeWidth="1.25" />
      <circle cx="13" cy="13" r="4" fill="var(--teal)" />
    </svg>
  );
}

const tabs = [
  { to: "/", label: "Story" },
  { to: "/under-the-hood", label: "Under the Hood" },
  { to: "/sandbox", label: "Sandbox" },
  { to: "/site", label: "Site" },
  { to: "/faq", label: "FAQ" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/15 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-6 md:py-3">
        <div className="flex items-center justify-between gap-4 md:justify-start">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-display text-lg leading-none">The Bridge</span>
          </Link>

          <span
            className="font-mono-tab inline-flex items-center rounded-full border border-ink/25 bg-paper px-2.5 py-1 text-[10.5px] uppercase tracking-[0.08em] text-ink/75 md:hidden"
            aria-label="Illustrative sample data"
          >
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
            Illustrative · sample data
          </span>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto md:gap-2" aria-label="Primary">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              activeOptions={{ exact: true }}
              className="font-mono-tab rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-ink/60 transition-colors hover:text-ink"
              activeProps={{ className: "text-ink bg-ink/[0.06]" }}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <span
          className="font-mono-tab hidden items-center rounded-full border border-ink/25 bg-paper px-2.5 py-1 text-[10.5px] uppercase tracking-[0.08em] text-ink/75 md:inline-flex"
          aria-label="Illustrative sample data"
        >
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
          Illustrative · sample data
        </span>
      </div>
    </header>
  );
}
