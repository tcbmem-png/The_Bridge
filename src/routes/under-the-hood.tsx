import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FallToken } from "../components/FallToken";
import { SectionTag } from "../components/story/SectionTag";
import { SiloDiagram, ProvenanceList } from "../components/hood/SiloDiagram";
import { Questionnaire } from "../components/hood/Questionnaire";
import { BuildPlan } from "../components/hood/BuildPlan";
import { Dashboard } from "../components/dashboard/Dashboard";
import { generateSpec } from "../lib/engine/generateSpec";
import { renderSpecMarkdown } from "../lib/engine/renderSpec";
import { runEngineSelfCheck } from "../lib/engine/selfCheck";
import type { Answers } from "../lib/engine/types";

export const Route = createFileRoute("/under-the-hood")({
  head: () => ({
    meta: [
      { title: "Under the Hood — The Bridge" },
      {
        name: "description",
        content:
          "The harness, the silos, and a deterministic engine that turns answers into an architecture spec. No AI. Flat code.",
      },
      { property: "og:title", content: "Under the Hood — The Bridge" },
      {
        property: "og:description",
        content:
          "Three silos, one fact table. A deterministic engine renders a complete build spec from eleven multiple-choice answers.",
      },
    ],
  }),
  component: UnderTheHoodPage,
});

function UnderTheHoodPage() {
  const [answers, setAnswers] = useState<Answers>({});
  const [specOpen, setSpecOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    runEngineSelfCheck();
  }, []);

  const spec = useMemo(() => generateSpec(answers), [answers]);
  const md = useMemo(() => renderSpecMarkdown(answers, spec), [answers, spec]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const download = () => {
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "the-bridge-architecture-spec.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main>
      {/* 1) Diagnosis */}
      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="font-mono-tab flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-ink/65">
            <FallToken size={12} tone="teal" />
            <span>Under the Hood</span>
          </div>
          <h1 className="font-display mt-5 max-w-4xl text-[2.25rem] leading-[1.05] md:text-[3.5rem]">
            You're not short on data. You're short on a harness.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink/80">
            Every system already captures its piece. They don't talk — so the group runs three partial dashboards and still can't answer the one question that matters.
          </p>
        </div>
      </section>

      {/* 2 + 3) Silos + provenance */}
      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <SectionTag tone="teal">Silos · what each system already holds</SectionTag>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-12">
            <div className="md:col-span-8">
              <SiloDiagram />
            </div>
            <div className="md:col-span-4">
              <ProvenanceList />
            </div>
          </div>
        </div>
      </section>

      {/* 4) Credit-forward */}
      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <SectionTag tone="gold">Credit · foundation in place</SectionTag>
          <h2 className="font-display mt-5 max-w-3xl text-[1.75rem] leading-[1.15] md:text-[2.5rem]">
            You built the foundation — we set the keystone.
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <p className="text-base leading-relaxed text-ink/80">
              Every tool the group already runs — mPower, the RCM portal, PACS analytics — does its job and makes this faster to build. None of that spend is wasted; the harness sits on top of it.
            </p>
            <p className="text-base leading-relaxed text-ink/80">
              The one thing no single vendor can sell is the layer that joins billing and reports and worklist by site of service. No vendor owns all three domains. That is market structure, not a judgment on what you bought.
            </p>
          </div>
          <p className="mt-8 max-w-3xl text-sm leading-relaxed text-ink/70">
            Want the full technical + compliance detail — what it is, what it touches, the PHI/BAA wall?{" "}
            <Link
              to="/for-it"
              className="text-[var(--gold)] underline decoration-[color-mix(in_oklab,var(--gold)_45%,transparent)] underline-offset-[3px] hover:decoration-[var(--gold)]"
            >
              For IT / your CIO →
            </Link>
          </p>

        </div>
      </section>

      {/* 5) Banner */}
      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="rounded-xl border border-ink bg-ink p-6 text-paper md:p-8">
            <div className="flex items-center gap-4">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--teal)]"
              />
              <p className="font-display text-xl leading-snug md:text-2xl">
                This isn't AI. It's flat code joining data you already generate.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6) Engine */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <SectionTag tone="ink">Engine · answers in, spec out</SectionTag>
          <h2 className="font-display mt-5 max-w-3xl text-[1.75rem] leading-[1.15] md:text-[2.5rem]">
            Eleven answers determine the build plan.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/70">
            The rules are flat lookup. Same answers in, same spec out. No model is reasoning about your group — the spec follows directly from the rules.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-12">
            <div className="md:col-span-6">
              <Questionnaire
                answers={answers}
                onChange={setAnswers}
                onReset={() => setAnswers({})}
              />
            </div>
            <div className="md:col-span-6">
              <BuildPlan answers={answers} spec={spec} />
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setSpecOpen((v) => !v)}
                  className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90"
                >
                  {specOpen ? "Hide build spec" : "Generate build spec"}
                </button>
                <button
                  type="button"
                  onClick={copy}
                  className="rounded-full border border-ink/30 bg-paper px-4 py-2 text-sm font-medium text-ink hover:border-ink/60"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={download}
                  className="rounded-full border border-ink/30 bg-paper px-4 py-2 text-sm font-medium text-ink hover:border-ink/60"
                >
                  Download .md
                </button>
              </div>
            </div>
          </div>

          {specOpen ? (
            <div className="mt-10 rounded-xl border border-ink/20 bg-paper p-5 md:p-8">
              <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
                Architecture spec · illustrative
              </div>
              <pre className="font-mono-tab mt-4 max-h-[640px] overflow-auto whitespace-pre-wrap text-[12px] leading-relaxed text-ink/85">
                {md}
              </pre>
            </div>
          ) : null}

          {/* Dashboard · faithful renderer of engine truth. Flips as answers land. */}
          <div className="mt-16">
            <SectionTag tone="teal">Dashboard · engine truth, rendered</SectionTag>
            <h3 className="font-display mt-5 max-w-3xl text-[1.5rem] leading-[1.15] md:text-[2rem]">
              The same panels, eight of them, flip as the questionnaire is answered.
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/70">
              Panel-level state comes from the engine. A whole panel flips when
              its domain is ready. Compliance trumps. Money panels read the
              shared model — a number here matches the Sandbox and the Story
              win-row to the dollar.
            </p>
            <div className="mt-8">
              <Dashboard spec={spec} />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-ink/15">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-10 md:py-14">
          <Link
            to="/faq"
            className="inline-flex items-center gap-2 font-mono-tab text-[11px] uppercase tracking-[0.12em] text-ink/55 underline underline-offset-4 decoration-ink/20 hover:text-ink hover:decoration-ink/50 transition-colors"
          >
            Questions you're probably asking →
          </Link>
          <Link
            to="/internal/harness"
            className="inline-flex items-center gap-2 font-mono-tab text-[11px] uppercase tracking-[0.12em] text-[var(--gold)] underline underline-offset-4 decoration-[color-mix(in_oklab,var(--gold)_45%,transparent)] hover:decoration-[var(--gold)] transition-colors"
          >
            Run it yourself →
          </Link>
        </div>
      </section>
    </main>
  );
}
