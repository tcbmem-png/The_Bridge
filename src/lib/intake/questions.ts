// The practice configuration object.
//
// Twelve questions, in two halves. The first six are domain questions: they
// decide what a figure MEANS for this group. The second six are technical:
// they decide which sources can actually be produced, and in what order to
// ask for them.
//
// An unanswered question is not a default. It is a declared GAP, and every
// figure that depends on it inherits that gap.

export type QuestionKind = "domain" | "technical";

export interface Choice {
  value: string;
  label: string;
  /** What electing this answer commits the record to. */
  consequence: string;
}

export interface Question {
  id: PracticeConfigKey;
  kind: QuestionKind;
  n: number;
  prompt: string;
  /** Why the record cannot compute honestly without it. */
  why: string;
  /** Figures that inherit a GAP while this is unanswered. */
  gates: string[];
  choices: Choice[];
  /** Free-text elaboration is always allowed; it is stored verbatim. */
  allowsNote: boolean;
}

export type PracticeConfigKey =
  | "entity_key"
  | "remittance_route"
  | "pc_tc_global"
  | "segment_axes"
  | "bank_collection_rule"
  | "runout_maturity"
  | "clinical_export"
  | "claim_export"
  | "remit_export"
  | "bank_export"
  | "vendor_ledger"
  | "processed_report";

export const DOMAIN_QUESTIONS: Question[] = [
  {
    id: "entity_key",
    kind: "domain",
    n: 1,
    prompt: "What uniquely identifies a unit of physician work, and does that identity survive to the claim?",
    why: "Every match between work and claim runs on this key. If it does not survive the handoff, unbilled work cannot be distinguished from a join failure.",
    gates: ["work → claim match rate", "unbilled work", "work volume"],
    choices: [
      {
        value: "encounter_id_survives",
        label: "An encounter/accession ID that appears on the claim",
        consequence: "Work-to-claim is a direct join. An unmatched encounter is a real finding.",
      },
      {
        value: "composite",
        label: "No single ID — patient + date + code together",
        consequence:
          "Matching is composite and can be ambiguous. Ambiguous matches are reported as ambiguous, never resolved by preference.",
      },
      {
        value: "does_not_survive",
        label: "The clinical ID does not reach the claim at all",
        consequence:
          "Work-to-claim cannot be established from these sources. The step is a GAP until a crosswalk arrives.",
      },
    ],
    allowsNote: true,
  },
  {
    id: "remittance_route",
    kind: "domain",
    n: 2,
    prompt: "Does payer cash go directly to the group, or through an intermediary that nets fees or deductions?",
    why: "It decides whether remittance and bank cash are expected to agree. Netting makes a variance normal; direct pay makes the same variance a finding.",
    gates: ["remittance vs bank cash carve", "unexplained cash", "realized dollars per work unit"],
    choices: [
      {
        value: "direct",
        label: "Direct to the group's account, gross",
        consequence: "Remittance and bank cash should tie. Any residual is unexplained and stays unexplained.",
      },
      {
        value: "netted",
        label: "Through an intermediary that nets fees",
        consequence:
          "A remittance-to-cash variance is expected. Its size is still reported, and the fee schedule is the document that would close it.",
      },
      {
        value: "mixed",
        label: "Mixed by payer",
        consequence: "The carve is computed per payer; a single blended figure is withheld.",
      },
    ],
    allowsNote: true,
  },
  {
    id: "pc_tc_global",
    kind: "domain",
    n: 3,
    prompt: "How are professional, technical and global services represented for this group?",
    why: "Work units and realized dollars are not comparable across these components. Mixing them silently inflates or deflates dollars per work unit.",
    gates: ["dollars per work unit", "work-unit coverage", "CPT slice"],
    choices: [
      { value: "pc_only", label: "Professional component only", consequence: "Work units read as professional wRVU throughout." },
      { value: "global", label: "Global billing", consequence: "Technical revenue is inside the numerator; the ratio is labelled global, not professional." },
      { value: "mixed_modifier", label: "Mixed, distinguished by modifier", consequence: "Slices split on the modifier; lines without one are a gap, not an assumption." },
      { value: "unknown", label: "Not known yet", consequence: "Dollars per work unit renders as a GAP rather than a blended number." },
    ],
    allowsNote: true,
  },
  {
    id: "segment_axes",
    kind: "domain",
    n: 4,
    prompt: "Which distinctions actually matter economically to this group?",
    why: "Segments are the group's own economics, not a house taxonomy. The record slices on what the group says matters and names the rest unsliced.",
    gates: ["economics slices", "segment comparison"],
    choices: [
      { value: "payer", label: "Payer", consequence: "Payer becomes a primary axis; unknown payer lines are shown, not dropped." },
      { value: "physician", label: "Physician", consequence: "Physician becomes a primary axis; roster coverage is reported." },
      { value: "site", label: "Site / facility", consequence: "Site becomes a primary axis; unmapped facilities are shown." },
      { value: "service_family", label: "Service family", consequence: "Service family becomes a primary axis; unmapped CPTs are shown." },
    ],
    allowsNote: true,
  },
  {
    id: "bank_collection_rule",
    kind: "domain",
    n: 5,
    prompt: "Which bank rows count as professional collections?",
    why: "Cash is only a number once the classification rule is declared. An undeclared rule turns every cash figure into an opinion.",
    gates: ["bank cash", "work-to-cash gap", "collection rate"],
    choices: [
      { value: "payer_eft_only", label: "Payer EFT deposits only", consequence: "Patient payments and non-payer credits are excluded and counted separately." },
      { value: "payer_plus_patient", label: "Payer EFT plus patient payments", consequence: "Patient cash is inside collections; the remittance carve names the difference." },
      { value: "all_credits", label: "All credits into the professional account", consequence: "Non-clinical credits are inside the figure; the record labels it accordingly." },
    ],
    allowsNote: true,
  },
  {
    id: "runout_maturity",
    kind: "domain",
    n: 6,
    prompt: "How long does this group's claim and payment cycle run before a service period is considered mature?",
    why: "An immature period looks like lost money. Without a stated runout, recent months cannot be read at all.",
    gates: ["monthly trend", "collection rate", "claims without remittance"],
    choices: [
      { value: "d90", label: "90 days", consequence: "Periods inside 90 days are marked immature and excluded from trend claims." },
      { value: "d120", label: "120 days", consequence: "Periods inside 120 days are marked immature." },
      { value: "d180", label: "180 days", consequence: "Periods inside 180 days are marked immature." },
      { value: "unknown", label: "Not known", consequence: "No period is declared mature. Trend figures render as GAP." },
    ],
    allowsNote: true,
  },
];

