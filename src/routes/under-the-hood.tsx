import { createFileRoute } from "@tanstack/react-router";
import { FallToken } from "../components/FallToken";

export const Route = createFileRoute("/under-the-hood")({
  head: () => ({
    meta: [
      { title: "Under the Hood — The Bridge" },
      {
        name: "description",
        content: "How the join works. The systems, the fields, the math.",
      },
    ],
  }),
  component: UnderTheHoodPage,
});

function UnderTheHoodPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-20 md:py-28">
      <div className="font-mono-tab flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-ink/65">
        <FallToken size={12} tone="teal" />
        <span>Under the Hood</span>
      </div>
      <h1 className="font-display mt-5 text-[2.25rem] leading-[1.1] md:text-[3.5rem]">
        How the join works.
      </h1>
      <p className="mt-5 max-w-2xl text-ink/65">Coming next.</p>
    </main>
  );
}
