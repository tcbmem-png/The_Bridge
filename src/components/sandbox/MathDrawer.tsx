import { useState } from "react";
import { useMoney } from "../../lib/money/store";
import { fmtCount, fmtMoney, fmtDollarsPerWRVU, fmtWRVU } from "../../lib/money/format";

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink/10 py-1.5">
      <div className="text-xs text-ink/70">{k}</div>
      <div className="font-mono-tab text-xs text-ink">{v}</div>
    </div>
  );
}

export function MathDrawer() {
  const [open, setOpen] = useState(false);
  const { inputs, derived } = useMoney();
  const net = derived.net_$_per_wRVU_by_payer;

  return (
    <div className="rounded-xl border border-ink/20 bg-paper">
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
          {open ? "Hide the math" : "Show the math"}
        </div>
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
          {open ? "−" : "+"}
        </div>
      </button>
      {open ? (
        <div className="px-4 pb-5">
          <div className="rounded-md border border-ink/15 bg-paper p-4">
            <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
              Formulas (verbatim from the spec)
            </div>
            <pre className="font-mono-tab mt-3 overflow-x-auto whitespace-pre text-[11px] leading-relaxed text-ink/80">
{`total_wRVU         = coverage_volume × avg_wRVU_per_read
net_$_per_wRVU     = { Medicare: CF, Medicaid: f_md × CF,
                       Commercial: f_comm × CF, Self-pay: 0 }
blended_$_per_wRVU = Σ payer_share × net_$_per_wRVU_payer
uncompensated_wRVU = total_wRVU × (self_pay_share
                       + medicaid_share × (1 − f_md))
uncompensated_$    = uncompensated_wRVU × CF  // effective rate label
needless_fall_wRVU = coverage_volume × fall_share
                       × fall_negative_rate × avg_wRVU_per_read
recoverable_wRVU   = needless_fall_wRVU × waste_reduction
recoverable_$      = recoverable_wRVU × blended_$_per_wRVU
avoided_tech_$     = (needless_count × waste_reduction)
                       × technical_cost_per_CT     // CFO-entered
reduced_denials_$  = avoided_tech_$ × denial_writeoff_pct
hospital_gain_$    = avoided_tech_$ + reduced_denials_$`}
            </pre>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-md border border-ink/15 p-3">
              <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
                Net $/wRVU by payer
              </div>
              <div className="mt-2">
                <Row k="Medicare" v={fmtDollarsPerWRVU(net.medicare)} />
                <Row k="Medicaid" v={fmtDollarsPerWRVU(net.medicaid)} />
                <Row k="Commercial" v={fmtDollarsPerWRVU(net.commercial)} />
                <Row k="Self-pay" v={fmtDollarsPerWRVU(net.self_pay)} />
                <Row k="Blended" v={fmtDollarsPerWRVU(derived.blended_$_per_wRVU)} />
              </div>
            </div>

            <div className="rounded-md border border-ink/15 p-3">
              <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
                Derived totals
              </div>
              <div className="mt-2">
                <Row k="total_wRVU" v={fmtWRVU(derived.total_wRVU)} />
                <Row k="uncompensated_wRVU" v={fmtWRVU(derived.uncompensated_wRVU)} />
                <Row k="uncompensated_$" v={fmtMoney(derived.uncompensated_$)} />
                <Row k="needless_fall_count" v={fmtCount(derived.needless_fall_count)} />
                <Row k="needless_fall_wRVU" v={fmtWRVU(derived.needless_fall_wRVU)} />
                <Row k="recoverable_wRVU" v={fmtWRVU(derived.recoverable_wRVU)} />
                <Row k="recoverable_$" v={fmtMoney(derived.recoverable_$)} />
                <Row k="avoided_tech_$" v={fmtMoney(derived.avoided_technical_cost_$)} />
                <Row
                  k="reduced_denials_$"
                  v={fmtMoney(derived.reduced_denial_writeoffs_$)}
                />
                <Row k="hospital_gain_$" v={fmtMoney(derived.hospital_gain_$)} />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-ink/15 p-3">
            <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
              Benchmark anchors (illustrative · replaceable)
            </div>
            <ul className="mt-2 space-y-1 text-[11.5px] leading-relaxed text-ink/75">
              <li>· Conversion factor: $33.40 non-QP / $33.57 QP — CMS CY2026 MPFS final rule.</li>
              <li>· 2026 work-RVU efficiency cut: −2.5% on non-time-based codes — CMS CY2026. Shrinks imaging wRVUs.</li>
              <li>· Commercial vs Medicare: ~150–300% range — replace with the group's contracts. Default = midpoint 2.25×.</li>
              <li>· Medicaid vs Medicare: varies widely by state, often well below — replace with actual.</li>
              <li>· Self-pay collection on pro-fee: ~near zero — replace with actual.</li>
              <li>· ED payer mix: site-specific — replace with the group's actual ED mix.</li>
              <li>· avg wRVU/ED read: derive from modality mix / CPT→RVU via the public CMS RVU file.</li>
              <li>· Radiologist $/wRVU: MGMA / RBMA benchmark range — verify; replace.</li>
            </ul>
            <p className="mt-3 text-[11px] italic text-ink/55">
              Inputs are pre-filled with credible anchors. The model is a deterministic pure function — same inputs in, same numbers out. No AI. No backend.
            </p>
          </div>

          <div className="mt-4 rounded-md border border-ink/15 p-3">
            <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
              Current inputs
            </div>
            <div className="mt-2">
              <Row k="coverage_volume" v={fmtCount(inputs.coverage_volume)} />
              <Row k="avg_wRVU_per_read" v={inputs.avg_wRVU_per_read.toFixed(2)} />
              <Row k="conversion_factor" v={fmtDollarsPerWRVU(inputs.conversion_factor)} />
              <Row
                k="payer_mix (Mc/Md/Com/SP)"
                v={`${inputs.payer_mix.medicare}/${inputs.payer_mix.medicaid}/${inputs.payer_mix.commercial}/${inputs.payer_mix.self_pay}%`}
              />
              <Row
                k="multipliers (Md/Com/SP)"
                v={`${inputs.payer_multipliers.medicaid.toFixed(2)} / ${inputs.payer_multipliers.commercial.toFixed(2)} / ${inputs.payer_multipliers.self_pay.toFixed(2)} ×`}
              />
              <Row
                k="fall_share / negative / reduction"
                v={`${inputs.fall_share_of_ED}% / ${inputs.fall_negative_rate}% / ${inputs.waste_reduction}%`}
              />
              <Row k="technical_cost_per_CT" v={`$${inputs.technical_cost_per_CT}`} />
              <Row k="denial_writeoff_pct" v={`${inputs.denial_writeoff_pct}%`} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
