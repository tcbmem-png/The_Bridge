# MOCK RAD GROUP — synthetic ingestion package (DEMO ONLY)

**Fully fabricated. No PHI. Not for clinical or financial use.** Every patient name, MRN, DOB, NPI, TIN, payer ID, and dollar figure is invented. Generated to exercise the ER Stipend Audit Harness end-to-end on realistically messy source data. Each file carries a `_mock_label = MOCK_RAD_GROUP_DEMO_ONLY` column (itself an excludable field).

"MOCK RAD GROUP" is a **sampled extract** — ~140 studies/month across 4 sites and ~20 reading radiologists, deliberately sampled so the files stay openable. **Per-line economics are realistic** (charges, allowed, paid, payer mix, wRVU); the **absolute monthly volume is a sample**, not a full-practice month. The point is to test the *shape, the joins, and the reconciliation* — not production throughput. Bank activity (a ~70% cash sweep to operating, fees, interest) is scaled to the sampled deposits so the account reconciles internally.

## Files & the systems they emulate

| File | Emulates | Rows | Harness uses | Carried but excludable (the realistic noise) |
|---|---|---|---|---|
| `MOCK_RAD_GROUP_837_billing_export.csv` | Billing/PM charge export (Zotec/Optum-style flat extract of the 837P) | 4,910 | claim_id, claim_line, accession, patient_token, dos, place_of_service, facility_code, rendering_npi, cpt_code, modifier1/2, units, charge_amount, payer_id | patient_last/first/dob/mrn, referring_npi/provider, icd10_primary/secondary, billing_tin, payer_name, financial_class, claim_status, statement_date, batch_id |
| `MOCK_RAD_GROUP_835_remittance_export.csv` | ERA / remittance posting detail (835) | 4,491 | claim_id, claim_line, cpt_code, billed_amount, allowed_amount, paid_amount, patient_resp, adj_group_code, carc_code, rarc_code, check_eft_trace, payment_date, payer_id, posted_at | payment_method, payer_name, patient_mrn, deductible, coinsurance, copay, prov_adj_amount, crossover_flag, era_id |
| `MOCK_RAD_GROUP_RIS_exam_export.csv` | RIS/PACS productivity export | 5,055 | accession, dos, cpt_code, modality, ordering_location, pos_code, site_code (→facility), reading_radiologist_npi, finalized_dt | mrn, patient_name, ordered/scheduled/begin/complete dt, exam_code/description, body_part, priority, patient_class, scanner_id, technologist, report_status, addendum_flag |
| `MOCK_RAD_GROUP_bank_statement.csv` | Operating-account bank export | 2,950 | post_date, amount, eft_trace (payer CREDIT rows only) | description, transaction_type, value_date, running_balance, bank_reference — **and 110 non-deposit rows** (account fees, transfers to operating, interest, returned items) that must be filtered out |
| `MOCK_PUBLIC_MPFS_reference.csv` | Public CMS MPFS schedule (NOT from MSIT) | 124 | cpt_code, service_year, work_rvu | conversion_factor, source_note |
| `MOCK_RAD_GROUP_ref_facility.csv` | Facility dimension | 4 | facility_id, is_er_site | facility_name, pos_default |
| `MOCK_RAD_GROUP_ref_payer.csv` | Payer dimension | 6 | payer_id, financial_class | payer_name |
| `MOCK_RAD_GROUP_ref_provider.csv` | Provider dimension | ~20 | rendering_npi | provider_name, subspecialty |

Load the four `ref_*` / MPFS files into the harness `ref.*` tables (replacing the tiny built-in demo seed); `ref.pos_code` is standard and already seeded. The harness `raw/stg/core/recon` layers are unchanged.

## Intentional test features (what each one proves)

- **Excludable columns everywhere** — every export is a superset of what the harness needs. Proves the ETL selects, not slurps.
- **Dirty place-of-service (163 ER lines)** — ~12% of ER studies have blank or `22` POS, but sit at the ER site and carry `patient_class = ER` / `ordering_location = EMERGENCY DEPT`. Proves the **POS-23 + facility/site fallback** ER attribution.
- **Denials (~5.7%)** — `$0` paid with CO-50 / CO-97 / CO-16 / PR-1 + CARC/RARC. Proves billed-but-unpaid handling drags yield correctly.
- **Lost charges (145)** — RIS exams with **no matching 837**. Proves `recon.volume_tieout` surfaces the unbilled gap (lost wRVU/$).
- **Payer-mix-driven ER loss** — ER skews Medicaid/self-pay, non-ER skews commercial. Yield emerges from the mix, not a hard-code.
- **CF-cut yield trend** — collections scaled by year (2023 +, 2024 flat, 2025 −2.83%, 2026 −2%) so a downward yield drift is visible across the 36 months.
- **DOS-accurate wRVU revaluation** — MPFS work RVUs drop ~2.5% in 2026 (efficiency adjustment). A 2024 CT must read at its 2024 wRVU even when re-aggregated now. Proves the service-year join.
- **Immature recent months** — DOS in the last ~5 months (2026-02 … 2026-06) is only partially collected (A/R not run out), so raw yield looks artificially low. Proves the **runout/maturity guard** (`is_mature = FALSE`).
- **Clean cash tie-out + bank noise** — payer EFT deposits equal the 835 batch sums to the cent; 110 non-deposit rows must be excluded. Proves `recon.cash_tieout` ties to zero against an independent control.

## Expected aggregates (validate the harness against these)

- Studies **5,055** across **36** months; ER share of studies **26.5%**, of wRVU **24.2%** (ER skews lower-wRVU).
- **Mature-period yield: ER ≈ $26.87/wRVU · non-ER ≈ $59.83/wRVU** (~2.2× gap — the loss thesis, emergent).
- Denial rate **5.7%**; unbilled gap **145**; dirty-POS ER lines **163**.
- Immature months: **2026-02, 2026-03, 2026-04, 2026-05, 2026-06**.
- `recon.cash_tieout` → **0 breaks**; bank noise rows excluded: **110**.

## Known modeling choice

`paid_amount` is the **insurer** payment from the 835. Patient self-pay collections post through a separate patient-pay stream and are largely uncollected in the ER — which is *why* ER yield is low. So harness yield = insurer collections ÷ wRVU (conservative, documentable). If you later want total-collections yield, add the patient-pay posting as a fifth source; the contract to the calculator is unaffected.
