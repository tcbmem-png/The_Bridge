// INDEPENDENT RECOUNT — the answer key's author.
//
// This file deliberately does NOT import the production pipeline. It does not
// touch PGlite, the SQL views, recordDb, or any src/ module. It re-derives the
// fixture's known truth from the raw CSV bytes with its own hand-written joins,
// in plain JavaScript, using integer cents.
//
// The conformance gate compares the PRODUCTION pipeline against the oracle this
// file authored. If the two ever agree only because they share code, the gate
// proves nothing — so they share none.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

export const SOURCE_FILES = {
  encounters: "encounters.csv",
  claims: "claims_837.csv",
  remits: "remits_835.csv",
  deposits: "deposits.csv",
  ref_mpfs: "ref_mpfs.csv",
  ref_physician: "ref_physician.csv",
  ref_payer: "ref_payer.csv",
  ref_facility: "ref_facility.csv",
  ref_service_family: "ref_service_family.csv",
  ref_pos_code: "ref_pos_code.csv",
  ref_denial_code: "ref_denial_code.csv",
};

/** Minimal CSV reader. The fixture is comma-delimited with no quoted commas. */
function readCsv(dir, file) {
  const text = readFileSync(join(dir, file), "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const head = lines[0].split(",");
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",");
    const o = {};
    head.forEach((h, i) => (o[h] = cells[i] === undefined ? "" : cells[i]));
    return o;
  });
  return { rows, sha256: createHash("sha256").update(text).digest("hex"), bytes: text.length };
}

const cents = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.sign(n) * Math.round(Math.abs(n) * 100);
};
const add = (a, b) => a + (b ?? 0);
const yearOf = (dos) => Number(String(dos).slice(0, 4));

