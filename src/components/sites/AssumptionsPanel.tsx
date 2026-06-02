// "Your numbers" — wRVU-share sliders (renormalize to 1) + per-site payer-mix
// preset dropdowns + optional advanced drawer to edit the raw four percentages.
// All inputs labeled illustrative · needs the worklist (dashed feed).

import { useState } from "react";
import type { Site, SiteMix } from "../../lib/sites/types";
import { MIX_PRESETS, type MixPresetKey } from "../../lib/sites/sites";
import type { PayerKey } from "../../lib/money/types";
import { fmtPct } from "../../lib/money/format";

const PAYER_LABEL: Record<PayerKey, string> = {
  medicare: "Medicare",
  medicaid: "Medicaid",
  commercial: "Commercial",
  self_pay: "Self-pay",
};

function mixMatchesPreset(mix: SiteMix, p: MixPresetKey): boolean {
  const ref = MIX_PRESETS[p].mix;
  const keys: PayerKey[] = ["medicare", "medicaid", "commercial", "self_pay"];
  return keys.every((k) => Math.abs(mix[k] - ref[k]) < 0.005);
}

export function AssumptionsPanel({
  sites,
  onShareChange,
  onMixChange,
  onReset,
}: {
  sites: Site[];
  onShareChange: (id: string, newShare: number) => void;
  onMixChange: (id: string, mix: SiteMix) => void;
  onReset: () => void;
}) {
  const [advancedId, setAdvancedId] = useState<string | null>(null);
  const shareSum = sites.reduce((s, x) => s + x.wrvu_share, 0);

  return (
    <section
      aria-labelledby="assumptions-title"
      className="rounded-md border border-ink/15 bg-paper p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
            Your numbers
          </div>
          <h2 id="assumptions-title" className="font-display mt-1 text-lg text-ink">
            Assumptions panel.
          </h2>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="font-mono-tab rounded-full border border-ink/25 px-3 py-1 text-[10.5px] uppercase tracking-[0.12em] text-ink/65 hover:border-ink/55"
        >
          reset
        </button>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-ink/65">
        From your worklist — estimate for now. Sliders renormalize to 100%.
      </p>

      {/* wRVU-share sliders */}
      <div className="mt-4 space-y-3">
        {sites.map((s) => (
          <div key={s.id} className="rounded border border-ink/10 bg-paper p-3">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-[13px] text-ink">{s.label}</div>
                <div className="font-mono-tab text-[10px] uppercase tracking-[0.12em] text-ink/50">
                  {s.kind === "hospital" ? "hospital" : "outside group"}
                  {s.is_catch_site ? " · catch-site" : ""}
                </div>
              </div>
              <div className="font-mono-tab text-sm text-ink">
                {fmtPct(s.wrvu_share * 100, 1)}
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(s.wrvu_share * 100)}
              onChange={(e) => onShareChange(s.id, Number(e.target.value) / 100)}
              className="mt-2 w-full accent-[var(--ink)]"
              aria-label={`wRVU share for ${s.label}`}
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
                Payer mix
              </label>
              <select
                value={
                  (Object.keys(MIX_PRESETS) as MixPresetKey[]).find((k) =>
                    mixMatchesPreset(s.payer_mix, k),
                  ) ?? "__custom"
                }
                onChange={(e) => {
                  const k = e.target.value as MixPresetKey | "__custom";
                  if (k !== "__custom") onMixChange(s.id, { ...MIX_PRESETS[k].mix });
                }}
                className="font-mono-tab rounded border border-ink/20 bg-paper px-2 py-1 text-[11.5px] text-ink"
                aria-label={`Payer-mix preset for ${s.label}`}
              >
                <option value="__custom">custom (advanced)</option>
                {(Object.keys(MIX_PRESETS) as MixPresetKey[]).map((k) => (
                  <option key={k} value={k}>
                    {MIX_PRESETS[k].label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setAdvancedId(advancedId === s.id ? null : s.id)}
                className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55 underline-offset-2 hover:text-ink hover:underline"
              >
                {advancedId === s.id ? "hide advanced" : "advanced"}
              </button>
            </div>

            {advancedId === s.id ? (
              <AdvancedMix
                mix={s.payer_mix}
                onChange={(m) => onMixChange(s.id, m)}
              />
            ) : (
              <div className="font-mono-tab mt-2 grid grid-cols-4 gap-x-2 text-[10.5px] text-ink/55">
                {(Object.keys(s.payer_mix) as PayerKey[]).map((k) => (
                  <span key={k}>
                    {PAYER_LABEL[k]} {fmtPct(s.payer_mix[k] * 100, 0)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-ink/55">
        Σ shares · {fmtPct(shareSum * 100, 1)} (renormalized to 100% on every
        drag). Per-site payer mix · illustrative until billing-by-site is
        joined.
      </p>
    </section>
  );
}

function AdvancedMix({
  mix,
  onChange,
}: {
  mix: SiteMix;
  onChange: (m: SiteMix) => void;
}) {
  const keys: PayerKey[] = ["medicare", "medicaid", "commercial", "self_pay"];
  const sum = keys.reduce((s, k) => s + mix[k], 0);
  const setK = (k: PayerKey, v: number) =>
    onChange({ ...mix, [k]: Math.max(0, Math.min(1, v)) });
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 rounded border border-ink/10 bg-ink/[0.03] p-2 md:grid-cols-4">
      {keys.map((k) => (
        <label key={k} className="flex flex-col gap-1">
          <span className="font-mono-tab text-[10px] uppercase tracking-[0.12em] text-ink/55">
            {PAYER_LABEL[k]} %
          </span>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={Math.round(mix[k] * 100)}
            onChange={(e) => setK(k, Number(e.target.value) / 100)}
            className="font-mono-tab w-full rounded border border-ink/15 bg-paper px-1.5 py-1 text-right text-[12px] text-ink"
          />
        </label>
      ))}
      <span className="font-mono-tab col-span-2 text-[10.5px] text-ink/55 md:col-span-4">
        Σ · {fmtPct(sum * 100, 1)} — raw edits not auto-normalized; the engine
        uses these as-is.
      </span>
    </div>
  );
}
