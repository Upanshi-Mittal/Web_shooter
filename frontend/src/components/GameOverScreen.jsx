import React from 'react';

export function GameOverScreen({ score, onRestart }) {
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
