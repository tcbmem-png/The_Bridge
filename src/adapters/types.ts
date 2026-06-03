// The adapter pattern: each box has ONE canonical record and ONE adapter per input form.
// Downstream sees only canonical records. New input form = one new adapter, zero downstream change.
// Real adapters (X12 837/835, PowerScribe SQL/ORU, RIS CSV/DICOM) are Phase 5, blocked on the extract answers.
// This interface is the seam they drop into.

export interface BoxAdapter<Raw, Canon> {
  form: string;                 // e.g. "csv", "x12-837", "powerscribe-sql"
  box: "billing" | "production" | "workflow";
  normalize(rows: Raw[]): Canon[];
}
