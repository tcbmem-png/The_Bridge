// Right-column practice-impact dashboard for /stipend.
// Hero empty-state with the two driver inputs; KPIs render only when both
// compPool and erShare are non-empty. View renders the engine output —
// no second copy of the math.

import { useMemo, useState } from "react";
import {
  VOLUME_LEVER_CAP,
  PRACTICE_IMPACT_DEFAULTS,
  computePracticeImpact,
} from "@/lib/stipend/practiceImpact";
import { VolumeSweepChart } from "./VolumeSweepChart";
import { PracticeVsErTable } from "./PracticeVsErTable";

const fmtMoneyM = (x: number) =>
  (x < 0 ? "−$" : "$") + Math.abs(x / 1e6).toFixed(2) + "M";
const fmtMoneyK = (x: number) =>
  (x < 0 ? "−$" : "$") + Math.round(Math.abs(x) / 1000).toLocaleString("en-US") + "k";
const fmtNum = (x: number) => Math.round(x).toLocaleString("en-US");
const fmtMoney = (x: number) => (x < 0 ? "−$" : "$") + Math.abs(x).toLocaleString("en-US");
const fmtSignedM = (x: number) =>
  (x >= 0 ? "+$" : "−$") + Math.abs(x / 1e6).toFixed(2) + "M";

