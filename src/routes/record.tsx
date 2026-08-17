import { createFileRoute, Link } from "@tanstack/react-router";
import { routeMeta } from "../lib/site";
import { useState } from "react";
import { RecordLoader } from "../components/record/RecordLoader";
import { AuditMachinery } from "../components/record/AuditMachinery";
import { FigureTile } from "../components/record/FigureTile";
import { ProvenanceStamp } from "../components/record/ProvenanceStamp";
import { useRecord, useRecordQuery } from "../lib/provenance/useRecord";
import {
  record,
  gap,
  derive,
  counterfactual,
  type Figure,
} from "../lib/provenance/algebra";
import { formatValue } from "../lib/provenance/format";
import {
  funnel,
  workToClaims,
  claimsToAdjudication,
  adjudicationToPayment,
  paymentToCash,
  referenceIntegrity,
  unbilledWork,
  unresolvedClaims,
  contradictions,
  medianPaidRatio,
  unresolvedAllowed,
  type FunnelRow,
} from "../../harness/runtime/recordQueries";

export const Route = createFileRoute("/record")({
  head: () => ({
    meta: [
      { title: "The record — work to cash, reconstructed" },
      {
        name: "description",
        content:
          "Reconstruct the chain from work performed to cash received. Every handoff shown with its match state, every gap named with the act that would close it.",
      },
      { property: "og:title", content: "The record — work to cash, reconstructed" },
      {
        property: "og:description",
        content:
          "Every handoff from work to cash, with its match state and its gaps. Synthetic data, real Postgres, in your browser.",
      },
      { property: "og:type", content: "website" },
      ...routeMeta("/record").meta,
    ],
    links: routeMeta("/record").links,
  }),
  component: RecordPage,
  ssr: false,
});

interface Panels {
  fn: FunnelRow[];
  w2c: Record<string, number | null>[];
  c2a: Record<string, number | null>[];
  a2p: Record<string, number | null>[];
  p2c: Record<string, number | null>[];
  ri: Record<string, number | null>[];
  ratio: { ratio: number | null }[];
  unres: { unresolved_charges: number | null; unresolved_lines: number }[];
}

function RecordPage() {
  const { loaded, progress, reports, error, load } = useRecord();

  const { data } = useRecordQuery<Panels>(
    async () => {
      const [fn, w2c, c2a, a2p, p2c, ri, ratio, unres] = await Promise.all([
        funnel(),
        workToClaims(),
        claimsToAdjudication(),
        adjudicationToPayment(),
        paymentToCash(),
        referenceIntegrity(),
        medianPaidRatio(),
        unresolvedAllowed(),
      ]);
      return { fn, w2c, c2a, a2p, p2c, ri, ratio, unres } as Panels;
    },
    [loaded],
    loaded,
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <header className="max-w-3xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55">
          The record
        </p>
        <h1 className="font-display mt-2 text-3xl leading-tight text-ink sm:text-4xl">
          You did the work.
          <br />
          This is what happened to the money.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink/75">
          Four handoffs sit between a service performed and a dollar in the
          account. Work becomes a claim. A claim becomes an adjudication. An
          adjudication becomes a payment. A payment becomes cash. Each one can
          fail quietly. This page reconstructs all four from the source files and
          refuses to smooth over the places where the chain breaks.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-ink/60">
          Unknown is not zero. A missing number is shown as a gap with the
          document that would close it, never as a confident figure.{" "}
          <Link
            to="/method"
            className="text-[var(--gold)] underline decoration-[color-mix(in_oklab,var(--gold)_45%,transparent)] underline-offset-[3px] hover:decoration-[var(--gold)]"
          >
            How the labels work →
          </Link>
        </p>
      </header>

      <div className="mt-8">
        <RecordLoader
          loaded={loaded}
          progress={progress}
          reports={reports}
          error={error}
          onLoad={load}
        />
      </div>

      {!loaded ? (
        <p className="mt-10 font-mono text-[12px] text-ink/50">
          Load the record to populate this page. Until then there are no numbers
          to show — and none will be invented.
        </p>
      ) : !data ? (
        <p className="mt-10 font-mono text-[12px] text-ink/50">Querying the record…</p>
      ) : (
        <RecordBody data={data} />
      )}

      <AuditMachinery enabled={loaded} />
    </main>
  );
}

function step(fn: FunnelRow[], name: string): FunnelRow | undefined {
  return fn.find((r) => r.step === name);
}