export function recount(sourceDir) {
  const enc = readCsv(sourceDir, SOURCE_FILES.encounters);
  const clm = readCsv(sourceDir, SOURCE_FILES.claims);
  const rmt = readCsv(sourceDir, SOURCE_FILES.remits);
  const dep = readCsv(sourceDir, SOURCE_FILES.deposits);
  const mpfs = readCsv(sourceDir, SOURCE_FILES.ref_mpfs);
  const phys = readCsv(sourceDir, SOURCE_FILES.ref_physician);
  const payr = readCsv(sourceDir, SOURCE_FILES.ref_payer);
  const facl = readCsv(sourceDir, SOURCE_FILES.ref_facility);
  const fam = readCsv(sourceDir, SOURCE_FILES.ref_service_family);
  const pos = readCsv(sourceDir, SOURCE_FILES.ref_pos_code);

  // --- reference sets -------------------------------------------------------
  const mpfsKey = new Set(mpfs.rows.map((r) => `${r.cpt_code}:${r.service_year}`));
  const physSet = new Set(phys.rows.map((r) => r.physician_npi));
  const payrSet = new Set(payr.rows.map((r) => r.payer_id));
  const faclSet = new Set(facl.rows.map((r) => r.facility_id));
  const famSet = new Set(fam.rows.map((r) => r.cpt_code));
  const posSet = new Set(pos.rows.map((r) => r.pos_code));

  // --- encounters -----------------------------------------------------------
  const encWithClaim = new Set(clm.rows.map((r) => r.encounter_id).filter(Boolean));
  const encCount = new Map();
  for (const r of enc.rows) encCount.set(r.encounter_id, (encCount.get(r.encounter_id) ?? 0) + 1);

  const unbilled = enc.rows.filter((r) => !encWithClaim.has(r.encounter_id)).length;
  const encDisp = { resolved_clean: 0, unmatched: 0, ambiguous: 0 };
  const claimsPerEnc = new Map();
  for (const r of clm.rows) {
    if (!r.encounter_id) continue;
    claimsPerEnc.set(r.encounter_id, (claimsPerEnc.get(r.encounter_id) ?? 0) + 1);
  }
  for (const r of enc.rows) {
    const n = claimsPerEnc.get(r.encounter_id) ?? 0;
    if (n === 0) encDisp.unmatched++;
    else if (n > 1) encDisp.ambiguous++;
    else encDisp.resolved_clean++;
  }

  // --- remit rollup, per (claim_id, line_number) ----------------------------
  const rollup = new Map();
  for (const r of rmt.rows) {
    const k = `${r.claim_id}:${Number(r.line_number)}`;
    let x = rollup.get(k);
    if (!x) {
      x = {
        rows: 0,
        payers: new Set(),
        allowed: 0,
        paid: 0,
        patient: 0,
        adj: 0,
        status: null,
        trace: null,
        payer: null,
      };
      rollup.set(k, x);
    }
    x.rows++;
    if (r.payer_id) x.payers.add(r.payer_id);
    x.allowed = add(x.allowed, cents(r.allowed_amount));
    x.paid = add(x.paid, cents(r.paid_amount));
    x.patient = add(x.patient, cents(r.patient_resp));
    x.adj = add(x.adj, cents(r.adjustment_amount));
    // MAX() semantics, matching the record's rollup, computed independently.
    if (x.status === null || (r.adjudication_status ?? "") > x.status)
      x.status = r.adjudication_status ?? "";
    if (x.trace === null || (r.eft_trace ?? "") > x.trace) x.trace = r.eft_trace ?? "";
    if (x.payer === null || (r.payer_id ?? "") > x.payer) x.payer = r.payer_id ?? "";
  }

  // --- deposits by trace ----------------------------------------------------
  const depByTrace = new Map();
  for (const d of dep.rows) {
    if (!d.eft_trace) continue;
    const x = depByTrace.get(d.eft_trace) ?? { rows: 0, cents: 0 };
    x.rows++;
    x.cents += cents(d.amount) ?? 0;
    depByTrace.set(d.eft_trace, x);
  }
  const remitByTrace = new Map();
  for (const r of rmt.rows) {
    if (!r.eft_trace) continue;
    const x = remitByTrace.get(r.eft_trace) ?? { rows: 0, cents: 0 };
    x.rows++;
    x.cents += cents(r.paid_amount) ?? 0;
    remitByTrace.set(r.eft_trace, x);
  }

  // --- claim lines ----------------------------------------------------------
  const lineDisp = {
    resolved_clean: 0,
    resolved_repaired: 0,
    unmatched: 0,
    ambiguous: 0,
    contradictory: 0,
    uncovered: 0,
    unresolved: 0,
  };
  let charges = 0,
    allowed = 0,
    paid = 0,
    patient = 0,
    adjust = 0;
  let denied = 0,
    zeroPay = 0,
    deniedCharges = 0;
  let noRemitLines = 0,
    noRemitCharges = 0;
  let contradictory = 0,
    ambiguous = 0;
  let unmappedCpt = 0,
    unknownPayer = 0,
    unknownPhysician = 0,
    unknownFacility = 0,
    unknownPos = 0,
    unmappedFamily = 0;
  let paidNoBankLines = 0,
    paidNoBankCents = 0;
  let wrvuMappedLines = 0;

  for (const c of clm.rows) {
    const k = `${c.claim_id}:${Number(c.line_number)}`;
    const r = rollup.get(k);
    const chargeCents = cents(c.charge_amount) ?? 0;
    charges += chargeCents;

    const covered = mpfsKey.has(`${c.cpt_code}:${yearOf(c.dos)}`);
    if (covered) wrvuMappedLines++;
    else unmappedCpt++;
    if (!payrSet.has(c.payer_id)) unknownPayer++;
    if (!physSet.has(c.rendering_npi)) unknownPhysician++;
    if (!faclSet.has(c.facility_id)) unknownFacility++;
    if (!posSet.has(c.pos_code)) unknownPos++;
    if (!famSet.has(c.cpt_code)) unmappedFamily++;

    let state;
    if (!r) state = "unmatched";
    else if (r.rows > 1) state = "ambiguous";
    else if (r.payers.size > 1 || (c.payer_id && r.payer && c.payer_id !== r.payer))
      state = "contradictory";
    else state = "matched";

    if (state === "unmatched") {
      noRemitLines++;
      noRemitCharges += chargeCents;
    }
    if (state === "contradictory") contradictory++;
    if (state === "ambiguous") ambiguous++;

    if (r) {
      allowed += r.allowed ?? 0;
      paid += r.paid ?? 0;
      patient += r.patient ?? 0;
      adjust += r.adj ?? 0;
      if (r.status === "denied") {
        denied++;
        deniedCharges += chargeCents;
      }
      if (r.status === "zero_pay") {
        zeroPay++;
        deniedCharges += chargeCents;
      }
      if (r.trace) {
        const d = depByTrace.get(r.trace);
        if (!d) {
          paidNoBankLines++;
          paidNoBankCents += r.paid ?? 0;
        }
      }
    }

    // Disposition — first class wins, mirroring the doctrine, not the code.
    if (state === "contradictory") lineDisp.contradictory++;
    else if (state === "ambiguous") lineDisp.ambiguous++;
    else if (state === "unmatched") lineDisp.unmatched++;
    else if (!covered) lineDisp.uncovered++;
    else if (r.paid === null || r.paid === undefined) lineDisp.unresolved++;
    else lineDisp.resolved_clean++;
  }

  // --- deposit dispositions and trace states --------------------------------
  const depDisp = { resolved_clean: 0, unmatched: 0, ambiguous: 0 };
  let depositCents = 0;
  for (const d of dep.rows) {
    depositCents += cents(d.amount) ?? 0;
    if (!d.eft_trace) depDisp.unmatched++;
    else if (!remitByTrace.has(d.eft_trace)) depDisp.unmatched++;
    else if ((depByTrace.get(d.eft_trace)?.rows ?? 0) > 1) depDisp.ambiguous++;
    else depDisp.resolved_clean++;
  }

  const traceStates = {
    matched: 0,
    matched_amount_differs: 0,
    ambiguous_duplicate_deposit: 0,
    remit_only: 0,
    bank_only: 0,
  };
  let bankOnlyCents = 0;
  const allTraces = new Set([...remitByTrace.keys(), ...depByTrace.keys()]);
  for (const t of allTraces) {
    const r = remitByTrace.get(t);
    const b = depByTrace.get(t);
    if (!r) {
      traceStates.bank_only++;
      bankOnlyCents += b.cents;
    } else if (!b) traceStates.remit_only++;
    else if (b.rows > 1) traceStates.ambiguous_duplicate_deposit++;
    else if (r.cents === b.cents) traceStates.matched++;
    else traceStates.matched_amount_differs++;
  }

  // --- the cash carve, in exact cents --------------------------------------
  //
  // The only carve that can close exactly at this stage is the cash carve:
  // what the payers say they paid, against what reached the bank. A trace is
  // the only join, so the difference is fully accounted for by the two
  // one-sided populations.
  const cashStartingGap = depositCents - paid;
  const cashExplained = [
    { key: "bank_cash_with_no_payer_trace", amount_cents: bankOnlyCents },
    { key: "payer_payment_with_no_bank_trace", amount_cents: -paidNoBankCents },
  ];
  const cashExplainedTotal = cashExplained.reduce((s, e) => s + e.amount_cents, 0);

  // The charge-side components are reported, never forced to close. Their sum
  // exceeds adjudicated charges on this fixture; that overage is a finding,
  // not a bucket to hide.
  const adjudicatedCharges = charges - noRemitCharges;
  const chargeComponents = adjust + patient + paid;

  return {
    custody: {
      encounters: enc.sha256,
      claims: clm.sha256,
      remits: rmt.sha256,
      deposits: dep.sha256,
    },
    source_counts: {
      encounters: enc.rows.length,
      claim_lines: clm.rows.length,
      remit_rows: rmt.rows.length,
      deposits: dep.rows.length,
      ref_mpfs: mpfs.rows.length,
      ref_physician: phys.rows.length,
      ref_payer: payr.rows.length,
      ref_facility: facl.rows.length,
      ref_service_family: fam.rows.length,
      ref_pos_code: pos.rows.length,
    },
    chain: {
      encounters: enc.rows.length,
      unbilled: unbilled,
      claim_lines: clm.rows.length,
      claim_lines_without_remittance: noRemitLines,
      payer_contradictions: contradictory,
      ambiguous_remittance: ambiguous,
      denied_lines: denied,
      zero_pay_lines: zeroPay,
      wrvu_mapped_lines: wrvuMappedLines,
    },
    money_cents: {
      charges: charges,
      allowed: allowed,
      payer_paid: paid,
      patient_responsibility: patient,
      contractual_adjustments: adjust,
      bank_cash: depositCents,
    },
    reference_integrity: {
      unmapped_cpt_lines: unmappedCpt,
      unknown_payer_lines: unknownPayer,
      unknown_physician_lines: unknownPhysician,
      unknown_facility_lines: unknownFacility,
      unknown_pos_lines: unknownPos,
      unmapped_family_lines: unmappedFamily,
    },
    partition: {
      claim_lines: { population: clm.rows.length, ...lineDisp },
      encounters: { population: enc.rows.length, ...encDisp },
      deposits: { population: dep.rows.length, ...depDisp },
    },
    trace: {
      states: traceStates,
      unexplained_bank_cash_cents: bankOnlyCents,
    },
    cash_carve: {
      starting_gap_cents: cashStartingGap,
      explained: cashExplained,
      explained_cents: cashExplainedTotal,
      unexplained_after_cents: cashStartingGap - cashExplainedTotal,
    },
    charge_side: {
      charges_cents: charges,
      no_remittance_charges_cents: noRemitCharges,
      adjudicated_charges_cents: adjudicatedCharges,
      components_cents: chargeComponents,
      component_overage_cents: chargeComponents - adjudicatedCharges,
      denied_or_zero_pay_charges_cents: deniedCharges,
      payer_paid_without_bank_trace_cents: paidNoBankCents,
    },
  };
}
