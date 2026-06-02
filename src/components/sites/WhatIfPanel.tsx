// "Reduce the fall" inputs — all DASHED provenance (clinical / billing pins).
// Conservative defaults. Break-even redeploy shown plainly.

import type { Site } from "../../lib/sites/types";
import type { WhatIfInputs } from "../../lib/sites/whatif";

export function WhatIfPanel({
  sites,
  inp,
  onChange,
  breakEven,
}: {
  sites: Site[];
  inp: WhatIfInputs;
  onChange: (next: WhatIfInputs) => void;
  breakEven: number;
}) {
  const catchSites = sites.filter((s) => s.is_catch_site);
  const set = <K extends keyof WhatIfInputs>(k: K, v: WhatIfInputs[K]) =>
    onChange({ ...inp, [k]: v });
  const setAvoid = (id: string, v: number) =>
    onChange({ ...inp, avoidable_share: { ...inp.avoidable_share, [id]: v } });

  return (
    <section
      aria-labelledby="whatif-title"
      className="rounded-md border border-dashed border-ink/35 bg-paper p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
            What-if · reduce the fall
          </div>
          <h2 id="whatif-title" className="font-display mt-1 text-lg text-ink">
            The lever, and the demand assumption.
          </h2>
        </div>
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
          break-even redeploy · {Math.round(breakEven * 100)}%
        </div>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-ink/65">
        Two sliders, kept separate. <em className="not-italic text-ink/80">reduce</em>{" "}
        shrinks need regardless of redeploy.{" "}
        <em className="not-italic text-ink/80">redeploy</em> decides whether the
        group's collections rise or fall.
      </p>

      {/* The two levers */}
      <div className="mt-4 space-y-4">
        <Slider
          label="reduce · cut the avoidable fall"
          note="patient-side win — fewer unnecessary scans, site climbs toward y_bar"
          value={inp.reduce}
          onChange={(v) => set("reduce", v)}
        />
        <Slider
          label="redeploy · freed capacity finds high-value work"
          note={`Jonathan's "unlimited demand." Below ${Math.round(breakEven * 100)}% the group loses volume.`}
          value={inp.redeploy}
          onChange={(v) => set("redeploy", v)}
          dashed
        />
      </div>

      {/* Per-catch-site avoidable share */}
      <div className="mt-5 space-y-2 border-t border-ink/10 pt-3">
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
          Avoidable share · per catch site
          <span className="ml-1 text-ink/40">· needs Jonathan's low-yield definition</span>
        </div>
        {catchSites.map((s) => {
          const v = inp.avoidable_share[s.id] ?? 0;
          return (
            <div key={s.id} className="flex items-center gap-3">
              <div className="w-32 truncate text-[12px] text-ink">{s.label}</div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(v * 100)}
                onChange={(e) => setAvoid(s.id, Number(e.target.value) / 100)}
                className="flex-1 accent-[var(--ink)]"
                aria-label={`Avoidable share for ${s.label}`}
              />
              <div className="font-mono-tab w-12 text-right text-[11.5px] text-ink">
                {Math.round(v * 100)}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Yields + target */}
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-ink/10 pt-3">
        <NumberField
          k="y_fall"
          unit="$/wRVU"
          note="billing assumption · y_fall ≤ y_cov"
          value={inp.y_fall}
          onChange={(v) => set("y_fall", v)}
        />
        <NumberField
          k="y_redeploy"
          unit="$/wRVU"
          note="≈ y_core · the receiver's yield"
          value={inp.y_redeploy}
          onChange={(v) => set("y_redeploy", v)}
        />
        <label className="col-span-2 flex flex-col gap-1">
          <span className="font-mono-tab text-[10px] uppercase tracking-[0.12em] text-ink/55">
            redeploy_target · where freed capacity lands
          </span>
          <select
            value={inp.redeploy_target}
            onChange={(e) => set("redeploy_target", e.target.value)}
            className="font-mono-tab rounded border border-ink/20 bg-paper px-2 py-1 text-[11.5px] text-ink"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function Slider({
  label,
  note,
  value,
  onChange,
  dashed,
}: {
  label: string;
  note: string;
  value: number;
  onChange: (v: number) => void;
  dashed?: boolean;
}) {
  return (
    <div
      className={`rounded border ${dashed ? "border-dashed" : ""} border-ink/15 bg-paper p-3`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[12.5px] text-ink">{label}</div>
        <div className="font-mono-tab text-sm text-ink">
          {Math.round(value * 100)}%
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="mt-1.5 w-full accent-[var(--ink)]"
        aria-label={label}
      />
      <div className="mt-1 text-[10.5px] text-ink/55">{note}</div>
    </div>
  );
}

function NumberField({
  k,
  unit,
  note,
  value,
  onChange,
}: {
  k: string;
  unit: string;
  note: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono-tab text-[10px] uppercase tracking-[0.12em] text-ink/55">
        {k} <span className="text-ink/40">· {unit}</span>
      </span>
      <input
        type="number"
        min={0}
        step={1}
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="font-mono-tab w-full rounded border border-ink/15 bg-paper px-1.5 py-1 text-right text-[12px] text-ink"
      />
      <span className="text-[10px] text-ink/45">{note}</span>
    </label>
  );
}
