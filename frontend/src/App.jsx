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
  const [target,   setTarget]   = useState({ x:window.innerWidth/2, y:window.innerHeight/2, normalizedX:0.5, normalizedY:0.5 });
  const [locked,   setLocked]   = useState(false);
  const [shots,    setShots]    = useState([]);
  const [score,    setScore]    = useState(0);
  const [lives,    setLives]    = useState(INITIAL_LIVES);
  const [gameOver, setGameOver] = useState(false);
  const [,         tick]        = useState(0);

  const lockTimerRef = useRef(null);
  const targetRef    = useRef(target);
  const spidersRef   = useRef([]);
  const onEscapeRef  = useRef(null);

  useEffect(() => { targetRef.current = target; }, [target]);

  // Keep escape callback fresh (reads latest lives/setGameOver)
  useEffect(() => {
    onEscapeRef.current = () => {
      setLives(prev => {
        const next = prev - 1;
        if (next <= 0) setGameOver(true);
        return Math.max(0, next);
      });
    };
  });

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

  // Hook up IoT device (ESP32)
  const deviceConnected = useIoTBridge(fireWeb);

  // Mouse tracking
  useEffect(() => {
    const onMove = (e) => {
      const x = e.clientX, y = e.clientY;
      setTarget({ x, y, normalizedX:+(x/window.innerWidth).toFixed(3), normalizedY:+(y/window.innerHeight).toFixed(3) });
      setLocked(false);
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = setTimeout(() => setLocked(true), 650);
    };
    window.addEventListener('mousemove', onMove);
    return () => { window.removeEventListener('mousemove', onMove); clearTimeout(lockTimerRef.current); };
  }, []);

  // Keyboard
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

  // Spider spawner
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

  // GC expired shots
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
      <HUD target={target} score={score} spiderCount={spidersRef.current.length} lives={lives} />
      <StatusBar deviceConnected={deviceConnected} />
      {gameOver && <GameOverScreen score={score} onRestart={restart} />}
    </div>
  );
}
