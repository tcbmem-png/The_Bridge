import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PhiBanner } from "../components/harness/PhiBanner";
import { SegmentMonthly } from "../components/harness/SegmentMonthly";
import { CashTieout } from "../components/harness/CashTieout";
import { VolumeTieout } from "../components/harness/VolumeTieout";
import { HandoffContract } from "../components/harness/HandoffContract";
import { LineageDrill } from "../components/harness/LineageDrill";
import { UploadPortal } from "../components/harness/UploadPortal";
import { IntegrityPanel } from "../components/harness/IntegrityPanel";

export const Route = createFileRoute("/internal/harness")({
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
  const [version, setVersion] = useState(0);
  const [datasetName, setDatasetName] = useState("MOCK RAD GROUP — baseline");

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
          seed. Real Postgres compiled to WebAssembly. No server. No PHI. Drop
          your own CSV exports to watch the recon surfaces light up — session
          only, never written to disk. Real 835/837/RIS belongs in a fork on
          hardware you control. Source of truth:{" "}
          <span className="font-mono text-[11px]">
            harness/sql/radiology_stipend_harness.sql
          </span>
          .
        </p>
        <p className="mt-2 max-w-3xl text-sm text-ink/65">
          Read every line —{" "}
          <a
            href="https://github.com/the-bridge/engine"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--gold)] underline decoration-[color-mix(in_oklab,var(--gold)_45%,transparent)] underline-offset-[3px] hover:decoration-[var(--gold)]"
          >
            Source →
          </a>
        </p>
      </header>

      <PhiBanner />

      {!mounted ? (
        <p className="mt-8 font-mono text-[12px] text-ink/55">
          Booting PGlite in browser…
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6">
          <UploadPortal
            onDatasetChange={() => setVersion((v) => v + 1)}
            datasetName={datasetName}
            setDatasetName={setDatasetName}
          />
          <IntegrityPanel key={`integrity-${version}`} version={version} />
          <SegmentMonthly key={`seg-${version}`} />
          <CashTieout key={`cash-${version}`} />
          <VolumeTieout key={`vol-${version}`} />
          <HandoffContract key={`handoff-${version}`} />
          <LineageDrill key={`lineage-${version}`} />
        </div>
      )}

      <footer className="mt-12 border-t border-ink/10 pt-6">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink/55">
          Sequencing
        </p>
        <p className="mt-2 max-w-3xl text-sm text-ink/75">
          Step 1 (this build): schema + seed + acceptance checks + drop-a-file
          portal, in-browser. Step 2: reconcile against the canonical SQL on
          every revision; the file on disk is the source of truth. Step 3
          (separate decision, on the fork): BAA, encryption at rest, access
          logging, real 835/837/RIS ingestion. The calculator handoff is
          deliberately narrow — see{" "}
          <span className="font-mono text-[11px]">docs/calculator-handoff.md</span>
          . The upload contract — what each CSV needs to contain — lives in{" "}
          <span className="font-mono text-[11px]">docs/upload-portal-contract.md</span>
          .
        </p>
      </footer>
    </main>
  );
}
