// Deterministic synthetic dataset generator — MOCK_HEART_GROUP.
// Synthetic only. No real people, payers, facilities or dollars.
//
// The dataset is built with INTENTIONAL reconciliation breaks so the product
// can prove it surfaces them: work without a claim, claims without remittance,
// denials, zero-pay adjudications, payments that never reach the bank,
// unknown payers, unmapped CPTs, and one contradictory payer field.
//
// Run: node scripts/generate-mock-heart-group.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "public/sample-data/mock-heart-group");
mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- rng
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260817);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const weighted = (pairs) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [v, w] of pairs) {
    r -= w;
    if (r <= 0) return v;
  }
  return pairs[pairs.length - 1][0];
};
const money = (n) => Number(n.toFixed(2));

// ---------------------------------------------------------------- dimensions
const PHYSICIANS = [
  ["1730000101", "A. Okafor, MD", "cardiology", "interventional"],
  ["1730000102", "B. Nakamura, MD", "cardiology", "interventional"],
  ["1730000103", "C. Alvarez, MD", "cardiology", "interventional"],
  ["1730000104", "D. Whitfield, MD", "cardiology", "interventional"],
  ["1730000105", "E. Moreau, MD", "cardiology", "non_invasive"],
  ["1730000106", "F. Sandoval, MD", "cardiology", "non_invasive"],
  ["1730000107", "G. Petrossian, MD", "cardiology", "non_invasive"],
  ["1730000108", "H. Lindqvist, MD", "cardiology", "electrophysiology"],
  ["1730000109", "J. Adeyemi, MD", "cardiology", "general"],
];
// One NPI that appears on claims but is not on the roster.
const UNKNOWN_NPI = "1730000999";

const FACILITIES = [
  ["OFFICE1", "Main Office", "office"],
  ["HOSPA", "Hospital A", "hospital"],
  ["HOSPB", "Hospital B", "hospital"],
  ["ASC1", "Outpatient Center", "asc"],
];

const PAYERS = [
  ["MCR", "Medicare", "medicare"],
  ["MA1", "Medicare Advantage Plan", "medicare_advantage"],
  ["MCAL", "State Medicaid", "medicaid"],
  ["COMM_A", "Commercial A", "commercial"],
  ["COMM_B", "Commercial B", "commercial"],
  ["SELF", "Self-pay", "self_pay"],
];
const UNKNOWN_PAYER = "PAYX"; // deliberately absent from ref.payer

const POS = [
  ["11", "Office", "office"],
  ["19", "Off-campus outpatient hospital", "hospital"],
  ["21", "Inpatient hospital", "hospital"],
  ["22", "On-campus outpatient hospital", "hospital"],
  ["23", "Emergency room — hospital", "ed"],
  ["24", "Ambulatory surgical center", "asc"],
];

