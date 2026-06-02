# /stipend — Practice-Impact Dashboard (right column)

The left ○□△ instrument is untouched. A right column joins it, driven by the
two numbers a partner actually knows: **comp pool (R1)** and **ER share (R2)**.
One pure engine; the view renders it. Engine-verified, generic, illustrative.

## 1. Layout
- Desktop ≥1024px: two columns inside `/stipend` → `[ left instrument | right dashboard ]`. Left keeps its width and $10.10M demo default.
- <1024px: stack — instrument first, dashboard below.
- Persistent "Illustrative · sample data" header pill kept. No new links out.
- **Remove** Mid / Large / Custom scale chips and the `applyScale()` + `markCustom()` plumbing from `stipend.tsx`. Restore plain onChange handlers on `net`, `totcoll`, `twrvu`, `baseColl`, `baseWrvu`.

## 2. Driver inputs (right hero, empty-state)
Right boots fully zeroed — every KPI `$0 / —`. Empty-state copy verbatim:
> "Enter the two numbers you already know — your physician compensation pool and your ER share of work — and your whole picture fills in (this side and the stipend on the left)."

- **R1 · Physician compensation pool** ($, MGMA Total Physician Compensation)
- **R2 · ER share of work** (%)
- **Secondary, optional:** partner count N (toggle total ↔ per partner). **Default N = 100.**

Two inputs are the visual hero — large fields, arrow glyph, "start here" affordance. Nothing on the right renders a number until both R1 and R2 are non-empty.

## 3. The bridge (left ↔ right, both labeled)
1. **Top-down (primary):** R1 + R2 → W, C, overhead, ER wRVU, ER yield (benchmark), ER coll, non-ER yield. Derived ER coll + ER wRVU **sync into** the left's `baseColl` + `baseWrvu`, labeled "benchmark estimate — replace with your audited number." A small **"← derived from right"** chip appears on the affected left fields; clicking it unlinks (user edit wins from then on).
2. **Bottom-up:** user types left fields AND R2 is present → back-fill R1, W, C on the right via benchmarks; labeled "derived from left audit." Same unlink chip.
3. **Left-only, no share:** stipend on the left computes as today; right stays zeroed.

Precedence: most recent user edit wins; derived fields carry the benchmark chip, user-typed fields don't. Bridge is **eager with ~200ms debounce**.

Encoded as per-field `source: "user" | "derived-from-right" | "derived-from-left" | "empty"` so the bridge effect knows what is safe to overwrite.

## 4. Engine — one pure function
**New:** `src/lib/stipend/practiceImpact.ts`. Signed, no floors, deterministic, no network. Does NOT alter the left engine (`computeTwoNumbers` in `stipend.tsx`).

Benchmark pins (visible/sourced in the UI):
`compActualPerWrvu = 58`, `compToCollections = 0.83`, `overheadPerWrvu = 12`, `fmvComp = 50`, **`erYield = 28` (demo default — the page reconciles to $10.10M at 28, NOT 26)**, `nonErYieldBench = residual`.

```
TOP-DOWN  (P = comp pool, s = ER share)
  W       = P / compActualPerWrvu
  C       = P / compToCollections
  ovh     = (C − P) / W                  // ≈ $12
  erWrvu  = W × s
  erYield = 28                            // demo default; audit replaces
  erColl  = erWrvu × erYield
  nonErYield = (C − erColl) / (W − erWrvu)
  fairCost = fmvComp + ovh = $62
  distPerWrvu = compActualPerWrvu − fmvComp = $8

BOTTOM-UP (E_c = ER coll, E_w = ER wRVU, s = ER share)
  W = E_w / s ; nonErColl = (W − E_w) × nonErYieldBench
  C = E_c + nonErColl ; P = C × compToCollections
```

Returns: `totalWrvu, collections, overheadPerWrvu, erWrvu, erColl, erYield, nonErYield, fairCost, distributionPerWrvu, stipend, distributionTotal, distributionPerPartner, hospitalSaves, freedWrvu, redeployGain, scenarios{A_noStipend,B_withStipend,C_optimized}, volumeSweep[{erWrvu,distWith,distWithout}]`.

