// Bidirectional ER-volume slider. Ported from the prototype's vanilla-JS
// scene into React, identical behavior. Illustrative numbers — the
// relationships are what must hold: with-stipend flat, without craters,
// stipend = the gap, freed-capacity upside on the left.
import { useMemo, useState } from "react";

const N = 60; // partners
const D = 180_000; // per-partner flat distribution with the structure
const WRVU = 90_000; // group ER wRVU today

const dragPP = (f: number) => 60_000 + 87_500 * (f - 1);
const without = (f: number) => D - dragPP(f);
const upside = (f: number) => (f < 1 ? D + (1 - f) * 45_000 : D);
const freed = (f: number) => (f < 1 ? (1 - f) * WRVU : 0);
const stipendTot = (f: number) => Math.max(0, dragPP(f)) * N;
const money = (v: number) => "$" + Math.round(v).toLocaleString("en-US");
const wr = (v: number) => Math.round(v).toLocaleString("en-US");

// chart geometry (zero-based)
const W = 680, H = 230, padL = 52, padR = 18, padT = 18, padB = 30;
const cW = W - padL - padR, cH = H - padT - padB;
const fMin = 0.4, fMax = 2.2, yMax = 220_000;
const sx = (f: number) => padL + ((f - fMin) / (fMax - fMin)) * cW;
const sy = (v: number) => padT + ((yMax - v) / yMax) * cH;

export function VolumeSlider() {
  const [vol, setVol] = useState(100);
  const f = vol / 100;
  const wo = without(f);
  const gp = stipendTot(f);
  const pct = Math.round((f - 1) * 100);
  const fr = freed(f);
  const up = upside(f) - D;

  const x = sx(f);
  const wy = sy(D);
  const labelLeft = x > W - 130;

  const tagWith = useMemo(() => {
    if (f < 1 && up > 500) return `held — plus ${money(up)}/partner if freed capacity redeploys`;
    return "flat — the structure holds you at any volume";
  }, [f, up]);

  const tagWithout = pct > 0
    ? `${money(D - wo)}/partner gone to the drag`
    : pct < 0
      ? "the drag eases as volume falls"
      : "the ER drag, straight off the top";

  const tagGap = pct > 0
    ? "their bill grows with the volume they order"
    : pct < 0
      ? "their bill shrinks — they save"
      : "their bill — it tracks the volume they order";

  const isRight = pct > 2;
  const isLeft = pct < -2;

  return (
    <div className="mt-[30px]">
      {/* Readouts */}
      <div className="my-[26px] flex flex-wrap gap-[14px]">
        <ReadoutCard label="Your distribution — with the structure" value={money(D)} tag={tagWith} held />
        <ReadoutCard label="Without it" value={money(wo)} tag={tagWithout} tone="fall" />
        <ReadoutCard label="The hospital's stipend / yr" value={money(gp)} tag={tagGap} tone="grow" />
      </div>

      {/* Chart */}
      <div className="rounded-[3px] border border-[var(--bridge-hair)] bg-[var(--bridge-cream-2)] px-[18px] pb-3 pt-[20px]">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="block h-auto w-full"
          aria-hidden="true"
        >
          {/* grid */}
          {[0, 90_000, 180_000].map((v) => (
            <g key={v}>
              <line x1={padL} y1={sy(v)} x2={W - padR} y2={sy(v)} stroke="#e4ddcc" />
              <text x={padL - 8} y={sy(v) + 3} textAnchor="end" fontFamily="IBM Plex Mono" fontSize={9} fill="#a59c8b">
                ${v / 1000}k
              </text>
            </g>
          ))}
          {/* gap fill */}
          <polygon
            points={`${sx(fMin)},${wy} ${sx(fMax)},${wy} ${sx(fMax)},${sy(without(fMax))} ${sx(fMin)},${sy(without(fMin))}`}
            fill="rgba(187,67,50,.10)"
          />
          {/* today */}
          <line x1={sx(1)} x2={sx(1)} y1={padT - 4} y2={H - padB} stroke="#c9c1ae" strokeDasharray="2 3" />
          <text x={sx(1) - 2} y={padT + 6} textAnchor="end" fontFamily="IBM Plex Mono" fontSize={10} fill="#8a8276" letterSpacing="1">today</text>
          {/* upside */}
          <path
            d={`M${sx(fMin)},${sy(upside(fMin))} L${sx(1)},${wy}`}
            fill="none"
            stroke="var(--teal)"
            strokeWidth={1.6}
            strokeDasharray="2 4"
            opacity={0.7}
          />
          {/* without */}
          <path
            d={`M${sx(fMin)},${sy(without(fMin))} L${sx(fMax)},${sy(without(fMax))}`}
            fill="none"
            stroke="var(--red-clinical)"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
          {/* with */}
          <path d={`M${sx(fMin)},${wy} L${sx(fMax)},${wy}`} fill="none" stroke="var(--teal)" strokeWidth={2.5} />
          {/* marker */}
          <line x1={x} x2={x} y1={padT - 4} y2={H - padB + 4} stroke="#bdb6a5" strokeDasharray="3 3" />
          <circle cx={x} cy={wy} r={4.5} fill="var(--teal)" />
          <circle cx={x} cy={sy(wo)} r={4} fill="var(--red-clinical)" />
          <text
            x={labelLeft ? x - 8 : x + 8}
            y={wy - 8}
            textAnchor={labelLeft ? "end" : "start"}
            fontFamily="IBM Plex Mono"
            fontSize={11}
            fill="var(--ink)"
          >
            {money(D)}
          </text>
          <text
            x={labelLeft ? x - 8 : x + 8}
            y={sy(wo) + 16}
            textAnchor={labelLeft ? "end" : "start"}
            fontFamily="IBM Plex Mono"
            fontSize={11}
            fill="var(--red-clinical)"
          >
            {money(wo)}
          </text>
        </svg>
        <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-2 px-1 font-mono-tab text-[10.5px] tracking-[0.05em] text-[var(--bridge-muted)]">
          <LegendSwatch color="var(--teal)" label="with the structure" />
          <LegendSwatch color="var(--red-clinical)" label="without" />
          <LegendSwatch color="rgba(187,67,50,.35)" label="the stipend" />
          <LegendSwatch color="var(--teal)" opacity={0.5} label="freed-capacity upside" />
        </div>
      </div>

      {/* Slider */}
      <div className="mt-[26px]">
        <div className="mb-[14px] flex items-baseline justify-between font-mono-tab text-[11.5px] tracking-[0.08em] text-[var(--bridge-muted)]">
          <span>ER volume vs today</span>
          <b className="text-[15px] font-medium text-teal">
            {pct === 0 ? "today" : (pct > 0 ? "+" : "") + pct + "%"}
          </b>
        </div>
        <input
          type="range"
          min={40}
          max={220}
          step={1}
          value={vol}
          onChange={(e) => setVol(+e.target.value)}
          aria-label="ER volume vs today"
          className="bridge-range w-full"
        />
        <div className="mt-3 flex justify-between font-mono-tab text-[10.5px] tracking-[0.06em] text-[var(--bridge-muted)]">
          <span>−60% &nbsp;cut the waste</span>
          <span className="text-ink">today</span>
          <span>+120% &nbsp;storm continues</span>
        </div>
      </div>

      {/* Consequence */}
      <div
        className={
          "mt-6 min-h-[84px] max-w-[54ch] border-l-2 px-5 py-[18px] transition-colors " +
          (isRight
            ? "border-[var(--red-clinical)] bg-[color-mix(in_oklab,var(--red-clinical)_6%,transparent)]"
            : "border-[var(--teal)] bg-[color-mix(in_oklab,var(--teal)_6%,transparent)]")
        }
      >
        {isRight ? (
          <>Push it right and the drag grows, the stipend grows, your distribution craters. The cost of that volume belongs to the hospital whose orders create it — the contract is what puts it there.</>
        ) : isLeft ? (
          <>Pull it left — fewer wasteful scans — and the stipend shrinks (the hospital saves) while ~<b className="font-medium text-ink">{wr(fr)} wRVU</b> free up: high-yield backlog cleared, or time back. You're both pulling the same way.</>
        ) : (
          <>This is today. Both sides want to move left. The only question the contract answers is who pays when it moves right.</>
        )}
      </div>

      <p className="mt-6 max-w-[50ch] text-[var(--bridge-body)]">
        <b className="font-medium text-ink">A shared picture, not a weapon.</b>{" "}
        The slider is the same for both sides — everyone wants it left. The only thing the contract decides is who carries the cost of pushing it right.
      </p>
    </div>
  );
}