// service family -> [cpt, description, wRVU, base charge, pos pool, class]
const CATALOG = [
  ["office_em", "99213", "Office visit, established, level 3", 1.3, 210, ["11"], "office"],
  ["office_em", "99214", "Office visit, established, level 4", 1.92, 300, ["11"], "office"],
  ["office_em", "99204", "Office visit, new, level 4", 2.6, 400, ["11"], "office"],
  ["hospital_em", "99232", "Subsequent inpatient care, level 2", 1.39, 230, ["21"], "inpatient"],
  ["hospital_em", "99233", "Subsequent inpatient care, level 3", 2.0, 330, ["21"], "inpatient"],
  ["hospital_em", "99223", "Initial inpatient care, level 3", 3.5, 560, ["21"], "inpatient"],
  ["ed_em", "99284", "Emergency department visit, level 4", 2.6, 430, ["23"], "ed"],
  ["ed_em", "99285", "Emergency department visit, level 5", 3.8, 640, ["23"], "ed"],
  ["echo", "93306", "Transthoracic echo, complete w/ Doppler", 1.3, 520, ["11", "22"], "outpatient"],
  ["echo", "93351", "Stress echo, complete", 1.75, 760, ["11", "22"], "outpatient"],
  ["echo", "93312", "Transesophageal echo", 2.2, 890, ["21", "22"], "outpatient"],
  ["nuclear", "78452", "Myocardial perfusion imaging, SPECT", 1.46, 980, ["11", "22"], "outpatient"],
  ["nuclear", "78451", "Myocardial perfusion imaging, single", 1.12, 760, ["11", "22"], "outpatient"],
  ["vascular", "93880", "Carotid duplex, complete", 0.8, 340, ["11", "22"], "outpatient"],
  ["vascular", "93970", "Venous duplex, bilateral", 0.7, 320, ["11", "22"], "outpatient"],
  ["cath", "93458", "Left heart cath with coronary angiography", 5.75, 2400, ["22", "21"], "outpatient"],
  ["cath", "93460", "Right and left heart cath", 7.0, 3000, ["22", "21"], "outpatient"],
  ["pci", "92928", "Percutaneous coronary intervention with stent", 10.9, 5200, ["22", "21"], "outpatient"],
  ["pci", "92941", "PCI, acute MI", 13.0, 6400, ["21"], "inpatient"],
  ["ep", "93653", "Comprehensive EP study with ablation", 15.0, 7100, ["22", "21"], "outpatient"],
  ["ep", "93656", "AF ablation", 17.0, 8200, ["22", "21"], "outpatient"],
  ["device", "33208", "Pacemaker insertion, dual chamber", 9.0, 4300, ["21", "24"], "inpatient"],
  ["device", "93289", "Device interrogation, ICD", 0.74, 190, ["11"], "office"],
  ["other", "36415", "Venipuncture", 0.0, 25, ["11"], "office"],
];
// CPT deliberately absent from the MPFS reference table.
const UNMAPPED_CPT = ["0525T", "Unlisted cardiovascular service", 620, ["22"], "outpatient"];

const DENIALS = [
  ["CO-16", "Claim lacks information needed for adjudication", "coding"],
  ["CO-97", "Benefit included in payment for another service", "bundling"],
  ["CO-197", "Precertification / authorization absent", "authorization"],
  ["PR-27", "Expenses incurred after coverage terminated", "eligibility"],
  ["CO-50", "Not deemed a medical necessity", "other"],
];

const PAYER_RATE = {
  MCR: 1.0,
  MA1: 0.97,
  MCAL: 0.62,
  COMM_A: 1.32,
  COMM_B: 1.18,
  SELF: 0.22,
  [UNKNOWN_PAYER]: 1.05,
};
const CF = 32.35; // synthetic conversion factor for the sample year

// ---------------------------------------------------------------- generation
const YEAR = 2025;
const N_ENCOUNTERS = 6400;

const encounters = [];
const claimLines = [];
const remitLines = [];

const subspecPool = {
  interventional: ["cath", "pci", "hospital_em", "ed_em", "office_em"],
  non_invasive: ["echo", "nuclear", "vascular", "office_em", "hospital_em"],
  electrophysiology: ["ep", "device", "office_em", "hospital_em"],
  general: ["office_em", "hospital_em", "device", "vascular", "ed_em"],
};

