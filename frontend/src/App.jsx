import React, { useState, useEffect, useCallback, useRef } from 'react';
import './index.css';
import { useMouseInput } from './input/mouseInput';
import Crosshair from './components/Crosshair';
import TargetHUD from './components/TargetHUD';
import SystemStatus from './components/SystemStatus';
import WebAnimation from './components/WebAnimation';

function App() {
  const [target, setTarget] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2, normalizedX: 0.5, normalizedY: 0.5 });
  const [shots, setShots] = useState([]);
  const shotIdCounter = useRef(0);
  
  // Custom hook for input
  useMouseInput(setTarget);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        
        shotIdCounter.current += 1;
        const newId = `shot_${Date.now()}_${shotIdCounter.current}`;
        
        setShots(prev => [
          ...prev, 
          {
            id: newId,
            target: { ...target },
            timestamp: Date.now()
          }
        ]);
      }
      if (e.code === 'Escape') {
        setShots([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [target]);

  const removeShot = useCallback((id) => {
    setShots(prev => prev.filter(shot => shot.id !== id));
  }, []);

  return (
    <div className="targeting-area" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <SystemStatus />
      <TargetHUD target={target} shots={shots} />
      <Crosshair target={target} />
      <WebAnimation shots={shots} removeShot={removeShot} />
    </div>
  );
}

export default App;
