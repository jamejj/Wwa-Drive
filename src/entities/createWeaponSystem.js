import * as THREE from "three";

const screenCenter = new THREE.Vector2(0, 0);

export function createWeaponSystem({
  camera,
  scene,
  getTargets,
  onNpcHit,
  onShot,
  cooldownMs = 300,
  maxDistance = 85,
}) {
  const raycaster = new THREE.Raycaster();
  raycaster.far = maxDistance;

  const tracerPositions = new Float32Array(6);
  const tracerGeometry = new THREE.BufferGeometry();
  tracerGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(tracerPositions, 3),
  );
  const tracer = new THREE.Line(
    tracerGeometry,
    new THREE.LineBasicMaterial({
      color: 0xffdf70,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    }),
  );
  tracer.name = "Ślad strzału";
  tracer.visible = false;
  tracer.frustumCulled = false;
  scene.add(tracer);

  const tracerEnd = new THREE.Vector3();
  let tracerLifetime = 0;
  let lastShotAt = -Infinity;

  function showTracer(endPoint) {
    tracerPositions[0] = camera.position.x;
    tracerPositions[1] = camera.position.y;
    tracerPositions[2] = camera.position.z;
    tracerPositions[3] = endPoint.x;
    tracerPositions[4] = endPoint.y;
    tracerPositions[5] = endPoint.z;
    tracerGeometry.attributes.position.needsUpdate = true;
    tracer.visible = true;
    tracerLifetime = 0.055;
  }

  function shoot(timestamp = performance.now()) {
    if (timestamp - lastShotAt < cooldownMs) return false;
    lastShotAt = timestamp;

    raycaster.setFromCamera(screenCenter, camera);
    const intersections = raycaster.intersectObjects(getTargets(), false);
    const hit = intersections.find(
      (intersection) => Number.isInteger(intersection.instanceId),
    );

    if (hit) {
      const accepted = onNpcHit(hit.instanceId);
      if (accepted) {
        showTracer(hit.point);
        onShot(true);
        return true;
      }
    }

    raycaster.ray.at(maxDistance, tracerEnd);
    showTracer(tracerEnd);
    onShot(false);
    return true;
  }

  function update(delta) {
    if (!tracer.visible) return;
    tracerLifetime -= delta;
    if (tracerLifetime <= 0) tracer.visible = false;
  }

  return { shoot, update };
}
