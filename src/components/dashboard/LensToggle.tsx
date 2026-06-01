// Group ⇄ Hospital lens toggle. Default: Group.
// Posture: shared scoreboard, win-win. Never leverage, never a threat to walk.
// Deal terms (FMV / AKS structure) live with counsel — not in this app.

import { useLens, type Lens } from "../../lib/lens/store";

export function LensToggle() {
  const { lens, setLens } = useLens();
  return (
    <div className="inline-flex items-center gap-2">
      <span className="font-mono-tab text-[10px] uppercase tracking-[0.14em] text-ink/55">
        Lens
      </span>
      <div
        role="tablist"
        aria-label="Group or Hospital lens"
        className="inline-flex rounded-full border border-ink/20 bg-paper p-0.5"
      >
        <LensTab value="group" active={lens} onSelect={setLens}>
          Group
        </LensTab>
        <LensTab value="hospital" active={lens} onSelect={setLens}>
          Hospital
        </LensTab>
      </div>
    </div>
  );
}

function LensTab({
  value,
  active,
  onSelect,
  children,
}: {
  value: Lens;
  active: Lens;
  onSelect: (l: Lens) => void;
  children: React.ReactNode;
}) {
  const on = value === active;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={() => onSelect(value)}
      className={[
        "font-mono-tab rounded-full px-3 py-1 text-[10.5px] uppercase tracking-[0.12em] transition-colors",
        on ? "bg-ink text-paper" : "text-ink/65 hover:text-ink",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
