// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // PGlite ships WASM + data files that vite-deps must not pre-bundle.
    optimizeDeps: {
      exclude: ["@electric-sql/pglite"],
    },
    // PGlite (and a few other npm modules) reference bare `process` / `process.env`
    // at runtime. The production browser bundle has no Node globals, so without
    // these defines the harness panels throw "process is not defined".
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
      "process.env": "({})",
      "process.platform": JSON.stringify("browser"),
      "process.version": JSON.stringify(""),
      process: "({ env: {}, platform: 'browser', version: '', versions: { node: '' } })",
    },
  },
});
