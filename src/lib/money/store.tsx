// Shared, in-memory money-model store. No persistence (standing rule).
// One module, consumed by the Sandbox AND the Story win-row AND future panels.

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_INPUTS } from "./defaults";
import { derive } from "./compute";
import type { MoneyDerived, MoneyInputs } from "./types";

type Mode = "status_quo" | "collaborative_fix";

type Ctx = {
  inputs: MoneyInputs;
  setInputs: (updater: (prev: MoneyInputs) => MoneyInputs) => void;
  resetInputs: () => void;
  derived: MoneyDerived;
  mode: Mode;
  setMode: (m: Mode) => void;
};

const MoneyContext = createContext<Ctx | null>(null);

export function MoneyProvider({ children }: { children: ReactNode }) {
  const [inputs, setInputsState] = useState<MoneyInputs>(DEFAULT_INPUTS);
  const [mode, setMode] = useState<Mode>("collaborative_fix");

  const derived = useMemo(() => derive(inputs), [inputs]);

  const value: Ctx = {
    inputs,
    setInputs: (updater) => setInputsState((prev) => updater(prev)),
    resetInputs: () => setInputsState(DEFAULT_INPUTS),
    derived,
    mode,
    setMode,
  };

  return <MoneyContext.Provider value={value}>{children}</MoneyContext.Provider>;
}

export function useMoney(): Ctx {
  const ctx = useContext(MoneyContext);
  if (!ctx) throw new Error("useMoney must be used inside <MoneyProvider>");
  return ctx;
}
