import * as THREE from "three";

export function createCameraControls(canvas) {
  const verticalAxis = new THREE.Vector3(0, 1, 0);
  let dragging = false;
  let yaw = 0;
  let pitch = 0.36;
  let distance = 11;

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 2) return;
    dragging = true;
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener("pointerup", (event) => {
    if (event.button === 2) dragging = false;
  });
  canvas.addEventListener("pointercancel", () => {
    dragging = false;
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    yaw -= event.movementX * 0.006;
    pitch = THREE.MathUtils.clamp(
      pitch + event.movementY * 0.004,
      0.12,
      0.72,
    );
  });
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      distance = THREE.MathUtils.clamp(distance + event.deltaY * 0.012, 6, 17);
    },
    { passive: false },
  );

  function getOffset(baseRotation, result) {
    const horizontalDistance = Math.cos(pitch) * distance;
    result
      .set(0, 1.7 + Math.sin(pitch) * distance, -horizontalDistance)
      .applyAxisAngle(verticalAxis, baseRotation + yaw);
    return result;
  }

  function reset() {
    yaw = 0;
    pitch = 0.36;
    distance = 11;
  }

  return { getOffset, reset };
}
