// "A Tale of Two Numbers" — ported from the-instrument.html into the demo's
// chassis. Content is verbatim from the source; math is the verified engine
// computeTwoNumbers (do not re-derive). Illustrative only.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PracticeDashboard } from "@/components/stipend/PracticeDashboard";
import {
  PRACTICE_IMPACT_DEFAULTS,
  backfillFromLeft,
  computePracticeImpact,
} from "@/lib/stipend/practiceImpact";

export const Route = createFileRoute("/stipend")({
  head: () => ({
    meta: [
      { title: "A Tale of Two Numbers — ER Stipend" },
      {
        name: "description",
        content:
          "Illustrative two-number deficit method for ER coverage stipends.",
      },
      { property: "og:title", content: "A Tale of Two Numbers — ER Stipend" },
      {
        property: "og:description",
        content:
          "Illustrative two-number deficit method for ER coverage stipends.",
      },
    ],
  }),
  component: TwoNumbersPage,
});

/* ─── engine ─────────────────────────────────────────────────────────────── */

const AVOIDABLE_CAP = 0.3;

type EngineInputs = {
  baseColl: number; // ER collections baseline (one of the two numbers)
  baseWrvu: number; // ER wRVU baseline (the other)
  comp: number; // fair comp/wRVU
  ovh: number; // overhead/wRVU
  redep: number; // reclaimed time value /wRVU
  util: number; // 0..1
  cut: number; // 0..AVOIDABLE_CAP — fraction of TOTAL ER volume
};

function computeTwoNumbers(i: EngineInputs) {
  const fair = i.comp + i.ovh;
  const yld = i.baseWrvu > 0 ? i.baseColl / i.baseWrvu : 0;
  const deficit = fair - yld;
  const stipend = i.baseWrvu * deficit;

  const cut = Math.min(Math.max(i.cut, 0), AVOIDABLE_CAP);
  const wrvuP = i.baseWrvu * (1 - cut);
  const collP = i.baseColl * (1 - cut);
  const yieldP = wrvuP > 0 ? collP / wrvuP : 0;
  const stipendP = wrvuP * deficit;

  const removed = i.baseWrvu * cut;
  const hospSave = removed * deficit;
  // signed — sub-break-even redeploys read as a loss, not a wash
  const groupGain = i.util * removed * (i.redep - fair);
  const breakevenRedeploy = fair;

  return {
    fair,
    yld,
    deficit,
    stipend,
    wrvuP,
    collP,
    yieldP,
    stipendP,
    removed,
    hospSave,
    groupGain,
    breakevenRedeploy,
  };
}

/* ─── formatters ─────────────────────────────────────────────────────────── */

const fmtM = (x: number) =>
  (x < 0 ? "−$" : "$") + Math.abs(x / 1e6).toFixed(2) + "M";
const fmtNum = (x: number) => Math.round(x).toLocaleString("en-US");

/* ─── content (verbatim) ─────────────────────────────────────────────────── */

type SrcKey =
  | "twonums"
  | "onlygroup"
  | "mechanism"
  | "plugloss"
  | "adjustvol"
  | "reducewaste"
  | "zeromargin"
  | "riskshift";

const SRC: Record<
  SrcKey,
  { s: string; l?: [string, string][]; o?: string }
