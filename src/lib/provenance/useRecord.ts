import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  isLoaded,
  loadSamplePackage,
  subscribeRecord,
  type LoadProgress,
  type LoadReport,
} from "../../../harness/runtime/recordDb";

const IDLE: LoadProgress = { phase: "idle", message: "No record loaded", fraction: 0 };

/** Boot state for the in-tab economic record. Session-only by construction. */
export function useRecord() {
  const loaded = useSyncExternalStore(
    subscribeRecord,
    () => isLoaded(),
    () => false,
  );
  const [progress, setProgress] = useState<LoadProgress>(IDLE);
  const [reports, setReports] = useState<LoadReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await loadSamplePackage(setProgress);
      setReports(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setProgress({ phase: "error", message: "Load failed", fraction: 0 });
    }
  }, []);

  return { loaded, progress, reports, error, load };
}

/** Run a record query once the record is loaded. */
export function useRecordQuery<T>(
  fn: () => Promise<T>,
  deps: unknown[],
  enabled: boolean,
): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    fn()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return { data, loading, error };
}
