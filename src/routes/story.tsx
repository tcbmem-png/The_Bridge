import { createFileRoute } from "@tanstack/react-router";
import html from "../../public/story.html?raw";

export const Route = createFileRoute("/story")({
  server: {
    handlers: {
      GET: () =>
        new Response(html, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
    },
  },
});