> = {
  twonums: {
    s: "The deficit method takes exactly two inputs — ER collections (your books) and ER wRVU (a public CPT→CMS lookup). Everything else is arithmetic or a published benchmark.",
    l: [
      [
        "FMV subsidy method (CBIZ)",
        "https://www.cbiz.com/insights/article/fair-market-value-challenges-in-subsidies-paid-by-hospitals-to-radiologists-for-radiology-services",
      ],
    ],
    o: "The only hard part is getting the two numbers auditably. Five properties make them defensible — claim-line billing with POS 23, a study-level export, the CMS wRVU map, reconciliation to your books, a measure you can re-run each period. For most groups that's a setting or an email, not an IT project — and the hospital can't build this at all, because it never sees professional collections. Open Data / Audit / Self-audit on the ○ card above.",
  },
  onlygroup: {
    s: "In a hospital setting the radiologist bills the professional component; the hospital receives the technical/facility side (OPPS/APC for ER outpatient; DRG is inpatient) and never sees professional collections. That's why only the group can build this number.",
    l: [
      [
        "Professional vs. technical billing (Noridian)",
        "https://med.noridianmedicare.com/web/jfa/provider-types/radiology/billing-professional-and-technical-components",
      ],
    ],
  },
  mechanism: {
    s: "Hospital coverage stipends are established and widely used — a fixed subsidy/stipend, or a collections guarantee — to cover a documented professional-collections shortfall relative to cost.",
    l: [
      [
        "Hospital coverage agreements (VMG)",
        "https://vmghealth.com/insights/blog/the-ins-and-outs-of-hospital-coverage-agreements/",
      ],
      [
        "Stipend vs. guarantee (Coker)",
        "https://cokergroup.com/collections-guarantee-or-stipend-that-is-the-question/",
      ],
    ],
  },
  plugloss: {
    s: "Funding the documented deficit is permitted, but the payment must be fair market value, commercially reasonable, set in advance, and not tied to the volume or value of referrals (Stark / Anti-Kickback).",
    l: [
      [
        "FMV standards (Holland & Hart)",
        "https://hhhealthlawblog.com/fmv-for-provider-contracts-regulatory-standards/",
      ],
      [
        "Stark / AKS (Baird Holm)",
        "https://www.bairdholm.com/blog/new-stark-anti-kickback-rules-changes-to-the-big-3-under-stark-fair-market-value-commercial-reasonableness-and-tie-to-referrals/",
      ],
    ],
  },
  adjustvol: {
    s: "Volume-indexed stipends with a periodic (every 1–2 year) true-up keep the subsidy at FMV as volume moves — the FMV-preferred structure.",
    l: [
      [
        "Coverage agreements / true-up (VMG)",
        "https://vmghealth.com/insights/blog/the-ins-and-outs-of-hospital-coverage-agreements/",
      ],
    ],
  },
  reducewaste: {
    s: "Reduction must be clinical, never about who pays — EMTALA mandates a medical screening regardless of ability to pay; appropriateness criteria target unnecessary imaging. Low-value imaging runs ~20–50% across systematic reviews, so the ~30% avoidable default sits inside the evidence range.",
    l: [
      [
        "EMTALA (CMS)",
        "https://www.cms.gov/medicare/regulations-guidance/legislation/emergency-medical-treatment-labor-act",
      ],
      [
        "Low-value imaging (review)",
        "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8449221/",
      ],
    ],
  },
  zeromargin: {
    s: "Break-even by design: the stipend tops ER coverage up to fair cost, so the group earns no margin on that slice — it neither loses on it nor profits from it. So shedding the avoidable part costs no profit, and it frees capacity that redeploys at the group's local non-ER yield. (Not 'collects nothing' — the tool holds yield at the blended ER rate.)",
    o: "freed wRVU 0–100% × local non-ER yield — open the Hospital drawer on the △ card above. Our model, illustrative; no external authority.",
  },
  riskshift: {
    s: "The shortfall traces to forces no group controls — years of Medicare conversion-factor erosion (the CF fell >10% from 2020–2025; CY2026 reversed slightly to $33.4009, +3.26%, so this is the historical driver, not a 2026 cut), shifting payer mix, and Medicaid / TennCare changes (~25M disenrolled in the 2023–24 unwinding).",
    l: [
      [
        "Medicare fee schedule (CMS)",
        "https://www.cms.gov/medicare/payment/fee-schedules/physician",
      ],
      [
        "Medicaid unwinding tracker (KFF)",
        "https://www.kff.org/medicaid/medicaid-enrollment-and-unwinding-tracker/",
      ],
    ],
  },
};

type TermKey = "coll" | "wrvu" | "yield" | "fair" | "deficit" | "stip";
// authority axis (NOT the FeedsGlyph): your books / counsel+valuator / CMS / arith
type Authority = "yours" | "counsel" | "cms" | "arith";

const DEF: Record<
  TermKey,
  { n: string; c: Authority; a: string; m: string; p: string[] }
> = {
  coll: {
    n: "ER collections",
    c: "yours",
    a: "Your professional billing record — the dollars actually collected on ER-originated studies. The number only you have. (In the volume lever, assumed to track wRVU so yield holds.)",
    m: "measured · Σ payments on ER claims",
    p: ["ER origin = place-of-service (POS 23) on the claim"],
  },
  wrvu: {
    n: "ER wRVU",
    c: "cms",
    a: "Your ER CPT codes run through the CMS Physician Fee Schedule (work-RVU column) — public, fixed, versioned.",
    m: "Σ (CPT → wRVU) for ER studies",
    p: ["CMS PFS version — CY2026, CF $33.4009 (non-QP)"],
  },
  yield: {
    n: "ER yield",
    c: "yours",
    a: "Derived — the important number, from the two only you have.",
    m: "ER yield = collections ÷ wRVU",
    p: ["ER collections", "ER wRVU"],
  },
  fair: {
    n: "Fair cost / wRVU",
    c: "counsel",
    a: "The all-in cost to produce a wRVU — fair physician pay plus overhead. The valuator sets the binding figure in a written FMV opinion.",
    m: "fair cost = comp/wRVU + overhead/wRVU",
    p: [
      "Comp/wRVU — MGMA / SullivanCotter, median default (median band $48–52; 75th ≈ $58). Valuator sets the binding percentile.",
      "Overhead/wRVU — practice-expense benchmark",
    ],
  },
  deficit: {
    n: "Deficit / wRVU",
    c: "arith",
    a: "The per-unit shortfall the stipend covers.",
    m: "deficit = fair cost − ER yield",
    p: ["Fair cost / wRVU", "ER yield"],
  },
  stip: {
    n: "Stipend",
    c: "arith",
    a: "The annual coverage payment — structured by counsel; tracks volume and trues up each period.",
    m: "stipend = deficit × ER wRVU",
    p: ["Deficit / wRVU", "ER wRVU", "Contract form & cadence — counsel"],
  },
};

const AUTH_LABEL: Record<Authority, string> = {
  yours: "your books",
  counsel: "counsel + valuator",
  cms: "CMS · fixed",
  arith: "arithmetic",
};

