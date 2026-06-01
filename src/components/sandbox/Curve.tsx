// Sandbox curve — productivity → bonus per partner.
// Implements the build-spec "the-bridge-sandbox-curve-spec.md".
//
// ONE hero slider (avg wRVU / radiologist / year). Three live readouts
// (avg_yield with the provenance glyph — three ticks; bonus_per_partner;
// next_1k_bonus). The plot is bonus_per_partner vs w with a marker that
// tracks the slider, a greyed "unsustainable pace" band past w_sustainable,
// and an optional faint fair-coverage line above.
//
// HONESTY RULE: the flattening is EARNED by inputs. If the user sets y_cov
// near y_core, the curve keeps climbing and next_1k stays large. The shape
// carries the conclusion — no text states it.

import { useMemo, useState } from "react";
import { useMoney } from "../../lib/money/store";
import {
  DEFAULT_CURVE_INPUTS,
  DEFAULT_CORE_MIX,
  DEFAULT_COVERAGE_MIX,
  computeAt,
  deriveYieldForMix,
  sampleBonusCurve,
  type CurveInputs,
} from "../../lib/curve/compute";
import { fmtMoney, fmtCount, fmtDollarsPerWRVU } from "../../lib/money/format";
import { FeedsGlyph } from "../provenance/FeedsGlyph";

// avg_yield is the all-three-feeds number on this site (per provenance spec).
const FEEDS_AVG_YIELD = { billing: true, production: true, workflow: true } as const;

type Overrides = Partial<Pick<CurveInputs, "y_core" | "y_cov">>;

