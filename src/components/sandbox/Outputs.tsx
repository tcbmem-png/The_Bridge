import { useMoney } from "../../lib/money/store";
import { fmtCount, fmtMoney, fmtWRVU, fmtDollarsPerWRVU } from "../../lib/money/format";
import { CountUp } from "./CountUp";
import { FeedsGlyph, FeedsLegend } from "../provenance/FeedsGlyph";

// Per-spec feeds bindings for the sandbox readouts. HARD rule: each glyph
// reads the feeds of the EXACT number it sits on. Sub-numbers DON'T inherit
// from their panel.
const FEEDS_NO_PAY = { billing: true, production: true, workflow: false } as const;
const FEEDS_MEDICAID = { billing: true, production: true, workflow: false } as const;
const FEEDS_COVERAGE_GAP = { billing: true, production: true, workflow: false } as const;

function PocketCard(props: {
  label: string;
  value: number;
  tone: "red" | "teal";
  caption: string;
}) {
  const color =
    props.tone === "red" ? "text-[var(--red-clinical)]" : "text-[var(--teal)]";
  const bar = props.tone === "red" ? "bg-[var(--red-clinical)]" : "bg-[var(--teal)]";
  const sign = props.tone === "red" ? -1 : 1;
  // Bar width is illustrative — scaled to a soft cap so motion reads.
  const cap = 5_000_000;
  const pct = Math.min(100, (Math.abs(props.value) / cap) * 100);
  return (
    <div className="rounded-lg border border-ink/20 bg-paper p-5">
      <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
        {props.label}
      </div>
      <div className={`font-mono-tab mt-3 text-3xl md:text-4xl ${color}`}>
        <CountUp
          value={sign * props.value}
          format={(n) => (n < 0 ? `−${fmtMoney(Math.abs(n))}` : fmtMoney(n))}
        />
        <span className="ml-1 text-base text-ink/45">/ yr</span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
        <div
          className={`h-full ${bar} transition-[width] duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink/70">{props.caption}</p>
    </div>
  );
}

export function SandboxOutputs() {
  const { inputs, derived, mode, setMode } = useMoney();
  const isFix = mode === "collaborative_fix";

  const groupValue = isFix ? derived.group_gain_per_year_$ : derived.coverageGapVsMedicare_$;
  const hospitalValue = isFix
    ? derived.hospital_gain_per_year_$
    : derived.avoided_technical_cost_$;

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex items-center justify-between rounded-xl border border-ink/15 bg-paper p-3">
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
          Mode
        </div>
        <div className="inline-flex rounded-full border border-ink/20 bg-paper p-0.5">
          <button
            type="button"
            onClick={() => setMode("status_quo")}
            className={[
              "font-mono-tab rounded-full px-3 py-1 text-[10.5px] uppercase tracking-[0.12em] transition-colors",
              !isFix ? "bg-ink text-paper" : "text-ink/70 hover:text-ink",
            ].join(" ")}
          >
            Status quo · bleed
          </button>
          <button
            type="button"
            onClick={() => setMode("collaborative_fix")}
            className={[
              "font-mono-tab rounded-full px-3 py-1 text-[10.5px] uppercase tracking-[0.12em] transition-colors",
              isFix ? "bg-ink text-paper" : "text-ink/70 hover:text-ink",
            ].join(" ")}
          >
            Collaborative fix · grow
          </button>
        </div>
      </div>

      {/* Headline — TWO honest lines + relabeled subtotal. Never "uncompensated". */}
      <div className="rounded-xl border border-ink/20 bg-paper p-5 md:p-6">
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
          Coverage gap vs Medicare · today
        </div>

        <div className="mt-4 space-y-4">
          {/* (a) No-pay — the mix / stipend conversation */}
          <div className="border-l-2 border-[var(--red-clinical)]/60 pl-4">
            <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
              No-pay (self-pay)
            </div>
            <div className="font-mono-tab mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-2xl text-[var(--red-clinical)] md:text-3xl">
              <span><CountUp value={derived.noPay_wRVU} format={fmtWRVU} /></span>
              <span className="text-ink/35">·</span>
              <span><CountUp value={derived.noPay_$} format={fmtMoney} /></span>
            </div>
            <p className="mt-1 text-xs leading-snug text-ink/65">
              Medicare-equivalent value of work that collected nothing.
            </p>
          </div>

          {/* (b) Medicaid shortfall — the rate / structural-mandate point */}
          <div className="border-l-2 border-[var(--red-clinical)]/60 pl-4">
            <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
              Underpayment shortfall (Medicaid below Medicare)
            </div>
            <div className="font-mono-tab mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-2xl text-[var(--red-clinical)] md:text-3xl">
              <span><CountUp value={derived.medicaidShortfall_wRVU} format={fmtWRVU} /></span>
              <span className="text-ink/35">·</span>
              <span><CountUp value={derived.medicaidShortfall_$} format={fmtMoney} /></span>
            </div>
            <p className="mt-1 text-xs leading-snug text-ink/65">
              The gap vs Medicare on Medicaid volume.
            </p>
          </div>

          {/* Subtotal — relabeled */}
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-ink/15 pt-3">
            <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
              Subtotal · Coverage gap vs Medicare
            </div>
            <div className="font-mono-tab text-xl text-ink md:text-2xl">
              <CountUp value={derived.coverageGapVsMedicare_$} format={fmtMoney} />
            </div>
          </div>
        </div>

        <p className="font-mono-tab mt-4 text-[10.5px] uppercase tracking-[0.12em] text-ink/45">
          at {inputs.avg_wRVU_per_read.toFixed(2)} wRVU/read ·{" "}
          {fmtDollarsPerWRVU(inputs.conversion_factor)} · self-pay{" "}
          {inputs.payer_mix.self_pay}% · Medicaid {inputs.payer_mix.medicaid}% × f_md{" "}
          {inputs.payer_multipliers.medicaid.toFixed(2)} · illustrative
        </p>
      </div>

      {/* Two pockets */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <PocketCard
          label="The Group · pocket"
          value={groupValue}
          tone={isFix ? "teal" : "red"}
          caption={
            isFix
              ? `Capacity recovered from removing needless 'fall' reads, refilled at the blended rate (${fmtDollarsPerWRVU(derived.blended_$_per_wRVU)}). Illustrative.`
              : "Coverage gap vs Medicare today — no-pay + Medicaid shortfall, at the Medicare CF. Illustrative."
          }
        />
        <PocketCard
          label="The Hospital · pocket"
          value={hospitalValue}
          tone={isFix ? "teal" : "red"}
          caption={
            isFix
              ? `Cost the hospital didn't incur on avoided scans (${fmtCount(derived.avoided_scans)} × $${inputs.technical_cost_per_CT}/CT, CFO-supplied · illustrative). Denial recovery shown separately below.`
              : "Technical cost the hospital absorbs on the needless scans today. Illustrative."
          }
        />
      </div>

      {/* Optional secondary scenario — denial recovery */}
      <div className="rounded-xl border border-dashed border-ink/25 bg-paper p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
              Denial recovery (scenario) · permanent write-off
            </div>
            <p className="mt-1 text-xs leading-snug text-ink/65">
              avoided_scans × technical_cost_per_CT × denial_writeoff_pct. Add-on, not part of the headline hospital pocket.
            </p>
          </div>
          <div className="font-mono-tab text-2xl text-ink">
            <CountUp value={derived.denial_recovery_scenario_$} format={fmtMoney} />
            <span className="ml-1 text-base text-ink/45">/ yr</span>
          </div>
        </div>
      </div>

      {/* Patient card */}
      <div className="rounded-xl border border-ink/20 bg-paper p-5 md:p-6">
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
          The patient
        </div>
        <div className="font-mono-tab mt-3 text-3xl text-ink md:text-4xl">
          <CountUp value={derived.fewer_needless_scans_per_year} format={fmtCount} />
          <span className="ml-2 text-base text-ink/50">unnecessary scans / yr avoided</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">
          Less radiation. Freed capacity for the demand that never stops growing.
        </p>
      </div>

      {/* Wins row — same model as the Story */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Win
          label="TO THE GROUP / YR"
          value={derived.group_gain_per_year_$}
          format={fmtMoney}
          tone="gold"
        />
        <Win
          label="TO THE HOSPITAL / YR"
          value={derived.hospital_gain_per_year_$}
          format={fmtMoney}
          tone="gold"
        />
        <Win
          label="FEWER NEEDLESS SCANS / YR"
          value={derived.fewer_needless_scans_per_year}
          format={fmtCount}
          tone="teal"
        />
      </div>

      <p className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/45">
        All figures illustrative. Sample data.
      </p>
    </div>
  );
}

function Win(props: {
  label: string;
  value: number;
  format: (n: number) => string;
  tone: "gold" | "teal";
}) {
  const color =
    props.tone === "gold" ? "text-[var(--gold-2)]" : "text-[var(--teal)]";
  return (
    <div className="rounded-lg border border-ink bg-ink p-5 text-paper">
      <div className={`font-mono-tab text-3xl md:text-4xl ${color}`}>
        <CountUp value={props.value} format={props.format} />
      </div>
      <p className="font-mono-tab mt-3 text-[10.5px] uppercase tracking-[0.14em] text-paper/65">
        {props.label}
      </p>
    </div>
  );
}
