import React from 'react';
import { INITIAL_LIVES } from '../utils/config';

export function HUD({ target, score, spiderCount, lives, aimSource, imuData }) {
  return (
    <div style={{
      position:'fixed', top:20, right:20,
      border:'1px solid #4aedff', background:'rgba(5,10,18,0.9)',
      padding:'14px 18px', borderRadius:4,
      boxShadow:'0 0 14px rgba(74,237,255,0.12)',
      zIndex:1000, lineHeight:1.85, minWidth:220,
      fontFamily:"'Courier New', monospace",
      backdropFilter:'blur(4px)'
    }}>
      <div style={{ borderBottom:'1px solid #4aedff', paddingBottom:6, marginBottom:10, fontWeight:'bold', letterSpacing:2, fontSize:12 }}>
        WEB SHOOTER HUD V2
      </div>

      <div style={{ display:'flex', justifyContent:'space-between' }}>
        <span style={{ color:'#88aaff' }}>AIM MODE:</span>
        <span style={{
          color: aimSource === 'cv' ? '#00ffcc' : (aimSource === 'imu' ? '#ffaa00' : '#4aedff'),
          fontWeight:'bold'
        }}>
          [{aimSource === 'cv' ? 'OPENCV' : (aimSource === 'imu' ? 'MPU6050' : 'MOUSE')}]
        </span>
      </div>

      {/* Score */}
      <div style={{ marginTop:12, borderTop:'1px solid #1a3045', paddingTop:8 }}>
        <div style={{ color:'#ffcc00', fontSize:11, letterSpacing:1 }}>SCORE</div>
        <div style={{ color:'#ffcc00', fontSize:28, fontWeight:'bold', lineHeight:1.1, textShadow:'0 0 10px #ffcc00' }}>
          {String(score).padStart(6, '0')}
        </div>
      </div>

      {/* Lives */}
      <div style={{ marginTop:8 }}>
        <div style={{ color:'#ff5555', fontSize:11, letterSpacing:1, marginBottom:2 }}>LIVES</div>
        <div style={{ fontSize:20, letterSpacing:4 }}>
          {Array.from({ length: INITIAL_LIVES }, (_, i) => (
            <span key={i} style={{
              color: i < lives ? '#ff3333' : '#333',
              textShadow: i < lives ? '0 0 8px #ff3333' : 'none',
              transition:'all 0.3s'
            }}>
              ♥
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginTop:8, color:'#888', fontSize:11 }}>
        ACTIVE SPIDERS: {spiderCount}
      </div>

      {/* Target coordinates */}
      <div style={{ marginTop:10, borderTop:'1px solid #1a3045', paddingTop:8, color:'#88aaff' }}>TARGET COORDINATES</div>
      <div style={{ fontSize:12 }}>
        PIXEL: <span style={{ color:'#fff' }}>{target.x.toFixed(0)}</span>, <span style={{ color:'#fff' }}>{target.y.toFixed(0)}</span>
      </div>
      <div style={{ fontSize:12 }}>
        NORM:  <span style={{ color:'#fff' }}>{target.normalizedX.toFixed(3)}</span>, <span style={{ color:'#fff' }}>{target.normalizedY.toFixed(3)}</span>
      </div>

      {/* MPU-6050 Gyro Telemetry if present */}
      {imuData && (
        <div style={{ marginTop:8, borderTop:'1px solid #1a3045', paddingTop:6, fontSize:11, color:'#ffaa00' }}>
          IMU TILT: P {imuData.pitch?.toFixed(1)}° | R {imuData.roll?.toFixed(1)}°
        </div>
      )}

      <div style={{ marginTop:10, borderTop:'1px solid #1a3045', paddingTop:8, color:'#ffaa00', fontSize:11 }}>
        <div>[SPACE] / [ESP32 BTN] SHOOT</div>
        <div>[ESC] CLEAR WEBS</div>
      </div>
    </div>
  );
}
