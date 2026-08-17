// The pilot-preparation artifact: PREPARE FOR YOUR BRIDGE REVIEW.
//
// Two versions of one document, from one engine:
//
//   before intake  → a plain first-meeting checklist, in the practice's own
//                    workflow language. No EDI jargon.
//   after intake   → what was provided, what the record establishes, what is
//                    still a gap, the single next source that closes it, and
//                    the sentence to send asking for it.
//
// The recommendation is NOT recomputed here. It is read from
// `recommend()` — the same engine that drives /intake's readiness report —
// so the export and the screen can never drift.
//
// Unknown is not zero: a source request whose amount the current record
// cannot support prints UNPRICED WITH CURRENT SOURCES, never $0.

import { STAGES } from "../provenance/stages";
import type { PracticeConfig } from "./config";
import type { CustodyEntry } from "./custody";
import { shortHash } from "./custody";
import { buildReadiness } from "./readiness";
import type { SourceRequest } from "./recommend";

export const PLAN_TITLE = "PREPARE FOR YOUR BRIDGE REVIEW";

export function planTitle(practiceName?: string | null): string {
  const n = (practiceName ?? "").trim();
  return n ? `PREPARE FOR ${n.toUpperCase()} BRIDGE REVIEW` : PLAN_TITLE;
}

export const BRING_CHECKLIST: string[] = [
  "The report the partners currently use to understand collections",
  "Whatever report or export shows what each physician actually did",
  "Recent bank or deposit activity, if readily available",
  "Physician roster",
  "Facility / site list, if readily available",
  "Any billing or collections reports you already receive",
  "Any payer or denial reports you already receive",
];

export const BRING_NOTE =
  "Do not go hunting for special technical files yet. Start with what you already have.";

export const BRING_SUPPORT =
  "The Bridge is designed to determine what your current records establish first, then identify the exact source that would answer the next unresolved question.";

export const DISCOVERY_QUESTIONS: string[] = [
  "Show us the report you currently trust most.",
  "Show us how you know what each physician actually did.",
  "How does the billing company report collections back to you?",
  "Where does payer money actually land?",
  "What question can you currently not answer without calling the billing company?",
  "What number would you most like to negotiate from your own records?",
];

/** Human request language per source. Not a schema contract. */
interface RequestTemplate {
  source: string;
  why: string;
  answers: string;
  howToAsk: string;
}

const TEMPLATES: Record<string, RequestTemplate> = {
  encounter: {
    source: "Clinical work export",
    why: "Nothing downstream can be read until the work itself is on the record.",
    answers: "What work did each physician actually perform, and when?",
    howToAsk:
      "Ask your own clinical system for a service-level export for the period: date of service, physician, code, site and patient identifier.",
  },
  mpfs: {
    source: "Work-unit reference schedule",
    why: "Work has to be measured in comparable units before dollars per unit means anything.",
    answers: "How much work does each service represent, on a common scale?",
    howToAsk: "Public. CMS publishes the physician fee schedule RVU file; no request is needed.",
  },
  bank: {
    source: "Bank / deposit activity",
    why: "Cash that arrived is the only figure no vendor authors.",
    answers: "What money actually reached the group's account, and on what dates?",
    howToAsk:
      "Ask your bank (or pull from online banking) for deposit activity covering the same period, with deposit dates, amounts and any trace identifiers.",
  },
  claims: {
    source: "Claim-level billing export / 837-equivalent",
    why: "The clinical record establishes physician work, but the current sources do not show which work became submitted claims.",
    answers: "Which physician services entered the billing process, and which did not?",
    howToAsk:
      "Ask your billing company for a claim-line export for the relevant period including, where available: claim number, claim line number, date of service, CPT/HCPCS, modifiers, rendering physician, payer, place of service, charge, units, claim status and submission date.",
  },
  remit: {
    source: "835 / ERA",
    why: "The current record shows submitted claims but not what the payer actually adjudicated.",
    answers:
      "For each claim, what amount was allowed, paid, denied, adjusted, or assigned to patient responsibility?",
    howToAsk:
      "Ask your billing company for raw electronic remittance / ERA data covering the same period as the claims export. If raw 835 files cannot be provided, ask for the most detailed remittance-level export available — a summarized PDF is not equivalent, and will be recorded as their story rather than as the payer's record.",
  },
  rcm_ledger: {
    source: "Raw posting ledger",
    why: "Payer remittance and bank cash do not fully reconcile.",
    answers:
      "How did the billing / RCM system post the payer's remittance before cash reached the group's books?",
    howToAsk:
      "Ask the billing company for a transaction-level posting ledger covering the payment dates at issue, including payment trace / check / EFT identifiers where available.",
  },
  rcm_ar_aging: {
    source: "AR aging / unresolved claim worklist",
    why: "Claims exist with no remittance and no closing entry.",
    answers: "Which claims are still open, how old are they, and who is holding them?",
    howToAsk:
      "Ask the billing company for an AR aging as of a stated date, at claim-line grain, with payer and aging bucket.",
  },
  rcm_denial_worklist: {
    source: "Denial worklist / denial detail",
    why: "Denials appear on the remittance, but whether they were worked is not on it.",
    answers: "Which denials were appealed or reworked, and which went stale?",
    howToAsk:
      "Ask the billing company for the denial worklist covering the period, with denial reason, status and last action date.",
  },
  processed_report: {
    source: "Processed billing-company monthly report",
    why: "To compare the vendor's reported story with its own raw ledger and the payer record.",
    answers: "Does the report the group is shown agree with the records underneath it?",
    howToAsk:
      "Ask for the monthly reporting package you already receive, in whatever format it arrives, for the same period.",
  },
  rate_card: {
    source: "Executed payer agreement / fee schedule",
    why: "The current record establishes what the payer actually paid but not whether that payment complied with the governing contracted rate.",
    answers: "Is the payer's adjudication consistent with the group's contracted reimbursement terms?",
    howToAsk:
      "Ask whoever holds the executed payer agreements for the fee schedule in force during the period. Medicare rates are not a substitute and will not be used as one.",
  },
  payer: {
    source: "Payer reference list",
    why: "Payer identifiers on the files need names and financial classes to group honestly.",
    answers: "Which payers are which, and how does the group class them?",
    howToAsk: "Ask internally for the payer list already used in reporting.",
  },
  denial: {
    source: "Denial-code reference",
    why: "Denial codes need their published meanings before any cause is named.",
    answers: "What does each denial code on the remittance mean?",
    howToAsk: "Public. X12 publishes CARC/RARC lists; your vendor can also export its own mapping.",
  },
  physician: {
    source: "Physician roster",
    why: "Identifiers on the work export need people attached to them.",
    answers: "Who are the physicians, and which identifiers belong to each?",
    howToAsk: "Ask internally for the current roster with NPIs.",
  },
  facility: {
    source: "Facility / site list",
    why: "Site identifiers need names before any site comparison is readable.",
    answers: "Which sites are which?",
    howToAsk: "Ask internally for the site list.",
  },
  pos: {
    source: "Place-of-service reference",
    why: "Place-of-service codes carry economic meaning that has to be named.",
    answers: "Where was each service delivered, in the payer's own vocabulary?",
    howToAsk: "Public. CMS publishes the place-of-service code set.",
  },
  service_family: {
    source: "Service-family map",
    why: "Codes group into service families differently in every group.",
    answers: "How does this group want its own services grouped?",
    howToAsk: "Ask internally for the grouping already used in partner reporting.",
  },
};

