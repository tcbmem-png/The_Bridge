<!-- Rename to README.md at the repo root. -->
# The Bridge

The Bridge joins three data feeds a radiology group already owns — billing, reports, and the worklist — into one checkable picture of what emergency-department coverage actually costs, sized as an input to a fair-market-value conversation.

> **Not legal, financial, or valuation advice. Illustrative defaults — replace with your own.**
> The binding fair-market figures belong to an independent valuator; the legal structure belongs to your counsel. This repository is a transparent **reference implementation**, provided as-is. It contains **no patient data**.

## What it is — and isn't

- **Flat, deterministic code.** No model reasons about a patient; there is no black box. Every figure drills back to its source rows, and total collections reconcile to the financials before anything is trusted. If it doesn't reconcile, the extract is wrong and it gets fixed before anyone relies on it.
- **It sizes a gap** — the work a group does covering the ED, valued at the public CMS rate, against what that work actually collected. It does **not** set fair-market value, and it is **not** the arrangement. It's the evidence that sits under a valuation.
- It is **not** real-time, **not** clinical decision support, **not** a system of record, and **not** a replacement for your BI.

## What's in here

- the engine / calculator (the two-numbers model and the volume study)
- the audit harness (SQL) — joins billing / remittance / worklist, reconciles to cash and to volume, and drills every total back to source
- a synthetic 36-month sample — **MOCK RAD GROUP** — shaped like real source exports, with no patient data
- the site copy

## Run it

Clone it, drop the synthetic sample, and watch the reconciliations tie to the dollar — cash against the bank, volume against the worklist, every total back to its source rows. Read the SQL; it's legible by design. Then see how little stands between the sample and your own data: swap the sample files for your exports against the documented contract (`docs/upload-portal-contract.md`) and the same panels recompute. Session-only in the browser — nothing is stored, nothing leaves.

## Data, PHI, and the wall

The demo and the sample are **PHI-free**, so no Business Associate Agreement (BAA) is needed to evaluate them. Real records move only behind a signed BAA, into a controlled environment, with patient identifiers scrubbed before they leave the building — and the output is aggregate, so protected health information never lives in the deliverable.

## The moat is not the code

Open by design. A clone gives no one your numbers: only a group can compute its own *professional* collections — the hospital structurally can't see them. You aren't locked into anyone; the value is the judgment around the engine, not the engine. That's why it's safe to make public.

## One honest flag

The machinery is stable. What moves is the CMS file underneath it — the conversion factor and the per-code work values are re-issued annually and can move in opposite directions, so a headline "rate went up" can still mean less per read. Verify any cited dollar value against the current CMS Physician Fee Schedule. The table changes; the engine doesn't.

## License

[Apache License 2.0](LICENSE) — see also [`NOTICE`](NOTICE). Permissive by intent: use it, fork it, run it, no strings, no lock-in.

## Contributions

Published as a reference implementation. Provided as-is; issues and pull requests aren't actively solicited. If you build something useful on it, good — that's the point.
