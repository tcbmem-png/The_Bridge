import { useState, type ReactNode } from "react";
import type { Figure } from "../../lib/provenance/algebra";
import { formatFigure } from "../../lib/provenance/format";
import { ProvenanceStamp } from "./ProvenanceStamp";

/**
 * A figure is never rendered without its stamp. Gaps render as gaps — not as
 * zero, not as a blank — and carry the act that would close them.
 */
export function FigureTile({
  figure,
  size = "md",
  children,
}: {
  figure: Figure;
  size?: "sm" | "md" | "lg";
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const valueClass =
    size === "lg"
      ? "text-4xl sm:text-5xl"
      : size === "sm"
        ? "text-xl"
        : "text-3xl";

  const hasDetail =
    figure.formula || figure.sources?.length || figure.assumption || figure.closesOn ||
    figure.requires?.length || figure.conflict?.length || figure.note;

  return (
    <div className="rounded-lg border border-ink/12 bg-paper p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.11em] text-ink/55">
          {figure.label}
        </p>
        <ProvenanceStamp type={figure.type} />
      </div>

      <p
        className={`font-mono mt-2 tabular-nums ${valueClass} ${
          figure.type === "gap" || figure.type === "contradiction"
            ? "text-ink/45"
            : "text-ink"
        }`}
      >
        {formatFigure(figure)}
      </p>

      {figure.note && (
        <p className="mt-2 text-[12px] leading-snug text-ink/65">{figure.note}</p>
      )}

      {children}

      {hasDetail && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.11em] text-ink/50 underline decoration-ink/20 underline-offset-[3px] transition-colors hover:text-ink"
        >
          {open ? "Hide derivation" : "Show derivation"}
        </button>
      )}

      {open && (
        <dl className="mt-3 space-y-2 border-t border-ink/10 pt-3 text-[12px] leading-snug">
          {figure.formula && (
            <Row term="Formula">
              <span className="font-mono text-[11.5px]">{figure.formula}</span>
            </Row>
          )}
          {figure.assumption && <Row term="Assumption">{figure.assumption}</Row>}
          {figure.sources?.length ? (
            <Row term="Sources">
              <span className="font-mono text-[11.5px]">{figure.sources.join(" · ")}</span>
            </Row>
          ) : null}
          {figure.requires?.length ? (
            <Row term="Inputs">
              <ul className="space-y-0.5">
                {figure.requires.map((r) => (
                  <li key={r.name} className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 rounded-full ${
                        r.satisfied ? "bg-[var(--teal)]" : "bg-[var(--red-clinical)]"
                      }`}
                    />
                    <span>{r.name}</span>
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink/45">
                      {r.satisfied ? "on record" : "absent"}
                    </span>
                  </li>
                ))}
              </ul>
            </Row>
          ) : null}
          {figure.conflict?.length ? (
            <Row term="Conflict">
              <ul className="space-y-0.5">
                {figure.conflict.map((c, i) => (
                  <li key={i}>
                    <span className="font-mono text-[11px]">{c.source}</span> reads {c.reading}
                  </li>
                ))}
              </ul>
            </Row>
          ) : null}
          {figure.closesOn && (
            <Row term="Closes on">
              <span className="text-[var(--gold)]">{figure.closesOn}</span>
            </Row>
          )}
        </dl>
      )}
    </div>
  );
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_1fr] gap-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.11em] text-ink/45">{term}</dt>
      <dd className="text-ink/80">{children}</dd>
    </div>
  );
}
