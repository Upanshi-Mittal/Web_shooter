import cv2

camera = cv2.VideoCapture(0)

aruco = cv2.aruco

dictionary = aruco.getPredefinedDictionary(
    aruco.DICT_4X4_50
)

parameters = aruco.DetectorParameters()

detector = aruco.ArucoDetector(
    dictionary,
    parameters
)

while True:

    success, frame = camera.read()

    if not success:
        print("Camera not available")
        break

    corners, ids, rejected = detector.detectMarkers(frame)

    if ids is not None:

        aruco.drawDetectedMarkers(
            frame,
            corners,
            ids
        )

        for i, marker_id in enumerate(ids):

            points = corners[i][0]

            center_x = int(points[:, 0].mean())
            center_y = int(points[:, 1].mean())

            cv2.circle(
                frame,
                (center_x, center_y),
                8,
                (0, 255, 0),
                -1
            )

            cv2.putText(
                frame,
                f"ID: {marker_id[0]}",
                (center_x + 10, center_y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2
            )

            print(
                f"Marker {marker_id[0]} → "
                f"({center_x}, {center_y})"
            )

    cv2.imshow(
        "Web Shooter Vision",
        frame
    )

    key = cv2.waitKey(1) & 0xFF

    if key == ord("q"):
        break

camera.release()
cv2.destroyAllWindows()