import React, { useState, useEffect, useRef } from 'react';
import { WebStrand } from './WebStrand';
import { SpiderSVG } from './SpiderSVG';
import { SPIDER_CATCH_MS } from '../utils/config';

export function GameLayer({ shots, spidersRef, onEscapeRef }) {
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