const AVAILABILITY: Choice[] = [
  { value: "self_serve", label: "We can export it ourselves", consequence: "Requestable now — it goes at the front of the queue." },
  { value: "vendor_request", label: "Only by asking the vendor or hospital", consequence: "Requestable, with a lead time. The record states the ask in writing." },
  { value: "contested", label: "Asked before and not received", consequence: "Treated as contested. The gap it leaves is named with who holds the document." },
  { value: "unavailable", label: "Not available to us", consequence: "Everything downstream of it stays a permanent GAP until that changes." },
];

export const TECHNICAL_QUESTIONS: Question[] = [
  {
    id: "clinical_export",
    kind: "technical",
    n: 1,
    prompt: "Clinical work export — can the group produce a row per unit of work performed?",
    why: "Stage 1 cannot start without it. It is the only source that establishes what was done.",
    gates: ["work performed", "work units", "everything downstream"],
    choices: AVAILABILITY,
    allowsNote: true,
  },
  {
    id: "claim_export",
    kind: "technical",
    n: 2,
    prompt: "Claim-line export (837) — self-serve, by vendor request, or blocked?",
    why: "Without it, the difference between work and cash stays one tangled figure and is never carved.",
    gates: ["claim lifecycle", "carve of the work-to-cash gap"],
    choices: AVAILABILITY,
    allowsNote: true,
  },
  {
    id: "remit_export",
    kind: "technical",
    n: 3,
    prompt: "Remittance advice (835 / ERA) — can it be produced for the same period?",
    why: "It is the payer's own account. Nothing else establishes allowed, denied or adjusted.",
    gates: ["adjudication", "denial cause", "payer payment"],
    choices: AVAILABILITY,
    allowsNote: true,
  },
  {
    id: "bank_export",
    kind: "technical",
    n: 4,
    prompt: "Bank or treasury activity — is a transaction-level export available for the professional account?",
    why: "Cash is the only figure no intermediary authors. It is what the whole record ties back to.",
    gates: ["bank cash", "remittance vs cash carve"],
    choices: AVAILABILITY,
    allowsNote: true,
  },
  {
    id: "vendor_ledger",
    kind: "technical",
    n: 5,
    prompt: "Billing vendor raw ledger, posting detail, AR aging or denial worklist — obtainable?",
    why: "Only Stage 3 shows what was posted, written off, or left unworked between remittance and cash.",
    gates: ["write-offs", "posting variance", "unworked denials"],
    choices: AVAILABILITY,
    allowsNote: true,
  },
  {
    id: "processed_report",
    kind: "technical",
    n: 6,
    prompt: "The processed monthly report the group is actually shown — can it be exported as data?",
    why: "It is the story being told. Stage 4 tests it against the payer's account and the vendor's own ledger.",
    gates: ["report vs record comparison"],
    choices: AVAILABILITY,
    allowsNote: true,
  },
];

export const ALL_QUESTIONS: Question[] = [...DOMAIN_QUESTIONS, ...TECHNICAL_QUESTIONS];

export function questionById(id: PracticeConfigKey): Question {
  const q = ALL_QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(`unknown question: ${id}`);
  return q;
}
