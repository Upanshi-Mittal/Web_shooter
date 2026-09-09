import React from 'react';

export function StatusBar({ bridgeConnected, deviceStatus, aimSource }) {
  const { cv, iot, imu } = deviceStatus || {};

  return (
    <div style={{ position:'fixed', bottom:20, left:20, zIndex:1000, lineHeight:1.85, fontSize:12, fontFamily:"'Courier New', monospace" }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{
          width:8, height:8, borderRadius:'50%',
          background: bridgeConnected ? '#00ffcc' : '#ffaa00',
          boxShadow: bridgeConnected ? '0 0 6px #00ffcc' : '0 0 6px #ffaa00',
          display:'inline-block'
        }} />
        SYSTEM: {bridgeConnected ? 'ONLINE (BRIDGE CONNECTED)' : 'STANDALONE (BRIDGE OFFLINE)'}
      </div>

      <div style={{ color:'#88aaff' }}>
        AIM SOURCE: <span style={{ color: aimSource === 'cv' ? '#00ffcc' : (aimSource === 'imu' ? '#ffaa00' : '#ffffff'), fontWeight:'bold' }}>
          {aimSource === 'cv' ? 'OPENCV CAMERA (ARUCO #0)' : (aimSource === 'imu' ? 'MPU-6050 TILT' : 'MOUSE SIMULATION')}
        </span>
      </div>

      {/* CV Tracking status */}
      <div style={{
        color: cv ? '#00ffcc' : '#88aaff',
        display:'flex', alignItems:'center', gap:6, transition:'color 0.3s'
      }}>
        <span style={{
          width:7, height:7, borderRadius:'50%',
          background: cv ? '#00ffcc' : '#556677',
          boxShadow: cv ? '0 0 6px #00ffcc' : 'none',
          display:'inline-block',
        }} />
        CV TRACKING: {cv ? 'ACTIVE (ARUCO MARKER LOCKED)' : 'SEARCHING / SIMULATION'}
      </div>

      {/* ESP32 Hardware Device Status */}
      <div style={{
        color: iot ? '#00ffcc' : '#ff5555',
        textShadow: iot ? '0 0 6px #00ffcc' : 'none',
        display:'flex', alignItems:'center', gap:6, transition:'color 0.3s',
      }}>
        <span style={{
          width:7, height:7, borderRadius:'50%',
          background: iot ? '#00ffcc' : '#ff5555',
          boxShadow: iot ? '0 0 6px #00ffcc' : 'none',
          display:'inline-block',
        }} />
        ESP32 SHOOTER: {iot ? (imu ? 'CONNECTED (BUTTON + MPU-6050)' : 'CONNECTED (BUTTON ONLY)') : 'NOT CONNECTED'}
      </div>

      {(iot || cv) && (
        <div style={{ color:'#ffaa00', fontSize:11, marginTop:2 }}>
          {iot && '• ESP32 [BUTTON] / [WRIST FLICK] = SHOOT'}
          {cv && ' • [ARUCO MARKER] = AIM'}
        </div>
      )}
    </div>
  );
}
