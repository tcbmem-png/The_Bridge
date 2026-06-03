import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/cio")({
  beforeLoad: () => {
    throw redirect({ to: "/for-it" });
  },
});
