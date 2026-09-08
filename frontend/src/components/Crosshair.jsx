import React, { useState, useEffect, useRef } from 'react';

export default function Crosshair({ target }) {
  const [locked, setLocked] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setLocked(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setLocked(true);
    }, 600); // 600ms lock time

    return () => clearTimeout(timeoutRef.current);
  }, [target.x, target.y]);

  return (
    <div 
      style={{
        position: 'absolute',
        left: target.x,
        top: target.y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Outer Ring */}
      <div style={{
        position: 'absolute',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        border: `2px solid ${locked ? '#ff3366' : '#4aedff'}`,
        boxShadow: locked ? '0 0 15px #ff3366' : '0 0 10px #4aedff',
        transition: 'all 0.2s ease-out'
      }}></div>

      {/* Center dot */}
      <div style={{
        position: 'absolute',
        width: '4px',
        height: '4px',
        borderRadius: '50%',
        backgroundColor: locked ? '#ff3366' : '#4aedff',
        boxShadow: locked ? '0 0 10px #ff3366' : '0 0 5px #4aedff',
      }}></div>

      {/* Target Lines */}
      <div style={{ position: 'absolute', width: '80px', height: '1px', backgroundColor: locked ? '#ff3366' : '#4aedff', opacity: 0.7 }}></div>
      <div style={{ position: 'absolute', width: '1px', height: '80px', backgroundColor: locked ? '#ff3366' : '#4aedff', opacity: 0.7 }}></div>

      {/* Lock Text */}
      {locked && (
        <div style={{
          position: 'absolute',
          top: '-40px',
          color: '#ff3366',
          fontSize: '12px',
          fontWeight: 'bold',
          textShadow: '0 0 5px #ff3366',
          animation: 'pulse 1s infinite'
        }}>
          TARGET LOCKED
        </div>
      )}

      {/* Coordinates */}
      <div style={{
        position: 'absolute',
        bottom: '-50px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: locked ? '#ff3366' : '#4aedff',
        fontSize: '10px',
        whiteSpace: 'nowrap',
        opacity: 0.8
      }}>
        X: {target.x.toFixed(0)} | Y: {target.y.toFixed(0)}
      </div>

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 0.7; }
            50% { opacity: 1; }
            100% { opacity: 0.7; }
          }
        `}
      </style>
    </div>
  );
}
