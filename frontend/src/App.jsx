import React, { useState, useEffect, useRef } from 'react';
import './index.css';

// ─── CONFIG ────────────────────────────────────────────────
const DURATION_WEB    = 450;
const DURATION_HOLD   = 2400;
const DURATION_FADE   = 1400;
const TOTAL_WEB_LIFE  = DURATION_WEB + DURATION_HOLD + DURATION_FADE;
const HIT_RADIUS      = 110;   // px — distance from target to catch a spider
const SPIDER_CATCH_MS = 1100;  // ms caught spider stays before disappearing
const SPIDER_INTERVAL = 2200;  // ms between new spiders
const MAX_SPIDERS     = 7;

// ─── MAKE SHOT ─────────────────────────────────────────────
function makeShot(target) {
  const numRadials = 12 + Math.floor(Math.random() * 3);
  const numRings   =  5 + Math.floor(Math.random() * 2);
  const shot = {
    id: crypto.randomUUID(),
    targetX:      target.x,
    targetY:      target.y,
    createdAt:    performance.now(),
    numRadials,
    numRings,
    webRadius:    180 + Math.floor(Math.random() * 60),
    ringSkew:     Array.from({ length: numRings + 2 }, () => 0.78 + Math.random() * 0.10),
    radialJitter: Array.from({ length: numRadials + 2 }, () => (Math.random() - 0.5) * 0.12),
  };
  if (!['targetX','targetY'].every(k => Number.isFinite(shot[k]))) return null;
  return shot;
}

// ─── MAKE SPIDER ───────────────────────────────────────────
function makeSpider() {
  const baseX = 80 + Math.random() * (window.innerWidth - 160);
  return {
    id:         crypto.randomUUID(),
    baseX,
    x:          baseX,
    y:          -80,
    vy:         0.045 + Math.random() * 0.065,  // px/ms → 45–110 px/s
    swingAmp:   25 + Math.random() * 40,
    swingFreq:  0.4 + Math.random() * 1.2,
    swingPhase: Math.random() * Math.PI * 2,
    state:      'falling',   // 'falling' | 'caught'
    caughtAt:   null,
    points:     10,
  };
}

