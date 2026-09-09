export function makeShot(target) {
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

export function makeSpider() {
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

export function buildWebPaths(shot, radius) {
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
