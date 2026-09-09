import React from 'react';

export function StatusBar({ deviceConnected }) {
  return (
    <div style={{ position:'fixed', bottom:20, left:20, zIndex:1000, lineHeight:1.85, fontSize:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ width:8, height:8, borderRadius:'50%', background:'#00ffcc', boxShadow:'0 0 6px #00ffcc', display:'inline-block' }} />
        SYSTEM ONLINE
      </div>
      <div style={{ color:'#88aaff' }}>INPUT MODE: MOUSE + IOT</div>
      <div style={{ color:'#88aaff' }}>CV TRACKING: SIMULATION</div>
      <div style={{
        color: deviceConnected ? '#00ffcc' : '#ff5555',
        textShadow: deviceConnected ? '0 0 6px #00ffcc' : 'none',
        display:'flex', alignItems:'center', gap:6, transition:'color 0.4s',
      }}>
        <span style={{
          width:7, height:7, borderRadius:'50%',
          background: deviceConnected ? '#00ffcc' : '#ff5555',
          boxShadow:  deviceConnected ? '0 0 6px #00ffcc' : 'none',
          display:'inline-block',
        }} />
        DEVICE: {deviceConnected ? 'CONNECTED' : 'NOT CONNECTED'}
      </div>
      {deviceConnected && (
        <div style={{ color:'#ffaa00', fontSize:11, marginTop:2 }}>
          ESP32 [BUTTON] = SHOOT
        </div>
      )}
    </div>
  );
}
