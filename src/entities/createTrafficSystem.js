import * as THREE from "three";

const dummy = new THREE.Object3D();
const bodyColors = [
  0x315f89,
  0xb8b3a9,
  0x272b31,
  0x923a3f,
  0x4f7657,
  0xc0a047,
  0xeeeeea,
  0x744f79,
];

function createMesh(geometry, material, count, name) {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = name;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  return mesh;
}

function nodeKey(point) {
  return `${Math.round(point.x * 2)}:${Math.round(point.z * 2)}`;
}

function closestProgressOnSegment(segment, point) {
  const dx = segment.end.x - segment.start.x;
  const dz = segment.end.z - segment.start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared === 0) return 0.5;
  return THREE.MathUtils.clamp(
    ((point.x - segment.start.x) * dx + (point.z - segment.start.z) * dz) /
      lengthSquared,
    0.05,
    0.95,
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

function buildRoadGraph(segments) {
  const graph = new Map();
  segments.forEach((segment, index) => {
    segment.trafficIndex = index;
    for (const [point, direction] of [
      [segment.start, 1],
      [segment.end, -1],
    ]) {
      const key = nodeKey(point);
      if (!graph.has(key)) graph.set(key, []);
      graph.get(key).push({ segment, direction });
    }
  });
  return graph;
}

export function createTrafficSystem({ segments, profile, focusPosition }) {
  const movingCount =
    profile.name === "school" ? 4 : profile.name === "balanced" ? 9 : 16;
  const parkedCount =
    profile.name === "school" ? 6 : profile.name === "balanced" ? 15 : 26;
  const totalCount = movingCount + parkedCount;

  const group = new THREE.Group();
  group.name = "Ruch uliczny";

  const bodies = createMesh(
    new THREE.BoxGeometry(1.8, 0.58, 3.75),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
    totalCount,
    "Nadwozia ruchu",
  );
  const cabins = createMesh(
    new THREE.BoxGeometry(1.48, 0.54, 1.72),
    new THREE.MeshLambertMaterial({ color: 0x263943 }),
    totalCount,
    "Kabiny ruchu",
  );
  const wheelGeometry = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 10);
  wheelGeometry.rotateZ(Math.PI / 2);
  const wheels = createMesh(
    wheelGeometry,
    new THREE.MeshLambertMaterial({ color: 0x17191b }),
    totalCount * 4,
    "Koła ruchu",
  );
  const shadows = createMesh(
    new THREE.CircleGeometry(1.35, 12),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
    totalCount,
    "Cienie aut",
  );
  group.add(shadows, wheels, bodies, cabins);

  const movingSegments = segments.filter(
    (segment) => segment.length >= 14 && segment.halfWidth >= 2.8,
  );
  const parkingSegments = segments.filter(
    (segment) => segment.length >= 42 && segment.halfWidth >= 3.4,
  );
  const roadGraph = buildRoadGraph(movingSegments);
  const nearbyMoving = [...movingSegments]
    .sort(
      (a, b) =>
        distanceToSegmentSquared(a, focusPosition) -
        distanceToSegmentSquared(b, focusPosition),
    )
    .slice(0, Math.max(movingCount * 6, 50));
  const nearbyParking = [...parkingSegments]
    .sort(
      (a, b) =>
        distanceToSegmentSquared(a, focusPosition) -
        distanceToSegmentSquared(b, focusPosition),
    )
    .slice(0, Math.max(parkedCount * 5, 40));

  const cars = [];
  for (let index = 0; index < totalCount; index += 1) {
    const moving = index < movingCount;
    const localIndex = moving ? index : index - movingCount;
    const source = moving ? nearbyMoving : nearbyParking;
    const segment = source[(localIndex * 3 + (moving ? 1 : 0)) % source.length];
    if (!segment) break;

    const nearestProgress = closestProgressOnSegment(segment, focusPosition);
    const parkingOffsets = [12, -16, 25, -30, 40, -45];
    const movingOffsets = [34, -42, 58, -66, 82, -92];
    const offsetMeters = moving
      ? movingOffsets[localIndex % movingOffsets.length]
      : parkingOffsets[localIndex % parkingOffsets.length];
    const endpointClearance = moving ? 7 : 15;
    const minimumProgress = endpointClearance / segment.length;
    const progress = THREE.MathUtils.clamp(
      nearestProgress + offsetMeters / segment.length,
      minimumProgress,
      1 - minimumProgress,
    );

    const modelType = index % 4;
    const car = {
      segment,
      moving,
      progress,
      initialSegment: segment,
      initialProgress: progress,
      direction: index % 2 === 0 ? 1 : -1,
      initialDirection: index % 2 === 0 ? 1 : -1,
      speed: moving ? 5.5 + (index % 4) * 0.9 : 0,
      position: new THREE.Vector3(),
      rotation: 0,
      active: true,
      routeStep: index,
      widthScale: modelType === 1 ? 1.08 : modelType === 2 ? 0.92 : 1,
      lengthScale: modelType === 1 ? 1.18 : modelType === 3 ? 0.86 : 1,
      heightScale: modelType === 2 ? 0.88 : modelType === 3 ? 1.12 : 1,
    };
    cars.push(car);
    bodies.setColorAt(index, new THREE.Color(bodyColors[index % bodyColors.length]));
  }

  bodies.count = cars.length;
  cabins.count = cars.length;
  shadows.count = cars.length;
  wheels.count = cars.length * 4;
  bodies.instanceColor.needsUpdate = true;

  const position = new THREE.Vector3();

  function updateCarTransform(car) {
    const { start, end, halfWidth } = car.segment;
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.max(0.01, Math.hypot(dx, dz));
    const forwardX = (dx / length) * car.direction;
    const forwardZ = (dz / length) * car.direction;
    const rightX = forwardZ;
    const rightZ = -forwardX;
    const offset = car.moving
      ? Math.min(halfWidth * 0.44, 2.4)
      : Math.max(halfWidth - 1.05, 1.65);

    position.set(
      start.x + dx * car.progress + rightX * offset,
      0,
      start.z + dz * car.progress + rightZ * offset,
    );
    car.position.copy(position);
    car.rotation = Math.atan2(forwardX, forwardZ);
  }

  function setPart(mesh, index, car, y, scaleX, scaleY, scaleZ) {
    if (!car.active) {
      dummy.position.copy(car.position);
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      return;
    }
    dummy.position.set(car.position.x, y, car.position.z);
    dummy.rotation.set(mesh === shadows ? -Math.PI / 2 : 0, car.rotation, 0);
    dummy.scale.set(scaleX, scaleY, scaleZ);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }

  function setWheels(index, car) {
    const localX = 0.93 * car.widthScale;
    const localZ = 1.28 * car.lengthScale;
    const rightX = Math.cos(car.rotation);
    const rightZ = -Math.sin(car.rotation);
    const forwardX = Math.sin(car.rotation);
    const forwardZ = Math.cos(car.rotation);

    let wheelIndex = index * 4;
    for (const side of [-1, 1]) {
      for (const axle of [-1, 1]) {
        if (!car.active) {
          dummy.position.copy(car.position);
          dummy.scale.setScalar(0);
        } else {
          dummy.position.set(
            car.position.x + rightX * localX * side + forwardX * localZ * axle,
            0.36,
            car.position.z + rightZ * localX * side + forwardZ * localZ * axle,
          );
          dummy.rotation.set(0, car.rotation, 0);
          dummy.scale.set(1, 1, 1);
        }
        dummy.updateMatrix();
        wheels.setMatrixAt(wheelIndex, dummy.matrix);
        wheelIndex += 1;
      }
    }
  }

  function chooseNextSegment(car) {
    const endpoint =
      car.direction > 0 ? car.segment.end : car.segment.start;
    const options = (roadGraph.get(nodeKey(endpoint)) ?? []).filter(
      (option) => option.segment !== car.segment,
    );
    if (options.length === 0) {
      car.direction *= -1;
      car.progress = car.direction > 0 ? 0.02 : 0.98;
      return;
    }

    car.routeStep += 1;
    const next = options[car.routeStep % options.length];
    car.segment = next.segment;
    car.direction = next.direction;
    car.progress = car.direction > 0 ? 0.02 : 0.98;
  }

  function isBlocked(car, index, obstacles) {
    const lookAheadDistanceSquared = 4.6 * 4.6;
    for (let otherIndex = 0; otherIndex < cars.length; otherIndex += 1) {
      if (otherIndex === index) continue;
      const other = cars[otherIndex];
      if (!other.active) continue;
      const dx = other.position.x - car.position.x;
      const dz = other.position.z - car.position.z;
      const forwardX = Math.sin(car.rotation);
      const forwardZ = Math.cos(car.rotation);
      if (
        dx * dx + dz * dz < lookAheadDistanceSquared &&
        dx * forwardX + dz * forwardZ > 0.4
      ) {
        return true;
      }
    }
    for (const obstacle of obstacles) {
      const dx = obstacle.x - car.position.x;
      const dz = obstacle.z - car.position.z;
      const forwardX = Math.sin(car.rotation);
      const forwardZ = Math.cos(car.rotation);
      if (
        dx * dx + dz * dz < 5.2 * 5.2 &&
        dx * forwardX + dz * forwardZ > 0.25
      ) {
        return true;
      }
    }
    return false;
  }

  function update(delta, obstacles = []) {
    for (const car of cars) updateCarTransform(car);

    for (let index = 0; index < cars.length; index += 1) {
      const car = cars[index];
      if (car.moving && car.active && !isBlocked(car, index, obstacles)) {
        car.progress +=
          (car.speed / Math.max(1, car.segment.length)) *
          delta *
          car.direction;
        if (car.progress > 1 || car.progress < 0) chooseNextSegment(car);
        updateCarTransform(car);
      }

      setPart(
        shadows,
        index,
        car,
        0.045,
        1.1 * car.widthScale,
        1.45 * car.lengthScale,
        1,
      );
      setWheels(index, car);
      setPart(
        bodies,
        index,
        car,
        0.63,
        car.widthScale,
        car.heightScale,
        car.lengthScale,
      );
      setPart(
        cabins,
        index,
        car,
        1.14,
        car.widthScale * 0.94,
        car.heightScale,
        car.lengthScale * 0.9,
      );
    }
    shadows.instanceMatrix.needsUpdate = true;
    wheels.instanceMatrix.needsUpdate = true;
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
      car.segment = car.initialSegment;
      car.progress = car.initialProgress;
      car.direction = car.initialDirection;
    }
    update(0);
  }

  function forEachMovingCar(callback) {
    for (const car of cars) {
      if (car.active && car.moving) callback(car.position, car.speed);
    }
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
    forEachMovingCar,
  };
}