## 5. Right-column KPIs
- **Headline:** distribution per partner (total ↔ per-partner toggle).
- **5a · With/without-stipend flip** — segmented control snaps the headline between **Without ≈ $88k** and **With ≈ $189k** (engine-driven; not hardcoded).
- **5b · ER-volume sweep chart** — hand-rolled inline SVG. x = ER volume (0.5×…4× today), y = distribution per partner.
  - With-stipend line: flat ~$188k (the break-even ceiling).
  - Without-stipend line: downhill, zero ≈ 1.9×, ≈ −$216k at 4×.
  - **Marker boots at today's 1× tick (zero-change rest).** Drag right = add volume, left = cut. Both lines pre-drawn so the consequence shows the instant the marker moves. Pointer events; respects `prefers-reduced-motion`.
  - Caption frames the flat line as the win (copy in §7).
- **5c · Cut + redeploy** — avoidable-cut % (0–100% of ~30%) + redeploy util (0–100%) bend the with-stipend line up to **≈ $210k/partner** at 30%/100%; hospital saves **≈ $3.03M**. Live `$/partner` lift + `hospital saves $X` deltas. Util 0% → no gain, no loss.
- **5d · Practice vs ER table** — same cost $62/wRVU both sides; yield $28 ER vs ~$85 non-ER; margin −$34 vs +$23.53. Caption: "Same cost to read either study; the ER collects a third as much — payer mix, not effort."

## 6. Files
- **New:** `src/lib/stipend/practiceImpact.ts`
- **New:** `src/components/stipend/PracticeDashboard.tsx`
- **New:** `src/components/stipend/VolumeSweepChart.tsx`
- **New:** `src/components/stipend/PracticeVsErTable.tsx`
- **Edit:** `src/routes/stipend.tsx` — two-column wrapper, page-level state (`compPool`, `erShare`, `partnerCount`, `view`, `cut`, `redeployUtil`, per-field `source` flags), bridge effect (debounced 200ms, both directions), benchmark chip on derived left fields, remove Mid/Large/Custom plumbing.

## 7. Framing copy (verbatim — the soul)
Inline editorial captions on the dashboard:
- **Break-even is ER's ceiling — the win, not a letdown.** *"The stipend can't make ER a profit center — that would be funding profit, and the law forbids it. Its job is to stop ER from being a loss center. Best case, ER is break-even — and getting to zero is the win."*
- **The flat line is the proof it's FMV.** *"More ER volume never raises your partner profit by a dollar — and that's exactly why this is a fair coverage payment and not a kickback. The stipend funds the cost of coverage, never the owners' return."*
- **Without stipend = subsidizing a mandate.** *Frame the downhill line as the group covering the hospital's obligation out of its own partners' pockets — the risk the stipend removes.*
- **Why the group covers it (generic — no hospital names).** *"Covering the ER is the price of admission to the relationship — the equipment, the referrals, the work that pays. That was a fair trade while the rest carried it. The price of admission just can't be losing money."*
- **The invisibility/unlock.** *"Nothing ever segmented your ER, so the loss hid inside the blended book — until the surplus thinned and the bonus fell. Turn the ER on as its own segment and the shape tells you where it went."*
- Labels: derived = "benchmark estimate"; ER yield = "your audit replaces this"; non-ER = "derived (residual)."

## 8. Guardrails (don't regress)
- Left ○□△ instrument unchanged; median $50 → fair $62 → **$10.10M** still holds.
- No new links from `/stipend` to other depth pages. Only self + contact email.
- Signed math, deterministic, view-renders-engine. No real names. No leaked builder text.

## 9. Acceptance checks
- Right all-zeros until BOTH R1 and R2 entered; empty-state names exactly those two.
- Top-down at (pool $63.8M, share 27%): 1.1M wRVU, $77M collections, $12 overhead, $8 distribution, **$10.10M stipend** on the left; left ER fields populated + benchmark-labeled.
- Bottom-up: left two + share → back-fills R1 ≈ **$63.8M**, labeled.
- Left-only, no share: stipend computes; right stays zero.
- With/without flip: **≈ $88k ↔ ≈ $189k** at N=100 / demo inputs.
- Volume slider rests at zero-change tick; right = add, left = cut. With-stipend flat ~$188k; without-stipend zero ≈ 1.9×, ≈ −$216k at 4×.
- Cut 30% + redeploy 100% → **≈ $210k/partner**, hospital saves **≈ $3.03M**; util 0% = no gain, no loss.
- erYield demo default = **$28** (reproduces $10.10M).
- Mid/Large/Custom chips + plumbing removed.
