# When your BI can't produce the two numbers — a technical FAQ for IT / the CIO

*For the reader who wants to go all the way down. The instrument needs two numbers — ER wRVU and ER net professional collections, by ER origin. Most groups already hold the inputs; sometimes a report is a setting away, sometimes the cut sits in the seam between systems. This explains, plainly and then precisely, what we run when it's the latter — what the technology is, what it touches, and what it asks of your team. Plain-English first, the term in your back pocket for when someone pushes. Not legal or valuation advice; the binding FMV figures belong to a valuator.*

---

## What it is

**Q. In one sentence, what is this?** It's not a database you query live. It's a pipeline that joins your three data feeds once a month and bakes the result into a small file you can slice instantly. The precise name — keep it in your pocket — is a **batch ETL pipeline that outputs a precomputed data cube** (a materialized snapshot).

**Q. Break down "batch ETL → cube."** *ETL — Extract, Transform, Load:* pull the raw records from your systems, join them and apply your rules, load the finished result into one small JSON snapshot. *Batch:* it runs in one scheduled pass (≈ every 30 days) over a fixed pull — not continuously. The opposite, "streaming/real-time," is what a live database does; this isn't that. Think end-of-season stats, not the live scoreboard. *Cube/snapshot:* the small bucketed result — numbers pre-totaled across a few dimensions (time × site × shift × payer) — which is why it slices instantly.

**Q. Is it AI? Is it going to hallucinate a number?** No. The math and truth path are deterministic flat code — no model reasoning at runtime, fully testable, the same every period. Every output drills back to its source rows, and total collections reconcile to your financial statements; if it doesn't reconcile, the extract is wrong and we fix it before anyone trusts it. There is **zero machine learning in the money or stipend math** — that path is deterministic, full stop. The only NLP anywhere in the system reads *report text* for the clinical-indication signal (the "fall" / negative-read pattern): your existing **Nuance mPower** if you license it, or a light report-text step if you don't. It never touches the dollars.

**Q. Is this a new system of record we have to own and maintain?** No. It holds no master data, runs periodically, and emits a file. The join sits *between* the systems you already own — which is exactly why it's a small build and why it doesn't ship as a packaged product.

---

## Why your existing stack can't already do it

**Q. We have a BI tool / RCM analytics / mPower. Doesn't one of them already do this?** They do their jobs well, and every one you've turned on makes this faster and cheaper — you've already stood up the expensive parts. Joining the data is no longer the hard part: integrated platforms (RamSoft OmegaAI, Konica Exa \+ ImagineOne, eRAD) span RIS \+ PACS \+ billing in one database, and analytics overlays join disparate systems. What none of them *packages* — even an all-in-one stack — is this specific cut: *professional collections ÷ wRVU, restricted to ER-originated studies, by site, framed for a coverage-stipend conversation.* The three inputs originate in three domains — money in RCM, the clinical read in the report, the timestamps in PACS/the worklist — so even where one vendor holds all three, the by-origin yield cut still has to be assembled; it's a configuration or a saved-query build, not a report that ships in the box. Either way it's work someone stands up. And the decisive point isn't who *can* join it — it's that **the hospital can't compute it at all, because it never sees your professional collections.** That moat holds regardless of which tools you own.

**Q. And the hospital can't just build this themselves?** No — structurally. The hospital never sees your *professional* collections; it bills and receives the *technical/facility* component. So the one number the whole conversation turns on is one only you can compute. That's the moat, and it's why this has to come from your side.

**Q. So what's the honest framing?** You built the foundation, and built it well — we set the keystone. Not a data problem, and not because your tools can't join it: it's that no one packages this exact cut, and the hospital structurally can't see it. The more you already run, the less we build.

---

## What data it touches, and where each piece comes from

**Q. What exactly do you extract?** All standard, all yours, none invented:

| Input | Lives in | What it is |
| :---- | :---- | :---- |
| Charges, payments, payer, place of service | RCM / billing | The **837** claim (sent out) \+ **835** remittance (came back) — HIPAA-standard EDI |
| Denial / short-pay reasons | RCM (835) | **CARC / RARC** adjustment reason codes |
| Indication (e.g. "fall") | Claim | **ICD-10-CM** diagnosis codes |
| Procedure | Claim | **CPT** codes |
| wRVU per procedure | CMS RVU file | Work RVU assigned to each CPT (annual CMS PFS) |
| $ per wRVU anchor | CMS conversion factor | $33.40 (CY2026 non-QP) |
| Findings / negative-read / follow-ups | Reporting | NLP over PowerScribe text (e.g. mPower) |
| Exam-complete / report-signed timestamps | RIS / PACS / worklist | Operational timestamps; turnaround is a standard quality metric |

