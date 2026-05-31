# Engine Decision Logic — the intelligence, pinned
### How questionnaire answers combine into a build spec
*This is the source of truth for the "smart part." Lovable implements `generateSpec(answers)` exactly as written below. It does not infer, improve, or fill gaps with judgment. If anything here is ambiguous, the builder stops and asks — it never guesses.*

---

## 0. Principle
`generateSpec(answers) → spec` is a **pure, deterministic function.** Same answers in, same spec out, every time. No LLM call, no inference, no creativity. The intelligence is the ruleset here; Lovable's job is to render it faithfully and verify against the test cases in Section 8. The crux is not what any single answer means — it's how answers **combine** (Section 3). That combinational layer is where almost all the value and almost all the risk of getting-it-wrong live, so it's specified explicitly.

---

## 1. The answer vector (inputs)
Every variable, every allowed choice. Nothing else is a valid input.

| Key | Variable | Allowed choices |
|---|---|---|
| `rcm_owner` | Who runs pro-fee billing | `in_house` · `vendor` · `hospital_billed` |
| `rcm_history` | Claim history depth | `24_36mo` · `12mo` · `lt_12mo` |
| `reporting` | Reporting platform | `ps_one` · `ps_360` · `other` |
| `mpower` | mPower analytics | `used` · `unused` · `no` |
| `read_loc` | Where they read | `hospital_epic` · `own_ris` · `both` |
| `pacs_ts` | PACS timestamp export | `yes` · `no` |
| `bi_tool` | Existing BI | `power_bi` · `tableau` · `none` |
| `warehouse` | Data warehouse | `yes` · `no` |
| `analyst` | Analyst on staff/contract | `yes` · `no` |
| `baa` | Vendor BAA process | `yes` · `no` |
| `deid_ok` | OK with de-identified extract | `yes` · `needs_review` |

Any key may be `unknown` (unanswered). Handling: Section 6.

## 2. The spec object (output)
`generateSpec` returns this shape. Worked examples in Section 8 fill it in.
```
spec = {
  sources:        [ {name, route, accessNeeded, lead} ],   // per §3.1
  storageTier:    {tier, description, effortNote},          // per §3.2
  schemaInvariant:{factGrain, dimensions},                 // constant, §4
  metricsInvariant:[...],                                   // constant, §4
  panels:         [ {name, status, needs[]} ],             // per §3.3 (status: live | pending_source | pending_compliance)
  compliance:     {cleared:bool, gates[]},                 // per §3.4
  permissionsAPIs:[...],                                    // union of source accessNeeded + gates
  sequence:       [...steps...],                            // per §3.6
  timelineBand:   "...",                                    // per §3.6
  flags:          [...]                                     // per §5
}
```

---

## 3. THE COMBINATION RULES (the intelligence)
Single answers carry meaning, but the spec emerges from these joint functions. Implement each literally.

### 3.1 Source acquisition — `rcm_owner`, `reporting`+`mpower`, `pacs_ts`
**Billing source** = f(`rcm_owner`):
| `rcm_owner` | route | accessNeeded | lead | billing_ready |
|---|---|---|---|---|
| `in_house` | Scheduled CSV/SFTP export from PM system | DB/export access + SFTP creds | short | true |
| `vendor` | Request standard 837/835 feed or vendor API | Vendor API key+scope or feed setup | medium | true |
| `hospital_billed` | **Data-sharing agreement / DUA required — group may not hold the data** | DUA + hospital data feed | gate (long, uncertain) | **false until DUA** |

**Reporting source** = f(`mpower`, `reporting`) — *joint; mpower dominates*:
| condition | route | clinical_source_ready |
|---|---|---|
| `mpower=used` | mPower export/API | true |
| `mpower=unused` | mPower export/API **after enable/configure step** | true (+small lead) |
| `mpower=no` AND `reporting∈{ps_one,ps_360}` | Report-text extract + light NLP | true (with build effort) |
| `mpower=no` AND `reporting=other` | Flat-file extract + NLP if available, else manual sample | **false** (assumption-first) |

**Turnaround source** = f(`pacs_ts`):
| `pacs_ts` | route | tat_source_ready |
|---|---|---|
| `yes` | Pull exam-complete + report-signed timestamps (HL7/DICOM or PACS export) | true |
| `no` | Derive proxy from RIS/RCM if possible, else defer | false |

*Note:* `read_loc` does not change acquisition method by itself; it annotates where extracts originate (`hospital_epic` → coordinate with hospital IT; `own_ris`/`both` → group-side feed). Record it on the relevant source; it does not gate.

