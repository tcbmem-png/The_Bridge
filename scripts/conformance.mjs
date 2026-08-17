// CONFORMANCE GATE — production pipeline vs. the independent oracle.
//
//   CONTRACT → ORACLE → GATE
//
// Boots the real schema (harness/sql/economic_record.sql) over the frozen
// fixture bytes, runs the production reconciliation views, and compares every
// result to fixtures/physician_group_v1/expected/oracle.json — an answer key
// authored independently of this pipeline (scripts/oracle/recount.mjs).
//
// Exit code is non-zero on any mismatch. A runtime change that moves a fixture
// number fails the build even if every unit test passes.

import { bootFixtureDb, oracle, one, all } from "./oracle/pipeline.mjs";

const failures = [];
const checks = [];
function expect(label, actual, want) {
  const a = typeof actual === "bigint" ? Number(actual) : Number(actual);
  const w = Number(want);
  checks.push(label);
  if (a !== w) failures.push(`${label}: expected ${w}, actual ${a}`);
}

const one = async (db, sql) => (await db.query(sql)).rows[0];
const all = async (db, sql) => (await db.query(sql)).rows;

async function main() {
  const db = await bootFixtureDb();

  // --- source counts --------------------------------------------------------
  const sc = oracle.source_counts;
  expect("source.encounters", (await one(db, `SELECT COUNT(*) n FROM stg.encounter`)).n, sc.encounters);
  expect("source.claim_lines", (await one(db, `SELECT COUNT(*) n FROM stg.claim_line`)).n, sc.claim_lines);
  expect("source.remit_rows", (await one(db, `SELECT COUNT(*) n FROM stg.remit_line`)).n, sc.remit_rows);
  expect("source.deposits", (await one(db, `SELECT COUNT(*) n FROM stg.deposit`)).n, sc.deposits);

  // --- the chain ------------------------------------------------------------
  const w2c = await one(db, `SELECT * FROM recon.work_to_claims`);
  expect("chain.unbilled", w2c.unmatched_work, oracle.chain.unbilled);
  const c2a = await one(db, `SELECT * FROM recon.claims_to_adjudication`);
  expect("chain.claim_lines_without_remittance", c2a.unadjudicated, oracle.chain.claim_lines_without_remittance);
  expect("chain.payer_contradictions", c2a.contradictory, oracle.chain.payer_contradictions);
  expect("chain.ambiguous_remittance", c2a.ambiguous, oracle.chain.ambiguous_remittance);
  expect("chain.denied_lines", c2a.denied, oracle.chain.denied_lines);
  expect("chain.zero_pay_lines", c2a.zero_pay, oracle.chain.zero_pay_lines);

  // --- money, in exact cents -----------------------------------------------
  const m = await one(db, `
    SELECT ROUND(SUM(charge_amount)*100)::bigint charges,
           ROUND(SUM(allowed_amount)*100)::bigint allowed,
           ROUND(SUM(paid_amount)*100)::bigint paid,
           ROUND(SUM(patient_resp)*100)::bigint patient,
           ROUND(SUM(adjustment_amount)*100)::bigint adjust
    FROM core.service_economics`);
  expect("money.charges_cents", m.charges, oracle.money_cents.charges);
  expect("money.allowed_cents", m.allowed, oracle.money_cents.allowed);
  expect("money.payer_paid_cents", m.paid, oracle.money_cents.payer_paid);
  expect("money.patient_responsibility_cents", m.patient, oracle.money_cents.patient_responsibility);
  expect("money.contractual_adjustments_cents", m.adjust, oracle.money_cents.contractual_adjustments);
  const bank = await one(db, `SELECT ROUND(SUM(amount)*100)::bigint c FROM stg.deposit`);
  expect("money.bank_cash_cents", bank.c, oracle.money_cents.bank_cash);

  // --- reference integrity --------------------------------------------------
  const ri = await one(db, `SELECT * FROM recon.reference_integrity`);
  expect("ref.unmapped_cpt_lines", ri.unmapped_cpt_lines, oracle.reference_integrity.unmapped_cpt_lines);
  expect("ref.unknown_payer_lines", ri.unknown_payer_lines, oracle.reference_integrity.unknown_payer_lines);
  expect("ref.unknown_physician_lines", ri.unknown_physician_lines, oracle.reference_integrity.unknown_physician_lines);
  expect("ref.wrvu_mapped_lines", ri.wrvu_mapped_lines, oracle.chain.wrvu_mapped_lines);

  // --- no-swallow partition -------------------------------------------------
  const partition = await all(db, `SELECT universe, disposition, row_count FROM recon.partition_class`);
  for (const universe of ["claim_lines", "encounters", "deposits"]) {
    const want = oracle.partition[universe];
    const got = Object.fromEntries(
      partition.filter((r) => r.universe === universe).map((r) => [r.disposition, Number(r.row_count)]),
    );
    for (const [k, v] of Object.entries(want)) {
      if (k === "population") continue;
      expect(`partition.${universe}.${k}`, got[k] ?? 0, v);
    }
    const classified = Object.values(got).reduce((s, n) => s + n, 0);
    expect(`partition.${universe}.closes`, classified, want.population);
  }
  const checkRows = await all(db, `SELECT universe, closes, unaccounted FROM recon.partition_check`);
  for (const r of checkRows) {
    checks.push(`no_swallow.${r.universe}`);
    if (r.closes !== true) failures.push(`no_swallow.${r.universe}: ${r.unaccounted} rows unaccounted`);
  }

  // --- trace reconciliation -------------------------------------------------
  const traces = await all(db, `SELECT trace_state, COUNT(*) n FROM recon.trace_reconciliation GROUP BY 1`);
  const got = Object.fromEntries(traces.map((r) => [r.trace_state, Number(r.n)]));
  for (const [state, n] of Object.entries(oracle.trace.states)) {
    expect(`trace.${state}`, got[state] ?? 0, n);
  }
  const bankOnly = await one(db, `
    SELECT COALESCE(SUM(deposit_cents),0)::bigint c FROM recon.trace_reconciliation
    WHERE trace_state = 'bank_only'`);
  expect("trace.unexplained_bank_cash_cents", bankOnly.c, oracle.trace.unexplained_bank_cash_cents);

  // --- the cash carve, exact to the cent ------------------------------------
  const ci = await one(db, `SELECT * FROM recon.carve_inputs`);
  const startingGap = Number(ci.bank_cash_cents) - Number(ci.payer_paid_cents);
  expect("carve.starting_gap_cents", startingGap, oracle.cash_carve.starting_gap_cents);
  const explained =
    Number(bankOnly.c) - Number(ci.paid_without_bank_trace_cents);
  expect("carve.explained_cents", explained, oracle.cash_carve.explained_cents);
  expect("carve.unexplained_after_cents", startingGap - explained, oracle.cash_carve.unexplained_after_cents);

  await db.close();

  const banner = `CONFORMANCE — ${oracle.fixture_id} v${oracle.fixture_version}`;
  if (failures.length) {
    console.error(`\n${banner}\nFAIL — ${failures.length} of ${checks.length} checks disagree with the oracle:\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    console.error("");
    process.exit(1);
  }
  console.log(`\n${banner}\nPASS — ${checks.length} checks match the independent oracle.\n`);
}

main().catch((e) => {
  console.error("CONFORMANCE — harness error:", e);
  process.exit(2);
});
