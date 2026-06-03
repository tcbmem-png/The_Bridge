# Calculator handoff contract

The audit harness (`/harness`) and the partner-facing calculator (`/stipend`)
are deliberately decoupled. The harness can grow without touching the
calculator, and the calculator stays client-side.

## The contract

The calculator's audited (left) path reads exactly four columns from one
mature row of `core.er_yield_period`:

| Column          | Meaning                                  |
| --------------- | ---------------------------------------- |
| `er_yield`      | ER $ per wRVU for the period (Y_er)      |
| `non_er_yield`  | Non-ER $ per wRVU for the period (Y_ne)  |
| `er_wrvu`       | ER wRVU for the period (W_er)            |
| `non_er_wrvu`   | Non-ER wRVU for the period (W_ne)        |

The chosen row must satisfy `is_mature = TRUE`, which the harness derives
from `ref.harness_config.runout_days` (default 120). Immature months do
not quote a yield.

Nothing else crosses. Patient-level rows, raw 837/835 lines, EFT traces,
source-file SHA-256s — all stay inside the harness.

## Current status

Not wired. This build ships the contract on the harness page and in this
document. Wiring the calculator's left path to consume these columns is a
later, separate decision that comes after the BAA / real-ingestion call.
