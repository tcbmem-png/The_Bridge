import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
};

const PREFERS_REDUCED = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function CountUp({ value, format, duration = 550, className }: Props) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (PREFERS_REDUCED()) {
      setShown(value);
      return;
    }
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    startRef.current = null;

    const step = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const elapsed = t - startRef.current;
      const k = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = from + (to - from) * eased;
      setShown(v);
      if (k < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      fromRef.current = shown;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <span className={className}>{format(shown)}</span>;
}
