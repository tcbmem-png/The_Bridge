import { REPO_URL } from "../lib/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/15 bg-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6">
        <span className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/45">
          The Bridge · illustrative · sample data
        </span>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono-tab text-[11px] uppercase tracking-[0.12em] text-[var(--gold)] underline decoration-[color-mix(in_oklab,var(--gold)_45%,transparent)] underline-offset-[3px] hover:decoration-[var(--gold)]"
        >
          Source →
        </a>
      </div>
    </footer>
  );
}
