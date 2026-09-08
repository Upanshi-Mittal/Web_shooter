import React, { useEffect, useRef } from 'react';

export default function WebAnimation({ shots, removeShot }) {
  const canvasRef = useRef(null);
  const shotDataRef = useRef({}); // Store random parameters per shot
  
  // Use a ref to keep the latest shots without restarting the loop
  const shotsRef = useRef(shots);
  const removeShotRef = useRef(removeShot);

  useEffect(() => {
    shotsRef.current = shots;
    removeShotRef.current = removeShot;

    // Generate new shot data
    shots.forEach(shot => {
      if (!shotDataRef.current[shot.id]) {
        const radials = Math.floor(Math.random() * 5) + 8; // 8-12
        const rings = Math.floor(Math.random() * 3) + 3; // 3-5
        const maxRadius = Math.random() * 40 + 50; // 50-90
        
        const strands = [];
        for (let i = 0; i < 3; i++) {
          strands.push({
            offset: (Math.random() - 0.5) * 40,
            thickness: [1.5, 1, 0.5][i],
            alpha: Math.random() * 0.5 + 0.3
          });
        }

        const particles = [];
        for (let i = 0; i < 10; i++) {
          particles.push({
            angle: Math.random() * Math.PI * 2,
            speed: Math.random() * 3 + 1,
            size: Math.random() * 2 + 1
          });
        }

        shotDataRef.current[shot.id] = { radials, rings, maxRadius, strands, particles };
      }
    });
    
    // Clean up old shot data
    const activeIds = new Set(shots.map(s => String(s.id)));
    Object.keys(shotDataRef.current).forEach(id => {
      if (!activeIds.has(String(id))) {
        delete shotDataRef.current[id];
      }
    });
  }, [shots, removeShot]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    let animationFrameId;

    const draw = () => {
      try {
        const currentShots = shotsRef.current;
        const origin = { x: canvas.width / 2, y: canvas.height };
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const now = Date.now();

        // DEBUG: Pulsing green square to prove loop is alive
        ctx.fillStyle = now % 1000 > 500 ? '#00ff00' : '#005500';
        ctx.fillRect(10, 10, 10, 10);

        currentShots.forEach(shot => {
          const elapsed = now - shot.timestamp;
          
          if (elapsed > 1000) {
            removeShotRef.current(shot.id);
            return;
          }

          const data = shotDataRef.current[shot.id];
          if (!data) return;

          const target = shot.target;
          
          ctx.save();

          let globalAlpha = 1;
          if (elapsed > 400) {
            globalAlpha = 1 - (elapsed - 400) / 600;
          }
          ctx.globalAlpha = Math.max(0, globalAlpha);

          // Phase A: Launch (0 - 150ms)
          const launchProgress = Math.min(elapsed / 150, 1);
          
          const currentX = origin.x + (target.x - origin.x) * launchProgress;
          const currentY = origin.y + (target.y - origin.y) * launchProgress;

          // Strands
          data.strands.forEach(strand => {
            ctx.beginPath();
            ctx.moveTo(origin.x, origin.y);
            
            const midX = origin.x + (target.x - origin.x) * 0.5;
            const midY = origin.y + (target.y - origin.y) * 0.5;
            const angle = Math.atan2(target.y - origin.y, target.x - origin.x);
            const perpAngle = angle + Math.PI / 2;
            const cpX = midX + Math.cos(perpAngle) * strand.offset * launchProgress;
            const cpY = midY + Math.sin(perpAngle) * strand.offset * launchProgress;

            ctx.quadraticCurveTo(cpX, cpY, currentX, currentY);
            ctx.strokeStyle = `rgba(255, 255, 255, ${strand.alpha})`;
            ctx.lineWidth = strand.thickness;
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'rgba(74, 237, 255, 0.8)';
            ctx.stroke();
          });

          // Phase B & C: Expansion & Web Formation
          if (elapsed >= 150) {
            const impactElapsed = elapsed - 150;
            
            // Particles
            const particleProgress = Math.min(impactElapsed / 250, 1);
            if (particleProgress < 1) {
              data.particles.forEach(p => {
                const dist = p.speed * impactElapsed * 0.2;
                const px = target.x + Math.cos(p.angle) * dist;
                const py = target.y + Math.sin(p.angle) * dist;
                
                ctx.beginPath();
                ctx.arc(px, py, p.size * (1 - particleProgress), 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#4aedff';
                ctx.fill();
              });
              
              ctx.beginPath();
              ctx.arc(target.x, target.y, 15 * (1 - particleProgress), 0, Math.PI * 2);
              ctx.fillStyle = `rgba(255, 255, 255, ${1 - particleProgress})`;
              ctx.fill();
            }

            // Web Expansion
            const webProgress = Math.min(impactElapsed / 250, 1);
            const easeProgress = 1 - Math.pow(1 - webProgress, 3);
            const currentRadius = data.maxRadius * easeProgress;
            
            ctx.strokeStyle = 'rgba(240, 250, 255, 0.9)';
            ctx.shadowBlur = 5;
            ctx.shadowColor = 'rgba(74, 237, 255, 0.6)';

            // Radials
            for (let i = 0; i < data.radials; i++) {
              const angle = (i * Math.PI * 2) / data.radials;
              const rx = target.x + Math.cos(angle) * currentRadius;
              const ry = target.y + Math.sin(angle) * currentRadius;
              
              ctx.beginPath();
              ctx.moveTo(target.x, target.y);
              ctx.lineTo(rx, ry);
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }

            // Rings
            for (let r = 1; r <= data.rings; r++) {
              const ringRadius = (currentRadius / data.rings) * r;
              
              ctx.beginPath();
              for (let i = 0; i < data.radials; i++) {
                const angle1 = (i * Math.PI * 2) / data.radials;
                const angle2 = ((i + 1) * Math.PI * 2) / data.radials;
                
                const x1 = target.x + Math.cos(angle1) * ringRadius;
                const y1 = target.y + Math.sin(angle1) * ringRadius;
                const x2 = target.x + Math.cos(angle2) * ringRadius;
                const y2 = target.y + Math.sin(angle2) * ringRadius;
                
                if (i === 0) ctx.moveTo(x1, y1);
                
                const midAngle = (angle1 + angle2) / 2;
                const sagRadius = ringRadius * 0.85;
                const cx = target.x + Math.cos(midAngle) * sagRadius;
                const cy = target.y + Math.sin(midAngle) * sagRadius;
                
                ctx.quadraticCurveTo(cx, cy, x2, y2);
              }
              ctx.lineWidth = 0.7;
              ctx.stroke();
            }
          }

          ctx.restore();
        });

      } catch (err) {
        ctx.fillStyle = 'red';
        ctx.font = '20px monospace';
        ctx.fillText("ERROR: " + err.message, 50, 50);
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    draw(); // Start loop once

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []); // Empty dependency array -> loop runs continuously and reads from refs

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2
      }}
    />
  );
}
