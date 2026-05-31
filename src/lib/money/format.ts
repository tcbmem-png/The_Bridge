// Display formatters — mono tabular, illustrative.

export function fmtMoney(n: number, opts: { compact?: boolean } = {}): string {
  if (!isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (opts.compact !== false && abs >= 1_000_000) {
    return `${n < 0 ? "−" : ""}$${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (opts.compact !== false && abs >= 1_000) {
    return `${n < 0 ? "−" : ""}$${(abs / 1_000).toFixed(0)}K`;
  }
  return `${n < 0 ? "−" : ""}$${Math.round(abs).toLocaleString("en-US")}`;
}

export function fmtCount(n: number): string {
  if (!isFinite(n)) return "—";
  return Math.round(n).toLocaleString("en-US");
}

export function fmtWRVU(n: number): string {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) {
    return `${Math.round(n).toLocaleString("en-US")} wRVU`;
  }
  return `${n.toFixed(1)} wRVU`;
}

export function fmtPct(n: number, digits = 0): string {
  return `${n.toFixed(digits)}%`;
}

export function fmtDollarsPerWRVU(n: number): string {
  return `$${n.toFixed(2)}/wRVU`;
}