**Q. What's the grain, and can we audit it?** One row per ER-originated professional service — claim-line per exam, keyed on accession \+ CPT. Every total drills back to its claim rows; Σ collections ties to your financials for the same period and segment; the wRVU map cites the CMS PFS version it used; payment-maturity is handled (pending isn't booked as denied). One clarification a CIO will want: that drill-to-source runs **inside the BAA-covered environment, against the source rows** — the snapshot we surface is the aggregate result, which carries no PHI. The audit trail and the shippable deliverable are two different artifacts in two different places. It's built as a saved, re-runnable measure — not a one-time dump — because the contract it supports trues up each period, so the math has to be the same and provable every time.

**Q. "ER origin" — how is that identified without guessing?** **Place of Service (POS 23\)** on the professional claim marks ER origin (reflects where the patient was treated, not where the study was read). Finer cuts — a specific campus, pediatric- vs adult-ED — use the service-facility NPI on the claim or the RIS order's facility field. POS-level is the default; we only join the RIS field if you need a cut below POS.

---

## Security, PHI, and the wall

**Q. What about HIPAA and PHI?** There's a hard wall. The public demo is **PHI-free**, so it needs **no BAA**. The moment the engine runs on real records, that work happens **behind a signed BAA** (Business Associate Agreement — the HIPAA contract that puts an outside party legally on the hook to protect patient data). The clean sentence: *the demo carries no patient data; the real data only moves under a BAA.*

**Q. Can it run without identified patient data at all?** Yes — it can run on a **de-identified or limited-data-set** extract, and the build proceeds on synthetic data until any compliance gate clears. Critically, the **output is aggregate** — the snapshot is bucketed totals, not patient records — so PHI doesn't live in the deliverable.

**Q. Where does our data live, and how long?** It runs over a fixed pull and emits an aggregate snapshot; it isn't a standing live connection and isn't a long-term store of your records. Acquisition and residency are set per your environment under the BAA — including running inside your own stack where you prefer.

---

## Deploying it — what it asks of your team

**Q. How do you figure out our specific path?** A short, bounded questionnaire your admin can answer from a fixed set of choices — no insider knowledge required. The *output* is invariant (every deployment yields the same panels and the same two numbers); only the *path* varies with what you already run. Representative questions: who runs professional-fee billing (in-house / RCM vendor / hospital-billed); is a claim-level 837/835 extract self-serve, by vendor request, or blocked; is mPower licensed; does PACS export timestamps; do you have a warehouse / BI tool / analyst; is a vendor BAA process in place; is a de-identified extract OK.

**Q. What's the actual lift, realistically?** It scales down with what you have. Three tiers:

- *Self-serve export* (you can pull claim lines yourself) → a scheduled CSV/SFTP pull; fastest.  
- *Vendor request* (your RCM vendor pulls the standard 837/835 feed or opens an API) → same result, a little lead time.  
- *Hospital-billed* → needs a data-sharing agreement first; that panel waits while the rest proceeds.

If you already run a warehouse \+ BI \+ an analyst, we model in your existing stack — the thinnest possible build. If you have nothing, it's still a small footprint (a light warehouse like DuckDB/BigQuery feeding your BI).

**Q. Do we depend on you forever?** No. It's flat code on data you own, sitting between systems you already run — portable and legible by design, not a black box you're locked into.

---

## Boundaries — what it is *not*

It is not real-time, not a clinical decision-support tool, not a replacement for your BI, and not a system of record. It does not set the fair-market figures — comp-per-wRVU and overhead are the **valuator's** binding numbers; the engine only sizes the gap honestly (work × the CMS rate vs. what actually collected). And where a number is still modeled rather than measured (e.g. a timestamp feed not yet wired), it's labeled as an assumption in plain sight — it tightens to an actual the moment its source comes online.

---

## One honest flag

The *machinery* here — the acronyms, the pipeline, the join — is stable and safe to commit to. The two things that drift yearly are the **conversion factor** and the **specific wRVU weightings** (CMS re-weights both; the CF and the per-code work value can move in opposite directions, which is why a headline "rate went up" can still mean less per read). When a particular dollar value is cited, verify it fresh against the current CMS file. The table changes; the engine doesn't.

---

*Companion reading: `data-provenance-and-why-not-vendor-BI.md` (full source citations / endnotes), `getting-the-two-numbers.md` (the do-it-without-IT extraction spec), `bi-tool-audit-matrix.md` (your stack vs. the two numbers, tool by tool).*  
