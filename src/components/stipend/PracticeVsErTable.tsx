// Practice vs ER side-by-side (4d). Same cost both sides; payer-mix drives
// the yield gap. No widgets — a calm comparison row.

export function PracticeVsErTable({
  fairCost,
  erYield,
  nonErYield,
}: {
  fairCost: number;
  erYield: number;
  nonErYield: number;
}) {
  const erMargin = erYield - fairCost;
  const nonErMargin = nonErYield - fairCost;

  const Cell = ({
    label,
    er,
    nonEr,
    erTone,
    nonErTone,
  }: {
    label: string;
    er: string;
    nonEr: string;
    erTone?: "loss" | "gain" | "muted";
    nonErTone?: "loss" | "gain" | "muted";
  }) => {
    const tone = (t?: string) =>
      t === "loss" ? "text-[var(--red)]" : t === "gain" ? "text-[var(--teal)]" : "text-ink";
    return (
      <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-3 border-b border-ink/10 py-1.5 text-[13px] last:border-b-0">
        <span className="text-ink/65">{label}</span>
        <span className={`font-mono w-[80px] text-right tabular-nums font-semibold ${tone(erTone)}`}>
          {er}
        </span>
        <span className={`font-mono w-[80px] text-right tabular-nums font-semibold ${tone(nonErTone)}`}>
          {nonEr}
        </span>
      </div>
    );
  };

  return (
    <div className="rounded-lg border border-ink/12 bg-paper p-3">
      <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-ink/15 pb-1.5">
        <span className="font-mono-tab text-[10.5px] uppercase tracking-[0.1em] text-ink/50">
          Per wRVU
        </span>
        <span className="font-mono-tab w-[80px] text-right text-[10.5px] uppercase tracking-[0.1em] text-ink/50">
          ER
        </span>
        <span className="font-mono-tab w-[80px] text-right text-[10.5px] uppercase tracking-[0.1em] text-ink/50">
          Non-ER
        </span>
      </div>
      <Cell label="Cost (same)" er={`$${fairCost.toFixed(0)}`} nonEr={`$${fairCost.toFixed(0)}`} erTone="muted" nonErTone="muted" />
      <Cell label="Yield" er={`$${erYield.toFixed(0)}`} nonEr={`$${nonErYield.toFixed(0)}`} />
      <Cell
        label="Margin"
        er={`${erMargin >= 0 ? "+" : "−"}$${Math.abs(erMargin).toFixed(2)}`}
        nonEr={`${nonErMargin >= 0 ? "+" : "−"}$${Math.abs(nonErMargin).toFixed(2)}`}
        erTone={erMargin >= 0 ? "gain" : "loss"}
        nonErTone={nonErMargin >= 0 ? "gain" : "loss"}
      />
      <p className="mt-3 text-[12px] leading-relaxed text-ink/55">
        Same cost to read either study; the ER collects a third as much — payer mix, not effort.
      </p>
    </div>
  );
}
