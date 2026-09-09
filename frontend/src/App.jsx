import React, { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';

// Hooks & Utils
import { useIoTBridge } from './hooks/useIoTBridge';
import { makeShot, makeSpider } from './utils/gameLogic';
import { HIT_RADIUS, INITIAL_LIVES, MAX_SPIDERS, SPIDER_INTERVAL, TOTAL_WEB_LIFE } from './utils/config';

// Components
import { GridBG } from './components/GridBG';
import { GameLayer } from './components/GameLayer';
import { Crosshair } from './components/Crosshair';
import { HUD } from './components/HUD';
import { StatusBar } from './components/StatusBar';
import { GameOverScreen } from './components/GameOverScreen';

export default function App() {
  const [target, setTarget] = useState({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    normalizedX: 0.5,
    normalizedY: 0.5,
  });
  const [locked, setLocked]       = useState(false);
  const [shots, setShots]         = useState([]);
  const [score, setScore]         = useState(0);
  const [lives, setLives]         = useState(INITIAL_LIVES);
  const [gameOver, setGameOver]   = useState(false);
  const [aimSource, setAimSource] = useState('mouse'); // 'mouse' | 'cv' | 'imu'
  const [imuData, setImuData]     = useState(null);
  const [, tick]                  = useState(0);

  const lockTimerRef = useRef(null);
  const targetRef    = useRef(target);
  const spidersRef   = useRef([]);
  const onEscapeRef  = useRef(null);

  useEffect(() => { targetRef.current = target; }, [target]);

  // Keep escape callback fresh
  useEffect(() => {
    onEscapeRef.current = () => {
      setLives(prev => {
        const next = prev - 1;
        if (next <= 0) setGameOver(true);
        return Math.max(0, next);
      });
    };
  });

  // Shoot function (invoked by SPACE, ESP32 button, or wrist flick)
  const fireWeb = useCallback(() => {
    if (gameOver) return;
    const t = targetRef.current;
    let pts = 0;
    spidersRef.current.forEach(s => {
      if (s.state === 'falling' && Math.hypot(s.x - t.x, s.y - t.y) < HIT_RADIUS) {
        s.state    = 'caught';
        s.caughtAt = performance.now();
        pts += s.points;
      }
    });
    if (pts > 0) setScore(prev => prev + pts);
    const shot = makeShot(t);
    if (shot) setShots(prev => [...prev, shot]);
  }, [gameOver]);

  // Callback for OpenCV ArUco tracking or IMU targeting
  const handleTargetUpdate = useCallback((normX, normY, source) => {
    const x = normX * window.innerWidth;
    const y = normY * window.innerHeight;
    setTarget({
      x,
      y,
      normalizedX: normX,
      normalizedY: normY,
    });
    setAimSource(source || 'cv');

    // Auto-lock when steady
    clearTimeout(lockTimerRef.current);
    setLocked(false);
    lockTimerRef.current = setTimeout(() => setLocked(true), 400);
  }, []);

  // Callback for MPU-6050 telemetry
  const handleIMUUpdate = useCallback((data) => {
    setImuData(data);
  }, []);

  // Hook up IoT device, OpenCV, and MPU-6050 via Bridge WebSocket
  const { connected: bridgeConnected, deviceStatus } = useIoTBridge({
    onShoot: fireWeb,
    onTarget: handleTargetUpdate,
    onIMU: handleIMUUpdate,
  });

  // Mouse tracking fallback
  useEffect(() => {
    const onMove = (e) => {
      const x = e.clientX, y = e.clientY;
      setTarget({
        x,
        y,
        normalizedX: +(x / window.innerWidth).toFixed(3),
        normalizedY: +(y / window.innerHeight).toFixed(3),
      });
      setAimSource('mouse');
      setLocked(false);
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = setTimeout(() => setLocked(true), 650);
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      clearTimeout(lockTimerRef.current);
    };
  }, []);

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e) => {
      if (gameOver) return;
      if (e.code === 'Space') {
        e.preventDefault();
        fireWeb();
      }
      if (e.code === 'Escape') setShots([]);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameOver, fireWeb]);

  // Spider spawner loop
  useEffect(() => {
    if (gameOver) return;
    const spawn = () => {
      if (!gameOver && spidersRef.current.length < MAX_SPIDERS) {
        spidersRef.current.push(makeSpider());
        tick(n => n + 1);
      }
    };
    spawn();
    const id = setInterval(spawn, SPIDER_INTERVAL);
    return () => clearInterval(id);
  }, [gameOver]);

  // Expired shots garbage collector
  useEffect(() => {
    const id = setInterval(() => {
      const now = performance.now();
      setShots(prev => prev.filter(s => now - s.createdAt < TOTAL_WEB_LIFE + 200));
    }, 500);
    return () => clearInterval(id);
  }, []);

  const restart = useCallback(() => {
    spidersRef.current = [];
    setShots([]);
    setScore(0);
    setLives(INITIAL_LIVES);
    setGameOver(false);
  }, []);

  return (
    <div style={{ width:'100vw', height:'100vh', position:'relative', overflow:'hidden' }}>
      <GridBG />
      <GameLayer shots={shots} spidersRef={spidersRef} onEscapeRef={onEscapeRef} />
      <Crosshair target={target} locked={locked} />
      <HUD
        target={target}
        score={score}
        spiderCount={spidersRef.current.length}
        lives={lives}
        aimSource={aimSource}
        imuData={imuData}
      />
      <StatusBar
        bridgeConnected={bridgeConnected}
        deviceStatus={deviceStatus}
        aimSource={aimSource}
      />
      {gameOver && <GameOverScreen score={score} onRestart={restart} />}
    </div>
  );
}