// re-skin to demo tokens — single consistent device for the authority axis
function authClasses(c: Authority) {
  // border-left color · chip bg · chip text
  switch (c) {
    case "yours":
      return {
        bar: "border-l-[var(--teal)]",
        chipBg: "bg-[color-mix(in_oklab,var(--teal)_12%,transparent)]",
        chipFg: "text-[var(--teal)]",
        accent: "text-[var(--teal)]",
      };
    case "counsel":
      return {
        bar: "border-l-[var(--gold)]",
        chipBg: "bg-[color-mix(in_oklab,var(--gold)_15%,transparent)]",
        chipFg: "text-[var(--gold)]",
        accent: "text-[var(--gold)]",
      };
    case "cms":
      return {
        bar: "border-l-ink/45",
        chipBg: "bg-ink/[0.07]",
        chipFg: "text-ink/65",
        accent: "text-ink/65",
      };
    case "arith":
      return {
        bar: "border-l-ink/30",
        chipBg: "bg-ink/[0.06]",
        chipFg: "text-ink/55",
        accent: "text-ink/55",
      };
  }
}

/* ─── small primitives ───────────────────────────────────────────────────── */

function NumField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="flex items-center gap-3 py-1.5 text-[13.5px]">
      <span className="flex-1 text-ink/65">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        autoComplete="off"
        data-private="true"
        data-mp-mask="true"
        data-fs-mask="true"
        data-clarity-mask="true"
        data-hj-suppress=""
        data-rrweb-ignore="true"
        data-analytics="ignore"
        className="font-mono w-[128px] rounded-md border border-ink/15 bg-paper px-2 py-1 text-right text-[13px] tabular-nums text-ink focus:border-[var(--teal)] focus:outline-none"
      />
    </label>
  );
}

