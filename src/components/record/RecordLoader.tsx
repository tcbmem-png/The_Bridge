import type { LoadProgress, LoadReport } from "../../../harness/runtime/recordDb";

/**
 * The front door to every record surface. Nothing renders a number until a
 * record is loaded, and the record lives only in this tab for this session.
 */
export function RecordLoader({
  loaded,
  progress,
  reports,
  error,
  onLoad,
}: {
  loaded: boolean;
  progress: LoadProgress;
  reports: LoadReport[] | null;
  error: string | null;
  onLoad: () => void;
}) {
  const busy = progress.phase === "booting" || progress.phase === "loading";

  return (
    <section className="rounded-lg border border-ink/15 bg-[var(--bridge-cream-2)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.11em] text-ink/55">
            Source data
          </p>
          <h2 className="font-display mt-1 text-xl text-ink">
            {loaded ? "Record loaded." : "No record loaded."}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink/70">
            Postgres runs inside this browser tab. Files are parsed here, queried
            here, and discarded on reload. Nothing is uploaded. The bundled set is
            synthetic — a fabricated cardiology group, no patients, no real
            entities. Your own exports belong on hardware you control.
          </p>
        </div>

        <button
          type="button"
          onClick={onLoad}
          disabled={busy}
          className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/90 disabled:opacity-50"
        >
          {busy ? "Loading…" : loaded ? "Reload record" : "Load the synthetic record"}
        </button>
      </div>

      {busy && (
        <div className="mt-4">
          <div className="h-1 w-full overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full bg-[var(--teal)] transition-[width] duration-200"
              style={{ width: `${Math.round(progress.fraction * 100)}%` }}
            />
          </div>
          <p className="mt-2 font-mono text-[11px] text-ink/60">{progress.message}</p>
        </div>
      )}

      {error && (
        <p className="mt-4 font-mono text-[11.5px] text-[var(--red-clinical)]">{error}</p>
      )}

      {reports && (
        <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
          {reports.map((r) => (
            <li key={r.key} className="flex items-center gap-2 font-mono text-[11px]">
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${
                  !r.present
                    ? "bg-[var(--red-clinical)]"
                    : r.rejected > 0
                      ? "bg-[var(--gold)]"
                      : "bg-[var(--teal)]"
                }`}
              />
              <span className="text-ink/70">{r.file}</span>
              <span className="tabular-nums text-ink/50">
                {r.present ? r.rows.toLocaleString() : "absent"}
                {r.rejected > 0 ? ` · ${r.rejected} rejected` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
