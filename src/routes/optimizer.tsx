import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/optimizer")({
  head: () => ({
    meta: [
      { title: "Optimizer — The Bridge" },
      {
        name: "description",
        content:
          "Preview of the Optimizer UI. Runs on your machine. Your data never leaves it.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OptimizerPage,
});

const CREAM = "#f4f0e6";
const CARD = "#fbf9f3";
const INK = "#1a2730";
const BODY = "#565049";
const MUTED = "#8a8276";
const TEAL = "#1f8c79";
const GOLD = "#9a7a1c";
const RUST = "#a8642f";
const HAIR = "#e0d9c8";

const mono: React.CSSProperties = { fontFamily: '"IBM Plex Mono", monospace' };
const serif: React.CSSProperties = { fontFamily: '"Fraunces", serif' };
const sans: React.CSSProperties = { fontFamily: '"Hanken Grotesk", sans-serif' };

const FILTERS: Array<{ k: string; v: string }> = [
  { k: "Site", v: "All" },
  { k: "Shift", v: "Night" },
  { k: "Modality", v: "CT · MR" },
  { k: "Payer", v: "All" },
  { k: "Reader", v: "All" },
  { k: "Period", v: "Last 12 mo" },
];

const KPIS: Array<{ l: string; v: string; d: string; dir: "up" | "dn" | "" }> = [
  { l: "Yield / wRVU", v: "$71.40", d: "▼ $6.10 vs prior yr", dir: "dn" },
  { l: "Collections (12mo)", v: "$18.4M", d: "▼ 4.2%", dir: "dn" },
  { l: "Studies (12mo)", v: "62,180", d: "▲ 11.8%", dir: "up" },
  { l: "Denial rate", v: "7.9%", d: "▲ 1.3 pts", dir: "dn" },
  { l: "Unbilled gap", v: "1,740", d: "studies, no charge", dir: "" },
];

const READERS: Array<{ n: string; v: number }> = [
  { n: "Reader A", v: 94.1 },
  { n: "Reader B", v: 87.3 },
  { n: "Reader C", v: 82.05 },
  { n: "Reader D", v: 78.4 },
  { n: "Reader E", v: 72.1 },
  { n: "Reader F", v: 66.8 },
  { n: "Reader G", v: 59.4 },
  { n: "Reader H", v: 53.9 },
];
const MEDIAN = 76.3;
const BAR_MAX = 100;

const MODS = ["CT", "MR", "US", "XR", "Mammo"];
const SITES: Array<{ n: string; row: number[]; er?: boolean }> = [
  { n: "Westside", row: [88, 96, 79, 74, 91] },
  { n: "ER-Main", row: [31, 38, 27, 42, 68], er: true },
  { n: "North", row: [81, 90, 76, 72, 85] },
  { n: "South", row: [83, 93, 77, 71, 88] },
];

function cellBg(v: number) {
  // 0..100 scale toward teal
  const t = Math.max(0, Math.min(1, v / 100));
  // blend #f2ede0 -> #1f8c79
  const a = [242, 237, 224];
  const b = [31, 140, 121];
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function OptimizerPage() {
  return (
    <div style={{ background: CREAM, color: INK, ...sans, fontSize: 15, lineHeight: 1.55, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 32px 40px", width: "100%", flex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 22, borderBottom: `1px solid ${HAIR}`, marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ ...serif, display: "flex", alignItems: "center", gap: 12, fontWeight: 500, fontSize: "1.4rem", color: INK }}>
            <span style={{ width: 17, height: 17, borderRadius: "50%", border: `2px solid ${TEAL}`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: TEAL }} />
            </span>
            The Bridge
            <span style={{ ...mono, fontSize: ".66rem", letterSpacing: ".18em", color: TEAL, border: `1px solid ${TEAL}`, borderRadius: 4, padding: "3px 9px", textTransform: "uppercase", fontWeight: 500 }}>
              Optimizer
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ ...mono, fontSize: ".62rem", letterSpacing: ".13em", padding: "6px 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 7, color: TEAL, background: "rgba(31,140,121,.08)", border: "1px solid rgba(31,140,121,.3)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: TEAL }} />
              LOCAL · NO DATA LEAVES THIS MACHINE
            </span>
            <span style={{ ...mono, fontSize: ".62rem", letterSpacing: ".13em", padding: "6px 12px", borderRadius: 999, color: MUTED, border: `1px solid ${HAIR}` }}>
              ILLUSTRATIVE · SAMPLE DATA
            </span>
          </div>
        </div>

        {/* The image — flat preview */}
        <img
          src={optimizerMockup}
          alt="Optimizer UI preview"
          style={{ width: "100%", height: "auto", display: "block", borderRadius: 8, border: `1px solid ${HAIR}` }}
        />

        {/* Existing copy, untouched, sits between image and footer */}
        <div style={{ marginTop: 26, paddingTop: 20, borderTop: `1px solid ${HAIR}`, ...mono, fontSize: ".7rem", letterSpacing: ".03em", color: MUTED, lineHeight: 1.8 }}>
          Runs on your machine · your data never leaves it · no BAA to sign.
          <br />
          <b style={{ color: INK }}>Illustrative — sample data, no patient records.</b> &nbsp;·&nbsp; Same engine as the free Extractor; this edition retains the dimensions the Extractor drops and adds the slicing.
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
