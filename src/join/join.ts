// The join — deterministic, three tiers in order:
//   (1) entity-key exact (accession)
//   (2) composite bridge (date_of_service + patient_key + procedure + provider [+ site if pinned])
//   (3) unmatched
// join_status is an OUTPUT, not an error. Unmatched buckets ARE the findings:
//   production with no charge = lost_work; charge with no production = capture_gap;
//   charge with no payment past maturity = denial/underpayment (set later by maturity reconcile).

import type { BillingRecord, ProductionRecord, WorkflowRecord, Fact, FindingKind } from "../schemas/canonical.ts";
import type { Pins } from "../config/pins.ts";

const sm = (dos: string) => dos.slice(0, 7);

function bridgeKey(dos: string, patient: string, code: string, provider: string, site: string, useSite: boolean): string {
  return [dos, patient, code, provider, useSite ? site : "*"].join("|");
}

export function join(
  billing: BillingRecord[],
  production: ProductionRecord[],
  workflow: WorkflowRecord[],
  pins: Pins,
): Fact[] {
  const facts = new Map<string, Fact>();

  const ensure = (key: string, tier: Fact["join_tier"], dos: string): Fact => {
    let f = facts.get(key);
    if (!f) {
      f = {
        key, join_tier: tier, finding: "matched", date_of_service: dos, service_month: sm(dos),
        billing: null, production: null, workflow: null, wrvu: 0, maturity_class: "production", matured: false,
      };
      facts.set(key, f);
    }
    return f;
  };

  // Tier 1 — exact accession for production & workflow (they always carry it), and billing that carries it.
  for (const p of production) ensure(p.accession, "exact", p.date_of_service).production = p;
  for (const w of workflow) {
    const f = ensure(w.accession, "exact", w.date_of_service);
    f.workflow = w;
  }
  for (const b of billing) {
    if (b.accession) ensure(b.accession, "exact", b.date_of_service).billing = b;
  }

  // Tier 2 — composite bridge for billing rows WITHOUT an accession.
  // Build an index of production records by composite key to find their accession.
  const prodIndex = new Map<string, ProductionRecord>();
  for (const p of production) {
    prodIndex.set(bridgeKey(p.date_of_service, p.patient_key, p.cpt, p.ordering_provider ?? p.reading_radiologist, "", pins.bridge_requires_site), p);
  }
  for (const b of billing) {
    if (b.accession) continue;
    const bk = bridgeKey(b.date_of_service, b.patient_key, b.cpt, b.provider, b.site, pins.bridge_requires_site);
    const match = prodIndex.get(bk);
    if (match) {
      const f = facts.get(match.accession);
      if (f && !f.billing) { f.billing = b; if (f.join_tier === "exact") f.join_tier = "bridged"; continue; }
    }
    // Tier 3 — unmatched billing (no production to bridge to) = capture gap candidate.
    const key = `unmatched:${b.claim_id}`;
    const f = ensure(key, "unmatched", b.date_of_service);
    f.billing = b;
  }

  // Assign initial finding buckets from presence (maturity reconcile refines denial/underpayment).
  for (const f of facts.values()) {
    const hasB = !!f.billing, hasP = !!f.production;
    let finding: FindingKind = "matched";
    if (hasP && !hasB) finding = "lost_work";
    else if (hasB && !hasP) finding = "capture_gap";
    f.finding = finding;
  }

  // Deterministic order: by service_month then key.
  return [...facts.values()].sort((a, b) => (a.service_month + a.key).localeCompare(b.service_month + b.key));
}
