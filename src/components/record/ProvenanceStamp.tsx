import { PROVENANCE_LABEL, type ProvenanceType } from "../../lib/provenance/algebra";

const STYLE: Record<ProvenanceType, string> = {
  record: "border-[var(--teal)]/45 text-[var(--teal)] bg-[color-mix(in_oklab,var(--teal)_8%,transparent)]",
  record_derived:
    "border-[var(--teal)]/30 text-[var(--teal)]/85 bg-[color-mix(in_oklab,var(--teal)_5%,transparent)]",
  counterfactual:
    "border-[var(--gold)]/50 text-[var(--gold)] bg-[color-mix(in_oklab,var(--gold)_10%,transparent)]",
  model_derived: "border-ink/25 text-ink/60 bg-ink/[0.03]",
  gap: "border-ink/30 text-ink/55 bg-transparent border-dashed",
  contradiction:
    "border-[var(--red-clinical)]/55 text-[var(--red-clinical)] bg-[color-mix(in_oklab,var(--red-clinical)_8%,transparent)]",
};

export function ProvenanceStamp({
  type,
  className = "",
}: {
  type: ProvenanceType;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-[2px] font-mono text-[9.5px] uppercase tracking-[0.11em] ${STYLE[type]} ${className}`}
    >
      {PROVENANCE_LABEL[type]}
    </span>
  );
}
