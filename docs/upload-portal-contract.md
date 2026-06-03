# Upload portal — CSV contract

The hosted `/harness` page accepts CSV exports dropped into the upload
portal. This document is the column-level contract: what each file must
contain for the portal to load it, and what extra columns are dropped
silently.

The portal is **session-only**. Files never leave the browser tab. Reload
clears every upload. The hosted page is structurally incapable of
retaining anything. If you need to load real 835/837/RIS, fork the
project and run it on your own hardware — that conversation includes
BAA, encryption at rest, and access logging, and is deliberately separate
from this page.

## Common rules

- One CSV per file. First row is the header.
- Column names are case-insensitive. Underscores and hyphens are equivalent.
- Extra columns are dropped silently. Required columns missing = block.
- Dates accept `YYYY-MM-DD` or `MM/DD/YYYY`. Timestamps accept anything
  `new Date(string)` parses.
- Booleans accept `true|false|t|f|1|0|yes|no|y|n`.
- Numbers may include `$` and `,`; both are stripped.

The portal infers the export type from header signature first, filename
second. Filenames in `billing_export.csv`, `era.csv`, `ris.csv`,
`bank.csv`, `ref_*.csv` form are convenient but not required.

---

## 1. Billing export → `stg.claim_837`

The 837-equivalent dump from your billing system. One row per service line.

| Column          | Type    | Required | Aliases                                         |
| --------------- | ------- | -------- | ----------------------------------------------- |
| `claim_id`      | text    | yes      | —                                               |
| `line_number`   | int     | yes      | `line`, `line_no`, `svc_line`                   |
| `accession`     | text    | no       | `accession_number`, `ris_accession`             |
| `patient_token` | text    | no       | `patient_id_token`, `deid_patient_id`           |
| `dos`           | date    | yes      | `date_of_service`, `service_date`               |
| `pos_code`      | text    | yes      | `place_of_service`, `pos`                       |
| `facility_id`   | text    | no       | `facility`, `service_facility`                  |
| `rendering_npi` | text    | no       | `npi`, `rendering_provider_npi`                 |
| `cpt_code`      | text    | yes      | `cpt`, `procedure_code`, `hcpcs`                |
| `modifiers`     | text    | no       | `modifier`, `mods`                              |
| `units`         | numeric | no       | —                                               |
| `charge_amount` | numeric | yes      | `charge`, `billed_amount`                       |
| `payer_id`      | text    | no       | `payer`, `insurance_id`                         |

## 2. ERA → `stg.remit_835`

The 835 remittance feed. One row per service-line remit.

| Column            | Type      | Required | Aliases                                          |
| ----------------- | --------- | -------- | ------------------------------------------------ |
| `claim_id`        | text      | yes      | —                                                |
| `line_number`     | int       | yes      | `line`, `svc_line`                               |
| `cpt_code`        | text      | no       | `cpt`, `procedure_code`                          |
| `charge_amount`   | numeric   | no       | `charge`, `billed_amount`                        |
| `allowed_amount`  | numeric   | no       | `allowed`                                        |
| `paid_amount`     | numeric   | yes      | `paid`                                           |
| `patient_resp`    | numeric   | no       | `patient_responsibility`                         |
| `adj_group_code`  | text      | no       | `group_code`                                     |
| `carc_codes`      | text      | no       | `carc`, `adjustment_codes`                       |
| `rarc_codes`      | text      | no       | `rarc`, `remark_codes`                           |
| `check_eft_trace` | text      | yes      | `eft_trace`, `trace_number`, `check_number`      |
| `payment_date`    | date      | no       | `paid_date`                                      |
| `payer_id`        | text      | no       | `payer`                                          |
| `posted_at`       | timestamp | no       | `posted`, `post_date`                            |

## 3. RIS exam → `stg.ris_exam`

The exam-level RIS productivity export. One row per accession.

| Column              | Type      | Required | Aliases                            |
| ------------------- | --------- | -------- | ---------------------------------- |
| `accession`         | text      | yes      | `accession_number`                 |
| `dos`               | date      | yes      | `date_of_service`, `exam_date`     |
| `exam_cpt`          | text      | no       | `cpt`, `cpt_code`, `procedure_code`|
| `modality`          | text      | no       | —                                  |
| `ordering_location` | text      | no       | `order_location`                   |
| `pos_code`          | text      | no       | `place_of_service`, `pos`          |
| `facility_id`       | text      | no       | `facility`                         |
| `rendering_npi`     | text      | no       | `npi`                              |
| `finalized_at`      | timestamp | no       | `finalized`, `final_date`          |

## 4. Bank statement → `recon.bank_deposit`

Deposit-level rows from the bank statement.

| Column         | Type    | Required | Aliases                          |
| -------------- | ------- | -------- | -------------------------------- |
| `deposit_date` | date    | yes      | `date`, `posted_date`            |
| `eft_trace`    | text    | yes      | `trace`, `trace_number`, `check_number` |
| `amount`       | numeric | yes      | `deposit_amount`                 |

## 5. MPFS reference → `ref.mpfs_wrvu`

Per-year work-RVU table.

| Column              | Type    | Required | Aliases  |
| ------------------- | ------- | -------- | -------- |
| `cpt_code`          | text    | yes      | `cpt`    |
| `service_year`      | int     | yes      | `year`   |
| `work_rvu`          | numeric | yes      | `wrvu`   |
| `conversion_factor` | numeric | no       | `cf`     |

## 6. Payer / facility / provider reference

Small dimension tables. Same drop-into-portal flow.

`ref_payer.csv` → `ref.payer` — `payer_id` (req), `payer_name`, `financial_class`.
`ref_facility.csv` → `ref.facility` — `facility_id` (req), `facility_name`, `is_er_site`.
`ref_provider.csv` → `ref.provider` — `rendering_npi` (req), `provider_name`, `subspecialty`.

---

## What happens on load

1. Drop one or more CSVs. The portal stages each (parse, type-coerce,
   detect type, list dropped/missing columns).
2. If any file is missing a required column, the load is blocked. Fix the
   export and drop again.
3. Click **Replace with upload**. The portal recreates a fresh PGlite
   instance from the canonical SQL (schema + views, no synthetic seed) and
   chunked-inserts your rows. Progress shows row counts per file.
4. The five recon panels re-query against the new dataset. The
   **Ingestion integrity** panel surfaces content-level gaps — month
   coverage, MPFS rate coverage, FK closure between 837 ↔ 835 ↔ bank.

## Round-trip

**Download current set** dumps the currently loaded tables to a zip of
CSVs in this exact contract. Use it to hand a synthetic dataset to a
compliance reviewer, or to seed a fork.
