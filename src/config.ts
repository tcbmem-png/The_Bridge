// Single source of truth for all entity names and illustrative numbers.
// Never hardcode names or numbers elsewhere — read from CONFIG.
export const CONFIG = {
  groupName: "the Physician Group",
  hospitalName: "the Hospital",
  edName: "the ED",
  examsPerYear: 800000,
  partnerCount: 200,
} as const;

export type Config = typeof CONFIG;
