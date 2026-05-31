type Props = {
  label: string;
  note?: string;
  minHeight?: number;
  children?: React.ReactNode;
};

/**
 * Clearly-marked placeholder block. Used wherever copy or a component
 * is intentionally pending — easy to find and replace.
 */
export function Placeholder({ label, note, minHeight, children }: Props) {
  return (
    <div
      className="relative rounded-lg border border-dashed border-ink/35 bg-paper p-5 md:p-6"
      style={minHeight ? { minHeight } : undefined}
    >
      <div className="font-mono-tab mb-2 inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.12em] text-ink/55">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--red-clinical)]" />
        Placeholder · {label}
      </div>
      {children ?? (
        <p className="text-sm text-ink/70">{note ?? "Awaiting wording."}</p>
      )}
    </div>
  );
}
