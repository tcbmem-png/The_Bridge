// Unfurl / Open Graph metadata regression check.
//
// The public root must present the current Bridge identity — not stale
// radiology / extractor / stipend framing — and must carry enough Open Graph
// metadata to unfurl cleanly in iMessage, Slack, LinkedIn, X and Teams.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = readFileSync(join(process.cwd(), "src/routes/__root.tsx"), "utf8");
const index = readFileSync(join(process.cwd(), "src/routes/index.tsx"), "utf8");

const site = readFileSync(join(process.cwd(), "src/lib/site.ts"), "utf8");

const surfaces = [
  ["__root", root],
  ["index", index],
] as const;

describe("unfurl metadata", () => {
  for (const [name, src] of surfaces) {
    it(`${name}: title carries The Bridge`, () => {
      expect(site).toContain("The Bridge — See What Happened to the Money");
      expect(src).toContain("SITE.title");
    });

    it(`${name}: description states the product thesis`, () => {
      expect(site).toContain("independent economic record for physician groups");
      expect(src).toContain("SITE.description");
    });

    it(`${name}: open graph + twitter tags present`, () => {
      expect(src).toContain("og:title");
      expect(src).toContain("og:description");
      expect(src).toContain("og:image");
      expect(src).toContain("summary_large_image");
    });

    it(`${name}: og:image is an absolute url`, () => {
      expect(site).toContain("https://mdmd.dev/og/the-bridge.png");
      expect(src).toContain("og:image");
    });

    it(`${name}: canonical points at mdmd.dev`, () => {
      expect(site).toContain('origin: "https://mdmd.dev"');
      expect(src).toMatch(/canonical|og:url/);
    });

    it(`${name}: no stale identity`, () => {
      for (const stale of [
        "Radiology Business Tools",
        "Extractor",
        "stipend",
        "lovable.app",
        "localhost",
      ]) {
        expect(src).not.toContain(stale);
      }
    });
  }
});

describe("landing copy doctrine", () => {
  it("keeps the hero headline and unknown-is-not-zero", () => {
    expect(index).toContain("You did the work.");
    expect(index).toContain("Unknown is not zero.");
  });

  it("uses evidentiary language, not categorical nonexistence", () => {
    expect(index).not.toContain("Where money goes missing");
    expect(index).not.toContain("no billing artefact exists");
    expect(index).toContain("no matching claim line in the record");
    expect(index).toContain("no remittance in the record");
  });
});
