# Native Numbers — speak the units they think in
### Replacing abstract sliders with the figures radiologists and hospital finance carry in their heads
*Applies to the Sandbox, the dashboard panels, and the engine's assumption labels — everywhere a number appears. Companion to the build brief and engine logic.*

---

## The problem with the sliders
A 0–100 "self-pay share" slider and an "avg fee $20–90" slider look fun, but they're an outsider's mental model. A radiologist doesn't feel for a percentage on a scale — they think in **wRVUs, $/wRVU, exam counts, payer mix, and turnaround in minutes.** A hospital CFO thinks in **payer mix, blended rate, uncompensated care, and contribution margin.** If the first thing they see is a made-up "$45 avg fee" they have to drag, they file the whole tool under "doesn't actually know our world." The fix: every input is a **named number in their unit, shown, pre-filled with a sourced benchmark, and editable** — because they'd rather correct a number they recognize than feel for one they don't.

**Rule:** show the number and its unit, default it to a cited benchmark, let them overwrite with "our actual." Sliders, if kept at all, are secondary, always display the live value + unit, and ride a real scale with benchmark tick-marks — never an abstract 0–100.

---

## What the radiologist knows in their heart
Build inputs and outputs from these, not around them:
- **wRVUs.** The currency of the field. wRVU per study, per shift, per year; the group's **$/wRVU** (collections per wRVU) is a number they negotiated and feel. Annual wRVU production is how they measure a colleague.
- **The Medicare conversion factor.** 2026: **$33.40** non-QP / $33.57 QP (was $32.35 in 2025), with a **−2.5% work-RVU efficiency cut** on non-time-based codes in 2026 that hits imaging. They feel the cuts.
- **Exam counts.** "We read ~X studies a year." Absolute volume, not percentages.
- **Modality mix.** CT / MR / US / XR / mammo / NM-PET — and that CT/MR carry the wRVUs. ED skews to CT.
- **Pro vs technical split.** They bill the professional component (−26); the hospital bills technical (TC). Their collection is the pro fee.
- **Payer mix as collection reality.** Not just shares — that Medicaid pays a fraction of Medicare, self-pay collects almost nothing, commercial is the money. "Our ED is X% Medicaid/self-pay" is a sentence they say.
- **Turnaround time in minutes.** STAT vs routine. A quality metric they're measured on.
- **Negative/normal read rate** for reflexive indications — they have a gut number for how many "fall" head CTs come back clean.

## What hospital finance knows in their heart
- **Payer mix → blended reimbursement rate.**
- **Uncompensated care** (charity + bad debt) as a line item — they know their number.
- **Contribution margin / cost per case**, and the **technical-component** economics.
- **Coverage-subsidy / stipend benchmarks** and **FMV** — what they (or peers) pay per coverage unit for ED call, hospitalist support, etc.
- **Denial rate, days in A/R, cost to collect.**
- **ED throughput** — door-to-disposition, boarding, LWBS — and that imaging sits in that critical path.

---

## The money model, rebuilt from native blocks
Retire `avgFee`, the `0.50` coverage constant, and the `1.5×` hospital multiplier. Build dollars up the way they're actually computed, and **report the giveaway in BOTH wRVUs (for the radiologist) and dollars (for the CFO).**

**Inputs (named, in-unit, benchmark-defaulted, editable):**
```
coverage_volume      = ED/trauma/overnight reads per year         (count)        e.g. 150,000
avg_wRVU_per_read    = blended work RVU per coverage read         (wRVU)         e.g. 0.9   [ED skews CT]
conversion_factor    = Medicare CF                                 ($/wRVU)       33.40      [CMS CY2026 non-QP]
payer_mix            = {Medicare %, Medicaid %, Commercial %, Self-pay %}        e.g. 22/30/33/15
net_$ per wRVU by payer = {Medicare≈CF, Medicaid≈f_md×CF, Commercial≈f_comm×CF, Self-pay≈~0}
                       defaults: f_md and f_comm as multiples of Medicare        [group replaces with actuals]
fall_share_of_ED     = % of ED coded "fall"                                       e.g. 12%
fall_negative_rate   = % of those reads that come back clean                      e.g. 55%
waste_reduction      = achievable reduction in needless "fall" reads             e.g. 20%
```

