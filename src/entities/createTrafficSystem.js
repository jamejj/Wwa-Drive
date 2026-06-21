import * as THREE from "three";

const dummy = new THREE.Object3D();
const bodyColors = [0x416a91, 0xb8b2a5, 0x30343a, 0x8f3f42, 0x567457, 0xc5a34e];

function createMesh(geometry, material, count, name) {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = name;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  return mesh;
}

function closestProgressOnSegment(segment, point) {
  const dx = segment.end.x - segment.start.x;
  const dz = segment.end.z - segment.start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared === 0) return 0.5;
  return THREE.MathUtils.clamp(
    ((point.x - segment.start.x) * dx + (point.z - segment.start.z) * dz) /
      lengthSquared,
    0.08,
    0.92,
  );
}

function distanceToSegmentSquared(segment, point) {
  const progress = closestProgressOnSegment(segment, point);
  const closestX =
    segment.start.x + (segment.end.x - segment.start.x) * progress;
  const closestZ =
    segment.start.z + (segment.end.z - segment.start.z) * progress;
  return (closestX - point.x) ** 2 + (closestZ - point.z) ** 2;
}

export function createTrafficSystem({ segments, profile, focusPosition }) {
  const movingCount =
    profile.name === "school" ? 5 : profile.name === "balanced" ? 10 : 16;
  const parkedCount =
    profile.name === "school" ? 8 : profile.name === "balanced" ? 16 : 26;
  const totalCount = movingCount + parkedCount;

  const group = new THREE.Group();
  group.name = "Ruch uliczny";

  const bodies = createMesh(
    new THREE.BoxGeometry(1.75, 0.62, 3.6),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
    totalCount,
    "Nadwozia ruchu",
  );
  const cabins = createMesh(
    new THREE.BoxGeometry(1.45, 0.55, 1.65),
    new THREE.MeshLambertMaterial({ color: 0x263943 }),
    totalCount,
    "Kabiny ruchu",
  );
  group.add(bodies, cabins);

  const cars = [];
  const usableSegments = [...segments]
    .sort(
      (a, b) =>
        distanceToSegmentSquared(a, focusPosition) -
        distanceToSegmentSquared(b, focusPosition),
    )
    .slice(0, Math.max(totalCount * 3, 30));
  for (let index = 0; index < totalCount; index += 1) {
    const moving = index < movingCount;
    const localIndex = moving ? index : index - movingCount;
    const segmentIndex = moving ? localIndex * 2 + 1 : localIndex * 2;
    const segment = usableSegments[segmentIndex % usableSegments.length];
    if (!segment) break;
    const parkedOffsets = [8, -8, 16, -16, 24, -24];
    const spacingMeters = moving
      ? ((localIndex % 4) - 1.5) * 13
      : parkedOffsets[localIndex % parkedOffsets.length];
    const spacingProgress = spacingMeters / Math.max(1, segment.length);
    const nearestProgress = closestProgressOnSegment(segment, focusPosition);
    cars.push({
      segment,
      moving,
      progress: THREE.MathUtils.clamp(
        nearestProgress + spacingProgress,
        0.06,
        0.94,
      ),
      initialProgress: THREE.MathUtils.clamp(
        nearestProgress + spacingProgress,
        0.06,
        0.94,
      ),
      direction: index % 2 === 0 ? 1 : -1,
      speed: moving ? 4.5 + (index % 4) * 0.8 : 0,
      position: new THREE.Vector3(),
      rotation: 0,
      active: true,
    });
    bodies.setColorAt(index, new THREE.Color(bodyColors[index % bodyColors.length]));
  }
  bodies.count = cars.length;
  cabins.count = cars.length;
  bodies.instanceColor.needsUpdate = true;

  const position = new THREE.Vector3();

  function setCarInstance(mesh, index, car, y) {
    if (!car.active) {
      dummy.position.copy(car.position);
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      return;
    }

    const { start, end, halfWidth } = car.segment;
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dz);
    const laneOffset = Math.min(halfWidth * 0.42, 2.2) * car.direction;
    const normalX = -dz / length;
    const normalZ = dx / length;
    position.set(
      start.x + dx * car.progress + normalX * laneOffset,
      y,
      start.z + dz * car.progress + normalZ * laneOffset,
    );
    car.position.set(position.x, 0, position.z);
    car.rotation =
      Math.atan2(dx, dz) + (car.direction < 0 ? Math.PI : 0);
    dummy.position.copy(position);
    dummy.rotation.set(0, car.rotation, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }

  function update(delta) {
    for (let index = 0; index < cars.length; index += 1) {
      const car = cars[index];
      if (car.moving) {
        const dx = car.segment.end.x - car.segment.start.x;
        const dz = car.segment.end.z - car.segment.start.z;
        const length = Math.max(1, Math.hypot(dx, dz));
        car.progress += (car.speed / length) * delta * car.direction;
        if (car.progress > 1.05) car.progress = -0.05;
        if (car.progress < -0.05) car.progress = 1.05;
      }
      setCarInstance(bodies, index, car, 0.52);
      setCarInstance(cabins, index, car, 1.08);
    }
    bodies.instanceMatrix.needsUpdate = true;
    cabins.instanceMatrix.needsUpdate = true;
  }

  function getNearestEnterable(point, maxDistance = 3.4) {
    let nearest = null;
    let nearestDistanceSquared = maxDistance * maxDistance;
    for (let index = movingCount; index < cars.length; index += 1) {
      const candidate = cars[index];
      if (!candidate.active) continue;
      const distanceSquared = candidate.position.distanceToSquared(point);
      if (distanceSquared < nearestDistanceSquared) {
        nearest = { index, car: candidate };
        nearestDistanceSquared = distanceSquared;
      }
    }
    return nearest;
  }

  function takeCar(index) {
    const selected = cars[index];
    if (!selected?.active || selected.moving) return null;
    selected.active = false;
    update(0);
    return {
      position: selected.position.clone(),
      rotation: selected.rotation,
      color: bodyColors[index % bodyColors.length],
    };
  }

  function collides(point, radius, ignoredIndex = -1) {
    const collisionDistanceSquared = (radius + 1.05) ** 2;
    for (let index = 0; index < cars.length; index += 1) {
      if (index === ignoredIndex || !cars[index].active) continue;
      if (cars[index].position.distanceToSquared(point) < collisionDistanceSquared) {
        return true;
      }
    }
    return false;
  }

  function reset() {
    for (const car of cars) {
      car.active = true;
      car.progress = car.initialProgress;
    }
    update(0);
  }

  update(0);
  return {
    group,
    update,
    movingCount,
    parkedCount,
    getNearestEnterable,
    takeCar,
    collides,
    reset,
  };
}
