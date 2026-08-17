import type { Figure } from "./algebra";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usd2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const num = new Intl.NumberFormat("en-US");
const num1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export function formatValue(value: number | null, unit: Figure["unit"]): string {
  if (value === null) return "—";
  switch (unit) {
    case "usd":
      return Math.abs(value) >= 1000 ? usd.format(value) : usd2.format(value);
    case "usd_per_wrvu":
      return usd2.format(value);
    case "wrvu":
      return num1.format(value);
    case "percent":
      return `${num1.format(value * 100)}%`;
    case "days":
      return `${num1.format(value)} d`;
    case "count":
    default:
      return num.format(value);
  }
}

export function formatFigure(f: Figure): string {
  if (f.type === "gap") return "Not on record";
  if (f.type === "contradiction") return "Sources disagree";
  return formatValue(f.value, f.unit);
}

export function compactUsd(value: number | null): string {
  if (value === null) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${num1.format(value / 1_000_000)}M`;
  if (abs >= 1_000) return `$${num1.format(value / 1_000)}K`;
  return usd.format(value);
}
