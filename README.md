# The Bridge

**Live:** https://mdmd.dev

**Independent economic record for physician groups — work to claim to payment to cash.**

The Bridge reconstructs the path from physician work to claim, payer
adjudication, payment and bank cash — with every material figure traceable to
its source. `mdmd.dev` is the address; the product is The Bridge.

A physician group performs the work, but the economic record of that work is
fragmented across clinical, billing, clearinghouse, payer, posting and banking
systems. The group eventually receives a report and a bottom-line number, and
cannot independently reconstruct what happened in the middle.

The Bridge builds the other copy: the group's own record, from its own exports,
reconstructed on a machine the group controls.

```text
WORK → CLAIM → ADJUDICATION → PAYMENT → POSTING → BANK CASH
```

## Doctrine

- **Unknown is not zero.** A claim with no remittance in the record is an open
  question, not a settled loss.
- **Every figure carries its provenance:** `RECORD`, `RECORD-DERIVED`,
  `COUNTERFACTUAL`, `MODEL-DERIVED`, `GAP`, `CONTRADICTION`.
- **No swallow.** Partitions are cent-exact; nothing is absorbed into a residual.
- **Contradictions are displayed, not resolved by preference.**
- **Every gap names the source that would close it.**

## Surfaces

| Route | What it does |
| --- | --- |
| [`/record`](https://mdmd.dev/record) | The work-to-cash chain, handoff by handoff, with a row-level gap register |
| `/economics` | What the work actually yielded, sliced and drillable to source rows |
| `/method` | How a figure earns its label |
| `/intake` | Staged source intake, custody hashing, readiness and pilot-preparation export |

## How it runs

TanStack Start + React 19 + Vite, with Postgres (PGlite) compiled into the
browser tab. Demonstration files are parsed and queried locally and disappear on
reload — no account, no server upload. All demonstration data is fully
synthetic; there are no patient records in this repository.

## Development

```bash
bun install
bun run dev
bunx vitest run
```

## Legacy

Earlier radiology-specific material (stipend framing, the former extractor demo)
is retained under `/legacy/*` and in `docs/` as **history only**. It does not
describe the current product.
