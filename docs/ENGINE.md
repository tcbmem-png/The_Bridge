# The Bridge — Real Engine (Phases 0–1)

Deterministic data pipeline for a physician group's operator data. **No AI in any path.** Separate repo from the public demo; the money/metric math is the shared single-source package (`src/money`) that both this engine and the demo import, so their numbers cannot drift.

Built against **synthetic, PHI-free fixtures**. No real data, no network, no backend. Real-source adapters and real data are **Phase 5 — blocked** on the extract-request answers and a signed BAA, by design.

## Run

```
node test/harness.ts                 # core engine — 35 assertions, to the dollar
node test/transmission.harness.ts    # transmission — 32 assertions, to the dollar
node test/series.harness.ts          # 36-month series + snapshot — 21 assertions
npm test                             # all three (no install needed, Node ≥ 22.18)
npm run snapshot                     # writes dist/operator-snapshot.json (what the front end reads)
```

## What's here (the invariant core)

- **`src/schemas/canonical.ts`** — the one canonical record per box (Billing / Production / Workflow) + the `Fact`. Two keys only: entity (accession) and date of service.
- **`src/adapters/`** — the adapter seam (`types.ts`) + synthetic CSV adapters. New input form = one adapter, zero downstream change. Real adapters drop in here at Phase 5.
- **`src/join/join.ts`** — three-tier join: (1) accession exact → (2) composite bridge → (3) unmatched. `join_status` is an output; unmatched buckets ARE the findings (lost work / capture gap / denial).
- **`src/enrich/wrvu.ts`** — CPT → wRVU from a versioned table (file version + conversion factor in config).
- **`src/maturity/maturity.ts`** — maturity by class (production stable; charge-capture mild; payment-realized strong), service-date anchored; **pending ≠ denied**; restatement firms points on later loads.
- **`src/money/index.ts`** — **the shared single-source money module.** Computes the §3 trend outputs once; everything reads it. The no-pay / underpay coverage-gap split is **never fused**.
- **`src/engine.ts`** — orchestrator + most-mature loader.
- **`src/transmission/transmission.ts`** — Phase 2: findings → dollars, routed. Fixed lane per finding type (recoverable / structural / prevention); sized from the money module (no re-derivation); two surfaces (pool dashboard, stipend evidence pack) + hospital lens. Recoverable and structural draw from disjoint money fields and **never blur**. Includes the **night-ER coverage block** (shift × site × payer × yield × reader), valued by the same coverage-gap function as the money module.
- **`fixtures/synthetic.ts`** — PHI-free raw rows with the deliberate hard cases (bridge, unmatched, lost work, capture gap, denial, underpayment, pending-not-denied, restatement) + the after-hours coverage scenario.
- **`fixtures/series.ts`** — Phase 3: a deterministic 36-month series with a payer-mix **inflection** (the slope the trend panels foreground), seeded findings, night/day spread, and recent-month pending claims.
- **`src/snapshot.ts`** — Phase 3: serializes the engine output to `dist/operator-snapshot.json` (trends + transmission + night block + a drill-able fact sample + a **provenance map** so every number opens to its source). This is what the visualization layer reads — it renders, it never re-derives.
- **`test/harness.ts`** — the verification gate (join tiers, findings, maturity, money to the dollar, determinism, restatement).

## Config pins (`src/config/pins.ts`)

Defaulted as **labeled assumptions** (adjust here): N=90d, M=4mo, accrual lens (+cash toggle), calendar months, CMS CY2026 @ $33.40, bridge rule. Three pins are **human-gated and not guessed**:

- **low-yield / negative-read definition** — clinical, the group (Jonathan). The night-block yield cut runs against a flagged PLACEHOLDER until then.
- **patient-key hashing** — counsel; gates Phase 5 real-data ingestion.
- **stipend evidence-pack scope** — counsel.

## One open definition surfaced (not guessed)

`blended $/wRVU` is computed over the **matched, matured** set (exams both read and billed, matured) — excludes unbilled lost-work and chargeless capture-gaps to avoid cross-terms. This is a modeling pin worth a one-line confirm.

## Topology

Three things, by intent: **(1)** this engine repo, **(2)** the public demo repo, **(3)** the shared `money` package both import. Compliance boundary on the outside; single source of truth on the inside.