// ─── WEB PATH BUILDER ──────────────────────────────────────
function buildWebPaths(shot, radius) {
  const { targetX: cx, targetY: cy, numRadials, numRings, ringSkew, radialJitter } = shot;
  const paths = [];

  const angles = Array.from({ length: numRadials }, (_, i) =>
    (i / numRadials) * Math.PI * 2 + (radialJitter[i] || 0)
  );

  for (let i = 0; i < numRadials; i++) {
    const x2 = cx + Math.cos(angles[i]) * radius;
    const y2 = cy + Math.sin(angles[i]) * radius;
    paths.push({ type: 'radial', d: `M ${cx} ${cy} L ${x2.toFixed(1)} ${y2.toFixed(1)}` });
  }

  for (let r = 1; r <= numRings; r++) {
    const rr  = (radius / numRings) * r;
    const sag = ringSkew[r - 1] || 0.82;
    const pts = angles.map(a => ({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr }));
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} `;
    for (let i = 0; i < numRadials; i++) {
      const p2 = pts[(i + 1) % numRadials];
      const a1 = angles[i];
      let   a2 = angles[(i + 1) % numRadials];
      if (a2 < a1) a2 += Math.PI * 2;
      const aMid = (a1 + a2) / 2;
      const cpx = cx + Math.cos(aMid) * rr * sag;
      const cpy = cy + Math.sin(aMid) * rr * sag;
      d += `Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} `;
    }
    d += 'Z';
    paths.push({ type: 'ring', d: d.trim(), r });
  }
  return paths;
}

// ─── WEB STRAND COMPONENT ──────────────────────────────────
function WebStrand({ shot, now }) {
  const elapsed = now - shot.createdAt;
  if (elapsed > TOTAL_WEB_LIFE) return null;

  const rawWebT = Math.min(elapsed / DURATION_WEB, 1);
  const easeWeb = 1 - Math.pow(1 - rawWebT, 3);
  const holdEnd = DURATION_WEB + DURATION_HOLD;
  const fadeT   = elapsed < holdEnd ? 0 : (elapsed - holdEnd) / DURATION_FADE;
  const alpha   = Math.max(0, 1 - fadeT);

  const webRadius = shot.webRadius * easeWeb;
  const webPaths  = rawWebT > 0 ? buildWebPaths(shot, webRadius) : [];

  const impactT    = Math.min(elapsed / 280, 1);
  const showImpact = impactT < 1;

  return (
    <g opacity={alpha}>
      {showImpact && (
        <circle cx={shot.targetX} cy={shot.targetY}
          r={65 * impactT} stroke="white"
          strokeWidth={3 * (1 - impactT)} fill="none" opacity={1 - impactT} />
      )}
      {webPaths.map((p, i) => {
        const isRadial  = p.type === 'radial';
        const ringDepth = isRadial ? 0 : p.r / shot.numRings;
        return (
          <path key={i} d={p.d} stroke="white" fill="none"
            strokeWidth={isRadial ? 1.0 : 1.4}
            opacity={isRadial ? 0.65 : (0.95 - ringDepth * 0.18)} />
        );
      })}
      <circle cx={shot.targetX} cy={shot.targetY} r="3.5" fill="white" opacity={0.95} />
      {showImpact && Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <circle key={i}
            cx={shot.targetX + Math.cos(a) * 58 * impactT}
            cy={shot.targetY + Math.sin(a) * 58 * impactT}
            r={3 * (1 - impactT)} fill="white" opacity={1 - impactT} />
        );
      })}
    </g>
  );
}

// ─── SPIDER LEG OFFSETS [kx, ky, tx, ty] from (x, headY) ─
const LEG_R = [
  [20, -22, 38, -14],
  [24,  -8, 42,  -1],
  [22,   8, 38,  20],
  [17,  21, 28,  36],
];

// ─── SPIDER COMPONENT ──────────────────────────────────────
function SpiderSVG({ spider, now }) {
  const { x, y, state, caughtAt, points, baseX } = spider;
  const isCaught    = state === 'caught';
  const catchElapsed = isCaught ? now - caughtAt : 0;
  if (isCaught && catchElapsed > SPIDER_CATCH_MS) return null;

  const alpha      = isCaught ? Math.max(0, 1 - catchElapsed / SPIDER_CATCH_MS) : 1;
  const hY         = y - 28;
  const bodyFill   = isCaught ? '#2a0000' : '#0c0c1e';
  const bodyStroke = isCaught ? '#ff4444' : '#7788bb';
  const legStroke  = isCaught ? '#ff6666' : '#6688aa';
  const eyeColor   = isCaught ? '#ff8888' : '#ff1111';

  return (
    <g opacity={alpha}>
      {/* Silk thread from anchor at top to spider head */}
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

      {/* Caught score popup */}
      {isCaught && (
        <text
          x={x} y={hY - 32 - catchElapsed * 0.06}
          textAnchor="middle"
          fill="#00ff88" fontSize="22" fontWeight="bold"
          fontFamily="'Courier New', monospace"
          opacity={Math.max(0, 1 - catchElapsed / SPIDER_CATCH_MS)}
        >
          +{points}
        </text>
      )}
    </g>
  );
}

// ─── GAME LAYER — single SVG + single RAF ─────────────────
function GameLayer({ shots, spidersRef }) {
  const [, setTick] = useState(0);
  const rafRef      = useRef(null);
  const lastTRef    = useRef(performance.now());

  useEffect(() => {
    const loop = (ts) => {
      const dt  = Math.min(ts - lastTRef.current, 50);
      lastTRef.current = ts;
      const now = performance.now();

      // Update spider positions & remove expired ones
      const spiders = spidersRef.current;
      for (let i = spiders.length - 1; i >= 0; i--) {
        const s = spiders[i];
        if (s.state === 'falling') {
          s.y += s.vy * dt;
          s.x  = s.baseX + Math.sin((ts / 1000) * s.swingFreq + s.swingPhase) * s.swingAmp;
          if (s.y > window.innerHeight + 80) spiders.splice(i, 1);
        } else if (s.state === 'caught' && now - s.caughtAt > SPIDER_CATCH_MS) {
          spiders.splice(i, 1);
        }
      }

      setTick(t => t + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [spidersRef]);

  const now = performance.now();

  return (
    <svg style={{
      position: 'fixed', inset: 0,
      width: '100vw', height: '100vh',
      pointerEvents: 'none', zIndex: 500, overflow: 'visible',
    }}>
      {shots.map(s  => <WebStrand key={s.id}  shot={s}    now={now} />)}
      {spidersRef.current.map(s => <SpiderSVG key={s.id} spider={s} now={now} />)}
    </svg>
  );
}

// ─── CROSSHAIR ─────────────────────────────────────────────
function Crosshair({ target, locked }) {
  const color = locked ? '#ff3060' : '#4aedff';
  const glow  = locked ? '0 0 14px #ff3060, 0 0 28px #ff3060' : '0 0 10px #4aedff';
  return (
    <div style={{ position:'fixed', left:target.x, top:target.y, transform:'translate(-50%,-50%)', pointerEvents:'none', zIndex:1000 }}>
      <div style={{ position:'absolute', width:58, height:58, borderRadius:'50%', border:`2px solid ${color}`, boxShadow:glow, transform:'translate(-50%,-50%)', transition:'all 0.2s' }} />
      <div style={{ position:'absolute', width:4, height:4, borderRadius:'50%', background:color, boxShadow:glow, transform:'translate(-50%,-50%)' }} />
      <div style={{ position:'absolute', width:72, height:1, background:color, opacity:0.55, transform:'translate(-50%,-50%)' }} />
      <div style={{ position:'absolute', width:1, height:72, background:color, opacity:0.55, transform:'translate(-50%,-50%)' }} />
      {locked && (
        <div style={{ position:'absolute', top:-42, left:'50%', transform:'translateX(-50%)', color:'#ff3060', fontSize:11, fontWeight:'bold', textShadow:'0 0 8px #ff3060', whiteSpace:'nowrap', animation:'pulse 0.8s infinite' }}>
          TARGET LOCKED
        </div>
      )}
      <div style={{ position:'absolute', top:40, left:'50%', transform:'translateX(-50%)', color, fontSize:10, whiteSpace:'nowrap', opacity:0.75 }}>
        {target.x.toFixed(0)} / {target.y.toFixed(0)}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }`}</style>
    </div>
  );
}

