import { createFileRoute } from "@tanstack/react-router";
import { FAQ } from "../components/faq/FAQ";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — The Bridge" },
      {
        name: "description",
        content:
          "Plain answers to the questions you're probably asking. No funnel. No CTA.",
      },
      { property: "og:title", content: "FAQ — The Bridge" },
      {
        property: "og:description",
        content:
          "Plain answers to the questions you're probably asking. No funnel. No CTA.",
      },
    ],
  }),
  component: FAQPage,
});

function FAQPage() {
  return (
    <main>
      <FAQ />
    </main>
  );
}
