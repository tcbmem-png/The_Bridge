type Props = {
  size?: number;
  tone?: "ink" | "paper" | "teal" | "gold" | "red";
  className?: string;
};

const toneVar: Record<NonNullable<Props["tone"]>, string> = {
  ink: "var(--ink)",
  paper: "var(--paper)",
  teal: "var(--teal)",
  gold: "var(--gold)",
  red: "var(--red-clinical)",
};

/**
 * The recurring "fall" token motif.
 * A small filled dot with a thin connecting tag — appears in every view.
 */
export function FallToken({ size = 14, tone = "ink", className }: Props) {
  const color = toneVar[tone];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center ${className ?? ""}`}
      style={{ height: size }}
    >
      <svg
        width={size * 2.2}
        height={size}
        viewBox="0 0 44 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line x1="10" y1="10" x2="42" y2="10" stroke={color} strokeWidth="1.25" />
        <circle cx="10" cy="10" r="5" fill={color} />
      </svg>
    </span>
  );
}
