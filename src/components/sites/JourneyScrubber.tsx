// Module B — the scan journey. Why site-level yield needs all three feeds,
// joined. Front-end only — no engine math. Reads timings from pins.ts.
//
// A scrubber over days since the scan (date_of_service = day 0).
// Three lanes — workflow, production, billing — with events landing at their
// real times. Fields accrete into ONE canonical record (the engine's Fact).
// Each field tagged with maturity_class + matured flag. The record badge
// reflects which window we're in: PENDING-CAPTURE, PENDING, or PAID.
//
// Payoff: a "yield by site = workflow·site + production·wRVU + billing·paid$"
// strip — each feed lights solid only when its data has landed AND matured.

import { useState } from "react";
import {
  TIMING_PINS,
  CANONICAL_FIELDS,
  type CanonicalFieldSpec,
} from "../../lib/sites/pins";

const SCRUB_MAX = 100;

type RecordState = "PENDING-CAPTURE" | "PENDING" | "PAID · RECONCILED";

function recordState(day: number): RecordState {
  if (day < TIMING_PINS.charge_lag_days) return "PENDING-CAPTURE";
  if (day < TIMING_PINS.maturity_window_days_N) return "PENDING";
  return "PAID · RECONCILED";
}

function stateNote(state: RecordState): string {
  switch (state) {
    case "PENDING-CAPTURE":
      return `Inside the charge-lag (< ${TIMING_PINS.charge_lag_days}d). A read with no charge yet is not lost work — billing hasn't spoken.`;
    case "PENDING":
      return `Charge in, payment not realized. Not a denial — still inside the ${TIMING_PINS.maturity_window_days_N}-day maturity window.`;
    case "PAID · RECONCILED":
      return "All three feeds landed and matured. Yield by site is computable for this record.";
  }
}

