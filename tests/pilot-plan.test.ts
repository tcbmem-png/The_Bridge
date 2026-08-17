import { describe, expect, it } from "vitest";
import {
  buildPilotPlan,
  renderPilotPlanMarkdown,
  PLAN_TITLE,
  UNPRICED,
} from "../src/lib/intake/pilotPlan";
import type { CustodyEntry } from "../src/lib/intake/custody";
import { recommend } from "../src/lib/intake/recommend";

function entry(sourceKey: string, fileName: string): CustodyEntry {
  return {
    fileName,
    byteSize: 100,
    sha256: `${sourceKey.padEnd(8, "0")}${"a".repeat(56)}`.slice(0, 64),
    receivedAt: "2026-01-01T00:00:00.000Z",
    status: "loaded",
    sourceKey,
    stage: null,
    rows: 10,
    rejectedRows: 0,
    repairs: 0,
    note: "loaded",
  };
}

const stage1 = [
  entry("encounter", "work.csv"),
  entry("mpfs", "rvu.csv"),
  entry("bank", "deposits.csv"),
];

describe("pilot-preparation export", () => {
  it("renders the generic artifact with no files loaded", () => {
    const plan = buildPilotPlan({ custody: [], cfg: {} });
    expect(plan.generic).toBe(true);
    expect(plan.title).toBe(PLAN_TITLE);
    expect(plan.bring.length).toBe(7);
    expect(plan.questions.length).toBe(6);
    const md = renderPilotPlanMarkdown(plan);
    expect(md).toContain("BRING WHAT YOU ALREADY HAVE");
    expect(md).toContain("QUESTIONS WE WILL ASK");
    // no EDI jargon in the first-meeting checklist
    const checklist = plan.bring.join(" ");
    for (const jargon of ["837", "835", "ERA", "MPFS", "CARC", "RARC"])
      expect(checklist).not.toContain(jargon);
  });

  it("uses the practice name only when known", () => {
    expect(buildPilotPlan({ custody: [], cfg: {} }).title).not.toContain("Unnamed");
    expect(
      buildPilotPlan({ custody: [], cfg: {}, practiceName: "  " }).title,
    ).toBe(PLAN_TITLE);
    expect(
      buildPilotPlan({ custody: [], cfg: {}, practiceName: "Lakeside Cardiology" }).title,
    ).toBe("PREPARE FOR LAKESIDE CARDIOLOGY BRIDGE REVIEW");
  });

  it("reflects the current intake stage and becomes practice-specific", () => {
    const plan = buildPilotPlan({ custody: stage1, cfg: {} });
    expect(plan.generic).toBe(false);
    expect(plan.stageLabel).toContain("Your own books");
    expect(plan.provided.map((p) => p.fileName)).toEqual([
      "work.csv",
      "rvu.csv",
      "deposits.csv",
    ]);
    expect(plan.establishes.length).toBeGreaterThan(0);
    expect(plan.gaps.length).toBeGreaterThan(0);
  });

  it("does not fork the recommendation engine", () => {
    for (const custody of [[], stage1, [...stage1, entry("claims", "claims.csv")]]) {
      const plan = buildPilotPlan({ custody, cfg: {} });
      const loaded = new Set(
        custody.filter((c) => c.status === "loaded").map((c) => c.sourceKey!),
      );
      const rec = recommend(loaded, {});
      expect(plan.nextSource?.sourceKey ?? null).toBe(rec.primary?.sourceKey ?? null);
    }
  });

  it("prints UNPRICED rather than $0 when no amount is supported", () => {
    const plan = buildPilotPlan({ custody: stage1, cfg: {} });
    expect(plan.nextSource?.amountAtIssue).toBeNull();
    const md = renderPilotPlanMarkdown(plan);
    expect(md).toContain(UNPRICED);
    expect(md).not.toContain("$0");
  });

  it("prints a supported amount verbatim when the record carries one", () => {
    const plan = buildPilotPlan({
      custody: [...stage1, entry("claims", "c.csv"), entry("remit", "r.csv")],
      cfg: {},
      amountsAtIssue: { rcm_ledger: "$91,240.00" },
    });
    expect(plan.nextSource?.sourceKey).toBe("rcm_ledger");
    expect(plan.nextSource?.amountAtIssue).toBe("$91,240.00");
    expect(renderPilotPlanMarkdown(plan)).toContain("$91,240.00");
  });

  it("changes the source request as each dependency closes, with no stale asks", () => {
    const s1 = buildPilotPlan({ custody: stage1, cfg: {} });
    expect(s1.nextSource?.sourceKey).toBe("claims");
    expect(s1.notYetRequired).toContain("Raw posting ledger");

    const s2 = buildPilotPlan({ custody: [...stage1, entry("claims", "c.csv")], cfg: {} });
    expect(s2.nextSource?.sourceKey).toBe("remit");
    expect(s2.notYetRequired).not.toContain(s2.nextSource!.source);

    const s3 = buildPilotPlan({
      custody: [...stage1, entry("claims", "c.csv"), entry("remit", "r.csv")],
      cfg: {},
    });
    expect(s3.nextSource?.sourceKey).toBe("rcm_ledger");
    // the closed ask is gone
    expect(s3.notYetRequired).not.toContain("835 / ERA");
    expect(s3.forNextMeeting).toContain("raw posting ledger");
  });

  it("carries WHY, WHAT QUESTION and HOW TO ASK on every request", () => {
    const md = renderPilotPlanMarkdown(buildPilotPlan({ custody: stage1, cfg: {} }));
    expect(md).toContain("WHY WE NEED IT");
    expect(md).toContain("WHAT QUESTION IT WOULD ANSWER");
    expect(md).toContain("HOW TO ASK FOR IT");
    expect(md).toContain("NOT YET REQUIRED");
    expect(md).toContain("FOR THE NEXT MEETING");
  });

  it("keeps a custody appendix on current loaded source hashes", () => {
    const plan = buildPilotPlan({ custody: stage1, cfg: {} });
    expect(plan.custody.map((c) => c.sha256)).toEqual(stage1.map((c) => c.sha256));
    const md = renderPilotPlanMarkdown(plan);
    expect(md).toContain("APPENDIX — SOURCE CUSTODY");
    for (const c of stage1) expect(md).toContain(c.sha256!);
  });
});
