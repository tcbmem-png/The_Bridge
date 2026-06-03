import { createFileRoute } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import cioDeepDive from "../content/cio-deep-dive.md?raw";

export const Route = createFileRoute("/for-it")({
  head: () => ({
    meta: [
      { title: "For IT / your CIO — The Bridge" },
      {
        name: "description",
        content:
          "Technical and compliance deep-dive: what the engine is, what it touches, and the PHI/BAA wall. For a CIO or IT reviewer.",
      },
      { property: "og:title", content: "For IT / your CIO — The Bridge" },
      {
        property: "og:description",
        content:
          "Technical and compliance deep-dive: what the engine is, what it touches, and the PHI/BAA wall.",
      },
    ],
  }),
  component: ForItPage,
});

function ForItPage() {
  return (
    <main className="bg-paper">
      <article className="mx-auto max-w-3xl px-4 py-16 md:py-24">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="font-mono-tab inline-block rounded-full border border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-[var(--gold)]">
            Illustrative · sample data
          </span>
          <span className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
            For IT / your CIO
          </span>
        </div>
        <div className="prose-cio">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{cioDeepDive}</ReactMarkdown>
        </div>
      </article>
      <style>{`
        .prose-cio h1 { font-family: var(--font-display, "Fraunces", serif); font-size: 2rem; line-height: 1.1; color: var(--ink, #0E1B2C); margin-bottom: 1.25rem; }
        @media (min-width: 768px) { .prose-cio h1 { font-size: 2.75rem; } }
        .prose-cio h2 { font-family: var(--font-display, "Fraunces", serif); font-size: 1.5rem; line-height: 1.15; color: var(--ink, #0E1B2C); margin-top: 2.5rem; margin-bottom: 1rem; border-top: 1px solid color-mix(in oklab, var(--ink, #0E1B2C) 12%, transparent); padding-top: 1.5rem; }
        @media (min-width: 768px) { .prose-cio h2 { font-size: 1.875rem; } }
        .prose-cio h3 { font-family: var(--font-display, "Fraunces", serif); font-size: 1.25rem; color: var(--ink, #0E1B2C); margin-top: 1.75rem; margin-bottom: 0.75rem; }
        .prose-cio p { font-size: 0.95rem; line-height: 1.65; color: color-mix(in oklab, var(--ink, #0E1B2C) 82%, transparent); margin-bottom: 1.1rem; }
        .prose-cio p > em:first-child:last-child { display: block; font-style: italic; color: color-mix(in oklab, var(--ink, #0E1B2C) 65%, transparent); }
        .prose-cio strong { color: var(--ink, #0E1B2C); font-weight: 600; }
        .prose-cio em { font-style: italic; }
        .prose-cio hr { border: 0; border-top: 1px solid color-mix(in oklab, var(--ink, #0E1B2C) 12%, transparent); margin: 2rem 0; }
        .prose-cio ul { list-style: disc; padding-left: 1.25rem; margin-bottom: 1.1rem; }
        .prose-cio li { font-size: 0.95rem; line-height: 1.65; color: color-mix(in oklab, var(--ink, #0E1B2C) 82%, transparent); margin-bottom: 0.4rem; }
        .prose-cio code { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 0.85em; background: color-mix(in oklab, var(--ink, #0E1B2C) 6%, transparent); padding: 0.05em 0.35em; border-radius: 0.25rem; }
        .prose-cio table { width: 100%; border-collapse: collapse; margin: 1.25rem 0 1.5rem; font-size: 0.85rem; }
        .prose-cio th, .prose-cio td { border: 1px solid color-mix(in oklab, var(--ink, #0E1B2C) 15%, transparent); padding: 0.5rem 0.65rem; text-align: left; vertical-align: top; line-height: 1.45; }
        .prose-cio th { background: color-mix(in oklab, var(--ink, #0E1B2C) 5%, transparent); font-family: "IBM Plex Sans", system-ui, sans-serif; font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; color: color-mix(in oklab, var(--ink, #0E1B2C) 70%, transparent); }
        .prose-cio td { color: color-mix(in oklab, var(--ink, #0E1B2C) 82%, transparent); }
        .prose-cio a { color: var(--gold, #C2902B); text-decoration: underline; text-underline-offset: 3px; }
      `}</style>
    </main>
  );
}
