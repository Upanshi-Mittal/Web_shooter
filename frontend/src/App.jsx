import React, { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';

// ─── CONFIG ────────────────────────────────────────────────
const DURATION_WEB    = 450;
const DURATION_HOLD   = 2400;
const DURATION_FADE   = 1400;
const TOTAL_WEB_LIFE  = DURATION_WEB + DURATION_HOLD + DURATION_FADE;
const HIT_RADIUS      = 115;
const SPIDER_CATCH_MS = 1100;
const SPIDER_INTERVAL = 1800;
const MAX_SPIDERS     = 8;
const INITIAL_LIVES   = 3;

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
  const baseX = 100 + Math.random() * (window.innerWidth - 200);
  return {
    id:         crypto.randomUUID(),
    baseX,
    x:          baseX,
    y:          -100,
    vy:         0.04 + Math.random() * 0.07,
    swingAmp:   30 + Math.random() * 50,
    swingFreq:  0.3 + Math.random() * 1.4,
    swingPhase: Math.random() * Math.PI * 2,
    state:      'falling',
    caughtAt:   null,
    points:     10 + Math.floor(Math.random() * 20),
  };
}

// ─── SPIDER LEG OFFSETS [kx, ky, tx, ty] from (x, headY) ──
const LEG_R = [
  [20, -22, 38, -14],
  [24,  -8, 42,  -1],
  [22,   8, 38,  20],
  [17,  21, 28,  36],
];

