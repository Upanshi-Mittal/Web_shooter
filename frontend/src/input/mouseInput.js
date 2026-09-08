import { useEffect, useRef } from 'react';

export function useMouseInput(onTargetUpdate) {
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    const handleMouseMove = (e) => {
      if (!isMounted.current) return;
      const x = e.clientX;
      const y = e.clientY;
      const normalizedX = parseFloat((x / window.innerWidth).toFixed(2));
      const normalizedY = parseFloat((y / window.innerHeight).toFixed(2));
      
      onTargetUpdate({
        x,
        y,
        normalizedX,
        normalizedY
      });
    };

    const handleResize = () => {
      // Potentially handle resize for normalized coords if needed
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    
    return () => {
      isMounted.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [onTargetUpdate]);
}
