import React from 'react';
import { SPIDER_CATCH_MS } from '../utils/config';

// ─── SPIDER LEG OFFSETS [kx, ky, tx, ty] from (x, headY) ──
const LEG_R = [
  [20, -22, 38, -14],
  [24,  -8, 42,  -1],
  [22,   8, 38,  20],
  [17,  21, 28,  36],
];

export function SpiderSVG({ spider, now }) {
  const { x, y, state, caughtAt, points, baseX } = spider;
  const isCaught     = state === 'caught';
  const catchElapsed = isCaught ? now - caughtAt : 0;
  if (isCaught && catchElapsed > SPIDER_CATCH_MS) return null;

  const alpha      = isCaught ? Math.max(0, 1 - catchElapsed / SPIDER_CATCH_MS) : 1;
  const hY         = y - 28;
  const bodyFill   = isCaught ? '#2a0000' : '#0c0c1e';
  const bodyStroke = isCaught ? '#ff4444' : '#ecedf1';
  const legStroke  = isCaught ? '#ff6666' : '#ebeef1';
  const eyeColor   = isCaught ? '#ff8888' : '#ff1111';

  return (
    <g opacity={alpha}>
      {/* Silk thread */}
      <line x1={baseX} y1={0} x2={x} y2={hY - 10}
        stroke="white" strokeWidth="0.6" opacity="0.22" />

      {/* Legs — right */}
      {LEG_R.map(([kx, ky, tx, ty], i) => (
        <path key={`r${i}`}
          d={`M ${x} ${hY} L ${(x+kx).toFixed(1)} ${(hY+ky).toFixed(1)} L ${(x+tx).toFixed(1)} ${(hY+ty).toFixed(1)}`}
          stroke={legStroke} strokeWidth="1.5" fill="none"
          strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {/* Legs — left (mirror) */}
      {LEG_R.map(([kx, ky, tx, ty], i) => (
        <path key={`l${i}`}
          d={`M ${x} ${hY} L ${(x-kx).toFixed(1)} ${(hY+ky).toFixed(1)} L ${(x-tx).toFixed(1)} ${(hY+ty).toFixed(1)}`}
          stroke={legStroke} strokeWidth="1.5" fill="none"
          strokeLinecap="round" strokeLinejoin="round" />
      ))}

      {/* Abdomen */}
      <ellipse cx={x} cy={y} rx={14} ry={16}
        fill={bodyFill} stroke={bodyStroke} strokeWidth="1.5" />

      {/* Cephalothorax */}
      <ellipse cx={x} cy={hY} rx={10} ry={9}
        fill={bodyFill} stroke={bodyStroke} strokeWidth="1.5" />

      {/* Eyes */}
      <circle cx={x - 4} cy={hY - 2} r="2.5" fill={eyeColor} />
      <circle cx={x + 4} cy={hY - 2} r="2.5" fill={eyeColor} />

      {/* Score popup when caught */}
      {isCaught && (
        <text x={x} y={hY - 32 - catchElapsed * 0.06}
          textAnchor="middle" fill="#00ff88"
          fontSize="22" fontWeight="bold"
          fontFamily="'Courier New',monospace"
          opacity={Math.max(0, 1 - catchElapsed / SPIDER_CATCH_MS)}>
          +{points}
        </text>
      )}
    </g>
  );
}
