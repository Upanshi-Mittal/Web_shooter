import { useState, useEffect, useRef } from 'react';

const BRIDGE_URL = 'ws://localhost:3001';

export function useIoTBridge(onShoot) {
  const [connected, setConnected] = useState(false);
  const wsRef      = useRef(null);
  const onShootRef = useRef(onShoot);
  
  useEffect(() => { onShootRef.current = onShoot; }, [onShoot]);

  useEffect(() => {
    let retryTimer = null;

    function connect() {
      if (wsRef.current && wsRef.current.readyState < 2) return;
      const ws = new WebSocket(BRIDGE_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[IoT Bridge] Connected');
        setConnected(true);
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'shoot') {
            console.log('[IoT Bridge] SHOOT from ESP32!');
            onShootRef.current();
          }
        } catch (_) {}
      };
      ws.onclose = () => {
        setConnected(false);
        retryTimer = setTimeout(connect, 3000); // auto-retry every 3s
      };
      ws.onerror = () => setConnected(false);
    }

    connect();
    return () => { clearTimeout(retryTimer); wsRef.current?.close(); };
  }, []);

  return connected;
}
