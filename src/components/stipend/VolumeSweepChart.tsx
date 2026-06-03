// Hand-rolled inline SVG. Two lines: with-stipend (flat ceiling) and
// without-stipend (downhill). Marker rests at today's 1× tick; drag right to
// add ER volume, left to cut. Respects prefers-reduced-motion.

import { useEffect, useMemo, useRef, useState } from "react";

type Sample = { erWrvu: number; distWith: number; distWithout: number };

const fmtKPerPartner = (x: number) => {
  const sign = x < 0 ? "−" : "";
  return `${sign}$${Math.round(Math.abs(x) / 1000).toLocaleString("en-US")}k`;
};

export function VolumeSweepChart({
  sweep,
  todayErWrvu,
  markerErWrvu,
  onMarkerChange,
}: {
  sweep: Sample[];
  todayErWrvu: number;
  markerErWrvu?: number;
  onMarkerChange?: (erWrvu: number) => void;
}) {
  // Geometry — viewBox in CSS-like units; SVG scales with the container.
  const W = 720;
  const H = 260;
  const PAD = { l: 56, r: 18, t: 18, b: 36 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const xs = sweep.map((s) => s.erWrvu);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yVals = sweep.flatMap((s) => [s.distWith, s.distWithout]);
  const yMin = Math.min(...yVals);
  const yMax = Math.max(...yVals);
  // Add 8% pad to y so the marker dots aren't on the edge.
  const ySpan = yMax - yMin || 1;
  const yLo = yMin - ySpan * 0.08;
  const yHi = yMax + ySpan * 0.08;

  const sx = (x: number) => PAD.l + ((x - xMin) / (xMax - xMin)) * innerW;
  const sy = (y: number) => PAD.t + (1 - (y - yLo) / (yHi - yLo)) * innerH;

  const pathFor = (key: "distWith" | "distWithout") =>
    sweep
      .map((s, i) => `${i === 0 ? "M" : "L"}${sx(s.erWrvu).toFixed(1)},${sy(s[key]).toFixed(1)}`)
      .join(" ");

  // Marker — controlled by parent if markerErWrvu provided, else internal.
  const [internalMarker, setInternalMarker] = useState(todayErWrvu);
  const lastTodayRef = useRef(todayErWrvu);
  useEffect(() => {
    if (Math.abs(lastTodayRef.current - todayErWrvu) > 1) {
      setInternalMarker(todayErWrvu);
      lastTodayRef.current = todayErWrvu;
    }
  }, [todayErWrvu]);

  const markerX = markerErWrvu ?? internalMarker;
  const setMarkerX = (v: number) => {
    if (markerErWrvu === undefined) setInternalMarker(v);
    onMarkerChange?.(v);
  };

  // Sample the lines at markerX (linear interp).
  const interp = useMemo(() => {
    if (sweep.length === 0) return { distWith: 0, distWithout: 0 };
    let i = 0;
    while (i < sweep.length - 1 && sweep[i + 1].erWrvu < markerX) i++;
    const a = sweep[i];
    const b = sweep[Math.min(i + 1, sweep.length - 1)];
    const t = b.erWrvu === a.erWrvu ? 0 : (markerX - a.erWrvu) / (b.erWrvu - a.erWrvu);
    return {
      distWith: a.distWith + (b.distWith - a.distWith) * t,
      distWithout: a.distWithout + (b.distWithout - a.distWithout) * t,
    };
  }, [sweep, markerX]);

  // Pointer drag — pin to client x → data x.
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef(false);
  const moveToClientX = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    const clamped = Math.max(PAD.l, Math.min(W - PAD.r, px));
    const dataX = xMin + ((clamped - PAD.l) / innerW) * (xMax - xMin);
    setMarkerX(dataX);
  };
  const onDown = (ev: React.PointerEvent) => {
    dragging.current = true;
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
    moveToClientX(ev.clientX);
  };
  const onMove = (ev: React.PointerEvent) => {
    if (!dragging.current) return;
    moveToClientX(ev.clientX);
  };
  const onUp = () => {
    dragging.current = false;
  };

  // X-axis ticks at 0, 1, 2, 3× today.
  const ticks = [0, 1, 2, 3]
    .map((m) => ({ m, x: todayErWrvu * m }))
    .filter((t) => t.x >= xMin && t.x <= xMax);

  // Y-axis ticks: round to nearest $50k.
  const yTicks: number[] = [];
  const step = 100_000;
  const tLo = Math.ceil(yLo / step) * step;
  for (let y = tLo; y <= yHi; y += step) yTicks.push(y);

  const todayX = sx(todayErWrvu);
  const markerPx = sx(markerX);

  // Zero line
  const zeroY = sy(0);
  const showZeroLine = 0 > yLo && 0 < yHi;

  return (
    <div className="overflow-hidden rounded-lg border border-ink/12 bg-paper">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full touch-none select-none"
        role="img"
        aria-label="Distribution per partner across ER volume, with and without stipend"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {/* Y-axis grid + labels */}
        {yTicks.map((y) => (
          <g key={`y${y}`}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={sy(y)}
              y2={sy(y)}
              stroke="currentColor"
              strokeOpacity={y === 0 ? 0 : 0.06}
              strokeDasharray="2 4"
            />
            <text
              x={PAD.l - 8}
              y={sy(y) + 3}
              textAnchor="end"
              className="fill-ink/55 font-mono"
              fontSize="10"
            >
              {fmtKPerPartner(y)}
            </text>
          </g>
        ))}

        {/* Zero baseline */}
        {showZeroLine && (
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={zeroY}
            y2={zeroY}
            stroke="currentColor"
            strokeOpacity={0.35}
          />
        )}

        {/* X-axis ticks */}
        {ticks.map((t) => (
          <g key={`x${t.m}`}>
            <line
              x1={sx(t.x)}
              x2={sx(t.x)}
              y1={H - PAD.b}
              y2={H - PAD.b + 4}
              stroke="currentColor"
              strokeOpacity={0.4}
            />
            <text
              x={sx(t.x)}
              y={H - PAD.b + 16}
              textAnchor="middle"
              className="fill-ink/55 font-mono"
              fontSize="10"
            >
              {t.m}× today
            </text>
          </g>
        ))}

        {/* Today's reference tick (vertical) */}
        <line
          x1={todayX}
          x2={todayX}
          y1={PAD.t}
          y2={H - PAD.b}
          stroke="currentColor"
          strokeOpacity={0.18}
          strokeDasharray="3 3"
        />

        {/* Without-stipend line (red) */}
        <path d={pathFor("distWithout")} fill="none" stroke="var(--red)" strokeWidth={2} />
        {/* With-stipend line (teal) */}
        <path d={pathFor("distWith")} fill="none" stroke="var(--teal)" strokeWidth={2.5} />

        {/* Marker dots on each line at markerX */}
        <circle cx={markerPx} cy={sy(interp.distWith)} r={4.5} fill="var(--teal)" />
        <circle
          cx={markerPx}
          cy={sy(interp.distWithout)}
          r={4.5}
          fill="var(--red)"
        />

        {/* Marker vertical handle */}
        <line
          x1={markerPx}
          x2={markerPx}
          y1={PAD.t}
          y2={H - PAD.b}
          stroke="var(--ink)"
          strokeOpacity={0.55}
          strokeWidth={1}
        />
        <rect
          x={markerPx - 5}
          y={H - PAD.b}
          width={10}
          height={6}
          fill="var(--ink)"
          opacity={0.7}
          rx={1.5}
        />
      </svg>

      {/* Legend + read-out */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 px-3 py-2 text-[11.5px]">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-[2px] w-4 bg-[var(--teal)]" />
            <span className="text-ink/70">With stipend</span>
            <span className="font-mono ml-1 font-semibold tabular-nums text-ink">
              {fmtKPerPartner(interp.distWith)}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-[2px] w-4 bg-[var(--red)]" />
            <span className="text-ink/70">Without stipend</span>
            <span className="font-mono ml-1 font-semibold tabular-nums text-ink">
              {fmtKPerPartner(interp.distWithout)}
            </span>
          </span>
        </div>
        <span className="font-mono-tab text-[10.5px] uppercase tracking-[0.1em] text-ink/45">
          {(markerX / todayErWrvu).toFixed(2)}× today · {Math.round(markerX).toLocaleString("en-US")} ER wRVU
        </span>
      </div>
    </div>
  );
}
