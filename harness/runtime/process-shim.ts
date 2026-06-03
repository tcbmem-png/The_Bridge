// PGlite (and a few other Node-origin packages) reference bare `process` and
// `process.env` at runtime. The production browser bundle has no Node globals,
// so without this shim the first query throws "process is not defined" and
// every harness panel renders that error in place of data. Imported FIRST
// from harness/runtime/db.ts so it runs before PGlite is evaluated.
if (
  typeof globalThis !== "undefined" &&
  typeof (globalThis as { process?: unknown }).process === "undefined"
) {
  (globalThis as { process: unknown }).process = {
    env: {},
    platform: "browser",
    version: "",
    versions: { node: "" },
    nextTick: (cb: () => void) => Promise.resolve().then(cb),
  };
}

export {};
