import { createFileRoute, Link } from "@tanstack/react-router";
import { routeMeta } from "../lib/site";
import { STAGES } from "../lib/provenance/stages";
import { ProvenanceStamp } from "../components/record/ProvenanceStamp";
import type { ProvenanceType } from "../lib/provenance/algebra";

export const Route = createFileRoute("/method")({
  head: () => ({
    meta: [
      { title: "Method — how a figure earns its label" },
      {
        name: "description",
        content:
          "The provenance algebra behind every number: record, record-derived, counterfactual, model-derived, gap, contradiction. Unknown is not zero.",
      },
      { property: "og:title", content: "Method — how a figure earns its label" },
      {
        property: "og:description",
        content:
          "Six labels, one rule set. A model assumption may fill a gap. It may never overwrite a record fact.",
      },
      { property: "og:type", content: "article" },
      ...routeMeta("/method").meta,
    ],
    links: routeMeta("/method").links,
  }),
  component: MethodPage,
});

const LABELS: {
  type: ProvenanceType;
  meaning: string;
  example: string;
}[] = [
  {
    type: "record",
    meaning:
      "A value read directly off a source artefact. A charge on an 837 line. A paid amount on an 835. A deposit on a bank statement.",
    example: "Payer paid $412.18 on claim line 88431-2, per remits_835.csv.",
  },
  {
    type: "record_derived",
    meaning:
      "Arithmetic over record facts only. No assumption enters. If any input is unknown, the result becomes a gap rather than a smaller number.",
    example: "Realized $/wRVU = payer dollars received ÷ mapped work units.",
  },
  {
    type: "counterfactual",
    meaning:
      "A record fact combined with a declared assumption. Always carries the assumption in plain words and the document that would replace it with a fact.",
    example:
      "If the unresolved lines paid at the record's median ratio, they would be worth $X.",
  },
  {
    type: "model_derived",
    meaning:
      "Arithmetic over assumptions only. Useful for planning. Never admissible as a statement about what happened.",
    example: "Projected collections at an assumed 4% volume growth.",
  },
  {
    type: "gap",
    meaning:
      "A required input the record does not establish. Rendered as a gap, never as zero, and always paired with the act that would close it.",
    example:
      "No remittance on record for 216 claim lines. Closes on: the 835 for those lines.",
  },
  {
    type: "contradiction",
    meaning:
      "Two sources establish incompatible facts. The conflict is displayed, not resolved by preference.",
    example: "The 837 names payer A on a line the 835 attributes to payer B.",
  },
];

const RULES = [
  ["RECORD + RECORD", "RECORD-DERIVED"],
  ["RECORD + MODEL", "COUNTERFACTUAL"],
  ["MODEL + MODEL", "MODEL-DERIVED"],
  ["any required input missing", "GAP"],
  ["any unresolved conflict", "CONTRADICTION"],
];

function MethodPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55">
          Method
        </p>
        <h1 className="font-display mt-2 text-3xl leading-tight text-ink sm:text-4xl">
          How a figure earns its label.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink/75">
          A number is not a fact because it appears on a slide. It is a fact
          because you can name the artefact it came from and the operations
          performed on it. Every figure on this site carries a stamp saying which
          it is. The stamps are computed by rule, not chosen by an author.
        </p>
      </header>

      <section className="mt-10 border-t border-ink/12 pt-6">
        <h2 className="font-display text-2xl text-ink">The three standing rules</h2>
        <ol className="mt-4 space-y-4 text-[15px] leading-relaxed text-ink/80">
          <li>
            <span className="font-medium text-ink">
              A model assumption may fill a gap. It may never overwrite a record
              fact.
            </span>{" "}
            Where the record speaks, the model is silent.
          </li>
          <li>
            <span className="font-medium text-ink">Unknown is not zero.</span> A
            missing payment is not a payment of nothing. Treating it as zero turns
            an open question into a settled loss.
          </li>
          <li>
            <span className="font-medium text-ink">
              Every "if" points at the act that would make it an "is."
            </span>{" "}
            A counterfactual without a named closing document is decoration.
          </li>
        </ol>
      </section>

      <section className="mt-10 border-t border-ink/12 pt-6">
        <h2 className="font-display text-2xl text-ink">The six labels</h2>
        <div className="mt-5 space-y-5">
          {LABELS.map((l) => (
            <div key={l.type} className="rounded-lg border border-ink/12 bg-paper p-4">
              <ProvenanceStamp type={l.type} />
              <p className="mt-2.5 text-[14px] leading-relaxed text-ink/80">{l.meaning}</p>
              <p className="mt-2 font-mono text-[11.5px] leading-relaxed text-ink/55">
                {l.example}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 border-t border-ink/12 pt-6">
        <h2 className="font-display text-2xl text-ink">The algebra</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink/70">
          Combining figures produces a label by rule. A derived figure cannot be
          cleaner than its dirtiest input.
        </p>
        <table className="mt-4 w-full text-left text-sm">
          <tbody>
            {RULES.map(([lhs, rhs]) => (
              <tr key={lhs} className="border-t border-ink/10">
                <td className="py-2.5 pr-4 text-ink/75">{lhs}</td>
                <td className="w-[1%] py-2.5 pr-4 text-ink/35">→</td>
                <td className="py-2.5 font-mono text-[11.5px] uppercase tracking-[0.1em] text-ink">
                  {rhs}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-[14px] leading-relaxed text-ink/70">
          Governed totals go further. A counterfactual or model figure is refused
          entry to a total outright — not folded in quietly. Where some inputs are
          unknown, the total is reported as partial and says how many inputs it
          excluded.
        </p>
      </section>

      <section className="mt-10 border-t border-ink/12 pt-6">
        <h2 className="font-display text-2xl text-ink">Match states</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink/70">
          At every handoff — work to claim, claim to remittance, remittance to
          cash — a link is recorded in one of five states. Collapsing them into a
          boolean is how a break disappears.
        </p>
        <ul className="mt-4 space-y-2 text-[14px] leading-relaxed text-ink/80">
          <li>
            <span className="font-mono text-[12px] uppercase tracking-[0.08em]">matched</span> —
            exactly one counterpart on the record.
          </li>
          <li>
            <span className="font-mono text-[12px] uppercase tracking-[0.08em]">unmatched</span> —
            no counterpart. A gap, with a named closing document.
          </li>
          <li>
            <span className="font-mono text-[12px] uppercase tracking-[0.08em]">ambiguous</span> —
            more than one candidate counterpart, no basis to choose.
          </li>
          <li>
            <span className="font-mono text-[12px] uppercase tracking-[0.08em]">contradictory</span> —
            counterparts exist and disagree on a material field.
          </li>
          <li>
            <span className="font-mono text-[12px] uppercase tracking-[0.08em]">not_applicable</span> —
            the link is not expected for this row.
          </li>
        </ul>
      </section>

      <section className="mt-10 border-t border-ink/12 pt-6">
        <h2 className="font-display text-2xl text-ink">The intake ladder</h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink/70">
          Sources arrive on rungs. Each rung adds a class of evidence and buys
          more resolution. It never rewrites the rung below it: a later file can
          explain a difference the earlier stage found, but it cannot make that
          difference disappear.
        </p>
        <ol className="mt-4 space-y-4">
          {STAGES.map((s) => (
            <li key={s.id} className="border-l-2 border-ink/15 pl-4">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink/50">
                Stage {s.n}
              </p>
              <p className="mt-1 text-[15px] text-ink">{s.label}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink/70">
                Establishes: {s.establishes.join("; ")}.
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink/55">
                Cannot establish: {s.cannotEstablish.join("; ")}.
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10 border-t border-ink/12 pt-6">
        <h2 className="font-display text-2xl text-ink">Four rules the engine enforces</h2>
        <dl className="mt-4 space-y-4 text-[14px] leading-relaxed">
          <div>
            <dt className="text-ink">No row is swallowed.</dt>
            <dd className="mt-1 text-ink/70">
              Every claim line, encounter, deposit and remittance row lands in
              exactly one visible class, and the classes are required to sum to
              the population that entered. A row that fails a join, a lookup or a
              constraint is parked and counted — never dropped, never rounded
              into a neighbouring bucket.
            </dd>
          </div>
          <div>
            <dt className="text-ink">Cash and remittance are separate evidence.</dt>
            <dd className="mt-1 text-ink/70">
              A remittance is the payer's account of itself. A deposit is money.
              Neither is used to prove the other. The EFT trace is the only join,
              and its cardinality is stated rather than assumed one-to-one.
            </dd>
          </div>
          <div>
            <dt className="text-ink">Money is handled in whole cents.</dt>
            <dd className="mt-1 text-ink/70">
              Every reconciliation is carried out in integer cents, so a closure
              either holds exactly or reports its remainder. Nothing closes
              because of a rounding tolerance.
            </dd>
          </div>
          <div>
            <dt className="text-ink">Unknown identities stay unknown.</dt>
            <dd className="mt-1 text-ink/70">
              An unrecognised payer, facility or place of service resolves to
              unresolved, not to the most common value. A code with no reference
              work unit is marked uncovered and excluded from the denominator —
              it is never counted as zero work.
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-10 border-t border-ink/12 pt-6">
        <h2 className="font-display text-2xl text-ink">Repairs and elections</h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink/70">
          Deterministic cleanup is allowed. Silent cleanup is not. Stripping a
          dollar sign, reading parentheses as a negative, trimming whitespace —
          each one is written to a repair log with the original text, the
          normalised text and the rule that changed it, and each repaired row is
          labelled as repaired rather than clean.
        </p>
        <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-ink/70">
          A load-bearing choice — which bank rows count as professional
          collections, how an unknown payer is treated — is an election. It is
          declared with a definition, a status and an author. An election may
          fill a gap. It may never overwrite a record fact, and it is stamped
          COUNTERFACTUAL wherever it touches a number.
        </p>
      </section>



      <section className="mt-10 border-t border-ink/12 pt-6">
        <h2 className="font-display text-2xl text-ink">Where the data lives</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink/70">
          Postgres runs in the browser tab, compiled to WebAssembly. Files are
          parsed and queried on the machine in front of you and discarded on
          reload. There is no server, no account, and no upload. The bundled
          demonstration set is synthetic. Real claim data belongs on hardware you
          control, running the same engine from a fork.
        </p>
        <p className="mt-4 text-[14px]">
          <Link
            to="/record"
            className="text-[var(--gold)] underline decoration-[color-mix(in_oklab,var(--gold)_45%,transparent)] underline-offset-[3px] hover:decoration-[var(--gold)]"
          >
            See it applied to a record →
          </Link>
        </p>
      </section>
    </main>
  );
}
