// §2 — Leak → residual toggle.
// Reads the shared money module for blended_$/wRVU and lost_study_$ so every
// figure matches the Sandbox/dashboard to the dollar. Scenario parameters
// (commercial underpayments, preventable denials, recovery rates) are local
// state — illustrative, replaceable, never persisted.
//
// Residual mechanic: the partner bonus is a residual — collections minus a
// FIXED cost base. Recovered dollars are near-pure margin, so they land
// almost entirely in the residual: residual_delta ≈ recovered_$.

import { useState } from "react";
import { useMoney } from "../../lib/money/store";
import { fmtDollarsPerWRVU, fmtMoney, fmtWRVU } from "../../lib/money/format";
import { CountUp } from "./CountUp";

type LeverKey = "lost_studies" | "commercial_underpay" | "denial_pattern";

type LeverState = { on: boolean; value: number; rate: number };

// Illustrative defaults — replaceable. Anchors only.
const DEFAULTS: Record<LeverKey, LeverState> = {
  lost_studies: { on: true, value: 0, rate: 1.0 }, // value/rate sourced from store
  commercial_underpay: { on: true, value: 250_000, rate: 0.5 },
  denial_pattern: { on: true, value: 180_000, rate: 0.6 },
};

function LeverRow(props: {
  title: string;
  formula: string;
  state: LeverState;
  setState: (s: LeverState) => void;
  recovered: number;
  // For lost_studies, value/rate are derived from store — render read-only.
  derivedOnly?: boolean;
  valueLabel?: string;
  rateLabel?: string;
  caveat?: string;
}) {
  const { state, setState } = props;
  return (
    <div className="rounded-md border border-paper/15 bg-ink p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label className="font-display text-sm text-paper">{props.title}</label>
          <p className="font-mono-tab mt-1 text-[10px] uppercase tracking-[0.1em] text-paper/55">
            {props.formula}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setState({ ...state, on: !state.on })}
          className={[
            "font-mono-tab whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.1em] transition-colors",
            state.on
              ? "border-[var(--teal)]/60 bg-[var(--teal)]/15 text-[var(--teal)]"
              : "border-paper/25 text-paper/65 hover:border-paper/55",
          ].join(" ")}
        >
          {state.on ? "on" : "off"}
        </button>
      </div>

      {!props.derivedOnly ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <div className="font-mono-tab text-[10px] uppercase tracking-[0.1em] text-paper/45">
              {props.valueLabel ?? "$ baseline"}
            </div>
            <input
              type="number"
              inputMode="decimal"
              step={5000}
              min={0}
              value={state.value}
              onChange={(e) => setState({ ...state, value: Number(e.target.value) })}
              className="font-mono-tab mt-1 w-full rounded border border-paper/15 bg-ink/40 px-2 py-1.5 text-right text-sm text-paper outline-none focus:border-[var(--teal)]"
            />
          </div>
          <div>
            <div className="font-mono-tab text-[10px] uppercase tracking-[0.1em] text-paper/45">
              {props.rateLabel ?? "rate (0-1)"}
            </div>
            <input
              type="number"
              inputMode="decimal"
              step={0.05}
              min={0}
              max={1}
              value={state.rate}
              onChange={(e) => setState({ ...state, rate: Number(e.target.value) })}
              className="font-mono-tab mt-1 w-full rounded border border-paper/15 bg-ink/40 px-2 py-1.5 text-right text-sm text-paper outline-none focus:border-[var(--teal)]"
            />
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex items-baseline justify-between">
        <div className="font-mono-tab text-[10px] uppercase tracking-[0.1em] text-paper/55">
          recovered · illustrative
        </div>
        <div
          className={`font-mono-tab text-lg ${state.on ? "text-[var(--gold-2)]" : "text-paper/35"}`}
        >
          {state.on ? fmtMoney(props.recovered) : "—"}
        </div>
      </div>

      {props.caveat ? (
        <p className="mt-2 text-[10.5px] leading-snug text-paper/50">{props.caveat}</p>
      ) : null}
    </div>
  );
}

