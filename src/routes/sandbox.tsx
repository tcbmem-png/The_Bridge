import { createFileRoute } from "@tanstack/react-router";
import { FallToken } from "../components/FallToken";

export const Route = createFileRoute("/sandbox")({
  head: () => ({
    meta: [
      { title: "The Sandbox — The Bridge" },
      {
        name: "description",
        content: "Move the dials. See what the fall costs at your volume.",
      },
    ],
  }),
  component: SandboxPage,
});

function SandboxPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-20 md:py-28">
      <div className="font-mono-tab flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-ink/65">
        <FallToken size={12} tone="gold" />
        <span>The Sandbox</span>
      </div>
      <h1 className="font-display mt-5 text-[2.25rem] leading-[1.1] md:text-[3.5rem]">
        Move the dials.
      </h1>
      <p className="mt-5 max-w-2xl text-ink/65">Coming next.</p>
    </main>
  );
}
