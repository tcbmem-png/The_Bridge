Big-picture: the math fix (one primitive `erWrvu`, overhead $12 pin, FMV proof flat) is already in. This pass implements the spec's remaining structural asks — input model, source toggle, and headline composition.

## Scope

### 1. Replace bidirectional `bridge` with one `source` flag
- Remove `bridge`, `leftCollSource`, `leftWrvuSource`, `rightSource`, debounce effect.
- Add `source: "right" | "left"` (default `"right"`).
- Toggle UI: small pill above the page header — "Source: right ▢ left". Flipping clears the opposite side's editable state and re-derives it from the active source.
- Exactly one side editable at a time; the other renders read-only with a "← derived" chip.

### 2. Right mode = (avg per-partner distribution, partner count, ER share)
Replace the comp-pool input with `avgPerPartnerDist` (default $88,000). Internal derivation:
```
totalWrvu = (avgPerPartnerDist × partnerCount) / 8       // $8 = $58 comp − $50 FMV
compPool  = totalWrvu × 58
```
Then the existing `computePracticeImpact` engine runs unchanged. Round-trip check: $88k × 100 / 8 = 1.1M wRVU → pool $63.8M.

### 3. Left mode = (audited ER coll, audited ER wRVU, ER share, partner count)
- Left inputs become the source; right comp-pool/distribution renders as derived.
- `yield` in left mode = `baseColl / baseWrvu` (the real audit), not the $28 benchmark. Wire this into both the left □ engine and the right dashboard's `erYield` input.

### 4. Roll redeploy gain into the per-partner "with stipend" headline
- In `PracticeDashboard`, when `volumeLever < 0`, the displayed "With stipend / partner" KPI = `(partnerWithTotalNoRedeploy + redeployGain) / N`. Keep "Your gain +$X" as a small breakdown line beneath.
- Same change on the left Hospital drawer: roll `groupGainLeft` into the displayed with-stipend partner figure; keep the breakdown line.

### 5. Small UI touches
- Next to the lever-scaled ER wRVU on the right dashboard, show a quiet "today: 297,000" reference when lever ≠ 0.
- Replace the right-column intro copy with the verbatim block from §0.1:
  > If you know your actual annual ER wRVU and collections, toggle left and enter them. If you don't, toggle right and enter your average annual partner profit distribution, number of partners, and best estimate percentage of your group's total annual wRVU attributable to ER. We'll use benchmarks and math to build the model from there. Don't forget to slide the ER volume scale at the bottom.

## Files

- `src/routes/stipend.tsx` — source toggle state, right→pool derivation, left→yield wiring, remove bridge effect, intro copy, today-reference span, redeploy roll-in on left.
- `src/components/stipend/PracticeDashboard.tsx` — accept `avgPerPartnerDist` / `setAvgPerPartnerDist`, render distribution input in right mode (and derived chip in left mode), roll redeploy into with-stipend KPI, today-reference span.
- `src/lib/stipend/practiceImpact.ts` — already correct; add an optional `erYieldOverride` only if the audit-driven yield needs a different field, otherwise pass through `erYield` from the page state.

## Out of scope (defer)

- Audited-ER single-constant swap on left while in right mode — spec marks this as deferrable polish.
- Any change to the ○□△ visual layout beyond the existing prose collapse.
- The /story, /sandbox, /under-the-hood routes.

## Acceptance gate

Demo inputs (right mode: $88k × 100, share 27%):
- lever 0 → stipend $10.10M · partner-with $189k · partner-without $88k
- +30% → ER wRVU 386,100 · stipend $13.13M · partner-with flat $189k
- −30% with redeploy 100% → partner-with ≈ $214k (roll-in), Hospital saves +$3.03M
- Left □ stipend == right dashboard stipend at every lever position.
- Flipping source clears the opposite side and re-derives; only one side editable at a time.
