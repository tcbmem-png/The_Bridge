import { FallToken } from "../FallToken";

type Tone = "ink" | "teal" | "gold" | "red" | "paper";

export function SectionTag({ children, tone = "ink" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <div className="font-mono-tab flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-ink/65">
      <FallToken size={12} tone={tone} />
      <span>{children}</span>
    </div>
  );
}
