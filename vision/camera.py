import cv2
import json
import time
import websocket
import threading

# ─── CONFIGURATION ─────────────────────────────────────────────
BRIDGE_WS_URL   = "ws://localhost:3001"
TARGET_MARKER_ID = 0          # ArUco ID to track (from shooter_marker.png)
SMOOTHING_ALPHA  = 0.35       # 0.0 (sluggish) to 1.0 (raw jitter)
MIRROR_HORIZONTAL = True      # True = moving right moves crosshair right

# ─── WEBSOCKET CLIENT THREAD ───────────────────────────────────
ws_app = None
ws_connected = False

def on_open(ws):
    global ws_connected
    ws_connected = True
    print("[Vision] ✓ Connected to bridge server via WebSocket")

def on_close(ws, close_status_code, close_msg):
    global ws_connected
    ws_connected = False
    print("[Vision] ✗ Disconnected from bridge server")

def on_error(ws, error):
    pass

def ws_thread_func():
    global ws_app
    while True:
        try:
            ws_app = websocket.WebSocketApp(
                BRIDGE_WS_URL,
                on_open=on_open,
                on_close=on_close,
                on_error=on_error,
            )
            ws_app.run_forever(reconnect=5)
        except Exception:
            time.sleep(2)

threading.Thread(target=ws_thread_func, daemon=True).start()

def send_target(norm_x, norm_y, marker_id):
    if ws_connected and ws_app:
        try:
            payload = json.dumps({
                "type": "target",
                "x": round(norm_x, 4),
                "y": round(norm_y, 4),
                "source": "cv",
                "markerId": marker_id,
            })
            ws_app.send(payload)
        except Exception:
            pass

# ─── OPENCV ARUCO SETUP ────────────────────────────────────────
aruco = cv2.aruco
dictionary = aruco.getPredefinedDictionary(aruco.DICT_4X4_50)
parameters = aruco.DetectorParameters()
detector = aruco.ArucoDetector(dictionary, parameters)

camera = cv2.VideoCapture(0)
camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

print("\n╔══════════════════════════════════════════════════╗")
print("║     🕸  WEB SHOOTER — OPENCV TRACKER (V2)        ║")
print("╠══════════════════════════════════════════════════╣")
print("║  Tracking ArUco Marker ID: 0                     ║")
print(f"║  Streaming to: {BRIDGE_WS_URL:<34}║")
print("║  Press 'Q' to quit                               ║")
print("╚══════════════════════════════════════════════════╝\n")

smooth_x = 0.5
smooth_y = 0.5
prev_time = time.time()
fps = 0

while True:
    success, frame = camera.read()
    if not success:
        print("[Vision] Camera not available")
        time.sleep(0.5)
        continue

    h, w, _ = frame.shape

    # Mirror frame if enabled
    if MIRROR_HORIZONTAL:
        frame = cv2.flip(frame, 1)

    corners, ids, rejected = detector.detectMarkers(frame)
    marker_detected = False

    if ids is not None:
        for i, marker_id in enumerate(ids):
            mid = int(marker_id[0])
            if mid == TARGET_MARKER_ID:
                marker_detected = True
                points = corners[i][0]

                # Center of marker
                center_x = float(points[:, 0].mean())
                center_y = float(points[:, 1].mean())

                # Normalized coordinates (0.0 to 1.0)
                norm_x = max(0.0, min(1.0, center_x / w))
                norm_y = max(0.0, min(1.0, center_y / h))

                # Smooth jitter
                smooth_x = SMOOTHING_ALPHA * norm_x + (1.0 - SMOOTHING_ALPHA) * smooth_x
                smooth_y = SMOOTHING_ALPHA * norm_y + (1.0 - SMOOTHING_ALPHA) * smooth_y

                # Send to bridge
                send_target(smooth_x, smooth_y, mid)

                # Draw targeting UI on preview
                cx = int(smooth_x * w)
                cy = int(smooth_y * h)

                # Reticle circle
                cv2.circle(frame, (cx, cy), 24, (0, 255, 200), 2)
                cv2.circle(frame, (cx, cy), 3, (0, 255, 200), -1)
                cv2.line(frame, (cx - 30, cy), (cx + 30, cy), (0, 255, 200), 1)
                cv2.line(frame, (cx, cy - 30), (cx, cy + 30), (0, 255, 200), 1)

                cv2.putText(
                    frame,
                    f"TARGET LOCKED [ID: {mid}] ({smooth_x:.2f}, {smooth_y:.2f})",
                    (cx + 30, cy - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.55,
                    (0, 255, 200),
                    2
                )
                break

    # Calculate FPS
    cur_time = time.time()
    dt = cur_time - prev_time
    prev_time = cur_time
    if dt > 0:
        fps = 0.9 * fps + 0.1 * (1.0 / dt)

    # Status Overlay
    status_text = "BRIDGE: CONNECTED" if ws_connected else "BRIDGE: CONNECTING..."
    status_color = (0, 255, 100) if ws_connected else (0, 165, 255)
    cv2.putText(frame, status_text, (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2)

    tracking_text = "TRACKING: LOCKED" if marker_detected else "TRACKING: SEARCHING..."
    track_color = (0, 255, 200) if marker_detected else (100, 100, 255)
    cv2.putText(frame, tracking_text, (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, track_color, 2)
    cv2.putText(frame, f"FPS: {fps:.1f}", (20, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1)

    cv2.imshow("Web Shooter Vision (OpenCV)", frame)

    key = cv2.waitKey(1) & 0xFF
    if key == ord("q"):
        break

camera.release()
cv2.destroyAllWindows()