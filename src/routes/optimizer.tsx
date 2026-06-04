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

        {/* Filter bar */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
          {FILTERS.map((f) => (
            <span key={f.k} style={{ ...mono, fontSize: ".72rem", letterSpacing: ".04em", background: CARD, border: `1px solid ${HAIR}`, borderRadius: 6, padding: "9px 14px", color: BODY, display: "inline-flex", gap: 8, alignItems: "center" }}>
              {f.k} <b style={{ color: INK, fontWeight: 600 }}>{f.v}</b> <span style={{ color: MUTED, fontSize: ".6rem" }}>▾</span>
            </span>
          ))}
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 14, marginBottom: 26 }} className="opt-kpis">
          {KPIS.map((k) => (
            <div key={k.l} style={{ background: CARD, border: `1px solid ${HAIR}`, borderRadius: 8, padding: "18px", boxShadow: "0 1px 2px rgba(26,39,48,.03)" }}>
              <div style={{ ...mono, fontSize: ".62rem", letterSpacing: ".1em", textTransform: "uppercase", color: MUTED, marginBottom: 12 }}>{k.l}</div>
              <div style={{ ...serif, fontWeight: 500, fontSize: "1.85rem", color: INK, lineHeight: 1, letterSpacing: "-.01em" }}>{k.v}</div>
              <div style={{ ...mono, fontSize: ".64rem", marginTop: 9, letterSpacing: ".03em", color: k.dir === "up" ? TEAL : k.dir === "dn" ? RUST : MUTED }}>{k.d}</div>
            </div>
          ))}
        </div>

        {/* Two-panel grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: 18 }} className="opt-grid">
          {/* Reader yield panel */}
          <div style={{ background: CARD, border: `1px solid ${HAIR}`, borderRadius: 10, padding: 24, boxShadow: "0 1px 3px rgba(26,39,48,.04)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6, gap: 12 }}>
              <div>
                <h2 style={{ ...serif, fontWeight: 500, fontSize: "1.32rem", color: INK, letterSpacing: "-.01em" }}>Reader yield — apples to apples</h2>
                <div style={{ color: MUTED, fontSize: ".85rem", marginTop: 4 }}>Leadership view · anonymized to the partnership</div>
              </div>
              <span style={{ ...mono, fontSize: ".6rem", letterSpacing: ".06em", color: GOLD, background: "rgba(154,122,28,.09)", border: "1px solid rgba(154,122,28,.25)", borderRadius: 999, padding: "5px 11px", whiteSpace: "nowrap" }}>
                GATED · LEADERSHIP
              </span>
            </div>
            <p style={{ color: BODY, fontSize: ".92rem", margin: "14px 0 18px" }}>
              Yield per wRVU, the only fair way to read it — normalized so a night-ER trauma reader isn't penalized against a daytime mammo list.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {["Site", "Shift", "Case mix", "Payer"].map((c) => (
                <span key={c} style={{ ...mono, fontSize: ".64rem", letterSpacing: ".05em", background: "rgba(31,140,121,.07)", border: "1px solid rgba(31,140,121,.25)", color: TEAL, borderRadius: 5, padding: "5px 10px" }}>
                  ✓ {c}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {READERS.map((r) => {
                const above = r.v >= MEDIAN;
                const pct = Math.min(100, (r.v / BAR_MAX) * 100);
                return (
                  <div key={r.n} style={{ display: "grid", gridTemplateColumns: "70px 1fr 60px", alignItems: "center", gap: 12 }}>
                    <div style={{ ...mono, fontSize: ".74rem", color: BODY }}>{r.n}</div>
                    <div style={{ height: 20, background: "#efe9db", borderRadius: 4, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, borderRadius: 4, background: above ? TEAL : RUST, opacity: above ? 1 : 0.85 }} />
                    </div>
                    <div style={{ ...mono, fontSize: ".74rem", color: INK, textAlign: "right" }}>${r.v.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ ...mono, fontSize: ".62rem", color: MUTED, textAlign: "center", marginTop: 16 }}>
              — group median controlled yield: ${MEDIAN.toFixed(2)} / wRVU · teal above, rust below —
            </div>
          </div>

          {/* Heatmap panel */}
          <div style={{ background: CARD, border: `1px solid ${HAIR}`, borderRadius: 10, padding: 24, boxShadow: "0 1px 3px rgba(26,39,48,.04)" }}>
            <h2 style={{ ...serif, fontWeight: 500, fontSize: "1.32rem", color: INK, letterSpacing: "-.01em" }}>Where it's made &amp; lost</h2>
            <p style={{ color: MUTED, fontSize: ".85rem", margin: "6px 0 18px" }}>
              Yield / wRVU by site × modality. The ER row is the drag you're carrying.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "78px repeat(5, 1fr)", gap: 5, marginTop: 6 }}>
              <div />
              {MODS.map((m) => (
                <div key={m} style={{ ...mono, fontSize: ".6rem", letterSpacing: ".04em", color: MUTED, textTransform: "uppercase", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 4 }}>{m}</div>
              ))}
              {SITES.map((s) => (
                <>
                  <div key={`l-${s.n}`} style={{ ...mono, fontSize: ".68rem", color: BODY, display: "flex", alignItems: "center" }}>{s.n}</div>
                  {s.row.map((v, i) => (
                    <div key={`${s.n}-${i}`} style={{ borderRadius: 5, padding: "11px 4px", textAlign: "center", ...mono, fontSize: ".72rem", fontWeight: 500, background: cellBg(v), color: s.er ? "#5a2c10" : "#10302a" }}>
                      {v}
                    </div>
                  ))}
                </>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, ...mono, fontSize: ".62rem", color: MUTED }}>
              <span>low</span>
              <span style={{ height: 9, width: 120, borderRadius: 3, background: "linear-gradient(90deg,#f2ede0,#1f8c79)" }} />
              <span>high</span>
              <span style={{ marginLeft: "auto" }}>$/wRVU</span>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .opt-kpis { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
            .opt-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>


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
