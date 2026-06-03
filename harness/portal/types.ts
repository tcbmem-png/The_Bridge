// Portal types. Each export the portal accepts maps to one staging or
// reference table. The portal validates SHAPE (required columns present,
// types parse). It does not validate CONTENT (FK closure, coverage); that
// is surfaced separately by the integrity panel.

export type ExportType =
  | "billing_export" // -> stg.claim_837
  | "era" //          -> stg.remit_835
  | "ris" //          -> stg.ris_exam
  | "bank" //         -> recon.bank_deposit
  | "ref_mpfs" //     -> ref.mpfs_wrvu
  | "ref_payer" //    -> ref.payer
  | "ref_facility" // -> ref.facility
  | "ref_provider"; // ref.provider

export interface StagedFile {
  type: ExportType;
  fileName: string;
  byteSize: number;
  rows: Record<string, unknown>[];
  /** Columns present in the CSV that the portal does not consume. */
  droppedColumns: string[];
  /** Required column names that were missing (block on load). */
  missingColumns: string[];
  /** Row-level type-parse failures, capped for display. */
  parseErrors: { row: number; column: string; value: unknown; reason: string }[];
}

export interface LoadProgress {
  fileName: string;
  table: string;
  rowsLoaded: number;
  rowsTotal: number;
}

export interface LoadResult {
  fileName: string;
  table: string;
  rowsLoaded: number;
}
