import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter } from "@/components/SiteFooter";
import optimizerMockup from "@/assets/optimizer-mockup.png";

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
const INK = "#1a2730";
const MUTED = "#8a8276";
const TEAL = "#1f8c79";
const HAIR = "#e0d9c8";

const mono: React.CSSProperties = { fontFamily: '"IBM Plex Mono", monospace' };
const serif: React.CSSProperties = { fontFamily: '"Fraunces", serif' };
const sans: React.CSSProperties = { fontFamily: '"Hanken Grotesk", sans-serif' };

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