export function JourneyScrubber() {
  const [day, setDay] = useState(0);

  const fieldsByLane: Record<"workflow" | "production" | "billing", CanonicalFieldSpec[]> = {
    workflow: CANONICAL_FIELDS.filter((f) => f.lane === "workflow"),
    production: CANONICAL_FIELDS.filter((f) => f.lane === "production"),
    billing: CANONICAL_FIELDS.filter((f) => f.lane === "billing"),
  };

  // A feed is "landed AND matured" when day >= its furthest emit_day for the
  // maturity class that completes that feed. Workflow + production mature on
  // emit. Billing matures at the payment-realized window.
  const workflowReady = day >= 0;
  const productionReady = day >= 1;
  const chargeIn = day >= TIMING_PINS.charge_lag_days;
  const paymentMatured = day >= TIMING_PINS.maturity_window_days_N;
  const billingReady = paymentMatured;

  const allThree = workflowReady && productionReady && billingReady;

  const state = recordState(day);

  return (
    <section
      aria-labelledby="journey-title"
      className="rounded-md border border-ink/15 bg-paper p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-ink/55">
            The scan journey · why yield-by-site needs all three feeds
          </div>
          <h2 id="journey-title" className="font-display mt-1 text-xl text-ink">
            You're already generating the data. You're just not seeing it.
          </h2>
        </div>
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
          charge_lag {TIMING_PINS.charge_lag_days}d · maturity{" "}
          {TIMING_PINS.maturity_window_days_N}d
        </div>
      </div>

      {/* Scrubber */}
      <div className="mt-4">
        <label className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
          Days since the scan · date_of_service = day 0
        </label>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={SCRUB_MAX}
            step={1}
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className="flex-1 accent-[var(--ink)]"
            aria-label="Days since the scan"
          />
          <div className="font-mono-tab w-16 text-right text-sm text-ink">
            day {day}
          </div>
        </div>
        <Axis />
      </div>

      {/* Three lanes */}
      <div className="mt-5 space-y-3">
        <Lane
          name="workflow"
          fields={fieldsByLane.workflow}
          day={day}
          ready={workflowReady}
        />
        <Lane
          name="production"
          fields={fieldsByLane.production}
          day={day}
          ready={productionReady}
        />
        <Lane
          name="billing"
          fields={fieldsByLane.billing}
          day={day}
          ready={billingReady}
          midNote={
            !chargeIn
              ? undefined
              : !paymentMatured
                ? "charge in · payment not yet realized"
                : undefined
          }
        />
      </div>

      {/* Canonical record */}
      <div className="mt-5 rounded border border-ink/15 bg-ink/[0.02] p-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
            Canonical Fact · keyed on accession + date_of_service
          </div>
          <StateBadge state={state} />
        </div>
        <div className="font-mono-tab mt-2 grid grid-cols-1 gap-y-1 text-[11.5px] md:grid-cols-2">
          {CANONICAL_FIELDS.map((f) => {
            const landed = day >= f.emit_day;
            const matured =
              landed &&
              (f.maturity_class !== "payment_realized" || paymentMatured);
            return (
              <div
                key={f.key}
                className="flex items-baseline justify-between gap-3"
                style={{ opacity: landed ? 1 : 0.35 }}
              >
                <span className="text-ink/85">
                  <span className="text-ink/45">{f.lane[0]}·</span> {f.label}
                </span>
                <span className="text-[10px] text-ink/55">
                  {landed ? (matured ? "matured" : "landed · pending") : "—"} ·{" "}
                  {f.maturity_class}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[10.5px] leading-relaxed text-ink/65">
          {stateNote(state)}
        </p>
      </div>

      {/* Yield-by-site strip */}
      <div className="mt-5">
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
          Yield by site · workflow·site + production·wRVU + billing·paid$
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <FeedTile label="workflow · site" lit={workflowReady} />
          <FeedTile label="production · wRVU" lit={productionReady} />
          <FeedTile label="billing · paid$" lit={billingReady} />
        </div>
        <div
          className="font-mono-tab mt-2 text-[11.5px]"
          style={{ color: allThree ? "var(--teal)" : "rgba(14,27,44,0.65)" }}
        >
          yield by site ·{" "}
          {allThree
            ? "computable — all three feeds landed and matured"
            : "not yet · two of three is not yield"}
        </div>
        <div className="mt-1 text-[10.5px] text-ink/55">
          Until all three land and mature, the site's provenance stays the
          dashed-three (modeled), not filled-three (measured).
        </div>
      </div>
    </section>
  );
}

function Axis() {
  // Markers at 0, charge_lag, maturity, SCRUB_MAX
  const stops = [
    { d: 0, label: "0" },
    { d: TIMING_PINS.charge_lag_days, label: `${TIMING_PINS.charge_lag_days}d` },
    { d: TIMING_PINS.maturity_window_days_N, label: `${TIMING_PINS.maturity_window_days_N}d` },
    { d: SCRUB_MAX, label: `${SCRUB_MAX}d` },
  ];
  return (
    <div className="relative mt-1 h-4">
      {stops.map((s) => {
        const pct = (s.d / SCRUB_MAX) * 100;
        return (
          <span
            key={s.d}
            className="font-mono-tab absolute -translate-x-1/2 text-[9.5px] uppercase tracking-[0.12em] text-ink/45"
            style={{ left: `${pct}%`, top: 0 }}
          >
            {s.label}
          </span>
        );
      })}
    </div>
  );
}

function Lane({
  name,
  fields,
  day,
  ready,
  midNote,
}: {
  name: "workflow" | "production" | "billing";
  fields: CanonicalFieldSpec[];
  day: number;
  ready: boolean;
  midNote?: string;
}) {
  return (
    <div className="rounded border border-ink/10 bg-paper p-2">
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-mono-tab text-[10px] uppercase tracking-[0.14em] text-ink/55">
          {name}
        </div>
        <div
          className="font-mono-tab text-[10px] uppercase tracking-[0.12em]"
          style={{ color: ready ? "var(--teal)" : "rgba(14,27,44,0.45)" }}
        >
          {ready ? "matured" : "pending"}
        </div>
      </div>
      <div className="relative mt-2 h-7">
        {/* track */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink/15" />
        {fields.map((f) => {
          const landed = day >= f.emit_day;
          const pct = (f.emit_day / SCRUB_MAX) * 100;
          return (
            <span
              key={f.key}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${pct}%` }}
              title={`${f.label} · day ${f.emit_day} · ${f.maturity_class}`}
            >
              <span
                className="block h-2.5 w-2.5 rounded-full"
                style={{
                  background: landed
                    ? "var(--ink)"
                    : "transparent",
                  border: "1px solid var(--ink)",
                  opacity: landed ? 1 : 0.45,
                }}
              />
            </span>
          );
        })}
      </div>
      {midNote ? (
        <div className="font-mono-tab mt-1 text-[10px] text-ink/55">
          {midNote}
        </div>
      ) : null}
    </div>
  );
}

function FeedTile({ label, lit }: { label: string; lit: boolean }) {
  return (
    <div
      className={`rounded border p-2 ${lit ? "border-[var(--teal)]" : "border-dashed border-ink/35"}`}
      style={{
        background: lit
          ? "color-mix(in oklab, var(--teal) 14%, var(--paper))"
          : "var(--paper)",
      }}
    >
      <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/70">
        {label}
      </div>
      <div
        className="font-mono-tab mt-0.5 text-[10px]"
        style={{ color: lit ? "var(--teal)" : "rgba(14,27,44,0.45)" }}
      >
        {lit ? "solid" : "pending"}
      </div>
    </div>
  );
}

function StateBadge({ state }: { state: RecordState }) {
  const tone =
    state === "PAID · RECONCILED"
      ? "var(--teal)"
      : state === "PENDING-CAPTURE"
        ? "rgba(14,27,44,0.55)"
        : "var(--gold, #C2902B)";
  return (
    <span
      className="font-mono-tab inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]"
      style={{ color: tone, borderColor: tone }}
    >
      {state}
    </span>
  );
}
