import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PhiBanner } from "../components/harness/PhiBanner";
import { SegmentMonthly } from "../components/harness/SegmentMonthly";
import { CashTieout } from "../components/harness/CashTieout";
import { VolumeTieout } from "../components/harness/VolumeTieout";
import { HandoffContract } from "../components/harness/HandoffContract";
import { LineageDrill } from "../components/harness/LineageDrill";

export const Route = createFileRoute("/harness")({
  head: () => ({
    meta: [
      { title: "Audit harness — synthetic" },
      {
        name: "description",
        content:
          "Synthetic ER stipend audit harness. Real Postgres in the browser, no PHI, no backend.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: HarnessPage,
  ssr: false,
});

function HarnessPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <header className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink/55">
          Hidden · synthetic · separate from /stipend
        </p>
        <h1 className="font-display mt-2 text-3xl text-ink sm:text-4xl">
          ER stipend audit harness.
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-ink/75">
          The canonical schema runs verbatim in this tab against a fabricated
          seed. Real Postgres compiled to WebAssembly. No server, no upload, no
          PHI. The four acceptance checks from the file's footer execute below.
          Source of truth:{" "}
          <span className="font-mono text-[11px]">
            harness/sql/radiology_stipend_harness.sql
          </span>
          .
        </p>
      </header>

      <PhiBanner />

      {!mounted ? (
        <p className="mt-8 font-mono text-[12px] text-ink/55">
          Booting PGlite in browser…
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6">
          <SegmentMonthly />
          <CashTieout />
          <VolumeTieout />
          <HandoffContract />
          <LineageDrill />
        </div>
      )}

      <footer className="mt-12 border-t border-ink/10 pt-6">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink/55">
          Sequencing
        </p>
        <p className="mt-2 max-w-3xl text-sm text-ink/75">
          Step 1 (this build): schema + seed + acceptance checks, in-browser.
          Step 2: reconcile against the canonical SQL on every revision; the file
          on disk is the source of truth. Step 3 (separate decision): BAA,
          encryption at rest, access logging, hosted Postgres, real 835/837/RIS
          ingestion. The calculator handoff is deliberately narrow — see{" "}
          <span className="font-mono text-[11px]">docs/calculator-handoff.md</span>.
        </p>
      </footer>
    </main>
  );
}