### 3.2 Build tier = f(`warehouse`, `bi_tool`, `analyst`) — *joint, not any one alone*
```
hasBI = bi_tool != none
if warehouse==yes and hasBI:      tier = "Thinnest — model in existing stack, surface in existing BI"
elif hasBI and warehouse==no:     tier = "Light — add lightweight warehouse (BigQuery/DuckDB), feed existing BI"
elif warehouse==yes and not hasBI:tier = "Light+ — have storage, add surfacing layer (Metabase/Looker Studio) or connect BI"
else:                             tier = "Standard — stand up thin stack (warehouse + Metabase/Looker Studio) end to end"
effortNote = (analyst==no) ? "No in-house analyst → include implementation/run support" : "Analyst available → group can own ongoing runs"
```

### 3.3 Panel readiness = source availability × compliance — *compliance trumps*
Panel→source dependency (constant):
- `collection_rate`, `payer_mix`, `uncompensated_cost`, `rev_per_wRVU`, `denials` ← **billing** (rev_per_wRVU also joins the public CMS RVU file, always available).
- `negative_read_by_indication` (the "fall" panel) ← **reporting/clinical source**.
- `turnaround` ← **PACS timestamps**.
- `trend` ← **billing** + `rcm_history` depth.

For each panel:
```
source_ready = all required sources for this panel are ready
               (billing panels also require billing_ready==true)
compliance_cleared = (baa==yes) AND (deid_ok==yes)     // §3.4
if not source_ready:        status = "pending_source"     ; needs = [missing source(s) + the answer that unblocks]
elif not compliance_cleared:status = "pending_compliance" ; needs = [open gates]
else:                       status = "live"
```
**This is the key interaction:** an easy source (e.g., in-house RCM) still does **not** make a panel live on real data if compliance isn't cleared. `source_ready` and `data_live (=source_ready AND compliance_cleared)` are different things. The interactive demo may flip a panel's *visual* state on `source_ready` to show the mechanic; the **generated spec must report the true status** including the compliance gate. Don't conflate them.

### 3.4 Compliance gate = f(`baa`, `deid_ok`) — override on everything real
```
cleared = (baa==yes) AND (deid_ok==yes)
gates = []
if baa==no:               gates += "Establish BAA before any real extract; build on synthetic/illustrative until signed"
if deid_ok==needs_review: gates += "Compliance review of de-identified / limited-data-set approach before extract"
```
Until `cleared`, every panel is at most `pending_compliance`; the app stays on illustrative data. The spec still lists the full acquisition plan so work can proceed up to the gate.

### 3.5 The `hospital_billed` cascade — one answer reshapes many outputs
When `rcm_owner==hospital_billed`, apply all of:
- billing source route → DUA required; `billing_ready=false` until DUA.
- all billing-dependent panels (`collection_rate`, `payer_mix`, `uncompensated_cost`, `rev_per_wRVU`, `denials`, `trend`) → `pending_source` until DUA, regardless of compliance.
- add RED flag (§5) and add DUA to `permissionsAPIs` and as a sequence gate.
This is the clearest case of "meaning depends on combination": the same downstream panels that are trivially live for `in_house` are blocked for `hospital_billed`.

### 3.6 Sequence & timeline = f(critical path across gates)
```
steps = [ "Day 0: provision access for each ready source" ]
if any gate in {BAA, compliance review, DUA}: steps += "Gate(s): execute agreements/review (external lead, start clock when signed)"
steps += "Extract + land ready sources", "Join into fact table (claim-line per exam)", "Compute invariant metrics", "Surface in <tier>", "Validate vs sample"
gated = (baa==no) OR (deid_ok==needs_review) OR (rcm_owner==hospital_billed)
timelineBand = gated
   ? "Gate-dependent — ~2–3 weeks of build once the agreement(s)/access land; gate timing is external"
   : "~2–3 weeks from access provisioning"
```

---

## 4. Invariant blocks (never vary — constant for every deployment)
- **Schema:** fact table, grain = one claim line per exam (accession + CPT). Dimensions: payer, site-of-service, modality, indication (ICD-10), referring provider, reading radiologist, date.
- **Metrics:** collection rate by site; payer mix by site; uncompensated coverage cost; net revenue per wRVU by site; denial rate by reason/indication; negative-read rate by indication; turnaround (STAT/routine); past→current→projected trend.
These are emitted in every spec regardless of answers. Answers only determine *how/whether* each is sourced (§3), never the definitions.

## 5. Flag rules
| Condition | Flag |
|---|---|
| `rcm_owner==hospital_billed` | RED — may not control the data; DUA required |
| `rcm_history==lt_12mo` | Trend panel minimal/deferred |
| `rcm_history==12mo` | Trend shallow (12mo only) |
| `mpower==no` AND `reporting==other` | "Fall" panel likely manual for v0 |
| `pacs_ts==no` | Turnaround deferred |
| `baa==no` | Prerequisite gate before real data |
| `deid_ok==needs_review` | Prerequisite gate before real data |
| `analyst==no` | Implementation/run support needed |

