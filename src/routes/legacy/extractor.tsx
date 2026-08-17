import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legacy/extractor")({
  head: () => ({
    meta: [
      { title: "Extractor — The Bridge" },
      {
        name: "description",
        content:
          "The Extractor turns 837 + 835 + RIS + bank exports into an audit packet — locally, on your machine.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ExtractorPage,
  ssr: false,
});

const CREAM = "#f4f0e6";
const CARD = "#fbf9f3";
const INK = "#1a2730";
const BODY = "#565049";
const MUTED = "#8a8276";
const TEAL = "#1f8c79";
const HAIR = "#e0d9c8";

const mono: React.CSSProperties = { fontFamily: '"IBM Plex Mono", monospace' };
const serif: React.CSSProperties = { fontFamily: '"Fraunces", serif' };
const sans: React.CSSProperties = { fontFamily: '"Hanken Grotesk", sans-serif' };

const CHECKS: Array<{ title: string; body: string }> = [
  {
    title: "Month coverage",
    body: "36 distinct service months. Maturity window satisfied.",
  },
  {
    title: "MPFS rate coverage",
    body: "Every (CPT, service year) on a billed line resolves to a work RVU.",
  },
  {
    title: "Remit closure · 837 ↔ 835",
    body: "Every billed line reconciles to a remittance or a named open balance.",
  },
  {
    title: "Cash tie-out · 835 ↔ deposits",
    body: "Every EFT trace ties to a bank deposit. 0 unexplained variance rows.",
  },
  {
    title: "Volume tie-out · RIS ↔ billed",
    body: "Every completed exam reconciles to a billed accession or a named gap.",
  },
];

const SEGMENTS: Array<{
  seg: string;
  lines: string;
  wrvu: string;
  collections: string;
  rate: string;
  emphasis?: boolean;
}> = [
  { seg: "ER", lines: "14,820", wrvu: "61,240", collections: "$1,714,720", rate: "$28.00" },
  { seg: "Non-ER", lines: "47,360", wrvu: "192,180", collections: "$16,527,480", rate: "$86.00" },
  { seg: "All", lines: "62,180", wrvu: "253,420", collections: "$18,242,200", rate: "$71.98", emphasis: true },
];

function ExtractorPage() {
  return (
    <div style={{ background: CREAM, color: INK, ...sans, fontSize: 15, lineHeight: 1.55, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 32px 60px", width: "100%", flex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 22, borderBottom: `1px solid ${HAIR}`, marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ ...serif, display: "flex", alignItems: "center", gap: 12, fontWeight: 500, fontSize: "1.4rem", color: INK }}>
            <span style={{ width: 17, height: 17, borderRadius: "50%", border: `2px solid ${TEAL}`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: TEAL }} />
            </span>
            The Bridge
            <span style={{ ...mono, fontSize: ".66rem", letterSpacing: ".18em", color: TEAL, border: `1px solid ${TEAL}`, borderRadius: 4, padding: "3px 9px", textTransform: "uppercase", fontWeight: 500 }}>
              Extractor
            </span>
          </div>
          <span style={{ ...mono, fontSize: ".62rem", letterSpacing: ".13em", padding: "6px 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 7, color: TEAL, background: "rgba(31,140,121,.08)", border: "1px solid rgba(31,140,121,.3)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: TEAL }} />
            LOCAL · NO DATA LEAVES THIS MACHINE
          </span>
        </div>

        {/* Ready banner */}
        <div style={{ background: CARD, border: `1px solid ${HAIR}`, borderRadius: 10, padding: 24, marginBottom: 26, boxShadow: "0 1px 3px rgba(26,39,48,.04)" }}>
          <div style={{ ...serif, fontWeight: 500, fontSize: "1.5rem", color: INK, display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ color: TEAL }}>✓</span> Ready for audit
          </div>
          <div style={{ ...mono, fontSize: ".75rem", color: BODY, lineHeight: 1.9 }}>
            <div><span style={{ color: MUTED }}>Last run</span> &nbsp;2026-06-02 04:00 · monthly schedule</div>
            <div><span style={{ color: MUTED }}>Coverage</span> &nbsp;36 / 36 months · source of truth 837 + 835 + RIS + bank</div>
            <div><span style={{ color: MUTED }}>Dataset</span> &nbsp;MOCK_RAD_GROUP (sample)</div>
          </div>
        </div>

        {/* Reconciliation */}
        <Panel
          title="Reconciliation"
          sub="Five checks. Each one ties a number to its source, or names exactly what's missing. No interpretation."
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
            {CHECKS.map((c) => (
              <div key={c.title} style={{ border: `1px solid ${HAIR}`, borderRadius: 8, padding: "16px 18px", background: CREAM }}>
                <div style={{ ...mono, fontSize: ".75rem", color: INK, fontWeight: 500, display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ color: TEAL, fontSize: ".95rem" }}>✓</span> {c.title}
                </div>
                <div style={{ fontSize: ".88rem", color: BODY, lineHeight: 1.55 }}>{c.body}</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Segment attribution */}
        <Panel
          title="Segment attribution"
          sub="The one number the stipend turns on: professional collections per wRVU, by segment. Drill any cell to the source lines."
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", ...mono, fontSize: ".82rem" }}>
              <thead>
                <tr style={{ color: MUTED, fontSize: ".66rem", letterSpacing: ".08em", textTransform: "uppercase" }}>
                  {["Segment", "Lines", "wRVU", "Collections", "$ / wRVU"].map((h, i) => (
                    <th key={h} style={{ textAlign: i === 0 ? "left" : "right", padding: "10px 14px", borderBottom: `1px solid ${HAIR}`, fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SEGMENTS.map((s) => (
                  <tr key={s.seg} style={{ color: INK, background: s.emphasis ? "rgba(31,140,121,.05)" : "transparent" }}>
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${HAIR}`, fontWeight: s.emphasis ? 600 : 500 }}>{s.seg}</td>
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${HAIR}`, textAlign: "right" }}>{s.lines}</td>
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${HAIR}`, textAlign: "right" }}>{s.wrvu}</td>
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${HAIR}`, textAlign: "right" }}>{s.collections}</td>
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${HAIR}`, textAlign: "right", color: s.emphasis ? TEAL : INK, fontWeight: s.emphasis ? 600 : 500 }}>{s.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Audit packet */}
        <Panel
          title="Audit packet"
          sub="One export. The reconciled figures, the checks, and the source mapping — what the auditor asks for, already assembled."
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" style={{ ...mono, fontSize: ".74rem", letterSpacing: ".04em", background: TEAL, color: CREAM, border: `1px solid ${TEAL}`, borderRadius: 6, padding: "10px 16px", cursor: "pointer" }}>
              Export audit packet (.pdf + .csv)
            </button>
            <button type="button" style={{ ...mono, fontSize: ".74rem", letterSpacing: ".04em", background: CARD, color: INK, border: `1px solid ${HAIR}`, borderRadius: 6, padding: "10px 16px", cursor: "pointer" }}>
              View source mapping
            </button>
            <button type="button" style={{ ...mono, fontSize: ".74rem", letterSpacing: ".04em", background: CARD, color: BODY, border: `1px solid ${HAIR}`, borderRadius: 6, padding: "10px 16px", cursor: "pointer" }}>
              Run again
            </button>
          </div>
        </Panel>

        {/* Footer copy */}
        <div style={{ marginTop: 26, paddingTop: 20, borderTop: `1px solid ${HAIR}`, ...mono, fontSize: ".7rem", letterSpacing: ".03em", color: MUTED, lineHeight: 1.8 }}>
          Runs on your machine · your data never leaves it · no BAA to sign.
          <br />
          <b style={{ color: INK }}>Illustrative — sample data, no patient records.</b> &nbsp;·&nbsp; Free edition. Compliance only — it drops the provider, shift, and exam dimensions on ingest. &nbsp;·&nbsp; Taylor C. Berger, Attorney · <a href="mailto:taylor@tcblaw.org" style={{ color: MUTED, textDecoration: "underline" }}>taylor@tcblaw.org</a>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section style={{ background: CARD, border: `1px solid ${HAIR}`, borderRadius: 10, padding: 24, marginBottom: 18, boxShadow: "0 1px 3px rgba(26,39,48,.04)" }}>
      <h2 style={{ ...serif, fontWeight: 500, fontSize: "1.32rem", color: INK, letterSpacing: "-.01em" }}>{title}</h2>
      <p style={{ color: MUTED, fontSize: ".88rem", margin: "6px 0 18px" }}>{sub}</p>
      {children}
    </section>
  );
}
