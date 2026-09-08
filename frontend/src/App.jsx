import React, { useState, useEffect, useRef } from 'react';
import './index.css';

// ─── CONFIG ────────────────────────────────────────────────
const DEBUG_WEB       = false;
const DURATION_LAUNCH = 180;   // ms: strand travels to target
const DURATION_WEB    = 450;   // ms: web expands after impact
const DURATION_HOLD   = 2400;  // ms: web stays fully visible
const DURATION_FADE   = 1400;  // ms: fade out
const TOTAL_LIFE      = DURATION_LAUNCH + DURATION_HOLD + DURATION_FADE; // ~3980ms

// ─── MAKE SHOT ─────────────────────────────────────────────
function makeShot(target) {
  // Per-shot randomized web geometry
  const numRadials    = 12 + Math.floor(Math.random() * 3);   // 12-14
  const numRings      = 5  + Math.floor(Math.random() * 2);   // 5-6
  const webRadius     = 180 + Math.floor(Math.random() * 60); // 180-240px — big like the screenshot
  const ringSkew      = Array.from({ length: numRings }, () => 0.78 + Math.random() * 0.1); // sag 0.78-0.88
  const radialJitter  = Array.from({ length: numRadials }, () => (Math.random() - 0.5) * 0.12); // ±0.06 rad angle noise
  // Strand wobble control points (3 strands)
  const strandOffsets = [
    0,
    (Math.random() - 0.5) * 28,
    (Math.random() - 0.5) * 28,
  ];

  const shot = {
    id: crypto.randomUUID(),
    startX:      window.innerWidth / 2,
    startY:      window.innerHeight - 60,
    targetX:     target.x,
    targetY:     target.y,
    createdAt:   performance.now(),
    numRadials,
    numRings,
    webRadius,
    ringSkew,
    radialJitter,
    strandOffsets,
  };

  const valid = ['startX','startY','targetX','targetY'].every(k => Number.isFinite(shot[k]));
  if (!valid) { console.warn('makeShot: bad coords', shot); return null; }
  if (DEBUG_WEB) console.log('ACTIVE SHOT', shot);
  return shot;
}

