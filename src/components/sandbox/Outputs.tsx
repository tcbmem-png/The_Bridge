import { useMoney } from "../../lib/money/store";
import { fmtCount, fmtMoney, fmtWRVU, fmtDollarsPerWRVU } from "../../lib/money/format";
import { CountUp } from "./CountUp";

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

  const groupValue = isFix ? derived.group_gain_per_year_$ : derived.uncompensated_$;
  const hospitalValue = isFix
    ? derived.hospital_gain_per_year_$
    : derived.avoided_technical_cost_$ + derived.reduced_denial_writeoffs_$;

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

      {/* Headline — uncompensated coverage burden, both wRVUs and $ */}
      <div className="rounded-xl border border-ink/20 bg-paper p-5 md:p-6">
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
          Uncompensated coverage burden · today
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="font-mono-tab text-3xl text-[var(--red-clinical)] md:text-4xl">
              <CountUp value={derived.uncompensated_wRVU} format={(n) => fmtWRVU(n)} />
            </div>
            <p className="mt-1 text-xs text-ink/65">
              wRVUs delivered for ~nothing each year.
            </p>
          </div>
          <div>
            <div className="font-mono-tab text-3xl text-[var(--red-clinical)] md:text-4xl">
              <CountUp value={derived.uncompensated_$} format={(n) => fmtMoney(n)} />
            </div>
            <p className="mt-1 text-xs text-ink/65">
              at the Medicare CF as effective rate on that work.
            </p>
          </div>
        </div>
        <p className="font-mono-tab mt-4 text-[10.5px] uppercase tracking-[0.12em] text-ink/45">
          at {inputs.avg_wRVU_per_read.toFixed(2)} wRVU/read ·{" "}
          {fmtDollarsPerWRVU(inputs.conversion_factor)} · self-pay{" "}
          {inputs.payer_mix.self_pay}% · Medicaid {inputs.payer_mix.medicaid}% × f_md{" "}
          {inputs.payer_multipliers.medicaid.toFixed(2)}
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
              ? `Capacity recovered from removing needless 'fall' reads, refilled at the blended rate (${fmtDollarsPerWRVU(derived.blended_$_per_wRVU)}).`
              : "Coverage work delivered for ~nothing — uncompensated wRVUs at the CF."
          }
        />
        <PocketCard
          label="The Hospital · pocket"
          value={hospitalValue}
          tone={isFix ? "teal" : "red"}
          caption={
            isFix
              ? `Avoided technical cost + reduced denial write-offs on the needless scans — from CFO-entered values ($${inputs.technical_cost_per_CT}/CT · ${inputs.denial_writeoff_pct}% denials).`
              : "Technical cost the hospital absorbs on the needless scans today, plus write-offs."
          }
        />
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
