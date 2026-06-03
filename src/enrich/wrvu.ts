// Enrich: code → value-unit. A swappable "CPT → wRVU" table from a VERSIONED reference (the CMS file).
// Generic: replace this table per specialty or payment model. The version + conversion factor live in config,
// never hardcoded in logic. Unknown CPT → 0 wRVU (and is itself a data-quality signal, not a crash).

export type WrvuTable = Record<string, number>;

// Illustrative CY2026-shaped wRVU values for a few common radiology CPTs. Synthetic/illustrative.
export const WRVU_TABLE_CY2026: WrvuTable = {
  "70450": 0.85, // CT head/brain w/o contrast
  "70496": 1.75, // CT angiography head
  "72125": 1.16, // CT cervical spine w/o contrast
  "71046": 0.22, // Chest X-ray, 2 views
  "74177": 1.74, // CT abdomen & pelvis w/ contrast
  "70551": 1.48, // MRI brain w/o contrast
};

export function wrvuFor(cpt: string, table: WrvuTable): number {
  return table[cpt] ?? 0;
}