// ─── SVG WEB PATH BUILDER ─────────────────────────────────
function buildWebPaths(shot, radius) {
  const { targetX: cx, targetY: cy, numRadials, numRings, ringSkew, radialJitter } = shot;
  const paths = [];

  // Pre-compute every spoke angle once (base + per-spoke jitter)
  const angles = Array.from({ length: numRadials }, (_, i) => {
    const base = (i / numRadials) * Math.PI * 2;
    return base + (radialJitter[i] || 0);
  });

  // ── Radial spokes ──
  for (let i = 0; i < numRadials; i++) {
    const x2 = cx + Math.cos(angles[i]) * radius;
    const y2 = cy + Math.sin(angles[i]) * radius;
    paths.push({ type: 'radial', d: `M ${cx} ${cy} L ${x2.toFixed(1)} ${y2.toFixed(1)}` });
  }

  // ── Concentric rings ──
  for (let r = 1; r <= numRings; r++) {
    const rr  = (radius / numRings) * r;
    const sag = ringSkew[r - 1] || 0.82;

    // Ring points at every spoke
    const pts = angles.map(a => ({
      x: cx + Math.cos(a) * rr,
      y: cy + Math.sin(a) * rr,
    }));

    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} `;
    for (let i = 0; i < numRadials; i++) {
      const p2 = pts[(i + 1) % numRadials];

      // ← Key fix: normalize a2 > a1 so midAngle is always between them (no wraparound flip)
      const a1 = angles[i];
      let   a2 = angles[(i + 1) % numRadials];
      if (a2 < a1) a2 += Math.PI * 2;
      const aMid = (a1 + a2) / 2;

      const cpx = cx + Math.cos(aMid) * rr * sag;
      const cpy = cy + Math.sin(aMid) * rr * sag;

      d += `Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} `;
    }
    d += 'Z'; // close the ring cleanly
    paths.push({ type: 'ring', d: d.trim(), r });
  }

  return paths;
}

// ─── STRAND (one shot rendered in SVG) ────────────────────
function WebStrand({ shot, now }) {
  const elapsed = now - shot.createdAt;
  if (elapsed > TOTAL_LIFE) return null;

  // --- timing ---
  const rawWebT  = Math.min(Math.max(elapsed, 0) / DURATION_WEB, 1);
  const easeWeb  = 1 - Math.pow(1 - rawWebT, 3); // ease-out cubic

  const holdEnd  = DURATION_LAUNCH + DURATION_HOLD;
  const fadeT    = elapsed < holdEnd ? 0 : (elapsed - holdEnd) / DURATION_FADE;
  const alpha    = Math.max(0, 1 - fadeT);

  // --- web ---
  const webRadius = shot.webRadius * easeWeb;
  const webPaths  = rawWebT > 0 ? buildWebPaths(shot, webRadius) : [];

  // --- impact ring flash ---
  const impactT    = Math.min(elapsed / 250, 1);
  const showImpact = impactT < 1;

  return (
    <g opacity={alpha}>
      {/* ── Impact flash ring (expands outward on hit) ── */}
      {showImpact && (
        <circle
          cx={shot.targetX} cy={shot.targetY}
          r={60 * impactT}
          stroke="white"
          strokeWidth={3 * (1 - impactT)}
          fill="none"
          opacity={1 - impactT}
        />
      )}

      {/* ── Spider web structure ── */}
      {webPaths.map((p, i) => {
        const isRadial  = p.type === 'radial';
        const ringDepth = isRadial ? 0 : p.r / shot.numRings;
        return (
          <path
            key={i}
            d={p.d}
            stroke="white"
            strokeWidth={isRadial ? 1.0 : 1.4}
            fill="none"
            opacity={isRadial ? 0.65 : (0.95 - ringDepth * 0.18)}
          />
        );
      })}

      {/* ── Anchor dot at impact center ── */}
      <circle cx={shot.targetX} cy={shot.targetY} r="3.5" fill="white" opacity={0.95} />

      {/* ── Small impact sparks ── */}
      {showImpact && [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => {
        const a  = (i / 12) * Math.PI * 2;
        const d  = 55 * impactT;
        return (
          <circle
            key={i}
            cx={shot.targetX + Math.cos(a) * d}
            cy={shot.targetY + Math.sin(a) * d}
            r={3 * (1 - impactT)}
            fill="white"
            opacity={1 - impactT}
          />
        );
      })}
    </g>
  );
}

// ─── WEB LAYER (SVG, always on top) ───────────────────────
function WebLayer({ shots }) {
  const [, setTick] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const loop = () => {
      setTick(t => t + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const now = performance.now();

  return (
    <svg style={{
      position: 'fixed', inset: 0,
      width: '100vw', height: '100vh',
      pointerEvents: 'none',
      zIndex: 500,
      overflow: 'visible',
    }}>
      {shots.map(shot => (
        <WebStrand key={shot.id} shot={shot} now={now} />
      ))}
    </svg>
  );
}

// ─── CROSSHAIR ────────────────────────────────────────────
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

// ─── HUD ──────────────────────────────────────────────────
function HUD({ target, shotCount }) {
  return (
    <div style={{ position:'fixed', top:20, right:20, border:'1px solid #4aedff', background:'rgba(5,10,18,0.82)', padding:'14px 18px', borderRadius:4, boxShadow:'0 0 14px rgba(74,237,255,0.12)', zIndex:1000, lineHeight:1.85, minWidth:200 }}>
      <div style={{ borderBottom:'1px solid #4aedff', paddingBottom:6, marginBottom:10, fontWeight:'bold', letterSpacing:2, fontSize:12 }}>WEB SHOOTER SYSTEM</div>
      <div style={{ color:'#88aaff' }}>INPUT: MOUSE SIMULATION</div>
      <div style={{ color:'#00ffcc' }}>STATUS: ONLINE</div>
      <div style={{ marginTop:12, color:'#88aaff' }}>TARGET</div>
      <div>X: {target.x.toFixed(0)}</div>
      <div>Y: {target.y.toFixed(0)}</div>
      <div style={{ marginTop:12, color:'#88aaff' }}>NORMALIZED</div>
      <div>X: {target.normalizedX.toFixed(3)}</div>
      <div>Y: {target.normalizedY.toFixed(3)}</div>
      <div style={{ marginTop:12, color:'#ffaa00' }}>TRIGGER</div>
      <div>[SPACE] SHOOT</div>
      <div>[ESC] CLEAR</div>
      {DEBUG_WEB && (
        <div style={{ marginTop:10, borderTop:'1px solid #333', paddingTop:8, color:'#ff6600' }}>
          ACTIVE SHOTS: {shotCount}
        </div>
      )}
    </div>
  );
}

// ─── STATUS BAR ───────────────────────────────────────────
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

// ─── GRID BG ──────────────────────────────────────────────
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

// ─── APP ──────────────────────────────────────────────────
export default function App() {
  const [target, setTarget] = useState({
    x: window.innerWidth / 2, y: window.innerHeight / 2,
    normalizedX: 0.5, normalizedY: 0.5,
  });
  const [locked, setLocked] = useState(false);
  const [shots,  setShots]  = useState([]);
  const lockTimerRef = useRef(null);
  const targetRef    = useRef(target);

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
        console.log('WEB SHOT TRIGGERED', t);
        const shot = makeShot(t);
        if (shot) setShots(prev => [...prev, shot]);
      }
      if (e.code === 'Escape') setShots([]);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // GC expired shots
  useEffect(() => {
    const id = setInterval(() => {
      const now = performance.now();
      setShots(prev => prev.filter(s => now - s.createdAt < TOTAL_LIFE + 100));
    }, 400);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ width:'100vw', height:'100vh', position:'relative', overflow:'hidden' }}>
      <GridBG />
      <WebLayer shots={shots} />
      <Crosshair target={target} locked={locked} />
      <HUD target={target} shotCount={shots.length} />
      <StatusBar />
    </div>
  );
}
