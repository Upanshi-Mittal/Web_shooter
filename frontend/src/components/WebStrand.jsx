import React from 'react';
import { TOTAL_WEB_LIFE, DURATION_WEB, DURATION_HOLD, DURATION_FADE } from '../utils/config';
import { buildWebPaths } from '../utils/gameLogic';

export function WebStrand({ shot, now }) {
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