function template(key: string, fallbackLabel: string): RequestTemplate {
  return (
    TEMPLATES[key] ?? {
      source: fallbackLabel,
      why: "The current sources do not carry what this source carries.",
      answers: "It resolves the next unanswered step in the work-to-cash chain.",
      howToAsk: "Ask the holder named above for this export covering the same period.",
    }
  );
}

export interface PlanSourceRequest {
  sourceKey: string;
  source: string;
  why: string;
  answers: string;
  /** Formatted dollars, or null when the record cannot support an amount. */
  amountAtIssue: string | null;
  howToAsk: string;
  heldBy: string;
  stageLabel: string;
}

export interface PlanCustodyRow {
  fileName: string;
  sourceClass: string;
  sha256: string;
  shortSha: string;
  status: string;
}

export interface PilotPlan {
  title: string;
  practiceName: string | null;
  generatedAt: string;
  /** True before any file is loaded: the generic first-meeting version. */
  generic: boolean;
  stageLabel: string;
  bring: string[];
  bringNote: string;
  bringSupport: string;
  questions: string[];
  provided: PlanCustodyRow[];
  establishes: string[];
  gaps: string[];
  nextSource: PlanSourceRequest | null;
  notYetRequired: string[];
  forNextMeeting: string;
  custody: PlanCustodyRow[];
}

export interface PlanInput {
  custody: CustodyEntry[];
  cfg: PracticeConfig;
  practiceName?: string | null;
  /** Optional record-supported amounts at issue, keyed by source key. */
  amountsAtIssue?: Record<string, string>;
  now?: Date;
}

function custodyRow(c: CustodyEntry): PlanCustodyRow {
  return {
    fileName: c.fileName,
    sourceClass: c.sourceKey ?? "unclaimed",
    sha256: c.sha256 ?? "unhashed",
    shortSha: shortHash(c.sha256),
    status: c.status,
  };
}

function toRequest(r: SourceRequest, amounts: Record<string, string>): PlanSourceRequest {
  const t = template(r.sourceKey, r.label);
  const amount = amounts[r.sourceKey];
  return {
    sourceKey: r.sourceKey,
    source: t.source,
    why: t.why,
    answers: t.answers,
    amountAtIssue: amount && amount.trim() ? amount.trim() : null,
    howToAsk: t.howToAsk,
    heldBy: r.heldBy,
    stageLabel: r.stageLabel,
  };
}

