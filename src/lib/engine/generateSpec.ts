// PURE deterministic engine. No LLM, no inference, no judgment.
// Same answers in -> same spec out. Implements Sections 3-7 of
// docs/engine-decision-logic.md verbatim. Do not "improve" rules here;
// change the spec doc and the rules together.

import type {
  Answers,
  Compliance,
  DomainReadiness,
  DomainState,
  Panel,
  PanelKey,
  Source,
  Spec,
  Tier,
} from "./types";

// ---------- §3.1 sources ----------

function billingSource(a: Answers): Source & { billing_ready: boolean } {
  switch (a.rcm_owner) {
    case "in_house":
      return {
        key: "billing",
        name: "Billing / RCM",
        route: "Scheduled CSV/SFTP export from PM system",
        accessNeeded: "DB/export access + SFTP creds",
        lead: "short",
        ready: true,
        billing_ready: true,
      };
    case "vendor":
      return {
        key: "billing",
        name: "Billing / RCM",
        route: "Request standard 837/835 feed or vendor API",
        accessNeeded: "Vendor API key + scope, or feed setup",
        lead: "medium",
        ready: true,
        billing_ready: true,
      };
    case "hospital_billed":
      return {
        key: "billing",
        name: "Billing / RCM",
        route:
          "Data-sharing agreement / DUA required — group may not hold the data",
        accessNeeded: "DUA + hospital data feed",
        lead: "gated_uncertain",
        ready: false,
        billing_ready: false,
      };
    default:
      return {
        key: "billing",
        name: "Billing / RCM",
        route: "Unknown — answer rcm_owner",
        accessNeeded: "TBD",
        lead: "deferred",
        ready: false,
        billing_ready: false,
      };
  }
}

function reportingSource(a: Answers): Source {
  // mpower dominates.
  if (a.mpower === "used") {
    return {
      key: "reporting",
      name: "Reporting / clinical",
      route: "mPower export/API",
      accessNeeded: "mPower API credentials",
      lead: "short",
      ready: true,
    };
  }
  if (a.mpower === "unused") {
    return {
      key: "reporting",
      name: "Reporting / clinical",
      route: "mPower export/API after enable/configure step",
      accessNeeded: "mPower enablement + API credentials",
      lead: "medium",
      ready: true,
      note: "Existing license — needs enable/configure first.",
    };
  }
  if (a.mpower === "no" && (a.reporting === "ps_one" || a.reporting === "ps_360")) {
    return {
      key: "reporting",
      name: "Reporting / clinical",
      route: "Report-text extract + light NLP",
      accessNeeded: "PowerScribe report-text export",
      lead: "medium",
      ready: true,
      note: "Build effort: NLP over report text.",
    };
  }
  if (a.mpower === "no" && a.reporting === "other") {
    return {
      key: "reporting",
      name: "Reporting / clinical",
      route: "Flat-file extract + NLP if available, else manual sample",
      accessNeeded: "Flat-file export + manual sampling protocol",
      lead: "long",
      ready: false,
      note: "Assumption-first; 'fall' panel likely manual for v0.",
    };
  }
  return {
    key: "reporting",
    name: "Reporting / clinical",
    route: "Unknown — answer mpower and reporting",
    accessNeeded: "TBD",
    lead: "deferred",
    ready: false,
  };
}

function tatSource(a: Answers): Source {
  if (a.pacs_ts === "yes") {
    return {
      key: "tat",
      name: "PACS timestamps",
      route:
        "Pull exam-complete + report-signed timestamps (HL7/DICOM or PACS export)",
      accessNeeded: "PACS export or HL7/DICOM feed",
      lead: "short",
      ready: true,
    };
  }
  if (a.pacs_ts === "no") {
    return {
      key: "tat",
      name: "PACS timestamps",
      route: "Derive proxy from RIS/RCM if possible, else defer",
      accessNeeded: "RIS/RCM event fields",
      lead: "deferred",
      ready: false,
      note: "Turnaround panel deferred.",
    };
  }
  return {
    key: "tat",
    name: "PACS timestamps",
    route: "Unknown — answer pacs_ts",
    accessNeeded: "TBD",
    lead: "deferred",
    ready: false,
  };
}

// read_loc annotates origin; does not gate. §3.1 note.
function annotateReadLoc(sources: Source[], a: Answers): Source[] {
  if (!a.read_loc) return sources;
  const note =
    a.read_loc === "hospital_epic"
      ? "Reads originate hospital-side — coordinate with hospital IT."
      : a.read_loc === "own_ris"
        ? "Reads originate group-side — group-side feed."
        : "Mixed read locations — both group-side and hospital-side feeds.";
  return sources.map((s) =>
    s.key === "reporting" || s.key === "tat"
      ? { ...s, note: [s.note, note].filter(Boolean).join(" ") }
      : s,
  );
}

