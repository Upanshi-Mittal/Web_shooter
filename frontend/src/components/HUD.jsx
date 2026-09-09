import React from 'react';
import { INITIAL_LIVES } from '../utils/config';

export function HUD({ target, score, spiderCount, lives }) {
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