export function SandboxCurve() {
  const { inputs: money } = useMoney();

  // Derived yields from the money module (single source of truth for CF + multipliers).
  const derivedYCore = useMemo(
    () => deriveYieldForMix(DEFAULT_CORE_MIX, money),
    [money],
  );
  const derivedYCov = useMemo(
    () => deriveYieldForMix(DEFAULT_COVERAGE_MIX, money),
    [money],
  );

  // Curve inputs — defaults seeded from spec; y_core/y_cov derived from money.
  const [c, setC] = useState<CurveInputs>({
    ...DEFAULT_CURVE_INPUTS,
    y_core: derivedYCore,
    y_cov: derivedYCov,
  });
  // Track whether the user has overridden the derived yields. If not, keep
  // them in sync with the money module so changing CF / multipliers there
  // flows in here (single source of truth).
  const [overrides, setOverrides] = useState<Overrides>({});
  const yCore = overrides.y_core ?? derivedYCore;
  const yCov = overrides.y_cov ?? derivedYCov;

  // Effective inputs used for compute.
  const eff: CurveInputs = useMemo(
    () => ({ ...c, y_core: yCore, y_cov: yCov }),
    [c, yCore, yCov],
  );

  const [w, setW] = useState<number>(eff.w_default);
  const [groupTotal, setGroupTotal] = useState(false);
  const [showFair, setShowFair] = useState(false);
  // Optional phase-2 fair-coverage overlay: a stipend that lifts y_cov.
  const [y_cov_fair, setYCovFair] = useState<number>(() => Math.max(yCov * 1.6, yCore * 0.7));

  // Clamp w to the (editable) range.
  const wClamped = Math.min(eff.w_max, Math.max(eff.w_min, w));
  const out = useMemo(() => computeAt(wClamped, eff), [wClamped, eff]);
  const samples = useMemo(() => sampleBonusCurve(eff, 200), [eff]);
  const samplesFair = useMemo(
    () => sampleBonusCurve({ ...eff, y_cov: y_cov_fair }, 200),
    [eff, y_cov_fair],
  );

  // Group toggle multiplies headline readouts (not the curve shape).
  const mult = groupTotal ? eff.N : 1;
  const groupSuffix = groupTotal ? ` × ${eff.N}` : " / partner";

  function resetAll() {
    setC({
      ...DEFAULT_CURVE_INPUTS,
      y_core: derivedYCore,
      y_cov: derivedYCov,
    });
    setOverrides({});
    setW(DEFAULT_CURVE_INPUTS.w_default);
    setGroupTotal(false);
    setShowFair(false);
  }

  return (
    <section className="mt-12 rounded-2xl border border-ink/20 bg-paper p-5 md:p-7">
      {/* Header — labels the module as an illustrative teaching model. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.16em] text-ink/55">
            Productivity → bonus · illustrative teaching model
          </div>
          <h2 className="font-display mt-3 text-2xl leading-tight md:text-3xl">
            Slide your productivity. Watch your bonus.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/70">
            A hypothetical model — separate from the reconciled outputs above.
            Every assumption is yours; the curve is whatever your numbers say.
          </p>
        </div>
        <button
          type="button"
          onClick={resetAll}
          className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55 underline-offset-4 hover:underline"
        >
          Reset all
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Plot + slider + readouts */}
        <div className="space-y-4">
          <Plot
            samples={samples}
            samplesFair={showFair ? samplesFair : null}
            wMin={eff.w_min}
            wMax={eff.w_max}
            wSustainable={eff.w_sustainable}
            marker={{ w: wClamped, p: out.bonus_per_partner }}
          />

          {/* Hero slider */}
          <div className="rounded-xl border border-ink/15 bg-paper p-4">
            <div className="flex items-baseline justify-between gap-3">
              <label
                htmlFor="curve-w"
                className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55"
              >
                Avg wRVU / radiologist / yr — THE slider
              </label>
              <span className="font-mono-tab text-base text-ink md:text-lg">
                {fmtCount(wClamped)} wRVU
              </span>
            </div>
            <input
              id="curve-w"
              type="range"
              min={eff.w_min}
              max={eff.w_max}
              step={100}
              value={wClamped}
              onChange={(e) => setW(Number(e.target.value))}
              className="mt-3 w-full accent-[var(--teal)]"
            />
            <div className="font-mono-tab mt-1 flex justify-between text-[10px] uppercase tracking-[0.12em] text-ink/45">
              <span>{fmtCount(eff.w_min)}</span>
              <span>sustainable ≈ {fmtCount(eff.w_sustainable)}</span>
              <span>{fmtCount(eff.w_max)}</span>
            </div>
          </div>

          {/* Live readouts */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {/* avg_yield — tagged with provenance glyph (all-three feeds). */}
            <Readout
              label={
                <span className="inline-flex items-center gap-2">
                  <span>Avg yield</span>
                  <FeedsGlyph
                    feeds={FEEDS_AVG_YIELD}
                    sources={[
                      "p1 — 837/835 (claim & remittance)",
                      "p5 — CMS RVU file (wRVU per CPT)",
                      "p7 — PACS timestamps (shift / site)",
                    ]}
                    note="Avg yield joins billing × production × workflow — the all-three number."
                  />
                </span>
              }
              value={fmtDollarsPerWRVU(out.avg_yield)}
              tone="ink"
            />
            <Readout
              label="Bonus / partner"
              value={fmtMoney(out.bonus_per_partner * mult)}
              subLabel={
                out.bonus_per_partner < 0
                  ? "underwater"
                  : `bonus${groupSuffix}`
              }
              tone={out.bonus_per_partner < 0 ? "red" : "teal"}
            />
            <Readout
              label="Next 1,000 wRVUs add"
              value={fmtMoney(out.next_1k_bonus * mult)}
              subLabel={
                wClamped < eff.w_core
                  ? `at core yield ${fmtDollarsPerWRVU(eff.y_core)}`
                  : `at coverage yield ${fmtDollarsPerWRVU(eff.y_cov)}`
              }
              tone="ink"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink/65">
            <button
              type="button"
              onClick={() => setGroupTotal((v) => !v)}
              className={[
                "font-mono-tab rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors",
                groupTotal
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/25 text-ink/70 hover:border-ink/55",
              ].join(" ")}
            >
              {groupTotal ? `Group total · ×${eff.N}` : "Per partner"}
            </button>
            <button
              type="button"
              onClick={() => setShowFair((v) => !v)}
              className={[
                "font-mono-tab rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors",
                showFair
                  ? "border-[var(--teal)]/60 bg-[var(--teal)]/15 text-[var(--teal)]"
                  : "border-ink/25 text-ink/70 hover:border-ink/55",
              ].join(" ")}
            >
              {showFair ? "Fair-coverage overlay · on" : "Fair-coverage overlay"}
            </button>
            {showFair ? (
              <label className="flex items-center gap-2">
                <span className="font-mono-tab text-[10px] uppercase tracking-[0.12em] text-ink/55">
                  y_cov_fair
                </span>
                <input
                  type="number"
                  step={1}
                  min={0}
                  value={Number(y_cov_fair.toFixed(2))}
                  onChange={(e) => setYCovFair(Number(e.target.value))}
                  className="font-mono-tab w-24 rounded border border-ink/25 bg-paper px-2 py-1 text-right text-xs text-ink outline-none focus:border-[var(--teal)]"
                />
                <span className="font-mono-tab text-[10px] uppercase tracking-[0.10em] text-ink/45">
                  $/wRVU · illustrative
                </span>
              </label>
            ) : null}
          </div>

          <p className="font-mono-tab text-[10px] uppercase tracking-[0.12em] text-ink/45">
            Illustrative model. Set your own assumptions — your curve is yours.
          </p>
        </div>

        {/* Your numbers — assumptions panel */}
        <div className="dot-grid-on-ink rounded-xl bg-ink p-5 text-paper">
          <div className="flex items-center justify-between">
            <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.16em] text-paper/60">
              Your numbers · illustrative · editable
            </div>
            <button
              type="button"
              onClick={resetAll}
              className="font-mono-tab text-[10px] uppercase tracking-[0.12em] text-paper/55 underline-offset-4 hover:underline"
            >
              Reset
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <NumField
              label="w_core"
              unit="wRVU"
              hint="Productivity up to which work is core/well-paid · PLACEHOLDER · Jonathan"
              value={c.w_core}
              step={100}
              min={0}
              onChange={(n) => setC((p) => ({ ...p, w_core: n }))}
            />
            <NumField
              label="w_sustainable"
              unit="wRVU"
              hint="Sustainable annual ceiling — greyed band beyond · PLACEHOLDER · Jonathan"
              value={c.w_sustainable}
              step={100}
              min={0}
              onChange={(n) => setC((p) => ({ ...p, w_sustainable: n }))}
            />
            <NumField
              label="y_core"
              unit="$/wRVU"
              hint={`Derived from CORE mix × money module CF. Override to test. Derived = ${fmtDollarsPerWRVU(derivedYCore)}.`}
              value={Number(yCore.toFixed(2))}
              step={0.5}
              min={0}
              isOverride={overrides.y_core !== undefined}
              onReset={() => setOverrides((o) => ({ ...o, y_core: undefined }))}
              onChange={(n) => setOverrides((o) => ({ ...o, y_core: n }))}
            />
            <NumField
              label="y_cov"
              unit="$/wRVU"
              hint={`Derived from COVERAGE mix × money module CF. Override to test the honesty rule (set near y_core — curve keeps climbing). Derived = ${fmtDollarsPerWRVU(derivedYCov)}.`}
              value={Number(yCov.toFixed(2))}
              step={0.5}
              min={0}
              isOverride={overrides.y_cov !== undefined}
              onReset={() => setOverrides((o) => ({ ...o, y_cov: undefined }))}
              onChange={(n) => setOverrides((o) => ({ ...o, y_cov: n }))}
            />
            <NumField
              label="F · overhead / partner / yr"
              unit="$"
              hint="PLACEHOLDER · CEO / finance"
              value={c.F}
              step={1000}
              min={0}
              onChange={(n) => setC((p) => ({ ...p, F: n }))}
            />
            <NumField
              label="B · base comp / partner / yr"
              unit="$"
              hint="PLACEHOLDER · CEO / finance"
              value={c.B}
              step={1000}
              min={0}
              onChange={(n) => setC((p) => ({ ...p, B: n }))}
            />
            <NumField
              label="N · partners"
              unit="count"
              hint="PLACEHOLDER · genericized fingerprint"
              value={c.N}
              step={1}
              min={1}
              onChange={(n) => setC((p) => ({ ...p, N: n }))}
            />
            <NumField
              label="Range · w_min – w_max"
              unit="wRVU"
              hint={`Default slider range. Default w = ${fmtCount(DEFAULT_CURVE_INPUTS.w_default)}. PLACEHOLDER · Jonathan.`}
              value={c.w_min}
              step={500}
              min={0}
              onChange={(n) => setC((p) => ({ ...p, w_min: n }))}
              secondary={{
                value: c.w_max,
                step: 500,
                min: 0,
                onChange: (n) => setC((p) => ({ ...p, w_max: n })),
              }}
            />
          </div>

          <p className="font-mono-tab mt-5 text-[10px] uppercase tracking-[0.12em] text-paper/45">
            Shared constants (CF, payer multiples) read from the money module
            — single source of truth.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------- Plot ---------- */

function Plot({
  samples,
  samplesFair,
  wMin,
  wMax,
  wSustainable,
  marker,
}: {
  samples: Array<{ w: number; p: number }>;
  samplesFair: Array<{ w: number; p: number }> | null;
  wMin: number;
  wMax: number;
  wSustainable: number;
  marker: { w: number; p: number };
}) {
  const W = 720;
  const H = 320;
  const pad = { l: 56, r: 16, t: 14, b: 32 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  const allPs = [
    ...samples.map((s) => s.p),
    ...(samplesFair ? samplesFair.map((s) => s.p) : []),
    marker.p,
    0,
  ];
  const pMin = Math.min(...allPs);
  const pMax = Math.max(...allPs);
  // Tasteful headroom.
  const yLo = pMin - Math.max(50_000, Math.abs(pMin) * 0.05);
  const yHi = pMax + Math.max(50_000, Math.abs(pMax) * 0.05);

  const xOf = (w: number) => pad.l + ((w - wMin) / (wMax - wMin)) * innerW;
  const yOf = (p: number) => pad.t + (1 - (p - yLo) / (yHi - yLo)) * innerH;

  const path = samples
    .map((s, i) => `${i === 0 ? "M" : "L"} ${xOf(s.w).toFixed(1)} ${yOf(s.p).toFixed(1)}`)
    .join(" ");
  const pathFair = samplesFair
    ? samplesFair
        .map((s, i) => `${i === 0 ? "M" : "L"} ${xOf(s.w).toFixed(1)} ${yOf(s.p).toFixed(1)}`)
        .join(" ")
    : null;

  const zeroY = yOf(0);
  const sustX = xOf(wSustainable);

  // Y-axis ticks — round to nearest $100k.
  const ticks = niceTicks(yLo, yHi, 5);

  return (
    <div className="rounded-xl border border-ink/20 bg-paper p-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        role="img"
        aria-label="Bonus per partner vs avg wRVU per radiologist"
      >
        {/* Unsustainable pace band — apparent, not captioned. */}
        {sustX < pad.l + innerW ? (
          <rect
            x={sustX}
            y={pad.t}
            width={pad.l + innerW - sustX}
            height={innerH}
            fill="var(--ink)"
            opacity="0.05"
          />
        ) : null}

        {/* Y gridlines + ticks */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.l}
              x2={pad.l + innerW}
              y1={yOf(t)}
              y2={yOf(t)}
              stroke="var(--ink)"
              strokeOpacity={t === 0 ? 0.25 : 0.08}
              strokeDasharray={t === 0 ? "0" : "2 3"}
            />
            <text
              x={pad.l - 8}
              y={yOf(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="10"
              className="font-mono-tab"
              fill="var(--ink)"
              opacity="0.55"
            >
              {fmtMoney(t)}
            </text>
          </g>
        ))}

        {/* X axis baseline */}
        <line
          x1={pad.l}
          x2={pad.l + innerW}
          y1={pad.t + innerH}
          y2={pad.t + innerH}
          stroke="var(--ink)"
          strokeOpacity="0.25"
        />
        {/* X tick labels (min / sustainable / max) */}
        <text
          x={pad.l}
          y={pad.t + innerH + 18}
          fontSize="10"
          className="font-mono-tab"
          fill="var(--ink)"
          opacity="0.55"
        >
          {fmtCount(wMin)}
        </text>
        <text
          x={sustX}
          y={pad.t + innerH + 18}
          fontSize="10"
          textAnchor="middle"
          className="font-mono-tab"
          fill="var(--ink)"
          opacity="0.55"
        >
          {fmtCount(wSustainable)}
        </text>
        <text
          x={pad.l + innerW}
          y={pad.t + innerH + 18}
          fontSize="10"
          textAnchor="end"
          className="font-mono-tab"
          fill="var(--ink)"
          opacity="0.55"
        >
          {fmtCount(wMax)}
        </text>

        {/* Y=0 underwater shading — subtle band below break-even (no caption). */}
        {zeroY < pad.t + innerH ? (
          <rect
            x={pad.l}
            y={zeroY}
            width={innerW}
            height={pad.t + innerH - zeroY}
            fill="var(--red-clinical)"
            opacity="0.04"
          />
        ) : null}

        {/* Fair-coverage line — faint, above */}
        {pathFair ? (
          <path
            d={pathFair}
            fill="none"
            stroke="var(--teal)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.55"
          />
        ) : null}

        {/* Main bonus curve */}
        <path d={path} fill="none" stroke="var(--ink)" strokeWidth="2" />

        {/* Marker — tracks the slider */}
        <line
          x1={xOf(marker.w)}
          x2={xOf(marker.w)}
          y1={pad.t}
          y2={pad.t + innerH}
          stroke="var(--gold-2)"
          strokeOpacity="0.6"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <circle
          cx={xOf(marker.w)}
          cy={yOf(marker.p)}
          r={5}
          fill="var(--gold-2)"
          stroke="var(--ink)"
          strokeWidth="1"
        />
      </svg>
      <div className="font-mono-tab mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.12em] text-ink/55">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-[2px] w-4 bg-ink" />
          bonus / partner
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--gold-2)]" />
          your slider
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-ink/10" />
          unsustainable pace zone
        </span>
        {samplesFair ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-[2px] w-4"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, var(--teal) 0 4px, transparent 4px 8px)",
              }}
            />
            fair-coverage overlay
          </span>
        ) : null}
      </div>
    </div>
  );
}