// ---------- §3.2 build tier ----------

function buildTier(a: Answers): Tier {
  const hasBI = a.bi_tool !== undefined && a.bi_tool !== "none";
  const wh = a.warehouse === "yes";
  let tier: string;
  let description: string;
  if (wh && hasBI) {
    tier = "Thinnest";
    description = "Model in existing stack, surface in existing BI.";
  } else if (hasBI && !wh) {
    tier = "Light";
    description = "Add lightweight warehouse (BigQuery/DuckDB), feed existing BI.";
  } else if (wh && !hasBI) {
    tier = "Light+";
    description =
      "Have storage; add surfacing layer (Metabase/Looker Studio) or connect BI.";
  } else {
    tier = "Standard";
    description =
      "Stand up thin stack (warehouse + Metabase/Looker Studio) end to end.";
  }
  const effortNote =
    a.analyst === "no"
      ? "No in-house analyst — include implementation/run support."
      : a.analyst === "yes"
        ? "Analyst available — group can own ongoing runs."
        : "Analyst availability unknown — assume implementation support until confirmed.";
  return { tier, description, effortNote };
}

// ---------- §3.4 compliance gate ----------

function complianceGate(a: Answers): Compliance {
  const cleared = a.baa === "yes" && a.deid_ok === "yes";
  const gates: string[] = [];
  if (a.baa !== "yes") {
    gates.push(
      "Establish BAA before any real extract; build on synthetic/illustrative until signed.",
    );
  }
  if (a.deid_ok !== "yes") {
    gates.push(
      "Compliance review of de-identified / limited-data-set approach before extract.",
    );
  }
  return { cleared, gates };
}

// ---------- §3.3 + §3.5 panel readiness ----------

const PANEL_NAMES: Record<PanelKey, string> = {
  collection_rate: "Collection rate by site",
  payer_mix: "Payer mix by site",
  uncompensated_cost: "Uncompensated coverage cost",
  rev_per_wRVU: "Net revenue per wRVU by site",
  denials: "Denial rate by reason / indication",
  negative_read_by_indication: "Negative-read rate by indication (the 'fall' panel)",
  turnaround: "Turnaround (STAT / routine)",
  trend: "Past → current → projected trend",
};

const BILLING_PANELS: PanelKey[] = [
  "collection_rate",
  "payer_mix",
  "uncompensated_cost",
  "rev_per_wRVU",
  "denials",
];

function panelReadiness(
  key: PanelKey,
  a: Answers,
  billing: Source & { billing_ready: boolean },
  reporting: Source,
  tat: Source,
  comp: Compliance,
): Panel {
  const name = PANEL_NAMES[key];
  const needs: string[] = [];

  // 1) determine source_ready + collect missing-source needs
  let sourceReady = true;

  if (BILLING_PANELS.includes(key)) {
    if (!billing.billing_ready) {
      sourceReady = false;
      if (a.rcm_owner === "hospital_billed") {
        needs.push("DUA with hospital before extract");
      } else if (a.rcm_owner === undefined) {
        needs.push("answer rcm_owner");
      } else {
        needs.push("billing feed");
      }
    }
  }

  if (key === "negative_read_by_indication") {
    if (!reporting.ready) {
      sourceReady = false;
      if (a.mpower === undefined) needs.push("answer mpower");
      if (a.reporting === undefined) needs.push("answer reporting");
      if (a.mpower === "no" && a.reporting === "other") {
        needs.push("flat-file/manual sampling protocol");
      }
    }
  }

  if (key === "turnaround") {
    if (!tat.ready) {
      sourceReady = false;
      if (a.pacs_ts === undefined) needs.push("answer pacs_ts");
      else needs.push("PACS timestamp export (or RIS/RCM proxy)");
    }
  }

  if (key === "trend") {
    // billing + history depth
    if (!billing.billing_ready) {
      sourceReady = false;
      if (a.rcm_owner === "hospital_billed") needs.push("DUA with hospital before extract");
      else if (a.rcm_owner === undefined) needs.push("answer rcm_owner");
      else needs.push("billing feed");
    }
    if (a.rcm_history === undefined) {
      sourceReady = false;
      needs.push("answer rcm_history");
    } else if (a.rcm_history === "lt_12mo") {
      sourceReady = false;
      needs.push("trend deferred — <12mo of claim history");
    } else if (a.rcm_history === "12mo") {
      // shallow but technically present — flag noted in §5; spec leaves it source-ready
      // (panel will be marked live/pending by compliance alone). The shallow flag carries the caveat.
    }
  }

  // 2) compliance trumps when source is ready
  if (!sourceReady) {
    return { key, name, status: "pending_source", needs };
  }
  if (!comp.cleared) {
    return { key, name, status: "pending_compliance", needs: [...comp.gates] };
  }
  return { key, name, status: "live", needs: [] };
}

