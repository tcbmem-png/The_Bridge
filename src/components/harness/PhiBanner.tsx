// PHI banner — reproduces the warning header from
// harness/sql/radiology_stipend_harness.sql (lines 8-10) verbatim, plus
// the scope ground rules for this demo build.

export function PhiBanner() {
  return (
    <section className="rounded-md border border-red-clinical/40 bg-red-clinical/[0.04] p-5">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-2 w-2 rounded-full bg-red-clinical" aria-hidden />
        <h2 className="font-display text-lg text-ink">Synthetic · not for clinical use</h2>
      </div>
      <p className="mt-3 font-mono text-[12px] leading-relaxed text-ink/80">
        PHI WARNING: 837, 835, and RIS exports are PHI end-to-end. Encrypt at rest and
        in transit, restrict and log all access, and execute BAAs with any vendor or
        cloud in the data path BEFORE loading a single file.
      </p>
      <p className="mt-3 text-sm text-ink/80">
        This page runs the canonical schema against fabricated rows. No server
        path — client-side, session-only, never written to disk. The upload
        portal below is in-tab; dropping a file does not send it anywhere.
        Real ingestion belongs on a fork on hardware you control, gated on
        BAA, encryption at rest, access logging, and a deliberate database
        decision — not on enabling a backend by side effect.
      </p>
    </section>
  );
}