function niceTicks(lo: number, hi: number, count: number): number[] {
  const range = hi - lo;
  if (range <= 0) return [lo];
  const rough = range / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const first = Math.ceil(lo / step) * step;
  const out: number[] = [];
  for (let v = first; v <= hi; v += step) out.push(Math.round(v));
  return out;
}

/* ---------- small UI atoms ---------- */

function Readout({
  label,
  value,
  subLabel,
  tone,
}: {
  label: React.ReactNode;
  value: string;
  subLabel?: string;
  tone: "ink" | "teal" | "red";
}) {
  const color =
    tone === "red"
      ? "text-[var(--red-clinical)]"
      : tone === "teal"
      ? "text-[var(--teal)]"
      : "text-ink";
  return (
    <div className="rounded-lg border border-ink/20 bg-paper p-4">
      <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
        {label}
      </div>
      <div className={`font-mono-tab mt-2 text-2xl md:text-3xl ${color}`}>{value}</div>
      {subLabel ? (
        <p className="font-mono-tab mt-1 text-[10px] uppercase tracking-[0.12em] text-ink/45">
          {subLabel}
        </p>
      ) : null}
    </div>
  );
}

function NumField(props: {
  label: string;
  unit: string;
  hint: string;
  value: number;
  step?: number;
  min?: number;
  onChange: (n: number) => void;
  isOverride?: boolean;
  onReset?: () => void;
  secondary?: {
    value: number;
    step?: number;
    min?: number;
    onChange: (n: number) => void;
  };
}) {
  return (
    <div className="rounded-md border border-paper/15 bg-ink p-3">
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-xs text-paper/85">{props.label}</label>
        <div className="font-mono-tab text-[10px] uppercase tracking-[0.1em] text-paper/45">
          {props.unit}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          step={props.step ?? 1}
          min={props.min}
          value={Number.isFinite(props.value) ? props.value : 0}
          onChange={(e) => props.onChange(Number(e.target.value))}
          className="font-mono-tab w-full rounded border border-paper/15 bg-ink/40 px-2 py-1.5 text-right text-sm text-paper outline-none focus:border-[var(--teal)]"
        />
        {props.secondary ? (
          <input
            type="number"
            inputMode="decimal"
            step={props.secondary.step ?? 1}
            min={props.secondary.min}
            value={Number.isFinite(props.secondary.value) ? props.secondary.value : 0}
            onChange={(e) => props.secondary!.onChange(Number(e.target.value))}
            className="font-mono-tab w-full rounded border border-paper/15 bg-ink/40 px-2 py-1.5 text-right text-sm text-paper outline-none focus:border-[var(--teal)]"
          />
        ) : null}
        {props.isOverride && props.onReset ? (
          <button
            type="button"
            onClick={props.onReset}
            className="font-mono-tab whitespace-nowrap rounded-full border border-[var(--teal)]/60 bg-[var(--teal)]/15 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-[var(--teal)]"
            title="Reset to derived value"
          >
            override · reset
          </button>
        ) : null}
      </div>
      <p className="mt-1.5 text-[10.5px] leading-snug text-paper/55">{props.hint}</p>
    </div>
  );
}
