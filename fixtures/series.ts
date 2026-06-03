// A deterministic, PHI-free 36-month series — a pure function of the month index (no RNG, fully reproducible).
// It exists so the trend panels have a real SLOPE and INFLECTION to render (chassis §2.3): self-pay/Medicaid
// share rises in the back half (a regional 2025 subsidy-cliff amplifier), and the recent months carry
// pending claims so the immature edge shades honestly. Seeded findings keep every lane populated at scale.

import { WRVU_TABLE_CY2026 } from "../src/enrich/wrvu.ts";

type Raw = Record<string, string>;
const CF = 33.40; // synthetic paid-amount basis (mirrors the config conversion factor)

function addMonths(ym: string, delta: number): string {
  let [y, m] = ym.split("-").map(Number);
  m += delta;
  while (m <= 0) { m += 12; y -= 1; }
  while (m > 12) { m -= 12; y += 1; }
  return `${y}-${String(m).padStart(2, "0")}`;
}
function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const round0 = (n: number) => String(Math.round(n));

const CPTS = ["70450", "72125", "74177", "71046", "70551"];
const RADS = ["RAD_NEURO", "RAD_BODY", "RAD_PEDS", "RAD_MSK"];

export interface Series { billingRaw: Raw[]; productionRaw: Raw[]; workflowRaw: Raw[]; months: string[]; inflectionMonth: string; }

export function generateSeries(refMonth = "2026-05", monthsBack = 36, perMonth = 10): Series {
  const months: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) months.push(addMonths(refMonth, -i)); // oldest -> newest
  const INFLECTION_INDEX = 18;
  const billingRaw: Raw[] = [], productionRaw: Raw[] = [], workflowRaw: Raw[] = [];

  for (let i = 0; i < months.length; i++) {
    const month = months[i];
    // payer shares — self-pay ramps after the inflection; this is the slope the panels foreground
    const selfShare = i < INFLECTION_INDEX ? 0.08 : 0.08 + ((i - (INFLECTION_INDEX - 1)) / (monthsBack - INFLECTION_INDEX)) * 0.22;
    const selfCount = Math.round(perMonth * selfShare);
    const medicaidCount = Math.round(perMonth * 0.25);
    const commercialCount = Math.round(perMonth * 0.42);
    const recent = i >= monthsBack - 2; // last 2 months -> some pending (inside window N)

    for (let j = 0; j < perMonth; j++) {
      const g = i * perMonth + j;
      const acc = `S${i}_${j}`, patient = `PT${g}`;
      const dos = `${month}-${String(1 + (j % 25)).padStart(2, "0")}`;
      const cpt = CPTS[(i + j) % CPTS.length];
      const w = WRVU_TABLE_CY2026[cpt] ?? 0.5;
      const rad = RADS[(i + j) % RADS.length];
      const site = g % 3 === 0 ? "childrens" : "main";
      const night = g % 2 === 0;
      const hour = night ? "03" : "10";
      const payer = j < selfCount ? "self_pay"
        : j < selfCount + medicaidCount ? "medicaid"
        : j < selfCount + medicaidCount + commercialCount ? "commercial" : "medicare";

      // production + workflow always (the read happened)
      productionRaw.push({ accession: acc, patient_key: patient, date_of_service: dos, report_finalized_ts: `${dos}T${hour}:20:00`, cpt, modality: cpt === "70551" ? "MR" : "CT", reading_radiologist: rad, ordering_provider: `ORD${g % 7}` });
      workflowRaw.push({ accession: acc, patient_key: patient, date_of_service: dos, modality: cpt === "70551" ? "MR" : "CT", site, ordered_ts: `${dos}T${hour}:00:00`, performed_ts: `${dos}T${hour}:05:00`, report_finalized_ts: `${dos}T${hour}:20:00`, read_assigned_ts: `${dos}T${hour}:10:00` });

      // findings injection: lost work (no billing) and denials, seeded deterministically
      if (g % 13 === 0) continue; // LOST WORK — read, never billed (no billing row)
      const charge = w * CF * 3;
      let allowed = 0, paid = 0, status = "paid", carc = "", posting = "";
      if (g % 19 === 0) { // DENIAL
        status = "denied"; carc = "CO-50"; allowed = 0; paid = 0;
      } else if (payer === "self_pay") {
        status = "paid"; paid = 0; allowed = 0; // no-pay
      } else if (recent && payer !== "self_pay") {
        status = "pending"; paid = 0; allowed = 0; // PENDING (inside N) — not a denial
      } else {
        const mult = payer === "commercial" ? 1.8 : payer === "medicare" ? 1.0 : 0.68; // medicaid 0.68
        allowed = w * CF * mult;
        paid = (g % 23 === 0 && payer === "commercial") ? allowed * 0.7 : allowed; // occasional underpayment
        const lag = payer === "commercial" ? 35 : payer === "medicare" ? 30 : 45;
        posting = addDays(dos, lag);
      }
      billingRaw.push({
        accession: acc, claim_id: `C${g}`, patient_key: patient, date_of_service: dos,
        claim_submission_date: addDays(dos, 2), payment_posting_date: posting, site, payer, cpt,
        modifiers: "26", icd10: night && cpt === "70450" ? "W19.XXXA" : "R10.9", provider: `ORD${g % 7}`,
        charge: round0(charge), allowed: allowed ? round0(allowed) : "", paid: round0(paid),
        patient_responsibility: "0", adjustment: "0", carc, claim_status: status,
      });
    }
  }
  return { billingRaw, productionRaw, workflowRaw, months, inflectionMonth: months[INFLECTION_INDEX] };
}
