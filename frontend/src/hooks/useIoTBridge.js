import { useState, useEffect, useRef } from 'react';

const BRIDGE_URL = 'ws://localhost:3001';

export function useIoTBridge({ onShoot, onTarget, onIMU }) {
  const [connected, setConnected] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState({
    cv: false,
    iot: false,
    imu: false,
  });

  const wsRef         = useRef(null);
  const onShootRef    = useRef(onShoot);
  const onTargetRef   = useRef(onTarget);
  const onIMURef      = useRef(onIMU);

  useEffect(() => { onShootRef.current = onShoot; }, [onShoot]);
  useEffect(() => { onTargetRef.current = onTarget; }, [onTarget]);
  useEffect(() => { onIMURef.current = onIMU; }, [onIMU]);

  useEffect(() => {
    let retryTimer = null;

    function connect() {
      if (wsRef.current && wsRef.current.readyState < 2) return;
      const ws = new WebSocket(BRIDGE_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[IoT Bridge] Connected to bridge server');
        setConnected(true);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'shoot') {
            console.log(`[IoT Bridge] 🔴 SHOOT received (${msg.source || 'iot'})`);
            onShootRef.current?.(msg.source || 'iot');
          } else if (msg.type === 'target') {
            onTargetRef.current?.(msg.x, msg.y, msg.source || 'cv');
          } else if (msg.type === 'imu') {
            onIMURef.current?.(msg);
          } else if (msg.type === 'status') {
            setDeviceStatus({
              cv: Boolean(msg.cv),
              iot: Boolean(msg.iot),
              imu: Boolean(msg.imu),
            });
          }
        } catch (_) {}
      };

      ws.onclose = () => {
        setConnected(false);
        setDeviceStatus({ cv: false, iot: false, imu: false });
        retryTimer = setTimeout(connect, 2500);
      };

      ws.onerror = () => {
        setConnected(false);
      };
    }

    connect();
    return () => {
      clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, []);

  return { connected, deviceStatus };
}
