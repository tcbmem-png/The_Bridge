// Right-column practice-impact dashboard for /stipend.
// Hero empty-state with the two driver inputs; KPIs render only when both
// compPool and erShare are non-empty. View renders the engine output —
// no second copy of the math.

import { useMemo, useState } from "react";
import {
  AVOIDABLE_CAP,
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

export function PracticeDashboard({
  compPool,
  setCompPool,
  erSharePct,
  setErSharePct,
  partnerCount,
  setPartnerCount,
  view,
  setView,
  cut,
  setCut,
  redeployUtil,
  setRedeployUtil,
  fmvComp,
  overheadOverride,
}: {
  compPool: number;
  setCompPool: (v: number) => void;
  erSharePct: number;
  setErSharePct: (v: number) => void;
  partnerCount: number;
  setPartnerCount: (v: number) => void;
  view: "total" | "perPartner";
  setView: (v: "total" | "perPartner") => void;
  cut: number;
  setCut: (v: number) => void;
  redeployUtil: number;
  setRedeployUtil: (v: number) => void;
  fmvComp: number;
  overheadOverride: number;
}) {
  const armed = compPool > 0 && erSharePct > 0;
  const [stipendOn, setStipendOn] = useState(true);
  // Signed lever (−30%..+30% of today's ER volume). Negative drives the
  // existing cut+redeploy machinery via `cut`. Positive adds ER volume —
  // stipend rises by deficit × added wRVU; with-stipend partner stays flat.
  const [addFrac, setAddFrac] = useState(0);

  const out = useMemo(() => {
    if (!armed) return null;
    return computePracticeImpact({
      compPool,
      erShare: erSharePct / 100,
      partnerCount,
      stipendOn,
      cutFrac: cut,
      redeployUtil: addFrac > 0 ? 0 : redeployUtil,
      fmvComp,
      compActualPerWrvu: PRACTICE_IMPACT_DEFAULTS.compActualPerWrvu,
      compToCollections: PRACTICE_IMPACT_DEFAULTS.compToCollections,
      overheadPerWrvu: overheadOverride,
      erYield: PRACTICE_IMPACT_DEFAULTS.erYield,
    });
  }, [armed, compPool, erSharePct, partnerCount, stipendOn, cut, redeployUtil, addFrac, fmvComp, overheadOverride]);

  // Add-side overlay (engine-consistent, just applied to today + delta):
  const deficitPerWrvu = out ? out.fairCost - out.erYield : 0;
  const addedErWrvu = out && addFrac > 0 ? out.erWrvu * addFrac : 0;
  const addedStipend = addedErWrvu * deficitPerWrvu;
  const N = Math.max(1, partnerCount);
  const addedDistDropPerPartner = (addedErWrvu * deficitPerWrvu) / N;

  // Scenario chips reflect the overlay so they never disagree with the lever.
  const noStipendDistBase = out?.scenarios.A_noStipend.distributionPerPartner ?? 0;
  const withStipendDistBase = out?.scenarios.B_withStipend.distributionPerPartner ?? 0;
  const optimizedDistBase = out?.scenarios.C_optimized.distributionPerPartner ?? 0;
  const noStipendTotalBase = out?.scenarios.A_noStipend.distributionTotal ?? 0;
  const withStipendTotalBase = out?.scenarios.B_withStipend.distributionTotal ?? 0;

  const noStipendDist = noStipendDistBase - addedDistDropPerPartner;
  const withStipendDist = withStipendDistBase; // flat — the FMV proof
  const optimizedDist = addFrac > 0 ? withStipendDistBase : optimizedDistBase;
  const noStipendTotal = noStipendTotalBase - addedStipend;
  const withStipendTotal = withStipendTotalBase;

  const headlineVal = out
    ? stipendOn
      ? view === "perPartner" ? withStipendDist : withStipendTotal
      : view === "perPartner" ? noStipendDist : noStipendTotal
    : 0;

  // Signed lever value in [-30..+30] (% of today's ER volume).
  const leverPct = addFrac > 0
    ? Math.round(addFrac * 100)
    : -Math.round((cut / AVOIDABLE_CAP) * 30);
  const onLeverChange = (v: number) => {
    const clamped = Math.max(-30, Math.min(30, v));
    if (clamped >= 0) {
      setCut(0);
      setAddFrac(clamped / 100);
    } else {
      setAddFrac(0);
      setCut((-clamped / 30) * AVOIDABLE_CAP);
    }
  };

  return (
    <aside className="rounded-xl border border-ink/15 bg-paper p-4 md:p-5">
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-display text-[19px] font-semibold leading-tight text-ink">
          Practice impact
        </h2>
        <span className="font-mono-tab text-[10px] uppercase tracking-[0.12em] text-ink/45">
          two numbers · your whole picture
        </span>
      </header>

      {/* DRIVERS — the hero of the empty state, persistent once armed */}
      <div
        className={`rounded-lg border ${armed ? "border-ink/12 bg-ink/[0.02]" : "border-[var(--teal)] bg-[color-mix(in_oklab,var(--teal)_6%,transparent)]"} p-3`}
      >
        {!armed && (
          <p className="mb-2 text-[12.5px] leading-relaxed text-ink/75">
            Enter the two numbers you already know — your physician compensation
            pool and your ER share of work — and your whole picture fills in
            (this side and the stipend on the left).
          </p>
        )}
        <div className="space-y-2">
          <DriverField
            label="Physician compensation pool"
            hint="MGMA · Total Physician Compensation"
            value={compPool}
            onChange={setCompPool}
            placeholder="e.g. 63800000"
            prefix="$"
            step={1_000_000}
            armedSiblingValue={erSharePct}
            armed={armed}
          />
          <DriverField
            label="ER share of work"
            hint="% of total wRVU produced in ER coverage"
            value={erSharePct}
            onChange={setErSharePct}
            placeholder="e.g. 27"
            suffix="%"
            step={1}
            armedSiblingValue={compPool}
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
                {view === "perPartner" ? fmtMoneyK(withStipendDist) : fmtMoneyM(withStipendTotal)}
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

      {/* DERIVED PRACTICE FIGURES */}
      <div className="mt-4 rounded-lg border border-ink/12 bg-paper p-3">
        <div className="font-mono-tab mb-1.5 text-[10px] uppercase tracking-[0.1em] text-ink/50">
          Derived · benchmark estimate
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
      </div>

      {/* SWEEP CHART */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="font-mono-tab text-[10.5px] uppercase tracking-[0.1em] text-ink/50">
            Distribution vs ER volume
          </span>
          <span className="font-mono-tab text-[10px] uppercase tracking-[0.08em] text-ink/40">
            drag the marker · right = add · left = cut
          </span>
        </div>
        {armed && out ? (
          <VolumeSweepChart sweep={out.volumeSweep} todayErWrvu={out.erWrvu} />
        ) : (
          <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-ink/15 bg-ink/[0.015] text-[12px] text-ink/40">
            Enter the two numbers to plot.
          </div>
        )}
        <p className="mt-2 text-[12px] leading-relaxed text-ink/55">
          More ER volume never raises your partner profit by a dollar — and
          that's exactly why this is a fair coverage payment and not a kickback.
          The stipend funds the cost of coverage, never the owners' return.
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink/55">
          The downhill line is the group covering the hospital's obligation out
          of its own partners' pockets — the risk the stipend removes.
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
          Slide right to add ER volume · left to cut it. Capped ±30% either way.
        </p>
        <div className={`mt-2 ${addFrac > 0 ? "opacity-50" : ""}`}>
          <Slider
            label="Redeploy utilization"
            pctValue={Math.round(redeployUtil * 100)}
            onPct={(p) => setRedeployUtil(p / 100)}
            rightHint={addFrac > 0 ? "applies to cuts only" : "0% = no gain, no loss"}
            disabled={addFrac > 0}
          />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11.5px]">
          <div className="rounded-md border border-ink/10 bg-ink/[0.02] px-2 py-1.5">
            <div className="font-mono-tab text-[10px] uppercase tracking-[0.08em] text-ink/45">
              Distribution /partner {addFrac > 0 ? "(with stipend)" : "(optimized)"}
            </div>
            <div className="font-mono text-[14px] font-semibold tabular-nums text-[var(--teal)]">
              {armed ? fmtMoneyK(optimizedDist) : "—"}
            </div>
          </div>
          <div className="rounded-md border border-ink/10 bg-ink/[0.02] px-2 py-1.5">
            <div className="font-mono-tab text-[10px] uppercase tracking-[0.08em] text-ink/45">
              {addFrac > 0 ? "Hospital stipend ↑" : "Hospital saves"}
            </div>
            <div
              className={`font-mono text-[14px] font-semibold tabular-nums ${
                addFrac > 0 ? "text-[var(--red)]" : "text-[var(--gold)]"
              }`}
            >
              {armed
                ? addFrac > 0
                  ? `+${fmtMoneyM(addedStipend)}`
                  : `+${fmtMoneyM(out!.hospitalSaves)}`
                : "—"}
            </div>
          </div>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink/55">
          {addFrac > 0
            ? "Add volume and the partner line stays flat — that's the FMV proof. The hospital's stipend rises by the same deficit that funded today's coverage; the owners' return doesn't move."
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
        clinical comp $50 · ER yield $28 (benchmark, your audit replaces). Math
        is signed; renders from the engine.
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
}) {
  const isEmpty = !value;
  const needsThis = !armed && isEmpty && armedSiblingValue > 0;
  return (
    <div
      className={`rounded-md border ${needsThis ? "border-[var(--teal)]" : isEmpty && !armed ? "border-ink/20" : "border-ink/12 bg-paper"} px-2.5 py-1.5`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-[12px] font-semibold text-ink">{label}</label>
        <span className="font-mono-tab text-[9.5px] uppercase tracking-[0.08em] text-ink/45">
          {hint}
        </span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        {prefix && <span className="font-mono text-[15px] text-ink/55">{prefix}</span>}
        <input
          type="number"
          value={value || ""}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder}
          autoComplete="off"
          data-private="true"
          data-mp-mask="true"
          data-fs-mask="true"
          className="font-mono w-full bg-transparent text-[18px] font-semibold tabular-nums text-ink placeholder:text-ink/25 focus:outline-none"
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
}: {
  label: string;
  pctValue: number;
  onPct: (p: number) => void;
  rightHint?: string;
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
          onChange={(ev) => onPct(parseFloat(ev.target.value))}
          className="flex-[1.4] accent-[var(--teal)]"
        />
        <span className="font-mono w-[44px] text-right text-[12.5px] font-semibold tabular-nums">
          {pctValue}%
        </span>
      </div>
      {rightHint && <div className="text-right text-[10.5px] text-ink/40">{rightHint}</div>}
    </div>
  );
}

// re-exports for callers
export { fmtMoney };
