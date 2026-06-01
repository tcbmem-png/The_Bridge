// Engine types — see docs/engine-decision-logic.md (Section 1, 2).
// These types are the contract for generateSpec(answers).

export type RcmOwner = "in_house" | "vendor" | "hospital_billed";
export type RcmHistory = "24_36mo" | "12mo" | "lt_12mo";
export type Reporting = "ps_one" | "ps_360" | "other";
export type Mpower = "used" | "unused" | "no";
export type ReadLoc = "hospital_epic" | "own_ris" | "both";
export type YesNo = "yes" | "no";
export type BiTool = "power_bi" | "tableau" | "none";
export type DeidOk = "yes" | "needs_review";

export type Answers = {
  rcm_owner?: RcmOwner;
  rcm_history?: RcmHistory;
  reporting?: Reporting;
  mpower?: Mpower;
  read_loc?: ReadLoc;
  pacs_ts?: YesNo;
  bi_tool?: BiTool;
  warehouse?: YesNo;
  analyst?: YesNo;
  baa?: YesNo;
  deid_ok?: DeidOk;
};

export type AnswerKey = keyof Answers;

export type Lead = "short" | "medium" | "long" | "gated_uncertain" | "deferred";

export type Source = {
  key: "billing" | "reporting" | "tat";
  name: string;
  route: string;
  accessNeeded: string;
  lead: Lead;
  ready: boolean;
  note?: string;
};

export type Tier = {
  tier: string;
  description: string;
  effortNote: string;
};

export type PanelKey =
  | "collection_rate"
  | "payer_mix"
  | "uncompensated_cost"
  | "rev_per_wRVU"
  | "denials"
  | "negative_read_by_indication"
  | "turnaround"
  | "trend";

export type PanelStatus = "live" | "pending_source" | "pending_compliance";

export type Panel = {
  key: PanelKey;
  name: string;
  status: PanelStatus;
  needs: string[];
};

export type Compliance = {
  cleared: boolean;
  gates: string[];
};

// Dashboard-facing readiness. Four states, per dashboard-panel-spec §3.
// "assumed" = no answer yet for the domain → render on a benchmark default.
// The dashboard renders this verbatim; it never recomputes.
export type DomainStatus =
  | "live"
  | "assumed"
  | "pending_source"
  | "pending_compliance";

export type DomainKey = "billing" | "reporting" | "tat";

export type DomainState = {
  key: DomainKey;
  status: DomainStatus;
  needs: string[];
  sourceName: string;
};

export type DomainReadiness = Record<DomainKey, DomainState>;

export type Spec = {
  sources: Source[];
  storageTier: Tier;
  schemaInvariant: {
    factGrain: string;
    dimensions: string[];
  };
  metricsInvariant: string[];
  panels: Panel[];
  compliance: Compliance;
  permissionsAPIs: string[];
  sequence: string[];
  timelineBand: string;
  flags: string[];
  // Dashboard reads this; engine owns it.
  domainReadiness: DomainReadiness;
};