export function buildPilotPlan(input: PlanInput): PilotPlan {
  const { custody, cfg, amountsAtIssue = {} } = input;
  const name = (input.practiceName ?? "").trim() || null;
  const report = buildReadiness(custody, cfg);
  const loaded = custody.filter((c) => c.status === "loaded");
  const generic = loaded.length === 0;

  const primary = report.recommendation.primary;
  const next = primary ? toRequest(primary, amountsAtIssue) : null;

  // Everything else still outstanding is explicitly NOT yet required. The
  // product should reduce the burden of the ask, not print a data checklist.
  const notYetRequired = report.recommendation.queue
    .filter((r) => !next || r.sourceKey !== next.sourceKey)
    .map((r) => template(r.sourceKey, r.label).source)
    .filter((s, i, a) => a.indexOf(s) === i);

  const stageLabel = report.highestStage
    ? `Stage ${STAGES.find((s) => s.id === report.highestStage)!.n} · ${
        STAGES.find((s) => s.id === report.highestStage)!.label
      }`
    : "No stage complete yet";

  const forNextMeeting = next
    ? `Bring the ${next.source.toLowerCase()} covering the same period as the sources already provided.`
    : "No additional source is required before we review the current findings.";

  return {
    title: planTitle(name),
    practiceName: name,
    generatedAt: (input.now ?? new Date()).toISOString(),
    generic,
    stageLabel,
    bring: BRING_CHECKLIST,
    bringNote: BRING_NOTE,
    bringSupport: BRING_SUPPORT,
    questions: DISCOVERY_QUESTIONS,
    provided: loaded.map(custodyRow),
    establishes: report.established.map((l) => l.text),
    gaps: report.tangled.map((l) => l.text),
    nextSource: next,
    notYetRequired,
    forNextMeeting,
    custody: custody.map(custodyRow),
  };
}

export const UNPRICED = "UNPRICED WITH CURRENT SOURCES";

export function renderPilotPlanMarkdown(plan: PilotPlan): string {
  const out: string[] = [];
  out.push(`# ${plan.title}`);
  out.push("");
  out.push(`_Generated ${plan.generatedAt} · ${plan.stageLabel}_`);
  out.push("");

  out.push(`## BRING WHAT YOU ALREADY HAVE`);
  out.push("");
  for (const b of plan.bring) out.push(`- [ ] ${b}`);
  out.push("");
  out.push(`**${plan.bringNote}**`);
  out.push("");
  out.push(plan.bringSupport);
  out.push("");

  out.push(`## QUESTIONS WE WILL ASK`);
  out.push("");
  plan.questions.forEach((q, i) => out.push(`${i + 1}. ${q}`));
  out.push("");

  if (!plan.generic) {
    out.push(`## WHAT YOU ALREADY PROVIDED`);
    out.push("");
    for (const p of plan.provided) out.push(`- ${p.fileName} — ${p.sourceClass}`);
    out.push("");

    out.push(`## WHAT THE BRIDGE CAN ESTABLISH`);
    out.push("");
    if (plan.establishes.length === 0) out.push("- Nothing yet from the sources loaded.");
    else for (const e of plan.establishes) out.push(`- ${e}`);
    out.push("");

    out.push(`## WHAT REMAINS A GAP`);
    out.push("");
    if (plan.gaps.length === 0) out.push("- No open gap.");
    else for (const g of plan.gaps) out.push(`- ${g}`);
    out.push("");
  }

  out.push(`## WHAT SOURCE WOULD CLOSE THE NEXT GAP`);
  out.push("");
  if (plan.nextSource) {
    const n = plan.nextSource;
    out.push(`**SOURCE**`);
    out.push(n.source);
    out.push("");
    out.push(`**WHY WE NEED IT**`);
    out.push(n.why);
    out.push("");
    out.push(`**WHAT QUESTION IT WOULD ANSWER**`);
    out.push(n.answers);
    out.push("");
    out.push(`**CURRENT AMOUNT AT ISSUE**`);
    out.push(n.amountAtIssue ?? UNPRICED);
    out.push("");
    out.push(`**HOW TO ASK FOR IT**`);
    out.push(n.howToAsk);
    out.push("");
    out.push(`_Held by: ${n.heldBy} · ${n.stageLabel}_`);
    out.push("");
  } else {
    out.push("Every rung has its required sources. No further source is needed.");
    out.push("");
  }

  if (plan.notYetRequired.length > 0) {
    out.push(`## NOT YET REQUIRED`);
    out.push("");
    for (const s of plan.notYetRequired) out.push(`- ${s}`);
    out.push("");
  }

  out.push(`## FOR THE NEXT MEETING`);
  out.push("");
  out.push(plan.forNextMeeting);
  out.push("");

  if (plan.custody.length > 0) {
    out.push(`## APPENDIX — SOURCE CUSTODY`);
    out.push("");
    out.push(`| File | Source class | SHA-256 | Status |`);
    out.push(`| --- | --- | --- | --- |`);
    for (const c of plan.custody)
      out.push(`| ${c.fileName} | ${c.sourceClass} | ${c.sha256} | ${c.status} |`);
    out.push("");
  }

  return out.join("\n");
}
