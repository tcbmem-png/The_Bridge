## Upload portal for the hosted `/harness` — synthetic only

One reframe drives the whole scope: there are **two delivery surfaces**, and the portal we are building serves only the first.

1. **Hosted `/harness`** (this build) — PGlite in the tab, ships with the MOCK seed pre-loaded, drop-a-file to watch it light up. Synthetic only. Session-only. Structurally incapable of retaining anything across reload. Never a place real data lands.
2. **The fork** (not this build, but the payoff this build sets up) — same engine, same SQL, same mock data, cloned and run on the user's own hardware. That is where real 835/837/RIS replaces the mock, because that is the only surface where PHI can live without a BAA/encryption/access-log conversation.

The PHI banner and the page copy must say this out loud. The portal's existence on the hosted page is what makes "and they can fork it and swap their own data in" believable; the portal's discipline on the hosted page is what keeps that promise honest.

### Decisions (locked)

- **1 · File shape — A, corrected.** CSV per file, but the inputs are the **source-system exports** a billing system actually emits (billing export, ERA, RIS export, bank statement, ref dims) — not pre-shaped dumps of `raw.x12_837_line`. The portal owns a thin landing layer + a documented column map (source-export column → staging column) and selects what it needs, drops the rest. This is the "swap mine in" contract.
- **2 · Replace vs augment — A.** TRUNCATE `raw.*` and `ref.*`, recompute views, reload restores the seed. Named-slot switcher (B) is a fast-follow only if A/B scenario storytelling becomes a priority. Append (C) is wrong (source_file/date collisions).
- **3 · Persistence — A, session-only.** No IndexedDB toggle. The hosted page must be structurally incapable of retaining uploads. Reload-loses-it is fine for a synthetic demo, and it is the compliance posture for the hosted surface. Persistence belongs in the fork.
- **4 · Validation — C, strict structure / permissive content.** Block on shape failures (missing required columns, wrong types, no EFT-trace column). Load on content gaps (FK breaks, missing months, denial-code gaps) and surface them in an integrity panel — that puts the recon surfaces on display instead of hiding them behind a refusal. Mirrors how real 835/837 ingestion behaves.

### Additional picks

- **Nav.** Portal lives **inside `/harness`** as a panel at the top, one scroll, still unlinked from the main nav. One surface tells the whole story (data in → recon → dashboard). No separate `/upload` route.
- **Named sets.** Built-in seed = `MOCK RAD GROUP — baseline`. Uploaded sets get a name field (default: filename stem). Minimal for v1, required if the B switcher ships later.
- **Download current set.** Export button on the portal that round-trips the realism: download mock → see it work → export → replace with yours. Also lets a synthetic set go to a compliance reviewer pre-BAA. Cheap, high-signal.
- **File size / loading.** Realistic set is ~4.5 MB unzipped (`837 ~1.5 MB`, `RIS ~1.65 MB`, `835 ~0.9 MB`, `bank ~0.42 MB`; zip ~690 KB). Over PGlite's comfort line. Implement chunked `COPY` with a visible progress bar. A few seconds of loading helps "feel real" — instant load on 5,000 claim lines reads as a toy.

### What gets built

```
harness/
  portal/
    schemas.ts             // zod schemas per source-export type (shape contract)
    columnMap.ts           // source-export column → staging column, per export type
    detect.ts              // filename + header sniff → export type
    stage.ts               // CSV → typed rows (Papa Parse, streaming)
    load.ts                // chunked COPY into raw.* via PGlite, progress events
    reset.ts               // TRUNCATE raw.* + ref.*, then reseed-from-bundle option
    export.ts              // dump current raw.* + ref.* to a CSV bundle (zip)
  fixtures/
    mock-rad-group/
      billing_export.csv
      era.csv
      ris.csv
      bank.csv
      ref_*.csv
src/components/harness/
  UploadPortal.tsx         // dropzone, file list w/ detected type + shape pill,
                           // Load / Reset / Download buttons, progress, errors
  IntegrityPanel.tsx       // content-level failures: FK gaps, month coverage,
                           // missing MPFS rates, denial-code coverage
docs/
  upload-portal-contract.md // documented column map per export type, with examples
```