## 6. Defaults for `unknown` / partial answers
- Treat any `unknown` as **not ready + flag** for its dependent outputs (status `pending_source`, needs = "answer <variable>").
- `compliance_cleared` requires explicit `yes`/`yes`; `unknown` on `baa` or `deid_ok` → not cleared (fail safe).
- The spec is generatable at any completeness level — partial answers yield a partial spec with more `pending` entries. The demo tightens as answers fill in. Never block generation waiting for completeness.

---

## 7. The function, assembled
```
generateSpec(answers):
  sources  = [ billingSource(rcm_owner), reportingSource(mpower, reporting), tatSource(pacs_ts) ]   // §3.1
  tier     = buildTier(warehouse, bi_tool, analyst)                                                 // §3.2
  comp     = complianceGate(baa, deid_ok)                                                           // §3.4
  panels   = [ for each invariant panel: status = readiness(panel, sources, comp) ]                 // §3.3 (+§3.5 cascade)
  flags    = flagRules(answers)                                                                     // §5
  seq,band = sequenceAndTimeline(sources, comp, rcm_owner)                                          // §3.6
  return assemble(sources, tier, INVARIANT_SCHEMA, INVARIANT_METRICS, panels, comp,
                  unionAccess(sources, comp), seq, band, flags)
```
Render the returned object as the downloadable architecture-spec Markdown (brief Section 8 template).

---

## 8. Test cases (verify the build against these exactly)
Run these answer vectors through the implementation; the outputs must match. These are the regression tests for the "smart part."

### Case A — ready group
`in_house, 24_36mo, ps_one, used, both, yes, power_bi, yes, yes, yes, yes`
- tier: **Thinnest**. sources: RCM CSV/SFTP (short), mPower API (short), PACS timestamps (short).
- compliance: **cleared**. panels: **all 8 live**; trend full.
- gates: none. timeline: **~2–3 wks from access**. flags: none.

### Case B — hospital-billed, no mPower, compliance pending
`hospital_billed, 12mo, ps_360, no, hospital_epic, no, none, no, no, no, needs_review`
- tier: **Standard** + "implementation support" (analyst no).
- sources: billing → **DUA required (RED)**; reporting → PowerScribe text + NLP (build effort); TAT → none, **defer**.
- compliance: **not cleared** (BAA no + review). cascade: all billing panels `pending_source` (DUA) and would also be `pending_compliance`.
- panels: 1–5 pending_source; `negative_read` pending_compliance (source_ready via NLP but compliance blocks); `turnaround` pending_source; `trend` shallow + pending.
- gates: BAA, compliance review, DUA. timeline: **gate-dependent**. flags: hospital_billed (RED), pacs none, analyst none, history shallow.

### Case C — vendor RCM, mPower licensed-unused, BI but no warehouse
`vendor, 24_36mo, ps_one, unused, own_ris, yes, tableau, no, yes, yes, yes`
- tier: **Light** (add warehouse, feed Tableau).
- sources: RCM vendor 837/835 feed (medium lead); mPower (**enable/configure first**, then API); PACS timestamps (short).
- compliance: **cleared**. panels: **all live** once feeds land; `negative_read` live after mPower enablement.
- gates: none (compliance cleared); non-gate leads = vendor feed + mPower enable. timeline: **~2–3 wks once vendor feed + mPower enabled**. flags: mPower needs enabling (minor).

---

## 9. Instruction to the builder
Implement Sections 3–7 verbatim as a pure function. Do not let the model "reason about" a group's situation at runtime — it looks up rules. Wire the test cases in Section 8 as assertions; if any output diverges, the implementation is wrong, not the spec. If a real deployment surfaces a case these rules don't cover, that's a change to **this file** (made deliberately, with Taylor), not an improvisation inside Lovable.

---

## 10. Framing note — existing tools are an accelerant (the math is unchanged)
This is a presentation layer, not a logic change. Confirming existing infrastructure (`bi_tool≠none`, `warehouse=yes`, `analyst=yes`, `mpower∈{used,unused}`) **only ever reduces build scope** — lighter tier, more panels live cheaply, shorter timeline. It never makes anything harder and never implies redundant or wasted spend. Narrate accordingly:
- **Lead the generated spec with what they already have:** "Leveraging your existing mPower + warehouse + BI, the build is Thinnest…" — not a bare tier label.
- **Render the readiness/`data wired` meter as a "foundation already in place" / head-start indicator** that rises with each existing tool confirmed — framed as "how much you've already built," never "what's missing."
- **Credit, never critique.** The buyer chose those tools; the spec treats them as the foundation we connect, not a gap we expose.

The routing in §3 is unchanged. Only the language around it is credit-forward.
