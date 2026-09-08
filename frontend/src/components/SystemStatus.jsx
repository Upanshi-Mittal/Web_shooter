import React from 'react';

export default function SystemStatus() {
  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '20px',
      fontSize: '12px',
      zIndex: 5,
      opacity: 0.8
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
        <div style={{ width: '8px', height: '8px', backgroundColor: '#00ffcc', borderRadius: '50%', marginRight: '8px', boxShadow: '0 0 5px #00ffcc' }}></div>
        SYSTEM ONLINE
      </div>
      <div style={{ color: '#88aaff', marginBottom: '3px' }}>INPUT MODE: SIMULATION</div>
      <div style={{ color: '#88aaff', marginBottom: '3px' }}>CV TRACKING: SIMULATION</div>
      <div style={{ color: '#ff6666' }}>DEVICE: NOT CONNECTED</div>
    </div>
  );
}
