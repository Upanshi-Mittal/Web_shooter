import React from 'react';

export function Crosshair({ target, locked }) {
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
