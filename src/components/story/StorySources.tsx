export function StorySources() {
  return (
    <section className="relative border-t border-ink/15">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <h2 className="font-mono-tab text-[11px] uppercase tracking-[0.16em] text-ink/55">
          Sources
        </h2>

        <ol className="mt-6 space-y-4 font-mono-tab text-[11px] leading-relaxed text-ink/60">
          <li>
            <span className="text-ink/80">[1]</span> Medicare conversion factor — CMS finalized CY2026 factors of $33.40 (non-QP) and $33.57 (QP), up from $32.35 in 2025 (first year of split factors). CMS CY2026 Physician Fee Schedule Final Rule (CMS-1832-F), Oct 31 2025.
          </li>
          <li>
            <span className="text-ink/80">[2]</span> Work-RVU efficiency adjustment — CMS finalized a −2.5% efficiency adjustment to work RVUs for non-time-based services beginning CY2026, applying to imaging codes. Same CMS CY2026 MPFS final rule.
          </li>
          <li>
            <span className="text-ink/80">[3]</span> Appropriate Use Criteria — paused and the regulations at 42 CFR 414.94 rescinded effective Jan 1 2024, no restart date; statutorily mandated under PAMA, so subject to future reinstatement.{" "}
            <a
              href="https://www.cms.gov/medicare/quality/appropriate-use-criteria-program"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 decoration-ink/25 hover:decoration-ink/60 transition-colors"
            >
              CMS Appropriate Use Criteria Program
            </a>
            .
          </li>
          <li>
            <span className="text-ink/80">[4]</span> Radiologist workforce / demand — the ACR projects substantial U.S. radiologist workforce growth through 2055; the field expanded rather than contracted after AI adoption. ACR workforce analysis, 2025.
          </li>
        </ol>
      </div>
    </section>
  );
}
