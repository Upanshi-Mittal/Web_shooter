import React from 'react';

export default function TargetHUD({ target, shots }) {
  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      border: '1px solid #4aedff',
      backgroundColor: 'rgba(5, 10, 18, 0.7)',
      padding: '15px',
      borderRadius: '5px',
      boxShadow: '0 0 10px rgba(74, 237, 255, 0.2)',
      fontSize: '14px',
      zIndex: 5
    }}>
      <div style={{ borderBottom: '1px solid #4aedff', paddingBottom: '5px', marginBottom: '10px', fontWeight: 'bold' }}>
        WEB SHOOTER SYSTEM
      </div>
      <div>INPUT: MOUSE SIMULATION</div>
      <div style={{ color: '#00ffcc' }}>STATUS: ONLINE</div>
      
      <div style={{ marginTop: '15px', color: '#88aaff' }}>TARGET</div>
      <div>X: {target.x.toFixed(0)}</div>
      <div>Y: {target.y.toFixed(0)}</div>

      <div style={{ marginTop: '15px', color: '#88aaff' }}>NORMALIZED</div>
      <div>X: {target.normalizedX.toFixed(2)}</div>
      <div>Y: {target.normalizedY.toFixed(2)}</div>

      <div style={{ marginTop: '15px', color: '#ffaa00' }}>TRIGGER</div>
      <div>[SPACE] SHOOT</div>
      <div style={{ marginTop: '10px', color: '#ff3366', fontWeight: 'bold' }}>
        DEBUG ACTIVE SHOTS: {shots ? shots.length : 0}
      </div>
    </div>
  );
}