export function ResidualToggle() {
  const { inputs, derived } = useMoney();
  const [levers, setLevers] = useState(DEFAULTS);

  const set = (k: LeverKey, s: LeverState) => setLevers((p) => ({ ...p, [k]: s }));

  // (a) Lost studies — sourced from the money module. Single source of truth.
  const lost_recovered = derived.lost_study_$;
  // (b) Commercial underpayments — payers paying BELOW contracted rate.
  //     NOT the Medicaid-vs-Medicare gap (that's structural, not recoverable here).
  const commercial_recovered =
    levers.commercial_underpay.value * levers.commercial_underpay.rate;
  // (c) Fix the top denial pattern.
  const denial_recovered = levers.denial_pattern.value * levers.denial_pattern.rate;

  const recovered_$ =
    (levers.lost_studies.on ? lost_recovered : 0) +
    (levers.commercial_underpay.on ? commercial_recovered : 0) +
    (levers.denial_pattern.on ? denial_recovered : 0);

  // Residual mechanic: near-pure margin → ~100% lands in residual.
  const residual_delta_$ = recovered_$;
  const residual_delta_wRVU =
    derived.blended_$_per_wRVU > 0 ? recovered_$ / derived.blended_$_per_wRVU : 0;

  return (
    <div className="dot-grid-on-ink rounded-xl bg-ink p-5 text-paper md:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.16em] text-paper/55">
            Leak → residual · illustrative
          </div>
          <h3 className="font-display mt-2 text-xl md:text-2xl">
            Plug a leak. Watch it land in the bonus pool.
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-paper/70">
            The partner bonus is a residual — collections minus a fixed cost base.
            Recovered dollars are near-pure margin, so they flow almost entirely
            into the residual. Each lever is illustrative; replace with your own.
          </p>
        </div>
      </div>

      {/* Residual readout */}
      <div className="mt-5 rounded-md border border-paper/15 bg-ink/40 p-4">
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-paper/55">
          Residual delta · into the bonus pool
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <div className="font-mono-tab text-3xl text-[var(--gold-2)] md:text-4xl">
            <CountUp value={residual_delta_$} format={fmtMoney} />
            <span className="ml-1 text-base text-paper/50">/ yr</span>
          </div>
          <div className="font-mono-tab text-lg text-paper/75 md:text-xl">
            ≈ <CountUp value={residual_delta_wRVU} format={fmtWRVU} />
          </div>
        </div>
        <p className="font-mono-tab mt-2 text-[10.5px] uppercase tracking-[0.12em] text-paper/45">
          residual_delta ≈ recovered_$ · fixed cost base → ~100% to residual ·{" "}
          {fmtDollarsPerWRVU(derived.blended_$_per_wRVU)} blended
        </p>
      </div>

      {/* Levers */}
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <LeverRow
          title="Bill the lost studies"
          formula="lost_study_count × avg_wRVU × blended_$/wRVU"
          state={levers.lost_studies}
          setState={(s) => set("lost_studies", s)}
          recovered={lost_recovered}
          derivedOnly
          caveat={`From the ★ panel. ${inputs.lost_study_rate_pct.toFixed(1)}% slip × ${derived.lost_study_count.toFixed(0)} reads. Replaceable.`}
        />
        <LeverRow
          title="Recover commercial underpayments"
          formula="commercial_underpayment_$ × recovery_rate"
          state={levers.commercial_underpay}
          setState={(s) => set("commercial_underpay", s)}
          recovered={commercial_recovered}
          valueLabel="underpayment $"
          rateLabel="recovery rate"
          caveat="Payers paying below contracted rate. NOT the Medicaid-vs-Medicare gap (that's structural, not recoverable here)."
        />
        <LeverRow
          title="Fix the top denial pattern"
          formula="preventable_denial_$ × fix_rate"
          state={levers.denial_pattern}
          setState={(s) => set("denial_pattern", s)}
          recovered={denial_recovered}
          valueLabel="preventable $"
          rateLabel="fix rate"
          caveat="One pattern, one workflow tweak. Illustrative; replace with your top CARC."
        />
      </div>

      <p className="font-mono-tab mt-4 text-[10.5px] uppercase tracking-[0.12em] text-paper/45">
        All figures illustrative. Sample data.
      </p>
    </div>
  );
}
