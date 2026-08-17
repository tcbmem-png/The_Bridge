import { DOMAIN_QUESTIONS, TECHNICAL_QUESTIONS, type Question } from "../../lib/intake/questions";
import { elect, type PracticeConfig } from "../../lib/intake/config";

function QuestionCard({
  q,
  cfg,
  onChange,
  multi,
}: {
  q: Question;
  cfg: PracticeConfig;
  onChange: (next: PracticeConfig) => void;
  multi: boolean;
}) {
  const current = cfg[q.id]?.values ?? [];

  const toggle = (value: string) => {
    const next = multi
      ? current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      : current[0] === value
        ? []
        : [value];
    onChange(elect(cfg, q.id, next, cfg[q.id]?.note));
  };

  return (
    <li className="border-t border-ink/12 py-5">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-mono-tab text-[11px] text-ink/45">
          {q.kind === "domain" ? "D" : "T"}
          {q.n}
        </span>
        <h4 className="max-w-[58ch] font-display text-[17px] leading-snug">{q.prompt}</h4>
      </div>
      <p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed text-ink/65">{q.why}</p>

      <div className="mt-3 flex flex-col gap-2">
        {q.choices.map((c) => {
          const on = current.includes(c.value);
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => toggle(c.value)}
              aria-pressed={on}
              className={`rounded-md border px-3 py-2 text-left transition-colors ${
                on
                  ? "border-[var(--teal)]/55 bg-[color-mix(in_oklab,var(--teal)_7%,transparent)]"
                  : "border-ink/15 hover:border-ink/35"
              }`}
            >
              <span className="block text-[14px] text-ink">{c.label}</span>
              <span className="mt-0.5 block text-[12px] leading-snug text-ink/60">
                {on ? c.consequence : ""}
              </span>
            </button>
          );
        })}
      </div>

      {current.length === 0 ? (
        <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.11em] text-ink/45">
          Unanswered · GAP — withholds: {q.gates.join(" · ")}
        </p>
      ) : (
        q.allowsNote && (
          <input
            type="text"
            value={cfg[q.id]?.note ?? ""}
            onChange={(e) => onChange(elect(cfg, q.id, current, e.target.value))}
            placeholder="Anything the choices above don't capture — stored verbatim"
            className="mt-2 w-full rounded-md border border-ink/15 bg-paper px-3 py-1.5 text-[13px] text-ink placeholder:text-ink/35"
          />
        )
      )}
    </li>
  );
}

export function PracticeQuestionnaire({
  cfg,
  onChange,
}: {
  cfg: PracticeConfig;
  onChange: (next: PracticeConfig) => void;
}) {
  return (
    <section className="mt-10">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55">
        Practice configuration
      </h3>
      <p className="mt-2 max-w-[62ch] text-sm text-ink/70">
        Twelve questions. The first six decide what a figure <em>means</em> for this
        group; the last six decide which sources can actually be produced. Nothing
        here is a default — an unanswered question stays a declared gap, and every
        figure that depends on it inherits that gap rather than a guess.
      </p>

      <h4 className="mt-7 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink/45">
        Domain — what the figures mean here
      </h4>
      <ul>
        {DOMAIN_QUESTIONS.map((q) => (
          <QuestionCard
            key={q.id}
            q={q}
            cfg={cfg}
            onChange={onChange}
            multi={q.id === "segment_axes"}
          />
        ))}
      </ul>

      <h4 className="mt-8 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink/45">
        Technical — what can actually be produced
      </h4>
      <ul>
        {TECHNICAL_QUESTIONS.map((q) => (
          <QuestionCard key={q.id} q={q} cfg={cfg} onChange={onChange} multi={false} />
        ))}
      </ul>
    </section>
  );
}
