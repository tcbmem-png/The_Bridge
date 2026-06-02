import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/twonumbers")({
  beforeLoad: () => {
    throw redirect({ to: "/stipend" });
  },
  component: () => null,
});