function ReadoutCard({
  label, value, tag, held, tone,
}: { label: string; value: string; tag: string; held?: boolean; tone?: "fall" | "grow" }) {
  return (
    <div
      className={
        "min-w-[150px] flex-1 rounded-[3px] border px-5 py-[18px] " +
        (held
          ? "border-[color-mix(in_oklab,var(--teal)_40%,transparent)] bg-[color-mix(in_oklab,var(--teal)_6%,transparent)]"
          : "border-[var(--bridge-hair)] bg-[var(--bridge-cream-2)]")
      }
    >
      <div className="mb-3 font-mono-tab text-[10.5px] uppercase leading-[1.4] tracking-[0.1em] text-[var(--bridge-muted)]">
        {label}
      </div>
      <div className="font-display text-[1.8rem] font-medium leading-none tracking-[-0.01em] text-ink">
        {value}
      </div>
      <div
        className={
          "mt-2.5 font-mono-tab text-[10.5px] leading-[1.5] tracking-[0.05em] " +
          (held ? "text-teal" : tone === "fall" ? "text-[var(--red-clinical)]" : "text-[var(--bridge-muted)]")
        }
      >
        {tag}
      </div>
    </div>
  );
}

function LegendSwatch({ color, label, opacity = 1 }: { color: string; label: string; opacity?: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="inline-block h-[2px] w-[18px]" style={{ background: color, opacity }} />
      {label}
    </span>
  );
}
