// Tiny banner shown on Sandbox + Story when the user has loaded a harness
// dataset and pushed its derived figures into the money model. Two jobs:
// (1) make it obvious the numbers on screen come from loaded data, not
// authored defaults; (2) give a one-click way back to defaults.

import { Link } from "@tanstack/react-router";
import { useMoney } from "@/lib/money/store";

export function PresetBanner() {
  const { presetLabel, presetSource, clearPreset } = useMoney();
  if (!presetLabel || !presetSource) return null;

  const months = presetSource.months_observed;
  const lines = presetSource.er_line_count.toLocaleString();

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-teal/40 bg-teal/[0.05] px-3 py-2">
      <div className="font-mono text-[11px] text-ink/80">
        <span className="uppercase tracking-wider text-teal">Live preset · </span>
        coverage_volume, avg wRVU/read, and payer_mix derived from{" "}
        <span className="text-ink">{presetLabel}</span>{" "}
        <span className="text-ink/55">
          ({lines} ER lines · {months} mo · annualized)
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to="/harness"
          className="rounded-md border border-ink/20 bg-paper px-2 py-1 font-mono text-[11px] text-ink hover:bg-ink/5"
        >
          Re-derive
        </Link>
        <button
          type="button"
          onClick={clearPreset}
          className="rounded-md border border-ink/20 bg-paper px-2 py-1 font-mono text-[11px] text-ink hover:bg-ink/5"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
