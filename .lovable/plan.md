## ER Stipend Audit Harness — synthetic demo, separate from the calculator

Scope unchanged from the prior plan. One runtime change in response to your comment: **PGlite, not DuckDB-WASM**. The selling point is "the number traces to source on real Postgres," so the in-browser engine is real Postgres (ElectricSQL's PGlite — Postgres compiled to WASM). The uploaded `.sql` runs **verbatim**, `GENERATED ALWAYS AS IDENTITY` / `TIMESTAMPTZ` / `date_trunc` / `INTERVAL` / `FULL JOIN` / `repeat()` all included. No translation shim, no parallel hand-maintained copy.

### Boundaries

- **No Lovable Cloud, no Supabase, no hosted Postgres.** PGlite runs in the browser tab. Project stays client-only.
- **No edit to `/stipend` or any calculator code.** The harness emits the handoff contract; the calculator does not consume it yet.
- **Synthetic only.** PHI header from the SQL file is reproduced verbatim in the UI. No upload affordance, no "connect your data."
- **Uploaded SQL is the source of truth, byte-for-byte.** Shipped at `harness/sql/radiology_stipend_harness.sql`, imported as `?raw`, executed unmodified.

### What gets built

**1. The SQL, mounted verbatim**
- `harness/sql/radiology_stipend_harness.sql` — your file, byte-for-byte.
- `harness/runtime/db.ts` — boots `@electric-sql/pglite`, executes the file once per session as a single multi-statement script, then exposes a parameterized query API for the lineage drill (`:p_month` → `$1`, issued as a prepared statement; bulk script never sees the bind line because it lives in a documentation-only `SELECT` block that we skip by line marker, not by rewriting the file).

**2. Route `/harness` (hidden — not in header nav, reachable by URL)**
Editorial-clinical voice, existing tokens. Five panels matching the file's acceptance footer:

- **A. Segment monthly** — `SELECT segment, wrvu, collections, yield_per_wrvu FROM core.segment_monthly`. Pass/fail pill: ER = $28.00, non-ER = $86.00.
- **B. Cash tie-out** — `SELECT * FROM recon.cash_tieout`. Pass/fail pill: 0 rows.
- **C. Volume tie-out** — `SELECT * FROM recon.volume_tieout`. Pass/fail pill: `unbilled_gap = 0` for every month.
- **Handoff contract** — `SELECT er_yield, non_er_yield, er_wrvu, non_er_wrvu, is_mature FROM core.er_yield_period`. Labeled as the only columns that will ever cross to the calculator.
- **Lineage drill** — month picker → runs the `:p_month` query at lines 277–289 as a prepared statement → renders claim/line rows with `src_837_file`/`src_835_file`/sha256. Footer asserts `SUM(paid_amount)` of rendered rows equals `core.segment_monthly.collections` for ('ER', month).

**3. PHI / scope banner**
Fixed panel at the top: the file's PHI warning header reproduced verbatim, plus "Synthetic · not for clinical use" and a one-liner that real ingestion replaces the addendum below `DEMO ADDENDUM` and is gated on BAA + encryption + access logging + the Cloud decision — to be made deliberately, not as a side effect.

**4. Calculator handoff — documented, not wired**
Short note on the page and `docs/calculator-handoff.md`: the calculator's left/audited path will read `er_yield`, `non_er_yield`, `er_wrvu`, `non_er_wrvu` from a single `is_mature = TRUE` row. **No wiring this build.**

### Files

```
harness/sql/radiology_stipend_harness.sql        (verbatim upload)
harness/runtime/db.ts                            (PGlite boot + exec)
harness/runtime/queries.ts                       (the 5 named queries)
src/routes/harness.tsx                           (hidden route)
src/components/harness/PhiBanner.tsx
src/components/harness/SegmentMonthly.tsx
src/components/harness/CashTieout.tsx
src/components/harness/VolumeTieout.tsx
src/components/harness/HandoffContract.tsx
src/components/harness/LineageDrill.tsx
docs/calculator-handoff.md
```

Dependency: `@electric-sql/pglite` (single package, real Postgres in the browser, no server, no BAA surface).

### What this plan deliberately does not do

- Does not enable Cloud, create a hosted Postgres, or add persistence beyond the in-tab PGlite instance (rebuilt on every page load from the seed).
- Does not modify the uploaded SQL, the calculator, or any existing route.
- Does not provide an upload UI or any path for real 835/837/RIS/bank files.
- Does not wire the calculator's audited path.
- Does not link `/harness` from the header nav.

### Acceptance — what I will verify live on the page

1. `core.segment_monthly` → ER $28.00 / non-ER $86.00.
2. `recon.cash_tieout` → 0 rows.
3. `recon.volume_tieout` → `unbilled_gap = 0` every month.
4. `core.er_yield_period` → ER $28.00, non-ER $86.00, `is_mature = TRUE`.

If PGlite rejects any line of the file at load, I stop and report the exact line — I do not silently edit the SQL.