// ─── HUD ───────────────────────────────────────────────────
function HUD({ target, score, spiderCount }) {
  return (
    <div style={{ position:'fixed', top:20, right:20, border:'1px solid #4aedff', background:'rgba(5,10,18,0.88)', padding:'14px 18px', borderRadius:4, boxShadow:'0 0 14px rgba(74,237,255,0.12)', zIndex:1000, lineHeight:1.85, minWidth:200 }}>
      <div style={{ borderBottom:'1px solid #4aedff', paddingBottom:6, marginBottom:10, fontWeight:'bold', letterSpacing:2, fontSize:12 }}>
        WEB SHOOTER SYSTEM
      </div>
      <div style={{ color:'#88aaff' }}>INPUT: MOUSE SIMULATION</div>
      <div style={{ color:'#00ffcc' }}>STATUS: ONLINE</div>

      {/* Score */}
      <div style={{ marginTop:14, borderTop:'1px solid #223', paddingTop:10 }}>
        <div style={{ color:'#ffcc00', fontSize:11, letterSpacing:1 }}>SCORE</div>
        <div style={{ color:'#ffcc00', fontSize:28, fontWeight:'bold', lineHeight:1.2 }}>
          {String(score).padStart(6, '0')}
        </div>
        <div style={{ color:'#888', fontSize:11, marginTop:2 }}>
          SPIDERS ACTIVE: {spiderCount}
        </div>
      </div>

      <div style={{ marginTop:12, color:'#88aaff' }}>TARGET</div>
      <div>X: {target.x.toFixed(0)}</div>
      <div>Y: {target.y.toFixed(0)}</div>
      <div style={{ marginTop:12, color:'#88aaff' }}>NORMALIZED</div>
      <div>X: {target.normalizedX.toFixed(3)}</div>
      <div>Y: {target.normalizedY.toFixed(3)}</div>
      <div style={{ marginTop:12, color:'#ffaa00' }}>CONTROLS</div>
      <div>[SPACE] SHOOT WEB</div>
      <div>[ESC] CLEAR</div>
    </div>
  );
}

