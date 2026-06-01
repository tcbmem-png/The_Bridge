import { createFileRoute } from "@tanstack/react-router";
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
    </main>
  );
}
