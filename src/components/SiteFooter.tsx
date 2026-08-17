import { Link } from "@tanstack/react-router";
import { SITE } from "../lib/site";


const LINKS: Array<{ label: string; to: string }> = [
  { label: "The record", to: "/record" },
  { label: "Economics", to: "/economics" },
  { label: "Method", to: "/method" },
  { label: "Sandbox", to: "/sandbox" },
  { label: "Technical", to: "/for-it" },
  { label: "Legal", to: "/for-counsel" },
  { label: "Optimizer", to: "/optimizer" },
];



export function SiteFooter() {
  return (
    <footer className="border-t border-ink/15 bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <nav
          aria-label="Site"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55"
        >
          {LINKS.map((l, i) => (
            <span key={l.to} className="flex items-center gap-3">
              <Link
                to={l.to}
                className="hover:text-ink transition-colors"
                activeProps={{ className: "text-ink" }}
              >
                {l.label}
              </Link>
              {i < LINKS.length - 1 && (
                <span aria-hidden className="text-ink/25">·</span>
              )}
            </span>
          ))}
        </nav>
        <p className="mt-3 font-mono text-[11px] tracking-[0.04em] text-ink/55">
          Taylor C. Berger, Attorney ·{" "}
          <a
            href="mailto:taylor@tcblaw.org"
            className="underline decoration-ink/20 underline-offset-[3px] hover:text-ink hover:decoration-ink/60"
          >
            taylor@tcblaw.org
          </a>{" "}
          · <span className="text-ink/45">{SITE.domain}</span>
        </p>
      </div>
    </footer>
  );
}
