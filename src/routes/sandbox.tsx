import { createFileRoute } from "@tanstack/react-router";
import { FallToken } from "../components/FallToken";
import { SandboxInputs } from "../components/sandbox/Inputs";
import { SandboxOutputs } from "../components/sandbox/Outputs";
import { MathDrawer } from "../components/sandbox/MathDrawer";
import { ResidualToggle } from "../components/sandbox/ResidualToggle";
import { SandboxCurve } from "../components/sandbox/Curve";
import { PresetBanner } from "../components/PresetBanner";

export const Route = createFileRoute("/sandbox")({
  head: () => ({
    meta: [
      { title: "Sandbox — The Bridge" },
      {
        name: "description",
        content:
          "Native-unit inputs the radiologist and CFO already know. Pure-function math. Illustrative sample data.",
      },
      { property: "og:title", content: "Sandbox — The Bridge" },
      {
        property: "og:description",
        content:
          "wRVUs, $/wRVU, payer mix, fall pattern. Move the numbers a radiologist and a CFO already carry.",
      },
    ],
  }),
  component: SandboxPage,
});

function SandboxPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      <PresetBanner />
      <header className="max-w-3xl">
        <div className="font-mono-tab flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-ink/65">
          <FallToken size={12} tone="gold" />
          <span>Sandbox · The fall, priced</span>
        </div>
        <h1 className="font-display mt-5 text-[2.25rem] leading-[1.1] md:text-[3.25rem]">
          Set your own assumptions.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-ink/75">
          We fixed the arithmetic, not the answer. Move any lever and the curve recomputes to the dollar.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <SandboxInputs />
        <SandboxOutputs />
      </div>

      <div className="mt-5">
        <ResidualToggle />
      </div>

      <div className="mt-5">
        <MathDrawer />
      </div>

      <SandboxCurve />
    </main>
  );
}
