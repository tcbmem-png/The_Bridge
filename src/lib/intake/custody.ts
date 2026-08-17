// Cryptographic chain of custody.
//
// Every file that arrives is hashed over its RAW BYTES, as received, before a
// parser touches it. The hash is taken once and never recomputed from a
// normalized copy — that is the whole point: it proves the record was built
// from the bytes the group handed over, and lets anyone re-derive the same
// hash from their own copy of the same file.
//
// A file that is not loaded still gets a custody entry. Received-and-not-loaded
// is a visible state, never a silent discard.

export type CustodyStatus = "loaded" | "ambiguous" | "unrecognized" | "rejected";

export interface CustodyEntry {
  fileName: string;
  byteSize: number;
  /** SHA-256 over the raw bytes as received. Null only if WebCrypto is absent. */
  sha256: string | null;
  receivedAt: string;
  status: CustodyStatus;
  /** Detected source key, when one claimed the file. */
  sourceKey: string | null;
  stage: string | null;
  rows: number;
  rejectedRows: number;
  repairs: number;
  /** Why this status, in one sentence. */
  note: string;
}

/** SHA-256 over raw bytes. Bytes in, hex out; no parsing, no normalization. */
export async function hashBytes(bytes: ArrayBuffer | Uint8Array): Promise<string | null> {
  try {
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const copy = new Uint8Array(view.byteLength);
    copy.set(view);
    const digest = await crypto.subtle.digest("SHA-256", copy);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}


/** Short form for display. The full hash is always available on hover/copy. */
export function shortHash(sha: string | null): string {
  return sha ? `${sha.slice(0, 8)}…${sha.slice(-6)}` : "unhashed";
}

const KEY = "bridge.custody.v1";

export function loadCustody(): CustodyEntry[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CustodyEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveCustody(entries: CustodyEntry[]): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* session storage unavailable — custody stays in memory for this view */
  }
}

export function clearCustody(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(KEY);
}

/** Two files with the same hash are the same bytes — flag the duplicate. */
export function duplicateHashes(entries: CustodyEntry[]): string[] {
  const seen = new Map<string, number>();
  for (const e of entries) if (e.sha256) seen.set(e.sha256, (seen.get(e.sha256) ?? 0) + 1);
  return [...seen.entries()].filter(([, n]) => n > 1).map(([h]) => h);
}
