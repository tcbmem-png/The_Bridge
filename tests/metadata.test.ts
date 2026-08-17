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

const surfaces = [
  ["__root", root],
  ["index", index],
] as const;

describe("unfurl metadata", () => {
  for (const [name, src] of surfaces) {
    it(`${name}: title carries The Bridge`, () => {
      expect(src).toContain("The Bridge — See What Happened to the Money");
    });

    it(`${name}: description states the product thesis`, () => {
      expect(src).toContain("independent economic record for physician groups");
    });

    it(`${name}: open graph + twitter tags present`, () => {
      expect(src).toContain("og:title");
      expect(src).toContain("og:description");
      expect(src).toContain("og:image");
      expect(src).toContain("summary_large_image");
    });

    it(`${name}: og:image is an absolute url`, () => {
      expect(src).toContain("https://clinic-data-unite.lovable.app");
      expect(src).toContain("og-bridge.jpg");
    });

    it(`${name}: no stale identity`, () => {
      for (const stale of ["Radiology Business Tools", "Extractor", "stipend", "Illustrative\""]) {
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
