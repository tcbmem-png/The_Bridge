import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/twonumbers" });
  },
  component: () => null,
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