// ─── SPIDER COMPONENT ──────────────────────────────────────
function SpiderSVG({ spider, now }) {
  const { x, y, state, caughtAt, points, baseX } = spider;
  const isCaught     = state === 'caught';
  const catchElapsed = isCaught ? now - caughtAt : 0;
  if (isCaught && catchElapsed > SPIDER_CATCH_MS) return null;

  const alpha      = isCaught ? Math.max(0, 1 - catchElapsed / SPIDER_CATCH_MS) : 1;
  const hY         = y - 18;
  const bodyFill   = isCaught ? '#2a0000' : '#0c0c1e';
  const bodyStroke = isCaught ? '#ff4444' : '#f1f3f6';
  const legStroke  = isCaught ? '#ff6666' : '#dde3e9';
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

function buildWebPaths(shot, radius) {
  const { targetX: cx, targetY: cy, numRadials, numRings, ringSkew, radialJitter } = shot;
  const paths = [];
  const angles = Array.from({ length: numRadials }, (_, i) =>
    (i / numRadials) * Math.PI * 2 + (radialJitter[i] || 0)
  );
  for (let i = 0; i < numRadials; i++) {
    paths.push({ type:'radial', d:`M ${cx} ${cy} L ${(cx+Math.cos(angles[i])*radius).toFixed(1)} ${(cy+Math.sin(angles[i])*radius).toFixed(1)}` });
  }
  for (let r = 1; r <= numRings; r++) {
    const rr  = (radius / numRings) * r;
    const sag = ringSkew[r-1] || 0.82;
    const pts = angles.map(a => ({ x: cx+Math.cos(a)*rr, y: cy+Math.sin(a)*rr }));
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} `;
    for (let i = 0; i < numRadials; i++) {
      const p2 = pts[(i+1)%numRadials];
      const a1 = angles[i];
      let   a2 = angles[(i+1)%numRadials];
      if (a2 < a1) a2 += Math.PI * 2;
      const am = (a1+a2)/2;
      d += `Q ${(cx+Math.cos(am)*rr*sag).toFixed(1)} ${(cy+Math.sin(am)*rr*sag).toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} `;
    }
    d += 'Z';
    paths.push({ type:'ring', d:d.trim(), r });
  }
  return paths;
}

// ─── WEB STRAND ────────────────────────────────────────────
function WebStrand({ shot, now }) {
  const elapsed = now - shot.createdAt;
  if (elapsed > TOTAL_WEB_LIFE) return null;
  const rawWebT = Math.min(elapsed / DURATION_WEB, 1);
  const easeWeb = 1 - Math.pow(1 - rawWebT, 3);
  const holdEnd = DURATION_WEB + DURATION_HOLD;
  const fadeT   = elapsed < holdEnd ? 0 : (elapsed - holdEnd) / DURATION_FADE;
  const alpha   = Math.max(0, 1 - fadeT);
  const webPaths  = rawWebT > 0 ? buildWebPaths(shot, shot.webRadius * easeWeb) : [];
  const impactT   = Math.min(elapsed / 280, 1);
  const showImpact = impactT < 1;
  return (
    <g opacity={alpha}>
      {showImpact && <circle cx={shot.targetX} cy={shot.targetY} r={65*impactT} stroke="white" strokeWidth={3*(1-impactT)} fill="none" opacity={1-impactT} />}
      {webPaths.map((p,i) => {
        const isR = p.type==='radial';
        return <path key={i} d={p.d} stroke="white" fill="none" strokeWidth={isR?1.0:1.4} opacity={isR?0.65:(0.95-p.r/shot.numRings*0.18)} />;
      })}
      <circle cx={shot.targetX} cy={shot.targetY} r="3.5" fill="white" opacity={0.95} />
      {showImpact && Array.from({length:12},(_,i)=>(
        <circle key={i} cx={shot.targetX+Math.cos(i/12*Math.PI*2)*58*impactT} cy={shot.targetY+Math.sin(i/12*Math.PI*2)*58*impactT} r={3*(1-impactT)} fill="white" opacity={1-impactT} />
      ))}
    </g>
  );
}

// ─── GAME LAYER ────────────────────────────────────────────
function GameLayer({ shots, spidersRef, onEscapeRef }) {
  const [, setTick] = useState(0);
  const rafRef      = useRef(null);
  const lastTRef    = useRef(performance.now());

  useEffect(() => {
    const loop = (ts) => {
      const dt  = Math.min(ts - lastTRef.current, 50);
      lastTRef.current = ts;
      const now = performance.now();
      const spiders = spidersRef.current;
      for (let i = spiders.length - 1; i >= 0; i--) {
        const s = spiders[i];
        if (s.state === 'falling') {
          s.y += s.vy * dt;
          s.x  = s.baseX + Math.sin((ts/1000)*s.swingFreq + s.swingPhase) * s.swingAmp;
          if (s.y > window.innerHeight + 100) {
            spiders.splice(i, 1);
            onEscapeRef.current?.();
          }
        } else if (s.state === 'caught' && now - s.caughtAt > SPIDER_CATCH_MS) {
          spiders.splice(i, 1);
        }
      }
      setTick(t => t + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [spidersRef, onEscapeRef]);

  const now = performance.now();
  return (
    <svg style={{ position:'fixed', inset:0, width:'100vw', height:'100vh', pointerEvents:'none', zIndex:500, overflow:'visible' }}>
      {shots.map(s => <WebStrand key={s.id} shot={s} now={now} />)}
      {spidersRef.current.map(s => <SpiderSVG key={s.id} spider={s} now={now} />)}
    </svg>
  );
}

// ─── CROSSHAIR ─────────────────────────────────────────────
function Crosshair({ target, locked }) {
  const color = locked ? '#ff3060' : '#4aedff';
  const glow  = locked ? '0 0 14px #ff3060,0 0 28px #ff3060' : '0 0 10px #4aedff';
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
      <style>{`@keyframes pulse{0%,100%{opacity:0.6}50%{opacity:1}}`}</style>
    </div>
  );
}

// ─── HUD ───────────────────────────────────────────────────
function HUD({ target, score, spiderCount, lives }) {
  return (
    <div style={{ position:'fixed', top:20, right:20, border:'1px solid #4aedff', background:'rgba(5,10,18,0.88)', padding:'14px 18px', borderRadius:4, boxShadow:'0 0 14px rgba(74,237,255,0.12)', zIndex:1000, lineHeight:1.85, minWidth:210 }}>
      <div style={{ borderBottom:'1px solid #4aedff', paddingBottom:6, marginBottom:10, fontWeight:'bold', letterSpacing:2, fontSize:12 }}>
        WEB SHOOTER SYSTEM
      </div>
      <div style={{ color:'#88aaff' }}>INPUT: MOUSE SIMULATION</div>
      <div style={{ color:'#00ffcc' }}>STATUS: ONLINE</div>

      {/* Score */}
      <div style={{ marginTop:14, borderTop:'1px solid #223', paddingTop:10 }}>
        <div style={{ color:'#ffcc00', fontSize:11, letterSpacing:1 }}>SCORE</div>
        <div style={{ color:'#ffcc00', fontSize:30, fontWeight:'bold', lineHeight:1.1, textShadow:'0 0 10px #ffcc00' }}>
          {String(score).padStart(6, '0')}
        </div>
      </div>

      {/* Lives */}
      <div style={{ marginTop:10 }}>
        <div style={{ color:'#ff5555', fontSize:11, letterSpacing:1, marginBottom:4 }}>LIVES</div>
        <div style={{ fontSize:22, letterSpacing:4 }}>
          {Array.from({ length: INITIAL_LIVES }, (_, i) => (
            <span key={i} style={{ color: i < lives ? '#ff3333' : '#333', textShadow: i < lives ? '0 0 8px #ff3333' : 'none', transition:'all 0.3s' }}>
              ♥
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginTop:10, color:'#888', fontSize:11 }}>
        SPIDERS ACTIVE: {spiderCount}
      </div>

      <div style={{ marginTop:12, color:'#88aaff' }}>TARGET</div>
      <div>X: {target.x.toFixed(0)}</div>
      <div>Y: {target.y.toFixed(0)}</div>
      <div style={{ marginTop:8, color:'#88aaff' }}>NORMALIZED</div>
      <div>X: {target.normalizedX.toFixed(3)}</div>
      <div>Y: {target.normalizedY.toFixed(3)}</div>
      <div style={{ marginTop:12, color:'#ffaa00' }}>CONTROLS</div>
      <div>[SPACE] SHOOT WEB</div>
      <div>[ESC] CLEAR WEBS</div>
    </div>
  );
}

// ─── GAME OVER SCREEN ─────────────────────────────────────
function GameOverScreen({ score, onRestart }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', zIndex:2000, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:"'Courier New',monospace" }}>
      <div style={{ color:'#ff2222', fontSize:52, fontWeight:'bold', textShadow:'0 0 30px #ff2222, 0 0 60px #ff2222', letterSpacing:6, marginBottom:10 }}>
        GAME OVER
      </div>
      <div style={{ color:'#888', fontSize:14, letterSpacing:3, marginBottom:30 }}>
        THE SPIDERS ESCAPED
      </div>
      <div style={{ color:'#ffcc00', fontSize:16, letterSpacing:2, marginBottom:6 }}>FINAL SCORE</div>
      <div style={{ color:'#ffcc00', fontSize:48, fontWeight:'bold', textShadow:'0 0 20px #ffcc00', marginBottom:40 }}>
        {String(score).padStart(6, '0')}
      </div>
      <button
        onClick={onRestart}
        style={{ background:'transparent', border:'2px solid #4aedff', color:'#4aedff', fontSize:16, fontFamily:"'Courier New',monospace", padding:'12px 36px', cursor:'pointer', letterSpacing:3, boxShadow:'0 0 16px rgba(74,237,255,0.4)', transition:'all 0.2s' }}
        onMouseEnter={e => { e.target.style.background='#4aedff'; e.target.style.color='#000'; }}
        onMouseLeave={e => { e.target.style.background='transparent'; e.target.style.color='#4aedff'; }}
      >
        [ RESTART ]
      </button>
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
  const [target,   setTarget]   = useState({ x:window.innerWidth/2, y:window.innerHeight/2, normalizedX:0.5, normalizedY:0.5 });
  const [locked,   setLocked]   = useState(false);
  const [shots,    setShots]    = useState([]);
  const [score,    setScore]    = useState(0);
  const [lives,    setLives]    = useState(INITIAL_LIVES);
  const [gameOver, setGameOver] = useState(false);
  const [,         tick]        = useState(0);

  const lockTimerRef = useRef(null);
  const targetRef    = useRef(target);
  const spidersRef   = useRef([]);
  const onEscapeRef  = useRef(null);

  useEffect(() => { targetRef.current = target; }, [target]);

  // Keep escape callback fresh (reads latest lives/setGameOver)
  useEffect(() => {
    onEscapeRef.current = () => {
      setLives(prev => {
        const next = prev - 1;
        if (next <= 0) setGameOver(true);
        return Math.max(0, next);
      });
    };
  });

  // Mouse tracking
  useEffect(() => {
    const onMove = (e) => {
      const x = e.clientX, y = e.clientY;
      setTarget({ x, y, normalizedX:+(x/window.innerWidth).toFixed(3), normalizedY:+(y/window.innerHeight).toFixed(3) });
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
      if (gameOver) return;
      if (e.code === 'Space') {
        e.preventDefault();
        const t = targetRef.current;
        let pts = 0;
        spidersRef.current.forEach(s => {
          if (s.state === 'falling' && Math.hypot(s.x - t.x, s.y - t.y) < HIT_RADIUS) {
            s.state    = 'caught';
            s.caughtAt = performance.now();
            pts += s.points;
          }
        });
        if (pts > 0) setScore(prev => prev + pts);
        const shot = makeShot(t);
        if (shot) setShots(prev => [...prev, shot]);
      }
      if (e.code === 'Escape') setShots([]);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameOver]);

  // Spider spawner
  useEffect(() => {
    if (gameOver) return;
    const spawn = () => {
      if (!gameOver && spidersRef.current.length < MAX_SPIDERS) {
        spidersRef.current.push(makeSpider());
        tick(n => n + 1);
      }
    };
    spawn();
    const id = setInterval(spawn, SPIDER_INTERVAL);
    return () => clearInterval(id);
  }, [gameOver]);

  // GC expired shots
  useEffect(() => {
    const id = setInterval(() => {
      const now = performance.now();
      setShots(prev => prev.filter(s => now - s.createdAt < TOTAL_WEB_LIFE + 200));
    }, 500);
    return () => clearInterval(id);
  }, []);

  const restart = useCallback(() => {
    spidersRef.current = [];
    setShots([]);
    setScore(0);
    setLives(INITIAL_LIVES);
    setGameOver(false);
    
  }, []);

  return (
    <div style={{ width:'100vw', height:'100vh', position:'relative', overflow:'hidden' }}>
      <GridBG />
      <GameLayer shots={shots} spidersRef={spidersRef} onEscapeRef={onEscapeRef} />
      <Crosshair target={target} locked={locked} />
      <HUD target={target} score={score} spiderCount={spidersRef.current.length} lives={lives} />
      <StatusBar />
      {gameOver && <GameOverScreen score={score} onRestart={restart} />}
    </div>
  );
}