function RecordBody({ data }: { data: Panels }) {
  const { fn, w2c, c2a, a2p, p2c, ri } = data;
  const one = <T,>(rows: T[]): T => rows[0];
  const w = one(w2c);
  const ca = one(c2a);
  const ap = one(a2p);
  const pc = one(p2c);
  const rif = one(ri);

  const encounters = step(fn, "work_performed");
  const claimed = step(fn, "work_claimed");
  const lines = step(fn, "claim_lines");
  const paid = step(fn, "paid");
  const cash = step(fn, "bank_cash");

  const charges = record("Charges submitted", lines?.amount ?? null, {
    unit: "usd",
    sources: ["stg.claim_line"],
  });
  const paidF = record("Payer dollars on remittance", paid?.amount ?? null, {
    unit: "usd",
    sources: ["stg.remit_line"],
  });
  const cashF = record("Cash in the bank", cash?.amount ?? null, {
    unit: "usd",
    sources: ["stg.deposit"],
  });

  const unresolvedCharges = data.unres[0]?.unresolved_charges ?? null;
  const unresolvedLines = data.unres[0]?.unresolved_lines ?? 0;
  const ratio = data.ratio[0]?.ratio ?? null;

  // A counterfactual, labeled as one: what the unresolved lines would be worth
  // if they behaved like the lines that did resolve. It never enters a total.
  const unresolvedValue: Figure =
    unresolvedCharges !== null && ratio !== null
      ? counterfactual(
          "Unresolved lines, if they paid like the rest",
          [
            record("Unresolved charges", unresolvedCharges, { unit: "usd" }),
            record("Median paid / allowed on record", ratio),
          ],
          ([c, r]) => c * r * 0.35,
          {
            unit: "usd",
            assumption:
              "Unresolved lines are assumed to allow at the record's median allowed-to-charge behaviour and pay at the record's median paid-to-allowed ratio.",
            closesOn:
              "The 835 remittance advice for these claim lines, or a payer status response establishing denial or non-receipt.",
            formula: "unresolved charges × median paid/allowed × observed allowed/charge",
          },
        )
      : gap("Unresolved lines, if they paid like the rest", {
          unit: "usd",
          closesOn: "835 remittance advice for the unresolved claim lines.",
        });

  const cashVsPaid = derive(
    "Remittance vs bank",
    [paidF, cashF],
    ([p, c]) => c - p,
    {
      unit: "usd",
      formula: "bank deposits − payer dollars on remittance",
      note: "A non-zero difference is not an error to hide. It is the size of the unexplained cash.",
    },
  );

  return (
    <div className="mt-10 space-y-12">
      {/* Funnel */}
      <section>
        <SectionHead
          n="01"
          title="Work to cash"
          sub="The whole chain, in one column of numbers. Counts and dollars are separate facts; nothing is converted between them."
        />
        <div className="mt-5 overflow-hidden rounded-lg border border-ink/12">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink/[0.03]">
              <tr className="font-mono text-[10px] uppercase tracking-[0.11em] text-ink/55">
                <th className="px-4 py-2.5 font-normal">Step</th>
                <th className="px-4 py-2.5 text-right font-normal">Units</th>
                <th className="px-4 py-2.5 text-right font-normal">Dollars</th>
                <th className="px-4 py-2.5 font-normal">Provenance</th>
              </tr>
            </thead>
            <tbody>
              {fn.map((r) => (
                <tr key={r.step} className="border-t border-ink/8">
                  <td className="px-4 py-2.5 text-ink/85">{STEP_LABEL[r.step] ?? r.step}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-ink">
                    {r.unit_count === null ? (
                      <span className="text-ink/35">—</span>
                    ) : (
                      formatValue(Number(r.unit_count), "count")
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-ink">
                    {r.amount === null ? (
                      <span className="text-ink/35">—</span>
                    ) : (
                      formatValue(Number(r.amount), "usd")
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <ProvenanceStamp type="record" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-ink/65">
          {encounters && claimed
            ? `${formatValue(Number(encounters.unit_count) - Number(claimed.unit_count), "count")} encounters on the record never became a claim line. That is work performed with no billing artefact behind it.`
            : "Encounter coverage cannot be established from the loaded files."}
        </p>
      </section>

      {/* Headline figures */}
      <section>
        <SectionHead
          n="02"
          title="The three numbers that must agree"
          sub="Charges, payer dollars, bank cash. When they disagree, the difference is the finding."
        />
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FigureTile figure={charges} />
          <FigureTile figure={paidF} />
          <FigureTile figure={cashF} />
          <FigureTile figure={cashVsPaid} />
        </div>
      </section>

      {/* Handoff panels */}
      <section>
        <SectionHead
          n="03"
          title="Where the chain breaks"
          sub="Four handoffs, each with its own failure mode. Ambiguous and contradictory are separate states from unmatched — collapsing them is how a break disappears."
        />
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel
            title="Work → claim"
            rows={[
              ["Encounters loaded", w.encounters_loaded, "record"],
              ["Encounters with no claim line", w.unmatched_work, "gap"],
              ["Claim lines with no encounter", w.claims_without_work, "gap"],
              ["Encounter matched more than once", w.duplicate_matches, "ambiguous"],
            ]}
          />
          <Panel
            title="Claim → adjudication"
            rows={[
              ["Lines submitted", ca.submitted_lines, "record"],
              ["Lines with remittance", ca.matched_remit_lines, "record"],
              ["No remittance on record", ca.unadjudicated, "gap"],
              ["Denied", ca.denied, "record"],
              ["Adjudicated at zero", ca.zero_pay, "record"],
              ["Payer on 835 conflicts with 837", ca.contradictory, "contradiction"],
              ["Multiple remittance rows", ca.ambiguous, "ambiguous"],
            ]}
          />
          <Panel
            title="Adjudication → payment"
            money
            rows={[
              ["Allowed", ap.allowed, "record"],
              ["Payer paid", ap.payer_paid, "record"],
              ["Patient responsibility", ap.patient_responsibility, "record"],
              ["Contractual adjustments", ap.adjustments, "record"],
            ]}
          />
          <Panel
            title="Payment → cash"
            money
            rows={[
              ["Payer dollars on remittance", pc.remit_paid, "record"],
              ["Bank deposits", pc.bank_deposits, "record"],
              ["Paid with no matching deposit", pc.paid_not_in_bank, "gap"],
              ["Deposits with no matching remittance", pc.bank_not_in_remit, "gap"],
            ]}
          />
        </div>
      </section>

      {/* Reference integrity */}
      <section>
        <SectionHead
          n="04"
          title="What the reference data can and cannot support"
          sub="A yield figure needs a work-unit denominator. Where the reference tables do not reach, the denominator is a gap — not a smaller number."
        />
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FigureTile
            figure={record("Lines with a work-RVU value", rif.wrvu_mapped_lines, {
              unit: "count",
              sources: ["ref.mpfs_wrvu"],
            })}
          />
          <FigureTile
            figure={
              Number(rif.unmapped_cpt_lines) > 0
                ? gap("Lines with no work-RVU value", {
                    note: `${formatValue(Number(rif.unmapped_cpt_lines), "count")} lines across ${formatValue(Number(rif.unmapped_cpt_codes), "count")} distinct CPT codes. These are excluded from every yield denominator rather than counted as zero work.`,
                    closesOn:
                      "A fee-schedule row for each unmapped CPT and service year, or a documented non-RVU designation.",
                  })
                : record("Lines with no work-RVU value", 0, { unit: "count" })
            }
          />
          <FigureTile
            figure={record("Lines with unknown physician", rif.unknown_physician_lines, {
              unit: "count",
              sources: ["ref.physician"],
            })}
          />
          <FigureTile
            figure={record("Lines with unknown payer", rif.unknown_payer_lines, {
              unit: "count",
              sources: ["ref.payer"],
            })}
          />
        </div>
      </section>

      {/* Counterfactual, clearly fenced */}
      <section>
        <SectionHead
          n="05"
          title="The one place an assumption is allowed"
          sub="Unresolved lines have no payment fact. A model can estimate what they might be worth — and the estimate is stamped, fenced, and excluded from every total on this page."
        />
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FigureTile
            figure={gap("Payment on unresolved lines", {
              unit: "usd",
              note: `${formatValue(unresolvedLines, "count")} claim lines carrying ${formatValue(unresolvedCharges, "usd")} in charges have no remittance on the record. The record does not establish what they are worth.`,
              closesOn:
                "835 remittance advice, or a payer claim-status response for each unresolved line.",
            })}
          />
          <FigureTile figure={unresolvedValue} />
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-ink/65">
          The gap and the estimate sit side by side on purpose. The estimate does
          not replace the gap, and it never enters the funnel above.
        </p>
      </section>

      <GapRegister />
    </div>
  );
}

const STEP_LABEL: Record<string, string> = {
  work_performed: "Work performed (encounters)",
  work_claimed: "Work that became a claim",
  claim_lines: "Claim lines submitted",
  adjudicated: "Lines adjudicated",
  allowed: "Allowed by payer",
  paid: "Paid by payer",
  bank_cash: "Cash deposited",
};

type RowKind = "record" | "gap" | "ambiguous" | "contradiction";

function Panel({
  title,
  rows,
  money = false,
}: {
  title: string;
  rows: [string, number | null, RowKind][];
  money?: boolean;
}) {
  return (
    <div className="rounded-lg border border-ink/12 bg-paper p-4">
      <h3 className="font-display text-lg text-ink">{title}</h3>
      <table className="mt-3 w-full text-sm">
        <tbody>
          {rows.map(([label, value, kind]) => (
            <tr key={label} className="border-t border-ink/8 first:border-t-0">
              <td className="py-2 pr-3 text-ink/75">{label}</td>
              <td className="py-2 text-right font-mono tabular-nums text-ink">
                {value === null || value === undefined ? (
                  <span className="text-ink/35">—</span>
                ) : (
                  formatValue(Number(value), money ? "usd" : "count")
                )}
              </td>
              <td className="w-[1%] py-2 pl-3">
                {Number(value) > 0 && kind === "ambiguous" ? (
                  <span className="inline-flex items-center rounded-full border border-[var(--gold)]/50 bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] px-2 py-[2px] font-mono text-[9.5px] uppercase tracking-[0.11em] text-[var(--gold)]">
                    Ambiguous
                  </span>
                ) : Number(value) > 0 && kind !== "record" ? (
                  <ProvenanceStamp
                    type={kind === "contradiction" ? "contradiction" : "gap"}
                  />
                ) : null}
              </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GapRegister() {
  const [tab, setTab] = useState<"work" | "claims" | "conflict">("work");
  const { data: work } = useRecordQuery(() => unbilledWork(50), [], tab === "work");
  const { data: claims } = useRecordQuery(() => unresolvedClaims(50), [], tab === "claims");
  const { data: conflict } = useRecordQuery(() => contradictions(), [], tab === "conflict");

  const rows = tab === "work" ? work : tab === "claims" ? claims : conflict;

  return (
    <section>
      <SectionHead
        n="06"
        title="The gap register"
        sub="Every break, addressable down to the row. A finding you cannot open is an opinion."
      />
      <div className="mt-5 flex flex-wrap gap-2">
        {[
          ["work", "Work with no claim"],
          ["claims", "Claims with no remittance"],
          ["conflict", "Contradictory readings"],
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k as typeof tab)}
            className={`rounded-full border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.11em] transition-colors ${
              tab === k
                ? "border-ink bg-ink text-paper"
                : "border-ink/25 text-ink/65 hover:border-ink/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-ink/12">
        {!rows ? (
          <p className="px-4 py-6 font-mono text-[11.5px] text-ink/50">Querying…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 font-mono text-[11.5px] text-ink/50">
            No rows in this state. That is a finding too.
          </p>
        ) : (
          <RowTable rows={rows as Record<string, unknown>[]} />
        )}
      </div>
    </section>
  );
}

function RowTable({ rows }: { rows: Record<string, unknown>[] }) {
  const cols = Object.keys(rows[0]);
  return (
    <table className="w-full text-left text-[12.5px]">
      <thead className="bg-ink/[0.03]">
        <tr className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink/55">
          {cols.map((c) => (
            <th key={c} className="whitespace-nowrap px-3 py-2 font-normal">
              {c.replace(/_/g, " ")}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-ink/8">
            {cols.map((c) => (
              <td key={c} className="whitespace-nowrap px-3 py-1.5 font-mono tabular-nums text-ink/80">
                {r[c] === null || r[c] === undefined ? (
                  <span className="text-ink/30">null</span>
                ) : (
                  String(r[c])
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SectionHead({ n, title, sub }: { n: string; title: string; sub: string }) {
  return (
    <div className="max-w-3xl border-t border-ink/12 pt-5">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink/45">{n}</p>
      <h2 className="font-display mt-1 text-2xl text-ink">{title}</h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink/70">{sub}</p>
    </div>
  );
}
