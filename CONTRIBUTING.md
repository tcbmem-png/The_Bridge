# Contributing to the Bridge engine

## Run it

```
node test/harness.ts      # 35 assertions, verified to the dollar
```

Requires Node ≥ 22.18 (native TypeScript type-stripping — no build step, no `npm install`). `tsconfig.json` is for editor type-checking only; `@types/node` is optional and not required to run.

## The cardinal rules (do not break these)

1. **No AI in any path** — not the join, the metrics, the timing, the money. The tool surfaces patterns; humans judge. Indication comes from the ICD-10 code, never from parsed prose.
2. **One money module, read everywhere.** `src/money/index.ts` computes once; nothing else re-derives a number. Every figure reconciles to the dollar. (This is the shared package both this repo and the public demo import.)
3. **Recoverable and structural never blur.** The no-pay (self-pay) and underpay (Medicaid-vs-Medicare) coverage-gap lines stay separate, always.
4. **Maturity-aware.** Service-date anchored; pending ≠ denied; shade the immature edge; restate as it firms — never silently edit a point.
5. **Pin ambiguity at the source.** Every undefined choice is surfaced in `src/config/pins.ts` for a human to author. Never guess a pin. The three human-gated pins (low-yield clinical definition, patient-key hashing, stipend scope) stay `null` until authored.
6. **Compliance wall.** This repo is synthetic-only. **Never commit real patient data** — `.gitignore` blocks the common extract formats, but the rule is yours to hold. Real data lives only in the BAA-covered environment (Phase 5).
7. **Determinism.** Same inputs → byte-identical output. If the harness's determinism check fails, something non-deterministic crept in — fix it.

## How to extend it (the adaptable layer)

- **New input form (e.g., an X12 837 file):** add one adapter implementing `BoxAdapter` in `src/adapters/`. It normalizes to the canonical record; downstream changes nothing. (Real adapters are Phase 5, blocked on the extract answers + BAA.)
- **New specialty:** swap the box-2/box-3 contents and the `src/enrich/wrvu.ts` code→value-unit table. The join, maturity, money, and output shapes don't move.
- **New metric:** add it to `src/money/index.ts` so it's single-sourced, then assert it in `test/harness.ts`.

## The bar for any change

Add or update an assertion in `test/harness.ts` and keep it green. A change that touches a money figure must be re-verified to the dollar. Flag anything you couldn't verify rather than asserting a pass.

## Push as its own repo

```
cd bridge-engine
git init && git add . && git commit -m "Phase 0-1: invariant core, verified to the dollar"
# create a NEW GitHub repo (separate from the public demo), then:
git remote add origin <your-new-repo-url>
git push -u origin main
```

Keep this repo distinct from the demo so the BAA scope and access controls never touch public code.
