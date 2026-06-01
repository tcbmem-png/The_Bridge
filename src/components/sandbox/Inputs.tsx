import { useMoney } from "../../lib/money/store";
import { DEFAULT_INPUTS } from "../../lib/money/defaults";
import { payerMixSum } from "../../lib/money/compute";
import type { MoneyInputs, PayerKey } from "../../lib/money/types";

function Field(props: {
  label: string;
  unit: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  source: string;
  onChange: (n: number) => void;
  isBenchmark?: boolean;
  onUseBenchmark?: () => void;
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
          max={props.max}
          value={Number.isFinite(props.value) ? props.value : 0}
          onChange={(e) => props.onChange(Number(e.target.value))}
          className="font-mono-tab w-full rounded border border-paper/15 bg-ink/40 px-2 py-1.5 text-right text-sm text-paper outline-none focus:border-[var(--teal)]"
        />
        {props.onUseBenchmark ? (
          <button
            type="button"
            onClick={props.onUseBenchmark}
            className={[
              "font-mono-tab whitespace-nowrap rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.1em] transition-colors",
              props.isBenchmark
                ? "border-[var(--teal)]/60 bg-[var(--teal)]/15 text-[var(--teal)]"
                : "border-paper/25 text-paper/65 hover:border-paper/55",
            ].join(" ")}
            title="Reset to benchmark"
          >
            {props.isBenchmark ? "benchmark" : "use benchmark"}
          </button>
        ) : null}
      </div>
      <p className="mt-1.5 text-[10.5px] leading-snug text-paper/55">{props.source}</p>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-paper/55">
        {title}
      </legend>
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

const PAYER_LABEL: Record<PayerKey, string> = {
  medicare: "Medicare",
  medicaid: "Medicaid",
  commercial: "Commercial",
  self_pay: "Self-pay",
};

export function SandboxInputs() {
  const { inputs, setInputs, resetInputs } = useMoney();
  const mixSum = payerMixSum(inputs);

  const set = <K extends keyof MoneyInputs>(key: K, value: MoneyInputs[K]) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const setMix = (k: PayerKey, v: number) =>
    setInputs((prev) => ({ ...prev, payer_mix: { ...prev.payer_mix, [k]: v } }));

  const setMult = (k: "medicaid" | "commercial" | "self_pay", v: number) =>
    setInputs((prev) => ({
      ...prev,
      payer_multipliers: { ...prev.payer_multipliers, [k]: v },
    }));

  return (
    <div className="dot-grid-on-ink rounded-xl bg-ink p-5 text-paper md:p-6">
      <div className="flex items-center justify-between">
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.16em] text-paper/55">
          Inputs · native units · editable
        </div>
        <button
          type="button"
          onClick={resetInputs}
          className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-paper/55 underline-offset-4 hover:underline"
        >
          Reset all
        </button>
      </div>

      <div className="mt-5 space-y-7">
        <Group title="Coverage">
          <Field
            label="ED reads / yr"
            unit="count"
            value={inputs.coverage_volume}
            step={1000}
            min={0}
            source="ED/trauma/overnight reads per year — replace with actual."
            isBenchmark={inputs.coverage_volume === DEFAULT_INPUTS.coverage_volume}
            onUseBenchmark={() => set("coverage_volume", DEFAULT_INPUTS.coverage_volume)}
            onChange={(n) => set("coverage_volume", n)}
          />
          <Field
            label="Avg wRVU / read"
            unit="wRVU"
            value={inputs.avg_wRVU_per_read}
            step={0.05}
            min={0}
            source="CMS public RVU file via CPT→RVU. ED skews CT."
            isBenchmark={inputs.avg_wRVU_per_read === DEFAULT_INPUTS.avg_wRVU_per_read}
            onUseBenchmark={() => set("avg_wRVU_per_read", DEFAULT_INPUTS.avg_wRVU_per_read)}
            onChange={(n) => set("avg_wRVU_per_read", n)}
          />
          <Field
            label="Conversion factor"
            unit="$/wRVU"
            value={inputs.conversion_factor}
            step={0.01}
            min={0}
            source="CMS CY2026 MPFS — $33.40 non-QP / $33.57 QP. Note: −2.5% work-RVU efficiency cut on non-time-based codes in 2026."
            isBenchmark={inputs.conversion_factor === DEFAULT_INPUTS.conversion_factor}
            onUseBenchmark={() => set("conversion_factor", DEFAULT_INPUTS.conversion_factor)}
            onChange={(n) => set("conversion_factor", n)}
          />
        </Group>

        <Group title={`Payer mix · sum ${mixSum.toFixed(0)}%`}>
          {(Object.keys(PAYER_LABEL) as PayerKey[]).map((k) => (
            <Field
              key={k}
              label={PAYER_LABEL[k]}
              unit="% of ED"
              value={inputs.payer_mix[k]}
              step={1}
              min={0}
              max={100}
              source={
                k === "self_pay"
                  ? "Pro-fee self-pay collection is near zero."
                  : "Site-specific — replace with the group's actual ED mix."
              }
              isBenchmark={inputs.payer_mix[k] === DEFAULT_INPUTS.payer_mix[k]}
              onUseBenchmark={() => setMix(k, DEFAULT_INPUTS.payer_mix[k])}
              onChange={(n) => setMix(k, n)}
            />
          ))}
        </Group>
        {mixSum !== 100 ? (
          <p className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-[var(--gold-2)]">
            Payer mix sums to {mixSum.toFixed(0)}%. Adjust to 100% for a clean blend.
          </p>
        ) : null}

        <Group title="Collection vs Medicare (multiples of CF)">
          <Field
            label="Medicaid (f_md)"
            unit="× Medicare"
            value={inputs.payer_multipliers.medicaid}
            step={0.05}
            min={0}
            source="Medicaid ~71% of Medicare (2024); ~68% for hospital/ED visits — Health Affairs / KFF Medicaid-to-Medicare fee index. TN omitted (TennCare is managed care, no published FFS physician fee); derive your actual from 835 remittances by MCO. Replace with your actual."
            isBenchmark={
              inputs.payer_multipliers.medicaid === DEFAULT_INPUTS.payer_multipliers.medicaid
            }
            onUseBenchmark={() =>
              setMult("medicaid", DEFAULT_INPUTS.payer_multipliers.medicaid)
            }
            onChange={(n) => setMult("medicaid", n)}
          />
          <Field
            label="Commercial (f_comm)"
            unit="× Medicare"
            value={inputs.payer_multipliers.commercial}
            step={0.05}
            min={0}
            source="Industry range ~150–300% of Medicare — replace with the group's contracts."
            isBenchmark={
              inputs.payer_multipliers.commercial ===
              DEFAULT_INPUTS.payer_multipliers.commercial
            }
            onUseBenchmark={() =>
              setMult("commercial", DEFAULT_INPUTS.payer_multipliers.commercial)
            }
            onChange={(n) => setMult("commercial", n)}
          />
          <Field
            label="Self-pay"
            unit="× Medicare"
            value={inputs.payer_multipliers.self_pay}
            step={0.01}
            min={0}
            source="Pro-fee self-pay collection is near zero — replace with actual."
            isBenchmark={
              inputs.payer_multipliers.self_pay === DEFAULT_INPUTS.payer_multipliers.self_pay
            }
            onUseBenchmark={() =>
              setMult("self_pay", DEFAULT_INPUTS.payer_multipliers.self_pay)
            }
            onChange={(n) => setMult("self_pay", n)}
          />
        </Group>

        <Group title="Fall pattern">
          <Field
            label="Fall share of ED"
            unit="%"
            value={inputs.fall_share_of_ED}
            step={1}
            min={0}
            max={100}
            source="Illustrative — replace with measured share of ED visits coded as falls."
            isBenchmark={inputs.fall_share_of_ED === DEFAULT_INPUTS.fall_share_of_ED}
            onUseBenchmark={() => set("fall_share_of_ED", DEFAULT_INPUTS.fall_share_of_ED)}
            onChange={(n) => set("fall_share_of_ED", n)}
          />
          <Field
            label="Negative read rate"
            unit="%"
            value={inputs.fall_negative_rate}
            step={1}
            min={0}
            max={100}
            source="Illustrative — replace with measured normal/clean rate on fall head CTs."
            isBenchmark={inputs.fall_negative_rate === DEFAULT_INPUTS.fall_negative_rate}
            onUseBenchmark={() => set("fall_negative_rate", DEFAULT_INPUTS.fall_negative_rate)}
            onChange={(n) => set("fall_negative_rate", n)}
          />
          <Field
            label="Waste reduction"
            unit="%"
            value={inputs.waste_reduction}
            step={1}
            min={0}
            max={100}
            source="Achievable reduction in needless 'fall' reads — your assumption."
            isBenchmark={inputs.waste_reduction === DEFAULT_INPUTS.waste_reduction}
            onUseBenchmark={() => set("waste_reduction", DEFAULT_INPUTS.waste_reduction)}
            onChange={(n) => set("waste_reduction", n)}
          />
        </Group>

        <Group title="Hospital-side (CFO enters)">
          <Field
            label="Technical cost / CT · CFO-supplied · illustrative"
            unit="$"
            value={inputs.technical_cost_per_CT}
            step={5}
            min={0}
            source="CFO-supplied · illustrative. Hospital technical-component cost per CT — replace with actual."
            isBenchmark={
              inputs.technical_cost_per_CT === DEFAULT_INPUTS.technical_cost_per_CT
            }
            onUseBenchmark={() =>
              set("technical_cost_per_CT", DEFAULT_INPUTS.technical_cost_per_CT)
            }
            onChange={(n) => set("technical_cost_per_CT", n)}
          />
          <Field
            label="Denial write-off (permanent) · scenario"
            unit="%"
            value={inputs.denial_writeoff_pct}
            step={0.5}
            min={0}
            max={100}
            source="PERMANENT write-off rate on technical revenue (not gross denial rate). Net-collection benchmarks ~4–5%. Feeds the separate denial-recovery scenario only — never compounded into the base hospital pocket."
            isBenchmark={inputs.denial_writeoff_pct === DEFAULT_INPUTS.denial_writeoff_pct}
            onUseBenchmark={() =>
              set("denial_writeoff_pct", DEFAULT_INPUTS.denial_writeoff_pct)
            }
            onChange={(n) => set("denial_writeoff_pct", n)}
          />
        </Group>

        <Group title="★ Lost-study reconciliation">
          <Field
            label="Lost-study rate · % of coverage"
            unit="%"
            value={inputs.lost_study_rate_pct}
            step={0.1}
            min={0}
            max={100}
            source="Share of completed reads (worklist) never billed (billing). Typical slip 0.5–1.5%; your reconciliation reveals the real figure. Illustrative."
            isBenchmark={inputs.lost_study_rate_pct === DEFAULT_INPUTS.lost_study_rate_pct}
            onUseBenchmark={() => set("lost_study_rate_pct", DEFAULT_INPUTS.lost_study_rate_pct)}
            onChange={(n) => set("lost_study_rate_pct", n)}
          />
        </Group>
      </div>
    </div>
  );
}
