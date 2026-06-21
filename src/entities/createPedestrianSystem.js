import * as THREE from "three";
import { collidesWithBuildings } from "../world/collisions.js";

const dummy = new THREE.Object3D();
const color = new THREE.Color();

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function findFreePosition(center, buildingIndex, minimumDistance = 10) {
  const candidate = new THREE.Vector3();

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = randomRange(minimumDistance, 58);
    candidate.set(
      center.x + Math.cos(angle) * distance,
      0,
      center.z + Math.sin(angle) * distance,
    );
    if (!collidesWithBuildings(candidate, 0.4, buildingIndex)) return candidate;
  }

  return candidate.copy(center).add(
    new THREE.Vector3(randomRange(-15, 15), 0, randomRange(-15, 15)),
  );
}

export function createPedestrianSystem({
  count,
  spawnCenter,
  buildingIndex,
}) {
  const group = new THREE.Group();
  group.name = "Piesi";

  const torsoGeometry = new THREE.BoxGeometry(0.58, 0.82, 0.34);
  const legsGeometry = new THREE.BoxGeometry(0.46, 0.72, 0.28);
  const headGeometry = new THREE.SphereGeometry(0.23, 8, 6);

  const torsoMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const legsMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const headMaterial = new THREE.MeshLambertMaterial({ color: 0xd7a078 });

  const torsos = new THREE.InstancedMesh(torsoGeometry, torsoMaterial, count);
  const legs = new THREE.InstancedMesh(legsGeometry, legsMaterial, count);
  const heads = new THREE.InstancedMesh(headGeometry, headMaterial, count);
  torsos.name = "Tułowia pieszych";
  legs.name = "Nogi pieszych";
  heads.name = "Głowy pieszych";

  for (const mesh of [torsos, legs, heads]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    // NPC są przenoszeni wokół gracza; szeroka sfera utrzymuje poprawny raycast
    // bez kosztownego przeliczania boundsów w każdej klatce.
    mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 5000);
    group.add(mesh);
  }

  const shirtColors = [0xd14b45, 0x4776b7, 0xd5a43d, 0x58a36c, 0x8b5da8, 0xd8d2c4];
  const trouserColors = [0x202633, 0x34404e, 0x4b403b, 0x253a35];
  const shirtColorByNpc = [];
  const trouserColorByNpc = [];
  const skinColor = new THREE.Color(0xd7a078);
  const hitColor = new THREE.Color(0xff3328);
  const pedestrians = [];

  for (let index = 0; index < count; index += 1) {
    const position = findFreePosition(spawnCenter, buildingIndex);
    const shirtColor = new THREE.Color(shirtColors[index % shirtColors.length]);
    const trouserColor = new THREE.Color(
      trouserColors[index % trouserColors.length],
    );
    shirtColorByNpc.push(shirtColor);
    trouserColorByNpc.push(trouserColor);
    pedestrians.push({
      position,
      angle: Math.random() * Math.PI * 2,
      speed: randomRange(0.65, 1.25),
      turnTimer: randomRange(1.5, 5),
      phase: Math.random() * Math.PI * 2,
      active: true,
      hitTimer: 0,
    });

    torsos.setColorAt(index, shirtColor);
    legs.setColorAt(index, trouserColor);
    heads.setColorAt(index, skinColor);
  }
  torsos.instanceColor.needsUpdate = true;
  legs.instanceColor.needsUpdate = true;
  heads.instanceColor.needsUpdate = true;

  const previousPosition = new THREE.Vector3();

  function updateInstance(mesh, index, position, angle, y, scaleY = 1) {
    dummy.position.set(position.x, y, position.z);
    dummy.rotation.set(0, angle, 0);
    dummy.scale.set(1, scaleY, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }

  function relocate(pedestrian, focusPosition) {
    pedestrian.position.copy(findFreePosition(focusPosition, buildingIndex, 24));
    pedestrian.angle = Math.random() * Math.PI * 2;
    pedestrian.turnTimer = randomRange(2, 5);
  }

  function update(delta, elapsed, focusPosition) {
    for (let index = 0; index < pedestrians.length; index += 1) {
      const pedestrian = pedestrians[index];

      if (pedestrian.hitTimer > 0) {
        pedestrian.hitTimer -= delta;
        if (pedestrian.hitTimer <= 0) {
          pedestrian.active = false;
          dummy.position.copy(pedestrian.position);
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          legs.setMatrixAt(index, dummy.matrix);
          torsos.setMatrixAt(index, dummy.matrix);
          heads.setMatrixAt(index, dummy.matrix);
        }
        continue;
      }
      if (!pedestrian.active) continue;

      if (pedestrian.position.distanceToSquared(focusPosition) > 95 * 95) {
        relocate(pedestrian, focusPosition);
      }

      pedestrian.turnTimer -= delta;
      if (pedestrian.turnTimer <= 0) {
        pedestrian.angle += randomRange(-1.35, 1.35);
        pedestrian.turnTimer = randomRange(1.7, 5.5);
      }

      previousPosition.copy(pedestrian.position);
      pedestrian.position.x += Math.sin(pedestrian.angle) * pedestrian.speed * delta;
      pedestrian.position.z += Math.cos(pedestrian.angle) * pedestrian.speed * delta;

      if (collidesWithBuildings(pedestrian.position, 0.34, buildingIndex)) {
        pedestrian.position.copy(previousPosition);
        pedestrian.angle += Math.PI * randomRange(0.6, 1.4);
        pedestrian.turnTimer = randomRange(1, 2.5);
      }

      const walk = Math.sin(elapsed * 7 * pedestrian.speed + pedestrian.phase);
      const bob = Math.abs(walk) * 0.035;
      updateInstance(legs, index, pedestrian.position, pedestrian.angle, 0.4 + bob);
      updateInstance(
        torsos,
        index,
        pedestrian.position,
        pedestrian.angle,
        1.14 + bob,
      );
      updateInstance(
        heads,
        index,
        pedestrian.position,
        pedestrian.angle,
        1.78 + bob,
      );
    }

    legs.instanceMatrix.needsUpdate = true;
    torsos.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
  }

  function hitNpc(index) {
    const pedestrian = pedestrians[index];
    if (!pedestrian?.active || pedestrian.hitTimer > 0) return false;

    pedestrian.hitTimer = 0.11;
    torsos.setColorAt(index, hitColor);
    legs.setColorAt(index, hitColor);
    heads.setColorAt(index, hitColor);
    torsos.instanceColor.needsUpdate = true;
    legs.instanceColor.needsUpdate = true;
    heads.instanceColor.needsUpdate = true;
    return true;
  }

  function hitByVehicle(vehiclePosition, speed) {
    if (Math.abs(speed) < 3.2) return 0;
    let hitCount = 0;
    for (let index = 0; index < pedestrians.length; index += 1) {
      const pedestrian = pedestrians[index];
      if (
        pedestrian.active &&
        pedestrian.hitTimer <= 0 &&
        pedestrian.position.distanceToSquared(vehiclePosition) < 1.75 * 1.75 &&
        hitNpc(index)
      ) {
        hitCount += 1;
      }
    }
    return hitCount;
  }

  update(0, 0, spawnCenter);
  return {
    group,
    update,
    count,
    raycastTargets: [torsos, heads, legs],
    hitNpc,
    hitByVehicle,
  };
}