export function PracticeDashboard({
  mode,
  compPool,
  avgPerPartnerDist,
  setAvgPerPartnerDist,
  erSharePct,
  setErSharePct,
  partnerCount,
  setPartnerCount,
  view,
  setView,
  volumeLever,
  setVolumeLever,
  redeployUtil,
  setRedeployUtil,
  fmvComp,
  overheadOverride,
  erYieldInput,
  collectionsOverride,
  onReset,
}: {
  mode: "right" | "left";
  compPool: number; // derived in both modes
  avgPerPartnerDist: number;
  setAvgPerPartnerDist: (v: number) => void;
  erSharePct: number;
  setErSharePct: (v: number) => void;
  partnerCount: number;
  setPartnerCount: (v: number) => void;
  view: "total" | "perPartner";
  setView: (v: "total" | "perPartner") => void;
  volumeLever: number; // signed -0.30..+0.30 — the ONE primitive
  setVolumeLever: (v: number) => void;
  redeployUtil: number;
  setRedeployUtil: (v: number) => void;
  fmvComp: number;
  overheadOverride: number;
  erYieldInput: number; // benchmark in right mode; audit in left mode
  collectionsOverride?: number; // §3 Path-B anchor (right mode only)
  onReset?: () => void;
}) {
  const armed = compPool > 0 && erSharePct > 0;
  const [stipendOn, setStipendOn] = useState(true);
  const rightLocked = mode === "left"; // right inputs are derived in left mode

  const out = useMemo(() => {
    if (!armed) return null;
    return computePracticeImpact({
      compPool,
      erShare: erSharePct / 100,
      partnerCount,
      stipendOn,
      volumeLever,
      redeployUtil,
      fmvComp,
      compActualPerWrvu: PRACTICE_IMPACT_DEFAULTS.compActualPerWrvu,
      compToCollections: PRACTICE_IMPACT_DEFAULTS.compToCollections,
      overheadPerWrvu: overheadOverride,
      erYield: erYieldInput,
      reclaimValue: PRACTICE_IMPACT_DEFAULTS.reclaimValue,
      reclaimIsNet: PRACTICE_IMPACT_DEFAULTS.reclaimIsNet,
      collectionsOverride: mode === "right" ? collectionsOverride : undefined,
    });
  }, [armed, compPool, erSharePct, partnerCount, stipendOn, volumeLever, redeployUtil, fmvComp, overheadOverride, erYieldInput, mode, collectionsOverride]);

  // Headline reads directly from engine — no overlay.
  const noStipendDist = out?.scenarios.A_noStipend.distributionPerPartner ?? 0;
  const withStipendDistFlat = out?.scenarios.B_withStipend.distributionPerPartner ?? 0;
  const optimizedDist = out?.scenarios.C_optimized.distributionPerPartner ?? 0;
  const noStipendTotal = out?.scenarios.A_noStipend.distributionTotal ?? 0;
  const withStipendTotal = out?.scenarios.C_optimized.distributionTotal ?? 0;

  // With-stipend headline rolls redeploy in (matches scenario C). Flat at lever≥0.
  const headlineVal = out
    ? stipendOn
      ? view === "perPartner" ? optimizedDist : withStipendTotal
      : view === "perPartner" ? noStipendDist : noStipendTotal
    : 0;

  // Signed lever value in [-30..+30] (% of today's ER volume).
  const leverPct = Math.round(volumeLever * 100);
  const onLeverChange = (v: number) => {
    const clamped = Math.max(-30, Math.min(300, v));
    setVolumeLever(clamped / 100);
  };

  const stipendDelta = out ? out.stipend - out.stipendToday : 0;

  const perturbed = volumeLever !== 0 || redeployUtil > 0;
  const inputsLocked = perturbed;

  return (
    <aside className="rounded-xl border border-ink/15 bg-paper p-4 md:p-5">
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-display text-[19px] font-semibold leading-tight text-ink">
          Practice impact
        </h2>
        {perturbed && onReset ? (
          <button
            type="button"
            onClick={onReset}
            className="font-mono-tab rounded-full border border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_12%,transparent)] px-2.5 py-0.5 text-[10.5px] uppercase tracking-[0.1em] text-[var(--gold)] hover:bg-[color-mix(in_oklab,var(--gold)_20%,transparent)]"
            title="Return to today (v=0, u=0) and unlock inputs"
          >
            ↺ Reset to today
          </button>
        ) : (
          <span className="font-mono-tab text-[10px] uppercase tracking-[0.12em] text-ink/45">
            two numbers · your whole picture
          </span>
        )}
      </header>


      {/* DRIVERS */}
      <div
        className={`rounded-lg border ${armed ? "border-ink/12 bg-ink/[0.02]" : "border-[var(--teal)] bg-[color-mix(in_oklab,var(--teal)_6%,transparent)]"} p-3`}
      >
        {!armed && (
          <p className="mb-2 text-[12.5px] leading-relaxed text-ink/75">
            Enter your average annual partner profit distribution and your ER
            share of work — and your whole picture fills in (this side and the
            stipend on the left).
          </p>
        )}
        <div className="space-y-2">
          <DriverField
            label="Partner distribution"
            hint="annual take-home per partner"
            value={avgPerPartnerDist}
            onChange={setAvgPerPartnerDist}
            placeholder="e.g. 88000"
            prefix="$"
            step={1_000}
            armedSiblingValue={erSharePct}
            armed={armed}
            readOnly={rightLocked}
            derivedHint={rightLocked ? `derived · pool ${fmtMoneyM(compPool)}` : undefined}
          />
          <DriverField
            label="ER share of work"
            hint="% of total wRVU produced in ER coverage"
            value={erSharePct}
            onChange={setErSharePct}
            placeholder="e.g. 27"
            suffix="%"
            step={1}
            armedSiblingValue={avgPerPartnerDist}
            armed={armed}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-ink/10 pt-2">
          <label className="flex items-center gap-2 text-[12px] text-ink/65">
            <span>Partner count</span>
            <input
              type="number"
              value={partnerCount}
              step={1}
              min={1}
              onChange={(e) => setPartnerCount(parseInt(e.target.value, 10) || 1)}
              autoComplete="off"
              data-private="true"
              className="font-mono w-[64px] rounded-md border border-ink/15 bg-paper px-1.5 py-0.5 text-right text-[12px] tabular-nums text-ink focus:border-[var(--teal)] focus:outline-none"
            />
          </label>
          <div className="font-mono-tab flex gap-1 text-[10.5px] uppercase tracking-[0.08em]">
            {(["perPartner", "total"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-full border px-2 py-0.5 ${
                  view === v
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/20 text-ink/55 hover:border-ink/40"
                }`}
              >
                {v === "perPartner" ? "Per partner" : "Total"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* HEADLINE */}
      <div className="mt-4 rounded-lg border border-ink/12 bg-paper p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono-tab text-[10.5px] uppercase tracking-[0.1em] text-ink/50">
            Partner distribution {view === "perPartner" ? "/ partner" : "(total)"}
          </span>
          <div className="font-mono-tab flex gap-1 text-[10.5px] uppercase tracking-[0.08em]">
            <button
              type="button"
              onClick={() => setStipendOn(false)}
              className={`rounded-full border px-2 py-0.5 ${
                !stipendOn
                  ? "border-[var(--red)] bg-[color-mix(in_oklab,var(--red)_12%,transparent)] text-[var(--red)]"
                  : "border-ink/20 text-ink/55 hover:border-ink/40"
              }`}
            >
              Without
            </button>
            <button
              type="button"
              onClick={() => setStipendOn(true)}
              className={`rounded-full border px-2 py-0.5 ${
                stipendOn
                  ? "border-[var(--teal)] bg-[color-mix(in_oklab,var(--teal)_12%,transparent)] text-[var(--teal)]"
                  : "border-ink/20 text-ink/55 hover:border-ink/40"
              }`}
            >
              With stipend
            </button>
          </div>
        </div>
        <div
          className={`font-mono mt-1 text-[34px] font-semibold leading-none tabular-nums ${
            armed ? (headlineVal >= 0 ? "text-ink" : "text-[var(--red)]") : "text-ink/25"
          }`}
        >
          {armed
            ? view === "perPartner"
              ? fmtMoneyK(headlineVal)
              : fmtMoneyM(headlineVal)
            : "—"}
        </div>
        {armed && (
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11.5px]">
            <div className="rounded-md border border-ink/10 bg-ink/[0.02] px-2 py-1.5">
              <div className="font-mono-tab text-[10px] uppercase tracking-[0.08em] text-ink/45">
                Without stipend
              </div>
              <div className="font-mono text-[14px] font-semibold tabular-nums text-[var(--red)]">
                {view === "perPartner" ? fmtMoneyK(noStipendDist) : fmtMoneyM(noStipendTotal)}
              </div>
            </div>
            <div className="rounded-md border border-ink/10 bg-ink/[0.02] px-2 py-1.5">
              <div className="font-mono-tab text-[10px] uppercase tracking-[0.08em] text-ink/45">
                With stipend
              </div>
              <div className="font-mono text-[14px] font-semibold tabular-nums text-[var(--teal)]">
                {view === "perPartner" ? fmtMoneyK(optimizedDist) : fmtMoneyM(withStipendTotal)}
              </div>
            </div>
          </div>
        )}
        <p className="mt-2 text-[11.5px] leading-relaxed text-ink/55">
          The stipend can't make ER a profit center — that would be funding
          profit, and the law forbids it. Its job is to stop ER from being a
          loss center. Best case, ER is break-even — and getting to zero is the
          win.
        </p>
      </div>

      {/* DERIVED PRACTICE FIGURES — all lever-driven */}
      <div className="mt-4 rounded-lg border border-ink/12 bg-paper p-3">
        <div className="font-mono-tab mb-1.5 flex items-baseline justify-between text-[10px] uppercase tracking-[0.1em] text-ink/50">
          <span>Derived · benchmark estimate</span>
          {armed && volumeLever !== 0 && (
            <span className="text-ink/40 normal-case tracking-normal">
              today ER wRVU {fmtNum(out!.erWrvuToday)}
            </span>
          )}
        </div>
        <Row l="Total wRVU" v={armed ? fmtNum(out!.totalWrvu) : "—"} />
        <Row l="Total collections" v={armed ? fmtMoneyM(out!.collections) : "—"} />
        <Row l="Overhead /wRVU" v={armed ? `$${out!.overheadPerWrvu.toFixed(2)}` : "—"} />
        <Row l="ER wRVU" v={armed ? fmtNum(out!.erWrvu) : "—"} />
        <Row
          l={
            <>
              ER yield <span className="text-ink/40">· your audit replaces this</span>
            </>
          }
          v={armed ? `$${out!.erYield.toFixed(0)}` : "—"}
        />
        <Row l="ER collections" v={armed ? fmtMoneyM(out!.erColl) : "—"} />
        <Row
          l={
            <>
              Non-ER yield <span className="text-ink/40">· derived (residual)</span>
            </>
          }
          v={armed ? `$${out!.nonErYield.toFixed(0)}` : "—"}
        />
        <Row
          l="Stipend"
          v={
            armed ? (
              <>
                {fmtMoneyM(out!.stipend)}
                {volumeLever !== 0 && (
                  <span className="ml-2 text-[11px] font-normal text-ink/50">
                    {fmtSignedM(stipendDelta)} vs today
                  </span>
                )}
              </>
            ) : (
              "—"
            )
          }
        />
      </div>

      {/* SWEEP CHART */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="font-mono-tab text-[10.5px] uppercase tracking-[0.1em] text-ink/50">
            Distribution vs ER volume
          </span>
          <span className="font-mono-tab text-[10px] uppercase tracking-[0.08em] text-ink/40">
            marker tracks the lever
          </span>
        </div>
        {armed && out ? (
          <VolumeSweepChart
            sweep={out.volumeSweep}
            todayErWrvu={out.erWrvuToday}
            markerErWrvu={out.erWrvu}
          />
        ) : (
          <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-ink/15 bg-ink/[0.015] text-[12px] text-ink/40">
            Enter the two numbers to plot.
          </div>
        )}
        <p className="mt-2 text-[12px] leading-relaxed text-ink/55">
          Margin (profit %) = (revenue − cost) ÷ revenue. The ER's is deeply
          negative — it collects $28 against a $70 cost, so (28 − 70) / 28 =
          −150%: it loses $1.50 for every revenue-dollar. The stipend lifts ER
          revenue up to its cost ($28 + $42 = $70), so the margin is (70 − 70) /
          70 = 0% — break-even — at any volume.
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink/55">
          And 0% margin drops nothing to the bottom line: pile on ER volume and
          partner profit doesn't move. That's arithmetic, not a rule.
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink/55">
          Margin is a rate — it's −150% / 0% whether you do 1× or 4× the work;
          only the dollar loss scales. The FMV/not-a-kickback point follows from
          the 0%.
        </p>

      </div>

      {/* VOLUME LEVER + REDEPLOY */}
      <div className="mt-4 rounded-lg border border-ink/12 bg-paper p-3">
        <div className="font-mono-tab mb-1 text-[10px] uppercase tracking-[0.1em] text-ink/50">
          ER volume lever · the only operating move that bends the bonus
        </div>
        <SignedLever
          label="ER volume"
          value={leverPct}
          onChange={onLeverChange}
        />
        <p className="mt-0.5 text-[11.5px] italic leading-relaxed text-ink/55">
          Slide right to add ER volume (out to +300%) · left to cut it (capped −30%, the avoidable slice).
          Moves ER wRVU; every figure above re-derives from that one number.
        </p>
        <div className={`mt-2 ${volumeLever >= 0 ? "opacity-50" : ""}`}>
          <Slider
            label="Redeploy utilization"
            pctValue={Math.round(redeployUtil * 100)}
            onPct={(p) => setRedeployUtil(p / 100)}
            rightHint={
              volumeLever >= 0
                ? "applies to cuts only"
                : "freed time → $90/wRVU reclaim value · 0% = no gain, no loss"
            }
            disabled={volumeLever >= 0}
          />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11.5px]">
          <div className="rounded-md border border-ink/10 bg-ink/[0.02] px-2 py-1.5">
            <div className="font-mono-tab text-[10px] uppercase tracking-[0.08em] text-ink/45">
              Distribution /partner (with stipend)
            </div>
            <div className="font-mono text-[14px] font-semibold tabular-nums text-[var(--teal)]">
              {armed ? fmtMoneyK(optimizedDist) : "—"}
            </div>
            {armed && volumeLever < 0 && out!.redeployGain !== 0 && (
              <div className="font-mono mt-0.5 text-[10.5px] tabular-nums text-ink/55">
                redeploy {out!.redeployGain >= 0 ? "+" : "−"}
                {fmtMoneyK(Math.abs(out!.redeployGain / Math.max(1, partnerCount)))}
              </div>
            )}
          </div>
          <div className="rounded-md border border-ink/10 bg-ink/[0.02] px-2 py-1.5">
            <div className="font-mono-tab text-[10px] uppercase tracking-[0.08em] text-ink/45">
              {volumeLever > 0 ? "Hospital stipend ↑" : "Hospital saves"}
            </div>
            <div
              className={`font-mono text-[14px] font-semibold tabular-nums ${
                volumeLever > 0 ? "text-[var(--red)]" : "text-[var(--gold)]"
              }`}
            >
              {armed
                ? volumeLever > 0
                  ? `+${fmtMoneyM(stipendDelta)}`
                  : `+${fmtMoneyM(out!.hospitalSaves)}`
                : "—"}
            </div>
          </div>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink/55">
          {volumeLever > 0
            ? "Add volume and the partner line stays flat because ER's gross margin is zero with the stipend — break-even work adds nothing. The hospital's stipend rises by the same deficit (~$42/wRVU) that ER was already losing; the owners' return doesn't move."
            : "Covering the ER is the price of admission to the relationship — the equipment, the referrals, the work that pays. That was a fair trade while the rest carried it. The price of admission just can't be losing money."}
        </p>
      </div>

      {/* PRACTICE VS ER */}
      <div className="mt-4">
        <div className="font-mono-tab mb-1.5 text-[10.5px] uppercase tracking-[0.1em] text-ink/50">
          Practice vs ER
        </div>
        {armed && out ? (
          <PracticeVsErTable
            fairCost={out.fairCost}
            erYield={out.erYield}
            nonErYield={out.nonErYield}
          />
        ) : (
          <div className="flex h-[120px] items-center justify-center rounded-lg border border-dashed border-ink/15 bg-ink/[0.015] text-[12px] text-ink/40">
            Enter the two numbers to compare.
          </div>
        )}
      </div>

      <p className="mt-4 text-[11.5px] leading-relaxed text-ink/55">
        Nothing ever segmented your ER, so the loss hid inside the blended book
        — until the surplus thinned and the bonus fell. Turn the ER on as its
        own segment and the shape tells you where it went.
      </p>

      <p className="mt-3 border-t border-ink/10 pt-3 text-[11px] leading-relaxed text-ink/45">
        Pins (visible): comp pool → wRVU $58 · comp-to-collections 0.83 · FMV
        clinical comp $50 · ER yield $28 (benchmark, your audit replaces) ·
        reclaim value $90/wRVU. Math is signed; renders from the engine.
      </p>
    </aside>
  );
}


/* ─── small primitives ───────────────────────────────────────────────────── */

function DriverField({
  label,
  hint,
  value,
  onChange,
  prefix,
  suffix,
  step,
  placeholder,
  armedSiblingValue,
  armed,
  readOnly,
  derivedHint,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  placeholder?: string;
  armedSiblingValue: number;
  armed: boolean;
  readOnly?: boolean;
  derivedHint?: string;
}) {
  const isEmpty = !value;
  const needsThis = !armed && isEmpty && armedSiblingValue > 0;
  return (
    <div
      className={`rounded-md border ${readOnly ? "border-ink/12 bg-ink/[0.04] opacity-80" : needsThis ? "border-[var(--teal)]" : isEmpty && !armed ? "border-ink/20" : "border-ink/12 bg-paper"} px-2.5 py-1.5`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-[12px] font-semibold text-ink">{label}</label>
        <span className="font-mono-tab text-[9.5px] uppercase tracking-[0.08em] text-ink/45">
          {derivedHint ?? hint}
        </span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        {prefix && <span className="font-mono text-[15px] text-ink/55">{prefix}</span>}
        <input
          type="number"
          value={value || ""}
          step={step}
          readOnly={readOnly}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder}
          autoComplete="off"
          data-private="true"
          data-mp-mask="true"
          data-fs-mask="true"
          className={`font-mono w-full bg-transparent text-[18px] font-semibold tabular-nums text-ink placeholder:text-ink/25 focus:outline-none ${readOnly ? "cursor-not-allowed" : ""}`}
        />
        {suffix && <span className="font-mono text-[15px] text-ink/55">{suffix}</span>}
      </div>
    </div>
  );
}

function Row({ l, v }: { l: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink/08 py-1 text-[12.5px] last:border-b-0">
      <span className="text-ink/65">{l}</span>
      <span className="font-mono whitespace-nowrap font-semibold tabular-nums text-ink">{v}</span>
    </div>
  );
}

function Slider({
  label,
  pctValue,
  onPct,
  rightHint,
  disabled,
}: {
  label: string;
  pctValue: number;
  onPct: (p: number) => void;
  rightHint?: string;
  disabled?: boolean;
}) {
  return (
    <div className="py-1">
      <div className="flex items-center gap-3 text-[12.5px]">
        <span className="flex-1 text-ink/65">{label}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={pctValue}
          disabled={disabled}
          onChange={(ev) => onPct(parseFloat(ev.target.value))}
          className="flex-[1.4] accent-[var(--teal)] disabled:cursor-not-allowed"
        />
        <span className="font-mono w-[44px] text-right text-[12.5px] font-semibold tabular-nums">
          {pctValue}%
        </span>
      </div>
      {rightHint && <div className="text-right text-[10.5px] text-ink/40">{rightHint}</div>}
    </div>
  );
}

function SignedLever({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number; // -30..+30
  onChange: (v: number) => void;
}) {
  const display = value === 0 ? "0%" : `${value > 0 ? "+" : "−"}${Math.abs(value)}%`;
  const tone =
    value > 0 ? "text-[var(--red)]" : value < 0 ? "text-[var(--teal)]" : "text-ink/55";
  return (
    <div className="py-1">
      <div className="flex items-center gap-3 text-[12.5px]">
        <span className="flex-1 text-ink/65">{label}</span>
        <input
          type="range"
          min={-30}
          max={300}
          step={1}
          value={value}
          onChange={(ev) => onChange(parseFloat(ev.target.value))}
          className="flex-[1.4] accent-[var(--teal)]"
          style={{ accentColor: value > 0 ? "var(--red)" : "var(--teal)" }}
        />
        <span className={`font-mono w-[56px] text-right text-[12.5px] font-semibold tabular-nums ${tone}`}>
          {display}
        </span>
      </div>
      <div className="font-mono-tab mt-0.5 flex justify-between text-[9.5px] uppercase tracking-[0.08em] text-ink/35">
        <span>−30% cut</span>
        <span>0 (today)</span>
        <span>+300% add</span>
      </div>
    </div>
  );
}

// re-exports for callers
export { fmtMoney };
