// The practice configuration object. Session-only, like everything else here:
// it lives in this tab and is gone when the tab closes.
//
// An answer is an ELECTION: the group asserts how its own economics work. The
// record carries the election alongside every figure it touches, so a reader
// can see not just the number but the rule under which it is a number at all.

import {
  ALL_QUESTIONS,
  DOMAIN_QUESTIONS,
  TECHNICAL_QUESTIONS,
  questionById,
  type PracticeConfigKey,
  type Question,
} from "./questions";

export interface Election {
  /** Chosen choice values. Question 4 (segment axes) is multi-select. */
  values: string[];
  note?: string;
  /** When the election was made, for the custody log. */
  at: string;
}

export type PracticeConfig = Partial<Record<PracticeConfigKey, Election>>;

export interface ConfigGap {
  id: PracticeConfigKey;
  prompt: string;
  gates: string[];
}

const KEY = "bridge.practice-config.v1";

export function loadConfig(): PracticeConfig {
  if (typeof sessionStorage === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PracticeConfig) : {};
  } catch {
    return {};
  }
}

export function saveConfig(cfg: PracticeConfig): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {
    /* session storage unavailable — the config simply stays in memory */
  }
}

export function clearConfig(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(KEY);
}

export function elect(
  cfg: PracticeConfig,
  id: PracticeConfigKey,
  values: string[],
  note?: string,
): PracticeConfig {
  const next = { ...cfg };
  if (values.length === 0 && !note) delete next[id];
  else next[id] = { values, note, at: new Date().toISOString() };
  return next;
}

/** Unanswered questions, in fixed order. Each is a declared gap, not a default. */
export function configGaps(cfg: PracticeConfig): ConfigGap[] {
  return ALL_QUESTIONS.filter((q) => !cfg[q.id] || cfg[q.id]!.values.length === 0).map((q) => ({
    id: q.id,
    prompt: q.prompt,
    gates: q.gates,
  }));
}

/** Figures currently gated by an unanswered question, deduped and sorted. */
export function gatedFigures(cfg: PracticeConfig): { figure: string; by: PracticeConfigKey[] }[] {
  const map = new Map<string, PracticeConfigKey[]>();
  for (const g of configGaps(cfg))
    for (const f of g.gates) map.set(f, [...(map.get(f) ?? []), g.id]);
  return [...map.entries()]
    .map(([figure, by]) => ({ figure, by }))
    .sort((a, b) => a.figure.localeCompare(b.figure));
}

/** Answered-question count, split by half. Credit-forward, never a deficit. */
export function configProgress(cfg: PracticeConfig) {
  const done = (qs: Question[]) => qs.filter((q) => (cfg[q.id]?.values.length ?? 0) > 0).length;
  return {
    domain: { answered: done(DOMAIN_QUESTIONS), total: DOMAIN_QUESTIONS.length },
    technical: { answered: done(TECHNICAL_QUESTIONS), total: TECHNICAL_QUESTIONS.length },
    total: { answered: done(ALL_QUESTIONS), total: ALL_QUESTIONS.length },
  };
}

export interface OntologyRow {
  id: PracticeConfigKey;
  question: string;
  reading: string;
  /** What the record now commits to, as a consequence of this election. */
  consequences: string[];
  note?: string;
  answered: boolean;
}

/**
 * The ontology review: the group's own economics, read back in plain language
 * before any figure is computed under them. Every row is reversible.
 */
export function ontology(cfg: PracticeConfig): OntologyRow[] {
  return ALL_QUESTIONS.map((q) => {
    const e = cfg[q.id];
    if (!e || e.values.length === 0) {
      return {
        id: q.id,
        question: q.prompt,
        reading: "Not elected — GAP",
        consequences: [`Withheld until elected: ${q.gates.join("; ")}.`],
        answered: false,
      };
    }
    const chosen = q.choices.filter((c) => e.values.includes(c.value));
    return {
      id: q.id,
      question: q.prompt,
      reading: chosen.map((c) => c.label).join(" + "),
      consequences: chosen.map((c) => c.consequence),
      note: e.note,
      answered: true,
    };
  });
}

/** The economically meaningful axes the group elected, in question order. */
export function electedAxes(cfg: PracticeConfig): string[] {
  const e = cfg.segment_axes;
  if (!e) return [];
  const q = questionById("segment_axes");
  return q.choices.filter((c) => e.values.includes(c.value)).map((c) => c.value);
}
