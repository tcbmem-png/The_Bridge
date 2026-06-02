// Per-site model. Pure data. All fractions (sum to 1.0), not percent points.
import type { PayerKey } from "../money/types";

export type SiteKind = "hospital" | "group_outside";

export type SiteMix = Record<PayerKey, number>; // fractions, ideally sum to 1

export type Site = {
  id: string;
  label: string;
  kind: SiteKind;
  is_catch_site: boolean;
  wrvu_share: number; // fraction of W_total, all sites sum to 1
  payer_mix: SiteMix;
  /** ILLUSTRATIVE pin status — every field on this page is a placeholder. */
  pin: "illustrative";
};

export type SiteComputed = {
  id: string;
  wrvu_i: number;
  mix_yield_i: number;
  coll_share_i: number;
  collections_i: number; // rounded to cents (residual is derived by subtraction)
  yield_eff_i: number;
  gap_i: number; // signed; rounded to cents on the residual via subtraction
};

export type SitesOutputs = {
  y_bar: number;
  W_total: number;
  C_total: number;
  per_site: SiteComputed[];
  stipend_need: number; // signed sum across catch sites
  identity_collections_ok: boolean;
  identity_gap_ok: boolean;
};
