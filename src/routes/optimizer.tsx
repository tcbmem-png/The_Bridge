import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/optimizer")({
  head: () => ({
    meta: [
      { title: "Optimizer — The Bridge" },
      {
        name: "description",
        content:
          "Preview of the Optimizer UI. Runs on your machine. Your data never leaves it.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OptimizerPage,
});

function OptimizerPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <header className="max-w-3xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/55">
          Optimizer
        </p>
        <h1 className="font-display mt-3 text-3xl text-ink sm:text-[2.5rem] sm:leading-[1.1]">
          The Optimizer
        </h1>
        <p className="mt-5 text-base leading-relaxed text-ink/75">
          It runs on your machine. Your data never leaves it. Nothing to upload,
          nothing for us to hold, no BAA to sign. You download it once; it
          builds itself on your hardware; the records stay where they already
          are.
        </p>
      </header>

      <figure className="mt-10">
        <div className="aspect-[16/10] w-full overflow-hidden rounded-md border border-ink/15 bg-[color-mix(in_oklab,var(--ink)_4%,var(--paper))]">
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
            <div
              aria-hidden
              className="h-12 w-12 rounded-full border border-ink/20"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--teal) 30%, transparent), transparent 70%)",
              }}
            />
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/45">
              Optimizer UI · image placeholder
            </p>
          </div>
        </div>
        <figcaption className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55">
          Preview — wiring up the live version next.
        </figcaption>
      </figure>
    </main>
  );
}
