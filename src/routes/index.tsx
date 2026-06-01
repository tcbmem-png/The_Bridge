import { createFileRoute, Link } from "@tanstack/react-router";
import { Hero } from "../components/story/Hero";
import { ActProblem } from "../components/story/ActProblem";
import { ActDashboard } from "../components/story/ActDashboard";
import { ActSolution } from "../components/story/ActSolution";
import { StorySources } from "../components/story/StorySources";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Story — The Bridge" },
      {
        name: "description",
        content:
          "Reading scans nobody pays for. The data is already there. Nobody has joined it.",
      },
      { property: "og:title", content: "The Story — The Bridge" },
      {
        property: "og:description",
        content:
          "Reading scans nobody pays for. The data is already there. Nobody has joined it.",
      },
    ],
  }),
  component: StoryPage,
});

function StoryPage() {
  return (
    <main>
      <Hero />
      <ActProblem />
      <ActDashboard />
      <ActSolution />
      <StorySources />
      <section className="border-t border-ink/15">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <Link
            to="/faq"
            className="inline-flex items-center gap-2 font-mono-tab text-[11px] uppercase tracking-[0.12em] text-ink/55 underline underline-offset-4 decoration-ink/20 hover:text-ink hover:decoration-ink/50 transition-colors"
          >
            Questions you're probably asking →
          </Link>
        </div>
      </section>
    </main>
  );
}