function Erow({
  op,
  name,
  value,
  tot,
  onTerm,
  termKey,
}: {
  op: string;
  name: React.ReactNode;
  value: string;
  tot?: boolean;
  onTerm?: (t: TermKey) => void;
  termKey?: TermKey;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 py-1 text-[13.5px] ${
        tot ? "mt-1 border-t border-ink/10 pt-2" : ""
      }`}
    >
      <span className="text-ink/65">
        <span className="inline-block w-[14px] text-ink/40">{op}</span>
        {termKey ? (
          <button
            type="button"
            onClick={() => onTerm?.(termKey)}
            className="border-b border-dotted border-ink/35 hover:border-ink"
          >
            {name}
          </button>
        ) : (
          name
        )}
      </span>
      <span
        className={`font-mono whitespace-nowrap font-semibold tabular-nums ${
          tot ? "text-[22px]" : "text-[14px]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function ShapeCard({
  ico,
  authority,
  children,
}: {
  ico: string;
  authority: "yours" | "counsel";
  children: React.ReactNode;
}) {
  // green shapes = the group's books; blue = counsel+valuator
  const a = authClasses(authority);
  return (
    <div
      className={`flex gap-4 rounded-xl border border-ink/15 border-l-[3px] bg-paper p-4 md:p-5 ${a.bar}`}
    >
      <div className={`font-display flex-none text-[34px] leading-none ${a.accent}`}>{ico}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Sub({
  title,
  authority,
  children,
  id,
}: {
  title: string;
  authority: "yours" | "counsel";
  children: React.ReactNode;
  id?: string;
}) {
  const a = authClasses(authority);
  return (
    <details
      id={id}
      className={`mt-2 rounded-lg border border-ink/12 border-l-[3px] bg-ink/[0.025] ${a.bar}`}
    >
      <summary className="font-mono-tab cursor-pointer list-none px-3 py-2 text-[10.5px] uppercase tracking-[0.12em] text-ink/55 hover:text-ink">
        {title}
      </summary>
      <div className="px-3 pb-3 pt-1">{children}</div>
    </details>
  );
}

function OutRow({
  l,
  r,
}: {
  l: React.ReactNode;
  r: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink/10 py-1.5 text-[13px] last:border-b-0">
      <span className="text-ink/65">{l}</span>
      <span className="font-mono whitespace-nowrap font-semibold tabular-nums">{r}</span>
    </div>
  );
}

/* ─── page ───────────────────────────────────────────────────────────────── */

function TwoNumbersPage() {
  // the two numbers (baseline — lever moves derived display values, not these)
  const [baseColl, setBaseColl] = useState(8_316_000);
  const [baseWrvu, setBaseWrvu] = useState(297_000);
  // pins
  const [comp, setComp] = useState(50);
  const [ovh, setOvh] = useState(12);
  // hospital
  const [redep, setRedep] = useState(90);
  const [util, setUtil] = useState(1); // 0..1
  // lever
  const [cut, setCut] = useState(0); // 0..AVOIDABLE_CAP
  // Data drawer
  const [net, setNet] = useState(63_800_000);
  const [totcoll, setTotcoll] = useState(77_000_000);
  const [twrvu, setTwrvu] = useState(1_100_000);
  const [ershare, setErshare] = useState(27);
  const [eryield, setEryield] = useState(28);

  /* ─── right-column practice dashboard state ──────────────────────────── */
  // Drivers boot at zero; the right side stays zeroed until both are entered.
  const [compPool, setCompPool] = useState(0);
  const [erSharePct, setErSharePct] = useState(0);
  const [partnerCount, setPartnerCount] = useState(100);
  const [view, setView] = useState<"total" | "perPartner">("perPartner");
  const [redeployUtilD, setRedeployUtilD] = useState(0);

  // Bridge direction — drives which side derives from the other.
  // "none" = both sides independent (user has unlinked or no R2 yet)
  const [bridge, setBridge] = useState<"none" | "right-to-left" | "left-to-right">("none");
  // Per-left-field source flag — controls the "← derived" chip.
  const [leftCollSource, setLeftCollSource] = useState<"user" | "derived-from-right">("user");
  const [leftWrvuSource, setLeftWrvuSource] = useState<"user" | "derived-from-right">("user");
  // Right-side derived label flag
  const [rightSource, setRightSource] = useState<"user" | "derived-from-left">("user");

  // Bridge — eager with ~200ms debounce; one-way each tick per `bridge` mode.
  const bridgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (bridgeTimer.current) clearTimeout(bridgeTimer.current);
    if (bridge === "none") return;
    bridgeTimer.current = setTimeout(() => {
      if (bridge === "right-to-left" && compPool > 0 && erSharePct > 0) {
        const o = computePracticeImpact({
          compPool,
          erShare: erSharePct / 100,
          partnerCount,
          stipendOn: true,
          cutFrac: 0,
          redeployUtil: 0,
          fmvComp: comp,
          compActualPerWrvu: PRACTICE_IMPACT_DEFAULTS.compActualPerWrvu,
          compToCollections: PRACTICE_IMPACT_DEFAULTS.compToCollections,
          overheadPerWrvu: ovh,
          erYield: PRACTICE_IMPACT_DEFAULTS.erYield,
        });
        setBaseColl(Math.round(o.erColl));
        setBaseWrvu(Math.round(o.erWrvu));
        setLeftCollSource("derived-from-right");
        setLeftWrvuSource("derived-from-right");
        setCut(0);
      } else if (bridge === "left-to-right" && baseColl > 0 && baseWrvu > 0 && erSharePct > 0) {
        const b = backfillFromLeft({
          erColl: baseColl,
          erWrvu: baseWrvu,
          erShare: erSharePct / 100,
          compToCollections: PRACTICE_IMPACT_DEFAULTS.compToCollections,
          // residual-ish; default benchmark while users have only the two
          nonErYieldBench: 85,
        });
        setCompPool(Math.round(b.compPool));
        setRightSource("derived-from-left");
      }
    }, 200);
    return () => {
      if (bridgeTimer.current) clearTimeout(bridgeTimer.current);
    };
  }, [bridge, compPool, erSharePct, baseColl, baseWrvu, partnerCount, comp, ovh]);



  // term/source UI state
  const [openTerm, setOpenTerm] = useState<TermKey | null>(null);
  const [openSrc, setOpenSrc] = useState<SrcKey | null>(null);

  const e = useMemo(
    () =>
      computeTwoNumbers({
        baseColl,
        baseWrvu,
        comp,
        ovh,
        redep,
        util,
        cut,
      }),
    [baseColl, baseWrvu, comp, ovh, redep, util, cut],
  );

  // Audit derived
  const aComp = twrvu > 0 ? net / twrvu : 0;
  const aOvh = twrvu > 0 ? (totcoll - net) / twrvu : 0;
  const aAll = twrvu > 0 ? totcoll / twrvu : 0;

  // Data suggestions
  const sugW = twrvu * (ershare / 100);
  const sugC = sugW * eryield;

  // Display values for the displayed wRVU / collections (track the lever)
  const wrvuDisplay = e.wrvuP;
  const collDisplay = e.collP;

  const useSuggested = () => {
    setBaseWrvu(Math.round(sugW));
    setBaseColl(Math.round(sugW * eryield));
    setCut(0);
  };

  // When the user edits the two numbers, treat them as the new baseline
  // (the inputs ARE the baseline state; lever resets to 0 on edit). Mark
  // the field as user-typed and, if R2 is present, drive the bridge
  // left→right.
  const onCollEdit = (v: number) => {
    setBaseColl(v);
    setCut(0);
    setLeftCollSource("user");
    if (erSharePct > 0) setBridge("left-to-right");
  };
  const onWrvuEdit = (v: number) => {
    setBaseWrvu(v);
    setCut(0);
    setLeftWrvuSource("user");
    if (erSharePct > 0) setBridge("left-to-right");
  };
  const unlinkLeftDerived = () => {
    setLeftCollSource("user");
    setLeftWrvuSource("user");
    setBridge("none");
  };

  // Right-side input handlers — drive the bridge right→left.
  const onCompPoolEdit = (v: number) => {
    setCompPool(v);
    setRightSource("user");
    if (v > 0 && erSharePct > 0) setBridge("right-to-left");
  };
  const onErShareEdit = (v: number) => {
    setErSharePct(v);
    setRightSource("user");
    if (compPool > 0 && v > 0) setBridge("right-to-left");
  };


  // For the ER collections / ER wRVU inputs, when the lever is active we want
  // the field to reflect the lever-scaled value (the math runs in reverse and
  // you SEE collections falling with volume). We bind the input.value to the
  // display value and route edits back to the baseline setter.
  const showColl = Math.round(collDisplay);
  const showWrvu = Math.round(wrvuDisplay);

  const volNote =
    cut <= 0 ? (
      <>Move it — ER wRVU and collections fall together, yield holds, the stipend follows. Same math, run backward.</>
    ) : (
      <>
        ER wRVU <b className="text-ink">{fmtNum(wrvuDisplay)}</b> · collections{" "}
        <b className="text-ink">{fmtM(collDisplay)}</b>{" "}
        <span className="text-ink/40">(tracks volume)</span> · yield held{" "}
        <b className="text-ink">${e.yld.toFixed(0)}</b> · stipend{" "}
        <b className="text-ink">{fmtM(e.stipendP)}</b>
      </>
    );

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
      <div className="min-w-0 lg:max-w-xl">
      <h1 className="font-display text-[28px] font-semibold leading-[1.1] tracking-tight text-ink md:text-[34px]">
        A Tale of Two Numbers
      </h1>
      {rightSource === "derived-from-left" && (
        <div className="font-mono-tab mt-2 inline-block rounded-full border border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_10%,transparent)] px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-[var(--gold)]">
          right side · derived from left audit
        </div>
      )}


      {/* Sentence 1 */}
      <Lead>
        The stipend a group earns for covering the ER starts with{" "}
        <SrcLink k="twonums" open={openSrc} setOpen={setOpenSrc}>
          two numbers
        </SrcLink>{" "}
        <SrcLink k="onlygroup" open={openSrc} setOpen={setOpenSrc}>
          only the group has
        </SrcLink>
        .
      </Lead>
      <SrcBox k="twonums" open={openSrc} />
      <SrcBox k="onlygroup" open={openSrc} />

      {/* Card ○ — ER yield */}
      <ShapeCard ico="○" authority="yours">
        <NumField
          label={<Term t="coll" onClick={setOpenTerm} openTerm={openTerm}>ER collections</Term>}
          value={showColl}
          onChange={onCollEdit}
          step={100000}
        />
        <InlineDef k="coll" openTerm={openTerm} />
        <div className="ml-1 text-[12px] text-ink/40">÷</div>
        <NumField
          label={<Term t="wrvu" onClick={setOpenTerm} openTerm={openTerm}>ER wRVU</Term>}
          value={showWrvu}
          onChange={onWrvuEdit}
          step={10000}
        />
        <InlineDef k="wrvu" openTerm={openTerm} />
        <Erow
          op="="
          name={<Term t="yield" onClick={setOpenTerm} openTerm={openTerm}>ER yield</Term>}
          value={`$${e.yld.toFixed(2)} /wRVU`}
          tot
        />
        <InlineDef k="yield" openTerm={openTerm} />

        <Sub title="Data" authority="yours">
          <NumField
            label={<>Physician compensation pool <span className="text-ink/40">· MGMA: Total Physician Compensation</span></>}
            value={net}
            onChange={setNet}
            step={1000000}
          />
          <p className="-mt-0.5 mb-1 text-[11.5px] leading-relaxed text-ink/50">
            What the group distributes to its doctors. The known anchor.
          </p>
          <NumField label="Total collections" value={totcoll} onChange={setTotcoll} step={1000000} />
          <NumField label="Total wRVU" value={twrvu} onChange={setTwrvu} step={10000} />
          <NumField label="ER share %" value={ershare} onChange={setErshare} />
          <NumField label="ER yield (illustrative — audit replaces)" value={eryield} onChange={setEryield} />

          <NumField label="ER share %" value={ershare} onChange={setErshare} />
          <NumField label="ER yield (illustrative — audit replaces)" value={eryield} onChange={setEryield} />
          <OutRow l="Suggested ER collections (benchmark estimate)" r={fmtM(sugC)} />
          <OutRow l="Suggested ER wRVU (benchmark estimate)" r={`${fmtNum(sugW)} wRVU`} />
          <button
            type="button"
            onClick={useSuggested}
            className="font-mono-tab mt-3 rounded-md border border-[var(--teal)] bg-[color-mix(in_oklab,var(--teal)_10%,transparent)] px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-[var(--teal)] hover:bg-[color-mix(in_oklab,var(--teal)_15%,transparent)]"
          >
            ↺ use these
          </button>
        </Sub>


        <Sub title="Audit" authority="yours">
          <AuditRow l="Comp pool /wRVU (yours)" yours={`$${aComp.toFixed(2)}`} pin={`$${comp.toFixed(2)}`} />
          <AuditRow l="Overhead /wRVU" yours={`$${aOvh.toFixed(2)}`} pin={`$${ovh.toFixed(2)}`} />
          <AuditRow l="All-in /wRVU" yours={`$${aAll.toFixed(2)}`} pin={`$${e.fair.toFixed(2)}`} />
          <AuditRow l="ER all-in" yours={fmtM(aAll * baseWrvu)} pin={fmtM(e.fair * baseWrvu)} />
          <div className="mt-3 border-t border-ink/15 pt-2">
            <div className="font-mono-tab mb-1 text-[10px] uppercase tracking-[0.1em] text-ink/50">
              Funded / unfunded split (per wRVU)
            </div>
            <OutRow l="FMV clinical comp (funded by stipend)" r={`$${comp.toFixed(2)}`} />
            <OutRow l="Your comp pool" r={`$${aComp.toFixed(2)}`} />
            <OutRow l="Distribution = pool − FMV (NOT funded)" r={`$${Math.max(0, aComp - comp).toFixed(2)}`} />
            <OutRow l="All-in = fair (funded) + distribution" r={`$${(e.fair + Math.max(0, aComp - comp)).toFixed(2)}`} />
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink/55">
              Your distribution — ownership return above the market wage. The slice that cratered, and the slice the stipend does not fund.
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink/45">
              Overhead here is professional-fee practice cost — about <b className="text-ink/70">$10–20 per wRVU</b> (billing, malpractice, staff, IT, occupancy). It excludes the imaging equipment and technical costs the hospital owns, so it runs well below an all-practice overhead figure.
            </p>
          </div>
        </Sub>

        <Sub title="Self-audit" authority="yours">
          <p className="text-[12.5px] leading-relaxed text-ink/70">
            Are the two numbers defensible? Five properties:
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[12.5px] leading-relaxed text-ink/65">
            <li>Claim-line billing with POS 23 — ER origin on every claim.</li>
            <li>Study-level export — one row per study, joinable to billing.</li>
            <li>CMS wRVU map applied at the current PFS version (CY2026, CF $33.4009 non-QP).</li>
            <li>Reconciliation to your books — payments tie to your G/L.</li>
            <li>A measure you can re-run each period — not a one-off pull.</li>
          </ol>
          <p className="mt-3 text-[12px] leading-relaxed text-ink/55">
            Given your stack — integrated platform / outsourced RCM / BI overlay / separate systems — getting all five is usually a toggle, an email, or a bounded job. You're already generating the data; you just may not be seeing it.
          </p>
        </Sub>
      </ShapeCard>

      {/* Sentence 2 */}
      <Lead>
        The numbers trigger an{" "}
        <SrcLink k="mechanism" open={openSrc} setOpen={setOpenSrc}>
          established contract mechanism
        </SrcLink>{" "}
        — meant to{" "}
        <SrcLink k="plugloss" open={openSrc} setOpen={setOpenSrc}>
          plug the loss
        </SrcLink>{" "}
        the group would otherwise absorb.
      </Lead>
      <SrcBox k="mechanism" open={openSrc} />
      <SrcBox k="plugloss" open={openSrc} />

      {/* Card □ — Stipend */}
      <ShapeCard ico="□" authority="counsel">
        <Erow op=" " name={<Term t="fair" onClick={setOpenTerm} openTerm={openTerm}>Fair cost</Term>} value={`$${e.fair.toFixed(2)} /wRVU`} />
        <InlineDef k="fair" openTerm={openTerm} />
        <Erow op="−" name={<Term t="yield" onClick={setOpenTerm} openTerm={openTerm}>ER yield</Term>} value={`$${e.yld.toFixed(2)} /wRVU`} />
        <InlineDef k="yield" openTerm={openTerm} />
        <Erow op="=" name={<Term t="deficit" onClick={setOpenTerm} openTerm={openTerm}>Deficit</Term>} value={`$${e.deficit.toFixed(2)} /wRVU`} />
        <InlineDef k="deficit" openTerm={openTerm} />
        <Erow op="×" name={<Term t="wrvu" onClick={setOpenTerm} openTerm={openTerm}>ER wRVU</Term>} value={fmtNum(wrvuDisplay)} />
        <InlineDef k="wrvu" openTerm={openTerm} />
        <Erow op="=" name={<Term t="stip" onClick={setOpenTerm} openTerm={openTerm}>Stipend</Term>} value={fmtM(e.stipendP)} tot />
        <InlineDef k="stip" openTerm={openTerm} />

        <Sub title="Pins" authority="counsel">
          <NumField
            label={<>FMV clinical comp /wRVU</>}
            value={comp}
            onChange={setComp}
          />
          <div className="-mt-1 mb-1 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setComp(50)}
              className={`font-mono-tab rounded-full border px-2 py-0.5 text-[10.5px] uppercase tracking-[0.08em] ${comp === 50 ? "border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_15%,transparent)] text-[var(--gold)]" : "border-ink/20 text-ink/55 hover:border-ink/40"}`}
            >
              ● Median $50
            </button>
            <button
              type="button"
              onClick={() => setComp(58)}
              className={`font-mono-tab rounded-full border px-2 py-0.5 text-[10.5px] uppercase tracking-[0.08em] ${comp === 58 ? "border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_15%,transparent)] text-[var(--gold)]" : "border-ink/20 text-ink/55 hover:border-ink/40"}`}
            >
              ○ 75th $58
            </button>
          </div>
          <p className="-mt-0.5 mb-1 text-[11.5px] leading-relaxed text-ink/55">
            <b>Median $50</b> — MGMA / SullivanCotter (band $48–52). The conservative floor.<br />
            <b>75th $58</b> — justify with IR/subspecialty mix, the national radiologist shortage, or an ED-coverage premium.
          </p>
          <NumField label="Overhead /wRVU (range $10–20)" value={ovh} onChange={setOvh} />
          <p className="mt-2 text-[12px] leading-relaxed text-ink/55">
            Walks the headline ≈ <span className="font-mono tabular-nums text-ink/75">$10.1M → $12.5M</span> across the percentile range. Valuator sets the binding figure. The Audit drawer (○ card) shows your books' own comp/overhead.
          </p>
        </Sub>

        <Sub title="Contract" authority="counsel">
          <p className="text-[12px] leading-relaxed text-ink/55">
            Flexes with volume; trues up each period. Form, cadence, FMV opinion → counsel.
          </p>
        </Sub>
      </ShapeCard>

      {/* Sentence 3 */}
      <Lead>
        Stipends aren't static. They{" "}
        <SrcLink k="adjustvol" open={openSrc} setOpen={setOpenSrc}>
          move with volume
        </SrcLink>{" "}
        — giving the hospital a reason to{" "}
        <SrcLink k="reducewaste" open={openSrc} setOpen={setOpenSrc}>
          cut unnecessary scans
        </SrcLink>
        , and shrinking the stipend in step.
      </Lead>
      <SrcBox k="adjustvol" open={openSrc} />
      <SrcBox k="reducewaste" open={openSrc} />

      {/* Card △ — the lever */}
      <ShapeCard ico="△" authority="yours">
        <div className="flex items-center gap-3 py-1.5 text-[13.5px]">
          <span className="flex-1 text-ink/65">% of avoidable cut</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((cut / AVOIDABLE_CAP) * 100)}
            onChange={(ev) =>
              setCut((parseFloat(ev.target.value) / 100) * AVOIDABLE_CAP)
            }
            className="flex-[1.4] accent-[var(--teal)]"
          />
          <span className="font-mono w-[60px] text-right text-[13px] font-semibold tabular-nums">
            {Math.round((cut / AVOIDABLE_CAP) * 100)}%
          </span>
        </div>
        <div className="-mt-1 text-right text-[11.5px] text-ink/45">
          ≈ −{(cut * 100).toFixed(1)}% of total ER volume
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink/55">{volNote}</p>

        <div className="mt-3 space-y-2 rounded-md border border-ink/10 bg-ink/[0.025] p-3">
          <div className="font-mono-tab text-[10px] uppercase tracking-[0.1em] text-ink/50">
            Stated assumptions
          </div>
          <p className="text-[12px] leading-relaxed text-ink/60">
            <b className="text-ink">1. Collections track volume → yield holds.</b>{" "}
            When the avoidable slice is cut, ER collections fall in proportion to ER wRVU, so yield holds at $
            {e.yld.toFixed(0)}. The slice carries roughly the same ER payer mix as the rest of the coverage, so the dollars come out in proportion — conservative; in reality collections flux on their own.
          </p>
          <p className="text-[12px] leading-relaxed text-ink/60">
            <b className="text-ink">2. Avoidable cap ~30%.</b>{" "}
            Only the medically-unnecessary slice can be cut — a clinical call. The necessary coverage, and its stipend, always remain. EMTALA: clinical, never about who pays.
          </p>
        </div>

        <p className="mt-2 text-[12.5px] leading-relaxed text-ink/45">
          <b className="text-ink">Model note:</b>{" "}
          <Term t="coll" onClick={setOpenTerm} openTerm={openTerm}>ER collections</Term> is one of
          the two numbers you provide; when volume moves we assume it tracks,
          so yield holds and the math runs in reverse.
        </p>
        <InlineDef k="coll" openTerm={openTerm} />

        <Sub title="Hospital" authority="yours" id="hospital-drawer">
          <NumField label="Reclaimed time value /wRVU" value={redep} onChange={setRedep} />
          <div className="flex items-center gap-3 py-1.5 text-[13.5px]">
            <span className="flex-1 text-ink/65">Time you use</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(util * 100)}
              onChange={(ev) => setUtil(parseFloat(ev.target.value) / 100)}
              className="flex-[1.4] accent-[var(--teal)]"
            />
            <span className="font-mono w-[60px] text-right text-[13px] font-semibold tabular-nums">
              {Math.round(util * 100)}%
            </span>
          </div>
          <OutRow l="Hospital saves" r={`+${fmtM(e.hospSave)}`} />
          <OutRow
            l={<>Your gain <span className="text-ink/40">· break-even ${e.breakevenRedeploy.toFixed(0)}/wRVU</span></>}
            r={`${e.groupGain >= 0 ? "+" : ""}${fmtM(e.groupGain)}`}
          />
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink/45">
            Redeploy below break-even reads as a loss, not a wash.
          </p>
        </Sub>
      </ShapeCard>


      {/* Sentence 4 */}
      <Lead>
        Reducing ER volume likewise sheds work the stipend has already{" "}
        <SrcLink k="zeromargin" open={openSrc} setOpen={setOpenSrc}>
          made break-even
        </SrcLink>
        {" "}— so for the group, there's no margin to lose.
      </Lead>
      <SrcBox k="zeromargin" open={openSrc} />


      {/* Sentence 5 */}
      <Lead>
        The contract shifts the{" "}
        <SrcLink k="riskshift" open={openSrc} setOpen={setOpenSrc}>
          risk of the shortfall
        </SrcLink>{" "}
        {" "}to the hospital — the party that wants the coverage and can fund it.
      </Lead>
      <SrcBox k="riskshift" open={openSrc} />

      <p className="mt-8 border-t border-ink/15 pt-4 text-[11.5px] leading-relaxed text-ink/45">
        <span className="text-[var(--gold)]">gold</span> = CMS / public ·{" "}
        <span className="text-[var(--teal)]">teal</span> = your books ·{" "}
        <span className="text-[var(--gold)]">counsel + valuator</span> ·{" "}
        <span className="text-ink/65">arithmetic</span>. Illustrative defaults —
        replace with your own. Not legal, financial, or valuation advice;
        benchmarks and the contract belong to counsel and a valuator.
        "Avoidable" means medically unnecessary, defined by clinical
        leadership — never by who pays.
      </p>

      <p className="mt-4 text-[11.5px] text-ink/45">
        Taylor C. Berger, Attorney ·{" "}
        <a
          href="mailto:taylor@tcblaw.org"
          className="text-ink/60 hover:text-ink hover:underline"
        >
          taylor@tcblaw.org
        </a>
      </p>
    </main>
  );
}

