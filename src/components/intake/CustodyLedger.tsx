import {
  duplicateHashes,
  shortHash,
  type CustodyEntry,
} from "../../lib/intake/custody";

const STATUS_STYLE: Record<CustodyEntry["status"], string> = {
  loaded: "border-[var(--teal)]/45 text-[var(--teal)]",
  ambiguous: "border-[var(--gold)]/50 text-[var(--gold)]",
  unrecognized: "border-ink/30 text-ink/55 border-dashed",
  rejected: "border-[var(--red-clinical)]/55 text-[var(--red-clinical)]",
};

/** Every file received, hashed over its raw bytes, whether or not it loaded. */
export function CustodyLedger({ entries }: { entries: CustodyEntry[] }) {
  if (entries.length === 0) return null;
  const dupes = new Set(duplicateHashes(entries));

  return (
    <section className="mt-8">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55">
        Chain of custody
      </h3>
      <p className="mt-2 max-w-[62ch] text-sm text-ink/70">
        Each file is hashed over its raw bytes on arrival, before any parser
        touches it. Re-hash your own copy and you should get the same string.
        Files that did not load are listed here too — received is not the same
        as discarded.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink/50">
              <th className="border-b border-ink/15 py-2 pr-4 font-normal">File</th>
              <th className="border-b border-ink/15 py-2 pr-4 font-normal">SHA-256</th>
              <th className="border-b border-ink/15 py-2 pr-4 font-normal">Bytes</th>
              <th className="border-b border-ink/15 py-2 pr-4 font-normal">Read as</th>
              <th className="border-b border-ink/15 py-2 pr-4 font-normal">Rows</th>
              <th className="border-b border-ink/15 py-2 pr-4 font-normal">Repaired</th>
              <th className="border-b border-ink/15 py-2 pr-4 font-normal">Parked</th>
              <th className="border-b border-ink/15 py-2 font-normal">State</th>
            </tr>
          </thead>
          <tbody className="font-mono-tab text-[12px]">
            {entries.map((e, i) => (
              <tr key={`${e.fileName}-${i}`} className="align-top">
                <td className="border-b border-ink/10 py-2 pr-4 text-ink">
                  {e.fileName}
                  <div className="mt-1 max-w-[34ch] font-sans text-[11px] leading-snug text-ink/55">
                    {e.note}
                  </div>
                </td>
                <td
                  className="border-b border-ink/10 py-2 pr-4 text-ink/70"
                  title={e.sha256 ?? "no WebCrypto in this context"}
                >
                  {shortHash(e.sha256)}
                  {e.sha256 && dupes.has(e.sha256) && (
                    <span className="ml-2 text-[var(--gold)]">same bytes as another file</span>
                  )}
                </td>
                <td className="border-b border-ink/10 py-2 pr-4 text-ink/70">
                  {e.byteSize.toLocaleString()}
                </td>
                <td className="border-b border-ink/10 py-2 pr-4 text-ink/70">
                  {e.sourceKey ?? "—"}
                  {e.stage ? <span className="text-ink/40"> · {e.stage}</span> : null}
                </td>
                <td className="border-b border-ink/10 py-2 pr-4 text-ink/70">
                  {e.status === "loaded" ? e.rows.toLocaleString() : "—"}
                </td>
                <td className="border-b border-ink/10 py-2 pr-4 text-ink/70">
                  {e.status === "loaded" ? e.repairs.toLocaleString() : "—"}
                </td>
                <td className="border-b border-ink/10 py-2 pr-4 text-ink/70">
                  {e.status === "loaded" ? e.rejectedRows.toLocaleString() : "—"}
                </td>
                <td className="border-b border-ink/10 py-2">
                  <span
                    className={`inline-flex rounded-full border px-2 py-[2px] font-mono text-[9.5px] uppercase tracking-[0.11em] ${STATUS_STYLE[e.status]}`}
                  >
                    {e.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
