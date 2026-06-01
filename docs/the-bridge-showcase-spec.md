# The Bridge — Showcase & Treatment Layer
### The ★ lost-study panel · the Sandbox leak→residual toggle · the Act 3 "what becomes possible" beat
*Self-contained deferred increment — upload as one file. Builds on the already-proven engine, money model, and dashboard. Authored to be implemented verbatim (render-don't-author), so it can be built async without clarification. Companion to `dashboard-panel-spec.md`, `native-numbers-spec.md`, and `from-diagnosis-to-dollars.md`.*

---

## Why this layer
The three views prove the diagnosis. This layer is the **treatment** — the part that answers "so what do we actually DO with it." It's the most persuasive material in the product, which is why it's built deliberately as its own pass rather than batched into the dashboard.

**Posture (hold this the whole way):** this is the buyer completing a picture and seeing what becomes possible — *opportunity, not a to-do list, and never "here's what you've been doing wrong."* No accuse-then-absolve. The data surfaces possibilities; the moves are theirs.

Build order: §1 (panel) → §2 (toggle) → §3 (beat). The first two are mechanics; the third is mostly copy and slots over them.

---

## §1 — The ★ lost-study reconciliation panel (the showcase)
The clearest proof of the harness: studies read but never billed, visible only when two silos are joined.

- **What it is:** completed reads (worklist) − billed reads (billing) = reads performed with no professional charge ever dropped. Pure found money, ~100% margin (the work is already done).
- **Native unit:** count of unbilled reads **and** dollars.
- **Valuation (reads the shared money module — single source of truth):**
  `lost_study_$ = lost_study_count × avg_wRVU_per_read × blended_$ per wRVU`
  Use the same `blended_$ per wRVU` the Sandbox/dashboard already compute ($38.96 at current defaults). Illustrative default `lost_study_count` ≈ a small % of coverage volume (label it replaceable; e.g., 0.5–1.5% of reads slip — the group's reconciliation reveals the real figure).
- **The two-domain gate (its superpower):** this panel is `live` only when **billing AND worklist are both live** (plus compliance). With one source live and the other not, it stays `pending` with the note *"needs your second source"* — naming which one. That gating is the demo: answer enough to light billing → the panel stays dark ("still needs worklist") → light worklist → it resolves into found money. It dramatizes, on screen, that no single vendor can produce this number.
- **States/visuals:** same four-state mapping as `dashboard-panel-spec.md` §3. Its distinctive state is the half-gated one ("one of two sources live").
- **Provenance:** [^p1] (billing) + [^p7] (worklist) — render both, since the join is the point.
- **Placement:** add to the dashboard's panel set as panel ★ (9th). It reads engine `domainReadiness` like the others — it just requires two domains instead of one. Do not hardcode it live.

---

## §2 — The Sandbox leak→residual toggle
Turns the thermometer into a treatment: plug a leak, watch it land in the bonus pool.

- **The residual mechanic (the insight, pinned):** the partner bonus is a **residual** — what's left of collections after fixed costs. Because the cost base is fixed, recovered dollars are **near-pure margin**, so they flow almost entirely to the residual. Model it as:
  `residual_delta ≈ recovered_$`  *(near-pure margin; show the "fixed cost base → ~100% to residual" note in the math drawer)*
  Display `residual_delta` in **dollars and wRVUs**, beside the existing pockets. This is the line they feel.
- **Levers (illustrative, native, each labeled replaceable — keep distinct, do not conflate):**
  - **Bill the lost studies:** `recovered_$ = lost_study_count × avg_wRVU × blended_$/wRVU` (ties to §1).
  - **Recover commercial underpayments:** `recovered_$ = commercial_underpayment_$ × recovery_rate`. *This is payers paying below contracted rate — NOT the Medicaid-vs-Medicare gap. The Medicaid shortfall (`underpay_shortfall`) is a structural rate, not recoverable here; it belongs to the stipend argument in §3.*
  - **Fix the top denial pattern:** `recovered_$ = preventable_denial_$ × fix_rate`.
  - Optional aggregate lever: "recover X% of collections" → `recovered_$ = X% × total_collections`.
- **Reads the shared money module.** Every figure traces to a block they recognize; the math drawer exposes it; all illustrative-stamped.
- **Keep it modest.** Two or three clean levers, not a control board. The point is the residual line moving, not a simulator.

---

## §3 — The Act 3 "what becomes possible" beat
A short beat in the Story's Solution act: the join surfaces moves; the do-first ones fund the structural one.

- **Structure (the 2×2 from `from-diagnosis-to-dollars.md`):** the do-first quadrant — found studies, commercial underpayments, the top denial pattern, the pre-read indication flag — are fast, low-effort, recovered with a report and a workflow tweak. They build the credibility and cash to win the structural lever: getting paid for mandated coverage (the stipend). Name the move-*types* as possibilities; don't prescribe.
- **The punchline (connect intelligence → money):** because recovered dollars are near-pure margin, they land in the bonus pool — the number a partner feels. That's the bridge from "seeing" to "earning."
- **Posture guardrails (this is where the preachy risk lives — keep it clean):**
  - Frame as *what the join lets you do*, not *what you've been missing*.
  - Buyer is the hero completing the picture; the harness just made it visible.
  - The moves are theirs to choose — these are hypotheses the data tests, not instructions.
  - Avoid the koan register here; plain and concrete beats precious for this audience.
- **Draft copy (provisional — final wording is a last-round craft pass; included so the architect can build the slots):**
  - Heading: *"Once you can see it, here's what opens up."*
  - Lead: *"None of this needs new systems or AI. It needs the join — and the join is cheap."*
  - Three move cards (possibility-framed): *Found studies* · *Underpayments caught* · *The denial pattern, fixed.* Each one line, each ending in the recovered dollars landing in the pool.
  - Close into the structural lever: *"And the biggest one isn't a leak — it's getting paid for the coverage you're already required to provide."*
  - Keep these as placeholders; the tone pass tightens them.

---

## §4 — Guardrails (same as the rest)
- **Render, don't author.** The panel reads engine `domainReadiness`; the toggle and residual read the shared `useMoney()` store. No new logic invented in the view.
- **Single source of truth.** ★ and the toggle use the same `blended_$/wRVU` and money blocks as the Sandbox/dashboard — match to the dollar.
- **Illustrative.** Every figure stamped; "found money" is a sample illustration, not a claim about their books.
- **Native units.** Count, $, wRVUs — no abstract indices.
- **Posture.** Opportunity, not accusation; buyer-as-hero; moves are theirs. Draft copy is provisional for the last-round tone pass.
- **Ambiguity → this file**, not a builder choice. (E.g., if `lost_study_count` default needs a basis, set it here, with Taylor.)

*Provenance endnotes [^p1]/[^p7] are defined in `data-provenance-and-why-not-vendor-BI.md`.*
