# Dashboard Panel Spec — render engine truth, don't author it
### The canonical panels, their native units, what flips them, and how each state looks
*Companion to `engine-decision-logic.md` (readiness states) and `native-numbers-spec.md` (the money model). The dashboard is a faithful renderer of what the engine emits and what the shared money module computes — it invents no panels, no flip-rules, and no numbers. Embeds in Story Act 2.*

---

## §1 — Principles
1. **Panel-level flips.** A whole panel flips assumed→actual when its domain is ready. The engine computes readiness at the panel/source level; the dashboard reads that, it does not compute a finer granularity the engine doesn't track.
2. **Render engine state, don't author it.** Each panel's state comes from the engine (`live` / `assumed` / `pending_source` / `pending_compliance`). The dashboard maps state→visual; it never decides readiness itself.
3. **Single source of truth.** Money-model panels read the shared compute module — a number here must equal the Sandbox and the Story win-row to the dollar.
4. **Illustrative.** Every value is sample data. "ACTUAL" is a visual state meaning *wired to your source*, not a claim of real PHI. The demo's "actual" values are still illustrative.
5. **Credit-forward.** The readiness summary is "foundation already in place," rising as sources confirm — never a deficit count.

---

## §2 — The canonical panels (8 + 1 showcase)
Each panel = native unit · formula/source · domain + the engine readiness flag that gates it · reads shared money module? · provenance endnote. Six are billing-dependent (the hospital-billed cascade hits all six).

| # | Panel | Native unit | Formula / source of truth | Domain · gated by | Shared module | Cite |
|---|---|---|---|---|---|---|
| 1 | Net collection rate | % | collections ÷ allowed | Billing · `rcm_owner` + compliance | — | [^p1] |
| 2 | Net revenue per wRVU | $/wRVU | collections ÷ total_wRVU | Billing · `rcm_owner` + compliance | ✓ | [^p1][^p5] |
| 3 | Payer mix | % shares | claims by payer | Billing · `rcm_owner` + compliance | ✓ | [^p1] |
| 4 | Coverage gap vs Medicare | wRVU + $ | `no_pay` + `underpay_shortfall` (money model) | Billing · `rcm_owner` + compliance | ✓ | [^p1][^p5] |
| 5 | Denials (rate + top reasons) | % by CARC | denied ÷ submitted, by reason | Billing · `rcm_owner` + compliance | — | [^p2] |
| 6 | Days in A/R | days | AR balance ÷ avg daily charges | Billing · `rcm_owner` + compliance | — | [^p1] |
| 7 | Negative-read rate (by indication; "fall") | % | clean reads ÷ reads, by indication | Reporting · `reporting_platform`/`mpower` + compliance | — | [^p6] |
| 8 | Turnaround time | minutes | report_signed − exam_complete | Worklist · `pacs_timestamps` + compliance | — | [^p7] |
| ★ | Lost-study reconciliation *(showcase, optional)* | count + $ | completed reads (worklist) − billed reads (billing) | **Billing AND worklist** both live + compliance | ✓ | [^p1][^p7] |

The ★ panel is the clearest proof of the harness: it lights up only when *two* domains are live, because it's the join no single vendor can produce. Add it when copy is refined (it's the visual of "found money the silos can't see").

---

## §3 — State → visual (the four states the engine emits)
| State | Meaning | Visual |
|---|---|---|
| `live` (actual) | wired to the group's source (illustrative in demo) | teal, solid, **ACTUAL** tag, value + source cited |
| `assumed` | running on a benchmark default | dashed border, muted, **ASSUMED · benchmark** tag, value + source + "replace with your data" |
| `pending_source` | source not yet reachable (e.g., hospital-billed → DUA) | gated/greyed, **PENDING — needs [source/DUA]**, shows what unlocks it |
| `pending_compliance` | source easy, but no BAA / de-id not cleared | gated, **PENDING — needs BAA/review**, compliance trumps |

Keep the palette consistent with the Sandbox and demo (teal = actual, dashed = assumed, clinical-red = gated).

---

## §4 — The flip rule (= engine readiness; do not re-derive)
A panel is `live` only when **`source_ready` AND `compliance_cleared`** for its domain. Compliance trumps: an easy source with no BAA is `pending_compliance`, never `live` (`source_ready` and `data_live` are distinct — per the engine spec). The hospital-billed cascade: `rcm_owner = hospital_billed` sets panels 1–6 to `pending_source` (DUA) at once. The dashboard reads these states from the engine output; it never recomputes them.

---

## §5 — The foundation meter (credit-forward readiness)
A summary strip: **"X of 8 panels wired from data you already own"**, rising as sources confirm — the same "foundation already in place" framing as the questionnaire. Never render it as "X missing." When a panel flips to teal, that's the buyer's investment paying off, not a gap closing.

---

## §6 — Act 2 embedding
One component, two placements. Standalone (Under the Hood / its own view) it's interactive — panels flip as the questionnaire is answered. Embedded in Story Act 2 it's the same component in a representative state, framed by the narrative beat ("you're already generating all of this"). Build it once; place it twice. No divergent second dashboard.

---

## §7 — Guardrails
- **Single source of truth:** panels 2, 3, 4 (and ★) pull from the shared money module — identical to the Sandbox. A discrepancy between the dashboard and the Sandbox is a bug.
- **Illustrative everywhere:** stamp it; "ACTUAL" ≠ real data.
- **Native units only:** %, $/wRVU, wRVU, minutes, days, count — no abstract indices.
- **Render, don't author:** the dashboard implements this list and the engine's states verbatim. Any panel, unit, or flip-rule not specified here is a change to *this file* with Taylor — not a builder choice.

*Authoritative for the dashboard. Provenance endnotes [^p1]–[^p7] are defined in `data-provenance-and-why-not-vendor-BI.md`; render them on-page as in Under the Hood.*