/* ─── sub-components for prose, sources, terms ───────────────────────────── */

function Lead({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-display mx-0.5 mt-7 text-[17.5px] font-normal leading-[1.45] text-ink">
      {children}
    </p>
  );
}

function SrcLink({
  k,
  open,
  setOpen,
  children,
}: {
  k: SrcKey;
  open: SrcKey | null;
  setOpen: (k: SrcKey | null) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => setOpen(open === k ? null : k)}
      className="border-b border-dotted border-[var(--gold)] text-[var(--gold)] hover:border-solid"
    >
      {children}
    </button>
  );
}

function SrcBox({ k, open }: { k: SrcKey; open: SrcKey | null }) {
  if (open !== k) return null;
  const d = SRC[k];
  return (
    <div className="mx-0.5 mt-2 rounded-lg border-l-[3px] border-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_8%,transparent)] px-3 py-2.5 text-[12.5px] leading-relaxed">
      <div className="text-ink">{d.s}</div>
      {d.l && d.l.length > 0 && (
        <div className="mt-1.5 text-ink/65">
          <b className="text-ink">authority:</b>{" "}
          {d.l.map(([label, href], i) => (
            <span key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--gold)] hover:underline"
              >
                {label} ↗
              </a>
              {i < d.l!.length - 1 ? " · " : ""}
            </span>
          ))}
        </div>
      )}
      {d.o && (
        <div className="mt-1.5 text-ink/65">
          <b className="text-ink">ours:</b> {d.o}
          {k === "zeromargin" && (
            <>
              {" "}
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("hospital-drawer") as HTMLDetailsElement | null;
                  if (el) {
                    el.open = true;
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }}
                className="font-mono-tab ml-1 rounded border border-[var(--teal)] bg-[color-mix(in_oklab,var(--teal)_10%,transparent)] px-2 py-0.5 text-[10.5px] uppercase tracking-[0.1em] text-[var(--teal)] hover:bg-[color-mix(in_oklab,var(--teal)_18%,transparent)]"
              >
                ↓ open Hospital lever
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Term({
  t,
  onClick,
  openTerm,
  children,
}: {
  t: TermKey;
  onClick: (t: TermKey | null) => void;
  openTerm?: TermKey | null;
  children: React.ReactNode;
}) {
  const active = openTerm === t;
  return (
    <button
      type="button"
      onClick={() => onClick(active ? null : t)}
      className={`border-b border-dotted ${active ? "border-ink text-ink" : "border-ink/35"} hover:border-ink`}
    >
      {children}
    </button>
  );
}

function InlineDef({ k, openTerm }: { k: TermKey; openTerm: TermKey | null }) {
  if (openTerm !== k) return null;
  const d = DEF[k];
  const a = authClasses(d.c);
  return (
    <div
      className={`mt-1.5 mb-1 rounded-lg border border-ink/12 border-l-[3px] bg-ink/[0.025] px-3 py-2 text-[12.5px] ${a.bar}`}
    >
      <span className="text-[14px] font-semibold text-ink">{d.n}</span>
      <span
        className={`font-mono-tab ml-2 rounded px-1.5 py-[1px] align-[1px] text-[10px] uppercase tracking-[0.05em] font-semibold ${a.chipBg} ${a.chipFg}`}
      >
        {AUTH_LABEL[d.c]}
      </span>
      <div className="mt-1.5 text-ink/65">{d.a}</div>
      <div className="font-mono mt-1.5 text-ink/70">{d.m}</div>
      <div className="mt-1.5 text-ink/65">
        <b className="text-ink">depends on:</b> {d.p.join(" · ")}
      </div>
    </div>
  );
}


function AuditRow({
  l,
  yours,
  pin,
}: {
  l: string;
  yours: string;
  pin: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink/10 py-1.5 text-[13px] last:border-b-0">
      <span className="text-ink/65">{l}</span>
      <span className="font-mono whitespace-nowrap tabular-nums">
        <span className="font-semibold text-[var(--teal)]">{yours}</span>
        <span className="mx-1.5 text-[11px] text-ink/40">vs</span>
        <span className="font-semibold text-[var(--gold)]">{pin}</span>
      </span>
    </div>
  );
}
