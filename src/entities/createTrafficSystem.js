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

export function createTrafficSystem({ segments, profile }) {
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
  const usableSegments = segments.length > 0 ? segments : [];
  for (let index = 0; index < totalCount; index += 1) {
    const segment = usableSegments[(index * 17) % usableSegments.length];
    if (!segment) break;
    const moving = index < movingCount;
    cars.push({
      segment,
      moving,
      progress: moving ? ((index * 0.173) % 1) : 0.18 + ((index * 0.31) % 0.65),
      direction: index % 2 === 0 ? 1 : -1,
      speed: moving ? 4.5 + (index % 4) * 0.8 : 0,
    });
    bodies.setColorAt(index, new THREE.Color(bodyColors[index % bodyColors.length]));
  }
  bodies.count = cars.length;
  cabins.count = cars.length;
  bodies.instanceColor.needsUpdate = true;

  const position = new THREE.Vector3();

  function setCarInstance(mesh, index, car, y) {
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
    dummy.position.copy(position);
    dummy.rotation.set(0, Math.atan2(dx, dz) + (car.direction < 0 ? Math.PI : 0), 0);
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

  update(0);
  return { group, update, movingCount, parkedCount };
}