function dosFor(i) {
  const month = 1 + Math.floor((i / N_ENCOUNTERS) * 12);
  const day = 1 + Math.floor(rnd() * 27);
  return `${YEAR}-${String(Math.min(month, 12)).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

let claimSeq = 0;
const breaks = {
  work_without_claim: 0,
  claim_without_remit: 0,
  denied: 0,
  zero_pay: 0,
  paid_not_in_bank: 0,
  unknown_payer_lines: 0,
  unmapped_cpt_lines: 0,
  contradictory_payer: 0,
  ambiguous_remit: 0,
  unknown_physician_lines: 0,
};

const noBankTraces = new Set();

for (let i = 0; i < N_ENCOUNTERS; i++) {
  const [npi, , , subspec] = PHYSICIANS[Math.floor(rnd() * PHYSICIANS.length)];
  const physician = PHYSICIANS.find((p) => p[0] === npi);
  const sub = physician[3];
  const family = pick(subspecPool[sub] ?? subspecPool.general);

  const useUnmapped = rnd() < 0.011;
  const entry = useUnmapped
    ? ["other", UNMAPPED_CPT[0], UNMAPPED_CPT[1], null, UNMAPPED_CPT[2], UNMAPPED_CPT[3], UNMAPPED_CPT[4]]
    : pick(CATALOG.filter((c) => c[0] === family));

  const cpt = useUnmapped ? UNMAPPED_CPT[0] : entry[1];
  const wrvu = useUnmapped ? null : entry[3];
  const baseCharge = useUnmapped ? UNMAPPED_CPT[2] : entry[4];
  const posPool = useUnmapped ? UNMAPPED_CPT[3] : entry[5];
  const encClass = useUnmapped ? UNMAPPED_CPT[4] : entry[6];
  const posCode = pick(posPool);
  const facility =
    posCode === "11" ? "OFFICE1" : posCode === "24" ? "ASC1" : rnd() < 0.55 ? "HOSPA" : "HOSPB";

  const encounterId = `ENC${String(100000 + i)}`;
  const dos = dosFor(i);
  encounters.push({
    encounter_id: encounterId,
    patient_token: `PT${String(Math.floor(rnd() * 40000)).padStart(6, "0")}`,
    physician_npi: npi,
    dos,
    facility_id: facility,
    pos_code: posCode,
    encounter_class: encClass,
    procedure_cpt: cpt,
    units: 1,
    finalized_at: `${dos}T18:00:00Z`,
  });

  // BREAK: work that never became a claim.
  if (rnd() < 0.019) {
    breaks.work_without_claim++;
    continue;
  }

  const payer = weighted([
    ["MCR", 34],
    ["MA1", 17],
    ["MCAL", 9],
    ["COMM_A", 20],
    ["COMM_B", 13],
    ["SELF", 4],
    [UNKNOWN_PAYER, 1.4],
  ]);
  if (payer === UNKNOWN_PAYER) breaks.unknown_payer_lines++;
  if (useUnmapped) breaks.unmapped_cpt_lines++;

  const unknownDoc = rnd() < 0.004;
  if (unknownDoc) breaks.unknown_physician_lines++;

  const claimId = `CLM${String(500000 + claimSeq++)}`;
  const submit = addDays(dos, 2 + Math.floor(rnd() * 6));
  const charge = money(baseCharge * (0.9 + rnd() * 0.25));

  claimLines.push({
    claim_id: claimId,
    line_number: 1,
    encounter_id: encounterId,
    patient_token: encounters[encounters.length - 1].patient_token,
    dos,
    cpt_code: cpt,
    modifier_1: posCode === "11" ? "" : "26",
    modifier_2: "",
    pos_code: posCode,
    facility_id: facility,
    rendering_npi: unknownDoc ? UNKNOWN_NPI : npi,
    payer_id: payer,
    units: 1,
    charge_amount: charge,
    submit_date: submit,
  });

  // BREAK: claim submitted, never adjudicated.
  if (rnd() < 0.031) {
    breaks.claim_without_remit++;
    continue;
  }

  const paymentDate = addDays(submit, 12 + Math.floor(rnd() * 55));
  const trace = `EFT${paymentDate.replace(/-/g, "")}${String(Math.floor(rnd() * 40)).padStart(3, "0")}`;

  const roll = rnd();
  let status = "paid";
  let denial = "";
  let allowed = null;
  let paid = null;
  let pr = 0;

  const medicareEquivalent = wrvu === null ? charge * 0.42 : wrvu * CF;
  const contractAllowed = money(Math.max(medicareEquivalent * (PAYER_RATE[payer] ?? 1), 12));

  if (roll < 0.041) {
    status = "denied";
    denial = pick(DENIALS)[0];
    allowed = 0;
    paid = 0;
    breaks.denied++;
  } else if (roll < 0.062) {
    status = "zero_pay";
    allowed = contractAllowed;
    paid = 0;
    pr = contractAllowed;
    breaks.zero_pay++;
  } else {
    allowed = Math.min(contractAllowed, charge);
    pr = payer === "SELF" ? money(allowed) : money(allowed * (rnd() < 0.35 ? 0.2 : 0));
    paid = money(Math.max(allowed - pr, 0));
  }

  const adjustment = money(charge - allowed);
  const remitPayer = rnd() < 0.0025 ? pick(PAYERS)[0] : payer;
  if (remitPayer !== payer) breaks.contradictory_payer++;

  // BREAK: payment that never lands in the bank export.
  const orphanCash = status === "paid" && paid > 0 && rnd() < 0.012;
  if (orphanCash) {
    noBankTraces.add(trace);
    breaks.paid_not_in_bank++;
  }

  const remit = {
    remittance_id: `RA${paymentDate.replace(/-/g, "")}`,
    claim_id: claimId,
    line_number: 1,
    payer_id: remitPayer,
    cpt_code: cpt,
    charge_amount: charge,
    allowed_amount: allowed,
    paid_amount: paid,
    patient_resp: pr,
    adjustment_amount: adjustment,
    denial_code: denial,
    adjudication_status: status,
    payment_date: paymentDate,
    eft_trace: trace,
  };
  remitLines.push(remit);

  // BREAK: the same line remitted twice (ambiguous, not silently summed away).
  if (rnd() < 0.0018) {
    remitLines.push({ ...remit, remittance_id: remit.remittance_id + "B" });
    breaks.ambiguous_remit++;
  }
}

// ---------------------------------------------------------------- deposits
const byTrace = new Map();
for (const r of remitLines) {
  if (!r.paid_amount || noBankTraces.has(r.eft_trace)) continue;
  const cur = byTrace.get(r.eft_trace) ?? { date: r.payment_date, amount: 0 };
  cur.amount += r.paid_amount;
  byTrace.set(r.eft_trace, cur);
}
const deposits = [];
for (const [trace, v] of [...byTrace.entries()].sort()) {
  if (v.amount <= 0) continue;
  deposits.push({
    deposit_date: v.date,
    eft_trace: trace,
    amount: money(v.amount),
    description: "PAYER EFT",
  });
}
// Bank rows with no remittance counterpart — real statements always have them.
let bankOnly = 0;
for (let i = 0; i < 14; i++) {
  bankOnly++;
  deposits.push({
    deposit_date: `${YEAR}-${String(1 + Math.floor(rnd() * 12)).padStart(2, "0")}-15`,
    eft_trace: `BANKONLY${String(i).padStart(3, "0")}`,
    amount: money(400 + rnd() * 5200),
    description: "PATIENT LOCKBOX BATCH",
  });
}

// ---------------------------------------------------------------- csv writing
function toCsv(rows, cols) {
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
}
const write = (name, rows, cols) => {
  writeFileSync(join(OUT, name), toCsv(rows, cols));
  return rows.length;
};

write("encounters.csv", encounters, [
  "encounter_id",
  "patient_token",
  "physician_npi",
  "dos",
  "facility_id",
  "pos_code",
  "encounter_class",
  "procedure_cpt",
  "units",
  "finalized_at",
]);
write("claims_837.csv", claimLines, [
  "claim_id",
  "line_number",
  "encounter_id",
  "patient_token",
  "dos",
  "cpt_code",
  "modifier_1",
  "modifier_2",
  "pos_code",
  "facility_id",
  "rendering_npi",
  "payer_id",
  "units",
  "charge_amount",
  "submit_date",
]);
write("remits_835.csv", remitLines, [
  "remittance_id",
  "claim_id",
  "line_number",
  "payer_id",
  "cpt_code",
  "charge_amount",
  "allowed_amount",
  "paid_amount",
  "patient_resp",
  "adjustment_amount",
  "denial_code",
  "adjudication_status",
  "payment_date",
  "eft_trace",
]);
write("deposits.csv", deposits, ["deposit_date", "eft_trace", "amount", "description"]);

const mpfs = [];
for (const [, cpt, , wrvu] of CATALOG) {
  if (mpfs.some((m) => m.cpt_code === cpt)) continue;
  mpfs.push({ cpt_code: cpt, service_year: YEAR, work_rvu: wrvu, conversion_factor: CF });
}
write("ref_mpfs.csv", mpfs, ["cpt_code", "service_year", "work_rvu", "conversion_factor"]);

write(
  "ref_physician.csv",
  PHYSICIANS.map(([npi, name, spec, sub]) => ({
    physician_npi: npi,
    physician_name: name,
    specialty: spec,
    subspecialty: sub,
    class: "partner",
  })),
  ["physician_npi", "physician_name", "specialty", "subspecialty", "class"],
);
write(
  "ref_facility.csv",
  FACILITIES.map(([id, name, type]) => ({ facility_id: id, facility_name: name, facility_type: type })),
  ["facility_id", "facility_name", "facility_type"],
);
write(
  "ref_payer.csv",
  PAYERS.map(([id, name, fc]) => ({ payer_id: id, payer_name: name, financial_class: fc })),
  ["payer_id", "payer_name", "financial_class"],
);
write(
  "ref_service_family.csv",
  CATALOG.map(([fam, cpt, desc]) => ({ cpt_code: cpt, service_family: fam, description: desc })).filter(
    (r, i, a) => a.findIndex((x) => x.cpt_code === r.cpt_code) === i,
  ),
  ["cpt_code", "service_family", "description"],
);
write(
  "ref_pos_code.csv",
  POS.map(([code, desc, site]) => ({ pos_code: code, description: desc, site })),
  ["pos_code", "description", "site"],
);
write(
  "ref_denial_code.csv",
  DENIALS.map(([code, desc, cat]) => ({ denial_code: code, description: desc, category: cat })),
  ["denial_code", "description", "category"],
);

// ---------------------------------------------------------------- invariants
const sum = (arr, f) => money(arr.reduce((s, r) => s + (f(r) ?? 0), 0));
const wrvuByCpt = new Map(mpfs.map((m) => [m.cpt_code, m.work_rvu]));
const fixture = {
  name: "MOCK_HEART_GROUP",
  synthetic: true,
  service_year: YEAR,
  physicians: PHYSICIANS.length,
  encounters: encounters.length,
  claim_lines: claimLines.length,
  remit_rows: remitLines.length,
  deposit_rows: deposits.length,
  total_charges: sum(claimLines, (r) => r.charge_amount),
  total_allowed: sum(remitLines, (r) => r.allowed_amount),
  total_paid: sum(remitLines, (r) => r.paid_amount),
  total_deposits: sum(deposits, (r) => r.amount),
  mapped_wrvu: money(
    claimLines.reduce((s, r) => s + (wrvuByCpt.get(r.cpt_code) ?? 0) * Number(r.units), 0),
  ),
  bank_only_rows: bankOnly,
  breaks,
};
writeFileSync(join(OUT, "fixture.json"), JSON.stringify(fixture, null, 2) + "\n");

writeFileSync(
  join(OUT, "README.md"),
  `# MOCK_HEART_GROUP — synthetic sample data

Generated by \`scripts/generate-mock-heart-group.mjs\`. Deterministic: regenerating
reproduces this dataset byte for byte.

**Synthetic only.** No real patients, physicians, payers, facilities or dollars.
Nothing in this package is PHI, and nothing in it should be read as a benchmark.

The package deliberately contains reconciliation breaks so the record can prove
it surfaces them rather than smoothing them away:

${Object.entries(breaks)
  .map(([k, v]) => `- ${k.replace(/_/g, " ")}: ${v}`)
  .join("\n")}
- bank rows with no remittance counterpart: ${bankOnly}

Known totals live in \`fixture.json\` and are asserted by the test suite.
`,
);

console.log(JSON.stringify(fixture, null, 2));
