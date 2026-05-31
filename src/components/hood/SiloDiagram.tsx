// Three-silo visual converging to one ink bar. Static; no logic.
export function SiloDiagram() {
  const silos = [
    {
      title: "RCM / billing",
      lines: ["charges", "payments", "denials", "payer mix"],
      refs: "[p1] [p2] [p3] [p4]",
    },
    {
      title: "PowerScribe / mPower",
      lines: ["reports", "findings", "follow-ups"],
      refs: "[p6]",
    },
    {
      title: "PACS / worklist",
      lines: ["volume", "turnaround", "timestamps"],
      refs: "[p7]",
    },
  ];

  return (
    <div className="rounded-xl border border-ink/15 bg-paper p-6 md:p-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {silos.map((s) => (
          <div
            key={s.title}
            className="rounded-lg border border-dashed border-ink/35 bg-paper p-5"
          >
            <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
              {s.title}
            </div>
            <ul className="mt-3 space-y-1 text-sm text-ink/80">
              {s.lines.map((l) => (
                <li key={l}>· {l}</li>
              ))}
            </ul>
            <div className="font-mono-tab mt-4 text-[10px] uppercase tracking-[0.14em] text-ink/40">
              {s.refs}
            </div>
          </div>
        ))}
      </div>

      <p className="font-mono-tab mt-5 text-center text-[10.5px] uppercase tracking-[0.14em] text-ink/45">
        siloed — each answers only its own slice
      </p>

      {/* converging arrow */}
      <div className="mt-5 flex justify-center" aria-hidden="true">
        <svg width="36" height="28" viewBox="0 0 36 28" fill="none">
          <path
            d="M2 4 L18 22 L34 4"
            stroke="var(--ink)"
            strokeOpacity="0.45"
            strokeWidth="1.25"
            fill="none"
          />
          <path d="M18 22 L18 27" stroke="var(--ink)" strokeOpacity="0.45" strokeWidth="1.25" />
        </svg>
      </div>

      <div className="mt-3 rounded-md bg-ink p-5 text-paper md:p-6">
        <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.14em] text-paper/60">
          One harness → one fact table → one dashboard
        </div>
        <p className="font-display mt-3 text-xl leading-snug md:text-2xl">
          What does ED coverage actually cost us — in wRVUs and dollars, by site of service?
        </p>
      </div>
    </div>
  );
}

export function ProvenanceList() {
  const items: Array<[string, string]> = [
    ["p1", "charges / payments / payer / place-of-service — the 837 claim + 835 remittance (HIPAA EDI)."],
    ["p2", "denial reasons — CARC / RARC codes on the 835."],
    ["p3", "indication (e.g. 'fall') — ICD-10-CM on the claim."],
    ["p4", "procedure — CPT."],
    ["p5", "wRVU per CPT — the CMS RVU file."],
    ["p6", "negative-read / findings — NLP over PowerScribe report text (e.g. mPower)."],
    ["p7", "turnaround — exam-complete / report-signed timestamps from RIS / PACS."],
  ];
  return (
    <aside className="rounded-lg border border-ink/15 bg-paper p-5">
      <div className="font-mono-tab text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
        Provenance
      </div>
      <ul className="mt-3 space-y-2 text-xs leading-relaxed text-ink/70">
        {items.map(([k, v]) => (
          <li key={k} className="flex gap-2">
            <span className="font-mono-tab text-ink/50">[{k}]</span>
            <span>{v}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
