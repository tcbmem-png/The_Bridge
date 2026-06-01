// Group ⇄ Hospital lens. Re-narration only — no new math, no new money paths.
// The toggle changes which framing the dashboard renders; the fact table,
// money module, and engine readiness are unchanged. Default: "group".
//
// THE ONE RULE: render don't author. A Hospital cut that needs hospital-owned
// data is GATED behind a DUA (data-use agreement) state — never a made-up
// number. Group and Hospital views of the same metric reconcile to the dollar
// because they read the same useMoney()/spec.

import { createContext, useContext, useState, type ReactNode } from "react";

export type Lens = "group" | "hospital";

type Ctx = {
  lens: Lens;
  setLens: (l: Lens) => void;
};

const LensContext = createContext<Ctx | null>(null);

export function LensProvider({ children }: { children: ReactNode }) {
  const [lens, setLens] = useState<Lens>("group");
  return (
    <LensContext.Provider value={{ lens, setLens }}>
      {children}
    </LensContext.Provider>
  );
}

export function useLens(): Ctx {
  const ctx = useContext(LensContext);
  if (!ctx) throw new Error("useLens must be used inside <LensProvider>");
  return ctx;
}