// ─── STATUS BAR ────────────────────────────────────────────
function StatusBar() {
  return (
    <div style={{ position:'fixed', bottom:20, left:20, zIndex:1000, lineHeight:1.85, fontSize:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ width:8, height:8, borderRadius:'50%', background:'#00ffcc', boxShadow:'0 0 6px #00ffcc', display:'inline-block' }} />
        SYSTEM ONLINE
      </div>
      <div style={{ color:'#88aaff' }}>INPUT MODE: SIMULATION</div>
      <div style={{ color:'#88aaff' }}>CV TRACKING: SIMULATION</div>
      <div style={{ color:'#ff5555' }}>DEVICE: NOT CONNECTED</div>
    </div>
  );
}

// ─── GRID BG ───────────────────────────────────────────────
function GridBG() {
  const w = window.innerWidth, h = window.innerHeight, step = 60;
  const lines = [];
  for (let x = 0; x <= w; x += step) lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={h} stroke="#0b1820" strokeWidth="1" />);
  for (let y = 0; y <= h; y += step) lines.push(<line key={`h${y}`} x1={0} y1={y} x2={w} y2={y} stroke="#0b1820" strokeWidth="1" />);
  return (
    <svg style={{ position:'fixed', inset:0, width:'100vw', height:'100vh', zIndex:0, pointerEvents:'none' }}>
      {lines}
    </svg>
  );
}

// ─── APP ───────────────────────────────────────────────────
export default function App() {
  const [target, setTarget] = useState({
    x: window.innerWidth / 2, y: window.innerHeight / 2,
    normalizedX: 0.5, normalizedY: 0.5,
  });
  const [locked,  setLocked]  = useState(false);
  const [shots,   setShots]   = useState([]);
  const [score,   setScore]   = useState(0);
  const [, forceUpdate]       = useState(0); // to re-render spider count

  const lockTimerRef = useRef(null);
  const targetRef    = useRef(target);
  const spidersRef   = useRef([]);

  // Keep target ref fresh
  useEffect(() => { targetRef.current = target; }, [target]);

  // Mouse tracking
  useEffect(() => {
    const onMove = (e) => {
      const x = e.clientX, y = e.clientY;
      setTarget({ x, y, normalizedX: +(x / window.innerWidth).toFixed(3), normalizedY: +(y / window.innerHeight).toFixed(3) });
      setLocked(false);
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = setTimeout(() => setLocked(true), 650);
    };
    window.addEventListener('mousemove', onMove);
    return () => { window.removeEventListener('mousemove', onMove); clearTimeout(lockTimerRef.current); };
  }, []);

  // Keyboard
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        const t = targetRef.current;

        // Hit detection — catch any spider within HIT_RADIUS
        let pointsEarned = 0;
        spidersRef.current.forEach(s => {
          if (s.state === 'falling' && Math.hypot(s.x - t.x, s.y - t.y) < HIT_RADIUS) {
            s.state    = 'caught';
            s.caughtAt = performance.now();
            pointsEarned += s.points;
          }
        });
        if (pointsEarned > 0) setScore(prev => prev + pointsEarned);

        // Fire web
        const shot = makeShot(t);
        if (shot) setShots(prev => [...prev, shot]);
      }
      if (e.code === 'Escape') {
        setShots([]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Spider spawner
  useEffect(() => {
    const spawn = () => {
      if (spidersRef.current.length < MAX_SPIDERS) {
        spidersRef.current.push(makeSpider());
        forceUpdate(n => n + 1); // update spider count in HUD
      }
    };
    spawn(); // spawn one immediately
    const id = setInterval(spawn, SPIDER_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // GC expired shots
  useEffect(() => {
    const id = setInterval(() => {
      const now = performance.now();
      setShots(prev => prev.filter(s => now - s.createdAt < TOTAL_WEB_LIFE + 200));
    }, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ width:'100vw', height:'100vh', position:'relative', overflow:'hidden' }}>
      <GridBG />
      <GameLayer shots={shots} spidersRef={spidersRef} />
      <Crosshair target={target} locked={locked} />
      <HUD target={target} score={score} spiderCount={spidersRef.current.length} />
      <StatusBar />
    </div>
  );
}
