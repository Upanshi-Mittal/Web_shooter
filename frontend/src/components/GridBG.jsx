import React from 'react';

export function GridBG() {
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
