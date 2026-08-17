import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { IntakeDrop } from "../components/intake/IntakeDrop";
import { CustodyLedger } from "../components/intake/CustodyLedger";
import { PracticeQuestionnaire } from "../components/intake/PracticeQuestionnaire";
import { OntologyReview } from "../components/intake/OntologyReview";
import { ReadinessReport } from "../components/intake/ReadinessReport";
import {
  clearCustody,
  loadCustody,
  saveCustody,
  type CustodyEntry,
} from "../lib/intake/custody";
import { clearConfig, loadConfig, saveConfig, type PracticeConfig } from "../lib/intake/config";
import { buildReadiness } from "../lib/intake/readiness";

export const Route = createFileRoute("/intake")({
  head: () => ({
    meta: [
      { title: "Intake — start with what you already have" },
      {
        name: "description",
        content:
          "Bring the exports a physician group already holds. The record hashes each file, says what it can establish, names what stays tangled, and asks for the one source that closes it.",
      },
      { property: "og:title", content: "Intake — start with what you already have" },
      {
        property: "og:description",
        content:
          "Progressive intake for a physician group's economic record: chain of custody, practice configuration, readiness, and the next source to request.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IntakePage,
  ssr: false,
});

function IntakePage() {
  const [entries, setEntries] = useState<CustodyEntry[]>(() => loadCustody());
  const [cfg, setCfg] = useState<PracticeConfig>(() => loadConfig());

  const updateEntries = (next: CustodyEntry[]) => {
    setEntries(next);
    saveCustody(next);
  };
  const updateCfg = (next: PracticeConfig) => {
    setCfg(next);
    saveConfig(next);
  };

  const report = useMemo(() => buildReadiness(entries, cfg), [entries, cfg]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink/50">
          Real practice intake
        </p>
        <h1 className="mt-2 max-w-[24ch] font-display text-[34px] leading-[1.15]">
          Start with what you already have.
        </h1>
        <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-ink/75">
          No group hands over twelve exports on day one, and it should not have to.
          Bring what exists today. The record will say what those sources establish,
          what stays tangled, and the exact next document that would resolve it —
          and then the question gets narrower. Everything runs in this tab; no file
          is uploaded, and closing the tab ends it.
        </p>
        <p className="mt-3 font-mono-tab text-[11.5px] text-ink/55">
          Reading the result:{" "}
          <Link to="/record" className="underline underline-offset-[3px] hover:text-ink">
            the record
          </Link>{" "}
          ·{" "}
          <Link to="/method" className="underline underline-offset-[3px] hover:text-ink">
            the method
          </Link>
        </p>
      </header>

      <div className="mt-8">
        <IntakeDrop entries={entries} onEntries={updateEntries} />
      </div>

      <CustodyLedger entries={entries} />
      <PracticeQuestionnaire cfg={cfg} onChange={updateCfg} />
      <OntologyReview cfg={cfg} />
      <ReadinessReport report={report} />

      <footer className="mt-12 flex flex-wrap items-center gap-3 border-t border-ink/15 pt-5">
        <button
          type="button"
          onClick={() => {
            clearCustody();
            clearConfig();
            setEntries([]);
            setCfg({});
          }}
          className="rounded-md border border-ink/20 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink/70 hover:text-ink"
        >
          Clear this session
        </button>
        <span className="font-mono-tab text-[11px] text-ink/50">
          Files, elections and the record itself live only in this tab.
        </span>
      </footer>
    </main>
  );
}