**Derived (shown in native units):**
```
total_wRVU            = coverage_volume × avg_wRVU_per_read
blended_$ per wRVU     = Σ payer_share × net_$perwRVU_payer
uncompensated_wRVU     = total_wRVU × (self-pay share + uncollected Medicaid portion)   // the work delivered for ~nothing
uncompensated_$        = uncompensated_wRVU × (their effective rate on that work)
needless_fall_wRVU     = coverage_volume × fall_share × fall_negative_rate × avg_wRVU
recoverable_wRVU       = needless_fall_wRVU × waste_reduction                            // capacity freed
```
**Outputs, in their language:**
- To the radiologist: "**~X,000 wRVUs/yr** of coverage work that collects ~nothing" and "**~Y,000 wRVUs** tied to needless 'fall' reads." wRVUs first.
- To the CFO: the same as **dollars** — uncompensated pro-fee, plus hospital-side **avoided technical cost + reduced denial write-offs** on the needless scans (CFO enters technical cost/CT and denial write-off %, not a multiplier).
- "Dollars in pockets" still lands, but every figure traces to a block they recognize, visible in the math drawer.

---

## Benchmark defaults (credible anchors — every one labeled and replaceable)
The power is the group enters **their** numbers (they know them). Defaults just need to be credible and sourced so they read as anchors, not guesses.
| Input | Default anchor | Source / note |
|---|---|---|
| Conversion factor | $33.40 (non-QP) / $33.57 (QP) | CMS CY2026 MPFS final rule — verify annually |
| 2026 work-RVU efficiency cut | −2.5% on non-time-based codes | CMS CY2026 — note it shrinks imaging wRVUs |
| Commercial vs Medicare | ~150–300% of Medicare | Range — replace with the group's contracts |
| Medicaid vs Medicare | varies widely by state; often well below | Replace with state/actual |
| Self-pay collection | ~near zero on pro-fee | Replace with actual |
| ED payer mix | site-specific | Replace with the group's actual ED mix |
| avg wRVU per ED read | derive from modality mix or CPT→RVU | Use the public CMS RVU file (already in the harness schema) |
| Radiologist comp / $ per wRVU | MGMA / RBMA benchmark range | Verify; replace with the group's effective rate |
**Do not assert any of the "range" rows as a precise figure in the UI.** Show the range, cite the source, default to a midpoint, and invite the real number. Bluffing a precise benchmark is the same credibility loss as a mystery slider.

---

## Input UX (the fix for the pause)
- **Primary control = a labeled numeric field** with unit, pre-filled benchmark, inline source, editable. `ED reads / yr [150,000]` · `Avg wRVU / read [0.9]` · `$ / wRVU [ $52 ]` · `ED payer mix  Medicare [22%] Medicaid [30%] Commercial [33%] Self-pay [15%]`.
- **"Use benchmark" toggle** per field, so they can leave a default and see its source — builds trust rather than forcing a guess.
- **If a slider is used at all**, it must show the live number + unit and ride a real, tick-marked scale (e.g., payer-mix sliders that sum to 100% and display each share and its $ effect). Never an unlabeled 0–100.
- **Every output restates its inputs** ("at 0.9 wRVU/read and $33.40 CF…") so a radiologist can audit it at a glance.

## Thread it everywhere (not just the Sandbox)
- **Dashboard panels** use native units: collection rate (%), **net revenue per wRVU** ($/wRVU), payer mix (%), turnaround (**minutes**), uncompensated coverage (**wRVUs and $**), negative-read rate (%). No abstract indices.
- **Engine assumption labels** state assumptions in-unit: not "ER self-pay 30% — placeholder," but "ED self-pay 15% + Medicaid 30% (benchmark) → ~X,000 uncompensated wRVUs — replace with your mix." The assumed→actual flip then swaps a benchmarked native number for the group's own.
- **Architecture spec / harness** already computes $/wRVU by joining CPT to the **CMS RVU file** (in the invariant schema) — so when real data lands, these exact units become actuals with no reframing. The Sandbox and the wired dashboard speak the same language; only the source changes.

---

## The point
The numbers a radiologist or CFO recognizes do more persuasive work than any animation. When the first screen shows *their* wRVUs, *their* conversion factor, *their* payer mix — defaulted to credible anchors and theirs to correct — they stop evaluating whether the tool understands their world and start arguing about the inputs. That argument is exactly the conversation you want them in.