// ---------- §5 flags ----------

function flagRules(a: Answers): string[] {
  const flags: string[] = [];
  if (a.rcm_owner === "hospital_billed")
    flags.push("RED — may not control the data; DUA required.");
  if (a.rcm_history === "lt_12mo") flags.push("Trend panel minimal / deferred.");
  if (a.rcm_history === "12mo") flags.push("Trend shallow (12mo only).");
  if (a.mpower === "no" && a.reporting === "other")
    flags.push("'Fall' panel likely manual for v0.");
  if (a.pacs_ts === "no") flags.push("Turnaround deferred.");
  if (a.baa === "no") flags.push("Prerequisite gate before real data (BAA).");
  if (a.deid_ok === "needs_review")
    flags.push("Prerequisite gate before real data (compliance review).");
  if (a.analyst === "no") flags.push("Implementation / run support needed.");
  if (a.mpower === "unused") flags.push("mPower licensed but unused — enable/configure first.");
  return flags;
}

// ---------- §3.6 sequence + timeline ----------

function sequenceAndTimeline(
  a: Answers,
  comp: Compliance,
  tier: Tier,
): { sequence: string[]; timelineBand: string } {
  const steps: string[] = ["Day 0: provision access for each ready source."];
  const hasGate =
    a.baa === "no" || a.deid_ok === "needs_review" || a.rcm_owner === "hospital_billed";
  if (hasGate) {
    steps.push(
      "Gate(s): execute agreements / compliance review (external lead — clock starts when signed).",
    );
  }
  steps.push(
    "Extract and land the ready sources.",
    "Join into the fact table (one claim line per exam).",
    "Compute the invariant metrics.",
    `Surface in ${tier.tier.toLowerCase()} tier (${tier.description.replace(/\.$/, "")}).`,
    "Validate against a sampled set.",
  );
  const gated =
    a.baa === "no" || a.deid_ok === "needs_review" || a.rcm_owner === "hospital_billed";
  const timelineBand = gated
    ? "Gate-dependent — ~2–3 weeks of build once the agreement(s) / access land; gate timing is external."
    : "~2–3 weeks from access provisioning.";
  // suppress unused warning for comp parameter — kept for signature parity
  void comp;
  return { sequence: steps, timelineBand };
}

// ---------- §4 invariants ----------

const SCHEMA_INVARIANT = {
  factGrain:
    "One claim line per exam (accession + CPT). One fact table joins billing, clinical and worklist.",
  dimensions: [
    "Payer",
    "Site-of-service",
    "Modality",
    "Indication (ICD-10-CM)",
    "Referring provider",
    "Reading radiologist",
    "Date",
  ],
};

const METRICS_INVARIANT = [
  "Collection rate by site of service.",
  "Payer mix by site of service.",
  "Uncompensated coverage cost.",
  "Net revenue per wRVU by site of service.",
  "Denial rate by reason and indication.",
  "Negative-read rate by indication.",
  "Turnaround (STAT vs routine).",
  "Past → current → projected trend.",
];

const PANEL_ORDER: PanelKey[] = [
  "collection_rate",
  "payer_mix",
  "uncompensated_cost",
  "rev_per_wRVU",
  "denials",
  "negative_read_by_indication",
  "turnaround",
  "trend",
];

// ---------- §7 assembled ----------

export function generateSpec(a: Answers): Spec {
  const billing = billingSource(a);
  const reporting = reportingSource(a);
  const tat = tatSource(a);
  const sources = annotateReadLoc([billing, reporting, tat], a);

  const tier = buildTier(a);
  const comp = complianceGate(a);

  const panels: Panel[] = PANEL_ORDER.map((k) =>
    panelReadiness(k, a, billing, reporting, tat, comp),
  );

  const flags = flagRules(a);
  const { sequence, timelineBand } = sequenceAndTimeline(a, comp, tier);

  // Permissions APIs = union of source accessNeeded + compliance gates + DUA if hospital_billed.
  const perms = new Set<string>();
  for (const s of sources) perms.add(s.accessNeeded);
  for (const g of comp.gates) perms.add(g);
  if (a.rcm_owner === "hospital_billed") perms.add("DUA + hospital data feed");

  return {
    sources,
    storageTier: tier,
    schemaInvariant: SCHEMA_INVARIANT,
    metricsInvariant: METRICS_INVARIANT,
    panels,
    compliance: comp,
    permissionsAPIs: Array.from(perms),
    sequence,
    timelineBand,
    flags,
  };
}
