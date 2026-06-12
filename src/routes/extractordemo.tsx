import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/extractordemo")({
  beforeLoad: () => {
    throw redirect({ to: "/extractordemo/" });
  },
});
