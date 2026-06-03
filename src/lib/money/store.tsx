// Shared, in-memory money-model store. No persistence (standing rule) —
// EXCEPT a session-scoped hydration from the harness preset, so figures the
// user just derived from their loaded dataset flow into Sandbox + Story.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_INPUTS } from "./defaults";
import { derive } from "./compute";
import type { MoneyDerived, MoneyInputs } from "./types";
import {
  PRESET_EVENT,
  PRESET_STORAGE_KEY,
  clearPreset as clearPresetRaw,
  readPreset,
  type DerivedPreset,
} from "../../../harness/runtime/derivePreset";

type Mode = "status_quo" | "collaborative_fix";

type Ctx = {
  inputs: MoneyInputs;
  setInputs: (updater: (prev: MoneyInputs) => MoneyInputs) => void;
  resetInputs: () => void;
  derived: MoneyDerived;
  mode: Mode;
  setMode: (m: Mode) => void;
  presetLabel: string | null;
  presetSource: DerivedPreset["source"] | null;
  clearPreset: () => void;
};

const MoneyContext = createContext<Ctx | null>(null);

function applyPreset(base: MoneyInputs, p: DerivedPreset): MoneyInputs {
  return {
    ...base,
    coverage_volume: p.coverage_volume,
    avg_wRVU_per_read: p.avg_wRVU_per_read,
    payer_mix: p.payer_mix,
  };
}

export function MoneyProvider({ children }: { children: ReactNode }) {
  // Hydrate from sessionStorage on first render (browser only).
  const initial = useMemo(() => {
    if (typeof window === "undefined") return { inputs: DEFAULT_INPUTS, preset: null as DerivedPreset | null };
    const p = readPreset();
    return { inputs: p ? applyPreset(DEFAULT_INPUTS, p) : DEFAULT_INPUTS, preset: p };
  }, []);

  const [inputs, setInputsState] = useState<MoneyInputs>(initial.inputs);
  const [preset, setPreset] = useState<DerivedPreset | null>(initial.preset);
  const [mode, setMode] = useState<Mode>("collaborative_fix");

  // React to harness-side publish/clear events within the same tab.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<DerivedPreset | null>).detail ?? readPreset();
      if (detail) {
        setPreset(detail);
        setInputsState(applyPreset(DEFAULT_INPUTS, detail));
      } else {
        setPreset(null);
        setInputsState(DEFAULT_INPUTS);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== PRESET_STORAGE_KEY) return;
      onChange(new CustomEvent(PRESET_EVENT, { detail: readPreset() }));
    };
    window.addEventListener(PRESET_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PRESET_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const derived = useMemo(() => derive(inputs), [inputs]);

  const value: Ctx = {
    inputs,
    setInputs: (updater) => setInputsState((prev) => updater(prev)),
    resetInputs: () => setInputsState(preset ? applyPreset(DEFAULT_INPUTS, preset) : DEFAULT_INPUTS),
    derived,
    mode,
    setMode,
    presetLabel: preset?.source.label ?? null,
    presetSource: preset?.source ?? null,
    clearPreset: () => {
      clearPresetRaw();
      setPreset(null);
      setInputsState(DEFAULT_INPUTS);
    },
  };

  return <MoneyContext.Provider value={value}>{children}</MoneyContext.Provider>;
}

export function useMoney(): Ctx {
  const ctx = useContext(MoneyContext);
  if (!ctx) throw new Error("useMoney must be used inside <MoneyProvider>");
  return ctx;
}