The five existing panels (`SegmentMonthly`, `CashTieout`, `VolumeTieout`, `HandoffContract`, `LineageDrill`) re-query on every successful load. They are unchanged otherwise.

### Flow on the page

```text
/harness
  ├── PhiBanner                         (existing, updated copy: hosted = synthetic)
  ├── UploadPortal                      (new — drop, detect, stage, load, reset, export)
  │     active set: "MOCK RAD GROUP — baseline"
  │     [ Replace with upload ]  [ Reset to seed ]  [ Download current set ]
  ├── IntegrityPanel                    (new — content-level gaps, only if any)
  ├── SegmentMonthly                    (existing)
  ├── CashTieout                        (existing)
  ├── VolumeTieout                      (existing)
  ├── HandoffContract                   (existing)
  └── LineageDrill                      (existing)
```

### Shape contract (the part that has to be right)

For each source export, the portal validates:

- **Required columns present** (block on miss) — e.g. ERA must have EFT trace, paid amount, claim id, service-line ref.
- **Column types parse** (block on miss) — dates, money, NPIs, CPT.
- **Row count > 0** (block on miss).

It does **not** block on:

- FK closure (837 line → ERA line → bank deposit). Surfaced in `IntegrityPanel`.
- Month coverage (need 36 distinct months for `is_mature`). Surfaced.
- MPFS rate present for every `(cpt, service_year)`. Surfaced.
- Denial-code reference completeness. Surfaced.

Each export type's required columns + the source→staging map ship in `docs/upload-portal-contract.md` so a user generating their own files has the spec, not just an error message.

### Boundaries (unchanged)

- No Cloud, no Supabase, no hosted Postgres. PGlite stays in the tab.
- No persistence beyond the session. No IndexedDB option.
- No write path to `/stipend` or the calculator. Handoff contract still documented-only.
- The canonical SQL file is untouched. Uploads land in `raw.*`; views recompute from there.

### Acceptance

1. Drop the bundled `mock-rad-group/*.csv` set → portal detects each file → loads → all four existing checks pass (ER $28.00 / non-ER $86.00 / cash 0 rows / unbilled_gap 0).
2. Drop a malformed ERA (missing EFT trace) → shape block screen names the missing column and the export type, nothing loads.
3. Drop a billing export covering only 18 months → loads, `IntegrityPanel` flags "month coverage < 36, `is_mature` will be FALSE for all months", recon panels still render.
4. Click `Download current set` → zip of the active raw.*+ref.* rows → re-uploading it reproduces the same numbers.
5. Reload the page → uploaded set is gone, MOCK seed is back. No IndexedDB entries written.

### Technical notes (for the implementer)

- Parse with `papaparse` in streaming mode; do not buffer entire files.
- Load into PGlite with chunked `COPY ... FROM STDIN` (≤5k rows per chunk) and emit progress events to the UI.
- Detect export type by header signature first, filename second. Never by content sampling — that hides shape bugs.
- Use a fresh `PGlite` instance per load (drop + recreate) rather than ad-hoc TRUNCATE chains; cheaper and guarantees no residue.
- `zod` for the shape contract; one schema per export type, exported from `harness/portal/schemas.ts` so `docs/upload-portal-contract.md` can be generated from the schemas (single source of truth).
- All new strings use existing tokens (`ink`, `paper`, `teal`, `gold`, `red-clinical`) and the editorial-clinical voice — no marketing register, no emoji, periods not commas.

### Out of scope (explicit)

- The fork itself. This build sets it up by making the swap believable; it does not ship the fork.
- The B switcher (named-slot A/B). Fast-follow only.
- Wiring the calculator's audited path to `core.er_yield_period`. Still a separate, deliberate decision after the BAA conversation.
- Any path that lets real 835/837/RIS land on the hosted page.
