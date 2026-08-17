import { ontology, type PracticeConfig } from "../../lib/intake/config";
import { ProvenanceStamp } from "../record/ProvenanceStamp";

/**
 * The practice ontology, read back before any figure is computed under it.
 * This is the group's own account of its economics — the record's job is to
 * repeat it plainly enough that a wrong reading is obvious on sight.
 */
export function OntologyReview({ cfg }: { cfg: PracticeConfig }) {
  const rows = ontology(cfg);
  const answered = rows.filter((r) => r.answered).length;

  return (
    <section className="mt-10">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55">
        Practice ontology — read it back
      </h3>
      <p className="mt-2 max-w-[62ch] text-sm text-ink/70">
        {answered} of {rows.length} elections made. This is how the record will read
        this group's economics. If a line is wrong, change the answer above — every
        election is reversible, and nothing is computed under a rule the group has
        not seen stated.
      </p>

      <ul className="mt-4">
        {rows.map((r) => (
          <li key={r.id} className="border-t border-ink/12 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <ProvenanceStamp type={r.answered ? "record" : "gap"} />
              <span className="font-mono-tab text-[13px] text-ink">{r.reading}</span>
            </div>
            <p className="mt-1 max-w-[64ch] text-[12.5px] leading-snug text-ink/60">{r.question}</p>
            <ul className="mt-1.5">
              {r.consequences.map((c, i) => (
                <li key={i} className="max-w-[64ch] text-[12.5px] leading-snug text-ink/75">
                  → {c}
                </li>
              ))}
            </ul>
            {r.note && (
              <p className="mt-1.5 max-w-[64ch] border-l-2 border-ink/15 pl-3 text-[12.5px] italic text-ink/65">
                {r.note}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
