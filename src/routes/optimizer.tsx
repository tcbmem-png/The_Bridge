import { createFileRoute } from "@tanstack/react-router";

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

function Kpi({ label, value, delta, dir }: { label: string; value: string; delta: string; dir: "up" | "dn" }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${HAIR}`, borderRadius: 8, padding: "18px", boxShadow: "0 1px 2px rgba(26,39,48,.03)" }}>
      <div style={{ ...mono, fontSize: ".62rem", letterSpacing: ".1em", textTransform: "uppercase", color: MUTED, marginBottom: 12 }}>{label}</div>
      <div style={{ ...serif, fontWeight: 500, fontSize: "1.85rem", color: INK, lineHeight: 1, letterSpacing: "-.01em" }}>{value}</div>
      <div style={{ ...mono, fontSize: ".64rem", marginTop: 9, letterSpacing: ".03em", color: dir === "up" ? TEAL : RUST }}>
        {dir === "up" ? "▲" : "▼"} {delta}
      </div>
    </div>
  );
}

function Bar({ name, pct, val, tone }: { name: string; pct: number; val: string; tone: "ab" | "bl" }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "64px 1fr 56px", alignItems: "center", gap: 12 }}>
      <span style={{ ...mono, fontSize: ".74rem", color: BODY }}>{name}</span>
      <div style={{ height: 20, background: "#efe9db", borderRadius: 4, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 4, width: `${pct}%`, background: tone === "ab" ? TEAL : RUST, opacity: tone === "bl" ? 0.85 : 1 }} />
      </div>
      <span style={{ ...mono, fontSize: ".74rem", color: INK, textAlign: "right" }}>{val}</span>
    </div>
  );
}

function HmCell({ v, er, alpha }: { v: number; er?: boolean; alpha: number }) {
  const bg = er ? `rgba(168,100,47,${alpha})` : `rgba(31,140,121,${alpha})`;
  return (
    <div style={{ ...mono, borderRadius: 5, padding: "11px 4px", textAlign: "center", fontSize: ".72rem", color: er ? "#5a2c10" : "#10302a", fontWeight: 500, background: bg }}>
      {v}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ ...mono, fontSize: ".72rem", letterSpacing: ".04em", background: CARD, border: `1px solid ${HAIR}`, borderRadius: 6, padding: "9px 14px", color: BODY, display: "inline-flex", gap: 8, alignItems: "center" }}>
      {children}
    </span>
  );
}

function Ctrl({ label }: { label: string }) {
  return (
    <span style={{ ...mono, fontSize: ".64rem", letterSpacing: ".05em", background: "rgba(31,140,121,.07)", border: "1px solid rgba(31,140,121,.25)", color: TEAL, borderRadius: 5, padding: "5px 10px" }}>
      ✓ {label}
    </span>
  );
}

function OptimizerPage() {
  return (
    <div style={{ background: CREAM, color: BODY, ...sans, fontSize: 15, lineHeight: 1.55 }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 32px 80px" }}>
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

        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
          {[
            ["Site", "All"],
            ["Shift", "Night"],
            ["Modality", "CT · MR"],
            ["Payer", "All"],
            ["Reader", "All"],
            ["Period", "Last 12 mo"],
          ].map(([k, v]) => (
            <Chip key={k}>
              {k} <b style={{ color: INK, fontWeight: 600 }}>{v}</b>{" "}
              <span style={{ color: MUTED, fontSize: ".6rem" }}>▾</span>
            </Chip>
          ))}
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 26 }} className="opt-kpis">
          <Kpi label="Yield / wRVU" value="$71.40" delta="$6.10 vs prior yr" dir="dn" />
          <Kpi label="Collections (12mo)" value="$18.4M" delta="4.2%" dir="dn" />
          <Kpi label="Studies (12mo)" value="62,180" delta="11.8%" dir="up" />
          <Kpi label="Denial rate" value="7.9%" delta="1.3 pts" dir="dn" />
          <Kpi label="Unbilled gap" value="1,740" delta="studies, no charge" dir="dn" />
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: 18 }} className="opt-grid">
          {/* Reader yield panel */}
          <div style={{ background: CARD, border: `1px solid ${HAIR}`, borderRadius: 10, padding: 24, boxShadow: "0 1px 3px rgba(26,39,48,.04)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6, gap: 12, flexWrap: "wrap" }}>
              <h2 style={{ ...serif, fontWeight: 500, fontSize: "1.32rem", color: INK, letterSpacing: "-.01em" }}>
                Reader yield — apples to apples
              </h2>
              <span style={{ ...mono, fontSize: ".6rem", letterSpacing: ".06em", color: GOLD, background: "rgba(154,122,28,.09)", border: "1px solid rgba(154,122,28,.25)", borderRadius: 999, padding: "5px 11px", whiteSpace: "nowrap" }}>
                Leadership view · anonymized to the partnership
              </span>
            </div>
            <div style={{ color: MUTED, fontSize: ".85rem", marginBottom: 18 }}>
              Yield per wRVU, the only fair way to read it — normalized so a night-ER trauma reader isn't penalized against a daytime mammo list.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              <Ctrl label="Site" />
              <Ctrl label="Shift" />
              <Ctrl label="Case mix" />
              <Ctrl label="Payer" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <Bar name="Reader A" pct={96} val="$94.10" tone="ab" />
              <Bar name="Reader B" pct={89} val="$87.30" tone="ab" />
              <Bar name="Reader C" pct={84} val="$82.05" tone="ab" />
              <Bar name="Reader D" pct={80} val="$78.40" tone="ab" />
              <Bar name="Reader E" pct={74} val="$72.10" tone="bl" />
              <Bar name="Reader F" pct={68} val="$66.80" tone="bl" />
              <Bar name="Reader G" pct={61} val="$59.40" tone="bl" />
              <Bar name="Reader H" pct={55} val="$53.90" tone="bl" />
            </div>
            <div style={{ ...mono, fontSize: ".62rem", color: MUTED, textAlign: "center", marginTop: 14 }}>
              — group median controlled yield: $76.30 / wRVU · teal above, rust below —
            </div>
          </div>

          {/* Heatmap panel */}
          <div style={{ background: CARD, border: `1px solid ${HAIR}`, borderRadius: 10, padding: 24, boxShadow: "0 1px 3px rgba(26,39,48,.04)" }}>
            <div style={{ marginBottom: 6 }}>
              <h2 style={{ ...serif, fontWeight: 500, fontSize: "1.32rem", color: INK, letterSpacing: "-.01em" }}>
                Where it's made &amp; lost
              </h2>
            </div>
            <div style={{ color: MUTED, fontSize: ".85rem", marginBottom: 18 }}>
              Yield / wRVU by site × modality. The ER row is the drag you're carrying.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "72px repeat(5, 1fr)", gap: 5, marginTop: 6 }}>
              <div />
              {["CT", "MR", "US", "XR", "Mammo"].map((h) => (
                <div key={h} style={{ ...mono, fontSize: ".6rem", letterSpacing: ".04em", color: MUTED, textTransform: "uppercase", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 4 }}>
                  {h}
                </div>
              ))}

              <div style={{ ...mono, fontSize: ".68rem", color: BODY, display: "flex", alignItems: "center" }}>Westside</div>
              <HmCell v={88} alpha={0.62} />
              <HmCell v={96} alpha={0.78} />
              <HmCell v={79} alpha={0.48} />
              <HmCell v={74} alpha={0.4} />
              <HmCell v={91} alpha={0.7} />

              <div style={{ ...mono, fontSize: ".68rem", color: "#5a2c10", display: "flex", alignItems: "center" }}>ER-Main</div>
              <HmCell v={31} er alpha={0.28} />
              <HmCell v={38} er alpha={0.2} />
              <HmCell v={27} er alpha={0.34} />
              <HmCell v={42} er alpha={0.16} />
              <HmCell v={68} alpha={0.3} />

              <div style={{ ...mono, fontSize: ".68rem", color: BODY, display: "flex", alignItems: "center" }}>North</div>
              <HmCell v={81} alpha={0.52} />
              <HmCell v={90} alpha={0.66} />
              <HmCell v={76} alpha={0.44} />
              <HmCell v={72} alpha={0.38} />
              <HmCell v={85} alpha={0.58} />

              <div style={{ ...mono, fontSize: ".68rem", color: BODY, display: "flex", alignItems: "center" }}>South</div>
              <HmCell v={83} alpha={0.56} />
              <HmCell v={93} alpha={0.72} />
              <HmCell v={77} alpha={0.46} />
              <HmCell v={71} alpha={0.36} />
              <HmCell v={88} alpha={0.64} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, ...mono, fontSize: ".62rem", color: MUTED }}>
              <span>low</span>
              <span style={{ height: 9, width: 120, borderRadius: 3, background: "linear-gradient(90deg,#f2ede0,#1f8c79)" }} />
              <span>high $/wRVU</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 26, paddingTop: 20, borderTop: `1px solid ${HAIR}`, ...mono, fontSize: ".7rem", letterSpacing: ".03em", color: MUTED, lineHeight: 1.8 }}>
          Runs on your machine · your data never leaves it · no BAA to sign.
          <br />
          <b style={{ color: INK }}>Illustrative — sample data, no patient records.</b> &nbsp;·&nbsp; Same engine as the free Extractor; this edition retains the dimensions the Extractor drops and adds the slicing.
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .opt-kpis { grid-template-columns: repeat(2, 1fr) !important; }
          .opt-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
