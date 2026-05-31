// Render a Spec to architecture-spec Markdown.
// Section 10 framing: lead with what the group already has.

import type { Answers, Spec } from "./types";

const STATUS_LABEL: Record<string, string> = {
  live: "live",
  pending_source: "pending — source",
  pending_compliance: "pending — compliance",
};

function leadingCredit(a: Answers, tier: string): string {
  const have: string[] = [];
  if (a.mpower === "used" || a.mpower === "unused") have.push("mPower");
  if (a.warehouse === "yes") have.push("a data warehouse");
  if (a.bi_tool && a.bi_tool !== "none") {
    have.push(a.bi_tool === "power_bi" ? "Power BI" : "Tableau");
  }
  if (a.analyst === "yes") have.push("an analyst");
  if (have.length === 0) {
    return `The build sits at the **${tier}** tier.`;
  }
  const list =
    have.length === 1
      ? have[0]
      : have.length === 2
        ? `${have[0]} and ${have[1]}`
        : `${have.slice(0, -1).join(", ")} and ${have[have.length - 1]}`;
  return `Leveraging your existing ${list}, the build sits at the **${tier}** tier.`;
}

function profileLine(a: Answers): string {
  const lines = [
    `- Billing: \`${a.rcm_owner ?? "unknown"}\` · history \`${a.rcm_history ?? "unknown"}\``,
    `- Reporting: \`${a.reporting ?? "unknown"}\` · mPower \`${a.mpower ?? "unknown"}\``,
    `- Read location: \`${a.read_loc ?? "unknown"}\` · PACS timestamps \`${a.pacs_ts ?? "unknown"}\``,
    `- Data capability: BI \`${a.bi_tool ?? "unknown"}\` · warehouse \`${a.warehouse ?? "unknown"}\` · analyst \`${a.analyst ?? "unknown"}\``,
    `- Governance: BAA \`${a.baa ?? "unknown"}\` · de-identified extract \`${a.deid_ok ?? "unknown"}\``,
  ];
  return lines.join("\n");
}

export function renderSpecMarkdown(answers: Answers, spec: Spec): string {
  const out: string[] = [];

  out.push(`# Architecture spec — illustrative`);
  out.push("");
  out.push(
    `_All numbers shown in this demo are illustrative. The spec below describes the data harness only._`,
  );
  out.push("");
  out.push(leadingCredit(answers, spec.storageTier.tier));
  out.push("");

  // 1. Profile
  out.push(`## Profile`);
  out.push(profileLine(answers));
  out.push("");

  // 2. Sources
  out.push(`## Data sources & acquisition`);
  for (const s of spec.sources) {
    out.push(`### ${s.name}`);
    out.push(`- Route: ${s.route}`);
    out.push(`- Access needed: ${s.accessNeeded}`);
    out.push(`- Lead: ${s.lead.replace(/_/g, " ")}`);
    out.push(`- Ready: ${s.ready ? "yes" : "no"}`);
    if (s.note) out.push(`- Note: ${s.note}`);
    out.push("");
  }

  // 3. Storage / build tier
  out.push(`## Storage / build tier`);
  out.push(`- Tier: **${spec.storageTier.tier}**`);
  out.push(`- ${spec.storageTier.description}`);
  out.push(`- ${spec.storageTier.effortNote}`);
  out.push("");

  // 4. Schema
  out.push(`## Canonical fact-table schema`);
  out.push(`- Grain: ${spec.schemaInvariant.factGrain}`);
  out.push(`- Dimensions:`);
  for (const d of spec.schemaInvariant.dimensions) out.push(`  - ${d}`);
  out.push("");

  // 5. Metrics
  out.push(`## Metric definitions (invariants)`);
  for (const m of spec.metricsInvariant) out.push(`- ${m}`);
  out.push("");

  // 6. Panels
  out.push(`## Dashboard panels at launch`);
  for (const p of spec.panels) {
    const label = STATUS_LABEL[p.status] ?? p.status;
    const needs = p.needs.length ? ` — needs: ${p.needs.join("; ")}` : "";
    out.push(`- **${p.name}** — ${label}${needs}`);
  }
  out.push("");

  // 7. Compliance
  out.push(`## Compliance & access`);
  out.push(`- Cleared: ${spec.compliance.cleared ? "yes" : "no"}`);
  if (spec.compliance.gates.length) {
    out.push(`- Gates:`);
    for (const g of spec.compliance.gates) out.push(`  - ${g}`);
  } else {
    out.push(`- Gates: none.`);
  }
  out.push(`- Permissions / APIs:`);
  for (const p of spec.permissionsAPIs) out.push(`  - ${p}`);
  out.push("");

  // 8. Sequence
  out.push(`## Build sequence & timeline`);
  out.push(`- Timeline: ${spec.timelineBand}`);
  for (const s of spec.sequence) out.push(`  1. ${s}`);
  out.push("");

  // 9. Open dependencies
  out.push(`## Open dependencies`);
  const open: string[] = [];
  for (const p of spec.panels) {
    if (p.status !== "live") {
      open.push(`${p.name} — ${STATUS_LABEL[p.status]}${p.needs.length ? `: ${p.needs.join("; ")}` : ""}`);
    }
  }
  if (open.length === 0) out.push(`- None. All eight panels are live.`);
  else for (const o of open) out.push(`- ${o}`);
  out.push("");

  // Flags
  if (spec.flags.length) {
    out.push(`## Flags`);
    for (const f of spec.flags) out.push(`- ${f}`);
    out.push("");
  }

  return out.join("\n");
}
