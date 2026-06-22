import * as THREE from "three";

function createCable(start, end, material) {
  const points = [];
  for (let index = 0; index <= 10; index += 1) {
    const progress = index / 10;
    const point = new THREE.Vector3().lerpVectors(start, end, progress);
    point.y -= Math.sin(progress * Math.PI) * 4.5;
    points.push(point);
  }
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    material,
  );
}

function createSwietokrzyskiBridge(geoToWorld) {
  const west = geoToWorld(52.24139, 21.02755);
  const east = geoToWorld(52.24175, 21.0397);
  const direction = east.clone().sub(west);
  const length = direction.length();
  const center = west.clone().add(east).multiplyScalar(0.5);
  const rotation = Math.atan2(direction.x, direction.z);

  const group = new THREE.Group();
  group.name = "Most Świętokrzyski";
  group.position.copy(center);
  group.rotation.y = rotation;

  const concrete = new THREE.MeshLambertMaterial({ color: 0xa6a9a7 });
  const steel = new THREE.MeshLambertMaterial({ color: 0xd5d9d5 });
  const cableMaterial = new THREE.LineBasicMaterial({ color: 0xdde2df });

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(15.5, 0.65, length),
    concrete,
  );
  deck.position.y = 0.12;
  deck.receiveShadow = true;
  group.add(deck);

  for (const side of [-1, 1]) {
    const barrier = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 1.15, length),
      steel,
    );
    barrier.position.set(side * 7.45, 0.75, 0);
    group.add(barrier);
  }

  const pylonZ = length * 0.13;
  const mast = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 43, 1.7),
    steel,
  );
  mast.position.set(0, 21.5, pylonZ);
  group.add(mast);

  for (const side of [-1, 1]) {
    for (const z of [-length * 0.43, -length * 0.25, -length * 0.07, length * 0.29]) {
      group.add(
        createCable(
          new THREE.Vector3(0, 41, pylonZ),
          new THREE.Vector3(side * 7.1, 1.4, z),
          cableMaterial,
        ),
      );
    }
  }

  return group;
}

export function createLocationStructures(location, geoToWorld) {
  const group = new THREE.Group();
  group.name = `Konstrukcje: ${location.name}`;
  if (location.id === "bulwary") {
    group.add(createSwietokrzyskiBridge(geoToWorld));
  }
  return group;
}
